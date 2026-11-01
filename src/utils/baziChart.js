import {
  Lunar,
  LunarUtil,
  LunarYear,
  Solar,
} from 'lunar-javascript';
import { buildShenshaContext, getShensha } from './baziShensha.js';
import {
  formatClock,
  getShichenBoundary,
  isChinaDst,
  shiftWallTime,
  toTrueSolarTime,
} from './trueSolarTime.js';

const GAN_WUXING = Object.freeze({
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
});

const ZHI_WUXING = Object.freeze({
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
});

const PILLAR_DEFINITIONS = Object.freeze([
  { key: 'year', name: '年柱', method: 'Year' },
  { key: 'month', name: '月柱', method: 'Month' },
  { key: 'day', name: '日柱', method: 'Day' },
  { key: 'time', name: '时柱', method: 'Time' },
]);

export const BAZI_HOUR_OPTIONS = Object.freeze([
  { index: 0, hour: 0, branch: '子', name: '早子时', range: '00:00-01:00' },
  { index: 1, hour: 1, branch: '丑', name: '丑时', range: '01:00-03:00' },
  { index: 2, hour: 3, branch: '寅', name: '寅时', range: '03:00-05:00' },
  { index: 3, hour: 5, branch: '卯', name: '卯时', range: '05:00-07:00' },
  { index: 4, hour: 7, branch: '辰', name: '辰时', range: '07:00-09:00' },
  { index: 5, hour: 9, branch: '巳', name: '巳时', range: '09:00-11:00' },
  { index: 6, hour: 11, branch: '午', name: '午时', range: '11:00-13:00' },
  { index: 7, hour: 13, branch: '未', name: '未时', range: '13:00-15:00' },
  { index: 8, hour: 15, branch: '申', name: '申时', range: '15:00-17:00' },
  { index: 9, hour: 17, branch: '酉', name: '酉时', range: '17:00-19:00' },
  { index: 10, hour: 19, branch: '戌', name: '戌时', range: '19:00-21:00' },
  { index: 11, hour: 21, branch: '亥', name: '亥时', range: '21:00-23:00' },
  { index: 12, hour: 23, branch: '子', name: '晚子时', range: '23:00-24:00' },
]);

/** 把钟表小时映射到 13 个时段（0 早子 … 11 亥 · 12 晚子）。 */
export const getHourIndexForTime = (hour) => {
  if (hour === 0) return 0;
  if (hour === 23) return 12;
  return Math.floor((hour + 1) / 2);
};

// 距离时辰交界在此范围内时，提示另一种可能的时柱。
export const SHICHEN_BOUNDARY_WARNING_MINUTES = 20;

const toInteger = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new Error(`${fieldName}必须是整数`);
  }
  return number;
};

const isSupportedCalendar = (calendarType) => (
  calendarType === 'solar' || calendarType === 'lunar'
);

const getSolarDayCount = (year, month) => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return 0;
  }
  return new Date(year, month, 0).getDate();
};

export const getBaziMonthOptions = (calendarType, year) => {
  const numericYear = Number(year);
  if (!isSupportedCalendar(calendarType) || !Number.isInteger(numericYear)) {
    return [];
  }

  if (calendarType === 'solar') {
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      return {
        value: month,
        month,
        isLeap: false,
        label: `${month}月`,
        days: getSolarDayCount(numericYear, month),
      };
    });
  }

  try {
    return LunarYear.fromYear(numericYear).getMonthsInYear().map((lunarMonth) => {
      const value = lunarMonth.getMonth();
      const month = Math.abs(value);
      const isLeap = value < 0;
      return {
        value,
        month,
        isLeap,
        label: `${isLeap ? '闰' : ''}${month}月`,
        days: lunarMonth.getDayCount(),
      };
    });
  } catch {
    return [];
  }
};

export const getBaziDayCount = (calendarType, year, month) => {
  const numericYear = Number(year);
  const numericMonth = Number(month);

  if (calendarType === 'solar') {
    return getSolarDayCount(numericYear, numericMonth);
  }
  if (calendarType !== 'lunar' || !Number.isInteger(numericYear) || !Number.isInteger(numericMonth)) {
    return 0;
  }

  try {
    return LunarYear.fromYear(numericYear).getMonth(numericMonth)?.getDayCount?.() ?? 0;
  } catch {
    return 0;
  }
};

