/**
 * 六亲宫星（程序初判，仅供参考）
 *
 * 星与宫照子平列出：宫按《子平真诠·论宫分用神配六亲》「年月日时，自上而下」——年月为祖上、父母（《滴天髓·父母》「岁月所关」），
 * 月柱为兄弟，日支为夫妻宫，时柱为子女宫；星按同篇「正印为母……偏财为父……正财为妻……官煞为子女……比肩为兄弟」，
 * 女命以官杀为夫、食伤为子女（子平女命通行取法）。宫位逢冲、星被别的天干合去，另作提示。
 *
 * 吉凶按任铁樵《滴天髓阐微·六亲论》的注推（任氏以为六亲不能专执星论，要看日主衰旺与用神）：
 * - 妻（男命）：先看任注论克妻、不克的几条（财神轻而无官、比劫多，主克妻；财神重而身弱、无比劫，主克妻；
 *   官杀旺而用印、见财星，主妻陋而克；劫刃重、财轻、有食伤而逢枭印，妻有凶险；劫刃旺而财轻、有食伤，妻贤不克），
 *   都不合时看妻宫（日支）坐喜坐忌，宫不分喜忌再看财星喜忌（「清者，喜神即是财星」）；坐喜神却被克它的一支冲去的
 *   按克妻看（「巳亥逢冲，群劫纷争，所以连克三妻」；冲它的支被它克的不算，「坐下酉金冲去卯木……得妻财万仞」）。
 * - 夫（女命）：「凡女命之夫星，即是用神」——先看任注克夫诸条（官星微、无财星、日主强、伤官重之类），都不合时看用神有力与否。
 * - 子女：男命「凡八字之用神即是子星」，先看任注子女诸条（日主旺、无印绶、有食伤，子必多……），都不合时看用神；
 *   女命「女命之子星，即是喜神」，看喜神（喜用第二位）。火炎土燥、局中全无湿气的，男女命都先断子息艰难。
 * - 父母：「财官印绶，在于年月，为日主之喜，父母不贵亦富；为日主之忌，不贫亦贱」——看年月两柱天干与本气的喜忌。
 * - 兄弟：先看任注「官轻伤重，比劫生伤……必遭兄弟之累」，不合时「不论提纲之喜忌，全凭日主之爱憎」——看比劫是喜是忌。
 * 用神、喜神取「五行与旺衰」一节的喜用第一、二位；认出从、化、专旺的，按此格论喜忌（与大运流年同一口径）。
 * 用神有力：透干或作某支本气，五行分数（日干不计）不少于 1.5；受制：克它的五行分数不少于 3 且是它的两倍以上，
 * 又没有通关（生用神者）、没有制伏（克那一行者）——制水的土只算燥土（戊透干、未戌本气），辰丑己湿土不算
 *（任注「丑乃湿土，能泄火不能止水」，己亥 丙子 乙丑 壬午「克妻无子」）。各条只列结构与古法的看法，不断具体人事。
 */
import { findRelations } from './baziRelations.js';
import { elementToneOf, favorBasisOf } from './baziStrength.js';

const GAN_HE = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
const GAN_WUXING = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
const invert = (map) => Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key]));
const GENERATED_BY = invert(GENERATES);
const CONTROLLED_BY = invert(CONTROLS);
const POSITIONS = ['本气', '中气', '余气'];
const PILLAR_SHORT = { year: '年', month: '月', day: '日', time: '时' };
const ROLE_OF = {
  比肩: '比劫', 劫财: '比劫', 食神: '食伤', 伤官: '食伤', 偏财: '财', 正财: '财', 七杀: '官杀', 正官: '官杀', 偏印: '印', 正印: '印',
};
const TONE_TEXT = { good: '是喜用', bad: '是忌神', neutral: '喜忌不显' };
/** 宫位上要提示的关系：冲最要紧，刑、害、合次之。 */
const PALACE_KINDS = ['反吟', '冲', '刑', '自刑', '害', '合', '半合', '三合', '三会'];
/** 从强、专旺一类按身旺论，其余从格、化格按身弱论。 */
const STRONG_SPECIAL = /从强|专旺|曲直|炎上|稼穑|从革|润下/;
/** 五行分数（日干不计）的粗分：无 < 0.5，微 < 1，轻 < 1.5，有 ≥ 1，重 ≥ 3。 */
const AMOUNT = Object.freeze({ none: 0.5, faint: 1, light: 1.5, has: 1, heavy: 3 });
/** 火炎土燥要火重（≥ AMOUNT.heavy）、土也不轻（≥ 2.5 分）。 */
const ZAO_EARTH = 2.5;

