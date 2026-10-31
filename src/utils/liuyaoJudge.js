/**
 * 六爻断卦辅助（程序初判）
 *
 * 按所问类别取用神，看用神在月建、日辰下的旺衰，动爻与变爻对用神的生克，
 * 世应关系、卦的六冲六合与游魂归魂，再给出倾向与应期提示，整理成几条断语要点。
 * 规则取自《增删卜易》《卜筮正宗》等通行口诀的简化版，用计分把它们串起来：
 * 只做“程序初判”，帮助看不懂装卦表的人抓住重点，不替代人的综合判断。
 */
import { CONTROLS, GENERATES, getPalaceInfo, relativeOf, ZHI_CLASH, ZHI_ELEMENT, ZHI_HARMONY } from './liuyao.js';
import { LIUYAO_ILLNESS_LABELS, LIUYAO_SUBJECT_LABELS, LIUYAO_TOPIC_LABELS } from './liuyaoRecord.js';

/**
 * 问事类别：值、名称、说明，以及用神怎么取。common 的在起卦页直接列出，其余收在「更多类别」里。
 * relative 为 null 的自占以世爻为用神；aux 是要一并看的六亲；mode: 'weather' 走天时的专门断法；
 * subjects 为 true 的可以「替谁问」（代占以那人的六亲为用神），defaultSubject 是没选时按谁算。
 */
export const LIUYAO_TOPICS = Object.freeze([
  { value: 'general', label: LIUYAO_TOPIC_LABELS.general, hint: '不便归类的事：自己的事以世爻为用神，替别人问选是谁', relative: null, subjects: true, common: true },
  { value: 'wealth', label: LIUYAO_TOPIC_LABELS.wealth, hint: '买卖、投资、收款、财运', relative: '妻财', aux: [['兄弟', '劫财竞争']], common: true },
  { value: 'career', label: LIUYAO_TOPIC_LABELS.career, hint: '职位、求职、公司、上司', relative: '官鬼', aux: [['妻财', '薪酬待遇'], ['父母', '文书合同']], common: true },
  { value: 'love', label: LIUYAO_TOPIC_LABELS.love, hint: '恋爱、婚姻、对方心意', relative: null, byGender: { male: '妻财', female: '官鬼' }, common: true },
  { value: 'health', label: LIUYAO_TOPIC_LABELS.health, hint: '病情轻重、能否痊愈：自己的病以世爻为用神，替家人问选是谁；新病、久病断法相反', relative: null, aux: [['官鬼', '病症'], ['子孙', '医药']], subjects: true, common: true },
  { value: 'travel', label: LIUYAO_TOPIC_LABELS.travel, hint: '出差、旅行、搬迁看世爻；问在外的人何时回来、是否平安，选是谁', relative: null, aux: [['官鬼', '阻碍'], ['父母', '车船行李']], subjects: true, common: true },
  { value: 'study', label: LIUYAO_TOPIC_LABELS.study, hint: '考试、升学、证书', relative: '父母', aux: [['官鬼', '名次录取']], common: true },
  { value: 'lawsuit', label: LIUYAO_TOPIC_LABELS.lawsuit, hint: '诉讼、纠纷、口舌：世为自己、应为对方，官鬼为官非，子孙为解忧之神；替家人问选是谁', relative: null, aux: [['官鬼', '官非'], ['子孙', '解忧'], ['父母', '文书证据']], subjects: true, common: true },
  { value: 'children', label: LIUYAO_TOPIC_LABELS.children, hint: '子女、怀孕、胎儿男女、产期、晚辈；问产妇平安另选「产妇平安」', relative: '子孙', common: true },
  { value: 'home', label: LIUYAO_TOPIC_LABELS.home, hint: '买房租房、房屋、车辆', relative: '父母', aux: [['妻财', '价钱']], common: true },
  { value: 'lost', label: LIUYAO_TOPIC_LABELS.lost, hint: '东西丢了能否找回、往哪里找：以妻财为用神，兄弟劫财，官鬼为盗', relative: '妻财', aux: [['兄弟', '劫财'], ['官鬼', '盗贼']], common: true },
  { value: 'weather', label: LIUYAO_TOPIC_LABELS.weather, hint: '晴雨风云：父母主雨，子孙、妻财主晴，官鬼浓云雷电，兄弟风云', relative: null, mode: 'weather', common: true },
  { value: 'parents', label: LIUYAO_TOPIC_LABELS.parents, hint: '父母、长辈、师长', relative: '父母' },
  { value: 'friends', label: LIUYAO_TOPIC_LABELS.friends, hint: '兄弟姐妹、朋友、同事', relative: '兄弟' },
  { value: 'maternity', label: LIUYAO_TOPIC_LABELS.maternity, hint: '问产妇生产是否平安：丈夫问取妻财，替姐妹、女儿问选是谁；问胎儿、产期选「子女孕育」', relative: '妻财', aux: [['兄弟', '胎前产后忌兄动'], ['官鬼', '临盆忌鬼动']], subjects: true, defaultSubject: 'spouse', spouseRelative: '妻财' },
  { value: 'year', label: LIUYAO_TOPIC_LABELS.year, hint: '今年、本月整体吉凶：以世爻为主，官鬼为灾；具体的事另占', relative: null, aux: [['官鬼', '灾祸'], ['子孙', '福神']], subjects: true },
  { value: 'life', label: LIUYAO_TOPIC_LABELS.life, hint: '一生大势以世爻为用神；古法主张财福、功名、婚姻、子嗣寿元各占一卦', relative: null, subjects: true },
  { value: 'refuge', label: LIUYAO_TOPIC_LABELS.refuge, hint: '避险、躲灾、养病、避是非：以世爻为主，子孙为福神，并看往哪个方向', relative: null, aux: [['子孙', '福神'], ['官鬼', '祸患']], subjects: true },
  { value: 'gravesite', label: LIUYAO_TOPIC_LABELS.gravesite, hint: '寻新坟地、点穴：世爻为穴，子孙为儿孙；已葬的选「祖坟风水」', relative: null, aux: [['子孙', '儿孙后代']] },
  { value: 'ancestral', label: LIUYAO_TOPIC_LABELS.ancestral, hint: '已葬的祖坟好坏、有无损伤：以父母为用神，冲克父母者为所伤之由', relative: '父母', aux: [['子孙', '儿孙兴衰']] },
  { value: 'spirits', label: LIUYAO_TOPIC_LABELS.spirits, hint: '病痛灾祸疑为鬼神作祟、系何方神祇：以官鬼为用神，鬼休囚空破墓绝皆非鬼神之害，旺相者按五行分神祇；野鹤云疯痨气蛊系失调伤身，与鬼神无干', relative: '官鬼', aux: [['子孙', '制鬼福神']] },
]);

const TOPIC_BY_VALUE = Object.fromEntries(LIUYAO_TOPICS.map((topic) => [topic.value, topic]));

/**
 * 替谁问（代占）：以所问之人的六亲为用神（《增删卜易·用神章》）。
 * 父母爻：父母、祖辈、伯叔姑姨、师长、岳父母、东家；兄弟爻：兄弟姊妹、姐夫妹夫、结拜兄弟；
 * 妻财：妻妾、仆役、凡我驱使之人；官鬼：妻占夫；子孙：子女、女婿、侄甥、门徒晚辈。
 */
export const LIUYAO_SUBJECTS = Object.freeze([
  { value: 'self', label: LIUYAO_SUBJECT_LABELS.self, relative: null, hint: '自己的事以世爻为用神' },
  { value: 'parents', label: LIUYAO_SUBJECT_LABELS.parents, relative: '父母', hint: '父母、祖辈、伯叔姑姨、师长、岳父母、东家' },
  { value: 'siblings', label: LIUYAO_SUBJECT_LABELS.siblings, relative: '兄弟', hint: '兄弟姐妹、姐夫妹夫、结拜兄弟、朋友' },
  { value: 'spouse', label: LIUYAO_SUBJECT_LABELS.spouse, byGender: { male: '妻财', female: '官鬼' }, hint: '男问妻取妻财，女问夫取官鬼' },
  { value: 'children', label: LIUYAO_SUBJECT_LABELS.children, relative: '子孙', hint: '子女、孙辈、女婿、侄甥、学生晚辈' },
  { value: 'staff', label: LIUYAO_SUBJECT_LABELS.staff, relative: '妻财', hint: '下属、雇员、保姆，凡我驱使之人' },
]);
const SUBJECT_BY_VALUE = Object.fromEntries(LIUYAO_SUBJECTS.map((subject) => [subject.value, subject]));

/** 这个类别能不能「替谁问」：能则返回默认的对象（如产妇平安默认是丈夫问妻子），不能返回 null。 */
export const topicSubjectDefault = (topic) => {
  const meta = TOPIC_BY_VALUE[topic];
  return meta?.subjects ? (meta.defaultSubject ?? 'self') : null;
};

/** 要不要问卦人性别：问感情，或替配偶问（产妇平安的配偶固定取妻财，不用问）。 */
export const liuyaoNeedsGender = (topic, subject) => {
  if (topic === 'love') return true;
  const meta = TOPIC_BY_VALUE[topic];
  return Boolean(meta?.subjects) && !meta.spouseRelative && (subject || meta.defaultSubject || 'self') === 'spouse';
};

/** 五行的墓库（土随水，墓于辰）。 */
const SPIRIT_NOTICE = '占鬼神以官鬼为用神（《增删卜易·用神章》）：鬼值休囚及空破墓绝皆非鬼神之害；旺相者金为武神、木为文神、水为河海之神、火为火神、土为土神，休囚者为枉死之鬼（《鬼神章》）。野鹤云：时灾瘟瘴照法祭送屡验；疯痨气蛊系失调理、酒色伤身，与鬼神何干，惟节饮食、远色欲、息气养神。';
const TOMB = Object.freeze({ 木: '未', 火: '戌', 金: '丑', 水: '辰', 土: '辰' });
/** 五行长生之支（土随水）：「晴逢子动，望晴只待子逢生」。 */
const CHANG_SHENG = Object.freeze({ 木: '亥', 火: '寅', 金: '巳', 水: '申', 土: '申' });
/** 五行帝旺之支（土随水）。 */
const DI_WANG = Object.freeze({ 木: '卯', 火: '午', 金: '酉', 水: '子', 土: '子' });
/** 五行临绝之支（土随水）：「欲雨须得财墓绝」。 */
const JUE = Object.freeze({ 木: '申', 火: '亥', 金: '寅', 水: '巳', 土: '巳' });
/** 月建所在的季节，与各季死气之行（真空：春土、夏金、秋木、冬火）。 */
const SEASON_OF = Object.freeze({ 寅: '春', 卯: '春', 辰: '春', 巳: '夏', 午: '夏', 未: '夏', 申: '秋', 酉: '秋', 戌: '秋', 亥: '冬', 子: '冬', 丑: '冬' });
const DEAD_IN_SEASON = Object.freeze({ 春: '土', 夏: '金', 秋: '木', 冬: '火' });
/** 某五行在某地支是长生、帝旺、墓还是绝（日辰、化出之爻都按这个看）。 */
const stageAt = (element, zhi) => {
  if (CHANG_SHENG[element] === zhi) return '长生';
  if (DI_WANG[element] === zhi) return '帝旺';
  if (TOMB[element] === zhi) return '墓';
  if (JUE[element] === zhi) return '绝';
  return '';
};
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

/**
 * 类别 + 性别 + 替谁问 → 用神取哪一类六亲（null 为世爻）。
 * who 是程序采用的「替谁问」（类别不支持时为 null）；替自己问时 relative 回到类别本身（多为世爻，官司为官鬼）。
 */
const describeTopic = (topic, gender, subject) => {
  const meta = TOPIC_BY_VALUE[topic] ?? TOPIC_BY_VALUE.general;
  const who = meta.subjects ? (SUBJECT_BY_VALUE[subject] ?? SUBJECT_BY_VALUE[meta.defaultSubject ?? 'self']) : null;
  if (who && who.value !== 'self') {
    if (who.value === 'spouse' && meta.spouseRelative) return { meta, who, relative: meta.spouseRelative, genderMissing: false };
    if (who.byGender) return { meta, who, relative: who.byGender[gender] ?? null, genderMissing: !who.byGender[gender] };
    return { meta, who, relative: who.relative, genderMissing: false };
  }
  // 产妇自己问：以世爻为用神
  const relative = who?.value === 'self' && meta.defaultSubject ? null : meta.byGender ? (meta.byGender[gender] ?? null) : meta.relative;
  return { meta, who, relative, genderMissing: Boolean(meta.byGender) && !meta.byGender[gender] };
};

