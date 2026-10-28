import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { STRENGTH_BOUNDS, STRENGTH_SCORE, analyzeStrength } from '../src/utils/baziStrength.js';
import { findSolarDateByPillars } from '../scripts/lib/baziCases.mjs';

const chartOf = (year, month, day, hourIndex, extra = {}) => buildBaziChart({ calendarType: 'solar', year, month, day, gender: 'male', hourIndex, ...extra });
const ganZhiOf = (chart) => chart.pillars.map(({ ganZhi }) => ganZhi).join(' ');
const elements = (items) => items.map(({ element }) => element);
/** 古籍命例只有四柱：找一个四柱相同的日子排盘。 */
const chartByPillars = (text) => {
  const date = findSolarDateByPillars(text.split(' '));
  const chart = chartOf(date.year, date.month, date.day, date.hourIndex);
  assert.equal(ganZhiOf(chart), text);
  return chart;
};

test('三项打分：己土生子月不得令；年支丑、时支辰各有比劫本气，丁、戊透出帮身，合计 2 分偏弱', () => {
  const chart = chartOf(1998, 1, 2, 4);
  assert.equal(ganZhiOf(chart), '丁丑 壬子 己酉 戊辰');
  const result = analyzeStrength(chart);

  // 五行力量（显示用）不变。
  assert.deepEqual(result.scores, { 木: 0.5, 火: 1, 土: 3, 金: 1.3, 水: 3.8 });
  assert.equal(Math.round(result.ratio * 100), 42);

  assert.equal(result.score.ling, 0);
  assert.deepEqual(result.score.roots.map(({ name, zhi, gan, role, position, points }) => `${name}${zhi}${gan}${role}${position}${points}`), ['年柱丑己比劫本气0.5', '时柱辰戊比劫本气0.5']);
  assert.equal(result.score.di, 1);
  assert.deepEqual(result.score.stems.map(({ gan, role }) => `${gan}${role}`), ['丁印', '戊比劫']);
  assert.equal(result.score.shi, 1);
  assert.equal(result.score.hourEstimate, 0);
  assert.equal(result.score.total, 2);
  assert.equal(result.band, '偏弱');

  assert.equal(result.deLing, false);
  assert.deepEqual(result.monthMain, { gan: '癸', role: '财' });
  assert.deepEqual(result.deDi.map(({ zhi }) => zhi), ['丑', '辰']);
  assert.deepEqual(result.deShi.map(({ gan }) => gan), ['丁', '戊']);

  assert.equal(result.tiaoHou.season, '冬月寒冷');
  assert.equal(result.tiaoHou.primary, '丙');
  assert.equal(result.tiaoHou.element, '火');
  assert.deepEqual(result.tiaoHou.stems, ['丙', '甲', '戊']);
  assert.equal(result.tiaoHou.source, '《穷通宝鉴》·调候用神表');

  // 财（水）最重：取比劫帮身，印次之；调候用火，正好在扶抑的喜用里。
  assert.equal(result.basis, '身弱财重，取比劫帮身，印次之');
  assert.deepEqual(elements(result.favorable), ['土', '火']);
  assert.equal(result.favorable[1].tiaoHou, true);
  assert.equal(result.tiaoHouNote, '调候宜火，与扶抑取用一致');
  assert.deepEqual(elements(result.unfavorable), ['水', '金', '木']);
  assert.equal(result.roles['水'], '财');
});

test('分界：2 分及以下偏弱，2.5 分及以上偏强；时柱丁卯少了辰中戊土的根，1.5 分偏弱', () => {
  assert.deepEqual(STRENGTH_BOUNDS, { extremeWeak: 0.5, weak: 2, strong: 2.5, extremeStrong: 4 });
  assert.equal(STRENGTH_SCORE.branchWeight.day, 1.5);
  const result = analyzeStrength(chartOf(1998, 1, 2, 3));
  assert.equal(result.score.total, 1.5);
  assert.equal(result.band, '偏弱');
});

test('身弱官杀重：取印化杀；印无力而食伤透出，取食伤制杀；调候与扶抑相反时两说并存', () => {
  const winterBing = chartOf(1996, 12, 15, 6);
  assert.equal(ganZhiOf(winterBing), '丙子 庚子 丙戌 甲午');
  const bing = analyzeStrength(winterBing);
  assert.equal(bing.score.total, 1.95);
  assert.equal(bing.band, '偏弱');
  assert.equal(bing.basis, '身弱官杀重，取印化杀生身，比劫次之');
  assert.deepEqual(elements(bing.favorable), ['木', '火', '水']);
  assert.equal(bing.favorable[2].tiaoHou, true);
  assert.match(bing.tiaoHouNote, /两说并存/);
  assert.ok(elements(bing.unfavorable).every((element) => element !== '水'));

  const gui = analyzeStrength(chartOf(1985, 2, 13, 0));
  assert.equal(gui.band, '偏弱');
  assert.equal(gui.basis, '身弱官杀重，印星无力，取食伤制杀');
  assert.equal(gui.favorable[0].element, '木');
  assert.equal(gui.favorable[0].usable, true);
});

test('身弱食伤重：取印制伤生身', () => {
  const chart = chartOf(1975, 3, 11, 0);
  assert.equal(ganZhiOf(chart), '乙卯 己卯 丙辰 戊子');
  const result = analyzeStrength(chart);
  assert.equal(result.band, '偏弱');
  assert.equal(result.basis, '身弱食伤重，取印制伤生身，比劫次之');
  assert.equal(result.favorable[0].element, '木');
});