const relativesOf = (female) => [
  {
    key: 'spouse',
    kind: '夫妻',
    title: female ? '夫' : '妻',
    stars: [female
      ? { label: '夫星', names: ['正官', '七杀'], note: '正官为夫，七杀为偏夫' }
      : { label: '妻星', names: ['正财', '偏财'], note: '正财为妻，偏财为妾' }],
    palaces: [{ key: 'day', label: '夫妻宫（日支）' }],
    classic: female
      ? { source: '《滴天髓·女命》', text: '论夫论子要安详，气静和平妇道章。' }
      : { source: '《滴天髓·夫妻》', text: '夫妻因缘宿世来，喜神有意傍天财。' },
  },
  {
    key: 'children',
    kind: '子女',
    title: '子女',
    stars: [female
      ? { label: '子女星', names: ['食神', '伤官'], note: '女命以食伤为子女' }
      : { label: '子女星', names: ['七杀', '正官'], note: '男命以官杀为子女' }],
    palaces: [{ key: 'time', label: '子女宫（时柱）' }],
    classic: { source: '《滴天髓·子女》', text: '子女根枝一世传，喜神看与杀相连。' },
  },
  {
    key: 'parents',
    kind: '父母',
    title: '父母',
    stars: [
      { label: '母星', names: ['正印', '偏印'], note: '正印为母，偏印为偏母' },
      { label: '父星', names: ['偏财'], note: '偏财为父' },
    ],
    palaces: [{ key: 'year', label: '祖上（年柱）' }, { key: 'month', label: '父母宫（月柱）' }],
    classic: { source: '《滴天髓·父母》', text: '父母或隆与或替，岁月所关果非细。' },
  },
  {
    key: 'siblings',
    kind: '兄弟',
    title: '兄弟',
    stars: [{ label: '兄弟星', names: ['比肩', '劫财'], note: '比肩、劫财为兄弟姐妹' }],
    palaces: [{ key: 'month', label: '兄弟宫（月柱）' }],
    classic: { source: '《滴天髓·兄弟》', text: '兄弟谁废与谁兴，提用财神看重轻。' },
  },
];

/** 某个十神在四柱里出现的位置：天干透出（日干除外）与地支所藏。 */
const placesOf = (pillars, names) => pillars.flatMap((pillar) => [
  ...(pillar.key !== 'day' && pillar.gan && names.includes(pillar.ganShiShen)
    ? [{ key: pillar.key, part: '干', gan: pillar.gan, shiShen: pillar.ganShiShen, text: `${PILLAR_SHORT[pillar.key]}干${pillar.gan}` }]
    : []),
  ...(pillar.hiddenGanDetails ?? [])
    .map((detail, index) => (names.includes(detail.shiShen)
      ? { key: pillar.key, part: '支', gan: detail.gan, shiShen: detail.shiShen, position: POSITIONS[index] ?? '余气', text: `${PILLAR_SHORT[pillar.key]}支${pillar.zhi}${index ? `（${POSITIONS[index] ?? '余气'}${detail.gan}）` : ''}` }
      : null))
    .filter(Boolean),
]);

const PILLAR_ORDER = ['year', 'month', 'day', 'time'];
const adjacent = (a, b) => Math.abs(PILLAR_ORDER.indexOf(a) - PILLAR_ORDER.indexOf(b)) === 1;

/** 透出的六亲星与紧贴的天干相合：被别的干合住，或与日主相合（「财来就我」）。 */
const heOf = (pillars, places) => places.filter((place) => place.part === '干').flatMap((place) => pillars
  .filter((pillar) => adjacent(pillar.key, place.key) && pillar.gan && GAN_HE[place.gan] === pillar.gan)
  .map((pillar) => (pillar.key === 'day'
    ? `${place.text}与日主${pillar.gan}相合`
    : `${place.text}被${PILLAR_SHORT[pillar.key]}干${pillar.gan}合住`)));

const starOf = (pillars, basis, star) => {
  const role = ROLE_OF[star.names[0]];
  const element = Object.keys(basis.roles).find((key) => basis.roles[key] === role);
  const tone = elementToneOf(element, basis).tone;
  const places = placesOf(pillars, star.names);
  const transparent = places.some((place) => place.part === '干');
  const rooted = places.some((place) => place.part === '支');
  const he = heOf(pillars, places);
  const presence = !places.length ? '四柱不见'
    : transparent ? `透出${rooted ? '有根' : '无根'}` : '藏而不透';
  const stemText = places.filter((place) => place.part === '干').map((place) => place.text).join('、');
  const branchText = places.filter((place) => place.part === '支').map((place) => place.text).join('、');
  const where = [stemText && `透${stemText}`, branchText && `藏${branchText}`].filter(Boolean).join('，');
  const text = places.length
    ? `${star.label}${element}（${star.note}）${where}，${TONE_TEXT[tone]}${he.length ? `；${he.join('，')}` : ''}`
    : `${star.label}${element}（${star.note}）四柱不见`;
  return { ...star, role, element, tone, places, transparent, rooted, he, presence, text };
};

