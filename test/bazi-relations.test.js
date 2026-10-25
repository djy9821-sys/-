import test from 'node:test';
import assert from 'node:assert/strict';

import { findRelations, getStrongestRelationTone } from '../src/utils/baziRelations.js';

const pillar = (key, label, ganZhi) => ({ key, label, gan: ganZhi[0], zhi: ganZhi[1] });

// 1998-01-02 辰时男命
const NATAL = [
  pillar('year', '年柱', '丁丑'),
  pillar('month', '月柱', '壬子'),
  pillar('day', '日柱', '己酉'),
  pillar('time', '时柱', '戊辰'),
];

const titles = (relations) => relations.map(({ title }) => title);

test('流日甲戌：辰戌冲、甲己合、酉戌害、丑戌刑', () => {
  const relations = findRelations([...NATAL, pillar('liu-ri', '流日', '甲戌')], { focusKeys: ['liu-ri'] });
  const list = titles(relations);

  assert.ok(list.includes('辰戌冲'), list.join('，'));
  assert.ok(list.includes('甲己合（化土）'));
  assert.ok(list.includes('酉戌害'));
  assert.ok(list.includes('丑戌刑'));
  assert.equal(getStrongestRelationTone(relations), 'clash');
  // 原局内部的辰酉合不在关注范围内。
  assert.ok(!list.some((title) => title.startsWith('辰酉')));
});

test('2024 甲辰流年逢庚戌大运：天克地冲，并与时柱辰自刑', () => {
  const relations = findRelations([
    ...NATAL,
    pillar('da-yun', '大运', '庚戌'),
    pillar('liu-nian', '流年', '甲辰'),
  ], { focusKeys: ['da-yun', 'liu-nian'] });
  const list = titles(relations);

  assert.ok(list.includes('天克地冲'), list.join('，'));
  // 反吟已涵盖大运、流年之间的甲庚冲与辰戌冲，不再分开重复列出；
  // 大运戌冲时柱辰是另一组关系，仍然保留。
  assert.ok(!list.includes('甲庚冲'));
  assert.deepEqual(relations.filter(({ title }) => title === '辰戌冲').map(({ detail }) => detail), ['时柱辰 · 大运戌']);
  assert.ok(list.some((title) => title.startsWith('辰辰') && title.includes('自刑')));
});

test('同一关系多次出现时合并为一条并保留全部成员', () => {
  const relations = findRelations([
    ...NATAL,
    pillar('liu-yue', '流月', '戊戌'),
    pillar('liu-ri', '流日', '甲戌'),
  ], { focusKeys: ['liu-yue', 'liu-ri'] });
  const clashes = relations.filter(({ title }) => title === '辰戌冲');

  assert.equal(clashes.length, 1);
  assert.equal(clashes[0].detail, '时柱辰 · 流月戌、流日戌');
  assert.deepEqual(new Set(clashes[0].memberKeys), new Set(['time', 'liu-yue', 'liu-ri']));

  // 两侧都有多个成员时按字分组。
  const harm = relations.find(({ title }) => title === '酉戌害');
  assert.equal(harm.detail, '日柱酉 · 流月戌、流日戌');
  const withDaYun = findRelations([
    ...NATAL,
    pillar('da-yun', '大运', '己酉'),
    pillar('liu-yue', '流月', '戊戌'),
    pillar('liu-ri', '流日', '甲戌'),
  ], { focusKeys: ['da-yun', 'liu-yue', 'liu-ri'] }).find(({ title }) => title === '酉戌害');
  assert.equal(withDaYun.detail, '日柱酉、大运酉 · 流月戌、流日戌');
});

test('三合成局时不再重复列出半合', () => {
  const relations = findRelations([...NATAL, pillar('liu-nian', '流年', '戊申')], { focusKeys: ['liu-nian'] });
  const list = titles(relations);

  assert.ok(list.includes('申子辰三合水局'), list.join('，'));
  assert.ok(!list.some((title) => title.includes('半合')));
});

test('伏吟识别整柱相同，未设关注层时返回全部关系', () => {
  const echo = findRelations([...NATAL, pillar('liu-ri', '流日', '戊辰')], { focusKeys: ['liu-ri'] });
  assert.ok(titles(echo).includes('戊辰伏吟'));

  const all = findRelations(NATAL);
  assert.ok(titles(all).some((title) => title.includes('辰') && title.includes('合')));
  assert.ok(titles(all).includes('丁壬合（化木）'));
});
