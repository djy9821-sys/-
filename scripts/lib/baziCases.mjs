/**
 * 八字命例回归用的小工具（只在 Node 里用）：按四柱找日子排盘，拿程序的旺衰、格局、喜用对照命例的 expected。
 *
 * 古籍命例大多只有四柱（birth.calendar 为 unknown）。旺衰、喜用只看四柱，找到哪一天排出来都一样，
 * 所以在 1600–2100 年里找一个四柱相同的日子即可；有公历或农历生日的照生日排。
 */
import { Solar } from 'lunar-javascript';

import { buildBaziChart } from '../../src/utils/baziChart.js';
import { analyzeStrength } from '../../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../../src/utils/baziPattern.js';
import { analyzeLiuqin } from '../../src/utils/baziLiuqin.js';
import { juOfZhi } from '../../src/utils/baziYearMarks.js';

const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const WUXING_OF_GAN = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const WUXING_OF_ZHI = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
const invert = (map) => Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key]));
const GENERATED_BY = invert(GENERATES);
const CONTROLLED_BY = invert(CONTROLS);

/** 六十甲子的序号（甲子 0 … 癸亥 59）；不是合法干支时为 -1。 */
const sexagenaryIndex = (ganZhi) => {
  const gan = GAN.indexOf(ganZhi?.[0]);
  const zhi = ZHI.indexOf(ganZhi?.[1]);
  if (gan < 0 || zhi < 0 || gan % 2 !== zhi % 2) return -1;
  for (let index = 0; index < 60; index += 1) if (index % 10 === gan && index % 12 === zhi) return index;
  return -1;
};

const DAY_MS = 86_400_000;
/** 1900-01-31 是甲辰日（序号 40），由此推任一公历日的日柱序号。 */
const dayIndexOf = (date) => {
  const days = Math.round((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(1900, 0, 31)) / DAY_MS);
  return (((40 + days) % 60) + 60) % 60;
};

/**
 * 在 [from, to] 年间找一个四柱（时柱可缺）相同的公历日子。
 * @param {string[]} pillars ['庚子','庚辰','甲寅','戊辰']，三柱时不看时辰
 * @returns {{ year: number, month: number, day: number, hourIndex: number|null }|null}
 */
export const findSolarDateByPillars = (pillars, { from = 1600, to = 2100 } = {}) => {
  const [yearGz, monthGz, dayGz, hourGz] = pillars ?? [];
  const target = sexagenaryIndex(dayGz);
  if (target < 0 || sexagenaryIndex(yearGz) < 0 || sexagenaryIndex(monthGz) < 0) return null;
  if (hourGz && sexagenaryIndex(hourGz) < 0) return null;
  const hourIndex = hourGz ? ZHI.indexOf(hourGz[1]) : null;
  const hour = hourIndex === null ? 12 : [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21][hourIndex];
  const yearOffset = sexagenaryIndex(yearGz);
  let date = new Date(Date.UTC(from, 0, 1));
  date = new Date(date.getTime() + (((target - dayIndexOf(date)) % 60) + 60) % 60 * DAY_MS);
  const end = Date.UTC(to, 11, 31);
  for (; date.getTime() <= end; date = new Date(date.getTime() + 60 * DAY_MS)) {
    const year = date.getUTCFullYear();
    // 年柱按立春换年：先用公历年粗筛（一、二月可能还算上一年），再用 lunar-javascript 精确核对
    const approx = (((year - 4) % 60) + 60) % 60;
    if (approx !== yearOffset && (((approx - 1) % 60) + 60) % 60 !== yearOffset) continue;
    const eightChar = Solar.fromYmdHms(year, date.getUTCMonth() + 1, date.getUTCDate(), hour, 30, 0).getLunar().getEightChar();
    if (eightChar.getYear() !== yearGz || eightChar.getMonth() !== monthGz || eightChar.getDay() !== dayGz) continue;
    if (hourGz && eightChar.getTime() !== hourGz) continue;
    return { year, month: date.getUTCMonth() + 1, day: date.getUTCDate(), hourIndex };
  }
  return null;
};

