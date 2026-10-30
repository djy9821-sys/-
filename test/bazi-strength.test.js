import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { STRENGTH_BOUNDS, STRENGTH_SCORE, analyzeStrength, elementToneOf, favorBasisOf } from '../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';
import { findSolarDateByPillars } from '../scripts/lib/baziCases.mjs';

const chartOf = (year, month, day, hourIndex, extra = {}) => buildBaziChart({ calendarType: 'solar', year, month, day, gender: 'male', hourIndex, ...extra });
const ganZhiOf = (chart) => chart.pillars.map(({ ganZhi }) => ganZhi).join(' ');
const elements = (items) => items.map(({ element }) => element);
const round2 = (value) => Math.round(value * 100) / 100;
/** 古籍命例只有四柱：找一个四柱相同的日子排盘。 */
const chartByPillars = (text) => {
  const date = findSolarDateByPillars(text.split(' '));
  const chart = chartOf(date.year, date.month, date.day, date.hourIndex);
  assert.equal(ganZhiOf(chart), text);
  return chart;
};

test('三项打分：己土生子月不得令，月令是财（日主囚）减 0.4；年支丑、时支辰各有比劫本气，丁、戊透出帮身，合计 1.6 分偏弱', () => {
  const chart = chartOf(1998, 1, 2, 4);
  assert.equal(ganZhiOf(chart), '丁丑 壬子 己酉 戊辰');
  const result = analyzeStrength(chart);

  // 五行力量（显示用）不变。
  assert.deepEqual(result.scores, { 木: 0.5, 火: 1, 土: 3, 金: 1.3, 水: 3.8 });
  assert.equal(Math.round(result.ratio * 100), 42);

  assert.equal(result.score.ling, 0);
  assert.deepEqual(result.score.xiuQiu, { state: '囚', role: '财', points: STRENGTH_SCORE.lingCai });
  assert.deepEqual(result.score.roots.map(({ name, zhi, gan, role, position, points }) => `${name}${zhi}${gan}${role}${position}${points}`), ['年柱丑己比劫本气0.5', '时柱辰戊比劫本气0.5']);
  assert.equal(result.score.di, 1);
  assert.deepEqual(result.score.stems.map(({ gan, role }) => `${gan}${role}`), ['丁印', '戊比劫']);
  assert.equal(result.score.shi, 1);
  assert.equal(result.score.hourEstimate, 0);
  assert.equal(result.score.total, 1.6);
  assert.equal(result.band, '偏弱');

  assert.equal(result.deLing, false);
  assert.deepEqual(result.monthMain, { gan: '癸', role: '财' });
  assert.deepEqual(result.deDi.map(({ zhi }) => zhi), ['丑', '辰']);
  assert.deepEqual(result.deShi.map(({ gan }) => gan), ['丁', '戊']);

  assert.equal(result.tiaoHou.season, '冬月寒冷');
  assert.equal(result.tiaoHou.primary, '丙');
  assert.equal(result.tiaoHou.element, '火');
  assert.deepEqual(result.tiaoHou.stems, ['丙', '甲', '戊']);
  assert.equal(result.tiaoHou.source, '《穷通宝鉴》·三冬己土');
  assert.equal(result.tiaoHou.presenceText, '原局：丙无；甲无；戊透时干、藏于时支辰');

  // 财（水）最重：取比劫帮身，用神土；火生土为喜，调候也宜火。
  assert.equal(result.basis, '身弱财重，取比劫帮身，印次之');
  assert.deepEqual(elements(result.favorable), ['土', '火']);
  assert.equal(result.favorable[1].tiaoHou, true);
  assert.equal(result.tiaoHouNote, '调候宜火，火生用神，同列喜用');
  // 用、喜、忌、仇、闲：木克土为忌神，水为土所克（仇神，生木）为忌；金为土所生（闲神），不列喜忌。
  assert.deepEqual(elements(result.unfavorable), ['木', '水']);
  assert.equal(elementToneOf('金', result).tone, 'neutral');
  assert.equal(result.roles['水'], '财');
});

