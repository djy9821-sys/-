/**
 * 日主旺衰与喜用的程序估算（仅供参考）
 *
 * 五行力量：天干每字 1 分（日干本身不计）；地支按藏干计，本气 1、中气 0.5、余气 0.3；
 * 月令地支的藏干再乘 2。同党 = 比劫 + 印，异党 = 食伤 + 财 + 官杀。
 * 另外给出得令、得地、得势与调候，喜用按“扶弱抑强 + 调候”给出参考方向，
 * 不处理从格、化格等特殊格局（极端比例时只做提示）。
 *
 * 调候按《穷通宝鉴》调候用神表（src/data/tiaohou.js）查日干与月令：主用神的五行列为喜用之首，
 * 并从忌神里剔除；次用神只随附说明，不改排序。
 */
import { tiaoHouOf } from '../data/tiaohou.js';

const GAN_WUXING = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const WUXING = ['木', '火', '土', '金', '水'];
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
const HIDDEN_WEIGHTS = [1, 0.5, 0.3];
const MONTH_FACTOR = 2;

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

/** 某个五行对日主是喜用（good）、忌神（bad）还是平（neutral）。 */
export const elementToneOf = (element, strength) => {
  const favorable = strength.favorable.find((item) => item.element === element);
  if (favorable) return { element, role: favorable.role, tone: 'good' };
  const unfavorable = strength.unfavorable.find((item) => item.element === element);
  if (unfavorable) return { element, role: unfavorable.role, tone: 'bad' };
  return { element, role: strength.roles[element], tone: 'neutral' };
};

const bandOf = (ratio) => {
  if (ratio < 0.2) return { band: '极弱', hint: '同党极少，可能需要考虑从格，请人工判断' };
  if (ratio < 0.45) return { band: '偏弱', hint: '' };
  if (ratio <= 0.6) return { band: '中和', hint: '' };
  if (ratio <= 0.8) return { band: '偏强', hint: '' };
  return { band: '极强', hint: '同党极多，可能需要考虑专旺格，请人工判断' };
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
  const { band, hint } = bandOf(ratio);

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
  const weakSide = [GENERATED_BY[dayWuxing], dayWuxing];
  const strongSide = [GENERATES[dayWuxing], CONTROLS[dayWuxing], CONTROLLED_BY[dayWuxing]];
  let favorable;
  let unfavorable;
  if (band === '偏弱' || band === '极弱') {
    favorable = weakSide;
    unfavorable = [...strongSide].sort((a, b) => scores[b] - scores[a]);
  } else if (band === '偏强' || band === '极强') {
    favorable = [...strongSide].sort((a, b) => scores[a] - scores[b]);
    unfavorable = weakSide;
  } else {
    favorable = [];
    unfavorable = [];
  }
  if (tiaoHou) {
    favorable = [tiaoHou.element, ...favorable.filter((element) => element !== tiaoHou.element)];
    unfavorable = unfavorable.filter((element) => element !== tiaoHou.element);
  }
  const describe = (element) => ({
    element,
    role: roles[element],
    tiaoHou: tiaoHou?.element === element,
  });

  return {
    dayWuxing,
    scores: Object.fromEntries(WUXING.map((element) => [element, round1(scores[element])])),
    percents: Object.fromEntries(WUXING.map((element) => [element, total ? Math.round((scores[element] / total) * 100) : 0])),
    roles,
    supportScore: round1(supportScore),
    total: round1(total),
    ratio,
    band,
    hint,
    deLing,
    monthMain: monthMain ? { gan: monthMain.gan, role: roles[GAN_WUXING[monthMain.gan]] } : null,
    deDi,
    deShi,
    tiaoHou,
    favorable: favorable.map(describe),
    unfavorable: unfavorable.map(describe),
  };
};