/**
 * 喜用的固定留集：写了用神的命造里编号尾数是 0、4、7 的（除早先已逐造讨论过的 120、344），只作验收、不拿来定规则。
 * 调旺衰、取用规则时只看非留集；改完再看留集有没有一起变好，防止只是凑合了眼前这些造。
 */
export const USE_GOD_HOLDOUT_SEEN = Object.freeze(['bazi.ditian.120', 'bazi.ditian.344']);
export const isUseGodHoldout = (entry) => Boolean(entry?.expected?.useGod) && /[047]$/.test(entry.id ?? '')
  && !USE_GOD_HOLDOUT_SEEN.includes(entry.id);

/** 程序的旺衰档归成命例的三类：旺 / 弱 / 中和。 */
const strengthClassOf = (band) => (band === '偏强' || band === '极强' ? '旺' : band === '偏弱' || band === '极弱' ? '弱' : '中和');
/** 从格、专旺格在旺衰上算哪一边（命例按「从强为旺、从弱为弱」填）。 */
const STRONG_SPECIALS = /从强|专旺|曲直|炎上|稼穑|从革|润下/;

/**
 * 程序认出的特殊格局与命例写的格局是否同一类：同名算；命例写「化气格」，程序的「某某化某格」都算；
 * 从强与专旺（曲直、炎上……）任注常互称（同一造「癸卯 乙卯 甲寅 乙亥」衰旺篇说旺极、从象篇说从强），算同一类。
 */
export const samePatternFamily = (special, expected) => {
  if (!special || !expected) return false;
  if (special === expected || special.includes(expected)) return true;
  if (expected === '化气格') return /化.格/.test(special);
  return STRONG_SPECIALS.test(expected) && STRONG_SPECIALS.test(special);
};

/** 十神或十神类别 → 相对日主的五行。 */
export const useGodElement = (god, dayWuxing) => {
  if (Object.values(GENERATES).includes(god)) return god;
  if (/比|劫/.test(god)) return dayWuxing;
  if (/印/.test(god)) return GENERATED_BY[dayWuxing];
  if (/食|伤/.test(god)) return GENERATES[dayWuxing];
  if (/财/.test(god)) return CONTROLS[dayWuxing];
  if (/官|杀/.test(god)) return CONTROLLED_BY[dayWuxing];
  return null;
};

/**
 * 原书点名的一步大运或一个流年，按程序的喜忌归成吉、凶、平：干支各算一票，喜多为吉、忌多为凶，相抵或不分喜忌为平；
 * 原书只说「丑运」「辛运」的只看这一个字。地支与原局凑齐三会方、三合局的，按局的五行算（与结果页的大运流年喜忌同一口径，见 juOfZhi）。
 * 大运天干喜、地支忌而克天干的是截脚（任注「支不载干，则十年皆否」），按凶论（与结果页 getDaYunMarks 同一口径）。
 * @param {string[]} [natalZhis] 原局地支
 * @param {string} [kind] 大运或流年；截脚只论大运
 */
export const yunVerdictOf = (ganZhi, favorable, unfavorable, natalZhis = [], kind = '大运') => {
  const elements = [...ganZhi].map((char) => WUXING_OF_GAN[char] ?? juOfZhi(char, natalZhis)?.element ?? WUXING_OF_ZHI[char]);
  const tones = elements.map((element) => (favorable.includes(element) ? 1 : unfavorable.includes(element) ? -1 : 0));
  if (kind !== '流年' && ganZhi.length === 2 && tones[0] === 1 && tones[1] === -1 && CONTROLS[elements[1]] === elements[0]) return '凶';
  const sum = tones.reduce((total, tone) => total + tone, 0);
  return sum > 0 ? '吉' : sum < 0 ? '凶' : '平';
};

const LIUQIN_ITEM_OF_KIND = { 妻: 'spouse', 夫: 'spouse', 子女: 'children', 父: 'parents', 母: 'parents', 父母: 'parents', 兄弟: 'siblings' };
const TONE_VERDICT = { good: '吉', bad: '凶' };

