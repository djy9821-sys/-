/**
 * 不靠铜钱的起卦法：梅花易数的时间起卦与报数起卦，以及手动录卦的爻值选项。
 * 得到的都是六个爻值（初爻在前），交给 utils/liuyao.js 装卦。
 */
import { Solar, LunarUtil } from 'lunar-javascript';

/** 先天八卦数：乾一、兑二、离三、震四、巽五、坎六、艮七、坤八。 */
export const TRIGRAM_ORDER = Object.freeze(['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']);
const TRIGRAM_BITS = Object.freeze({
  乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0], 巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0],
});
const TRIGRAM_SYMBOLS = Object.freeze({ 乾: '天', 兑: '泽', 离: '火', 震: '雷', 巽: '风', 坎: '水', 艮: '山', 坤: '地' });

/** 手动录卦的选项：按三枚铜钱的背面数记。 */
export const MANUAL_LINE_OPTIONS = Object.freeze([
  Object.freeze({ value: 7, label: '少阳', coins: '一背两字', symbol: '▬▬▬', note: '阳爻，不动' }),
  Object.freeze({ value: 8, label: '少阴', coins: '两背一字', symbol: '▬ ▬', note: '阴爻，不动' }),
  Object.freeze({ value: 9, label: '老阳', coins: '三背', symbol: '▬▬▬ ○', note: '阳爻，动，变阴' }),
  Object.freeze({ value: 6, label: '老阴', coins: '三字', symbol: '▬ ▬ ×', note: '阴爻，动，变阳' }),
]);

/** 1..m 的余数（整除时取 m）。 */
const remainder = (value, modulus) => {
  const rest = value % modulus;
  return rest === 0 ? modulus : rest;
};

const trigramText = (index) => `${TRIGRAM_ORDER[index - 1]}（${TRIGRAM_SYMBOLS[TRIGRAM_ORDER[index - 1]]}）`;

/**
 * 由上卦数、下卦数（1..8，先天八卦数）与动爻位置（1..6）得到六个爻值。
 */
export const valuesFromTrigrams = (upperIndex, lowerIndex, movingPosition) => {
  const upper = TRIGRAM_BITS[TRIGRAM_ORDER[upperIndex - 1]];
  const lower = TRIGRAM_BITS[TRIGRAM_ORDER[lowerIndex - 1]];
  if (!upper || !lower || !(movingPosition >= 1 && movingPosition <= 6)) throw new Error('卦数或动爻位置无效');
  return [...lower, ...upper].map((bit, i) => {
    const moving = i + 1 === movingPosition;
    return bit ? (moving ? 9 : 7) : (moving ? 6 : 8);
  });
};

const isCastNumber = (value) => Number.isInteger(value) && value >= 1 && value <= 9999;

/**
 * 报数起卦：第一个数取上卦，第二个数取下卦（各除以 8 取余），两数相加除以 6 取余为动爻。
 */
export const castByNumbers = (first, second) => {
  if (!isCastNumber(first) || !isCastNumber(second)) throw new Error('请报两个 1 到 9999 之间的整数');
  const upperIndex = remainder(first, 8);
  const lowerIndex = remainder(second, 8);
  const movingPosition = remainder(first + second, 6);
  return {
    values: valuesFromTrigrams(upperIndex, lowerIndex, movingPosition),
    upperIndex,
    lowerIndex,
    movingPosition,
    note: `报数 ${first}、${second}：${first} 除 8 余 ${upperIndex} 得上卦${trigramText(upperIndex)}，${second} 除 8 余 ${lowerIndex} 得下卦${trigramText(lowerIndex)}，${first}+${second}=${first + second} 除 6 余 ${movingPosition} 动${['初', '二', '三', '四', '五', '上'][movingPosition - 1]}爻`,
  };
};

/**
 * 时间起卦（梅花易数）：农历年支数 + 月数 + 日数 为上卦，再加时辰数为下卦，总和除以 6 取余为动爻。
 * @param {Date} date 起卦时间（已按所在地换算的墙上时间）
 */
export const castByTime = (date) => {
  const lunar = Solar.fromYmdHms(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()).getLunar();
  const yearZhi = lunar.getYearZhi();
  const timeZhi = lunar.getTimeZhi();
  const yearNumber = LunarUtil.ZHI.indexOf(yearZhi);
  const monthNumber = Math.abs(lunar.getMonth());
  const dayNumber = lunar.getDay();
  const hourNumber = LunarUtil.ZHI.indexOf(timeZhi);
  const upperSum = yearNumber + monthNumber + dayNumber;
  const lowerSum = upperSum + hourNumber;
  const upperIndex = remainder(upperSum, 8);
  const lowerIndex = remainder(lowerSum, 8);
  const movingPosition = remainder(lowerSum, 6);
  return {
    values: valuesFromTrigrams(upperIndex, lowerIndex, movingPosition),
    upperIndex,
    lowerIndex,
    movingPosition,
    note: `农历${yearZhi}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${timeZhi}时：年${yearNumber}+月${monthNumber}+日${dayNumber}=${upperSum} 除 8 余 ${upperIndex} 得上卦${trigramText(upperIndex)}，再加时${hourNumber}=${lowerSum} 除 8 余 ${lowerIndex} 得下卦${trigramText(lowerIndex)}，${lowerSum} 除 6 余 ${movingPosition} 动${['初', '二', '三', '四', '五', '上'][movingPosition - 1]}爻`,
  };
};