const palaceOf = (byKey, basis, relations, palace) => {
  const pillar = byKey[palace.key];
  if (!pillar?.zhi) return { ...palace, missing: true, text: `${palace.label}：时辰不详，不论` };
  const main = pillar.hiddenGanDetails?.[0];
  const element = main?.wuxing ?? null;
  const tone = element ? elementToneOf(element, basis).tone : 'neutral';
  const hits = relations
    .filter((relation) => (relation.scope === 'zhi' || relation.scope === 'pillar') && relation.memberKeys?.includes(palace.key)
      && relation.kinds.some((kind) => PALACE_KINDS.includes(kind)))
    // 反吟（天克地冲）标出是哪两柱：「丙子、庚午天克地冲」。
    .map((relation) => (relation.kinds.includes('反吟')
      ? `${relation.memberKeys.map((key) => `${byKey[key]?.gan ?? ''}${byKey[key]?.zhi ?? ''}`).join('、')}天克地冲`
      : relation.title));
  const clashes = relations.filter((relation) => relation.memberKeys?.includes(palace.key)
    && (relation.scope === 'zhi' || relation.scope === 'pillar') && relation.kinds.some((kind) => kind === '冲' || kind === '反吟'));
  const clash = clashes.length > 0;
  // 冲是哪一方被冲去，看五行相克：冲它的那一支本气克这一宫的本气，这一宫才算被冲去（任注「巳亥逢冲，群劫纷争……连克三妻」亥水克巳火；
  // 「坐下酉金冲去卯木，生起癸水……得妻财万仞」酉金克卯木，妻宫反得其利）。
  const clashedBy = clashes.flatMap((relation) => relation.memberKeys.filter((key) => key !== palace.key))
    .map((key) => byKey[key]?.hiddenGanDetails?.[0]?.wuxing ?? null)
    .filter((other) => other && element && CONTROLS[other] === element);
  return {
    ...palace,
    zhi: pillar.zhi,
    gan: pillar.gan,
    shiShen: main?.shiShen ?? null,
    element,
    tone,
    relations: hits,
    clash,
    clashedBy,
    text: `${palace.label}${pillar.zhi}，本气${main?.gan ?? ''}${main?.shiShen ?? ''}（${element ?? ''}）${TONE_TEXT[tone]}${hits.length ? `；${hits.join('、')}` : ''}`,
  };
};

/** 某一行的多少：分数（日干不计）、透干、作本气，粗分成无、微、轻、有、重。 */
const amountOf = (pillars, scores, element) => {
  const score = scores?.[element] ?? 0;
  const stems = pillars.filter((pillar) => pillar.key !== 'day' && pillar.gan && GAN_WUXING[pillar.gan] === element);
  return {
    element,
    score,
    none: score < AMOUNT.none,
    faint: score < AMOUNT.faint,
    light: score < AMOUNT.light,
    has: score >= AMOUNT.has,
    heavy: score >= AMOUNT.heavy,
    // 伏：地支藏着、天干不透。
    hidden: score > 0 && !stems.length,
  };
};

const ZHI_CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const holds = (pillar, element) => (pillar.hiddenGanDetails ?? []).some((detail) => GAN_WUXING[detail.gan] === element);

/**
 * 财星够不够得着印（任注「财星坏印」与「财印相隔」之别）：财透干；或印透干而坐下藏财；
 * 或藏财之支与藏印之支紧贴相冲。三样都没有，就是财印相隔。
 */
const caiMeetsYinOf = (pillars, cai, yin) => {
  if (!cai || !yin) return false;
  if (pillars.some((pillar) => pillar.key !== 'day' && GAN_WUXING[pillar.gan] === cai)) return true;
  if (pillars.some((pillar) => pillar.key !== 'day' && GAN_WUXING[pillar.gan] === yin && holds(pillar, cai))) return true;
  return pillars.some((a) => pillars.some((b) => adjacent(a.key, b.key) && ZHI_CHONG[a.zhi] === b.zhi && holds(a, cai) && holds(b, yin)));
};

