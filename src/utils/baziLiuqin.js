/**
 * 六亲宫星（程序初判，仅供参考）
 *
 * 宫：按《子平真诠·论宫分用神配六亲》「年月日时，自上而下」——年月为祖上、父母（《滴天髓·父母》「岁月所关」），
 * 月柱为兄弟，日支为夫妻宫，时柱为子女宫。
 * 星：同篇「正印为母……偏财为父……正财为妻……官煞为子女……比肩为兄弟」；女命以官杀为夫、食伤为子女（子平女命通行取法）。
 * 吉凶先看喜忌：《滴天髓·夫妻》「喜神有意傍天财」，《子女》「喜神看与杀相连」——星与宫是喜用的得力，是忌神的难得其力。
 * 喜忌取「五行与旺衰」一节的扶抑结果；星透出有根的力量显，只藏不透的次之，四柱不见的要看宫位与岁运引出。
 * 宫位逢冲、星被别的天干合去，另作提示。这里只列结构与古法的看法，不断具体人事。
 */
import { findRelations } from './baziRelations.js';
import { elementToneOf } from './baziStrength.js';

const GAN_HE = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
const POSITIONS = ['本气', '中气', '余气'];
const PILLAR_SHORT = { year: '年', month: '月', day: '日', time: '时' };
const ROLE_OF = {
  比肩: '比劫', 劫财: '比劫', 食神: '食伤', 伤官: '食伤', 偏财: '财', 正财: '财', 七杀: '官杀', 正官: '官杀', 偏印: '印', 正印: '印',
};
const TONE_TEXT = { good: '是喜用', bad: '是忌神', neutral: '喜忌不显' };
/** 宫位上要提示的关系：冲最要紧，刑、害、合次之。 */
const PALACE_KINDS = ['反吟', '冲', '刑', '自刑', '害', '合', '半合', '三合', '三会'];

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

const starOf = (pillars, strength, star) => {
  const role = ROLE_OF[star.names[0]];
  const element = Object.keys(strength.roles).find((key) => strength.roles[key] === role);
  const tone = elementToneOf(element, strength).tone;
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

const palaceOf = (byKey, strength, relations, palace) => {
  const pillar = byKey[palace.key];
  if (!pillar?.zhi) return { ...palace, missing: true, text: `${palace.label}：时辰不详，不论` };
  const main = pillar.hiddenGanDetails?.[0];
  const element = main?.wuxing ?? null;
  const tone = element ? elementToneOf(element, strength).tone : 'neutral';
  const hits = relations
    .filter((relation) => (relation.scope === 'zhi' || relation.scope === 'pillar') && relation.memberKeys?.includes(palace.key)
      && relation.kinds.some((kind) => PALACE_KINDS.includes(kind)))
    // 反吟（天克地冲）标出是哪两柱：「丙子、庚午天克地冲」。
    .map((relation) => (relation.kinds.includes('反吟')
      ? `${relation.memberKeys.map((key) => `${byKey[key]?.gan ?? ''}${byKey[key]?.zhi ?? ''}`).join('、')}天克地冲`
      : relation.title));
  const clash = relations.some((relation) => relation.memberKeys?.includes(palace.key)
    && (relation.scope === 'zhi' || relation.scope === 'pillar') && relation.kinds.some((kind) => kind === '冲' || kind === '反吟'));
  return {
    ...palace,
    zhi: pillar.zhi,
    gan: pillar.gan,
    shiShen: main?.shiShen ?? null,
    element,
    tone,
    relations: hits,
    clash,
    text: `${palace.label}${pillar.zhi}，本气${main?.gan ?? ''}${main?.shiShen ?? ''}（${element ?? ''}）${TONE_TEXT[tone]}${hits.length ? `；${hits.join('、')}` : ''}`,
  };
};

const STAR_VERDICT = { good: '是喜用，古法看作得力', bad: '是忌神，古法看作难得其力', neutral: '喜忌不显' };

/**
 * 一句古法看法：先看星的喜忌（「喜神有意傍天财」），再看宫位坐喜坐忌；宫逢冲、星合日主另提一句。
 */
const verdictOf = (item, stars, palaces, neutralBand) => {
  if (neutralBand) return '旺衰中和，喜忌不显，先看星宫有无冲合；吉凶要等岁运引动再论。';
  const present = stars.filter((star) => star.places.length);
  const parts = [];
  if (!present.length) parts.push(`${stars.map((star) => star.label).join('、')}不现，古法看宫位与岁运引出`);
  else if (stars.length === 1) parts.push(`${stars[0].label}${STAR_VERDICT[stars[0].tone]}`);
  else parts.push(stars.map((star) => (star.places.length ? `${star.label}${TONE_TEXT[star.tone]}` : `${star.label}不现`)).join('，'));
  const starTones = new Set(present.map((star) => star.tone));
  const shown = palaces.filter((palace) => !palace.missing);
  const palaceGood = shown.length > 0 && shown.every((palace) => palace.tone === 'good');
  const palaceBad = shown.length > 0 && shown.every((palace) => palace.tone === 'bad');
  if (starTones.has('good') && !starTones.has('bad') && palaceBad) parts.push('宫位坐忌神，美中不足');
  else if (starTones.has('bad') && !starTones.has('good') && palaceGood) parts.push('宫位坐喜神，尚有可取');
  else if (!present.length && (palaceGood || palaceBad)) parts.push(`宫位${palaceGood ? '坐喜神' : '坐忌神'}`);
  const clash = shown.find((palace) => palace.clash);
  if (clash) parts.push(`${clash.label}逢冲，古法主变动`);
  if (item.key === 'spouse' && stars.some((star) => star.he.some((line) => line.includes('与日主')))) parts.push('星来合日主，古法以为有情');
  return `${parts.join('；')}。`;
};

/**
 * @param {object} chart buildBaziChart 的结果
 * @param {object} strength analyzeStrength 的结果（喜忌取扶抑）
 * @param {{ special?: object|null }} [options] 疑似特殊格局（从、化等），喜忌另有一套时在说明里提一句
 */
export const analyzeLiuqin = (chart, strength, { special = null } = {}) => {
  if (!chart?.pillars?.length || !strength) return null;
  const female = chart.input?.gender === 'female';
  const pillars = chart.pillars.filter((pillar) => pillar.gan && pillar.zhi);
  const byKey = Object.fromEntries(pillars.map((pillar) => [pillar.key, pillar]));
  const relations = findRelations(pillars.map((pillar) => ({ key: pillar.key, label: pillar.name, gan: pillar.gan, zhi: pillar.zhi })));
  const neutralBand = !strength.favorable?.length && !strength.unfavorable?.length;

  const items = relativesOf(female).map((item) => {
    const stars = item.stars.map((star) => starOf(pillars, strength, star));
    const palaces = item.palaces.map((palace) => palaceOf(byKey, strength, relations, palace));
    return { key: item.key, kind: item.kind, title: item.title, classic: item.classic, stars, palaces, verdict: verdictOf(item, stars, palaces, neutralBand) };
  });

  const basis = `${female ? '女命' : '男命'}；喜忌按「五行与旺衰」一节扶抑所取${special?.name ? `，若按${special.name.replace(/^疑似/, '')}论，喜忌另有一套` : ''}。`;
  const points = items.map((item) => `${item.title}：${item.stars.map((star) => star.text).join('；')}；${item.palaces.map((palace) => palace.text).join('；')}。${item.verdict}`);
  return { female, basis, items, points };
};
