/**
 * 浏览器端加载古籍库与术语词典：首次调用时按需下载数据块（所有 JSON 合成一块），之后复用。
 *
 *   const { library, glossary } = await loadClassicsLibrary();
 *   matchEntries(library, baziContextOf({ chart, strength, judge, relations }));
 *
 * 匹配与查询的纯函数见 ./library.js；Node 里的测试与校验脚本不走这里（用 scripts/lib/dataFiles.mjs 读文件）。
 */
import { buildGlossary, buildLibrary } from './library.js';

export * from './library.js';

let pending = null;

export const loadClassicsLibrary = () => {
  pending ??= import('./all.js')
    .then(({ CLASSICS_DOCS, GLOSSARY_DOCS }) => ({ library: buildLibrary(CLASSICS_DOCS), glossary: buildGlossary(GLOSSARY_DOCS) }))
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
};
