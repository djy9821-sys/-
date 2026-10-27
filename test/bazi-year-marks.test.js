import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { buildShenshaContext, getShensha } from '../src/utils/baziShensha.js';
import * as yearMarks from '../src/utils/baziYearMarks.js';

const { describeTaiSui, describeYearMarks, getDaYunMarks, getLiuNianMarks } = yearMarks;

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
  const plain = describeYearSummary({ ...liuNianOf('庚子'), ganShiShen: '伤官', hiddenShiShens: ['偏财'] }, { chart, strength });
  assert.match(plain.text, /为伤官，为忌神/);
  assert.match(plain.text, /地支子水为忌神（财，藏干主气偏财）/);
  assert.equal(plain.tone, 'bad');
  assert.equal(plain.headline, '宜守不宜攻');
  // 旺衰为空：只有中性主题与平稳倾向。
  const neutral = describeYearSummary({ ...liuNianOf('戊寅'), ganShiShen: '劫财' }, { chart });
  assert.match(neutral.text, /流年天干戊为劫财，主破财、冲动与朋友牵连：钱财与朋友之间要分清/);
  assert.equal(neutral.tone, 'neutral');
  assert.equal(describeYearSummary(null, { chart }), null);
});
