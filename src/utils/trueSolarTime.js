/**
 * 真太阳时换算
 *
 * 真太阳时 = 钟表时间 − 夏令时(如有) + 经度时差 + 均时差
 *   经度时差：每度 4 分钟，以出生地所用时区的中央经线为基准（北京时间为东经 120°）
 *   均时差：地球公转轨道偏心与黄赤交角造成的太阳时快慢，全年约在 −14 ～ +16 分钟之间
 *
 * 所有日期运算都按“无时区的墙上时间”处理（内部借用 UTC 计算），不受浏览器所在时区影响。
 */

const MINUTE = 60 * 1000;
const pad = (value) => String(value).padStart(2, '0');

/** 某年某月 day 号当天或之后的第一个星期日。 */
const firstSundayOnOrAfter = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7));
  return date.getUTCDate();
};

/**
 * 中国大陆 1986–1991 年实行夏令时：
 * 1986 年 5 月 4 日起；1987–1991 年 4 月 11 日后第一个星期日起；
 * 每年 9 月 11 日后第一个星期日结束；均在凌晨 2 点切换。
 */
export const getChinaDstPeriod = (year) => {
  if (year < 1986 || year > 1991) return null;
  const startDay = year === 1986 ? 4 : firstSundayOnOrAfter(year, 4, 11);
  const startMonth = year === 1986 ? 5 : 4;
  return {
    start: { month: startMonth, day: startDay },
    end: { month: 9, day: firstSundayOnOrAfter(year, 9, 11) },
  };
};

const toWallTimestamp = ({ year, month, day, hour = 0, minute = 0 }) => Date.UTC(year, month - 1, day, hour, minute);

export const isChinaDst = (moment) => {
  const period = getChinaDstPeriod(moment.year);
  if (!period) return false;
  const value = toWallTimestamp(moment);
  const start = toWallTimestamp({ year: moment.year, ...period.start, hour: 2 });
  const end = toWallTimestamp({ year: moment.year, ...period.end, hour: 2 });
  return value >= start && value < end;
};

/**
 * 均时差（分钟），正值表示真太阳时快于平太阳时。
 * 采用美国海军天文台（USNO）的太阳位置近似算法，误差约 0.1 分钟。
 * @param moment 当地标准时间；timezone 为该时间所用时区（北京时间为 8）
 */
export const getEquationOfTimeMinutes = ({ year, month, day, hour = 12, minute = 0 }, timezone = 8) => {
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - timezone * 60 * MINUTE;
  const d = utcMs / (24 * 60 * MINUTE) + 2440587.5 - 2451545.0; // 自 J2000.0 起的天数
  const rad = Math.PI / 180;
  const meanAnomaly = (357.529 + 0.98560028 * d) * rad;
  const meanLongitude = 280.459 + 0.98564736 * d;
  const eclipticLongitude = (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.020 * Math.sin(2 * meanAnomaly)) * rad;
  const obliquity = (23.439 - 0.00000036 * d) * rad;
  const rightAscensionHours = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude)) / rad / 15;
  let differenceHours = (meanLongitude / 15 - rightAscensionHours) % 24;
  if (differenceHours > 12) differenceHours -= 24;
  if (differenceHours < -12) differenceHours += 24;
  return differenceHours * 60;
};

const fromWallTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
};

export const formatClock = ({ hour, minute }) => `${pad(hour)}:${pad(minute)}`;

/** 墙上时间加减若干分钟（可跨日、跨月）。 */
export const shiftWallTime = (moment, minutes) => fromWallTimestamp(toWallTimestamp(moment) + minutes * MINUTE);

/**
 * @param {{year:number, month:number, day:number, hour:number, minute:number}} clock 出生地钟表时间（公历）
 * @param {{longitude?: number, timezone?: number, applyTrueSolar?: boolean, applyDst?: boolean}} options
 */
