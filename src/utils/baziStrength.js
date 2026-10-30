/**
 * 日主旺衰与喜用的程序估算（仅供参考）
 *
 * 五行力量（显示用）：天干每字 1 分（日干本身不计）；地支按藏干计，本气 1、中气 0.5、余气 0.3；
 * 月令地支的藏干再乘 2。同党 = 比劫 + 印，异党 = 食伤 + 财 + 官杀。
 *
 * 旺衰按得令、得地、得势三项打分（STRENGTH_SCORE）：
 * - 得令：月令本气是比劫 1 分，是印 0.75 分；辰戌丑未月本气不帮身、所藏余气或墓库却是比劫的（丙丁生未、戌月，
 *   任注「火气有余」）0.3 分。旺相休囚死：月令本气是财（日主囚）减 0.4 分，是官杀（日主死）减 0.5 分，是食伤（休）不减；
 * - 得地：年、日、时三支藏干里的比劫按本气 1、中气 0.5、余气 0.3 计，印减半；日支乘 1.5，年支、时支乘 0.5
 *   （月支已算在得令里），合计最多 3 分。根所在的支被紧贴的一支冲克（子冲午、酉冲卯、申冲寅、亥冲巳，
 *   任注「卯酉紧冲日禄」「冲去禄神，其根已拔」），这一支的根打六折；二不冲一（午子午）不算；
 * - 得势：年、月、时干每见一个比劫或印 0.5 分；
 * - 时辰不详时，时柱按平均 0.4 分估。
 * 合计 0.5 分及以下极弱、2 分及以下偏弱、2.5 分以下中和、4 分以下偏强，4 分及以上极强。
 *
 * 喜用按「扶抑」取用（子平与《滴天髓》通行取法），透干或在地支作本气、确实有力的五行排前。透干而地支无根的字不算有力
 * （任注「年月两干，土金无根，置之不用」「时上庚金无根为忌」），坐下本气生它的（庚坐辰，任注「辰土归垣，庚金得载」）、
 * 生它的五行力量在 3 分以上的（有源，杀重透印之类）、身旺时的食伤（日主生它）除外：
 * - 身弱：看食伤、财、官杀哪一方最重（透干的字每个另加半分：元神透出，力量更显）——财重取比劫帮身；
 *   食伤重取印制伤生身；官杀重取印化杀，印无力而食伤有力时取食伤制杀（任注「庚金并透，通根砍伐……
 *   更妙丙火独透，制杀扶身」：地支土气虽略多，并透的庚金才是病）；
 * - 身旺：看印、比劫哪一方多——印多取财破印（财星有力，官星又透出有力、不比印重的，身旺足以用官；
 *   印在比劫两倍以上而财星、食伤都无力的是「母多灭子」，顺母之性，取比劫帮身）；
 *   比劫多取官杀制劫（官杀无力就取食伤泄秀；3.3 分以上「太旺」的，官杀逆其旺势，先取食伤泄秀）；
 *   旺极（4 分及以上）先取食伤泄秀；
 * - 中和：任注没有不取用神的，2.15 分及以上按偏旺取，以下按偏弱取（取用思路里写明「中和略偏旺／弱」）。
 * 调候按《穷通宝鉴》调候用神表（src/data/tiaohou.js）查日干与月令：主用神的五行附在喜用末尾。
 * 寒暖调候为急的除外：冬月（亥子丑）与正月（寅）调候宜火、夏月（巳午未）调候宜水，而这一火、水在原局有力（透干或作本气）
 * 又在地支有根时，取为第一。任注《寒暖》：「寒虽甚，要暖有气也」（甲申 丙子 庚辰 戊寅，丙火以寅为根，用火）；
 * 「寒甚而暖无气，反以无暖为美」（己酉 丙子 庚辰 甲申，丙火无根，不用）。
 *
 * 喜忌按用神定（用、喜、忌、仇、闲）：取定用神（喜用第一位）后，用神与生用神者（喜神）为喜；克用神者（忌神）、
 * 用神所克者（仇神，即生忌神者）为忌；用神所生者为闲神，扶抑本就取它的仍列喜用。
 * 拿《滴天髓阐微》任注命造对照：按书上的用神看书上点名吉凶的大运、流年，同用神的九成吉、用神所生的八成多吉、
 * 生用神的七成吉，克用神的七成凶、用神所克的六成凶——任注论岁运就是看它与用神的生克。
 *
 * 权重、分界与上面几条按《滴天髓阐微》任铁樵命造校准（src/data/cases/bazi.json，脚本 scripts/bazi-cases.mjs）：
 * 写了用神的 259 造按编号尾数 0、4、7 固定留出 71 造只作验收（isUseGodHoldout），不拿来定规则；其余命造上五折交叉验证选参。
 * 与旧算法比：非留集用神第一位与书一致 118 → 124 造；非留集岁运（原书点名吉凶的大运、流年）一致 380 → 439、相反 202 → 178；
 * 留集岁运一致 57 → 67、相反 30 → 25，留集用神第一位一致 44 → 44（中和改为偏向一边取后，相反 8 → 12）。
 * 全部 510 造：岁运一致 437 → 506、相反 232 → 203；旺衰一致 141 → 139、相反 16 → 14。
 * 其后补「身旺印多，官星透出有力，足以用官」：非留集用神第一位一致 124 → 128，留集 44 → 45，岁运一致、相反的造数不变。
 * 再补「太旺宜泄」「母多灭子，顺母之性」（任注《衰旺》「五行颠倒之真机」）：岁运一致 511 → 527、相反 198 → 190
 * （非留集 365 → 373、134 → 131；留集 146 → 154、64 → 59），用神第一位非留集不变、留集 45 → 46。
 * 不处理从格、化格等特殊格局（极端时只做提示）。
 */
