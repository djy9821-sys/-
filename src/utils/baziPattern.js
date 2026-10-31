/**
 * 八字格局与命局特点（程序初判，仅供参考）
 *
 * - 取格：按《子平真诠》以月令取格。月支为日干之禄为建禄格，为阳干之刃为羊刃格，
 *   阴干月令本气为劫财为月劫格；其余看月支藏干何者透出天干，本气优先，
 *   再看中气、余气，都不透则以本气为格。细则（论用神变化、论杂气如何取用及书中命例）：
 *   · 子午卯酉旺支只论本气，余气透出不取（「除子午卯酉外，余皆有藏」）；
 *   · 寅申巳亥中余气透出为用神变化，但化神又被他干所克则不失本格（「乙生申月透壬化印而又透戊……格成正官」）；
 *     「土随火」，申中不论戊（马参政命壬生申月透戊，书仍作印格）；
 *   · 辰戌丑未为水火金木之库，库中之气以同类天干透出论（「甲透未库」「辰中暗煞，壬以透之」），
 *     兼透时取透而又会支者（「透干会支，取其清者用之」）；
 *   · 月支与它支会成三合全局而本气不透干的，月令之神随局而化（「丁生亥月，本为正官，支全卯未，则化为印」
 *     「丙生寅月……甲不透干而会午会戌，则化为劫」），化神被透干所克则不化（「又或透壬，则仍为印，而格不破」）。
 *   用 test/bazi-ziping-examples.test.js 的《子平真诠》八格各论命例逐一核对。
 * - 特殊格局（从格、专旺、化气）只在五行比例极端时给出"疑似"提示，需要人工确认。
 * - 命局特点：按天干透出的十神与五行力量识别常见组合（伤官见官、官杀混杂、
 *   食神制杀、财多身弱……），每条附依据与一句简短说明，措辞避免绝对化。
 * - 五行缺失：区分"八个字里没有"与"藏干里也没有"，并提醒缺的不一定是喜用。
 * - 成败：取格之后按《子平真诠·论用神成败救应》判成、败、成中有败、败中有成（baziPatternSuccess.js）。
 */
import { judgePatternSuccess } from './baziPatternSuccess.js';

const GAN_WUXING = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI_WUXING = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const WUXING = ['木', '火', '土', '金', '水'];
const YANG_GAN = new Set(['甲', '丙', '戊', '庚', '壬']);

const LU = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
const REN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };
const GAN_HE = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
const GAN_HE_ELEMENT = { 甲己: '土', 乙庚: '金', 丙辛: '水', 丁壬: '木', 戊癸: '火' };
const ZA_QI_MONTHS = new Set(['辰', '戌', '丑', '未']);
const SHENG_MONTHS = new Set(['寅', '申', '巳', '亥']);
const WANG_MONTHS = new Set(['子', '午', '卯', '酉']);
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
/** 三合局，按生、旺、墓排。 */
const SAN_HE = [
  { zhis: ['亥', '卯', '未'], wuxing: '木' }, { zhis: ['寅', '午', '戌'], wuxing: '火' },
  { zhis: ['巳', '酉', '丑'], wuxing: '金' }, { zhis: ['申', '子', '辰'], wuxing: '水' },
];
/** 三会方。 */
const SAN_HUI = [
  { zhis: ['寅', '卯', '辰'], wuxing: '木' }, { zhis: ['巳', '午', '未'], wuxing: '火' },
  { zhis: ['申', '酉', '戌'], wuxing: '金' }, { zhis: ['亥', '子', '丑'], wuxing: '水' },
];
/** 四支里三合、三会齐全的，局中各支按局的五行论：{ 地支: 五行 }。 */
const juElementsOf = (zhis) => {
  const result = {};
  [...SAN_HE, ...SAN_HUI].forEach((ju) => {
    if (ju.zhis.every((zhi) => zhis.includes(zhi))) ju.zhis.forEach((zhi) => { result[zhi] = ju.wuxing; });
  });
  return result;
};
/** 月支与其他地支会成的局：三合齐全，或与旺支（子午卯酉）半合；返回局的五行，没有为 null。 */
const huiJuOf = (monthZhi, otherZhis) => {
  const ju = SAN_HE.find((item) => item.zhis.includes(monthZhi));
  if (!ju) return null;
  const present = new Set([monthZhi, ...otherZhis]);
  const count = ju.zhis.filter((zhi) => present.has(zhi)).length;
  return count === 3 || (count === 2 && present.has(ju.zhis[1])) ? ju.wuxing : null;
};

export const ROLE_OF = Object.freeze({
  比肩: '比劫', 劫财: '比劫', 正印: '印', 偏印: '印', 食神: '食伤', 伤官: '食伤', 正财: '财', 偏财: '财', 正官: '官杀', 七杀: '官杀',
});
const ROLES = ['比劫', '印', '食伤', '财', '官杀'];

const PATTERN_NAME = {
  正官: '正官格', 七杀: '七杀格', 正财: '正财格', 偏财: '偏财格', 正印: '正印格', 偏印: '偏印格', 食神: '食神格', 伤官: '伤官格',
};
const ZHUAN_WANG = { 木: '曲直格', 火: '炎上格', 土: '稼穑格', 金: '从革格', 水: '润下格' };
/** 三合局之外同气的余气支：木局的辰（木余气）、火局的未、金局的戌、水局的丑；局齐全时这一支随局论。 */
const YU_QI_ZHI = { 木: '辰', 火: '未', 金: '戌', 水: '丑' };
/** 两气成象只认任注验过的三种生局：木火（甲午 丁卯 甲午 丁卯）、火土（丙午 戊戌 丙午 戊戌）、土金（戊戌 辛酉 戊戌 辛酉），按日主一行登记。 */
const LIANG_QI_PAIRS = new Set(['木', '火', '土']);
/** 各行的墓库支：木库未、火库戌、金库丑、水库辰（土寄四季，不另算）。专旺看日主本气的库，论从看三会方那一行的库。 */
const KU_ZHI = { 木: '未', 火: '戌', 金: '丑', 水: '辰' };
/** 支冲而受克的一方：申冲寅、酉冲卯、亥冲巳、子冲午（金克木、水克火）；辰戌、丑未同是土，不论受克。 */
const CHONG_BY = { 寅: '申', 卯: '酉', 巳: '亥', 午: '子' };
/** 地支六合所化：相邻两支六合而化神正是日主本气时，合住的那一支随化神论（任注「子丑化土，斯真格象，已成稼穑」）。 */
const LIU_HE_HUA = Object.freeze(Object.fromEntries([['子', '丑', '土'], ['寅', '亥', '木'], ['卯', '戌', '火'], ['辰', '酉', '金'], ['巳', '申', '水'], ['午', '未', '土']]
  .flatMap(([a, b, element]) => [[a + b, element], [b + a, element]])));
/** 生我者：木 ← 水。 */
const GENERATED_BY = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
/** 我生者：水 → 木。 */
const GENERATES = Object.fromEntries(Object.entries(GENERATED_BY).map(([child, mother]) => [mother, child]));
/** 克我者：土 ← 木。 */
const KE_BY = Object.fromEntries(Object.entries(KE).map(([from, to]) => [to, from]));

/**
 * 特殊格局「按此格论」的喜忌（十神类别，按先后排），按《滴天髓阐微·从象》《顺局》任铁樵注的命造：
 * 从格顺从旺神，扶身的印比反成破格之物。第一用神任注一律取与从神相生的那一行：从财取食伤生财，
 * 从杀取财生杀，从儿取财（「儿又生儿」）；从势三者并旺，以财星居中通关为先，官杀次之、食伤又次之。
 * 专旺、从强另见 wangGodsOf，化气格另见 huaGodsOf。
 */
const CONG_GODS = {
  从财格: { favorable: ['食伤', '财', '官杀'], unfavorable: ['比劫', '印'], basis: '从财以食伤生财为用（任注从财诸造「火乃木之秀气，土乃火之秀气」），财星次之，官杀泄财亦可；比劫夺财、印星生身，都会破格' },
  从杀格: { favorable: ['财', '官杀'], unfavorable: ['食伤', '印', '比劫'], basis: '从杀以财星生杀为用（任注「用土以从之」），官杀次之；食伤制杀、印比扶身，都会破格' },
  从儿格: { favorable: ['财', '食伤'], unfavorable: ['印', '官杀'], basis: '从儿以财为用（「儿又生儿」），食伤次之；印星夺食、官杀逆势为忌' },
  从势格: { favorable: ['财', '官杀', '食伤'], unfavorable: ['印', '比劫'], basis: '从势顺食伤财官之势，财星居中通关最宜，官杀次之，食伤又次之；印比扶身为忌' },
};
/** 印占不到两成算「印轻」。 */
const YIN_LIGHT = 20;
/**
 * 专旺、从强顺其旺势，以比劫、印为用，财官逆势为忌。食伤看印的轻重（任注从旺「印轻行伤食亦佳」、
 * 从强「食伤运有印绶冲克」）：印轻则食伤泄秀亦可（「丙寅 甲午 丙午 癸巳」从其强势，「运逢木火土，财喜频增」），
 * 印不轻则食伤与印相战（「戊戌 丙辰 己巳 己巳」土旺极，「一交庚申……家业渐消」）。
 */