export const toTrueSolarTime = (clock, {
  longitude = null,
  timezone = 8,
  applyTrueSolar = true,
  applyDst = false,
} = {}) => {
  const clockTimestamp = toWallTimestamp(clock);
  const dstMinutes = applyDst ? -60 : 0;
  const standardTimestamp = clockTimestamp + dstMinutes * MINUTE;
  const canCorrect = applyTrueSolar && Number.isFinite(longitude);
  const longitudeMinutes = canCorrect ? (longitude - timezone * 15) * 4 : 0;
  const equationMinutes = canCorrect ? getEquationOfTimeMinutes(fromWallTimestamp(standardTimestamp), timezone) : 0;
  const totalMinutes = dstMinutes + longitudeMinutes + equationMinutes;
  // 精确到秒后四舍五入到分钟，避免显示 06:38 却按 06:39 判断时辰。
  const correctedTimestamp = Math.round((clockTimestamp + totalMinutes * MINUTE) / MINUTE) * MINUTE;

  return {
    ...fromWallTimestamp(correctedTimestamp),
    corrected: canCorrect,
    dstMinutes,
    longitudeMinutes,
    equationMinutes,
    totalMinutes,
  };
};

/**
 * 时辰交界提示：时辰在奇数整点交接（23、1、3 … 21 点）。
 * 返回距离最近交界的分钟数，以及跨过交界后对应的钟表时间。
 */
export const getShichenBoundary = (corrected, clock, totalMinutes) => {
  const minutes = corrected.hour * 60 + corrected.minute;
  // 前一日 23 点、当日 1…23 点、次日 1 点。
  const boundaries = [-60, ...Array.from({ length: 12 }, (_, index) => (index * 2 + 1) * 60), 25 * 60];
  const best = boundaries
    .map((boundary) => ({ boundary, distance: boundary - minutes }))
    .reduce((nearest, item) => (Math.abs(item.distance) < Math.abs(nearest.distance) ? item : nearest));
  return {
    minutesToBoundary: Math.abs(best.distance),
    isBeforeBoundary: best.distance > 0,
    boundaryHour: ((best.boundary / 60) % 24 + 24) % 24,
    // 钟表时间早于/晚于这一刻出生，时辰就会不同。
    boundaryClock: fromWallTimestamp(toWallTimestamp(clock) + best.distance * MINUTE),
    totalMinutes,
  };
};

const ZONE_FORMATTERS = new Map();

const zoneFormatter = (zone) => {
  if (!ZONE_FORMATTERS.has(zone)) {
    ZONE_FORMATTERS.set(zone, new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }));
  }
  return ZONE_FORMATTERS.get(zone);
};

/** 某个绝对时刻在指定时区的墙上时间，写成「当作 UTC 的毫秒数」，便于与时刻相减得到偏移。 */
const zoneWallTimestamp = (zone, utcMs) => {
  const parts = {};
  zoneFormatter(zone).formatToParts(new Date(utcMs)).forEach((part) => { parts[part.type] = part.value; });
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
};

/**
 * 出生地在出生那一刻实际用的时区（相对 UTC 的小时数，可带小数），取自运行环境自带的 IANA 时区库。
 *
 * 不少地方改过时区：马来西亚半岛与新加坡 1982 年以前用 UTC+7:30，爪哇 1964 年以前用 UTC+7:30，
 * 西加里曼丹 1964–1987 年用 UTC+8。按现在的时区去换算这些年份的出生时间，真太阳时会差半小时。
 * 返回的偏移已经包含当地当时的夏令时，用它的时候不要再另减夏令时。
 *
 * @param {string} zone IANA 时区名，如 'Asia/Kuala_Lumpur'
 * @param {{year:number, month:number, day:number, hour?:number, minute?:number}} clock 出生地钟表时间（公历）
 * @returns {number|null} 时区名无效或运行环境不支持时返回 null
 */
export const getZoneOffsetHours = (zone, clock) => {
  if (!zone || !clock || !Number.isInteger(clock.year) || !Number.isInteger(clock.month) || !Number.isInteger(clock.day)) return null;
  try {
    const wall = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour ?? 12, clock.minute ?? 0);
    // 先把墙上时间当成 UTC 试一次，再用得到的偏移回头校一次：两次不同，说明出生时刻离时区变更不远。
    const guess = zoneWallTimestamp(zone, wall) - wall;
    const offset = zoneWallTimestamp(zone, wall - guess) - (wall - guess);
    return Math.round(offset / 1000) / 3600;
  } catch {
    return null;
  }
};
