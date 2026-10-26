/**
 * 六爻卦例与档案记录之间的转换。
 * 不依赖农历库，档案页校验、显示卦例时不必下载它；重新装卦交给 utils/liuyao.js。
 */

export const LIUYAO_METHODS = Object.freeze({ coins: '摇铜钱', gesture: '手势起卦' });

const CAST_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/;
const VALID_VALUES = new Set([6, 7, 8, 9]);
const pad = (value) => String(value).padStart(2, '0');

/** 起卦时间按“墙上时间”保存（已换算成所在地真太阳时），不带时区，换设备打开也不会变。 */
export const formatCastTime = (date) => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
);

export const parseCastTime = (text) => {
  const match = CAST_PATTERN.exec(typeof text === 'string' ? text.trim() : '');
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map((part) => Number(part ?? 0));
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(date.getTime()) || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
};

export const isLiuYaoValues = (values) => (
  Array.isArray(values) && values.length === 6 && values.every((value) => VALID_VALUES.has(value))
);

/**
 * @param reading buildLiuYaoReading 的结果
 * @param {Date} castDate 起卦时间（真太阳时墙上时间）
 */
export const buildLiuYaoRecord = (reading, castDate, { name, group = 'self', note = '' } = {}) => ({
  name: name?.trim() || reading.question || `${reading.hexagram.name}卦`,
  type: 'liuyao',
  group,
  note: note.trim(),
  data: {
    question: reading.question,
    method: reading.method,
    castAt: formatCastTime(castDate),
    values: [...reading.values],
    solarText: reading.time.solarText,
    lunarText: reading.time.lunarText,
    year: reading.time.year,
    month: reading.time.month,
    day: reading.time.day,
    hour: reading.time.hour,
    xunKong: [...reading.time.xunKong],
    hexagram: reading.hexagram.name,
    changed: reading.changed?.name ?? null,
    palace: `${reading.hexagram.palace}宫${reading.hexagram.palaceLabel}`,
    shi: reading.hexagram.shi,
    ying: reading.hexagram.ying,
    movingPositions: [...reading.movingPositions],
  },
});

/** 档案记录 → 重新装卦所需的输入；不是完整的六爻记录时返回 null。 */
export const liuYaoRecordToInput = (record) => {
  if (!record || record.type !== 'liuyao') return null;
  const data = record.data && typeof record.data === 'object' ? record.data : null;
  if (!data || !isLiuYaoValues(data.values)) return null;
  const castDate = parseCastTime(data.castAt);
  if (!castDate) return null;
  return {
    values: [...data.values],
    castDate,
    question: typeof data.question === 'string' ? data.question : '',
    method: data.method === 'gesture' ? 'gesture' : 'coins',
  };
};

export const isLiuYaoRecord = (record) => liuYaoRecordToInput(record) !== null;

/** 档案列表里的一行摘要：本卦→变卦、起卦时间、日辰。 */
export const describeLiuYaoRecord = (record) => {
  const data = record?.data && typeof record.data === 'object' ? record.data : {};
  const hexagram = typeof data.hexagram === 'string' ? data.hexagram : '';
  const changed = typeof data.changed === 'string' ? data.changed : '';
  const castText = typeof data.solarText === 'string' && data.solarText
    ? data.solarText
    : typeof data.castAt === 'string' ? data.castAt.slice(0, 16) : '';
  return {
    hexagramText: hexagram ? `${hexagram}${changed ? ` → ${changed}` : '（静卦）'}` : '卦象未记录',
    castText: castText ? `起卦 ${castText}` : '起卦时间未记录',
    dayText: typeof data.day === 'string' && data.day ? `${data.day}日` : '',
    methodText: LIUYAO_METHODS[data.method] ?? LIUYAO_METHODS.coins,
  };
};
