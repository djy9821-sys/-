/**
 * 六爻断卦辅助（程序初判）
 *
 * 按所问类别取用神，看用神在月建、日辰下的旺衰，动爻与变爻对用神的生克，
 * 世应关系、卦的六冲六合与游魂归魂，再给出倾向与应期提示，整理成几条断语要点。
 * 规则取自《增删卜易》《卜筮正宗》等通行口诀的简化版，用计分把它们串起来：
 * 只做“程序初判”，帮助看不懂装卦表的人抓住重点，不替代人的综合判断。
 */
import { CONTROLS, GENERATES, relativeOf, ZHI_CLASH, ZHI_ELEMENT, ZHI_HARMONY } from './liuyao.js';
import { LIUYAO_TOPIC_LABELS } from './liuyaoRecord.js';

/** 问事类别：值、名称、说明，以及用神怎么取（relative 为 null 表示自占以世爻为用神）。 */
export const LIUYAO_TOPICS = Object.freeze([
  { value: 'general', label: LIUYAO_TOPIC_LABELS.general, hint: '不便归类的事，以世爻为用神看走势', relative: null },
  { value: 'wealth', label: LIUYAO_TOPIC_LABELS.wealth, hint: '买卖、投资、收款、财运', relative: '妻财', aux: [['兄弟', '劫财竞争']] },
  { value: 'career', label: LIUYAO_TOPIC_LABELS.career, hint: '职位、求职、公司、上司', relative: '官鬼', aux: [['妻财', '薪酬待遇'], ['父母', '文书合同']] },
  { value: 'love', label: LIUYAO_TOPIC_LABELS.love, hint: '恋爱、婚姻、对方心意', relative: null, byGender: { male: '妻财', female: '官鬼' } },
  { value: 'health', label: LIUYAO_TOPIC_LABELS.health, hint: '自己的身体与病情', relative: null, aux: [['官鬼', '病症'], ['子孙', '医药']] },
  { value: 'travel', label: LIUYAO_TOPIC_LABELS.travel, hint: '出差、旅行、搬迁', relative: null, aux: [['官鬼', '阻碍'], ['父母', '车船行李']] },
  { value: 'study', label: LIUYAO_TOPIC_LABELS.study, hint: '考试、升学、证书', relative: '父母', aux: [['官鬼', '名次录取']] },
  { value: 'lawsuit', label: LIUYAO_TOPIC_LABELS.lawsuit, hint: '诉讼、纠纷、口舌', relative: '官鬼', aux: [['父母', '文书证据']] },
  { value: 'children', label: LIUYAO_TOPIC_LABELS.children, hint: '子女、怀孕、胎儿男女、产期、晚辈；问产妇平安另选「产妇平安」', relative: '子孙' },
  { value: 'parents', label: LIUYAO_TOPIC_LABELS.parents, hint: '父母、长辈、师长', relative: '父母' },
  { value: 'friends', label: LIUYAO_TOPIC_LABELS.friends, hint: '兄弟姐妹、朋友、同事', relative: '兄弟' },
  { value: 'home', label: LIUYAO_TOPIC_LABELS.home, hint: '买房租房、房屋、车辆', relative: '父母', aux: [['妻财', '价钱']] },
  { value: 'life', label: LIUYAO_TOPIC_LABELS.life, hint: '一生大势以世爻为用神；古法主张财福、功名、婚姻、子嗣寿元各占一卦', relative: null },
  { value: 'maternity', label: LIUYAO_TOPIC_LABELS.maternity, hint: '问产妇生产是否平安，夫占、代占都取妻财；问胎儿、产期选「子女孕育」', relative: '妻财', aux: [['兄弟', '胎前产后忌兄动'], ['官鬼', '临盆忌鬼动']] },
  { value: 'weather', label: LIUYAO_TOPIC_LABELS.weather, hint: '晴雨风云：父母主雨，子孙、妻财主晴，官鬼浓云雷电，兄弟风云', relative: null, mode: 'weather' },
]);

const TOPIC_BY_VALUE = Object.fromEntries(LIUYAO_TOPICS.map((topic) => [topic.value, topic]));

/** 五行的墓库（土随水，墓于辰）。 */
const TOMB = Object.freeze({ 木: '未', 火: '戌', 金: '丑', 水: '辰', 土: '辰' });
/** 进神：亥子、寅卯、巳午、申酉、丑辰未戌，前者化后者为进。 */
const PROGRESS = Object.freeze({ 亥: '子', 寅: '卯', 巳: '午', 申: '酉', 丑: '辰', 辰: '未', 未: '戌', 戌: '丑' });
const GOD_HINTS = Object.freeze({
  青龙: '青龙主喜庆、酒色',
  朱雀: '朱雀主口舌、文书、消息',
  勾陈: '勾陈主迟滞、田土、牵连',
  螣蛇: '螣蛇主虚惊、怪异、反复',
  白虎: '白虎主刚猛、血光、丧服',
  玄武: '玄武主暗昧、盗失、不明',
});

/** other 对 subject 的作用：同我、生我、我生（泄）、我克（耗）、克我。 */
export const relationOf = (subject, other) => {
  if (subject === other) return 'same';
  if (GENERATES[other] === subject) return 'generated';
  if (GENERATES[subject] === other) return 'drained';
  if (CONTROLS[subject] === other) return 'spent';
  return 'controlled';
};

const MONTH_TEXT = { same: '月建比扶', generated: '月建生扶', drained: '月建泄气', spent: '月建耗力', controlled: '月建克制' };
const DAY_TEXT = { same: '日辰比扶', generated: '日辰生扶', drained: '日辰泄气', spent: '日辰耗力', controlled: '日辰克制' };
const RELATION_SCORE = { same: 2, generated: 2, drained: -1, spent: -1, controlled: -2 };

const describeTopic = (topic, gender) => {
  const meta = TOPIC_BY_VALUE[topic] ?? TOPIC_BY_VALUE.general;
  const relative = meta.byGender ? (meta.byGender[gender] ?? null) : meta.relative;
  return { meta, relative, genderMissing: Boolean(meta.byGender) && !meta.byGender[gender] };
};

/** 用神两现：先取动爻，再取空破之爻，再取临世应者，最后取在上者。 */
const pickAmong = (candidates) => {
  const moving = candidates.filter((line) => line.isMoving);
  if (moving.length) return { line: moving[moving.length - 1], reason: '取发动之爻' };
  const marked = candidates.filter((line) => line.marks.some((mark) => mark === '月破' || mark === '旬空'));
  if (marked.length) return { line: marked[marked.length - 1], reason: '取空破之爻（有变化者）' };
  const shiYing = candidates.filter((line) => line.isShi || line.isYing);
  if (shiYing.length) return { line: shiYing[shiYing.length - 1], reason: '取临世应之爻' };
  return { line: candidates[candidates.length - 1], reason: '取在上之爻' };
};