/**
 * 用神（或喜神）的成色：不现、受制、有力、力薄。
 * @returns {{ element: string, state: 'absent'|'restrained'|'strong'|'weak', tone: 'good'|'bad'|'neutral', text: string }|null}
 */
/** 止得住水的土：戊透干每位 1 分，未、戌作本气 1 分（月支 2 分）；辰丑湿土、己土不算（任注「丑乃湿土，能泄火不能止水」）。 */
const dryEarthScore = (pillars) => pillars.reduce((sum, pillar) => sum
  + (pillar.key !== 'day' && pillar.gan === '戊' ? 1 : 0)
  + (['未', '戌'].includes(pillar.zhi) ? (pillar.key === 'month' ? 2 : 1) : 0), 0);

const godStateOf = (pillars, scores, element) => {
  if (!element) return null;
  const score = scores?.[element] ?? 0;
  const stems = pillars.filter((pillar) => pillar.key !== 'day' && pillar.gan && GAN_WUXING[pillar.gan] === element).map((pillar) => `${PILLAR_SHORT[pillar.key]}干${pillar.gan}`);
  const mains = pillars.filter((pillar) => pillar.zhi && GAN_WUXING[pillar.hiddenGanDetails?.[0]?.gan] === element).map((pillar) => `${PILLAR_SHORT[pillar.key]}支${pillar.zhi}`);
  const where = [stems.length && `透${stems.join('、')}`, mains.length && `作${mains.join('、')}本气`].filter(Boolean).join('，');
  if (!stems.length && !mains.length && score < AMOUNT.has) return { element, state: 'absent', tone: 'bad', text: `${element}四柱不见（或只藏在中气、余气）` };
  const ke = CONTROLLED_BY[element];
  const tong = GENERATED_BY[element];
  const zhi = CONTROLLED_BY[ke];
  const keScore = scores?.[ke] ?? 0;
  // 制伏水的土只算燥土：戊透干、未戌作本气（任注「丑乃湿土，能泄火不能止水」「己土不能为力」）。
  const zhiScore = ke === '水' ? dryEarthScore(pillars) : (scores?.[zhi] ?? 0);
  if (keScore >= AMOUNT.heavy && keScore >= 2 * score && (scores?.[tong] ?? 0) < AMOUNT.light && zhiScore < AMOUNT.light) {
    const zhiNote = ke === '水' && (scores?.[zhi] ?? 0) >= AMOUNT.light ? '湿土止不住水' : `无${zhi}制伏`;
    return { element, state: 'restrained', tone: 'bad', text: `${element}${where ? `（${where}）` : ''}受${ke}重克，无${tong}通关、${zhiNote}` };
  }
  if (score >= AMOUNT.light && (stems.length || mains.length)) return { element, state: 'strong', tone: 'good', text: `${element}${where}，有力` };
  return { element, state: 'weak', tone: 'neutral', text: `${element}${where ? `${where}，` : ''}力薄` };
};

/**
 * 任注《夫妻》论克妻、不克（男命），按先后取第一条合的。「官杀轻而身旺，见财星，遇比劫，主妻美而克」一条太宽
 * （身旺见财、有比劫的盘大半都合），任氏自己论「癸卯 乙丑 庚申 丁丑」也取喜神即是财星断妻贤，暂不收。
 * cond 是任注的条件；verdict 是给人看的断语，把「必」「凶死」「妻陋」这类重话换成「古法主……」的平实说法，original 记任注原话。
 */
const QI_RULES = [
  { when: ({ bi, cai, shi, yin }) => bi.heavy && cai.light && shi.has && !yin.has, tone: 'good', cond: '劫刃旺而财轻，有食伤', verdict: '妻贤不克', original: '妻贤不克' },
  { when: ({ bi, cai, shi, yin }) => bi.heavy && cai.light && shi.has && yin.has, tone: 'bad', cond: '劫刃重，财星轻，有食伤而逢枭印', verdict: '妻有凶险', original: '主妻遭凶死' },
  { when: ({ bi, cai, guan }) => cai.light && guan.none && bi.heavy, tone: 'bad', cond: '财神轻而无官，比劫多', verdict: '克妻', original: '主克妻' },
  { when: ({ body, bi, cai }) => cai.heavy && body === 'weak' && bi.light, tone: 'bad', cond: '财神重而身弱，无比劫', verdict: '克妻', original: '主克妻' },
  // 「见财星」要财星够得着印（坏印）：财透干，或印干坐下藏财，或藏财之支紧贴冲印之支；财印相隔的不算
  // （任注「甲子 丙寅 戊寅 己未」杀旺用印，财藏年支，「喜其财印相隔，生生不悖」，夫妇齐眉）。
  { when: ({ guan, cai, yongRole, caiMeetsYin }) => guan.heavy && yongRole === '印' && cai.has && caiMeetsYin, tone: 'bad', cond: '官杀旺而用印，见财星', verdict: '妻宫不美、有刑克', original: '主妻陋而克' },
  { when: ({ cai, guan, shi, yin }) => cai.faint && guan.heavy && shi.none && yin.has, tone: 'bad', cond: '财星微，官杀旺，无食伤，有印绶', verdict: '妻多病弱', original: '主妻有弱病' },
];

