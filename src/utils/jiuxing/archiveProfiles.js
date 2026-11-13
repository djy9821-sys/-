// 把命盘档案里的人整理成九星气学页面可以直接选的名单：姓名、公历生日、性别。
// 档案里紫微、八字的记录字段不完全一样：有的直接存了公历（solarDate），有的只存了农历生日，要换算。
import { Lunar } from 'lunar-javascript';

const pad = (n) => String(n).padStart(2, '0');
const parseYmd = (text) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(text ?? ''));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};
const isRealDate = ([y, m, d]) => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};

/** 一条档案 → 公历 [年, 月, 日]。没有生日（如六爻记录）或换算不了时返回 null。 */
export const solarYmdOfRecord = (record) => {
  const solar = parseYmd(record?.solarDate ?? record?.data?.solarDate);
  if (solar && isRealDate(solar)) return solar;
  const raw = parseYmd(record?.birthDate ?? record?.data?.birthDate);
  if (!raw) return null;
  const calendarType = record.calendarType ?? record.data?.calendarType;
  if (calendarType !== 'lunar') return isRealDate(raw) ? raw : null;
  try {
    const leap = Boolean(record.isLeapMonth ?? record.isLeap ?? record.data?.isLeapMonth);
    const day = Lunar.fromYmd(raw[0], leap ? -raw[1] : raw[1], raw[2]).getSolar();
    return [day.getYear(), day.getMonth(), day.getDay()];
  } catch {
    return null;
  }
};

/** 档案 → 名单。同名同生日的只留一条（同一个人常常既存了紫微又存了八字）。 */
export const profilesFromArchive = (records) => {
  const seen = new Set();
  const profiles = [];
  for (const record of Array.isArray(records) ? records : []) {
    const ymd = solarYmdOfRecord(record);
    const name = typeof record?.name === 'string' ? record.name.trim() : '';
    if (!ymd || !name) continue;
    const birth = `${ymd[0]}-${pad(ymd[1])}-${pad(ymd[2])}`;
    const key = `${name}|${birth}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const gender = record.gender === 'male' ? '男' : record.gender === 'female' ? '女' : '';
    profiles.push({ label: `${name}（${birth}）`, name, birth, gender });
  }
  return profiles;
};
