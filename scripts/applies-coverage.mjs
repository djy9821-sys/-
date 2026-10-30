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
 * 另列紫微「命中太宽」的条目：原文点了星名，applies 却只写宫位、地支，命宫在该支的每张盘都会出现，应补 star / meet；
 * 以及「任一颗」写法：stars 列的几颗星能同在一宫，原文若要几颗同在才成立，该写 allStars；
 * 原文本意就是任一颗的，在该条件的 note 里写明「任一颗」，这里就不再列。
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
  ziweiDoujunPalace,
  ziweiFlowOf,
  ziweiNatalOf,
  ziweiNeighborsOf,
  ziweiOppositeOf,
  ziweiPalaceContextOf,
  ziweiSurroundOf,
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
  // 「六亲宫星」按每一亲各取一次上下文，这里四亲一起给，讲某一亲的条目都能试到。
  return { ...baziContextOf({ chart, strength, judge, relations }), liuqin: ['夫妻', '子女', '父母', '兄弟'] };
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
/** 紫微没有按星造盘的办法：没命中的条件先按条件里的性别、生年干支定向排盘重试，再多排几倍的盘重试。 */
const ZIWEI_RETRY_FACTOR = 4;
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const yearStemOf = (year) => GAN[(year - 4 + 100) % 10];
const yearBranchOf = (year) => ZHI[(year - 4 + 120) % 12];
/**
 * 看大限、流年那一层时，排盘库那一层的运限对象（流曜、四化）：取命主 2 到 80 岁间随机一年（流曜随流年干支变，多试几次就能遇到）。
 * 返回 { 大限: scope, 小限: scope, 流年: scope }，排盘库没有 horoscope() 时为空。
 */
const flowScopesOf = (horoscope) => {
  if (typeof horoscope?.horoscope !== 'function') return {};
  const birthYear = Number(String(horoscope.solarDate ?? '').split('-')[0]) || 1980;
  try {
    const h = horoscope.horoscope(`${birthYear + pickInt(2, 80)}-${pad(pickInt(1, 12))}-${pad(pickInt(1, 28))} 12:00`);
    return { 大限: h?.decadal ?? null, 小限: h?.age ?? null, 流年: h?.yearly ?? null };
  } catch {
    return {};
  }
};
/** 流年斗君所落本命宫名（流年层带上，「斗君过度在某宫」的条件才判得到）；没有流年对象时为 null。 */
const doujunNameOf = (horoscope, yearly) => (Number.isInteger(yearly?.index) ? ziweiDoujunPalace(horoscope, horoscope.palaces, yearly.index)?.name ?? null : null);

/**
 * 程序格局各一张已知成立的命例（公历、时辰序、性别；与 test/ziwei-patterns.test.js 的命例同源，少见的格局是穷举找的）：
 * 写了 pattern 的条件按格局造不出盘，随机盘又未必碰得上（贪火相逢、明珠出海几千张才一张），重试时直接排这张。
 */