const marksOf = (zhi, time) => {
  const marks = [];
  if (time.xunKong.includes(zhi)) marks.push('旬空');
  if (ZHI_CLASH[time.monthZhi] === zhi) marks.push('月破');
  if (ZHI_CLASH[time.dayZhi] === zhi) marks.push('日冲');
  return marks;
};

/**
 * 一个爻在月建、日辰下的旺衰：返回分数、等级与说明。
 * @param target { zhi, element, isMoving, marks }
 */
export const assessStrength = (target, time) => {
  const monthElement = ZHI_ELEMENT[time.monthZhi];
  const dayElement = ZHI_ELEMENT[time.dayZhi];
  const monthRelation = relationOf(target.element, monthElement);
  const dayRelation = relationOf(target.element, dayElement);
  const marks = target.marks ?? marksOf(target.zhi, time);
  const notes = [];
  let score = 0;

  // 月建
  if (marks.includes('月破')) {
    score -= 3;
    notes.push('月破');
  } else if (target.zhi === time.monthZhi) {
    score += 3;
    notes.push('临月建');
  } else {
    score += RELATION_SCORE[monthRelation];
    notes.push(MONTH_TEXT[monthRelation]);
  }
  if (ZHI_HARMONY[time.monthZhi] === target.zhi) {
    score += target.isMoving ? -1 : 1;
    notes.push(target.isMoving ? '月建合绊' : '月建合起');
  }

  // 日辰
  const monthSupports = marks.includes('月破') ? false : (monthRelation === 'same' || monthRelation === 'generated');
  if (marks.includes('日冲')) {
    if (target.isMoving) {
      score -= 1;
      notes.push('动而逢日冲，力量分散');
    } else if (monthSupports) {
      score += 1;
      notes.push('日辰冲起，静爻暗动');
    } else {
      score -= 2;
      notes.push('休囚又逢日冲，日破');
    }
  } else if (target.zhi === time.dayZhi) {
    score += 3;
    notes.push('临日辰');
  } else {
    score += RELATION_SCORE[dayRelation];
    notes.push(DAY_TEXT[dayRelation]);
  }
  if (ZHI_HARMONY[time.dayZhi] === target.zhi) {
    score += target.isMoving ? -1 : 1;
    notes.push(target.isMoving ? '日辰合住' : '日辰合起');
  }

  // 旬空
  const daySupports = dayRelation === 'same' || dayRelation === 'generated' || target.zhi === time.dayZhi;
  let emptyKind = '';
  if (marks.includes('旬空')) {
    if (marks.includes('月破')) {
      emptyKind = '破空';
      score -= 2;
      notes.push('又逢旬空，破而且空');
    } else if (target.isMoving || marks.includes('日冲') || monthSupports || daySupports) {
      emptyKind = '假空';
      score -= 1;
      notes.push('旬空，但有气（动、冲、生扶），出空即实');
    } else {
      emptyKind = '真空';
      score -= 3;
      notes.push('休囚又旬空，真空无用');
    }
  }

  const level = score >= 2 ? '旺相' : score <= -2 ? '休囚' : '平';
  return { score, level, notes, monthRelation, dayRelation, marks, emptyKind };
};

const lineLabel = (line) => `${line.relative}${line.ganZhi}（${line.positionName}）`;

const changeOf = (line, time) => {
  const changed = line.changed;
  if (!changed) return null;
  const relation = relationOf(line.element, changed.element);
  const changedMarks = marksOf(changed.zhi, time);
  let score;
  let text;
  if (changed.zhi === line.zhi) {
    text = '化伏吟，事情反复难进';
    score = -1;
  } else if (ZHI_CLASH[line.zhi] === changed.zhi) {
    text = '化反吟，反复不定';
    score = -1;
  } else if (relation === 'generated') {
    text = `化${changed.relative}${changed.ganZhi}回头生`;
    score = 2;
  } else if (relation === 'controlled') {
    text = `化${changed.relative}${changed.ganZhi}回头克`;
    score = -3;
  } else if (relation === 'same') {
    if (PROGRESS[line.zhi] === changed.zhi) {
      text = `化${changed.ganZhi}进神，越走越旺`;
      score = 2;
    } else if (PROGRESS[changed.zhi] === line.zhi) {
      text = `化${changed.ganZhi}退神，渐渐退缩`;
      score = -1;
    } else {
      text = `化${changed.ganZhi}比和`;
      score = 1;
    }
  } else if (TOMB[line.element] === changed.zhi) {
    text = `化${changed.ganZhi}入墓，受困难出`;
    score = -2;
  } else if (relation === 'drained') {
    text = `化${changed.relative}${changed.ganZhi}泄气`;
    score = -1;
  } else {
    text = `化${changed.relative}${changed.ganZhi}耗力`;
    score = -1;
  }
  if (changedMarks.includes('旬空')) {
    text += '，变爻旬空';
    score -= 1;
  }
  if (changedMarks.includes('月破')) {
    text += '，变爻月破';
    score -= 1;
  }
  return { score, text, relation };
};

/** 另一动爻对用神的作用。 */
const influenceOf = (line, yong, time) => {
  const relation = relationOf(yong.element, line.element);
  const weak = line.marks.includes('旬空') || line.marks.includes('月破');
  const harmonized = ZHI_HARMONY[line.zhi] === yong.zhi;
  const clashed = ZHI_CLASH[line.zhi] === yong.zhi;
  let score;
  let text;
  if (relation === 'generated') {
    text = `${lineLabel(line)}发动生用神`;
    score = 2;
  } else if (relation === 'controlled') {
    text = `${lineLabel(line)}发动克用神`;
    score = -2;
  } else if (relation === 'same') {
    text = `${lineLabel(line)}发动比扶用神`;
    score = 1;
  } else if (relation === 'drained') {
    text = `${lineLabel(line)}发动，用神生之而泄气`;
    score = -1;
  } else {
    text = `${lineLabel(line)}发动，受用神所克`;
    score = 0;
  }
  if (harmonized) {
    text += yong.isMoving ? '，又合绊用神' : '，又合起用神';
    score += yong.isMoving ? -1 : 1;
  }
  if (clashed) {
    text += '，又冲用神';
    score -= 1;
  }
  const change = changeOf(line, time);
  if (change?.relation === 'controlled' && score !== 0) {
    text += '，但自身化回头克，力量减半';
    score = Math.round(score / 2);
  }
  if (weak && score !== 0) {
    text += `（本身${line.marks.filter((mark) => mark !== '日冲').join('、')}，力量有限）`;
    score = Math.round(score / 2);
  }
  return { score, text };
};

