import { astro } from 'iztro';
import { Lunar, LunarYear } from 'lunar-javascript';
import { getZiweiFortune } from './ziweiBirth.js';

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const mod = (value, base) => ((value % base) + base) % base;
const yearGanZhiOf = (year) => `${GAN[mod(year - 4, 10)]}${ZHI[mod(year - 4, 12)]}`;

export const FORTUNE_LAYER_ORDER = ['decadal', 'yearly', 'monthly', 'daily', 'hourly'];

export const FORTUNE_LAYER_LABELS = {
  decadal: '大限',
  yearly: '流年',
  monthly: '流月',
  daily: '流日',
  hourly: '流时',
};

export const FORTUNE_HOUR_OPTIONS = [
  { index: 0, branch: '子', name: '早子时', range: '00:00-01:00' },
  { index: 1, branch: '丑', name: '丑时', range: '01:00-03:00' },
  { index: 2, branch: '寅', name: '寅时', range: '03:00-05:00' },
  { index: 3, branch: '卯', name: '卯时', range: '05:00-07:00' },
  { index: 4, branch: '辰', name: '辰时', range: '07:00-09:00' },
  { index: 5, branch: '巳', name: '巳时', range: '09:00-11:00' },
  { index: 6, branch: '午', name: '午时', range: '11:00-13:00' },
  { index: 7, branch: '未', name: '未时', range: '13:00-15:00' },
  { index: 8, branch: '申', name: '申时', range: '15:00-17:00' },
  { index: 9, branch: '酉', name: '酉时', range: '17:00-19:00' },
  { index: 10, branch: '戌', name: '戌时', range: '19:00-21:00' },
  { index: 11, branch: '亥', name: '亥时', range: '21:00-23:00' },
  { index: 12, branch: '子', name: '晚子时', range: '23:00-24:00' },
];

export const getCurrentTimeIndex = (date = new Date()) => {
  const hour = date.getHours();
  if (hour === 23) return 12;
  if (hour === 0) return 0;
  return Math.floor((hour + 1) / 2);
};

export const formatLocalDate = (date = new Date()) => (
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
);

export const getFortuneScopeKeys = (type) => {
  const targetIndex = FORTUNE_LAYER_ORDER.indexOf(type);
  if (targetIndex < 1) return [];
  return FORTUNE_LAYER_ORDER.slice(0, targetIndex + 1);
};

/**
 * 命盘的出生农历年。虚岁与大限岁数都按农历年算（排盘库：目标农历年 − 出生农历年 + 1），
 * 元旦到春节之间出生的人，农历年比公历年早一年；时间轴的年份、宫内的流年岁数都要按它排。
 * 晚子时「换次日」的命盘取排盘用的那一天（除夕晚子时就是次年正月初一）。
 * @param {object} horoscope createZiweiHoroscope 的结果
 * @returns {number|null}
 */
export const birthLunarYearOf = (horoscope) => {
  const lunarYear = Number(horoscope?.rawDates?.lunarDate?.lunarYear);
  if (Number.isInteger(lunarYear) && lunarYear > 0) return lunarYear;
  const solarYear = Number(String(horoscope?.solarDate ?? '').slice(0, 4));
  return Number.isInteger(solarYear) && solarYear > 0 ? solarYear : null;
};

/**
 * 一组运限的流年是哪一年（年号）。流年以立春为界（排盘库与 getZiweiFortune 的口径），
 * 按流年地支在 nearYear 前后一年里找：元旦到立春之间，流年仍是上一年。
 * @param {object} fortune getZiweiFortune / astrolabe.horoscope 的结果
 * @param {number} nearYear 附近的年份（公历或农历年都可）
 */
export const flowYearOf = (fortune, nearYear) => {
  const index = ZHI.indexOf(fortune?.yearly?.earthlyBranch);
  if (index < 0) return nearYear;
  return [nearYear, nearYear - 1, nearYear + 1].find((year) => mod(year - 4, 12) === index) ?? nearYear;
};

const originStemOf = (horoscope) => (
  typeof horoscope?.chineseDate === 'string'
    ? horoscope.chineseDate.trim()[0]
    : horoscope?.rawDates?.chineseDate?.yearly?.[0]
) || null;

/** 时辰序号 → 取该时辰中段的钟点，免得落在交界上（晚子时 23 点、早子时 0 点）。 */
const CLOCK_HOUR_OF_TIME_INDEX = Object.freeze([0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]);
/** 只选到日、没选时辰：按当天午时取流日。 */
const DAY_ONLY_TIME_INDEX = 6;

