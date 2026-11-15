// 排过的盘自动记进档案：记一条、不重复记、补名字、上限、开关、手动归档、清除与撤销。
// 用的都是编出来的人和生辰。
import test from 'node:test';
import assert from 'node:assert/strict';

import { ArchiveManager } from '../src/utils/archiveManager.js';
import { buildBaziRecord } from '../src/utils/baziRecord.js';
import {
  AUTO_GROUP,
  autoArchiveChart,
  chartSignatureOf,
  clearAutoRecords,
  findArchivedChart,
  isAutoArchiveEnabled,
  isAutoRecord,
  removeAutoRecordOf,
  saveChartToArchive,
  seedAutoArchiveOnce,
  setAutoArchiveEnabled,
} from '../src/utils/autoArchive.js';

class MemoryStorage {
  constructor() {
    this.items = new Map();
    this.failWrites = false;
  }

  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null;
  }

  setItem(key, value) {
    if (this.failWrites) throw new Error('quota exceeded');
    this.items.set(key, String(value));
  }

  removeItem(key) {
    this.items.delete(key);
  }
}

const createManager = () => {
  const storage = new MemoryStorage();
  return { storage, manager: new ArchiveManager(storage, { dispatchEvent() {} }) };
};

const baseForm = {
  personName: '',
  calendarType: 'solar',
  year: 1990,
  month: 5,
  day: 20,
  hourIndex: 6,
  gender: 'male',
  daySect: 2,
  yearBoundary: 'lichun',
  timeMode: 'shichen',
  clockTime: '',
  placeProvince: '',
  placeCity: '',
  longitude: '',
  timezone: 8,
  applyTrueSolar: true,
  applyDst: false,
};

// 起盘时页面交给自动记录的八字记录（组别先写成「自己」，自动记录会改成自己的组）。
const baziOf = (name, overrides = {}) => buildBaziRecord({ ...baseForm, personName: name, ...overrides }, null, { group: 'self' });

const ziweiOf = (name, overrides = {}) => ({
  name: name || '未命名',
  gender: 'female',
  type: 'ziwei',
  calendarType: 'solar',
  birthDate: '1988-07-15',
  solarDate: '1988-07-15',
  timeHour: 5,
  isLeapMonth: false,
  group: 'self',
  note: '',
  data: { lateZi: 'next' },
  ...overrides,
});

const names = (manager) => manager.getRecords().map((record) => record.name);

test('连着排三个人：三条都在「自动记录」里，新的在前，谁也不会把谁盖掉', () => {
  const { manager } = createManager();
  const results = [
    autoArchiveChart(manager, baziOf('甲某'), { enabled: true }),
    autoArchiveChart(manager, baziOf('乙某', { year: 1985, month: 3, day: 9 }), { enabled: true }),
    autoArchiveChart(manager, baziOf('丙某', { year: 2001, month: 11, day: 2, gender: 'female' }), { enabled: true }),
  ];

  assert.deepEqual(results.map(({ action }) => action), ['added', 'added', 'added']);
  assert.deepEqual(names(manager), ['丙某', '乙某', '甲某']);
  assert.ok(manager.getRecords().every((record) => record.group === AUTO_GROUP && record.type === 'bazi' && record.note === ''));
  assert.ok(manager.getRecords().every(isAutoRecord));
});

test('同一个人的同一张盘再排一次不多记，只提到最前面；换了时辰就是另一张盘', () => {
  const { manager } = createManager();
  autoArchiveChart(manager, baziOf('甲某'), { enabled: true });
  autoArchiveChart(manager, baziOf('乙某', { year: 1985 }), { enabled: true });

  const again = autoArchiveChart(manager, baziOf('甲某'), { enabled: true });
  assert.equal(again.action, 'touched');
  assert.deepEqual(names(manager), ['甲某', '乙某']);

  const otherHour = autoArchiveChart(manager, baziOf('甲某', { hourIndex: 7 }), { enabled: true });
  assert.equal(otherHour.action, 'added');
  assert.equal(manager.getRecords().length, 3);

  // 同一时辰出生、名字不同的另一个人：各记各的。
  const twin = autoArchiveChart(manager, baziOf('甲某的同学'), { enabled: true });
  assert.equal(twin.action, 'added');
  assert.equal(manager.getRecords().length, 4);
});

