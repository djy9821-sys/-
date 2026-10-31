import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';
import { CHENG_BAI_QUOTES, chengBaiGroupOf } from '../src/utils/baziPatternSuccess.js';
import { findSolarDateByPillars } from '../scripts/lib/baziCases.mjs';

const judge = (year, month, day, hourIndex, gender = 'male') => {
  const chart = buildBaziChart({ calendarType: 'solar', year, month, day, gender, hourIndex });
  const result = judgeBaziPattern(chart, analyzeStrength(chart));
  return { pillars: chart.pillars.map(({ ganZhi }) => ganZhi).join(' '), pattern: result.pattern, chengBai: result.chengBai, points: result.points };
};

const quotes = (chengBai) => [...chengBai.success, ...chengBai.failure, ...chengBai.flaw, ...chengBai.rescue].map((item) => item.quote);

test('原文按格局分组，八类格名都能归类', () => {
  assert.deepEqual(Object.keys(CHENG_BAI_QUOTES.成), ['正官格', '财格', '印格', '食神格', '七杀格', '伤官格', '羊刃格', '建禄月劫']);
  assert.equal(chengBaiGroupOf({ kind: 'regular', tenGod: '偏财' }), '财格');
  assert.equal(chengBaiGroupOf({ kind: 'regular', tenGod: '偏印' }), '印格');
  assert.equal(chengBaiGroupOf({ kind: 'lu' }), '建禄月劫');
  assert.equal(chengBaiGroupOf({ kind: 'jie' }), '建禄月劫');
  assert.equal(chengBaiGroupOf({ kind: 'ren' }), '羊刃格');
  assert.equal(chengBaiGroupOf({ kind: 'regular', tenGod: '比肩' }), null);
  assert.equal(chengBaiGroupOf(null), null);
});

test('正官格：官逢财印无刑冲为成；逢伤、刑冲、杂煞为败；透印、会合、合煞为救', () => {
  const cheng = judge(1960, 6, 2, 1);
  assert.equal(cheng.pillars, '庚子 辛巳 辛酉 己丑');
  assert.equal(cheng.pattern.name, '正官格');
  assert.equal(cheng.chengBai.verdict, '成');
  assert.ok(quotes(cheng.chengBai).includes('官逢财印，又无刑冲破害，官格成也'));
  assert.equal(cheng.chengBai.source, '《子平真诠》·论用神成败救应');

  const clash = judge(1960, 8, 2, 1);
  assert.equal(clash.pillars, '庚子 癸未 壬戌 辛丑');
  assert.equal(clash.chengBai.verdict, '败');
  assert.ok(quotes(clash.chengBai).includes('官逢刑冲'));

  // 年干庚与时干乙隔着月干、日干，不作合论（论伤官「丁与壬隔以戊己，两不相碍」），所以七杀合不去，只是败
  const mixed = judge(1960, 3, 2, 1);
  assert.equal(mixed.pillars, '庚子 戊寅 己丑 乙丑');
  assert.equal(mixed.chengBai.verdict, '败');
  const mixedQuotes = quotes(mixed.chengBai);
  assert.ok(mixedQuotes.includes('官逢伤克'));
  assert.ok(mixedQuotes.includes('杂煞'));
  assert.ok(!mixedQuotes.includes('杂煞而合煞以清之'));

  const rescued = judge(1960, 11, 2, 7);
  assert.equal(rescued.pillars, '庚子 丙戌 甲午 辛未');
  assert.ok(quotes(rescued.chengBai).includes('刑冲而会合以解之'));
  assert.equal(rescued.chengBai.verdict, '败中有成');

  const merged = judge(1964, 8, 26, 7);
  assert.equal(merged.pillars, '甲辰 壬申 丁未 丁未');
  assert.equal(merged.chengBai.verdict, '成中有败');
  assert.ok(quotes(merged.chengBai).includes('透官而又逢合'));
});

