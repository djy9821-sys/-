import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiuYaoReading } from '../src/utils/liuyao.js';
import { judgeLiuYao } from '../src/utils/liuyaoJudge.js';
import { HEXAGRAM_MAP } from '../src/utils/hexagramLogic.js';

/**
 * 《增删卜易》卷三「增删黄金策千金赋」章的占例（Codex 第5批，liuyao.zengshan.254–300），另立一份验收，不并入 liuyao-cases.test.js。
 *
 * 这一批到的时候，人事占例回归（liuyao-cases.test.js）的规则已经调过，这 47 例程序从没见过，正好看程序在新例上准不准：
 * - 第一次跑（未改规则）：同档 13、近（程序判平或原书参半）15、断反 3，应期 25 例应上 10。原有 155 例同档 118，新例明显差一截。
 * - 其后只按千金赋原文补两条（liuyaoJudge.js：其五十九「化墓……日月帮扶，亦无大害」用于动爻、其九十五「水木须宜寻根」），
 *   这两条是对着 280、284 两例找到的，原有 155 例一例不变：同档 13、近 17、断反 1。
 * 往后改六爻规则，两份都要跑：原有的不能退，这一份同档不能少、断反不能多。
 *
 * 收录口径同 liuyao-cases.test.js（日期取 2001–2030 年里月建、日辰与原书相同的一天正午）。不收：神应他事的（291–297 一卦应两事、
 * 占此应彼）、再占没写月份的（282、283、285 与 260、262、275）、只记「酉年」的（286）。
 * near：原书断语与后验不一（占关差「即于壬寅日得差，次年三月死于中途」），或吉中带凶；odd：原书明说是特例（「非教后人为法也」），
 * 程序判平也算对。timing 是原书应验的地支（「本日」换成日辰，「七月」换成申月，「明年三四月」换成辰巳月）。
 */