const getPillar = (eightChar, definition) => {
  const prefix = definition.method;
  const gan = eightChar[`get${prefix}Gan`]();
  const zhi = eightChar[`get${prefix}Zhi`]();
  const hiddenGans = Array.from(eightChar[`get${prefix}HideGan`]() ?? []);
  const hiddenShiShens = Array.from(eightChar[`get${prefix}ShiShenZhi`]() ?? []);
  const ganWuxing = GAN_WUXING[gan] ?? '';
  const zhiWuxing = ZHI_WUXING[zhi] ?? '';

  return {
    key: definition.key,
    name: definition.name,
    ganZhi: `${gan}${zhi}`,
    gan,
    zhi,
    ganShiShen: eightChar[`get${prefix}ShiShenGan`](),
    hiddenGans,
    hiddenShiShens,
    hiddenGanDetails: hiddenGans.map((hiddenGan, index) => ({
      gan: hiddenGan,
      shiShen: hiddenShiShens[index] ?? '',
      wuxing: GAN_WUXING[hiddenGan] ?? '',
    })),
    diShi: eightChar[`get${prefix}DiShi`](),
    // 自坐：本柱天干在本柱地支的十二长生（问真“自坐”一栏）。
    ziZuo: getDayMasterDiShi(gan, zhi),
    xun: eightChar[`get${prefix}Xun`](),
    xunKong: eightChar[`get${prefix}XunKong`](),
    naYin: eightChar[`get${prefix}NaYin`](),
    ganWuxing,
    zhiWuxing,
    wuxing: { gan: ganWuxing, zhi: zhiWuxing },
  };
};

const getGanShiShen = (dayGan, gan) => LunarUtil.SHI_SHEN[`${dayGan}${gan}`] ?? '';

const getHiddenGanDetails = (dayGan, zhi) => {
  const hiddenGans = Array.from(LunarUtil.ZHI_HIDE_GAN[zhi] ?? []);
  return hiddenGans.map((gan) => ({
    gan,
    shiShen: getGanShiShen(dayGan, gan),
    wuxing: GAN_WUXING[gan] ?? '',
  }));
};

// 与 EightChar#get*DiShi 使用同一口径：以日主天干观察目标地支，
// 并非以目标干支的天干计算“自坐”。
const getDayMasterDiShi = (dayGan, zhi) => {
  const dayGanIndex = LunarUtil.GAN.indexOf(dayGan) - 1;
  const zhiIndex = LunarUtil.ZHI.indexOf(zhi) - 1;
  const offset = LunarUtil.CHANG_SHENG_OFFSET[dayGan];
  if (dayGanIndex < 0 || zhiIndex < 0 || !Number.isInteger(offset)) {
    return '';
  }

  const rawIndex = offset + (dayGanIndex % 2 === 0 ? zhiIndex : -zhiIndex);
  const index = ((rawIndex % 12) + 12) % 12;
  return LunarUtil.CHANG_SHENG[index] ?? '';
};

/**
 * 以日主为基准描述任意一组干支（流月、流日、流时等共用）。
 * 字段口径与流年、大运保持一致，便于在专业对照表中并列显示。
 */
export const describeGanZhi = (ganZhi, dayGan) => {
  const gan = ganZhi.slice(0, 1);
  const zhi = ganZhi.slice(1, 2);
  const hiddenGanDetails = getHiddenGanDetails(dayGan, zhi);
  return {
    ganZhi,
    gan,
    zhi,
    ganWuxing: GAN_WUXING[gan] ?? '',
    zhiWuxing: ZHI_WUXING[zhi] ?? '',
    ganShiShen: getGanShiShen(dayGan, gan),
    hiddenGans: hiddenGanDetails.map((detail) => detail.gan),
    hiddenShiShens: hiddenGanDetails.map((detail) => detail.shiShen),
    hiddenGanDetails,
    naYin: LunarUtil.NAYIN[ganZhi] ?? '',
    diShi: getDayMasterDiShi(dayGan, zhi),
    diShiBasis: '日主临支',
    ziZuo: getDayMasterDiShi(gan, zhi),
    xun: LunarUtil.getXun(ganZhi),
    xunKong: LunarUtil.getXunKong(ganZhi),
  };
};