test('财格：财生官旺、食生身强为成；财轻比重、财透七杀为败；食化、官制、食神制杀、合杀为救', () => {
  const sheng = judge(1966, 12, 25, 4);
  assert.equal(sheng.pillars, '丙午 庚子 戊午 丙辰');
  assert.equal(sheng.chengBai.verdict, '成');
  assert.ok(quotes(sheng.chengBai).includes('财逢食生而身强带比'));

  // 财透七杀而印亦透：论财「有财用煞印者，党煞为忌，印以化之，格成富局」，败中有成
  const qisha = judge(1960, 1, 2, 1);
  assert.equal(qisha.pillars, '己亥 丙子 己丑 乙丑');
  assert.equal(qisha.chengBai.verdict, '败中有成');
  assert.ok(quotes(qisha.chengBai).includes('财透七煞'));
  assert.ok(quotes(qisha.chengBai).includes('财用煞印，印以化之（论财）'));

  const jie = judge(1960, 4, 2, 1);
  assert.equal(jie.pillars, '庚子 己卯 庚申 丁丑');
  assert.equal(jie.chengBai.verdict, '败中有成');
  assert.ok(quotes(jie.chengBai).includes('财轻比重'));
  assert.ok(quotes(jie.chengBai).includes('生官以制之'));

  const shi = judge(1964, 5, 14, 1);
  assert.equal(shi.pillars, '甲辰 己巳 癸亥 癸丑');
  assert.ok(quotes(shi.chengBai).includes('财逢劫而透食以化之'));

  const flaw = judge(1962, 4, 2, 1);
  assert.equal(flaw.pillars, '壬寅 癸卯 庚午 丁丑');
  assert.equal(flaw.chengBai.verdict, '成中有败');
  assert.ok(quotes(flaw.chengBai).includes('财旺生官，而又逢伤'));
});

test('印格：官印双全、身印两旺泄秀为成；印轻逢财、身强印重透杀为败；劫财、合财为救', () => {
  const guanyin = judge(1960, 2, 2, 1);
  assert.equal(guanyin.pillars, '己亥 丁丑 庚申 丁丑');
  assert.equal(guanyin.chengBai.verdict, '成');
  assert.ok(quotes(guanyin.chengBai).includes('官印双全'));

  const xie = judge(1960, 9, 2, 1);
  assert.equal(xie.pillars, '庚子 甲申 癸巳 癸丑');
  assert.ok(quotes(xie.chengBai).includes('身印两旺而用食伤泄气'));

  const cai = judge(1960, 7, 20, 7);
  assert.equal(cai.pillars, '庚子 癸未 己酉 辛未');
  assert.equal(cai.chengBai.verdict, '败');
  assert.ok(quotes(cai.chengBai).includes('印轻逢财'));

  const heavy = judge(1960, 1, 14, 1);
  assert.equal(heavy.pillars, '己亥 丁丑 辛丑 己丑');
  assert.ok(quotes(heavy.chengBai).includes('身强印重而透煞'));

  const hecai = judge(1984, 8, 26, 7);
  assert.equal(hecai.pillars, '甲子 壬申 壬辰 丁未');
  assert.equal(hecai.chengBai.verdict, '败中有成');
  assert.ok(quotes(hecai.chengBai).includes('合财而存印'));
});