const wangGodsOf = (kind, roleShare, { xieXiu = false } = {}) => {
  // 专旺而食伤透干有根：旺极之势顺着食伤吐秀，以食伤为用、比劫生之，印克食伤、官杀逆势为忌
  // （任注「木太旺者……喜其丙火吐秀」，壬运克火则凶）。
  if (kind === 'zhuanwang' && xieXiu) {
    return { favorable: ['食伤', '比劫'], unfavorable: ['印', '官杀'], basis: '专旺而食伤透干有根，顺其旺势以食伤吐秀为用，比劫生之；印克食伤、官杀逆势为忌' };
  }
  const yinFirst = kind === 'congqiang' && roleShare['印'] > roleShare['比劫'];
  const yinLight = roleShare['印'] < YIN_LIGHT;
  const favorable = yinFirst ? ['印', '比劫'] : ['比劫', '印'];
  const unfavorable = kind === 'zhuanwang' ? ['官杀', '财'] : ['财', '官杀'];
  const head = kind === 'zhuanwang'
    ? '专旺顺其旺势，喜比劫、印；官杀逆势最忌，财星无食伤引化则群比争财'
    : `从强以印比为用${yinFirst ? '，印重以印为先' : ''}；财星破印、官杀逆势为忌`;
  return yinLight
    ? { favorable: [...favorable, '食伤'], unfavorable, basis: `${head}；印轻，食伤泄秀亦可` }
    : { favorable, unfavorable: [...unfavorable, '食伤'], basis: `${head}；印不轻，食伤与印相战，不宜` };
};

/** 化神之气占到四成五算「化气有余」。 */
const HUA_SURPLUS = 45;
/**
 * 化气格以化神为主，按《滴天髓阐微·化象》任注的命造：化气有余宜泄，喜化神所生之物吐秀
 * （「化气有余，余则宜泄，斯化神吐秀」「暗会金局，泄化神而吐秀」）；化神不足宜生，喜生化神之物
 * （「秋金当令，化神泄气不足，至午运助化神」「南方火地，生助化神」）。克化神为忌；日主原来的五行帮起日主、
 * 化神还原，也忌（「中运水旺之地，未能显秩」「癸劫争财」「金水破局」）。这一行若正好是泄神或生神，两说相抵，不列。
 */
const huaGodsOf = (element, dayWuxing, share) => {
  const surplus = share >= HUA_SURPLUS;
  const helper = surplus ? GENERATES[element] : GENERATED_BY[element];
  const own = [element, KE_BY[element], helper].includes(dayWuxing) ? null : dayWuxing;
  const favorable = [{ element, label: '化神' }];
  if (helper !== dayWuxing) favorable.push({ element: helper, label: surplus ? '泄化神' : '生化神' });
  const unfavorable = [{ element: KE_BY[element], label: '克化神' }];
  if (own) unfavorable.push({ element: own, label: '日主本气' });
  const helperText = surplus ? `化气有余（${share}%）宜泄，${helper}吐秀` : `化神不足（${share}%）宜生，${helper}生助`;
  return {
    favorable,
    unfavorable,
    basis: `化气以化神${element}为主；${helperText}${helper === dayWuxing ? '，但它也是日主本来的五行，帮身则化神还原，喜忌两说' : '为喜'}；`
      + `${KE_BY[element]}克化神${own ? `、${own}帮起日主化神还原` : ''}，为忌`,
  };
};

/** 把十神类别换成五行：{ element, label }，label 是十神类别。 */
const godsByRole = (roles, list) => {
  const elementOf = Object.fromEntries(Object.entries(roles).map(([element, role]) => [role, element]));
  return list.map((role) => ({ element: elementOf[role], label: role })).filter((item) => item.element);
};
const godsText = (items) => items.map((item) => `${item.element}（${item.label}）`).join('、');
/** 给特殊格局挂上「按此格论」的喜忌与一句话依据。 */
const withGods = (special, favorable, unfavorable, basis) => ({
  ...special,
  favorable,
  unfavorable,
  godsBasis: basis,
  godsText: `喜${godsText(favorable)}；忌${godsText(unfavorable)}`,
});
const withRoleGods = (special, roles, gods) => withGods(special, godsByRole(roles, gods.favorable), godsByRole(roles, gods.unfavorable), gods.basis);

const DAY_ZHI_NOTES = {
  比肩: '配偶宫见比肩：伴侣性格与自己相近，相处像朋友，也容易各执己见。',
  劫财: '配偶宫见劫财：伴侣有主见、重义气，钱财上宜分清界限。',
  食神: '配偶宫见食神：伴侣随和爱生活，家庭气氛多轻松。',
  伤官: '配偶宫见伤官：伴侣聪明有个性，相处需要多些包容。',
  正财: '配偶宫见正财：伴侣务实稳重，重视家庭与积蓄。',
  偏财: '配偶宫见偏财：伴侣大方活络，人缘与财路都广。',
  正官: '配偶宫见正官：伴侣端正有分寸，看重名分与规矩。',
  七杀: '配偶宫见七杀：伴侣有魄力、脾气直，彼此需要留出空间。',
  正印: '配偶宫见正印：伴侣温厚照顾人，像长辈一样可靠。',
  偏印: '配偶宫见偏印：伴侣想法独特、有点距离感，适合各有天地。',
};

const round = (value) => Math.round(value * 10) / 10;

const knownPillars = (chart) => (chart?.pillars ?? []).filter((pillar) => pillar?.gan && pillar?.zhi);

/** 五行与十神的汇总：透干十神、藏干十神、各十神出现次数、五类力量占比。 */
const summarize = (chart, strength) => {
  const pillars = knownPillars(chart);
  const byKey = Object.fromEntries(pillars.map((pillar) => [pillar.key, pillar]));
  const stems = pillars
    .filter((pillar) => pillar.key !== 'day')
    .map((pillar) => ({ key: pillar.key, name: pillar.name, gan: pillar.gan, shiShen: pillar.ganShiShen }));
  const hidden = pillars.flatMap((pillar) => pillar.hiddenGanDetails.map((detail, index) => ({
    key: pillar.key, name: pillar.name, zhi: pillar.zhi, gan: detail.gan, shiShen: detail.shiShen, rank: index,
  })));
  const counts = Object.fromEntries(Object.keys(PATTERN_NAME).concat(['比肩', '劫财']).map((name) => [name, 0]));
  [...stems, ...hidden].forEach(({ shiShen }) => { if (shiShen in counts) counts[shiShen] += 1; });
  const roleCount = Object.fromEntries(ROLES.map((role) => [role, 0]));
  Object.entries(counts).forEach(([name, count]) => { roleCount[ROLE_OF[name]] += count; });
  const roleShare = Object.fromEntries(ROLES.map((role) => [role, 0]));
  WUXING.forEach((element) => {
    const role = strength?.roles?.[element];
    if (role) roleShare[role] += strength.percents?.[element] ?? 0;
  });
  const transparent = (shiShen) => stems.filter((stem) => stem.shiShen === shiShen);
  const transparentRole = (role) => stems.filter((stem) => ROLE_OF[stem.shiShen] === role);
  return { pillars, byKey, stems, hidden, counts, roleCount, roleShare, transparent, transparentRole };
};

const describeStems = (stems) => stems.map((stem) => `${stem.name}${stem.gan}`).join('、');

/** 三合局的旺支（中神）：局齐全时月令之神随它的本气论。 */
const SAN_HE_WANG = { 木: '卯', 火: '午', 金: '酉', 水: '子' };

/**
 * 月支与它支会成三合全局而化格（论用神变化）；不化时返回 null。
 * 局的十神按旺支本气算（亥卯未看卯中乙，寅午戌看午中丁……）；化为日主同气的，旺支是阳干之刃则为羊刃格，否则月劫格。
 */
