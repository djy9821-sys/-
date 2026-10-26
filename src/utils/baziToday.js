/**
 * 「八字 · 今日」：某个命盘在当下的大运、流年、流月、流日、流时，
 * 以及今天与命局的主要关系、天干地支对命主的喜忌。
 */
import { buildLiuRi, buildLiuShi, buildLiuYue, getBaziYearOfDate, getHourIndexForTime, toYmd } from './baziFlow.js';
import { findRelations } from './baziRelations.js';
import { analyzeStrength, elementToneOf } from './baziStrength.js';

const GAN_WUXING = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const ZHI_WUXING = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };

const currentDaYun = (chart, liuNian) => {
  const daYun = chart.yun.dayun.find((item) => item.isCurrent);
  if (daYun) return daYun;
  const { xiaoYun } = chart.yun;
  if (!xiaoYun || !liuNian?.xiaoYun) return null;
  return {
    ...liuNian.xiaoYun,
    startAge: xiaoYun.startAge,
    endAge: xiaoYun.endAge,
    startYear: xiaoYun.startYear,
    endYear: xiaoYun.endYear,
  };
};

/**
 * @param {object} chart buildBaziChart 的结果（建议用同一个 now 计算）
 * @param {Date} [now]
 */
export const buildBaziToday = (chart, now = new Date()) => {
  const dayGan = chart.dayMaster.gan;
  const today = toYmd(now);
  const baziYear = getBaziYearOfDate(today);

  const liuYueList = buildLiuYue(baziYear, dayGan, now);
  const liuYue = liuYueList.find((month) => today >= month.startDate && today < month.endDate) ?? liuYueList[0];
  const liuRiList = buildLiuRi(liuYue, dayGan, now);
  const liuRi = liuRiList.find((day) => day.date === today) ?? liuRiList[0];
  const liuShiList = buildLiuShi(today, dayGan, now);
  const hourIndex = getHourIndexForTime(now.getHours());
  const liuShi = liuShiList.find((hour) => hour.index === hourIndex) ?? null;

  const liuNian = chart.yun.currentLiuNian ?? null;
  const daYun = currentDaYun(chart, liuNian);

  const natalItems = chart.pillars.map((pillar) => ({ key: pillar.key, label: pillar.name, gan: pillar.gan, zhi: pillar.zhi }));
  const fortuneItems = [
    daYun && { key: 'da-yun', label: daYun.name === '小运' ? '小运' : '大运', gan: daYun.gan, zhi: daYun.zhi },
    liuNian && { key: 'liu-nian', label: '流年', gan: liuNian.gan, zhi: liuNian.zhi },
    liuYue && { key: 'liu-yue', label: '流月', gan: liuYue.gan, zhi: liuYue.zhi },
  ].filter(Boolean);
  const relations = findRelations(
    [{ key: 'liu-ri', label: '流日', gan: liuRi.gan, zhi: liuRi.zhi }, ...fortuneItems, ...natalItems],
    { focusKeys: ['liu-ri'] },
  ).filter(({ tone }) => tone !== 'break');

  const strength = analyzeStrength(chart);
  const dayTone = {
    gan: elementToneOf(GAN_WUXING[liuRi.gan], strength),
    zhi: elementToneOf(ZHI_WUXING[liuRi.zhi], strength),
  };

  return {
    today,
    baziYear,
    daYun,
    liuNian,
    liuYue,
    liuYueList,
    liuRi,
    liuRiList,
    liuShi,
    liuShiList,
    relations,
    strength,
    dayTone,
  };
};