test('食神格：生财、带杀无财、弃食就杀为成；逢枭、生财露杀为败；就杀、生财护食为救', () => {
  const shengcai = judge(1960, 1, 20, 1);
  assert.equal(shengcai.pillars, '己亥 丁丑 丁未 辛丑');
  assert.equal(shengcai.chengBai.verdict, '成');
  assert.ok(quotes(shengcai.chengBai).includes('食神生财'));

  const daisha = judge(1960, 3, 26, 1);
  assert.equal(daisha.pillars, '庚子 己卯 癸丑 癸丑');
  assert.ok(quotes(daisha.chengBai).includes('食带煞而无财'));
  assert.ok(quotes(daisha.chengBai).includes('弃食就煞而透印'));

  const xiao = judge(1960, 6, 26, 7);
  assert.equal(xiao.pillars, '庚子 壬午 乙酉 癸未');
  assert.equal(xiao.chengBai.verdict, '败');
  assert.ok(quotes(xiao.chengBai).includes('食神逢枭'));

  const lusha = judge(1960, 7, 8, 1);
  assert.equal(lusha.pillars, '庚子 癸未 丁酉 辛丑');
  assert.equal(lusha.chengBai.verdict, '败');
  assert.ok(quotes(lusha.chengBai).includes('生财露煞'));

  const jiusha = judge(1967, 10, 2, 1);
  assert.equal(jiusha.pillars, '丁未 己酉 己亥 乙丑');
  assert.equal(jiusha.chengBai.verdict, '败中有成');
  assert.ok(quotes(jiusha.chengBai).includes('食逢枭而就煞以成格'));
});

test('七杀格：食伤制、印化、阳刃为成；逢财无制为败；制而逢印为成中有败，见财去印为救', () => {
  const yin = judge(1960, 2, 14, 1);
  assert.equal(yin.pillars, '庚子 戊寅 壬申 辛丑');
  assert.equal(yin.chengBai.verdict, '成');
  assert.ok(quotes(yin.chengBai).includes('煞用印化（论偏官）'));
  assert.ok(quotes(yin.chengBai).includes('煞用阳刃（论偏官）'));

  const cai = judge(1960, 1, 26, 1);
  assert.equal(cai.pillars, '己亥 丁丑 癸丑 癸丑');
  assert.equal(cai.chengBai.verdict, '败');
  assert.ok(quotes(cai.chengBai).includes('七煞逢财无制'));

  const flaw = judge(1962, 4, 14, 1);
  assert.equal(flaw.pillars, '壬寅 甲辰 壬午 辛丑');
  assert.equal(flaw.chengBai.verdict, '成中有败');
  assert.ok(quotes(flaw.chengBai).includes('七煞逢食制，而又逢印'));

  const rescued = judge(1962, 9, 14, 1);
  assert.equal(rescued.pillars, '壬寅 己酉 乙卯 丁丑');
  assert.equal(rescued.chengBai.verdict, '败中有成');
  assert.ok(quotes(rescued.chengBai).includes('逢财以去印存食'));
});

test('伤官格：生财、佩印、带杀无财为成；非金水见官、生财带杀、伤轻身旺佩印为败；印护、合杀为救', () => {
  const peiyin = judge(1960, 12, 8, 1);
  assert.equal(peiyin.pillars, '庚子 戊子 庚午 丁丑');
  assert.equal(peiyin.chengBai.verdict, '成');
  assert.ok(quotes(peiyin.chengBai).includes('伤官佩印'));
  assert.ok(quotes(peiyin.chengBai).includes('伤官非金水而见官（金水伤官例外）'));

  const jianguan = judge(1962, 10, 26, 7);
  assert.equal(jianguan.pillars, '壬寅 庚戌 丁酉 丁未');
  assert.equal(jianguan.chengBai.verdict, '败');
  assert.ok(quotes(jianguan.chengBai).includes('伤官非金水而见官'));

  const yinhu = judge(1964, 1, 8, 1);
  assert.equal(yinhu.pillars, '癸卯 乙丑 丙辰 己丑');
  assert.equal(yinhu.chengBai.verdict, '败中有成');
  assert.ok(quotes(yinhu.chengBai).includes('官逢伤而透印以解之'));

  // 年干甲与时干己不作合论，七杀合不去
  const hesha = judge(1964, 2, 14, 7);
  assert.equal(hesha.pillars, '甲辰 丙寅 癸巳 己未');
  assert.ok(quotes(hesha.chengBai).includes('生财生带煞'));
  assert.ok(!quotes(hesha.chengBai).includes('伤官生财透煞而煞逢合'));
  assert.equal(hesha.chengBai.verdict, '败');

  const light = judge(1967, 1, 14, 7);
  assert.equal(light.pillars, '丙午 辛丑 戊寅 己未');
  assert.ok(quotes(light.chengBai).includes('佩印而伤轻身旺'));
});

