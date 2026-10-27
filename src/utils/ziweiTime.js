/**
 * 紫微录入的「精确到分钟」模式：复用八字的真太阳时换算，得到时辰与换算后的公历日期。
 * 单独成文件并按需加载，首页不会因此下载农历库。
 */
import { resolveExactBirth } from './baziChart.js';
import { findBirthPlace } from './birthPlaces.js';
import { isChinaDst } from './trueSolarTime.js';
import { parseClockTime } from './baziRecord.js';

const DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

const placeNameOf = (province, city, longitude) => {
  const cityLongitude = findBirthPlace(province, city)?.longitude ?? null;
  if (!city) return Number.isFinite(longitude) ? '自定义经度' : '';
  return cityLongitude !== null && Number.isFinite(longitude) && Math.abs(cityLongitude - longitude) < 0.005 ? city : `${city}附近`;
};

/**
 * @param {object} form
 * @param {'solar'|'lunar'} form.calendarType
 * @param {string} form.birthDate 'YYYY-MM-DD'（农历时为农历年月日）
 * @param {boolean} [form.isLeapMonth]
 * @param {string} form.clockTime 'HH:MM' 钟表时间
 * @param {string} [form.placeProvince]
 * @param {string} [form.placeCity]
 * @param {number|string|null} [form.longitude]
 * @param {number} [form.timezone]
 * @param {boolean|null} [form.applyDst] null 表示按年份自动判断
 * @returns {{ hourIndex, hourName, solarDate, placeName, dstSuggested, applyDst, timeInfo }}
 */
export const resolveZiweiExact = (form) => {
  const match = DATE_PATTERN.exec(form.birthDate ?? '');
  const clock = parseClockTime(form.clockTime);
  if (!match || !clock) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const rawLongitude = form.longitude === '' || form.longitude === null || form.longitude === undefined ? null : Number(form.longitude);
  const longitude = Number.isFinite(rawLongitude) && rawLongitude >= -180 && rawLongitude <= 180 ? rawLongitude : null;
  const dstSuggested = isChinaDst({ year, month, day, hour: clock.hour, minute: clock.minute });
  const applyDst = form.applyDst === null || form.applyDst === undefined ? dstSuggested : Boolean(form.applyDst);
  const resolved = resolveExactBirth({
    calendarType: form.calendarType === 'lunar' ? 'lunar' : 'solar',
    year,
    month: form.calendarType === 'lunar' && form.isLeapMonth ? -month : month,
    day,
    clockHour: clock.hour,
    clockMinute: clock.minute,
    longitude,
    timezone: Number(form.timezone ?? 8),
    placeName: placeNameOf(form.placeProvince, form.placeCity, longitude),
    applyTrueSolar: longitude !== null,
    applyDst,
  });
  return {
    hourIndex: resolved.hourIndex,
    hourName: resolved.hourName,
    solarDate: resolved.timeInfo.correctedDate,
    placeName: resolved.timeInfo.placeName,
    dstSuggested,
    applyDst,
    timeInfo: resolved.timeInfo,
  };
};

/** 紫微档案记录里的精确时间设置 → 换算所需的表单；记录不是精确模式时返回 null。 */
export const ziweiRecordToExactForm = (record) => {
  const data = record?.data;
  if (!data || data.timeMode !== 'exact' || !parseClockTime(data.clockTime)) return null;
  return {
    calendarType: record.calendarType === 'lunar' ? 'lunar' : 'solar',
    birthDate: record.birthDate,
    isLeapMonth: Boolean(record.isLeapMonth),
    clockTime: data.clockTime,
    placeProvince: data.placeProvince ?? '',
    placeCity: data.placeCity ?? '',
    longitude: data.longitude ?? null,
    timezone: data.timezone ?? 8,
    applyDst: typeof data.applyDst === 'boolean' ? data.applyDst : null,
  };
};