const sanHeHuaOf = (chart, month, stems, main) => {
  const dayGan = chart.dayMaster.gan;
  const pillars = chart.pillars ?? [];
  const otherZhis = pillars.filter((pillar) => pillar.key !== 'month').map((pillar) => pillar.zhi);
  const ju = SAN_HE.find((item) => item.zhis.includes(month.zhi) && item.zhis.every((zhi) => zhi === month.zhi || otherZhis.includes(zhi)));
  // 子午卯酉本就是局的旺支，局的五行与月令本气一样，无所谓化
  if (!ju || !main || WANG_MONTHS.has(month.zhi)) return null;
  if (stems.some((stem) => stem.gan === main.gan)) return null;
  const restrainer = stems.find((stem) => KE[GAN_WUXING[stem.gan]] === ju.wuxing);
  if (restrainer) return null;
  const wangZhi = SAN_HE_WANG[ju.wuxing];
  const wangPillar = pillars.find((pillar) => pillar.zhi === wangZhi);
  const wangGan = wangPillar?.hiddenGanDetails?.[0];
  if (!wangGan) return null;
  const role = ROLE_OF[wangGan.shiShen];
  const quote = { 比劫: '甲不透干而会午会戌，则化为劫', 印: '本为正官，支全卯未，则化为印', 食伤: '会午会戌，则月劫化为月生', 官杀: '藏庚透壬，会子会辰，则化为煞', 财: '凡此之类，皆用神之变化也' }[role];
  const others = ju.zhis.filter((zhi) => zhi !== month.zhi).join('');
  const juName = `${ju.zhis.join('')}${ju.wuxing}局`;
  const basis = `月支${month.zhi}本气${main.gan}（${main.shiShen}）不透干，而与${others}会成${juName}，月令之神随局化为${wangGan.shiShen}（论用神变化「${quote}」）。`;
  const common = { monthZhi: month.zhi, basis, hua: { from: main.shiShen, ju: juName, to: wangGan.shiShen } };
  if (ju.wuxing === chart.dayMaster.wuxing) {
    if (REN[dayGan] === wangZhi) return { name: '羊刃格', kind: 'ren', tenGod: '劫财', ...common };
    return { name: '月劫格', kind: 'jie', tenGod: '劫财', ...common };
  }
  if (!(wangGan.shiShen in PATTERN_NAME)) return null;
  return { name: PATTERN_NAME[wangGan.shiShen], kind: 'regular', tenGod: wangGan.shiShen, source: '会局', transparent: stems.some((stem) => GAN_WUXING[stem.gan] === ju.wuxing), ...common };
};

/** 月令取格。 */
export const determinePattern = (chart, summary = null) => {
  const info = summary ?? summarize(chart, null);
  const { byKey, stems } = info;
  const month = byKey.month;
  const dayGan = chart.dayMaster.gan;
  if (!month) return null;
  const hiddenNames = ['本气', '中气', '余气'];
  const main = month.hiddenGanDetails[0];

  // 《子平真诠·论用神变化》：月支与它支会成三合全局，月令之神随局而化——「丁生亥月，本为正官，支全卯未，则化为印」、
  // 「乙生寅月……会午会戌，则月劫化为月生」、「丙生寅月，本为印绶，甲不透干而会午会戌，则化为劫」。
  // 本气透干的不化（「甲不透干」才化）；化神被透干所克的也不化——「又或透壬，则仍为印，而格不破」「逢壬化煞而又透戊……仍为财格」。
  const hua = sanHeHuaOf(chart, month, stems, main);
  if (hua) return hua;

  if (LU[dayGan] === month.zhi) {
    return { name: '建禄格', kind: 'lu', tenGod: '比肩', monthZhi: month.zhi, basis: `月支${month.zhi}为日主${dayGan}的禄位，日主当令得气。` };
  }
  if (REN[dayGan] === month.zhi) {
    return { name: '羊刃格', kind: 'ren', tenGod: '劫财', monthZhi: month.zhi, basis: `月支${month.zhi}为阳干${dayGan}的羊刃，日主当令且旺。` };
  }
  if (main && main.shiShen === '劫财' && !YANG_GAN.has(dayGan)) {
    return { name: '月劫格', kind: 'jie', tenGod: '劫财', monthZhi: month.zhi, basis: `月支${month.zhi}本气${main.gan}为劫财，阴干不取刃，作月劫看。` };
  }

  // 《子平真诠·论用神变化》：「除子午卯酉外，余皆有藏」——旺支只论本气；寅申巳亥、辰戌丑未才有透干变化。
  // 「土随火」：戊长生在寅、临官在巳，申中不论戊（马参政命壬生申月透戊，书仍作印格）。
  const isWang = WANG_MONTHS.has(month.zhi);
  const isZaQi = ZA_QI_MONTHS.has(month.zhi);
  const all = month.hiddenGanDetails.map((detail, index) => ({ ...detail, rank: index, rankName: hiddenNames[index] ?? '余气' }));
  const excluded = (detail) => (isWang && detail.rank > 0) || (month.zhi === '申' && detail.gan === '戊');
  const ignoredThrough = all.filter((detail) => excluded(detail) && stems.some((stem) => stem.gan === detail.gan));
  const ignoreNote = ignoredThrough.length
    ? `（${isWang ? `${month.zhi}为旺支只论本气` : '申中不论戊'}，${ignoredThrough.map((detail) => detail.gan).join('、')}透出不作月令之神）`
    : '';
  const otherZhis = Object.values(byKey).filter((pillar) => pillar.key !== 'month').map((pillar) => pillar.zhi);
  const huiJu = isZaQi ? huiJuOf(month.zhi, otherZhis) : null;
  // 透：本干透出。辰戌丑未是水火金木之库，库中之气（墓气）以同类天干透出论——
  // 汪学士命「甲透未库」、脱脱丞相命「辰中暗煞，壬以透之」；格以透出之干的十神论。
  const candidates = all.filter((detail) => !excluded(detail)).map((detail) => {
    const exact = stems.filter((stem) => stem.gan === detail.gan);
    const kin = isZaQi && detail.rank === 2 && !exact.length
      ? stems.filter((stem) => GAN_WUXING[stem.gan] === GAN_WUXING[detail.gan] && stem.shiShen in PATTERN_NAME)
      : [];
    const viaKin = !exact.length && kin.length > 0;
    return { ...detail, through: viaKin ? kin : exact, viaKin, shiShen: viaKin ? kin[0].shiShen : detail.shiShen };
  }).filter((detail) => detail.shiShen in PATTERN_NAME);
  if (!candidates.length) {
    // 月令本气为比劫又不是禄刃（如戊土生辰戌月）：按杂气看透出的中余气。
    return { name: '比肩格', kind: 'regular', tenGod: main?.shiShen ?? '比肩', monthZhi: month.zhi, basis: `月支${month.zhi}本气为比劫，中余气无可取者，暂以比肩格看，宜人工复核。` };
  }
  const throughAll = candidates.filter((detail) => detail.through.length);
  const huiWith = (detail) => Boolean(huiJu) && GAN_WUXING[detail.gan] === huiJu;
  // 兼透时：本气优先；再取透而又会支者（论杂气如何取用：「透干会支，取其清者用之」）；本干透出先于库中同类透出。
  let through = throughAll.find((detail) => detail.rank === 0 && !detail.viaKin)
    ?? throughAll.find((detail) => !detail.viaKin && huiWith(detail))
    ?? throughAll.find((detail) => !detail.viaKin)
    ?? throughAll.find((detail) => huiWith(detail))
    ?? throughAll[0]
    ?? null;
  const base = candidates.find((detail) => detail.rank === 0) ?? null;
  let kept = null;
  // 生月中余气透出为变化；化神又被他干所克，则不失本格（论用神变化·其五：「乙生申月透壬化印而又透戊……格成正官」）。
  if (through && through.rank > 0 && SHENG_MONTHS.has(month.zhi) && base) {
    const element = GAN_WUXING[through.gan];
    const restrainer = stems.find((stem) => KE[GAN_WUXING[stem.gan]] === element && !through.through.includes(stem));
    if (restrainer) {
      kept = { changed: through, restrainer };
      through = null;
    }
  }
  const chosen = through ?? base ?? candidates[0];
  const zaQi = isZaQi && chosen.rank > 0;
  const mainNote = main && !(main.shiShen in PATTERN_NAME) ? `本气${main.gan}为${main.shiShen}不取，` : '';
  const huiNote = huiWith(chosen) && chosen.rank > 0 ? '（透而又会支）' : '';
  const basis = kept
    ? `月支${month.zhi}${kept.changed.rankName}${kept.changed.gan}（${kept.changed.shiShen}）透于${describeStems(kept.changed.through)}本可变化，但${kept.restrainer.name}${kept.restrainer.gan}克之，化神退位，仍以本气${chosen.gan}（${chosen.shiShen}）为格。`
    : through && chosen.viaKin
      ? `月支${month.zhi}${mainNote}为${GAN_WUXING[chosen.gan]}库，库中${chosen.gan}以同类透出论：${describeStems(chosen.through)}（${chosen.shiShen}）透出，以透出者为格${huiNote}。`
      : through
        ? `月支${month.zhi}${mainNote}${chosen.rankName}${chosen.gan}（${chosen.shiShen}）透于${describeStems(chosen.through)}，以透出者为格${huiNote}${ignoreNote}。`
        : `月支${month.zhi}${mainNote}藏干均未透出，以${chosen.rankName}${chosen.gan}（${chosen.shiShen}）为格${ignoreNote}。`;
  return {
    name: `${zaQi ? '杂气' : ''}${PATTERN_NAME[chosen.shiShen]}`,
    kind: 'regular',
    tenGod: chosen.shiShen,
    monthZhi: month.zhi,
    source: chosen.rankName,
    transparent: Boolean(through),
    basis,
  };
};

