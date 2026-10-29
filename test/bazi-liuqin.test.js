import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';
import { analyzeLiuqin } from '../src/utils/baziLiuqin.js';
import { buildBaziPrompt } from '../src/utils/baziPrompt.js';
import { findSolarDateByPillars } from '../scripts/lib/baziCases.mjs';

/** 古籍命例只有四柱：找一个四柱相同的日子排盘。 */
const chartByPillars = (text, gender = 'male') => {
  const date = findSolarDateByPillars(text.split(' '));
  const chart = buildBaziChart({ calendarType: 'solar', year: date.year, month: date.month, day: date.day, hourIndex: date.hourIndex, gender });
  assert.equal(chart.pillars.map(({ ganZhi }) => ganZhi).join(' '), text);
  return chart;
};
/** 与结果页同一口径：认出从、化、专旺的按此格论喜忌。 */
const liuqinOf = (chart) => {
  const strength = analyzeStrength(chart);
  return analyzeLiuqin(chart, strength, { special: judgeBaziPattern(chart, strength).special });
};
const itemOf = (liuqin, key) => liuqin.items.find((item) => item.key === key);

test('男命：星与宫照子平列出（财为妻星、官杀为子女星），断语按任注推', () => {
  // 癸卯 乙丑 庚申 丁丑（《滴天髓阐微·夫妻》任注命造）：庚金身旺，喜木水火。
  const liuqin = liuqinOf(chartByPillars('癸卯 乙丑 庚申 丁丑'));
  assert.equal(liuqin.female, false);
  assert.deepEqual(liuqin.items.map((item) => item.title), ['妻', '子女', '父母', '兄弟']);
  assert.deepEqual(liuqin.items.map((item) => item.kind), ['夫妻', '子女', '父母', '兄弟'], '古籍 applies.liuqin 的取值，「六亲宫星」按它找讲这一亲的原文');
  const wife = itemOf(liuqin, 'spouse');
  const [star] = wife.stars;
  assert.equal(star.label, '妻星');
  assert.equal(star.element, '木');
  assert.equal(star.tone, 'good');
  assert.equal(star.transparent, true);
  assert.deepEqual(star.he, ['月干乙与日主庚相合']);
  assert.equal(wife.palaces[0].zhi, '申');
  assert.equal(wife.palaces[0].shiShen, '比肩');
  // 任注克妻、不克诸条都不合，看妻宫：日支申金比肩，身旺为忌。（原书此造妻贤，任氏取「喜神即是财星，财来就我」——程序没跟到，命例回归里记作不一致。）
  assert.equal(wife.ren.source, '《滴天髓阐微·夫妻》任注');
  assert.equal(wife.tone, 'bad');
  assert.equal(wife.verdict, '妻宫（日支）坐忌神，古法主夫妻难以全美；星来合日主，古法以为有情。');
  assert.equal(wife.classic.source, '《滴天髓·夫妻》');
  // 子女：星照子平取官杀（时干丁火七杀），子女宫在时柱；断语按任注「凡八字之用神即是子星」看用神木。
  const children = itemOf(liuqin, 'children');
  assert.equal(children.stars[0].element, '火');
  assert.equal(children.palaces[0].label, '子女宫（时柱）');
  assert.equal(children.ren.god.element, '木');
  assert.equal(children.ren.god.state, 'strong');
  assert.equal(children.verdict, '任注「凡八字之用神即是子星」：用神木透月干乙，作年支卯本气，有力，古法看作子息可望。');
  // 父母：任注只看年月——癸、卯、乙为喜，丑为忌。
  const parents = itemOf(liuqin, 'parents');
  assert.equal(parents.tone, 'good');
  assert.match(parents.verdict, /^任注论父母只看年月：年月癸卯乙为喜、丑为忌，喜多，古法看作祖上有荫/);
  // 兄弟：比劫金是忌神（「全凭日主之爱憎」）。
  assert.equal(itemOf(liuqin, 'siblings').verdict, '任注「全凭日主之爱憎」：比劫金是忌神，古法看作兄弟难靠。');
});

test('任注克妻、不克与子女诸条：合上哪条按哪条断', () => {
  // 戊子 癸亥 壬戌 甲辰：壬水身旺，比劫水重、财火轻、有食伤木、无印——「劫刃旺而财轻，有食伤，妻贤不克」（任注此造「其不刑妻者，无财之妙也」）。
  const notKe = liuqinOf(chartByPillars('戊子 癸亥 壬戌 甲辰'));
  const wife = itemOf(notKe, 'spouse');
  assert.equal(wife.tone, 'good');
  assert.deepEqual(wife.ren.rule && { cond: wife.ren.rule.cond, original: wife.ren.rule.original }, { cond: '劫刃旺而财轻，有食伤', original: '妻贤不克' });
  assert.match(wife.verdict, /^任注：劫刃旺而财轻，有食伤，古法主妻贤不克/);
  // 乙亥 庚辰 丙申 壬辰：丙火身弱用印木，官杀水旺又见财金——「官杀旺而用印，见财星」（任注此造「其妻不贤，妒悍异常」）。
  const ke = itemOf(liuqinOf(chartByPillars('乙亥 庚辰 丙申 壬辰')), 'spouse');
  assert.equal(ke.tone, 'bad');
  assert.equal(ke.ren.rule.original, '主妻陋而克');
  assert.equal(ke.verdict, '任注：官杀旺而用印，见财星，古法主妻宫不美、有刑克。', '重话换成平实说法，原话记在 rule.original');
  // 辛丑 辛丑 戊戌 癸丑：戊土身旺，无印、食伤金重——「日主旺，无印绶，有食伤，子必多」（原书此造连生十六子）。
  const many = itemOf(liuqinOf(chartByPillars('辛丑 辛丑 戊戌 癸丑')), 'children');
  assert.equal(many.tone, 'good');
  assert.equal(many.verdict, '任注：日主旺，无印绶，有食伤，古法主子息多。');
  // 戊辰 庚申 己卯 戊辰：己土身弱，食伤金重、印轻——「日主弱，食伤重，印绶轻，亦无子」（原书此造至老无子）。
  const none = itemOf(liuqinOf(chartByPillars('戊辰 庚申 己卯 戊辰')), 'children');
  assert.equal(none.tone, 'bad');
  assert.equal(none.ren.rule.original, '亦无子');
  assert.equal(none.verdict, '任注：日主弱，食伤重，印绶轻，古法主子息艰难。');
});

