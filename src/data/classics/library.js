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
 * - 只写 note 的条件编不出机器条件，默认不命中（给人读的）。
 * - 上下文里没有的键一律算不满足，不猜。
 *
 * 术语词典（src/data/glossary/*.json）同样合成索引，按术语或别名精确查，或按关键字搜。
 */
import { CLASSICS, cite } from '../classics.js';
import { ENTRY_STATUS, ZIWEI_PALACE_ALIASES } from './schema.js';

/** 复数键 → 单数键。 */
const SINGULAR = Object.freeze({ stars: 'star', tenGods: 'tenGod', dayGans: 'dayGan', monthZhis: 'monthZhi', hexagrams: 'hexagram' });

/** 条件键的中文名，给界面写「为什么匹配到这条」。 */
export const CONDITION_LABELS = Object.freeze({
  pattern: '格局', tenGod: '十神', shensha: '神煞', dayGan: '日干', monthZhi: '月令', season: '季节', strength: '旺衰', relation: '合冲刑害',
  star: '星曜', palace: '宫位', branches: '地支', brightness: '庙旺', mutagen: '四化', limit: '运限',
  hexagram: '卦', line: '爻', sixRelative: '六亲', sixGod: '六神', topic: '问事', movingLines: '动爻', gender: '性别',
});

const STATUS_WEIGHT = Object.freeze({ reviewed: 3, translated: 2, draft: 1 });
export const STATUS_LABELS = Object.freeze({ reviewed: '已审', translated: '待审', draft: '仅原文' });

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
    const docInfo = { file, classic: doc.classic, book, volume: doc.volume ?? '', section: doc.section ?? '', edition: doc.edition ?? '', contributor: doc.contributor ?? '' };
    doc.entries.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      entries.push({
        ...entry,
        doubts: toArray(entry.doubts),
        tags: toArray(entry.tags),
        applies: toArray(entry.applies),
        ...docInfo,
        source: cite(doc.classic, doc.section),
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
    const hit = wanted.find((value) => ctxValues.includes(value));
    if (hit === undefined) return null;
    matched.push({ key: ctxKey, value: hit });
  }
  return matched;
};

const reasonOf = (matched) => matched.map(({ key, value }) => `${CONDITION_LABELS[key] ?? key}·${value}`).join('，');

/**
 * 按上下文找出相关条目，按相关度排序：条件越具体（命中的键越多）越靠前，其次已审 > 待审 > 仅原文。
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
      if (matched && (!best || matched.length > best.length)) best = matched;
    });
    if (!best) return;
    hits.push({
      entry,
      matched: best,
      reason: reasonOf(best),
      score: best.length * 10 + (STATUS_WEIGHT[entry.status] ?? 0),
    });
  });
  hits.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  return options.limit ? hits.slice(0, options.limit) : hits;
};

const SEASON_OF_ZHI = Object.freeze({ 寅: '春', 卯: '春', 辰: '春', 巳: '夏', 午: '夏', 未: '夏', 申: '秋', 酉: '秋', 戌: '秋', 亥: '冬', 子: '冬', 丑: '冬' });
const SI_JI_MONTHS = new Set(['辰', '戌', '丑', '未']);

/** 格名的同义展开：正财格 → 正财格、财格；羊刃格 → 羊刃格、阳刃格；建禄格 → 建禄格、建禄月劫…… */
export const patternNamesOf = (name) => {
  if (!name) return [];
  const base = name.replace(/^杂气/, '');
  const names = [name, base];
  if (/^[正偏]财格$/.test(base)) names.push('财格');
  if (/^[正偏]印格$/.test(base)) names.push('印格', '印绶格');
  if (base === '七杀格') names.push('偏官格', '杀格');
  if (base === '羊刃格' || base === '阳刃格') names.push('羊刃格', '阳刃格', '刃格');
  if (base === '建禄格' || base === '月劫格') names.push('建禄月劫', '禄劫格');
  if (/^疑似/.test(base)) names.push(base.replace(/^疑似/, ''));
  return unique(names);
};

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

