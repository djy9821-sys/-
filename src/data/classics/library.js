/**
 * 古籍库索引与匹配（纯函数，浏览器与 Node 都能用）。
 *
 * 支线录入的古籍条目（src/data/classics/<书>/<篇>.json）每条带机器可读的适用条件 applies，
 * 这里把所有文件合成一个索引，再按一张命盘 / 一个卦的「上下文」把相关条目找出来：
 *
 *   const library = buildLibrary(docs);                  // docs: [{ file, doc }]（或直接 doc 数组）
 *   const ctx = baziContextOf({ chart, strength, judge, relations });
 *   const hits = matchEntries(library, ctx);             // [{ entry, matched, reason, score, source, book, … }]
 *
 * 匹配规则（与 README 里 applies 的约定一致）：
 * - 条目的 applies 数组里任一条件满足即命中；一个条件里的每个键都要满足（module 必须相同）。
 * - 键值为数组的表示「任一」；复数键（stars、tenGods、dayGans、monthZhis、hexagrams）与单数键同义。
 * - 例外是紫微的 allStars：列的几颗星都要在（同宫、同守）；jia：两颗星（或化禄、化权等）分坐本宫左右两邻（「夹」）。
 * - 只写 note 的条件编不出机器条件，默认不命中（给人读的）。
 * - 上下文里没有的键一律算不满足，不猜。
 *
 * 术语词典（src/data/glossary/*.json）同样合成索引，按术语或别名精确查，或按关键字搜。
 */
import { CLASSICS, cite } from '../classics.js';
import { patternNamesOf, ziweiPatternNamesOf } from './patternNames.js';
import { liuyaoTopicNamesOf } from './topicNames.js';
import { ENTRY_STATUS, ZIWEI_PALACE_ALIASES, chaptersOf, sectionOfEntry } from './schema.js';
import { displayTextOf, readerNotesOf } from './editorial.js';

export { patternNamesOf, ziweiPatternNamesOf, readerNotesOf };

/** 复数键 → 单数键（allStars 也查上下文的 star，只是要几颗都在）。 */
const SINGULAR = Object.freeze({ stars: 'star', allStars: 'star', meetAll: 'meet', tenGods: 'tenGod', dayGans: 'dayGan', monthZhis: 'monthZhi', hexagrams: 'hexagram', yearGans: 'yearGan', yearZhis: 'yearZhi' });
/** 要「全都在」的键。 */
const ALL_OF = new Set(['allStars', 'meetAll']);
/** 列的取值是一组、不按「任一」打折的键。 */
const NO_BREADTH = new Set(['allStars', 'meetAll', 'jia']);

/** 条件键的中文名，给界面写「为什么匹配到这条」。 */
export const CONDITION_LABELS = Object.freeze({
  pattern: '格局', tenGod: '十神', shensha: '神煞', dayGan: '日干', monthZhi: '月令', season: '季节', strength: '旺衰', relation: '合冲刑害',
  star: '星曜', jia: '夹', meet: '三方四正', palace: '宫位', branches: '地支', brightness: '庙旺', mutagen: '四化', limit: '运限', empty: '宫内', yearGan: '年干', yearZhi: '年支',
  hexagram: '卦', line: '爻', sixRelative: '六亲', sixGod: '六神', topic: '问事', movingLines: '动爻', gender: '性别', liuqin: '六亲',
});

/** 同等相关时的次序：已审 > 待审 > 仅原文（只作并列时的微调）。 */
const STATUS_BONUS = Object.freeze({ reviewed: 0.3, translated: 0.2, draft: 0.1 });
/** 条目卡上的状态标签：说的是白话的状态（原文都与底本比对过）。 */
export const STATUS_LABELS = Object.freeze({ reviewed: '白话已校', translated: '白话初稿', draft: '仅原文' });

/**
 * 各类条件的分量：越能把这张盘和别的盘区分开的键越重。
 * 格局、星曜、卦名最具体；人人都有的「命宫」、多数盘都有的十神、对半分的性别就轻。
 * 运限（大限、流年）只在看大限、流年那一层时才会命中：专讲这步运限的条目要排在只凭宫名、性别命中的本命条目前面，
 * 但仍让「运限 + 星曜」的（限逢凶曜、七杀遇流羊）压过它。
 */
export const KEY_WEIGHT = Object.freeze({
  pattern: 10, star: 10, jia: 10, hexagram: 10,
  limit: 9,
  dayGan: 8, monthZhi: 8, topic: 8, meet: 8,
  mutagen: 7, shensha: 7, sixRelative: 7, empty: 7,
  season: 6, palace: 6, branches: 6, line: 6, relation: 6, liuqin: 6,
  strength: 5, sixGod: 5, yearGan: 5, yearZhi: 5,
  brightness: 4, tenGod: 4,
  gender: 3, movingLines: 3,
});

/** 一个键列了几种取值：只写一颗星的条目比一口气列十颗星的更专门。 */
const breadthFactor = (count) => (count <= 1 ? 1 : count <= 3 ? 0.8 : count <= 6 ? 0.6 : 0.4);

