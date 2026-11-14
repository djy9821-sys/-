/**
 * 藏经阁用的两样数据，整页的藏经阁（CangjingGe）和盖在批命页上的翻阅层（CangjingReader）共用：
 * - catalog：书架目录，构建时按古籍文件算好（见 scripts/lib/classicsCatalog.mjs），跟着页面一起到；
 * - loadEntries(module)：按门类取全文条目。古籍库的代码与全文等翻开一本书时才下载，下载过的各处共用。
 */
import catalog from 'virtual:classics-catalog';

export { catalog };

export const loadEntries = (module) => import('../../data/classics/index.js')
  .then(({ loadClassicsLibrary }) => loadClassicsLibrary(module))
  .then(({ library }) => library.entries);
