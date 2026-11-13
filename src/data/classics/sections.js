/**
 * 一个古籍文件里的「篇」：文件录了哪几篇、一条属于哪一篇。
 *
 * 单独放一个文件：书架目录（./shelf.js，以及构建时的 scripts/lib/classicsCatalog.mjs）只用这两个函数，
 * 不必带上整套校验规则。./schema.js 照旧把它们导出，原来的引用不用改。
 */
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

/** 一个文件录了几篇时，section 用「、」把各篇名列出来；返回篇名数组。 */
export const chaptersOf = (doc) => String(doc?.section ?? '').split('、').map((name) => name.trim()).filter(Boolean);

/**
 * 一条属于哪一篇：条目自带 section 优先；一文件多篇时按 title 的「篇名·其N」前缀归篇；单篇文件就是文件的 section。
 * 多篇文件里既没写 section、title 前缀也对不上任何一篇时返回 null。
 */
export const sectionOfEntry = (entry, doc, chapters = chaptersOf(doc)) => {
  if (isNonEmptyString(entry?.section)) return entry.section.trim();
  if (chapters.length <= 1) return isNonEmptyString(doc?.section) ? doc.section : null;
  const head = String(entry?.title ?? '').split('·')[0].trim();
  return chapters.includes(head) ? head : null;
};
