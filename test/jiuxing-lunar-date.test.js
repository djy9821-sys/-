// 九星气学：生日按农历填时，先换成公历再算。这里核对换算本身。
import test from 'node:test';
import assert from 'node:assert/strict';
import JXP from '../src/utils/jiuxing/person.js';
import { JIUXING_LUNAR, lunarDayName, lunarMonthName, lunarMonthsOf, lunarText, lunarToSolar, solarToLunar } from '../src/utils/jiuxing/lunarDate.js';

test('农历换公历：几个查得到的日子', () => {
  // 春节（正月初一）：1990-01-27、2024-02-10、2025-01-29；2026 年中秋（八月十五）是 9 月 25 日
  assert.equal(lunarToSolar(1990, 1, 1), '1990-01-27');
  assert.equal(lunarToSolar(2024, 1, 1), '2024-02-10');
  assert.equal(lunarToSolar(2025, 1, 1), '2025-01-29');
  assert.equal(lunarToSolar(2026, 8, 15), '2026-09-25');
  // 腊月生的人：农历还在前一年，公历已经是下一年一月
  assert.equal(lunarToSolar(1989, 12, 25), '1990-01-21');
  assert.equal(lunarToSolar(1990, 5, 23), '1990-06-15');
});

test('闰月：传负数；这一年没有的闰月、小月的三十都换不出来', () => {
  // 2020 年闰四月：四月初一是 4 月 23 日，闰四月初一是 5 月 23 日
  assert.equal(lunarToSolar(2020, 4, 1), '2020-04-23');
  assert.equal(lunarToSolar(2020, -4, 1), '2020-05-23');
  assert.equal(lunarToSolar(2021, -4, 1), null);
  // 2020 年正月是小月，只有二十九天
  assert.equal(lunarMonthsOf(2020)[0].days, 29);
  assert.equal(lunarToSolar(2020, 1, 30), null);
  assert.equal(lunarToSolar(2020, 1, 0), null);
  assert.equal(lunarToSolar('abc', 1, 1), null);
});

test('一年里的月份：闰年十三个月，闰月排在同名的平月后面', () => {
  const months = lunarMonthsOf(2020);
  assert.equal(months.length, 13);
  assert.deepEqual(months.slice(3, 6).map((month) => [month.value, month.name]), [[4, '四月'], [-4, '闰四月'], [5, '五月']]);
  assert.equal(lunarMonthsOf(2021).length, 12);
  assert.ok(months.every((month) => month.days === 29 || month.days === 30));
  assert.deepEqual(lunarMonthsOf('abc'), []);
});

test('公历换农历，和农历换公历来回一致', () => {
  assert.deepEqual(solarToLunar('1990-06-15'), { year: 1990, month: 5, day: 23 });
  assert.deepEqual(solarToLunar('2020-05-23'), { year: 2020, month: -4, day: 1 });
  assert.deepEqual(solarToLunar('1990-01-10'), { year: 1989, month: 12, day: 14 });
  assert.equal(solarToLunar('1990-02-30'), null);
  assert.equal(solarToLunar('1990-6-15'), null);
  assert.equal(solarToLunar(''), null);

  // 九星页面支持的年份里，每个农历日子换成公历再换回来都是它自己
  let count = 0;
  for (let year = 1900; year <= 2060; year += 1) {
    for (const month of lunarMonthsOf(year)) {
      for (const day of [1, 15, month.days]) {
        const iso = lunarToSolar(year, month.value, day);
        assert.deepEqual(solarToLunar(iso), { year, month: month.value, day }, `${year} ${month.name} ${day}`);
        count += 1;
      }
    }
  }
  assert.ok(count > 5800);
});

test('叫法：正月、闰四月、十一月；初一、初十、十五、二十、廿三、三十', () => {
  assert.deepEqual([1, -4, 11, 12].map(lunarMonthName), ['正月', '闰四月', '十一月', '十二月']);
  assert.deepEqual([1, 9, 10, 11, 15, 19, 20, 21, 23, 29, 30].map(lunarDayName), ['初一', '初九', '初十', '十一', '十五', '十九', '二十', '廿一', '廿三', '廿九', '三十']);
  assert.equal(lunarDayName(0), '');
  assert.equal(lunarDayName(31), '');
  assert.equal(lunarMonthName(13), '');
  assert.equal(lunarText({ year: 1990, month: 5, day: 23 }), '1990 年五月廿三');
  assert.equal(lunarText({ year: 2020, month: -4, day: 1 }), '2020 年闰四月初一');
  assert.equal(lunarText(null), '');
});

test('农历生日和它对应的公历生日，算出来是同一个人', () => {
  // 书里的 Y：公历 1983-02-07，农历是壬戌年腊月廿五（立春已过，九星算亥年）
  assert.deepEqual(solarToLunar('1983-02-07'), { year: 1982, month: 12, day: 25 });
  const solar = lunarToSolar(1982, 12, 25).split('-').map(Number);
  assert.deepEqual(solar, [1983, 2, 7]);
  assert.equal(JXP.profileOf(...solar).name, '应龙');
  assert.deepEqual(['year', 'month', 'day'].map((key) => JXP.pillarsOf(...solar)[key].branch), ['亥', '寅', '寅']);
  // 交给页面的那组工具就是这几个函数
  assert.equal(JIUXING_LUNAR.toSolar(1982, 12, 25), '1983-02-07');
  assert.deepEqual(JIUXING_LUNAR.fromSolar('1983-02-07'), { year: 1982, month: 12, day: 25 });
  assert.equal(JIUXING_LUNAR.text(JIUXING_LUNAR.fromSolar('1983-02-07')), '1982 年十二月廿五');
});
