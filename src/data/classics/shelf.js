/**
 * 藏经阁的书架与目录：把古籍文件按原书次第排好，归成「书 → 篇 → 条」。
 *
 * 都是纯函数，浏览器与 Node 通用。书架目录（每本书有哪些篇、每篇几条）由 buildCatalog 算出：
 * 构建时 scripts/lib/classicsCatalog.mjs 读古籍文件算好，网页用 import catalog from 'virtual:classics-catalog' 取，
 * 所以书架和目录不必先下载全文就能显示，录入新条目后也不用另外生成什么。
 * 这里只引登记表和「篇」的两个小函数，别引 ./schema.js、./library.js（会把整套校验和匹配带进来）。
 */
import { CLASSICS } from '../classics.js';
import { chaptersOf, sectionOfEntry } from './sections.js';

/**
 * 文件名按拼音排不是书里的先后，这里按原书次第列出。
 * 没列的文件排在后面：先按卷次，再按文件名。
 */
export const DOC_ORDER = Object.freeze([
  // 《滴天髓》：通神论 → 六亲论 → 任铁樵阐微的六亲论
  'ditian-tongshen', 'ditian-liuqin', 'ditian-renzhu-liuqin',
  // 《穷通宝鉴》：五行总论 → 十干依甲乙丙丁戊己庚辛壬癸
  'qiongtong-wuxing', 'qiongtong-jia', 'qiongtong-yi', 'qiongtong-bing', 'qiongtong-ding', 'qiongtong-wu',
  'qiongtong-ji', 'qiongtong-geng', 'qiongtong-xin', 'qiongtong-ren', 'qiongtong-gui',
  // 《子平真诠》：干支 → 用神 → 成败救应 → 行运 → 八格
  'ziping-ganzhi', 'ziping-yongshen', 'ziping-chengbai', 'ziping-xingyun', 'ziping-bage',
  // 《增删卜易》：卷一二总论 → 卷三黄金策 → 各门占法
  'zengshan-zonglun', 'zengshan-huangjin', 'zengshan-zhanfa-1', 'zengshan-zhanfa-2', 'zengshan-zhanfa-3',
  // 《紫微斗数全书》卷一开头几篇
  'quanshu-taiwei-fu', 'quanshu-xingxing-fu', 'quanshu-xingyuan-lun', 'quanshu-doushu-zhunsheng',
  'quanshu-doushu-fawei-lun', 'quanshu-chongbu-doushu-goulv', 'quanshu-zengbu-taiwei-fu', 'quanshu-zhuxing-wenda',
]);

/** 这些文件的篇目不分卷显示：同一章跨几个文件连着录，按章名合成一篇。 */
const FLAT_DOCS = new Set(['zengshan-zonglun', 'zengshan-huangjin', 'zengshan-zhanfa-1', 'zengshan-zhanfa-2', 'zengshan-zhanfa-3']);
const VOLUME_RANK = Object.freeze(['卷一', '卷二', '卷三', '卷四', '卷五', '卷六', '卷七', '卷八']);

/** 文件名去掉目录与扩展名：'../bazi/ditian-liuqin.json' → 'ditian-liuqin'。 */
export const stemOf = (file = '') => String(file).split(/[\\/]/).pop().replace(/\.json$/, '');

const rankOf = ({ file, doc }) => {
  const stem = stemOf(file);
  const listed = DOC_ORDER.indexOf(stem);
  const volume = VOLUME_RANK.findIndex((name) => String(doc?.volume ?? '').startsWith(name));
  return [listed < 0 ? DOC_ORDER.length : listed, volume < 0 ? VOLUME_RANK.length : volume, stem];
};

/** 按原书次第排文件（{ file, doc } 列表）。 */
export const orderDocs = (docs) => [...(docs ?? [])].sort((x, y) => {
  const a = rankOf(x);
  const b = rankOf(y);
  return (a[0] - b[0]) || (a[1] - b[1]) || a[2].localeCompare(b[2]);
});

/** 条目（来自 buildLibrary）按原书次第重排：先按所在文件的次第，同一文件里保持原来的先后。 */
export const orderEntries = (entries) => (entries ?? [])
  .map((entry, index) => ({ entry, index, rank: rankOf({ file: entry.file, doc: { volume: entry.volume } }) }))
  .sort((x, y) => (x.rank[0] - y.rank[0]) || (x.rank[1] - y.rank[1]) || x.rank[2].localeCompare(y.rank[2]) || (x.index - y.index))
  .map((item) => item.entry);

/** 一篇在目录里归到哪个卷名下；不分卷的文件为空串。 */
export const groupOf = (file, volume = '') => (FLAT_DOCS.has(stemOf(file)) ? '' : String(volume ?? ''));
/** 篇的键：同一本书里，卷名加篇名唯一。 */
export const chapterKey = (group, name) => `${group ?? ''}|${name ?? ''}`;
/** 条目（来自 buildLibrary，带 file、volume、section）属于哪一篇。 */
export const chapterKeyOfEntry = (entry) => chapterKey(groupOf(entry?.file, entry?.volume), entry?.section);

/** 文件里的底本说明只取来源那一句；分号后面是校录过程的记录，不给读者看。登记表里没写 edition 的书才用它。 */
export const editionLineOf = (edition) => String(edition ?? '').split('；')[0].trim();

