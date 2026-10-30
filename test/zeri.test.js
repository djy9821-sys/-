import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { findZeriPurpose, formatZeriText, pickAuspiciousDays, sortReasons, ZERI_GRADES, ZERI_PURPOSES } from '../src/utils/zeri.js';

const NOW = new Date('2026-10-27T10:00:00');
// 1990-05-20 午时男：庚午 辛巳 乙酉 壬午，日主乙木极弱，喜水木、忌火金土。
const chart = buildBaziChart({ calendarType: 'solar', year: 1990, month: 5, day: 20, gender: 'male', hourIndex: 6 }, NOW);
const strength = analyzeStrength(chart);
const dayOf = (result, date) => result.days.find((item) => item.date === date);
const reasonTexts = (item) => item.reasons.map((reason) => reason.text);

test('按日期范围逐日打分，分级与计数自洽', () => {
  const result = pickAuspiciousDays(chart, strength, { purpose: 'contract', days: 30, now: NOW });
  assert.equal(result.purpose.value, 'contract');
  assert.equal(result.start, '2026-10-27');
  assert.equal(result.end, '2026-11-25');
  assert.equal(result.days.length, 30);
  const total = Object.values(result.counts).reduce((sum, count) => sum + count, 0);
  assert.equal(total, 30);
  result.days.forEach((item) => {
    assert.equal(item.score, item.reasons.reduce((sum, reason) => sum + reason.delta, 0));
    if (item.hardAvoid) assert.equal(item.grade, 'avoid');
    if (item.grade === 'good') assert.ok(item.score >= 4);
    assert.ok(ZERI_GRADES[item.grade]);
  });
  // 较宜列表按分数降序、同分按日期升序。
  for (let index = 1; index < result.best.length; index += 1) {
    const previous = result.best[index - 1];
    const current = result.best[index];
    assert.ok(previous.score > current.score || (previous.score === current.score && previous.date < current.date));
  }
  assert.ok(result.best.every((item) => item.grade === 'good' || item.grade === 'ok'));
  assert.ok(result.avoid.every((item) => item.grade === 'avoid'));
  assert.ok(dayOf(result, '2026-10-27').isToday);
});

test('硬忌：冲日支、天克地冲日柱、岁破、破日、黄历忌此事', () => {
  const result = pickAuspiciousDays(chart, strength, { purpose: 'contract', days: 30, now: NOW });
  // 己卯日卯酉冲本命日支。
  const chongDay = dayOf(result, '2026-11-01');
  assert.equal(chongDay.ganZhi, '己卯');
  assert.ok(reasonTexts(chongDay).includes('冲本命日支酉'));
  assert.equal(chongDay.grade, 'avoid');
  // 辛卯日与乙酉日柱天克地冲：只记反吟，不再单列冲日支。
  const fanYin = dayOf(result, '2026-11-13');
  assert.equal(fanYin.ganZhi, '辛卯');
  assert.ok(reasonTexts(fanYin).includes('天克地冲本命日柱乙酉'));
  assert.ok(!reasonTexts(fanYin).includes('冲本命日支酉'));
  assert.ok(fanYin.hardAvoid);
  // 丙午年里的子日为岁破。
  const suiPo = dayOf(result, '2026-10-29');
  assert.equal(suiPo.ganZhi, '丙子');
  assert.ok(reasonTexts(suiPo).includes('岁破（冲太岁午）'));
  assert.ok(suiPo.hardAvoid);
  // 建除「破」就是月破，只记一条。
  const poDay = dayOf(result, '2026-11-02');
  assert.equal(poDay.almanac.zhiXing, '破');
  assert.equal(reasonTexts(poDay).filter((text) => text.includes('月破')).length, 1);
  assert.ok(poDay.hardAvoid);
  // 黄历忌交易的日子对签约是硬忌。
  const jiDay = dayOf(result, '2026-10-31');
  assert.ok(jiDay.almanac.ji.includes('交易'));
  assert.ok(reasonTexts(jiDay).some((text) => text.startsWith('黄历忌')));
  assert.equal(jiDay.grade, 'avoid');
});