const toArray = (value) => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);
const unique = (list) => [...new Set(list.filter((item) => item !== undefined && item !== null && item !== ''))];

/** 把 [{ file, doc }] 或 [doc] 统一成 [{ file, doc }]。 */
const normalizeDocs = (docs) => (docs ?? []).map((item, index) => (item && typeof item === 'object' && 'doc' in item ? { file: item.file ?? `doc-${index}`, doc: item.doc } : { file: `doc-${index}`, doc: item }));

/** 合并所有古籍文件为一个索引。 */
export const buildLibrary = (docs) => {
  const entries = [];
  const books = {};
  normalizeDocs(docs).forEach(({ file, doc }) => {
    if (!doc || !Array.isArray(doc.entries)) return;
    const classic = CLASSICS[doc.classic] ?? null;
    const book = classic?.title ?? String(doc.classic ?? '');
    const docInfo = { file, classic: doc.classic, book, volume: doc.volume ?? '', docSection: doc.section ?? '', edition: doc.edition ?? '', contributor: doc.contributor ?? '' };
    const chapters = chaptersOf(doc);
    doc.entries.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      // 一个文件录了几篇时（section 用「、」列出各篇），每条归到自己那一篇，出处只写这一篇。
      const section = sectionOfEntry(entry, doc, chapters) ?? doc.section ?? '';
      // 界面上的「注」「存疑」只给读者看的（录入过程、底本页码数据里照留，见 editorial.js）。
      const reader = readerNotesOf(entry);
      entries.push({
        ...entry,
        // 私用区字符（底本里电脑无法显示的字）换成缺字符号「□」，见 editorial.js。
        title: displayTextOf(entry.title),
        original: displayTextOf(entry.original),
        vernacular: displayTextOf(entry.vernacular),
        doubts: toArray(entry.doubts),
        tags: toArray(entry.tags),
        applies: toArray(entry.applies),
        ...docInfo,
        section,
        source: cite(doc.classic, section),
        readerNotes: reader.notes,
        readerDoubts: reader.doubts,
      });
      const stat = (books[book] ??= { classic: doc.classic, book, total: 0, draft: 0, translated: 0, reviewed: 0 });
      stat.total += 1;
      if (ENTRY_STATUS.includes(entry.status)) stat[entry.status] += 1;
    });
  });
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return Object.freeze({ entries, byId, books, total: entries.length });
};

/** 按 id 取一条。 */
export const entryById = (library, id) => library?.byId?.get(id) ?? null;

/** 某本书的全部条目（按文件、再按 id 排）。 */
export const entriesOfClassic = (library, classicKey) => (library?.entries ?? []).filter((entry) => entry.classic === classicKey);

/** 条件值规范化：紫微宫位别名统一成登记名。 */
const normalizeValue = (key, value) => (key === 'palace' ? (ZIWEI_PALACE_ALIASES[value] ?? value) : value);

/**
 * 一个条件是否被上下文满足。返回命中的键值对（供界面说明），不满足返回 null。
 * @param {object} cond applies 里的一个条件
 * @param {object} ctx 上下文：{ module, pattern: [...], tenGod: [...], … }（值可以是字符串或数组）
 */
export const conditionMatches = (cond, ctx) => {
  if (!cond || typeof cond !== 'object' || !ctx) return null;
  if (cond.module !== ctx.module) return null;
  const keys = Object.keys(cond).filter((key) => key !== 'module' && key !== 'note');
  if (keys.length === 0) return null;
  const matched = [];
  for (const key of keys) {
    const ctxKey = SINGULAR[key] ?? key;
    const ctxValues = toArray(ctx[ctxKey]).map((value) => normalizeValue(ctxKey, String(value)));
    if (ctxValues.length === 0) return null;
    const wanted = toArray(cond[key]).map((value) => normalizeValue(ctxKey, String(value)));
    if (ALL_OF.has(key)) {
      if (!wanted.every((value) => ctxValues.includes(value))) return null;
      matched.push({ key: ctxKey, value: wanted.join('、') });
      continue;
    }
    if (key === 'jia') {
      // 上下文的 jia 是左右两邻各取一颗配成的「甲|乙」对（两个次序都有）。
      if (wanted.length !== 2 || !ctxValues.includes(`${wanted[0]}|${wanted[1]}`)) return null;
      matched.push({ key, value: wanted.join('、') });
      continue;
    }
    const hit = wanted.find((value) => ctxValues.includes(value));
    if (hit === undefined) return null;
    matched.push({ key: ctxKey, value: hit });
  }
  return matched;
};

const reasonOf = (matched) => matched.map(({ key, value }) => `${CONDITION_LABELS[key] ?? key}·${value}`).join('，');

/** 命中的星是空宫借来的对宫星时，说明里注明「（借对宫）」，读者知道原文说的星不在这一宫里。 */
const annotateBorrowed = (matched, ctx) => {
  const borrowed = toArray(ctx?.borrowedStars);
  if (!borrowed.length) return matched;
  return matched.map((item) => (item.key === 'star' && String(item.value).split('、').some((name) => borrowed.includes(name))
    ? { ...item, value: `${item.value}（借对宫）` }
    : item));
};