import { tiaoHouOf } from '../data/tiaohou.js';

const GAN_WUXING = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const WUXING = ['木', '火', '土', '金', '水'];
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
const HIDDEN_WEIGHTS = [1, 0.5, 0.3];
const HIDDEN_POSITIONS = ['本气', '中气', '余气'];
const MONTH_FACTOR = 2;
/** 四库月：所藏除本气外是上一季的余气与墓库。 */
const KU_MONTHS = new Set(['辰', '戌', '丑', '未']);
/** 身弱时找病，透干的字每个另加的分（见文件头）。 */
const TOU_WEIGHT = 0.5;
const PILLAR_ORDER = ['year', 'month', 'day', 'time'];
/** 六冲里五行相克的四对：键是被冲克的一支，值是冲它的一支（子水冲午火、酉金冲卯木、申金冲寅木、亥水冲巳火）。 */
const CHONG_BY = { 午: '子', 卯: '酉', 寅: '申', 巳: '亥' };

/** 旺衰三项打分的权重（按《滴天髓阐微》命例校准，见文件头）。 */
export const STRENGTH_SCORE = Object.freeze({
  lingSame: 1,
  lingYin: 0.75,
  lingYuqi: 0.3,
  /** 旺相休囚死：月令本气是财（囚）、官杀（死）时加的分（负数）。 */
  lingCai: -0.4,
  lingGuan: -0.5,
  branchWeight: Object.freeze({ year: 0.5, day: 1.5, time: 0.5 }),
  yinRoot: 0.5,
  diCap: 3,
  stem: 0.5,
  unknownHour: 0.4,
  /** 根所在的支被紧贴的一支冲克时打的折扣。 */
  chong: 0.6,
});

/**
 * 旺衰分档的分界：合计 ≤ extremeWeak 极弱，≤ weak 偏弱，< strong 中和，< extremeStrong 偏强，其余极强；
 * 中和档 ≥ lean 按偏旺取用，以下按偏弱取用；偏强档 ≥ tooStrong 算「太旺」，比劫多而食伤有力的先取食伤泄秀。
 */
export const STRENGTH_BOUNDS = Object.freeze({ extremeWeak: 0.5, weak: 2, strong: 2.5, extremeStrong: 4, lean: 2.15, tooStrong: 3.3 });
/** 印的分数在比劫两倍以上，算「母多」。 */
const MOTHER_HEAVY = 2;

const invert = (map) => Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key]));
const GENERATED_BY = invert(GENERATES);
const CONTROLLED_BY = invert(CONTROLS);

/** 各五行相对日主的十神类别。 */
export const getElementRoles = (dayWuxing) => ({
  [dayWuxing]: '比劫',
  [GENERATED_BY[dayWuxing]]: '印',
  [GENERATES[dayWuxing]]: '食伤',
  [CONTROLS[dayWuxing]]: '财',
  [CONTROLLED_BY[dayWuxing]]: '官杀',
});