/** 任注《女命》论克夫（「官星微，无财星」诸条，维基文库本「无」讹作「地」），按原书先后取第一条合的。 */
const FU_RULES = [
  { when: ({ guan, cai, body, shi }) => guan.faint && cai.none && body === 'strong' && shi.heavy, tone: 'bad', cond: '官星微，无财星，日主强，伤官重', verdict: '克夫', original: '必克夫' },
  { when: ({ guan, cai, bi }) => guan.faint && cai.none && bi.heavy, tone: 'bad', cond: '官星微，无财星，比劫旺', verdict: '妻强夫弱', original: '必欺夫' },
  { when: ({ guan, cai, body, yin }) => guan.faint && cai.none && body === 'strong' && yin.heavy, tone: 'bad', cond: '官星微，无财星，日主旺，印绶重', verdict: '妻强夫弱、夫宫有刑', original: '必欺夫克夫' },
  { when: ({ guan, yin, cai }) => guan.light && yin.heavy && cai.none, tone: 'bad', cond: '官星弱，印绶多，无财星', verdict: '克夫', original: '必克夫' },
  { when: ({ guan, yin, body }) => guan.heavy && yin.light && body === 'weak', tone: 'bad', cond: '官星旺，印绶轻', verdict: '克夫', original: '必克夫' },
  { when: ({ bi, guan, yin, cai }) => bi.heavy && guan.none && yin.heavy && cai.none, tone: 'bad', cond: '比劫旺而无官，印旺无财', verdict: '克夫', original: '必克夫' },
  { when: ({ bi, guan, shi, yin }) => bi.heavy && guan.none && shi.has && yin.heavy, tone: 'bad', cond: '比劫旺，无官星，有伤官，印绶重', verdict: '克夫', original: '必克夫' },
  { when: ({ shi, guan, yin, cai }) => shi.heavy && guan.faint && yin.has && cai.has, tone: 'bad', cond: '食神多，官星微，有印绶，遇财星', verdict: '克夫', original: '必克夫' },
];

/**
 * 任注《女命》「火炎土燥无子」：局中全无湿气（日干不是壬癸，水 0 分，又无辰、丑湿土），火重、土也不轻。男命任注论命造也以此断克子
 * （「乙未 辛巳 戊戌 丁巳」「局中全无湿气……生十二子，刑过十子」；「丙寅 戊戌 丁酉 乙巳」「柱中无水，戌乃燥土……妻妾生十子皆克」）。
 */
const ZAO_RULE = { when: ({ zao }) => zao, tone: 'bad', cond: '火炎土燥，局中全无湿气', verdict: '子息艰难', original: '火炎土燥无子' };

/**
 * 任注《子女》（男命以食伤为子），按先后取第一条合的。条文据 1947 年大东书局《滴天髓阐微》扫描本（古籍库
 * ditian.renzhu.liuqin.005、006）。原书另有「日主弱，有印绶，无食伤，子必多」「日主弱，印绶轻，有财星，子必无」
 * 「日主弱，食伤旺，有印绶，遇财星，虽有若无」「日主弱，官杀旺，有印绶，遇财星，有子必逆」等条，拿任注自己的命造
 * 对照，按程序的旺衰、多少粗分去套反而多断错，暂不收，只在古籍库里录原文。
 */
