import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BAZI_CASES, LIUYAO_CASES, ZIWEI_CASES, summarizeBazi, summarizeLiuYao, summarizeZiwei } from '../scripts/golden-cases.mjs';

/*
 * 金样回归：固定命例的排盘摘要与 test/golden/*.json 逐字段比较。
 * 任何一处不同都说明算法输出变了——要么是无意的回归，要么是有意的口径调整；
 * 后者确认无误后运行 `node scripts/update-golden.mjs` 更新金样。
 */
const dir = resolve(dirname(fileURLToPath(import.meta.url)), 'golden');
const load = (module) => JSON.parse(readFileSync(resolve(dir, `${module}.json`), 'utf8'));
const HINT = '（确认是有意改动后运行 node scripts/update-golden.mjs 更新金样）';

test('八字金样：十二个固定命例的四柱、大运、旺衰、格局与金样一致', () => {
  const golden = load('bazi');
  assert.deepEqual(Object.keys(golden), BAZI_CASES.map((item) => item.id), '命例清单与金样不一致');
  BAZI_CASES.forEach((item) => {
    assert.deepEqual(summarizeBazi(item.input), golden[item.id].result, `八字 ${item.id}（${item.note}）${HINT}`);
  });
});

test('六爻金样：八个固定卦例的装卦与程序初判与金样一致', () => {
  const golden = load('liuyao');
  assert.deepEqual(Object.keys(golden), LIUYAO_CASES.map((item) => item.id), '卦例清单与金样不一致');
  LIUYAO_CASES.forEach((item) => {
    assert.deepEqual(summarizeLiuYao(item), golden[item.id].result, `六爻 ${item.id}（${item.note}）${HINT}`);
  });
});

test('紫微金样：十个固定命例的十二宫、星曜、十二神、大限小限与运限与金样一致', () => {
  const golden = load('ziwei');
  assert.deepEqual(Object.keys(golden), ZIWEI_CASES.map((item) => item.id), '命例清单与金样不一致');
  ZIWEI_CASES.forEach((item) => {
    assert.deepEqual(summarizeZiwei(item.input, item.fortuneDate), golden[item.id].result, `紫微 ${item.id}（${item.note}）${HINT}`);
  });
});
