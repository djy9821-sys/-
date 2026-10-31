/**
 * 固定命例与它们的「金样」：三个模块各一组有代表性的盘，把排盘结果压成稳定的摘要，
 * 存在 test/golden/*.json。算法有意改动时运行 `node scripts/update-golden.mjs` 重新生成，
 * 无意改动时 test/golden.test.js 会报出差异。
 *
 * 摘要只取与命理结论有关的字段，不含制盘时间、提示文案等易变内容。
 */
import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';
import { buildLiuYaoReading } from '../src/utils/liuyao.js';
import { judgeLiuYao } from '../src/utils/liuyaoJudge.js';
import { castByNumbers, castByTime } from '../src/utils/liuyaoCast.js';
import { createZiweiHoroscope } from '../src/utils/ziweiBirth.js';

/** 八字固定命例：名人盘、节气交界、真太阳时跨日、晚子时、农历闰月、不知时辰。 */
export const BAZI_CASES = [
  { id: 'qianlong', note: '乾隆 辛卯 丁酉 庚午 丙子', input: { calendarType: 'solar', year: 1711, month: 9, day: 25, hourIndex: 0, gender: 'male' } },
  { id: 'sunzhongshan', note: '孙中山 丙寅 己亥 辛卯 庚寅', input: { calendarType: 'solar', year: 1866, month: 11, day: 12, hourIndex: 2, gender: 'male' } },
  { id: 'maozedong-lunar', note: '毛泽东 农历癸巳年十一月十九 辰时', input: { calendarType: 'lunar', year: 1893, month: 11, day: 19, hourIndex: 4, gender: 'male' } },
  { id: 'lichun-before', note: '2016 立春前两小时：乙未 己丑', input: { calendarType: 'solar', year: 2016, month: 2, day: 4, clockHour: 15, clockMinute: 40, timeMode: 'exact', gender: 'female', applyTrueSolar: false } },
  { id: 'lichun-after', note: '2016 立春后两小时：丙申 庚寅', input: { calendarType: 'solar', year: 2016, month: 2, day: 4, clockHour: 19, clockMinute: 40, timeMode: 'exact', gender: 'female', applyTrueSolar: false } },
  { id: 'true-solar-cross-day', note: '乌鲁木齐 00:40 真太阳时回到前一天亥时', input: { calendarType: 'solar', year: 2026, month: 3, day: 10, clockHour: 0, clockMinute: 40, timeMode: 'exact', gender: 'male', longitude: 87.6, timezone: 8, applyTrueSolar: true, placeName: '乌鲁木齐' } },
  { id: 'late-zi-same-day', note: '晚子时不换日（默认）', input: { calendarType: 'solar', year: 1990, month: 5, day: 20, hourIndex: 12, gender: 'male', daySect: 2 } },
  { id: 'late-zi-next-day', note: '晚子时换次日', input: { calendarType: 'solar', year: 1990, month: 5, day: 20, hourIndex: 12, gender: 'male', daySect: 1 } },
  { id: 'leap-month', note: '农历 2023 闰二月二十', input: { calendarType: 'lunar', year: 2023, month: -2, day: 20, hourIndex: 6, gender: 'female' } },
  { id: 'time-unknown', note: '不知时辰', input: { calendarType: 'solar', year: 1985, month: 10, day: 1, hourIndex: null, timeMode: 'unknown', gender: 'female' } },
  { id: 'dst-1988', note: '1988 年夏令时，北京 12:30', input: { calendarType: 'solar', year: 1988, month: 7, day: 15, clockHour: 12, clockMinute: 30, timeMode: 'exact', gender: 'male', longitude: 116.41, timezone: 8, applyTrueSolar: true, applyDst: true, placeName: '北京' } },
  { id: 'female-backward', note: '阳年女命逆行大运', input: { calendarType: 'solar', year: 2000, month: 8, day: 16, hourIndex: 2, gender: 'female' } },
];

const FIXED_NOW = new Date(2026, 9, 27, 12, 0);

// 每柱一行：柱名 干支 天干十神 | 藏干十神 | 纳音 | 星运/自坐 | 空亡 | 神煞
const pillarSummary = (pillar) => (pillar.unknown ? `${pillar.name} 不详` : [
  `${pillar.name} ${pillar.ganZhi} ${pillar.ganShiShen}`,
  (pillar.hiddenGanDetails ?? []).map((item) => `${item.gan}${item.shiShen}`).join(' '),
  pillar.naYin,
  `${pillar.diShi}/${pillar.ziZuo}`,
  `空${pillar.xunKong}`,
  (pillar.shensha ?? []).join(' '),
].join(' | '));

