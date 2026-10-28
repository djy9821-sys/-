/**
 * 日主旺衰与喜用的程序估算（仅供参考）
 *
 * 五行力量（显示用）：天干每字 1 分（日干本身不计）；地支按藏干计，本气 1、中气 0.5、余气 0.3；
 * 月令地支的藏干再乘 2。同党 = 比劫 + 印，异党 = 食伤 + 财 + 官杀。
 *
 * 旺衰按得令、得地、得势三项打分（STRENGTH_SCORE）：
 * - 得令：月令本气是比劫 1 分，是印 0.5 分；
 * - 得地：年、日、时三支藏干里的比劫按本气 1、中气 0.5、余气 0.3 计，印减半；日支乘 1.5，年支、时支乘 0.5
 *   （月支已算在得令里），合计最多 3 分；
 * - 得势：年、月、时干每见一个比劫或印 0.5 分；
 * - 时辰不详时，时柱按平均 0.4 分估。
 * 合计 0.5 分及以下极弱、2 分及以下偏弱、2.5 分以下中和、4 分以下偏强，4 分及以上极强。
 * 权重与分界按《滴天髓阐微》任铁樵明说日主旺衰的命造校准（src/data/cases/bazi.json，脚本 scripts/bazi-cases.mjs）：
 * 45 造留一交叉验证，与书一致 37 造、书说旺而程序说弱（或反过来）2 造；原先按同党比例分档（45%、60%）
 * 只一致 27 造、相反 8 造，而且随机命盘有六成以上判成偏弱。
 *
 * 喜用按「扶抑」取用（子平与《滴天髓》通行取法），透干或在地支作本气、确实有力的五行排前：
 * - 身弱：看食伤、财、官杀哪一方最重——财重取比劫帮身；食伤重取印制伤生身；官杀重取印化杀，
 *   印无力而食伤有力时取食伤制杀；
 * - 身旺：看印、比劫哪一方多——印多取财破印；比劫多取官杀制劫（官杀无力就取食伤泄秀）；旺极（4 分及以上）先取食伤泄秀；
 * - 中和：不硬分喜忌。
 * 调候按《穷通宝鉴》调候用神表（src/data/tiaohou.js）查日干与月令：主用神的五行附在喜用末尾，并从忌神里剔除。
 * 同一批命例里，任氏明说的第一用神与程序喜用之首一致的，扶抑取用（调候附后）比调候排第一多一倍以上，见 test/bazi-cases.test.js。
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

/** 旺衰三项打分的权重（按《滴天髓阐微》命例校准，见文件头）。 */
export const STRENGTH_SCORE = Object.freeze({
  lingSame: 1,
  lingYin: 0.5,
  branchWeight: Object.freeze({ year: 0.5, day: 1.5, time: 0.5 }),
  yinRoot: 0.5,
  diCap: 3,
  stem: 0.5,
  unknownHour: 0.4,
});

/** 旺衰分档的分界：合计 ≤ extremeWeak 极弱，≤ weak 偏弱，< strong 中和，< extremeStrong 偏强，其余极强。 */
export const STRENGTH_BOUNDS = Object.freeze({ extremeWeak: 0.5, weak: 2, strong: 2.5, extremeStrong: 4 });

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

/**
 * 得令、得地、得势三项打分。
 * @returns {{ total: number, ling: number, di: number, shi: number, hourEstimate: number,
 *   roots: { key: string, name: string, zhi: string, gan: string, role: string, position: string, points: number }[],
 *   stems: { key: string, name: string, gan: string, role: string, points: number }[] }}
 */
