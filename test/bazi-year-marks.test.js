import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength, favorBasisOf } from '../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';
import { buildShenshaContext, getShensha } from '../src/utils/baziShensha.js';
import * as yearMarks from '../src/utils/baziYearMarks.js';

const { describeDaYunFavor, describeTaiSui, describeYearMarks, describeYearSummary, getDaYunMarks, getLiuNianMarks, juOfZhi } = yearMarks;

const NOW = new Date('2026-10-26T10:00:00');
// 1998-01-02 辰时男：丁丑 壬子 己酉 戊辰
const chart = buildBaziChart({ calendarType: 'solar', year: 1998, month: 1, day: 2, gender: 'male', hourIndex: 4 }, NOW);
const strength = analyzeStrength(chart);
const liuNianOf = (ganZhi) => ({ ganZhi, gan: ganZhi[0], zhi: ganZhi[1] });

test('太岁：值、冲、刑、害、破', () => {
  assert.deepEqual(describeTaiSui(liuNianOf('丁丑'), chart), ['值太岁']);
  // 丑未既冲又刑。
  assert.deepEqual(describeTaiSui(liuNianOf('辛未'), chart), ['冲太岁', '刑太岁']);
  assert.deepEqual(describeTaiSui(liuNianOf('甲戌'), chart), ['刑太岁']);
  assert.deepEqual(describeTaiSui(liuNianOf('丙午'), chart), ['害太岁']);
  assert.deepEqual(describeTaiSui(liuNianOf('壬辰'), chart), ['破太岁']);
  assert.deepEqual(describeTaiSui(liuNianOf('戊寅'), chart), []);
});

test('流年标记：岁运并临、日柱伏吟反吟、冲日支与喜忌', () => {
  const daYun = { ganZhi: '辛未', gan: '辛', zhi: '未' };
  const same = getLiuNianMarks(liuNianOf('辛未'), { chart, daYun, strength });
  assert.deepEqual(same.labels, ['岁运并临', '冲太岁', '刑太岁']);
  assert.equal(same.badge, '岁运并临');
  assert.equal(same.badgeTone, 'echo');

  const fuYin = getLiuNianMarks(liuNianOf('己酉'), { chart, strength });
  assert.deepEqual(fuYin.labels, ['伏吟日柱']);
  // 乙己不冲，只算冲日支；丁癸冲、巳亥冲才是反吟。
  assert.deepEqual(getLiuNianMarks(liuNianOf('乙卯'), { chart, strength }).labels, ['冲日支']);
  const chart2 = buildBaziChart({ calendarType: 'solar', year: 2026, month: 6, day: 12, gender: 'male', hourIndex: 6 }, NOW);
  assert.equal(chart2.pillars[2].ganZhi, '丁巳');
  assert.deepEqual(getLiuNianMarks(liuNianOf('癸亥'), { chart: chart2 }).labels, ['反吟日柱']);
  const chong = getLiuNianMarks(liuNianOf('丁卯'), { chart, strength });
  assert.deepEqual(chong.labels, ['冲日支']);
  assert.equal(chong.favor.gan.tone, 'good');
  assert.equal(chong.favor.zhi.tone, 'bad');
  assert.equal(chong.favor.overall, 'mixed');
  assert.equal(describeYearMarks(liuNianOf('丁卯'), chong), '冲日支 · 天干丁火喜（印） · 地支卯木忌（官杀）');

  const quiet = getLiuNianMarks(liuNianOf('戊寅'), { chart, daYun, strength });
  assert.deepEqual(quiet.labels, []);
  assert.equal(quiet.badge, null);
});

test('大运喜忌与岁运反吟', () => {
  const daYun = getDaYunMarks({ gan: '丙', zhi: '午' }, { strength });
  assert.equal(daYun.favor.overall, 'good');
  const marks = getLiuNianMarks(liuNianOf('壬子'), { chart, daYun: { ganZhi: '丙午', gan: '丙', zhi: '午' }, strength });
  assert.ok(marks.labels.includes('岁运反吟'));
});

