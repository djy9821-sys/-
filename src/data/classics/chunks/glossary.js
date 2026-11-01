/**
 * 术语白话词典（src/data/glossary/*.json，八字、紫微、六爻与通用词共一块）的按需加载块。
 * 只由 ../index.js 的 loadGlossary() 动态 import。
 */
const modules = import.meta.glob('../../glossary/*.json', { eager: true, import: 'default' });

export const DOCS = Object.keys(modules).sort().map((file) => ({ file, doc: modules[file] }));
