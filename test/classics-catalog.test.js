// 藏经阁的书架目录：篇目按原书次第、每条都归得到一篇；构建时的目录模块给出的就是这份目录。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadDataFiles } from '../scripts/lib/dataFiles.mjs';
import { CATALOG_MODULE_ID, TOTAL_MODULE_ID, classicsCatalogPlugin, readClassicsCatalog } from '../scripts/lib/classicsCatalog.mjs';
import { buildLibrary } from '../src/data/classics/library.js';
import { CLASSICS } from '../src/data/classics.js';
import {
  bookKeyOfEntryId, buildCatalog, chapterIndexOfEntry, editionLineOf, entriesOfChapter, orderDocs, orderEntries, parseShelfQuery,
  searchCatalog, searchEntries, shelfQueryOf, splitOriginal, stemOf,
} from '../src/data/classics/shelf.js';

const docs = loadDataFiles().classics;
const catalog = buildCatalog(docs);
const library = buildLibrary(orderDocs(docs));
const bookOf = (key) => catalog.books.find((book) => book.key === key);

test('构建时给网页的目录模块：整份目录与只有三个数的总计，都是按古籍文件现算的', () => {
  assert.deepEqual(readClassicsCatalog(), catalog);
  const plugin = classicsCatalogPlugin();
  const valueOf = (id) => {
    const internal = plugin.resolveId(id);
    assert.ok(internal.startsWith('\0'), '插件自己生成的模块，内部 id 以 \\0 开头');
    const code = plugin.load(internal);
    assert.match(code, /^export default \{/);
    return JSON.parse(code.replace(/^export default /, '').replace(/;\s*$/, ''));
  };
  assert.deepEqual(valueOf(CATALOG_MODULE_ID), catalog);
  assert.deepEqual(valueOf(TOTAL_MODULE_ID), catalog.total);
  // 别的模块不归它管
  assert.equal(plugin.resolveId('react'), null);
  assert.equal(plugin.load('/src/main.jsx'), null);
  // 配置里接上了，页面也只从这两个名字取
  assert.match(readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8'), /classicsCatalogPlugin\(/);
  assert.match(readFileSync(new URL('../src/data/classicsTotal.js', import.meta.url), 'utf8'), /from 'virtual:classics-total'/);
  assert.match(readFileSync(new URL('../src/components/cangjing/cangjingData.js', import.meta.url), 'utf8'), /from 'virtual:classics-catalog'/);
});

test('书架目录不带进整套校验与匹配代码（只引登记表和分篇的小函数）', () => {
  const imports = (file) => [...readFileSync(new URL(file, import.meta.url), 'utf8').matchAll(/^import\b[^;]*?from '([^']+)'/gm)].map((match) => match[1]);
  assert.deepEqual(imports('../src/data/classics/shelf.js').sort(), ['../classics.js', './sections.js']);
  assert.deepEqual(imports('../src/data/classics/sections.js'), []);
});

test('登记表里的书都在架上；条数与古籍库对得上', () => {
  assert.deepEqual(catalog.books.map((book) => book.key), Object.keys(CLASSICS));
  for (const book of catalog.books) assert.equal(book.module, CLASSICS[book.key].module, book.key);
  assert.equal(catalog.total.entries, library.total);
  assert.equal(catalog.total.entries, catalog.books.reduce((n, book) => n + book.entries, 0));
  assert.equal(catalog.total.chapters, catalog.books.reduce((n, book) => n + book.chapters.length, 0));
  assert.equal(catalog.total.books, catalog.books.filter((book) => book.entries > 0).length);
  for (const book of catalog.books) assert.equal(book.entries, book.chapters.reduce((n, chapter) => n + chapter.count, 0), book.key);
});

test('每一条都归得到目录里的一篇，篇里的条数与目录一致', () => {
  for (const entry of library.entries) {
    assert.equal(bookKeyOfEntryId(entry.id), entry.classic, entry.id);
    assert.ok(chapterIndexOfEntry(bookOf(entry.classic), entry) >= 0, entry.id);
  }
  for (const book of catalog.books) for (const chapter of book.chapters) {
    assert.equal(entriesOfChapter(library.entries, book.key, chapter).length, chapter.count, `${book.key} ${chapter.group} ${chapter.name}`);
  }
});

test('篇目按原书次第，不按文件名', () => {
  const head = (key, n) => bookOf(key).chapters.slice(0, n).map((chapter) => chapter.name);
  assert.deepEqual(head('ditian', 4), ['天道', '地道', '人道', '知命']);
  assert.equal(head('ziwei', 1)[0], '太微赋');
  assert.equal(head('zengshan', 1)[0], '八卦图');
  assert.equal(head('qiongtong', 1)[0], '五行总论');
  assert.equal(head('ziping', 1)[0], '论十干十二支');
  // 排文件：列了次第的在前，按列的先后
  assert.deepEqual(orderDocs(docs).filter(({ doc }) => doc.classic === 'ditian').map(({ file }) => stemOf(file)), ['ditian-tongshen', 'ditian-liuqin', 'ditian-renzhu-liuqin']);
});

test('网页里古籍按文件名的顺序到手，重排后与按原书次第建的库一样', () => {
  const byName = buildLibrary([...docs].sort((x, y) => x.file.localeCompare(y.file)));
  assert.deepEqual(orderEntries(byName.entries).map((entry) => entry.id), library.entries.map((entry) => entry.id));
});

test('同名的篇：不同卷各自成篇，同一章跨文件连着录的合成一篇', () => {
  const couples = bookOf('ditian').chapters.filter((chapter) => chapter.name === '夫妻');
  assert.deepEqual(couples.map((chapter) => chapter.group), ['六亲论', '六亲论（任铁樵阐微）']);
  const fu = bookOf('zengshan').chapters.filter((chapter) => chapter.name === '增删黄金策千金赋章');
  assert.equal(fu.length, 1);
  const spread = new Set(entriesOfChapter(library.entries, 'zengshan', fu[0]).map((entry) => stemOf(entry.file)));
  assert.ok(spread.size > 1, '千金赋章跨了几个文件');
});

test('底本说明：架上的书都在登记表里写了给读者看的那一句，不带网址和校录过程', () => {
  for (const book of catalog.books.filter((item) => item.entries > 0)) {
    assert.equal(book.edition, CLASSICS[book.key].edition, book.key);
    assert.ok(book.edition.length >= 12 && book.edition.endsWith('。'), book.key);
    assert.doesNotMatch(book.edition, /https?:|PDF|API|side-|主线|notes|doubts|revid|oldid/, book.key);
  }
  // 登记表没写的书，退回去取文件里的来源句：分号后面的校录记录不要
  assert.equal(editionLineOf('通行本《某书》，据维基文库录入。；2026-10-29 主线用脚本逐段比对'), '通行本《某书》，据维基文库录入。');
  const fallback = buildCatalog([{ file: 'x/meihua-a.json', doc: { classic: 'meihua', section: '甲', volume: '卷一', edition: '据某刻本录入；内部记录', entries: [{ id: 'meihua.a.001', title: '甲·其一' }] } }]);
  assert.equal(fallback.books.find((book) => book.key === 'meihua').edition, '据某刻本录入');
});

test('原文拆出「原注」；地址参数来回一致；检索', () => {
  assert.deepEqual(splitOriginal('欲识三元万法宗，先观帝载与神功。\n原注：天有阴阳。'), { main: ['欲识三元万法宗，先观帝载与神功。'], notes: ['原注：天有阴阳。'] });
  assert.deepEqual(splitOriginal('问紫微所主若何？\n答曰：紫微属土。'), { main: ['问紫微所主若何？', '答曰：紫微属土。'], notes: [] });
  for (const target of [{ entry: 'qiongtong.jia.002', book: null, chapter: null }, { entry: null, book: 'ditian', chapter: 3 }, { entry: null, book: 'ziwei', chapter: null }, { entry: null, book: null, chapter: null }]) {
    assert.deepEqual(parseShelfQuery(shelfQueryOf(target)), target);
  }
  assert.deepEqual(parseShelfQuery('b=ditian&c=abc'), { entry: null, book: 'ditian', chapter: null });
  const chapters = searchCatalog(catalog, '用神章');
  assert.ok(chapters.some((hit) => hit.kind === 'chapter' && hit.book === 'zengshan' && hit.name === '用神章'));
  assert.ok(searchCatalog(catalog, '滴天髓').some((hit) => hit.kind === 'book' && hit.book === 'ditian'));
  assert.deepEqual(searchCatalog(catalog, '  '), []);
  const found = searchEntries(library.entries, '欲识三元万法宗');
  assert.equal(found[0].entry.id, 'ditian.tongshen.001');
  assert.equal(found[0].match, '欲识三元万法宗');
  assert.ok(searchEntries(library.entries, '用神', 5).length === 5);
});