/** 按正月初一换年时的年柱：干支另取，其余字段与 getPillar 同一口径（十神、藏干、十二长生、旬空、纳音）。 */
const buildYearPillarFromGanZhi = (ganZhi, dayGan, definition) => {
  const described = describeGanZhi(ganZhi, dayGan);
  const { diShiBasis: _basis, ...rest } = described;
  return { key: definition.key, name: definition.name, ...rest, wuxing: { gan: rest.ganWuxing, zhi: rest.zhiWuxing } };
};

const buildLiuNian = (liuNian, currentBaziYear, dayGan, sourceDaYunIndex, ageOffset = 0) => {
  const ganZhi = liuNian.getGanZhi();
  const gan = ganZhi.slice(0, 1);
  const zhi = ganZhi.slice(1, 2);
  const hiddenGanDetails = getHiddenGanDetails(dayGan, zhi);
  return {
    name: '流年',
    type: 'liuNian',
    index: liuNian.getIndex(),
    sourceDaYunIndex,
    year: liuNian.getYear(),
    age: liuNian.getAge() + ageOffset,
    ganZhi,
    gan,
    zhi,
    ganWuxing: GAN_WUXING[gan] ?? '',
    zhiWuxing: ZHI_WUXING[zhi] ?? '',
    ganShiShen: getGanShiShen(dayGan, gan),
    hiddenGans: hiddenGanDetails.map((detail) => detail.gan),
    hiddenShiShens: hiddenGanDetails.map((detail) => detail.shiShen),
    hiddenGanDetails,
    naYin: LunarUtil.NAYIN[ganZhi] ?? '',
    diShi: getDayMasterDiShi(dayGan, zhi),
    diShiBasis: '日主临支',
    ziZuo: getDayMasterDiShi(gan, zhi),
    xun: liuNian.getXun(),
    xunKong: liuNian.getXunKong(),
    // 八字流年以立春为界，不能直接用公历年份判断。
    isCurrent: liuNian.getYear() === currentBaziYear,
  };
};

const solarToLocalTimestamp = (solar) => new Date(
  solar.getYear(),
  solar.getMonth() - 1,
  solar.getDay(),
  solar.getHour(),
  solar.getMinute(),
  solar.getSecond(),
).getTime();

const buildDaYun = (daYun, now, yunStartSolar, currentBaziYear, dayGan, ageOffset = 0) => {
  const ganZhi = daYun.getGanZhi();
  const gan = ganZhi.slice(0, 1);
  const zhi = ganZhi.slice(1, 2);
  const hiddenGanDetails = getHiddenGanDetails(dayGan, zhi);
  const yearOffset = (daYun.getIndex() - 1) * 10;
  const exactStartSolar = yunStartSolar.nextYear(yearOffset);
  const exactEndSolar = yunStartSolar.nextYear(yearOffset + 10);
  const nowTimestamp = now.getTime();
  const exactStartTimestamp = solarToLocalTimestamp(exactStartSolar);
  const exactEndTimestamp = solarToLocalTimestamp(exactEndSolar);

  return {
    name: '大运',
    type: 'dayun',
    index: daYun.getIndex(),
    startAge: daYun.getStartAge() + ageOffset,
    endAge: daYun.getEndAge() + ageOffset,
    startYear: daYun.getStartYear(),
    endYear: daYun.getEndYear(),
    exactStartSolar: exactStartSolar.toYmdHms(),
    exactEndSolar: exactEndSolar.toYmdHms(),
    ganZhi,
    gan,
    zhi,
    ganWuxing: GAN_WUXING[gan] ?? '',
    zhiWuxing: ZHI_WUXING[zhi] ?? '',
    ganShiShen: getGanShiShen(dayGan, gan),
    hiddenGans: hiddenGanDetails.map((detail) => detail.gan),
    hiddenShiShens: hiddenGanDetails.map((detail) => detail.shiShen),
    hiddenGanDetails,
    naYin: LunarUtil.NAYIN[ganZhi] ?? '',
    diShi: getDayMasterDiShi(dayGan, zhi),
    diShiBasis: '日主临支',
    ziZuo: getDayMasterDiShi(gan, zhi),
    xun: daYun.getXun(),
    xunKong: daYun.getXunKong(),
    // 大运以实际交运时刻为边界，而不是每年元旦粗略切换。
    isCurrent: nowTimestamp >= exactStartTimestamp && nowTimestamp < exactEndTimestamp,
    liuNian: daYun.getLiuNian().map((item) => buildLiuNian(item, currentBaziYear, dayGan, daYun.getIndex(), ageOffset)),
  };
};

