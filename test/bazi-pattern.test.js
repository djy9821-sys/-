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
  // 辰中一点乙木余气不算「见官杀」，比劫又重于印，按专旺（稼穑）论；旺极顺势，喜忌与从强同。
  assert.equal(tuWang.judge.special.kind, 'zhuanwang');
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

  // 从强要「绝无一毫财星官杀之气」。天干官杀有根：「乙木官星透露，盘根在未，余气在辰，本可为用」。
  assert.equal(judgeByPillars('乙未 庚辰 戊辰 丙辰').judge.special, null);
  // 食伤透干有根、财星也透：「三逢旺支，其势汪洋，喜其甲丙并透……用神必是甲木」，按扶抑取食伤。
  const xieXiu = judgeByPillars('甲申 丙子 癸亥 癸亥');
  assert.equal(xieXiu.judge.special, null);
  assert.equal(xieXiu.strength.favorable[0].element, '木');
  // 财星透干有根而无食伤生它的，仍作从强（「支类西方，又逢厚土，金旺极者，似水也」，戊子己丑庚运名利皆遂）。
  assert.ok(['zhuanwang', 'congqiang'].includes(judgeByPillars('庚申 乙酉 庚戌 庚辰').judge.special.kind));

  // 地支会成三合、三会局的按局的五行看四支本气：「此木局全，混一寅字，然四柱无金，其势从强」，亥卯未木局里的未土不算财根。
  const muJu = judgeByPillars('甲寅 乙亥 乙卯 癸未');
  assert.ok(['zhuanwang', 'congqiang'].includes(muJu.judge.special?.kind), '亥卯未木局，从强');
  assert.equal(muJu.judge.special.favorable[0].element, '木');
  assert.ok(muJu.judge.special.unfavorable.some(({ element }) => element === '金'), '「惟忌西方金运克破」');
  // 「地支亥子丑，干透壬癸辛，局成润下」：丑在北方水局里，不作官杀之根。
  assert.ok(['zhuanwang', 'congqiang'].includes(judgeByPillars('壬子 辛亥 癸丑 壬子').judge.special?.kind));
  // 同是木局，月干时干丁火两透，任注「取丁火食神秀气，非前造从强论也」：局全作专旺，但食伤成势，以食伤吐秀为用、比劫生之，
  // 印克食伤为忌（「壬申木火皆伤，破局」）；不作印比为用的从强。
  const xiuQi = judgeByPillars('甲寅 丁卯 乙未 丁亥');
  assert.equal(xiuQi.judge.special.kind, 'zhuanwang');
  assert.match(xiuQi.judge.special.basis, /食伤透干有根，旺势有处吐秀/);
  assert.deepEqual(xiuQi.judge.special.favorable.map(({ element }) => element), ['火', '木']);
  assert.deepEqual(xiuQi.judge.special.unfavorable.map(({ element }) => element), ['水', '金']);
  assert.equal(xiuQi.strength.favorable[0].element, '火');

  // 方局篇：「支全寅卯辰，东方一气，化神者丙丁也」（打分不到四分也作专旺）；「丁卯 甲辰 甲寅 乙亥……格名曲直仁寿」；
  // 「支全火局，木从火势，格成炎上」——寅午戌外的未是火之余气，随局论。
  assert.equal(judgeByPillars('甲寅 丁卯 甲辰 丙寅').judge.special.name, '疑似曲直格（专旺）');
  assert.equal(judgeByPillars('甲寅 丁卯 甲辰 丙寅').judge.special.favorable[0].element, '火', '「化神者丙丁也」，食伤两透以吐秀为用');
  assert.equal(judgeByPillars('丁卯 甲辰 甲寅 乙亥').judge.special.name, '疑似曲直格（专旺）');
  assert.equal(judgeByPillars('丙寅 甲午 丙戌 乙未').judge.special.name, '疑似炎上格（专旺）');
  // 费中堂造「己未 丁丑 戊子 己未：天干戊己逢丁，地支重重丑未。子丑化土，斯真格象，已成稼穑」：相邻子丑六合化土正是日主本气，
  // 子随化神论，干支一气，打分不到四分也作稼穑。
  const jiaSe = judgeByPillars('己未 丁丑 戊子 己未');
  assert.equal(jiaSe.judge.special.name, '疑似稼穑格（专旺）');
  // 「癸卯 丙辰 甲辰 丙寅：此造财旺提纲，丙食生助，当以财星为用……不论成方成局，必先察财官之势」：辰辰财旺，局全也不作专旺。
  const caiWang = judgeByPillars('癸卯 丙辰 甲辰 丙寅');
  assert.equal(caiWang.judge.special, null);
  // 食伤只透一位而印也透出的，仍按印比为用（「戊寅 丁巳 丙寅 甲午」书取火；「癸酉 甲子 癸亥 辛酉」「一点甲木枯浮，难泄水气」，大取金水）。
  const kuFu = judgeByPillars('癸酉 甲子 癸亥 辛酉');
  assert.equal(kuFu.judge.special.name, '疑似润下格（专旺）');
  assert.deepEqual(kuFu.judge.special.favorable.slice(0, 2).map(({ element }) => element), ['水', '金']);
  // 「癸卯 乙卯 甲寅 辛未：未乃南方燥土，木之库根，非生金之土，故辛金之君无能为矣。当存君之子，以癸水为用」：
  // 旺极时日主的墓库支随旺势论，四支皆印比、辛金无根，疑似从强，喜木水。
  const kuGen = judgeByPillars('癸卯 乙卯 甲寅 辛未');
  assert.equal(kuGen.judge.special.name, '疑似从强格');
  assert.deepEqual(kuGen.judge.special.favorable.slice(0, 2).map(({ element }) => element), ['木', '水']);
  // 旺不到极处的，墓库支不随势：癸未 乙卯 甲戌 乙亥 3.65 分偏强，未、戌仍是财，不作专旺。
  assert.equal(judgeByPillars('癸未 乙卯 甲戌 乙亥').judge.special, null);
});

