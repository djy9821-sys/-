/**
 * 常用神煞
 *
 * 查法沿用通行排盘软件（与问真八字对照一致）：
 * - 天乙、太极、文昌、天厨：以日干、年干查地支
 * - 禄神、羊刃（只取阳干）、红艳：以日干查地支
 * - 桃花、驿马、华盖、将星、劫煞、亡神：以年支、日支所在三合局查地支
 * - 红鸾、天喜：以年支查
 * - 天德、月德、天德合、月德合、德秀：以月支查天干（天德部分为地支）
 */

const GAN_BRANCH_TABLES = {
  天乙贵人: { 甲: '丑未', 戊: '丑未', 庚: '丑未', 乙: '子申', 己: '子申', 丙: '亥酉', 丁: '亥酉', 壬: '卯巳', 癸: '卯巳', 辛: '午寅' },
  太极贵人: { 甲: '子午', 乙: '子午', 丙: '卯酉', 丁: '卯酉', 戊: '辰戌丑未', 己: '辰戌丑未', 庚: '寅亥', 辛: '寅亥', 壬: '巳申', 癸: '巳申' },
  文昌贵人: { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' },
  天厨贵人: { 甲: '巳', 乙: '午', 丙: '巳', 丁: '午', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' },
};

const DAY_GAN_TABLES = {
  禄神: { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' },
  羊刃: { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' },
  红艳: { 甲: '午', 乙: '申', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申' },
};

const SAN_HE_GROUP = { 申: '水', 子: '水', 辰: '水', 寅: '火', 午: '火', 戌: '火', 巳: '金', 酉: '金', 丑: '金', 亥: '木', 卯: '木', 未: '木' };

const SAN_HE_TABLES = {
  桃花: { 水: '酉', 火: '卯', 金: '午', 木: '子' },
  驿马: { 水: '寅', 火: '申', 金: '亥', 木: '巳' },
  华盖: { 水: '辰', 火: '戌', 金: '丑', 木: '未' },
  将星: { 水: '子', 火: '午', 金: '酉', 木: '卯' },
  劫煞: { 水: '巳', 火: '亥', 金: '寅', 木: '申' },
  亡神: { 水: '亥', 火: '巳', 金: '申', 木: '寅' },
};

const ZHI_ORDER = '子丑寅卯辰巳午未申酉戌亥';
// 红鸾：子年在卯，逆行；天喜在其对冲之位。
const hongLuanOf = (yearZhi) => ZHI_ORDER[(((3 - ZHI_ORDER.indexOf(yearZhi)) % 12) + 12) % 12];
const tianXiOf = (yearZhi) => ZHI_ORDER[(ZHI_ORDER.indexOf(hongLuanOf(yearZhi)) + 6) % 12];

// 月支 → 天德（寅月丁、卯月申……）
const TIAN_DE = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' };
const YUE_DE = { 水: '壬', 火: '丙', 金: '庚', 木: '甲' };
const GAN_HE = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
const ZHI_HE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const DE_XIU = {
  火: { de: '丙丁', xiu: '戊癸' },
  水: { de: '壬癸戊己', xiu: '丙辛甲己' },
  金: { de: '庚辛', xiu: '乙庚' },
  木: { de: '甲乙', xiu: '丁壬' },
};

export const SHENSHA_ORDER = Object.freeze([
  '天乙贵人', '太极贵人', '天德贵人', '天德合', '月德贵人', '月德合', '文昌贵人', '天厨贵人', '德秀贵人',
  '禄神', '将星', '华盖', '桃花', '红艳', '驿马', '红鸾', '天喜', '羊刃', '劫煞', '亡神',
]);

// 用于界面配色：吉神 / 中性 / 需留意。
export const SHENSHA_TONE = Object.freeze({
  天乙贵人: 'good', 太极贵人: 'good', 天德贵人: 'good', 天德合: 'good', 月德贵人: 'good', 月德合: 'good',
  文昌贵人: 'good', 天厨贵人: 'good', 德秀贵人: 'good', 禄神: 'good', 将星: 'good', 红鸾: 'good', 天喜: 'good',
  华盖: 'neutral', 桃花: 'neutral', 红艳: 'neutral', 驿马: 'neutral',
  羊刃: 'caution', 劫煞: 'caution', 亡神: 'caution',
});

/** 由本命四柱取出查神煞所需的年干支、月支、日干支。 */
export const buildShenshaContext = (pillars) => {
  const byKey = Object.fromEntries((pillars ?? []).map((pillar) => [pillar.key, pillar]));
  return {
    yearGan: byKey.year?.gan,
    yearZhi: byKey.year?.zhi,
    monthZhi: byKey.month?.zhi,
    dayGan: byKey.day?.gan,
    dayZhi: byKey.day?.zhi,
  };
};

/**
 * @param {{gan: string, zhi: string}} target 要查的柱（本命四柱或任意运限）
 * @param {ReturnType<typeof buildShenshaContext>} context
 * @returns {string[]} 按 SHENSHA_ORDER 排序的神煞名
 */
export const getShensha = (target, context) => {
  if (!target?.gan || !target?.zhi || !context?.dayGan) return [];
  const { gan, zhi } = target;
  const found = new Set();

  Object.entries(GAN_BRANCH_TABLES).forEach(([name, table]) => {
    if ([context.dayGan, context.yearGan].some((ref) => table[ref]?.includes(zhi))) found.add(name);
  });
  Object.entries(DAY_GAN_TABLES).forEach(([name, table]) => {
    if (table[context.dayGan] === zhi) found.add(name);
  });

  const groups = [context.yearZhi, context.dayZhi].map((ref) => SAN_HE_GROUP[ref]).filter(Boolean);
  Object.entries(SAN_HE_TABLES).forEach(([name, table]) => {
    if (groups.some((group) => table[group] === zhi)) found.add(name);
  });

  if (context.yearZhi) {
    if (hongLuanOf(context.yearZhi) === zhi) found.add('红鸾');
    if (tianXiOf(context.yearZhi) === zhi) found.add('天喜');
  }

  if (context.monthZhi) {
    const tianDe = TIAN_DE[context.monthZhi];
    const tianDeIsZhi = ZHI_ORDER.includes(tianDe);
    if (tianDeIsZhi ? zhi === tianDe : gan === tianDe) found.add('天德贵人');
    if (tianDeIsZhi ? zhi === ZHI_HE[tianDe] : gan === GAN_HE[tianDe]) found.add('天德合');

    const monthGroup = SAN_HE_GROUP[context.monthZhi];
    const yueDe = YUE_DE[monthGroup];
    if (gan === yueDe) found.add('月德贵人');
    if (gan === GAN_HE[yueDe]) found.add('月德合');
    const deXiu = DE_XIU[monthGroup];
    if (deXiu && (deXiu.de.includes(gan) || deXiu.xiu.includes(gan))) found.add('德秀贵人');
  }

  return SHENSHA_ORDER.filter((name) => found.has(name));
};
