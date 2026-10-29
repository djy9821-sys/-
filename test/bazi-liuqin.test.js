import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
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
const liuqinOf = (chart) => analyzeLiuqin(chart, analyzeStrength(chart));
const itemOf = (liuqin, key) => liuqin.items.find((item) => item.key === key);

test('男命看妻：财星是喜用、来合日主（任注「此喜神即是财星也……更喜财星逢合，谓财来就我」）', () => {
  const liuqin = liuqinOf(chartByPillars('癸卯 乙丑 庚申 丁丑'));
  assert.equal(liuqin.female, false);
  assert.deepEqual(liuqin.items.map((item) => item.title), ['妻', '子女', '父母', '兄弟']);
  const wife = itemOf(liuqin, 'spouse');
  const [star] = wife.stars;
  assert.equal(star.label, '妻星');
  assert.equal(star.element, '木');
  assert.equal(star.tone, 'good');
  assert.equal(star.transparent, true);
  assert.deepEqual(star.he, ['月干乙与日主庚相合']);
  assert.equal(wife.palaces[0].zhi, '申');
  assert.equal(wife.palaces[0].shiShen, '比肩');
  assert.equal(wife.verdict, '妻星是喜用，古法看作得力；宫位坐忌神，美中不足；星来合日主，古法以为有情。');
  assert.equal(wife.classic.source, '《滴天髓·夫妻》');
  // 子女看官杀（时干丁火七杀……按男命以官杀为子女），子女宫在时柱。
  const children = itemOf(liuqin, 'children');
  assert.equal(children.stars[0].element, '火');
  assert.equal(children.palaces[0].label, '子女宫（时柱）');
});

test('女命看夫：官杀为夫星、食伤为子女；夫妻宫逢冲另提一句', () => {
  const liuqin = liuqinOf(chartByPillars('丙寅 辛卯 癸酉 戊午', 'female'));
  assert.equal(liuqin.female, true);
  const husband = itemOf(liuqin, 'spouse');
  assert.equal(husband.title, '夫');
  assert.deepEqual(husband.stars[0].names, ['正官', '七杀']);
  assert.equal(husband.stars[0].element, '土');
  assert.equal(husband.palaces[0].zhi, '酉');
  assert.ok(husband.palaces[0].relations.includes('卯酉冲'));
  assert.equal(husband.palaces[0].clash, true);
  assert.match(husband.verdict, /夫妻宫（日支）逢冲，古法主变动/);
  assert.equal(husband.classic.source, '《滴天髓·女命》');
  assert.deepEqual(itemOf(liuqin, 'children').stars[0].names, ['食神', '伤官']);
  // 比劫水四柱不见。
  const siblings = itemOf(liuqin, 'siblings');
  assert.equal(siblings.stars[0].places.length, 0);
  assert.match(siblings.verdict, /^兄弟星不现，古法看宫位与岁运引出/);
  // 父母：母星、父星分开看，宫位看年月。
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
});
