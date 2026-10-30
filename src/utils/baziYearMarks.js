/**
 * 大运、流年的标注：太岁（值、冲、刑、害、破）、岁运并临、与日柱的伏吟反吟，
 * 以及天干地支对日主的喜忌，用于大运时间轴与流年按钮上的小标记。
 */
import { getZhiPairKinds, isTianKeDiChong } from './baziRelations.js';
import { elementToneOf } from './baziStrength.js';

const GAN_WUXING = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI_WUXING = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };

// 按值得提醒的程度排序：按钮上只放第一条，完整列表显示在所选流年的说明里。
export const YEAR_MARK_ORDER = Object.freeze([
  '岁运并临', '反吟日柱', '伏吟日柱', '冲太岁', '刑太岁', '害太岁', '破太岁', '值太岁', '冲日支', '岁运反吟',
]);

export const YEAR_MARK_TONE = Object.freeze({
  岁运并临: 'echo', 反吟日柱: 'clash', 伏吟日柱: 'echo', 冲太岁: 'clash', 刑太岁: 'punish', 害太岁: 'harm',
  破太岁: 'break', 值太岁: 'punish', 冲日支: 'clash', 岁运反吟: 'clash',
});

const KIND_LABEL = { 冲: '冲太岁', 刑: '刑太岁', 自刑: '刑太岁', 害: '害太岁', 破: '破太岁' };

/** 流年地支与本命年支的关系（太岁）。 */
export const describeTaiSui = (liuNian, chart) => {
  const yearZhi = chart?.pillars?.find((pillar) => pillar.key === 'year')?.zhi;
  if (!liuNian?.zhi || !yearZhi) return [];
  const labels = new Set();
  if (liuNian.zhi === yearZhi) labels.add('值太岁');
  getZhiPairKinds(liuNian.zhi, yearZhi).forEach((kind) => { if (KIND_LABEL[kind]) labels.add(KIND_LABEL[kind]); });
  return YEAR_MARK_ORDER.filter((label) => labels.has(label));
};

const overallTone = (gan, zhi) => {
  const good = [gan, zhi].filter((item) => item.tone === 'good').length;
  const bad = [gan, zhi].filter((item) => item.tone === 'bad').length;
  if (good && !bad) return 'good';
  if (bad && !good) return 'bad';
  if (good && bad) return 'mixed';
  return 'neutral';
};

/** 三会方与三合局：三会的方气专一，先查。 */
const JU = Object.freeze([
  { members: ['寅', '卯', '辰'], element: '木', kind: '三会', name: '寅卯辰三会木方' },
  { members: ['巳', '午', '未'], element: '火', kind: '三会', name: '巳午未三会火方' },
  { members: ['申', '酉', '戌'], element: '金', kind: '三会', name: '申酉戌三会金方' },
  { members: ['亥', '子', '丑'], element: '水', kind: '三会', name: '亥子丑三会水方' },
  { members: ['申', '子', '辰'], element: '水', kind: '三合', name: '申子辰三合水局' },
  { members: ['亥', '卯', '未'], element: '木', kind: '三合', name: '亥卯未三合木局' },
  { members: ['寅', '午', '戌'], element: '火', kind: '三合', name: '寅午戌三合火局' },
  { members: ['巳', '酉', '丑'], element: '金', kind: '三合', name: '巳酉丑三合金局' },
]);

/**
 * 运、年的地支与原局地支（流年再加大运地支）凑齐的三会方或三合局。
 * 《滴天髓·岁运》任注论运多看会局：「乙丑支全金局，火土两泄」「壬戌支类西方，木火并伤」「至亥运会木生杀而亡」——
 * 运支补齐了局，就按局的五行论喜忌，不再按本支。只算三字凑齐的，半合不算。
 * @param {string} zhi 运或年的地支
 * @param {string[]} zhis 原局地支（流年再加大运地支）
 * @returns {{ element: string, kind: '三会'|'三合', name: string, members: string[], others: string[] }|null}
 */
export const juOfZhi = (zhi, zhis = []) => {
  if (!zhi) return null;
  const found = JU.find((ju) => ju.members.includes(zhi) && ju.members.every((member) => member === zhi || zhis.includes(member)));
  return found ? { ...found, others: found.members.filter((member) => member !== zhi) } : null;
};

const CONTROLS = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };

