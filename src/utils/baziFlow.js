/**
 * 流月 · 流日 · 流时
 *
 * 流月以十二节（立春、惊蛰……小寒）交节时刻为界；
 * 流日按公历日期列出当月节到下一个节之间的每日日柱；
 * 流时沿用排盘输入的 13 个时段（区分早子、晚子），时柱由 lunar-javascript 计算。
 */
import { Lunar, Solar } from 'lunar-javascript';
import { BAZI_HOUR_OPTIONS, describeGanZhi, getHourIndexForTime } from './baziChart.js';

export { getHourIndexForTime };

export const LIU_YUE_JIE = Object.freeze([
  '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
  '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
]);

const WEEKDAY_NAMES = Object.freeze(['日', '一', '二', '三', '四', '五', '六']);

const pad = (value) => String(value).padStart(2, '0');

export const toYmd = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseYmd = (ymd) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd ?? '');
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return { year, month, day, date };
};

export const isValidYmd = (ymd) => parseYmd(ymd) !== null;

const solarToTimestamp = (solar) => new Date(
  solar.getYear(),
  solar.getMonth() - 1,
  solar.getDay(),
  solar.getHour(),
  solar.getMinute(),
  solar.getSecond(),
).getTime();

/** 指定公历日期所属的八字年份（以立春所在日期为界）。 */
export const getBaziYearOfDate = (ymd) => {
  const parsed = parseYmd(ymd);
  if (!parsed) throw new Error('日期格式必须是 YYYY-MM-DD');
  const liChun = Lunar.fromYmd(parsed.year, 1, 1).getJieQiTable()['立春'];
  return ymd >= liChun.toYmd() ? parsed.year : parsed.year - 1;
};

const findJieLunar = (baziYear, index) => {
  const solarYear = index === 11 ? baziYear + 1 : baziYear;
  const solarMonth = index === 11 ? 1 : index + 2;
  // 每月 20 日一定落在本月节之后、下月节之前。
  const lunar = Solar.fromYmd(solarYear, solarMonth, 20).getLunar();
  const jie = lunar.getPrevJie();
  if (jie.getName() !== LIU_YUE_JIE[index]) {
    throw new Error(`${baziYear}年${LIU_YUE_JIE[index]}定位失败`);
  }
  return { lunar, jie, nextJie: lunar.getNextJie() };
};

export const buildLiuYue = (baziYear, dayGan, now = new Date()) => {
  if (!Number.isInteger(baziYear)) throw new Error('流年年份无效');
  const nowTimestamp = now.getTime();

  return LIU_YUE_JIE.map((jieName, index) => {
    const { lunar, jie, nextJie } = findJieLunar(baziYear, index);
    const startSolar = jie.getSolar();
    const endSolar = nextJie.getSolar();
    const startTimestamp = solarToTimestamp(startSolar);
    const endTimestamp = solarToTimestamp(endSolar);
    return {
      name: '流月',
      type: 'liuYue',
      index,
      baziYear,
      jieName,
      nextJieName: nextJie.getName(),
      startSolar: startSolar.toYmdHms(),
      endSolar: endSolar.toYmdHms(),
      startDate: startSolar.toYmd(),
      endDate: endSolar.toYmd(),
      label: `${startSolar.getMonth()}/${startSolar.getDay()}`,
      ...describeGanZhi(lunar.getMonthInGanZhiExact(), dayGan),
      isCurrent: nowTimestamp >= startTimestamp && nowTimestamp < endTimestamp,
    };
  });
};

/** 列出某个流月内的每一天：从本月节所在日到下一个节的前一天。 */
export const buildLiuRi = (liuYue, dayGan, now = new Date()) => {
  const start = parseYmd(liuYue?.startDate);
  const end = parseYmd(liuYue?.endDate);
  if (!start || !end) throw new Error('流月起止日期无效');
  const today = toYmd(now);
  const days = [];

  for (const cursor = new Date(start.date); toYmd(cursor) < liuYue.endDate; cursor.setDate(cursor.getDate() + 1)) {
    const solar = Solar.fromYmd(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    const lunar = solar.getLunar();
    const date = toYmd(cursor);
    days.push({
      name: '流日',
      type: 'liuRi',
      date,
      year: cursor.getFullYear(),
      month: cursor.getMonth() + 1,
      day: cursor.getDate(),
      weekday: cursor.getDay(),
      weekdayLabel: `周${WEEKDAY_NAMES[cursor.getDay()]}`,
      lunarMonthChinese: lunar.getMonthInChinese(),
      lunarDayChinese: lunar.getDayInChinese(),
      jieQi: lunar.getJieQi(),
      ...describeGanZhi(lunar.getDayInGanZhi(), dayGan),
      isToday: date === today,
    });
  }

  return days;
};

/** 某一天的 13 个时段的时柱（晚子时按 lunar-javascript 口径取次日子时干支）。 */
export const buildLiuShi = (ymd, dayGan, now = new Date()) => {
  const parsed = parseYmd(ymd);
  if (!parsed) throw new Error('日期格式必须是 YYYY-MM-DD');
  const isToday = toYmd(now) === ymd;
  const currentIndex = getHourIndexForTime(now.getHours());

  return BAZI_HOUR_OPTIONS.map((option) => {
    const lunar = Solar.fromYmdHms(parsed.year, parsed.month, parsed.day, option.hour, 0, 0).getLunar();
    return {
      name: '流时',
      type: 'liuShi',
      index: option.index,
      date: ymd,
      hourName: option.name,
      branchName: `${option.branch}时`,
      range: option.range,
      ...describeGanZhi(lunar.getTimeInGanZhi(), dayGan),
      isCurrent: isToday && option.index === currentIndex,
    };
  });
};

/**
 * 根据用户选择与当前时间，确定流月、流日、流时的落点。
 * selection 为 null 或年份不匹配时：今年落在此刻，其他年份落在立春当日。
 */
export const resolveFlowSelection = (liuYueList, selection, now = new Date()) => {
  if (!liuYueList?.length) return null;
  const baziYear = liuYueList[0].baziYear;
  const valid = selection && selection.baziYear === baziYear ? selection : null;
  const today = toYmd(now);
  const containsDate = (month, date) => date >= month.startDate && date < month.endDate;

  let monthIndex = Number.isInteger(valid?.monthIndex) ? valid.monthIndex : null;
  if (monthIndex === null && valid?.date) {
    monthIndex = liuYueList.findIndex((month) => containsDate(month, valid.date));
  }
  if (monthIndex === null || monthIndex < 0) {
    const currentIndex = liuYueList.findIndex((month) => containsDate(month, today));
    monthIndex = currentIndex >= 0 ? currentIndex : 0;
  }

  const month = liuYueList[monthIndex];
  let date = valid?.date && containsDate(month, valid.date) ? valid.date : null;
  if (!date) date = containsDate(month, today) ? today : month.startDate;

  const hourIndex = Number.isInteger(valid?.hourIndex) ? valid.hourIndex : getHourIndexForTime(now.getHours());
  return { baziYear, monthIndex, date, hourIndex };
};