test('分界：2 分及以下偏弱，2.5 分及以上偏强，中和按 2.15 分偏向一边取用，3.3 分以上算太旺；时柱丁卯少了辰中戊土的根，1.1 分偏弱', () => {
  assert.deepEqual(STRENGTH_BOUNDS, { extremeWeak: 0.5, weak: 2, strong: 2.5, extremeStrong: 4, lean: 2.15, tooStrong: 3.3 });
  assert.equal(STRENGTH_SCORE.branchWeight.day, 1.5);
  const result = analyzeStrength(chartOf(1998, 1, 2, 3));
  assert.equal(result.score.total, 1.1);
  assert.equal(result.band, '偏弱');
});

test('身弱官杀重：取印化杀（印透干无根而杀重有源，仍算有力）；印无力而食伤有力，取食伤制杀，克食伤的印为忌', () => {
  const winterBing = chartOf(1996, 12, 15, 6);
  assert.equal(ganZhiOf(winterBing), '丙子 庚子 丙戌 甲午');
  const bing = analyzeStrength(winterBing);
  // 子月官杀当令，日主死，减 0.5。
  assert.deepEqual(bing.score.xiuQiu, { state: '死', role: '官杀', points: STRENGTH_SCORE.lingGuan });
  assert.equal(bing.score.total, 1.45);
  assert.equal(bing.band, '偏弱');
  assert.equal(bing.basis, '身弱官杀重，取印化杀生身，比劫次之');
  // 甲木透时干，地支无木，但两子水旺（3 分），杀生印、印生身，有源可用。
  assert.equal(bing.favorable[0].element, '木');
  assert.equal(bing.favorable[0].usable, true);
  // 调候宜壬水：水生用神木，同列喜用（不再与扶抑「两说并存」）。
  assert.deepEqual(elements(bing.favorable), ['木', '火', '水']);
  assert.equal(bing.favorable[2].tiaoHou, true);
  assert.equal(bing.tiaoHouNote, '调候宜水，水生用神，同列喜用');
  assert.deepEqual(elements(bing.unfavorable), ['金', '土']);

  // 壬戌 壬寅 癸未 戊午：土重（4.1）为病，金印无力，寅木食伤有力而不重（2.3），取食伤制杀。
  const guiChart = chartOf(1982, 3, 1, 6);
  assert.equal(ganZhiOf(guiChart), '壬戌 壬寅 癸未 戊午');
  const gui = analyzeStrength(guiChart);
  assert.equal(gui.band, '偏弱');
  assert.equal(gui.basis, '身弱官杀重，印星无力，取食伤制杀');
  assert.equal(gui.favorable[0].element, '木');
  assert.equal(gui.favorable[0].usable, true);
  // 用食伤制杀时，印（金）克食伤为忌神；调候宜金也让位于用神。
  assert.deepEqual(elements(gui.unfavorable), ['金', '土']);
  assert.equal(gui.tiaoHouNote, '调候宜金，但金克用神，以用神为重，不作喜用');
  // 乙丑 戊寅 癸未 壬子：土重而寅木食伤也重（3.3 分又透乙），克泄交加，先取比劫壬水帮身（见「调候让位于扶抑」一条的任注）。
  const jiaoJia = analyzeStrength(chartOf(1985, 2, 13, 0));
  assert.match(jiaoJia.basis, /克泄交加，取比劫帮身，食伤制杀次之/);
  assert.deepEqual(elements(jiaoJia.favorable).slice(0, 2), ['水', '木']);

  // 找病时透干的字另加半分：地支土气（3.6）略多于金（3.5），但庚金并透，才是病。
  // 任注「庚金并透，通根砍伐……更妙丙火独透，制杀扶身」，用火。
  const jia = analyzeStrength(chartByPillars('庚申 庚辰 甲戌 丙寅'));
  assert.deepEqual([jia.scores.土, jia.scores.金], [3.6, 3.5]);
  assert.equal(jia.basis, '身弱官杀重，印星无力，取食伤制杀');
  assert.equal(jia.favorable[0].element, '火');
});

