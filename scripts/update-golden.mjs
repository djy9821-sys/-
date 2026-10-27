/**
 * 重新生成 test/golden/*.json（固定命例的排盘金样）。
 *
 * 只有在确认算法改动是有意为之（例如修正了一个流派口径）时才运行；运行后把 json 的差异看一遍再提交。
 *   node scripts/update-golden.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGolden } from './golden-cases.mjs';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../test/golden');
mkdirSync(dir, { recursive: true });
const golden = buildGolden();
Object.entries(golden).forEach(([module, cases]) => {
  const file = resolve(dir, `${module}.json`);
  writeFileSync(file, `${JSON.stringify(cases, null, 2)}\n`);
  console.log(`写入 ${file}（${Object.keys(cases).length} 例）`);
});
