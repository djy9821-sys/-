/**
 * 古籍条目 applies 条件的「命中面」抽查：
 *   node scripts/applies-coverage.mjs [--samples 800] [--module bazi|ziwei|liuyao] [--json]
 *
 * 校验脚本只查条件里的名字写得对不对；条件组合起来能不能出现，得拿真盘试。做法分两轮：
 * 1. 随机排一批八字盘、紫微盘（每盘十二宫）、六爻卦（十二类问事轮流），用网页同一套上下文
 *    （baziContextOf / ziweiPalaceContextOf / liuyaoReadingContextOf）逐条试 applies 里的每个条件；
 * 2. 一次没命中的条件再定向造盘重试：八字按条件的日干、月令挑日子排盘；六爻按条件的卦名、动爻、问事直接装卦。
 * 最后分三类列出：程序暂不支持的（紫微流月 / 流日条件、鬼神等程序还没有的问事）、定向重试才命中的（罕见，不用管）、
 * 重试仍没命中的——多半是组合写错了（如紫微在卯写「庙」、天府写「化忌」、甲日子月写正官格），逐条看原文改条件。
 * 另列紫微「命中太宽」的条目：原文点了星名，applies 却只写宫位、地支，命宫在该支的每张盘都会出现，应补 star；
 * 以及「任一颗」写法：stars 列的几颗星能同在一宫，原文若要几颗同在才成立，该写 allStars。
 *
 * 只是检查工具，不进 CI；随机数固定种子，结果可复现。
 */
import { Solar } from 'lunar-javascript';

import { loadDataFiles } from './lib/dataFiles.mjs';
import {
  baziContextOf,
  buildLibrary,
  conditionMatches,
  liuyaoReadingContextOf,
  ziweiPalaceContextOf,
} from '../src/data/classics/library.js';
import { LIUYAO_TOPIC_NAMES, LIUYAO_TOPIC_PENDING } from '../src/data/classics/topicNames.js';
import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';
import { findRelations } from '../src/utils/baziRelations.js';
import { HEXAGRAM_MAP } from '../src/utils/hexagramLogic.js';
import { createZiweiHoroscope } from '../src/utils/ziweiBirth.js';
import { analyzeZiweiPatterns, analyzeZiweiStructures } from '../src/utils/ziweiPatterns.js';
import { buildLiuYaoReading } from '../src/utils/liuyao.js';
import { judgeLiuYao, LIUYAO_TOPICS } from '../src/utils/liuyaoJudge.js';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SAMPLES = Math.max(50, Number(option('samples', 800)) || 800);
const ONLY = option('module', null);
const AS_JSON = args.includes('--json');
const RETRIES = 60;

let seed = 20261028;
const random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pickInt = (min, max) => min + Math.floor(random() * (max - min + 1));
const pickOne = (list) => list[pickInt(0, list.length - 1)];
const toArray = (value) => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);
const pad = (value) => String(value).padStart(2, '0');