const describeHiddenFlyer = (hiddenItem, flyer) => {
  const relation = relationOf(hiddenItem.element, flyer.element);
  const flyerOpen = flyer.isMoving || flyer.marks.includes('旬空') || flyer.marks.includes('月破') || flyer.marks.includes('日冲');
  const texts = {
    generated: '飞神生伏神，伏神有气',
    controlled: '飞神克伏神，伏神受压',
    same: '飞伏比和',
    drained: '伏神生飞神，泄气',
    spent: '伏神克飞神，可以出伏',
  };
  return {
    score: relation === 'generated' ? 1 : relation === 'controlled' ? -2 : relation === 'spent' ? 0 : -1,
    text: `${texts[relation]}${flyerOpen ? '；飞神动或空破，伏神容易出伏' : '；飞神安静，伏神待日月生扶或冲动飞神时出伏'}`,
  };
};

const timingOf = (yong, strength) => {
  const zhi = yong.zhi;
  const hints = [];
  if (yong.hidden) {
    hints.push(`用神伏藏，常应在${zhi}日（值）、${ZHI_CLASH[yong.flyer.zhi]}日（冲飞神）或飞神空破之时`);
  } else {
    hints.push(`用神临${zhi}，应期常看${zhi}日、${zhi}月（值），或${ZHI_HARMONY[zhi]}日（合）`);
  }
  if (strength.emptyKind && strength.emptyKind !== '破空') hints.push('用神旬空，多应在出空之后，或逢值日、冲日填实');
  if (strength.marks.includes('月破')) hints.push('用神月破，多应在出月之后，或逢合、逢值之日');
  if (!yong.hidden && !yong.isMoving && !strength.marks.includes('日冲')) hints.push(`用神安静，多待${ZHI_CLASH[zhi]}日冲动，或${zhi}日值日`);
  if (yong.isMoving && (strength.notes.includes('日辰合住') || strength.notes.includes('月建合绊'))) hints.push(`用神动而被合，待${ZHI_CLASH[zhi]}日冲开`);
  if (yong.isMoving && !hints.some((hint) => hint.includes('合'))) hints.push('用神发动，事已在进行之中，应期较近');
  return hints.slice(0, 3);
};

const verdictOf = (total, yongHidden) => {
  if (total >= 3) return { level: 'good', title: '偏吉', text: '用神有力，所问之事可成，宜顺势推进。' };
  if (total <= -3) return { level: 'bad', title: '偏弱', text: `用神${yongHidden ? '伏藏又' : ''}受制，所问之事阻力较大，宜缓宜守。` };
  return { level: 'mixed', title: '平', text: '用神平平、吉凶参半，成败看后续变化与应期。' };
};

/* ---------- 天时（晴雨） ---------- */

/** 五行长生之支（土随水）：「晴逢子动，望晴只待子逢生」。 */
const CHANG_SHENG = Object.freeze({ 木: '亥', 火: '寅', 金: '巳', 水: '申', 土: '申' });
/** 五行临绝之支（土随水）：「欲雨须得财墓绝」。 */
const JUE = Object.freeze({ 木: '申', 火: '亥', 金: '寅', 水: '巳', 土: '巳' });
/** 三合局（生、旺、墓）。 */
const SAN_HE = Object.freeze([
  Object.freeze({ zhis: ['申', '子', '辰'], element: '水' }),
  Object.freeze({ zhis: ['亥', '卯', '未'], element: '木' }),
  Object.freeze({ zhis: ['寅', '午', '戌'], element: '火' }),
  Object.freeze({ zhis: ['巳', '酉', '丑'], element: '金' }),
]);
/** 《增删卜易·天时章》各六亲发动之象。 */
const WEATHER_SIGNS = Object.freeze({
  父母: { kind: 'rain', text: '主雨（父动伤子，云雾掩日）', changed: '不拘旺衰，后有雨' },
  子孙: { kind: 'clear', text: '主晴（子孙为日月星斗，万里无云）', changed: '后转晴明' },
  妻财: { kind: 'clear', text: '主晴（财动克父，天气晴明）', changed: '由云雾中变出日色，后转晴' },
  官鬼: { kind: 'overcast', text: '主浓云黑雾，或有雷电（鬼为父之元神）', changed: '后转阴云' },
  兄弟: { kind: 'cloudy', text: '主风云（云淡风轻，日在云中出没，非晴非雨）', changed: '后转风云' },
});
const WEATHER_WORD = Object.freeze({ rain: '雨', clear: '晴', overcast: '阴', cloudy: '多云', wind: '风' });
const WEATHER_INTRO = '天时以父母为雨、子孙为晴、妻财亦主晴、官鬼为浓云雷电、兄弟为风云；野鹤老人占天时「不论旺衰」，只看哪一爻发动、暗动、化出（《增删卜易·天时章》）。';
const ZHI_ORDER = '子丑寅卯辰巳午未申酉戌亥';
const weatherKindOf = (relative) => WEATHER_SIGNS[relative].kind;
const isClearRelative = (relative) => relative === '子孙' || relative === '妻财';
/** 从起卦之日数到 zhi 日要几天（当天为 0）。 */
const daysUntil = (zhi, dayZhi) => (ZHI_ORDER.indexOf(zhi) - ZHI_ORDER.indexOf(dayZhi) + 12) % 12;

/** 天时的用神线：先取发动的，再按两现规则；不上卦取伏神。 */
const weatherLineOf = (relative, lines, hidden, time) => {
  const candidates = lines.filter((line) => line.relative === relative);
  if (candidates.length) return candidates.length === 1 ? candidates[0] : pickAmong(candidates).line;
  const hiddenItem = hidden.find((item) => item.relative === relative);
  if (!hiddenItem) return null;
  const flyer = lines[hiddenItem.position - 1];
  return { ...hiddenItem, hidden: true, flyer, isMoving: false, marks: marksOf(hiddenItem.zhi, time), isShi: false, isYing: false, god: flyer.god };
};

/**
 * 一个迹象的应期：动者逢值逢合，静（暗动）者逢合逢值，动而逢空应冲空、填实，动而月破应实破，
 * 动而被日辰合住、伏吟待冲开，化回头克待冲去克神，化出之爻看其值日（天时章其二十六、二十九、三十、三十五、三十六）。
 * 应期之日就是起卦当天的，写作「今日」。
 */
const weatherWhenOf = (signal, time) => {
  const { line, source } = signal;
  const day = (zhi) => (zhi === time.dayZhi ? `今日（${zhi}日）` : `${zhi}日`);
  if (signal.blockedBy) return { text: `${day(ZHI_CLASH[signal.blockedBy])}冲去克神`, why: '' };
  if (source === 'sanhe') return { text: signal.zhis.map(day).join('、'), why: '局中之爻逢值' };
  if (!line) return null;
  if (source === 'changed') return { text: day(line.zhi), why: '' };
  // 暗动之爻当天被冲起即可应（雷山小过、风地观占例），否则应逢合之日（水火既济、离为火占例），或逢值之日
  if (source === 'dark') return { text: `今日或${day(ZHI_HARMONY[line.zhi])}、${day(line.zhi)}`, why: '暗动：冲起之日即应，或应逢合、逢值之日' };
  const marks = line.marks ?? [];
  if (line.changed?.zhi === line.zhi) return { text: `${day(ZHI_CLASH[line.zhi])}冲开`, why: '伏吟，动如不动' };
  if (marks.includes('旬空')) return { text: `${day(ZHI_CLASH[line.zhi])}冲空或${day(line.zhi)}填实`, why: '' };
  if (marks.includes('月破')) return { text: day(line.zhi), why: '动而月破，应实破之日' };
  if (ZHI_HARMONY[time.dayZhi] === line.zhi) return { text: `${day(ZHI_CLASH[line.zhi])}冲开`, why: '被日辰合住' };
  return { text: `${day(line.zhi)}或${day(ZHI_HARMONY[line.zhi])}`, why: '' };
};

