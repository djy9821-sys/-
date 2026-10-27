/**
 * 把 src/data/classics 下所有古籍 JSON 与 src/data/glossary 下的术语词典一次性打进一个按需加载的块。
 * 只由 index.js 动态 import，不要从页面直接引用，否则古籍库会被打进首屏。
 */
const classicsModules = import.meta.glob('./**/*.json', { eager: true, import: 'default' });
const glossaryModules = import.meta.glob('../glossary/*.json', { eager: true, import: 'default' });

const toDocs = (modules) => Object.keys(modules).sort().map((file) => ({ file, doc: modules[file] }));

export const CLASSICS_DOCS = toDocs(classicsModules);
export const GLOSSARY_DOCS = toDocs(glossaryModules);
