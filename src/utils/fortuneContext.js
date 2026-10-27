import { astro } from 'iztro';
import { LunarYear } from 'lunar-javascript';
import { getZiweiFortune } from './ziweiBirth.js';

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

  if (type === 'yearly') return `${selection.year}年（公历流年）`;
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
    year: fortune.targetDate.getFullYear(),
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
