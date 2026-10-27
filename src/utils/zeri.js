/**
 * 择日助手（程序初选，仅供参考）
 *
 * 在一段日期范围内，为某一类事务（签约、开业、搬家、嫁娶、出行、动工、就医、入学……）
 * 逐日打分并排序。分数由四类依据累加，每一条都写进理由，方便人工复核：
 *   1. 黄历：当日宜忌是否包含这类事务、建除十二神、十二值神黄道黑道；
 *   2. 流日干支对日主的喜忌（按 baziStrength 估算的喜用、忌神）；
 *   3. 流日与本命四柱的合冲刑害：冲日支、天克地冲日柱为硬忌，六合日支加分；
 *   4. 流日与当年太岁、当月月建相冲（岁破、月破）。
 * 硬忌（破日、岁破、冲日支、天克地冲日柱、黄历忌此事、诸事不宜）不论得分一律列为「忌」。结果只看用事者本人的命局，不涉及对方生辰、方位等。
 */
import { Solar } from 'lunar-javascript';
import { describeGanZhi } from './baziChart.js';
import { getGanPairKinds, getZhiPairKinds, isTianKeDiChong } from './baziRelations.js';
import { elementToneOf } from './baziStrength.js';

export const ZERI_PURPOSES = Object.freeze([
  { value: 'general', label: '一般要事', hint: '签字、会面、面试、提交申请等没有专门名目的事', yi: ['会亲友', '见贵', '赴任', '祈福'], ji: [] },
  { value: 'contract', label: '签约谈判', hint: '签合同、谈合作、交定金', yi: ['立券', '交易', '立券交易', '订盟', '纳财', '求财'], ji: ['立券', '交易', '立券交易', '纳财'] },
  { value: 'opening', label: '开业开市', hint: '开业、开张、挂牌、上新', yi: ['开市', '开张', '开业', '挂匾', '纳财', '立券', '交易'], ji: ['开市', '开张', '开业', '纳财'] },
  { value: 'moving', label: '搬家入宅', hint: '搬家、入住新居、安床', yi: ['移徙', '入宅', '安床', '安香', '安门'], ji: ['移徙', '入宅', '安床'] },
  { value: 'wedding', label: '订婚嫁娶', hint: '订婚、登记、婚礼', yi: ['嫁娶', '订婚', '纳采', '订盟', '问名', '合帐'], ji: ['嫁娶', '订婚', '纳采', '订盟'] },
  { value: 'travel', label: '出行远行', hint: '出差、长途旅行、启程赴任', yi: ['出行', '赴任', '乘船', '渡水'], ji: ['出行', '乘船', '渡水'] },
  { value: 'construction', label: '动工装修', hint: '开工、装修、拆改、上梁', yi: ['动土', '起基', '起基动土', '修造', '竖柱', '上梁', '拆卸', '造屋', '盖屋'], ji: ['动土', '起基', '起基动土', '修造', '竖柱', '上梁', '拆卸'] },
  { value: 'medical', label: '就医手术', hint: '择期手术、重要检查、开始疗程', yi: ['求医', '治病', '求医疗病', '针灸', '解除'], ji: ['求医', '治病', '求医疗病', '针灸', '探病'] },
  { value: 'study', label: '入学考试', hint: '报名入学、考试、面试、求职', yi: ['入学', '习艺', '见贵', '赴任'], ji: ['赴任', '见贵'] },
]);

export const ZERI_RANGES = Object.freeze([
  { value: 30, label: '30 天' },
  { value: 60, label: '60 天' },
  { value: 90, label: '90 天' },
]);

export const ZERI_GRADES = Object.freeze({
  good: { label: '佳', tone: 'good' },
  ok: { label: '可', tone: 'good' },
  plain: { label: '平', tone: 'neutral' },
  avoid: { label: '忌', tone: 'bad' },
});

// 建满平收黑，除危定执黄，成开皆可用，闭破不相当。
const ZHI_XING_SCORE = { 建: 0, 除: 1, 满: 0, 平: 0, 定: 1, 执: 1, 破: -3, 危: 1, 成: 1, 收: 0, 开: 1, 闭: -1 };
const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
const PILLAR_WORD = { year: '年支', month: '月支', day: '日支', time: '时支' };
const MAX_DAYS = 120;