/**
 * 从格、专旺、化气的疑似提示；不极端时返回 null。
 *
 * 条件按《滴天髓阐微》任铁樵注的命造校准（衰旺篇「旺极」「衰极」，六亲论从象、化象、假从、顺局诸篇；test/bazi-cases.test.js）：
 * - 化气先看：日干与月干或时干相合，日主地支没有本气之根，而化神得令（月令正是化神，日主又无根），
 *   或化神之气占到二成五（「土旺乘权，克去壬水，又无比劫，合神更真」「丙火透而通根，化火斯真」）。
 *   日主有本气之根（不在日支），但化神当令、气占三成五以上的，作假化（任注假化诸造「虽是假化，却有情而不悖」
 *   「化神当令……日干不得不从合而化」）；日主坐下本气之根、化神与日主同一五行的（如庚日合乙化金）不作化论；
 *   日主坐下本气是印的，印生身，也不作真化（「日元柔弱，以印为夫，清而得用」）。
 * - 从格（「衰极者似X」）：地支无比劫之根，印气至多一点中气、余气（不见本气，得令加得地不过 0.25 分）；天干帮身的只有无根比劫、
 *   至多两个（「天干三透甲乙，而地支不载……格成从杀」），或只有一个无根之印而财星占到三成、足以坏印。
 *   天干比劫三透、印比各一的，任注仍取印比，不作从论。旧的比例条件（同党不到两成、无根、无印透）也算。
 *   另一条看地支：四支本气（三合、三会齐全的按局论，「支全火局」「支全寅卯辰，东方一气」「未土又会木局」）
 *   都是食伤财官，日主在局外没有得力之根（本气、禄、寅申巳亥中的长生），微根（辰戌丑未所藏的余气、墓库，
 *   寅申巳亥的余气）至多一处且不在日支（「天干木火，全赖未中一点微根」，日主坐库仍能盘根），四支一气的不拘微根；
 *   天干帮身至多两个（有印则只能是这一个，还要财星透出克印或财占三成），也作从论（「四柱皆财，其势必从」）；
 *   四支一气都是官杀而天干比劫全无根的，三透也从（子平真诠李侍郎「乙酉、乙酉、乙酉、甲申」从杀；财、食伤一气的三透不从）。
 *   从哪一神：食伤、财、官杀里占得最多的一方到三成五为从儿、从财、从杀，否则为从势。
 *   官杀独旺而月令本气是食伤的不作从杀：当令的食伤制杀（任注「两杀并透，支会杀局，喜其辰土当令制杀，辰中木有余气而生身」，
 *   丙申 壬辰 丙子 壬辰 用土；辛亥 壬辰 丙申 己亥 己丑、戊子土运反吉）。
 *   日主坐禄、只因禄支会入他局才算无根的，也不作从论：禄是日主最得力之根，会局夺不走（庚戌 乙酉 甲寅 庚午，寅午戌会火局而甲坐寅禄，
 *   任注不作从，「子运冲破火局……益我日主之气；辰年湿土……培日主之根源也」；与化气「日主虽临旺地……不能从合」同理）；
 *   坐库的照旧随局（癸亥 乙卯 己未 丁卯，「未土又会木局，不得不从杀矣」）。
 *   三会方之外那一行的墓库支也随方论（壬辰 辛亥 戊子 癸丑「支类北方，水势汪洋……土太衰者，似火也」，辰为水库，戊土不作有根；
 *   加这一条后滴天髓 510 造只此一造改判从财，岁运同 608 → 610、反 194 → 191）。
 *   地支的印被财冲克（申冲寅、酉冲卯、亥冲巳、子冲午），冲者不少于被冲者，这一支又不在日支，天干帮身至多一位、不透印，
 *   拔去之后日主与帮身之干都再无一点根的，印根拔尽，这一支按冲它的财论（「三申冲去一寅，丙火之根已拔，比肩亦不能为力」「喜其巳亥逢冲破印，格成弃命从杀」
 *   「嫩木逢金，紧贴相冲，连根拔尽……格成从杀」；510 造只改判这三造，岁运同 612 → 615、反 185 → 182，格局漏判 12 → 11）。
 *   禄刃之根被冲不算（甲坐寅禄、丙午月刃被冲的，任注都不作从），日主坐下的印也不算（「巳亥虽冲破印，喜卯木仍能生火」）。
 * - 专旺、从强（「旺极者似X」）：打分到极强（或同党占八成以上），而且四支本气都是印比，不见食伤、财、官杀之根。
 *   日主本气的三合、三会局齐全而全局不见官杀的（方局篇「支全寅卯辰，东方一气」「丁卯 甲辰 甲寅 乙亥……格名曲直仁寿」），
 *   打分不到极强也作专旺，局外的同气余气支（火局的未、木局的辰……）随局论（「支全火局，木从火势，格成炎上」）；
 *   但「财旺提纲」——月支本气是财、财支不止一处——照任注「必先察财官之势……以财为用」，不作专旺。
 *   相邻两支六合而化神正是日主本气的，合住的那一支随化神论；天干全是印比、四支本气也全是印比的「斯真格象」，
 *   打分不到极强也作专旺（费中堂造「子丑化土……已成稼穑」）。
 *   旺极（打分四分以上或同党八成以上）时，日主本气的墓库支（木库未、火库戌、金库丑、水库辰）也随旺势论
 *   （「未乃南方燥土，木之库根」：癸卯 乙卯 甲寅 辛未，木旺极而辛金无能，疑似从强，以癸水为用与书相近）。
 *   专旺而食伤两透有根、或无印透出的，顺势以食伤吐秀为用（「化神者丙丁也」「取丁火食神秀气」），印克食伤为忌；
 *   食伤只透一位又有印透的仍以印比为用（「一点甲木枯浮，难泄水气」，大取金水）。
 *   「全局不见官杀」看天干、地支本气与寅申巳亥所藏中气，辰戌丑未杂气里一点官杀余气不算（费中堂造未中乙木仍作稼穑）。
 *   （这几条加入后，`node scripts/bazi-cases.mjs`：格局与书一致 28 → 31 造、漏判 15 → 12；喜用第一位一致 174 → 175、相反 32 → 31，留集不变；
 *   岁运一致 552 → 553、相反 205 → 206——多出的一造是母象篇「母众子孤」的癸卯 丙辰 甲寅 乙亥，书以水为忌，程序按专旺列水为喜。
 *   再加墓库支随旺势、旺衰的会局加分后：格局一致 31 不变、多判 40 → 43（新多判的三造任注都作旺极论：癸未 丁巳 丙午 癸巳「暖之至寒无根」、
 *   癸卯 乙卯 甲寅 辛未「辛金之君无能为」、庚寅 己卯 乙亥 癸未「成局干透一官星……用官则临绝地」），其余数字见 baziStrength.js 文件头。）
 *   打分的两条（从格与极强）要时辰已知。
 *   食伤有本气之根的是「太旺」，任注取食伤泄秀（「水太旺者……喜其寅木吐秀」），仍按扶抑。
 *   从强要「绝无一毫财星官杀之气」：天干官杀在地支有根（「乙木官星透露，盘根在未……本可为用」），
 *   或食伤透干有根、又有财星透出（「喜其甲丙并透……用神必是甲木」），也按扶抑。
 */
