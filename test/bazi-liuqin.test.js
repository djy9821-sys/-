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
  // 戊辰 庚申 己卯 戊辰：己土身弱，食伤金重、无印——「日主弱，食伤重，印绶无，亦无子」（原书此造至老无子；扫描本作「印绶无」）。
  const none = itemOf(liuqinOf(chartByPillars('戊辰 庚申 己卯 戊辰')), 'children');
  assert.equal(none.tone, 'bad');
  assert.equal(none.ren.rule.original, '亦无子');
  assert.equal(none.verdict, '任注：日主弱，食伤重，印绶无，古法主子息艰难。');
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

test('妻宫坐财只算正财、偏财（劫财是比劫），断语照任注原话「必得妻财」', () => {
  // 己未 丁丑 壬午 庚戌：壬水坐午，午中本气丁火正财，财为喜用，午不逢冲。
  const zuoCai = itemOf(liuqinOf(chartByPillars('己未 丁丑 壬午 庚戌')), 'spouse');
  assert.equal(zuoCai.palaces[0].shiShen, '正财');
  assert.equal(zuoCai.ren.text, '日主坐财，财为喜用，任注「必得妻财」');
  // 庚申 壬午 癸亥 甲寅：癸水坐亥，亥中本气壬水是劫财，不是财；喜用而坐，只说妻宫坐喜神。
  const zuoJie = itemOf(liuqinOf(chartByPillars('庚申 壬午 癸亥 甲寅')), 'spouse');
  assert.equal(zuoJie.palaces[0].shiShen, '劫财');
  assert.equal(zuoJie.ren.text, '妻宫（日支）坐喜神，古法主妻贤有助');
});

test('火炎土燥先断子息艰难（男女命同），水气稍有或土不重的不算', () => {
  // 乙未 辛巳 戊戌 丁巳：无水、无辰丑湿土，火土俱重（任注「局中全无湿气……生十二子，刑过十子」）。
  const zao = itemOf(liuqinOf(chartByPillars('乙未 辛巳 戊戌 丁巳')), 'children');
  assert.equal(zao.tone, 'bad');
  assert.equal(zao.ren.rule.original, '火炎土燥无子');
  assert.equal(zao.verdict, '任注：火炎土燥，局中全无湿气，古法主子息艰难。');
  // 女命照任注《女命》「火炎土燥无子」。
  const female = itemOf(liuqinOf(chartByPillars('丙午 甲午 丙午 甲午', 'female')), 'children');
  assert.equal(female.ren.source, '《滴天髓阐微·女命》任注');
  assert.equal(female.ren.rule.original, '火炎土燥无子');
  // 甲寅 庚午 戊寅 甲寅：也全无水气，但七杀木重、土不重，不算火炎土燥（任注此造「子富孙多」）。
  const notZao = itemOf(liuqinOf(chartByPillars('甲寅 庚午 戊寅 甲寅')), 'children');
  assert.equal(notZao.ren.rule, null);
  assert.equal(notZao.tone, 'good');
});

test('「见财星」要财星够得着印，财印相隔的不算；印重的杀印相生不作「女多子少」', () => {
  // 甲子 丙寅 戊寅 己未：杀旺用丙火印，财藏年支子水，既不透干、不在印下，也不冲印（任注「喜其财印相隔，生生不悖」，夫妇齐眉，生六子皆登科第）。
  const liuqin = liuqinOf(chartByPillars('甲子 丙寅 戊寅 己未'));
  const wife = itemOf(liuqin, 'spouse');
  assert.equal(wife.ren.rule, null);
  assert.equal(wife.tone, 'good');
  const children = itemOf(liuqin, 'children');
  assert.equal(children.ren.rule, null);
  assert.equal(children.tone, 'good');
  assert.match(children.verdict, /^任注「凡八字之用神即是子星」：用神火透月干丙/);
  // 庚午 辛巳 乙酉 壬午：财土不透，但时干壬水印坐午、午中藏己土财——印下有财，仍算「见财星」。
  assert.equal(itemOf(liuqinOf(chartByPillars('庚午 辛巳 乙酉 壬午')), 'spouse').ren.rule?.cond, '官杀旺而用印，见财星');
  // 乙亥 辛巳 甲子 庚午：财土藏巳午，巳冲亥、午冲子，藏财之支紧贴冲印之支，也算。
  assert.equal(itemOf(liuqinOf(chartByPillars('乙亥 辛巳 甲子 庚午')), 'spouse').ren.rule?.cond, '官杀旺而用印，见财星');
});

test('兄弟：身旺比劫重、官轻伤重，比劫又去生伤，主兄弟之累', () => {
  // 癸巳 戊午 丙午 庚寅：羊刃当权，用食伤土，比劫火生用神也列喜，但任注「兄弟六人，皆不成器，遭累不堪」。
  const siblings = itemOf(liuqinOf(chartByPillars('癸巳 戊午 丙午 庚寅')), 'siblings');
  assert.equal(siblings.stars[0].tone, 'good');
  assert.equal(siblings.tone, 'bad');
  assert.equal(siblings.ren.rule.original, '必遭兄弟之累');
  assert.equal(siblings.verdict, '任注：官轻伤重，比劫生伤，古法主兄弟之累。');
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

test('用神受制看制伏时，湿土止不住水（任注「丑乃湿土，能泄火不能止水」）', () => {
  // 己亥 丙子 乙丑 壬午「克妻无子」：用神丙火受壬子亥水重克，木印只有半分通不了关，己、丑是湿土，止不住水，子星按受制断。
  const liuqin = liuqinOf(chartByPillars('己亥 丙子 乙丑 壬午'));
  const children = itemOf(liuqin, 'children');
  assert.equal(children.tone, 'bad');
  assert.match(children.ren.text, /用神火（透月干丙，作时支午本气）受水重克，无木通关、湿土止不住水，古法看作子息艰难$/);
});

test('妻宫坐喜神却被克它的一支冲去，按克妻看；被它克的一支来冲不算（任注「巳亥逢冲」「酉金冲去卯木」）', () => {
  // 甲寅 壬申 癸巳 癸亥「巳亥逢冲，群劫纷争，所以连克三妻」：日支巳火是财、是喜，被时支亥水冲去。
  const chong = itemOf(liuqinOf(chartByPillars('甲寅 壬申 癸巳 癸亥')), 'spouse');
  assert.equal(chong.tone, 'bad');
  assert.match(chong.ren.text, /^妻宫（日支）虽坐喜神，却被水冲去/);
  assert.doesNotMatch(chong.verdict, /逢冲，古法主变动/, '断语已说被冲去，不再附「逢冲」一句');
  // 丁未 乙巳 丁酉 癸卯「最喜坐下酉金冲去卯木，生起癸水……得妻财万仞」：酉金克卯木，被冲去的是卯，妻宫照坐财论。
  const you = itemOf(liuqinOf(chartByPillars('丁未 乙巳 丁酉 癸卯')), 'spouse');
  assert.equal(you.tone, 'good');
  assert.match(you.ren.text, /日主坐财，财为喜用/);
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
