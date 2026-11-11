import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiuYaoReading } from '../src/utils/liuyao.js';
import { judgeLiuYao } from '../src/utils/liuyaoJudge.js';
import { HEXAGRAM_MAP } from '../src/utils/hexagramLogic.js';

/**
 * 《增删卜易·天时章》全部 29 个天时占例（古籍条目 id 同下）跑一遍「天时晴雨」的断法。
 *
 * - 日期是 2001–2030 年里月建、日辰与原文相同的一天（断天时只看月建、日辰、旬空），取正午起卦。
 * - 卦与动爻按原文。古籍数据里有三条 applies 与原文不合，这里按原文改：
 *   zhanfa.011 原文「申金子动化进神」，是雷天大壮五爻动（之夬），不是震为雷；
 *   zhanfa.062 原文「屯变益」，只动上爻；zhanfa.069 原文「讼之随」，动初、二、上三爻。
 * - accept 是与书中结果相符的判断（书中多是「先……后……」的过程，程序分「眼下」「后来」两段，
 *   故列出几种都算对的写法）；when 是应期提示里必须出现的日子（书中实际应验之日或时辰）。
 * - zhanfa.053 六爻安静，野鹤也只是驳旁人「戌临月破，如何有雨？阴云而已」；程序不硬断，判「难定」，
 *   但应期提示须指出父母月破、阴云而已。
 */
const CASES = [
  { id: 'zhanfa.011', date: '2001-04-01', hex: '雷天大壮', lines: [5], book: '申子化进神，申酉日碧天如洗', accept: ['clear'], when: ['申日'] },
  { id: 'zhanfa.013', date: '2001-05-11', hex: '雷山小过', lines: [6], book: '戌父动、辰父暗动，当日雷雨交作', accept: ['rain'], when: ['今日'] },
  { id: 'zhanfa.015', date: '2002-10-04', hex: '地风升', lines: [4], book: '财动上午浮云掩日，化出午子孙，午时大晴', accept: ['clear'], when: ['午日'] },
  { id: 'zhanfa.017', date: '2007-06-02', hex: '雷风恒', lines: [5], book: '申鬼化进神，申时霹雳，本处只洒几点', accept: ['overcast'], when: ['申日'] },
  { id: 'zhanfa.020', date: '2005-07-02', hex: '天山遁', lines: [3], book: '申兄化卯财，一日阴云，申时见日色，次日卯时大晴', accept: ['cloudy-clear', 'overcast-clear'], when: ['申日', '卯日'] },
  { id: 'zhanfa.022', date: '2007-01-05', hex: '风地观', lines: [6], book: '两火鬼暗动今日阴，卯财化子孙，次日卯时晴', accept: ['overcast-clear'], when: ['今日'] },
  { id: 'zhanfa.024', date: '2004-04-30', hex: '水雷屯', lines: [2, 5], book: '寅子化进神今日大晴，戌鬼动戌亥时黑云', accept: ['clear', 'clear-cloudy', 'clear-overcast'], when: ['亥日'] },
  { id: 'zhanfa.029', date: '2004-06-04', hex: '水火既济', lines: [1], book: '卯子化辰鬼：卯日晴，辰日阴，申父暗动逢合，巳日大雨', accept: ['clear-rain', 'clear-overcast'], when: ['卯日', '巳日'] },
  { id: 'zhanfa.032', date: '2001-06-21', hex: '地火明夷', lines: [1, 6], book: '连日雨，酉父化子，酉时见日；卯子化辰鬼，次日阴云', accept: ['mixed', 'rain-clear'], when: ['酉日', '辰日'] },
  { id: 'zhanfa.034', date: '2001-06-12', hex: '雷天大壮', lines: [1, 4], book: '午父动，未时大雨，酉时即晴', accept: ['rain-clear', 'mixed'], when: ['未日'] },
  { id: 'zhanfa.035', date: '2001-08-21', hex: '坎为水', lines: [4], book: '申父化亥兄：申日雨，酉日半阴半晴，亥时大晴', accept: ['rain-cloudy', 'rain-clear'], when: ['申日', '亥日'] },
  { id: 'zhanfa.038', date: '2001-04-15', hex: '风泽中孚', lines: [3], book: '丑兄化进神，旺极也只一日阴云，无狂风', accept: ['cloudy', 'overcast'] },
  { id: 'zhanfa.043', date: '2007-02-03', hex: '泽雷随', lines: [5], book: '久雪，鬼化退神，酉时雾散天开', accept: ['overcast-clear', 'clear'], when: ['化退神'] },
  { id: 'zhanfa.047', date: '2001-05-16', hex: '离为火', lines: [], book: '酉财旬空、日建冲动，次日（逢合）即晴', accept: ['clear'], when: ['辰日'] },
  { id: 'zhanfa.049', date: '2001-01-11', hex: '震为雷', lines: [1], book: '子父化未回头克，丑日冲去未土而雨', accept: ['rain'], when: ['丑日'] },
  { id: 'zhanfa.053', date: '2001-04-10', hex: '水山蹇', lines: [], book: '六爻安静，戌父月破，次日只阴云', accept: ['unsettled'], when: ['静而月破，逢冲亦不应，阴云而已'] },
  { id: 'zhanfa.055', date: '2002-08-06', hex: '离为火', lines: [1], book: '卯父动而旬空，酉日若不雨卯日必雨；化辰子孙，辰日晴', accept: ['rain-clear'], when: ['酉日冲空', '卯日填实', '辰日'] },
  { id: 'zhanfa.057', date: '2001-10-10', hex: '坎为水', lines: [3], book: '午财化酉父，酉日天变，戌日午火入墓而雨', accept: ['clear-rain', 'overcast-rain'], when: ['酉日', '戌日'] },
  { id: 'zhanfa.059', date: '2005-04-03', hex: '风水涣', lines: [6], book: '卯父动，应在长生亥日而雨', accept: ['rain'], when: ['亥日'] },
  { id: 'zhanfa.061', date: '2001-06-21', hex: '火地晋', lines: [1, 2, 6], book: '父鬼叠见，连朝风雨，雨四旬日', accept: ['rain'], title: '连阴雨' },
  { id: 'zhanfa.062', date: '2001-07-30', hex: '水雷屯', lines: [6], book: '父爻不动，子孙化出，大旱两月不雨', accept: ['clear', 'cloudy-clear'] },
  { id: 'zhanfa.064', date: '2006-05-01', hex: '风地观', lines: [2, 3, 5, 6], book: '卯财现，次日晴；内外反吟，晴而还雨', accept: ['clear-overcast', 'clear-rain'], when: ['卯日'], text: /反吟/ },
  { id: 'zhanfa.066', date: '2003-05-01', hex: '雷天大壮', lines: [2, 3], book: '父不动，兄鬼同动，木动生风，申时冲开寅木，拔木狂风', accept: ['overcast', 'cloudy', 'wind'], when: ['申日'], title: /风/ },
  { id: 'zhanfa.069', date: '2001-09-17', hex: '天水讼', lines: [1, 2, 6], book: '子孙父母同兴，一日阴雨，戌时天开（戌子孙值时）', accept: ['mixed', 'rain-clear'], when: ['戌日'] },
  { id: 'zhanfa.071', date: '2001-06-02', hex: '地泽临', lines: [1, 6], book: '巳父空，亥日冲空而雨；酉子孙，亥日酉时晴', accept: ['mixed', 'rain-clear'], when: ['亥日冲空', '酉日'] },
  { id: 'zhanfa.073', date: '2001-09-22', hex: '雷山小过', lines: [1], book: '辰父发动，初九辰日即雨（中秋另占得晴）', accept: ['rain', 'rain-clear', 'overcast-rain'] },
  { id: 'zhanfa.075', date: '2006-05-04', hex: '天风姤', lines: [6], book: '戌父动，申时（长生）雨；父化退神，次日大晴', accept: ['rain-clear'], when: ['申日'] },
  { id: 'zhanfa.077', date: '2001-09-10', hex: '山水蒙', lines: [1, 6], book: '上下寅父动，寅日必雨', accept: ['rain', 'rain-cloudy', 'rain-clear'], when: ['寅日'] },
  { id: 'zonglun.281', date: '2004-07-04', hex: '天火同人', lines: [6], book: '戌子孙独发，动而逢合，卯日大晴', accept: ['clear'], when: ['卯日'] },
];

