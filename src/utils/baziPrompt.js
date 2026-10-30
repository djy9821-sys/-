/**
 * 把八字排盘结果整理成一段可以直接粘贴给 AI 的提示词。
 *
 * 范围 scope：
 *   natal 本命 · year 流年 · month 流月 · day 流日 · hour 流时
 * 每深一层就多带上一层运限的干支，以及这些运限与命局之间的合冲刑害。
 */
import { judgeBaziPattern } from './baziPattern.js';
import { analyzeLiuqin } from './baziLiuqin.js';
import { findRelations } from './baziRelations.js';
import { getShensha, SHENSHA_SOURCES } from './baziShensha.js';
import { cite } from '../data/classics.js';
import { analyzeStrength, favorBasisOf } from './baziStrength.js';
import { describeDaYunFavor, describeYearMarks, describeYearSummary, getDaYunMarks, getLiuNianMarks, juOfZhi } from './baziYearMarks.js';
import { PROMPT_CLASSICS_LIMIT, classicsPromptLines } from './classicsPrompt.js';

export { PROMPT_CLASSICS_LIMIT };

export const PROMPT_SCOPES = Object.freeze([
  { value: 'natal', label: '本命' },
  { value: 'year', label: '流年' },
  { value: 'month', label: '流月' },
  { value: 'day', label: '流日' },
  { value: 'hour', label: '流时' },
]);

const SCOPE_RANK = { natal: 0, year: 1, month: 2, day: 3, hour: 4 };

const hiddenText = (details = []) => details.map(({ gan, wuxing, shiShen }) => `${gan}${wuxing}${shiShen}`).join('、');

/** 一柱的完整描述：天干十神、地支、藏干、纳音、星运、自坐、空亡、神煞。 */
const describePillar = (label, item, { diShiLabel = '星运', shensha } = {}) => {
  if (item.unknown || !item.gan) return `- ${label}：不详（出生时辰未知，未排时柱）`;
  const parts = [
    `天干${item.gan}${item.ganWuxing}（${item.ganShiShen || '日主'}）`,
    `地支${item.zhi}${item.zhiWuxing}`,
  ];
  if (item.hiddenGanDetails?.length) parts.push(`藏干 ${hiddenText(item.hiddenGanDetails)}`);
  if (item.naYin) parts.push(`纳音${item.naYin}`);
  if (item.diShi) parts.push(`${diShiLabel} ${item.diShi}`);
  if (item.ziZuo) parts.push(`自坐 ${item.ziZuo}`);
  if (item.xunKong) parts.push(`空亡 ${item.xunKong}`);
  const stars = shensha ?? item.shensha;
  if (stars?.length) parts.push(`神煞 ${stars.join('、')}`);
  return `- ${label} ${item.ganZhi}：${parts.join('；')}`;
};