/**
 * 一个命中条件的分量：命中的每个键按 KEY_WEIGHT 计，该键列的取值越多打得越轻（「任一」列得越多越泛）；
 * allStars、meetAll 是几颗都要在，星越多越专门，不打折。
 */
const conditionWeight = (cond, matched) => matched.reduce((sum, { key }) => {
  const name = Object.keys(cond).find((item) => (SINGULAR[item] ?? item) === key);
  const factor = NO_BREADTH.has(name) ? 1 : breadthFactor(toArray(cond[name]).length);
  return sum + (KEY_WEIGHT[key] ?? 5) * factor;
}, 0);

/** 能编成机器条件的条件数（只写 note 的不算）。 */
const machineConditionCount = (applies) => applies
  .filter((cond) => cond && Object.keys(cond).some((key) => key !== 'module' && key !== 'note')).length;

/** 轮流排各书各篇：前面每排过一条同篇的，让 2 分；每排过一条同书的，再让 0.5 分。 */
const SAME_SECTION_STEP = 2;
const SAME_BOOK_STEP = 0.5;

/**
 * 相关度相近的条目轮流排各书各篇，免得一篇七首诗诀占满第一页、提示词只附到同一篇。
 * 贪心：每次取「分数 − 已排同篇条数 × 2 − 已排同书条数 × 0.5」最高的；
 * 同篇之内仍按原来的分数与 id 先后，分数差得多的（如格局专论与通论）次序不变。
 * @param {object[]} hits 已按分数、id 排好的命中
 */
const interleaveSources = (hits) => {
  const remaining = [...hits];
  const ordered = [];
  const sectionCount = new Map();
  const bookCount = new Map();
  while (remaining.length) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    remaining.forEach((hit, index) => {
      const value = hit.score
        - SAME_SECTION_STEP * (sectionCount.get(`${hit.entry.book}|${hit.entry.section}`) ?? 0)
        - SAME_BOOK_STEP * (bookCount.get(hit.entry.book) ?? 0);
      if (value > bestValue + 1e-9) {
        bestValue = value;
        bestIndex = index;
      }
    });
    const [hit] = remaining.splice(bestIndex, 1);
    ordered.push(hit);
    const sectionKey = `${hit.entry.book}|${hit.entry.section}`;
    sectionCount.set(sectionKey, (sectionCount.get(sectionKey) ?? 0) + 1);
    bookCount.set(hit.entry.book, (bookCount.get(hit.entry.book) ?? 0) + 1);
  }
  return ordered;
};

/**
 * 按上下文找出相关条目，按相关度排序：
 * - 命中的键越多、越能区分命盘（格局、星曜、卦名重，命宫、十神、性别轻）、列的取值越少，越靠前；
 * - 一条原文挂了很多并列条件的（如「何谓成」对十几种格局都适用），算通论，往后放一点；
 * - 再相同时已审 > 待审 > 仅原文，最后按 id；
 * - 最后各书各篇轮流排（见 interleaveSources），第一页与提示词里能看到不同古籍的说法。
 * @param {object} library buildLibrary 的结果
 * @param {object} ctx 上下文
 * @param {{ limit?: number, status?: string[] }} [options] 条数上限；只看某些状态
 */
export const matchEntries = (library, ctx, options = {}) => {
  if (!library || !ctx) return [];
  const allowed = options.status ? new Set(options.status) : null;
  const hits = [];
  library.entries.forEach((entry) => {
    if (allowed && !allowed.has(entry.status)) return;
    let best = null;
    entry.applies.forEach((cond) => {
      const matched = conditionMatches(cond, ctx);
      if (!matched) return;
      const weight = conditionWeight(cond, matched);
      if (!best || weight > best.weight) best = { matched, weight };
    });
    if (!best) return;
    const generality = Math.min(3, (machineConditionCount(entry.applies) - 1) * 0.5);
    const matched = annotateBorrowed(best.matched, ctx);
    hits.push({
      entry,
      matched,
      reason: reasonOf(matched),
      score: Math.round((best.weight - generality + (STATUS_BONUS[entry.status] ?? 0)) * 100) / 100,
    });
  });
  hits.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  const ordered = interleaveSources(hits);
  return options.limit ? ordered.slice(0, options.limit) : ordered;
};

const SEASON_OF_ZHI = Object.freeze({ 寅: '春', 卯: '春', 辰: '春', 巳: '夏', 午: '夏', 未: '夏', 申: '秋', 酉: '秋', 戌: '秋', 亥: '冬', 子: '冬', 丑: '冬' });
const SI_JI_MONTHS = new Set(['辰', '戌', '丑', '未']);

/**
 * 从一张八字盘生成匹配上下文。
 * @param {{ chart: object, strength?: object, judge?: object, relations?: object[], gender?: string }} input
 *   chart: buildBaziChart 的结果；strength: analyzeStrength；judge: judgeBaziPattern；relations: findRelations（原局）
 */
