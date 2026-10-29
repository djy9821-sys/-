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
    '- 流年（2026 年，30 虚岁） 丙午',
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
  assert.ok(year.includes('- 流年提要（程序合成，供参考）：'));
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
  assert.ok(!natal.includes('流年提要'));
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
    '起运前行小运（1–9 虚岁）：1998丁卯',
    '【旺衰参考（程序估算）】',
    '- 日主己土：偏弱（旺衰打分 2：得令 0 + 得地 1 + 得势 1；',
    '- 得地：年支丑（己比劫本气）、时支辰（戊比劫本气）',
    '- 取用思路：身弱财重，取比劫帮身，印次之；调候宜火，与扶抑取用一致',
    '- 喜用参考：土（比劫）、火（印，调候）',
    '- 忌神参考：水（财）',
  ].forEach((text) => assert.ok(natal.includes(text), `缺少：${text}`));
  assert.ok(!natal.includes('当日黄历'));
});

test('疑似从格时，旺衰一节指向格局一节，格局一节附按此格论的喜忌', () => {
  // 乙卯 戊寅 癸卯 戊午：癸水无根，食伤独旺，疑似从儿格。
  const cong = buildBaziChart({ calendarType: 'solar', year: 1975, month: 2, day: 26, gender: 'male', hourIndex: 6 }, now);
  const text = buildBaziPrompt({ chart: cong, scope: 'natal', selections: {}, now });
  assert.match(text, /未考虑从格、化格、专旺等特殊格局（本盘疑似从儿格，按此格论的喜忌见下一节）/);
  assert.ok(text.includes('- 若按从儿格论：喜火（财）、木（食伤）；忌金（印）、土（官杀）（'));
  assert.ok(!buildBaziPrompt({ chart, scope: 'natal', selections, now }).includes('按此格论'));
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
  const xiaoYun = { ...childYear.xiaoYun, startAge: 1, endAge: 9, startYear: 1998, endYear: 2005 };
  const prompt = buildBaziPrompt({ chart, scope: 'year', selections: { daYun: xiaoYun, liuNian: childYear }, now });
  assert.ok(prompt.includes('- 小运（起运前，2000 年） 乙丑：'), prompt.split('【所选运限】')[1]?.slice(0, 200));
  assert.ok(prompt.includes('子丑合（土）：小运丑 · 月柱子'));
  assert.ok(prompt.includes('结合所行小运'));
});

test('提示词附古籍原文：只附原文不附白话，最多六条，说明条数与状态；没有命中就不加这一节', () => {
  const hit = (id, status, original, extra = {}) => ({
    entry: { id, title: `题${id}`, book: '子平真诠', volume: '卷一', section: '论用神', status, original, vernacular: '白话不该出现', doubts: [], ...extra },
    reason: '格局·正官格',
  });
  const classics = [
    hit('a', 'reviewed', '官逢财印，\n又无刑冲破害。'),
    hit('b', 'translated', '乙'), hit('c', 'translated', '丙'), hit('d', 'draft', '丁'), hit('e', 'draft', '戊'), hit('f', 'draft', '己'),
    hit('g', 'draft', '庚'), hit('h', 'draft', '辛'),
  ];
  const prompt = buildBaziPrompt({ chart, scope: 'natal', selections, now, classics });
  assert.match(prompt, /【古籍原文（与本命相关）】\n- 《子平真诠》·卷一·论用神「题a」（匹配：格局·正官格）：官逢财印， 又无刑冲破害。\n- 《子平真诠》/);
  assert.ok(!prompt.includes('白话不该出现'));
  assert.ok(prompt.includes('「题f」') && !prompt.includes('「题g」'), '最多六条');
  assert.ok(prompt.includes('古籍库里与本命相关的原文共 8 条，这里只附最相关的 6 条。'));
  assert.ok(prompt.includes('（条目状态：已审、待审、待审、仅原文、仅原文、仅原文）'));
  // 古籍一节排在神煞出处之后、运限关系之前。
  assert.ok(prompt.indexOf('【神煞查法出处】') < prompt.indexOf('【古籍原文（与本命相关）】'));
  assert.ok(prompt.indexOf('【古籍原文（与本命相关）】') < prompt.indexOf('【原局内部的干支关系】'));

  assert.ok(!buildBaziPrompt({ chart, scope: 'natal', selections, now }).includes('【古籍原文'));
  assert.ok(!buildBaziPrompt({ chart, scope: 'natal', selections, now, classics: [] }).includes('【古籍原文'));
  assert.ok(!buildBaziPrompt({ chart, scope: 'natal', selections, now, classics: [{ entry: { title: '无原文' } }] }).includes('【古籍原文'));
});

test('六亲宫星一节每亲附一条讲这一亲的古籍原文（只附原文、最相关的一条）；没给就不附', () => {
  const hit = (id, section, original) => ({ entry: { id, title: `题${id}`, book: '滴天髓', volume: '', section, status: 'draft', original, vernacular: '白话不该出现', doubts: [] }, reason: '六亲·夫妻' });
  const liuqinClassics = {
    spouse: [hit('a', '夫妻', '夫妻因缘宿世来，\n喜神有意傍天财。'), hit('b', '夫妻', '第二条不附')],
    children: [{ entry: { id: 'x', title: '无原文' } }],
    parents: [],
  };
  const prompt = buildBaziPrompt({ chart, scope: 'natal', selections, now, liuqinClassics });
  const section = prompt.slice(prompt.indexOf('【六亲宫星（程序初判）】'), prompt.indexOf('【神煞查法出处】'));
  assert.match(section, /\n- 兄弟：[^\n]+\n- 古籍论夫妻（《滴天髓》·夫妻）：夫妻因缘宿世来， 喜神有意傍天财。\n*$/);
  assert.ok(!section.includes('第二条不附') && !section.includes('白话不该出现') && !section.includes('古籍论子女'));
  assert.ok(!buildBaziPrompt({ chart, scope: 'natal', selections, now }).includes('古籍论'));
});

test('大运一节注明运支与原局会成的方局（程序的大运喜忌按局的五行论）', () => {
  // 丁丑 壬子 己酉 戊辰：辛亥运亥子丑三会水方，戊申运申子辰三合水局，乙巳运巳酉丑三合金局；庚戌运凑不齐。
  const prompt = buildBaziPrompt({ chart, scope: 'natal', selections, now });
  assert.match(prompt, /辛亥，天干十神食神，运支亥与原局子丑会成亥子丑三会水方/);
  assert.match(prompt, /戊申，天干十神劫财，运支申与原局子辰会成申子辰三合水局/);
  assert.match(prompt, /乙巳，天干十神七杀，运支巳与原局酉丑会成巳酉丑三合金局/);
  assert.match(prompt, /庚戌，天干十神伤官(?!，运支)/);
});
