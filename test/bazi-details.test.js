import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';

const chart = buildBaziChart({
  calendarType: 'solar', year: 1998, month: 1, day: 2, gender: 'male', hourIndex: 4,
}, new Date(2026, 9, 26, 9, 0));

test('四柱自坐与问真一致，并附带神煞', () => {
  assert.deepEqual(chart.pillars.map(({ ziZuo }) => ziZuo), ['墓', '帝旺', '长生', '冠带']);
  assert.deepEqual(chart.pillars[0].shensha, ['太极贵人', '月德合', '华盖']);
  assert.ok(chart.yun.dayun.every((item) => Array.isArray(item.shensha) && item.liuNian.every((year) => Array.isArray(year.shensha))));
});

test('胎元、命宫、身宫', () => {
  assert.deepEqual(chart.extras, {
    taiYuan: '癸卯', taiYuanNaYin: '金箔金',
    mingGong: '癸丑', mingGongNaYin: '桑柘木',
    shenGong: '乙巳', shenGongNaYin: '覆灯火',
  });
});

test('起运前的小运', () => {
  const { xiaoYun } = chart.yun;
  assert.equal(xiaoYun.startAge, 1);
  assert.equal(xiaoYun.endAge, 9);
  assert.equal(xiaoYun.years.length, 8);
  assert.equal(xiaoYun.years[0].year, 1998);
  assert.equal(xiaoYun.years[0].xiaoYun.ganZhi, '丁卯');
  assert.equal(xiaoYun.years[0].xiaoYun.name, '小运');
  assert.equal(xiaoYun.years.at(-1).year, 2005);
});

test('虚岁按农历年算：元旦到春节之间出生的人不少算一岁', () => {
  // 1998-01-02 还是农历丁丑年腊月，1998 年春节就满 2 虚岁，2026 年是 30 虚岁。
  const liuNian2026 = chart.yun.dayun.flatMap((item) => item.liuNian).find(({ year }) => year === 2026);
  const jiYou = chart.yun.dayun.find(({ ganZhi }) => ganZhi === '己酉');
  assert.equal(liuNian2026.age, 30);
  assert.deepEqual([jiYou.startAge, jiYou.endAge, jiYou.startYear], [30, 39, 2026]);
  assert.deepEqual([chart.yun.dayun[0].startAge, chart.yun.dayun[0].endAge], [10, 19]);
  assert.equal(chart.yun.xiaoYun.years[0].age, 2);

  // 春节以后出生的不受影响：2026 - 1990 + 1 = 37。
  const midYear = buildBaziChart({
    calendarType: 'solar', year: 1990, month: 6, day: 15, gender: 'female', hourIndex: 6,
  }, new Date(2026, 9, 26, 9, 0));
  assert.equal(midYear.yun.dayun.flatMap((item) => item.liuNian).find(({ year }) => year === 2026).age, 37);
});