const ZIWEI_PATTERN_EXAMPLES = Object.freeze({
  三奇加会: ['1995-1-1', 0, 'female'], 杀破狼星系: ['1995-1-1', 0, 'female'], 机月同梁格: ['1990-1-4', 11, 'female'], 石中隐玉格: ['1990-1-4', 11, 'female'],
  七杀朝斗格: ['1988-1-6', 4, 'female'], 紫府朝垣格: ['1988-1-6', 4, 'female'], 财与囚仇格: ['1998-1-2', 4, 'female'], 府相朝垣格: ['1968-2-17', 0, 'female'],
  生不逢时格: ['1968-2-17', 0, 'female'], 马落空亡格: ['1968-2-17', 0, 'female'], 日月同临格: ['1945-6-6', 4, 'male'], 日月并明格: ['1950-2-1', 0, 'male'],
  日月夹财格: ['1966-2-19', 3, 'male'], 金灿光辉格: ['2007-12-25', 6, 'male'], 日月夹命格: ['1994-4-14', 3, 'female'], 君臣庆会格: ['2000-5-21', 10, 'male'],
  坐贵向贵格: ['1942-1-19', 11, 'female'], 财禄夹马格: ['1973-4-8', 5, 'male'], 月生沧海格: ['1978-10-15', 1, 'male'], 一生孤贫格: ['1978-10-15', 1, 'male'],
  两重华盖格: ['1999-8-2', 1, 'female'], 君子在野格: ['1952-10-23', 2, 'female'], 明禄暗禄格: ['1986-3-10', 10, 'female'], 禄逢两杀格: ['1986-3-10', 10, 'female'],
  科明暗禄格: ['1954-2-19', 3, 'female'], 极居卯酉格: ['1993-2-20', 11, 'male'], 权禄生逢格: ['2007-4-20', 4, 'male'], 巨机居卯格: ['1956-9-5', 6, 'male'],
  羊刃入庙格: ['1937-8-1', 0, 'male'], 善荫朝纲格: ['1971-1-12', 9, 'female'], 明珠出海格: ['2019-7-15', 0, 'male'], 刑囚夹印格: ['2012-4-20', 7, 'female'],
  辅弼拱主格: ['1944-11-10', 9, 'female'], 日月照璧格: ['2011-7-18', 3, 'female'], 阳梁昌禄格: ['1951-3-6', 11, 'female'], 日出扶桑格: ['1963-1-24', 2, 'female'],
  月朗天门格: ['1963-1-24', 2, 'female'], 武曲守垣格: ['1971-11-27', 8, 'female'], 贪火相逢格: ['2001-5-15', 7, 'male'], 极向离明格: ['2014-8-20', 2, 'male'],
});
const ziweiPatternExampleOf = (pattern) => {
  const name = toArray(pattern).map((item) => String(item).replace(/格$/, '')).find((bare) => ZIWEI_PATTERN_EXAMPLES[bare] || ZIWEI_PATTERN_EXAMPLES[`${bare}格`]);
  return name ? ZIWEI_PATTERN_EXAMPLES[name] ?? ZIWEI_PATTERN_EXAMPLES[`${name}格`] : null;
};

/**
 * 按条件定向排一张紫微盘，返回它的一个宫的上下文：生年干支、性别照条件挑（出生日取农历年不会跨年的月份），
 * 宫取条件写的宫（没写就随机），层取条件的运限（没写就本命）。星曜、地支没法定向，靠多试几次；
 * 写了格局的条件先排该格局的已知命例（随机盘碰不上的格局也能试到）。
 */