test('先没写名字排了一次，后来补上名字：给原来那条改名，不留两条', () => {
  const { manager } = createManager();
  const first = autoArchiveChart(manager, baziOf(''), { enabled: true });
  assert.equal(first.record.name, '未命名');

  const named = autoArchiveChart(manager, baziOf('丁某'), { enabled: true });
  assert.equal(named.action, 'renamed');
  assert.equal(named.record.id, first.record.id);
  assert.deepEqual(names(manager), ['丁某']);

  // 已经记了「丁某」，再不写名字排同一张盘：不多记一条没名字的。
  const unnamedAgain = autoArchiveChart(manager, baziOf(''), { enabled: true });
  assert.equal(unnamedAgain.action, 'touched');
  assert.deepEqual(names(manager), ['丁某']);
});

test('自动记录有上限：满了删最旧的，归到分组里的不算在内也不会被删', () => {
  const { manager } = createManager();
  const kept = manager.addRecord({ ...baziOf('老客户', { year: 1970 }), group: 'customer' });
  for (let index = 0; index < 5; index += 1) {
    autoArchiveChart(manager, baziOf(`第${index + 1}位`, { year: 1980 + index }), { enabled: true, limit: 3 });
  }

  const autoNames = manager.getRecords().filter(isAutoRecord).map((record) => record.name);
  assert.deepEqual(autoNames, ['第5位', '第4位', '第3位']);
  assert.ok(manager.getRecords().some((record) => record.id === kept.id));
  assert.equal(manager.getRecords().length, 4);
});

test('已经归到分组里的命盘再排一次：不多记，也不改它的分组和备注', () => {
  const { manager } = createManager();
  const saved = manager.addRecord({ ...baziOf('戊某'), group: 'family', note: '外婆' });
  autoArchiveChart(manager, baziOf('别人', { year: 1999 }), { enabled: true });

  const again = autoArchiveChart(manager, baziOf('戊某'), { enabled: true });
  assert.equal(again.action, 'touched');
  assert.equal(again.record.id, saved.id);
  assert.equal(again.record.group, 'family');
  assert.equal(again.record.note, '外婆');
  assert.deepEqual(names(manager), ['戊某', '别人']);
});

test('关掉自动记录后不记；资料不完整的、不是命盘的也不记', () => {
  const { manager, storage } = createManager();
  assert.equal(isAutoArchiveEnabled(storage), true);
  assert.equal(setAutoArchiveEnabled(false, storage), true);
  assert.equal(isAutoArchiveEnabled(storage), false);
  assert.equal(autoArchiveChart(manager, baziOf('己某'), { enabled: isAutoArchiveEnabled(storage) }).action, 'off');
  assert.equal(manager.getRecords().length, 0);

  setAutoArchiveEnabled(true, storage);
  assert.equal(isAutoArchiveEnabled(storage), true);
  assert.equal(autoArchiveChart(manager, { name: '问事', type: 'liuyao' }, { enabled: true }).action, 'skipped');
  assert.equal(autoArchiveChart(manager, { ...baziOf('缺性别'), gender: '' }, { enabled: true }).action, 'skipped');
  assert.equal(manager.getRecords().length, 0);

  // 存储读不了时按「开着」算，不因此报错。
  assert.equal(isAutoArchiveEnabled({ getItem() { throw new Error('denied'); } }), true);
  assert.equal(setAutoArchiveEnabled(false, { setItem() { throw new Error('denied'); } }), false);
});