test('加分项：黄历宜、黄道值神、喜用干支、与日支六合', () => {
  const result = pickAuspiciousDays(chart, strength, { purpose: 'contract', days: 30, now: NOW });
  const good = dayOf(result, '2026-11-14');
  assert.equal(good.ganZhi, '壬辰');
  assert.ok(reasonTexts(good).includes('与本命日支酉六合'));
  assert.ok(reasonTexts(good).includes('日干壬水为喜用（印）'));
  assert.ok(reasonTexts(good).some((text) => text.includes('黄道')));
  assert.equal(good.grade, 'good');
  const yiDay = dayOf(result, '2026-11-06');
  assert.ok(reasonTexts(yiDay).some((text) => text.startsWith('黄历宜')));
  // 好日子先说加分项，坏日子先说减分项。
  assert.ok(sortReasons(good)[0].delta > 0);
  const bad = dayOf(result, '2026-10-29');
  assert.ok(sortReasons(bad)[0].delta < 0);
});

test('事务类型决定黄历宜忌的匹配；旺衰为空时不计喜忌', () => {
  const wedding = pickAuspiciousDays(chart, strength, { purpose: 'wedding', days: 60, now: NOW });
  const contract = pickAuspiciousDays(chart, strength, { purpose: 'contract', days: 60, now: NOW });
  assert.notDeepEqual(wedding.best.map((item) => item.date), contract.best.map((item) => item.date));
  assert.equal(findZeriPurpose('nonsense').value, 'general');
  assert.equal(ZERI_PURPOSES.length, 9);

  const noStrength = pickAuspiciousDays(chart, null, { purpose: 'general', days: 10, now: NOW });
  assert.ok(noStrength.days.every((item) => !item.reasons.some((reason) => reason.text.includes('喜用') || reason.text.includes('忌神'))));
});

test('自定义起始日期、范围上限与时辰不详', () => {
  const custom = pickAuspiciousDays(chart, strength, { purpose: 'moving', startDate: '2027-02-01', days: 10, now: NOW });
  assert.equal(custom.start, '2027-02-01');
  assert.equal(custom.end, '2027-02-10');
  assert.ok(custom.days.every((item) => !item.isToday));
  assert.equal(pickAuspiciousDays(chart, strength, { days: 500, now: NOW }).days.length, 120);
  assert.equal(pickAuspiciousDays(chart, strength, { startDate: 'bad', days: 3, now: NOW }).start, '2026-10-27');

  const unknown = buildBaziChart({ calendarType: 'solar', year: 1990, month: 5, day: 20, gender: 'male', timeMode: 'unknown' }, NOW);
  const result = pickAuspiciousDays(unknown, analyzeStrength(unknown), { purpose: 'general', days: 15, now: NOW });
  assert.equal(result.days.length, 15);
  assert.ok(result.days.every((item) => !item.reasons.some((reason) => reason.text.includes('时支'))));
});

test('择日清单文本', () => {
  const result = pickAuspiciousDays(chart, strength, { purpose: 'contract', days: 30, now: NOW });
  const text = formatZeriText(result, { personName: '测试', dayMaster: '乙木' });
  assert.match(text, /【择日参考 · 签约谈判】2026-10-27 至 2026-11-25/);
  assert.match(text, /命主：测试（日主乙木）/);
  assert.match(text, /较宜（\d+ 天）：/);
  assert.match(text, /需避开（\d+ 天）：/);
  assert.match(text, /11\/14 周六 壬辰日 · 佳 — 与本命日支酉六合/);
  assert.match(text, /10\/29 周四 丙子日 — 岁破（冲太岁午）/);
  assert.match(text, /请再请人工复核/);
  assert.equal(formatZeriText(null), '');
});