test('辰戌丑未月余气是比劫的记一点得令：丙丁生未、戌月，任注「火气有余」', () => {
  // 丙申 戊戌 丁卯 乙巳：戌中藏丁火（火库）。任注「劫印重叠，旺可知矣」，原先 2.25 分中和，现 2.55 分偏强。
  const ding = analyzeStrength(chartByPillars('丙申 戊戌 丁卯 乙巳'));
  assert.deepEqual(ding.score.lingYuqi, { zhi: '戌', gan: '丁' });
  assert.equal(ding.score.ling, STRENGTH_SCORE.lingYuqi);
  assert.equal(ding.band, '偏强');
  // 本气就帮身的月令不另加：甲木生寅月，本气甲木是比劫，仍记 1 分。
  const yin = analyzeStrength(chartByPillars('丁未 壬寅 甲子 丙寅'));
  assert.equal(yin.score.lingYuqi, null);
  assert.equal(yin.score.ling, STRENGTH_SCORE.lingSame);
});

test('身弱食伤重：取印制伤生身', () => {
  const chart = chartOf(1975, 3, 11, 0);
  assert.equal(ganZhiOf(chart), '乙卯 己卯 丙辰 戊子');
  const result = analyzeStrength(chart);
  assert.equal(result.band, '偏弱');
  assert.equal(result.basis, '身弱食伤重，取印制伤生身，比劫次之');
  assert.equal(result.favorable[0].element, '木');
});

test('身旺印多而财星无力：取财破印、食伤次之，官杀生印为忌', () => {
  // 丁丑 丙午 己酉 辛未（《滴天髓阐微》命造，书用金）：己土生午月，丙丁火印透出；财星水不透、不作本气。
  const result = analyzeStrength(chartByPillars('丁丑 丙午 己酉 辛未'));
  assert.equal(result.band, '偏强');
  assert.equal(result.basis, '身旺印多，取财破印，食伤次之；官杀生印，为忌');
  // 财无力，有力的食伤金排前，为用神；水（财，调候）为金所生，扶抑本就取它，仍列喜用。
  assert.deepEqual(elements(result.favorable).slice(0, 2), ['金', '水']);
  assert.ok(elements(result.unfavorable).includes('木'), '官杀木为忌');
  assert.ok(elements(result.unfavorable).includes('火'), '火克用神金');
});

test('身旺：印多取财破印；比劫多取官杀，官杀无力取食伤泄秀', () => {
  const yinDuo = analyzeStrength(chartOf(1990, 8, 15, 0));
  assert.equal(yinDuo.band, '偏强');
  assert.equal(yinDuo.basis, '身旺印多，取财破印，食伤、官杀次之');
  assert.equal(yinDuo.favorable[0].element, '火');
  // 用神火：水克火为忌神，金为火所克（仇神）为忌。
  assert.deepEqual(elements(yinDuo.unfavorable), ['水', '金']);

  // 甲寅 丁丑 戊寅 戊午：扶抑取官杀（木）；丑月寒，火透出又有寅午之根，调候为急，火排在官杀前面。
  const bijie = analyzeStrength(chartOf(1975, 2, 1, 6));
  assert.equal(bijie.band, '偏强');
  assert.equal(bijie.basis, '身旺比劫多，取官杀制劫，食伤、财次之');
  assert.deepEqual(elements(bijie.favorable), ['火', '木']);
  assert.equal(bijie.tiaoHouNote, '冬月寒冷，调候为急：火有力有根，扶抑虽嫌火，仍取火为先');
  // 用神火、喜神木；水克火、金为火所克，为忌。
  assert.deepEqual(elements(bijie.unfavorable), ['水', '金']);

  const wuli = chartOf(1985, 1, 4, 0);
  assert.equal(ganZhiOf(wuli), '甲子 丙子 癸卯 壬子');
  const noOfficer = analyzeStrength(wuli);
  assert.equal(noOfficer.score.total, 2.5);
  assert.equal(noOfficer.band, '偏强');
  assert.equal(noOfficer.basis, '身旺比劫多，官杀无力，取食伤泄秀');
  // 用神木（食伤），喜神水；火为木所生，扶抑本就取它，仍列喜用。土（官杀）既不透干也不作本气，又是木所克，列为忌。
  assert.deepEqual(elements(noOfficer.favorable), ['木', '火', '水']);
  assert.deepEqual(elements(noOfficer.unfavorable), ['金', '土']);
});

