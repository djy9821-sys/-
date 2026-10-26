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

/** 某柱天干、地支对日主的喜忌。 */
export const describeFavor = (item, strength) => {
  if (!item?.gan || !strength) return null;
  const gan = elementToneOf(GAN_WUXING[item.gan], strength);
  const zhi = elementToneOf(ZHI_WUXING[item.zhi], strength);
  return { gan, zhi, overall: overallTone(gan, zhi) };
};

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
    favor: describeFavor(liuNian, strength),
  };
};

export const getDaYunMarks = (daYun, { strength = null } = {}) => ({ favor: describeFavor(daYun, strength) });

const TONE_TEXT = { good: '喜', bad: '忌', neutral: '平' };

/** 一句话说明：「丙午流年：冲太岁 · 天干丙火喜（印）· 地支午火忌（食伤）」 */
export const describeYearMarks = (liuNian, marks) => {
  if (!liuNian || !marks) return '';
  const parts = [...marks.labels];
  if (marks.favor) {
    parts.push(`天干${liuNian.gan}${marks.favor.gan.element}${TONE_TEXT[marks.favor.gan.tone]}（${marks.favor.gan.role}）`);
    parts.push(`地支${liuNian.zhi}${marks.favor.zhi.element}${TONE_TEXT[marks.favor.zhi.tone]}（${marks.favor.zhi.role}）`);
  }
  return parts.join(' · ');
};