const validateInput = (input) => {
  if (!input || typeof input !== 'object') {
    throw new Error('缺少八字排盘输入');
  }

  const calendarType = input.calendarType ?? 'solar';
  if (!isSupportedCalendar(calendarType)) {
    throw new Error('日历类型必须是 solar 或 lunar');
  }

  const year = toInteger(input.year, '出生年');
  const month = toInteger(input.month, '出生月');
  const day = toInteger(input.day, '出生日');
  const timeMode = input.timeMode === 'exact' ? 'exact' : input.timeMode === 'unknown' ? 'unknown' : 'shichen';
  let hourIndex = null;
  let hourOption = null;
  let exact = null;
  if (timeMode === 'unknown') {
    // 时辰不详：只排年月日三柱；日柱与起运按正午估算（同一天任何时辰日柱相同，晚子时除外）。
  } else if (timeMode === 'exact') {
    const clockHour = toInteger(input.clockHour, '出生小时');
    const clockMinute = toInteger(input.clockMinute, '出生分钟');
    if (clockHour < 0 || clockHour > 23 || clockMinute < 0 || clockMinute > 59) {
      throw new Error('出生时间无效');
    }
    const hasLongitude = input.longitude !== null && input.longitude !== undefined && input.longitude !== '';
    const longitude = hasLongitude ? Number(input.longitude) : null;
    if (hasLongitude && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      throw new Error('经度必须介于 -180 与 180 之间');
    }
    const timezone = input.timezone === undefined || input.timezone === null || input.timezone === '' ? 8 : Number(input.timezone);
    if (!Number.isFinite(timezone) || timezone < -12 || timezone > 14) {
      throw new Error('时区无效');
    }
    exact = {
      clockHour,
      clockMinute,
      longitude,
      timezone,
      placeName: typeof input.placeName === 'string' ? input.placeName.slice(0, 40) : '',
      applyTrueSolar: input.applyTrueSolar !== false && longitude !== null,
      applyDst: Boolean(input.applyDst),
    };
  } else {
    hourIndex = toInteger(input.hourIndex, '时辰');
    hourOption = BAZI_HOUR_OPTIONS.find((option) => option.index === hourIndex);
    if (!hourOption) {
      throw new Error('时辰选项无效');
    }
  }

  const daySect = input.daySect == null ? 2 : toInteger(input.daySect, '子时换日流派');
  if (daySect !== 1 && daySect !== 2) {
    throw new Error('子时换日流派必须是1或2');
  }
  // 年柱分界：子平法以立春换年（默认）；另一派以农历正月初一换年。两派只在立春与正月初一之间出生的人身上有差别。
  const yearBoundary = input.yearBoundary == null ? 'lichun' : input.yearBoundary;
  if (yearBoundary !== 'lichun' && yearBoundary !== 'chunjie') {
    throw new Error('年柱分界必须是 lichun（立春）或 chunjie（正月初一）');
  }

  const gender = input.gender === 'female' ? 'female' : input.gender === 'male' ? 'male' : null;
  if (!gender) {
    throw new Error('性别必须是 male 或 female');
  }

  const dayCount = getBaziDayCount(calendarType, year, month);
  if (!dayCount) {
    throw new Error(`${calendarType === 'lunar' ? '农历' : '公历'}出生月无效`);
  }
  if (day < 1 || day > dayCount) {
    throw new Error(`出生日必须介于1与${dayCount}之间`);
  }

  return {
    calendarType,
    year,
    month,
    day,
    timeMode,
    exact,
    hourIndex,
    hour: hourOption?.hour ?? 12,
    hourOption,
    gender,
    daySect,
    yearBoundary,
  };
};

export const YEAR_BOUNDARY_OPTIONS = Object.freeze([
  { value: 'lichun', label: '立春换年', note: '子平法通行口径' },
  { value: 'chunjie', label: '正月初一换年', note: '按农历新年' },
]);

/**
 * 两种年柱分界在这个出生日上是否不同：立春（按日，正午）与农历正月初一各取一个年干支。
 * 给录入页决定要不要显示「年柱分界」开关；无效日期返回 null。
 */