const round1 = (value) => Math.round(value * 10) / 10;
const round2 = (value) => Math.round(value * 100) / 100;

/**
 * 运限（大运、流年、流月、流日、择日）喜忌的依据：认出疑似从、化、专旺等特殊格局时按此格论，否则按扶抑。
 * 《滴天髓·从象》「从得真者只论从，从神又有吉和凶」：成了从、化、专旺，顺其气势为吉，不再扶抑日主。
 * 拿《滴天髓阐微》命造对照：程序认出特殊格局的造，原书点名吉凶的运、年，按此格论与原书一致 125 处、相反 11 处；
 * 按扶抑一致 15 处、相反 88 处。
 * @param {object} strength analyzeStrength 的结果
 * @param {object|null} special judgeBaziPattern(...).special（favorable、unfavorable 为 [{ element, label }]）
 * @returns {object} 与 strength 同形（favorable、unfavorable、roles 可直接给 elementToneOf），另带 source：'special' | 'fuyi'
 */
export const favorBasisOf = (strength, special = null) => {
  if (!strength) return strength;
  if (!special?.favorable?.length) return { ...strength, source: 'fuyi' };
  const asRoles = (items = []) => items.map((item) => ({ element: item.element, role: item.label ?? item.role }));
  return { ...strength, favorable: asRoles(special.favorable), unfavorable: asRoles(special.unfavorable), source: 'special', specialName: special.name };
};

/** 某个五行对日主是喜用（good）、忌神（bad）还是平（neutral）。 */
export const elementToneOf = (element, strength) => {
  const favorable = strength.favorable.find((item) => item.element === element);
  if (favorable) return { element, role: favorable.role, tone: 'good' };
  const unfavorable = strength.unfavorable.find((item) => item.element === element);
  if (unfavorable) return { element, role: unfavorable.role, tone: 'bad' };
  return { element, role: strength.roles[element], tone: 'neutral' };
};

const bandOf = (total) => {
  if (total <= STRENGTH_BOUNDS.extremeWeak) return { band: '极弱', hint: '帮身的力量极少，可能需要考虑从格，请人工判断' };
  if (total <= STRENGTH_BOUNDS.weak) return { band: '偏弱', hint: '' };
  if (total < STRENGTH_BOUNDS.strong) return { band: '中和', hint: '' };
  if (total < STRENGTH_BOUNDS.extremeStrong) return { band: '偏强', hint: '' };
  return { band: '极强', hint: '帮身的力量极多，可能需要考虑专旺格，请人工判断' };
};

const neighborsOf = (key) => {
  const at = PILLAR_ORDER.indexOf(key);
  return [PILLAR_ORDER[at - 1], PILLAR_ORDER[at + 1]].filter(Boolean);
};

/**
 * 某柱地支被紧贴的一支冲克时，返回冲它的那一支（如「子」），否则 null。
 * 二不冲一：冲它的那一支两边都是这个字（午子午），不作冲论。
 */
const chongAttackerOf = (byKey, pillar) => {
  const attacker = CHONG_BY[pillar.zhi];
  if (!attacker) return null;
  return neighborsOf(pillar.key).some((key) => byKey[key]?.zhi === attacker
    && neighborsOf(key).filter((other) => byKey[other]?.zhi === pillar.zhi).length < 2) ? attacker : null;
};

/**
 * 得令、得地、得势三项打分。
 * @returns {{ total: number, ling: number, lingYuqi: { zhi: string, gan: string }|null, xiuQiu: { state: string, points: number }|null,
 *   di: number, shi: number, hourEstimate: number,
 *   roots: { key: string, name: string, zhi: string, gan: string, role: string, position: string, points: number, chong: string|null }[],
 *   stems: { key: string, name: string, gan: string, role: string, points: number }[] }}
 */