/**
 * 专业盘时间轴「手动选」到的各层干支：本命、大限（所选）、流年、流月、流日、流时。
 * - 只选到年、月：流年取所选年的年干；流月以该农历年的年干起五虎遁（正月寅，闰月同本月）。
 * - 选到某一天（与时辰）：流年、流月、流日、流时一律取 getZiweiFortune 在那一刻的结果，与「当前运势」同一口径——
 *   流年以立春为界，流月按农历月，晚子时按命盘的流派换算（默认换次日，连流月都随次日；
 *   「晚子不换日」的命盘流日按当天、流时用次日之子）。
 * @param {object} horoscope createZiweiHoroscope 的结果
 * @param {{ daxianIndex?: number|null, year?: number|null, lunarYear?: number|null, month?: number|null, isLeapMonth?: boolean, day?: number|null, hour?: number|null }} selection
 * @returns {{ stems: object, fortune: object|null, notes: string[] }} notes：这一刻的流年与所选年份不同（立春前后）、晚子时换日等说明
 */
export const getTimelineFortune = (horoscope, selection = {}) => {
  const stems = {};
  const notes = [];
  const result = (fortune = null) => ({ stems, fortune, notes });
  if (!horoscope) return result();

  const origin = originStemOf(horoscope);
  if (origin) stems.origin = origin;

  const { daxianIndex = null, year = null, month = null, day = null, hour = null } = selection;
  if (daxianIndex !== null) {
    const palaces = horoscope.palaces ?? [];
    const palace = palaces.find((item) => item.index === daxianIndex) ?? palaces[daxianIndex];
    if (palace?.heavenlyStem) stems.decadal = palace.heavenlyStem;
  }

  if (!year) return result();
  stems.yearly = GAN[mod(year - 4, 10)];
  if (!month) return result();
  // 流月属于所选农历年：年干按农历年起（流年年号按立春算时，两者在立春前后可能差一年）。
  const lunarYear = selection.lunarYear || year;
  stems.monthly = GAN[mod((mod(lunarYear - 4, 10) % 5) * 2 + 2 + (month - 1), 10)];
  if (!day) return result();

  let fortune;
  try {
    const solar = Lunar.fromYmd(lunarYear, selection.isLeapMonth ? -month : month, day).getSolar();
    const timeIndex = hour ?? DAY_ONLY_TIME_INDEX;
    const moment = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), CLOCK_HOUR_OF_TIME_INDEX[timeIndex], 30);
    fortune = getZiweiFortune(horoscope, moment, timeIndex);
  } catch {
    return result();
  }

  stems.yearly = fortune.yearly.heavenlyStem;
  stems.monthly = fortune.monthly.heavenlyStem;
  stems.daily = fortune.daily.heavenlyStem;
  if (hour !== null) stems.hourly = fortune.hourly.heavenlyStem;

  const flowGanZhi = `${fortune.yearly.heavenlyStem}${fortune.yearly.earthlyBranch}`;
  if (flowGanZhi !== yearGanZhiOf(year)) notes.push(`这一刻的流年是${flowGanZhi}（流年以立春为界）`);
  if (hour !== null && fortune.lateZi) {
    // 换次日时写明换到哪天（农历月日，如「十月初一」），月底的晚子时连流月都换了。
    const nextDay = String(fortune.lunarDate ?? '').replace(/^.*?年/, '');
    notes.push(fortune.lateZi.mode === 'next' && nextDay ? `晚子时换次日：流日、流时按${nextDay}子时` : fortune.lateZi.text);
  }
  return result(fortune);
};

export const getLunarMonthOptions = (year) => {
  if (!year) return [];

  const lunarYear = LunarYear.fromYear(Number(year));
  const leapMonth = lunarYear.getLeapMonth();
  const options = [];

  for (let month = 1; month <= 12; month += 1) {
    const regularMonth = lunarYear.getMonth(month);
    options.push({
      month,
      isLeap: false,
      label: `${month}月`,
      days: regularMonth.getDayCount(),
    });

    if (leapMonth === month) {
      const leap = lunarYear.getMonth(-month);
      options.push({
        month,
        isLeap: true,
        label: `闰${month}月`,
        days: leap.getDayCount(),
      });
    }
  }

  return options;
};

