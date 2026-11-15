/**
 * 排过的盘自动记进档案。
 *
 * 以前只记「上次的命盘」一格：再排下一个人，前一个就被盖掉，要留着得每次手动点「存入档案」。
 * 现在每次起盘都在档案里记一条，放在「自动记录」这一组：
 * - 同一个人的同一张盘再排一次不会多记，只把那条提到最前面；
 * - 没写名字的盘，后来补了名字，就给原来那条改名，不留两条；
 * - 自动记录最多留 AUTO_RECORD_LIMIT 条，满了删最旧的；归到别的分组的不算在内，也不会被删；
 * - 可以关掉（开关存在本机）。这些记录和档案一样只存在这台设备上，不上传。
 */
import { baziChartSignature } from './baziRecord.js';

export const AUTO_GROUP = 'auto';
export const AUTO_GROUP_LABEL = '自动记录';
export const AUTO_RECORD_LIMIT = 500;

const SETTING_KEY = 'gushupai-auto-archive';
const SEEDED_KEY = 'gushupai-auto-archive-seeded';
const UNNAMED = '未命名';

const nameOf = (record) => (typeof record?.name === 'string' ? record.name.trim() : '');

export const isAutoRecord = (record) => record?.group === AUTO_GROUP;

export const isUnnamedRecord = (record) => {
  const name = nameOf(record);
  return name === '' || name === UNNAMED;
};

/**
 * 同一张盘的标识。八字、紫微的档案用同一套生辰字段；紫微另看晚子时按哪一派排。
 * 资料不完整、或不是命盘的记录（六爻卦例等）返回空串。
 */
export const chartSignatureOf = (record) => {
  const base = baziChartSignature(record);
  if (!base) return '';
  return record.type === 'ziwei' ? `${base}|${record.data?.lateZi ?? ''}` : base;
};

/**
 * 档案里和这条算「同一个人的同一张盘」的记录，找不到返回 null。
 * - 类型相同、名字相同、同一张盘：就是它。
 * - 这条有名字：还留在「自动记录」里、没写名字的同一张盘也算（后来补了名字）。
 * - 这条没写名字：只认同样没写名字的。loose 为 true 时（自动记录用）同一张盘的任何一条都算，
 *   免得已经记了「张三」，又多记一条没名字的。
 * 两条都有名字而名字不同，不算同一条：可能是同一时辰出生的另一个人。
 */
export const findArchivedChart = (records, record, { loose = false } = {}) => {
  const signature = chartSignatureOf(record);
  if (!signature || !Array.isArray(records)) return null;
  const same = records.filter((item) => item?.type === record.type && chartSignatureOf(item) === signature);
  if (same.length === 0) return null;
  const unnamed = isUnnamedRecord(record);
  const name = nameOf(record);
  const sameName = same.find((item) => (unnamed ? isUnnamedRecord(item) : nameOf(item) === name));
  if (sameName) return sameName;
  if (unnamed) return loose ? same[0] : null;
  return same.find((item) => isAutoRecord(item) && isUnnamedRecord(item)) ?? null;
};

export const isAutoArchiveEnabled = (storage = globalThis.localStorage) => {
  try {
    return storage?.getItem(SETTING_KEY) !== 'off';
  } catch {
    return true;
  }
};

export const setAutoArchiveEnabled = (enabled, storage = globalThis.localStorage) => {
  try {
    if (enabled) storage?.removeItem(SETTING_KEY);
    else storage?.setItem(SETTING_KEY, 'off');
    return true;
  } catch {
    return false;
  }
};

/**
 * 起盘后记一条。返回 { action, record }：
 * - added：新记了一条；
 * - renamed：给原来没写名字的那条补上了名字；
 * - touched：档案里已经有，只提到最前面；
 * - off：自动记录关着；skipped：资料不完整，不记；failed：没写进去（存储满了或不可用）。
 */
export const autoArchiveChart = (manager, record, { enabled = isAutoArchiveEnabled(), limit = AUTO_RECORD_LIMIT } = {}) => {
  if (!enabled) return { action: 'off', record: null };
  if (!chartSignatureOf(record)) return { action: 'skipped', record: null };

  // 别的标签页可能刚记过同一张盘：先对齐再查重。
  manager.refresh?.();
  const existing = findArchivedChart(manager.getRecords(), record, { loose: true });
  if (existing) {
    const rename = isAutoRecord(existing) && isUnnamedRecord(existing) && !isUnnamedRecord(record);
    const touched = manager.touchRecord(existing.id, rename ? { name: record.name } : {});
    if (!touched) return { action: 'failed', record: null };
    return { action: rename ? 'renamed' : 'touched', record: touched };
  }

  const added = manager.addRecord({ ...record, group: AUTO_GROUP, note: '' });
  if (!added) return { action: 'failed', record: null };
  // 档案里新的在前：自动记录超出上限时，删掉排在最后的（最旧的）。
  const autoRecords = manager.getRecords().filter(isAutoRecord);
  if (autoRecords.length > limit) {
    const overflow = new Set(autoRecords.slice(limit).map((item) => item.id));
    manager.removeRecords((item) => overflow.has(item.id));
  }
  return { action: 'added', record: added };
};

/**
 * 手动「存入档案」：档案里已经有这张盘（包括自动记下的那条）就改它的分组和备注，不重复存。
 * 返回 { saved, existing, wasAuto }：saved 为 null 表示没写进去；wasAuto 表示原来是自动记录。
 */
export const saveChartToArchive = (manager, record) => {
  manager.refresh?.();
  const existing = findArchivedChart(manager.getRecords(), record);
  if (!existing) return { saved: manager.addRecord(record), existing: null, wasAuto: false };
  const saved = manager.updateRecord(existing.id, {
    name: record.name,
    group: record.group,
    note: record.note || existing.note || '',
    solarDate: record.solarDate,
    data: record.data,
  });
  return { saved, existing, wasAuto: isAutoRecord(existing) };
};

/**
 * 「清除上次的命盘」时把它的自动记录也删掉，返回删掉的那条（撤销时放回去）。
 * 已经归到别的分组的是用户自己存的，不动。
 */
export const removeAutoRecordOf = (manager, record) => {
  const existing = findArchivedChart(manager.getRecords(), record, { loose: true });
  if (!existing || !isAutoRecord(existing)) return null;
  const removed = manager.removeRecords((item) => item.id === existing.id);
  return removed?.[0] ?? null;
};

/** 清空自动记录。返回删掉的记录（撤销用）；没写进去时返回 null。 */
export const clearAutoRecords = (manager) => manager.removeRecords(isAutoRecord);

/**
 * 升级后第一次打开八字页：把当时那张「上次的命盘」补记进档案，免得排下一个人时把它盖掉。只做一次。
 */
export const seedAutoArchiveOnce = (manager, lastRecord, storage = globalThis.localStorage) => {
  try {
    if (!storage || storage.getItem(SEEDED_KEY)) return false;
    storage.setItem(SEEDED_KEY, '1');
  } catch {
    return false;
  }
  if (!lastRecord) return false;
  return autoArchiveChart(manager, lastRecord, { enabled: isAutoArchiveEnabled(storage) }).action === 'added';
};