const describeSource = (signal) => {
  if (signal.source === 'changed') return `化出${signal.relative}${signal.line.ganZhi}`;
  if (signal.source === 'sanhe') return '三合局';
  const { positionName, relative, ganZhi } = signal.line;
  const label = `${positionName}${relative}${ganZhi}`;
  if (signal.blockedBy) return `${label}化回头克`;
  return signal.source === 'dark' ? `${label}暗动` : `${label}动`;
};

/** 一组迹象合成一句：晴雨并见各应其时；财晴遇鬼为云雾；木动加一句风。 */
const summarizeWeather = (signals) => {
  if (!signals.length) return null;
  const kinds = new Set(signals.map((signal) => signal.kind));
  const sunUp = signals.some((signal) => signal.kind === 'clear' && signal.relative === '子孙');
  const windy = kinds.has('wind');
  const windNote = windy ? '木动生风，有风。' : '';
  if (kinds.has('rain') && kinds.has('clear')) {
    return { key: 'mixed', title: '晴雨各有其时', text: `主雨与主晴之爻同现，晴雨各应其时，不是半晴半雨（觉子：「论阴晴各有其时」）。${windNote}`, windy };
  }
  if (kinds.has('rain')) {
    const text = kinds.has('overcast') ? '父母主雨，又有官鬼浓云，阴雨。' : kinds.has('cloudy') || windy ? '父母主雨，兼有风云，风雨交作。' : '父母主雨。';
    return { key: 'rain', title: windy || kinds.has('cloudy') ? '风雨' : '有雨', text, windy };
  }
  if (kinds.has('clear')) {
    if (kinds.has('overcast') && !sunUp) {
      return { key: 'overcast', title: windy ? '阴而有风' : '阴', text: `妻财虽主晴，又有官鬼，晴或逢官，为烟为雾，多云雾而少见日。${windNote}`, windy };
    }
    let text = '妻财主晴；子孙不动，晴而不大晴，常有浮云薄雾。';
    if (sunUp) text = kinds.has('overcast') ? '子孙主晴，官鬼所临之时间有烟雾。' : kinds.has('cloudy') ? '子孙主晴，间有浮云。' : '子孙主晴，晴朗少云。';
    return { key: 'clear', title: windy ? '晴而有风' : '晴', text: text + windNote, sunUp, windy };
  }
  if (kinds.has('overcast')) return { key: 'overcast', title: windy ? '阴而有风' : '阴', text: `官鬼主浓云黑雾，或有雷电；父母不动，少雨（父衰鬼旺，少雨浓云）。${windNote}`, windy };
  if (kinds.has('cloudy')) return { key: 'cloudy', title: windy ? '多云有风' : '多云', text: `兄弟主风云，云淡风轻，日在云中出没，非晴非雨。${windNote}`, windy };
  return { key: 'wind', title: '有风', text: '木动生风，无雨。', windy };
};

/** 六爻安静时的参考：静者逢值逢冲（静而月破则不应），父母休囚不动则雨难望。 */
const staticWeatherHints = (lines, hidden, time) => {
  const hints = ['六爻安静难断，最好再占得动爻'];
  [['父母', '有雨'], ['子孙', '转晴']].forEach(([relative, effect]) => {
    const line = weatherLineOf(relative, lines, hidden, time);
    if (!line) return;
    if (line.hidden) {
      hints.push(`${relative}${line.ganZhi}伏藏，待${line.zhi}日值或${ZHI_CLASH[line.flyer.zhi]}日冲开飞神，或可${effect}`);
      return;
    }
    const strength = assessStrength(line, time);
    if (strength.marks.includes('月破')) hints.push(`${lineLabel(line)}静而月破，逢冲亦不应${relative === '父母' ? '，阴云而已' : ''}`);
    else if (relative === '父母' && strength.level === '休囚') hints.push(`${lineLabel(line)}休囚安静，雨难望`);
    else hints.push(`${lineLabel(line)}安静：静者逢值逢冲，${line.zhi}日或${ZHI_CLASH[line.zhi]}日或可${effect}`);
  });
  return hints;
};

/**
 * 天时：不取单一用神，逐爻看发动、暗动、化出与三合局，归成雨、晴、阴（浓云）、多云、风几种迹象再合断。
 * 规则取《增删卜易·天时章》野鹤老人与觉子的定论（与旧注不同处从野鹤），并用书中天时占例逐条核对过：
 * - 动者为先，变者为后：化出父母后有雨，化出子孙妻财后转晴，化出官鬼后转阴，化出兄弟后转风云；
 * - 父、鬼、兄化退神，雨止云开转晴；子孙妻财化退神，晴不久；
 * - 化回头克，须待冲去克神之日方应（福兴被克，冲则成功）；
 * - 暗动（日冲静爻，不论旺衰）照常论；但占雨父不动而财暗动、占晴子财不动而父暗动才作数（雨嫌妻位以逢冲），
 *   相反之爻发动而后转为他象（化鬼、化退等）时，暗动之爻接着应；
 * - 竞发父官（父母、官鬼各有爻发动）又不见子孙妻财发动，连朝风雨；单是父化鬼仍作风雨交作；
 * - 父母子孙（妻财）同动，晴雨各应其时，不作半晴半雨。
 */