test('身旺印多、财星有力，官星透出有力又不比印重：足以用官，财、食伤次之（任注「日元生旺，足以用官」）', () => {
  // 庚午 己卯 壬申 己酉（《滴天髓阐微》命造）：任注「喜其官印通根，年支逢财，伤官有制有化，日元生旺，足以用官」。
  const ren = analyzeStrength(chartByPillars('庚午 己卯 壬申 己酉'));
  assert.equal(ren.band, '中和');
  assert.equal(ren.basis, '日主中和略偏旺，身旺印多，官星透出有力，足以用官，财、食伤次之');
  assert.equal(ren.favorable[0].element, '土');
  // 壬戌 戊申 庚寅 丙戌（同书命造，书用火）：丙火透时，寅、戌有根；印土虽多，官星不比印重。
  assert.equal(analyzeStrength(chartByPillars('壬戌 戊申 庚寅 丙戌')).favorable[0].element, '火');
  // 官杀比印还重的不在此列，仍按原取法取财破印：丙寅 乙未 辛酉 丙申，两丙透出，官杀 3.5 分重于印 2.6 分。
  const heavy = chartOf(1986, 7, 16, 8);
  assert.equal(ganZhiOf(heavy), '丙寅 乙未 辛酉 丙申');
  const sha = analyzeStrength(heavy);
  assert.equal(sha.basis, '身旺印多，取财破印，食伤、官杀次之');
  assert.equal(sha.favorable[0].element, '木');
});

test('太旺宜泄：3.3 分以上、比劫多而食伤有力的，官杀逆其旺势，先取食伤（任注「木太旺者而似金，喜火之炼也」）', () => {
  // 戊辰 乙丑 戊戌 辛酉（《滴天髓阐微》命造）：任注「重重厚土，乙木无根，伤官又旺，其势足以敌官星之寡。
  // 故初交丙寅丁卯，官星得地，刑耗多端……及己巳二十年，土生金旺」。
  const tu = analyzeStrength(chartByPillars('戊辰 乙丑 戊戌 辛酉'));
  assert.equal(tu.score.total, 3.73);
  assert.equal(tu.basis, '身旺太过，官杀逆其旺势，取食伤泄秀，财次之');
  assert.equal(tu.favorable[0].element, '金');
  assert.ok(elements(tu.unfavorable).includes('木'), '官杀木逆其旺势，为忌');
});

test('母多灭子：印在比劫两倍以上，财星、食伤都无力，顺母之性，取比劫帮身（任注「土重金埋，母多灭子」）', () => {
  // 丙戌 戊戌 辛丑 戊戌（同书命造）：任注「初运己亥庚子辛丑，金水丑土养金，出身富贵……一交壬运，水木齐来，犯母之性」。
  const jin = analyzeStrength(chartByPillars('丙戌 戊戌 辛丑 戊戌'));
  assert.equal(jin.basis, '印多灭子，财星、食伤无力，顺母之性，取比劫帮身');
  assert.equal(jin.favorable[0].element, '金');
  assert.ok(elements(jin.unfavorable).includes('木'), '财星木破印犯母，为忌');
  // 壬子 壬寅 甲子 壬申（同书命造）：任注「春初嫩木……子申拱水，乃母多灭子也」，癸卯、甲辰运吉。
  const mu = analyzeStrength(chartByPillars('壬子 壬寅 甲子 壬申'));
  assert.equal(mu.favorable[0].element, '木');
  assert.ok(elements(mu.unfavorable).includes('土'), '财星土破印犯母，为忌');
});

