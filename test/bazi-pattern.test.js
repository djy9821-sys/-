import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { analyzeWuxingGap, determinePattern, judgeBaziPattern } from '../src/utils/baziPattern.js';

const NOW = new Date('2026-10-26T10:00:00');
const judgeFor = (year, month, day, hourIndex, gender = 'male') => {
  const chart = buildBaziChart({ calendarType: 'solar', year, month, day, gender, hourIndex }, NOW);
  const strength = analyzeStrength(chart);
  return { chart, strength, judge: judgeBaziPattern(chart, strength) };
};
const ganZhiOf = (chart) => chart.pillars.map(({ ganZhi }) => ganZhi).join(' ');
const traitNames = (judge) => judge.traits.map(({ name }) => name);

test('月令本气未透：以本气为格；财多身弱与日坐十神', () => {
  const { chart, judge } = judgeFor(1998, 1, 2, 4);
  assert.equal(ganZhiOf(chart), '丁丑 壬子 己酉 戊辰');
  assert.equal(judge.pattern.name, '偏财格');
  assert.equal(judge.pattern.transparent, false);
  assert.equal(judge.special, null);
  assert.deepEqual(traitNames(judge), ['财多身弱', '日坐食神']);
  assert.equal(judge.wuxingGap.text, '八个字里不见木；辰中藏乙木');
  assert.match(judge.wuxingGap.hint, /忌神/);
  assert.deepEqual(judge.absent, []);
  assert.ok(judge.points.some((line) => line.startsWith('格局：偏财格')));
});

test('建禄格、身旺无依、缺水', () => {
  const { chart, judge } = judgeFor(2026, 6, 12, 6);
  assert.equal(ganZhiOf(chart), '丙午 甲午 丁巳 丙午');
  assert.equal(judge.pattern.name, '建禄格');
  assert.equal(judge.pattern.kind, 'lu');
  assert.deepEqual(traitNames(judge), ['身旺无依', '日坐劫财']);
  assert.deepEqual(judge.wuxingGap.missingSurface, ['土', '金', '水']);
  assert.deepEqual(judge.wuxingGap.missingAll, ['水']);
  assert.deepEqual(judge.absent.map(({ text }) => text), ['无官星']);
});

test('羊刃格与月劫格', () => {
  const ren = judgeFor(1975, 1, 6, 0);
  assert.equal(ganZhiOf(ren.chart), '甲寅 丙子 壬子 庚子');
  assert.equal(ren.judge.pattern.name, '羊刃格');
  const jie = judgeFor(1975, 5, 11, 0);
  assert.equal(ganZhiOf(jie.chart), '乙卯 辛巳 丁巳 庚子');
  assert.equal(jie.judge.pattern.name, '月劫格');
});

test('透出者为格；杂气月本气为比劫时取中气', () => {
  const through = judgeFor(1985, 3, 20, 9);
  assert.equal(ganZhiOf(through.chart), '乙丑 己卯 戊午 辛酉');
  assert.equal(through.judge.pattern.name, '正官格');
  assert.equal(through.judge.pattern.transparent, true);
  assert.match(through.judge.pattern.basis, /透于年柱乙/);
  assert.ok(traitNames(through.judge).includes('伤官见官'));

  const zaQi = judgeFor(2000, 4, 10, 10);
  assert.equal(ganZhiOf(zaQi.chart), '庚辰 庚辰 戊戌 壬戌');
  assert.equal(zaQi.judge.pattern.name, '杂气正官格');
  assert.match(zaQi.judge.pattern.basis, /本气戊为比肩不取/);
  assert.match(zaQi.judge.pattern.basis, /中气乙（正官）/);
});

test('常见组合：官杀混杂、食神制杀、羊刃驾杀、伤官配印、官印相生、财官相生、枭神夺食', () => {
  const cases = [
    [[1975, 2, 11, 0], '乙卯 戊寅 戊子 壬子', ['官杀混杂', '杀重身轻']],
    [[1975, 10, 11, 6], '乙卯 丙戌 庚寅 壬午', ['食神制杀']],
    [[1975, 2, 1, 6], '甲寅 丁丑 戊寅 戊午', ['羊刃驾杀']],
    [[1975, 3, 11, 0], '乙卯 己卯 丙辰 戊子', ['伤官配印']],
    [[1975, 11, 1, 0], '乙卯 丙戌 辛亥 戊子', ['官印相生']],
    [[1975, 6, 11, 6], '乙卯 壬午 戊子 戊午', ['财官相生']],
    [[1990, 8, 15, 0], '庚午 甲申 壬子 庚子', ['枭神夺食', '印重身强']],
  ];
  cases.forEach(([args, ganZhi, expected]) => {
    const { chart, judge } = judgeFor(...args);
    assert.equal(ganZhiOf(chart), ganZhi);
    expected.forEach((name) => assert.ok(traitNames(judge).includes(name), `${ganZhi} 应识别出 ${name}，实际 ${traitNames(judge).join('、')}`));
  });
});

test('特殊格局只在比例极端时提示', () => {
  const cong = judgeFor(1975, 2, 26, 6);
  assert.equal(ganZhiOf(cong.chart), '乙卯 戊寅 癸卯 戊午');
  assert.equal(cong.judge.special.kind, 'cong');
  assert.equal(cong.judge.special.name, '疑似从儿格');

  const runXia = judgeFor(1981, 12, 21, 0);
  assert.equal(ganZhiOf(runXia.chart), '辛酉 庚子 癸酉 壬子');
  assert.equal(runXia.judge.special.name, '疑似润下格（专旺）');

  const hua = judgeFor(1978, 8, 11, 6);
  assert.equal(ganZhiOf(hua.chart), '戊午 庚申 乙巳 壬午');
  assert.equal(hua.judge.special.name, '疑似乙庚化金格');

  assert.equal(judgeFor(2000, 4, 10, 10).judge.special, null);
});

test('五行俱全时报最弱的一行；缺的是喜用时提示留意', () => {
  const full = judgeFor(1988, 1, 5, 8);
  assert.equal(ganZhiOf(full.chart), '丁卯 壬子 己未 壬申');
  assert.match(full.judge.wuxingGap.text, /五行俱全，金最弱/);
  assert.equal(judgeFor(1975, 2, 11, 6).judge.wuxingGap.text, '五行缺金（藏干里也没有）');

  const { chart, strength } = judgeFor(1969, 2, 20, 2, 'female');
  assert.equal(ganZhiOf(chart), '己酉 丙寅 丙寅 庚寅');
  const gap = analyzeWuxingGap(chart, strength);
  assert.equal(gap.text, '五行缺水（藏干里也没有）');
  assert.deepEqual(gap.favorableMissing, ['水']);
  assert.match(gap.hint, /正是喜用/);
});

test('determinePattern 可单独调用', () => {
  const chart = buildBaziChart({ calendarType: 'solar', year: 1998, month: 1, day: 2, gender: 'male', hourIndex: 4 }, NOW);
  assert.equal(determinePattern(chart).name, '偏财格');
});