const CASES = [
  { id: '254', name: '占乡试', date: '2004-6-2', hex: '水地比', lines: [], topic: 'study', book: '吉', near: true, when: ['卯年'] }, // 巳月壬子日：父爻临月建而日克，「许之卯科方得遂意」
  { id: '255', name: '占自陈何如', date: '2001-3-19', hex: '雷风恒', lines: [4], topic: 'career', book: '凶', when: ['午月', '未月'] }, // 卯月辛巳日
  { id: '256', name: '占官运', date: '2001-7-26', hex: '泽火革', lines: [4], topic: 'career', when: ['巳年'] }, // 未月庚寅日：仕途平坦而巳年被论，不分吉凶
  { id: '257', name: '占讼', date: '2004-2-3', hex: '天山遁', lines: [], topic: 'lawsuit', subject: 'self', book: '凶', when: ['子日'] }, // 丑月壬子日
  { id: '258', name: '占久病', date: '2005-6-4', hex: '泽水困', lines: [1], topic: 'health', subject: 'self', illness: 'chronic', book: '凶', when: ['申日'] }, // 巳月己未日
  { id: '259', name: '占升迁', date: '2002-10-4', hex: '泽地萃', lines: [6], topic: 'career', book: '吉', when: ['卯月'] }, // 酉月乙巳日
  { id: '261', name: '占地下五色光', date: '2001-4-23', hex: '火泽睽', lines: [1, 3, 4], topic: 'wealth', book: '凶' }, // 辰月丙辰日
  { id: '263', name: '占年运', date: '2006-8-7', hex: '地雷复', lines: [1, 3], topic: 'year', subject: 'self', book: '凶', when: ['午年'] }, // 未月戊辰日
  { id: '264', name: '占妻病', date: '2001-6-19', hex: '泽地萃', lines: [4], topic: 'health', subject: 'spouse', gender: 'male', book: '吉', near: true, when: ['寅日'] }, // 午月癸丑日
  { id: '265', name: '占小舟过关', date: '2005-5-4', hex: '水地比', lines: [3, 4], topic: 'travel', subject: 'self', book: '吉', near: true, when: ['卯日'] }, // 辰月戊子日
  { id: '266', name: '占文书', date: '2001-10-13', hex: '风天小畜', lines: [1, 5], topic: 'general', subject: 'parents', book: '吉', near: true, when: ['子日'] }, // 戌月己酉日
  { id: '267', name: '占财', date: '2001-6-2', hex: '火水未济', lines: [3], topic: 'wealth', book: '吉', near: true, when: ['酉日'] }, // 巳月丙申日：忌临世而得财，特例
  { id: '268', name: '占领文', date: '2001-8-23', hex: '风雷益', lines: [3], topic: 'general', subject: 'parents', book: '吉', near: true, when: ['酉日'] }, // 申月戊午日：同上
  { id: '269', name: '子占父', date: '2001-8-23', hex: '风雷益', lines: [3], topic: 'travel', subject: 'parents', book: '吉', near: true, when: ['亥日'] }, // 申月戊午日
  { id: '270', name: '占子病', date: '2003-8-7', hex: '天风姤', lines: [6], topic: 'health', subject: 'children', illness: 'recent', book: '吉', near: true, when: ['子日'] }, // 六月壬子日
  { id: '271', name: '占脱役', date: '2006-9-3', hex: '山泽损', lines: [5, 6], topic: 'refuge', subject: 'self', book: '吉', miss: '世爻丑土休囚逢未日冲，程序作日破；原书只论「寅木鬼动，月建破之，未日墓之」伤不了世' }, // 申月乙未日
  { id: '272', name: '占月令', date: '2007-5-1', hex: '地天泰', lines: [2, 4], topic: 'year', subject: 'self', book: '平', near: true, when: ['丑日'] }, // 辰月乙未日：「几乎参处，幸解救而息」，凶而有救
  { id: '273', name: '占候选得缺', date: '2001-10-18', hex: '风雷益', lines: [1, 3, 6], topic: 'career', book: '凶', near: true, when: ['寅月'] }, // 戌月甲寅日
  { id: '274', name: '占开店贸易', date: '2001-5-9', hex: '坤为地', lines: [6], topic: 'wealth', book: '凶', when: ['酉月'] }, // 巳月壬申日
  { id: '276', name: '占何日雨', date: '2001-6-24', hex: '地风升', lines: [4], topic: 'weather', when: ['戌日'] }, // 午月戊午日
  { id: '277', name: '占父在云南得信', date: '2002-11-4', hex: '地泽临', lines: [], topic: 'travel', subject: 'parents', book: '凶', near: true }, // 戌月丙子日
  { id: '278', name: '占关差', date: '2002-2-1', hex: '地天泰', lines: [2], topic: 'career', book: '凶', near: true, when: ['寅日'] }, // 丑月庚子日
  { id: '279', name: '占病', date: '2001-3-22', hex: '地山谦', lines: [5], topic: 'health', subject: 'self', book: '凶', near: true, when: ['巳月'] }, // 卯月甲申日：丁亥日愈，巳月复发而死
  { id: '280', name: '占掣签得何处', date: '2005-7-5', hex: '山天大畜', lines: [3, 5], topic: 'career', book: '凶', near: true, when: ['申月'] }, // 午月庚寅日
  { id: '281', name: '再占掣签到任', date: '2006-7-4', hex: '地泽临', lines: [5], topic: 'career', book: '凶', near: true, when: ['申月'] }, // 午月甲午日（原书只记甲午日，前占午月庚寅，四日后仍在午月）
  { id: '284', name: '三占南行', date: '2003-12-7', hex: '火天大有', lines: [6], topic: 'travel', subject: 'self', book: '吉', near: true, when: ['辰月', '巳月'] }, // 亥月甲寅日（原书只记甲寅日，前占亥月甲辰，十日后仍在亥月）
  { id: '287', name: '占目下功名升否', date: '2001-4-5', hex: '离为火', lines: [3, 6], topic: 'career', book: '凶' }, // 卯月戊戌日
  { id: '288', name: '占府尊复职', date: '2002-4-2', hex: '风山渐', lines: [], topic: 'career', book: '凶' }, // 卯月庚子日
  { id: '289', name: '再占府尊复职', date: '2002-4-3', hex: '火地晋', lines: [], topic: 'career', book: '凶', near: true }, // 卯月辛丑日
  { id: '290', name: '三占府尊复职', date: '2002-4-3', hex: '雷风恒', lines: [5], topic: 'career', book: '吉', when: ['巳年'] }, // 卯月辛丑日
  { id: '298', name: '占身病', date: '2002-9-7', hex: '坤为地', lines: [5], topic: 'health', subject: 'self', book: '吉' }, // 申月戊寅日
  { id: '299', name: '占母近病', date: '2001-7-23', hex: '坤为地', lines: [6], topic: 'health', subject: 'parents', illness: 'recent', book: '吉' }, // 未月丁亥日
  { id: '300', name: '又占子病', date: '2006-10-5', hex: '水火既济', lines: [4], topic: 'health', subject: 'children', book: '凶', near: true, when: ['卯日'] }, // 酉月丁卯日
];
/** 同档不少于此数；断反的只能是标了 miss 的。 */
const EXACT_FLOOR = 13;
/** 原书应验地支（when）点名到的不少于此数。 */
const TIMING_FLOOR = 10;

