import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { analyzeWuxingGap, determinePattern, judgeBaziPattern } from '../src/utils/baziPattern.js';
import { findSolarDateByPillars } from '../scripts/lib/baziCases.mjs';

const NOW = new Date('2026-10-26T10:00:00');
const judgeFor = (year, month, day, hourIndex, gender = 'male') => {
  const chart = buildBaziChart({ calendarType: 'solar', year, month, day, gender, hourIndex }, NOW);
  const strength = analyzeStrength(chart);
  return { chart, strength, judge: judgeBaziPattern(chart, strength) };
};
const ganZhiOf = (chart) => chart.pillars.map(({ ganZhi }) => ganZhi).join(' ');
/** 古籍命例只有四柱：找一个四柱相同的日子排盘。 */
const judgeByPillars = (text) => {
  const date = findSolarDateByPillars(text.split(' '));
  const result = judgeFor(date.year, date.month, date.day, date.hourIndex);
  assert.equal(ganZhiOf(result.chart), text);
  return result;
};
const godsOf = (items) => items.map(({ element, label }) => `${element}${label}`);
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

  const zaQi = judgeFor(1960, 4, 20, 7);
  assert.equal(ganZhiOf(zaQi.chart), '庚子 庚辰 戊寅 己未');
  assert.equal(zaQi.judge.pattern.name, '杂气正官格');
  assert.match(zaQi.judge.pattern.basis, /本气戊为比肩不取/);
  assert.match(zaQi.judge.pattern.basis, /中气乙（正官）/);
});

test('《子平真诠》取格细则：库中同类透出、生月化神被克仍本格、旺支只论本气、申中不论戊', () => {
  // 辰为水库，库中癸以同类透出论：戊生辰月透壬，取财（脱脱丞相命「辰中暗煞，壬以透之」同理）。
  const ku = judgeFor(2000, 4, 10, 10);
  assert.equal(ganZhiOf(ku.chart), '庚辰 庚辰 戊戌 壬戌');
  assert.equal(ku.judge.pattern.name, '杂气偏财格');
  assert.match(ku.judge.pattern.basis, /为水库，库中癸以同类透出论：时柱壬（偏财）透出/);

  // 生月中余气透出为变化，化神又被他干所克则不失本格：癸生寅月透戊（官），年干乙克之，仍以本气甲（伤官）为格。
  const kept = judgeFor(1975, 2, 26, 6);
  assert.equal(ganZhiOf(kept.chart), '乙卯 戊寅 癸卯 戊午');
  assert.equal(kept.judge.pattern.name, '伤官格');
  assert.match(kept.judge.pattern.basis, /余气戊（正官）透于月柱戊、时柱戊本可变化，但年柱乙克之，化神退位，仍以本气甲（伤官）为格/);

  // 「除子午卯酉外，余皆有藏」：午月只论本气丁，余气己透出不取。
  const wang = judgeFor(1979, 6, 6, 10);
  assert.equal(ganZhiOf(wang.chart), '己未 庚午 甲辰 甲戌');
  assert.equal(wang.judge.pattern.name, '伤官格');
  assert.match(wang.judge.pattern.basis, /以本气丁（伤官）为格（午为旺支只论本气，己透出不作月令之神）/);

  // 土随火，申中不论戊：甲生申月透戊，仍以本气庚（七杀）为格。
  const shen = judgeFor(1971, 9, 6, 4);
  assert.equal(ganZhiOf(shen.chart), '辛亥 丙申 甲午 戊辰');
  assert.equal(shen.judge.pattern.name, '七杀格');
  assert.match(shen.judge.pattern.basis, /以本气庚（七杀）为格（申中不论戊，戊透出不作月令之神）/);
});