test('两气成象：天干地支只有日主与食伤两行、各占一半，取食伤秀气为用（《滴天髓·形象》任注）；只认木火、火土、土金三种', () => {
  // 「甲午 丁卯 甲午 丁卯：此造木火各半，两气成象，取丁火伤官，秀气为用」「丙午 戊戌 丙午 戊戌……取戌土食神」「戊戌 辛酉 戊戌 辛酉……取辛金伤官为用」。
  const muHuo = judgeByPillars('甲午 丁卯 甲午 丁卯');
  assert.equal(muHuo.judge.special.name, '两气成象（木火相生）');
  assert.equal(muHuo.judge.special.kind, 'liangqi');
  assert.deepEqual(godsOf(muHuo.judge.special.favorable), ['火食伤', '木比劫']);
  assert.deepEqual(godsOf(muHuo.judge.special.unfavorable), ['水印', '金官杀']);
  assert.match(muHuo.judge.special.basis, /^天干与地支本气只有木、火两行（4 比 4），两气成象；日主甲木是生的一方，以火（食伤）秀气为用。$/);
  assert.equal(judgeByPillars('丙午 戊戌 丙午 戊戌').judge.special.name, '两气成象（火土相生）');
  assert.equal(judgeByPillars('戊戌 辛酉 戊戌 辛酉').judge.special.name, '两气成象（土金相生）');
  // 印局不作此论：「丁卯 乙巳 丁卯 乙巳：日主是火……木从火势，格成炎上」仍是专旺。
  assert.equal(judgeByPillars('丁卯 乙巳 丁卯 乙巳').judge.special.name, '疑似炎上格（专旺）');
  // 水木各半的两造任注都不作秀气论（「寅亥化木，伤官太重」「仍作偏枯论」），财局、杀局也不作此论。
  assert.equal(judgeByPillars('癸亥 甲寅 癸亥 甲寅').judge.special, null);
  assert.equal(judgeByPillars('壬寅 壬寅 壬寅 壬寅').judge.special, null);
  assert.equal(judgeByPillars('戊戌 癸亥 戊戌 癸亥').judge.special, null);
  assert.equal(judgeByPillars('癸亥 己未 癸亥 己未').judge.special, null);
});

test('从格看地支、化气看化神得势：任注从象、化象、顺局诸造', () => {
  // 「未土又会木局，不得不从杀矣」：亥卯未会成木局，己土的未根作木论。
  const sha = judgeByPillars('癸亥 乙卯 己未 丁卯');
  assert.equal(sha.judge.special.name, '疑似从杀格');
  assert.match(sha.judge.special.basis, /^亥卯未会成木局，四支都是木（官杀），日主己土没有得力之根/);
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
  // 不作从、化：三辰都藏癸水余气（任注用食神）；印比各一透干（孙中山造）；日主坐亥禄的合（任注「日主不能从合」）；
  // 日主坐酉印的合（任注「日元柔弱，以印为夫，清而得用」）。
  ['戊辰 戊午 壬辰 甲辰', '丙寅 己亥 辛卯 庚寅', '甲寅 辛未 癸亥 戊午', '丙寅 辛卯 癸酉 戊午']
    .forEach((text) => assert.equal(judgeByPillars(text).judge.special, null, text));
});