const targetedZiweiContext = (cond) => {
  const stems = toArray(cond.yearGan ?? cond.yearGans);
  const branches = toArray(cond.yearZhi ?? cond.yearZhis);
  const years = [];
  for (let year = 1930; year <= 2029; year += 1) {
    if ((!stems.length || stems.includes(yearStemOf(year))) && (!branches.length || branches.includes(yearBranchOf(year)))) years.push(year);
  }
  const year = years.length ? pickOne(years) : pickInt(1930, 2029);
  let gender = cond.gender === '男' ? 'male' : cond.gender === '女' ? 'female' : (random() < 0.5 ? 'male' : 'female');
  // 左辅右弼按农历月安、文昌文曲按时辰安：条件点了这几颗星又点了地支的，直接把月份、时辰挑到那一支（农历输入，月份不会错位）。
  const stars = [...toArray(cond.star), ...toArray(cond.stars), ...toArray(cond.allStars)];
  const jia = toArray(cond.jia);
  // 辅弼夹、昌曲夹只夹得住丑未两宫（左辅右弼、文昌文曲各从辰戌对走，宫序相加恒为十）：三月（寅时）生左辅午右弼申夹未，九月（申时）生左辅子右弼寅夹丑。
  const flankedAt = jia.includes('左辅') && jia.includes('右弼') ? pickOne([[3, 5], [9, 11]])
    : jia.includes('文昌') && jia.includes('文曲') ? pickOne([[2, 5], [8, 11]]) : null;
  const palaceBranch = toArray(cond.branches).length ? pickOne(toArray(cond.branches)) : null;
  const at = palaceBranch ? (ZHI.indexOf(palaceBranch) - 2 + 12) % 12 : (flankedAt ? flankedAt[1] : null); // 从寅起算的宫序
  let month = pickInt(1, 12);
  let timeIndex = pickInt(0, 11);
  if (flankedAt && at === flankedAt[1]) {
    if (jia.includes('左辅')) {
      month = flankedAt[0];
      if (toArray(cond.palace).includes('命宫')) timeIndex = (month - 1 - at + 24) % 12;
    } else {
      timeIndex = flankedAt[0];
      if (toArray(cond.palace).includes('命宫')) month = ((at + timeIndex) % 12) + 1;
    }
  } else if (at !== null) {
    if (stars.includes('右弼')) month = ((8 - at + 12) % 12) + 1;
    else if (stars.includes('左辅')) month = ((at - 2 + 12) % 12) + 1;
    if (stars.includes('文昌')) timeIndex = (8 - at + 12) % 12;
    else if (stars.includes('文曲')) timeIndex = (at - 2 + 12) % 12;
    // 条件写的是命宫在某支：命宫 = 寅起数到生月，再逆数到生时，时辰挑到让命宫落在那一支（昌曲已占用时辰的除外）
    else if (toArray(cond.palace).includes('命宫')) timeIndex = (month - 1 - at + 24) % 12;
  }
  const example = cond.pattern && random() < 0.5 ? ziweiPatternExampleOf(cond.pattern) : null;
  const horoscope = example
    ? createZiweiHoroscope({ calendarType: 'solar', birthDate: example[0], timeIndex: example[1], gender: example[2] })
    : createZiweiHoroscope({
      calendarType: 'lunar',
      birthDate: `${year}-${pad(month)}-${pad(pickInt(1, 28))}`,
      timeIndex,
      gender,
    });
  if (example) gender = example[2];
  // 格局按命宫三方四正判，只在命宫的上下文里出现：格局条件一律取命宫
  const wanted = [...toArray(cond.palace), ...(cond.pattern ? ['命宫'] : [])].map((name) => (name === '身宫' ? horoscope.palaces.find((item) => item.isBodyPalace)?.name : name)).filter(Boolean);
  const palace = (wanted.length ? horoscope.palaces.find((item) => wanted.includes(item.name)) : null) ?? pickOne(horoscope.palaces);
  const patterns = palace.name === '命宫' ? [...analyzeZiweiPatterns(horoscope), ...analyzeZiweiStructures(horoscope)].map((item) => item.name) : [];
  const limit = cond.limit && cond.limit !== '本命' ? cond.limit : '本命';
  const surround = ziweiSurroundOf(horoscope.palaces, palace);
  const scopes = limit === '本命' ? {} : flowScopesOf(horoscope);
  return ziweiPalaceContextOf(palace, {
    gender: gender === 'male' ? '男' : '女',
    limit,
    patterns,
    neighbors: ziweiNeighborsOf(horoscope.palaces, palace),
    opposite: ziweiOppositeOf(horoscope.palaces, palace),
    surround,
    natal: ziweiNatalOf(horoscope),
    // 运限层带该层的流曜与四化（流羊、运昌……），与界面、提示词一样；流年层再带斗君所落的宫
    flow: limit === '本命' ? null : ziweiFlowOf(scopes[limit] ?? null, palace, surround),
    doujun: limit === '流年' ? doujunNameOf(horoscope, scopes.流年) : null,
  });
};
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
    const scopes = flowScopesOf(horoscope);
    for (const palace of horoscope.palaces) {
      // 与界面、提示词一样：带左右两邻（夹）、对宫（空宫借星）、三方四正（会、拱、照）
      const around = {
        neighbors: ziweiNeighborsOf(horoscope.palaces, palace),
        opposite: ziweiOppositeOf(horoscope.palaces, palace),
        surround: ziweiSurroundOf(horoscope.palaces, palace),
        natal: ziweiNatalOf(horoscope),
      };
      yield ziweiPalaceContextOf(palace, { gender: genderLabel, patterns: palace.name === '命宫' ? patterns : [], ...around });
      // 古籍弹层还能切到「当前大限 / 今年流年」：任何一宫都可能是那一层的命宫；带该层的流曜与四化
      yield ziweiPalaceContextOf(palace, { gender: genderLabel, limit: '大限', ...around, flow: ziweiFlowOf(scopes.大限, palace, around.surround) });
      yield ziweiPalaceContextOf(palace, { gender: genderLabel, limit: '小限', ...around, flow: ziweiFlowOf(scopes.小限, palace, around.surround) });
      yield ziweiPalaceContextOf(palace, { gender: genderLabel, limit: '流年', ...around, flow: ziweiFlowOf(scopes.流年, palace, around.surround), doujun: doujunNameOf(horoscope, scopes.流年) });
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
  ziwei: { generate: () => ziweiContexts(Math.ceil(SAMPLES / 2)), retry: targetedZiweiContext, retries: () => RETRIES * 5, more: () => ziweiContexts(Math.ceil(SAMPLES / 2) * ZIWEI_RETRY_FACTOR) },
  liuyao: { generate: () => liuyaoContexts(SAMPLES * 3), retry: targetedLiuyaoContext, retries: () => RETRIES },
};
/** 程序暂不支持、注定匹配不上的条件：说明原因。 */
const unsupportedReason = (module, cond) => {
  if (module === 'ziwei' && cond.limit && !['本命', '大限', '小限', '流年'].includes(cond.limit)) return `程序的古籍弹层只有本命盘、当前大限、今年小限、今年流年四层，还没有「${cond.limit}」的上下文`;
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
      // note 里写明「任一」的，是核对过原文本意就是任一颗，不再列。
      if (toArray(stars).length < 2 || /任一/.test(cond.note ?? '')) return null;
      return { i, allCond: { ...rest, allStars: toArray(stars) } };
    })
    .filter(Boolean) : [];
  const together = new Set();
  let contexts = 0;
  for (const ctx of generate()) {
    contexts += 1;
    conditions.forEach(({ cond }, i) => { if (conditionMatches(cond, ctx)) hits[i] += 1; });
    // 没写运限的条件只拿本命层的上下文试「几颗都在」：运限层把流羊算作擎羊，会让本命从不同宫的羊陀「同在」。
    orStars.forEach(({ i, allCond }) => {
      if (together.has(i) || (!allCond.limit && (ctx.limit ?? '本命') !== '本命')) return;
      if (conditionMatches(allCond, ctx)) together.add(i);
    });
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
// 只看全称（「紫府」「机梁」「日月」这类简称不算），括号里的批注不算；「夹」来的星写 jia，「拱」「朝」「照」「会」来的星写 meet / meetAll，
// 「无正曜」写 empty。只按运限（limit）、不限宫位地支的总论条目不算太宽。
const ZIWEI_NAMED_STARS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
  '文昌', '文曲', '左辅', '右弼', '天魁', '天钺', '禄存', '天马', '擎羊', '陀罗', '火星', '铃星', '地空', '地劫'];