const scoreOf = (chart, dayWuxing) => {
  const yin = GENERATED_BY[dayWuxing];
  const supportRole = (element) => (element === dayWuxing ? '比劫' : element === yin ? '印' : null);
  const byKey = Object.fromEntries(chart.pillars.map((pillar) => [pillar.key, pillar]));
  const month = byKey.month;
  const monthMain = month?.hiddenGanDetails?.[0];
  const monthElement = monthMain ? GAN_WUXING[monthMain.gan] : null;
  const monthRole = monthElement ? supportRole(monthElement) : null;
  let ling = monthRole === '比劫' ? STRENGTH_SCORE.lingSame : monthRole === '印' ? STRENGTH_SCORE.lingYin : 0;
  // 辰戌丑未月：本气不帮身，所藏上一季的余气或墓库却是比劫，记一点得令。
  const yuqi = !ling && KU_MONTHS.has(month?.zhi)
    ? (month.hiddenGanDetails ?? []).slice(1).find((detail) => GAN_WUXING[detail.gan] === dayWuxing) ?? null
    : null;
  if (yuqi) ling = STRENGTH_SCORE.lingYuqi;
  // 旺相休囚死：月令是财，日主囚；是官杀，日主死。
  const xiuQiu = monthElement === CONTROLS[dayWuxing] ? { state: '囚', role: '财', points: STRENGTH_SCORE.lingCai }
    : monthElement === CONTROLLED_BY[dayWuxing] ? { state: '死', role: '官杀', points: STRENGTH_SCORE.lingGuan } : null;

  const roots = [];
  chart.pillars.forEach((pillar) => {
    const weight = STRENGTH_SCORE.branchWeight[pillar.key];
    if (!weight || !pillar.zhi) return;
    const chong = chongAttackerOf(byKey, pillar);
    pillar.hiddenGanDetails.forEach((detail, index) => {
      const role = supportRole(GAN_WUXING[detail.gan]);
      if (!role) return;
      const points = weight * (HIDDEN_WEIGHTS[index] ?? 0.3) * (role === '印' ? STRENGTH_SCORE.yinRoot : 1) * (chong ? STRENGTH_SCORE.chong : 1);
      roots.push({ key: pillar.key, name: pillar.name, zhi: pillar.zhi, gan: detail.gan, role, position: HIDDEN_POSITIONS[index] ?? '余气', points, chong });
    });
  });
  const di = Math.min(roots.reduce((sum, item) => sum + item.points, 0), STRENGTH_SCORE.diCap);

  const stems = chart.pillars
    .filter((pillar) => pillar.key !== 'day' && pillar.gan && supportRole(pillar.ganWuxing))
    .map((pillar) => ({ key: pillar.key, name: pillar.name, gan: pillar.gan, role: supportRole(pillar.ganWuxing), points: STRENGTH_SCORE.stem }));
  const shi = stems.length * STRENGTH_SCORE.stem;
  const hourEstimate = chart.pillars.some((pillar) => pillar.key === 'time' && !pillar.gan) ? STRENGTH_SCORE.unknownHour : 0;

  return {
    total: round2(ling + (xiuQiu?.points ?? 0) + di + shi + hourEstimate),
    ling,
    lingYuqi: yuqi ? { zhi: month.zhi, gan: yuqi.gan } : null,
    xiuQiu,
    di: round2(di),
    shi: round2(shi),
    hourEstimate,
    roots: roots.map((item) => ({ ...item, points: round2(item.points) })),
    stems,
  };
};

/** 寒暖调候为急的月令：冬月与正月寒，宜火；夏月燥，宜水。 */
const URGENT_TIAOHOU = Object.freeze({
  亥: { element: '火', label: '冬月寒冷' }, 子: { element: '火', label: '冬月寒冷' }, 丑: { element: '火', label: '冬月寒冷' },
  寅: { element: '火', label: '正月余寒' },
  巳: { element: '水', label: '夏月炎燥' }, 午: { element: '水', label: '夏月炎燥' }, 未: { element: '水', label: '夏月炎燥' },
});

/** 有根：在某一支的藏干里（本气、中气、余气都算）。 */
const rootedElementsOf = (chart) => new Set(chart.pillars.flatMap((pillar) => (pillar.hiddenGanDetails ?? []).map((detail) => GAN_WUXING[detail.gan])));

/** 透干的字地支无根，但生它的五行在原局力量这么多以上（有源，如杀重透印、杀印相生），仍算有力。 */
const SOURCE_SCORE = 3;

/**
 * 有力：某一支的本气；或透在年、月、时干而有根——在地支藏干里，或坐下本气生它（「庚金得载」），
 * 或生它的五行力量足（有源），或身旺时是食伤（日主生它）。透干而无根无源的不算（任注「土金无根，置之不用」）。
 */