export const getLunarMonthDays = (year, month, isLeap = false) => {
  if (!year || !month) return 0;
  const lunarMonth = LunarYear
    .fromYear(Number(year))
    .getMonth(isLeap ? -Math.abs(month) : Math.abs(month));
  return lunarMonth?.getDayCount?.() || 0;
};

export const formatFortuneTime = (type, context) => {
  const { selection, solarDate, lunarDate } = context;
  const lunarMonth = `${selection.isLeapMonth ? '闰' : ''}${selection.month}月`;

  if (type === 'yearly') return `${selection.year}年（流年以立春为界）`;
  if (type === 'monthly') return `${selection.lunarYear}年${lunarMonth}（农历，公历 ${solarDate}）`;
  if (type === 'daily') return `${selection.lunarYear}年${lunarMonth}${selection.day}日（农历 ${lunarDate}，公历 ${solarDate}）`;

  const hour = FORTUNE_HOUR_OPTIONS.find((item) => item.index === selection.hour);
  const boundaryNote = context.dayBoundaryNote ? `；${context.dayBoundaryNote}` : '';
  return `${selection.lunarYear}年${lunarMonth}${selection.day}日 ${hour?.name || '未知时辰'} ${hour?.range || ''}（农历 ${lunarDate}，公历 ${solarDate}${boundaryNote}）`;
};

export const buildCurrentFortuneContext = ({ horoscope, basicInfo, type, now = new Date() }) => {
  if (!horoscope || typeof horoscope.horoscope !== 'function') {
    throw new Error('当前命盘缺少运限计算能力');
  }

  const scopeKeys = getFortuneScopeKeys(type);
  if (!scopeKeys.length) {
    throw new Error('不支持的运势类型');
  }

  // 晚子时按命盘的流派换算（默认换到次日：流日、流时的宫位与干支都按次日），日期用换算后的，时辰仍显示晚子时。
  const timeIndex = getCurrentTimeIndex(now);
  const fortune = getZiweiFortune(horoscope, now, timeIndex);
  const solarDate = formatLocalDate(fortune.targetDate);
  const gender = basicInfo?.gender === 'female' ? '女' : '男';
  const currentAstrolabe = astro.bySolar(solarDate, fortune.timeIndex, gender, true, 'zh-CN');
  const lunar = currentAstrolabe?.rawDates?.lunarDate;

  if (!lunar?.lunarYear || !lunar?.lunarMonth || !lunar?.lunarDay) {
    throw new Error('无法读取当前农历日期');
  }

  const decadalIndex = fortune?.decadal?.index;
  if (
    !Number.isInteger(decadalIndex)
    || decadalIndex < 0
    || !horoscope.palaces?.[decadalIndex]
  ) {
    throw new Error('当前日期未能匹配到有效大限');
  }
  const targetLayerIndex = FORTUNE_LAYER_ORDER.indexOf(type);
  const includes = (layer) => targetLayerIndex >= FORTUNE_LAYER_ORDER.indexOf(layer);

  const selection = {
    daxianIndex: decadalIndex,
    // 流年年号按立春（与运限一致）：元旦到立春之间仍是上一年；月份按农历年（lunarYear）列。
    year: flowYearOf(fortune, lunar.lunarYear),
    lunarYear: lunar.lunarYear,
    month: includes('monthly') ? Math.abs(lunar.lunarMonth) : null,
    day: includes('daily') ? lunar.lunarDay : null,
    hour: includes('hourly') ? timeIndex : null,
    isLeapMonth: Boolean(lunar.isLeap),
    targetSolarDate: solarDate,
  };

  const originStem = typeof horoscope.chineseDate === 'string'
    ? horoscope.chineseDate.trim()[0]
    : horoscope.rawDates?.chineseDate?.yearly?.[0];

  const activeStems = {
    origin: originStem,
    decadal: fortune.decadal.heavenlyStem,
    yearly: fortune.yearly.heavenlyStem,
    monthly: fortune.monthly.heavenlyStem,
    daily: fortune.daily.heavenlyStem,
    hourly: fortune.hourly.heavenlyStem,
  };

  return {
    type,
    now,
    timeIndex,
    solarDate,
    lunarDate: fortune.lunarDate,
    rawLunarDate: lunar,
    selection,
    fortune,
    activeStems,
    scopeKeys,
    dayBoundaryNote: fortune.lateZi?.text ?? '',
  };
};
