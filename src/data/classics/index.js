/**
 * 浏览器端加载古籍库与术语词典：按模块分块、按需下载，下载过的复用。
 *
 *   const { library, glossary } = await loadClassicsLibrary('bazi');   // 只下八字的古籍 + 词典
 *   matchEntries(library, baziContextOf({ chart, strength, judge, relations }));
 *   const glossary = await loadGlossary();                              // 只要词典
 *
 * 古籍按 src/data/classics/<模块>/ 目录分成八字、紫微、六爻三块（chunks/*.js），词典单独一块；
 * 看八字盘不用下紫微、六爻的原文。匹配与查询的纯函数见 ./library.js；
 * Node 里的测试与校验脚本不走这里（用 scripts/lib/dataFiles.mjs 读文件）。
 */
import { buildGlossary, buildLibrary } from './library.js';

export * from './library.js';

const CHUNKS = Object.freeze({
  bazi: () => import('./chunks/bazi.js'),
  ziwei: () => import('./chunks/ziwei.js'),
  liuyao: () => import('./chunks/liuyao.js'),
});

/** 古籍库分块的模块名。 */
export const CLASSICS_MODULES = Object.freeze(Object.keys(CHUNKS));

const cache = new Map();
/** 同一个键只下载一次；失败的不缓存，下次再试。 */
const once = (key, factory) => {
  if (!cache.has(key)) {
    cache.set(key, factory().catch((error) => {
      cache.delete(key);
      throw error;
    }));
  }
  return cache.get(key);
};

/** 术语词典（三个模块与通用词共用一块）。 */
export const loadGlossary = () => once('glossary', () => import('./chunks/glossary.js').then(({ DOCS }) => buildGlossary(DOCS)));

/**
 * 古籍库与词典。
 * @param {'bazi'|'ziwei'|'liuyao'|null} [module] 只下这个模块的古籍；不传则三个模块都下
 * @returns {Promise<{ library: object, glossary: object }>}
 */
export const loadClassicsLibrary = (module = null) => {
  const modules = module ? [module] : CLASSICS_MODULES;
  if (modules.some((name) => !CHUNKS[name])) return Promise.reject(new Error(`古籍库没有「${module}」这个模块`));
  return once(`library:${modules.join('+')}`, () => Promise.all([loadGlossary(), ...modules.map((name) => CHUNKS[name]())])
    .then(([glossary, ...chunks]) => ({ library: buildLibrary(chunks.flatMap((chunk) => chunk.DOCS)), glossary })));
};
