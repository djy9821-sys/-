import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { baziFormToChartInput } from '../src/utils/baziInput.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';
import { buildBaziPrompt } from '../src/utils/baziPrompt.js';
import { buildBaziRecord, recordToBaziForm } from '../src/utils/baziRecord.js';
import { findRelations } from '../src/utils/baziRelations.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { buildBaziToday } from '../src/utils/baziToday.js';

const NOW = new Date('2026-10-26T10:00:00');
const input = { calendarType: 'solar', year: 1998, month: 1, day: 2, gender: 'male', timeMode: 'unknown' };

test('时辰不详：三柱照排，时柱占位，命宫身宫不排，起运标记为估算', () => {
  const chart = buildBaziChart(input, NOW);
  assert.equal(chart.timeUnknown, true);
  assert.equal(chart.timeInfo.mode, 'unknown');
  assert.equal(chart.input.hourIndex, null);
  assert.equal(chart.input.hourOption, null);
  assert.deepEqual(chart.pillars.map(({ ganZhi }) => ganZhi), ['丁丑', '壬子', '己酉', '']);
  assert.equal(chart.pillars[3].unknown, true);
  assert.deepEqual(chart.pillars[3].shensha, []);
  assert.equal(chart.extras.taiYuan, '癸卯');
  assert.equal(chart.extras.mingGong, '');
  assert.equal(chart.extras.shenGong, '');
  assert.equal(chart.yun.estimated, true);
  assert.deepEqual(chart.surfaceWuxingCount, { 木: 0, 火: 1, 土: 2, 金: 1, 水: 2 });
  // 与辰时命盘相比，年月日三柱相同。
  const withHour = buildBaziChart({ ...input, timeMode: 'shichen', hourIndex: 4 }, NOW);
  assert.deepEqual(chart.pillars.slice(0, 3).map(({ ganZhi }) => ganZhi), withHour.pillars.slice(0, 3).map(({ ganZhi }) => ganZhi));
  assert.equal(chart.yun.dayun[0].ganZhi, withHour.yun.dayun[0].ganZhi);
});

test('旺衰、格局、关系与今日都能在没有时柱时计算', () => {
  const chart = buildBaziChart(input, NOW);
  const strength = analyzeStrength(chart);
  assert.ok(Number.isFinite(strength.ratio));
  // 比辰时命盘少了时柱戊辰：天干戊 1、辰中戊 1、乙 0.5、癸 0.3。
  assert.deepEqual(strength.scores, { 木: 0, 火: 1, 土: 1, 金: 1.3, 水: 3.5 });
  const judge = judgeBaziPattern(chart, strength);
  assert.equal(judge.timeUnknown, true);
  assert.equal(judge.pattern.name, '偏财格');
  assert.ok(judge.points.some((line) => line.includes('出生时辰不详')));
  const relations = findRelations(chart.pillars.map((pillar) => ({ key: pillar.key, label: pillar.name, gan: pillar.gan, zhi: pillar.zhi })));
  assert.ok(relations.every((relation) => !relation.memberKeys.includes('time')));
  const today = buildBaziToday(chart, NOW);
  assert.equal(today.liuRi.ganZhi, '癸酉');
  assert.ok(today.relations.every((relation) => !relation.memberKeys.includes('time')));
});

test('档案往返保留时辰不详，紫微用的 timeHour 为空', () => {
  const form = { personName: '测试', calendarType: 'solar', year: 1998, month: 1, day: 2, hourIndex: null, gender: 'male', daySect: 2, timeMode: 'unknown', clockTime: '', placeProvince: '', placeCity: '', longitude: '', timezone: 8, applyTrueSolar: true, applyDst: false };
  const chart = buildBaziChart(baziFormToChartInput(form), NOW);
  const record = buildBaziRecord(form, chart, { group: 'friend' });
  assert.equal(record.timeHour, null);
  assert.equal(record.data.timeMode, 'unknown');
  const restored = recordToBaziForm(record);
  assert.equal(restored.timeMode, 'unknown');
  assert.equal(restored.hourIndex, null);
  const again = buildBaziChart(baziFormToChartInput(restored), NOW);
  assert.equal(again.timeUnknown, true);
  assert.equal(again.pillars[2].ganZhi, '己酉');
  // 紫微记录没有 timeHour 仍然不可用。
  assert.equal(recordToBaziForm({ ...record, type: 'ziwei' }), null);
});

test('提示词说明时辰不详，不列时柱与命宫', () => {
  const chart = buildBaziChart(input, NOW);
  const prompt = buildBaziPrompt({ chart, scope: 'natal', personName: '测试', now: NOW });
  assert.ok(prompt.includes('【本命三柱（时辰不详）】'));
  assert.ok(prompt.includes('- 时柱：不详（出生时辰未知，未排时柱）'));
  assert.ok(prompt.includes('命宫、身宫需时辰，未排'));
  assert.ok(prompt.includes('起运时间按正午估算'));
  assert.ok(prompt.includes('【格局与组合（程序初判）】'));
  assert.ok(prompt.includes('格局：偏财格'));
  assert.ok(prompt.includes('不依赖时柱的结论'));
});

test('有时辰的提示词带格局与流年标注', () => {
  const chart = buildBaziChart({ ...input, timeMode: 'shichen', hourIndex: 4 }, NOW);
  const liuNian = chart.yun.currentLiuNian;
  const daYun = chart.yun.dayun.find((item) => item.isCurrent);
  const prompt = buildBaziPrompt({ chart, scope: 'year', selections: { daYun, liuNian }, now: NOW });
  assert.ok(prompt.includes('【格局与组合（程序初判）】'));
  assert.ok(prompt.includes('财多身弱'));
  assert.ok(prompt.includes('- 流年标注：'));
});
