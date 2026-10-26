/**
 * 「所在地」：用来把此刻换算成真太阳时。
 *
 * 流时的「此刻」、首页「八字 · 今日」的时辰、六爻起卦的时间，都按这里设置的地点
 * （经度、时区）换算；没有设置时沿用设备时间。设置只保存在本机浏览器里。
 */
import { toTrueSolarTime, formatClock } from './trueSolarTime.js';

export const CURRENT_PLACE_KEY = 'gushupai-current-place';
export const CURRENT_PLACE_EVENT = 'current-place-updated';

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/** 规范化一条所在地设置；资料不完整时返回 null。 */
export const normalizePlace = (place) => {
  if (!place || typeof place !== 'object') return null;
  const longitude = Number(place.longitude);
  const timezone = place.timezone === undefined || place.timezone === null || place.timezone === '' ? 8 : Number(place.timezone);
  if (!isFiniteNumber(longitude) || longitude < -180 || longitude > 180) return null;
  if (!isFiniteNumber(timezone) || timezone < -12 || timezone > 14) return null;
  return {
    province: typeof place.province === 'string' ? place.province : '',
    city: typeof place.city === 'string' ? place.city : '',
    longitude: Math.round(longitude * 100) / 100,
    timezone,
  };
};

export const readCurrentPlace = () => {
  try {
    const raw = globalThis.localStorage?.getItem(CURRENT_PLACE_KEY);
    return raw ? normalizePlace(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

export const saveCurrentPlace = (place) => {
  const normalized = normalizePlace(place);
  try {
    if (normalized) globalThis.localStorage?.setItem(CURRENT_PLACE_KEY, JSON.stringify(normalized));
    else globalThis.localStorage?.removeItem(CURRENT_PLACE_KEY);
    globalThis.dispatchEvent?.(new Event(CURRENT_PLACE_EVENT));
  } catch {
    // 存储不可用时本次会话仍可使用
  }
  return normalized;
};

export const clearCurrentPlace = () => saveCurrentPlace(null);

const fromWall = (wall) => new Date(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second ?? 0);

/**
 * 把某个时刻换算成所在地的真太阳时，返回一个“墙上时间”Date：
 * 它的 getHours()/getDate() 等本地读数就是真太阳时的读数，可直接交给排盘函数。
 * 没有所在地时原样返回。
 */
export const toLocalSolarNow = (now = new Date(), place = readCurrentPlace()) => {
  const normalized = normalizePlace(place);
  if (!normalized) return now;
  // 先按所在地时区得到当地标准时间（不受设备时区影响），再加经度时差与均时差。
  const standardMs = now.getTime() + normalized.timezone * 3600 * 1000;
  const standard = new Date(standardMs);
  const clock = {
    year: standard.getUTCFullYear(),
    month: standard.getUTCMonth() + 1,
    day: standard.getUTCDate(),
    hour: standard.getUTCHours(),
    minute: standard.getUTCMinutes(),
  };
  const corrected = toTrueSolarTime(clock, { longitude: normalized.longitude, timezone: normalized.timezone, applyTrueSolar: true });
  return fromWall({ ...corrected, second: standard.getUTCSeconds() });
};

/** 用于界面说明：地名、与设备时间的分钟差、换算后的时刻。 */
export const describeCurrentPlace = (now = new Date(), place = readCurrentPlace()) => {
  const normalized = normalizePlace(place);
  if (!normalized) return { set: false, label: '设备时间', detail: '未设置所在地，按设备时间计算时辰' };
  const solar = toLocalSolarNow(now, normalized);
  const diffMinutes = Math.round((solar.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()).getTime()) / 60000);
  const name = normalized.city || normalized.province || `东经 ${normalized.longitude}°`;
  const sign = diffMinutes > 0 ? '+' : diffMinutes < 0 ? '−' : '±';
  return {
    set: true,
    label: name,
    detail: `按${name}真太阳时 ${formatClock({ hour: solar.getHours(), minute: solar.getMinutes() })}（比设备时间${sign}${Math.abs(diffMinutes)} 分钟）`,
    solar,
    diffMinutes,
  };
};