const judgeWeather = (reading, meta) => {
  const { lines, hidden, time, hexagram } = reading;
  const signals = [];
  const sequences = [];
  const notes = [];
  const blockedHints = [];
  const add = (signal) => signals.push(signal);

  // 一、发动之爻：本爻之象为先，化出之象为后
  const movingInfo = lines.filter((line) => line.isMoving).map((line) => {
    const changed = line.changed;
    const from = line.relative;
    const to = changed?.relative;
    const blocked = Boolean(changed) && relationOf(line.element, changed.element) === 'controlled';
    const retreat = Boolean(changed) && PROGRESS[changed.zhi] === line.zhi;
    const advance = Boolean(changed) && PROGRESS[line.zhi] === changed.zhi;
    // 此爻之象后来转成别的天气（化出他类、化退），相反的暗动之爻才接着应
    const turns = !blocked && (retreat || (Boolean(changed) && weatherKindOf(to) !== weatherKindOf(from)));
    return { line, changed, from, to, blocked, retreat, advance, turns };
  });

  movingInfo.forEach(({ line, changed, from, to, blocked, retreat, advance }) => {
    const label = lineLabel(line);
    const phase = blocked ? 'blocked' : 'now';
    const blockedBy = blocked ? changed.zhi : null;
    let text = `${label}发动，${WEATHER_SIGNS[from].text}`;
    if (from === '官鬼' && line.element === '金' && (changed?.element === '金' || line.marks.includes('旬空'))) text += '；金鬼化金或逢空，主雷（金空则响）';
    else if (from === '官鬼' && line.element === '火') text += '；火鬼动，多闪电';
    add({ kind: weatherKindOf(from), relative: from, text, phase, source: 'moving', line, blockedBy });
    if (blocked) blockedHints.push({ line, text: `${label}化回头克，须待${ZHI_CLASH[changed.zhi]}日冲去克神方应` });
    // 木动生风：不拘六亲，化进神风大
    if (line.element === '木') add({ kind: 'wind', relative: from, text: `${label}木爻发动，木动生风${advance ? '，化进神风大' : ''}`, phase, source: 'moving', line, blockedBy });
    if (!changed) return;
    if (retreat) {
      if (isClearRelative(from)) notes.push(`${label}化退神，晴不久`);
      else add({ kind: 'clear', relative: from, text: `${label}化退神，${{ 父母: '雨将止', 官鬼: '雨将止、雾将散', 兄弟: '云将开' }[from]}，转晴`, phase: 'later', source: 'retreat', line });
    }
    if (to !== from && !blocked) {
      // 父化鬼：鬼为父之元神，雨势不止，兼有雷电浓云（雷山小过、风水涣占例皆只断雨）
      const fuToGui = from === '父母' && to === '官鬼';
      add({ kind: fuToGui ? 'rain' : weatherKindOf(to), relative: to, text: `${label}化出${to}${changed.ganZhi}，${fuToGui ? '鬼为父之元神，雨势不止，兼有雷电浓云' : WEATHER_SIGNS[to].changed}`, phase: 'later', source: 'changed', line: changed });
    }
    if (isClearRelative(from) && to === '官鬼') sequences.push(`${from === '子孙' ? '子' : '财'}化鬼，晴明不久`);
    else if (from === '妻财' && to === '子孙') sequences.push('财化子孙，晴而更明');
    else if (from === '兄弟' && to === '子孙') sequences.push('兄化子孙，云开日出');
    else if (from === '父母' && (to === '兄弟' || to === '官鬼')) sequences.push(`父化${to === '兄弟' ? '兄' : '鬼'}，风雨交作`);
    else if (from === '兄弟' && to === '父母') sequences.push('兄化父，先风而后雨');
    else if (from === '官鬼' && to === '父母') sequences.push('鬼化父，先浓云雷电而后雨');
    else if (from === '父母' && isClearRelative(to) && !blocked) sequences.push('父化子财，雨之不久');
  });

  // 二、暗动：静爻逢日冲即作动看，天时不论旺衰；静而月破者不应
  const darkLines = lines.filter((line) => !line.isMoving && line.marks.includes('日冲') && !line.marks.includes('月破'));
  darkLines.forEach((line) => {
    const label = lineLabel(line);
    const empty = line.marks.includes('旬空');
    // 卦逢暗冲：父母静空日冲主雨，子财主晴，兄弟主轻风薄雾，木临兄鬼主风；官鬼书中占例作阴天论（风地观占例「两爻火鬼暗动，今日还是阴天」）
    const kind = weatherKindOf(line.relative);
    const how = empty ? '静而逢空，日建冲之' : '静而逢日冲，暗动';
    const meaning = { rain: '主雨', clear: '主晴', overcast: '主阴云', cloudy: '主轻风薄雾' }[kind];
    const opposite = movingInfo.filter((info) => (kind === 'rain' ? isClearRelative(info.from) : kind === 'clear' ? info.from === '父母' : false));
    if (opposite.length && !opposite.every((info) => info.turns)) {
      notes.push(`${label}${how}，本${meaning}；但${[...new Set(opposite.map((info) => info.from))].join('、')}发动，暗动不论（雨嫌妻位以逢冲）`);
      return;
    }
    const phase = opposite.length ? 'later' : 'now';
    add({ kind, relative: line.relative, text: `${label}${how}，${meaning}${phase === 'later' ? '，待发动之爻象尽之后应' : ''}`, phase, source: 'dark', line });
    if (empty && line.element === '木' && (line.relative === '兄弟' || line.relative === '官鬼')) {
      add({ kind: 'wind', relative: line.relative, text: `${label}木临${line.relative}，静空逢冲，主风`, phase, source: 'dark', line });
    }
  });

  // 三、三合局：动爻与变爻的地支凑齐一局
  const movedZhis = new Set(movingInfo.flatMap(({ line, changed }) => [line.zhi, changed?.zhi].filter(Boolean)));
  SAN_HE.forEach(({ zhis, element }) => {
    if (movingInfo.length < 2 || !zhis.every((zhi) => movedZhis.has(zhi))) return;
    const relative = relativeOf(hexagram.palaceElement, element);
    add({ kind: weatherKindOf(relative), relative, text: `动变爻合成${zhis.join('')}${element}局，为${relative}局，${WEATHER_SIGNS[relative].text}`, phase: 'now', source: 'sanhe', zhis });
    if (element === '木') add({ kind: 'wind', relative, text: '三合木局主风', phase: 'now', source: 'sanhe', zhis });
  });

  // 四、回头克之爻：别的爻正应时，它等冲去克神之后再应；全卦都被克住时，先冲开的先应
  const blockedSignals = signals.filter((signal) => signal.phase === 'blocked');
  if (blockedSignals.length) {
    const active = signals.some((signal) => signal.phase === 'now');
    const waitOf = (signal) => daysUntil(ZHI_CLASH[signal.blockedBy], time.dayZhi);
    const first = Math.min(...blockedSignals.map(waitOf));
    blockedSignals.forEach((signal) => { signal.phase = !active && waitOf(signal) === first ? 'now' : 'later'; });
  }

  const structure = [];
  const reverseCount = movingInfo.filter(({ line, changed }) => changed && ZHI_CLASH[line.zhi] === changed.zhi).length;
  const stillCount = movingInfo.filter(({ line, changed }) => changed && changed.zhi === line.zhi).length;
  if (reverseCount >= 2) structure.push('卦得反吟，晴雨终须反复');
  if (stillCount >= 2) structure.push('伏吟卦动如不动，冲开之日方应');

  // 五、合断
  const nowSignals = signals.filter((signal) => signal.phase === 'now');
  const laterSignals = signals.filter((signal) => signal.phase === 'later');
  let now = summarizeWeather(nowSignals);
  let later = summarizeWeather(laterSignals);
  if (!now && later) [now, later] = [later, null];
  const live = movingInfo.filter((info) => !info.blocked);
  // 竞发父官：父母、官鬼各有爻发动（单是父化鬼只作风雨交作，书中占例应一两日之雨）
  const fuGui = live.some((info) => info.from === '父母') && live.some((info) => info.from === '官鬼');
  const clearShown = movingInfo.some((info) => isClearRelative(info.from)) || nowSignals.some((signal) => signal.kind === 'clear');
  let key;
  let title;
  let text;
  if (!now) {
    key = 'unsettled';
    title = '难定';
    text = '六爻安静，没有发动或暗动之爻。野鹤老人占天时「一卦不现，再占两卦」，务求有动爻再断。';
  } else if (fuGui && !clearShown) {
    key = 'rain';
    title = '连阴雨';
    text = '父鬼竞发，又不见子孙妻财发动，阴雨连绵；连日再占仍是如此，一定连旬风雨（竞发父官，连朝淫雨）。';
  } else if (now.key === 'mixed') {
    ({ key, title, text } = now);
  } else if (later && now.key === 'clear' && later.key === 'clear' && !now.sunUp && later.sunUp) {
    key = 'clear';
    title = now.title;
    text = '妻财主晴而常有浮云，化出子孙之后大晴。';
  } else if (later && later.key === 'mixed' && (now.key === 'rain' || now.key === 'clear')) {
    // 眼下雨（晴），后来晴雨并见：新出现的是相反之象
    const next = now.key === 'rain' ? 'clear' : 'rain';
    key = `${now.key}-${next}`;
    title = `先${WEATHER_WORD[now.key]}后${WEATHER_WORD[next]}`;
    text = `动者为先，变者为后：先${now.title}，后${next === 'clear' ? '转晴' : '有雨'}（化出之爻晴雨并见，各应其时）。`;
  } else if (later && later.key !== now.key) {
    key = `${now.key}-${later.key}`;
    title = later.key === 'mixed' ? `先${WEATHER_WORD[now.key]}，后晴雨各应其时` : `先${WEATHER_WORD[now.key]}后${WEATHER_WORD[later.key]}`;
    text = `动者为先，变者为后：先${now.title}，后${later.title}。`;
  } else {
    ({ key, title, text } = summarizeWeather([...nowSignals, ...laterSignals]));
  }
  if (sequences.length) text += `${sequences.join('；')}。`;
  if (structure.length && key !== 'unsettled') text += `${structure.join('；')}。`;

  // 六、用神（展示用）与应期
  // 应期优先看发动之爻，其次化出、暗动之爻，最后才是化退、三合
  const LEAD_ORDER = ['moving', 'changed', 'dark', 'retreat', 'sanhe'];
  const leadOf = (list, kind) => LEAD_ORDER.map((source) => list.find((signal) => signal.kind === kind && signal.source === source)).find(Boolean);
  const nowKey = key.split('-')[0];
  const laterKey = key.includes('-') ? key.split('-')[1] : null;
  const rainLead = leadOf(nowSignals, 'rain');
  const clearLead = leadOf(nowSignals, 'clear');
  const lead = nowKey === 'mixed' ? rainLead
    : nowKey === 'unsettled' ? null
      : leadOf(nowSignals, nowKey) ?? leadOf(nowSignals, nowKey === 'rain' ? 'overcast' : 'clear') ?? nowSignals.find((signal) => signal.kind !== 'wind') ?? nowSignals[0];
  const leadLine = lead && lead.source !== 'changed' && lead.source !== 'sanhe' ? lead.line : null;
  const fallbackRelative = { rain: '父母', clear: '子孙', overcast: '官鬼', cloudy: '兄弟', wind: '兄弟', mixed: '父母', unsettled: '父母' }[nowKey];
  const yong = leadLine ?? weatherLineOf(lead?.relative ?? fallbackRelative, lines, hidden, time) ?? lines[hexagram.shi - 1];
  const strength = assessStrength(yong, time);
  const yongDark = lead?.source === 'dark' && leadLine === yong;
  const yongState = yong.hidden ? '伏' : yong.isMoving ? '动' : yongDark ? '暗动' : '静';
  const yongText = yong.hidden
    ? `天时看${yong.relative}：不上卦，伏于${yong.flyer.positionName}${yong.flyer.relative}${yong.flyer.ganZhi}之下（伏神${yong.relative}${yong.ganZhi}）`
    : `天时看${yong.relative}：${lineLabel(yong)}${{ 动: '发动', 暗动: '暗动', 静: '安静' }[yongState]}`;

  const hintOf = (signal, prefix = '') => {
    if (!signal) return null;
    if (signal.source === 'retreat') return `${prefix}转晴：${lineLabel(signal.line)}化退神，不久即止`;
    const when = weatherWhenOf(signal, time);
    return when ? `${prefix}${WEATHER_WORD[signal.kind]}应${when.text}（${describeSource(signal)}${when.why ? `，${when.why}` : ''}）` : null;
  };
  let timing;
  if (key === 'unsettled') {
    timing = staticWeatherHints(lines, hidden, time);
  } else {
    const hints = [];
    const laterLead = laterKey ? leadOf(laterSignals, laterKey === 'mixed' ? 'rain' : laterKey) ?? laterSignals.find((signal) => signal.kind === laterKey) : null;
    const used = nowKey === 'mixed' ? [rainLead, clearLead] : [lead];
    hints.push(...used.map((signal) => hintOf(signal)));
    if (laterLead) hints.push(hintOf(laterLead, '后'));
    // 财动化出子孙：先晴而有浮云，子孙之时大晴（地风升占例「必至午时而见子孙，始大晴也」）
    if (key === 'clear' && now.key === 'clear' && !now.sunUp && later?.sunUp) hints.push(hintOf(leadOf(laterSignals, 'clear'), '大'));
    if (hints[0]) hints[0] += '；只问今日，则看同名时辰';
    // 雨遇财兴：父鬼不动而子财动，雨须待财爻墓绝之日；父动而子财不动，晴须待父爻墓绝之日。
    // 眼下已是雨（晴）象时不提示「问雨」（「问晴」）；化出父母不算父动，照样要等财爻墓绝（坎之井占例：戌日午火入墓方雨）
    const clearMover = movingInfo.find((info) => isClearRelative(info.from));
    const rainMover = movingInfo.find((info) => info.from === '父母');
    let askRain = '';
    let askClear = '';
    if (nowKey !== 'rain' && nowKey !== 'mixed' && clearMover && !rainMover && !movingInfo.some((info) => info.from === '官鬼')) {
      const element = clearMover.line.element;
      askRain = `${laterKey === 'rain' ? '后雨' : '问雨'}：${clearMover.from}发动而父鬼不动，雨须待${clearMover.from}入墓之${TOMB[element]}日或临绝之${JUE[element]}日（雨遇财兴）`;
    }
    if (nowKey !== 'clear' && nowKey !== 'mixed' && rainMover && !clearMover) {
      const element = rainMover.line.element;
      askClear = `问晴：父母发动而子财不动，晴须待父母入墓之${TOMB[element]}日或临绝之${JUE[element]}日`;
    }
    if (laterKey === 'rain' && askRain) {
      hints.push(askRain);
      askRain = '';
    }
    // 化回头克之爻：冲去克神之日才应
    const usedLines = new Set([...used, laterLead].filter((signal) => signal?.blockedBy).map((signal) => signal.line));
    hints.push(...blockedHints.filter((item) => !usedLines.has(item.line)).map((item) => item.text));
    // 晴逢子动，望晴只待子逢生；占雨得父动，后逢长生之日应之
    if (nowKey !== 'mixed' && lead?.source === 'moving' && !lead.blockedBy && lead.relative !== '官鬼' && lead.relative !== '兄弟') {
      hints.push(`${lead.kind === 'rain' ? '雨' : '晴'}也常应在${lead.relative}长生之${CHANG_SHENG[lead.line.element]}日`);
    }
    hints.push(askRain, askClear);
    timing = hints.filter(Boolean).slice(0, 3);
  }

  const dynamics = [...signals.map((signal) => signal.text), ...notes, ...sequences];
  if (!dynamics.length) dynamics.push('六爻安静，无发动、暗动之爻');
  const shiYing = '天时不论世应（觉子：「占雨用父爻，占晴用子孙爻、财爻，与世应何干？」）';
  const verdict = { level: 'mixed', title, text, weather: key };
  const points = [
    WEATHER_INTRO,
    yongText,
    ...dynamics,
    ...(structure.length ? [structure.join('；')] : []),
    shiYing,
    `倾向：${title}。${text}`,
    `应期：${timing.join('；')}`,
  ];

  return {
    topic: meta.value,
    topicLabel: meta.label,
    gender: '',
    genderMissing: false,
    yongShen: {
      relative: yong.relative,
      ganZhi: yong.ganZhi,
      zhi: yong.zhi,
      element: yong.element,
      positionName: yong.hidden ? `伏于${yong.flyer.positionName}下` : yong.positionName,
      god: yong.god,
      state: yongState,
      hidden: Boolean(yong.hidden),
      isShi: Boolean(yong.isShi),
      isYing: Boolean(yong.isYing),
      text: yongText,
    },
    strength,
    dynamics,
    shiYing,
    structure,
    auxiliary: [],
    verdict,
    timing,
    score: signals.length,
    points,
    notices: [],
    contextRelatives: [...new Set([...signals.map((signal) => signal.relative), yong.relative])],
    weather: {
      key,
      kinds: [...new Set(signals.map((signal) => signal.kind))],
      now: now?.key ?? null,
      later: later?.key ?? null,
      signals: signals.map(({ kind, relative, text: signalText, phase, source }) => ({ kind, relative, text: signalText, phase, source })),
      sequences,
      notes,
    },
  };
};