const formatMinutes = (value) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)} 分钟`;

/** 本命四柱所见神煞的查法与古籍出处，让 AI 按原书法则理解，而不是各说各话。 */
const shenshaSourceLines = (chart) => {
  const seen = [...new Set(chart.pillars.flatMap((pillar) => pillar.shensha ?? []))];
  const lines = seen
    .filter((name) => SHENSHA_SOURCES[name])
    .map((name) => {
      const source = SHENSHA_SOURCES[name];
      return `- ${name}：${cite(source.classic, source.section)}。${source.rule}${source.variant ? `（${source.variant}）` : ''}`;
    });
  if (!lines.length) return ['- 本命四柱未见本程序收录的神煞。'];
  return [...lines, `神煞口诀主要取自${cite('sanming')}，禄取${cite('yuanhai')}，红鸾天喜取${cite('xieji')}；请以这些古籍的本义解释，吉凶仍以五行喜忌为主。`];
};

const birthLines = (chart, personName) => {
  const { input, timeInfo, solarInfo, lunarInfo } = chart;
  const lines = [];
  lines.push(`- 称呼：${personName?.trim() || '命主'}；${input.gender === 'male' ? '男命（乾造）' : '女命（坤造）'}；生肖${lunarInfo.zodiac}`);
  if (timeInfo?.mode === 'unknown') {
    lines.push(`- 出生：${input.calendarType === 'lunar' ? '农历' : '公历'}输入，公历 ${solarInfo.ymd}，出生时辰不详：只排年月日三柱，时柱、命宫、身宫未列，起运时间按正午估算（实际可能前后相差约两个月）。`);
  } else if (timeInfo?.mode === 'exact') {
    lines.push(`- 出生：公历 ${timeInfo.clockDate} ${timeInfo.clockTime}（当地钟表时间${timeInfo.dstApplied ? '，已扣除夏令时 1 小时' : ''}）`);
    if (timeInfo.trueSolarApplied) {
      lines.push(`- 出生地：${timeInfo.placeName || '未注明'}，东经 ${Number(timeInfo.longitude).toFixed(2)}°，UTC+${timeInfo.timezone}`);
      lines.push(`- 真太阳时：${timeInfo.correctedDate} ${timeInfo.correctedTime}（经度时差 ${formatMinutes(timeInfo.longitudeMinutes)}，均时差 ${formatMinutes(timeInfo.equationMinutes)}），属${input.hourOption.name}`);
    } else {
      lines.push(`- 未提供出生地经度，按钟表时间排盘，属${input.hourOption.name}`);
    }
  } else {
    lines.push(`- 出生：${input.calendarType === 'lunar' ? '农历' : '公历'}输入，公历 ${solarInfo.ymd}，${input.hourOption.name}（${input.hourOption.range}，未校正真太阳时）`);
  }
  lines.push(`- 农历：${lunarInfo.yearChinese}年${lunarInfo.monthChinese}月${lunarInfo.dayChinese}`);
  if (input.hourOption?.index === 12) {
    lines.push(`- 晚子时流派：${input.daySect === 1 ? '晚子时换次日' : '晚子时不换日'}`);
  }
  const yearBoundary = chart.yearBoundary;
  if (yearBoundary?.differs) {
    lines.push(yearBoundary.mode === 'chunjie'
      ? `- 年柱分界：出生在立春与正月初一之间，本盘按农历正月初一换年，年柱取${yearBoundary.chunjie}；若按子平法以立春换年则为${yearBoundary.lichun}`
      : `- 年柱分界：出生在立春与正月初一之间，本盘按子平法以立春换年，年柱取${yearBoundary.lichun}；若按农历正月初一换年则为${yearBoundary.chunjie}`);
  }
  const boundary = timeInfo?.boundary;
  if (boundary) {
    lines.push(`- 注意：出生时间离时辰交界只有 ${boundary.minutesToBoundary} 分钟。钟表 ${boundary.boundaryClockTime} ${boundary.isBeforeBoundary ? '及之后' : '之前'}出生则为${boundary.alternative.hourName}，时柱${boundary.alternative.timeGanZhi}。出生时间若记得不准，请两种时柱都考虑。`);
  }
  return lines;
};

const natalLines = (chart) => {
  const lines = chart.pillars.map((pillar) => describePillar(pillar.name, pillar));
  const counts = chart.surfaceWuxingCount;
  lines.push(`- 日主：${chart.dayMaster.gan}${chart.dayMaster.wuxing}`);
  const { extras } = chart;
  if (extras?.taiYuan && extras.mingGong) {
    lines.push(`- 胎元 ${extras.taiYuan}（${extras.taiYuanNaYin}）；命宫 ${extras.mingGong}（${extras.mingGongNaYin}）；身宫 ${extras.shenGong}（${extras.shenGongNaYin}）`);
  } else if (extras?.taiYuan) {
    lines.push(`- 胎元 ${extras.taiYuan}（${extras.taiYuanNaYin}）；命宫、身宫需时辰，未排`);
  }
  lines.push(`- 八字表层五行（${chart.timeUnknown ? '三柱六字' : '四干四支'}计数，未计藏干与旺衰）：木${counts['木']} 火${counts['火']} 土${counts['土']} 金${counts['金']} 水${counts['水']}`);
  return lines;
};

const patternLines = (judge) => {
  const lines = [...judge.points];
  lines.push('- 以上格局与组合由程序按简化规则初判，请你复核；若判断不同，以你的分析为准并说明理由。');
  return lines.map((line) => (line.startsWith('- ') ? line : `- ${line}`));
};

const daYunLines = (chart, selectedDaYun) => {
  const { yun } = chart;
  const lines = [
    `- ${yun.forward ? '顺排' : '逆排'}，出生后 ${yun.startYear} 年 ${yun.startMonth} 个月 ${yun.startDay} 天起运，交运日 ${yun.startSolar.split(' ')[0]}`,
  ];
  // 只列到百岁左右，足够分析使用。运支与原局凑齐三会方、三合局的注明（程序的大运喜忌按局的五行论）。
  const natalZhis = chart.pillars.map((pillar) => pillar.zhi).filter(Boolean);
  yun.dayun.filter((item) => item.startAge < 100).forEach((item) => {
    const marks = [item.isCurrent ? '当前' : '', selectedDaYun?.index === item.index && !item.isCurrent ? '所选' : ''].filter(Boolean);
    const ju = juOfZhi(item.zhi, natalZhis);
    const juNote = ju ? `，运支${item.zhi}与原局${ju.others.join('')}会成${ju.name}` : '';
    lines.push(`- ${item.startAge}–${item.endAge} 虚岁（${item.startYear}–${item.endYear}）${item.ganZhi}，天干十神${item.ganShiShen}${juNote}${marks.length ? `  ← ${marks.join('、')}` : ''}`);
  });
  const xiaoYun = yun.xiaoYun;
  if (xiaoYun?.years?.length) {
    const years = xiaoYun.years.map((year) => `${year.year}${year.xiaoYun.ganZhi}`).join(' ');
    lines.splice(1, 0, `- 起运前行小运（${xiaoYun.startAge}–${xiaoYun.endAge} 虚岁）：${years}`);
  }
  return lines;
};

const ELEMENTS = ['木', '火', '土', '金', '水'];

const strengthLines = (chart, strength, special = null) => {
  const support = Math.round(strength.ratio * 100);
  const { score } = strength;
  const elementList = (items) => items.map((item) => `${item.element}（${item.role}${item.tiaoHou ? '，调候' : ''}）`).join('、');
  const rootsByBranch = new Map();
  score.roots.forEach((root) => {
    const label = `${root.name.replace('柱', '支')}${root.zhi}`;
    const branch = `${label}${root.chong ? `，逢${root.chong}冲打折` : ''}`;
    rootsByBranch.set(branch, [...(rootsByBranch.get(branch) ?? []), `${root.gan}${root.role}${root.position}`]);
  });
  const lines = [
    `- 五行力量（天干每字 1 分，日干不计；藏干本气 1、中气 0.5、余气 0.3；月令加倍）：${ELEMENTS.map((element) => `${element}${strength.percents[element]}%`).join(' ')}（比劫与印合占 ${support}%）`,
    `- 日主${chart.dayMaster.gan}${chart.dayMaster.wuxing}：${strength.band}（旺衰打分 ${score.total}：得令 ${score.ling}${score.xiuQiu ? ` − 月令${score.xiuQiu.state} ${-score.xiuQiu.points}` : ''} + 得地 ${score.di} + 得势 ${score.shi}${score.hourEstimate ? ` + 时辰不详按平均 ${score.hourEstimate}` : ''}；2 分及以下偏弱，2.5 分及以上偏强，其间中和、按略偏的一边取用）`,
    `- 得令：${score.lingYuqi ? '得余气' : score.ling > 0 ? '是' : '否'}${strength.monthMain ? `（月令本气 ${strength.monthMain.gan}，为${strength.monthMain.role}${score.lingYuqi ? `；${score.lingYuqi.zhi}中藏${score.lingYuqi.gan}，为比劫余气` : ''}${score.xiuQiu ? `；日主${score.xiuQiu.state}于月令（旺相休囚死）` : ''}）` : ''}`,
    `- 得地：${rootsByBranch.size ? [...rootsByBranch].map(([label, roots]) => `${label}（${roots.join('、')}）`).join('、') : '年、日、时支无根'}`,
    `- 得势：${score.stems.length ? score.stems.map((item) => `${item.name.replace('柱', '干')}${item.gan}（${item.role}）`).join('、') : '否'}`,
  ];
  if (strength.tiaoHou) lines.push(`- 调候（${strength.tiaoHou.source}）：${strength.tiaoHou.text}${strength.tiaoHou.season ? `，${strength.tiaoHou.season}` : ''}${strength.tiaoHou.presenceText ? `；${strength.tiaoHou.presenceText}` : ''}`);
  if (strength.basis) lines.push(`- 取用思路：${strength.basis}${strength.tiaoHouNote ? `；${strength.tiaoHouNote}` : ''}`);
  if (strength.favorable.length) lines.push(`- 喜用参考：${elementList(strength.favorable)}`);
  if (strength.unfavorable.length) lines.push(`- 忌神参考：${elementList(strength.unfavorable)}`);
  if (strength.hint) lines.push(`- 提示：${strength.hint}`);
  lines.push(`- 以上为程序估算：旺衰按得令、得地、得势三项打分（权重按《滴天髓阐微》任铁樵命例校准），先按扶抑取定用神（调候附后），再按用神论喜忌（用神与生用神者为喜，克用神者、用神所克者为忌），未考虑从格、化格、专旺等特殊格局${special ? `（本盘${special.name}，按此格论的喜忌见下一节）` : ''}；若你的判断不同，请说明理由并以你的分析为准。`);
  return lines;
};

const almanacLine = (day) => {
  const almanac = day?.almanac;
  if (!almanac) return null;
  return `- 当日黄历：${almanac.zhiXing}日，值神${almanac.tianShen}（${almanac.tianShenLuck === '吉' ? '黄道' : '黑道'}），冲${almanac.chong}，煞${almanac.sha}；宜 ${almanac.yi.join('、') || '—'}；忌 ${almanac.ji.join('、') || '—'}`;
};

const toRelationItem = (key, label, item) => (item ? { key, label, gan: item.gan, zhi: item.zhi } : null);

/** 某一运限单独与本命四柱之间最主要的两条关系（不含较弱的“破”）。 */
const mainNatalRelations = (natalItems, label, item) => findRelations(
  [{ key: 'flow', label, gan: item.gan, zhi: item.zhi }, ...natalItems],
  { focusKeys: ['flow'] },
).filter(({ tone }) => tone !== 'break').slice(0, 2).map(({ title }) => title);

const overviewLine = (head, item, natalItems, label) => {
  const relations = mainNatalRelations(natalItems, label, item);
  return `- ${head} ${item.ganZhi}（${item.ganShiShen}）${relations.length ? `：${relations.join('、')}` : ''}`;
};

const relationLines = (relations) => (relations.length
  ? relations.map((relation) => `- ${relation.title}：${relation.detail}`)
  : ['- 无明显的合冲刑害']);

const QUESTIONS = {
  natal: [
    '日主旺衰与格局如何？请说明依据。',
    '喜用神与忌神分别是什么？',
    '性格特点与天赋优势。',
    '适合的事业方向与求财方式。',
    '感情与婚姻的特点。',
    '健康上需要注意什么。',
  ],
  year: [
    '结合所行大运，这一年的整体运势如何？',
    '事业（或学业）、财运、感情、健康分别有什么变化？',
    '这一年里哪些月份比较顺，哪些月份需要特别注意？',
    '给出具体、可执行的建议。',
  ],
  month: [
    '这个月（以节令为界）的整体运势如何？',
    '事业、财运、感情、健康各需要注意什么？',
    '本月内有哪些日子要特别留意？',
  ],
  day: [
    '这一天的整体运势如何？',
    '这一天适合做什么、不适合做什么？',
    '一天之中哪个时辰相对更好？',
  ],
  hour: [
    '这个时辰的气场对命主是助力还是阻力？',
    '在这个时辰签约、谈判、出行、做重要决定是否合适？需要注意什么？',
  ],
};

const scopeTitle = (scope, { liuNian, liuYue, liuRi, liuShi }) => {
  if (scope === 'year' && liuNian) return `${liuNian.year} 年（${liuNian.ganZhi}流年）`;
  if (scope === 'month' && liuYue) return `${liuYue.ganZhi}月（${liuYue.jieName} ${liuYue.startDate} 起，至${liuYue.nextJieName}前）`;
  if (scope === 'day' && liuRi) return `${liuRi.date} ${liuRi.weekdayLabel}（${liuRi.ganZhi}日）`;
  if (scope === 'hour' && liuRi && liuShi) return `${liuRi.date} ${liuShi.hourName} ${liuShi.range}（${liuShi.ganZhi}时）`;
  return '本命盘';
};

/**
 * 六亲宫星一节里，每一亲附一条讲这一亲的古籍原文（baziLiuqinHits 排在最前的那条，只附原文）。
 * @param {object} liuqin analyzeLiuqin 的结果
 * @param {Record<string, object[]>|null} liuqinClassics 按 item.key 分好的命中
 */
const liuqinClassicLines = (liuqin, liuqinClassics) => liuqin.items.flatMap((item) => {
  const hit = (liuqinClassics?.[item.key] ?? []).find((candidate) => candidate?.entry?.original);
  if (!hit) return [];
  const { entry } = hit;
  const where = `《${entry.book}》${entry.volume ? `·${entry.volume}` : ''}·${entry.section}`;
  return [`- 古籍论${item.kind}（${where}）：${String(entry.original).replace(/\s*\n\s*/g, ' ').trim()}`];
});

/**
 * @param {object} params
 * @param {object} params.chart buildBaziChart 的结果
 * @param {'natal'|'year'|'month'|'day'|'hour'} params.scope
 * @param {string} [params.personName]
 * @param {{daYun?, liuNian?, liuYue?, liuRi?, liuShi?}} [params.selections]
 * @param {Date} [params.now]
 * @param {object[]} [params.classics] 古籍库命中（matchEntries 的结果，按相关度排好序）；给了就附一节原文
 * @param {Record<string, object[]>} [params.liuqinClassics] 六亲各自的古籍命中（键为 spouse / children / parents / siblings）；给了就在六亲一节每亲附一条
 */
export const buildBaziPrompt = ({ chart, scope = 'natal', personName = '', selections = {}, now = new Date(), classics = null, liuqinClassics = null }) => {
  const rank = SCOPE_RANK[scope] ?? 0;
  const { daYun, liuNian, liuYue, liuRi, liuShi } = selections;
  const pad = (value) => String(value).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const sections = [];
  const basis = chart.timeInfo?.trueSolarApplied ? '已按真太阳时与节气计算' : '已按节气计算';
  sections.push([
    `你是一位精通子平八字的命理分析师。下面是用「古书派」排盘工具得到的八字数据（${basis}），请直接基于这些数据分析，不要自行重新排盘。`,
    `本次要分析的是：${scopeTitle(scope, selections)}。数据导出于 ${today}。`,
  ].join('\n'));

  const strength = analyzeStrength(chart);
  sections.push(['【出生信息】', ...birthLines(chart, personName)].join('\n'));
  sections.push([chart.timeUnknown ? '【本命三柱（时辰不详）】' : '【本命四柱】', ...natalLines(chart)].join('\n'));
  sections.push(['【大运】', ...daYunLines(chart, daYun)].join('\n'));
  const judge = judgeBaziPattern(chart, strength);
  sections.push(['【旺衰参考（程序估算）】', ...strengthLines(chart, strength, judge.special)].join('\n'));
  sections.push(['【格局与组合（程序初判）】', ...patternLines(judge)].join('\n'));
  const liuqin = analyzeLiuqin(chart, strength, { special: judge.special });
  if (liuqin) sections.push(['【六亲宫星（程序初判）】', liuqin.basis, ...liuqin.points.map((line) => `- ${line}`), ...liuqinClassicLines(liuqin, liuqinClassics)].join('\n'));
  sections.push(['【神煞查法出处】', ...shenshaSourceLines(chart)].join('\n'));
  const classicsSection = classicsPromptLines(classics);
  if (classicsSection) sections.push(['【古籍原文（与本命相关）】', ...classicsSection].join('\n'));

  // 流月、流日、流时没有预先算好的神煞，在这里按本命补上。
  const layerPillar = (label, item) => describePillar(label, item, {
    diShiLabel: '日主临支',
    shensha: item.shensha ?? getShensha(item, chart.shenshaContext),
  });
  const isXiaoYun = daYun?.name === '小运';
  const layers = [];
  if (rank >= 1 && daYun) layers.push({ key: 'da-yun', label: isXiaoYun ? '小运' : '大运', item: daYun, text: layerPillar(isXiaoYun ? `小运（起运前，${liuNian?.year ?? ''} 年）` : `大运（${daYun.startAge}–${daYun.endAge} 虚岁，${daYun.startYear}–${daYun.endYear}）`, daYun) });
  if (rank >= 1 && liuNian) layers.push({ key: 'liu-nian', label: '流年', item: liuNian, text: layerPillar(`流年（${liuNian.year} 年，${liuNian.age} 虚岁）`, liuNian) });
  if (rank >= 2 && liuYue) layers.push({ key: 'liu-yue', label: '流月', item: liuYue, text: layerPillar(`流月（${liuYue.jieName} ${liuYue.startDate} 起）`, liuYue) });
  if (rank >= 3 && liuRi) layers.push({ key: 'liu-ri', label: '流日', item: liuRi, text: layerPillar(`流日（${liuRi.date} ${liuRi.weekdayLabel}，农历${liuRi.lunarMonthChinese}月${liuRi.lunarDayChinese}${liuRi.jieQi ? `，${liuRi.jieQi}` : ''}）`, liuRi) });
  if (rank >= 4 && liuShi) layers.push({ key: 'liu-shi', label: '流时', item: liuShi, text: layerPillar(`流时（${liuShi.hourName} ${liuShi.range}）`, liuShi) });

  if (layers.length) {
    const almanac = rank >= 3 ? almanacLine(liuRi) : null;
    // 运限喜忌与结果页同一依据：认出疑似从、化、专旺的按此格论。
    const favorBasis = favorBasisOf(strength, judge.special);
    const marks = liuNian ? getLiuNianMarks(liuNian, { chart, daYun, strength: favorBasis }) : null;
    const yearMarks = liuNian ? describeYearMarks(liuNian, marks) : '';
    const yearSummary = liuNian ? describeYearSummary(liuNian, { chart, daYun, strength: favorBasis, marks }) : null;
    // 大运以地支为重，截脚的整步运按忌论（见 getDaYunMarks）。
    const daYunFavor = daYun && !isXiaoYun ? describeDaYunFavor(daYun, getDaYunMarks(daYun, { strength: favorBasis, chart }).favor) : '';
    sections.push([
      '【所选运限】',
      ...(favorBasis.source === 'special' ? [`- 运限喜忌按${favorBasis.specialName.replace(/^疑似/, '')}论（程序认出${favorBasis.specialName}；若不成格，以扶抑喜忌为准）`] : []),
      ...layers.map((layer) => layer.text),
      ...(daYunFavor ? [`- 大运喜忌：${daYunFavor}`] : []),
      ...(yearMarks ? [`- 流年标注：${yearMarks}`] : []),
      ...(yearSummary ? [`- 流年提要（程序合成，供参考）：${yearSummary.headline}。${yearSummary.text}`] : []),
      ...(almanac ? [almanac] : []),
    ].join('\n'));
  }

  const natalItems = chart.pillars.map((pillar) => toRelationItem(pillar.key, pillar.name, pillar));

  // 便于回答“哪些月份 / 哪些日子 / 哪个时辰”：列出下一层的干支与它和本命的主要关系。
  const { liuYueList = [], liuRiList = [], liuShiList = [] } = selections;
  if (scope === 'year' && liuYueList.length) {
    sections.push([
      `【${liuNian?.year ?? ''} 年各月（以节令换月）】`,
      ...liuYueList.map((month) => overviewLine(`${month.jieName} ${month.label} 起`, month, natalItems, '流月')),
    ].join('\n'));
  }
  if (scope === 'month' && liuRiList.length) {
    sections.push([
      '【本月每日】',
      ...liuRiList.map((day) => overviewLine(`${day.date.slice(5)} ${day.weekdayLabel}`, day, natalItems, '流日')),
    ].join('\n'));
  }
  if (scope === 'day' && liuShiList.length) {
    sections.push([
      '【当日各时辰】',
      ...liuShiList.map((hour) => overviewLine(`${hour.hourName} ${hour.range}`, hour, natalItems, '流时')),
    ].join('\n'));
  }
  const layerItems = layers.map((layer) => toRelationItem(layer.key, layer.label, layer.item));
  const relations = layers.length
    ? findRelations([...layerItems, ...natalItems], { focusKeys: layers.map((layer) => layer.key) })
    : findRelations(natalItems);
  sections.push([
    layers.length ? '【运限与命局的干支关系】' : '【原局内部的干支关系】',
    ...relationLines(relations),
  ].join('\n'));

  sections.push([
    '【请回答】',
    ...QUESTIONS[scope].map((question, index) => `${index + 1}. ${isXiaoYun ? question.replace('所行大运', '所行小运') : question}`),
    '',
    '请先说明判断依据（日主旺衰、喜忌、合冲刑害、神煞等），再给结论；语气平实，避免绝对化和吓人的说法。',
    ...(chart.timeUnknown ? ['命主出生时辰不详，请说明哪些判断会受时柱影响，并给出不依赖时柱的结论。'] : []),
    '',
    '我的问题：（在这里补充你想问的具体事情）',
  ].join('\n'));

  return sections.join('\n\n');
};