const usableElementsOf = (chart, { strong = false, scores = {} } = {}) => {
  const rooted = rootedElementsOf(chart);
  const dayWuxing = chart.dayMaster.wuxing;
  const carried = (pillar) => {
    const main = pillar.hiddenGanDetails?.[0];
    return Boolean(main && GENERATES[GAN_WUXING[main.gan]] === pillar.ganWuxing);
  };
  return new Set(chart.pillars.flatMap((pillar) => [
    pillar.key !== 'day' && pillar.gan && (rooted.has(pillar.ganWuxing) || carried(pillar) || (scores[GENERATED_BY[pillar.ganWuxing]] ?? 0) >= SOURCE_SCORE
      || (strong && pillar.ganWuxing === GENERATES[dayWuxing]))
      ? pillar.ganWuxing : null,
    pillar.hiddenGanDetails?.[0] ? GAN_WUXING[pillar.hiddenGanDetails[0].gan] : null,
  ]).filter(Boolean));
};

/**
 * 扶抑取用：按旺衰与病因排出喜用、忌神的五行，并给一句取用思路。
 * 有力（见 usableElementsOf）的排前，同样有力的保持原先的先后。中和按 lean 分界偏向一边取。
 */
const supportAndRestrain = ({ band, total, scores, dayWuxing, usable, touCounts = {} }) => {
  const yin = GENERATED_BY[dayWuxing];
  const output = GENERATES[dayWuxing];
  const wealth = CONTROLS[dayWuxing];
  const officer = CONTROLLED_BY[dayWuxing];
  const usableFirst = (elements) => [...elements.filter((element) => usable.has(element)), ...elements.filter((element) => !usable.has(element))];
  const byScoreDesc = (elements) => [...elements].sort((a, b) => scores[b] - scores[a]);

  if (band === '中和') {
    const leanStrong = total >= STRENGTH_BOUNDS.lean;
    const leaned = supportAndRestrain({ band: leanStrong ? '偏强' : '偏弱', total, scores, dayWuxing, usable, touCounts });
    return { ...leaned, basis: `日主中和略偏${leanStrong ? '旺' : '弱'}，${leaned.basis}` };
  }

  if (band === '偏弱' || band === '极弱') {
    const weightOf = (element) => scores[element] + TOU_WEIGHT * (touCounts[element] ?? 0);
    const heaviest = [output, wealth, officer].sort((a, b) => weightOf(b) - weightOf(a))[0];
    let favorable;
    let basis;
    if (heaviest === wealth) {
      favorable = [dayWuxing, yin];
      basis = '身弱财重，取比劫帮身，印次之';
    } else if (heaviest === officer) {
      if (!usable.has(yin) && usable.has(output)) {
        favorable = [output, yin, dayWuxing];
        basis = '身弱官杀重，印星无力，取食伤制杀';
      } else {
        favorable = [yin, dayWuxing];
        basis = '身弱官杀重，取印化杀生身，比劫次之';
      }
    } else {
      favorable = [yin, dayWuxing];
      basis = '身弱食伤重，取印制伤生身，比劫次之';
    }
    favorable = usableFirst(favorable);
    const unfavorable = byScoreDesc([output, wealth, officer].filter((element) => !favorable.includes(element)));
    return { favorable, unfavorable, basis };
  }

  let favorable;
  let basis;
  // 母多灭子：印在比劫两倍以上，财星、食伤都无力，破不了印、也泄不动，只得顺母之性，以比劫帮身为用，
  // 财星犯母、官杀生印为忌（任注「土重金埋，母多灭子……一交庚申，助起日元，顺母之性，大得际遇」
  // 「一交壬运，水木齐来，犯母之性」「春初嫩木……子申拱水，乃母多灭子也」）。
  if (scores[yin] > scores[dayWuxing] && !usable.has(wealth) && !usable.has(output) && scores[yin] >= MOTHER_HEAVY * scores[dayWuxing]) {
    return { favorable: [dayWuxing, yin], unfavorable: byScoreDesc([wealth, officer, output]), basis: '印多灭子，财星、食伤无力，顺母之性，取比劫帮身' };
  }
  if (scores[yin] > scores[dayWuxing] && !usable.has(wealth)) {
    // 印多身旺而财星无力：官杀生印、印又生身，官杀不作喜用，列为忌神（有财破印、滋杀的，官杀照旧可用）。
    // 拿《滴天髓阐微》命造的岁运对照：身旺印多的造，官杀运原书判凶的多（前后两半命造都是如此）。
    favorable = [wealth, output];
    basis = '身旺印多，取财破印，食伤次之；官杀生印，为忌';
    favorable = usableFirst(favorable);
    if (total >= STRENGTH_BOUNDS.extremeStrong) {
      favorable = [output, wealth];
      basis = '旺极宜泄，先取食伤泄秀；官杀生印，为忌';
    }
    return { favorable, unfavorable: byScoreDesc([yin, dayWuxing, officer]), basis };
  }
  if (scores[yin] > scores[dayWuxing]) {
    favorable = [wealth, output, officer];
    basis = '身旺印多，取财破印，食伤、官杀次之';
    // 财星有力，官星又透出有力（有根、坐下生它或有源，见 usableElementsOf）、不比印重的，身旺足以用官
    // （任注「日元生旺，足以用官」「身旺用官」；庚午 己卯 壬申 己酉「喜其官印通根，年支逢财……日元生旺，足以用官」）。
    // 官杀比印还重的，官杀本身就是病，仍取财破印。
    if (usable.has(officer) && (touCounts[officer] ?? 0) > 0 && scores[officer] < scores[yin]) {
      favorable = [officer, wealth, output];
      basis = '身旺印多，官星透出有力，足以用官，财、食伤次之';
    }
  } else if (total >= STRENGTH_BOUNDS.tooStrong && usable.has(output)) {
    // 太旺（3.3 分以上、未到旺极）：官杀逆其旺势反激，宜食伤泄秀（任注「木太旺者而似金，喜火之炼也」
    // 「水太旺者而似土，喜木之制也」；戊辰 乙丑 戊戌 辛酉「重重厚土……伤官又旺，其势足以敌官星之寡。
    // 故初交丙寅丁卯，官星得地，刑耗多端」）。
    favorable = [output, wealth, officer];
    basis = '身旺太过，官杀逆其旺势，取食伤泄秀，财次之';
  } else {
    favorable = [officer, output, wealth];
    basis = usable.has(officer) ? '身旺比劫多，取官杀制劫，食伤、财次之' : '身旺比劫多，官杀无力，取食伤泄秀';
  }
  if (total >= STRENGTH_BOUNDS.extremeStrong) {
    favorable = [output, ...favorable.filter((element) => element !== output)];
    basis = '旺极宜泄，先取食伤泄秀';
  }
  favorable = usableFirst(favorable);
  return { favorable, unfavorable: byScoreDesc([yin, dayWuxing]), basis };
};