/**
 * @param reading buildLiuYaoReading 的结果
 * @param {{ topic?: string, gender?: string }} [options] 不传时用 reading 里记录的类别与性别
 */
export const judgeLiuYao = (reading, options = {}) => {
  const topic = options.topic ?? reading.topic ?? 'general';
  const gender = options.gender ?? reading.gender ?? '';
  const { lines, hidden, time, hexagram, changed } = reading;
  const { meta, relative, genderMissing } = describeTopic(topic, gender);
  if (meta.mode === 'weather') return judgeWeather(reading, meta);
  const shiLine = lines[hexagram.shi - 1];
  const yingLine = lines[hexagram.ying - 1];
  const points = [];
  const notices = [];
  let total = 0;

  // 一、取用神
  let yong = null;
  let yongText = '';
  if (!relative) {
    yong = shiLine;
    yongText = genderMissing
      ? `问感情没有选择问卦人性别，暂以世爻${lineLabel(yong)}为用神（男测取妻财，女测取官鬼）`
      : `${meta.label}以世爻为用神：${lineLabel(yong)}`;
    if (genderMissing) notices.push('问感情请选择问卦人性别，用神才能取准。');
    if (meta.value === 'life') notices.push('《增删卜易·身命章》主张终身之事分开占：财福、功名、婚姻、子嗣寿元各占一卦，不要一卦兼断。');
  } else {
    const candidates = lines.filter((line) => line.relative === relative);
    if (candidates.length === 1) {
      yong = candidates[0];
      yongText = `${meta.label}取${relative}为用神：${lineLabel(yong)}`;
    } else if (candidates.length > 1) {
      const picked = pickAmong(candidates);
      yong = picked.line;
      yongText = `${meta.label}取${relative}为用神；${relative}两现，${picked.reason}：${lineLabel(yong)}`;
    } else {
      const hiddenItem = hidden.find((item) => item.relative === relative);
      if (hiddenItem) {
        const flyer = lines[hiddenItem.position - 1];
        yong = { ...hiddenItem, hidden: true, flyer, isMoving: false, marks: marksOf(hiddenItem.zhi, time), isShi: false, isYing: false, god: flyer.god };
        yongText = `${meta.label}取${relative}为用神；${relative}不上卦，伏于${flyer.positionName}${flyer.relative}${flyer.ganZhi}之下：伏神${relative}${hiddenItem.ganZhi}`;
      }
    }
  }
  if (!yong) {
    // 理论上不会出现：六亲不全时伏神必有；留一个兜底。
    yong = shiLine;
    yongText = `找不到${relative}，暂以世爻${lineLabel(yong)}为用神`;
  }
  points.push(yongText);

  // 二、旺衰
  const strength = assessStrength(yong, time);
  total += strength.score;
  points.push(`用神${yong.element}${yong.hidden ? '伏而' : yong.isMoving ? '动而' : '静而'}${strength.level}：${strength.notes.join('，')}`);
  if (yong.hidden) {
    const flyerInfo = describeHiddenFlyer(yong, yong.flyer);
    total += flyerInfo.score;
    points.push(flyerInfo.text);
  }
  if (!yong.hidden && GOD_HINTS[yong.god]) points.push(`用神临${yong.god}：${GOD_HINTS[yong.god]}`);

  // 三、动变
  const dynamics = [];
  if (!yong.hidden && yong.isMoving) {
    const change = changeOf(yong, time);
    if (change) {
      total += change.score;
      dynamics.push(`用神发动，${change.text}`);
    }
  }
  lines
    .filter((line) => line.isMoving && (yong.hidden || line.position !== yong.position))
    .forEach((line) => {
      const influence = influenceOf(line, yong, time);
      total += influence.score;
      dynamics.push(influence.text);
    });
  const changedToYong = relative ? lines.filter((line) => line.changed?.relative === relative && (yong.hidden || line.position !== yong.position)) : [];
  if (changedToYong.length) {
    total += 1;
    dynamics.push(`${changedToYong.map((line) => line.positionName).join('、')}动而化出${relative}，用神有应`);
  }
  if (!dynamics.length) dynamics.push(reading.movingPositions.length ? '动爻与用神无直接生克' : '六爻安静，以用神与世应的旺衰和卦辞断事');
  points.push(...dynamics);

  // 四、世应
  const shiStrength = assessStrength(shiLine, time);
  const shiYingRelation = relationOf(shiLine.element, yingLine.element);
  const shiYingTexts = { generated: '应爻生世，对方或外界有助', controlled: '应爻克世，对方或外界不利于我', same: '世应比和', drained: '世爻生应，我方付出较多', spent: '世克应，我方占主动' };
  let shiYingText = shiYingTexts[shiYingRelation];
  let shiYingScore = { generated: 1, controlled: -1, same: 0, drained: 0, spent: 0 }[shiYingRelation];
  if (ZHI_HARMONY[shiLine.zhi] === yingLine.zhi) {
    shiYingText += '，世应相合，彼此有情';
    shiYingScore += 1;
  } else if (ZHI_CLASH[shiLine.zhi] === yingLine.zhi) {
    shiYingText += '，世应相冲，彼此不合';
    shiYingScore -= 1;
  }
  if (yong !== shiLine) {
    if (!yong.hidden && yong.isShi) {
      total += 1;
      shiYingText = `用神持世，事在自己手里；${shiYingText}`;
    } else if (!yong.hidden && yong.isYing) {
      shiYingText = `用神临应，事由对方或外界决定；${shiYingText}`;
    } else {
      const yongToShi = relationOf(shiLine.element, yong.element);
      if (yongToShi === 'generated' || ZHI_HARMONY[yong.zhi] === shiLine.zhi) {
        total += 1;
        shiYingText = `用神生合世爻，事与我有缘；${shiYingText}`;
      } else if (yongToShi === 'controlled') {
        total -= 1;
        shiYingText = `用神克世，得之亦有压力；${shiYingText}`;
      }
    }
  }
  total += shiYingScore;
  points.push(`世爻${lineLabel(shiLine)}${shiStrength.level}，应爻${lineLabel(yingLine)}：${shiYingText}`);

  // 产妇安否：《增删卜易·问产妇安否章》「坐草临盆嫌鬼动，胎前产后忌兄摇……鬼化妻财命不牢」
  if (meta.value === 'maternity') {
    const movingOf = (name) => lines.some((line) => line.isMoving && line.relative === name);
    const notes = [];
    if (movingOf('兄弟') && movingOf('官鬼')) {
      total += 2;
      notes.push('兄弟发动克财，幸有官鬼同动制服兄爻，反为有救');
    } else if (movingOf('兄弟')) {
      notes.push('兄弟发动克财，胎前产后最忌');
    } else if (movingOf('官鬼')) {
      notes.push('官鬼发动，临盆忌之');
    }
    lines.filter((line) => line.isMoving && line.changed).forEach((line) => {
      const from = line.relative;
      const to = line.changed.relative;
      if (from === '妻财' && (to === '官鬼' || to === '兄弟')) {
        total -= 1;
        notes.push(`${lineLabel(line)}化${to}，财${to === '官鬼' ? '变鬼' : '化兄'}为凶兆`);
      } else if ((from === '官鬼' || from === '兄弟') && to === '妻财') {
        total -= 2;
        notes.push(`${lineLabel(line)}化出妻财，${from === '官鬼' ? '鬼化妻财命不牢' : '兄化财为凶兆'}`);
      }
    });
    if (notes.length) points.push(`产妇安否（问产妇安否章）：${notes.join('；')}`);
  }

  // 五、卦象
  const structure = [];
  // 六冲、六合按三对爻的地支算（liuyao.js 的 hexagramRelationOf）：六冲十卦、六合八卦。
  if (hexagram.relation === '六冲') {
    total -= 1;
    structure.push('本卦六冲，事多散、快，难以久长');
  }
  if (hexagram.relation === '六合') {
    total += 1;
    structure.push('本卦六合，事易成但进展缓');
  }
  if (changed) {
    if (changed.relation === '六冲') {
      total -= 1;
      structure.push('变卦六冲，先聚后散');
    }
    if (changed.relation === '六合') {
      total += 1;
      structure.push('变卦六合，终能成局');
    }
  }
  if (hexagram.palaceLabel === '游魂') structure.push('游魂卦：心神不定，有外出、变动之象');
  if (hexagram.palaceLabel === '归魂') structure.push('归魂卦：事归旧处，有回归、安定之象');
  const reverseCount = lines.filter((line) => line.changed && ZHI_CLASH[line.zhi] === line.changed.zhi).length;
  const stillCount = lines.filter((line) => line.changed && line.changed.zhi === line.zhi).length;
  if (reverseCount >= 2) structure.push('多爻反吟，事情反复');
  if (stillCount >= 2) structure.push('多爻伏吟，呻吟难进');
  if (structure.length) points.push(structure.join('；'));

  // 六、倾向与应期
  const verdict = verdictOf(total, Boolean(yong.hidden));
  const timing = timingOf(yong, strength);
  points.push(`倾向：${verdict.title}。${verdict.text}`);
  points.push(`应期：${timing.join('；')}`);

  // 辅助六亲（如求财看兄弟劫财、问病看官鬼子孙）
  const auxiliary = (meta.aux ?? []).map(([auxRelative, meaning]) => {
    const auxLines = lines.filter((line) => line.relative === auxRelative);
    if (!auxLines.length) {
      const item = hidden.find((entry) => entry.relative === auxRelative);
      return item ? `${meaning}看${auxRelative}：不上卦，伏于${item.positionName}下` : `${meaning}看${auxRelative}：不上卦`;
    }
    const line = auxLines.find((entry) => entry.isMoving) ?? auxLines[auxLines.length - 1];
    const auxStrength = assessStrength(line, time);
    return `${meaning}看${auxRelative}：${line.ganZhi}${line.isMoving ? '发动' : '安静'}，${auxStrength.level}（${auxStrength.notes.slice(0, 2).join('，')}）`;
  });

  return {
    topic: meta.value,
    topicLabel: meta.label,
    gender,
    genderMissing,
    yongShen: {
      relative: yong.relative,
      ganZhi: yong.ganZhi,
      zhi: yong.zhi,
      element: yong.element,
      positionName: yong.hidden ? `伏于${yong.flyer.positionName}下` : yong.positionName,
      god: yong.god,
      state: yong.hidden ? '伏' : yong.isMoving ? '动' : '静',
      hidden: Boolean(yong.hidden),
      isShi: Boolean(yong.isShi),
      isYing: Boolean(yong.isYing),
      text: yongText,
    },
    strength,
    dynamics,
    shiYing: shiYingText,
    structure,
    auxiliary,
    verdict,
    timing,
    score: total,
    points,
    notices,
  };
};
