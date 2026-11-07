import test from 'node:test';
import assert from 'node:assert/strict';

import { findBestConceptionDates, scoreBabyChart } from '../src/utils/babySelector.js';
import { getHexagram } from '../src/utils/hexagramLogic.js';
import { generateBabyPrompt } from '../src/utils/aiPrompts.js';
import { createZiweiHoroscope } from '../src/utils/ziweiBirth.js';
import { analyzeZiweiPatterns } from '../src/utils/ziweiPatterns.js';

// iztro 的宫名：命宫带「宫」，其余不带（官禄、财帛、迁移、田宅）。
const chartOf = (palaces) => ({
  palaces: ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母'].map((name) => ({
    name,
    majorStars: [],
    minorStars: [],
    ...(palaces[name] ?? {}),
  })),
});

test('起居注打分：三方宫位按 iztro 宫名找得到（官禄、财帛、迁移、田宅不带「宫」字）', () => {
  assert.equal(scoreBabyChart('wealth', chartOf({ 财帛: { minorStars: [{ name: '禄存' }] } })).score, 20);
  assert.equal(scoreBabyChart('wealth', chartOf({ 田宅: { minorStars: [{ name: '禄存' }] } })).score, 15);
  assert.equal(scoreBabyChart('wealth', chartOf({ 财帛: { minorStars: [{ name: '地空' }] } })).score, -50);
  assert.equal(scoreBabyChart('leader', chartOf({ 官禄: { majorStars: [{ name: '武曲', mutagen: '权' }] } })).score, 20);
  assert.equal(scoreBabyChart('leader', chartOf({ 迁移: { minorStars: [{ name: '左辅' }] } })).score, 10);
  assert.equal(scoreBabyChart('iq', chartOf({ 官禄: { majorStars: [{ name: '天机', mutagen: '科' }] } })).score, 20);
  // 不认识的类型按 leader 打分。
  assert.equal(scoreBabyChart('unknown', chartOf({ 命宫: { majorStars: [{ name: '紫微' }] } })).score, 20);
});

test('起居注日期按本地日历：清晨也不会差一天，预产期为受孕日加 280 天', async () => {
  const today = new Date(2026, 0, 5, 7, 0);
  const results = await findBestConceptionDates('wealth', 5, today);
  assert.ok(results.length > 0);
  results.forEach((item) => {
    const [y, m, d] = item.date.split('-').map(Number);
    const conception = new Date(y, m - 1, d);
    assert.ok(conception >= new Date(2026, 0, 5) && conception <= new Date(2026, 0, 17), item.date);
    const birth = new Date(conception);
    birth.setDate(birth.getDate() + 280);
    const expected = `${birth.getFullYear()}-${String(birth.getMonth() + 1).padStart(2, '0')}-${String(birth.getDate()).padStart(2, '0')}`;
    assert.equal(item.birthDate, expected);
    assert.ok(item.score > 0 && item.rating >= 1 && item.rating <= 5);
  });
  assert.deepEqual(results.map((item) => item.score), [...results.map((item) => item.score)].sort((a, b) => b - a));
});

test('卦象查表：自下而上兑下离上为火泽睽', () => {
  assert.equal(getHexagram([1, 1, 0, 1, 0, 1]).name, '火泽睽');
  assert.equal(getHexagram([1, 1, 1, 1, 1, 1]).name, '乾为天');
  assert.equal(getHexagram([0, 0, 0, 0, 0, 0]).name, '坤为地');
  assert.equal(getHexagram([1, 1]), null);
});

test('起居注的「格局」是预产期命盘按《紫微斗数全书》实际核出的格局，不再把打分方向当成已成格局', async () => {
  const results = await findBestConceptionDates('leader', 3, new Date(2026, 0, 5, 7, 0));
  assert.ok(results.length > 0);
  for (const item of results) {
    const horoscope = createZiweiHoroscope({ calendarType: 'solar', birthDate: item.birthDate, timeIndex: item.timeIndex, gender: 'male' });
    assert.deepEqual(item.patterns.map((pattern) => pattern.name), analyzeZiweiPatterns(horoscope).map((pattern) => pattern.name));
    const ming = horoscope.palaces.find((palace) => palace.name === '命宫');
    assert.deepEqual(item.mingStars.map((text) => text.replace(/（.*$|化.$/, '')), ming.majorStars.map((star) => star.name));
    assert.equal(item.aim, '紫府坐命/百官朝拱/权禄巡逢');
    assert.equal(item.desc, undefined);
  }
  const prompt = generateBabyPrompt('leader', {}, null, null, [
    { date: '2026-01-05', timeRange: '05:00-07:00', score: 45, stars: '⭐⭐⭐⭐', aim: '紫府坐命/百官朝拱/权禄巡逢', mingStars: ['紫微（庙）化权'], patterns: [{ name: '紫府同宫格', group: '定贵局' }], birthDate: '2026-10-12' },
    { date: '2026-01-07', timeRange: '07:00-09:00', score: 30, stars: '⭐⭐⭐', aim: '紫府坐命/百官朝拱/权禄巡逢', mingStars: [], patterns: [], birthDate: '2026-10-14' },
  ]);
  assert.match(prompt, /命宫主星：\*\* 紫微（庙）化权/);
  assert.match(prompt, /全书格局：\*\* 紫府同宫格（定贵局）/);
  assert.match(prompt, /全书格局：\*\* 未见《紫微斗数全书》所列格局/);
  assert.match(prompt, /命宫主星：\*\* 无正曜/);
  assert.match(prompt, /不是古籍条文/);
  assert.doesNotMatch(prompt, /格局特征|满分50分|Perfect Match|Top 3/);
});
