/**
 * 排盘库（iztro）与《紫微斗数全书》不一致处的改正：星曜庙旺三格、壬干四化。导入本模块即生效（排盘前导入）。
 *
 * 壬干四化：全书卷二「安禄权科忌四星变化诀」作「壬梁紫府武宿是」——天梁化禄、紫微化权、天府化科、武曲化忌；
 * 排盘库默认与今人排盘一样用左辅化科，这里改回全书的天府化科（界面与词典注明通行排法的差异）。
 *
 * 星曜庙旺按《紫微斗数全书》卷二的庙旺表（庙、旺、得地、利益、平和、不得地、落陷七等，维基文库录文）。
 *
 * 排盘库（iztro）自带的亮度表，十四正曜与昌曲火铃羊陀共 240 格，与全书只差三格，都在酉宫：
 * - 太阳酉宫，全书「平和」，排盘库作陷；
 * - 太阴酉宫，全书「旺」，排盘库作不得地（全书《十二宫诸星得地富贵论》亦云「酉戍亥上太阴停」）；
 * - 七杀酉宫，全书「旺」，排盘库作庙（与卯宫同为旺）。
 * 这里用排盘库的 config 接口把这三颗星的整行换成全书的，凡排盘都生效（排盘前导入本模块即可）。
 * 数组从寅宫起：寅卯辰巳午未申酉戌亥子丑。
 */
import { astro } from 'iztro';

export const QUANSHU_BRIGHTNESS_FIXES = Object.freeze({
  太阳: Object.freeze(['旺', '庙', '旺', '旺', '旺', '得', '得', '平', '不', '陷', '陷', '不']),
  太阴: Object.freeze(['旺', '陷', '陷', '陷', '不', '不', '利', '旺', '旺', '庙', '庙', '庙']),
  七杀: Object.freeze(['庙', '旺', '庙', '平', '旺', '庙', '庙', '旺', '庙', '平', '旺', '庙']),
});

/** 壬干四化按全书：梁紫府武（排盘库默认左辅化科）。 */
export const QUANSHU_MUTAGEN_FIXES = Object.freeze({ 壬: Object.freeze(['天梁', '紫微', '天府', '武曲']) });

if (typeof astro?.config === 'function') {
  astro.config({
    brightness: Object.fromEntries(Object.entries(QUANSHU_BRIGHTNESS_FIXES).map(([star, row]) => [star, [...row]])),
    mutagens: Object.fromEntries(Object.entries(QUANSHU_MUTAGEN_FIXES).map(([stem, stars]) => [stem, [...stars]])),
  });
}