export const getYearBoundaryInfo = (calendarType, year, month, day) => {
  try {
    const lunar = calendarType === 'lunar' ? Lunar.fromYmdHms(year, month, day, 12, 0, 0) : Solar.fromYmdHms(year, month, day, 12, 0, 0).getLunar();
    const lichun = lunar.getYearInGanZhiByLiChun();
    const chunjie = lunar.getYearInGanZhi();
    return { lichun, chunjie, differs: lichun !== chunjie };
  } catch {
    return null;
  }
};

/** 出生日期（公历或农历）对应的公历日期；无效时返回 null。 */
export const getClockSolarDate = (calendarType, year, month, day) => {
  try {
    const solar = calendarType === 'lunar' ? Lunar.fromYmd(year, month, day).getSolar() : Solar.fromYmd(year, month, day);
    return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
  } catch {
    return null;
  }
};

const momentToSolar = (moment) => Solar.fromYmdHms(moment.year, moment.month, moment.day, moment.hour, moment.minute, 0);

/** 时辰不详时的时柱占位：各字段留空，表格与提示词显示「不详」。 */
const UNKNOWN_TIME_PILLAR = Object.freeze({
  key: 'time',
  name: '时柱',
  unknown: true,
  ganZhi: '',
  gan: '',
  zhi: '',
  ganShiShen: '',
  hiddenGans: [],
  hiddenShiShens: [],
  hiddenGanDetails: [],
  diShi: '',
  ziZuo: '',
  xun: '',
  xunKong: '',
  naYin: '',
  ganWuxing: '',
  zhiWuxing: '',
  wuxing: { gan: '', zhi: '' },
  shensha: [],
});

/**
 * 精确时间模式：钟表时间 →（夏令时）→ 真太阳时，并给出时辰交界提示。
 */
const resolveExactMoment = (normalized) => {
  const { exact } = normalized;
  const clockSolar = normalized.calendarType === 'lunar'
    ? Lunar.fromYmdHms(normalized.year, normalized.month, normalized.day, exact.clockHour, exact.clockMinute, 0).getSolar()
    : Solar.fromYmdHms(normalized.year, normalized.month, normalized.day, exact.clockHour, exact.clockMinute, 0);
  const clock = {
    year: clockSolar.getYear(),
    month: clockSolar.getMonth(),
    day: clockSolar.getDay(),
    hour: exact.clockHour,
    minute: exact.clockMinute,
  };
  const corrected = toTrueSolarTime(clock, {
    longitude: exact.longitude,
    timezone: exact.timezone,
    applyTrueSolar: exact.applyTrueSolar,
    applyDst: exact.applyDst,
  });
  const boundary = getShichenBoundary(corrected, clock, corrected.totalMinutes);
  let alternative = null;
  if (boundary.minutesToBoundary <= SHICHEN_BOUNDARY_WARNING_MINUTES) {
    const signedDistance = boundary.isBeforeBoundary ? boundary.minutesToBoundary : -boundary.minutesToBoundary;
    const acrossMinutes = signedDistance > 0 ? signedDistance : signedDistance - 1;
    const acrossMoment = shiftWallTime(corrected, acrossMinutes);
    const acrossEightChar = momentToSolar(acrossMoment).getLunar().getEightChar();
    acrossEightChar.setSect(normalized.daySect);
    const acrossHourIndex = getHourIndexForTime(acrossMoment.hour);
    alternative = {
      timeGanZhi: acrossEightChar.getTime(),
      dayGanZhi: acrossEightChar.getDay(),
      hourName: BAZI_HOUR_OPTIONS[acrossHourIndex].name,
      hourIndex: acrossHourIndex,
    };
  }

  return {
    clock,
    corrected,
    hourIndex: getHourIndexForTime(corrected.hour),
    timeInfo: {
      mode: 'exact',
      clockDate: clockSolar.toYmd(),
      clockTime: formatClock(clock),
      correctedDate: momentToSolar(corrected).toYmd(),
      correctedTime: formatClock(corrected),
      trueSolarApplied: corrected.corrected,
      dstApplied: exact.applyDst,
      dstSuggested: isChinaDst(clock),
      longitude: exact.longitude,
      timezone: exact.timezone,
      placeName: exact.placeName,
      longitudeMinutes: corrected.longitudeMinutes,
      equationMinutes: corrected.equationMinutes,
      totalMinutes: corrected.totalMinutes,
      boundary: alternative ? {
        minutesToBoundary: boundary.minutesToBoundary,
        isBeforeBoundary: boundary.isBeforeBoundary,
        boundaryClockTime: formatClock(boundary.boundaryClock),
        alternative,
      } : null,
    },
  };
};

