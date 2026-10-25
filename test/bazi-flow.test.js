import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLiuRi,
  buildLiuShi,
  buildLiuYue,
  getBaziYearOfDate,
  getHourIndexForTime,
  isValidYmd,
  resolveFlowSelection,
} from '../src/utils/baziFlow.js';

// 1998-01-02 辰时男命：丁丑 壬子 己酉 戊辰，日主己土。
const DAY_GAN = '己';

test('流月以十二节为界，2026 丙午年寒露起戊戌月', () => {
  const months = buildLiuYue(2026, DAY_GAN, new Date(2026, 9, 25, 21, 0));

  assert.equal(months.length, 12);
  assert.deepEqual(months.map(({ jieName }) => jieName), [
    '立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
  ]);
  assert.equal(months[0].ganZhi, '庚寅');
  assert.equal(months[0].startDate, '2026-02-04');
  assert.equal(months[8].ganZhi, '戊戌');
  assert.equal(months[8].startDate, '2026-10-08');
  assert.equal(months[8].endDate, '2026-11-07');
  assert.equal(months[8].ganShiShen, '劫财');
  assert.equal(months[11].ganZhi, '辛丑');
  assert.equal(months[11].startDate, '2027-01-05');
  assert.equal(months[11].endDate, '2027-02-04');
  assert.deepEqual(months.filter(({ isCurrent }) => isCurrent).map(({ index }) => index), [8]);
});

test('流日覆盖本月节到下一个节前一天，日柱与十神正确', () => {
  const [month] = buildLiuYue(2026, DAY_GAN).filter(({ index }) => index === 8);
  const days = buildLiuRi(month, DAY_GAN, new Date(2026, 9, 26, 9, 0));

  assert.equal(days[0].date, '2026-10-08');
  assert.equal(days.at(-1).date, '2026-11-06');
  assert.equal(days.length, 30);
  assert.equal(days[0].jieQi, '寒露');

  const oct26 = days.find(({ date }) => date === '2026-10-26');
  const oct27 = days.find(({ date }) => date === '2026-10-27');
  assert.equal(oct26.ganZhi, '癸酉');
  assert.equal(oct26.ganShiShen, '偏财');
  assert.equal(oct26.isToday, true);
  assert.equal(oct27.ganZhi, '甲戌');
  assert.equal(oct27.ganShiShen, '正官');
  assert.equal(oct27.weekdayLabel, '周二');
});

test('流时区分早子与晚子，巳时为丁巳', () => {
  const hours = buildLiuShi('2026-10-26', DAY_GAN, new Date(2026, 9, 26, 9, 30));

  assert.equal(hours.length, 13);
  assert.equal(hours[0].ganZhi, '壬子');
  assert.equal(hours[5].branchName, '巳时');
  assert.equal(hours[5].ganZhi, '丁巳');
  assert.equal(hours[5].ganShiShen, '偏印');
  assert.equal(hours[5].isCurrent, true);
  assert.equal(hours[12].hourName, '晚子时');
  assert.equal(hours[12].ganZhi, '甲子');
});

test('时段映射与八字年份以立春为界', () => {
  assert.deepEqual([0, 1, 2, 3, 10, 11, 12, 22, 23].map(getHourIndexForTime), [0, 1, 1, 2, 5, 6, 6, 11, 12]);
  assert.equal(getBaziYearOfDate('2026-02-03'), 2025);
  assert.equal(getBaziYearOfDate('2026-02-04'), 2026);
  assert.equal(getBaziYearOfDate('2027-01-20'), 2026);
  assert.equal(isValidYmd('2026-02-30'), false);
  assert.throws(() => getBaziYearOfDate('2026/10/26'));
});

test('未选择时落在此刻，跳转日期时自动定位所在流月', () => {
  const months = buildLiuYue(2026, DAY_GAN);
  const now = new Date(2026, 9, 25, 12, 0);

  assert.deepEqual(resolveFlowSelection(months, null, now), {
    baziYear: 2026, monthIndex: 8, date: '2026-10-25', hourIndex: 6,
  });
  assert.deepEqual(resolveFlowSelection(months, { baziYear: 2026, date: '2026-12-25', hourIndex: 3 }, now), {
    baziYear: 2026, monthIndex: 10, date: '2026-12-25', hourIndex: 3,
  });
  // 选择其他流月且未指定日期时，从该月交节日开始。
  assert.equal(resolveFlowSelection(months, { baziYear: 2026, monthIndex: 2 }, now).date, '2026-04-05');
  // 年份不匹配的旧选择被忽略。
  assert.equal(resolveFlowSelection(months, { baziYear: 2025, monthIndex: 2 }, now).monthIndex, 8);
});