export const detectSpecialPattern = (chart, strength, summary) => {
  const { roleShare, byKey, stems, pillars } = summary;
  const dayGan = chart.dayMaster.gan;
  const dayWuxing = chart.dayMaster.wuxing;
  const score = strength.score ?? null;
  const hasRoot = strength.deDi.some((item) => item.tongGen);
  const yinThrough = summary.transparentRole('印').length > 0;
  const guanThrough = summary.transparentRole('官杀').length > 0;

  // 化气：日干与月干或时干相合，日主地支没有本气之根，化神得令或得势；有本气之根而化神当令、气旺的作假化。
  const benqiRootZhis = pillars.filter((pillar) => GAN_WUXING[pillar.hiddenGanDetails?.[0]?.gan] === dayWuxing).map((pillar) => pillar.zhi);
  const partner = stems.find((stem) => (stem.key === 'month' || stem.key === 'time') && GAN_HE[dayGan] === stem.gan);
  if (partner) {
    const pairKey = [dayGan, partner.gan].sort((a, b) => Object.keys(GAN_WUXING).indexOf(a) - Object.keys(GAN_WUXING).indexOf(b)).join('');
    const element = GAN_HE_ELEMENT[pairKey];
    const monthElement = ZHI_WUXING[byKey.month?.zhi];
    const huaShare = strength.percents?.[element] ?? 0;
    const deLing = monthElement === element && !hasRoot;
    // 日主坐下本气是印的，印生身，日主不孤，化不真（任注「日元柔弱，以印为夫，清而得用」：癸酉日，时干戊土相合，仍取印）。
    const sitsOnYin = GAN_WUXING[byKey.day?.hiddenGanDetails?.[0]?.gan] === GENERATED_BY[dayWuxing];
    const zhenHua = element && !benqiRootZhis.length && !sitsOnYin && (deLing || huaShare >= 25);
    // 日主坐下就是本气之根（坐禄、坐刃）的不作假化（「喜其日元得地……壬水可用」「日主虽临旺地……日主不能从合矣」）。
    const sitsOnRoot = GAN_WUXING[byKey.day?.hiddenGanDetails?.[0]?.gan] === dayWuxing;
    const jiaHua = element && benqiRootZhis.length > 0 && !sitsOnRoot && element !== dayWuxing && monthElement === element && huaShare >= 35;
    if (zhenHua || jiaHua) {
      const gods = huaGodsOf(element, dayWuxing, huaShare);
      const he = `日主${dayGan}与${partner.name}${partner.gan}相合`;
      return withGods(zhenHua ? {
        name: `疑似${dayGan}${partner.gan}化${element}格`,
        kind: 'hua',
        element,
        basis: `${he}，${deLing ? `月令${byKey.month.zhi}正是${element}当令，日主又无根` : `${element}气占 ${huaShare}%，日主地支没有本气之根`}。`,
        note: '化气格以化神为主，化气有余喜泄、不足喜生，忌妒合、争合与化神被克。能否真化条件苛刻，请人工确认。',
      } : {
        name: `疑似${dayGan}${partner.gan}化${element}格（假化）`,
        kind: 'jiahua',
        element,
        basis: `${he}，月令${byKey.month.zhi}正是${element}当令，${element}气占 ${huaShare}%；但日主在${[...new Set(benqiRootZhis)].join('、')}有本气之根，化而不真。`,
        note: '假化格合神有情、不争不妒的，仍以化神为用：岁运生助化神则发，帮起日主或克化神则败。能否作化论请人工确认。',
        caveat: '假化还要看合神是否有情、岁运是否生助化神',
      }, gods.favorable, gods.unfavorable, gods.basis);
    }
  }

  const supportStems = stems.filter((stem) => ['比劫', '印'].includes(ROLE_OF[stem.shiShen]));
  const yinStems = supportStems.filter((stem) => ROLE_OF[stem.shiShen] === '印');
  // 时辰不详时时柱的根气不知道，只按旧的比例条件看。
  const scored = Boolean(score) && !score.hourEstimate;
  const rooted = scored ? score.ling + score.di : null;
  const onlyFaintRoots = scored && !score.roots.some((root) => root.position === '本气');
  const congByScore = onlyFaintRoots && !hasRoot && rooted <= 0.25 && (
    (!yinStems.length && supportStems.length <= 2)
    // 天干一个无根之印，要财星占到三成、足以坏印，才作从论（任注「金衰极者似木」一造，己土虚浮，四面财杀）。
    || (supportStems.length === 1 && yinStems.length === 1 && roleShare['财'] >= 30)
  );
  const congByRatio = strength.ratio < 0.2 && !hasRoot && !yinThrough;
  // 看地支：会局后的四支本气都是异党，日主在局外没有得力之根（本气、禄，寅申巳亥中的长生），
  // 微根（辰戌丑未所藏上一季的余气与墓库，寅申巳亥的余气）至多一处、而且不在日支（「日主坐下库根」仍能盘根）；
  // 四支一气的不拘微根（「蟠根在未，余气在辰……但四柱皆财，其势必从」「满局皆土，格成火土从儿」）。
  const ju = juElementsOf(pillars.map((pillar) => pillar.zhi));
  // 论从时，三会方之外那一行的墓库支也随方论（任注「支类北方，水势汪洋……土太衰者，似火也」：壬辰 辛亥 戊子 癸丑，
  // 辰是水库，又与子拱水，戊土不作有根）。只在这里用，专旺另有余气支、墓库支随局的条件。
  const congJu = { ...ju };
  Object.values(ju).forEach((element) => pillars.forEach((pillar) => {
    if (pillar.zhi === KU_ZHI[element] && !congJu[pillar.zhi]) congJu[pillar.zhi] = element;
  }));
  // 地支的印被财冲克、印根拔去的，论从时这一支按冲它的财论（任注「三申冲去一寅，丙火之根已拔」戊寅 庚申 丙申 丙申，
  // 「巳亥逢冲破印，格成弃命从杀」癸巳 乙卯 己亥 癸酉）；禄刃、日主坐下的印冲不去。条件见函数说明。
  const chongVictims = pillars.map((pillar) => {
    const attacker = CHONG_BY[pillar.zhi];
    if (!attacker || congJu[pillar.zhi] || pillar.key === 'day' || supportStems.length > 1 || yinStems.length) return null;
    if (GAN_WUXING[pillar.hiddenGanDetails?.[0]?.gan] !== GENERATED_BY[dayWuxing]) return null;
    const attackers = pillars.filter((other) => other.zhi === attacker).length;
    return attackers && attackers >= pillars.filter((other) => other.zhi === pillar.zhi).length ? ZHI_WUXING[attacker] : null;
  });
  // 拔去之后日主与帮身之干都再无一点根，才算拔尽（「丙火之根已拔，比肩亦不能为力」「连根拔尽」）；
  // 局外还有余气、库根的（丙申 庚寅 丙辰 戊戌，戌中丁火）不作此论。
  const rootedApart = (gan, skip) => pillars.some((pillar, index) => !skip(pillar, index)
    && (pillar.hiddenGanDetails ?? []).some((detail) => GAN_WUXING[detail.gan] === GAN_WUXING[gan]));
  const uprooted = chongVictims.some(Boolean)
    && !rootedApart(dayGan, (pillar, index) => congJu[pillar.zhi] || chongVictims[index])
    && supportStems.every((stem) => !rootedApart(stem.gan, (pillar, index) => chongVictims[index]));
  const brokenYin = uprooted ? chongVictims : pillars.map(() => null);
  const branchElements = pillars.map((pillar, index) => congJu[pillar.zhi] ?? brokenYin[index] ?? GAN_WUXING[pillar.hiddenGanDetails?.[0]?.gan]);
  const outsideRoots = pillars.filter((pillar, index) => !congJu[pillar.zhi] && !brokenYin[index]).flatMap((pillar) => (pillar.hiddenGanDetails ?? [])
    .map((detail, index) => (GAN_WUXING[detail.gan] !== dayWuxing ? null : {
      key: pillar.key,
      zhi: pillar.zhi,
      faint: index > 0 && LU[dayGan] !== pillar.zhi && (index === 2 || ZA_QI_MONTHS.has(pillar.zhi)),
    }))
    .filter(Boolean));
  const faintRoots = outsideRoots.filter((root) => root.faint);
  const yinRootedOutside = (gan) => pillars.some((pillar, index) => !congJu[pillar.zhi] && !brokenYin[index]
    && (pillar.hiddenGanDetails ?? []).some((detail) => GAN_WUXING[detail.gan] === GAN_WUXING[gan]));
  const rootedGan = (gan) => pillars.some((pillar, index) => !brokenYin[index]
    && (pillar.hiddenGanDetails ?? []).some((detail) => GAN_WUXING[detail.gan] === GAN_WUXING[gan]));
  // 一气而天干有克它的字通根，势被制住，不作一气论（「三逢辰支，通根身库……甲乙并透，通根制土」）。
  const yiQiElement = new Set(branchElements).size === 1 ? branchElements[0] : null;
  const yiQi = Boolean(yiQiElement)
    && !stems.some((stem) => stem.key !== 'day' && GAN_WUXING[stem.gan] === KE_BY[yiQiElement] && rootedGan(stem.gan));
  const congByBranches = scored && pillars.length === 4
    && branchElements.every((element) => ['食伤', '财', '官杀'].includes(strength.roles[element]))
    && faintRoots.length === outsideRoots.length
    && (yiQi || (faintRoots.length <= 1 && !faintRoots.some((root) => root.key === 'day')))
    // 四支一气都是官杀、天干比劫全都无根的，三透也从（子平真诠李侍郎「乙酉、乙酉、乙酉、甲申」从杀，「运喜财官，不宜身旺」；
    // 任注「虽天干三透甲乙，而地支不载，木凋金锐，用土以从之」）；财、食伤一气的三透不从（辛卯四柱、壬寅四柱，任注不作从）。
    && (supportStems.length <= 2 || (yiQi && strength.roles[yiQiElement] === '官杀' && supportStems.length === 3
      && !yinStems.length && supportStems.every((stem) => !rootedGan(stem.gan))))
    // 天干有印的，只能是这一个帮身之干，还要财星占到三成、足以坏印，或财星透出克这个无根之印
    // （「时干丁火，被年上癸水克去」；印在局外地支有根的，如寅中戊土，透财也克不去）；印比各一的，任注仍取印比。
    && (!yinStems.length || (supportStems.length === 1 && (roleShare['财'] >= 30
      || (summary.transparentRole('财').length > 0 && !yinRootedOutside(yinStems[0].gan)))));
  if (congByRatio || congByScore || congByBranches) {
    const outer = ['财', '官杀', '食伤'].sort((a, b) => roleShare[b] - roleShare[a]);
    const dominant = outer[0];
    const dominantShare = roleShare[dominant];
    const nameOf = { 财: '从财格', 官杀: '从杀格', 食伤: '从儿格' };
    const name = dominantShare >= 35 ? nameOf[dominant] : '从势格';
    // 官杀独旺而月令本气是食伤的，当令的食伤制杀，日主不从（任注「两杀并透，支会杀局，喜其辰土当令制杀，辰中木有余气而生身」，
    // 丙申 壬辰 丙子 壬辰 用土）。
    const monthMainRole = ROLE_OF[byKey.month?.hiddenGanDetails?.[0]?.shiShen];
    if (name === '从杀格' && monthMainRole === '食伤') return null;
    // 日主坐禄，只因这一支会入他局才算无根的，不作从论：禄是日主最得力之根，会局夺不走（庚戌 乙酉 甲寅 庚午，甲坐寅禄而寅午戌会火局，
    // 任注不作从，「子运冲破火局……益我日主之气；辰年湿土……培日主之根源也」）；坐库的照旧随局（己未而亥卯未会木局，「未土又会木局，不得不从杀矣」）。
    if (LU[dayGan] === byKey.day?.zhi && congJu[byKey.day.zhi]) return null;
    const juText = [...new Set(Object.values(congJu))].map((element) => `${Object.keys(congJu).filter((zhi) => congJu[zhi] === element).join('')}会成${element}局`).join('、');
    const rootText = (score?.roots ?? []).map((root) => `${root.zhi}中${root.gan}`).join('、');
    const byBranches = congByBranches && !congByRatio && !congByScore;
    const rootPart = rootText ? `地支无比劫之根，只有${rootText}一点印气` : '地支无根';
    const stemsText =(list) => list.map((stem) => `${stem.name.replace('柱', '干')}${stem.gan}`).join('、');
    const looseStems = supportStems.filter((stem) => !rootedGan(stem.gan));
    const shallowStems = supportStems.filter((stem) => rootedGan(stem.gan));
    const stemPart = supportStems.length
      ? [looseStems.length ? `${stemsText(looseStems)}虚浮无根` : '', shallowStems.length ? `${stemsText(shallowStems)}根浅` : ''].filter(Boolean).join('，')
      : '天干无印比相帮';
    const chongText = brokenYin.map((element, index) => (element ? `${pillars[index].zhi}被${CHONG_BY[pillars[index].zhi]}冲，印根已拔` : null)).filter(Boolean).join('，');
    const branchPart = `${chongText ? `${chongText}，余支` : '四支'}${yiQi ? `都是${branchElements[0]}（${strength.roles[branchElements[0]]}）` : '本气都是食伤财官'}`;
    const faintPart = faintRoots.length ? `只有${[...new Set(faintRoots.map((root) => root.zhi))].join('、')}中一点微根` : '没有得力之根';
    const together = outer.filter((role) => roleShare[role] >= 20);
    const shiPart = dominantShare >= 35 ? `${dominant}占 ${Math.round(dominantShare)}% 独旺`
      : together.length >= 2 ? `${together.join('、')}并旺，无一独占三成五` : '食伤财官合成一势';
    return withRoleGods({
      name: `疑似${name}`,
      kind: 'cong',
      basis: byBranches
        ? `${juText ? `${juText}，` : ''}${branchPart}，日主${dayGan}${dayWuxing}${faintPart}，${stemPart}，${shiPart}。`
        : `日主${dayGan}${dayWuxing}${rootPart}，${stemPart}，${shiPart}。`,
      note: '从格以顺从旺势为用，喜忌与常法相反：扶身反而不利。是否真从还要看是否有微根、印星是否被制，请人工确认。',
    }, strength.roles, CONG_GODS[name]);
  }

  // 两气成象（《滴天髓·形象》「两气合而成象，象不可破也」）：天干与地支本气只有两行、各占一半，而日主是生的一方
  //（甲午 丁卯 甲午 丁卯 木火、丙午 戊戌 丙午 戊戌 火土、戊戌 辛酉 戊戌 辛酉 土金），任注「凡两气成象者，要日主去生，或食或伤，
  // 谓英华秀发，多致富贵；所不足者，运破局，不免于祸」，取食伤秀气为用。印局（「金水水木之印绶格，无秀可取」）、
  // 财局（「身财均敌」）、杀局（「纯杀无制，日主受伤」）任注不作此论，仍按扶抑或专旺（丁卯 乙巳 丁卯 乙巳 木从火势，格成炎上）。
  // 只认任注验过的木火、火土、土金三种：水木各半的两造任注都不作秀气论（癸亥 甲寅 癸亥 甲寅「寅亥化木，伤官太重」，
  // 土金运反吉；壬寅 壬寅 壬寅 壬寅「仍作偏枯论」），金水生局没有命造可凭。
  if (pillars.length === 4 && pillars.every((pillar) => pillar.gan) && LIANG_QI_PAIRS.has(dayWuxing)) {
    const mainElements = pillars.flatMap((pillar) => [GAN_WUXING[pillar.gan], GAN_WUXING[pillar.hiddenGanDetails?.[0]?.gan] ?? ZHI_WUXING[pillar.zhi]]);
    const counts = mainElements.reduce((acc, element) => ({ ...acc, [element]: (acc[element] ?? 0) + 1 }), {});
    const kinds = Object.keys(counts);
    const output = GENERATES[dayWuxing];
    // 「各半」照任注命造取八字里四比四，五比三不算。
    if (kinds.length === 2 && kinds.includes(dayWuxing) && kinds.includes(output) && counts[dayWuxing] === 4 && counts[output] === 4) {
      return withRoleGods({
        name: `两气成象（${dayWuxing}${output}相生）`,
        kind: 'liangqi',
        basis: `天干与地支本气只有${dayWuxing}、${output}两行（${counts[dayWuxing]} 比 ${counts[output]}），两气成象；日主${dayGan}${dayWuxing}是生的一方，以${output}（食伤）秀气为用。`,
        note: '任注「凡两气成象者，要日主去生，或食或伤，谓英华秀发，多致富贵；所不足者，运破局，不免于祸」。旺衰仍按打分看，喜忌按此象论。',
        caveat: '两气成象不是从、化，象不破就按此论（任注「象不可破也」）',
      }, strength.roles, { favorable: ['食伤', '比劫'], unfavorable: ['印', '官杀'], basis: '两气成象而日主去生，取食伤秀气为用，比劫助之；印克食伤、官杀克身都是破局（任注「运破局，不免于祸」）' });
    }
  }

  // 地支会成三合、三会局的，按局的五行论（「亥卯未」木局里的未土不再算财根）：任注「此木局全，混一寅字，然四柱无金，
  // 其势从强」；「地支亥子丑，干透壬癸辛，局成润下」。
  // 日主本气的局齐全时（「支全寅卯辰，东方一气」「寅午戌全」），局外那一支若是本气的余气支（木局的辰、火局的未、金局的戌、水局的丑）
  // 也随局论——任注炎上一造「丙寅 甲午 丙戌 乙未」，未是火之余气，仍作炎上。
  const juOfDay = Object.values(ju).includes(dayWuxing);
  // 相邻两支六合而化神正是日主本气的（费中堂造「己未 丁丑 戊子 己未」，子丑化土），合住的那一支随化神论。
  const liuHeElementOf = (index) => [pillars[index - 1], pillars[index + 1]]
    .some((neighbor) => neighbor && LIU_HE_HUA[pillars[index].zhi + neighbor.zhi] === dayWuxing) ? dayWuxing : null;
  // 旺极（打分四分以上或同党八成以上）时，日主本气的墓库支（木库未、火库戌、金库丑、水库辰）也随旺势论：任注「未乃南方燥土，木之库根」
  //（癸卯 乙卯 甲寅 辛未，木旺极而辛金无能，以癸水为用）。
  const scoreWang = (scored && score.total >= 4) || strength.ratio > 0.8;
  const juElementOf = (zhi, index) => ju[zhi] ?? (juOfDay && YU_QI_ZHI[dayWuxing] === zhi ? dayWuxing : null) ?? liuHeElementOf(index)
    ?? (scoreWang && KU_ZHI[dayWuxing] === zhi ? dayWuxing : null);
  const benqiRoles = new Set(pillars.map((pillar, index) => (juElementOf(pillar.zhi, index) ? strength.roles[juElementOf(pillar.zhi, index)] : ROLE_OF[pillar.hiddenGanDetails?.[0]?.shiShen])).filter(Boolean));
  // 旺极：打分到极强、同党占八成以上；或日主本气的三合、三会局齐全而全局不见官杀（任注「支全寅卯辰……曲直仁寿」「局成润下」，
  // 打分不到四分也作专旺：局全的旺势不是逐支相加算得出的）。
  // 任注方局篇「不论成方成局，必先察财官之势。若财旺提纲，则以财为用」：月支本气是财、财的本气支又不止一处（「癸卯 丙辰 甲辰 丙寅」
  // 辰辰财旺，身旺用财），局全也不作专旺；只一处财支的（「丁卯 甲辰 甲寅 乙亥」）仍是曲直仁寿。
  const caiBranches = pillars.filter((pillar) => ROLE_OF[pillar.hiddenGanDetails?.[0]?.shiShen] === '财').length;
  const caiWangTiGang = ROLE_OF[byKey.month?.hiddenGanDetails?.[0]?.shiShen] === '财' && caiBranches >= 2;
  // 「全局不见官杀」：天干、地支本气与寅申巳亥所藏的中气里没有官杀；辰戌丑未杂气里一点官杀余气不算（费中堂造未中乙木，任注仍作稼穑）。
  const guanShaVisible = stems.some((stem) => ROLE_OF[stem.shiShen] === '官杀')
    || summary.hidden.some((item) => ROLE_OF[item.shiShen] === '官杀' && (item.rank === 0 || !ZA_QI_MONTHS.has(item.zhi)));
  const zaQiGuanSha = !guanShaVisible && summary.hidden.some((item) => ROLE_OF[item.shiShen] === '官杀');
  const juWang = juOfDay && !guanShaVisible && !caiWangTiGang;
  // 干支一气：天干全是印比、四支本气（会局、六合化后）也全是印比，「斯真格象」，打分不到极强也作旺极。
  const yiQiWang = stems.every((stem) => ['比劫', '印'].includes(ROLE_OF[stem.shiShen])) && [...benqiRoles].every((role) => role === '比劫' || role === '印');
  const wangJi = (scored && score.total >= 4) || strength.ratio > 0.8 || juWang || yiQiWang;
  // 从强「绝无一毫财星官杀之气」：天干官杀在地支有根，官星有力（「乙木官星透露，盘根在未，余气在辰，本可为用」）；
  // 食伤透干有根、又有财星透出，旺神有泄、食伤生财（「喜其甲丙并透……用神必是甲木」）：都按扶抑，不作专旺、从强。
  const rootedStemOf = (role) => stems.some((stem) => stem.key !== 'day' && ROLE_OF[stem.shiShen] === role && rootedGan(stem.gan));
  const shunShi = !['食伤', '财', '官杀'].some((role) => benqiRoles.has(role))
    && !rootedStemOf('官杀')
    && !(rootedStemOf('食伤') && summary.transparentRole('财').length > 0);
  if (wangJi && shunShi) {
    const level = score ? `帮身打分 ${Math.round(score.total * 100) / 100} 分` : `同党占 ${Math.round(strength.ratio * 100)}%`;
    if (!guanShaVisible && roleShare['比劫'] >= roleShare['印']) {
      // 食伤透干有根才谈吐秀；印也透出而食伤只有一位的，印克食伤、食伤难为用（任注炎上一造戊土食神透而甲印亦透，仍用火），
      // 食伤两透成势、或全局无印透出的，才顺势以食伤为用。
      const xieXiu = rootedStemOf('食伤') && (summary.transparentRole('食伤').length >= 2 || !yinThrough);
      return withRoleGods({
        name: `疑似${ZHUAN_WANG[dayWuxing]}（专旺）`,
        kind: 'zhuanwang',
        basis: `日主${dayGan}${dayWuxing}${level}，四支本气都是印比，比劫成势且全局不见官杀${zaQiGuanSha ? '（杂气里一点官杀余气不计）' : ''}${xieXiu ? '；食伤透干有根，旺势有处吐秀' : ''}。`,
        note: '专旺格顺其旺势为吉，喜比劫、印与食伤引化，最忌官杀逆势。是否成格请结合月令与会局人工确认。',
      }, strength.roles, wangGodsOf('zhuanwang', roleShare, { xieXiu }));
    }
    return withRoleGods({
      name: '疑似从强格',
      kind: 'congqiang',
      basis: `日主${dayGan}${dayWuxing}${level}，四支本气都是印比，印比两旺${guanThrough ? '；天干虽见官杀，地支无根' : '，官杀无力'}。`,
      note: '从强格以印比为用，忌财星破印、官杀克身。旺到极处才作此看，请人工确认。',
    }, strength.roles, wangGodsOf('congqiang', roleShare));
  }
  return null;
};