const scoreOf = (chart, dayWuxing) => {
  const yin = GENERATED_BY[dayWuxing];
  const supportRole = (element) => (element === dayWuxing ? '比劫' : element === yin ? '印' : null);
  const month = chart.pillars.find((pillar) => pillar.key === 'month');
  const monthMain = month?.hiddenGanDetails?.[0];
  const monthRole = monthMain ? supportRole(GAN_WUXING[monthMain.gan]) : null;
  const ling = monthRole === '比劫' ? STRENGTH_SCORE.lingSame : monthRole === '印' ? STRENGTH_SCORE.lingYin : 0;

  const roots = [];
  chart.pillars.forEach((pillar) => {
    const weight = STRENGTH_SCORE.branchWeight[pillar.key];
    if (!weight || !pillar.zhi) return;
    pillar.hiddenGanDetails.forEach((detail, index) => {
      const role = supportRole(GAN_WUXING[detail.gan]);
      if (!role) return;
      const points = weight * (HIDDEN_WEIGHTS[index] ?? 0.3) * (role === '印' ? STRENGTH_SCORE.yinRoot : 1);
      roots.push({ key: pillar.key, name: pillar.name, zhi: pillar.zhi, gan: detail.gan, role, position: HIDDEN_POSITIONS[index] ?? '余气', points });
    });
  });
  const di = Math.min(roots.reduce((sum, item) => sum + item.points, 0), STRENGTH_SCORE.diCap);

  const stems = chart.pillars
    .filter((pillar) => pillar.key !== 'day' && pillar.gan && supportRole(pillar.ganWuxing))
    .map((pillar) => ({ key: pillar.key, name: pillar.name, gan: pillar.gan, role: supportRole(pillar.ganWuxing), points: STRENGTH_SCORE.stem }));
  const shi = stems.length * STRENGTH_SCORE.stem;
  const hourEstimate = chart.pillars.some((pillar) => pillar.key === 'time' && !pillar.gan) ? STRENGTH_SCORE.unknownHour : 0;

  return {
    total: round2(ling + di + shi + hourEstimate),
    ling,
    di: round2(di),
    shi: round2(shi),
    hourEstimate,
    roots: roots.map((item) => ({ ...item, points: round2(item.points) })),
    stems,
  };
};

/** 有力：透在年、月、时干，或是某一支的本气。 */
const usableElementsOf = (chart) => new Set(chart.pillars.flatMap((pillar) => [
  pillar.key !== 'day' && pillar.gan ? pillar.ganWuxing : null,
  pillar.hiddenGanDetails?.[0] ? GAN_WUXING[pillar.hiddenGanDetails[0].gan] : null,
]).filter(Boolean));

/**
 * 扶抑取用：按旺衰与病因排出喜用、忌神的五行，并给一句取用思路。
 * 有力（透干或作本气）的排前，同样有力的保持原先的先后。
 */
const supportAndRestrain = ({ band, total, scores, dayWuxing, usable }) => {
  const yin = GENERATED_BY[dayWuxing];
  const output = GENERATES[dayWuxing];
  const wealth = CONTROLS[dayWuxing];
  const officer = CONTROLLED_BY[dayWuxing];
  const usableFirst = (elements) => [...elements.filter((element) => usable.has(element)), ...elements.filter((element) => !usable.has(element))];
  const byScoreDesc = (elements) => [...elements].sort((a, b) => scores[b] - scores[a]);

  if (band === '偏弱' || band === '极弱') {
    const heaviest = byScoreDesc([output, wealth, officer])[0];
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

  if (band === '偏强' || band === '极强') {
    let favorable;
    let basis;
    if (scores[yin] > scores[dayWuxing]) {
      favorable = [wealth, output, officer];
      basis = '身旺印多，取财破印，食伤、官杀次之';
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
  }

  return { favorable: [], unfavorable: [], basis: '日主中和，喜忌不硬分，需结合调候与格局看' };
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
  const usable = usableElementsOf(chart);
  const fuYi = supportAndRestrain({ band, total: score.total, scores, dayWuxing, usable });
  const { basis } = fuYi;
  let { favorable, unfavorable } = fuYi;
  let tiaoHouNote = '';
  if (tiaoHou) {
    const element = tiaoHou.element;
    if (favorable.includes(element)) tiaoHouNote = `调候宜${element}，与扶抑取用一致`;
    else if (unfavorable.includes(element)) tiaoHouNote = `调候宜${element}，扶抑却嫌${element}，两说并存：${element}列在喜用末尾，不算忌神`;
    else tiaoHouNote = `调候宜${element}，附在喜用末尾`;
    if (!favorable.includes(element)) favorable = [...favorable, element];
    unfavorable = unfavorable.filter((item) => item !== element);
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
