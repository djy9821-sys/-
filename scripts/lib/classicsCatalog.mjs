/**
 * 藏经阁的书架目录：构建时现算，不存成文件。
 *
 * 网页里这样取：
 *   import catalog from 'virtual:classics-catalog';   // { total, books: [{ key, module, entries, edition, chapters }] }
 *   import total from 'virtual:classics-total';       // { books, chapters, entries }，首页和封面只要这三个数
 * 这两个模块由下面的 Vite 插件在 npm run build / npm run dev 时按 src/data/classics 下的古籍文件算出来，
 * 所以录入、删改条目之后目录自然跟着变，不用另外生成、提交什么。
 * 书架和目录靠它直接显示，不必先下载几兆的古籍全文。
 *
 * 只在 Node 里用。这里和 ../../src/data/classics/shelf.js 都只引很小的几个文件，vite.config.js 加载得快。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '../../src/data/classics/shelf.js';
import { walkJson } from './walkJson.mjs';

export const CATALOG_MODULE_ID = 'virtual:classics-catalog';
export const TOTAL_MODULE_ID = 'virtual:classics-total';
const DEFAULT_DIR = fileURLToPath(new URL('../../src/data/classics/', import.meta.url));

/** 读一个目录下全部古籍文件（{ file, doc }）；有文件解析不了就报错，构建不该带着坏数据往下走。 */
export const readClassicsDocs = (dir = DEFAULT_DIR) => walkJson(dir).map((full) => {
  const file = path.relative(dir, full);
  try {
    return { file, doc: JSON.parse(fs.readFileSync(full, 'utf8')) };
  } catch (error) {
    throw new Error(`古籍文件解析失败：${file}：${error.message}`, { cause: error });
  }
});

/** 按古籍文件算出书架目录。 */
export const readClassicsCatalog = (dir = DEFAULT_DIR) => buildCatalog(readClassicsDocs(dir));

/** Vite 插件：提供 virtual:classics-catalog 与 virtual:classics-total 两个模块。 */
export const classicsCatalogPlugin = ({ dir = DEFAULT_DIR } = {}) => {
  // 按 Vite 的约定，插件自己生成的模块在内部用 \0 开头的 id，别的插件就不会去碰它。
  const internal = new Map([CATALOG_MODULE_ID, TOTAL_MODULE_ID].map((id) => [`\0${id}`, id]));
  return {
    name: 'gushupai-classics-catalog',
    // 排在 Vite 自己的解析之前：这两个名字不是文件也不是 npm 包，直接由这里认领。
    enforce: 'pre',
    resolveId(id) {
      return id === CATALOG_MODULE_ID || id === TOTAL_MODULE_ID ? `\0${id}` : null;
    },
    load(id) {
      const wanted = internal.get(id);
      if (!wanted) return null;
      const catalog = readClassicsCatalog(dir);
      return `export default ${JSON.stringify(wanted === TOTAL_MODULE_ID ? catalog.total : catalog)};\n`;
    },
  };
};