test('四支一气不拘微根、日主坐库仍能盘根、假化与化气有余宜泄：任注从象、化象、假化、顺局、反局诸造', () => {
  // 「蟠根在未，余气在辰，似乎财多身弱，但四柱皆财，其势必从」，丙火为用。
  const cai = judgeByPillars('戊戌 丙辰 乙未 丙戌').judge.special;
  assert.equal(cai.name, '疑似从财格');
  assert.match(cai.basis, /^四支都是土（财），日主乙木只有辰、未中一点微根/);
  assert.equal(cai.favorable[0].element, '火');
  // 「满局皆土，格成火土从儿，丑中辛财为用」；丁火盖头通根未戌，只是根浅。
  const er = judgeByPillars('己未 丁丑 丙戌 戊戌').judge.special;
  assert.equal(er.name, '疑似从儿格');
  assert.match(er.basis, /月干丁根浅/);
  assert.equal(er.favorable[0].element, '金');
  // 不作从：日主坐下未库、干透两丁（「足以盘根制杀」）；三辰通根身库、甲乙透干通根制土（「儿能生母」）；
  // 申子辰会水，但时干戊土印坐寅有根，年干甲木透出也克不去（「寒金冷水……所重者，寅也」，用火）。
  ['辛酉 丁酉 乙未 丁丑', '丙辰 乙未 壬辰 甲辰', '甲申 丙子 庚辰 戊寅']
    .forEach((text) => assert.equal(judgeByPillars(text).judge.special, null, text));

  // 日主坐下本气之根不作假化：「喜其日元得地……壬水可用」（癸亥日，时干戊土相合，午月火旺）。
  assert.equal(judgeByPillars('壬申 丙午 癸亥 戊午').judge.special, null);
  // 假化：「虽是假化，却有情而不悖……庚午己巳生助化神，出仕琴堂」。
  const jia = judgeByPillars('己卯 甲戌 甲子 己巳').judge.special;
  assert.equal(jia.name, '疑似甲己化土格（假化）');
  assert.equal(jia.kind, 'jiahua');
  assert.match(jia.basis, /月令戌正是土当令，土气占 41%；但日主在卯有本气之根，化而不真/);
  assert.deepEqual(godsOf(jia.favorable), ['土化神', '火生化神']);
  assert.ok(judgeByPillars('己卯 甲戌 甲子 己巳').judge.points.some((line) => line.endsWith('这与旺衰一节按扶抑取的喜忌不同，假化还要看合神是否有情、岁运是否生助化神。')));
  // 化气有余宜泄：「化气有余，余则宜泄，斯化神吐秀」「中运水旺之地，未能显秩」；假化同论（「金水破局」）。
  assert.equal(judgeByPillars('己卯 丁卯 壬午 甲辰').judge.special.godsText, '喜木（化神）、火（泄化神）；忌金（克化神）、水（日主本气）');
  const muJia = judgeByPillars('甲辰 丁卯 壬辰 辛亥').judge.special;
  assert.equal(muJia.name, '疑似壬丁化木格（假化）');
  assert.equal(muJia.godsText, '喜木（化神）、火（泄化神）；忌金（克化神）、水（日主本气）');
  // 化神不足宜生：「秋金当令，化神泄气不足，至午运助化神」。
  assert.equal(judgeByPillars('乙丑 甲申 甲辰 己巳').judge.special.godsText, '喜土（化神）、火（生化神）；忌木（克化神）');
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

test('时辰不详只有三柱：五行缺失照实说「已知的六个字」，全缺时注明时柱未计', () => {
  // 壬申 壬寅 庚辰（时辰不详）：六个字里不见火，寅中藏丙火。
  const chart = buildBaziChart({ calendarType: 'solar', year: 1992, month: 3, day: 5, gender: 'female', timeMode: 'unknown' }, NOW);
  assert.equal(ganZhiOf(chart).trim(), '壬申 壬寅 庚辰');
  const strength = analyzeStrength(chart);
  assert.equal(analyzeWuxingGap(chart, strength).text, '已知的六个字里不见火；寅中藏丙火');
  // 甲子 丙子 癸卯（时辰不详）：土、金在三柱里藏干也没有。
  const noEarth = buildBaziChart({ calendarType: 'solar', year: 1985, month: 1, day: 4, gender: 'male', timeMode: 'unknown' }, NOW);
  assert.equal(ganZhiOf(noEarth).trim(), '甲子 丙子 癸卯');
  assert.equal(analyzeWuxingGap(noEarth, analyzeStrength(noEarth)).text, '五行缺土、金（藏干里也没有；时柱不详，未计在内）');
});

test('五行俱全而最弱的正是日主那一行：说明「除日主本身外」（五行力量不计日干）', () => {
  // 庚辰 乙酉 丙子（时辰不详）：火只有日主丙火自己，力量统计里是 0%。
  const chart = buildBaziChart({ calendarType: 'solar', year: 2000, month: 9, day: 15, gender: 'male', timeMode: 'unknown' }, NOW);
  assert.equal(ganZhiOf(chart).trim(), '庚辰 乙酉 丙子');
  assert.equal(analyzeWuxingGap(chart, analyzeStrength(chart)).text, '五行俱全，除日主本身外火最弱（0%）');
});