export const baziContextOf = ({ chart, strength = null, judge = null, relations = [] } = {}) => {
  const pillars = (chart?.pillars ?? []).filter((pillar) => pillar?.gan && pillar?.zhi);
  const month = pillars.find((pillar) => pillar.key === 'month') ?? null;
  const tenGod = [];
  const transparent = [];
  pillars.forEach((pillar) => {
    if (pillar.key !== 'day' && pillar.ganShiShen) {
      tenGod.push(pillar.ganShiShen);
      transparent.push(pillar.ganShiShen);
    }
    (pillar.hiddenGanDetails ?? []).forEach((detail) => { if (detail?.shiShen) tenGod.push(detail.shiShen); });
  });
  const shensha = pillars.flatMap((pillar) => pillar.shensha ?? []);
  const pattern = [...patternNamesOf(judge?.pattern?.name), ...patternNamesOf(judge?.special?.name)];
  const season = month ? [SEASON_OF_ZHI[month.zhi], SI_JI_MONTHS.has(month.zhi) ? '四季' : null] : [];
  const relation = (relations ?? []).flatMap((item) => [
    ...(item?.kinds ?? []),
    item?.title,
    item?.title ? item.title.replace(/（[^）]*）/g, '') : null,
  ]);
  const genderInput = chart?.input?.gender;
  return {
    module: 'bazi',
    dayGan: chart?.dayMaster?.gan ?? null,
    monthZhi: month?.zhi ?? null,
    tenGod: unique(tenGod),
    transparent: unique(transparent),
    shensha: unique(shensha),
    pattern: unique(pattern),
    season: unique(season),
    strength: strength?.band ?? null,
    relation: unique(relation),
    gender: genderInput === 'female' ? '女' : genderInput === 'male' ? '男' : null,
  };
};

/** 八字六亲宫星的四亲（applies.liuqin 的取值）。 */
export const BAZI_LIUQIN = Object.freeze(['夫妻', '子女', '父母', '兄弟']);

/**
 * 八字「六亲宫星」一节用：讲某一亲的条目。
 * 只看 applies 里写了 liuqin 的条件（同一条件里的 gender、tenGod、strength 等也要满足），
 * 上下文用 baziContextOf 的，再加上这一亲；排序同 matchEntries。
 * 总列表的上下文没有 liuqin，所以这些条件不会让条目进「古籍原文」总列表（条目另有不带 liuqin 的条件命中的除外）。
 * @param {object} library buildLibrary 的结果
 * @param {object} ctx baziContextOf 的结果
 * @param {'夫妻'|'子女'|'父母'|'兄弟'} liuqin
 * @param {{ limit?: number, status?: string[] }} [options]
 */
export const baziLiuqinHits = (library, ctx, liuqin, options = {}) => {
  if (!library || !ctx || ctx.module !== 'bazi' || !BAZI_LIUQIN.includes(liuqin)) return [];
  const scoped = library.entries
    .filter((entry) => entry.applies.some((cond) => cond && 'liuqin' in cond))
    .map((entry) => ({ ...entry, applies: entry.applies.filter((cond) => cond && 'liuqin' in cond) }));
  return matchEntries({ entries: scoped }, { ...ctx, liuqin }, options);
};

/**
 * 紫微上下文：传入当前关心的星曜与宫位即可（匹配引擎本身不依赖 iztro）。
 * @param {{ stars?: string[], jia?: string[], meet?: string[], palace?: string|string[], branches?: string[], brightness?: string[], mutagens?: string[], patterns?: string[], limit?: string, gender?: string, borrowedStars?: string[], empty?: boolean, yearGan?: string|null, yearZhi?: string|null }} input
 *   palace 可以给多个（身宫与命宫同宫时给 ['命宫', '身宫']）；meet：三方四正（对宫与两个三合宫）里的星，本宫的星会自动并进去；
 *   borrowedStars：空宫借的对宫主星；empty：宫里没有主星；yearGan / yearZhi：生年干支（《全书》「壬甲生人」「寅午戌生人」的条件用）。
 */
export const ziweiContextOf = ({ stars = [], jia = [], meet = [], palace = null, branches = [], brightness = [], mutagens = [], patterns = [], limit = null, gender = null, borrowedStars = [], empty = false, yearGan = null, yearZhi = null } = {}) => ({
  module: 'ziwei',
  star: unique([...stars, ...borrowedStars]),
  // 宫里没有主星（空宫）时为「无正曜」，给「命无正曜」「左右单守」这类条目用；借了对宫的星也还是空宫。
  empty: empty ? ['无正曜'] : [],
  jia: unique(jia),
  // 本宫连三方四正（对宫与两个三合宫）里的星，给「会」「拱」「照」「朝」的条件（meet 任一颗、meetAll 几颗都在）用。
  meet: unique([...stars, ...meet]),
  palace: unique(toArray(palace).map((name) => ZIWEI_PALACE_ALIASES[name] ?? name)),
  branches: unique(branches),
  brightness: unique(brightness),
  mutagen: unique(mutagens),
  pattern: unique(toArray(patterns).flatMap(ziweiPatternNamesOf)),
  limit,
  gender,
  yearGan: yearGan || null,
  yearZhi: yearZhi || null,
  // 空宫借来的对宫主星（也算进 star），命中说明里注「（借对宫）」。
  borrowedStars: unique(borrowedStars),
});

