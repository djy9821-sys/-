/**
 * 《穷通宝鉴》调候用神：十日干 × 十二月令，每格按原书各月论的先后列出用神天干，首位为主用神。
 *
 * 底本是坊间通行的「调候用神表」（后人据原书归纳的十干十二月简表），再逐格对照原书正文（古籍库
 * src/data/classics/bazi/qiongtong-*.json，维基文库录文，另一份网络录文复核）：原文明说先后的照原文，
 * 「如壬多取戊制」「或支成金局方可用丁」这类有条件的用法不列入。与通行表不同的十二格，依据如下：
 *   甲辰 庚壬    三月甲木「先取庚金，次用壬水」「三月无用丁之法。惟有先庚后壬取用」
 *   甲未 丁庚    五六月甲木「六月三伏生寒，丁火退气。先丁后庚，无癸亦可」
 *   甲申 丁庚    七月甲木「丁火为尊，庚金次之，庚金不可少」（「壬水无碍」，不作用神）
 *   甲酉 丁丙庚  八月甲木「丁火为先，次用丙火，庚金再次」
 *   甲戌 丁癸庚  九月甲木「独爱丁火，壬癸滋扶」「耑用丁癸」「癸庚决不可少」
 *   乙申 己丙癸  七月乙木「七月喜己土为用，或不见丙癸。己土必不可少」
 *   丁寅 庚甲    正月丁火「甲木当权，乃为母旺，非庚不能噼甲，何以引丁，姑用庚金」
 *   戊戌 甲癸丙  九月戊土「先看甲木，次取癸水……见金先用癸水，后取丙火」
 *   己申 癸丙辛  三秋己土「癸先丙后」「先癸后丙，取辛辅癸」
 *   己酉 癸丙辛  同上
 *   己戌 甲癸丙  三秋己土「九月土盛，宜甲木疏之」，余同上
 *   庚寅 丙甲丁  正月庚金「先用丙暖庚性，又虑土厚埋金，须甲疏泄」「总之，正月庚金，丙甲为上，丁火次之」
 * 出处标到原书的那一节（如「七月甲木」「三秋己土」），各节全文由古籍库按日干、月令匹配给出。
 */
import { cite } from './classics.js';

const GAN_WUXING = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
export const MONTH_ZHI = Object.freeze(['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']);
const MONTH_NAME = { 寅: '正月', 卯: '二月', 辰: '三月', 巳: '四月', 午: '五月', 未: '六月', 申: '七月', 酉: '八月', 戌: '九月', 亥: '十月', 子: '十一月', 丑: '十二月' };

const table = (row) => Object.freeze(Object.fromEntries(MONTH_ZHI.map((zhi, index) => [zhi, row[index]])));

export const TIAOHOU_TABLE = Object.freeze({
  //        寅        卯          辰        巳        午        未        申        酉        戌        亥          子        丑
  甲: table(['丙癸', '庚丙丁戊己', '庚壬', '癸丁庚', '癸丁庚', '丁庚', '丁庚', '丁丙庚', '丁癸庚', '庚丁丙戊', '丁庚丙', '丁庚丙']),
  乙: table(['丙癸', '丙癸', '癸丙戊', '癸', '癸丙', '癸丙', '己丙癸', '癸丙丁', '癸辛', '丙戊', '丙', '丙']),
  丙: table(['壬庚', '壬己', '壬甲', '壬庚癸', '壬庚', '壬庚', '壬戊', '壬癸', '甲壬', '甲戊庚壬', '壬戊己', '壬甲']),
  丁: table(['庚甲', '庚甲', '甲庚', '甲庚', '壬庚癸', '甲壬庚', '甲庚丙戊', '甲庚丙戊', '甲庚戊', '甲庚', '甲庚', '甲庚']),
  戊: table(['丙甲癸', '丙甲癸', '甲丙癸', '甲丙癸', '壬甲丙', '癸丙甲', '丙癸甲', '丙癸', '甲癸丙', '甲丙', '丙甲', '丙甲']),
  己: table(['丙庚甲', '甲癸丙', '丙癸甲', '癸丙', '癸丙', '癸丙', '癸丙辛', '癸丙辛', '甲癸丙', '丙甲戊', '丙甲戊', '丙甲戊']),
  庚: table(['丙甲丁', '丁甲庚丙', '甲丁壬癸', '壬戊丙丁', '壬癸', '丁甲', '丁甲', '丁甲丙', '甲壬', '丁丙', '丁甲丙', '丙丁甲']),
  辛: table(['己壬庚', '壬甲', '壬甲', '壬甲癸', '壬己癸', '壬庚甲', '壬甲戊', '壬甲', '壬甲', '壬丙', '丙戊壬甲', '丙壬戊己']),
  壬: table(['庚丙戊', '戊辛庚', '甲庚', '壬辛庚癸', '癸庚辛', '辛甲', '戊丁', '甲庚', '甲丙', '戊丙庚', '戊丙', '丙丁甲']),
  癸: table(['辛丙', '庚辛', '丙辛甲', '辛', '庚辛壬癸', '庚辛壬癸', '丁', '辛丙', '辛甲壬癸', '庚辛戊丁', '丙辛', '丙丁']),
});

