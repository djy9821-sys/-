import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';
import { CHENG_BAI_QUOTES, chengBaiGroupOf } from '../src/utils/baziPatternSuccess.js';

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

  const mixed = judge(1960, 3, 2, 1);
  assert.equal(mixed.pillars, '庚子 戊寅 己丑 乙丑');
  assert.equal(mixed.chengBai.verdict, '败中有成');
  const mixedQuotes = quotes(mixed.chengBai);
  assert.ok(mixedQuotes.includes('官逢伤克'));
  assert.ok(mixedQuotes.includes('杂煞'));
  assert.ok(mixedQuotes.includes('杂煞而合煞以清之'));

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
  const sheng = judge(1972, 4, 14, 1);
  assert.equal(sheng.pillars, '壬子 甲辰 乙亥 丁丑');
  assert.equal(sheng.chengBai.verdict, '成');
  assert.ok(quotes(sheng.chengBai).includes('财逢食生而身强带比'));

  const qisha = judge(1960, 1, 2, 1);
  assert.equal(qisha.pillars, '己亥 丙子 己丑 乙丑');
  assert.equal(qisha.chengBai.verdict, '败');
  assert.ok(quotes(qisha.chengBai).includes('财透七煞'));

  const jie = judge(1960, 4, 2, 1);
  assert.equal(jie.pillars, '庚子 己卯 庚申 丁丑');
  assert.equal(jie.chengBai.verdict, '败中有成');
  assert.ok(quotes(jie.chengBai).includes('财轻比重'));
  assert.ok(quotes(jie.chengBai).includes('生官以制之'));

  const shi = judge(1964, 5, 14, 1);
  assert.equal(shi.pillars, '甲辰 己巳 癸亥 癸丑');
  assert.ok(quotes(shi.chengBai).includes('财逢劫而透食以化之'));

  const flaw = judge(1960, 10, 14, 7);
  assert.equal(flaw.pillars, '庚子 丙戌 乙亥 癸未');
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

  const jiusha = judge(1962, 4, 8, 1);
  assert.equal(jiusha.pillars, '壬寅 甲辰 丙子 己丑');
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

  const hesha = judge(1964, 2, 14, 7);
  assert.equal(hesha.pillars, '甲辰 丙寅 癸巳 己未');
  assert.ok(quotes(hesha.chengBai).includes('生财生带煞'));
  assert.ok(quotes(hesha.chengBai).includes('伤官生财透煞而煞逢合'));

  const light = judge(1966, 10, 26, 1);
  assert.equal(light.pillars, '丙午 戊戌 戊午 癸丑');
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

  const luFail = judge(1960, 5, 20, 7);
  assert.equal(luFail.pillars, '庚子 辛巳 戊申 己未');
  assert.equal(luFail.chengBai.verdict, '败');
  assert.ok(quotes(luFail.chengBai).includes('无财官'));

  const shayin = judge(1962, 5, 8, 7);
  assert.equal(shayin.pillars, '壬寅 乙巳 丙午 乙未');
  assert.ok(quotes(shayin.chengBai).includes('透煞印'));

  const hesha = judge(1960, 2, 26, 1);
  assert.equal(hesha.pillars, '庚子 戊寅 甲申 乙丑');
  assert.equal(hesha.chengBai.verdict, '败中有成');
  assert.ok(quotes(hesha.chengBai).includes('用财带煞而煞被合'));
});

test('待详辨：天干不构成原书条件时只列透出的十神，不下结论；要点里带出处', () => {
  const qianlong = judge(1711, 9, 25, 0);
  assert.equal(qianlong.pillars, '辛卯 丁酉 庚午 丙子');
  assert.equal(qianlong.chengBai.verdict, '待详辨');
  assert.match(qianlong.chengBai.summary, /天干透出劫财（年柱辛）、正官（月柱丁）、七杀（时柱丙）/);
  assert.ok(qianlong.points.some((line) => line.startsWith('成败（《子平真诠》·论用神成败救应）：羊刃格待详辨')));
});
