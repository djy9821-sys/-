import {
  Lunar,
  LunarUtil,
  LunarYear,
  Solar,
} from 'lunar-javascript';

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
    xun: LunarUtil.getXun(ganZhi),
    xunKong: LunarUtil.getXunKong(ganZhi),
  };
};

const buildLiuNian = (liuNian, currentBaziYear, dayGan, sourceDaYunIndex) => {
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
    age: liuNian.getAge(),
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

const buildDaYun = (daYun, now, yunStartSolar, currentBaziYear, dayGan) => {
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
    startAge: daYun.getStartAge(),
    endAge: daYun.getEndAge(),
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
    xun: daYun.getXun(),
    xunKong: daYun.getXunKong(),
    // 大运以实际交运时刻为边界，而不是每年元旦粗略切换。
    isCurrent: nowTimestamp >= exactStartTimestamp && nowTimestamp < exactEndTimestamp,
    liuNian: daYun.getLiuNian().map((item) => buildLiuNian(item, currentBaziYear, dayGan, daYun.getIndex())),
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
  const hourIndex = toInteger(input.hourIndex, '时辰');
  const hourOption = BAZI_HOUR_OPTIONS.find((option) => option.index === hourIndex);
  if (!hourOption) {
    throw new Error('时辰选项无效');
  }

  const daySect = input.daySect == null ? 2 : toInteger(input.daySect, '子时换日流派');
  if (daySect !== 1 && daySect !== 2) {
    throw new Error('子时换日流派必须是1或2');
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
    hourIndex,
    hour: hourOption.hour ?? 12,
    hourOption,
    gender,
    daySect,
  };
};

export const buildBaziChart = (input, now = new Date()) => {
  const normalized = validateInput(input);
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('当前日期无效');
  }

  let lunar;
  let solar;
  if (normalized.calendarType === 'lunar') {
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
  const pillars = PILLAR_DEFINITIONS.map((definition) => getPillar(eightChar, definition));
  const dayMasterGan = eightChar.getDayGan();
  const surfaceWuxingCount = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  pillars.forEach(({ ganWuxing, zhiWuxing }) => {
    surfaceWuxingCount[ganWuxing] += 1;
    surfaceWuxingCount[zhiWuxing] += 1;
  });

  const nowSolar = Solar.fromDate(now);
  const nowYearGanZhi = nowSolar.getLunar().getYearInGanZhiExact();
  const midYearGanZhi = Solar.fromYmdHms(now.getFullYear(), 7, 1, 12, 0, 0)
    .getLunar()
    .getYearInGanZhiExact();
  const currentBaziYear = now.getFullYear() - (nowYearGanZhi === midYearGanZhi ? 0 : 1);
  const yunSource = eightChar.getYun(normalized.gender === 'male' ? 1 : 0, 2);
  const startSolar = yunSource.getStartSolar();
  const dayun = yunSource
    .getDaYun(14)
    .filter((item) => item.getIndex() > 0 && item.getGanZhi())
    .map((item) => buildDaYun(item, now, startSolar, currentBaziYear, dayMasterGan));
  const currentLiuNian = dayun
    .flatMap((item) => item.liuNian)
    .find((item) => item.isCurrent) ?? null;

  return {
    input: {
      ...normalized,
      hourOption: { ...normalized.hourOption },
    },
    pillars,
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
      zodiac: lunar.getYearShengXiaoExact(),
      zodiacExact: lunar.getYearShengXiaoExact(),
    },
    yun: {
      startYear: yunSource.getStartYear(),
      startMonth: yunSource.getStartMonth(),
      startDay: yunSource.getStartDay(),
      startHour: yunSource.getStartHour(),
      startSolar: startSolar.toYmdHms(),
      forward: yunSource.isForward(),
      currentLiuNian,
      dayun,
    },
  };
};