/**
 * 只做出生时间换算，不排八字：钟表时间 → 真太阳时 → 时辰（含交界提示）。
 * 供紫微等模块复用，保证同一个人在各模块里算出同一个时辰。
 * @returns {{ hourIndex: number, hourName: string, timeInfo: object }}
 */
export const resolveExactBirth = (input) => {
  const normalized = validateInput({ ...input, timeMode: 'exact', gender: input.gender ?? 'male' });
  const resolved = resolveExactMoment(normalized);
  return {
    hourIndex: resolved.hourIndex,
    hourName: BAZI_HOUR_OPTIONS[resolved.hourIndex].name,
    timeInfo: resolved.timeInfo,
  };
};

export const buildBaziChart = (input, now = new Date()) => {
  const normalized = validateInput(input);
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('当前日期无效');
  }

  let lunar;
  let solar;
  let timeInfo = { mode: normalized.timeMode };
  const timeUnknown = normalized.timeMode === 'unknown';
  if (normalized.timeMode === 'exact') {
    const resolved = resolveExactMoment(normalized);
    solar = momentToSolar(resolved.corrected);
    lunar = solar.getLunar();
    normalized.hourIndex = resolved.hourIndex;
    normalized.hourOption = BAZI_HOUR_OPTIONS[resolved.hourIndex];
    normalized.hour = resolved.corrected.hour;
    timeInfo = resolved.timeInfo;
  } else if (normalized.calendarType === 'lunar') {
    lunar = Lunar.fromYmdHms(
      normalized.year,
      normalized.month,
      normalized.day,
      normalized.hour,
      0,
      0,
    );
    solar = lunar.getSolar();
  } else {
    solar = Solar.fromYmdHms(
      normalized.year,
      normalized.month,
      normalized.day,
      normalized.hour,
      0,
      0,
    );
    lunar = solar.getLunar();
  }

  const eightChar = lunar.getEightChar();
  eightChar.setSect(normalized.daySect);
  const dayMasterGan = eightChar.getDayGan();
  // 年柱：lunar-javascript 的八字按立春（精确到时刻）换年；选「正月初一」时用农历年干支另排年柱。
  const yearBoundary = {
    mode: normalized.yearBoundary,
    lichun: eightChar.getYear(),
    chunjie: lunar.getYearInGanZhi(),
  };
  yearBoundary.differs = yearBoundary.lichun !== yearBoundary.chunjie;
  const useChunjieYear = normalized.yearBoundary === 'chunjie' && yearBoundary.differs;
  const rawPillars = PILLAR_DEFINITIONS
    .map((definition) => {
      if (timeUnknown && definition.key === 'time') return UNKNOWN_TIME_PILLAR;
      if (useChunjieYear && definition.key === 'year') return buildYearPillarFromGanZhi(yearBoundary.chunjie, dayMasterGan, definition);
      return getPillar(eightChar, definition);
    });
  const shenshaContext = buildShenshaContext(rawPillars);
  const withShensha = (item) => ({ ...item, shensha: getShensha(item, shenshaContext) });
  const pillars = rawPillars.map(withShensha);
  const surfaceWuxingCount = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  pillars.forEach(({ ganWuxing, zhiWuxing }) => {
    if (ganWuxing) surfaceWuxingCount[ganWuxing] += 1;
    if (zhiWuxing) surfaceWuxingCount[zhiWuxing] += 1;
  });

  const nowSolar = Solar.fromDate(now);
  const nowYearGanZhi = nowSolar.getLunar().getYearInGanZhiExact();
  const midYearGanZhi = Solar.fromYmdHms(now.getFullYear(), 7, 1, 12, 0, 0)
    .getLunar()
    .getYearInGanZhiExact();
  const currentBaziYear = now.getFullYear() - (nowYearGanZhi === midYearGanZhi ? 0 : 1);
  // 虚岁按农历年算：出生即 1 岁，每过一个春节加 1 岁。lunar-javascript 按公历年份算，
  // 元旦到春节之间出生的人（农历还在上一年）会少算一岁，这里把差值补上。
  const ageOffset = lunar.getSolar().getYear() - lunar.getYear();
  const yunSource = eightChar.getYun(normalized.gender === 'male' ? 1 : 0, 2);
  const startSolar = yunSource.getStartSolar();
  const daYunSources = yunSource.getDaYun(14);
  const dayun = daYunSources
    .filter((item) => item.getIndex() > 0 && item.getGanZhi())
    .map((item) => buildDaYun(item, now, startSolar, currentBaziYear, dayMasterGan, ageOffset))
    .map((item) => ({ ...withShensha(item), liuNian: item.liuNian.map(withShensha) }));

  // 起运之前的年份行小运：大运列表里的第 0 步没有干支，这里单独整理。
  const childhood = daYunSources.find((item) => item.getIndex() === 0);
  const childhoodXiaoYun = childhood ? childhood.getXiaoYun() : [];
  const xiaoYunYears = (childhood ? childhood.getLiuNian() : []).map((item, index) => {
    const xiaoYunGanZhi = childhoodXiaoYun[index]?.getGanZhi();
    return {
      ...withShensha(buildLiuNian(item, currentBaziYear, dayMasterGan, 0, ageOffset)),
      xiaoYun: xiaoYunGanZhi ? withShensha({ name: '小运', ...describeGanZhi(xiaoYunGanZhi, dayMasterGan) }) : null,
    };
  });
  const xiaoYun = xiaoYunYears.length ? {
    startAge: childhood.getStartAge(),
    endAge: childhood.getEndAge() + ageOffset,
    startYear: childhood.getStartYear(),
    endYear: childhood.getEndYear(),
    years: xiaoYunYears,
  } : null;

  const currentLiuNian = [...dayun.flatMap((item) => item.liuNian), ...xiaoYunYears]
    .find((item) => item.isCurrent) ?? null;

  return {
    input: {
      ...normalized,
      exact: normalized.exact ? { ...normalized.exact } : null,
      hourOption: normalized.hourOption ? { ...normalized.hourOption } : null,
    },
    timeInfo,
    yearBoundary,
    pillars,
    shenshaContext,
    extras: {
      taiYuan: eightChar.getTaiYuan(),
      taiYuanNaYin: eightChar.getTaiYuanNaYin(),
      // 命宫、身宫都由月支与时支推出，时辰不详时不排。
      mingGong: timeUnknown ? '' : eightChar.getMingGong(),
      mingGongNaYin: timeUnknown ? '' : eightChar.getMingGongNaYin(),
      shenGong: timeUnknown ? '' : eightChar.getShenGong(),
      shenGongNaYin: timeUnknown ? '' : eightChar.getShenGongNaYin(),
    },
    timeUnknown,
    dayMaster: {
      gan: dayMasterGan,
      wuxing: GAN_WUXING[dayMasterGan] ?? '',
    },
    surfaceWuxingCount,
    solarInfo: {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
      hour: solar.getHour(),
      minute: solar.getMinute(),
      ymd: solar.toYmd(),
      ymdHms: solar.toYmdHms(),
    },
    lunarInfo: {
      year: lunar.getYear(),
      month: lunar.getMonth(),
      day: lunar.getDay(),
      hour: lunar.getHour(),
      isLeapMonth: lunar.getMonth() < 0,
      yearChinese: lunar.getYearInChinese(),
      monthChinese: lunar.getMonthInChinese(),
      dayChinese: lunar.getDayInChinese(),
      zodiac: useChunjieYear ? lunar.getYearShengXiao() : lunar.getYearShengXiaoExact(),
      zodiacExact: lunar.getYearShengXiaoExact(),
    },
    yun: {
      startYear: yunSource.getStartYear(),
      startMonth: yunSource.getStartMonth(),
      startDay: yunSource.getStartDay(),
      startHour: yunSource.getStartHour(),
      startSolar: startSolar.toYmdHms(),
      forward: yunSource.isForward(),
      // 时辰不详时按正午起算：三天折一年，十二小时的误差约合两个月。
      estimated: timeUnknown,
      currentLiuNian,
      dayun,
      xiaoYun,
    },
  };
};