/**
 * 大运的盖头、截脚（《滴天髓·岁运》任注）：运「以地支为重，要天干不背」。
 * - 截脚：天干是喜，地支是忌而克天干（喜木运遇甲申、乙酉），「支不载干，则十年皆否」，整步运按忌论。
 * - 盖头：地支是喜，天干是忌而克地支（喜木运遇庚寅、辛卯），「虽有十分之吉，亦减其半」，仍是喜忌参半。
 * 地支与原局会局的，按局的五行看克不克。
 */
const coverOf = (gan, zhi) => {
  if (gan.tone === 'good' && zhi.tone === 'bad' && CONTROLS[zhi.element] === gan.element) {
    return { kind: '截脚', text: `截脚：地支${zhi.element}克天干${gan.element}，任注「支不载干，十年皆否」，整步运按忌论` };
  }
  if (gan.tone === 'bad' && zhi.tone === 'good' && CONTROLS[gan.element] === zhi.element) {
    return { kind: '盖头', text: `盖头：天干${gan.element}克地支${zhi.element}，任注「虽有十分之吉，亦减其半」` };
  }
  return null;
};

/**
 * 某柱天干、地支对日主的喜忌。
 * @param {object} item 大运或流年（gan、zhi）
 * @param {object} strength analyzeStrength 的结果
 * @param {{ zhis?: string[], daYun?: boolean }} [options] 与之会局的地支（原局四支，流年再加大运支）；地支凑齐会局的按局的五行论。
 *   daYun 为真时看盖头、截脚（见 coverOf），截脚的整步运按忌论。
 */
export const describeFavor = (item, strength, { zhis = [], daYun = false } = {}) => {
  if (!item?.gan || !strength) return null;
  const gan = elementToneOf(GAN_WUXING[item.gan], strength);
  const ju = juOfZhi(item.zhi, zhis);
  const zhi = ju ? { ...elementToneOf(ju.element, strength), ju } : elementToneOf(ZHI_WUXING[item.zhi], strength);
  const cover = daYun ? coverOf(gan, zhi) : null;
  return { gan, zhi, cover, overall: cover?.kind === '截脚' ? 'bad' : overallTone(gan, zhi) };
};

const natalZhisOf = (chart) => (chart?.pillars ?? []).map((pillar) => pillar.zhi).filter(Boolean);

/** 地支喜忌的说法（后面接「喜」「忌」或「为喜用」）：会局的写明会成什么局，按局的五行论。 */
export const zhiFavorText = (zhi, favorZhi) => (favorZhi?.ju
  ? `地支${zhi}会成${favorZhi.ju.name}，${favorZhi.element}`
  : `地支${zhi}${favorZhi?.element ?? ''}`);

/**
 * @param {object} liuNian 流年
 * @param {{ chart: object, daYun?: object, strength?: object }} context
 */
export const getLiuNianMarks = (liuNian, { chart, daYun = null, strength = null }) => {
  const labels = new Set(describeTaiSui(liuNian, chart));
  const day = chart?.pillars?.find((pillar) => pillar.key === 'day');
  if (day?.gan && liuNian?.gan) {
    if (liuNian.ganZhi === day.ganZhi) labels.add('伏吟日柱');
    else if (isTianKeDiChong(liuNian, day)) labels.add('反吟日柱');
    else if (getZhiPairKinds(liuNian.zhi, day.zhi).includes('冲')) labels.add('冲日支');
  }
  if (daYun?.ganZhi && liuNian?.ganZhi) {
    if (daYun.ganZhi === liuNian.ganZhi) labels.add('岁运并临');
    else if (isTianKeDiChong(daYun, liuNian)) labels.add('岁运反吟');
  }
  const ordered = YEAR_MARK_ORDER.filter((label) => labels.has(label));
  return {
    labels: ordered,
    badge: ordered[0] ?? null,
    badgeTone: ordered[0] ? YEAR_MARK_TONE[ordered[0]] : null,
    favor: describeFavor(liuNian, strength, { zhis: [...natalZhisOf(chart), daYun?.zhi].filter(Boolean) }),
  };
};

/** 大运的喜忌（地支与原局会局的按局论）。 */
export const getDaYunMarks = (daYun, { strength = null, chart = null } = {}) => ({ favor: describeFavor(daYun, strength, { zhis: natalZhisOf(chart), daYun: true }) });

const TONE_TEXT = { good: '喜', bad: '忌', neutral: '平' };

/** 大运喜忌一句话：「天干丙火喜（印） · 地支子水忌（官杀）；截脚：……」。 */
export const describeDaYunFavor = (daYun, favor) => {
  if (!daYun || !favor) return '';
  const parts = [
    `天干${daYun.gan}${favor.gan.element}${TONE_TEXT[favor.gan.tone]}（${favor.gan.role}）`,
    `${zhiFavorText(daYun.zhi, favor.zhi)}${TONE_TEXT[favor.zhi.tone]}（${favor.zhi.role}）`,
  ];
  return `${parts.join(' · ')}${favor.cover ? `；${favor.cover.text}` : ''}`;
};