test('存储写不进去时返回 failed，不抛错', () => {
  const { manager, storage } = createManager();
  storage.failWrites = true;
  const originalConsoleError = console.error;
  console.error = () => {};
  let result;
  try {
    result = autoArchiveChart(manager, baziOf('庚某'), { enabled: true });
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(result.action, 'failed');
  assert.equal(manager.getRecords().length, 0);
});

test('手动存入档案：自动记下的那条改到所选分组，不重复存；没名字的顺带补上名字', () => {
  const { manager } = createManager();
  const auto = autoArchiveChart(manager, baziOf('辛某'), { enabled: true }).record;

  const filed = saveChartToArchive(manager, { ...baziOf('辛某'), group: 'customer', note: '下午来的' });
  assert.equal(filed.wasAuto, true);
  assert.equal(filed.saved.id, auto.id);
  assert.equal(filed.saved.group, 'customer');
  assert.equal(filed.saved.note, '下午来的');
  assert.equal(manager.getRecords().length, 1);

  // 再存一次（已经不是自动记录了）：还是那一条，备注留空时保留原来的。
  const again = saveChartToArchive(manager, { ...baziOf('辛某'), group: 'friend', note: '' });
  assert.equal(again.wasAuto, false);
  assert.equal(again.existing.id, auto.id);
  assert.equal(again.saved.group, 'friend');
  assert.equal(again.saved.note, '下午来的');
  assert.equal(manager.getRecords().length, 1);

  // 起盘时没写名字，存档时在面板里补了名字。
  const unnamed = autoArchiveChart(manager, baziOf('', { year: 1977 }), { enabled: true }).record;
  const namedLater = saveChartToArchive(manager, { ...baziOf('壬某', { year: 1977 }), group: 'self', note: '' });
  assert.equal(namedLater.saved.id, unnamed.id);
  assert.equal(namedLater.saved.name, '壬某');
  assert.equal(namedLater.saved.group, 'self');
  assert.equal(manager.getRecords().length, 2);

  // 档案里没有的：新存一条。
  const fresh = saveChartToArchive(manager, { ...baziOf('癸某', { year: 1966 }), group: 'other', note: '' });
  assert.equal(fresh.existing, null);
  assert.equal(fresh.wasAuto, false);
  assert.equal(manager.getRecords().length, 3);
});

test('找同一张盘：同名才算；没写名字的手动存档不会去改别人的记录', () => {
  const saved = { ...baziOf('子某'), id: 'a1', group: 'customer', createdAt: 1 };
  const again = { ...baziOf('子某'), group: 'self', note: '再存一次' };
  assert.equal(findArchivedChart([saved], again)?.id, 'a1');

  assert.equal(findArchivedChart([saved], baziOf('丑某')), null);
  assert.equal(findArchivedChart([saved], baziOf('子某', { hourIndex: 3 })), null);
  // 类型不同的不算：八字找不到紫微档案，反过来也一样。
  assert.equal(findArchivedChart([{ ...saved, id: 'z1', type: 'ziwei' }], again), null);
  assert.equal(findArchivedChart(null, again), null);
  assert.equal(findArchivedChart([saved], { name: '问事', type: 'liuyao' }), null);

  // 没写名字：手动存档只认同样没写名字的；自动记录（loose）认同一张盘的任何一条。
  assert.equal(findArchivedChart([saved], baziOf('')), null);
  assert.equal(findArchivedChart([saved], baziOf(''), { loose: true })?.id, 'a1');
  // 有名字的：只接手还留在自动记录里、没写名字的那条；别人归好组的没名字记录不动。
  const unnamedFiled = { ...baziOf(''), id: 'u1', group: 'customer' };
  const unnamedAuto = { ...baziOf(''), id: 'u2', group: AUTO_GROUP };
  assert.equal(findArchivedChart([unnamedFiled], baziOf('寅某')), null);
  assert.equal(findArchivedChart([unnamedFiled, unnamedAuto], baziOf('寅某'))?.id, 'u2');
});

test('紫微命盘同样自动记录；晚子时换一派排就是另一张盘', () => {
  const { manager } = createManager();
  assert.equal(autoArchiveChart(manager, ziweiOf('卯某'), { enabled: true }).action, 'added');
  assert.equal(autoArchiveChart(manager, ziweiOf('卯某'), { enabled: true }).action, 'touched');
  assert.equal(autoArchiveChart(manager, ziweiOf('卯某', { data: { lateZi: 'same' } }), { enabled: true }).action, 'added');
  assert.notEqual(chartSignatureOf(ziweiOf('卯某')), chartSignatureOf(ziweiOf('卯某', { data: { lateZi: 'same' } })));
  // 同一份生辰的八字盘另记一条：类型不同。
  const bazi = baziOf('卯某', { year: 1988, month: 7, day: 15, hourIndex: 5, gender: 'female' });
  assert.equal(autoArchiveChart(manager, bazi, { enabled: true }).action, 'added');
  assert.deepEqual(manager.getRecords().map((record) => record.type), ['bazi', 'ziwei', 'ziwei']);

  const filed = saveChartToArchive(manager, { ...ziweiOf('卯某'), group: 'mother', note: '' });
  assert.equal(filed.wasAuto, true);
  assert.equal(manager.getRecords().filter((record) => record.type === 'ziwei').length, 2);
});

test('清除上次的命盘：自动记下的那条一并删掉，撤销时原样放回；归了组的不动', () => {
  const { manager } = createManager();
  autoArchiveChart(manager, baziOf('辰某', { year: 1991 }), { enabled: true });
  const last = autoArchiveChart(manager, baziOf('巳某'), { enabled: true }).record;

  const removed = removeAutoRecordOf(manager, baziOf('巳某'));
  assert.equal(removed.id, last.id);
  assert.deepEqual(names(manager), ['辰某']);

  assert.equal(manager.restoreRecords([removed]), true);
  assert.deepEqual(names(manager), ['巳某', '辰某']);
  assert.equal(manager.getRecords()[0].id, last.id);
  assert.equal(manager.getRecords()[0].createdAt, last.createdAt);
  // 再放一次不会多出一条。
  assert.equal(manager.restoreRecords([removed]), true);
  assert.equal(manager.getRecords().length, 2);

  saveChartToArchive(manager, { ...baziOf('巳某'), group: 'self', note: '' });
  assert.equal(removeAutoRecordOf(manager, baziOf('巳某')), null);
  assert.equal(manager.getRecords().length, 2);
});

test('清空自动记录：只删自动记下的，归到分组里的留着', () => {
  const { manager } = createManager();
  manager.addRecord({ ...baziOf('午某', { year: 1960 }), group: 'father' });
  autoArchiveChart(manager, baziOf('未某', { year: 1993 }), { enabled: true });
  autoArchiveChart(manager, baziOf('申某', { year: 1994 }), { enabled: true });

  const removed = clearAutoRecords(manager);
  assert.deepEqual(removed.map((record) => record.name).sort(), ['未某', '申某'].sort());
  assert.deepEqual(names(manager), ['午某']);
  assert.deepEqual(clearAutoRecords(manager), []);
});

test('升级后第一次打开：把当时的「上次的命盘」补记一条，只做一次；关着自动记录时不补', () => {
  const { manager, storage } = createManager();
  assert.equal(seedAutoArchiveOnce(manager, baziOf('酉某'), storage), true);
  assert.deepEqual(names(manager), ['酉某']);
  assert.equal(manager.getRecords()[0].group, AUTO_GROUP);
  // 第二次不再补（哪怕换了一张盘）。
  assert.equal(seedAutoArchiveOnce(manager, baziOf('戌某', { year: 1995 }), storage), false);
  assert.equal(manager.getRecords().length, 1);

  const second = createManager();
  assert.equal(seedAutoArchiveOnce(second.manager, null, second.storage), false);
  assert.equal(seedAutoArchiveOnce(second.manager, baziOf('亥某'), second.storage), false);
  assert.equal(second.manager.getRecords().length, 0);

  const third = createManager();
  setAutoArchiveEnabled(false, third.storage);
  assert.equal(seedAutoArchiveOnce(third.manager, baziOf('某甲'), third.storage), false);
  assert.equal(third.manager.getRecords().length, 0);
  // 没有可用的存储时什么都不做。
  assert.equal(seedAutoArchiveOnce(third.manager, baziOf('某乙'), null), false);
});

test('档案库：把一条提到最前面、一次删多条、原样放回', () => {
  const { manager } = createManager();
  const first = manager.addRecord({ name: '一', type: 'ziwei' });
  const second = manager.addRecord({ name: '二', type: 'ziwei' });
  const third = manager.addRecord({ name: '三', type: 'ziwei' });
  assert.deepEqual(names(manager), ['三', '二', '一']);

  const touched = manager.touchRecord(first.id, { name: '一号', id: 'x', createdAt: 0 });
  assert.equal(touched.id, first.id);
  assert.equal(touched.createdAt, first.createdAt);
  assert.deepEqual(names(manager), ['一号', '三', '二']);
  assert.equal(manager.touchRecord('没有这条'), null);

  const removed = manager.removeRecords((record) => record.id === second.id || record.id === third.id);
  assert.deepEqual(removed.map((record) => record.name), ['三', '二']);
  assert.deepEqual(names(manager), ['一号']);
  assert.deepEqual(manager.removeRecords(() => false), []);

  assert.equal(manager.restoreRecords([...removed, null, { id: '', name: '坏的' }]), true);
  assert.deepEqual(names(manager), ['三', '二', '一号']);
});

test('两个标签页排同一个人：后排的那一页认得出另一页刚记的，不重复记', () => {
  const storage = new MemoryStorage();
  const tabOne = new ArchiveManager(storage, { dispatchEvent() {} });
  const tabTwo = new ArchiveManager(storage, { dispatchEvent() {} });

  assert.equal(autoArchiveChart(tabOne, baziOf('某丙'), { enabled: true }).action, 'added');
  assert.equal(autoArchiveChart(tabTwo, baziOf('某丙'), { enabled: true }).action, 'touched');
  assert.equal(autoArchiveChart(tabTwo, baziOf('某丁', { year: 1987 }), { enabled: true }).action, 'added');
  assert.equal(saveChartToArchive(tabOne, { ...baziOf('某丁', { year: 1987 }), group: 'friend', note: '' }).wasAuto, true);

  tabOne.refresh();
  assert.deepEqual(tabOne.getRecords().map((record) => [record.name, record.group]), [['某丁', 'friend'], ['某丙', AUTO_GROUP]]);
});
