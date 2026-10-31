import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';
import { describeQuYun, quYunOf, quYunQuoteText } from '../src/utils/baziQuYun.js';
import { buildBaziPrompt } from '../src/utils/baziPrompt.js';
import { findSolarDateByPillars } from '../scripts/lib/baziCases.mjs';

/** 原书命造：按四柱找一个同干支的日子排盘。 */
const chartOf = (pillars) => {
  const date = findSolarDateByPillars(pillars);
  assert.ok(date, pillars.join(' '));
  return buildBaziChart({ calendarType: 'solar', year: date.year, month: date.month, day: date.day, hourIndex: date.hourIndex ?? 6, gender: 'male' });
};
const judgeOf = (chart) => judgeBaziPattern(chart, analyzeStrength(chart));
const contextOf = (chart) => ({
  monthZhi: chart.pillars.find((pillar) => pillar.key === 'month').zhi,
  guanGans: chart.pillars.filter((pillar) => pillar.key !== 'day' && pillar.ganShiShen === '正官').map((pillar) => pillar.gan),
});
const run = (chart, ganZhi) => {
  const found = chart.yun.dayun.find((item) => item.ganZhi === ganZhi);
  assert.ok(found, `${ganZhi} 不在这张盘的大运里`);
  return found;
};

test('财旺生官（葛参政 壬申 壬子 戊午 乙卯）：论财取运「运喜身旺印缓，不利七煞伤官」——印、比劫喜，七杀、食伤忌，正官原书未言', () => {
  const chart = chartOf(['壬申', '壬子', '戊午', '乙卯']);
  const { chengBai } = judgeOf(chart);
  assert.equal(chengBai.verdict, '成');
  const quYun = chengBai.quYun;
  assert.equal(quYun.section, '论财取运');
  assert.equal(quYun.source, '《子平真诠》·论财取运');
  assert.ok(quYun.texts[0].startsWith('其财旺生官者，运喜身旺印缓'));
  assert.deepEqual(quYun.favor, { 比劫: 'good', 印: 'good', 七杀: 'bad', 食伤: 'bad' });
  assert.match(quYunQuoteText(quYun), /^《子平真诠》·论财取运：其财旺生官者/);
  const jiaYin = describeQuYun(run(chart, '甲寅'), quYun, contextOf(chart));
  assert.equal(jiaYin.gan.tone, 'bad');
  assert.equal(jiaYin.zhi.tone, 'bad');
  assert.equal(jiaYin.text, '天干甲七杀忌 · 地支寅本气七杀忌');
  const bingChen = describeQuYun(run(chart, '丙辰'), quYun, contextOf(chart));
  assert.equal(bingChen.gan.tone, 'good');
  assert.equal(bingChen.zhi.tone, 'good');
  const yiMao = describeQuYun(run(chart, '乙卯'), quYun, contextOf(chart));
  assert.equal(yiMao.gan.tone, null);
  assert.match(yiMao.text, /正官原书未言/);
});

test('正官格总则「与地支刑冲，不问所就何局，皆不利」：运支冲月令按忌，并写明缘由', () => {
  const chart = chartOf(['庚子', '辛巳', '辛酉', '己丑']);
  const { chengBai } = judgeOf(chart);
  assert.equal(chengBai.group, '正官格');
  const quYun = chengBai.quYun;
  assert.ok(quYun.clashMonth);
  // 这张盘是正官佩印，「运喜财乡，伤食反吉」：运干食神喜；运支亥冲月令巳，总则「皆不利」
  const clash = describeQuYun({ gan: '癸', zhi: '亥', ganShiShen: '食神', hiddenShiShens: ['伤官', '正财'] }, quYun, contextOf(chart));
  assert.equal(clash.zhi.tone, 'bad');
  assert.match(clash.zhi.note, /刑冲月令巳/);
  assert.equal(clash.gan.tone, 'good');
  assert.equal(quYun.favor.七杀, 'bad');
});

test('煞用食制（乙亥 乙酉 乙卯 丁丑）：论偏官取运「忌正官之混杂，畏印缓之夺食」；煞用印化（何参政）：「不利财乡，伤官为美」', () => {
  const sha = judgeOf(chartOf(['乙亥', '乙酉', '乙卯', '丁丑'])).chengBai;
  assert.equal(sha.quYun.section, '论偏官取运');
  assert.equal(sha.quYun.favor.正官, 'bad');
  assert.equal(sha.quYun.favor.印, 'bad');
  assert.equal(sha.quYun.favor.食伤, 'good');
  const yin = judgeOf(chartOf(['丙寅', '戊戌', '壬戌', '辛丑'])).chengBai;
  assert.ok(yin.quYun.texts.some((text) => text.startsWith('煞用印缓，不利财乡')));
  assert.equal(yin.quYun.favor.财, 'bad');
  assert.equal(yin.quYun.favor.食伤, 'good');
  assert.equal(yin.quYun.favor.印, 'good');
});

test('禄劫用伤食（张状元 甲子 丙寅 甲子 丙寅）：「财运最宜，煞亦不忌，行印非吉，透官不美」；禄劫用官印护：怕官星之逢合', () => {
  const zhang = judgeOf(chartOf(['甲子', '丙寅', '甲子', '丙寅'])).chengBai;
  assert.equal(zhang.quYun.section, '论建禄月劫取运');
  assert.deepEqual(zhang.quYun.favor, { 财: 'good', 七杀: 'neutral', 印: 'bad', 正官: 'bad' });
  // 金丞相 庚戌 戊子 癸酉 癸亥：用官而印护，运干合住官星戊（癸）按忌
  const jin = chartOf(['庚戌', '戊子', '癸酉', '癸亥']);
  const quYun = judgeOf(jin).chengBai.quYun;
  assert.ok(quYun.mergeGuan);
  const heGuan = describeQuYun({ gan: '癸', zhi: '未', ganShiShen: '比肩', hiddenShiShens: ['七杀', '食神', '偏财'] }, quYun, contextOf(jin));
  assert.equal(heGuan.gan.tone, 'bad');
  assert.match(heGuan.gan.note, /合住官星/);
});

test('待详辨的盘不取运；quYunOf 对没有格的输入返回 null', () => {
  assert.equal(quYunOf(null, {}), null);
  assert.equal(quYunOf({ group: '正官格', verdict: '待详辨', success: [] }, { stems: [], share: {} }), null);
  assert.equal(describeQuYun({ gan: '甲', zhi: '子', ganShiShen: '七杀' }, null), null);
});

test('提示词里带出格局取运：大运各步与所选运限都标原书喜忌', () => {
  const chart = chartOf(['壬申', '壬子', '戊午', '乙卯']);
  const daYun = chart.yun.dayun.find((item) => item.ganZhi === '甲寅');
  const liuNian = daYun.liuNian[0];
  const prompt = buildBaziPrompt({ chart, scope: 'year', selections: { daYun, liuNian, liuYueList: [] } });
  assert.match(prompt, /格局取运（《子平真诠》·论财取运：其财旺生官者，运喜身旺印缓，不利七煞伤官）/);
  assert.match(prompt, /甲寅，天干十神七杀[^\n]*取运：天干甲七杀忌 · 地支寅本气七杀忌/);
  assert.match(prompt, /大运按格局取运（《子平真诠》·论财取运：[^）]*）：天干甲七杀忌 · 地支寅本气七杀忌/);
  assert.match(prompt, /流年按格局取运：天干/);
});
