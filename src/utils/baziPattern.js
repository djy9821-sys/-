/**
 * 八字格局与命局特点（程序初判，仅供参考）
 *
 * - 取格：按子平常法以月令取格。月支为日干之禄为建禄格，为阳干之刃为羊刃格，
 *   阴干月令本气为劫财为月劫格；其余看月支藏干何者透出天干，本气优先，
 *   再看中气、余气，都不透则以本气为格。辰戌丑未月不透本气时取透出的中余气（杂气）。
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

export const ROLE_OF = Object.freeze({
  比肩: '比劫', 劫财: '比劫', 正印: '印', 偏印: '印', 食神: '食伤', 伤官: '食伤', 正财: '财', 偏财: '财', 正官: '官杀', 七杀: '官杀',
});
const ROLES = ['比劫', '印', '食伤', '财', '官杀'];

const PATTERN_NAME = {
  正官: '正官格', 七杀: '七杀格', 正财: '正财格', 偏财: '偏财格', 正印: '正印格', 偏印: '偏印格', 食神: '食神格', 伤官: '伤官格',
};
const ZHUAN_WANG = { 木: '曲直格', 火: '炎上格', 土: '稼穑格', 金: '从革格', 水: '润下格' };

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

  const transparentOf = (gan) => stems.filter((stem) => stem.gan === gan);
  const candidates = month.hiddenGanDetails
    .map((detail, index) => ({ ...detail, rank: index, rankName: hiddenNames[index] ?? '余气', through: transparentOf(detail.gan) }))
    .filter((detail) => detail.shiShen in PATTERN_NAME);
  if (!candidates.length) {
    // 月令本气为比劫又不是禄刃（如戊土生辰戌月）：按杂气看透出的中余气。
    return { name: '比肩格', kind: 'regular', tenGod: main?.shiShen ?? '比肩', monthZhi: month.zhi, basis: `月支${month.zhi}本气为比劫，中余气无可取者，暂以比肩格看，宜人工复核。` };
  }
  const through = candidates.find((detail) => detail.through.length);
  const chosen = through ?? candidates[0];
  const zaQi = ZA_QI_MONTHS.has(month.zhi) && chosen.rank > 0;
  const mainNote = main && !(main.shiShen in PATTERN_NAME) ? `本气${main.gan}为${main.shiShen}不取，` : '';
  const basis = through
    ? `月支${month.zhi}${mainNote}${chosen.rankName}${chosen.gan}（${chosen.shiShen}）透于${describeStems(chosen.through)}，以透出者为格。`
    : `月支${month.zhi}${mainNote}藏干均未透出，以${chosen.rankName}${chosen.gan}（${chosen.shiShen}）为格。`;
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

/** 从格、专旺、化气的疑似提示；比例不极端时返回 null。 */
export const detectSpecialPattern = (chart, strength, summary) => {
  const { roleShare, roleCount, byKey, stems } = summary;
  const dayGan = chart.dayMaster.gan;
  const dayWuxing = chart.dayMaster.wuxing;
  const hasRoot = strength.deDi.some((item) => item.tongGen);
  const yinThrough = summary.transparentRole('印').length > 0;
  const guanThrough = summary.transparentRole('官杀').length > 0;

  if (strength.ratio < 0.2 && !hasRoot && !yinThrough) {
    const outer = ['财', '官杀', '食伤'].sort((a, b) => roleShare[b] - roleShare[a]);
    const dominant = outer[0];
    const dominantShare = roleShare[dominant];
    const nameOf = { 财: '从财格', 官杀: '从杀格', 食伤: '从儿格' };
    const name = dominantShare >= 40 ? nameOf[dominant] : '从势格';
    return {
      name: `疑似${name}`,
      kind: 'cong',
      basis: `日主${dayGan}${dayWuxing}同党仅占 ${Math.round(strength.ratio * 100)}%，地支无根、天干无印，${dominantShare >= 40 ? `${dominant}占 ${Math.round(dominantShare)}% 独旺` : '食伤财官三者相当'}。`,
      note: '从格以顺从旺势为用，喜忌与常法相反：扶身反而不利。是否真从还要看是否有微根、印星是否被制，请人工确认。',
    };
  }

  if (strength.ratio > 0.8) {
    if (roleCount['官杀'] === 0 && roleShare['比劫'] >= roleShare['印']) {
      return {
        name: `疑似${ZHUAN_WANG[dayWuxing]}（专旺）`,
        kind: 'zhuanwang',
        basis: `日主${dayGan}${dayWuxing}同党占 ${Math.round(strength.ratio * 100)}%，比劫成势且全局不见官杀。`,
        note: '专旺格顺其旺势为吉，喜比劫、印与食伤引化，最忌官杀逆势。是否成格请结合月令与会局人工确认。',
      };
    }
    return {
      name: '疑似从强格',
      kind: 'congqiang',
      basis: `日主同党占 ${Math.round(strength.ratio * 100)}%，印比两旺${guanThrough ? '，但天干见官杀，未必真从强' : '，官杀无力'}。`,
      note: '从强格以印比为用，忌财星破印、官杀克身。比例极端时才作此看，请人工确认。',
    };
  }

  // 化气：日干与月干或时干相合，月令又是化神当令，且日主无根。
  const partner = stems.find((stem) => (stem.key === 'month' || stem.key === 'time') && GAN_HE[dayGan] === stem.gan);
  if (partner && !hasRoot) {
    const pairKey = [dayGan, partner.gan].sort((a, b) => Object.keys(GAN_WUXING).indexOf(a) - Object.keys(GAN_WUXING).indexOf(b)).join('');
    const element = GAN_HE_ELEMENT[pairKey];
    const monthElement = ZHI_WUXING[byKey.month?.zhi];
    if (element && monthElement === element) {
      return {
        name: `疑似${dayGan}${partner.gan}化${element}格`,
        kind: 'hua',
        basis: `日主${dayGan}与${partner.name}${partner.gan}相合，月令${byKey.month.zhi}正是${element}当令，日主又无根。`,
        note: '化气格喜化神与生化神之物，忌妒合、争合与化神被克。能否真化条件苛刻，请人工确认。',
      };
    }
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
  if (special) points.push(`${special.name}：${special.basis}${special.note}`);
  points.push(`十神力量：${ROLES.map((role) => `${role}${Math.round(roleShare[role])}%`).join(' ')}${absent.length ? `；${absent.map((item) => item.text).join('、')}` : ''}`);
  traits.forEach((item) => points.push(`${item.name}：${item.basis}${item.note}`));
  points.push(`${wuxingGap.text}。${wuxingGap.hint}`);
  if (timeUnknown) points.push('出生时辰不详，以上按年月日三柱判断，时柱相关的格局与十神未计。');

  return { pattern, chengBai, special, traits, absent, wuxingGap, roleShare, timeUnknown, points };
};
