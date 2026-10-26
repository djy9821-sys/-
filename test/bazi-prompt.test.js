import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { buildLiuRi, buildLiuShi, buildLiuYue } from '../src/utils/baziFlow.js';
import { buildBaziPrompt } from '../src/utils/baziPrompt.js';

const now = new Date(2026, 9, 26, 9, 0);
const chart = buildBaziChart({
  calendarType: 'solar', year: 1998, month: 1, day: 2, gender: 'male',
  timeMode: 'exact', clockHour: 7, clockMinute: 30, longitude: 115.65, placeName: '信阳附近',
}, now);

const daYun = chart.yun.dayun.find((item) => item.liuNian.some(({ year }) => year === 2026));
const liuNian = daYun.liuNian.find(({ year }) => year === 2026);
const liuYue = buildLiuYue(2026, '己', now)[8];
const liuRi = buildLiuRi(liuYue, '己', now).find(({ date }) => date === '2026-10-27');
const liuShi = buildLiuShi('2026-10-27', '己', now)[5];
const liuYueList = buildLiuYue(2026, '己', now);
const liuRiList = buildLiuRi(liuYue, '己', now);
const liuShiList = buildLiuShi('2026-10-27', '己', now);
const selections = { daYun, liuNian, liuYue, liuRi, liuShi, liuYueList, liuRiList, liuShiList };

test('流时提示词包含出生信息、四柱、各层运限与关系', () => {
  const prompt = buildBaziPrompt({ chart, scope: 'hour', personName: '杨先生', selections, now });

  [
    '本次要分析的是：2026-10-27 巳时 09:00-11:00（己巳时）',
    '称呼：杨先生；男命（乾造）',
    '真太阳时：1998-01-02 07:09',
    '时柱丁卯',
    '- 时柱 戊辰：',
    '- 日主：己土',
    '己酉，天干十神比肩  ← 当前',
    '- 流年（2026 年，29 虚岁） 丙午',
    '- 流月（寒露 2026-10-08 起） 戊戌',
    '- 流日（2026-10-27 周二',
    '- 流时（巳时 09:00-11:00） 己巳',
    '【运限与命局的干支关系】',
    '辰戌冲：',
    '我的问题：',
  ].forEach((text) => assert.ok(prompt.includes(text), `缺少：${text}`));
});

test('范围决定带入的运限层级与提问', () => {
  const year = buildBaziPrompt({ chart, scope: 'year', selections, now });
  assert.ok(year.includes('- 流年（2026 年'));
  assert.ok(!year.includes('- 流月（'));
  assert.ok(year.includes('哪些月份比较顺'));
  assert.ok(year.includes('【2026 年各月（以节令换月）】'));
  assert.ok(year.includes('- 寒露 10/8 起 戊戌（劫财）：辰戌冲'));
  assert.ok(!year.includes('129–138'));

  const day = buildBaziPrompt({ chart, scope: 'day', selections, now });
  assert.ok(day.includes('【当日各时辰】'));
  assert.ok(day.includes('- 巳时 09:00-11:00 己巳（比肩）'));

  const month = buildBaziPrompt({ chart, scope: 'month', selections, now });
  assert.ok(month.includes('- 10-27 周二 甲戌（正官）：辰戌冲'));

  const natal = buildBaziPrompt({ chart, scope: 'natal', selections, now });
  assert.ok(!natal.includes('【所选运限】'));
  assert.ok(natal.includes('【原局内部的干支关系】'));
  assert.ok(natal.includes('辰酉合'));
  assert.ok(natal.includes('喜用神与忌神'));
});

test('提示词带上神煞、自坐、胎元命宫与旺衰参考', () => {
  const natal = buildBaziPrompt({ chart, scope: 'natal', selections, now });
  [
    '- 年柱 丁丑：',
    '自坐 墓',
    '神煞 太极贵人、月德合、华盖',
    '- 胎元 癸卯（金箔金）；命宫 癸丑（桑柘木）；身宫 乙巳（覆灯火）',
    '起运前行小运（1–8 虚岁）：1998丁卯',
    '【旺衰参考（程序估算）】',
    '- 日主己土：偏弱',
    '- 喜用参考：火（印，调候）、土（比劫）',
    '- 忌神参考：水（财）',
  ].forEach((text) => assert.ok(natal.includes(text), `缺少：${text}`));
  assert.ok(!natal.includes('当日黄历'));
});

test('流日、流时补上神煞与黄历宜忌', () => {
  const day = buildBaziPrompt({ chart, scope: 'day', selections, now });
  assert.ok(day.includes('- 流日（2026-10-27 周二，农历九月十八） 甲戌：'));
  assert.match(day, /甲戌：[^\n]*神煞 太极贵人、德秀贵人/);
  assert.match(day, /- 当日黄历：建日，值神白虎（黑道），冲\(戊辰\)龙，煞北；宜 祭祀[^\n]*；忌 出货财/);

  const month = buildBaziPrompt({ chart, scope: 'month', selections, now });
  assert.ok(!month.includes('当日黄历'));
});

test('起运前的年份按小运导出', () => {
  const childYear = chart.yun.xiaoYun.years.find(({ year }) => year === 2000);
  const xiaoYun = { ...childYear.xiaoYun, startAge: 1, endAge: 8, startYear: 1998, endYear: 2005 };
  const prompt = buildBaziPrompt({ chart, scope: 'year', selections: { daYun: xiaoYun, liuNian: childYear }, now });
  assert.ok(prompt.includes('- 小运（起运前，2000 年） 乙丑：'), prompt.split('【所选运限】')[1]?.slice(0, 200));
  assert.ok(prompt.includes('子丑合（土）：小运丑 · 月柱子'));
  assert.ok(prompt.includes('结合所行小运'));
});