/**
 * 排盘结果里的生年干支（排盘库按农历年给年柱）：{ yearGan, yearZhi }；读不到时两项为 null。
 * @param {object} horoscope iztro 排盘结果（rawDates.chineseDate.yearly 或 chineseDate 字符串）
 */
export const ziweiNatalOf = (horoscope) => {
  const yearly = horoscope?.rawDates?.chineseDate?.yearly;
  const ganzhi = Array.isArray(yearly) && yearly.length === 2
    ? yearly.join('')
    : (typeof horoscope?.chineseDate === 'string' ? horoscope.chineseDate.trim().split(/\s+/)[0] : '') || '';
  return { yearGan: ganzhi[0] ?? null, yearZhi: ganzhi[1] ?? null };
};

/** 四化标记转成登记名：iztro 给「禄权科忌」，也兼容「化禄」写法。 */
const mutagenNameOf = (mutagen) => (mutagen ? String(mutagen).replace(/^化/, '') : null);

/** 一宫里的星（主星、辅星、杂曜）与四化（写成「化禄」等），给「夹」用。 */
const palaceTokensOf = (palace) => {
  const starList = [...(palace?.majorStars ?? []), ...(palace?.minorStars ?? []), ...(palace?.adjectiveStars ?? [])].filter((star) => star?.name);
  return unique([
    ...starList.map((star) => star.name),
    ...starList.map((star) => mutagenNameOf(star.mutagen)).filter(Boolean).map((name) => `化${name}`),
  ]);
};
/** 左右两邻各取一颗配成「甲|乙」对（两个次序都列），条件 jia: [甲, 乙] 查这里。 */
const jiaPairsOf = (neighbors) => {
  const [left, right] = (neighbors ?? []).map(palaceTokensOf);
  if (!left?.length || !right?.length) return [];
  return left.flatMap((a) => right.flatMap((b) => [`${a}|${b}`, `${b}|${a}`]));
};
/** 十二宫里某宫的左右两邻（按 iztro 的宫序 index，首尾相接）。 */
export const ziweiNeighborsOf = (palaces, palace) => {
  if (!Array.isArray(palaces) || !Number.isInteger(palace?.index)) return null;
  const at = (index) => palaces.find((item) => item?.index === (index + 12) % 12) ?? null;
  const left = at(palace.index - 1);
  const right = at(palace.index + 1);
  return left && right ? [left, right] : null;
};