const trait = (key, name, tone, basis, note) => ({ key, name, tone, basis, note });

/** 常见命局组合。 */
export const detectTraits = (chart, strength, summary) => {
  const { byKey, roleShare, transparent, transparentRole } = summary;
  const dayGan = chart.dayMaster.gan;
  const strong = strength.band === '偏强' || strength.band === '极强';
  const weak = strength.band === '偏弱' || strength.band === '极弱';
  const month = byKey.month;
  const monthMain = month?.hiddenGanDetails?.[0]?.shiShen ?? '';
  const seen = (shiShen) => transparent(shiShen).length > 0 || monthMain === shiShen;
  const where = (shiShen) => {
    const stems = transparent(shiShen);
    return stems.length ? describeStems(stems) : `月令${month?.zhi}本气`;
  };
  const traits = [];

  if (seen('正官') && seen('七杀')) {
    traits.push(trait('guansha-hunza', '官杀混杂', 'caution', `正官见于${where('正官')}，七杀见于${where('七杀')}。`, '官杀并见，责任与压力来自多方，宜去留分明（合去或制去其一）；性格上常显得既守规矩又想突破。'));
  }
  if (seen('伤官') && seen('正官')) {
    traits.push(trait('shangguan-jianguan', '伤官见官', 'caution', `伤官见于${where('伤官')}，正官见于${where('正官')}。`, '传统视为需要留意的组合：与上司、规则容易起摩擦，宜以财通关或以印制伤；也常见于敢想敢做、不走寻常路的人。'));
  }
  if (transparent('食神').length && transparent('七杀').length && !transparent('偏印').length) {
    traits.push(trait('shishen-zhisha', '食神制杀', 'good', `食神见于${describeStems(transparent('食神'))}，七杀见于${describeStems(transparent('七杀'))}。`, '七杀有制，多主有担当、能扛事，压力能转化为成就。'));
  }
  if (transparent('偏印').length && transparent('食神').length) {
    traits.push(trait('xiao-duo-shi', '枭神夺食', 'caution', `偏印见于${describeStems(transparent('偏印'))}，食神见于${describeStems(transparent('食神'))}。`, '想法多而落地慢，饮食与作息宜规律；见财星制枭则可解。'));
  }
  if (transparent('伤官').length && transparent('正印').length) {
    traits.push(trait('shangguan-peiyin', '伤官配印', 'good', `伤官见于${describeStems(transparent('伤官'))}，正印见于${describeStems(transparent('正印'))}。`, '才华与分寸兼具，适合专业、文教与创作一类的路。'));
  }
  if (transparent('正官').length && transparentRole('印').length) {
    traits.push(trait('guanyin-xiangsheng', '官印相生', 'good', `正官见于${describeStems(transparent('正官'))}，印星见于${describeStems(transparentRole('印'))}。`, '官生印、印护身，适合体制内、专业资格与稳扎稳打的路线。'));
  }
  if (transparentRole('财').length && transparent('正官').length && !weak) {
    traits.push(trait('caiguan-xiangsheng', '财官相生', 'good', `财星见于${describeStems(transparentRole('财'))}，正官见于${describeStems(transparent('正官'))}，日主${strength.band}能任。`, '财能生官、身能担财官，事业与财务多能互相成就。'));
  }
  const renZhi = REN[dayGan];
  const renPillar = renZhi ? summary.pillars.find((pillar) => pillar.zhi === renZhi) : null;
  if (renPillar && transparent('七杀').length) {
    traits.push(trait('yangren-jiasha', '羊刃驾杀', 'good', `${renPillar.name}${renPillar.zhi}为羊刃，七杀见于${describeStems(transparent('七杀'))}。`, '刃杀相济，魄力与执行力强，适合竞争性强的行业；忌刃被冲或杀无制。'));
  }
  if (weak && roleShare['财'] >= 35) {
    traits.push(trait('caiduo-shenruo', '财多身弱', 'caution', `财星占 ${Math.round(roleShare['财'])}%，日主${strength.band}。`, '财来财去、为财所累，宜比劫帮身或印星生扶，合伙与理财需量力。'));
  }
  if (weak && roleShare['官杀'] >= 35) {
    traits.push(trait('shazhong-shenqing', '杀重身轻', 'caution', `官杀占 ${Math.round(roleShare['官杀'])}%，日主${strength.band}。`, '压力型命局，宜印星化杀或食伤制杀，身体与情绪都要留余地。'));
  }
  if (strong && roleShare['比劫'] >= 35 && (transparentRole('财').length || roleShare['财'] >= 10)) {
    traits.push(trait('bijie-zhengcai', '比劫争财', 'caution', `比劫占 ${Math.round(roleShare['比劫'])}%，日主${strength.band}，${transparentRole('财').length ? `财星透于${describeStems(transparentRole('财'))}` : `财星占 ${Math.round(roleShare['财'])}%`}。`, '合伙、借贷、担保宜谨慎；有官杀制比劫或食伤通关则可缓解。'));
  }
  if (strong && roleShare['印'] >= 35) {
    traits.push(trait('yinzhong-shenqiang', '印重身强', 'caution', `印星占 ${Math.round(roleShare['印'])}%，日主${strength.band}。`, '想得多做得少、依赖性强；喜财星破印，宜多动手实践。'));
  }
  if (strong && transparentRole('食伤').length && roleShare['食伤'] >= 15) {
    traits.push(trait('shishang-xiexiu', '食伤泄秀', 'good', `日主${strength.band}，食伤见于${describeStems(transparentRole('食伤'))}。`, '身旺有泄，才艺与表达出色，适合创作、技艺与口才相关的工作。'));
  }
  if (strong && roleShare['官杀'] < 5 && roleShare['财'] < 8) {
    traits.push(trait('shenwang-wuyi', '身旺无依', 'caution', `日主${strength.band}，官杀仅 ${Math.round(roleShare['官杀'])}%、财星仅 ${Math.round(roleShare['财'])}%。`, '旺而无财官可用，宜以食伤生财开路；行财官运时反而容易有机会。'));
  }
  if (weak && transparentRole('印').length && roleShare['印'] >= 15) {
    traits.push(trait('yinxing-hushen', '印星护身', 'good', `日主${strength.band}，印星见于${describeStems(transparentRole('印'))}。`, '身弱得印，学习与长辈助力是主要依靠。'));
  }

  const day = byKey.day;
  const dayZhiShiShen = day?.hiddenGanDetails?.[0]?.shiShen;
  if (dayZhiShiShen && DAY_ZHI_NOTES[dayZhiShiShen]) {
    traits.push(trait('rizuo', `日坐${dayZhiShiShen}`, 'neutral', `日支${day.zhi}本气${day.hiddenGanDetails[0].gan}为${dayZhiShiShen}${day.ziZuo ? `，日主自坐${day.ziZuo}` : ''}。`, DAY_ZHI_NOTES[dayZhiShiShen]));
  }
  return traits;
};