/**
 * 用、喜、忌、仇、闲：取定用神后，用神与生用神者为喜；克用神者（忌神）、用神所克者（仇神）为忌；
 * 用神所生者为闲神，扶抑本就取它的仍列喜用。
 */
const godsAroundYong = (favorable) => {
  const yong = favorable[0];
  if (!yong) return { favorable, unfavorable: [] };
  const xi = GENERATED_BY[yong];
  const xian = GENERATES[yong];
  const kept = favorable.filter((element) => element === yong || element === xi || element === xian);
  return {
    favorable: kept.includes(xi) ? kept : [...kept, xi],
    unfavorable: [CONTROLLED_BY[yong], CONTROLS[yong]],
  };
};

export const analyzeStrength = (chart) => {
  const dayWuxing = chart.dayMaster.wuxing;
  const roles = getElementRoles(dayWuxing);
  const support = new Set([dayWuxing, GENERATED_BY[dayWuxing]]);
  const scores = Object.fromEntries(WUXING.map((element) => [element, 0]));
  const byKey = Object.fromEntries(chart.pillars.map((pillar) => [pillar.key, pillar]));

  chart.pillars.forEach((pillar) => {
    if (!pillar.gan) return; // 时辰不详时没有时柱
    if (pillar.key !== 'day') scores[pillar.ganWuxing] += 1;
    const factor = pillar.key === 'month' ? MONTH_FACTOR : 1;
    pillar.hiddenGanDetails.forEach((detail, index) => {
      scores[GAN_WUXING[detail.gan]] += (HIDDEN_WEIGHTS[index] ?? 0.3) * factor;
    });
  });

  const total = WUXING.reduce((sum, element) => sum + scores[element], 0);
  const supportScore = [...support].reduce((sum, element) => sum + scores[element], 0);
  const ratio = total ? supportScore / total : 0;
  const score = scoreOf(chart, dayWuxing);
  const { band, hint } = bandOf(score.total);

  const monthMain = byKey.month?.hiddenGanDetails?.[0];
  const deLing = Boolean(monthMain && support.has(GAN_WUXING[monthMain.gan]));
  const deDi = chart.pillars
    .filter((pillar) => pillar.hiddenGanDetails.some((detail) => support.has(GAN_WUXING[detail.gan])))
    .map((pillar) => ({
      name: pillar.name,
      zhi: pillar.zhi,
      tongGen: pillar.hiddenGanDetails.some((detail) => GAN_WUXING[detail.gan] === dayWuxing),
    }));
  const deShi = chart.pillars
    .filter((pillar) => pillar.key !== 'day' && support.has(pillar.ganWuxing))
    .map((pillar) => ({ name: pillar.name, gan: pillar.gan, role: roles[pillar.ganWuxing] }));

  const tiaoHou = tiaoHouOf(chart.dayMaster.gan, byKey.month?.zhi ?? '');
  const leansStrong = band === '偏强' || band === '极强' || (band === '中和' && score.total >= STRENGTH_BOUNDS.lean);
  const usable = usableElementsOf(chart, { strong: leansStrong, scores });
  const touCounts = {};
  chart.pillars.forEach((pillar) => {
    if (pillar.key !== 'day' && pillar.gan) touCounts[pillar.ganWuxing] = (touCounts[pillar.ganWuxing] ?? 0) + 1;
  });
  const fuYi = supportAndRestrain({ band, total: score.total, scores, dayWuxing, usable, touCounts });
  const { basis } = fuYi;
  let { favorable } = fuYi;
  let urgent = null;
  if (tiaoHou) {
    const element = tiaoHou.element;
    urgent = URGENT_TIAOHOU[byKey.month?.zhi]?.element === element && usable.has(element) && rootedElementsOf(chart).has(element)
      ? URGENT_TIAOHOU[byKey.month.zhi] : null;
    if (urgent) favorable = [element, ...favorable.filter((item) => item !== element)];
    else if (!favorable.includes(element)) favorable = [...favorable, element];
  }
  const gods = godsAroundYong(favorable);
  favorable = gods.favorable;
  const unfavorable = gods.unfavorable;
  const yong = favorable[0];

  let tiaoHouNote = '';
  if (tiaoHou) {
    const element = tiaoHou.element;
    if (urgent) tiaoHouNote = `${urgent.label}，调候为急：${element}有力有根，${fuYi.unfavorable.includes(element) ? `扶抑虽嫌${element}，仍` : ''}取${element}为先`;
    else if (yong === element || fuYi.favorable[0] === element) tiaoHouNote = `调候宜${element}，与扶抑取用一致`;
    else if (favorable.includes(element)) tiaoHouNote = `调候宜${element}，${element}${GENERATES[element] === yong ? '生用神' : '与用神相生'}，同列喜用`;
    else if (unfavorable.includes(element)) tiaoHouNote = `调候宜${element}，但${element}${CONTROLS[element] === yong ? '克用神' : '为用神所克'}，以用神为重，不作喜用`;
    else tiaoHouNote = `调候宜${element}，${element}为用神所生（闲神），可作参考`;
  }
  const describe = (element) => ({
    element,
    role: roles[element],
    tiaoHou: tiaoHou?.element === element,
    usable: usable.has(element),
  });

  return {
    dayWuxing,
    scores: Object.fromEntries(WUXING.map((element) => [element, round1(scores[element])])),
    percents: Object.fromEntries(WUXING.map((element) => [element, total ? Math.round((scores[element] / total) * 100) : 0])),
    roles,
    supportScore: round1(supportScore),
    total: round1(total),
    ratio,
    score,
    band,
    hint,
    deLing,
    monthMain: monthMain ? { gan: monthMain.gan, role: roles[GAN_WUXING[monthMain.gan]] } : null,
    deDi,
    deShi,
    tiaoHou,
    basis,
    tiaoHouNote,
    favorable: favorable.map(describe),
    unfavorable: unfavorable.map(describe),
  };
};