/** 野鹤两现章「余得验者，多有应乎旬空月破」：问应期（如天时）先取发动之爻，再取空破之爻，再取临世应、在上之爻。 */
const pickForTiming = (candidates) => {
  const moving = candidates.filter((line) => line.isMoving);
  if (moving.length) return moving[moving.length - 1];
  const marked = candidates.filter((line) => line.marks.some((mark) => mark === '月破' || mark === '旬空'));
  if (marked.length) return marked[marked.length - 1];
  const shiYing = candidates.filter((line) => line.isShi || line.isYing);
  return shiYing.length ? shiYing[shiYing.length - 1] : candidates[candidates.length - 1];
};

/**
 * 用神两现（《增删卜易·两现章》）：古法舍静用动、舍休囚用旺相、舍空破用不空不破；野鹤占父近病「三重父母爻，当择其旺者而用之」。
 * 断成败时先取发动之爻，再取其中旺者；一样旺弱时取临世应、在上之爻。
 */
const pickAmong = (candidates, time) => {
  const moving = candidates.filter((line) => line.isMoving);
  const pool = moving.length ? moving : candidates;
  const scored = pool.map((line) => ({ line, score: assessStrength(line, time).score }));
  const best = Math.max(...scored.map((item) => item.score));
  const top = scored.filter((item) => item.score === best).map((item) => item.line);
  const head = moving.length ? (moving.length > 1 ? '取发动之爻中旺者' : '取发动之爻') : '舍休囚取旺相';
  if (top.length === 1) return { line: top[0], reason: head };
  const shiYing = top.filter((line) => line.isShi || line.isYing);
  if (shiYing.length) return { line: shiYing[shiYing.length - 1], reason: `${head}，又取临世应之爻` };
  return { line: top[top.length - 1], reason: `${head}，又取在上之爻` };
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
      // 野鹤：「神兆机于动，予从来不言散」「旺相如刚，岂能冲散」——动爻逢日冲不作冲散论
      notes.push('动而逢日冲（不论冲散）');
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
  // 野鹤《旬空章》：旺不为空，动不为空，有日建动爻生扶者亦不为空；真空者，春土夏金秋木冬火
  if (marks.includes('旬空')) {
    if (marks.includes('月破')) {
      emptyKind = '破空';
      score -= 2;
      notes.push('又逢旬空，破而且空');
    } else if (target.isMoving || marks.includes('日冲') || monthSupports || daySupports) {
      // 旬空章「旺不为空，动不为空，有日建动爻生扶者，亦不为空」：不扣分，只在应期上等出空（占本人婚姻「戌土虽值旬空，动不为空，明日出空之日，求之必允」）
      emptyKind = '假空';
      notes.push('旬空，但有气（动、冲、生扶），不为空，出空即实');
    } else if (DEAD_IN_SEASON[SEASON_OF[time.monthZhi]] === target.element) {
      emptyKind = '真空';
      score -= 3;
      notes.push('旬空又逢死气（春土夏金秋木冬火），真空无用');
    } else {
      emptyKind = '静空';
      score -= 2;
      notes.push('静而旬空，无生扶，出空、填实之日方有用');
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
  } else if (ZHI_CLASH[line.zhi] === changed.zhi && relation === 'controlled') {
    // 《增删卜易·反伏章》「用神而化回头之冲克者，即是卦变大凶之象」；六冲章「动爻自化回头冲，如逢仇敌」，占例「爻动化冲，如逢仇敌，乃是化回头之克也」
    text = `化${changed.relative}${changed.ganZhi}回头冲克，如逢仇敌`;
    score = -3;
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
  } else if (JUE[line.element] === changed.zhi) {
    text = `化${changed.ganZhi}临绝，力弱难继`;
    score = -2;
  } else if (relation === 'drained') {
    text = `化${changed.relative}${changed.ganZhi}泄气`;
    score = -1;
  } else {
    text = `化${changed.relative}${changed.ganZhi}耗力`;
    score = -1;
  }
  // 化进化退，变爻空破不改其进退：占自陈「子孙动休囚而化空破，进者进，而退者竟退」，占考试「动散化空亦能中矣」
  const steps = relation === 'same' && (PROGRESS[line.zhi] === changed.zhi || PROGRESS[changed.zhi] === line.zhi);
  // 旬空章「动而化空……皆不为空」：变爻旬空只记应期，不扣分
  if (changedMarks.includes('旬空')) text += steps ? '，变爻旬空（进退不因空破而改）' : '，变爻旬空（动而化空不为空，出空之日应）';
  if (changedMarks.includes('月破')) {
    text += steps ? '，变爻月破（进退不因空破而改）' : '，变爻月破';
    if (!steps) score -= 1;
  }
  return { score, text, relation };
};

/** 动爻自己化出的情形：回头生克、进退、墓绝、变爻空破、化合。 */
const changeFlagsOf = (line, time) => {
  const changed = line.changed;
  if (!changed) return {};
  const relation = relationOf(line.element, changed.element);
  return {
    backGen: relation === 'generated',
    backCtrl: relation === 'controlled',
    advance: relation === 'same' && PROGRESS[line.zhi] === changed.zhi,
    retreat: relation === 'same' && PROGRESS[changed.zhi] === line.zhi,
    tomb: TOMB[line.element] === changed.zhi,
    jue: JUE[line.element] === changed.zhi && relation !== 'generated',
    broken: ZHI_CLASH[time.monthZhi] === changed.zhi,
    harmony: ZHI_HARMONY[line.zhi] === changed.zhi,
  };
};

/** 静爻旺相、逢日辰冲为暗动（《增删卜易·日辰章》「冲旺相之静爻，即为暗动」；衰者为日破）。 */
const isDarkMoving = (line, time) => {
  if (line.isMoving || !line.marks.includes('日冲') || line.marks.includes('月破')) return false;
  const monthRelation = relationOf(line.element, ZHI_ELEMENT[time.monthZhi]);
  return line.zhi === time.monthZhi || monthRelation === 'same' || monthRelation === 'generated';
};

/**
 * 三合成局（《增删卜易·六合章》）：三爻动而合局；两爻动、一爻静也成局；动爻变出之爻凑成的也算；
 * 一爻明动、一爻暗动作两爻动；只差一支而日辰、月建正是它，日月补凑亦成局（虚一待用）。
 * 「三合局中有一空破者，待填实之日月成之」：动爻月破又无日辰生扶（临日辰为破而不破），目下不成局，记在 pending。
 * 返回成局的五行、三支、参与的动爻位置与待填实之爻。
 */
const sanHeFramesOf = (lines, time) => SAN_HE.map(({ zhis, element }) => {
  const movers = lines.filter((line) => (line.isMoving || isDarkMoving(line, time)) && zhis.includes(line.zhi));
  const movingZhis = new Set(movers.map((line) => line.zhi));
  // 世爻独发而日辰、月建凑足其余两支，也成局：占地得颐之无妄「日月世爻共成三合」
  const byDayMonth = movingZhis.size === 1 && movers.every((line) => line.isShi) && time.dayZhi !== time.monthZhi
    && zhis.every((zhi) => movingZhis.has(zhi) || zhi === time.dayZhi || zhi === time.monthZhi);
  if (movingZhis.size < 2 && !byDayMonth) return null;
  const fillers = new Set([
    ...lines.filter((line) => !line.isMoving).map((line) => line.zhi),
    ...lines.filter((line) => line.isMoving && line.changed).map((line) => line.changed.zhi),
    time.dayZhi,
    time.monthZhi,
  ]);
  if (!zhis.every((zhi) => movingZhis.has(zhi) || fillers.has(zhi))) return null;
  const pending = movers.filter((line) => line.marks.includes('月破') && line.zhi !== time.dayZhi
    && !['same', 'generated'].includes(relationOf(line.element, ZHI_ELEMENT[time.dayZhi])));
  return { element, zhis, positions: movers.map((line) => line.position), pending };
}).filter(Boolean);

/**
 * 动爻（含暗动）作元神、忌神时有力还是无力（《增删卜易·元神忌神衰旺章》）。
 * 无力：化回头克、化绝、化破、化墓、入日墓；休囚而化退、临绝、逢空破、被日月动爻克。
 * 有力：旺相、临日月、化回头生、化进神、长生帝旺于日辰。都不沾的为寻常。
 * 动爻不论月破（野鹤《月破章》：动则能于伤爻，出月不破）。忌神被别的动爻所制（求财章「官爻发动亦堪求」、
 * 产妇章「倘若兄动克财，又宜鬼动制服兄爻」），衰者无力，不衰的也降一等。
 * @param controllers 克这一爻的其他动爻
 * @param role 'helper' 元神 / 'enemy' 忌神 / 其他
 */
const forceOf = (line, time, controllers = [], role = '') => {
  const strength = assessStrength(line.isMoving ? { ...line, marks: line.marks.filter((mark) => mark !== '月破') } : line, time);
  const flags = changeFlagsOf(line, time);
  const dayStage = stageAt(line.element, time.dayZhi);
  const feeble = strength.level === '休囚';
  const weak = [];
  if (flags.backCtrl) weak.push('化回头克');
  if (flags.jue) weak.push('化绝');
  if (flags.broken && !flags.advance) weak.push('化破');
  if (flags.tomb) weak.push('化墓');
  if (dayStage === '墓') weak.push('入日墓');
  if (feeble && flags.retreat) weak.push('衰而化退');
  if (feeble && dayStage === '绝') weak.push('衰而逢绝');
  if (feeble && !line.isMoving && (strength.marks.includes('月破') || strength.marks.includes('旬空'))) weak.push('休囚又逢空破');
  if (feeble && controllers.length) weak.push(`休囚又被${controllers.map((item) => item.ganZhi).join('、')}克`);
  else if (feeble && (strength.monthRelation === 'controlled' || strength.dayRelation === 'controlled')) weak.push('休囚又被日月克');
  if (weak.length) return { force: 'weak', reasons: weak };
  const strong = [];
  if (line.zhi === time.monthZhi || line.zhi === time.dayZhi) strong.push('临日月');
  else if (strength.level === '旺相') strong.push('旺相');
  if (flags.backGen) strong.push('化回头生');
  if (flags.advance) strong.push('化进神');
  if (dayStage === '长生' || dayStage === '帝旺') strong.push(`${dayStage}于日辰`);
  if (role === 'enemy' && controllers.length) {
    const tamed = `被${controllers.map((item) => item.ganZhi).join('、')}所制`;
    return strong.length ? { force: 'normal', reasons: [...strong, tamed] } : { force: 'weak', reasons: [tamed] };
  }
  return { force: strong.length ? 'strong' : 'normal', reasons: strong };
};

/** 动爻被合住：化出之爻与本爻六合（贪合），或动爻逢日辰合——贪合忘生、贪合忘克，待冲开之日。 */
const boundOf = (line, time) => {
  if (line.changed && ZHI_HARMONY[line.zhi] === line.changed.zhi) return `化${line.changed.ganZhi}合住`;
  if (line.isMoving && ZHI_HARMONY[time.dayZhi] === line.zhi) return '逢日辰合住';
  return '';
};

/**
 * 动爻与暗动之爻对用神的作用，按《增删卜易》元神、忌神、仇神的生克论（用神章、元神忌神衰旺章、静动章）：
 * 元神有力 +3、寻常 +2、无力或贪合 0；忌神有力 -3、寻常 -2、无力或贪合 0；忌神与元神同动，接续相生，反 +1；
 * 比和 +1；用神所生之爻、用神所克之爻（仇神）本身不计分，只看它们对元神、忌神的牵制。
 */
const dynamicsOf = (yong, lines, time, { sonsBless = false, framed = new Set() } = {}) => {
  const yongPosition = yong.hidden ? null : yong.position;
  // 化出之爻作用神：动爻不克变爻，只论日月；合成三合局的动爻按局论，不再单算
  const movers = yong.fromChange ? [] : lines
    .filter((line) => line.position !== yongPosition && !framed.has(line.position) && (line.isMoving || isDarkMoving(line, time)))
    .map((line) => ({ line, dark: !line.isMoving, relation: relationOf(yong.element, line.element), bound: boundOf(line, time) }));
  const active = (item) => !item.bound;
  const controllersOf = (item) => movers.filter((other) => other !== item && active(other) && CONTROLS[other.line.element] === item.line.element).map((other) => other.line);
  movers.forEach((item) => {
    const role = item.relation === 'generated' ? 'helper' : item.relation === 'controlled' ? 'enemy' : '';
    item.power = forceOf(item.line, time, controllersOf(item), role);
  });
  const helpers = movers.filter((item) => item.relation === 'generated');
  const enemies = movers.filter((item) => item.relation === 'controlled');
  // 仇神：克元神、生忌神之爻，即用神所克之爻
  const foes = movers.filter((item) => item.relation === 'spent');
  const liveHelper = helpers.find((item) => active(item) && item.power.force !== 'weak');
  const liveFoe = foes.find((item) => active(item));
  // 日辰章「爻临日建，月冲不破，月克无伤，逢动爻之克亦不为害」「爻临日建而月建动爻同来克者，似寡不敌众」：
  // 用神临日辰，单有动爻来克不为害（占借贷得晋「所喜卯日即是财星」，不以酉金兄爻暗动克财为嫌）；月建也克用神、忌神就是月建入卦，
  // 或仇神同动生着忌神（占母血崩「戌土以生申金……此父母爻既无水养，且化退神」），克多生少，才是寡不敌众
  const monthElement = ZHI_ELEMENT[time.monthZhi];
  const dayLord = !yong.hidden && yong.zhi === time.dayZhi;
  const outnumbered = Boolean(liveFoe) || relationOf(yong.element, monthElement) === 'controlled' || enemies.some((item) => active(item) && item.line.zhi === time.monthZhi);

  let score = 0;
  const texts = [];
  movers.forEach((item) => {
    const { line, dark, relation, bound, power } = item;
    const who = `${lineLabel(line)}${dark ? '暗动' : '发动'}`;
    const why = power.reasons.length ? `（${power.reasons.join('、')}）` : '';
    let delta = 0;
    let text;
    if (relation === 'generated') {
      if (bound) text = `${who}为元神，${bound}，贪合忘生，待冲开之日方生用神`;
      else if (power.force === 'weak') text = `${who}为元神，但无力${why}，见生不生`;
      else {
        const withEnemy = enemies.some((enemy) => active(enemy));
        delta = power.force === 'strong' || withEnemy ? 3 : 2;
        const notes = [power.force === 'strong' ? `有力${why}` : '', withEnemy ? '与忌神同动' : ''].filter(Boolean).join('，');
        text = `${who}为元神${notes ? `，${notes}` : ''}，生用神`;
      }
    } else if (relation === 'controlled' && sonsBless && line.relative === '子孙') {
      // 出行章「子孙克世者亦吉」，趋避章「子孙若发动于卦中，不拘克世持世，俱以为吉」
      delta = 1;
      text = `${who}，子孙为福神，克世亦吉`;
    } else if (relation === 'controlled') {
      if (bound) text = `${who}为忌神，${bound}，贪合忘克`;
      else if (dayLord && !outnumbered) text = `${who}为忌神，但用神临日辰，如山如冈，逢动爻之克亦不为害（《增删卜易·日辰章》）`;
      else if (liveHelper) {
        delta = 1;
        text = `${who}为忌神，与元神${liveHelper.line.ganZhi}同动：忌神生元神、元神生用神，接续相生，反为吉兆`;
      } else if (power.force === 'weak') text = `${who}为忌神，但无力${why}，不能克用神`;
      else {
        const withFoe = Boolean(liveFoe) && power.force !== 'weak';
        delta = power.force === 'strong' || withFoe ? -3 : -2;
        text = `${who}为忌神克用神${power.force === 'strong' ? `，有力${why}` : ''}${withFoe ? `，又得仇神${liveFoe.line.ganZhi}同动相生` : ''}`;
      }
    } else if (relation === 'same') {
      if (bound || power.force === 'weak') text = `${who}比和用神，但${bound || `无力${why}`}`;
      else {
        delta = 1;
        text = `${who}比扶用神`;
      }
    } else if (relation === 'drained') {
      const tamed = enemies.filter((enemy) => active(enemy) && CONTROLS[line.element] === enemy.line.element);
      text = tamed.length ? `${who}，用神生之，又制住忌神${tamed.map((enemy) => enemy.line.ganZhi).join('、')}` : `${who}，用神生之，泄用神之气`;
    } else {
      text = `${who}为仇神（克元神、生忌神），受用神所克`;
    }
    // 动爻与用神相合相冲
    if (ZHI_HARMONY[line.zhi] === yong.zhi) {
      text += yong.isMoving ? '；又合绊用神' : '；又合起用神';
      delta += yong.isMoving ? -1 : 1;
    } else if (ZHI_CLASH[line.zhi] === yong.zhi && !dark) {
      text += '；又冲用神';
      delta -= 1;
    }
    score += delta;
    texts.push(text);
  });
  return { score, texts, movers, liveHelper };
};

/**
 * 伏神有用、无用（《增删卜易·飞伏神章》）。
 * 有用：得日月生、旺相、得飞神生、得动爻生、日月动爻冲克飞神、飞神空破休囚墓绝（「空下伏神，易于引拔」）。
 * 无用：休囚无气、被日月冲克、被旺相之飞神克害、墓绝于日月飞爻、休囚值空破。
 * 飞神空破、被冲克或发动时伏神易出，比伏神自身的衰旺要紧。
 */
const describeHiddenFlyer = (hiddenItem, flyer, time, lines) => {
  const strength = assessStrength(hiddenItem, time);
  const flyerStrength = assessStrength(flyer, time);
  const monthElement = ZHI_ELEMENT[time.monthZhi];
  const dayElement = ZHI_ELEMENT[time.dayZhi];
  const easy = [];
  const useful = [];
  const useless = [];
  const flyerStage = stageAt(flyer.element, time.dayZhi);
  if (flyer.marks.includes('旬空') || flyer.marks.includes('月破') || flyerStrength.level === '休囚' || flyerStage === '墓' || flyerStage === '绝') easy.push('飞神空破衰墓');
  if (flyer.marks.includes('日冲') || CONTROLS[dayElement] === flyer.element || CONTROLS[monthElement] === flyer.element
    || lines.some((line) => line.isMoving && line.position !== flyer.position && (CONTROLS[line.element] === flyer.element || ZHI_CLASH[line.zhi] === flyer.zhi))) easy.push('日月动爻冲克飞神');
  if (flyer.isMoving) easy.push('飞神发动');
  if (relationOf(hiddenItem.element, monthElement) === 'generated' || relationOf(hiddenItem.element, dayElement) === 'generated') useful.push('得日月生');
  if (strength.level === '旺相') useful.push('旺相');
  if (relationOf(hiddenItem.element, flyer.element) === 'generated') useful.push('得飞神生');
  if (lines.some((line) => line.isMoving && GENERATES[line.element] === hiddenItem.element)) useful.push('得动爻生');
  if (strength.level === '休囚') useless.push(strength.marks.includes('旬空') || strength.marks.includes('月破') ? '休囚值空破' : '休囚无气');
  if (CONTROLS[dayElement] === hiddenItem.element || CONTROLS[monthElement] === hiddenItem.element || ZHI_CLASH[time.dayZhi] === hiddenItem.zhi || ZHI_CLASH[time.monthZhi] === hiddenItem.zhi) useless.push('被日月冲克');
  if (CONTROLS[flyer.element] === hiddenItem.element && flyerStrength.level === '旺相') useless.push('被旺相之飞神克害');
  if ([time.dayZhi, time.monthZhi, flyer.zhi].some((zhi) => ['墓', '绝'].includes(stageAt(hiddenItem.element, zhi)))) useless.push('墓绝于日月飞爻');
  // 伏神自身空破、被日月冲克、被旺相飞神克害、墓绝（其六所列，休囚无气除外），飞神再空破衰墓也引拔不出：
  // 占求财得睽之损「子财空伏于五爻未土之下，伏而又空，空而被克，知其无财而无疑也」；只是休囚无气的，飞神空破仍易出（占子病得地风升）
  const damaged = useless.filter((item) => item !== '休囚无气');
  if (damaged.length) return { score: -2, text: `伏神${damaged.join('、')}${easy.length ? `，虽则${easy.join('、')}，伏而又空、空而被克者` : ''}，虽有如无，终不能出（《增删卜易·飞伏神章》）` };
  if (easy.length) return { score: 3, text: `伏神易出（${easy.join('、')}），空下伏神，易于引拔，虽不现亦如现` };
  if (useful.length && !useless.length) return { score: 2, text: `伏神有用（${useful.join('、')}），虽不现亦如现` };
  if (useless.length && !useful.length) return { score: -1, text: `伏神无用（${useless.join('、')}），虽有如无，终难出现` };
  return { score: 0, text: `伏神${useful.length ? `有${useful.join('、')}` : ''}${useful.length && useless.length ? '，又' : ''}${useless.length ? useless.join('、') : ''}，待日月生扶或冲开飞神之时出现` };
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

/* ---------- 各类别的专门断法 ---------- */

const DIRECTION = Object.freeze({ 木: '东方', 火: '南方', 土: '四隅（辰戌丑未方）', 金: '西方', 水: '北方' });
/** 出行官鬼发动，按六神看是什么灾（《增删卜易·出行章》其七）。 */
const TRAVEL_GHOST = Object.freeze({ 玄武: '武鬼动忧盗贼', 朱雀: '雀鬼发防讼非', 白虎: '虎鬼疾病绵缠', 螣蛇: '蛇鬼风波惊险', 勾陈: '勾陈鬼动事有勾连', 青龙: '鬼动逢龙戒于嫖赌' });
/** 六合章「六冲卦变六合者，不看用神，竟以吉断」所列：婚姻、夫妻、功名、求谋、身命、风水、家宅。 */
const CLASH_TO_HARMONY_TOPICS = new Set(['love', 'career', 'study', 'wealth', 'general', 'life', 'gravesite', 'ancestral', 'home']);
const generatorOf = (element) => Object.keys(GENERATES).find((key) => GENERATES[key] === element);
const movingOf = (lines, relative) => lines.filter((line) => line.isMoving && line.relative === relative);
const controls = (attacker, target) => CONTROLS[attacker.element] === target.element;

/** 祖坟所伤之由：克（冲）父母之爻的五行、六神（《增删卜易·因何事所伤章》其二至其四）。 */
const injuryOf = (line, clash) => {
  if (clash) return '恐地风吹歪棺椁、水浸';
  const { element, god } = line;
  if (god === '螣蛇') return '恐蛇蚁为巢';
  if (element === '火' || god === '朱雀') return '恐近处开窑作灶、火烛相伤';
  if (god === '玄武') return element === '水' ? '恐穴中黑水相侵' : '恐有偷葬';
  if (element === '土') return god === '勾陈' ? '恐挖掘动土、筑墙盖屋' : '恐盖造墙垣、动土相伤';
  if (element === '金') return god === '白虎' ? '恐地震山摇之惊' : '恐石块山岗相伤';
  if (element === '木') return god === '青龙' ? '恐穴下竹木根伤' : god === '白虎' ? '恐砍伐树木' : '恐树木相伤';
  return '恐低洼泉涌、水浸';
};

/**
 * 各类别在用神旺衰、动变、世应之外的专门断法，返回 { score, points, notices }。
 * 依据《增删卜易》各章原文；失物用通行的《黄金策》「失脱」之法与千金赋「墓多暧昧」（野鹤注：用神动而化墓，「失脱遇之，暗藏不见」）。
 */
/** 鬼神章：鬼属五行各分其神，旺相者为正神，休囚者为枉死之鬼。 */
const SPIRIT_KINDS = Object.freeze({
  金: ['武神及西方之神', '刀剑身亡之鬼'],
  木: ['文神及东方之神', '傍草附木之妖，或刑杖悬梁之鬼'],
  水: ['河海及北方之神', '池井江湖水死之鬼'],
  火: ['火神及雷公电母、窑灶之神', '汤火焚烧之魂'],
  土: ['土神及中央之庙、掌管山川社稷之神', '墙倒屋塌土死之鬼'],
});

const TOPIC_RULES = Object.freeze({
  // 鬼神章：「凡占鬼神，卦中鬼值休囚及空破墓绝，皆非鬼神之害也」；旺相者「官鬼属金，旺相者武神及西方之神；休囚者刀剑身亡之鬼」
  // 等各按五行分神；「得罪于正神者，香花纸马祭之；勾惹邪祟之鬼，用浆纸钱于夜静之时，金鬼者向西送之，水鬼者向北送之」；
  // 野鹤曰「时灾瘟瘴，照此法而祭送者，余屡验之；疯痨气蛊……与鬼神何干？惟节饮食，远色欲，息气养神，其病自减」。
  // 用神是官鬼，吉凶反着看：鬼衰才是「非鬼神之害」，所以倾向自己给。
  spirits: ({ lines, time, shiLine, yong }) => {
    const ghosts = lines.filter((line) => line.relative === '官鬼');
    const notes = [];
    const weakOf = (line) => {
      const result = assessStrength(line, time);
      const stages = [stageAt(line.element, time.monthZhi), stageAt(line.element, time.dayZhi)].filter((stage) => stage === '墓' || stage === '绝');
      const weak = result.level === '休囚' || result.marks.includes('旬空') || result.marks.includes('月破') || stages.length > 0;
      return { result, weak, stages };
    };
    const sons = movingOf(lines, '子孙');
    const sonsHold = shiLine.relative === '子孙';
    if (!ghosts.length) {
      notes.push(`官鬼不上卦${yong.hidden ? `，伏于${yong.flyer.positionName}下` : ''}，无鬼神之害`);
      return { score: 3, floor: true, points: [`鬼神：${notes.join('；')}`], notices: [SPIRIT_NOTICE], verdict: { level: 'good', title: '非鬼神之害', text: '官鬼不现，所患非鬼神所为，宜从调理与人事上求（《增删卜易·鬼神章》）。' } };
    }
    const assessed = ghosts.map((line) => ({ line, ...weakOf(line) }));
    const allWeak = assessed.every((item) => item.weak);
    assessed.forEach(({ line, result, weak, stages }) => {
      const [god, ghost] = SPIRIT_KINDS[line.element];
      const state = weak ? `${result.level === '休囚' ? '休囚' : ''}${result.marks.filter((mark) => mark === '旬空' || mark === '月破').join('')}${stages.length ? `临${stages.join('')}` : ''}` : '旺相';
      notes.push(weak
        ? `${lineLabel(line)}${state}，非鬼神之害；若有所疑，属${ghost}，宜于夜静向${DIRECTION[line.element]}送之`
        : `${lineLabel(line)}旺相，系${god}；须问病人曾于何处许愿未还、何庙秽污作践，按所疑祭之`);
    });
    let score = 0;
    if (allWeak) score += 3;
    const attackers = ghosts.filter((line) => line.isMoving && line.position !== shiLine.position && controls(line, shiLine));
    attackers.forEach((line) => { score -= 2; notes.push(`${lineLabel(line)}发动克世，祟近其身`); });
    if (sons.length || sonsHold) {
      score += 2;
      notes.push(`子孙${sons.length ? '发动' : '持世'}，福神制鬼，祭祷可解`);
    }
    const verdict = allWeak
      ? { level: 'good', title: '非鬼神之害', text: '官鬼休囚或空破墓绝，所患非鬼神所为，宜从调理与人事上求（《增删卜易·鬼神章》）。' }
      : attackers.length && !sons.length && !sonsHold
        ? { level: 'bad', title: '鬼神为祟', text: '官鬼旺相又发动克世，确有鬼神之事，按所疑之神祭送，仍须调理身体。' }
        : { level: 'mixed', title: '有鬼神之事', text: `官鬼旺相，${sons.length || sonsHold ? '幸子孙制鬼，祭祷可解' : '按所疑之神祭送'}；疯痨气蛊之类与鬼神无干，惟节饮食、远色欲、息气养神。` };
    return { score, floor: allWeak, points: [`鬼神：${notes.join('；')}`], notices: [SPIRIT_NOTICE], verdict };
  },
  // 千金赋：占流年，以官为鬼，不宜官鬼持世；泽水困占例：世空而忌神动，出空遭伤。替别人问以那人的用神为主。
  year: ({ lines, shiLine, yong, proxy }) => {
    const person = proxy ? yong : shiLine;
    const at = proxy ? '用神' : '世';
    let score = 0;
    const notes = [];
    if (!proxy && shiLine.relative === '官鬼') {
      score -= 2;
      notes.push('官鬼持世，流年多灾忧（占流年以官为鬼）');
    }
    movingOf(lines, '官鬼').filter((line) => line.position !== person.position && controls(line, person)).forEach((line) => {
      score -= 2;
      notes.push(`${lineLabel(line)}发动克${at}，防灾病、官非`);
    });
    if ((!proxy && shiLine.relative === '子孙') || movingOf(lines, '子孙').length) {
      score += 1;
      notes.push(`子孙为福神，${proxy ? '' : '持世或'}发动，一年少灾`);
    }
    if (person.marks.includes('旬空') && lines.some((line) => line.isMoving && controls(line, person))) {
      score -= 1;
      notes.push(`${at}爻旬空而克${at}之爻发动，出空之日防伤`);
    }
    return {
      score,
      points: notes.length ? [`流年：${notes.join('；')}`] : [],
      notices: ['占流年、月令以世爻为主（替别人问以那人为主），官鬼为灾祸；功名、财运等具体的事要另占，不能拿流年卦兼断（《增删卜易·千金赋》）。'],
    };
  },
  // 趋避章：避患于生世之方，趋吉于福神之地；子孙发动，不拘克世、生世、持世，俱以为吉
  refuge: ({ lines, shiLine, yong, hexagram, proxy }) => {
    const person = proxy ? yong : shiLine;
    const at = proxy ? '用神' : '世';
    let score = 0;
    const notes = [];
    if (movingOf(lines, '子孙').length) {
      score += 3;
      notes.push('子孙发动，不拘克世、生世、持世，俱以为吉');
    }
    movingOf(lines, '官鬼').filter((line) => line.position !== person.position && controls(line, person)).forEach((line) => {
      score -= 2;
      notes.push(`${lineLabel(line)}发动克${at}，祸患近身`);
    });
    if (!proxy && shiLine.relative === '官鬼') {
      score -= 1;
      notes.push('官鬼持世，身在患中');
    }
    const helper = generatorOf(person.element);
    const fortune = GENERATES[hexagram.palaceElement];
    notes.push(`避患于生${at}之方：${at}爻属${person.element}，${helper}来生，宜往${DIRECTION[helper]}；趋吉于福神之地：子孙属${fortune}，在${DIRECTION[fortune]}`);
    return {
      score,
      points: [`趋避：${notes.join('；')}`],
      notices: ['避兵、避盗、避瘟、养病、避是非，都以世爻为主（替别人问以那人为主），宜避于生世之方及子孙之方（《增删卜易·趋避章》）。'],
    };
  },
  // 疾病章：自占以世爻为用神，代占取病人的六亲；新病、久病断法相反
  health: ({ lines, yong, shiLine, proxy, illness, strength, time }) => {
    let score = 0;
    const notes = [];
    const recent = illness === 'recent';
    const chronic = illness === 'chronic';
    const changedMarks = yong.isMoving && yong.changed ? marksOf(yong.changed.zhi, time) : [];
    // 用遇旬空，近病何须忧虑；用逢月破、久病空破，难许安宁
    if (strength.marks.includes('旬空') || changedMarks.includes('旬空')) {
      if (chronic) {
        score -= 2;
        notes.push('久病用神值旬空，即使旺相亦难医治');
      } else if (recent) {
        // 疾病章其五「用神动静而值旬空，及化空者……许之冲空实空之日即愈。倘逢冲克，病虽重而不死」；占父近病得萃之否「近病逢空即愈，许次日退灾」
        score += 3;
        notes.push('用遇旬空，近病何须忧虑：冲空、实空之日即愈（《增删卜易·疾病章》）');
      } else notes.push('用神值旬空：新病冲空、实空之日即愈，久病则难医');
    }
    if (strength.marks.includes('月破')) {
      if (chronic) {
        score -= 2;
        notes.push('久病用神值月破，难许安宁');
      } else if (strength.level === '休囚') {
        score -= 1;
        notes.push('用神月破又衰，受克者危');
      } else notes.push('用神月破而旺，实破之日、出月而愈');
    }
    // 用化鬼、鬼化用，防不测（父母之病例外：鬼是父母的元神，父化鬼为化生，轻病即愈）
    if (yong.relative !== '官鬼') {
      const yongToGhost = !yong.hidden && yong.isMoving && yong.changed?.relative === '官鬼';
      const ghostToYong = lines.some((line) => line.isMoving && line.relative === '官鬼' && line.changed?.relative === yong.relative);
      if (yongToGhost || ghostToYong) {
        if (yong.relative === '父母') {
          if (chronic) {
            score -= 2;
            notes.push('久病而父鬼相化，主危');
          } else if (yongToGhost) {
            score += 1;
            notes.push('父动化鬼，鬼为父母之元神，乃为化生，轻病即愈');
          }
        } else {
          score -= 2;
          notes.push(yongToGhost ? '用神化鬼，防不测' : '鬼化用神，防不测');
        }
      }
    }
    // 忌化用，最难调医
    if (lines.some((line) => line.isMoving && line.position !== yong.position && controls(line, yong) && line.changed?.relative === yong.relative)) {
      score -= 1;
      notes.push('忌神化出用神，最难调医');
    }
    // 子孙为医药、解忧之神：自占与问兄弟、妻子之病，子孙发动制鬼即愈；问父母、妻问夫，子动反伤官鬼
    const sons = movingOf(lines, '子孙');
    const ghostIsHelper = yong.relative === '父母' || yong.relative === '官鬼';
    if (!proxy) {
      if (shiLine.relative === '官鬼') {
        score -= 1;
        notes.push('官鬼持世，病虽轻而难疗');
      } else if (shiLine.relative === '子孙') {
        score += 2;
        notes.push('子孙持世，身临福德，不药而痊');
      }
    } else if (shiLine.relative === '官鬼') notes.push('代占而官鬼持世，乃忧疑之状，惟喜子孙发动');
    if (sons.length && ghostIsHelper) {
      score -= 1;
      notes.push(`子孙发动伤官鬼（${yong.relative === '官鬼' ? '夫之用神' : '父母之元神'}），不惟不能解忧，反添忧`);
    } else if (sons.length) {
      score += 1;
      notes.push(sons.some((line) => changeFlagsOf(line, time).backCtrl) ? '子孙发动制鬼，病可愈，但子动化克，愈后还发' : '子孙发动，制服官鬼，其病可愈');
    }
    // 鬼化长生、化进神，病势必增；忌神化退，其病渐减
    if (yong.relative !== '官鬼') {
      movingOf(lines, '官鬼').forEach((line) => {
        const flags = changeFlagsOf(line, time);
        if (flags.advance || stageAt(line.element, line.changed?.zhi) === '长生' || stageAt(line.element, time.dayZhi) === '长生') {
          score -= 1;
          notes.push(`${lineLabel(line)}发动${flags.advance ? '化进神' : '逢长生'}，病势必增`);
        }
      });
    }
    lines.filter((line) => line.isMoving && line.position !== yong.position && controls(line, yong)).forEach((line) => {
      if (changeFlagsOf(line, time).retreat) {
        score += 1;
        notes.push('忌神化退，其病渐减');
      }
    });
    return {
      score,
      points: notes.length ? [`问病（疾病章）：${notes.join('；')}`] : [],
      notices: proxy ? [] : ['自己问病以世爻为用神；替家人问请在起卦页选「替谁问」，用神取那人的六亲（《增删卜易·疾病章》）。'],
    };
  },
  // 出行章（自己出门，世为出行人、应为地头）与行人章（问在外的人，取那人的用神）
  travel: ({ lines, yong, shiLine, yingLine, proxy, strength, time }) => {
    let score = 0;
    const notes = [];
    if (proxy) {
      if (yong.hidden) {
        // 行人章「伏藏者出现之日」：伏神不论有用无用，出现之日即到（占仆人何日回「午火财爻伏而被日月之克……巳日必到」）
        score += 2;
        notes.push(`用神伏藏，出现之日即到（${yong.zhi}日或冲开飞神之${ZHI_CLASH[yong.flyer.zhi]}日）`);
      } else if (yong.fromChange) {
        // 占主人何日回「子水财爻化出巳火父，动爻不克变爻，巳日必到」
        score += 3;
        notes.push(`用神由动爻化出，动爻不克变爻，${yong.zhi}日必到`);
      } else if (yong.isMoving || isDarkMoving(yong, time)) {
        score += 2;
        notes.push(`用神${yong.isMoving ? '发动' : '暗动'}，明摇暗动归鞭发矣`);
        // 行人与常事相反：化退是往回走，化进是越走越远；动而化克最怕
        const flags = changeFlagsOf(yong, time);
        if (flags.retreat) {
          score += 2;
          notes.push('用神化退，退而归来');
        } else if (flags.advance) {
          score -= 2;
          notes.push('动化进神，越行越远，一时不返');
        }
        if (flags.backCtrl) {
          score -= 2;
          notes.push('用神动而化克，难望其归');
        }
        if (yong.changed?.relative === '官鬼' && yong.relative !== '官鬼') {
          score -= 2;
          notes.push('用神动而化鬼，在外有灾');
        }
        if (flags.harmony || ZHI_HARMONY[time.dayZhi] === yong.zhi) notes.push('动而逢合，有事阻隔，待冲开之日');
      } else {
        const stage = stageAt(yong.element, time.dayZhi);
        if (strength.marks.includes('月破') || strength.emptyKind === '真空' || stage === '墓' || stage === '绝') {
          score -= 2;
          notes.push('用神静而墓绝空破，归信杳然');
        } else if (strength.level === '休囚') {
          score -= 1;
          notes.push('用神休囚安静，且不思归');
        } else if (strength.level === '旺相') {
          // 行人章「用爻静者，冲动之日」；占子久出不归「世临子孙，又临月建，未日生之，虽是六冲卦，此子必归」
          score += 3;
          notes.push(`用神旺相安静，静待冲动之${ZHI_CLASH[yong.zhi]}日必归`);
        } else notes.push(`用神安静，归期多在冲动之${ZHI_CLASH[yong.zhi]}日`);
      }
      if (!yong.hidden) {
        if (controls(yong, shiLine)) {
          score += 1;
          notes.push('用爻克世，指日回家');
        } else if (controls(shiLine, yong)) {
          score -= 1;
          notes.push('世克用神，且无归志');
        } else if (GENERATES[yong.element] === shiLine.element || ZHI_HARMONY[yong.zhi] === shiLine.zhi) {
          score += 1;
          notes.push('用神生合世爻，必有归志');
        }
      }
      if (shiLine.marks.includes('旬空')) {
        score += 1;
        notes.push('世爻空，行人即至');
      }
      return {
        score,
        points: [`行人（行人章）：${notes.join('；')}`],
        notices: ['问行人归期看来与不来；问在外平安，要看用神有无墓绝空破受伤，最好另占一卦（《增删卜易·行人章》）。'],
      };
    }
    const shiStrength = assessStrength(shiLine, time);
    if (shiStrength.level === '旺相') {
      score += 1;
      notes.push('世爻旺相，宜行');
    } else if (shiStrength.level === '休囚' && (shiStrength.marks.includes('旬空') || shiStrength.marks.includes('月破'))) {
      score -= 1;
      notes.push('世爻休囚空破，不宜行');
    }
    // 出行章「应若空亡宜止」「应为地头……若空破墓绝……去之无益」；旬空章「旺不为空，动不为空，有日建动爻生扶者亦不为空」，假空不算
    if (yingLine.marks.includes('旬空') && assessStrength(yingLine, time).emptyKind !== '假空') {
      score -= 1;
      notes.push('应为地头，应爻旬空，去之无益');
    }
    const ghosts = movingOf(lines, '官鬼');
    if (ghosts.length) {
      score -= ghosts.length > 1 ? 2 : 1;
      notes.push(`官鬼${ghosts.length > 1 ? '交重，灾祸重' : '发动'}：${ghosts.map((line) => TRAVEL_GHOST[line.god] ?? '防阻滞').join('、')}`);
    }
    if (movingOf(lines, '子孙').length || shiLine.relative === '子孙' || shiLine.changed?.relative === '子孙') {
      score += 2;
      notes.push('子孙发动、持世或世化子孙，福神临身，百祸潜消');
    }
    if (shiLine.isMoving && (shiLine.changed?.relative === '官鬼' || changeFlagsOf(shiLine, time).backCtrl)) {
      score -= 1;
      notes.push('世动化鬼或化回头克，不宜出行');
    }
    if (isDarkMoving(shiLine, time)) notes.push('世爻暗动，必去');
    if (shiLine.isMoving && (changeFlagsOf(shiLine, time).harmony || ZHI_HARMONY[time.dayZhi] === shiLine.zhi)) {
      // 出行章「动逢合住而留……世爻动而化合，或被日月动爻合者，必有事故阻滞不行」；占出行得明夷「合住，必有事绊，不能动身」
      score -= 3;
      notes.push('世动逢合（化合或日辰合住），必有事故阻滞不行');
    }
    return {
      score,
      points: notes.length ? [`出行（出行章）：${notes.join('；')}`] : [],
      notices: ['自己出行以世爻为出行人、应爻为地头；问在外的人何时回来，请在起卦页选「替谁问」（《增删卜易·出行章》《行人章》）。'],
    };
  },
  // 寻地章：世为穴，儿孙乃祭祀之裔；三合六合聚气藏风，世冲六冲飞砂走石
  gravesite: ({ lines, shiLine, yingLine, hexagram, changed, time }) => {
    let score = 0;
    const notes = [];
    if (hexagram.relation === '六合') {
      score += 1;
      notes.push('卦逢六合，聚气藏风');
    } else if (hexagram.relation === '六冲') {
      // 寻地章「若得六冲卦，或六冲，或世应相冲，冲者散也，必无气脉」：六冲卦不变合的，至多偏弱
      score -= 2;
      notes.push('卦逢六冲，飞砂走石，必无气脉');
    }
    let noVein = hexagram.relation === '六冲';
    if (hexagram.relation === '六冲' && changed?.relation === '六合') {
      score += 1;
      noVein = false;
      notes.push('六冲变合，地已去而复来，再得世与子孙旺相，急宜用之');
    } else if (hexagram.relation === '六合' && changed?.relation === '六冲') {
      score -= 1;
      notes.push('六合变冲，形已成而复失，不宜用之');
    }
    if (ZHI_CLASH[shiLine.zhi] === yingLine.zhi) {
      if (hexagram.relation !== '六冲') score -= 1;
      notes.push('世应相冲，亦非吉地');
    }
    if (shiLine.isMoving && shiLine.changed) {
      if (PROGRESS[shiLine.zhi] === shiLine.changed.zhi) notes.push('世化进神，千秋绵远');
      else if (PROGRESS[shiLine.changed.zhi] === shiLine.zhi) notes.push('世化退神，终须迁改');
    }
    const sons = lines.filter((line) => line.relative === '子孙');
    if (shiLine.relative === '子孙') {
      score += 1;
      notes.push('子孙持世，儿孙祭祀有托');
    }
    if (!sons.length) {
      score -= 1;
      notes.push('子孙不上卦，儿孙祭祀无托');
    } else if (sons.every((line) => assessStrength(line, time).level === '休囚')) {
      score -= 1;
      notes.push('子孙休囚，后代不旺');
    }
    sons.filter((line) => line.isMoving && line.changed).forEach((line) => {
      if (PROGRESS[line.zhi] === line.changed.zhi) {
        score += 1;
        notes.push('福德化进，百代蒸尝');
      } else if (PROGRESS[line.changed.zhi] === line.zhi) {
        score -= 1;
        notes.push('子孙化退，代代不如');
      } else if (line.changed.relative === '子孙') {
        score += 1;
        notes.push('子化子，子女成行');
      }
    });
    movingOf(lines, '父母').filter((line) => line.changed?.relative === '父母').forEach(() => {
      score -= 1;
      notes.push('父化父，儿孙夭折（卦中不宜父动）');
    });
    if (shiLine.god === '白虎' && shiLine.relative === '官鬼') notes.push('世临白虎鬼爻，地有伏尸');
    // 寻地章「世爻子孙爻……不宜动逢破散及化破散化绝化墓化退神化回头克，但逢一者，皆非吉地」；「世爻虽旺……吉变为凶之象」
    const spoiled = [shiLine, ...sons].filter((line, index, all) => line.isMoving && line.changed && all.indexOf(line) === index).find((line) => {
      const flags = changeFlagsOf(line, time);
      return flags.backCtrl || flags.broken || flags.tomb || flags.jue || flags.retreat;
    });
    if (spoiled) notes.push(`${spoiled === shiLine ? '世爻' : '子孙'}动而化破、化墓绝、化退或化回头克，但逢一者，皆非吉地`);
    return {
      score,
      cap: Boolean(spoiled) || noVein,
      points: notes.length ? [`寻地：${notes.join('；')}`] : [],
      notices: ['寻地、点穴以世爻为穴（野鹤：「所验者，世为穴也」），子孙为儿孙；已葬的坟请改选「祖坟风水」，以父母为用神（《增删卜易·寻地章》）。'],
    };
  },
  // 祖茔应家章：已葬之地以父母为用神；因何事所伤章：冲克父母之爻为忌神
  ancestral: ({ lines, yong, hexagram, changed, time }) => {
    let score = 0;
    const notes = [];
    if (hexagram.relation === '六冲' && changed?.relation === '六冲') {
      score -= 1;
      notes.push('正卦六冲，变卦六冲，全无脉气');
    } else if (hexagram.relation === '六冲' && changed?.relation === '六合') {
      score += 1;
      notes.push('冲中变合，运将来，后代有兴隆之象');
    } else if (hexagram.relation === '六冲') {
      score -= 1;
      notes.push('卦遇六冲，全无地脉');
    } else if (changed?.relation === '六冲') {
      score -= 1;
      notes.push('卦变六冲，龙已去，子孙有凌替之危');
    }
    if (lines.filter((line) => line.changed && line.changed.zhi === line.zhi).length >= 2) notes.push('爻遇伏吟，欲迁不遂');
    if (lines.filter((line) => line.changed && ZHI_CLASH[line.zhi] === line.changed.zhi).length >= 2) notes.push('反吟卦现，不迁亦迁');
    lines.filter((line) => line.isMoving && line.changed).forEach((line) => {
      if (line.relative === '子孙' && line.changed.relative === '官鬼') {
        score -= 1;
        notes.push('子孙动而化鬼，不利于子孙');
      } else if (line.relative === '父母' && line.changed.relative === '子孙') {
        score -= 1;
        notes.push('父动而化子孙，不利于子孙');
      }
    });
    const causes = yong.hidden ? [] : lines
      .filter((line) => line.isMoving && line.position !== yong.position && (controls(line, yong) || ZHI_CLASH[line.zhi] === yong.zhi))
      .map((line) => `${lineLabel(line)}${controls(line, yong) ? '克' : '冲'}父母，${injuryOf(line, !controls(line, yong))}`);
    if (causes.length) notes.push(`所伤之由：${causes.join('；')}`);
    else if (!lines.some((line) => line.isMoving) && assessStrength(yong, time).level !== '休囚') notes.push('六爻安静，父母有气，久后自安，不必修补');
    return {
      score,
      points: notes.length ? [`祖坟：${notes.join('；')}`] : [],
      notices: ['已葬之坟以父母为用神：父母旺相、得生扶，亡者安而生者乐；冲克父母之爻为忌神，看它的五行、六神断所伤之由（《增删卜易·祖茔应家章》《因何事所伤章》）。为自己问的自己占，为子孙问的叫子孙来占。'],
    };
  },
  // 防非避讼、斗殴争竞、兴词举讼、已定重罪章：世为自己、应为对方；忧虑官司喜官居空破、最宜子动
  lawsuit: ({ lines, yong, shiLine, yingLine, proxy, time }) => {
    const person = proxy ? yong : shiLine;
    const at = proxy ? '用神' : '世';
    let score = 0;
    const notes = [];
    const sonsMoving = movingOf(lines, '子孙');
    if (sonsMoving.length || (!proxy && shiLine.relative === '子孙')) {
      score += 3;
      notes.push(`子孙${sonsMoving.length ? '发动' : '持世'}，必不成非；虽定罪，终须赦免`);
    }
    const ghosts = lines.filter((line) => line.relative === '官鬼');
    if (ghosts.length && ghosts.every((line) => !line.isMoving && (line.marks.includes('旬空') || line.marks.includes('月破')))) {
      score += 2;
      notes.push('官鬼空破，忧虑官司却喜官居空破');
    }
    if (!proxy && shiLine.relative === '官鬼') {
      score -= 2;
      notes.push('官鬼持世，定然有讼');
    }
    movingOf(lines, '官鬼').filter((line) => line.position !== person.position && controls(line, person)).forEach((line) => {
      score -= 2;
      notes.push(`${lineLabel(line)}发动克${at}${line.god === '螣蛇' ? '，蛇鬼克身，灾患相侵' : line.god === '白虎' ? '，虎鬼防伤痕见血' : line.god === '玄武' ? '，武鬼必有盗贼阴人' : line.god === '朱雀' ? '，雀鬼口舌不免' : ''}`);
    });
    if (!proxy) {
      if (yingLine.isMoving && controls(yingLine, shiLine)) {
        score -= 2;
        notes.push('应动克世，他有讼、他得胜');
      } else if (controls(yingLine, shiLine)) {
        score -= 1;
        notes.push('应克世，他胜');
      } else if (controls(shiLine, yingLine)) {
        score += 1;
        notes.push(shiLine.isMoving ? '世动克应，我兴词，我赢' : '世克应，我赢');
      }
      const shiFlags = changeFlagsOf(shiLine, time);
      if (shiLine.marks.includes('旬空') || shiLine.marks.includes('月破') || shiFlags.retreat) notes.push('世空、世破或化退，我心怯焉');
      if (shiLine.isMoving && shiLine.changed?.relative === '官鬼') {
        score -= 2;
        notes.push('世爻变鬼，身遭其伤');
      }
    }
    return {
      score,
      points: notes.length ? [`官司（防非避讼、斗殴争竞章）：${notes.join('；')}`] : [],
      notices: ['官司以世为自己、应为对方：忧虑官非，喜官鬼空破、子孙发动或持世；兴词告状，官父同兴才有理（《增删卜易》防非避讼、兴词举讼章）。'],
    };
  },
  // 婚姻章：男占取财、女占取官；女占不宜子孙持世发动（克夫），男占忌兄弟持世（伤妻阻隔）；世应俱空事无准实
  love: ({ lines, shiLine, yingLine, yong, time }) => {
    let score = 0;
    const notes = [];
    if (yong.relative === '官鬼' && shiLine.relative === '子孙') {
      score -= 2;
      notes.push('女占而子孙持世，克夫之象');
    } else if (yong.relative === '官鬼' && movingOf(lines, '子孙').length) {
      // 婚姻章其十三「女占男，不宜子孙持世、子孙发动，子孙乃克夫之神」
      score -= 1;
      notes.push('女占而子孙发动，克夫之神');
    } else if (yong.relative === '妻财' && shiLine.relative === '兄弟') {
      // 其十二「兄爻持世……婚必难成」，觉子「兄持世，财爻合世必成」
      if (!yong.hidden && ZHI_HARMONY[yong.zhi] === shiLine.zhi) notes.push('男占而兄弟持世，但财爻合世，亦成');
      else {
        score -= 1;
        notes.push('男占而兄弟持世，伤妻阻隔之神');
      }
    }
    // 其二十「应财世鬼，夫唱妇随……世持鬼应持财，谓之阴阳得位，必然鸾凤齐鸣」（占本人婚姻得恒之鼎「酉官持世，戌土财爻动而生世」）
    if (yong.relative === '妻财' && shiLine.relative === '官鬼' && yingLine.relative === '妻财') {
      score += 1;
      notes.push('世持官鬼、应持妻财，阴阳得位，鸾凤齐鸣');
    }
    // 其九「世动化进神，事在必成；若化退神，终须难就」
    if (shiLine.isMoving) {
      const flags = changeFlagsOf(shiLine, time);
      if (flags.advance) {
        score += 2;
        notes.push('世动化进神，事在必成');
      } else if (flags.retreat) {
        score -= 1;
        notes.push('世动化退神，终须难就');
      }
    }
    // 其六「虽是女家占男，亦要财爻不致于失陷」（占女家婚事得临之既济「财被回头克，又逢丑土之克……婚姻虽成，终有他变」）：
    // 财官两爻一卦关乎男女两人，非用神的那一个动而化回头克、化墓绝，婚虽成亦有变
    const other = yong.relative === '官鬼' ? '妻财' : yong.relative === '妻财' ? '官鬼' : '';
    const spoiled = other ? lines.find((line) => line.relative === other && line.isMoving && line.position !== yong.position && (() => { const flags = changeFlagsOf(line, time); return flags.backCtrl || flags.tomb || flags.jue; })()) : null;
    if (spoiled) {
      score -= 2;
      notes.push(`${lineLabel(spoiled)}动而化${changeFlagsOf(spoiled, time).backCtrl ? '回头克' : '墓绝'}，财官不能相生，婚姻虽成，终有他变（《增删卜易·婚姻章》）`);
    }
    if (shiLine.marks.includes('旬空') && yingLine.marks.includes('旬空')) {
      score -= 1;
      notes.push('世应俱空，事无准实');
    }
    if (yingLine.isMoving && changeFlagsOf(yingLine, time).retreat) {
      score -= 1;
      notes.push('应化退神，对方必有退悔之心');
    }
    return { score, points: notes.length ? [`婚姻（婚姻章）：${notes.join('；')}`] : [], notices: [] };
  },
  // 失物：以妻财为用神；千金赋「墓多暧昧」，野鹤注用神动而化墓「失脱遇之，暗藏不见」
  lost: ({ lines, yong, time }) => {
    let score = 0;
    const notes = [];
    if (yong.hidden) {
      notes.push(`财爻伏藏，物被遮掩，待冲开飞神${yong.flyer.ganZhi}之${ZHI_CLASH[yong.flyer.zhi]}日再寻`);
    } else {
      const tomb = TOMB[yong.element];
      if (yong.isMoving && yong.changed?.zhi === tomb) {
        score -= 1;
        notes.push('财爻化墓，若藏不见');
      } else if (time.dayZhi === tomb) {
        score -= 1;
        notes.push('财爻入日墓，物被收藏，一时难见');
      }
      notes.push(yong.position <= 3 ? '财在内卦，多在家中、近处' : '财在外卦，多在外面、远处');
      notes.push(`财爻属${yong.element}，可往${DIRECTION[yong.element]}找`);
    }
    if (movingOf(lines, '兄弟').length) {
      score -= 1;
      notes.push('兄弟发动，财物被劫，难以寻回');
    }
    if (movingOf(lines, '官鬼').length) notes.push('官鬼发动，恐被人窃取');
    return {
      score,
      points: [`失物：${notes.join('；')}`],
      notices: ['失物以妻财为用神：财爻旺相、持世或生合世爻易寻；化墓入墓、空破、被兄弟劫克难寻（《黄金策》失脱，《增删卜易·千金赋》）。'],
    };
  },
});

/* ---------- 天时（晴雨） ---------- */

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
  if (candidates.length) return candidates.length === 1 ? candidates[0] : pickForTiming(candidates);
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
 * 卦逢六冲（或卦变六冲）按所问之事论（《增删卜易》六冲章、疾病章、行人章）：
 * 凡占凶事宜于冲散；问病近病逢冲即愈、久病逢冲不论用神衰旺难治；行人逢冲无定不返；其余事多散、难久。
 */
const clashEffectOf = (topic, { illness, proxy, changedOnly, yongStrong = false, yongWeak = false }) => {
  const where = changedOnly ? '卦变六冲' : '卦逢六冲';
  if (topic === 'lawsuit' || topic === 'refuge') return { score: 1, text: `${where}：凡占凶事，宜于冲散（《增删卜易·六冲章》）` };
  if (topic === 'health') {
    if (illness === 'recent') return { score: 2, text: `${where}：近病逢冲，不药而愈（《增删卜易·疾病章》）` };
    if (illness === 'chronic') return { score: -3, text: `${where}：久病逢冲，不论用神衰旺，难以调治（《增删卜易·疾病章》）` };
    return { score: 0, text: `${where}：近病逢冲即愈，久病逢冲难治（起卦时选新病或久病，可断得更准）` };
  }
  if (topic === 'travel' && proxy) {
    // 行人章「卦逢六冲，行人无定而不返」；占例「世临子孙，又临月建，未日生之，虽是六冲卦，此子必归」——用神旺相不在此例。
    if (yongStrong) return { score: 0, text: `${where}本主行人无定，但用神旺相，冲动之期可归（《增删卜易·行人章》占例）` };
    return { score: -1, text: `${where}：行人无定，一时不返（《增删卜易·行人章》）` };
  }
  // 六冲章「冲者，散也。凡占凶事，宜于冲散；占吉事而不宜。亦必兼用神而言，用神旺，虽冲不破；用神失陷，凶而又凶」
  // （占流年得艮「官星持世，长生于亥日，业已成矣」、占子久出不归「虽是六冲卦，此子必归」，都是用神旺相而不以六冲为嫌）
  const name = changedOnly ? '变卦六冲' : '本卦六冲';
  if (yongStrong) return { score: 0, text: `${name}本主散、不久，但用神旺相，虽冲不破（《增删卜易·六冲章》）` };
  if (yongWeak) return { score: -2, text: `${name}而用神失陷，凶而又凶（《增删卜易·六冲章》）` };
  return { score: -1, text: changedOnly ? '变卦六冲，先聚后散' : '本卦六冲，事多散、快，难以久长' };
};

/**
 * @param reading buildLiuYaoReading 的结果
 * @param {{ topic?: string, gender?: string, subject?: string, illness?: string }} [options]
 *   不传时用 reading 里记录的类别、性别、替谁问与病程
 */
export const judgeLiuYao = (reading, options = {}) => {
  const topic = options.topic ?? reading.topic ?? 'general';
  const gender = options.gender ?? reading.gender ?? '';
  const subject = options.subject ?? reading.subject ?? '';
  const illness = options.illness ?? reading.illness ?? '';
  const { lines, hidden, time, hexagram, changed } = reading;
  const { meta, who, relative, genderMissing } = describeTopic(topic, gender, subject);
  if (meta.mode === 'weather') return judgeWeather(reading, meta);
  // 代占：替别人问，以那人的六亲为用神；世爻是问卦的自己，世应只作参考
  const proxy = Boolean(who && who.value !== 'self');
  const topicName = proxy ? `${meta.label}（替${who.label}问）` : meta.label;
  const shiLine = lines[hexagram.shi - 1];
  const yingLine = lines[hexagram.ying - 1];
  const points = [];
  const notices = [];
  let total = 0;
  // 原书明言「不看用神」或「万无一活」而断的情形，倾向有底线或封顶：至少偏吉（floor）、至多偏弱（cap）
  let floor = false;
  let cap = false;

  // 一、取用神
  let yong = null;
  let yongText = '';
  if (!relative) {
    yong = shiLine;
    const asker = proxy ? '替配偶问' : '问感情';
    yongText = genderMissing
      ? `${asker}没有选择问卦人性别，暂以世爻${lineLabel(yong)}为用神（男问取妻财，女问取官鬼）`
      : `${topicName}以世爻为用神：${lineLabel(yong)}`;
    if (genderMissing) notices.push(`${asker}请选择问卦人性别，用神才能取准。`);
    if (meta.value === 'life') notices.push('《增删卜易·身命章》主张终身之事分开占：财福、功名、婚姻、子嗣寿元各占一卦，不要一卦兼断。');
  } else {
    const candidates = lines.filter((line) => line.relative === relative);
    if (candidates.length === 1) {
      yong = candidates[0];
      yongText = `${topicName}取${relative}为用神：${lineLabel(yong)}`;
    } else if (candidates.length > 1) {
      const picked = pickAmong(candidates, time);
      yong = picked.line;
      yongText = `${topicName}取${relative}为用神；${relative}${candidates.length > 2 ? '重' : '两'}现，${picked.reason}：${lineLabel(yong)}`;
    } else {
      // 用神不上卦而动爻化出：以化出之爻为用神（野鹤占主人何日回「子水财爻化出巳火父……巳日必到」）；动爻不克变爻，只论日月
      const source = lines.find((line) => line.isMoving && line.changed?.relative === relative);
      const hiddenItem = hidden.find((item) => item.relative === relative);
      if (source) {
        yong = { ...source.changed, position: source.position, positionName: source.positionName, god: source.god, isMoving: false, isShi: false, isYing: false, marks: marksOf(source.changed.zhi, time), fromChange: true, source };
        yongText = `${topicName}取${relative}为用神；${relative}不上卦，由${source.positionName}${source.relative}${source.ganZhi}动而化出：${relative}${source.changed.ganZhi}（变爻，只论日月生克）`;
      } else if (hiddenItem) {
        const flyer = lines[hiddenItem.position - 1];
        yong = { ...hiddenItem, hidden: true, flyer, isMoving: false, marks: marksOf(hiddenItem.zhi, time), isShi: false, isYing: false, god: flyer.god };
        yongText = `${topicName}取${relative}为用神；${relative}不上卦，伏于${flyer.positionName}${flyer.relative}${flyer.ganZhi}之下：伏神${relative}${hiddenItem.ganZhi}`;
      }
    }
  }
  if (!yong) {
    // 理论上不会出现：六亲不全时伏神必有；留一个兜底。
    yong = shiLine;
    yongText = `找不到${relative}，暂以世爻${lineLabel(yong)}为用神`;
  }
  points.push(yongText);

  // 二、旺衰（行人章：问在外的人来不来，只看来与不来之象；用神旺衰只管在外安否，不计入倾向）
  const awayTraveler = meta.value === 'travel' && proxy;
  const strength = assessStrength(yong, time);
  if (!awayTraveler) total += strength.score;
  points.push(`用神${yong.element}${yong.hidden ? '伏而' : yong.isMoving ? '动而' : '静而'}${strength.level}：${strength.notes.join('，')}`);
  if (yong.hidden) {
    // 飞伏神章：用神不现，日辰、月建与用神同五行的，即以日月为用神
    const byDay = ZHI_ELEMENT[time.dayZhi] === yong.element;
    // 行人只看来与不来：伏神有用无用是在外安否的事（占仆人何日回「若问仆人在外之吉凶者，必不归矣……今问何日可到，不以此断」）
    if (byDay || ZHI_ELEMENT[time.monthZhi] === yong.element) {
      if (!awayTraveler) total += 3;
      points.push(`用神不上卦，而${byDay ? `日辰${time.dayZhi}` : `月建${time.monthZhi}`}属${yong.element}，即以${byDay ? '日辰' : '月建'}为用神（《增删卜易·飞伏神章》）`);
    } else {
      const flyerInfo = describeHiddenFlyer(yong, yong.flyer, time, lines);
      if (!awayTraveler) total += flyerInfo.score;
      points.push(flyerInfo.text);
    }
  }
  if (!yong.hidden && GOD_HINTS[yong.god]) points.push(`用神临${yong.god}：${GOD_HINTS[yong.god]}`);
  const sonsBless = yong === shiLine && (meta.value === 'travel' || meta.value === 'refuge');
  const frames = sanHeFramesOf(lines, time);
  const liveFrames = frames.filter((frame) => !frame.pending.length);
  const dyn = dynamicsOf(yong, lines, time, { sonsBless, framed: new Set(liveFrames.flatMap((frame) => frame.positions)) });
  // 用神无根：月破或真空，又被日辰克、日破——元神有力亦难生，忌神无力何足喜
  const rootless = (strength.marks.includes('月破') || strength.emptyKind === '真空')
    && (strength.dayRelation === 'controlled' || strength.notes.includes('休囚又逢日冲，日破'));
  if (rootless) {
    points.push('用神无根（空破之外又被日辰克冲）：元神有力亦难生，忌神无力何足喜（《增删卜易·元神忌神衰旺章》）');
  } else if (strength.marks.includes('月破')) {
    // 月破章：月破只管当月，有日辰生扶、自身发动或元神来生的，出月、逢合、实破之日仍可用
    const dayHelps = strength.dayRelation === 'same' || strength.dayRelation === 'generated' || yong.zhi === time.dayZhi;
    if (yong.isMoving || dayHelps || dyn.liveHelper) {
      if (!awayTraveler) total += 2;
      points.push('用神月破而有生扶（日辰、元神或自身发动）：月破只是一时，出月、逢合、实破之日仍能成事（《增删卜易·月破章》）');
    } else {
      points.push('用神月破又无生扶，到底破而无用（《增删卜易·月破章》）');
    }
  }

  // 三、动变
  const dynamics = [];
  if (!yong.hidden && yong.isMoving) {
    const change = changeOf(yong, time);
    if (change) {
      // 用神临日月而化回头克：月将章「逢伤亦伤，却有待时之用」（谒贵「世临月建之官，定得见，但被午火回头之克，须待子日冲去午火」），
      // 照常计分，只补应期；克神得月建生扶，或日月、动爻又来克用神，寡不敌众，临日月也护不住，再减 2 分（日辰章「爻临日建而月建动爻
      // 同来克者，似寡不敌众……破亦为破，伤亦为伤」，占病得遁之姤「不宜申金月建生亥水回头克世」，月将章「只恐他爻又来克制用爻，虽临月建亦难敌也」）
      const lord = yong.zhi === time.monthZhi ? '月建' : yong.zhi === time.dayZhi ? '日辰' : '';
      // 「待时」是占事、占病的话；寻地、祖坟、家宅论的是形势，寻地章「世爻……化回头克，但逢一者，皆非吉地」（占以父柩附葬祖茔「世爻被克，不宜附葬」，世临月建亦然）
      const waitable = !['gravesite', 'ancestral', 'home'].includes(meta.value);
      if (change.relation === 'controlled' && lord && waitable) {
        const monthOnKiller = relationOf(yong.changed.element, ZHI_ELEMENT[time.monthZhi]);
        const killerByMonth = yong.changed.zhi === time.monthZhi || monthOnKiller === 'same' || monthOnKiller === 'generated';
        const otherAttack = lord === '月建' ? strength.dayRelation === 'controlled' : strength.monthRelation === 'controlled';
        const lineAttack = dyn.movers.some((item) => item.relation === 'controlled' && !item.bound && item.power.force !== 'weak');
        if (!killerByMonth && !otherAttack && !lineAttack) {
          // 月将章其七「占事者目下不成，待至冲去伤爻之日，则不受其伤矣。病者必愈，图事必成」、日辰章其六「化回头之克亦不为殃」：回头克不扣分，只定应期
          change.score = 0;
          change.text += lord === '月建'
            ? `；用神临月建，逢伤亦伤，却有待时之用，目下不成，待${ZHI_CLASH[yong.changed.zhi]}日冲去克神则必成（《增删卜易·月将章》）`
            : `；用神临日辰，如山如冈，化回头之克亦不为殃，待${ZHI_CLASH[yong.changed.zhi]}日冲去克神（《增删卜易·日辰章》）`;
        } else {
          const why = killerByMonth ? '克神得月建生扶' : otherAttack ? `${lord === '月建' ? '日辰' : '月建'}又来克` : '动爻又来克';
          change.score -= 2;
          change.text += `；用神虽临${lord}，而${why}，寡不敌众，伤亦为伤（《增删卜易·日辰章》《月将章》）`;
        }
      }
      if (!awayTraveler) total += change.score;
      dynamics.push(`用神发动，${change.text}`);
    }
  }
  // 子嗣章「子孙变鬼，万无一活」；代占六亲，用神化鬼为凶兆（问病见疾病章，产妇财化鬼见产妇章）
  if (!yong.hidden && yong.isMoving && yong.changed?.relative === '官鬼' && yong.relative !== '官鬼' && meta.value !== 'health'
    && (proxy || meta.value === 'children' || (meta.value === 'maternity' && yong.relative !== '妻财'))) {
    const sonToGhost = yong.relative === '子孙' && meta.value === 'children';
    total -= sonToGhost ? 5 : 2;
    if (sonToGhost) cap = true;
    dynamics.push(sonToGhost ? '子孙变鬼，大凶之兆（子嗣章：屡占子女，若子孙变鬼，万无一活）' : '用神化鬼，凶兆');
  }
  total += rootless ? Math.min(dyn.score, 0) : dyn.score;
  dynamics.push(...dyn.texts);
  // 三合局（六合章）：局生用神、局与用神同气为吉，局克用神为凶；世在局中为美，局生应爻不生世为「出现无情」；
  // 行人、出行用神在局中，被合不回、被合而留；避乱、出行以子孙合局为福神克去身边之鬼
  frames.forEach((frame) => {
    const name = `${frame.zhis.join('')}合成${frame.element}局`;
    if (frame.pending.length) {
      // 占后遇功名「子水破而化空……作元神而无用」，局待实破之月方见
      dynamics.push(`${frame.zhis.join('')}欲合${frame.element}局，但${frame.pending.map((line) => `${line.positionName}${line.zhi}`).join('、')}月破无生扶，目下不成局，待填实之日月方成（《增删卜易·六合章》）`);
      return;
    }
    const fortune = GENERATES[hexagram.palaceElement] === frame.element;
    let delta;
    let text;
    if (sonsBless && fortune) {
      delta = 3;
      text = '，子孙合局，福神当权，克去身边之鬼';
    } else if (!yong.hidden && frame.zhis.includes(yong.zhi) && ['controlled', 'drained', 'spent'].includes(relationOf(yong.element, frame.element))) {
      // 用神自己在局内（如未土用神在亥卯未木局），是被合入局，不是局来克它、泄它：六合章只说「用神在三合之内，被合而留／被合不回」，
      // 占父近病得萃之否「未土父爻动化进神，戌值旬空，近病逢空即愈」，野鹤不以亥卯未木局克父为嫌；
      // 局与用神同气、局生用神的照旧（占地得颐之无妄「日月世爻共成三合……以化长生」，戌土世在寅午戌火局内而受局生）
      delta = 0;
      text = '，用神在局内，随局合住，不以局克用神论，待冲开之日';
    } else {
      const relation = relationOf(yong.element, frame.element);
      delta = { generated: 3, controlled: -3, same: 2, drained: -1, spent: 0 }[relation];
      text = { generated: '，生用神', controlled: '，克用神', same: '，与用神同气，用神愈旺', drained: '，泄用神之气', spent: '，受用神所克' }[relation];
      if (!proxy && yong !== shiLine) {
        if (frame.zhis.includes(shiLine.zhi)) {
          delta += 1;
          text += '，世在局中为美';
        } else if (GENERATES[frame.element] === shiLine.element) {
          delta += 1;
          text += '，局生世爻';
        } else if (CONTROLS[frame.element] === shiLine.element) {
          delta -= 1;
          text += '，局克世爻';
        } else if ((relation === 'same' || relation === 'generated') && (GENERATES[frame.element] === yingLine.element || frame.zhis.includes(yingLine.zhi))) {
          // 占官缺得否「巳酉丑合成官局而生应爻，不来生世，正所谓出现无情，此缺不得……官生应爻，一定不得」：用神成局而归于应，所求归于他人，至多偏弱
          delta -= 4;
          cap = true;
          text += '，却生应爻不生世，出现无情，利于他人，所求不得';
        }
      }
    }
    if (awayTraveler) {
      // 行人章：问在外的人来不来只看来与不来之象，局生克用神是在外安否的事，不计入倾向；「用神三合，冲开之月日而来」
      delta = 0;
      if (!yong.hidden && frame.zhis.includes(yong.zhi)) text += '；用神在局中，被合住，冲开之月日而来（《增删卜易·行人章》）';
    } else if (meta.value === 'travel' && !yong.hidden && frame.zhis.includes(yong.zhi)) {
      // 出行章「动逢合住而留」
      delta -= 3;
      text += '；用神在局中，被合而留';
    }
    total += delta;
    dynamics.push(`${name}${text}（《增删卜易·六合章》）`);
  });
  const changedToYong = relative && !yong.fromChange ? lines.filter((line) => line.changed?.relative === relative && (yong.hidden || line.position !== yong.position)) : [];
  if (changedToYong.length) {
    total += 1;
    dynamics.push(`${changedToYong.map((line) => line.positionName).join('、')}动而化出${relative}，用神有应`);
  }
  // 动静生克章：六爻安静，旺相之爻可以生得、克得休囚之爻
  if (!dyn.movers.length && !frames.length && !reading.movingPositions.length && !yong.hidden && strength.level === '休囚') {
    lines.filter((line) => line.position !== yong.position && assessStrength(line, time).level === '旺相').forEach((line) => {
      const relation = relationOf(yong.element, line.element);
      if (relation === 'generated') {
        total += 1;
        dynamics.push(`${lineLabel(line)}旺相，六爻安静时亦能生休囚之用神`);
      } else if (relation === 'controlled') {
        total -= 1;
        dynamics.push(`${lineLabel(line)}旺相，六爻安静时亦能克休囚之用神`);
      }
    });
  }
  if (!dynamics.length) {
    dynamics.push(yong.fromChange ? '用神是动爻化出之爻：动爻不克变爻，只论日月生克'
      : reading.movingPositions.length ? '动爻与用神无直接生克' : '六爻安静，以用神与世应的旺衰和卦辞断事');
  }
  points.push(...dynamics);

  // 四、世应
  const shiStrength = assessStrength(shiLine, time);
  const shiYingRelation = relationOf(shiLine.element, yingLine.element);
  const shiYingTexts = { generated: '应爻生世，对方或外界有助', controlled: '应爻克世，对方或外界不利于我', same: '世应比和', drained: '世爻生应，我方付出较多', spent: '世克应，我方占主动' };
  let shiYingText = shiYingTexts[shiYingRelation];
  let shiYingScore = { generated: 1, controlled: -1, same: 0, drained: 0, spent: 0 }[shiYingRelation];
  // 应爻安静而休囚，来生世爻生之不起（动静生克章「旺相之爻可以生得休囚之爻」；占复起功名「九五来生，今被日克」，不作吉论）
  const yingStill = !yingLine.isMoving && !isDarkMoving(yingLine, time);
  const yingStrength = assessStrength(yingLine, time);
  if (shiYingRelation === 'generated' && yingStill && yingStrength.level === '休囚') {
    shiYingScore -= 1;
    shiYingText = '应爻虽生世，而休囚安静，生之不起';
  } else if (shiYingRelation === 'controlled' && sonsBless && yingLine.relative === '子孙' && yingLine.changed?.relative !== '官鬼') {
    // 出行章「子孙克世者亦吉」、趋避章「子孙若发动于卦中，不拘克世持世，俱以为吉」：应爻是子孙来克世，不作不利论；
    // 子孙变鬼的不算福神（占出行得明夷之小过「卦中子动变鬼，防儿女少安」）
    shiYingScore += 1;
    shiYingText = '应爻子孙克世，福神克世亦吉（《增删卜易·出行章》）';
  } else if (shiYingRelation === 'controlled' && yingStill && yingStrength.level !== '旺相' && !(yingStrength.level === '平' && shiStrength.level === '休囚')) {
    // 同理，静爻要旺相才克得休囚之爻（占流年得艮「官星持世，长生于亥日，业已成矣」，不以申金应爻克世为嫌）
    shiYingScore += 1;
    shiYingText = '应爻虽克世，而安静不旺，克之不动（《增删卜易·动静生克章》）';
  }
  // 六合卦世应必合、六冲卦世应必冲，那是卦体，已在卦象里按六合章、六冲章论，不再重复计分
  if (ZHI_HARMONY[shiLine.zhi] === yingLine.zhi) {
    shiYingText += hexagram.relation === '六合' ? '，世应相合（六合卦体）' : '，世应相合，彼此有情';
    if (hexagram.relation !== '六合') shiYingScore += 1;
  } else if (ZHI_CLASH[shiLine.zhi] === yingLine.zhi) {
    shiYingText += hexagram.relation === '六冲' ? '，世应相冲（六冲卦体）' : '，世应相冲，彼此不合';
    if (hexagram.relation !== '六冲') shiYingScore -= 1;
  }
  if (proxy) {
    // 代占：世是问卦的自己，成败看用神，世应只作参考（行人等另有专门断法）
    shiYingText = `替${who.label}问，成败看用神，世应只作参考；${shiYingText}`;
    shiYingScore = 0;
  } else if (relative && !yong.hidden && !yong.fromChange && yong.isShi) {
    // 「官星持世者必得」（升选何方章）、「古以财爻持世冲世者，必得」（求财章占例）、「官星持世……姻缘必就」（婚姻章）
    total += 1;
    shiYingText = `用神持世，事在自己手里；${shiYingText}`;
  } else if (yong !== shiLine) {
    if (!yong.hidden && yong.isYing) {
      if (shiYingRelation === 'controlled' && yong.relative !== '官鬼') {
        // 用神临应而克世，也是用神来就我：占求财得小畜「应临月建之财以克世，许之必得」
        shiYingScore += 2;
        shiYingText = shiYingText.replace(shiYingTexts.controlled, '用神临应而克世，用神来就我（「应临月建之财以克世，许之必得」）');
      } else if (shiYingRelation === 'generated') {
        // 求财章「财爻生世合世克世持世，皆谓之财来就我」；占本人婚姻「戌土财爻动而生世，又得世应相生……求之必允」
        shiYingScore += 1;
        shiYingText = shiYingText.replace(shiYingTexts.generated, '用神临应而生世，用神来就我');
      } else shiYingText = `用神临应，事由对方或外界决定；${shiYingText}`;
    } else {
      const yongToShi = relationOf(shiLine.element, yong.element);
      if (yongToShi === 'generated' || ZHI_HARMONY[yong.zhi] === shiLine.zhi) {
        total += 1;
        shiYingText = `用神生合世爻，事与我有缘；${shiYingText}`;
      } else if (yongToShi === 'controlled') {
        // 《增删卜易》：「财爻克世，此财必得」「用爻克世必然归」「父母为用神，克世者速至」——用神来克世，是用神来就我。
        // 官鬼为用神（求官、女占夫）不在此列，仍按有压力论。
        if (yong.relative !== '官鬼') {
          total += 1;
          shiYingText = `用神克世，用神来就我（「财爻克世，此财必得」「用爻克世必然归」）；${shiYingText}`;
        } else {
          total -= 1;
          shiYingText = `用神克世，得之亦有压力；${shiYingText}`;
        }
      }
    }
  }
  // 世动化回头克（世不是用神）：序「皆不宜世爻变鬼，及化回头之克，定见凶危」、月将章占开铺「世化回头之克，生少克多」、
  // 进神退神章占自陈「世化回头之克……大凶之兆」；代占则子嗣章「虽占六亲，常有带出自身之凶者」，只作提醒（世爻是用神时已在动变里算过）
  if (yong !== shiLine && shiLine.isMoving && changeFlagsOf(shiLine, time).backCtrl && meta.value !== 'travel') {
    if (proxy) shiYingText += `；世爻动而化${shiLine.changed.ganZhi}回头克，问卦的人自己也要当心（《增删卜易·子嗣章》：虽占六亲，常有带出自身之凶者）`;
    else {
      total -= 3;
      shiYingText += `；世爻动而化${shiLine.changed.ganZhi}回头克，所谋多凶（《增删卜易》：「不宜世爻变鬼，及化回头之克，定见凶危」）`;
    }
  }
  // 世是问卦人自己（用神另有六亲时），被日辰克而又不旺：日辰章「爻之强旺，能克害刑冲，似秋霜之杀草」，月将章占开铺「独嫌日辰克世……鬼在身边，须防疾病」
  if (!proxy && yong !== shiLine && !yong.isShi && shiStrength.dayRelation === 'controlled' && shiStrength.level !== '旺相') {
    shiYingScore -= 1;
    shiYingText += '；世爻被日辰克而不旺，问卦人自身受累（《增删卜易·月将章》占开铺「独嫌日辰克世」）';
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
    // 歌诀所忌（鬼动、兄摇、财临绝破、鬼化财）一样不犯，用神又不空破休囚，便许无碍（占妹临产得晋「月令克之，日建生之，许之无碍……此月克而日生，无增克制帮扶也」）
    const dayStage = yong.hidden ? '' : stageAt(yong.element, time.dayZhi);
    if (!notes.length && !yong.hidden && strength.level !== '休囚' && !strength.marks.includes('月破') && !strength.emptyKind && dayStage !== '绝' && dayStage !== '墓'
      && !lines.some((line) => line.isMoving && line.position !== yong.position && controls(line, yong))) {
      total += 2;
      notes.push('兄鬼不动，用神不临空破墓绝，又无动爻克制，许之无碍');
    }
    if (notes.length) points.push(`产妇安否（问产妇安否章）：${notes.join('；')}`);
  }

  // 失物、流年、趋避、寻地、祖坟、问病、出行与行人各有专门断法
  const special = TOPIC_RULES[meta.value]?.({ lines, hidden, time, shiLine, yingLine, yong, hexagram, changed, proxy, who, illness, strength });
  if (special) {
    total += special.score;
    if (special.cap) cap = true;
    if (special.floor) floor = true;
    points.push(...special.points);
    notices.push(...special.notices);
  }

  // 五、卦象
  const structure = [];
  // 六冲、六合按三对爻的地支算（liuyao.js 的 hexagramRelationOf）：六冲十卦、六合八卦。
  const clash = hexagram.relation === '六冲';
  const toClash = changed?.relation === '六冲';
  if (meta.value === 'health' && (clash || toClash)) {
    // 疾病章：「内有不看用神而断生死者，卦变与六冲是也」；「久病者，卦逢六冲，卦变六冲，不论用神之衰旺，乃不治之疾也。近病逢之，不药而愈」
    const effect = clashEffectOf(meta.value, { illness, proxy, changedOnly: !clash });
    total += effect.score;
    structure.push(effect.text);
    if (illness === 'recent') floor = true;
    if (illness === 'chronic') cap = true;
  } else if (clash && changed?.relation === '六合') {
    // 婚姻章：六冲变六合者更吉，求婚者目下不允，终必成之；已成不睦者，终须和美
    // 六合章：「诸合者，以用神旺者为言，独此六冲卦变六合者，不看用神，竟以吉断」（婚姻、夫妻、功名、求谋、身命、风水、家宅）
    const marriage = meta.value === 'love';
    total += marriage ? 3 : 1;
    structure.push(marriage ? '六冲变六合，婚姻更吉：目下不允，终必成之；已成不睦，终须和美（《增删卜易·婚姻章》）' : '六冲变六合，冲中逢合，散而复聚，先难后成');
    if (CLASH_TO_HARMONY_TOPICS.has(meta.value)) {
      floor = true;
      structure.push('六冲卦变六合者，不看用神，竟以吉断（《增删卜易·六合章》）');
    }
  } else if (hexagram.relation === '六合' && toClash) {
    total -= 1;
    structure.push('六合变六冲，合处逢冲，先聚后散');
  } else {
    if (clash || toClash) {
      const effect = clashEffectOf(meta.value, { illness, proxy, changedOnly: !clash, yongStrong: !yong.hidden && strength.level === '旺相', yongWeak: !yong.hidden && strength.level === '休囚' });
      total += effect.score;
      structure.push(effect.text);
    }
    if (hexagram.relation === '六合') {
      const knot = meta.value === 'lawsuit';
      total += knot ? -1 : 1;
      structure.push(knot ? '本卦六合：官讼逢合，根结难解（《增删卜易·六合章》）' : '本卦六合，事易成但进展缓');
    }
    if (changed?.relation === '六合') {
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
  // 卦变生克墓绝章：「凡遇卦化克者，不论用神之衰旺，皆以凶推」；书中所举巽变乾、离变坎、震变兑，疾病章「艮坤化震巽」，
  // 都是八纯卦内外同变（反伏章「卦变者，内外动而反吟，同一卦也」）。化出之卦回头克本卦，卦体受伤，倾向至少偏弱。
  const pureBits = (bits) => Array.isArray(bits) && bits.slice(0, 3).join('') === bits.slice(3, 6).join('');
  const toPalaceElement = changed && pureBits(hexagram.bits) && pureBits(changed.bits) ? getPalaceInfo(changed.bits)?.palaceElement : null;
  const guaBackCtrl = Boolean(toPalaceElement) && CONTROLS[toPalaceElement] === hexagram.palaceElement;
  if (guaBackCtrl) {
    structure.push(`卦变回头克（${hexagram.name}${hexagram.palaceElement}化${changed.name}${toPalaceElement}）：卦体如人之根本，卦化回头克，不论用神衰旺，皆以凶推（《增删卜易·卦变生克墓绝章》）`);
  }
  if (structure.length) points.push(structure.join('；'));

  // 六、倾向与应期
  if (floor) total = Math.max(total, 3);
  // 卦变回头克「新病亦主危亡」，压过近病逢冲之吉
  if (guaBackCtrl || cap) total = Math.min(total, -3);
  // 用神是官鬼而吉凶反看的类别（占鬼神），倾向由专门断法给。
  const verdict = special?.verdict ?? verdictOf(total, Boolean(yong.hidden));
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
    subject: who ? { value: who.value, label: who.label } : null,
    illness: meta.value === 'health' && LIUYAO_ILLNESS_LABELS[illness] ? illness : '',
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