const LEVEL = Object.freeze({ 吉: 'good', 凶: 'bad', 平: 'mixed' });
const BITS = Object.fromEntries(Object.entries(HEXAGRAM_MAP).map(([key, hexagram]) => [hexagram.name, [...key].reverse().map(Number)]));

const judgeCase = (item) => {
  const [y, m, d] = item.date.split('-').map(Number);
  const values = BITS[item.hex].map((bit, i) => (item.lines.includes(i + 1) ? (bit ? 9 : 6) : (bit ? 7 : 8)));
  const reading = buildLiuYaoReading(values, new Date(y, m - 1, d, 12, 0), { topic: item.topic, subject: item.subject, illness: item.illness, gender: item.gender ?? 'male' });
  return judgeLiuYao(reading);
};
const opposite = (level, book) => (book === 'good' && level === 'bad') || (book === 'bad' && level === 'good');
const hits = (judge, item) => item.when.some((target) => {
  const [zhi, unit] = [...target];
  return (judge.timingWhen ?? []).some((entry) => entry.zhi === zhi && entry.unit === unit);
});

CASES.filter((item) => item.book && !item.miss).forEach((item) => {
  test(`千金赋章占例 ${item.id} ${item.name}：原书${item.book}`, () => {
    const judge = judgeCase(item);
    const book = LEVEL[item.book];
    if (item.near) assert.ok(!opposite(judge.verdict.level, book), `程序判${judge.verdict.title}（${judge.score}），与原书${item.book}相反`);
    else assert.equal(judge.verdict.level, book, `程序判${judge.verdict.title}（${judge.score}），原书${item.book}`);
  });
});

test(`千金赋章占例：同档不少于 ${EXACT_FLOOR} 例，断反的只有列明缘故的几例，应期点名到的不少于 ${TIMING_FLOOR} 例`, () => {
  const results = CASES.map((item) => ({ item, judge: judgeCase(item) }));
  const judged = results.filter(({ item }) => item.book);
  const exact = judged.filter(({ item, judge }) => judge.verdict.level === LEVEL[item.book]).length;
  const reversed = judged.filter(({ item, judge }) => opposite(judge.verdict.level, LEVEL[item.book])).map(({ item }) => item.id);
  assert.ok(exact >= EXACT_FLOOR, `同档 ${exact} 例`);
  assert.deepEqual(reversed.sort(), CASES.filter((item) => item.miss).map((item) => item.id).sort());
  const timed = results.filter(({ item }) => item.when);
  const matched = timed.filter(({ item, judge }) => hits(judge, item));
  assert.ok(matched.length >= TIMING_FLOOR, `应上 ${matched.length} / ${timed.length} 例；没应上的：${timed.filter(({ item, judge }) => !hits(judge, item)).map(({ item }) => item.id).join('、')}`);
});