/**
 * 紫微上下文：传入当前关心的星曜与宫位即可（匹配引擎本身不依赖 iztro）。
 * @param {{ stars?: string[], palace?: string|string[], branches?: string[], brightness?: string[], mutagens?: string[], patterns?: string[], limit?: string, gender?: string }} input
 *   palace 可以给多个（身宫与命宫同宫时给 ['命宫', '身宫']）。
 */
export const ziweiContextOf = ({ stars = [], palace = null, branches = [], brightness = [], mutagens = [], patterns = [], limit = null, gender = null } = {}) => ({
  module: 'ziwei',
  star: unique(stars),
  palace: unique(toArray(palace).map((name) => ZIWEI_PALACE_ALIASES[name] ?? name)),
  branches: unique(branches),
  brightness: unique(brightness),
  mutagen: unique(mutagens),
  pattern: unique(patterns),
  limit,
  gender,
});

/** 四化标记转成登记名：iztro 给「禄权科忌」，也兼容「化禄」写法。 */
const mutagenNameOf = (mutagen) => (mutagen ? String(mutagen).replace(/^化/, '') : null);

/**
 * 从排盘结果里的一个宫（iztro 的 palace：name、earthlyBranch、isBodyPalace、majorStars、minorStars、adjectiveStars）生成上下文。
 * 宫里所有星曜（主星、辅星、杂曜）都算，庙旺与四化取自各星自带的 brightness / mutagen。
 * @param {object} palace iztro 宫对象
 * @param {{ gender?: 'male'|'female'|'男'|'女'|null, limit?: string }} [options] 性别与运限层（默认本命）
 */
export const ziweiPalaceContextOf = (palace, { gender = null, limit = '本命' } = {}) => {
  if (!palace) return null;
  const starList = [...(palace.majorStars ?? []), ...(palace.minorStars ?? []), ...(palace.adjectiveStars ?? [])].filter((star) => star?.name);
  const palaceNames = [palace.name, palace.isBodyPalace ? '身宫' : null];
  return ziweiContextOf({
    stars: starList.map((star) => star.name),
    palace: palaceNames.filter(Boolean),
    branches: [palace.earthlyBranch],
    brightness: starList.map((star) => star.brightness).filter(Boolean),
    mutagens: starList.map((star) => mutagenNameOf(star.mutagen)).filter(Boolean),
    limit,
    gender: gender === 'female' || gender === '女' ? '女' : gender === 'male' || gender === '男' ? '男' : null,
  });
};

/**
 * 六爻上下文。
 * @param {{ hexagram?: string, changed?: string, movingLines?: number[], relations?: string[], sixRelatives?: string[], sixGods?: string[], topic?: string }} input
 */
export const liuyaoContextOf = ({ hexagram = null, changed = null, movingLines = [], relations = [], sixRelatives = [], sixGods = [], topic = null } = {}) => ({
  module: 'liuyao',
  hexagram: unique([hexagram, changed]),
  line: unique(movingLines),
  relation: unique(relations),
  sixRelative: unique(sixRelatives),
  sixGod: unique(sixGods),
  topic,
  movingLines: movingLines.length === 0 ? '无' : movingLines.length === 1 ? '一' : '多',
});

/**
 * 紫微提示词用：命宫与身宫（同宫时只算一次）星曜命中的条目，去重后按相关度排序。
 * @param {object} library buildLibrary 的结果
 * @param {object[]} palaces iztro 的十二宫
 * @param {{ gender?: string }} [options]
 */
export const ziweiLifePalaceHits = (library, palaces, { gender = null } = {}) => {
  if (!library || !Array.isArray(palaces)) return [];
  const ming = palaces.find((palace) => palace?.name === '命宫') ?? null;
  const shen = palaces.find((palace) => palace?.isBodyPalace) ?? null;
  const targets = ming && shen && ming !== shen ? [ming, shen] : [ming ?? shen].filter(Boolean);
  const seen = new Set();
  const hits = [];
  targets.forEach((palace) => {
    matchEntries(library, ziweiPalaceContextOf(palace, { gender })).forEach((hit) => {
      if (seen.has(hit.entry.id)) return;
      seen.add(hit.entry.id);
      hits.push(hit);
    });
  });
  return hits.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
};

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