test('羊刃格与建禄月劫：官杀财印为成；无官杀、无财官、透杀印为败', () => {
  const ren = judge(1960, 12, 20, 1);
  assert.equal(ren.pillars, '庚子 戊子 壬午 辛丑');
  assert.equal(ren.pattern.name, '羊刃格');
  assert.equal(ren.chengBai.verdict, '成');

  const renFail = judge(1962, 12, 20, 1);
  assert.equal(renFail.pillars, '壬寅 壬子 壬辰 辛丑');
  assert.equal(renFail.chengBai.verdict, '败');
  assert.ok(quotes(renFail.chengBai).includes('阳刃无官煞'));

  const renFlaw = judge(1964, 3, 26, 7);
  assert.equal(renFlaw.pillars, '甲辰 丁卯 甲戌 辛未');
  assert.equal(renFlaw.chengBai.verdict, '成中有败');

  const lu = judge(1960, 3, 8, 1);
  assert.equal(lu.pillars, '庚子 己卯 乙未 丁丑');
  assert.equal(lu.pattern.name, '建禄格');
  assert.equal(lu.chengBai.verdict, '成');
  assert.ok(quotes(lu.chengBai).includes('透财而逢食伤'));

  // 无财官而食伤透、身不弱：论建禄月劫「无财官而用伤食，泄其太过，亦为秀气」
  const luXie = judge(1960, 5, 20, 7);
  assert.equal(luXie.pillars, '庚子 辛巳 戊申 己未');
  assert.equal(luXie.chengBai.verdict, '成');
  assert.ok(quotes(luXie.chengBai).includes('禄劫之格，无财官而用伤食，泄其太过，亦为秀气（论建禄月劫）'));
  const luFail = judge(1961, 12, 16, 1);
  assert.equal(luFail.pillars, '辛丑 庚子 癸未 癸丑');
  assert.equal(luFail.chengBai.verdict, '败');
  assert.ok(quotes(luFail.chengBai).includes('无财官'));

  const shayin = judge(1962, 5, 8, 7);
  assert.equal(shayin.pillars, '壬寅 乙巳 丙午 乙未');
  assert.ok(quotes(shayin.chengBai).includes('透煞印'));

  // 年干庚与时干乙不作合论，透财而遇煞成中有败
  const hesha = judge(1960, 2, 26, 1);
  assert.equal(hesha.pillars, '庚子 戊寅 甲申 乙丑');
  assert.equal(hesha.chengBai.verdict, '成中有败');
  assert.ok(!quotes(hesha.chengBai).includes('用财带煞而煞被合'));
});

/** 原书命造：按四柱找一个同干支的日子排盘再判成败。 */
const bookJudge = (pillars) => {
  const date = findSolarDateByPillars(pillars);
  assert.ok(date, pillars.join(' '));
  const chart = buildBaziChart({ calendarType: 'solar', year: date.year, month: date.month, day: date.day, hourIndex: date.hourIndex ?? 6, gender: 'male' });
  const result = judgeBaziPattern(chart, analyzeStrength(chart));
  return { pattern: result.pattern, chengBai: result.chengBai };
};

