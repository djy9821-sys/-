/**
 * 八字命例与档案记录之间的转换。
 * 档案沿用紫微的字段（calendarType、birthDate、timeHour、isLeapMonth），
 * 因此紫微档案也能直接带入八字排盘；八字特有的设置放在 data 中。
 */

export const ARCHIVE_GROUP_OPTIONS = Object.freeze([
  ['self', '自己'], ['father', '父亲'], ['mother', '母亲'], ['son', '儿子'], ['daughter', '女儿'],
  ['girlfriend', '女友'], ['boyfriend', '男友'], ['family', '家人'], ['friend', '朋友'],
  ['customer', '客户'], ['other', '其他'],
].map(([value, label]) => Object.freeze({ value, label })));

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})/;

export const parseClockTime = (value) => {
  const match = CLOCK_PATTERN.exec(value ?? '');
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
};

/**
 * @param form 八字输入表单（月份为负数表示农历闰月）
 * @param chart buildBaziChart 的结果，用于记录换算后的时辰与公历日期
 */
export const buildBaziRecord = (form, chart, { name, group = 'self', note = '' } = {}) => {
  const exact = form.timeMode === 'exact';
  return {
    name: name?.trim() || form.personName?.trim() || '未命名',
    gender: form.gender,
    type: 'bazi',
    calendarType: form.calendarType,
    birthDate: `${form.year}-${Math.abs(form.month)}-${form.day}`,
    solarDate: chart?.solarInfo?.ymd ?? '',
    timeHour: chart?.input?.hourIndex ?? form.hourIndex,
    isLeapMonth: form.calendarType === 'lunar' && form.month < 0,
    group,
    note: note.trim(),
    data: {
      daySect: form.daySect,
      timeMode: exact ? 'exact' : 'shichen',
      clockTime: exact ? form.clockTime : '',
      placeProvince: exact ? form.placeProvince ?? '' : '',
      placeCity: exact ? form.placeCity ?? '' : '',
      longitude: exact && form.longitude !== '' ? Number(form.longitude) : null,
      timezone: exact ? Number(form.timezone ?? 8) : 8,
      applyTrueSolar: exact ? form.applyTrueSolar !== false : false,
      applyDst: exact ? Boolean(form.applyDst) : false,
    },
  };
};

/** 档案记录 → 八字表单；资料不完整或类型不支持时返回 null。 */
export const recordToBaziForm = (record) => {
  if (!record || !['bazi', 'ziwei'].includes(record.type)) return null;
  if (!['male', 'female'].includes(record.gender)) return null;

  const calendarType = record.calendarType === 'lunar' ? 'lunar' : 'solar';
  const rawDate = record.birthDate || record.solarDate || record.data?.birthDate || record.data?.solarDate;
  const match = DATE_PATTERN.exec(rawDate ?? '');
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const hourIndex = Number(record.timeHour);
  if (!Number.isInteger(hourIndex) || hourIndex < 0 || hourIndex > 12) return null;

  const data = record.type === 'bazi' && record.data && typeof record.data === 'object' ? record.data : {};
  const clock = parseClockTime(data.clockTime);
  const exact = data.timeMode === 'exact' && clock !== null;
  const longitude = Number(data.longitude);
  const isLeapMonth = calendarType === 'lunar' && Boolean(record.isLeapMonth ?? record.isLeap);

  return {
    personName: typeof record.name === 'string' ? record.name : '',
    calendarType,
    year,
    month: isLeapMonth ? -month : month,
    day,
    hourIndex,
    gender: record.gender,
    daySect: data.daySect === 1 ? 1 : 2,
    timeMode: exact ? 'exact' : 'shichen',
    clockTime: exact ? data.clockTime : '',
    placeProvince: exact && typeof data.placeProvince === 'string' ? data.placeProvince : '',
    placeCity: exact && typeof data.placeCity === 'string' ? data.placeCity : '',
    longitude: exact && Number.isFinite(longitude) && data.longitude !== null ? String(longitude) : '',
    timezone: exact && Number.isFinite(Number(data.timezone)) ? Number(data.timezone) : 8,
    applyTrueSolar: exact ? data.applyTrueSolar !== false : true,
    applyDst: exact ? Boolean(data.applyDst) : false,
  };
};
