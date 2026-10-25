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
  assert.equal(xiaoYun.endAge, 8);
  assert.equal(xiaoYun.years.length, 8);
  assert.equal(xiaoYun.years[0].year, 1998);
  assert.equal(xiaoYun.years[0].xiaoYun.ganZhi, '丁卯');
  assert.equal(xiaoYun.years[0].xiaoYun.name, '小运');
  assert.equal(xiaoYun.years.at(-1).year, 2005);
});