/** 一句话说明：「丙午流年：冲太岁 · 天干丙火喜（印）· 地支午火忌（食伤）」 */
export const describeYearMarks = (liuNian, marks) => {
  if (!liuNian || !marks) return '';
  const parts = [...marks.labels];
  if (marks.favor) {
    parts.push(`天干${liuNian.gan}${marks.favor.gan.element}${TONE_TEXT[marks.favor.gan.tone]}（${marks.favor.gan.role}）`);
    parts.push(`${zhiFavorText(liuNian.zhi, marks.favor.zhi)}${TONE_TEXT[marks.favor.zhi.tone]}（${marks.favor.zhi.role}）`);
  }
  return parts.join(' · ');
};

// 流年天干十神的主题：喜用时怎么用、忌神时防什么、不分喜忌时的中性说法。
const TEN_GOD_THEMES = Object.freeze({
  正官: {
    domain: '事业名位、规矩与责任',
    good: '容易被赋予职责与名分，适合求职、升迁、考试与处理公家、合规的事',
    bad: '约束与压力加重，容易被规则、上级或官非琐事牵制，少逞强、守规矩',
    neutral: '职责与规矩的事会多起来，按部就班、守信守约最稳',
  },
  七杀: {
    domain: '压力、竞争与决断',
    good: '冲劲与决断力强，适合开拓新局、攻坚和处理棘手的事',
    bad: '竞争与冲突多，易有意外、过劳与被人为难，宜稳不宜冒进，留意安全',
    neutral: '压力与挑战并存，有多大把握做多大事，别硬扛',
  },
  正财: {
    domain: '正财收入与务实经营',
    good: '正财可期，适合按部就班积累、处理置业与长期投资',
    bad: '财来财去、开支与人情负担增多，财务上留余量，慎担保借贷',
    neutral: '财务上以稳为主，收入与开支都要算清楚',
  },
  偏财: {
    domain: '机会财、人脉与交际',
    good: '交际与机会增多，适合拓展客户、合作与副业',
    bad: '花钱与应酬增多，投机心起，要防大进大出与被人情套住',
    neutral: '机会与花销一起来，别为了面子乱花钱',
  },
  食神: {
    domain: '表达、享受与创作',
    good: '心情舒展、口才与品味出彩，适合学习表达、创作与饮食、休闲相关的经营',
    bad: '容易贪图安逸、重享受而拖延，饮食与作息要节制',
    neutral: '适合把想法说出来、做出来，但别只顾享受忘了正事',
  },
  伤官: {
    domain: '才华、个性与变动',
    good: '灵感与才华外显，适合创作、演讲、转型和争取曝光',
    bad: '言多易失、与上级或权威冲突，情绪、官非与口舌要留意',
    neutral: '想法多、变化多，表达之前先想清后果',
  },
  正印: {
    domain: '学习、长辈与庇荫',
    good: '适合进修考证、沉淀积累，长辈与贵人多助，心态安稳',
    bad: '想得多做得少，容易依赖或被长辈、旧观念牵绊，行动力偏弱',
    neutral: '适合学习与准备，但要给自己定明确的行动节点',
  },
  偏印: {
    domain: '专业技艺、独处与另类思考',
    good: '适合钻研专业技术、独立研究与宗哲身心之学',
    bad: '孤独感与多疑加重，提防小人、合同里的细节与健康小毛病，少钻牛角尖',
    neutral: '一个人琢磨的事会多，记得多和人交流对一对信息',
  },
  比肩: {
    domain: '自主、同辈与竞争',
    good: '自信与行动力强，朋友同辈相助，适合独立做主、带团队',
    bad: '争财争权，花钱较冲动，合作与合伙要把权责写清楚',
    neutral: '靠自己的年份，与人合作先谈好分工',
  },
  劫财: {
    domain: '破财、冲动与朋友牵连',
    good: '敢拼敢争，适合开拓、攻坚与靠朋友圈子成事',
    bad: '易因朋友、投机或冲动破财，借贷担保与赌性决策要慎',
    neutral: '钱财与朋友之间要分清，大额支出先冷静一天',
  },
});