// ---------- 八字 ----------
const baziContextOfChart = (chart) => {
  const strength = analyzeStrength(chart);
  const judge = judgeBaziPattern(chart, strength);
  const relations = findRelations(chart.pillars.map((pillar) => ({ key: pillar.key, label: pillar.name, gan: pillar.gan, zhi: pillar.zhi })));
  return baziContextOf({ chart, strength, judge, relations });
};
const randomBaziInput = () => ({
  calendarType: 'solar',
  year: pickInt(1930, 2029),
  month: pickInt(1, 12),
  day: pickInt(1, 28),
  hourIndex: pickInt(0, 11),
  gender: random() < 0.5 ? 'male' : 'female',
});
function* baziContexts(count) {
  for (let i = 0; i < count; i += 1) yield baziContextOfChart(buildBaziChart(randomBaziInput()));
}

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
/** 各月令（节气月）的大致公历起日：取节后第 3 天到下个节前，避开交节当天。 */
const MONTH_ZHI_START = Object.freeze({
  寅: [2, 7], 卯: [3, 9], 辰: [4, 8], 巳: [5, 9], 午: [6, 9], 未: [7, 10],
  申: [8, 10], 酉: [9, 10], 戌: [10, 11], 亥: [11, 10], 子: [12, 10], 丑: [1, 9],
});
/** 专旺格只出在日干与月令同气的盘里：定向造盘时按格名补上日干、月令的范围。 */
const PATTERN_HINTS = Object.freeze({
  曲直格: { dayGan: ['甲', '乙'], monthZhi: ['寅', '卯', '辰'] },
  炎上格: { dayGan: ['丙', '丁'], monthZhi: ['巳', '午', '未'] },
  稼穑格: { dayGan: ['戊', '己'], monthZhi: ['辰', '戌', '丑', '未'] },
  从革格: { dayGan: ['庚', '辛'], monthZhi: ['申', '酉', '戌'] },
  润下格: { dayGan: ['壬', '癸'], monthZhi: ['亥', '子', '丑'] },
});
/** 按条件的日干、月令挑一天排盘（其余随机）；条件里没有这两项就按格名提示，再没有就整盘随机。 */
const targetedBaziContext = (cond) => {
  const hint = toArray(cond.pattern).map((name) => PATTERN_HINTS[name]).find(Boolean) ?? {};
  const dayGans = toArray(cond.dayGan ?? cond.dayGans ?? hint.dayGan);
  const monthZhis = toArray(cond.monthZhi ?? cond.monthZhis ?? hint.monthZhi);
  const input = randomBaziInput();
  if (monthZhis.length) {
    const [month, day] = MONTH_ZHI_START[pickOne(monthZhis)];
    const start = new Date(input.year, month - 1, day + pickInt(0, 16));
    Object.assign(input, { month: start.getMonth() + 1, day: start.getDate(), year: start.getFullYear() });
  }
  if (dayGans.length) {
    const target = GAN.indexOf(pickOne(dayGans));
    const current = GAN.indexOf(Solar.fromYmd(input.year, input.month, input.day).getLunar().getDayGan());
    const date = new Date(input.year, input.month - 1, input.day + ((target - current + 10) % 10));
    Object.assign(input, { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
  }
  return baziContextOfChart(buildBaziChart(input));
};

// ---------- 紫微 ----------
/** 紫微没有好的定向造盘办法：没命中的条件再多排几倍的盘重试。 */
const ZIWEI_RETRY_FACTOR = 4;
function* ziweiContexts(count) {
  for (let i = 0; i < count; i += 1) {
    const gender = random() < 0.5 ? 'male' : 'female';
    const horoscope = createZiweiHoroscope({
      calendarType: 'solar',
      birthDate: `${pickInt(1930, 2029)}-${pad(pickInt(1, 12))}-${pad(pickInt(1, 28))}`,
      timeIndex: pickInt(0, 11),
      gender,
    });
    const patterns = [...analyzeZiweiPatterns(horoscope), ...analyzeZiweiStructures(horoscope)].map((item) => item.name);
    const genderLabel = gender === 'male' ? '男' : '女';
    for (const palace of horoscope.palaces) {
      yield ziweiPalaceContextOf(palace, { gender: genderLabel, patterns: palace.name === '命宫' ? patterns : [] });
      // 古籍弹层还能切到「当前大限 / 今年流年」：任何一宫都可能是那一层的命宫
      yield ziweiPalaceContextOf(palace, { gender: genderLabel, limit: '大限' });
      yield ziweiPalaceContextOf(palace, { gender: genderLabel, limit: '流年' });
    }
  }
}

// ---------- 六爻 ----------
const COIN_VALUES = [6, 7, 7, 7, 8, 8, 8, 9];
const BITS_OF_HEXAGRAM = Object.freeze(Object.fromEntries(
  // HEXAGRAM_MAP 的键自上而下，爻值数组自下而上。
  Object.entries(HEXAGRAM_MAP).map(([key, hexagram]) => [hexagram.name, [...key].reverse().map(Number)]),
));
/** 古籍叫法 → 程序类别（一个叫法可能归几个类别，如「产育」既算子女孕育也算产妇平安）。 */
const TOPIC_KEYS_OF_NAME = Object.freeze(Object.entries(LIUYAO_TOPIC_NAMES).reduce((acc, [key, names]) => {
  names.forEach((name) => { (acc[name] ??= []).push(key); });
  return acc;
}, {}));
const liuyaoContextOfValues = (values, topic) => {
  const date = new Date(pickInt(2000, 2030), pickInt(0, 11), pickInt(1, 28), pickInt(0, 23), 30);
  const reading = buildLiuYaoReading(values, date, { topic, gender: random() < 0.5 ? 'male' : 'female' });
  return liuyaoReadingContextOf(reading, judgeLiuYao(reading));
};
function* liuyaoContexts(count) {
  for (let i = 0; i < count; i += 1) {
    const values = Array.from({ length: 6 }, () => pickOne(COIN_VALUES));
    yield liuyaoContextOfValues(values, LIUYAO_TOPICS[i % LIUYAO_TOPICS.length].value);
  }
}
/** 按条件的卦名、动爻、问事直接装卦；条件没写的部分随机。 */
const targetedLiuyaoContext = (cond) => {
  const hexagram = pickOne([...toArray(cond.hexagram), ...toArray(cond.hexagrams)].filter((name) => BITS_OF_HEXAGRAM[name]));
  const bits = hexagram ? BITS_OF_HEXAGRAM[hexagram] : Array.from({ length: 6 }, () => pickInt(0, 1));
  let moving = toArray(cond.line).map(Number);
  if (!moving.length) {
    const mode = cond.movingLines ?? pickOne(['无', '一', '多']);
    const count = mode === '无' ? 0 : mode === '一' ? 1 : pickInt(2, 4);
    const positions = [1, 2, 3, 4, 5, 6].sort(() => random() - 0.5);
    moving = positions.slice(0, count);
  }
  const values = bits.map((bit, i) => (moving.includes(i + 1) ? (bit ? 9 : 6) : (bit ? 7 : 8)));
  const topicKey = pickOne(TOPIC_KEYS_OF_NAME[pickOne(toArray(cond.topic))] ?? LIUYAO_TOPICS.map((topic) => topic.value));
  return liuyaoContextOfValues(values, topicKey);
};

// ---------- 主流程 ----------
const MODULES = {
  bazi: { generate: () => baziContexts(SAMPLES), retry: targetedBaziContext, retries: (cond) => (cond.pattern ? 300 : RETRIES) },
  ziwei: { generate: () => ziweiContexts(Math.ceil(SAMPLES / 2)), more: () => ziweiContexts(Math.ceil(SAMPLES / 2) * ZIWEI_RETRY_FACTOR) },
  liuyao: { generate: () => liuyaoContexts(SAMPLES * 3), retry: targetedLiuyaoContext, retries: () => RETRIES },
};
/** 程序暂不支持、注定匹配不上的条件：说明原因。 */
const unsupportedReason = (module, cond) => {
  if (module === 'ziwei' && cond.limit && !['本命', '大限', '流年'].includes(cond.limit)) return `程序的古籍弹层只有本命盘、当前大限、今年流年三层，还没有「${cond.limit}」的上下文`;
  if (module === 'liuyao') {
    const pending = toArray(cond.topic).filter((name) => LIUYAO_TOPIC_PENDING.includes(name));
    if (pending.length && pending.length === toArray(cond.topic).length) return `问事类别「${pending.join('、')}」程序还没有`;
  }
  return null;
};
const isMachine = (cond) => cond && Object.keys(cond).some((key) => key !== 'module' && key !== 'note');

const library = buildLibrary(loadDataFiles().classics);
const report = {};
for (const [module, { generate, retry, retries, more }] of Object.entries(MODULES)) {
  if (ONLY && ONLY !== module) continue;
  const conditions = library.entries.flatMap((entry) => entry.applies
    .map((cond, index) => ({ entry, cond, index }))
    .filter(({ cond }) => cond.module === module && isMachine(cond)));
  const hits = new Array(conditions.length).fill(0);
  // 紫微 stars 列了几颗星（任一颗在就算）：同时试「几颗都在」，看这几颗星能不能同在一宫。
  const orStars = module === 'ziwei' ? conditions
    .map(({ cond }, i) => {
      const { stars, ...rest } = cond;
      return toArray(stars).length >= 2 ? { i, allCond: { ...rest, allStars: toArray(stars) } } : null;
    })
    .filter(Boolean) : [];
  const together = new Set();
  let contexts = 0;
  for (const ctx of generate()) {
    contexts += 1;
    conditions.forEach(({ cond }, i) => { if (conditionMatches(cond, ctx)) hits[i] += 1; });
    orStars.forEach(({ i, allCond }) => { if (!together.has(i) && conditionMatches(allCond, ctx)) together.add(i); });
  }
  const unsupported = [];
  const rare = [];
  const pending = [];
  conditions.forEach(({ entry, cond, index }, i) => {
    if (hits[i] > 0) return;
    const item = { id: entry.id, title: entry.title, index, cond };
    const reason = unsupportedReason(module, cond);
    if (reason) { unsupported.push({ ...item, reason }); return; }
    if (retry) {
      for (let attempt = 0; attempt < retries(cond); attempt += 1) {
        if (conditionMatches(cond, retry(cond))) { rare.push(item); return; }
      }
    }
    pending.push(item);
  });
  // 没有定向办法的模块：只拿没命中的条件，再多排几倍的盘试一遍。
  let never = pending;
  if (more && pending.length) {
    const found = new Set();
    for (const ctx of more()) {
      pending.forEach((item, i) => { if (!found.has(i) && conditionMatches(item.cond, ctx)) found.add(i); });
      if (found.size === pending.length) break;
    }
    pending.forEach((item, i) => { if (found.has(i)) rare.push(item); });
    never = pending.filter((_, i) => !found.has(i));
  }
  report[module] = { contexts, conditions: conditions.length, unsupported, rare, never };
  if (module === 'ziwei') {
    report[module].anyOf = orStars.filter(({ i }) => together.has(i)).map(({ i }) => {
      const { entry, cond, index } = conditions[i];
      return { id: entry.id, title: entry.title, index, stars: toArray(cond.stars) };
    });
  }
}

// 命中太宽：紫微条目原文点了星名，applies 却只按宫位、地支等命中——命宫在某支的每张盘都会出现这条，不管宫里坐什么星。
// 只看全称（「紫府」「机梁」「日月」这类简称不算），「拱」「朝」「夹」「照」来的星本就不坐本宫，可以不补，在 notes 说明。
const ZIWEI_NAMED_STARS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
  '文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存', '天马', '擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];
const broadZiwei = (!ONLY || ONLY === 'ziwei') ? library.entries
  .map((entry) => {
    const conds = entry.applies.filter((cond) => cond.module === 'ziwei' && isMachine(cond));
    if (!conds.length || conds.some((cond) => cond.star || cond.stars || cond.allStars || cond.pattern)) return null;
    const named = ZIWEI_NAMED_STARS.filter((star) => (entry.original ?? '').includes(star));
    return named.length ? { id: entry.id, title: entry.title, named } : null;
  })
  .filter(Boolean) : [];
if (report.ziwei) report.ziwei.broad = broadZiwei;

const describe = ({ id, title, index, cond, reason }) => {
  const { module: _module, note, ...rest } = cond;
  return `  - ${id}（${title}）条件 ${index + 1}：${JSON.stringify(rest)}${note ? `  // ${note}` : ''}${reason ? `\n      → ${reason}` : ''}`;
};
if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
} else {
  Object.entries(report).forEach(([module, { contexts, conditions, unsupported, rare, never }]) => {
    console.log(`\n【${module}】随机试了 ${contexts} 个上下文、${conditions} 个机器条件：`
      + `程序暂不支持 ${unsupported.length} 个，罕见（定向重试才命中）${rare.length} 个，重试仍未命中 ${never.length} 个。`);
    if (never.length) {
      console.log('  重试仍未命中（多半写错，请对照原文）：');
      never.forEach((item) => console.log(describe(item)));
    }
    if (unsupported.length) {
      console.log('  程序暂不支持（数据可以保留，程序补上对应功能后自然生效）：');
      unsupported.forEach((item) => console.log(describe(item)));
    }
  });
  if (broadZiwei.length) {
    console.log(`\n【ziwei】命中太宽 ${broadZiwei.length} 条：原文点了星名，applies 只按宫位、地支等命中（命宫在该支的盘都会出现）。`
      + '坐在本宫的星请补进 star；「拱」「朝」「夹」「照」来的星不坐本宫，不补，在 notes 说明。');
    broadZiwei.forEach(({ id, title, named }) => console.log(`  - ${id}（${title}）原文提到：${named.join('、')}`));
  }
  const anyOf = report.ziwei?.anyOf ?? [];
  if (anyOf.length) {
    console.log(`\n【ziwei】「任一颗」写法 ${anyOf.length} 个条件：stars 列的几颗星任一颗在宫就命中，而这几颗星能同在一宫。`
      + '原文要几颗同在才成立的（「武曲贪狼」「廉贞七杀」「武曲会擎羊」「火铃相遇」），改写 allStars，不然只坐一颗星的盘也会出这条断语；'
      + '原文本意就是任一颗的（「四煞守身命」），把同组的星写进同一个 stars，这里会自动不再列出（四煞不能同在一宫）。');
    anyOf.forEach(({ id, title, index, stars }) => console.log(`  - ${id}（${title}）条件 ${index + 1}：stars ${stars.join('、')}`));
  }
}