/** 命中没有的十神类别。 */
export const detectAbsentRoles = (summary) => ROLES
  .filter((role) => role !== '比劫' && summary.roleCount[role] === 0)
  .map((role) => ({ role, text: { 印: '无印星', 食伤: '无食伤', 财: '无财星', 官杀: '无官星' }[role] }));

/** 五行缺失：八个字里没有的，以及藏干里也没有的。时辰不详只有三柱六个字，照实说「已知的六个字」。 */
export const analyzeWuxingGap = (chart, strength) => {
  const pillars = knownPillars(chart);
  const charsText = pillars.length === 4 ? '八个字' : `已知的${['', '两', '四', '六'][pillars.length] ?? pillars.length * 2}个字`;
  const hourNote = pillars.length === 4 ? '' : '；时柱不详，未计在内';
  const surface = new Set(pillars.flatMap((pillar) => [GAN_WUXING[pillar.gan], ZHI_WUXING[pillar.zhi]]));
  const hidden = new Set(pillars.flatMap((pillar) => pillar.hiddenGanDetails.map((detail) => GAN_WUXING[detail.gan])));
  const missingSurface = WUXING.filter((element) => !surface.has(element));
  const missingAll = missingSurface.filter((element) => !hidden.has(element));
  const hiddenOnly = missingSurface.filter((element) => hidden.has(element)).map((element) => {
    const holder = pillars.find((pillar) => pillar.hiddenGanDetails.some((detail) => GAN_WUXING[detail.gan] === element));
    const gan = holder.hiddenGanDetails.find((detail) => GAN_WUXING[detail.gan] === element).gan;
    return { element, text: `${holder.zhi}中藏${gan}${element}` };
  });
  const weakest = [...WUXING].sort((a, b) => (strength.percents[a] ?? 0) - (strength.percents[b] ?? 0))[0];
  const favorableMissing = missingSurface.filter((element) => strength.favorable.some((item) => item.element === element));
  const unfavorableMissing = missingSurface.filter((element) => strength.unfavorable.some((item) => item.element === element));

  let text;
  if (!missingSurface.length) {
    // 五行力量不计日干：最弱的正是日主那一行时说明一句，免得「五行俱全，火最弱（0%）」看着像自相矛盾。
    text = `五行俱全，${weakest === chart.dayMaster?.wuxing ? '除日主本身外' : ''}${weakest}最弱（${strength.percents[weakest] ?? 0}%）`;
  } else if (missingAll.length === missingSurface.length) {
    text = `五行缺${missingAll.join('、')}（藏干里也没有${hourNote}）`;
  } else {
    text = `${charsText}里不见${missingSurface.join('、')}${missingAll.length ? `，其中${missingAll.join('、')}藏干里也没有` : ''}；${hiddenOnly.map((item) => item.text).join('、')}`;
  }
  let hint = '缺什么不等于补什么：补救以喜用为准。';
  if (favorableMissing.length) hint = `所缺的${favorableMissing.join('、')}正是喜用，可以适当留意。`;
  else if (unfavorableMissing.length && !favorableMissing.length) hint = `所缺的${unfavorableMissing.join('、')}是忌神，缺了反而不必强补。`;

  return { missingSurface, missingAll, hiddenOnly, weakest, text, hint, favorableMissing, unfavorableMissing };
};