/**
 * 原书说到的某一亲，程序「六亲宫星」（analyzeLiuqin）怎么看，归成吉、凶、平：看那一亲的总体倾向（按任注推的那一句）。
 * 任铁樵不以财为父、印为母，论父母只看年月，所以父、母、父母都看父母一项。
 * @param {object|null} liuqin analyzeLiuqin 的结果
 * @param {string} kind 妻、夫、子女、父、母、父母、兄弟
 */
export const liuqinVerdictOf = (liuqin, kind) => {
  const item = liuqin?.items?.find((candidate) => candidate.key === LIUQIN_ITEM_OF_KIND[kind]);
  return TONE_VERDICT[item?.tone] ?? '平';
};

const GAN_CHARS = '甲乙丙丁戊己庚辛壬癸';
const ZHI_CHARS = '子丑寅卯辰巳午未申酉戌亥';
const YUN_WORDS = new RegExp(`运|一交|交[${GAN_CHARS}${ZHI_CHARS}]|流年|[${GAN_CHARS}${ZHI_CHARS}]年|至[${GAN_CHARS}${ZHI_CHARS}]|[${GAN_CHARS}${ZHI_CHARS}]{1,2}岁`);
const GAN_ZHI_PAIR = new RegExp(`[${GAN_CHARS}][${ZHI_CHARS}]`, 'g');

/**
 * 原书这句六亲是不是应在某步运、某个流年（「一交丙运，刑妻克子」）：条目写了 yun 的照写的；没写的看原文里这句所在的一句话
 * （从句号或分号起到这句为止）有没有说到运、流年，或提到原局以外的干支。运中应事要看岁运，不全是原局六亲的事，回归里另计。
 * @returns {'natal'|'yun'}
 */
export const liuqinScopeOf = (entry, item) => {
  if (item?.yun) return 'yun';
  const text = (entry?.original ?? '').replace(/\n/g, '');
  const quote = (item?.quote ?? '').replace(/[，。；、]+$/, '');
  const at = quote ? text.indexOf(quote) : -1;
  if (at < 0) return 'natal';
  const start = Math.max(text.lastIndexOf('。', at - 1), text.lastIndexOf('；', at - 1)) + 1;
  const head = text.slice(start, at + quote.length);
  const natal = new Set(entry.pillars ?? []);
  const foreign = (head.match(GAN_ZHI_PAIR) ?? []).some((ganZhi) => !natal.has(ganZhi));
  return YUN_WORDS.test(head) || foreign ? 'yun' : 'natal';
};

/**
 * 排盘并对照一条命例。
 * @returns {{ id, pillars, date, chartPillars, expected, program, checks }|{ id, error }}
 */
