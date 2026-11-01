import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiuYaoReading } from '../src/utils/liuyao.js';
import { judgeLiuYao } from '../src/utils/liuyaoJudge.js';
import { HEXAGRAM_MAP } from '../src/utils/hexagramLogic.js';

/**
 * 《增删卜易》人事占例的应期回归（按《各门类应期总注章》推的应期提示）。
 *
 * - 占例、起卦与 liuyao-cases.test.js 相同（id 即 src/data/cases/liuyao.json 的 liuyao.zengshan.NNN）；只收原书应验写明地支的
 *   （expected.timing，book 抄原书的说法），when 是其中的地支与年、月、日、时。「时」按日看（同一天）。
 * - 程序的 timingWhen 是应期提示里点名的地支与年月日；原书的地支、单位有一个对上就算应上。
 *   提示至多三条、每例平均点名不超过 NAMED_CAP 支，免得多列地支凑数。
 */
const HIT_FLOOR = 28;
/** 每例平均点名的地支数上限（十二支里约四分之一），免得多列地支凑数。 */
const NAMED_CAP = 3.2;
const CASES = [
  { id: '002', name: '占父近病', date: '2001-4-15', hex: '乾为天', lines: [4], topic: 'health', subject: 'parents', illness: 'recent', when: ['丑日'], book: '丑日' },
  { id: '008', name: '占求财', date: '2001-2-16', hex: '火天大有', lines: [], topic: 'wealth', when: ['寅日'], book: '甲寅日' },
  { id: '009', name: '占谒贵', date: '2006-10-4', hex: '山风蛊', lines: [3], topic: 'career', when: ['子日'], book: '子日' },
  { id: '011', name: '占弟被讼', date: '2001-6-13', hex: '泽水困', lines: [3, 5], topic: 'lawsuit', subject: 'siblings', when: ['申年'], book: '申年' },
  { id: '013', name: '占妹临产', date: '2001-7-4', hex: '火地晋', lines: [], topic: 'maternity', subject: 'siblings', when: ['卯日', '卯时'], book: '卯日卯时' },
  { id: '018', name: '占风水', date: '2005-3-31', hex: '泽水困', lines: [1, 4], topic: 'gravesite', when: ['申年'], book: '明年；申年' },
  { id: '026', name: '占女痘', date: '2001-2-25', hex: '坤为地', lines: [2], topic: 'health', subject: 'children', when: ['未时', '申时'], book: '今日未申时' },
  { id: '032', name: '占父外任平安', date: '2005-9-6', hex: '天风姤', lines: [5, 6], topic: 'parents', when: ['辰年'], book: '辰年' },
  { id: '036', name: '占远行求财（再占）', date: '2001-12-14', hex: '地火明夷', lines: [1, 4], topic: 'travel', subject: 'self', when: ['寅日', '寅月', '卯月'], book: '甲寅日；开春寅卯月' },
  { id: '037', name: '占妻病', date: '2003-7-5', hex: '震为雷', lines: [3], topic: 'health', subject: 'spouse', illness: 'recent', gender: 'male', when: ['辰日', '酉日'], book: '辰日；酉日' },
  { id: '042', name: '占父何日回', date: '2005-5-4', hex: '乾为天', lines: [6], topic: 'travel', subject: 'parents', when: ['卯日', '午日', '未日'], book: '卯日；午未日' },
  { id: '044', name: '占复起功名（再占）', date: '2001-2-22', hex: '地泽临', lines: [], topic: 'career', when: ['子年'], book: '子年；明年辰岁' },
  { id: '047', name: '占候文书何日得领', date: '2001-3-30', hex: '山火贲', lines: [], topic: 'study', when: ['午日'], book: '甲午日' },
  { id: '048', name: '占子病', date: '2004-10-4', hex: '地风升', lines: [], topic: 'health', subject: 'children', when: ['午日'], book: '午日' },
  { id: '055', name: '占子存亡', date: '2002-9-5', hex: '风地观', lines: [4, 6], topic: 'children', when: ['亥月', '辰日'], book: '亥月甲辰日' },
  { id: '057', name: '占求婚', date: '2007-4-1', hex: '火雷噬嗑', lines: [1, 4, 5, 6], topic: 'love', gender: 'male', when: ['午日'], book: '午日' },
  { id: '059', name: '占迎父能否相遇', date: '2001-1-23', hex: '水山蹇', lines: [4, 5, 6], topic: 'travel', subject: 'parents', when: ['未日'], book: '未日' },
  { id: '060', name: '占冬令得关差', date: '2005-11-5', hex: '水泽节', lines: [3], topic: 'career', when: ['丑月'], book: '丑月' },
  { id: '061', name: '占终得出仕', date: '2006-8-6', hex: '天火同人', lines: [6], topic: 'career', when: ['辰年'], book: '辰年' },
  { id: '062', name: '占病', date: '2005-9-4', hex: '泽天夬', lines: [5], topic: 'health', subject: 'self', when: ['辰日'], book: '明日辰日' },
  { id: '064', name: '占久病', date: '2003-11-6', hex: '乾为天', lines: [6], topic: 'health', subject: 'self', illness: 'chronic', when: ['丑月'], book: '丑月' },
  { id: '065', name: '占母血崩', date: '2002-11-7', hex: '天火同人', lines: [1, 2, 3, 5, 6], topic: 'health', subject: 'parents', when: ['丑月'], book: '丑月' },
  { id: '068', name: '占妻母病', date: '2001-5-2', hex: '泽雷随', lines: [1, 6], topic: 'health', subject: 'parents', when: ['戌日'], book: '戌日' },
  { id: '076', name: '占开金银器皿铺', date: '2001-7-7', hex: '火雷噬嗑', lines: [4, 5, 6], topic: 'wealth', when: ['戌日'], book: '甲戌日' },
  { id: '079', name: '占会试能联捷否', date: '2001-10-18', hex: '雷山小过', lines: [4, 6], topic: 'study', when: ['辰年'], book: '明岁辰年' },
  { id: '080', name: '占病', date: '2004-9-7', hex: '雷风恒', lines: [], topic: 'health', subject: 'self', when: ['未日'], book: '未日' },
  { id: '081', name: '占已定重罪可蒙赦否', date: '2006-8-7', hex: '山风蛊', lines: [1, 3], topic: 'lawsuit', subject: 'self', when: ['酉年'], book: '明岁酉年' },
  { id: '090', name: '占升迁', date: '2001-7-30', hex: '地水师', lines: [5, 6], topic: 'career', when: ['辰年'], book: '辰年' },
  { id: '091', name: '占子何时脱厄', date: '2002-12-4', hex: '雷地豫', lines: [1, 2], topic: 'general', subject: 'children', when: ['巳年'], book: '巳年' },
  { id: '153', name: '占仆人何日回', date: '2005-12-6', hex: '泽火革', lines: [2], topic: 'travel', subject: 'staff', when: ['巳日'], book: '巳日' },
  { id: '156', name: '占主人何日回', date: '2001-3-1', hex: '山天大畜', lines: [5], topic: 'travel', subject: 'parents', when: ['巳日'], book: '巳日' },
  { id: '157', name: '占夫还往他省去否', date: '2005-12-6', hex: '雷天大壮', lines: [1, 5], topic: 'travel', subject: 'spouse', gender: 'female', when: ['巳日'], book: '巳日' },
  { id: '158', name: '占一路平安否', date: '2004-11-3', hex: '山风蛊', lines: [5], topic: 'travel', subject: 'self', when: ['巳日'], book: '巳日' },
  { id: '159', name: '占子近病', date: '2005-9-3', hex: '雷风恒', lines: [3], topic: 'health', subject: 'children', illness: 'recent', when: ['午年'], book: '午年' },
  { id: '167', name: '占父病吃人参好否', date: '2001-3-5', hex: '泽地萃', lines: [6], topic: 'health', subject: 'parents', when: ['辰日'], book: '明日辰日' },
  { id: '186', name: '占终身财福', date: '2001-10-15', hex: '水地比', lines: [6], topic: 'life', subject: 'self', when: ['卯年'], book: '卯年' },
  { id: '196', name: '占终身财福', date: '2001-5-26', hex: '雷泽归妹', lines: [4], topic: 'life', subject: 'self', when: ['巳年', '午年'], book: '巳午年' },
  { id: '198', name: '占终身财福', date: '2001-3-21', hex: '泽火革', lines: [4, 6], topic: 'life', subject: 'self', when: ['丑月', '酉月'], book: '今年丑月冲开其合，或是酉月冲开卯木' },
  { id: '205', name: '占寿', date: '2001-4-22', hex: '风泽中孚', lines: [4, 5], topic: 'life', subject: 'self', when: ['亥年'], book: '亥年不利' },
  { id: '207', name: '占索债', date: '2007-4-2', hex: '风雷益', lines: [2], topic: 'wealth', when: ['辰时'], book: '辰时出空' },
  { id: '215', name: '占仆人为祸否', date: '2001-7-12', hex: '雷水解', lines: [1, 2], topic: 'refuge', subject: 'self', when: ['未月'], book: '未月乃木之墓，七月乃木之绝，此两月乃败露之月也。' },
  { id: '218', name: '占母寿', date: '2002-2-1', hex: '雷天大壮', lines: [1, 4], topic: 'parents', when: ['子年'], book: '丙子年' },
  { id: '242', name: '占能登鼎甲否', date: '2001-3-22', hex: '水泽节', lines: [1, 2, 3], topic: 'study', when: ['辰年'], book: '乃辰年之鼎甲也。' },
  { id: '243', name: '占父何时起用', date: '2001-3-30', hex: '风水涣', lines: [1, 3, 4, 6], topic: 'parents', when: ['寅年'], book: '许寅年起用' },
  { id: '244', name: '占出行见贵', date: '2001-9-1', hex: '天火同人', lines: [], topic: 'wealth', when: ['亥日'], book: '出空亥日' },
  { id: '246', name: '占何时得价', date: '2005-1-5', hex: '雷泽归妹', lines: [5], topic: 'wealth', when: ['寅月'], book: '待寅月冲去申金' },
  { id: '250', name: '占借贷', date: '2006-8-6', hex: '兑为泽', lines: [2, 5], topic: 'wealth', when: ['辰日'], book: '明日辰日' },
  { id: '252', name: '占斗鹌鹑', date: '2003-6-4', hex: '风山渐', lines: [2], topic: 'wealth', when: ['巳时', '午时'], book: '今日巳午时' },
];