test('女命：「女命之夫星，即是用神；女命之子星，即是喜神」，克夫诸条先看', () => {
  // 庚辰 戊寅 乙酉 壬午（坤造）：乙木身弱，用神火作时支午本气，喜神木——原书「夫官二品，五子二十三孙」。
  const good = liuqinOf(chartByPillars('庚辰 戊寅 乙酉 壬午', 'female'));
  assert.equal(good.female, true);
  const husband = itemOf(good, 'spouse');
  assert.equal(husband.title, '夫');
  assert.deepEqual(husband.stars[0].names, ['正官', '七杀']);
  assert.equal(husband.ren.source, '《滴天髓阐微·女命》任注');
  assert.equal(husband.tone, 'good');
  assert.equal(husband.verdict, '任注「女命之夫星，即是用神」：用神火作时支午本气，有力，古法看作夫主得力。');
  const children = itemOf(good, 'children');
  assert.deepEqual(children.stars[0].names, ['食神', '伤官']);
  assert.equal(children.verdict, '任注「女命之子星，即是喜神」：喜神木作月支寅本气，有力，古法看作子息可望。');
  // 戊申 甲寅 壬寅 丁未（坤造，疑似壬丁化木格，按此格论喜忌）：官杀土旺、印金轻——「官星旺，印绶轻，必克夫」（原书「伤夫败业」）。
  const ke = liuqinOf(chartByPillars('戊申 甲寅 壬寅 丁未', 'female'));
  assert.match(ke.basis, /^女命；此盘疑似壬丁化木格，喜忌按此格论/);
  const keFu = itemOf(ke, 'spouse');
  assert.equal(keFu.tone, 'bad');
  assert.equal(keFu.ren.rule.original, '必克夫');
  assert.equal(keFu.verdict, '任注：官星旺，印绶轻，古法主克夫；夫妻宫（日支）逢冲，古法主变动。');
});

test('宫位逢冲另提一句；比劫不现也按日主喜忌论兄弟', () => {
  // 丙寅 辛卯 癸酉 戊午（坤造）：夫妻宫酉逢卯冲；比劫水四柱不见，但癸水身弱喜水。
  const liuqin = liuqinOf(chartByPillars('丙寅 辛卯 癸酉 戊午', 'female'));
  const husband = itemOf(liuqin, 'spouse');
  assert.equal(husband.palaces[0].zhi, '酉');
  assert.ok(husband.palaces[0].relations.includes('卯酉冲'));
  assert.equal(husband.palaces[0].clash, true);
  assert.match(husband.verdict, /夫妻宫（日支）逢冲，古法主变动/);
  assert.equal(husband.classic.source, '《滴天髓·女命》');
  const siblings = itemOf(liuqin, 'siblings');
  assert.equal(siblings.stars[0].places.length, 0);
  assert.match(siblings.verdict, /^任注「全凭日主之爱憎」：比劫水是喜用，古法看作兄弟得力/);
  // 喜神水四柱不见：子星即喜神，不现。
  assert.match(itemOf(liuqin, 'children').verdict, /喜神水四柱不见/);
  // 父母：星仍列母星、父星，宫位看年月。
  const parents = itemOf(liuqin, 'parents');
  assert.deepEqual(parents.stars.map((star) => star.label), ['母星', '父星']);
  assert.deepEqual(parents.palaces.map((palace) => palace.key), ['year', 'month']);
});

test('只合紧贴的天干：隔位的不算合住', () => {
  // 庚午 辛巳 壬午 丙午：月干辛与时干丙隔着日干，不作相合。
  const liuqin = liuqinOf(buildBaziChart({ calendarType: 'solar', year: 1990, month: 5, day: 17, hourIndex: 6, gender: 'male' }));
  itemOf(liuqin, 'parents').stars.forEach((star) => assert.deepEqual(star.he, []));
});

test('时辰不详：子女宫不论；提示词附上六亲宫星一节', () => {
  const chart = buildBaziChart({ calendarType: 'solar', year: 1998, month: 1, day: 2, gender: 'female', hourIndex: null, timeMode: 'unknown' });
  const children = itemOf(liuqinOf(chart), 'children');
  assert.equal(children.palaces[0].missing, true);
  assert.match(children.palaces[0].text, /时辰不详，不论/);

  const prompt = buildBaziPrompt({ chart: chartByPillars('癸卯 乙丑 庚申 丁丑'), scope: 'natal', now: new Date('2026-10-28T10:00:00') });
  assert.match(prompt, /【六亲宫星（程序初判）】\n男命；喜忌按「五行与旺衰」一节扶抑所取。\n- 妻：妻星木（正财为妻，偏财为妾）透月干乙/);
  assert.match(prompt, /- 子女：[^\n]*任注「凡八字之用神即是子星」：用神木/);
});
