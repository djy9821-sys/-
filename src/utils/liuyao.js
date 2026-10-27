/**
 * 六爻装卦
 *
 * 输入六个爻值（自初爻至上爻；6 老阴、7 少阳、8 少阴、9 老阳）与起卦时间，
 * 得到本卦、变卦、互卦，以及纳甲（京房纳甲法）、六亲、六神、世应、伏神，
 * 并按月建、日辰标出旬空、月破、日冲。
 */
import { Lunar, LunarUtil, Solar } from 'lunar-javascript';
import { HEXAGRAM_MAP } from './hexagramLogic.js';
import { getYaoCi, YAO_CI } from '../data/yaoci.js';
import { LIUYAO_METHODS, LIUYAO_TOPIC_LABELS } from './liuyaoRecord.js';
import { describeLiuYaoSources } from '../data/liuyaoSources.js';

export const LINE_VALUES = Object.freeze({
  6: { value: 6, name: '老阴', isYang: false, isMoving: true },
  7: { value: 7, name: '少阳', isYang: true, isMoving: false },
  8: { value: 8, name: '少阴', isYang: false, isMoving: false },
  9: { value: 9, name: '老阳', isYang: true, isMoving: true },
});

/**
 * 三枚铜钱的阳面数量 → 爻值。
 * 《增删卜易·以钱代蓍法》以背（无字的一面）为阳：一背为单（少阳）、二背为拆（少阴）、三背为重（老阳）、三字为交（老阴）。
 */
export const coinsToLineValue = (yangFaces) => [6, 7, 8, 9][yangFaces] ?? 8;

const TRIGRAMS = Object.freeze({
  乾: { symbol: '天', bits: [1, 1, 1], element: '金', stems: ['甲', '壬'], branches: ['子', '寅', '辰', '午', '申', '戌'] },
  兑: { symbol: '泽', bits: [1, 1, 0], element: '金', stems: ['丁', '丁'], branches: ['巳', '卯', '丑', '亥', '酉', '未'] },
  离: { symbol: '火', bits: [1, 0, 1], element: '火', stems: ['己', '己'], branches: ['卯', '丑', '亥', '酉', '未', '巳'] },
  震: { symbol: '雷', bits: [1, 0, 0], element: '木', stems: ['庚', '庚'], branches: ['子', '寅', '辰', '午', '申', '戌'] },
  巽: { symbol: '风', bits: [0, 1, 1], element: '木', stems: ['辛', '辛'], branches: ['丑', '亥', '酉', '未', '巳', '卯'] },
  坎: { symbol: '水', bits: [0, 1, 0], element: '水', stems: ['戊', '戊'], branches: ['寅', '辰', '午', '申', '戌', '子'] },
  艮: { symbol: '山', bits: [0, 0, 1], element: '土', stems: ['丙', '丙'], branches: ['辰', '午', '申', '戌', '子', '寅'] },
  坤: { symbol: '地', bits: [0, 0, 0], element: '土', stems: ['乙', '癸'], branches: ['未', '巳', '卯', '丑', '亥', '酉'] },
});

const TRIGRAM_BY_BITS = Object.fromEntries(Object.entries(TRIGRAMS).map(([name, { bits }]) => [bits.join(''), name]));