test('旺极宜泄：丙午 甲午 丁巳 丙午 5 分极强，先取食伤；用神土，水为土所克，调候之水让位', () => {
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
  assert.deepEqual(elements(result.unfavorable), ['木', '水']);
  assert.equal(result.tiaoHouNote, '调候宜水，但水为用神所克，以用神为重，不作喜用');
});

test('寒暖调候为急：冬月、正月宜火，夏月宜水，这一火、水有力有根时取为第一（任注《寒暖》）', () => {
  // 「寒虽甚，要暖有气也」：丙火以寅为根，任注用火。
  const nuan = analyzeStrength(chartByPillars('甲申 丙子 庚辰 戊寅'));
  assert.equal(nuan.favorable[0].element, '火');
  assert.match(nuan.tiaoHouNote, /^冬月寒冷，调候为急：火有力有根/);
  // 「寒甚而暖无气，反以无暖为美」：丙火虽透，地支无根，不算调候为急，不取为第一。
  const wuQi = analyzeStrength(chartByPillars('己酉 丙子 庚辰 甲申'));
  assert.notEqual(wuQi.favorable[0].element, '火');
  assert.doesNotMatch(wuQi.tiaoHouNote, /调候为急/);
  // 午月炎燥，「幸赖年干壬水临申」：壬水透出、申中有根，水排第一。
  const run = analyzeStrength(chartByPillars('壬申 丙午 庚午 丙戌'));
  assert.equal(run.favorable[0].element, '水');
  assert.match(run.tiaoHouNote, /^夏月炎燥，调候为急：水有力有根/);
  // 调候之神不是火、水（丙火生子月，原书调候用壬）的，不按寒暖提前。
  const bing = analyzeStrength(chartOf(1996, 12, 15, 6));
  assert.equal(bing.favorable[0].element, '木');
});

test('调候让位于扶抑：身弱而官杀重的冬金，火只是暖局；身旺比劫多而官杀当令的，「真神得用」，不急调候', () => {
  // 熊中丞造「丁巳 壬子 辛巳 丁酉：金寒水冷，过于泄气，全赖酉时扶身……天干丁火不过取其敌寒解冻，非用丁火也。用神必在酉金」：
  // 丁火两透、巳巳为根（官杀 4 分），杀重身轻，不作调候为急；印无力而壬水又重（克泄交加），先取比劫金帮身。
  const xiong = analyzeStrength(chartByPillars('丁巳 壬子 辛巳 丁酉'));
  assert.doesNotMatch(xiong.tiaoHouNote, /调候为急/);
  assert.equal(xiong.favorable[0].element, '金');
  assert.match(xiong.basis, /克泄交加，取比劫帮身/);
  // 「庚戌 壬午 丙子 壬辰：月时两透壬水，日主三面受敌……全赖午火旺刃当权为用，更喜戌之燥土」：夏月调候之水正是重杀，不急；比劫火第一、食伤土次之。
  const bingZi = analyzeStrength(chartByPillars('庚戌 壬午 丙子 壬辰'));
  assert.doesNotMatch(bingZi.tiaoHouNote, /调候为急/);
  assert.deepEqual(elements(bingZi.favorable).slice(0, 2), ['火', '土']);
  // 「庚申 壬午 辛酉 癸巳：谓午火真神得用……更嫌壬癸覆之」：辛金比劫多，午火官杀当令，扶抑正取官杀制劫，壬癸不按夏月调候提前。
  const zhen = analyzeStrength(chartByPillars('庚申 壬午 辛酉 癸巳'));
  assert.doesNotMatch(zhen.tiaoHouNote, /调候为急/);
  assert.equal(zhen.favorable[0].element, '火');
  assert.ok(!elements(zhen.favorable).includes('水'), '壬癸不列喜用');
  // 官杀只一位、不重的冬金（甲申 丙子 庚辰 戊寅）照旧调候为急，见上一条。
  assert.match(analyzeStrength(chartByPillars('甲申 丙子 庚辰 戊寅')).tiaoHouNote, /调候为急/);
});

