import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiuYaoReading } from '../src/utils/liuyao.js';
import { castByNumbers, castByTime, MANUAL_LINE_OPTIONS, TRIGRAM_ORDER, valuesFromTrigrams } from '../src/utils/liuyaoCast.js';

test('先天八卦数与爻值：上乾下坤动初爻为天地否', () => {
  assert.deepEqual(TRIGRAM_ORDER, ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']);
  const values = valuesFromTrigrams(1, 8, 1);
  assert.deepEqual(values, [6, 8, 8, 7, 7, 7]);
  const reading = buildLiuYaoReading(values, new Date(2026, 9, 26, 10, 0));
  assert.equal(reading.hexagram.name, '天地否');
  assert.deepEqual(reading.movingPositions, [1]);
  assert.throws(() => valuesFromTrigrams(9, 1, 1));
  assert.throws(() => valuesFromTrigrams(1, 1, 7));
});

test('报数起卦：除 8 取上下卦，和除 6 取动爻', () => {
  const result = castByNumbers(37, 58);
  assert.equal(result.upperIndex, 5); // 巽
  assert.equal(result.lowerIndex, 2); // 兑
  assert.equal(result.movingPosition, 5); // 95 % 6
  assert.deepEqual(result.values, [7, 7, 8, 8, 9, 7]);
  assert.match(result.note, /上卦巽（风）/);
  assert.match(result.note, /动五爻/);
  // 整除取 8 与 6
  const exact = castByNumbers(8, 16);
  assert.equal(exact.upperIndex, 8);
  assert.equal(exact.lowerIndex, 8);
  assert.equal(exact.movingPosition, 6);
  assert.throws(() => castByNumbers(0, 3));
  assert.throws(() => castByNumbers(3.5, 3));
  assert.throws(() => castByNumbers(10000, 3));
});

test('时间起卦：农历年支数+月+日取上卦，再加时辰数取下卦与动爻', () => {
  // 2026-10-26 13:47 = 农历丙午年九月十七 未时：年午7 + 月9 + 日17 = 33 → 余1 乾；+时未8 = 41 → 余1 乾，41 % 6 = 5
  const result = castByTime(new Date(2026, 9, 26, 13, 47));
  assert.equal(result.upperIndex, 1);
  assert.equal(result.lowerIndex, 1);
  assert.equal(result.movingPosition, 5);
  assert.deepEqual(result.values, [7, 7, 7, 7, 9, 7]);
  assert.match(result.note, /年7\+月9\+日17=33/);
  const reading = buildLiuYaoReading(result.values, new Date(2026, 9, 26, 13, 47), { method: 'time', castNote: result.note });
  assert.equal(reading.hexagram.name, '乾为天');
  assert.equal(reading.changed.name, '火天大有');
  assert.equal(reading.castNote, result.note);
});

test('手动录卦选项覆盖四种爻值', () => {
  assert.deepEqual(MANUAL_LINE_OPTIONS.map((option) => option.value).sort(), [6, 7, 8, 9]);
  assert.equal(MANUAL_LINE_OPTIONS.find((option) => option.value === 9).coins, '三背');
  assert.equal(MANUAL_LINE_OPTIONS.find((option) => option.value === 6).coins, '三字');
});