// 太岁、岁运标注对应的一句提醒。
const MARK_ADVICE = Object.freeze({
  岁运并临: '大运与流年同气，吉凶都会被放大，重大决定格外慎重',
  反吟日柱: '流年天克地冲日柱，身体、婚姻与居所都可能有大变动，宜稳守',
  伏吟日柱: '流年与日柱伏吟，心绪反复、旧事重提，宜安静处理内部事务',
  冲太岁: '冲太岁的变动之年，搬迁、换工作、出行多，宜主动安排变动，不宜被动受冲',
  刑太岁: '刑太岁，人事与是非上多留意，签约、合伙要白纸黑字',
  害太岁: '害太岁，提防口舌与暗中阻碍，少掺和他人纷争',
  破太岁: '破太岁，琐碎耗损多，财务与健康上的小事要及早处理',
  值太岁: '本命年值太岁，宜守不宜攻，适合调整、沉淀与打基础',
  冲日支: '冲日支，配偶、合作关系与居住环境容易有波动',
  岁运反吟: '大运与流年天克地冲，环境变化大，是重大转折之年',
});

const HEADLINE_BY_MARK = Object.freeze([
  ['岁运并临', '吉凶放大，谨慎决断'],
  ['反吟日柱', '动荡变化，宜稳守'],
  ['岁运反吟', '重大转折之年'],
  ['冲太岁', '变动之年'],
  ['值太岁', '本命年，宜守不宜攻'],
]);
const HEADLINE_BY_TONE = Object.freeze({
  good: '顺势进取之年',
  bad: '宜守不宜攻',
  mixed: '喜忌参半，分清主次',
  neutral: '平稳过渡之年',
});
const TONE_ADVICE = Object.freeze({
  good: '整体顺遂，可以主动争取',
  bad: '整体阻力偏多，以稳为主、少折腾',
  mixed: '喜忌参半：喜用主管的事主动些，忌神主管的事保守些',
  neutral: '平平之年，按既定计划推进即可',
});

/**
 * 流年提要：两三句话说清这一年的主题（天干十神）、地支喜忌与太岁、岁运标注。
 * @returns {{ tone: 'good'|'bad'|'mixed'|'neutral', headline: string, sentences: string[], text: string } | null}
 */
export const describeYearSummary = (liuNian, { chart = null, daYun = null, strength = null, marks = null } = {}) => {
  if (!liuNian?.gan || !liuNian?.zhi) return null;
  const resolved = marks ?? getLiuNianMarks(liuNian, { chart, daYun, strength });
  const favor = resolved.favor;
  const ganTone = favor?.gan?.tone ?? 'neutral';
  const zhiTone = favor?.zhi?.tone ?? 'neutral';
  const sentences = [];

  const theme = TEN_GOD_THEMES[liuNian.ganShiShen];
  if (theme) {
    const toneKey = ganTone === 'good' ? 'good' : ganTone === 'bad' ? 'bad' : 'neutral';
    const favorNote = ganTone === 'good' ? '，为喜用' : ganTone === 'bad' ? '，为忌神' : '';
    sentences.push(`流年天干${liuNian.gan}为${liuNian.ganShiShen}${favorNote}，主${theme.domain}：${theme[toneKey]}。`);
  }

  if (favor && zhiTone !== 'neutral') {
    const hiddenMain = favor.zhi.ju ? '' : liuNian.hiddenShiShens?.[0] ?? '';
    const hidden = hiddenMain ? `，藏干主气${hiddenMain}` : '';
    const subject = zhiFavorText(liuNian.zhi, favor.zhi);
    sentences.push(zhiTone === 'good'
      ? `${subject}为喜用（${favor.zhi.role}${hidden}），落到人事与环境上多有助力。`
      : `${subject}为忌神（${favor.zhi.role}${hidden}），具体推进时牵绊较多，留足余量。`);
  }

  const advices = resolved.labels.map((label) => MARK_ADVICE[label]).filter(Boolean);
  if (advices.length) sentences.push(`${advices.slice(0, 2).join('；')}。`);

  const hardMark = resolved.labels.some((label) => ['岁运并临', '反吟日柱', '岁运反吟', '冲太岁'].includes(label));
  let tone = favor?.overall ?? 'neutral';
  if (hardMark && tone === 'good') tone = 'mixed';
  if (hardMark && tone === 'neutral') tone = 'bad';
  if (!resolved.labels.length || !advices.length) sentences.push(`${TONE_ADVICE[tone]}。`);

  const markHeadline = HEADLINE_BY_MARK.find(([label]) => resolved.labels.includes(label))?.[1];
  return {
    tone,
    headline: markHeadline ?? HEADLINE_BY_TONE[tone],
    sentences,
    text: sentences.join(''),
  };
};
