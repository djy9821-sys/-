import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';

import { SHIDENG_LUN, findBestConceptionDates, scoreBabyChart } from '../src/utils/babySelector.js';
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

test('起居注打分按《全书·定富贵贫贱十等论》：三方宫位按 iztro 宫名找得到（官禄、财帛、迁移不带「宫」字）', () => {
  // 富贵论十四项（十一星、禄权科）合一项：80 × 1/14 ≈ 6
  assert.equal(scoreBabyChart('wealth', chartOf({ 财帛: { minorStars: [{ name: '左辅' }] } })).score, 6);
  assert.equal(scoreBabyChart('wealth', chartOf({ 迁移: { minorStars: [{ name: '左辅' }] } })).score, 6);
  // 文职论以昌曲辅弼魁钺坐命为本：命宫没坐，化科在官禄也不计
  assert.equal(scoreBabyChart('iq', chartOf({ 官禄: { majorStars: [{ name: '天机', mutagen: '科' }] } })).score, 0);
  // 文昌庙坐命、化科在官禄：聪明论 1/10 → 4，文职论合坐命、旺宫、化科 3/5 → 24
  const wen = scoreBabyChart('iq', chartOf({ 命宫: { minorStars: [{ name: '文昌', brightness: '庙' }] }, 官禄: { majorStars: [{ name: '天机', mutagen: '科' }] } }));
  assert.equal(wen.score, 28);
  assert.deepEqual(wen.lun[1].hits, ['文昌（庙）在命宫', '坐命旺宫', '化科（天机在官禄宫）']);
  // 文昌落陷坐命不算坐命，也不算聪明论的守照
  assert.equal(scoreBabyChart('iq', chartOf({ 命宫: { minorStars: [{ name: '文昌', brightness: '陷' }] } })).score, 0);
  // 武曲庙旺化权坐命：威勇论合坐命、化权 2/5 → 16，武职论合坐命、庙旺、化权 3/6 → 20
  const wu = scoreBabyChart('sport', chartOf({ 命宫: { majorStars: [{ name: '武曲', brightness: '庙', mutagen: '权' }] } }));
  assert.equal(wu.score, 36);
  assert.deepEqual(wu.lun.map(({ name, hits, need }) => [name, hits.length, need]), [['威勇论', 2, 5], ['武职论', 3, 6], ['贫贱论', 0, 9], ['疾夭论', 0, 9]]);
  // 武曲落陷不算坐命，威勇、武职两论都不计；贫贱论「诸凶并犯陷地」合一项（30 × 1/9 ≈ 3）
  const xian = scoreBabyChart('sport', chartOf({ 命宫: { majorStars: [{ name: '武曲', brightness: '陷', mutagen: '权' }] } }));
  assert.equal(xian.score, -3);
  assert.deepEqual(xian.lun.map((lun) => lun.seatOk), [false, false, null, null]);
  // 地空在命宫：贫贱、疾夭两论各合一项，各减 3
  assert.equal(scoreBabyChart('leader', chartOf({ 命宫: { minorStars: [{ name: '地空' }] } })).score, -6);
  // 疾厄宫见火星也算疾夭
  assert.equal(scoreBabyChart('leader', chartOf({ 疾厄: { minorStars: [{ name: '火星' }] } })).score, -3);
  // 带「照」「冲」的取四宫：聪明论「三合拱照」、富贵论「守照拱冲」连迁移一起看（帝王类两论各 40，合 1/14 ≈ 3）
  assert.equal(scoreBabyChart('iq', chartOf({ 迁移: { minorStars: [{ name: '文昌' }] } })).score, 4);
  assert.equal(scoreBabyChart('iq', chartOf({ 财帛: { minorStars: [{ name: '文昌' }] } })).score, 4);
  assert.equal(scoreBabyChart('leader', chartOf({ 迁移: { minorStars: [{ name: '文昌' }] } })).score, 3);
  // 只说「三方」「并拱」的取命、财、官三宫：威勇论「得权禄三方」、武职论「并拱」不看迁移；威勇论「紫微天府左右拱照」连迁移
  const seatWu = { 命宫: { majorStars: [{ name: '武曲', brightness: '庙' }] } };
  const quanAt = (palace) => scoreBabyChart('sport', chartOf({ ...seatWu, [palace]: { majorStars: [{ name: '贪狼', mutagen: '权' }] } })).lun.slice(0, 2).map((lun) => lun.hits.length);
  assert.deepEqual(quanAt('官禄'), [2, 3]);
  assert.deepEqual(quanAt('迁移'), [1, 2]);
  const ziAt = (palace) => scoreBabyChart('sport', chartOf({ ...seatWu, [palace]: { majorStars: [{ name: '紫微', brightness: '旺' }], minorStars: [{ name: '天魁' }] } })).lun.slice(0, 2).map((lun) => lun.hits.length);
  assert.deepEqual(ziAt('迁移'), [2, 2]);
  assert.deepEqual(ziAt('财帛'), [2, 3]);
  // 陶朱类另按定富局，每格加 10 分
  assert.equal(scoreBabyChart('wealth', chartOf({}), [{ name: '金灿光辉格', group: '定富局' }, { name: '紫府同宫格', group: '定贵局' }]).score, 10);
  // 不认识的类型按帝王类（富贵论、文职论）打分。
  assert.equal(scoreBabyChart('unknown', chartOf({ 命宫: { majorStars: [{ name: '紫微' }] } })).score, 3);
});

