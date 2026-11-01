/**
 * 六爻古籍（src/data/classics/liuyao/*.json）的按需加载块。
 * 只由 ../index.js 的 loadClassicsLibrary('liuyao') 动态 import；页面别直接引用，否则古籍会被打进首屏。
 */
const modules = import.meta.glob('../liuyao/*.json', { eager: true, import: 'default' });

export const DOCS = Object.keys(modules).sort().map((file) => ({ file, doc: modules[file] }));