test('中和不再空着喜忌：2.15 分及以上按偏旺取，以下按偏弱取，取用思路写明略偏哪边', () => {
  // 己酉 丙子 庚辰 甲申（任注「寒甚而暖无气」）：2.33 分中和，印（辰土）多于比劫，按偏旺取财破印。
  const wuQi = analyzeStrength(chartByPillars('己酉 丙子 庚辰 甲申'));
  assert.equal(wuQi.score.total, 2.33);
  assert.equal(wuQi.band, '中和');
  assert.equal(wuQi.basis, '日主中和略偏旺，身旺印多，取财破印，食伤、官杀次之');
  assert.equal(wuQi.favorable[0].element, '木');
  assert.deepEqual(elements(wuQi.unfavorable), ['金', '土']);

  // 丑月本气己土是官杀（日主死，减 0.5），所藏癸水是冬水余气，得令 0.3 分：合计 1.95 分偏弱。
  const chart = chartOf(1985, 1, 13, 4);
  assert.equal(ganZhiOf(chart), '甲子 丁丑 壬子 甲辰');
  const result = analyzeStrength(chart);
  assert.equal(result.score.ling, 0.3);
  assert.deepEqual(result.score.lingYuqi, { zhi: '丑', gan: '癸' });
  assert.equal(result.score.total, 1.95);
  assert.equal(result.band, '偏弱');
});

test('根所在的支被紧贴的一支冲克，这一支的根打六折（任注「卯酉紧冲日禄」）', () => {
  // 辛卯 甲午 乙卯 乙酉：日支卯是乙木之禄，被时支酉紧冲。任注「卯酉紧冲日禄……伤官用劫」。
  const result = analyzeStrength(chartByPillars('辛卯 甲午 乙卯 乙酉'));
  const dayRoot = result.score.roots.find((root) => root.key === 'day');
  assert.equal(dayRoot.chong, '酉');
  assert.equal(dayRoot.points, round2(1.5 * STRENGTH_SCORE.chong));
  const yearRoot = result.score.roots.find((root) => root.key === 'year');
  assert.equal(yearRoot.chong, null, '年支卯与月支午不冲');
});

test('会局：四支会成帮身的三合、三会局另加半分，印局减半（任注「亥卯未全，木势旺盛」）', () => {
  // 辛未 辛卯 乙未 丁亥：亥卯未会成木局，木势旺盛，书作旺、「最喜时透丁火制煞为用」。逐支相加只 2.1 分中和，加会局半分到 2.6 偏强，取食伤火。
  const bi = analyzeStrength(chartByPillars('辛未 辛卯 乙未 丁亥'));
  assert.deepEqual(bi.score.ju, { zhis: '亥卯未', kind: '三合', element: '木', role: '比劫', points: STRENGTH_SCORE.ju });
  assert.equal(bi.score.total, 2.6);
  assert.equal(bi.band, '偏强');
  assert.equal(bi.favorable[0].element, '火');
  // 己亥 丙子 乙丑 壬午：亥子丑会成水局，是印局，只加四分之一。
  const yin = analyzeStrength(chartByPillars('己亥 丙子 乙丑 壬午'));
  assert.equal(yin.score.ju.kind, '三会');
  assert.equal(yin.score.ju.role, '印');
  assert.equal(yin.score.ju.points, STRENGTH_SCORE.ju * STRENGTH_SCORE.yinRoot);
  // 会成的是异党的局不算（寅午戌火局于庚金是官杀）。
  assert.equal(analyzeStrength(chartByPillars('丙戌 甲午 庚寅 丙子')).score.ju, null);
});