const OPPOSITE_BRANCH = Object.freeze({ 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' });
/** 某宫的对宫（地支相冲的那一宫；没有地支时按宫序隔六位）。 */
export const ziweiOppositeOf = (palaces, palace) => {
  if (!Array.isArray(palaces) || !palace) return null;
  const branch = OPPOSITE_BRANCH[palace.earthlyBranch];
  if (branch) return palaces.find((item) => item?.earthlyBranch === branch) ?? null;
  if (!Number.isInteger(palace.index)) return null;
  return palaces.find((item) => item?.index === (palace.index + 6) % 12) ?? null;
};

/** 空宫（没有主星）借对宫的主星：排盘习惯「无正曜借对宫论」；对宫也空的不借。 */
export const ziweiBorrowedStarsOf = (palace, opposite) => {
  if (!palace || (palace.majorStars ?? []).some((star) => star?.name) || !opposite) return [];
  return (opposite.majorStars ?? []).map((star) => star?.name).filter(Boolean);
};

const TRIADS = [['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑']];
/** 某宫的三方四正（不含本宫）：对宫与两个三合宫（申子辰、亥卯未、寅午戌、巳酉丑）；按地支找，缺地支时按宫序隔四、六、八位。 */
export const ziweiSurroundOf = (palaces, palace) => {
  if (!Array.isArray(palaces) || !palace) return [];
  const branch = palace.earthlyBranch;
  const triad = TRIADS.find((item) => item.includes(branch));
  if (triad) {
    const wanted = [OPPOSITE_BRANCH[branch], ...triad.filter((item) => item !== branch)];
    return wanted.map((item) => palaces.find((other) => other?.earthlyBranch === item) ?? null).filter(Boolean);
  }
  if (!Number.isInteger(palace.index)) return [];
  return [6, 4, 8].map((step) => palaces.find((other) => other?.index === (palace.index + step) % 12) ?? null).filter(Boolean);
};
/** 几个宫里的主星与辅星名（给三方四正的「会」用；杂曜不算）。 */
export const ziweiMeetStarsOf = (surround) => unique((surround ?? []).flatMap((palace) => [...(palace?.majorStars ?? []), ...(palace?.minorStars ?? [])].map((star) => star?.name).filter(Boolean)));

/**
 * 从排盘结果里的一个宫（iztro 的 palace：name、earthlyBranch、isBodyPalace、majorStars、minorStars、adjectiveStars）生成上下文。
 * 宫里所有星曜（主星、辅星、杂曜）都算，庙旺与四化取自各星自带的 brightness / mutagen。
 * @param {object} palace iztro 宫对象
 * @param {{ gender?: 'male'|'female'|'男'|'女'|null, limit?: string, patterns?: string[], neighbors?: object[]|null, opposite?: object|null, surround?: object[]|null, natal?: { yearGan?: string|null, yearZhi?: string|null }|null }} [options]
 *   性别、运限层（默认本命）；patterns：程序认出的格局名（按命宫三方四正判的，调用方只在命宫传）；
 *   neighbors：左右两邻的宫（ziweiNeighborsOf），给「夹」的条件用，不传就不判夹；
 *   opposite：对宫（ziweiOppositeOf），这一宫没有主星时借对宫主星一起找（命中说明注「借对宫」），不传就不借；
 *   surround：三方四正的宫（ziweiSurroundOf），给「会」「拱」「照」的条件（meet / meetAll）用，不传就只算本宫的星；
 *   natal：生年干支（ziweiNatalOf），给「壬甲生人」「寅午戌生人」的条件用，不传就不判
 */
export const ziweiPalaceContextOf = (palace, { gender = null, limit = '本命', patterns = [], neighbors = null, opposite = null, surround = null, natal = null } = {}) => {
  if (!palace) return null;
  const starList = [...(palace.majorStars ?? []), ...(palace.minorStars ?? []), ...(palace.adjectiveStars ?? [])].filter((star) => star?.name);
  const palaceNames = [palace.name, palace.isBodyPalace ? '身宫' : null];
  return ziweiContextOf({
    stars: starList.map((star) => star.name),
    empty: !(palace.majorStars ?? []).some((star) => star?.name),
    borrowedStars: ziweiBorrowedStarsOf(palace, opposite),
    meet: ziweiMeetStarsOf(surround),
    jia: jiaPairsOf(neighbors),
    palace: palaceNames.filter(Boolean),
    branches: [palace.earthlyBranch],
    brightness: starList.map((star) => star.brightness).filter(Boolean),
    mutagens: starList.map((star) => mutagenNameOf(star.mutagen)).filter(Boolean),
    patterns,
    limit,
    gender: gender === 'female' || gender === '女' ? '女' : gender === 'male' || gender === '男' ? '男' : null,
    yearGan: natal?.yearGan ?? null,
    yearZhi: natal?.yearZhi ?? null,
  });
};

/**
 * 六爻上下文。
 * @param {{ hexagram?: string, changed?: string, movingLines?: number[], relations?: string[], sixRelatives?: string[], sixGods?: string[], topic?: string }} input
 *   topic：程序类别 key（wealth）或中文名（求财），会展开成古籍里的各种叫法（求财、财运、买卖……）
 */
export const liuyaoContextOf = ({ hexagram = null, changed = null, movingLines = [], relations = [], sixRelatives = [], sixGods = [], topic = null } = {}) => ({
  module: 'liuyao',
  hexagram: unique([hexagram, changed]),
  line: unique(movingLines),
  relation: unique(relations),
  sixRelative: unique(sixRelatives),
  sixGod: unique(sixGods),
  topic: liuyaoTopicNamesOf(topic),
  movingLines: movingLines.length === 0 ? '无' : movingLines.length === 1 ? '一' : '多',
});

/**
 * 从一次起卦（buildLiuYaoReading）与断卦要点（judgeLiuYao）生成上下文：
 * 本卦、变卦、动爻位置与多少、六冲六合、用神的六亲、动爻与用神所临六神、问事类别。
 */
export const liuyaoReadingContextOf = (reading, judge = null) => {
  if (!reading?.hexagram) return null;
  const moving = (reading.lines ?? []).filter((line) => line?.isMoving);
  return liuyaoContextOf({
    hexagram: reading.hexagram.name,
    changed: reading.changed?.name ?? null,
    movingLines: reading.movingPositions ?? moving.map((line) => line.position),
    relations: [reading.hexagram.relation, reading.changed?.relation].filter(Boolean),
    // 天时等一卦看几种六亲的类别，判断结果里带 contextRelatives（发动、暗动、化出的六亲）。
    sixRelatives: (judge?.contextRelatives ?? [judge?.yongShen?.relative]).filter(Boolean),
    sixGods: [...moving.map((line) => line.god), judge?.yongShen?.god].filter(Boolean),
    topic: judge?.topic ?? reading.topic ?? null,
  });
};

/**
 * 紫微提示词用：指定几个宫的星曜命中的条目，去重后按相关度排序（各书各篇轮流排，同 matchEntries）。
 * @param {object} library buildLibrary 的结果
 * @param {object[]} palaces iztro 的十二宫
 * @param {string[]} palaceNames 宫名（命宫、身宫、夫妻、福德……；「夫妻宫」「交友」这类别名也认）；身宫与命宫同宫时只算一次
 * @param {{ gender?: string, patterns?: string[], natal?: object|null }} [options] patterns：程序认出的格局名，算进命宫的上下文；natal：生年干支（ziweiNatalOf）
 */
export const ziweiPalaceHits = (library, palaces, palaceNames, { gender = null, patterns = [], natal = null } = {}) => {
  if (!library || !Array.isArray(palaces) || !Array.isArray(palaceNames)) return [];
  const wanted = unique(palaceNames.map((name) => ZIWEI_PALACE_ALIASES[name] ?? name));
  const targets = unique(wanted.flatMap((name) => palaces.filter((palace) => (name === '身宫' ? palace?.isBodyPalace : palace?.name === name))));
  const seen = new Set();
  const hits = [];
  targets.forEach((palace) => {
    const ctx = ziweiPalaceContextOf(palace, { gender, natal, patterns: palace.name === '命宫' ? patterns : [], neighbors: ziweiNeighborsOf(palaces, palace), opposite: ziweiOppositeOf(palaces, palace), surround: ziweiSurroundOf(palaces, palace) });
    matchEntries(library, ctx).forEach((hit) => {
      if (seen.has(hit.entry.id)) return;
      seen.add(hit.entry.id);
      hits.push(hit);
    });
  });
  return interleaveSources(hits.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id)));
};

