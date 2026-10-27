import test from 'node:test';
import assert from 'node:assert/strict';

import { buildShenshaContext, getShensha } from '../src/utils/baziShensha.js';

const pillar = (key, ganZhi) => ({ key, gan: ganZhi[0], zhi: ganZhi[1] });
// 1998-01-02 辰时男命：丁丑 壬子 己酉 戊辰
const context = buildShenshaContext([
  pillar('year', '丁丑'), pillar('month', '壬子'), pillar('day', '己酉'), pillar('time', '戊辰'),
]);
const of = (ganZhi) => getShensha(pillar('x', ganZhi), context);

// 期望值与问真八字对同一命盘给出的神煞一致（问真另有的童子、九丑等不在本表范围内）。
test('本命四柱神煞与问真一致', () => {
  assert.deepEqual(of('丁丑'), ['太极贵人', '月德合', '华盖']);
  assert.deepEqual(of('壬子'), ['天乙贵人', '月德贵人', '德秀贵人']);
  assert.deepEqual(of('己酉'), ['天乙贵人', '太极贵人', '文昌贵人', '天厨贵人', '德秀贵人', '将星']);
  assert.deepEqual(of('戊辰'), ['太极贵人', '德秀贵人', '红艳']);
});

test('大运与流年神煞与问真一致', () => {
  assert.deepEqual(of('己酉'), ['天乙贵人', '太极贵人', '文昌贵人', '天厨贵人', '德秀贵人', '将星']);
  assert.deepEqual(of('丙午'), ['天厨贵人', '德秀贵人', '禄神', '桃花']);
});

test('红鸾天喜、驿马与羊刃', () => {
  // 丑年：红鸾在寅，天喜在申；巳酉丑驿马在亥。
  assert.ok(of('甲寅').includes('红鸾'));
  assert.ok(of('庚申').includes('天喜'));
  assert.ok(of('乙亥').includes('驿马'));
  // 己为阴干，不取羊刃。
  assert.ok(!of('辛未').includes('羊刃'));
  const yangContext = buildShenshaContext([pillar('year', '甲子'), pillar('month', '丙寅'), pillar('day', '甲寅'), pillar('time', '丙寅')]);
  assert.ok(getShensha(pillar('x', '丁卯'), yangContext).includes('羊刃'));
});