export const summarizeBazi = (input) => {
  const chart = buildBaziChart(input, FIXED_NOW);
  const strength = analyzeStrength(chart);
  const pattern = judgeBaziPattern(chart, strength);
  return {
    pillars: chart.pillars.map(pillarSummary),
    timeInfo: {
      correctedDate: chart.timeInfo?.correctedDate ?? null,
      correctedTime: chart.timeInfo?.correctedTime ?? null,
      hourName: chart.timeInfo?.hourName ?? null,
      trueSolarApplied: Boolean(chart.timeInfo?.trueSolarApplied),
      dstApplied: Boolean(chart.timeInfo?.dstApplied),
    },
    extras: chart.extras,
    yun: {
      startSolar: chart.yun?.startSolar ?? null,
      forward: chart.yun?.forward ?? null,
      dayun: (chart.yun?.dayun ?? []).slice(0, 8).map((item) => `${item.ganZhi} ${item.startAge}–${item.endAge} ${item.startYear}`),
    },
    strength: { band: strength.band, ratio: Number(strength.ratio.toFixed(4)), deLing: strength.deLing, favorable: strength.favorable, unfavorable: strength.unfavorable },
    pattern: { pattern: pattern.pattern, special: pattern.special, traits: pattern.traits },
    chengBai: pattern.chengBai
      ? { group: pattern.chengBai.group, verdict: pattern.chengBai.verdict, success: pattern.chengBai.success.map((item) => item.quote), failure: pattern.chengBai.failure.map((item) => item.quote), flaw: pattern.chengBai.flaw.map((item) => item.quote), rescue: pattern.chengBai.rescue.map((item) => item.quote) }
      : null,
  };
};

/** 六爻固定卦例：静卦、动卦、六爻皆动、伏神、六合六冲、梅花时间起卦、报数起卦。 */
export const LIUYAO_CASES = [
  { id: 'gou-static', note: '天风姤 静卦', values: [8, 7, 7, 7, 7, 7], date: [2026, 9, 26, 10, 0], meta: { topic: 'wealth', question: '求财' } },
  { id: 'kui-two-moving', note: '火泽睽 二五爻动', values: [7, 9, 8, 7, 6, 7], date: [2026, 9, 26, 10, 0], meta: { topic: 'career' } },
  { id: 'qian-all-moving', note: '乾之坤 用九', values: [9, 9, 9, 9, 9, 9], date: [2026, 9, 26, 10, 0], meta: { topic: 'general' } },
  { id: 'xu-hidden-parent', note: '水天需 父母伏藏', values: [7, 7, 7, 8, 7, 8], date: [2026, 2, 3, 23, 30], meta: { topic: 'study' } },
  { id: 'yu-six-harmony', note: '雷地豫 六合卦 问感情', values: [8, 8, 8, 9, 8, 8], date: [2025, 6, 18, 15, 20], meta: { topic: 'love', gender: 'female' } },
  { id: 'wuwang-six-clash', note: '天雷无妄 六冲卦', values: [7, 8, 8, 7, 7, 9], date: [2024, 11, 5, 9, 10], meta: { topic: 'lawsuit' } },
  { id: 'meihua-time', note: '梅花时间起卦：观梅占的日子', cast: 'time', date: [2025, 0, 16, 16, 0], meta: { topic: 'general' } },
  { id: 'meihua-numbers', note: '报数起卦 37、58', cast: 'numbers', numbers: [37, 58], date: [2026, 9, 26, 13, 47], meta: { topic: 'home' } },
];

export const summarizeLiuYao = (item) => {
  const date = new Date(...item.date);
  let values = item.values;
  let castNote = '';
  if (item.cast === 'time') ({ values, note: castNote } = castByTime(date));
  if (item.cast === 'numbers') ({ values, note: castNote } = castByNumbers(...item.numbers));
  const reading = buildLiuYaoReading(values, date, { ...item.meta, castNote, method: item.cast ?? 'coins' });
  const judge = judgeLiuYao(reading);
  return {
    time: { year: reading.time.year, month: reading.time.month, day: reading.time.day, hour: reading.time.hour, xunKong: reading.time.xunKong },
    hexagram: `${reading.hexagram.name} ${reading.hexagram.palace}宫${reading.hexagram.palaceLabel} 世${reading.hexagram.shi}应${reading.hexagram.ying}${reading.hexagram.relation ? ` ${reading.hexagram.relation}` : ''}`,
    changed: reading.changed ? `${reading.changed.name}${reading.changed.relation ? ` ${reading.changed.relation}` : ''}` : null,
    mutual: reading.mutual.name,
    lines: reading.lines.map((line) => `${line.positionName} ${line.god} ${line.relative}${line.ganZhi} ${line.name}${line.isMoving ? '动' : ''}${line.marks.length ? `[${line.marks.join('·')}]` : ''}${line.changed ? `→${line.changed.relative}${line.changed.ganZhi}` : ''}`),
    hidden: reading.hidden.map((hiddenItem) => `${hiddenItem.relative}${hiddenItem.ganZhi}伏${hiddenItem.position}`),
    useExtra: reading.useExtra,
    castNote,
    judge: { yongShen: `${judge.yongShen.relative}${judge.yongShen.ganZhi} ${judge.yongShen.state}`, score: judge.score, verdict: judge.verdict.title, points: judge.points },
  };
};

