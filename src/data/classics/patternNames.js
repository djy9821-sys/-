/**
 * 程序判得出的格局名与同义名（古籍匹配与数据校验共用，纯数据、无依赖）。
 *
 * 古籍条目 applies 里的 pattern 只有写成程序判得出的名字（或这里登记的同义名），
 * 客户在自己的盘上才可能看到这条；校验脚本据此拦下「永远匹配不上」的条件。
 * 程序新增格局时，这里同步加名字（test/classics-pattern-names.test.js 会对照程序核查）。
 */

const unique = (list) => [...new Set(list.filter((item) => item !== undefined && item !== null && item !== ''))];

const GAN_ORDER = '甲乙丙丁戊己庚辛壬癸';
const ZHENG_GE = Object.freeze(['正官格', '七杀格', '正财格', '偏财格', '正印格', '偏印格', '食神格', '伤官格']);
const ZHUAN_WANG = Object.freeze(['曲直格', '炎上格', '稼穑格', '从革格', '润下格']);
const HUA_QI = Object.freeze(['甲己化土格', '乙庚化金格', '丙辛化水格', '丁壬化木格', '戊癸化火格']);

/**
 * 八字（src/utils/baziPattern.js）判得出的格局名。
 * 正格按月令透藏取，辰戌丑未月取中余气时带「杂气」；从格、专旺、化气程序只给「疑似」提示，这里登记去掉「疑似」后的名字。
 */
export const BAZI_PROGRAM_PATTERNS = Object.freeze([
  ...ZHENG_GE,
  ...ZHENG_GE.map((name) => `杂气${name}`),
  '建禄格', '羊刃格', '月劫格', '比肩格',
  '从财格', '从杀格', '从儿格', '从势格', '从强格',
  ...ZHUAN_WANG,
  ...HUA_QI,
]);

/**
 * 格名的同义展开：程序给的名字 → 古籍里可能用的写法。
 *   正财格 → 财格；正印格 → 印格、印绶格；七杀格 → 偏官格、杀格、七煞格、煞格；羊刃格 ↔ 阳刃格、刃格；
 *   建禄格 / 月劫格 → 建禄月劫、禄劫格；杂气正财格 → 正财格……；疑似从杀格 → 从杀格、从煞格、从格；
 *   疑似曲直格（专旺）→ 曲直格、专旺格；疑似己甲化土格 → 甲己化土格、化土格、化气格。
 */
export const patternNamesOf = (name) => {
  if (!name) return [];
  const plain = String(name).replace(/（[^）]*）/g, '').trim();
  const certain = plain.replace(/^疑似/, '');
  const base = certain.replace(/^杂气/, '');
  const names = [String(name), plain, certain, base];
  if (/^[正偏]财格$/.test(base)) names.push('财格');
  if (/^[正偏]印格$/.test(base)) names.push('印格', '印绶格');
  if (base === '七杀格') names.push('偏官格', '杀格', '七煞格', '煞格');
  if (base === '羊刃格' || base === '阳刃格') names.push('羊刃格', '阳刃格', '刃格');
  if (base === '建禄格' || base === '月劫格') names.push('建禄月劫', '禄劫格');
  if (/^从[财杀儿势]格$/.test(base)) names.push('从格');
  if (base === '从杀格') names.push('从煞格', '从官杀格');
  if (ZHUAN_WANG.includes(base)) names.push('专旺格');
  const hua = base.match(/^([甲乙丙丁戊己庚辛壬癸])([甲乙丙丁戊己庚辛壬癸])(化[木火土金水]格)$/);
  if (hua) {
    const pair = [hua[1], hua[2]].sort((a, b) => GAN_ORDER.indexOf(a) - GAN_ORDER.indexOf(b)).join('');
    names.push(`${pair}${hua[3]}`, hua[3], '化气格');
  }
  return unique(names);
};

/** 八字 applies.pattern 允许的全部写法。 */
export const BAZI_PATTERN_VOCAB = Object.freeze(unique(BAZI_PROGRAM_PATTERNS.flatMap(patternNamesOf)));

/** 紫微（src/utils/ziweiPatterns.js）判得出的格局与星系名。 */
export const ZIWEI_PROGRAM_PATTERNS = Object.freeze([
  '三奇加会', '机月同梁格', '七杀朝斗格', '极向离明格', '极居卯酉格', '石中隐玉格', '阳梁昌禄格', '善荫朝纲格',
  '府相朝垣格', '明珠出海格', '日月同临格', '巨机居卯格', '日出扶桑格', '月朗天门格', '武曲守垣格', '紫府朝垣格',
  // 《紫微斗数全书》卷一定富局、定贵局、定贫贱局（照原书一句判的）。
  '日月夹财格', '财禄夹马格', '日月照璧格', '金灿光辉格',
  '日月夹命格', '月生沧海格', '辅弼拱主格', '君臣庆会格', '坐贵向贵格', '马头带剑格', '刑囚夹印格', '贪火相逢格', '权禄生逢格', '羊刃入庙格',
  '生不逢时格', '禄逢两杀格', '马落空亡格', '财与囚仇格', '一生孤贫格', '君子在野格', '两重华盖格',
  '杀破狼星系',
]);

/** 紫微格名的写法：带不带「格」字都算；「三奇加会」也写作「三奇嘉会」；杀破狼星系也写作杀破狼。 */
export const ziweiPatternNamesOf = (name) => {
  if (!name) return [];
  const text = String(name).trim();
  const bare = text.replace(/格$/, '').replace(/星系$/, '');
  const names = [text, bare, `${bare}格`];
  if (bare === '三奇加会' || bare === '三奇嘉会') names.push('三奇加会', '三奇嘉会', '三奇加会格', '三奇嘉会格');
  if (text === '杀破狼星系' || bare === '杀破狼') names.push('杀破狼星系', '杀破狼');
  return unique(names);
};

/** 紫微 applies.pattern 允许的全部写法。 */
export const ZIWEI_PATTERN_VOCAB = Object.freeze(unique(ZIWEI_PROGRAM_PATTERNS.flatMap(ziweiPatternNamesOf)));
