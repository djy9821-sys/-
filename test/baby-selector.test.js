import test from 'node:test';
import assert from 'node:assert/strict';

import { findBestConceptionDates, scoreBabyChart } from '../src/utils/babySelector.js';
import { getHexagram } from '../src/utils/hexagramLogic.js';

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
