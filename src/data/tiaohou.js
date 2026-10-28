/**
 * 《穷通宝鉴》调候用神表：十日干 × 十二月令，每格按原书次序列出用神天干，首位为主用神。
 *
 * 依通行本（余春台辑、徐乐吾评注）的「调候用神表」录入，并与两份独立的网络录文逐格核对；
 * 次序偶有异文（如甲木酉月「庚丁丙」或「庚丙丁」），取多数本。原文各月的取舍说明
 * （「无丙用丁」「壬多用戊制」之类）尚未录入，待古籍库补全后按 applies 自动匹配。
 */
import { cite } from './classics.js';

const GAN_WUXING = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
export const MONTH_ZHI = Object.freeze(['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']);
const MONTH_NAME = { 寅: '正月', 卯: '二月', 辰: '三月', 巳: '四月', 午: '五月', 未: '六月', 申: '七月', 酉: '八月', 戌: '九月', 亥: '十月', 子: '十一月', 丑: '十二月' };

const table = (row) => Object.freeze(Object.fromEntries(MONTH_ZHI.map((zhi, index) => [zhi, row[index]])));

export const TIAOHOU_TABLE = Object.freeze({
  //        寅        卯          辰        巳        午        未        申        酉        戌          亥        子        丑
  甲: table(['丙癸', '庚丙丁戊己', '庚丁壬', '癸丁庚', '癸丁庚', '癸丁庚', '庚丁壬', '庚丁丙', '庚甲丁壬癸', '庚丁丙戊', '丁庚丙', '丁庚丙']),
  乙: table(['丙癸', '丙癸', '癸丙戊', '癸', '癸丙', '癸丙', '丙癸己', '癸丙丁', '癸辛', '丙戊', '丙', '丙']),
  丙: table(['壬庚', '壬己', '壬甲', '壬庚癸', '壬庚', '壬庚', '壬戊', '壬癸', '甲壬', '甲戊庚壬', '壬戊己', '壬甲']),
  丁: table(['甲庚', '庚甲', '甲庚', '甲庚', '壬庚癸', '甲壬庚', '甲庚丙戊', '甲庚丙戊', '甲庚戊', '甲庚', '甲庚', '甲庚']),
  戊: table(['丙甲癸', '丙甲癸', '甲丙癸', '甲丙癸', '壬甲丙', '癸丙甲', '丙癸甲', '丙癸', '甲丙癸', '甲丙', '丙甲', '丙甲']),
  己: table(['丙庚甲', '甲癸丙', '丙癸甲', '癸丙', '癸丙', '癸丙', '丙癸', '丙癸', '甲丙癸', '丙甲戊', '丙甲戊', '丙甲戊']),
  庚: table(['戊甲壬丙丁', '丁甲庚丙', '甲丁壬癸', '壬戊丙丁', '壬癸', '丁甲', '丁甲', '丁甲丙', '甲壬', '丁丙', '丁甲丙', '丙丁甲']),
  辛: table(['己壬庚', '壬甲', '壬甲', '壬甲癸', '壬己癸', '壬庚甲', '壬甲戊', '壬甲', '壬甲', '壬丙', '丙戊壬甲', '丙壬戊己']),
  壬: table(['庚丙戊', '戊辛庚', '甲庚', '壬辛庚癸', '癸庚辛', '辛甲', '戊丁', '甲庚', '甲丙', '戊丙庚', '戊丙', '丙丁甲']),
  癸: table(['辛丙', '庚辛', '丙辛甲', '辛', '庚辛壬癸', '庚辛壬癸', '丁', '辛丙', '辛甲壬癸', '庚辛戊丁', '丙辛', '丙丁']),
});

export const TIAOHOU_SOURCE = Object.freeze({ classic: 'qiongtong', section: '调候用神表' });

/** 寒暖的大方向：亥子丑为冬、巳午未为夏，其余不标。 */
export const seasonNoteOf = (monthZhi) => {
  if ('亥子丑'.includes(monthZhi)) return '冬月寒冷';
  if ('巳午未'.includes(monthZhi)) return '夏月炎热';
  return null;
};

/**
 * 查某日干在某月令的调候用神。
 * @returns {{ dayGan, monthZhi, stems, primary, secondary, element, elements, season, text, source } | null}
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
    source: cite(TIAOHOU_SOURCE.classic, TIAOHOU_SOURCE.section),
  };
};