/** 紫微固定命例：《全书》例盘、闰月前后、立春与正月初一之间、晚子时两派、农历录入。 */
export const ZIWEI_CASES = [
  { id: 'quanshu-example', note: '庚辰年七月十七寅时女命', input: { calendarType: 'solar', birthDate: '2000-08-16', timeIndex: 2, gender: 'female' } },
  { id: 'male-forward', note: '1990-05-20 午时男命', input: { calendarType: 'solar', birthDate: '1990-05-20', timeIndex: 6, gender: 'male' } },
  { id: 'leap-early', note: '闰二月初十（全书闰月一律按下月：按三月）', input: { calendarType: 'lunar', birthDate: '2023-02-10', timeIndex: 6, gender: 'male', isLeapMonth: true } },
  { id: 'leap-late', note: '闰二月二十（按三月）', input: { calendarType: 'lunar', birthDate: '2023-02-20', timeIndex: 6, gender: 'male', isLeapMonth: true } },
  { id: 'between-lichun-newyear', note: '立春后正月初一前', input: { calendarType: 'solar', birthDate: '2026-02-10', timeIndex: 4, gender: 'female' } },
  { id: 'late-zi-next', note: '七月廿九晚子时换次日', input: { calendarType: 'solar', birthDate: '2000-08-28', timeIndex: 12, gender: 'female' } },
  { id: 'late-zi-same', note: '七月廿九晚子时不换日', input: { calendarType: 'solar', birthDate: '2000-08-28', timeIndex: 12, gender: 'female', lateZiMode: 'same' } },
  { id: 'early-zi', note: '早子时', input: { calendarType: 'solar', birthDate: '1975-12-31', timeIndex: 0, gender: 'male' } },
  { id: 'year-1924', note: '甲子年', input: { calendarType: 'solar', birthDate: '1924-03-05', timeIndex: 9, gender: 'female' } },
  { id: 'year-2043', note: '癸亥年（运限看 2060 年）', input: { calendarType: 'solar', birthDate: '2043-11-30', timeIndex: 11, gender: 'male' }, fortuneDate: '2060-10-27' },
];

const FORTUNE_DATE = '2026-10-27';

export const summarizeZiwei = (input, fortuneDate = FORTUNE_DATE) => {
  const horoscope = createZiweiHoroscope(input);
  const fortune = horoscope.horoscope(fortuneDate, 6);
  return {
    solarDate: horoscope.solarDate,
    lunarDate: horoscope.lunarDate,
    chineseDate: horoscope.chineseDate,
    time: horoscope.time,
    soul: horoscope.earthlyBranchOfSoulPalace,
    body: horoscope.earthlyBranchOfBodyPalace,
    fiveElementsClass: horoscope.fiveElementsClass,
    soulStar: horoscope.soul,
    bodyStar: horoscope.body,
    lateZi: horoscope.lateZi?.text ?? null,
    // 每宫一行：宫名 宫干支 [身] | 主星 | 辅星 | 杂曜 | 长生·博士·将前·岁前 | 大限 | 小限
    palaces: horoscope.palaces.map((palace) => [
      `${palace.name} ${palace.heavenlyStem}${palace.earthlyBranch}${palace.isBodyPalace ? ' 身' : ''}`,
      palace.majorStars.map((star) => `${star.name}${star.brightness ?? ''}${star.mutagen ?? ''}`).join(' '),
      palace.minorStars.map((star) => `${star.name}${star.brightness ?? ''}${star.mutagen ?? ''}`).join(' '),
      palace.adjectiveStars.map((star) => star.name).join(' '),
      [palace.changsheng12, palace.boshi12, palace.jiangqian12, palace.suiqian12].join('·'),
      palace.decadal.range.join('-'),
      palace.ages.slice(0, 3).join(','),
    ].join(' | ')),
    fortune: {
      nominalAge: fortune.age.nominalAge,
      decadal: `${fortune.decadal.heavenlyStem}${fortune.decadal.earthlyBranch} ${fortune.decadal.index}`,
      yearly: `${fortune.yearly.heavenlyStem}${fortune.yearly.earthlyBranch} ${fortune.yearly.index}`,
      monthly: fortune.monthly.index,
      daily: fortune.daily.index,
    },
  };
};

export const buildGolden = () => ({
  bazi: Object.fromEntries(BAZI_CASES.map((item) => [item.id, { note: item.note, input: item.input, result: summarizeBazi(item.input) }])),
  liuyao: Object.fromEntries(LIUYAO_CASES.map((item) => [item.id, { note: item.note, result: summarizeLiuYao(item) }])),
  ziwei: Object.fromEntries(ZIWEI_CASES.map((item) => [item.id, { note: item.note, input: item.input, result: summarizeZiwei(item.input, item.fortuneDate) }])),
});
