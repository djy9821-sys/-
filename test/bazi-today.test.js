import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { buildBaziRecord, recordToBaziForm } from '../src/utils/baziRecord.js';
import { baziFormToChartInput } from '../src/utils/baziInput.js';
import { buildBaziToday } from '../src/utils/baziToday.js';

const form = {
  personName: '杨先生', calendarType: 'solar', year: 1998, month: 1, day: 2, hourIndex: 4,
  gender: 'male', daySect: 2, timeMode: 'exact', clockTime: '07:30',
  placeProvince: '河南', placeCity: '信阳', longitude: '115.65', timezone: 8, applyTrueSolar: true, applyDst: false,
};

test('表单经档案往返后排出同一张盘', () => {
  const direct = buildBaziChart(baziFormToChartInput(form));
  const restored = buildBaziChart(baziFormToChartInput(recordToBaziForm(buildBaziRecord(form, direct))));
  assert.deepEqual(restored.pillars.map(({ ganZhi }) => ganZhi), ['丁丑', '壬子', '己酉', '戊辰']);
  assert.equal(restored.timeInfo.correctedTime, '07:09');
  assert.equal(restored.timeInfo.placeName, '信阳附近');

  const shichen = baziFormToChartInput({ ...form, timeMode: 'shichen', clockTime: '' });
  assert.equal(shichen.hourIndex, 4);
  assert.equal(shichen.timeMode, undefined);
});

test('八字 · 今日：流日、流时、运限与关系', () => {
  const now = new Date(2026, 9, 27, 9, 30);
  const chart = buildBaziChart(baziFormToChartInput(form), now);
  const today = buildBaziToday(chart, now);
  assert.equal(today.today, '2026-10-27');
  assert.equal(today.liuRi.ganZhi, '甲戌');
  assert.equal(today.liuShi.ganZhi, '己巳');
  assert.equal(today.liuYue.ganZhi, '戊戌');
  assert.equal(today.liuNian.ganZhi, '丙午');
  assert.equal(today.daYun.ganZhi, '己酉');
  assert.ok(today.relations.some(({ title }) => title === '辰戌冲'));
  assert.deepEqual(
    [today.dayTone.gan.element, today.dayTone.gan.tone, today.dayTone.zhi.element, today.dayTone.zhi.tone],
    ['木', 'bad', '土', 'good'],
  );
  assert.ok(today.liuRi.almanac.yi.length > 0);
});

test('起运前按小运', () => {
  const now = new Date(2000, 5, 1, 12, 0);
  const chart = buildBaziChart(baziFormToChartInput(form), now);
  const today = buildBaziToday(chart, now);
  assert.equal(today.daYun.name, '小运');
  assert.equal(today.daYun.ganZhi, '乙丑');
});