const ZINV_RULES = [
  ZAO_RULE,
  { when: ({ body, yin, shi }) => body === 'strong' && yin.none && shi.has, tone: 'good', cond: '日主旺，无印绶，有食伤', verdict: '子息多', original: '子必多' },
  { when: ({ body, yin, shi, cai }) => body === 'strong' && yin.heavy && shi.light && cai.has, tone: 'good', cond: '日主旺，印绶重，食伤轻，有财星', verdict: '子多而贤', original: '子多而贤' },
  { when: ({ body, yin, shi, cai }) => body === 'strong' && yin.heavy && shi.none && cai.has, tone: 'good', cond: '日主旺，印绶多，无食伤，有财星', verdict: '子多而能', original: '子多而能' },
  { when: ({ body, yin, shi, cai }) => body === 'strong' && yin.has && shi.light && cai.has, tone: 'neutral', cond: '日主旺，食伤轻，逢印绶，遇财星', verdict: '子少孙多', original: '子少孙多' },
  { when: ({ body, yin, shi }) => body === 'strong' && yin.heavy && shi.light, tone: 'bad', cond: '日主旺，印绶重，食伤轻', verdict: '子息偏少', original: '子必少' },
  { when: ({ body, yin, shi, guan }) => body === 'strong' && yin.none && shi.hidden && guan.has, tone: 'good', cond: '日主旺，无印绶，食伤伏，有官杀', verdict: '子息多', original: '子必多' },
  { when: ({ body, bi, yin, shi }) => body === 'strong' && bi.heavy && yin.none && shi.hidden, tone: 'good', cond: '日主旺，比劫多，无印绶，食伤伏', verdict: '子息多', original: '子必多' },
  { when: ({ body, shi, yin }) => body === 'weak' && shi.heavy && yin.none, tone: 'bad', cond: '日主弱，食伤重，印绶无', verdict: '子息艰难', original: '亦无子' },
  { when: ({ body, shi, bi, guan }) => body === 'weak' && shi.light && bi.none && guan.has, tone: 'bad', cond: '日主弱，食伤轻，无比劫，有官星', verdict: '子息艰难', original: '子必无' },
  { when: ({ body, guan, yin, cai }) => body === 'weak' && guan.heavy && yin.light && cai.faint && cai.hidden, tone: 'bad', cond: '日主弱，官杀重，印绶轻，微伏财', verdict: '多女', original: '必多女' },
  // 印重的杀印相生，不作此论：任注「甲子 丙寅 戊寅 己未」杀旺以丙火印为用，「主从得宜」，生六子皆登科第。
  { when: ({ body, guan, shi, bi, yin }) => body === 'weak' && guan.heavy && shi.light && bi.has && !yin.heavy, tone: 'bad', cond: '日主弱，七杀重，食伤轻，有比劫', verdict: '女多子少', original: '女多子少' },
  { when: ({ body, guan, yin, bi }) => body === 'weak' && guan.heavy && yin.light && bi.light, tone: 'bad', cond: '日主弱，官杀重，无印比', verdict: '子息艰难', original: '子必无' },
];

/**
 * 任注《兄弟》：「官轻伤重，比劫生伤；制杀太过，比劫助食，必遭兄弟之累」——身旺、比劫重，官杀轻而食伤已重，比劫还去生食伤。
 * 身旺用食伤的盘，比劫生用神也列喜，但兄弟按此条论（任注「癸巳 戊午 丙午 庚寅」羊刃当权，「兄弟六人，皆不成器，遭累不堪」）。
 */
const XIONG_RULES = [
  { when: ({ body, guan, shi, bi }) => body === 'strong' && guan.light && shi.heavy && bi.heavy, tone: 'bad', cond: '官轻伤重，比劫生伤', verdict: '兄弟之累', original: '必遭兄弟之累' },
];

/** 任注条目的说法：「任注：日主旺，无印绶，有食伤，古法主子息多」。 */
const ruleText = (rule) => `任注：${rule.cond}，古法主${rule.verdict}`;

const GOD_VERDICT = {
  spouse: { good: '古法看作夫主得力', bad: '古法看作夫宫难全', neutral: '夫宫平平，要等岁运引动' },
  children: { good: '古法看作子息可望', bad: '古法看作子息艰难', neutral: '子息平平，要等岁运引动' },
};

/**
 * 按任注推这一亲的吉凶：先看明文条目，再看用神、喜神或宫位。
 * @returns {{ source: string, tone: 'good'|'bad'|'neutral', rule: { cond: string, verdict: string, original: string }|null, god: object|null, text: string }}
 */