test('《子平真诠》各格命造的成败：合煞留官、财用煞印、印护、裁损、取清、泄秀、去官留煞', () => {
  // 论印绶「辛亥 庚子 甲辰 乙亥，此合煞留官也」：月干庚与时干乙隔日干仍合
  const yinHeSha = bookJudge(['辛亥', '庚子', '甲辰', '乙亥']);
  assert.equal(yinHeSha.pattern.name, '正印格');
  assert.equal(yinHeSha.chengBai.verdict, '败中有成');
  assert.ok(quotes(yinHeSha.chengBai).includes('合煞留官（论印绶）'));
  // 论印绶牛监簿「乙合庚而不生丙，所以为贵」、「己未 甲戌 辛未 癸巳，此合财存食之贵也」
  const niu = bookJudge(['庚寅', '乙酉', '癸亥', '丙辰']);
  assert.equal(niu.chengBai.verdict, '成');
  assert.ok(quotes(niu.chengBai).includes('食被合而不生财（论印绶）'));
  const heCai = bookJudge(['己未', '甲戌', '辛未', '癸巳']);
  assert.equal(heCai.chengBai.verdict, '成');
  assert.ok(quotes(heCai.chengBai).includes('合财存食（论印绶）'));
  // 论印绶「印透七煞，而劫财以存煞印，亦有贵格」
  assert.equal(bookJudge(['庚戌', '戊子', '甲戌', '乙亥']).chengBai.verdict, '成');
  // 论财曾参政「财格佩印……佩印帮身，即以取贵」、吴榜眼「庚与丙隔一戊而不相克」、林尚书「单透财而亦贵，以月令有暗官也」、赵侍郎「财用煞印」
  assert.ok(quotes(bookJudge(['乙未', '甲申', '丙申', '庚寅']).chengBai).includes('财格透印而位置妥贴，两不相克'));
  assert.equal(bookJudge(['庚戌', '戊子', '戊子', '丙辰']).chengBai.verdict, '成');
  assert.ok(quotes(bookJudge(['丙寅', '癸巳', '癸未', '壬戌']).chengBai).includes('单透财而亦贵，以月令有暗官也（论财）'));
  assert.equal(bookJudge(['乙丑', '丁亥', '己亥', '乙亥']).chengBai.verdict, '败中有成');
  // 论偏官何参政「煞印有情」：有印化煞，见财不作无制论；岳统制「去官留煞」；「乙亥 乙酉 乙卯 丁丑」中和而食制杀亦成
  assert.equal(bookJudge(['丙寅', '戊戌', '壬戌', '辛丑']).chengBai.verdict, '成');
  const yue = bookJudge(['癸卯', '丁巳', '庚寅', '庚辰']);
  assert.equal(yue.chengBai.verdict, '败中有成');
  assert.ok(quotes(yue.chengBai).includes('去官留煞（论偏官）'));
  assert.equal(bookJudge(['乙亥', '乙酉', '乙卯', '丁丑']).chengBai.verdict, '成');
  // 论食神刘提督「财先煞后，食以间之，而财不能党煞」
  assert.ok(quotes(bookJudge(['癸酉', '辛酉', '己卯', '乙亥']).chengBai).includes('财先煞后，食以间之（论食神）'));
  // 论阳刃穆同知（寅午之官、戊合癸印护）、贾平章（煞两透，食以裁损）、「壬合丁，官煞纯而不杂」取清
  assert.ok(quotes(bookJudge(['甲午', '癸酉', '庚寅', '戊寅']).chengBai).includes('官煞制刃带伤食而贵：印护（论阳刃）'));
  assert.ok(quotes(bookJudge(['甲寅', '庚午', '戊申', '甲寅']).chengBai).includes('官煞制刃带伤食而贵：煞太重而裁损之（论阳刃）'));
  assert.ok(quotes(bookJudge(['丙戌', '丁酉', '庚申', '壬午']).chengBai).includes('官煞制刃带伤食而贵：官煞轻而取清之（论阳刃）'));
  // 论建禄月劫张状元「木火通明」、一平章「合煞留官」、「制煞留官」
  assert.equal(bookJudge(['甲子', '丙寅', '甲子', '丙寅']).chengBai.verdict, '成');
  assert.ok(quotes(bookJudge(['辛丑', '庚寅', '甲辰', '乙亥']).chengBai).includes('合煞留官（论建禄月劫）'));
  assert.ok(quotes(bookJudge(['辛亥', '庚寅', '甲申', '丙寅']).chengBai).includes('制煞留官（论建禄月劫）'));
  // 论伤官都统制「财太重而带印，而丁与壬隔以戊己，两不相碍」：年时两干不作合论
  assert.equal(bookJudge(['丁酉', '己酉', '戊子', '壬子']).chengBai.verdict, '成');
  // 论正官杂气「壬财丁印，二者相合，仍以孤官无辅，所以不上七品」成中有败；范太傅「丙丁并透，用一而足，以丁合壬而财去」败中有成
  const guXu = bookJudge(['壬戌', '丁未', '戊申', '乙卯']);
  assert.equal(guXu.chengBai.verdict, '成中有败');
  assert.ok(quotes(guXu.chengBai).includes('财印相合，孤官无辅（论正官）'));
  const fan = bookJudge(['丁丑', '壬寅', '己巳', '丙寅']);
  assert.equal(fan.chengBai.verdict, '败中有成');
  assert.ok(quotes(fan.chengBai).includes('官逢伤克（论正官：巳丑会金伤官）'));
});

