/**
 * 八字表单 → buildBaziChart 的输入。单独成文件，避免首页为了读「上次命盘」而加载出生地经度表。
 */
import { findBirthPlace } from './birthPlaces.js';
import { parseClockTime } from './baziRecord.js';

/** 八字表单 → buildBaziChart 的输入（与排盘页的换算一致）。 */
export const baziFormToChartInput = (form) => {
  const base = {
    calendarType: form.calendarType,
    year: form.year,
    month: form.month,
    day: form.day,
    gender: form.gender,
    daySect: form.daySect,
  };
  const clock = form.timeMode === 'exact' ? parseClockTime(form.clockTime) : null;
  if (!clock) return { ...base, hourIndex: form.hourIndex };

  const rawLongitude = typeof form.longitude === 'string' ? form.longitude.trim() : form.longitude;
  const longitude = rawLongitude === '' || rawLongitude == null ? null : Number(rawLongitude);
  const longitudeValid = longitude !== null && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
  const cityLongitude = findBirthPlace(form.placeProvince, form.placeCity)?.longitude ?? null;
  let placeName = longitudeValid ? '自定义经度' : '';
  if (form.placeCity) {
    placeName = cityLongitude !== null && longitudeValid && Math.abs(cityLongitude - longitude) < 0.005
      ? form.placeCity
      : `${form.placeCity}附近`;
  }
  return {
    ...base,
    timeMode: 'exact',
    clockHour: clock.hour,
    clockMinute: clock.minute,
    longitude: longitudeValid ? longitude : null,
    timezone: Number(form.timezone ?? 8),
    placeName,
    applyTrueSolar: form.applyTrueSolar !== false,
    applyDst: Boolean(form.applyDst),
  };
};