test('大运以地支为重：截脚整步运按忌论，盖头吉凶减半（《滴天髓·岁运》任注）', () => {
  // 丁丑 壬子 己酉 戊辰：喜土火，忌木水。
  const wuYin = getDaYunMarks({ gan: '戊', zhi: '寅' }, { strength, chart });
  assert.equal(wuYin.favor.cover.kind, '截脚', '戊土喜而寅木忌、木克土');
  assert.equal(wuYin.favor.overall, 'bad', '「支不载干，则十年皆否」');
  assert.equal(describeDaYunFavor({ gan: '戊', zhi: '寅' }, wuYin.favor),
    '天干戊土喜（比劫） · 地支寅木忌（官杀）；截脚：地支木克天干土，任注「支不载干，则十年皆否」，整步运按忌论');
  const jiaXu = getDaYunMarks({ gan: '甲', zhi: '戌' }, { strength, chart });
  assert.equal(jiaXu.favor.cover.kind, '盖头', '甲木忌而戌土喜、木克土');
  assert.equal(jiaXu.favor.overall, 'mixed', '「虽有十分之吉，亦减其半」');
  assert.equal(getDaYunMarks({ gan: '丙', zhi: '午' }, { strength, chart }).favor.cover, null);
  // 流年以天干为重，不论盖头截脚。
  const year = getLiuNianMarks(liuNianOf('戊寅'), { chart, strength });
  assert.equal(year.favor.cover, null);
  assert.equal(year.favor.overall, 'mixed');
});

test('运、年的地支与原局凑齐三会方、三合局的，按局的五行论喜忌（《滴天髓·岁运》任注「支全金局」「支类西方」）', () => {
  assert.equal(juOfZhi('丑', ['巳', '酉', '戌']).name, '巳酉丑三合金局');
  assert.deepEqual(juOfZhi('丑', ['巳', '酉', '戌']).others, ['巳', '酉']);
  assert.equal(juOfZhi('戌', ['申', '酉']).name, '申酉戌三会金方');
  assert.equal(juOfZhi('辰', ['寅', '卯', '申', '子']).kind, '三会', '方与局都凑齐时取方');
  assert.equal(juOfZhi('丑', ['巳', '戌']), null, '只凑齐两字（半合）的不算');
  assert.equal(juOfZhi('丑', []), null);

  // 丁丑 壬子 己酉 戊辰：己土偏弱，用神土，喜土火；木克土、水为土所克，为忌；金为土所生，是闲神。
  const xinHai = getDaYunMarks({ gan: '辛', zhi: '亥' }, { strength, chart });
  assert.equal(xinHai.favor.zhi.ju.name, '亥子丑三会水方');
  assert.equal(xinHai.favor.zhi.element, '水');
  assert.equal(getDaYunMarks({ gan: '辛', zhi: '亥' }, { strength }).favor.zhi.ju, undefined, '不给原局就不论会局');
  // 乙巳流年：巳本是火（喜），与原局酉丑会成金局，作金论（闲神），不再算喜。
  const yiSi = getLiuNianMarks(liuNianOf('乙巳'), { chart, strength });
  assert.equal(yiSi.favor.zhi.tone, 'neutral');
  assert.equal(describeYearMarks(liuNianOf('乙巳'), yiSi), '天干乙木忌（官杀） · 地支巳会成巳酉丑三合金局，金平（食伤）');
  // 甲申流年：申本是金（闲神），与原局子辰会成水局，作水论（忌）。
  const jiaShen = getLiuNianMarks(liuNianOf('甲申'), { chart, strength });
  assert.equal(jiaShen.favor.zhi.tone, 'bad');
  assert.equal(jiaShen.favor.overall, 'bad');
  assert.equal(describeYearMarks(liuNianOf('甲申'), jiaShen), '天干甲木忌（官杀） · 地支申会成申子辰三合水局，水忌（财）');
  const summary = describeYearSummary({ ...liuNianOf('甲申'), ganShiShen: '正官', hiddenShiShens: ['伤官'] }, { chart, strength });
  assert.ok(summary.text.includes('地支申会成申子辰三合水局，水为忌神（财），'), summary.text);
  assert.ok(!summary.text.includes('藏干主气'), '会局的不再说本支藏干');
  // 流年地支与大运地支、原局一起凑：原局只有子，大运申、流年辰，凑成申子辰。
  const chen = getLiuNianMarks(liuNianOf('壬辰'), { chart: { pillars: [{ key: 'year', zhi: '子' }] }, daYun: { ganZhi: '戊申', gan: '戊', zhi: '申' }, strength });
  assert.equal(chen.favor.zhi.ju.name, '申子辰三合水局');
});