test('燥土不载金：未、戌坐下生金不算有力，日主是土而通根在这一支的除外（任注「未乃南方燥土……非生金之土」）', () => {
  // 癸卯 乙卯 甲寅 辛未：「辛金之君无能为矣，当存君之子，以癸水为用」——辛坐未不算有力，扶抑不以金为先。
  const jia = analyzeStrength(chartByPillars('癸卯 乙卯 甲寅 辛未'));
  assert.notEqual(jia.favorable[0].element, '金');
  assert.equal(jia.favorable.at(-1).element, '金', '无力的字排在最后');
  // 癸卯 乙卯 己卯 辛未：「未土通根有余，足以用辛金制杀」——日主己土通根于未，辛金仍算有载，用金。
  const ji = analyzeStrength(chartByPillars('癸卯 乙卯 己卯 辛未'));
  assert.equal(ji.favorable[0].element, '金');
});

test('中和而克泄交加：官杀两透有力、食伤又透出的按偏弱取（任注「天干两杀通根辰支……正克泄交加」）；只两官无食伤的仍身旺用官', () => {
  // 乙卯 戊子 壬辰 戊申：申子辰会局加半分到 2.45 中和，两戊通根辰、乙木透出，取印比帮身，不以官杀为用。
  const sha = analyzeStrength(chartByPillars('乙卯 戊子 壬辰 戊申'));
  assert.equal(sha.band, '中和');
  assert.ok(sha.score.total >= STRENGTH_BOUNDS.lean, '分数本在 2.15 以上');
  assert.match(sha.basis, /^日主中和略偏弱/);
  assert.deepEqual(elements(sha.favorable.filter(({ tiaoHou }) => !tiaoHou)), ['金', '水'], '扶抑只取印比，官杀土只作调候附在末尾');
  assert.match(sha.basis, /身弱官杀重，取印化杀生身/);
  // 丁未 庚戌 庚辰 丙子：丙丁两透而无食伤透出，「身旺用官」，仍按偏旺取。
  assert.match(analyzeStrength(chartByPillars('丁未 庚戌 庚辰 丙子')).basis, /^日主中和略偏旺/);
});

test('时辰不详：时柱按平均 0.4 分估', () => {
  const result = analyzeStrength(chartOf(1998, 1, 2, null, { timeMode: 'unknown' }));
  assert.equal(result.score.hourEstimate, STRENGTH_SCORE.unknownHour);
  // 年支丑己 0.5 + 丁 0.5 + 估 0.4，月令是财减 0.4
  assert.equal(result.score.total, 1);
  assert.equal(result.band, '偏弱');
});

test('运限喜忌的依据：认出疑似从、化、专旺的按此格论（《滴天髓·从象》），否则扶抑', () => {
  // 乙卯 戊寅 癸卯 戊午：癸水极弱、食伤独旺，疑似从儿格。扶抑喜金水；按从儿论喜火（财）木（食伤），忌金（印）土（官杀）。
  const chart = chartOf(1975, 2, 26, 6);
  const strength = analyzeStrength(chart);
  const special = judgeBaziPattern(chart, strength).special;
  assert.equal(special.name, '疑似从儿格');
  const basis = favorBasisOf(strength, special);
  assert.equal(basis.source, 'special');
  assert.equal(basis.specialName, '疑似从儿格');
  assert.deepEqual(elements(basis.favorable), ['火', '木']);
  assert.deepEqual(basis.favorable.map(({ role }) => role), ['财', '食伤']);
  assert.deepEqual(elements(basis.unfavorable), ['金', '土']);
  assert.equal(elementToneOf('火', basis).tone, 'good');
  assert.equal(elementToneOf('火', strength).tone, 'bad', '扶抑看火是忌');
  assert.equal(basis.band, strength.band, '其余字段照旧');

  const plain = favorBasisOf(strength, null);
  assert.equal(plain.source, 'fuyi');
  assert.deepEqual(plain.favorable, strength.favorable);
  assert.equal(favorBasisOf(null, special), null);
});