const BITS = Object.fromEntries(Object.entries(HEXAGRAM_MAP).map(([key, hexagram]) => [hexagram.name, [...key].reverse().map(Number)]));

const judgeCase = (item) => {
  const [y, m, d] = item.date.split('-').map(Number);
  const values = BITS[item.hex].map((bit, i) => (item.lines.includes(i + 1) ? (bit ? 9 : 6) : (bit ? 7 : 8)));
  const reading = buildLiuYaoReading(values, new Date(y, m - 1, d, 12, 0), { topic: item.topic, subject: item.subject, illness: item.illness, gender: item.gender ?? 'male' });
  return judgeLiuYao(reading);
};
const hits = (judge, item) => item.when.some((target) => {
  const [zhi, unit] = [...target];
  return (judge.timingWhen ?? []).some((entry) => entry.zhi === zhi && (entry.unit === unit || (unit === '时' && entry.unit === '日')));
});

test(`人事占例应期：原书应验的地支，程序应期提示点名到的不少于 ${HIT_FLOOR} 例，平均点名不超过 ${NAMED_CAP} 支`, () => {
  const results = CASES.map((item) => ({ item, judge: judgeCase(item) }));
  const matched = results.filter(({ item, judge }) => hits(judge, item));
  const named = results.reduce((sum, { judge }) => sum + new Set((judge.timingWhen ?? []).map((entry) => entry.zhi)).size, 0) / results.length;
  results.forEach(({ judge }) => assert.ok(judge.timing.length >= 1 && judge.timing.length <= 3));
  assert.ok(matched.length >= HIT_FLOOR, `应上 ${matched.length} / ${results.length} 例；没应上的：${results.filter(({ item, judge }) => !hits(judge, item)).map(({ item }) => item.id).join('、')}`);
  assert.ok(named <= NAMED_CAP, `平均点名 ${named.toFixed(2)} 支`);
});