export const evaluateBaziCase = (entry) => {
  const pillars = entry.pillars ?? [];
  const birth = entry.birth ?? {};
  let input;
  if (birth.calendar === 'solar' || birth.calendar === 'lunar') {
    input = { calendarType: birth.calendar, year: birth.year, month: birth.month, day: birth.day, hourIndex: birth.hourIndex ?? 6, isLeapMonth: birth.isLeapMonth, gender: birth.gender ?? 'male' };
  } else {
    const date = findSolarDateByPillars(pillars);
    if (!date) return { id: entry.id, pillars, error: '1600–2100 年间找不到四柱相同的日子' };
    input = { calendarType: 'solar', year: date.year, month: date.month, day: date.day, hourIndex: date.hourIndex ?? 6, gender: birth.gender ?? 'male' };
  }
  const chart = buildBaziChart(input);
  const chartPillars = chart.pillars.filter((pillar) => pillar.gan).map((pillar) => `${pillar.gan}${pillar.zhi}`);
  const strength = analyzeStrength(chart);
  const judge = judgeBaziPattern(chart, strength);
  const special = judge.special?.name ?? null;
  const programClass = special ? (STRONG_SPECIALS.test(special) ? '旺' : '弱') : strengthClassOf(strength.band);
  const expected = entry.expected ?? {};
  const checks = {};
  // 化气格的旺衰说的是化神，不比日主旺衰。
  if (expected.strength && expected.pattern !== '化气格') {
    checks.strength = expected.strength === programClass ? 'same'
      : (expected.strength === '中和' || programClass === '中和') ? 'near' : 'reversed';
  }
  if (expected.pattern) checks.pattern = samePatternFamily(special, expected.pattern) ? 'same' : 'miss';
  else if (special) checks.pattern = 'extra';
  const dayWuxing = strength.dayWuxing;
  const favorable = strength.favorable.map((item) => item.element);
  const unfavorable = strength.unfavorable.map((item) => item.element);
  // 认出特殊格局时，程序给的是「按此格论」的喜忌，喜用就拿它比；否则拿扶抑喜忌比。
  const specialFavorable = judge.special?.favorable?.map((item) => item.element) ?? null;
  const specialUnfavorable = judge.special?.unfavorable?.map((item) => item.element) ?? null;
  const useGodSource = specialFavorable?.length ? 'special' : 'fuyi';
  if (expected.useGod) {
    const gods = (Array.isArray(expected.useGod) ? expected.useGod : [expected.useGod]).map((god) => useGodElement(god, dayWuxing)).filter(Boolean);
    const fav = useGodSource === 'special' ? specialFavorable : favorable;
    const unfav = useGodSource === 'special' ? specialUnfavorable : unfavorable;
    checks.useGod = fav[0] && gods.includes(fav[0]) ? 'same'
      : fav.slice(0, 2).some((element) => gods.includes(element)) ? 'near'
        : gods[0] && unfav.includes(gods[0]) ? 'reversed' : 'miss';
  }
  // 岁运：原书说吉、凶的那几步运（年），程序按同一套喜忌（认出特殊格局就按此格论）判；原书说「平」的不比。
  const yun = (expected.yun ?? []).map((item) => {
    const program = yunVerdictOf(item.ganZhi, useGodSource === 'special' ? specialFavorable : favorable, useGodSource === 'special' ? specialUnfavorable : unfavorable, chart.pillars.map((pillar) => pillar.zhi), item.kind);
    const check = item.verdict === '平' ? null : program === item.verdict ? 'same' : program === '平' ? 'near' : 'reversed';
    return { ...item, program, check };
  });
  if (yun.some((item) => item.check)) checks.yun = yun.map((item) => item.check).filter(Boolean);
  // 六亲：原书说到某一亲吉凶的，拿结果页「六亲宫星」那一亲的倾向比；原书说「平」的不比。
  // 应在某步运、某个流年的（运中应事）另记在 liuqinYun，看原局倾向与它合不合。
  const liuqinResult = expected.liuqin?.length ? analyzeLiuqin(chart, strength, { special: judge.special }) : null;
  const liuqin = (expected.liuqin ?? []).map((item) => {
    const program = liuqinVerdictOf(liuqinResult, item.kind);
    const check = item.verdict === '平' ? null : program === item.verdict ? 'same' : program === '平' ? 'near' : 'reversed';
    return { ...item, scope: liuqinScopeOf(entry, item), program, check };
  });
  const liuqinChecks = (scope) => liuqin.filter((item) => item.check && item.scope === scope).map((item) => item.check);
  if (liuqinChecks('natal').length) checks.liuqin = liuqinChecks('natal');
  if (liuqinChecks('yun').length) checks.liuqinYun = liuqinChecks('yun');
  return {
    id: entry.id,
    pillars,
    date: input,
    chartPillars,
    pillarsMatch: pillars.every((gz, index) => gz === chartPillars[index]),
    expected,
    program: { band: strength.band, score: strength.score.total, ratio: Math.round(strength.ratio * 100) / 100, class: programClass, special, favorable, unfavorable, specialFavorable, specialUnfavorable, useGodSource, basis: strength.basis, deLing: strength.deLing, pattern: judge.pattern?.name ?? null },
    checks,
    yun,
    liuqin,
  };
};