/**
 * 紫微提示词用：此刻所行大限或流年的命宫（落在本命盘的某一宫）星曜命中的条目，连同古籍里专讲这一层运限的条目
 * （applies.limit 为「大限」「流年」，如《全书》卷三论大限十年祸福、论流年太岁吉凶星杀）。
 * @param {number} index 那一宫在十二宫数组里的下标（运限上下文 fortune.decadal.index / fortune.yearly.index）
 * @param {'大限'|'流年'} limit
 */
export const ziweiLimitPalaceHits = (library, palaces, index, limit, { gender = null, natal = null } = {}) => {
  const palace = Array.isArray(palaces) ? (palaces.find((item) => item?.index === index) ?? palaces[index] ?? null) : null;
  if (!library || !palace || !limit) return [];
  const ctx = ziweiPalaceContextOf(palace, { gender, natal, limit, neighbors: ziweiNeighborsOf(palaces, palace), opposite: ziweiOppositeOf(palaces, palace), surround: ziweiSurroundOf(palaces, palace) });
  return matchEntries(library, ctx);
};

const matchedLimit = (hit) => (hit?.matched ?? []).some(({ key }) => key === 'limit');
/** 专讲运限的篇章（《全书》卷三论大限十年祸福、论二限太岁吉凶、论流年太岁吉凶星杀）：补那一条专讲运限的时先从这些篇里挑。 */
const LIMIT_SECTIONS = Object.freeze({ 大限: /大限|二限|行限/, 流年: /流年|太岁|二限/ });

/**
 * 运势提示词从运限层的命中里取前 n 条：按相关度取，但至少留一条专讲这层运限的（命中条件里有「运限」），
 * 免得全被所落宫的本命星曜条目占满；补的那条先挑论大限、论流年篇章里的，再挑别处（定杂局之类）的；没有专讲的就照常取。
 * @param {object[]} hits ziweiLimitPalaceHits 的结果（已排序）
 * @param {number} n
 * @param {'大限'|'流年'|null} [limit] 看的是哪一层，用来认专讲这一层的篇章
 */
export const pickLimitHits = (hits, n, limit = null) => {
  const list = Array.isArray(hits) ? hits : [];
  const picked = list.slice(0, n);
  if (picked.length < list.length && !picked.some(matchedLimit)) {
    const rest = list.slice(picked.length).filter(matchedLimit);
    const section = LIMIT_SECTIONS[limit];
    const first = (section && rest.find((hit) => section.test(hit.entry?.section ?? ''))) ?? rest[0];
    if (first) return [...picked.slice(0, Math.max(0, n - 1)), first];
  }
  return picked;
};

/** 命宫与身宫（同宫时只算一次）星曜命中的条目：ziweiPalaceHits 的常用情形。 */
export const ziweiLifePalaceHits = (library, palaces, options = {}) => ziweiPalaceHits(library, palaces, ['命宫', '身宫'], options);

/* ---------- 术语词典 ---------- */

/** 八字盘里出现的术语（给词典面板先列出来）：十神、格局、神煞、旺衰，再加几个基础词。 */
export const baziGlossarySeeds = ({ chart, judge = null, strength = null } = {}) => {
  const pillars = (chart?.pillars ?? []).filter((pillar) => pillar?.gan);
  const tenGods = pillars.flatMap((pillar) => [pillar.ganShiShen, ...(pillar.hiddenShiShens ?? [])]);
  const patterns = [judge?.pattern?.name, judge?.special?.name];
  const shensha = pillars.flatMap((pillar) => pillar.shensha ?? []);
  return unique([
    '日主', '十神', ...tenGods, '格局', ...patterns, '用神', '旺衰', strength?.band,
    '神煞', ...shensha, '藏干', '纳音', '空亡', '大运', '流年',
  ]);
};