test('身旺：印多取财破印；比劫多取官杀，官杀无力取食伤泄秀', () => {
  const yinDuo = analyzeStrength(chartOf(1990, 8, 15, 0));
  assert.equal(yinDuo.band, '偏强');
  assert.equal(yinDuo.basis, '身旺印多，取财破印，食伤、官杀次之');
  assert.equal(yinDuo.favorable[0].element, '火');
  assert.deepEqual(elements(yinDuo.unfavorable), ['金', '水']);

  // 甲寅 丁丑 戊寅 戊午：扶抑取官杀（木）；丑月寒，火透出又有寅午之根，调候为急，火排在官杀前面。
  const bijie = analyzeStrength(chartOf(1975, 2, 1, 6));
  assert.equal(bijie.band, '偏强');
  assert.equal(bijie.basis, '身旺比劫多，取官杀制劫，食伤、财次之');
  assert.deepEqual(elements(bijie.favorable).slice(0, 2), ['火', '木']);
  assert.equal(bijie.tiaoHouNote, '冬月寒冷，调候为急：火有力有根，扶抑虽嫌火，仍取火为先');

  const wuli = chartOf(1985, 1, 4, 0);
  assert.equal(ganZhiOf(wuli), '甲子 丙子 癸卯 壬子');
  const noOfficer = analyzeStrength(wuli);
  assert.equal(noOfficer.score.total, 2.5);
  assert.equal(noOfficer.band, '偏强');
  assert.equal(noOfficer.basis, '身旺比劫多，官杀无力，取食伤泄秀');
  // 土（官杀）既不透干也不作本气，排到最后。
  assert.deepEqual(elements(noOfficer.favorable), ['木', '火', '土']);
  assert.equal(noOfficer.favorable[2].usable, false);
});

test('旺极宜泄：丙午 甲午 丁巳 丙午 5 分极强，先取食伤，夏月调候的水仍在喜用里', () => {
  const chart = chartOf(2026, 6, 12, 6);
  assert.equal(ganZhiOf(chart), '丙午 甲午 丁巳 丙午');
  const result = analyzeStrength(chart);
  assert.equal(result.score.total, 5);
  assert.equal(result.band, '极强');
  assert.match(result.hint, /专旺/);
  assert.equal(result.deLing, true);
  assert.equal(result.basis, '旺极宜泄，先取食伤泄秀');
  assert.equal(result.favorable[0].element, '土');
  assert.equal(result.tiaoHou.element, '水');
  assert.deepEqual(result.tiaoHou.stems, ['壬', '庚', '癸']);
  assert.ok(result.favorable.some(({ element, tiaoHou }) => element === '水' && tiaoHou));
  assert.ok(result.unfavorable.every(({ element }) => element !== '水'));
});

test('寒暖调候为急：冬月、正月宜火，夏月宜水，这一火、水有力有根时取为第一（任注《寒暖》）', () => {
  // 「寒虽甚，要暖有气也」：丙火以寅为根，任注用火。
  const nuan = analyzeStrength(chartByPillars('甲申 丙子 庚辰 戊寅'));
  assert.equal(nuan.favorable[0].element, '火');
  assert.match(nuan.tiaoHouNote, /^冬月寒冷，调候为急：火有力有根/);
  // 「寒甚而暖无气，反以无暖为美」：丙火虽透，地支无根，不算调候为急（此造中和，火只按常法附在喜用末尾）。
  const wuQi = analyzeStrength(chartByPillars('己酉 丙子 庚辰 甲申'));
  assert.equal(wuQi.tiaoHouNote, '调候宜火，附在喜用末尾');
  // 午月炎燥，「幸赖年干壬水临申」：壬水透出、申中有根，水排第一。
  const run = analyzeStrength(chartByPillars('壬申 丙午 庚午 丙戌'));
  assert.equal(run.favorable[0].element, '水');
  assert.match(run.tiaoHouNote, /^夏月炎燥，调候为急：水有力有根/);
  // 调候之神不是火、水（丙火生子月，原书调候用壬）的，不按寒暖提前。
  const bing = analyzeStrength(chartOf(1996, 12, 15, 6));
  assert.equal(bing.favorable[0].element, '木');
});

test('中和不硬分喜忌，只附调候', () => {
  const chart = chartOf(1985, 1, 13, 4);
  assert.equal(ganZhiOf(chart), '甲子 丁丑 壬子 甲辰');
  const result = analyzeStrength(chart);
  assert.equal(result.score.total, 2.15);
  assert.equal(result.band, '中和');
  assert.match(result.basis, /中和/);
  assert.deepEqual(elements(result.favorable), ['火']);
  assert.equal(result.favorable[0].tiaoHou, true);
  assert.deepEqual(result.unfavorable, []);
});

test('时辰不详：时柱按平均 0.4 分估', () => {
  const result = analyzeStrength(chartOf(1998, 1, 2, null, { timeMode: 'unknown' }));
  assert.equal(result.score.hourEstimate, STRENGTH_SCORE.unknownHour);
  // 年支丑己 0.5 + 丁 0.5 + 估 0.4
  assert.equal(result.score.total, 1.4);
  assert.equal(result.band, '偏弱');
});
