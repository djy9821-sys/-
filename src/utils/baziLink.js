/**
 * 带生辰参数的八字链接：#/bazi?cal=s&d=1990-1-1&h=6&g=m…
 * 打开即出盘，方便把命盘发给朋友或师傅，也方便自己换设备。
 * 链接里只有生辰与称呼，不含档案里的分组、备注。
 */
import { parseClockTime, recordToBaziForm } from './baziRecord.js';

const NAME_LIMIT = 20;

/** 取 hash 里问号之后的查询串：'#/bazi?cal=s' → 'cal=s'。 */
export const hashQueryOf = (hash = '') => {
  const index = (hash ?? '').indexOf('?');
  return index === -1 ? '' : hash.slice(index + 1);
};

/** 八字表单 → 查询串（不含问号）。 */
export const encodeBaziLink = (form, { name = '' } = {}) => {
  if (!form) return '';
  const params = new URLSearchParams();
  params.set('cal', form.calendarType === 'lunar' ? 'l' : 's');
  params.set('d', `${form.year}-${Math.abs(form.month)}-${form.day}`);
  if (form.calendarType === 'lunar' && form.month < 0) params.set('leap', '1');
  params.set('g', form.gender === 'female' ? 'f' : 'm');
  const clock = form.timeMode === 'exact' ? parseClockTime(form.clockTime) : null;
  if (form.timeMode === 'unknown') {
    params.set('h', 'x');
  } else if (clock) {
    params.set('c', form.clockTime);
    const longitude = form.longitude === '' || form.longitude == null ? null : Number(form.longitude);
    if (longitude !== null && Number.isFinite(longitude)) params.set('lon', String(longitude));
    if (form.timezone !== undefined && Number(form.timezone) !== 8) params.set('tz', String(form.timezone));
    if (form.placeProvince) params.set('prov', form.placeProvince);
    if (form.placeCity) params.set('city', form.placeCity);
    if (form.applyTrueSolar === false) params.set('tst', '0');
    if (form.applyDst) params.set('dst', '1');
  } else {
    params.set('h', String(form.hourIndex ?? 6));
  }
  if (form.daySect === 1) params.set('sect', '1');
  const personName = (name || form.personName || '').trim().slice(0, NAME_LIMIT);
  if (personName) params.set('n', personName);
  return params.toString();
};

/** 查询串 → 档案记录结构（可直接交给 BaziDivination initialRecord）；无效时返回 null。 */
export const decodeBaziLink = (query) => {
  if (!query) return null;
  let params;
  try {
    params = new URLSearchParams(query);
  } catch {
    return null;
  }
  const date = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(params.get('d') ?? '');
  if (!date) return null;
  const calendarType = params.get('cal') === 'l' ? 'lunar' : 'solar';
  const gender = params.get('g') === 'f' ? 'female' : params.get('g') === 'm' ? 'male' : null;
  if (!gender) return null;
  const hour = params.get('h');
  const clock = params.get('c');
  const timeMode = hour === 'x' ? 'unknown' : clock && parseClockTime(clock) ? 'exact' : 'shichen';
  const hourIndex = timeMode === 'shichen' ? Number(hour) : null;
  if (timeMode === 'shichen' && (!Number.isInteger(hourIndex) || hourIndex < 0 || hourIndex > 12)) return null;
  const longitude = params.has('lon') ? Number(params.get('lon')) : null;
  const timezone = params.has('tz') ? Number(params.get('tz')) : 8;
  const name = (params.get('n') ?? '').trim().slice(0, NAME_LIMIT);

  const record = {
    id: `link-${query}`,
    type: 'bazi',
    name,
    gender,
    calendarType,
    birthDate: `${date[1]}-${Number(date[2])}-${Number(date[3])}`,
    timeHour: timeMode === 'exact' ? 6 : hourIndex,
    isLeapMonth: calendarType === 'lunar' && params.get('leap') === '1',
    group: 'other',
    note: '',
    fromLink: true,
    data: {
      daySect: params.get('sect') === '1' ? 1 : 2,
      timeMode,
      clockTime: timeMode === 'exact' ? clock : '',
      placeProvince: timeMode === 'exact' ? (params.get('prov') ?? '') : '',
      placeCity: timeMode === 'exact' ? (params.get('city') ?? '') : '',
      longitude: timeMode === 'exact' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 ? longitude : null,
      timezone: Number.isFinite(timezone) ? timezone : 8,
      applyTrueSolar: timeMode === 'exact' && params.get('tst') !== '0',
      applyDst: timeMode === 'exact' && params.get('dst') === '1',
    },
  };
  // 精确模式下 timeHour 只是占位：真正的时辰由钟表时间与出生地换算。
  return recordToBaziForm(record) ? record : null;
};

/** 完整的分享链接。 */
export const buildBaziShareUrl = (form, { name = '', location = globalThis.location } = {}) => {
  const query = encodeBaziLink(form, { name });
  if (!query) return '';
  const base = location ? `${location.origin}${location.pathname}` : '';
  return `${base}#/bazi?${query}`;
};