test('应期：元神贪合，冲开合神之日方生用神（占父近病「须待丑日冲去未土而午火无合可贪」）', () => {
  const judge = judgeCase(CASES.find((item) => item.id === '002'));
  assert.ok(judge.timing.some((hint) => hint.startsWith('元神') && hint.includes('待丑之日月冲开未')), judge.timing.join('；'));
});

test('应期：化退神忌值忌冲，看变爻之值与冲（「酉动化申，有应申月日，有应寅月日」）', () => {
  const judge = judgeCase(CASES.find((item) => item.id === '011'));
  assert.ok(judge.timing.some((hint) => hint.startsWith('用神化退神申') && hint.includes('申（值）、寅（冲）')), judge.timing.join('；'));
});

test('应期：远事定之以年月——功名一类远近都有，另提用神同一地支之年（占升迁「辰年」）', () => {
  const judge = judgeCase(CASES.find((item) => item.id === '090'));
  assert.ok(judge.timing.some((hint) => hint.includes('远事看辰、戌之年')), judge.timing.join('；'));
  assert.ok(judge.timingWhen.some((entry) => entry.zhi === '辰' && entry.unit === '年'));
});

test('应期：化回头克，待冲去伤爻之日（月将章「待至冲去伤爻之日，则不受其伤」，占谒贵「须待子日冲去午火」）', () => {
  const judge = judgeCase(CASES.find((item) => item.id === '009'));
  assert.ok(judge.timing.some((hint) => hint.includes('回头克') && hint.includes('待子之日月冲去午')), judge.timing.join('；'));
});

test('应期：动而化空，逢填实、冲空之日（占父病「戌父旬空……明日辰日，冲空即愈」）', () => {
  const judge = judgeCase(CASES.find((item) => item.id === '167'));
  assert.ok(judge.timing.some((hint) => hint.startsWith('用神化出戌旬空') && hint.includes('辰（冲空）')), judge.timing.join('；'));
});
