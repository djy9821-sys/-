/**
 * 读取 src/data 下的 JSON 数据文件（古籍条目、术语词典、经典命例），供校验脚本与单元测试共用。
 * 只在 Node 里用；浏览器端的加载另见 src/data/classics/index.js。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CLASSICS } from '../../src/data/classics.js';
import { validateCasesDoc, validateClassicsDoc, validateGlossaryDoc } from '../../src/data/classics/schema.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA_DIRS = Object.freeze({
  classics: path.join(ROOT, 'src', 'data', 'classics'),
  glossary: path.join(ROOT, 'src', 'data', 'glossary'),
  cases: path.join(ROOT, 'src', 'data', 'cases'),
});

const walkJson = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const visit = (current) => {
    fs.readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((item) => {
        const full = path.join(current, item.name);
        if (item.isDirectory()) visit(full);
        else if (item.isFile() && item.name.endsWith('.json')) out.push(full);
      });
  };
  visit(dir);
  return out;
};

/** 读出三类数据文件；JSON 解析失败的文件记在 parseErrors 里，不中断。 */
export const loadDataFiles = () => {
  const result = { classics: [], glossary: [], cases: [], parseErrors: [] };
  Object.entries(DATA_DIRS).forEach(([kind, dir]) => {
    walkJson(dir).forEach((full) => {
      const file = path.relative(ROOT, full);
      try {
        const doc = JSON.parse(fs.readFileSync(full, 'utf8'));
        result[kind].push({ file, doc });
      } catch (error) {
        result.parseErrors.push(`${file}: JSON 解析失败：${error.message}`);
      }
    });
  });
  return result;
};

/** 汇总所有错误（含解析错误）。 */
export const collectDataErrors = (files) => {
  const errors = [...files.parseErrors];
  const seenIds = new Set();
  const seenTerms = new Set();
  const seenCaseIds = new Set();
  files.classics.forEach(({ file, doc }) => errors.push(...validateClassicsDoc(doc, { file, seenIds })));
  files.glossary.forEach(({ file, doc }) => errors.push(...validateGlossaryDoc(doc, { file, seenTerms })));
  files.cases.forEach(({ file, doc }) => errors.push(...validateCasesDoc(doc, { file, seenIds: seenCaseIds })));
  return errors;
};

/** 统计条目数与状态，给校验脚本打印。 */
export const summarizeData = (files) => {
  const byBook = {};
  let total = 0;
  files.classics.forEach(({ doc }) => {
    const book = CLASSICS[doc?.classic]?.title ?? String(doc?.classic);
    const stat = (byBook[book] ??= { total: 0, draft: 0, translated: 0, reviewed: 0 });
    (Array.isArray(doc?.entries) ? doc.entries : []).forEach((entry) => {
      stat.total += 1;
      total += 1;
      if (entry && entry.status in stat) stat[entry.status] += 1;
    });
  });
  const count = (list) => list.reduce((sum, { doc }) => sum + (Array.isArray(doc?.entries) ? doc.entries.length : 0), 0);
  return {
    classics: { files: files.classics.length, total, byBook },
    glossary: { files: files.glossary.length, total: count(files.glossary) },
    cases: { files: files.cases.length, total: count(files.cases) },
  };
};