test('相神（论相神紧要「官逢财生，则官为用，财为相」）：成格、救应各条记下辅成此格的那一位，写进成败说明', () => {
  // 薛相公「壬印戊财，以乙隔之」：正官格，相神财、印；寅申冲另算一条败，巳申合解之
  const xue = bookJudge(['甲申', '壬申', '乙巳', '戊寅']);
  assert.deepEqual(xue.chengBai.xiangShen, ['财', '印']);
  assert.match(xue.chengBai.summary, /相神：财、印。$/);
  // 论相神紧要「煞逢食制，则煞为用，食为相」；「合伤存官以成格者，全赖于壬之相」——合去忌神的那一干也是相
  assert.deepEqual(bookJudge(['乙亥', '乙酉', '乙卯', '丁丑']).chengBai.xiangShen, ['食伤']);
  assert.deepEqual(bookJudge(['庚寅', '乙酉', '甲子', '戊辰']).chengBai.xiangShen, ['财', '比劫']);
  // 曾参政财格佩印，相神印（申中壬为暗煞，也列出）；常国公弃食就煞印，相神七杀、印；一平章合煞留官，相神正官
  assert.deepEqual(bookJudge(['乙未', '甲申', '丙申', '庚寅']).chengBai.xiangShen, ['印', '七杀']);
  assert.deepEqual(bookJudge(['辛卯', '辛卯', '癸酉', '己未']).chengBai.xiangShen, ['七杀', '印']);
  assert.deepEqual(bookJudge(['辛丑', '庚寅', '甲辰', '乙亥']).chengBai.xiangShen, ['正官']);
  // 败格不列相神
  assert.deepEqual(bookJudge(['辛丑', '庚子', '癸未', '癸丑']).chengBai.xiangShen, []);
});

test('待详辨：天干不构成原书条件时只列透出的十神，不下结论；要点里带出处', () => {
  const qianlong = judge(1711, 9, 25, 0);
  assert.equal(qianlong.pillars, '辛卯 丁酉 庚午 丙子');
  assert.equal(qianlong.chengBai.verdict, '待详辨');
  assert.match(qianlong.chengBai.summary, /天干透出劫财（年柱辛）、正官（月柱丁）、七杀（时柱丙）/);
  assert.ok(qianlong.points.some((line) => line.startsWith('成败（《子平真诠》·论用神成败救应）：羊刃格待详辨')));
});

test('中和的盘按旺衰一节略偏的一边算身强、身弱：庚申 壬午 辛酉 癸巳 中和略偏旺，壬癸制杀，七杀格成（任注「午火真神得用」）', () => {
  const zhen = judge(1920, 7, 2, 5);
  assert.equal(zhen.pillars, '庚申 壬午 辛酉 癸巳');
  assert.equal(zhen.pattern.name, '七杀格');
  assert.equal(zhen.chengBai.verdict, '成');
  assert.equal(zhen.chengBai.success[0].text, '身中和略偏旺，食伤（月柱壬、时柱癸）制杀。');
  assert.ok(quotes(zhen.chengBai).includes('身强七煞逢制'));
});