export const TIAOHOU_SOURCE = Object.freeze({ classic: 'qiongtong' });

/**
 * 原书把几个月合在一节里论的（如「五六月甲木」「三秋己土」），出处标那一节；其余就是「某月某干」。
 * 键为日干，值为 { 月支: 节名 }。
 */
const SECTION_OVERRIDES = Object.freeze({
  甲: { 午: '五六月甲木', 未: '五六月甲木' },
  乙: { 丑: '三冬乙木' },
  丁: { 酉: '三秋丁火', 戌: '三秋丁火', 亥: '三冬丁火', 子: '三冬丁火', 丑: '三冬丁火' },
  戊: { 寅: '正二月戊土', 卯: '正二月戊土', 子: '十一二月戊土', 丑: '十一二月戊土' },
  己: { 巳: '三夏己土', 午: '三夏己土', 未: '三夏己土', 申: '三秋己土', 酉: '三秋己土', 戌: '三秋己土', 亥: '三冬己土', 子: '三冬己土', 丑: '三冬己土' },
});

/** 某日干某月令的调候，原书在哪一节论（如「七月甲木」「三秋己土」）。 */
export const tiaoHouSectionOf = (dayGan, monthZhi) => {
  if (!GAN_WUXING[dayGan] || !MONTH_NAME[monthZhi]) return null;
  return SECTION_OVERRIDES[dayGan]?.[monthZhi] ?? `${MONTH_NAME[monthZhi]}${dayGan}${GAN_WUXING[dayGan]}`;
};

/** 寒暖的大方向：亥子丑为冬、巳午未为夏，其余不标。 */
export const seasonNoteOf = (monthZhi) => {
  if ('亥子丑'.includes(monthZhi)) return '冬月寒冷';
  if ('巳午未'.includes(monthZhi)) return '夏月炎热';
  return null;
};

/**
 * 查某日干在某月令的调候用神。
 * @returns {{ dayGan, monthZhi, stems, primary, secondary, element, elements, season, text, section, source } | null}
 */
export const tiaoHouOf = (dayGan, monthZhi) => {
  const row = TIAOHOU_TABLE[dayGan];
  const cell = row?.[monthZhi];
  if (!cell) return null;
  const stems = [...cell];
  const primary = stems[0];
  const secondary = stems.slice(1);
  const elements = [...new Set(stems.map((gan) => GAN_WUXING[gan]))];
  const season = seasonNoteOf(monthZhi);
  const text = `${dayGan}${GAN_WUXING[dayGan]}生${monthZhi}月（${MONTH_NAME[monthZhi]}），调候用${primary}${secondary.length ? `，次取${secondary.join('')}` : ''}`;
  const section = tiaoHouSectionOf(dayGan, monthZhi);
  return {
    dayGan,
    monthZhi,
    stems,
    primary,
    secondary,
    element: GAN_WUXING[primary],
    elements,
    season,
    text,
    section,
    source: cite(TIAOHOU_SOURCE.classic, section),
  };
};