test('起居注引的十等论与古籍库原文逐字一致', () => {
  const doc = JSON.parse(readFileSync(new URL('../src/data/classics/ziwei/quanshu-ding-fugui-pinjian-shideng-lun.json', import.meta.url), 'utf8'));
  const originals = new Map(doc.entries.map((entry) => [entry.original.split('：')[0], entry.original.slice(entry.original.indexOf('：') + 1)]));
  for (const [name, text] of Object.entries(SHIDENG_LUN)) assert.equal(text, originals.get(name), name);
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
    assert.equal(item.aim, '富贵论、文职论所列星曜守照');
    assert.deepEqual(item.lun.map((lun) => lun.name), ['富贵论', '文职论', '贫贱论', '疾夭论']);
    assert.equal(item.desc, undefined);
  }
  const prompt = generateBabyPrompt('leader', {}, null, null, [
    { date: '2026-01-05', timeRange: '05:00-07:00', score: 45, stars: '⭐⭐⭐⭐', aim: '富贵论、文职论所列星曜守照', mingStars: ['紫微（庙）化权'], patterns: [{ name: '紫府同宫格', group: '定贵局' }], lun: [{ name: '富贵论', hits: ['紫微（庙）在命宫', '化权（紫微在命宫）'], need: 14 }, { name: '文职论', hits: ['化权（紫微在命宫）'], need: 5, seatOk: false }, { name: '贫贱论', hits: [], need: 9 }], birthDate: '2026-10-12' },
    { date: '2026-01-07', timeRange: '07:00-09:00', score: 30, stars: '⭐⭐⭐', aim: '富贵论、文职论所列星曜守照', mingStars: [], patterns: [], birthDate: '2026-10-14' },
  ]);
  assert.match(prompt, /命宫主星：\*\* 紫微（庙）化权/);
  assert.match(prompt, /全书格局：\*\* 紫府同宫格（定贵局）/);
  assert.match(prompt, /全书格局：\*\* 未见《紫微斗数全书》所列格局/);
  assert.match(prompt, /命宫主星：\*\* 无正曜/);
  assert.match(prompt, /十等论：\*\* 富贵论合 2\/14（紫微（庙）在命宫、化权（紫微在命宫））；文职论命宫未坐所列之星，不计；贫贱论（减分）合 0\/9\n/);
  assert.match(prompt, /十等论：\*\* —/);
  assert.match(prompt, /不是原文逐字的定义/);
  for (const name of ['富贵论', '文职论', '贫贱论', '疾夭论']) assert.ok(prompt.includes(SHIDENG_LUN[name]), name);
  assert.ok(!prompt.includes(SHIDENG_LUN.聪明论));
  assert.doesNotMatch(prompt, /格局特征|满分50分|Perfect Match|Top 3/);
  assert.doesNotMatch(prompt, /风水助运|优生优育专家/);
  assert.match(prompt, /不涉及风水、改运之说/);
});