const renReadingOf = (key, { female, ctx, basis, pillars, scores, byKey, stars, palaces }) => {
  const favorable = basis.favorable.map((item) => item.element);
  const firstRule = (rules) => rules.find((rule) => rule.when(ctx)) ?? null;
  if (key === 'spouse' && !female) {
    const source = '《滴天髓阐微·夫妻》任注';
    const rule = firstRule(QI_RULES);
    if (rule) return { source, tone: rule.tone, rule, god: null, text: ruleText(rule) };
    const palace = palaces.find((item) => !item.missing);
    // 妻宫坐喜神却被克它的一支冲去（任注「巳亥逢冲，群劫纷争，所以连克三妻」）；被它克的一支来冲不算（「坐下酉金冲去卯木……得妻财万仞」）。
    if (palace && palace.tone === 'good' && palace.clashedBy.length) {
      return { source, tone: 'bad', rule: null, god: null, text: `妻宫（日支）虽坐喜神，却被${palace.clashedBy.join('、')}冲去（任注「巳亥逢冲，群劫纷争，所以连克三妻」），古法主夫妻难以全美` };
    }
    if (palace && palace.tone !== 'neutral') {
      // 坐财只算正财、偏财（「劫财」是比劫，不是财）；任注原话是「日主坐财，财为喜用者，必得妻财」。
      const zuoCai = palace.shiShen === '正财' || palace.shiShen === '偏财';
      const text = palace.tone === 'good'
        ? (zuoCai ? '日主坐财，财为喜用，任注「必得妻财」' : '妻宫（日支）坐喜神，古法主妻贤有助')
        : '妻宫（日支）坐忌神，古法主夫妻难以全美';
      return { source, tone: palace.tone, rule: null, god: null, text };
    }
    const star = stars[0];
    if (star.tone === 'good') return { source, tone: 'good', rule: null, god: null, text: '妻宫喜忌不显；财星是喜用，任注「清者，喜神即是财星」，古法看作妻贤' };
    if (star.tone === 'bad') return { source, tone: 'bad', rule: null, god: null, text: '妻宫喜忌不显；财星是忌神，古法看作难得其力' };
    return { source, tone: 'neutral', rule: null, god: null, text: '妻宫、妻星喜忌都不显，要等岁运引动再论' };
  }
  if (key === 'spouse' || key === 'children') {
    const byXi = key === 'children' && female;
    const source = `《滴天髓阐微·${female ? '女命' : '子女'}》任注`;
    const rule = firstRule(key === 'spouse' ? FU_RULES : female ? [ZAO_RULE] : ZINV_RULES);
    if (rule) return { source, tone: rule.tone, rule, god: null, text: ruleText(rule) };
    const lead = key === 'spouse' ? '任注「女命之夫星，即是用神」' : byXi ? '任注「女命之子星，即是喜神」' : '任注「凡八字之用神即是子星」';
    const god = godStateOf(pillars, scores, byXi ? favorable[1] ?? favorable[0] : favorable[0]);
    if (!god) return { source, tone: 'neutral', rule: null, god: null, text: `${lead}；此盘喜用不硬分，要等岁运引动再论` };
    return { source, tone: god.tone, rule: null, god, text: `${lead}：${byXi ? '喜神' : '用神'}${god.text}，${GOD_VERDICT[key][god.tone]}` };
  }
  if (key === 'parents') {
    const source = '《滴天髓阐微·父母》任注';
    const chars = ['year', 'month'].flatMap((pillarKey) => {
      const pillar = byKey[pillarKey];
      if (!pillar) return [];
      const main = pillar.hiddenGanDetails?.[0];
      return [
        { char: pillar.gan, element: GAN_WUXING[pillar.gan] },
        { char: pillar.zhi, element: main ? GAN_WUXING[main.gan] : null },
      ].filter((item) => item.char && item.element);
    });
    const tones = chars.map((item) => ({ ...item, tone: elementToneOf(item.element, basis).tone }));
    const good = tones.filter((item) => item.tone === 'good');
    const bad = tones.filter((item) => item.tone === 'bad');
    const tone = good.length > bad.length ? 'good' : bad.length > good.length ? 'bad' : 'neutral';
    const list = [good.length && `${good.map((item) => item.char).join('')}为喜`, bad.length && `${bad.map((item) => item.char).join('')}为忌`].filter(Boolean).join('、') || '喜忌不显';
    // 任注「财官印绶，在于年月，为日主之喜，父母不贵亦富；为日主之忌，不贫亦贱」。
    const tail = tone === 'good' ? '喜多，古法看作祖上有荫（「为日主之喜，父母不贵亦富」）' : tone === 'bad' ? '忌多，古法看作祖荫薄、出身清寒' : '喜忌参半，家世平平';
    return { source, tone, rule: null, god: null, text: `任注论父母只看年月：年月${list}，${tail}` };
  }
  const source = '《滴天髓阐微·兄弟》任注';
  const rule = firstRule(XIONG_RULES);
  if (rule) return { source, tone: rule.tone, rule, god: null, text: ruleText(rule) };
  const star = stars[0];
  const tail = star.tone === 'good' ? `比劫${star.element}是喜用，古法看作兄弟得力` : star.tone === 'bad' ? `比劫${star.element}是忌神，古法看作兄弟难靠` : `比劫${star.element}喜忌不显，兄弟平平`;
  return { source, tone: star.tone, rule: null, god: null, text: `任注「全凭日主之爱憎」：${tail}` };
};

