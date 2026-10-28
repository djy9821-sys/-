/**
 * 古籍库条目格式（schema）与校验。
 *
 * 古籍原文、白话与适用条件按篇存成 JSON（见 src/data/classics/README.md），
 * 支线 AI 只需照模板填空；这里的校验函数在 `node scripts/validate-data.mjs` 和单元测试里都会跑，
 * 格式不对的条目进不了集成分支。
 *
 * 纯函数、不读文件，浏览器和 Node 都能用。
 */
import { CLASSICS } from '../classics.js';
import { YAO_CI } from '../yaoci.js';
import { SHENSHA_ORDER } from '../../utils/baziShensha.js';
import { BAZI_PATTERN_VOCAB, ZIWEI_PATTERN_VOCAB } from './patternNames.js';
import { LIUYAO_TOPIC_VOCAB } from './topicNames.js';

export const ENTRY_STATUS = Object.freeze(['draft', 'translated', 'reviewed']);
export const MODULES = Object.freeze(['bazi', 'ziwei', 'liuyao']);

export const GAN = Object.freeze(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);
export const ZHI = Object.freeze(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
export const TEN_GODS = Object.freeze(['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印']);
export const ZIWEI_PALACES = Object.freeze(['命宫', '身宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母']);
export const ZIWEI_PALACE_ALIASES = Object.freeze({ 交友: '仆役', 奴仆: '仆役', 事业: '官禄', 兄弟宫: '兄弟', 夫妻宫: '夫妻', 子女宫: '子女', 财帛宫: '财帛', 疾厄宫: '疾厄', 迁移宫: '迁移', 仆役宫: '仆役', 官禄宫: '官禄', 田宅宫: '田宅', 福德宫: '福德', 父母宫: '父母' });
export const ZIWEI_BRIGHTNESS = Object.freeze(['庙', '旺', '得', '利', '平', '不', '陷']);
export const ZIWEI_MUTAGENS = Object.freeze(['禄', '权', '科', '忌']);
export const ZIWEI_STARS = Object.freeze([
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
  '左辅', '右弼', '文昌', '文曲', '禄存', '天马', '擎羊', '陀罗', '火星', '铃星', '天魁', '天钺', '地空', '地劫',
  '劫杀', '天空', '天刑', '天姚', '解神', '阴煞', '天喜', '天官', '天福', '天哭', '天虚', '龙池', '凤阁', '红鸾', '孤辰', '寡宿',
  '蜚廉', '破碎', '台辅', '封诰', '天巫', '天月', '三台', '八座', '恩光', '天贵', '天才', '天寿', '截空', '旬空', '空亡', '截路',
  '月德', '天伤', '天使', '天厨', '天德', '龙德', '年解', '华盖', '咸池', '天煞', '指背', '月煞', '亡神', '灾煞', '劫煞', '将星', '攀鞍', '岁驿', '息神',
]);
export const LIUYAO_SIX_RELATIVES = Object.freeze(['父母', '兄弟', '子孙', '妻财', '官鬼']);
export const LIUYAO_SIX_GODS = Object.freeze(['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']);
export const LIUYAO_RELATIONS = Object.freeze(['六冲', '六合']);
export const HEXAGRAMS = Object.freeze(Object.keys(YAO_CI));

/** applies 里每个模块允许出现的键，以及取值范围（null 表示任意非空字符串）。 */
export const APPLIES_KEYS = Object.freeze({
  common: Object.freeze({ module: MODULES, note: null, gender: ['男', '女'] }),
  ziwei: Object.freeze({
    star: ZIWEI_STARS,
    stars: ZIWEI_STARS,
    palace: ZIWEI_PALACES,
    branches: ZHI,
    brightness: ZIWEI_BRIGHTNESS,
    mutagen: ZIWEI_MUTAGENS,
    pattern: ZIWEI_PATTERN_VOCAB,
    limit: ['本命', '大限', '流年', '流月', '流日'],
  }),
  bazi: Object.freeze({
    dayGan: GAN,
    dayGans: GAN,
    monthZhi: ZHI,
    monthZhis: ZHI,
    tenGod: TEN_GODS,
    tenGods: TEN_GODS,
    pattern: BAZI_PATTERN_VOCAB,
    shensha: SHENSHA_ORDER,
    relation: null,
    strength: ['极弱', '偏弱', '中和', '偏强', '极强'],
    season: ['春', '夏', '秋', '冬', '四季'],
  }),
  liuyao: Object.freeze({
    hexagram: HEXAGRAMS,
    hexagrams: HEXAGRAMS,
    line: [1, 2, 3, 4, 5, 6],
    relation: LIUYAO_RELATIONS,
    sixRelative: LIUYAO_SIX_RELATIVES,
    sixGod: LIUYAO_SIX_GODS,
    topic: LIUYAO_TOPIC_VOCAB,
    movingLines: ['无', '一', '多'],
  }),
});

const ID_PATTERN = /^[a-z][a-z0-9]*(\.[a-z0-9-]+)+$/;
const HALF_WIDTH_PUNCT = /[,;:!?()"']/;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * 白话最长是原文的几倍。逐句直译文言一般是原文的 1.5～2.5 倍；超过 3.5 倍基本是加了原文没有的内容。
 * 原文太短（不足 12 字，如七言一句）时不检查。
 */
export const VERNACULAR_MAX_RATIO = 3.5;
const RATIO_MIN_ORIGINAL = 12;
/** 去掉标点、空白、字母数字后的字数（比较长短用）。 */
const hanziLength = (text) => String(text ?? '').replace(/[\s\p{P}\p{S}A-Za-z0-9]/gu, '').length;
/** 白话与原文的字数比；没有白话或原文太短时为 null。 */
export const vernacularRatio = (entry) => {
  if (!isNonEmptyString(entry?.vernacular) || !isNonEmptyString(entry?.original)) return null;
  const original = hanziLength(entry.original);
  if (original < RATIO_MIN_ORIGINAL) return null;
  return hanziLength(entry.vernacular) / original;
};

/** 程序认得的名字（格局、神煞）：写错了条件永远匹配不上，报错时说清楚。 */
const NAME_KEYS = Object.freeze({ pattern: '格局名', shensha: '神煞名', topic: '问事类别' });

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

const MODULE_LABELS = Object.freeze({ bazi: '八字', ziwei: '紫微', liuyao: '六爻' });

/** 古籍文件所在的模块目录（src/data/classics/<模块>/xxx.json）；网页按目录分块加载。不在这种路径下时为 null。 */
export const moduleDirOf = (file) => String(file ?? '').replace(/\\/g, '/').match(/(?:^|\/)classics\/([^/]+)\/[^/]+\.json$/)?.[1] ?? null;

const checkApplies = (applies, where, errors, dirModule = null) => {
  if (applies === undefined) return;
  if (!Array.isArray(applies)) {
    errors.push(`${where}: applies 必须是数组`);
    return;
  }
  applies.forEach((cond, index) => {
    const at = `${where}.applies[${index}]`;
    if (!cond || typeof cond !== 'object' || Array.isArray(cond)) {
      errors.push(`${at}: 必须是对象`);
      return;
    }
    const module = cond.module;
    if (!MODULES.includes(module)) {
      errors.push(`${at}: module 必须是 ${MODULES.join('/')}`);
      return;
    }
    if (dirModule && module !== dirModule) {
      errors.push(`${at}: 文件放在 ${dirModule} 目录（只在${MODULE_LABELS[dirModule]}页加载），条件却写 module: ${module}，永远显示不出来；${MODULE_LABELS[module]}的条目放到 src/data/classics/${module}/ 下`);
      return;
    }
    const allowed = { ...APPLIES_KEYS.common, ...APPLIES_KEYS[module] };
    Object.entries(cond).forEach(([key, value]) => {
      if (!(key in allowed)) {
        errors.push(`${at}: ${module} 不允许的键 ${key}（可用：${Object.keys(allowed).join('、')}）`);
        return;
      }
      const range = allowed[key];
      const values = Array.isArray(value) ? value : [value];
      if (values.length === 0) errors.push(`${at}.${key}: 不能为空数组`);
      values.forEach((item) => {
        if (range === null) {
          if (!isNonEmptyString(item)) errors.push(`${at}.${key}: 必须是非空字符串`);
          return;
        }
        const normalized = key === 'palace' ? (ZIWEI_PALACE_ALIASES[item] ?? item) : item;
        if (range.includes(normalized)) return;
        if (NAME_KEYS[key]) {
          errors.push(`${at}.${key}: 「${item}」不是程序认得的${NAME_KEYS[key]}，写了永远匹配不上；改用下列名字之一，或改写成星曜、十神、月令、卦名等条件，实在编不出就只写 note（可用：${range.join('、')}）`);
          return;
        }
        errors.push(`${at}.${key}: 「${item}」不在允许范围（${range.join('、')}）`);
      });
    });
  });
};

/**
 * 校验一个古籍 JSON 文件（已解析的对象）。返回错误列表；空数组表示通过。
 * @param {object} doc 文件内容
 * @param {{ file?: string, seenIds?: Set<string> }} [ctx] 跨文件的 id 去重集合
 */
export const validateClassicsDoc = (doc, ctx = {}) => {
  const errors = [];
  const file = ctx.file ?? '(文档)';
  const seen = ctx.seenIds ?? new Set();
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return [`${file}: 顶层必须是对象`];

  if (!CLASSICS[doc.classic]) errors.push(`${file}: classic「${doc.classic}」不在登记表（src/data/classics.js）里`);
  if (!isNonEmptyString(doc.section)) errors.push(`${file}: 缺 section（篇名）`);
  if (!isNonEmptyString(doc.edition)) errors.push(`${file}: 缺 edition（所据版本与来源说明）`);
  if (doc.volume !== undefined && !isNonEmptyString(doc.volume)) errors.push(`${file}: volume 必须是非空字符串`);
  if (doc.contributor !== undefined && !isNonEmptyString(doc.contributor)) errors.push(`${file}: contributor 必须是非空字符串`);
  if (!Array.isArray(doc.entries) || doc.entries.length === 0) {
    errors.push(`${file}: entries 必须是非空数组`);
    return errors;
  }
  const chapters = chaptersOf(doc);
  // 网页按 bazi / ziwei / liuyao 目录分块加载古籍：文件必须在这三个目录之一，条件也只能写本目录的模块。
  const dirModule = moduleDirOf(ctx.file);
  if (ctx.file && /(^|[\\/])classics[\\/]/.test(ctx.file) && !MODULES.includes(dirModule)) {
    errors.push(`${file}: 古籍文件要放在 src/data/classics/ 下的 ${MODULES.join(' / ')} 子目录里（网页按模块分块加载）`);
  }

  doc.entries.forEach((entry, index) => {
    const where = `${file} entries[${index}]${entry?.id ? ` (${entry.id})` : ''}`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${where}: 必须是对象`);
      return;
    }
    if (entry.section !== undefined && !isNonEmptyString(entry.section)) errors.push(`${where}: section 必须是非空字符串`);
    else if (chapters.length > 1 && entry.section !== undefined && !chapters.includes(entry.section.trim())) {
      errors.push(`${where}: section「${entry.section}」不在文件 section 列出的篇名里（${chapters.join('、')}）`);
    } else if (chapters.length > 1 && sectionOfEntry(entry, doc, chapters) === null) {
      errors.push(`${where}: 这个文件录了 ${chapters.length} 篇，条目 title 须以「篇名·」开头（如「${chapters[0]}·其一」），或单写 section 字段`);
    }
    if (!isNonEmptyString(entry.id) || !ID_PATTERN.test(entry.id)) errors.push(`${where}: id 须形如 ziwei.quanshu.zhuxing.001（小写字母、数字、点、短横）`);
    else if (doc.classic && !entry.id.startsWith(`${doc.classic}.`)) errors.push(`${where}: id 须以「${doc.classic}.」开头`);
    else if (seen.has(entry.id)) errors.push(`${where}: id 重复`);
    else seen.add(entry.id);

    if (!isNonEmptyString(entry.title)) errors.push(`${where}: 缺 title（条目标题）`);
    if (!isNonEmptyString(entry.original)) errors.push(`${where}: 缺 original（原文）`);
    else {
      if (/\r/.test(entry.original)) errors.push(`${where}: original 含回车符，请用 \\n 换行`);
      if (entry.original !== entry.original.trim()) errors.push(`${where}: original 首尾有空白`);
      if (HALF_WIDTH_PUNCT.test(entry.original)) errors.push(`${where}: original 含半角标点，请统一用全角（，。；：！？（）「」）`);
    }
    if (!ENTRY_STATUS.includes(entry.status)) errors.push(`${where}: status 须是 ${ENTRY_STATUS.join('/')}`);
    if (entry.status !== 'draft' && !isNonEmptyString(entry.vernacular)) errors.push(`${where}: status 为 ${entry.status} 时必须有 vernacular（白话）`);
    if (entry.vernacular !== undefined && typeof entry.vernacular !== 'string') errors.push(`${where}: vernacular 必须是字符串`);
    const ratio = vernacularRatio(entry);
    if (ratio !== null && ratio > VERNACULAR_MAX_RATIO) {
      errors.push(`${where}: 白话是原文的 ${ratio.toFixed(1)} 倍，超过 ${VERNACULAR_MAX_RATIO} 倍上限——白话只逐句翻原文有的意思，不加原文没有的条件、判断和渲染；典故、术语解释放进 notes`);
    }
    if (entry.notes !== undefined && typeof entry.notes !== 'string') errors.push(`${where}: notes 必须是字符串`);
    if (entry.doubts !== undefined && (!Array.isArray(entry.doubts) || entry.doubts.some((item) => !isNonEmptyString(item)))) errors.push(`${where}: doubts 必须是字符串数组`);
    if (entry.tags !== undefined && (!Array.isArray(entry.tags) || entry.tags.some((item) => !isNonEmptyString(item)))) errors.push(`${where}: tags 必须是字符串数组`);
    checkApplies(entry.applies, where, errors, dirModule);

    const known = new Set(['id', 'title', 'section', 'original', 'vernacular', 'notes', 'doubts', 'applies', 'tags', 'status']);
    Object.keys(entry).forEach((key) => {
      if (!known.has(key)) errors.push(`${where}: 未知字段 ${key}`);
    });
  });
  return errors;
};

const GLOSSARY_ID = /^[a-z][a-z0-9-]*$/;

/** 校验术语词典文件（src/data/glossary/*.json）。 */
export const validateGlossaryDoc = (doc, ctx = {}) => {
  const errors = [];
  const file = ctx.file ?? '(词典)';
  const seen = ctx.seenTerms ?? new Set();
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return [`${file}: 顶层必须是对象`];
  if (!MODULES.includes(doc.module) && doc.module !== 'common') errors.push(`${file}: module 须是 ${MODULES.join('/')}/common`);
  if (!Array.isArray(doc.entries) || doc.entries.length === 0) {
    errors.push(`${file}: entries 必须是非空数组`);
    return errors;
  }
  doc.entries.forEach((entry, index) => {
    const where = `${file} entries[${index}]${entry?.term ? ` (${entry.term})` : ''}`;
    if (!entry || typeof entry !== 'object') {
      errors.push(`${where}: 必须是对象`);
      return;
    }
    if (!isNonEmptyString(entry.term)) errors.push(`${where}: 缺 term`);
    else if (seen.has(`${doc.module}:${entry.term}`)) errors.push(`${where}: 同一模块里术语重复`);
    else seen.add(`${doc.module}:${entry.term}`);
    if (entry.id !== undefined && !GLOSSARY_ID.test(entry.id)) errors.push(`${where}: id 只能用小写字母、数字、短横`);
    if (!isNonEmptyString(entry.brief)) errors.push(`${where}: 缺 brief（一句话解释）`);
    else if (entry.brief.length > 60) errors.push(`${where}: brief 超过 60 字`);
    if (!isNonEmptyString(entry.explain)) errors.push(`${where}: 缺 explain（白话展开）`);
    else if (entry.explain.length < 20) errors.push(`${where}: explain 太短（至少 20 字）`);
    if (entry.aliases !== undefined && (!Array.isArray(entry.aliases) || entry.aliases.some((item) => !isNonEmptyString(item)))) errors.push(`${where}: aliases 必须是字符串数组`);
    if (entry.related !== undefined && (!Array.isArray(entry.related) || entry.related.some((item) => !isNonEmptyString(item)))) errors.push(`${where}: related 必须是字符串数组`);
    if (entry.example !== undefined && typeof entry.example !== 'string') errors.push(`${where}: example 必须是字符串`);
    if (entry.source !== undefined) {
      if (!entry.source || typeof entry.source !== 'object') errors.push(`${where}: source 必须是 { classic, section } 对象`);
      else {
        if (!CLASSICS[entry.source.classic]) errors.push(`${where}: source.classic「${entry.source.classic}」不在登记表里`);
        if (entry.source.section !== undefined && !isNonEmptyString(entry.source.section)) errors.push(`${where}: source.section 必须是非空字符串`);
      }
    }
    const known = new Set(['id', 'term', 'aliases', 'brief', 'explain', 'example', 'source', 'related']);
    Object.keys(entry).forEach((key) => {
      if (!known.has(key)) errors.push(`${where}: 未知字段 ${key}`);
    });
  });
  return errors;
};

const GANZHI = /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/;

/** 校验经典命例文件（src/data/cases/*.json）。 */
export const validateCasesDoc = (doc, ctx = {}) => {
  const errors = [];
  const file = ctx.file ?? '(命例)';
  const seen = ctx.seenIds ?? new Set();
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return [`${file}: 顶层必须是对象`];
  if (!MODULES.includes(doc.module)) errors.push(`${file}: module 须是 ${MODULES.join('/')}`);
  if (!Array.isArray(doc.entries) || doc.entries.length === 0) {
    errors.push(`${file}: entries 必须是非空数组`);
    return errors;
  }
  doc.entries.forEach((entry, index) => {
    const where = `${file} entries[${index}]${entry?.id ? ` (${entry.id})` : ''}`;
    if (!entry || typeof entry !== 'object') {
      errors.push(`${where}: 必须是对象`);
      return;
    }
    if (!isNonEmptyString(entry.id) || !ID_PATTERN.test(entry.id)) errors.push(`${where}: id 须形如 bazi.sanming.001`);
    else if (seen.has(entry.id)) errors.push(`${where}: id 重复`);
    else seen.add(entry.id);
    if (!isNonEmptyString(entry.name)) errors.push(`${where}: 缺 name（命主称呼，古籍命例可写「某造」）`);
    if (!entry.source || typeof entry.source !== 'object') errors.push(`${where}: 缺 source（{ classic 或 title, section }）`);
    else {
      if (entry.source.classic !== undefined && !CLASSICS[entry.source.classic]) errors.push(`${where}: source.classic「${entry.source.classic}」不在登记表里`);
      if (entry.source.classic === undefined && !isNonEmptyString(entry.source.title)) errors.push(`${where}: source 须有 classic（登记表 key）或 title（书名）`);
      if (!isNonEmptyString(entry.source.section)) errors.push(`${where}: 缺 source.section（卷/篇）`);
    }
    if (!isNonEmptyString(entry.original)) errors.push(`${where}: 缺 original（原书记载：断语或生辰原文）`);

    const birth = entry.birth;
    if (doc.module === 'liuyao') {
      const cast = entry.cast;
      if (birth !== undefined) errors.push(`${where}: 六爻命例用 cast 不用 birth`);
      if (!cast || typeof cast !== 'object') errors.push(`${where}: 缺 cast（起卦资料）`);
      else {
        if (!HEXAGRAMS.includes(cast.hexagram)) errors.push(`${where}: cast.hexagram「${cast.hexagram}」不是六十四卦全名`);
        if (cast.changed !== undefined && cast.changed !== null && !HEXAGRAMS.includes(cast.changed)) errors.push(`${where}: cast.changed「${cast.changed}」不是六十四卦全名`);
        if (!Array.isArray(cast.movingLines) || cast.movingLines.some((n) => !Number.isInteger(n) || n < 1 || n > 6)) errors.push(`${where}: cast.movingLines 须是 1–6 的整数数组（无动爻写 []）`);
        ['monthGanZhi', 'dayGanZhi'].forEach((key) => {
          if (cast[key] !== undefined && !GANZHI.test(cast[key])) errors.push(`${where}: cast.${key} 须是干支，如 甲子`);
        });
        if (cast.date !== undefined && !isNonEmptyString(cast.date)) errors.push(`${where}: cast.date 须是字符串（原书所记日期）`);
        if (cast.topic !== undefined && !isNonEmptyString(cast.topic)) errors.push(`${where}: cast.topic 须是字符串`);
        const knownCast = new Set(['hexagram', 'changed', 'movingLines', 'monthGanZhi', 'dayGanZhi', 'date', 'topic']);
        Object.keys(cast).forEach((key) => {
          if (!knownCast.has(key)) errors.push(`${where}: cast 未知字段 ${key}`);
        });
      }
    } else if (!birth || typeof birth !== 'object') errors.push(`${where}: 缺 birth`);
    else {
      if (!['solar', 'lunar', 'unknown'].includes(birth.calendar)) errors.push(`${where}: birth.calendar 须是 solar/lunar/unknown`);
      if (birth.calendar !== 'unknown') {
        if (!Number.isInteger(birth.year)) errors.push(`${where}: birth.year 须是整数`);
        if (!Number.isInteger(birth.month) || birth.month < 1 || birth.month > 12) errors.push(`${where}: birth.month 须是 1–12`);
        if (!Number.isInteger(birth.day) || birth.day < 1 || birth.day > 31) errors.push(`${where}: birth.day 须是 1–31`);
        if (birth.hourIndex !== null && birth.hourIndex !== undefined && (!Number.isInteger(birth.hourIndex) || birth.hourIndex < 0 || birth.hourIndex > 12)) errors.push(`${where}: birth.hourIndex 须是 0–12（12 为晚子时）或 null`);
        if (birth.isLeapMonth !== undefined && typeof birth.isLeapMonth !== 'boolean') errors.push(`${where}: birth.isLeapMonth 须是布尔`);
      }
      if (!['male', 'female', 'unknown'].includes(birth.gender)) errors.push(`${where}: birth.gender 须是 male/female/unknown`);
    }
    if (entry.pillars !== undefined) {
      if (!Array.isArray(entry.pillars) || entry.pillars.length !== 4 || entry.pillars.some((p) => p !== '不详' && !GANZHI.test(p))) errors.push(`${where}: pillars 须是 4 个干支（时柱不详写「不详」）`);
    }
    if (entry.expected !== undefined && (!entry.expected || typeof entry.expected !== 'object')) errors.push(`${where}: expected 必须是对象`);
    if (!ENTRY_STATUS.includes(entry.status)) errors.push(`${where}: status 须是 ${ENTRY_STATUS.join('/')}`);
    ['vernacular', 'notes'].forEach((key) => {
      if (entry[key] !== undefined && typeof entry[key] !== 'string') errors.push(`${where}: ${key} 必须是字符串`);
    });
    const known = new Set(['id', 'name', 'source', 'birth', 'cast', 'pillars', 'expected', 'original', 'vernacular', 'notes', 'status']);
    Object.keys(entry).forEach((key) => {
      if (!known.has(key)) errors.push(`${where}: 未知字段 ${key}`);
    });
  });
  return errors;
};