/**
 * @param {object} chart buildBaziChart 的结果
 * @param {object} strength analyzeStrength 的结果
 */
export const judgeBaziPattern = (chart, strength) => {
  const summary = summarize(chart, strength);
  const pattern = determinePattern(chart, summary);
  const chengBai = judgePatternSuccess(chart, strength, pattern, summary);
  const special = detectSpecialPattern(chart, strength, summary);
  const traits = detectTraits(chart, strength, summary);
  const absent = detectAbsentRoles(summary);
  const wuxingGap = analyzeWuxingGap(chart, strength);
  const roleShare = Object.fromEntries(ROLES.map((role) => [role, round(summary.roleShare[role])]));
  const timeUnknown = !summary.byKey.time;

  const points = [];
  if (pattern) points.push(`格局：${pattern.name}。${pattern.basis}`);
  if (chengBai) points.push(`成败（${chengBai.source}）：${pattern.name}${chengBai.verdict}。${chengBai.summary}`);
  if (special) {
    points.push(`${special.name}：${special.basis}${special.note}`);
    if (special.godsText) points.push(`若按${special.name.replace(/^疑似/, '')}论：${special.godsText}（${special.godsBasis}）。这与旺衰一节按扶抑取的喜忌不同，${special.caveat ?? '真从、真化才用这一套'}。`);
  }
  points.push(`十神力量：${ROLES.map((role) => `${role}${Math.round(roleShare[role])}%`).join(' ')}${absent.length ? `；${absent.map((item) => item.text).join('、')}` : ''}`);
  traits.forEach((item) => points.push(`${item.name}：${item.basis}${item.note}`));
  points.push(`${wuxingGap.text}。${wuxingGap.hint}`);
  if (timeUnknown) points.push('出生时辰不详，以上按年月日三柱判断，时柱相关的格局与十神未计。');

  return { pattern, chengBai, special, traits, absent, wuxingGap, roleShare, timeUnknown, points };
};