test('常见组合：官杀混杂、食神制杀、羊刃驾杀、伤官配印、官印相生、财官相生、枭神夺食', () => {
  const cases = [
    [[1975, 2, 11, 0], '乙卯 戊寅 戊子 壬子', ['官杀混杂', '杀重身轻']],
    [[1975, 10, 11, 6], '乙卯 丙戌 庚寅 壬午', ['食神制杀']],
    [[1975, 2, 1, 6], '甲寅 丁丑 戊寅 戊午', ['羊刃驾杀']],
    [[1975, 3, 11, 0], '乙卯 己卯 丙辰 戊子', ['伤官配印']],
    [[1975, 11, 1, 0], '乙卯 丙戌 辛亥 戊子', ['官印相生']],
    [[1975, 6, 21, 6], '乙卯 壬午 戊戌 戊午', ['财官相生']],
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

test('特殊格局附「按此格论」的喜忌，并写进要点', () => {
  // 从儿以财为用（「儿又生儿」），食伤次之。
  const cong = judgeFor(1975, 2, 26, 6);
  assert.deepEqual(godsOf(cong.judge.special.favorable), ['火财', '木食伤']);
  assert.deepEqual(godsOf(cong.judge.special.unfavorable), ['金印', '土官杀']);
  assert.ok(cong.judge.points.some((line) => line.startsWith('若按从儿格论：喜火（财）、木（食伤）；忌金（印）、土（官杀）（')));

  // 辛酉 庚子 癸酉 壬子：印占一半，印不轻，食伤与印相战，列在忌神末尾。
  const runXia = judgeFor(1981, 12, 21, 0);
  assert.deepEqual(godsOf(runXia.judge.special.favorable), ['水比劫', '金印']);
  assert.deepEqual(godsOf(runXia.judge.special.unfavorable), ['土官杀', '火财', '木食伤']);
  assert.match(runXia.judge.special.godsBasis, /印不轻/);

  // 化气以化神为主；乙木本气帮起日主就化不成。
  const hua = judgeFor(1978, 8, 11, 6);
  assert.equal(hua.judge.special.godsText, '喜金（化神）、土（生化神）；忌火（克化神）、木（日主本气）');
});

test('从格、专旺按《滴天髓阐微·衰旺》任注的「旺极」「衰极」命造判断', () => {
  // 旺极：顺其旺势，喜印比，忌财官；食伤看印的轻重。
  const congQiang = judgeByPillars('丙寅 甲午 丙午 癸巳'); // 「只得从其强势」，「运逢木火土，财喜频增」
  assert.equal(congQiang.judge.special.name, '疑似从强格');
  assert.deepEqual(congQiang.judge.special.favorable.map(({ element }) => element), ['火', '木', '土']);
  const yanShang = judgeByPillars('戊寅 丁巳 丙寅 甲午'); // 「火旺极者，似土也」，书取火
  assert.equal(yanShang.judge.special.name, '疑似炎上格（专旺）');
  assert.equal(yanShang.judge.special.favorable[0].element, '火');
  const tuWang = judgeByPillars('戊戌 丙辰 己巳 己巳'); // 「土旺极者，似金也」，「一交庚申……家业渐消」
  assert.equal(tuWang.judge.special.kind, 'congqiang');
  assert.ok(tuWang.judge.special.unfavorable.some(({ element }) => element === '金'));

  // 衰极：天干只有无根比劫，或一个无根之印而财星坏印，作从论。
  const congSha = judgeByPillars('庚戌 甲申 甲戌 乙丑'); // 「天干三透甲乙，而地支不载……格成从杀」，用土
  assert.equal(congSha.judge.special.name, '疑似从杀格');
  assert.equal(congSha.judge.special.favorable[0].element, '土', '从杀以财生杀为用');
  assert.equal(congSha.judge.special.basis, '日主甲木地支无比劫之根，只有丑中癸一点印气，月干甲、时干乙虚浮无根，官杀占 36% 独旺。');
  const jinShuai = judgeByPillars('己亥 丁卯 庚寅 丙子'); // 「金衰极者，似木也」
  assert.equal(jinShuai.judge.special.kind, 'cong');
  assert.match(jinShuai.judge.special.basis, /只有寅中戊一点印气/);

  // 太旺而食伤有本气之根，任注取食伤泄秀；天干比劫三透、或有印有根，任注仍取印比：都不作特殊格局。
  // （壬午 癸卯 壬寅 庚戌 年月两透比肩、时透庚印，任注「用庚金以降之」。）
  ['壬寅 辛亥 壬子 辛丑', '戊辰 戊午 戊申 己未', '丙子 丙申 丙子 丙申', '癸巳 壬戌 壬午 壬寅', '壬午 癸卯 壬寅 庚戌']
    .forEach((text) => assert.equal(judgeByPillars(text).judge.special, null, text));
});

test('从格看地支、化气看化神得势：任注从象、化象、顺局诸造', () => {
  // 「未土又会木局，不得不从杀矣」：亥卯未会成木局，己土的未根作木论。
  const sha = judgeByPillars('癸亥 乙卯 己未 丁卯');
  assert.equal(sha.judge.special.name, '疑似从杀格');
  assert.match(sha.judge.special.basis, /^亥卯未会成木局，四支本气都是食伤财官，日主己土没有得力之根/);
  assert.equal(sha.judge.special.favorable[0].element, '水');
  // 「支全寅卯辰，东方一气，格成水木从儿，以时干丙火为用」。
  const er = judgeByPillars('丁卯 壬寅 癸卯 丙辰');
  assert.equal(er.judge.special.name, '疑似从儿格');
  assert.equal(er.judge.special.favorable[0].element, '火');
  // 「四支皆寅，戊土虽生犹死……而从财也」：天干一个印，财占四成，从财以食伤（壬水）为用。
  const cai = judgeByPillars('壬寅 壬寅 庚寅 戊寅');
  assert.equal(cai.judge.special.name, '疑似从财格');
  assert.equal(cai.judge.special.favorable[0].element, '水');
  // 「喜其支会财局」：申子辰会成水局，辰中戊土之根作水论。
  const er2 = judgeByPillars('庚子 庚辰 戊申 辛酉');
  assert.equal(er2.judge.special.name, '疑似从儿格');
  // 化气：「土旺乘权，克去壬水，又无比劫，合神更真」；「丙火透而通根，化火斯真」（月令不是化神，化神得势）。
  assert.equal(judgeByPillars('戊辰 壬戌 甲辰 己巳').judge.special.name, '疑似甲己化土格');
  const huo = judgeByPillars('丙戌 戊戌 癸巳 壬戌').judge.special;
  assert.equal(huo.name, '疑似癸戊化火格');
  assert.match(huo.basis, /火气占 27%，日主地支没有本气之根/);
  // 不作从、化：三辰都藏癸水余气（任注用食神）；印比各一透干（孙中山造）；日主坐亥禄的合（任注「日主不能从合」）。
  ['戊辰 戊午 壬辰 甲辰', '丙寅 己亥 辛卯 庚寅', '甲寅 辛未 癸亥 戊午']
    .forEach((text) => assert.equal(judgeByPillars(text).judge.special, null, text));
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