test('认出疑似从格的盘，大运喜忌按此格论：甲戌运戌与原局寅午会成火局，按从儿论为喜', () => {
  const chart2 = buildBaziChart({ calendarType: 'solar', year: 1975, month: 2, day: 26, gender: 'male', hourIndex: 6 }, NOW);
  const strength2 = analyzeStrength(chart2);
  const basis = favorBasisOf(strength2, judgeBaziPattern(chart2, strength2).special);
  const jiaXu = { gan: '甲', zhi: '戌' };
  assert.equal(getDaYunMarks(jiaXu, { strength: strength2, chart: chart2 }).favor.overall, 'bad', '扶抑：木火都是忌');
  const marks = getDaYunMarks(jiaXu, { strength: basis, chart: chart2 });
  assert.equal(marks.favor.overall, 'good');
  assert.equal(marks.favor.zhi.ju.name, '寅午戌三合火局');
});

test('新增神煞：国印、金舆、天医、孤辰寡宿、魁罡、阴差阳错、十恶大败', () => {
  const pillar = (key, ganZhi) => ({ key, gan: ganZhi[0], zhi: ganZhi[1] });
  // 壬辰 庚戌 庚辰 戊寅：庚辰日
  const context = buildShenshaContext([pillar('year', '壬辰'), pillar('month', '庚戌'), pillar('day', '庚辰'), pillar('time', '戊寅')]);
  const day = getShensha(pillar('day', '庚辰'), context);
  assert.ok(day.includes('魁罡'));
  assert.ok(day.includes('十恶大败'));
  assert.ok(day.includes('国印贵人'));
  // 同样的干支放在流年上不算魁罡。
  assert.ok(!getShensha(pillar('liu-nian', '庚辰'), context).includes('魁罡'));
  // 庚日见戌为金舆；戌月天医在酉；辰年孤辰在巳、寡宿在丑。
  assert.ok(getShensha(pillar('x', '甲戌'), context).includes('金舆'));
  assert.ok(getShensha(pillar('x', '癸酉'), context).includes('天医'));
  assert.ok(getShensha(pillar('x', '乙巳'), context).includes('孤辰'));
  assert.ok(getShensha(pillar('x', '丁丑'), context).includes('寡宿'));
  // 丙子日阴差阳错。
  const context2 = buildShenshaContext([pillar('year', '甲子'), pillar('month', '丙寅'), pillar('day', '丙子'), pillar('time', '戊子')]);
  assert.ok(getShensha(pillar('day', '丙子'), context2).includes('阴差阳错'));
});

test('流年提要：十神主题、地支喜忌、太岁提醒与总体倾向', () => {
  const { describeYearSummary } = yearMarks;
  const liuNian = chart.yun.dayun.flatMap((item) => item.liuNian).find((item) => item.year === 2026);
  assert.equal(liuNian.ganZhi, '丙午');
  const daYun = chart.yun.dayun.find((item) => item.liuNian.includes(liuNian));
  const summary = describeYearSummary(liuNian, { chart, daYun, strength });
  assert.equal(summary.tone, 'good');
  assert.equal(summary.headline, '顺势进取之年');
  assert.match(summary.text, /^流年天干丙为正印，为喜用，主学习、长辈与庇荫：/);
  assert.match(summary.text, /地支午火为喜用（印，藏干主气偏印）/);
  assert.match(summary.text, /害太岁，提防口舌与暗中阻碍/);
  assert.equal(summary.sentences.length, 3);

  // 2027 丁未：冲太岁又刑太岁，标题以变动为先；地支未土为比劫喜用。
  const next = daYun.liuNian.find((item) => item.year === 2027) ?? chart.yun.dayun.flatMap((item) => item.liuNian).find((item) => item.year === 2027);
  const nextSummary = describeYearSummary(next, { chart, daYun, strength });
  assert.equal(nextSummary.headline, '变动之年');
  assert.match(nextSummary.text, /冲太岁的变动之年/);
  assert.equal(nextSummary.tone, 'mixed');

  // 没有标注时补一句总体倾向；忌神流年为宜守。
  const plain = describeYearSummary({ ...liuNianOf('甲子'), ganShiShen: '正官', hiddenShiShens: ['偏财'] }, { chart, strength });
  assert.match(plain.text, /为正官，为忌神/);
  assert.match(plain.text, /地支子水为忌神（财，藏干主气偏财）/);
  assert.equal(plain.tone, 'bad');
  assert.equal(plain.headline, '宜守不宜攻');
  // 旺衰为空：只有中性主题与平稳倾向。
  const neutral = describeYearSummary({ ...liuNianOf('戊寅'), ganShiShen: '劫财' }, { chart });
  assert.match(neutral.text, /流年天干戊为劫财，主破财、冲动与朋友牵连：钱财与朋友之间要分清/);
  assert.equal(neutral.tone, 'neutral');
  assert.equal(describeYearSummary(null, { chart }), null);
});
