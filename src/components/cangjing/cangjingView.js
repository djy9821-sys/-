/**
 * 藏经阁的视图（不依赖 React）：书架 → 一本书的目录 → 展卷阅读。
 *
 *   const view = mountCangjing(root, { catalog, loadEntries, initialQuery, history, scroller });
 *   view.destroy();
 *
 * - catalog：书架目录（构建时算好的 virtual:classics-catalog），不必下载全文就能摆出书架和目录。
 * - loadEntries(module)：按门类取全文条目（buildLibrary 的 entries），用到哪一类才下载哪一类。
 * - initialQuery：打开时要翻到的地方，地址里问号后面的部分（e=条目 id，或 b=书&c=第几篇）。
 * - history：是否把每一步记进浏览器历史，默认记。藏经阁整页打开时记：每往里走一层记一步
 *   （地址形如 #/cangjing?b=ditian&c=3），手机返回键一层层退出来；历史状态里带 gushupaiDepth，回首页时 App 一次退到底。
 *   盖在批命页上面临时翻阅时（CangjingReader）传 false：地址和历史都不动。
 * - scroller：换页时要滚回顶部的容器；不传就是整个窗口。
 */
import { CLASSICS } from '../../data/classics.js';
import {
  bookKeyOfEntryId, chapterIndexOfEntry, entriesOfChapter, orderEntries, parseShelfQuery,
  searchCatalog, searchEntries, shelfQueryOf, splitOriginal,
} from '../../data/classics/shelf.js';

const SHELVES = Object.freeze([['bazi', '八字'], ['ziwei', '紫微斗数'], ['liuyao', '六爻']]);
const STAMP_KEY = 'gushupai-cangjing-stamps-v1';
const ROUTE = '#/cangjing';
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const BACK = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const TEMPLATE = `
<section class="cjg-panel" data-panel="shelf">
  <p class="cjg-lede" data-ref="lede"></p>
  <label class="cjg-search"><span aria-hidden="true">⌕</span><input type="search" data-ref="query" placeholder="搜书名、篇名，或原文里的字句" autocomplete="off" aria-label="搜索藏经阁"></label>
  <div class="cjg-hits" data-ref="hits" aria-live="polite"></div>
  <div data-ref="stamped"></div>
  <div data-ref="shelves"></div>
</section>
<section class="cjg-panel" data-panel="book" hidden>
  <div class="cjg-crumbs"><button type="button" class="cjg-up" data-up="shelf">‹ 书架</button></div>
  <div class="cjg-sheet" data-ref="book"></div>
</section>
<section class="cjg-panel" data-panel="read" hidden>
  <div class="cjg-crumbs">
    <button type="button" class="cjg-up" data-up="book">‹ 目录</button>
    <div class="cjg-seg" role="group" aria-label="看什么" data-ref="modes">
      <button type="button" data-mode="both" aria-pressed="true">对照</button>
      <button type="button" data-mode="yuan" aria-pressed="false">只看原文</button>
      <button type="button" data-mode="bai" aria-pressed="false">只看白话</button>
    </div>
    <div class="cjg-seg" role="group" aria-label="排法">
      <button type="button" data-dir="h" aria-pressed="true">横排</button>
      <button type="button" data-dir="v" aria-pressed="false">竖排</button>
    </div>
  </div>
  <div class="cjg-sheet cjg-m-both" data-ref="sheet">
    <div class="cjg-juan"><h3 data-ref="juan-title"></h3><span data-ref="juan-meta"></span><button type="button" class="cjg-copy" data-ref="copy">复制本篇链接</button></div>
    <p class="cjg-status" data-ref="status" role="status"></p>
    <div class="cjg-tiaos" data-ref="tiaos"></div>
    <div class="cjg-gloss"><h5 data-ref="gloss-title">白话</h5><p data-ref="gloss-text">点一条原文，这里出白话。</p></div>
    <div class="cjg-pager"><button type="button" data-ref="prev">‹ 上一篇</button><button type="button" data-ref="next">下一篇 ›</button></div>
  </div>
</section>`;

const el = (tag, cls = '', text = '') => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
};
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const titleOf = (key) => CLASSICS[key]?.title ?? key;

