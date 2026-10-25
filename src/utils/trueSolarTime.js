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