const BITS = Object.fromEntries(Object.entries(HEXAGRAM_MAP).map(([key, hexagram]) => [hexagram.name, [...key].reverse().map(Number)]));
const judgeCase = ({ date, hex, lines }) => {
  const [year, month, day] = date.split('-').map(Number);
  const values = BITS[hex].map((bit, i) => (lines.includes(i + 1) ? (bit ? 9 : 6) : (bit ? 7 : 8)));
  const reading = buildLiuYaoReading(values, new Date(year, month - 1, day, 12, 0), { topic: 'weather' });
  return { reading, judge: judgeLiuYao(reading) };
};

test('天时占例：卦名都能装卦', () => {
  CASES.forEach((item) => assert.ok(BITS[item.hex], `${item.id} ${item.hex}`));
  assert.equal(CASES.length, 29);
});

CASES.forEach((item) => {
  test(`天时占例 ${item.id}：${item.book}`, () => {
    const { reading, judge } = judgeCase(item);
    assert.equal(reading.hexagram.name, item.hex);
    const key = judge.verdict.weather;
    assert.ok(item.accept.includes(key), `${item.id} 程序判「${judge.verdict.title}」(${key})，书中：${item.book}`);
    (item.when ?? []).forEach((day) => assert.ok(judge.timing.some((hint) => hint.includes(day)), `${item.id} 应期应提到「${day}」：${judge.timing.join('；')}`));
    if (item.title) assert.match(judge.verdict.title, item.title instanceof RegExp ? item.title : new RegExp(`^${item.title}$`));
    if (item.text) assert.match(judge.verdict.text, item.text);
  });
});