/** 宫位逢冲、星合日主，另提一句。 */
const notesOf = (key, stars, palaces) => {
  const notes = [];
  const clash = palaces.find((palace) => !palace.missing && palace.clash);
  if (clash) notes.push(`${clash.label}逢冲，古法主变动`);
  if (key === 'spouse' && stars.some((star) => star.he.some((line) => line.includes('与日主')))) notes.push('星来合日主，古法以为有情');
  return notes;
};

/**
 * @param {object} chart buildBaziChart 的结果
 * @param {object} strength analyzeStrength 的结果
 * @param {{ special?: object|null }} [options] 疑似特殊格局（从、化、专旺）：认出的按此格论喜忌，与大运流年同一口径
 */
export const analyzeLiuqin = (chart, strength, { special = null } = {}) => {
  if (!chart?.pillars?.length || !strength) return null;
  const female = chart.input?.gender === 'female';
  const basis = favorBasisOf(strength, special);
  const pillars = chart.pillars.filter((pillar) => pillar.gan && pillar.zhi);
  const byKey = Object.fromEntries(pillars.map((pillar) => [pillar.key, pillar]));
  const relations = findRelations(pillars.map((pillar) => ({ key: pillar.key, label: pillar.name, gan: pillar.gan, zhi: pillar.zhi })));
  const neutralBand = !basis.favorable?.length && !basis.unfavorable?.length;
  const scores = strength.scores ?? {};
  const roleElement = (role) => Object.keys(basis.roles).find((key) => basis.roles[key] === role);
  // 从、化、专旺按格论身旺身弱；两气成象只定喜忌（任注「旺衰仍看打分」），身旺身弱照旺衰档。
  const body = basis.source === 'special' && basis.specialKind !== 'liangqi'
    ? (STRONG_SPECIAL.test(basis.specialName ?? '') ? 'strong' : 'weak')
    : /强/.test(strength.band ?? '') ? 'strong' : /弱/.test(strength.band ?? '') ? 'weak' : 'even';
  const ctx = {
    body,
    bi: amountOf(pillars, scores, roleElement('比劫')),
    yin: amountOf(pillars, scores, roleElement('印')),
    shi: amountOf(pillars, scores, roleElement('食伤')),
    cai: amountOf(pillars, scores, roleElement('财')),
    guan: amountOf(pillars, scores, roleElement('官杀')),
    yongRole: basis.roles[basis.favorable[0]?.element] ?? null,
    caiMeetsYin: caiMeetsYinOf(pillars, roleElement('财'), roleElement('印')),
    // 火炎土燥（见 ZAO_RULE）：日干不是壬癸，水 0 分，无辰、丑湿土，火重、土也不轻。
    zao: !['壬', '癸'].includes(byKey.day?.gan) && !((scores.水 ?? 0) > 0) && !pillars.some((pillar) => pillar.zhi === '辰' || pillar.zhi === '丑')
      && (scores.火 ?? 0) >= AMOUNT.heavy && (scores.土 ?? 0) >= ZAO_EARTH,
  };

  const items = relativesOf(female).map((item) => {
    const stars = item.stars.map((star) => starOf(pillars, basis, star));
    const palaces = item.palaces.map((palace) => palaceOf(byKey, basis, relations, palace));
    const ren = neutralBand
      ? { source: null, tone: 'neutral', rule: null, god: null, text: '旺衰中和，喜忌不显，先看星宫有无冲合；吉凶要等岁运引动再论' }
      : renReadingOf(item.key, { female, ctx, basis, pillars, scores, byKey, stars, palaces });
    const verdict = `${[ren.text, ...notesOf(item.key, stars, palaces)].join('；')}。`;
    return { key: item.key, kind: item.kind, title: item.title, classic: item.classic, stars, palaces, ren, tone: ren.tone, verdict };
  });

  const basisText = basis.source === 'special'
    ? `此盘${basis.specialName}，喜忌按此格论（若不成格，以「五行与旺衰」一节的扶抑喜忌为准）`
    : '喜忌按「五行与旺衰」一节扶抑所取';
  const points = items.map((item) => `${item.title}：${item.stars.map((star) => star.text).join('；')}；${item.palaces.map((palace) => palace.text).join('；')}。${item.verdict}`);
  return { female, basis: `${female ? '女命' : '男命'}；${basisText}。`, items, points };
};
