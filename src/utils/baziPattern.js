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
 *     兼透时取透而又会支者（「透干会支，取其清者用之」）。
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
/** 生我者：木 ← 水。 */
const GENERATED_BY = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
/** 克我者：土 ← 木。 */
const KE_BY = Object.fromEntries(Object.entries(KE).map(([from, to]) => [to, from]));

/**
 * 特殊格局「按此格论」的喜忌（十神类别，按先后排），按《滴天髓阐微·从象》《顺局》任铁樵注的命造：
 * 从格顺从旺神，扶身的印比反成破格之物。第一用神任注一律取与从神相生的那一行：从财取食伤生财，
 * 从杀取财生杀，从儿取财（「儿又生儿」）；从势三者并旺，以财星居中通关为先，官杀次之、食伤又次之。
 * 专旺、从强另见 wangGodsOf。化气格以化神为主，喜化神与生化神之物，忌克化神。
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
const wangGodsOf = (kind, roleShare) => {
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

/** 月令取格。 */
export const determinePattern = (chart, summary = null) => {
  const info = summary ?? summarize(chart, null);
  const { byKey, stems } = info;
  const month = byKey.month;
  const dayGan = chart.dayMaster.gan;
  if (!month) return null;
  const hiddenNames = ['本气', '中气', '余气'];
  const main = month.hiddenGanDetails[0];

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
 * - 从格（「衰极者似X」）：地支无比劫之根，印气至多一点中气、余气（不见本气，得令加得地不过 0.25 分）；天干帮身的只有无根比劫、
 *   至多两个（「天干三透甲乙，而地支不载……格成从杀」），或只有一个无根之印而财星占到三成、足以坏印。
 *   天干比劫三透、印比各一的，任注仍取印比，不作从论。旧的比例条件（同党不到两成、无根、无印透）也算。
 *   另一条看地支：四支本气（三合、三会齐全的按局论，「支全火局」「支全寅卯辰，东方一气」「未土又会木局」）
 *   都是食伤财官，日主在局外的地支没有本气、中气之根，余气之根至多一处，天干帮身至多两个
 *   （有印则只能是这一个，还要财星透出克印或财占三成），也作从论（「四柱皆财，其势必从」）。
 *   从哪一神：食伤、财、官杀里占得最多的一方到三成五为从儿、从财、从杀，否则为从势。
 * - 专旺、从强（「旺极者似X」）：打分到极强（或同党占八成以上），而且四支本气都是印比，不见食伤、财、官杀之根。
 *   打分的两条（从格与极强）要时辰已知。
 *   食伤有本气之根的是「太旺」，任注取食伤泄秀（「水太旺者……喜其寅木吐秀」），仍按扶抑。
 */
export const detectSpecialPattern = (chart, strength, summary) => {
  const { roleShare, roleCount, byKey, stems, pillars } = summary;
  const dayGan = chart.dayMaster.gan;
  const dayWuxing = chart.dayMaster.wuxing;
  const score = strength.score ?? null;
  const hasRoot = strength.deDi.some((item) => item.tongGen);
  const yinThrough = summary.transparentRole('印').length > 0;
  const guanThrough = summary.transparentRole('官杀').length > 0;

  // 化气：日干与月干或时干相合，日主地支没有本气之根，化神得令或得势。
  const benqiRoot = pillars.some((pillar) => GAN_WUXING[pillar.hiddenGanDetails?.[0]?.gan] === dayWuxing);
  const partner = stems.find((stem) => (stem.key === 'month' || stem.key === 'time') && GAN_HE[dayGan] === stem.gan);
  if (partner && !benqiRoot) {
    const pairKey = [dayGan, partner.gan].sort((a, b) => Object.keys(GAN_WUXING).indexOf(a) - Object.keys(GAN_WUXING).indexOf(b)).join('');
    const element = GAN_HE_ELEMENT[pairKey];
    const monthElement = ZHI_WUXING[byKey.month?.zhi];
    const huaShare = strength.percents?.[element] ?? 0;
    const deLing = monthElement === element && !hasRoot;
    if (element && (deLing || huaShare >= 25)) {
      // 日主本气（比劫）帮起日主就化不成；日主本气若正是化神、生化神或克化神，就不另列。
      const own = [element, GENERATED_BY[element], KE_BY[element]].includes(dayWuxing) ? [] : [{ element: dayWuxing, label: '日主本气' }];
      return withGods({
        name: `疑似${dayGan}${partner.gan}化${element}格`,
        kind: 'hua',
        element,
        basis: `日主${dayGan}与${partner.name}${partner.gan}相合，${deLing ? `月令${byKey.month.zhi}正是${element}当令，日主又无根` : `${element}气占 ${huaShare}%，日主地支没有本气之根`}。`,
        note: '化气格喜化神与生化神之物，忌妒合、争合与化神被克。能否真化条件苛刻，请人工确认。',
      },
      [{ element, label: '化神' }, { element: GENERATED_BY[element], label: '生化神' }],
      [{ element: KE_BY[element], label: '克化神' }, ...own],
      `化气以化神${element}为主，化神不足喜生、有余喜泄；${KE_BY[element]}克化神${own.length ? `，${dayWuxing}帮起日主则化不成` : ''}，为忌`);
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
  // 看地支：会局后的四支本气都是异党，日主在局外没有本气、中气之根，余气之根至多一处。
  const ju = juElementsOf(pillars.map((pillar) => pillar.zhi));
  const branchElements = pillars.map((pillar) => ju[pillar.zhi] ?? GAN_WUXING[pillar.hiddenGanDetails?.[0]?.gan]);
  const outsideRoots = pillars.filter((pillar) => !ju[pillar.zhi])
    .flatMap((pillar) => (pillar.hiddenGanDetails ?? []).map((detail, index) => (GAN_WUXING[detail.gan] === dayWuxing ? index : null)))
    .filter((index) => index !== null);
  const congByBranches = scored && pillars.length === 4
    && branchElements.every((element) => ['食伤', '财', '官杀'].includes(strength.roles[element]))
    && !outsideRoots.some((index) => index <= 1) && outsideRoots.length <= 1 && supportStems.length <= 2
    // 天干有印的，只能是这一个帮身之干，还要有财星透出克印（「时干丁火，被年上癸水克去」）或财星占到三成、足以坏印；
    // 印比各一的，任注仍取印比（同上面打分的条件）。
    && (!yinStems.length || (supportStems.length === 1 && (roleShare['财'] >= 30 || summary.transparentRole('财').length > 0)));
  if (congByRatio || congByScore || congByBranches) {
    const outer = ['财', '官杀', '食伤'].sort((a, b) => roleShare[b] - roleShare[a]);
    const dominant = outer[0];
    const dominantShare = roleShare[dominant];
    const nameOf = { 财: '从财格', 官杀: '从杀格', 食伤: '从儿格' };
    const name = dominantShare >= 35 ? nameOf[dominant] : '从势格';
    const juText = [...new Set(Object.values(ju))].map((element) => `${Object.keys(ju).filter((zhi) => ju[zhi] === element).join('')}会成${element}局`).join('、');
    const rootText = (score?.roots ?? []).map((root) => `${root.zhi}中${root.gan}`).join('、');
    const byBranches = congByBranches && !congByRatio && !congByScore;
    const rootPart = rootText ? `地支无比劫之根，只有${rootText}一点印气` : '地支无根';
    const stemPart = supportStems.length
      ? `${supportStems.map((stem) => `${stem.name.replace('柱', '干')}${stem.gan}`).join('、')}虚浮无根`
      : '天干无印比相帮';
    const together = outer.filter((role) => roleShare[role] >= 20);
    const shiPart = dominantShare >= 35 ? `${dominant}占 ${Math.round(dominantShare)}% 独旺`
      : together.length >= 2 ? `${together.join('、')}并旺，无一独占三成五` : '食伤财官合成一势';
    return withRoleGods({
      name: `疑似${name}`,
      kind: 'cong',
      basis: byBranches
        ? `${juText ? `${juText}，` : ''}四支本气都是食伤财官，日主${dayGan}${dayWuxing}没有得力之根，${stemPart}，${shiPart}。`
        : `日主${dayGan}${dayWuxing}${rootPart}，${stemPart}，${shiPart}。`,
      note: '从格以顺从旺势为用，喜忌与常法相反：扶身反而不利。是否真从还要看是否有微根、印星是否被制，请人工确认。',
    }, strength.roles, CONG_GODS[name]);
  }

  const benqiRoles = new Set(pillars.map((pillar) => ROLE_OF[pillar.hiddenGanDetails?.[0]?.shiShen]).filter(Boolean));
  const wangJi = (scored && score.total >= 4) || strength.ratio > 0.8;
  const shunShi = !['食伤', '财', '官杀'].some((role) => benqiRoles.has(role));
  if (wangJi && shunShi) {
    const level = score ? `帮身打分 ${Math.round(score.total * 100) / 100} 分` : `同党占 ${Math.round(strength.ratio * 100)}%`;
    if (roleCount['官杀'] === 0 && roleShare['比劫'] >= roleShare['印']) {
      return withRoleGods({
        name: `疑似${ZHUAN_WANG[dayWuxing]}（专旺）`,
        kind: 'zhuanwang',
        basis: `日主${dayGan}${dayWuxing}${level}，四支本气都是印比，比劫成势且全局不见官杀。`,
        note: '专旺格顺其旺势为吉，喜比劫、印与食伤引化，最忌官杀逆势。是否成格请结合月令与会局人工确认。',
      }, strength.roles, wangGodsOf('zhuanwang', roleShare));
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

/** 五行缺失：八个字里没有的，以及藏干里也没有的。 */
export const analyzeWuxingGap = (chart, strength) => {
  const pillars = knownPillars(chart);
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
    text = `五行俱全，${weakest}最弱（${strength.percents[weakest] ?? 0}%）`;
  } else if (missingAll.length === missingSurface.length) {
    text = `五行缺${missingAll.join('、')}（藏干里也没有）`;
  } else {
    text = `八个字里不见${missingSurface.join('、')}${missingAll.length ? `，其中${missingAll.join('、')}藏干里也没有` : ''}；${hiddenOnly.map((item) => item.text).join('、')}`;
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
    if (special.godsText) points.push(`若按${special.name.replace(/^疑似/, '')}论：${special.godsText}（${special.godsBasis}）。这与旺衰一节按扶抑取的喜忌不同，真从、真化才用这一套。`);
  }
  points.push(`十神力量：${ROLES.map((role) => `${role}${Math.round(roleShare[role])}%`).join(' ')}${absent.length ? `；${absent.map((item) => item.text).join('、')}` : ''}`);
  traits.forEach((item) => points.push(`${item.name}：${item.basis}${item.note}`));
  points.push(`${wuxingGap.text}。${wuxingGap.hint}`);
  if (timeUnknown) points.push('出生时辰不详，以上按年月日三柱判断，时柱相关的格局与十神未计。');

  return { pattern, chengBai, special, traits, absent, wuxingGap, roleShare, timeUnknown, points };
};