/** 紫微某一宫里出现的术语：宫名、宫中星曜、四化、几个基础词。 */
export const ziweiGlossarySeeds = (palace) => {
  if (!palace) return ['命宫', '身宫', '十二宫', '四化', '大限', '流年'];
  const stars = [...(palace.majorStars ?? []), ...(palace.minorStars ?? []), ...(palace.adjectiveStars ?? [])];
  const mutagens = stars.map((star) => (star.mutagen ? `化${String(star.mutagen).replace(/^化/, '')}` : null));
  return unique([
    palace.name, palace.isBodyPalace ? '身宫' : null, ...stars.map((star) => star.name), ...mutagens,
    '三方四正', '庙旺利陷', '四化', '大限', '流年',
  ]);
};

/** 六爻一卦里出现的术语：世应、用神与其六亲、动变、空破、伏神、六冲六合，再加几个基础词。 */
export const liuyaoGlossarySeeds = (reading, judge = null) => {
  if (!reading?.hexagram) return ['世爻', '应爻', '用神', '六亲', '六神', '本卦', '动爻', '变卦', '旬空', '月破'];
  const marks = (reading.lines ?? []).flatMap((line) => line?.marks ?? []);
  const relationTerm = (relation) => (relation ? `${relation}卦` : null);
  return unique([
    '世爻', '应爻', '用神', judge?.yongShen?.relative, '原神', '忌神', '六亲', '六神',
    '本卦', reading.movingPositions?.length ? '动爻' : '静爻', reading.changed ? '变卦' : null, '互卦',
    relationTerm(reading.hexagram.relation), relationTerm(reading.changed?.relation),
    ...marks, '旬空', '月破', '月建', '日辰', '暗动', (reading.hidden ?? []).length ? '伏神' : null, '应期', '八宫',
  ]);
};

/** 合并术语词典文件。 */
export const buildGlossary = (docs) => {
  const entries = [];
  normalizeDocs(docs).forEach(({ file, doc }) => {
    if (!doc || !Array.isArray(doc.entries)) return;
    doc.entries.forEach((entry) => {
      if (!entry || typeof entry !== 'object' || !entry.term) return;
      entries.push({
        ...entry,
        aliases: toArray(entry.aliases),
        related: toArray(entry.related),
        module: doc.module ?? 'common',
        file,
        sourceText: entry.source?.classic ? cite(entry.source.classic, entry.source.section ?? '') : '',
      });
    });
  });
  return Object.freeze({ entries, total: entries.length });
};

const MODULE_RANK = (module, wanted) => (module === wanted ? 0 : module === 'common' ? 1 : 2);

/**
 * 按术语或别名精确查一条；同名时优先本模块，其次通用，再其次别的模块。
 * @param {object} glossary buildGlossary 的结果
 * @param {string} term 术语
 * @param {{ module?: string }} [options]
 */
export const lookupTerm = (glossary, term, options = {}) => {
  const wanted = (term ?? '').trim();
  if (!glossary || !wanted) return null;
  const candidates = glossary.entries.filter((entry) => entry.term === wanted || entry.aliases.includes(wanted));
  if (candidates.length === 0) return null;
  const module = options.module ?? null;
  candidates.sort((a, b) => MODULE_RANK(a.module, module) - MODULE_RANK(b.module, module));
  return candidates[0];
};

/** 关键字搜索（术语、别名、一句话解释里包含即算），最多 limit 条。 */
export const searchGlossary = (glossary, text, { module = null, limit = 20 } = {}) => {
  const needle = (text ?? '').trim();
  if (!glossary || !needle) return [];
  return glossary.entries
    .filter((entry) => (module ? entry.module === module || entry.module === 'common' : true))
    .filter((entry) => entry.term.includes(needle) || entry.aliases.some((alias) => alias.includes(needle)) || (entry.brief ?? '').includes(needle))
    .sort((a, b) => MODULE_RANK(a.module, module) - MODULE_RANK(b.module, module) || a.term.localeCompare(b.term, 'zh'))
    // 指定了模块时，本模块与通用词典都有的同一条（如「纳音」）只留本模块那条；不指定模块时各模块的都列。
    .filter((entry, index, list) => !module || list.findIndex((other) => other.id === entry.id) === index)
    .slice(0, limit);
};

/** 一段文字里出现了哪些词典术语（长词优先，不重叠），给界面做术语提示用。 */
export const termsIn = (glossary, text, { module = null, limit = 12 } = {}) => {
  if (!glossary || !text) return [];
  const names = unique(glossary.entries.flatMap((entry) => [entry.term, ...entry.aliases])).sort((a, b) => b.length - a.length);
  const found = [];
  let rest = text;
  for (const name of names) {
    if (found.length >= limit) break;
    if (!rest.includes(name)) continue;
    const entry = lookupTerm(glossary, name, { module });
    if (entry && !found.some((item) => item.entry === entry)) found.push({ term: name, entry });
    rest = rest.split(name).join('');
  }
  return found;
};