export const mountCangjing = (root, options = {}) => {
  const catalog = options.catalog ?? { total: { books: 0, chapters: 0, entries: 0 }, books: [] };
  const loadEntries = options.loadEntries ?? (() => Promise.resolve([]));
  const useHistory = options.history !== false;
  const scroller = options.scroller ?? null;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const state = { panel: 'shelf', book: null, chapter: null, mode: 'both', vertical: false, token: 0 };
  const cleanups = [];
  let disposed = false;

  root.innerHTML = TEMPLATE;
  const ref = (name) => root.querySelector(`[data-ref="${name}"]`);
  const panelOf = (name) => root.querySelector(`[data-panel="${name}"]`);
  const on = (node, type, handler, opts) => { node.addEventListener(type, handler, opts); cleanups.push(() => node.removeEventListener(type, handler, opts)); };
  const animate = (node, frames, opts) => { if (!reduced && node?.animate) node.animate(frames, { easing: EASE, fill: 'backwards', ...opts }); };
  const unroll = (node) => animate(node, [{ clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)' }], { duration: 620 });
  const bookOf = (key) => catalog.books.find((book) => book.key === key && book.entries > 0) ?? null;

  /* —— 取书：一类只下载一次，按原书次第排好 —— */
  const shelves = new Map();
  const arrived = new Set();
  const entriesOf = (module) => {
    if (!shelves.has(module)) {
      shelves.set(module, Promise.resolve(loadEntries(module)).then((entries) => { arrived.add(module); return orderEntries(entries); }).catch((error) => { shelves.delete(module); throw error; }));
    }
    return shelves.get(module);
  };

  /* —— 钤印（收藏），只存在本机 —— */
  const readStamps = () => { try { const list = JSON.parse(window.localStorage.getItem(STAMP_KEY) || '[]'); return Array.isArray(list) ? list.filter((item) => item && typeof item.id === 'string') : []; } catch { return []; } };
  let stamps = readStamps();
  const saveStamps = () => { try { window.localStorage.setItem(STAMP_KEY, JSON.stringify(stamps.slice(0, 200))); } catch { /* 存不了就只在这一回有效 */ } };
  const isStamped = (id) => stamps.some((item) => item.id === id);

  /* —— 地址与历史 —— */
  const urlOf = (target) => { const query = shelfQueryOf(target); return `${window.location.pathname}${window.location.search}${ROUTE}${query ? `?${query}` : ''}`; };
  const depth = () => window.history.state?.gushupaiDepth ?? 0;
  /** 现在在哪一层：'shelf'、'book:书'、'read:书:第几篇'。往里走时记进历史状态（cangjingPrev），退回去时好知道上一步是不是上一层。 */
  let here = 'shelf';
  const levelKey = () => (state.panel === 'shelf' ? 'shelf' : state.panel === 'book' ? `book:${state.book}` : `read:${state.book}:${state.chapter}`);
  const record = (target, push) => {
    if (!useHistory) return;
    if (push) { window.history.pushState({ gushupaiDepth: depth() + 1, cangjing: target, cangjingPrev: here }, '', urlOf(target)); return; }
    window.history.replaceState({ ...(window.history.state ?? {}), cangjing: target }, '', urlOf(target));
  };

  /* —— 书架 —— */
  const renderStamped = () => {
    const box = ref('stamped'); box.textContent = '';
    if (!stamps.length) return;
    const section = el('section', 'cjg-shelf'); const head = el('h3', '', '钤过印的'); head.append(el('small', '', `${stamps.length} 条，只存在这台设备上`));
    const list = el('div', 'cjg-hits');
    for (const item of stamps.slice(0, 8)) {
      const button = el('button', 'cjg-hit'); button.type = 'button';
      button.append(el('b', '', `《${titleOf(bookKeyOfEntryId(item.id))}》· ${item.chapter ?? ''}`), el('span', '', item.title ?? ''));
      on(button, 'click', () => openEntry(item.id, { push: true }));
      list.append(button);
    }
    section.append(head, list); box.append(section);
  };
  const show = (name) => {
    for (const panel of ['shelf', 'book', 'read']) panelOf(panel).hidden = panel !== name;
    state.panel = name;
    here = levelKey();
    if (name === 'shelf') renderStamped();
    if (scroller) scroller.scrollTop = 0; else if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
  };

  const bookButton = (book) => {
    const classic = CLASSICS[book.key] ?? { title: book.key, author: '' };
    const waiting = book.entries === 0;
    const button = el(waiting ? 'div' : 'button', `cjg-book${waiting ? ' is-waiting' : ''}`);
    if (!waiting) { button.type = 'button'; button.dataset.book = book.key; button.setAttribute('aria-label', `《${classic.title}》，${book.chapters.length} 篇 ${book.entries} 条`); }
    const cover = el('span', 'cjg-cover');
    const stitch = el('span', 'cjg-stitch'); for (let i = 0; i < 4; i++) stitch.append(el('i'));
    cover.append(el('span', `cjg-slip${classic.title.length >= 6 ? ' is-long' : ''}`, classic.title), stitch);
    const meta = el('span', 'cjg-book-meta');
    meta.append(el('b', '', classic.title), el('span', '', classic.author), el('em', '', waiting ? '待入藏' : `${book.chapters.length} 篇 · ${fmt(book.entries)} 条`));
    button.append(cover, meta);
    if (!waiting) on(button, 'click', () => {
      // 请书：书先侧过来一点，再展开
      if (!reduced && cover.animate) { cover.animate([{ transform: 'none' }, { transform: 'translateY(-8px) rotateY(-34deg)' }], { duration: 230, easing: 'ease-in' }); setTimeout(() => { if (!disposed) openBook(book.key, { push: true }); }, 220); } else openBook(book.key, { push: true });
    });
    return button;
  };
  const renderShelf = () => {
    const lede = ref('lede'); lede.textContent = '';
    lede.append(el('b', '', String(catalog.total.books)), ' 部古籍、', el('b', '', String(catalog.total.chapters)), ' 篇、', el('b', '', fmt(catalog.total.entries)), ' 条，原文与白话逐句对照。批命时引的每一句，都能翻回这里。');
    const box = ref('shelves'); box.textContent = '';
    for (const [module, label] of SHELVES) {
      const books = catalog.books.filter((book) => book.module === module && book.entries > 0);
      if (!books.length) continue;
      const shelf = el('section', 'cjg-shelf'); const head = el('h3', '', label);
      head.append(el('small', '', `${books.length} 部 · ${fmt(books.reduce((n, book) => n + book.entries, 0))} 条`));
      const row = el('div', 'cjg-books'); books.forEach((book) => row.append(bookButton(book)));
      shelf.append(head, row); box.append(shelf);
    }
    const waiting = catalog.books.filter((book) => book.entries === 0);
    if (waiting.length) {
      const shelf = el('section', 'cjg-shelf'); const head = el('h3', '', '待入藏'); head.append(el('small', '', '已登记，原文还在校录'));
      const row = el('div', 'cjg-books'); waiting.forEach((book) => row.append(bookButton(book)));
      shelf.append(head, row); box.append(shelf);
    }
  };

  /* —— 检索：书名、篇名立刻出；原文要先把三类书都取来 —— */
  const hitButton = (label, detail, go) => { const button = el('button', 'cjg-hit'); button.type = 'button'; button.append(el('b', '', label), detail); on(button, 'click', go); return button; };
  const searchTexts = async (query, box, more) => {
    more.disabled = true; more.textContent = '正在取书…';
    try {
      const all = (await Promise.all(SHELVES.map(([module]) => entriesOf(module)))).flat();
      if (disposed || ref('query').value.trim() !== query) return;
      const found = searchEntries(all, query, 30);
      more.remove();
      if (!found.length) { box.append(el('p', 'cjg-lede', `原文和白话里都没有“${query}”。`)); return; }
      box.append(el('p', 'cjg-lede', `原文与白话里找到 ${found.length}${found.length === 30 ? ' 处以上，只列前 30 处' : ' 处'}：`));
      for (const hit of found) {
        const detail = el('span'); detail.append(hit.before, el('mark', '', hit.match), hit.after);
        box.append(hitButton(`《${hit.entry.book}》· ${hit.entry.section}`, detail, () => openEntry(hit.entry.id, { push: true })));
      }
    } catch {
      more.disabled = false; more.textContent = '没取到，点这里再试';
    }
  };
  const search = (raw) => {
    const query = raw.trim(); const box = ref('hits'); box.textContent = '';
    if (!query) return;
    const hits = searchCatalog(catalog, query);
    for (const hit of hits.slice(0, 12)) {
      if (hit.kind === 'book') box.append(hitButton(`《${hit.title}》`, el('span', '', '整本书'), () => openBook(hit.book, { push: true })));
      else box.append(hitButton(`《${hit.title}》· ${hit.name}`, el('span', '', `${hit.count} 条`), () => openChapter(hit.book, hit.chapter, { push: true })));
    }
    if (hits.length > 12) box.append(el('p', 'cjg-lede', `篇名里还有 ${hits.length - 12} 处，换个更具体的词。`));
    const more = el('button', 'cjg-more', `在全部原文和白话里找“${query}”`); more.type = 'button';
    on(more, 'click', () => searchTexts(query, box, more));
    box.append(more);
  };

  /* —— 一本书：题名、底本、目录 —— */
  function openBook (key, { push = false, missing = '' } = {}) {
    const book = bookOf(key); if (!book) { openShelf({ push: false }); return; }
    const classic = CLASSICS[key];
    state.book = key; state.chapter = null; state.token += 1;
    const sheet = ref('book'); sheet.textContent = '';
    const head = el('div', 'cjg-book-head'); const info = el('div', 'cjg-book-info');
    const stats = el('p', 'cjg-stats'); const s1 = el('span'); s1.append(el('b', '', String(book.chapters.length)), '篇'); const s2 = el('span'); s2.append(el('b', '', fmt(book.entries)), '条');
    stats.append(s1, s2, el('span', '', '原文配白话'));
    info.append(el('p', 'cjg-author', classic.author), el('p', '', classic.note), stats);
    if (book.edition) { const edition = el('p', 'cjg-edition'); edition.append(el('b', '', '底本 '), book.edition); info.append(edition); }
    head.append(el('h3', 'cjg-book-title', classic.title), info);
    const toc = el('div', 'cjg-toc'); let group = null;
    book.chapters.forEach((chapter, index) => {
      if (chapter.group && chapter.group !== group) { group = chapter.group; toc.append(el('h4', '', group)); }
      const button = el('button'); button.type = 'button'; button.dataset.chapter = String(index);
      button.append(el('b', '', chapter.name), el('em', '', `${chapter.count} 条`));
      on(button, 'click', () => openChapter(key, index, { push: true }));
      toc.append(button);
    });
    sheet.append(head, toc);
    if (missing) sheet.prepend(el('p', 'cjg-tip', missing));
    record({ book: key }, push);
    show('book');
    unroll(sheet);
  }
  function openShelf ({ push = false } = {}) {
    state.book = null; state.chapter = null; state.token += 1;
    record({}, push);
    show('shelf');
  }

  /* —— 展卷阅读 —— */
  const pick = (node) => {
    root.querySelectorAll('.cjg-tiao.is-picked').forEach((other) => other.classList.remove('is-picked'));
    node.classList.add('is-picked');
    ref('gloss-title').textContent = `白话 · ${node.dataset.title}`;
    ref('gloss-text').textContent = node.dataset.vernacular || '这一条还没有白话。';
  };
  const applyModes = () => {
    const sheet = ref('sheet');
    sheet.classList.remove('cjg-m-both', 'cjg-m-yuan', 'cjg-m-bai'); sheet.classList.add(`cjg-m-${state.mode}`);
    sheet.classList.toggle('is-vertical', state.vertical);
    root.querySelectorAll('[data-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
    root.querySelectorAll('[data-dir]').forEach((button) => button.setAttribute('aria-pressed', String((button.dataset.dir === 'v') === state.vertical)));
    ref('modes').hidden = state.vertical;
    if (state.vertical) {
      const first = root.querySelector('.cjg-tiao.is-picked') || root.querySelector('.cjg-tiao');
      if (first) pick(first);
      const box = ref('tiaos'); box.scrollLeft = box.scrollWidth;
    }
  };
  const tiaoOf = (entry, book, chapter) => {
    const node = el('article', 'cjg-tiao'); node.dataset.entry = entry.id; node.dataset.title = entry.title; node.dataset.vernacular = entry.vernacular || '';
    node.append(el('h4', '', entry.title));
    const { main, notes } = splitOriginal(entry.original);
    const yuan = el('p', 'cjg-yuan'); main.forEach((line, index) => { if (index) yuan.append(el('br')); yuan.append(line); }); node.append(yuan);
    notes.forEach((line) => node.append(el('p', 'cjg-yuanzhu', line)));
    if (entry.vernacular) node.append(el('p', 'cjg-bai', entry.vernacular));
    if (entry.readerNotes) node.append(el('p', 'cjg-zhu', entry.readerNotes));
    if (entry.readerDoubts?.length) node.append(el('p', 'cjg-yi', `${entry.readerDoubts.join('；')}。`));
    const foot = el('div', 'cjg-tiao-foot'); const button = el('button', 'cjg-yin'); button.type = 'button';
    const sync = () => {
      const stamped = isStamped(entry.id);
      button.textContent = stamped ? '已钤印 · 取下' : '钤印收藏'; button.setAttribute('aria-pressed', String(stamped));
      node.classList.toggle('is-stamped', stamped);
      let seal = node.querySelector('.cjg-stamp');
      if (stamped && !seal) { seal = el('span', 'cjg-stamp', '藏'); seal.setAttribute('aria-hidden', 'true'); node.append(seal); return seal; }
      if (!stamped && seal) seal.remove();
      return null;
    };
    on(button, 'click', (event) => {
      event.stopPropagation();
      if (isStamped(entry.id)) stamps = stamps.filter((item) => item.id !== entry.id);
      else stamps = [{ id: entry.id, title: entry.title, chapter: chapter.name }, ...stamps];
      saveStamps();
      const seal = sync();
      if (seal) animate(seal, [{ opacity: 0, transform: 'rotate(-10deg) scale(1.9)' }, { opacity: 0.88, transform: 'rotate(5deg) scale(1)' }], { duration: 340, easing: BACK });
    });
    foot.append(el('span', '', `《${titleOf(book.key)}》· ${chapter.name}`), button); node.append(foot); sync();
    on(node, 'click', () => { if (state.vertical) pick(node); });
    return node;
  };
  async function openChapter (key, index, { push = false, focus = null } = {}) {
    const book = bookOf(key); const chapter = book?.chapters[index];
    if (!book || !chapter) { if (book) openBook(key, { push: false }); else openShelf({ push: false }); return; }
    const classic = CLASSICS[key];
    state.book = key; state.chapter = index;
    const token = (state.token += 1);
    ref('juan-title').textContent = chapter.name;
    ref('juan-meta').textContent = `《${classic.title}》${chapter.group ? ` · ${chapter.group}` : ''} · 本篇 ${chapter.count} 条`;
    const box = ref('tiaos'); box.textContent = '';
    const status = ref('status'); status.textContent = '正在取书…';
    const prev = ref('prev'); const next = ref('next');
    prev.disabled = index <= 0; next.disabled = index >= book.chapters.length - 1;
    prev.textContent = index > 0 ? `‹ ${book.chapters[index - 1].name}` : '‹ 上一篇';
    next.textContent = index < book.chapters.length - 1 ? `${book.chapters[index + 1].name} ›` : '下一篇 ›';
    record({ book: key, chapter: index }, push);
    show('read');
    unroll(ref('sheet'));
    let entries;
    try {
      entries = entriesOfChapter(await entriesOf(book.module), key, chapter);
    } catch {
      if (disposed || token !== state.token) return;
      status.textContent = '';
      const retry = el('button', 'cjg-more', '这本书没取到。检查网络后点这里再试'); retry.type = 'button';
      on(retry, 'click', () => openChapter(key, index, { focus }));
      box.append(retry);
      return;
    }
    if (disposed || token !== state.token) return;
    status.textContent = entries.length ? '' : '这一篇还没有条目。';
    entries.forEach((entry) => box.append(tiaoOf(entry, book, chapter)));
    applyModes();
    if (focus) {
      const target = [...box.children].find((node) => node.dataset.entry === focus);
      if (target) setTimeout(() => {
        if (disposed || token !== state.token) return;
        target.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        target.classList.add('is-flash');
        if (state.vertical) pick(target);
      }, 380);
    }
  }
  /** 翻到某一条：先按 id 知道是哪本书，取来那一类，再找它在第几篇。 */
  async function openEntry (id, { push = false } = {}) {
    const key = bookKeyOfEntryId(id); const book = bookOf(key);
    if (!book) { openShelf({ push: false }); return; }
    const token = (state.token += 1);
    if (!arrived.has(book.module)) {
      // 全文还在路上：先把卷轴展开、写上书名，省得对着书架干等。这一步不记历史，书到了由 openChapter 接手。
      ref('juan-title').textContent = `《${titleOf(key)}》`;
      ref('juan-meta').textContent = '';
      ref('tiaos').textContent = '';
      ref('status').textContent = '正在取书…';
      ref('prev').disabled = true; ref('next').disabled = true;
      for (const panel of ['shelf', 'book', 'read']) panelOf(panel).hidden = panel !== 'read';
    }
    try {
      const entry = (await entriesOf(book.module)).find((item) => item.id === id);
      if (disposed || token !== state.token) return;
      const index = entry ? chapterIndexOfEntry(book, entry) : -1;
      if (index < 0) { openBook(key, { push, missing: '要找的那一条不在这本书里了，可能条目号改过。' }); return; }
      openChapter(key, index, { push, focus: id });
    } catch {
      if (!disposed && token === state.token) openBook(key, { push, missing: '书没取到，检查网络后再点篇名。' });
    }
  }

  /** 按地址参数或历史状态去到对应的地方（不新记历史）。 */
  const go = (target, { replace = true } = {}) => {
    if (target?.entry) { openEntry(target.entry, { push: false }); return; }
    if (target?.book && target.chapter !== null && target.chapter !== undefined) { openChapter(target.book, target.chapter, { push: false }); return; }
    if (target?.book) { openBook(target.book, { push: false }); return; }
    if (replace) openShelf({ push: false }); else { state.book = null; state.chapter = null; state.token += 1; show('shelf'); }
  };
  /** 往上一层：上一步历史正好是上一层（从那里点进来的）就退一步，否则把当前这一步改成上一层，历史不越堆越多。 */
  const up = (level) => {
    const wanted = level === 'book' && state.book ? `book:${state.book}` : 'shelf';
    if (useHistory && window.history.state?.cangjingPrev === wanted) { window.history.back(); return; }
    if (wanted === 'shelf') openShelf({ push: false }); else openBook(state.book, { push: false });
  };

  if (useHistory) on(window, 'popstate', () => {
    if (disposed || !window.location.hash.startsWith(ROUTE)) return;
    const saved = window.history.state?.cangjing;
    go(saved ?? parseShelfQuery(window.location.hash.split('?')[1] ?? ''), { replace: false });
  });
  root.querySelectorAll('[data-up]').forEach((button) => on(button, 'click', () => up(button.dataset.up)));
  root.querySelectorAll('[data-mode]').forEach((button) => on(button, 'click', () => { state.mode = button.dataset.mode; applyModes(); }));
  root.querySelectorAll('[data-dir]').forEach((button) => on(button, 'click', () => { state.vertical = button.dataset.dir === 'v'; applyModes(); }));
  on(ref('query'), 'input', (event) => search(event.target.value));
  on(ref('prev'), 'click', () => { if (state.book && state.chapter > 0) openChapter(state.book, state.chapter - 1); });
  on(ref('next'), 'click', () => { if (state.book && state.chapter !== null) openChapter(state.book, state.chapter + 1); });
  on(ref('copy'), 'click', () => {
    const button = ref('copy'); const link = `${window.location.origin}${urlOf({ book: state.book, chapter: state.chapter })}`;
    const done = (text) => { button.textContent = text; setTimeout(() => { if (!disposed) button.textContent = '复制本篇链接'; }, 1800); };
    try { window.navigator.clipboard.writeText(link).then(() => done('已复制'), () => done('复制不了，请从地址栏复制')); } catch { done('复制不了，请从地址栏复制'); }
  });

  renderShelf();
  show('shelf');
  // 带着目的地打开时，等 App 把这一页记进历史之后再翻过去，免得改到上一页的地址。
  const initial = parseShelfQuery(options.initialQuery ?? '');
  if (initial.entry || initial.book) setTimeout(() => { if (!disposed) go(initial); }, 0);

  return {
    destroy () {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
      root.textContent = '';
    },
  };
};