const pad = (value) => String(value).padStart(2, '0');
const ymdOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseYmd = (ymd) => {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(ymd ?? '');
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

export const findZeriPurpose = (value) => ZERI_PURPOSES.find((item) => item.value === value) ?? ZERI_PURPOSES[0];

const gradeOf = (score, hardAvoid) => {
  if (hardAvoid) return 'avoid';
  if (score >= 4) return 'good';
  if (score >= 1) return 'ok';
  if (score >= -2) return 'plain';
  return 'avoid';
};

const toneOf = (delta) => (delta > 0 ? 'good' : delta < 0 ? 'bad' : 'neutral');

/** 给一天打分：返回理由列表、总分、是否硬忌。 */
const evaluateDay = ({ lunar, dayPillar, almanac }, chart, strength, purpose) => {
  const reasons = [];
  let hardAvoid = false;
  const add = (text, delta, { hard = false } = {}) => {
    reasons.push({ text, delta, tone: toneOf(delta), hard });
    if (hard) hardAvoid = true;
  };

  // 1. 黄历
  if (almanac.ji.includes('诸事不宜') || almanac.yi.includes('诸事不宜')) {
    add('黄历诸事不宜', -4, { hard: true });
  } else {
    const yiHits = purpose.yi.filter((item) => almanac.yi.includes(item));
    const jiHits = purpose.ji.filter((item) => almanac.ji.includes(item));
    if (jiHits.length) add(`黄历忌${[...new Set(jiHits)].slice(0, 3).join('、')}`, -3, { hard: true });
    else if (yiHits.length) add(`黄历宜${[...new Set(yiHits)].slice(0, 3).join('、')}`, 2);
    else if (almanac.yi.includes('馀事勿取')) add('黄历馀事勿取', -1);
  }
  // 建除的「破」就是冲月建之日（月破），只记一条。
  const monthZhi = lunar.getMonthInGanZhiExact().slice(1);
  const zhiXingScore = ZHI_XING_SCORE[almanac.zhiXing] ?? 0;
  if (almanac.zhiXing === '破') add(`破日（月破，冲月建${monthZhi}）`, zhiXingScore, { hard: true });
  else if (zhiXingScore) add(`${almanac.zhiXing}日（建除）`, zhiXingScore);
  if (almanac.tianShenLuck === '吉') add(`值神${almanac.tianShen}（黄道）`, 1);
  else if (almanac.tianShenLuck === '凶') add(`值神${almanac.tianShen}（黑道）`, -1);

  // 2. 喜忌
  if (strength?.favorable) {
    const gan = elementToneOf(dayPillar.ganWuxing, strength);
    const zhi = elementToneOf(dayPillar.zhiWuxing, strength);
    if (gan.tone === 'good') add(`日干${dayPillar.gan}${gan.element}为喜用（${gan.role}）`, 1);
    if (gan.tone === 'bad') add(`日干${dayPillar.gan}${gan.element}为忌神（${gan.role}）`, -1);
    if (zhi.tone === 'good') add(`日支${dayPillar.zhi}${zhi.element}为喜用（${zhi.role}）`, 1);
    if (zhi.tone === 'bad') add(`日支${dayPillar.zhi}${zhi.element}为忌神（${zhi.role}）`, -1);
  }

  // 3. 与本命四柱
  const natalDay = chart.pillars.find((pillar) => pillar.key === 'day') ?? null;
  const fanYinDay = Boolean(natalDay?.gan) && dayPillar.ganZhi !== natalDay.ganZhi && isTianKeDiChong(dayPillar, natalDay);
  if (natalDay?.gan) {
    if (dayPillar.ganZhi === natalDay.ganZhi) add(`伏吟日柱（与本命日柱同为${natalDay.ganZhi}）`, -1);
    else if (fanYinDay) add(`天克地冲本命日柱${natalDay.ganZhi}`, -4, { hard: true });
    const ganKinds = getGanPairKinds(dayPillar.gan, natalDay.gan);
    if (ganKinds.includes('合')) add(`日干${dayPillar.gan}与日主${natalDay.gan}相合`, 1);
  }
  chart.pillars.forEach((pillar) => {
    if (!pillar.zhi) return;
    const kinds = getZhiPairKinds(dayPillar.zhi, pillar.zhi);
    const word = PILLAR_WORD[pillar.key];
    const isDay = pillar.key === 'day';
    if (kinds.includes('冲')) {
      if (isDay) {
        if (!fanYinDay) add(`冲本命日支${pillar.zhi}`, -3, { hard: true });
      } else {
        add(`冲本命${word}${pillar.zhi}`, pillar.key === 'year' ? -2 : -1);
      }
    }
    if (isDay && (kinds.includes('刑') || kinds.includes('自刑'))) add(`刑本命日支${pillar.zhi}`, -1);
    if (isDay && kinds.includes('害')) add(`害本命日支${pillar.zhi}`, -1);
    if (kinds.includes('合')) add(`与本命${word}${pillar.zhi}六合`, isDay ? 2 : 1);
    else if (isDay && kinds.includes('半合')) add(`与本命日支${pillar.zhi}半合`, 1);
  });

  // 4. 太岁
  const yearZhi = lunar.getYearInGanZhiExact().slice(1);
  if (getZhiPairKinds(dayPillar.zhi, yearZhi).includes('冲')) add(`岁破（冲太岁${yearZhi}）`, -3, { hard: true });

  const score = reasons.reduce((sum, reason) => sum + reason.delta, 0);
  return { reasons, score, hardAvoid };
};

/**
 * @param {object} chart buildBaziChart 的结果
 * @param {object|null} strength analyzeStrength 的结果（可为 null）
 * @param {{ purpose?: string, startDate?: string, days?: number, now?: Date }} options
 */
export const pickAuspiciousDays = (chart, strength, { purpose = 'general', startDate = '', days = 30, now = new Date() } = {}) => {
  if (!chart?.pillars?.length || !chart.dayMaster?.gan) throw new Error('缺少八字命盘');
  const purposeInfo = findZeriPurpose(purpose);
  const start = parseYmd(startDate) ?? new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const count = Math.min(Math.max(Number(days) || 30, 1), MAX_DAYS);
  const dayGan = chart.dayMaster.gan;
  const today = ymdOf(now);

  const list = [];
  for (let offset = 0; offset < count; offset += 1) {
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    const solar = Solar.fromYmd(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    const lunar = solar.getLunar();
    const dayPillar = describeGanZhi(lunar.getDayInGanZhi(), dayGan);
    const almanac = {
      yi: lunar.getDayYi(),
      ji: lunar.getDayJi(),
      zhiXing: lunar.getZhiXing(),
      tianShen: lunar.getDayTianShen(),
      tianShenLuck: lunar.getDayTianShenLuck(),
      chong: lunar.getDayChongDesc(),
    };
    const { reasons, score, hardAvoid } = evaluateDay({ lunar, dayPillar, almanac }, chart, strength, purposeInfo);
    const date = ymdOf(cursor);
    list.push({
      date,
      year: cursor.getFullYear(),
      month: cursor.getMonth() + 1,
      day: cursor.getDate(),
      weekday: cursor.getDay(),
      weekdayLabel: `周${WEEKDAY_NAMES[cursor.getDay()]}`,
      lunarText: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      jieQi: lunar.getJieQi(),
      ganZhi: dayPillar.ganZhi,
      gan: dayPillar.gan,
      zhi: dayPillar.zhi,
      ganShiShen: dayPillar.ganShiShen,
      score,
      grade: gradeOf(score, hardAvoid),
      hardAvoid,
      reasons,
      almanac,
      isToday: date === today,
    });
  }

  const byScore = (a, b) => (b.score - a.score) || a.date.localeCompare(b.date);
  const best = list.filter((item) => item.grade === 'good' || item.grade === 'ok').sort(byScore);
  const avoid = list.filter((item) => item.grade === 'avoid');
  return {
    purpose: purposeInfo,
    start: list[0]?.date ?? '',
    end: list[list.length - 1]?.date ?? '',
    days: list,
    best,
    avoid,
    counts: {
      good: list.filter((item) => item.grade === 'good').length,
      ok: list.filter((item) => item.grade === 'ok').length,
      plain: list.filter((item) => item.grade === 'plain').length,
      avoid: avoid.length,
    },
  };
};

const shortDate = (item) => `${item.month}/${item.day} ${item.weekdayLabel}`;
/** 理由按重要性排序：好日子先说加分项，坏日子先说减分项。 */
export const sortReasons = (item) => {
  const direction = item.grade === 'avoid' || item.score < 0 ? 1 : -1;
  return item.reasons.slice().sort((a, b) => (direction * (a.delta - b.delta)) || (Math.abs(b.delta) - Math.abs(a.delta)));
};
const describeReasons = (item, limit = 4) => sortReasons(item).slice(0, limit).map((reason) => reason.text).join('；');

/** 可复制的择日清单。 */
export const formatZeriText = (result, { personName = '', dayMaster = '' } = {}) => {
  if (!result) return '';
  const lines = [
    `【择日参考 · ${result.purpose.label}】${result.start} 至 ${result.end}`,
    `命主：${personName.trim() || '未命名'}${dayMaster ? `（日主${dayMaster}）` : ''}`,
    '',
    `较宜（${result.best.length} 天）：`,
    ...(result.best.length
      ? result.best.slice(0, 8).map((item) => `${shortDate(item)} ${item.ganZhi}日 · ${ZERI_GRADES[item.grade].label} — ${describeReasons(item)}`)
      : ['这段时间没有特别合适的日子，可以放宽范围再看。']),
    '',
    `需避开（${result.avoid.length} 天）：`,
    ...(result.avoid.length
      ? result.avoid.slice(0, 12).map((item) => `${shortDate(item)} ${item.ganZhi}日 — ${describeReasons(item, 3)}`)
      : ['没有硬忌的日子。']),
    '',
    '以上由古书派按黄历宜忌、建除、值神与日柱对本命的喜忌、合冲初选，只看用事者本人的命局；重要日子请再请人工复核。',
  ];
  return lines.join('\n');
};