const STAR_KEYS = ['star', 'stars', 'allStars', 'jia', 'pattern', 'meet', 'meetAll', 'empty'];
const broadZiwei = (!ONLY || ONLY === 'ziwei') ? library.entries
  .map((entry) => {
    const conds = entry.applies.filter((cond) => cond.module === 'ziwei' && isMachine(cond));
    if (!conds.length || conds.some((cond) => STAR_KEYS.some((key) => cond[key]))) return null;
    if (!conds.some((cond) => cond.palace || cond.branches)) return null;
    const text = (entry.original ?? '').replace(/[（(][^）)]*[）)]/g, '');
    const named = ZIWEI_NAMED_STARS.filter((star) => text.includes(star));
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
      + '坐在本宫的星请补进 star；左右两邻「夹」来的星写 jia；「拱」「朝」「照」「会」来的星写 meet / meetAll；「无正曜」写 empty。');
    broadZiwei.forEach(({ id, title, named }) => console.log(`  - ${id}（${title}）原文提到：${named.join('、')}`));
  }
  const anyOf = report.ziwei?.anyOf ?? [];
  if (anyOf.length) {
    console.log(`\n【ziwei】「任一颗」写法 ${anyOf.length} 个条件：stars 列的几颗星任一颗在宫就命中，而这几颗星能同在一宫。`
      + '原文要几颗同在才成立的（「武曲贪狼」「廉贞七杀」「武曲会擎羊」「火铃相遇」），改写 allStars，不然只坐一颗星的盘也会出这条断语；'
      + '原文本意就是任一颗的（「四煞守身命」「哭虚临命」），在该条件的 note 里写明「任一颗」，这里就不再列；四煞这类不能同在一宫的也不列。');
    anyOf.forEach(({ id, title, index, stars }) => console.log(`  - ${id}（${title}）条件 ${index + 1}：stars ${stars.join('、')}`));
  }
}
