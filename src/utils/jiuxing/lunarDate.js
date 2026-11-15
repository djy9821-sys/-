// 农历生日 ↔ 公历。九星气学的年、月、日三星都按公历的节气排，农历生日先换成公历再算。
import { Lunar, LunarYear, Solar } from 'lunar-javascript';

const MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const DAY_TENS = ['初', '十', '廿'];
const DAY_ONES = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

const pad = (n) => String(n).padStart(2, '0');
const isInt = (value) => Number.isInteger(value);

/** 月份的叫法。闰月传负数：-4 是「闰四月」。 */
export const lunarMonthName = (month) => {
  const name = MONTH_NAMES[Math.abs(month) - 1];
  return name ? `${month < 0 ? '闰' : ''}${name}` : '';
};

/** 日子的叫法：初一、初十、十五、二十、廿三、三十。 */
export const lunarDayName = (day) => {
  if (!isInt(day) || day < 1 || day > 30) return '';
  if (day === 10) return '初十';
  if (day === 20) return '二十';
  if (day === 30) return '三十';
  return `${DAY_TENS[Math.floor(day / 10)]}${DAY_ONES[(day % 10) - 1]}`;
};

/** 某个农历年的各个月，按先后次序：[{ value, name, days }]。闰月的 value 是负数，days 是这个月有几天（29 或 30）。 */
export const lunarMonthsOf = (year) => {
  const y = Number(year);
  if (!isInt(y)) return [];
  try {
    return LunarYear.fromYear(y).getMonthsInYear()
      .filter((month) => month.getYear() === y)
      .map((month) => ({ value: month.getMonth(), name: lunarMonthName(month.getMonth()), days: month.getDayCount() }));
  } catch {
    return [];
  }
};

/** 农历年月日 → 公历 'YYYY-MM-DD'。这一天不存在（没有这个闰月、小月的三十）时返回 null。 */
export const lunarToSolar = (year, month, day) => {
  const [y, m, d] = [Number(year), Number(month), Number(day)];
  const info = lunarMonthsOf(y).find((item) => item.value === m);
  if (!info || !isInt(d) || d < 1 || d > info.days) return null;
  try {
    const solar = Lunar.fromYmd(y, m, d).getSolar();
    return `${solar.getYear()}-${pad(solar.getMonth())}-${pad(solar.getDay())}`;
  } catch {
    return null;
  }
};

/** 公历 'YYYY-MM-DD' → { year, month, day }，闰月的 month 是负数。日期不成立时返回 null。 */
export const solarToLunar = (iso) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  try {
    const lunar = Solar.fromYmd(y, m, d).getLunar();
    return { year: lunar.getYear(), month: lunar.getMonth(), day: lunar.getDay() };
  } catch {
    return null;
  }
};

/** 给人看的写法：「1990 年五月廿三」。 */
export const lunarText = (lunar) => (lunar ? `${lunar.year} 年${lunarMonthName(lunar.month)}${lunarDayName(lunar.day)}` : '');

/** 交给九星页面的一组农历工具（页面本身不依赖农历库，由外面传进去）。 */
export const JIUXING_LUNAR = Object.freeze({ monthsOf: lunarMonthsOf, toSolar: lunarToSolar, fromSolar: solarToLunar, dayName: lunarDayName, text: lunarText });
