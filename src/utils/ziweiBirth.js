import { astro } from 'iztro';

const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬']);
const YIN_STEMS = new Set(['乙', '丁', '己', '辛', '癸']);

/** 晚子时（23:00–24:00）的两种流派：按次日子时排盘（通行做法，排盘库默认），或按当天排盘（与八字模块「晚子不换日」一致）。 */
export const ZIWEI_LATE_ZI_MODES = Object.freeze([
  Object.freeze({ value: 'next', label: '晚子换次日', note: '23 时起算次日，命盘按次日子时排' }),
  Object.freeze({ value: 'same', label: '晚子不换日', note: '23 时仍属当日，时柱用次日子时' }),
]);
export const DEFAULT_LATE_ZI_MODE = 'next';
export const normalizeLateZiMode = (value) => (value === 'same' ? 'same' : 'next');

const toIztroGender = (gender) => (
  gender === 'female' || gender === '女' ? '女' : '男'
);

const pad = (value) => String(value).padStart(2, '0');

/** iztro 的 solarDate 原样回显传入的写法；这里统一用 YYYY-MM-DD。 */
const nextSolarDate = (solarDate) => {
  const [year, month, day] = String(solarDate).split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
};

const byDate = ({ calendarType, birthDate, timeIndex, iztroGender, isLeapMonth }) => (
  calendarType === 'lunar'
    ? astro.byLunar(birthDate, timeIndex, iztroGender, Boolean(isLeapMonth), true, 'zh-CN')
    : astro.bySolar(birthDate, timeIndex, iztroGender, true, 'zh-CN')
);

const joinChineseDate = (chineseDate) => ['yearly', 'monthly', 'daily', 'hourly'].map((key) => chineseDate[key].join('')).join(' ');

/**
 * 晚子时排盘。
 *
 * 排盘库（iztro）默认「晚子时算次日」，但只把农历日数加一而不换月：遇上廿九、三十的晚子时就会用上月的月份安命，
 * 日数却已算到下月初一。这里改为整体换到次日的早子时再排，年、月、日、时一致；录入的出生日期仍保留给显示用。
 * 「晚子不换日」则按当天子时安星，日柱仍为当天，时柱用次日之子（与八字模块同一口径）。
 */
const createLateZiHoroscope = ({ calendarType, birthDate, iztroGender, isLeapMonth, lateZiMode }) => {
  // 当天早子时的盘：安星与「不换日」一致，也顺便拿到录入日期对应的公历、农历与当天日柱。
  const sameDay = byDate({ calendarType, birthDate, timeIndex: 0, iztroGender, isLeapMonth });
  const inputSolarDate = sameDay.solarDate;
  const inputLunarDate = sameDay.lunarDate;
  const [year, month, day] = inputSolarDate.split('-').map(Number);
  const inputSolarText = `${year}-${pad(month)}-${pad(day)}`;

  if (lateZiMode === 'same') {
    // 时柱按 23 点半算（次日之子），日柱保留当天。
    const lateHour = astro.bySolar(inputSolarDate, 12, iztroGender, true, 'zh-CN');
    const chineseDate = { ...sameDay.rawDates.chineseDate, hourly: lateHour.rawDates.chineseDate.hourly };
    sameDay.rawDates = { ...sameDay.rawDates, chineseDate };
    sameDay.chineseDate = joinChineseDate(chineseDate);
    sameDay.time = '晚子时';
    sameDay.timeRange = '23:00~00:00';
    sameDay.lateZi = {
      mode: 'same',
      chartSolarDate: inputSolarText,
      chartLunarDate: inputLunarDate,
      text: `晚子时不换日：按当天（${inputSolarText}，${inputLunarDate}）子时安星，时柱用次日之子`,
    };
    return sameDay;
  }

  const shifted = astro.bySolar(nextSolarDate(inputSolarDate), 0, iztroGender, true, 'zh-CN');
  const chartSolarDate = shifted.solarDate;
  const chartLunarDate = shifted.lunarDate;
  const [nextYear, nextMonth, nextDay] = chartSolarDate.split('-').map(Number);
  const chartSolarText = `${nextYear}-${pad(nextMonth)}-${pad(nextDay)}`;
  // 运限（大限、流年、流月）要按排盘用的次日算，其余时候对外显示录入的出生日期。
  const innerHoroscope = shifted.horoscope;
  shifted.horoscope = (targetDate, timeIndexOfTarget) => {
    shifted.solarDate = chartSolarDate;
    try {
      return innerHoroscope(targetDate, timeIndexOfTarget);
    } finally {
      shifted.solarDate = inputSolarDate;
    }
  };
  shifted.solarDate = inputSolarDate;
  shifted.lunarDate = inputLunarDate;
  shifted.time = '晚子时';
  shifted.timeRange = '23:00~00:00';
  shifted.lateZi = {
    mode: 'next',
    chartSolarDate: chartSolarText,
    chartLunarDate,
    text: `晚子时换次日：按次日（${chartSolarText}，${chartLunarDate}）子时排盘`,
  };
  return shifted;
};

/**
 * @param {object} input
 * @param {'solar'|'lunar'} [input.calendarType]
 * @param {string} input.birthDate 公历或农历 YYYY-MM-DD
 * @param {number|string} input.timeIndex 时辰序号 0（早子时）～12（晚子时）
 * @param {'male'|'female'|'男'|'女'} input.gender
 * @param {boolean} [input.isLeapMonth]
 * @param {'next'|'same'} [input.lateZiMode] 晚子时流派，见 ZIWEI_LATE_ZI_MODES
 */
export const createZiweiHoroscope = ({
  calendarType = 'solar',
  birthDate,
  timeIndex,
  gender,
  isLeapMonth = false,
  lateZiMode = DEFAULT_LATE_ZI_MODE,
}) => {
  const iztroGender = toIztroGender(gender);
  const index = Number(timeIndex);

  if (index === 12) {
    return createLateZiHoroscope({ calendarType, birthDate, iztroGender, isLeapMonth, lateZiMode: normalizeLateZiMode(lateZiMode) });
  }

  return byDate({ calendarType, birthDate, timeIndex: index, iztroGender, isLeapMonth });
};

export const getYinYangGenderLabel = (horoscope, gender) => {
  const rawYearStem = horoscope?.rawDates?.chineseDate?.yearly?.[0];
  const formattedYearStem = typeof horoscope?.chineseDate === 'string'
    ? horoscope.chineseDate.trim()[0]
    : '';
  const yearStem = rawYearStem || formattedYearStem;
  const genderLabel = toIztroGender(gender);

  if (YANG_STEMS.has(yearStem)) return `阳${genderLabel}`;
  if (YIN_STEMS.has(yearStem)) return `阴${genderLabel}`;
  return genderLabel;
};
