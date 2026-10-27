import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';

const chartFor = (hourIndex) => buildBaziChart({
  calendarType: 'solar', year: 1998, month: 1, day: 2, gender: 'male', hourIndex,
});

test('己土生子月、时柱戊辰：偏弱，冬月调候喜火', () => {
  const result = analyzeStrength(chartFor(4));

  assert.deepEqual(result.scores, { 木: 0.5, 火: 1, 土: 3, 金: 1.3, 水: 3.8 });
  assert.equal(result.band, '偏弱');
  assert.equal(Math.round(result.ratio * 100), 42);
  assert.equal(result.deLing, false);
  assert.deepEqual(result.monthMain, { gan: '癸', role: '财' });
  assert.deepEqual(result.deDi.map(({ zhi }) => zhi), ['丑', '辰']);
  assert.deepEqual(result.deShi.map(({ gan }) => gan), ['丁', '戊']);
  assert.equal(result.tiaoHou.season, '冬月寒冷');
  assert.equal(result.tiaoHou.primary, '丙');
  assert.equal(result.tiaoHou.element, '火');
  assert.deepEqual(result.tiaoHou.stems, ['丙', '甲', '戊']);
  assert.equal(result.tiaoHou.source, '《穷通宝鉴》·调候用神表');
  assert.deepEqual(result.favorable.map(({ element }) => element), ['火', '土']);
  assert.deepEqual(result.unfavorable.map(({ element }) => element), ['水', '金', '木']);
  assert.equal(result.roles['水'], '财');
});

test('时柱丁卯同样偏弱', () => {
  const result = analyzeStrength(chartFor(3));
  assert.equal(result.band, '偏弱');
});

test('身强时喜泄耗，从夏月取水调候', () => {
  // 丙午 甲午 丁巳 丙午：火旺且有木生。
  const chart = buildBaziChart({ calendarType: 'solar', year: 2026, month: 6, day: 12, gender: 'male', hourIndex: 6 });
  assert.equal(chart.pillars.map(({ ganZhi }) => ganZhi).join(' '), '丙午 甲午 丁巳 丙午');
  const result = analyzeStrength(chart);
  assert.equal(result.band, '偏强');
  assert.equal(result.deLing, true);
  assert.equal(result.tiaoHou.element, '水');
  assert.deepEqual(result.tiaoHou.stems, ['壬', '庚', '癸']);
  assert.equal(result.favorable[0].element, '水');
  assert.ok(result.unfavorable.every(({ element }) => element !== '水'));
});