export const ZHI_ELEMENT = Object.freeze({ 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' });
export const ZHI_CLASH = Object.freeze({ 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' });
export const ZHI_HARMONY = Object.freeze({ 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' });
export const GENERATES = Object.freeze({ 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' });
export const CONTROLS = Object.freeze({ 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' });
const SIX_GODS = Object.freeze(['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']);
const GOD_START = Object.freeze({ 甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5 });
const PALACE_LABELS = Object.freeze(['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂']);
const PALACE_SHI = Object.freeze([6, 1, 2, 3, 4, 5, 4, 3]);
export const POSITION_NAMES = Object.freeze(['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']);
export const RELATIVE_ORDER = Object.freeze(['父母', '兄弟', '子孙', '妻财', '官鬼']);

/** 本宫五行 → 某爻五行的六亲。 */
export const relativeOf = (palaceElement, element) => {
  if (element === palaceElement) return '兄弟';
  if (GENERATES[palaceElement] === element) return '子孙';
  if (GENERATES[element] === palaceElement) return '父母';
  if (CONTROLS[palaceElement] === element) return '妻财';
  return '官鬼';
};

const bitsToKey = (bits) => [...bits].reverse().join(''); // HEXAGRAM_MAP 的键自上爻至初爻
const trigramOf = (bits) => TRIGRAM_BY_BITS[bits.join('')];

/** 纳甲：下卦取本卦三爻的前三位，上卦取其后三位。 */
const najiaOf = (bits) => {
  const lower = TRIGRAMS[trigramOf(bits.slice(0, 3))];
  const upper = TRIGRAMS[trigramOf(bits.slice(3, 6))];
  return Array.from({ length: 6 }, (_, i) => {
    const trigram = i < 3 ? lower : upper;
    const gan = trigram.stems[i < 3 ? 0 : 1];
    const zhi = trigram.branches[i];
    return { gan, zhi, ganZhi: `${gan}${zhi}`, element: ZHI_ELEMENT[zhi] };
  });
};

/**
 * 六冲卦与六合卦：初与四、二与五、三与上三对爻的地支两两相冲为六冲（八纯卦、天雷无妄、雷天大壮），
 * 两两相合为六合（否、泰、困、节、旅、贲、豫、复）。按纳甲算，不靠卦名表。
 */
export const hexagramRelationOf = (bits) => {
  const najia = najiaOf(bits);
  const pairs = [[0, 3], [1, 4], [2, 5]].map(([a, b]) => [najia[a].zhi, najia[b].zhi]);
  if (pairs.every(([a, b]) => ZHI_CLASH[a] === b)) return '六冲';
  if (pairs.every(([a, b]) => ZHI_HARMONY[a] === b)) return '六合';
  return '';
};

const describeHexagram = (bits) => {
  const lower = trigramOf(bits.slice(0, 3));
  const upper = trigramOf(bits.slice(3, 6));
  const info = HEXAGRAM_MAP[bitsToKey(bits)];
  return {
    bits: [...bits],
    name: info?.name ?? '未知卦',
    number: info?.number ?? null,
    desc: info?.desc ?? '',
    upper,
    lower,
    upperSymbol: TRIGRAMS[upper].symbol,
    lowerSymbol: TRIGRAMS[lower].symbol,
    relation: hexagramRelationOf(bits),
    extra: YAO_CI[info?.name]?.extra ?? null,
  };
};

// 八宫：本宫卦依次变初爻、初二爻……至五爻，再变回四爻为游魂，下三爻归位为归魂。
const buildPalaceIndex = () => {
  const index = {};
  Object.entries(TRIGRAMS).forEach(([palace, { bits, element }]) => {
    const pure = [...bits, ...bits];
    const members = [
      pure,
      pure.map((bit, i) => (i < 1 ? 1 - bit : bit)),
      pure.map((bit, i) => (i < 2 ? 1 - bit : bit)),
      pure.map((bit, i) => (i < 3 ? 1 - bit : bit)),
      pure.map((bit, i) => (i < 4 ? 1 - bit : bit)),
      pure.map((bit, i) => (i < 5 ? 1 - bit : bit)),
      pure.map((bit, i) => (i < 3 || i === 4 ? 1 - bit : bit)),
      pure.map((bit, i) => (i === 4 ? 1 - bit : bit)),
    ];
    members.forEach((memberBits, order) => {
      index[memberBits.join('')] = {
        palace,
        palaceElement: element,
        order,
        label: PALACE_LABELS[order],
        shi: PALACE_SHI[order],
        ying: PALACE_SHI[order] > 3 ? PALACE_SHI[order] - 3 : PALACE_SHI[order] + 3,
        pureBits: pure,
      };
    });
  });
  return index;
};

const PALACE_INDEX = buildPalaceIndex();

export const getPalaceInfo = (bits) => PALACE_INDEX[bits.join('')] ?? null;

const toSolar = (date) => Solar.fromYmdHms(
  date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(),
);

/** 起卦时间的年月日时干支、旬空与农历。晚子时（23 点后）日柱按当天论，与八字模块默认的流派一致。 */
export const describeCastTime = (date) => {
  const solar = toSolar(date);
  const lunar = solar.getLunar();
  const dayGanZhi = lunar.getDayInGanZhiExact2();
  const pad = (value) => String(value).padStart(2, '0');
  return {
    solarText: `${solar.getYear()}-${pad(solar.getMonth())}-${pad(solar.getDay())} ${pad(solar.getHour())}:${pad(solar.getMinute())}`,
    lunarText: `农历${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    year: lunar.getYearInGanZhiExact(),
    month: lunar.getMonthInGanZhiExact(),
    day: dayGanZhi,
    hour: lunar.getTimeInGanZhi(),
    xunKong: [...LunarUtil.getXunKong(dayGanZhi)],
    dayGan: dayGanZhi.slice(0, 1),
    dayZhi: dayGanZhi.slice(1, 2),
    monthZhi: lunar.getMonthZhiExact(),
  };
};

const isValidValues = (values) => Array.isArray(values) && values.length === 6 && values.every((value) => LINE_VALUES[value]);

/**
 * @param {number[]} values 六个爻值（初爻在前）
 * @param {Date} date 起卦时间（已按所在地换算为真太阳时的墙上时间）
 * @param {{ question?: string, method?: string, topic?: string, gender?: string, castNote?: string }} [meta]
 *   topic 所问类别（见 liuyaoJudge.js 的 LIUYAO_TOPICS），gender 问感情时问卦人的性别，castNote 起卦参数说明（如报的数）
 */
export const buildLiuYaoReading = (values, date = new Date(), meta = {}) => {
  if (!isValidValues(values)) throw new Error('爻值必须是六个 6、7、8、9');
  const time = describeCastTime(date);
  const bits = values.map((value) => (LINE_VALUES[value].isYang ? 1 : 0));
  const changedBits = values.map((value) => {
    const line = LINE_VALUES[value];
    return (line.isMoving ? !line.isYang : line.isYang) ? 1 : 0;
  });
  const hexagram = describeHexagram(bits);
  const palace = getPalaceInfo(bits);
  const movingPositions = values.map((value, i) => (LINE_VALUES[value].isMoving ? i + 1 : 0)).filter(Boolean);
  const hasChange = movingPositions.length > 0;
  const changed = hasChange ? describeHexagram(changedBits) : null;
  const najia = najiaOf(bits);
  const changedNajia = hasChange ? najiaOf(changedBits) : null;
  const godStart = GOD_START[time.dayGan] ?? 0;

  const lines = values.map((value, i) => {
    const position = i + 1;
    const base = LINE_VALUES[value];
    const { gan, zhi, ganZhi, element } = najia[i];
    const marks = [];
    if (time.xunKong.includes(zhi)) marks.push('旬空');
    if (ZHI_CLASH[time.monthZhi] === zhi) marks.push('月破');
    if (ZHI_CLASH[time.dayZhi] === zhi) marks.push('日冲');
    const changedLine = base.isMoving && changedNajia ? {
      ...changedNajia[i],
      isYang: !base.isYang,
      relative: relativeOf(palace.palaceElement, changedNajia[i].element),
    } : null;
    return {
      position,
      positionName: POSITION_NAMES[i],
      value,
      name: base.name,
      isYang: base.isYang,
      isMoving: base.isMoving,
      gan,
      zhi,
      ganZhi,
      element,
      relative: relativeOf(palace.palaceElement, element),
      god: SIX_GODS[(godStart + i) % 6],
      isShi: position === palace.shi,
      isYing: position === palace.ying,
      marks,
      changed: changedLine,
      yaoCi: base.isMoving ? getYaoCi(hexagram.name, position) : null,
    };
  });

  // 伏神：本卦没有的六亲，到本宫首卦（纯卦）里找，伏在同一爻位之下。
  const present = new Set(lines.map((line) => line.relative));
  const pureNajia = najiaOf(palace.pureBits);
  const hidden = RELATIVE_ORDER
    .filter((relative) => !present.has(relative))
    .flatMap((relative) => pureNajia
      .map((item, i) => ({ ...item, relative: relativeOf(palace.palaceElement, item.element), position: i + 1 }))
      .filter((item) => item.relative === relative))
    .map((item) => ({ relative: item.relative, gan: item.gan, zhi: item.zhi, ganZhi: item.ganZhi, element: item.element, position: item.position, positionName: POSITION_NAMES[item.position - 1] }));

  const mutualBits = [bits[1], bits[2], bits[3], bits[2], bits[3], bits[4]];
  const allMoving = movingPositions.length === 6;
  const useExtra = allMoving && hexagram.extra ? hexagram.extra : null;

  return {
    question: (meta.question ?? '').trim(),
    method: meta.method ?? 'coins',
    topic: meta.topic ?? 'general',
    gender: meta.gender === 'female' ? 'female' : meta.gender === 'male' ? 'male' : '',
    castNote: (meta.castNote ?? '').trim(),
    values: [...values],
    time,
    hexagram: { ...hexagram, palace: palace.palace, palaceElement: palace.palaceElement, palaceLabel: palace.label, shi: palace.shi, ying: palace.ying },
    changed,
    mutual: describeHexagram(mutualBits),
    lines,
    hidden,
    movingPositions,
    useExtra,
  };
};

const lineText = (line) => {
  const flags = [line.isShi ? '世' : '', line.isYing ? '应' : '', ...line.marks].filter(Boolean).join('·');
  const changed = line.changed ? ` → 变${line.changed.relative}${line.changed.ganZhi}` : '';
  return `${line.positionName} ${line.god} ${line.relative}${line.ganZhi}${line.element} ${line.name}${line.isMoving ? '（动）' : ''}${flags ? ` [${flags}]` : ''}${changed}`;
};

/**
 * 整理成可以直接粘贴给 AI 的提示词。
 * @param reading buildLiuYaoReading 的结果
 * @param judge liuyaoJudge.js 的 judgeLiuYao 结果（可选）：附上程序初判，让 AI 在此基础上核对与展开
 */
export const buildLiuYaoPrompt = (reading, judge = null) => {
  const { hexagram, changed, mutual, time, lines, hidden } = reading;
  const topicLabel = LIUYAO_TOPIC_LABELS[reading.topic] ?? LIUYAO_TOPIC_LABELS.general;
  const genderText = reading.topic === 'love' && reading.gender ? `（问卦人为${reading.gender === 'female' ? '女' : '男'}）` : '';
  const parts = [
    '你是一位精通六爻（纳甲筮法）的占卜师。下面是用「古书派」起的一卦，请直接基于这些数据分析，不要自行重新装卦。',
    '',
    `【所问】${reading.question || '（未写明，请按一般吉凶与近期走势分析）'}`,
    `【类别】${topicLabel}${genderText}${judge?.yongShen?.relative ? ` · 用神取${judge.yongShen.relative}` : ''}`,
    `【起卦】${time.solarText}（${time.lunarText}）· ${LIUYAO_METHODS[reading.method] ?? LIUYAO_METHODS.coins}${reading.castNote ? `（${reading.castNote}）` : ''}`,
    `- 四柱：${time.year}年 ${time.month}月 ${time.day}日 ${time.hour}时；旬空 ${time.xunKong.join('')}；月建 ${time.monthZhi}，日辰 ${time.dayZhi}`,
    '',
    `【本卦】${hexagram.name}（${hexagram.upper}${hexagram.upperSymbol}上 ${hexagram.lower}${hexagram.lowerSymbol}下）· ${hexagram.palace}宫${hexagram.palaceLabel}（${hexagram.palaceElement}）· 世${hexagram.shi}爻 应${hexagram.ying}爻${hexagram.relation ? ` · ${hexagram.relation}卦` : ''}`,
    `- 卦辞：${hexagram.desc}`,
    changed ? `【变卦】${changed.name}（${changed.upper}${changed.upperSymbol}上 ${changed.lower}${changed.lowerSymbol}下）${changed.relation ? ` · ${changed.relation}卦` : ''}` : '【变卦】无动爻，静卦',
    changed ? `- 卦辞：${changed.desc}` : '',
    `【互卦】${mutual.name}`,
    '',
    '【装卦】（自上爻至初爻）',
    ...[...lines].reverse().map((line) => `- ${lineText(line)}`),
    hidden.length ? `- 伏神：${hidden.map((item) => `${item.relative}${item.ganZhi}伏于${item.positionName}下`).join('；')}` : '- 伏神：六亲齐全，无伏神',
    '',
    reading.movingPositions.length ? '【动爻爻辞】' : '',
    ...lines.filter((line) => line.yaoCi).map((line) => `- ${line.yaoCi.title}：${line.yaoCi.text}`),
    reading.useExtra ? `- ${reading.useExtra}` : '',
    '',
    ...(judge ? ['【程序初判】（按通行口诀的简化规则估算，请核对后再展开，不必照搬）', ...judge.points.map((point) => `- ${point}`), ''] : []),
    `【依据】${describeLiuYaoSources()}请按这些古籍的法则分析，不要自创规则。`,
    '',
    '【请回答】',
    '1. 先定用神：根据所问之事取用神，说明用神在本卦是否出现、旺衰如何（看月建、日辰、动爻生克、空破）。',
    '2. 看世应与动变：世爻、应爻的状态，动爻变化对用神的影响，有无回头生克、反吟伏吟。',
    '3. 给结论：事情能否成、大致应期（以爻支或月日推断），以及需要注意的地方。',
    '请先说依据再说结论，语气平实，避免绝对化。',
    '',
    '我的问题：（在这里补充细节）',
  ];
  return parts.filter((part, index) => part !== '' || parts[index - 1] !== '').join('\n');
};