/**
 * 生成书架目录：每本书的篇目（按原书次第）、每篇条数、全书条数。登记了还没录的书也在，条数为 0。
 * @param {{ file: string, doc: object }[]} docs 古籍文件
 */
export const buildCatalog = (docs) => {
  // 底本说明：登记表里给读者写好的那一句优先；没写的，取这本书第一个文件里的来源句。
  const books = Object.values(CLASSICS).map((classic) => ({ key: classic.key, module: classic.module, entries: 0, edition: classic.edition ?? '', chapters: [] }));
  const byKey = new Map(books.map((book) => [book.key, book]));
  for (const { file, doc } of orderDocs((docs ?? []).filter((item) => item?.doc && Array.isArray(item.doc.entries)))) {
    const book = byKey.get(doc.classic);
    if (!book) continue;
    if (!book.edition) book.edition = editionLineOf(doc.edition);
    const names = chaptersOf(doc);
    const group = groupOf(file, doc.volume);
    for (const entry of doc.entries) {
      if (!entry || typeof entry !== 'object') continue;
      const name = sectionOfEntry(entry, doc, names) ?? doc.section ?? '';
      const key = chapterKey(group, name);
      let chapter = book.chapters.find((item) => chapterKey(item.group, item.name) === key);
      if (!chapter) {
        chapter = { name, group, count: 0 };
        book.chapters.push(chapter);
      }
      chapter.count += 1;
      book.entries += 1;
    }
  }
  const shelved = books.filter((book) => book.entries > 0);
  return {
    total: { books: shelved.length, chapters: shelved.reduce((n, book) => n + book.chapters.length, 0), entries: shelved.reduce((n, book) => n + book.entries, 0) },
    books,
  };
};

/** 某一篇的全部条目，按书里的先后。 */
export const entriesOfChapter = (entries, bookKey, chapter) => {
  const key = chapterKey(chapter?.group, chapter?.name);
  return (entries ?? []).filter((entry) => entry.classic === bookKey && chapterKeyOfEntry(entry) === key);
};

/** 一条在这本书目录里的第几篇；找不到返回 -1。 */
export const chapterIndexOfEntry = (book, entry) => {
  const key = chapterKeyOfEntry(entry);
  return (book?.chapters ?? []).findIndex((chapter) => chapterKey(chapter.group, chapter.name) === key);
};

/** 条目 id 的第一段就是书的 key：'qiongtong.jia.002' → 'qiongtong'。 */
export const bookKeyOfEntryId = (id = '') => String(id).split('.')[0];

/** 原文拆成正文与「原注」（古书里夹在正文下的小注），阅读时分开排。 */
export const splitOriginal = (text) => {
  const lines = String(text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
  return { main: lines.filter((line) => !line.startsWith('原注')), notes: lines.filter((line) => line.startsWith('原注')) };
};

/** 地址里问号后面的部分 ↔ 要翻到的地方：e=条目 id，或 b=书&c=第几篇。 */
export const parseShelfQuery = (query = '') => {
  const params = new URLSearchParams(String(query).replace(/^\?/, ''));
  const chapter = params.get('c');
  return { entry: params.get('e') || null, book: params.get('b') || null, chapter: chapter !== null && /^\d+$/.test(chapter) ? Number(chapter) : null };
};
export const shelfQueryOf = ({ entry = null, book = null, chapter = null } = {}) => {
  if (entry) return `e=${encodeURIComponent(entry)}`;
  if (!book) return '';
  return chapter === null || chapter === undefined ? `b=${book}` : `b=${book}&c=${chapter}`;
};

/** 在目录里找：书名、篇名含这几个字的。不用下载全文。 */
export const searchCatalog = (catalog, text) => {
  const query = String(text ?? '').trim();
  if (!query) return [];
  const hits = [];
  for (const book of catalog?.books ?? []) {
    if (!book.entries) continue;
    const title = CLASSICS[book.key]?.title ?? book.key;
    if (title.includes(query)) hits.push({ kind: 'book', book: book.key, title });
    book.chapters.forEach((chapter, index) => {
      if (chapter.name.includes(query)) hits.push({ kind: 'chapter', book: book.key, title, chapter: index, name: chapter.name, count: chapter.count });
    });
  }
  return hits;
};

/** 在已下载的条目里找原文或白话含这几个字的，带前后一小段。 */
export const searchEntries = (entries, text, limit = 30) => {
  const query = String(text ?? '').trim();
  if (!query) return [];
  const hits = [];
  for (const entry of entries ?? []) {
    const field = entry.original?.includes(query) ? entry.original : entry.vernacular?.includes(query) ? entry.vernacular : null;
    if (!field) continue;
    const flat = field.replace(/\n/g, ' ');
    const at = flat.indexOf(query);
    const from = Math.max(0, at - 10);
    const to = Math.min(flat.length, at + query.length + 26);
    hits.push({ entry, before: (from > 0 ? '…' : '') + flat.slice(from, at), match: query, after: flat.slice(at + query.length, to) + (to < flat.length ? '…' : '') });
    if (hits.length >= limit) break;
  }
  return hits;
};
