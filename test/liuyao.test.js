import test from 'node:test';
import assert from 'node:assert/strict';

import { HEXAGRAM_MAP } from '../src/utils/hexagramLogic.js';
import { YAO_CI, getYaoCi } from '../src/data/yaoci.js';
import { buildLiuYaoPrompt, buildLiuYaoReading, coinsToLineValue, getPalaceInfo } from '../src/utils/liuyao.js';

// 八宫归属（京房八宫），与通行的六爻排盘表一致。
const PALACES = {
  乾为天: '乾本宫', 坤为地: '坤本宫', 水雷屯: '坎二世', 山水蒙: '离四世', 水天需: '坤游魂', 天水讼: '离游魂',
  地水师: '坎归魂', 水地比: '坤归魂', 风天小畜: '巽一世', 天泽履: '艮五世', 地天泰: '坤三世', 天地否: '乾三世',
  天火同人: '离归魂', 火天大有: '乾归魂', 地山谦: '兑五世', 雷地豫: '震一世', 泽雷随: '震归魂', 山风蛊: '巽归魂',
  地泽临: '坤二世', 风地观: '乾四世', 火雷噬嗑: '巽五世', 山火贲: '艮一世', 山地剥: '乾五世', 地雷复: '坤一世',
  天雷无妄: '巽四世', 山天大畜: '艮二世', 山雷颐: '巽游魂', 泽风大过: '震游魂', 坎为水: '坎本宫', 离为火: '离本宫',
  泽山咸: '兑三世', 雷风恒: '震三世', 天山遁: '乾二世', 雷天大壮: '坤四世', 火地晋: '乾游魂', 地火明夷: '坎游魂',
  风火家人: '巽二世', 火泽睽: '艮四世', 水山蹇: '兑四世', 雷水解: '震二世', 山泽损: '艮三世', 风雷益: '巽三世',
  泽天夬: '坤五世', 天风姤: '乾一世', 泽地萃: '兑二世', 地风升: '震四世', 泽水困: '兑一世', 水风井: '震五世',
  泽火革: '坎四世', 火风鼎: '离二世', 震为雷: '震本宫', 艮为山: '艮本宫', 风山渐: '艮归魂', 雷泽归妹: '兑归魂',
  雷火丰: '坎五世', 火山旅: '离一世', 巽为风: '巽本宫', 兑为泽: '兑本宫', 风水涣: '离五世', 水泽节: '坎一世',
  风泽中孚: '艮游魂', 雷山小过: '兑游魂', 水火既济: '坎三世', 火水未济: '离三世',
};

const castAt = new Date(2026, 9, 26, 10, 0); // 丙午年 戊戌月 癸酉日 丁巳时

test('六十四卦的八宫归属与世应位置', () => {
  Object.entries(HEXAGRAM_MAP).forEach(([key, info]) => {
    const bits = [...key].reverse().map(Number);
    const palace = getPalaceInfo(bits);
    assert.equal(`${palace.palace}${palace.label}`, PALACES[info.name], info.name);
    assert.equal(palace.ying, palace.shi > 3 ? palace.shi - 3 : palace.shi + 3);
  });
  assert.deepEqual([getPalaceInfo([1, 1, 1, 1, 1, 1]).shi, getPalaceInfo([0, 1, 1, 1, 1, 1]).shi, getPalaceInfo([0, 0, 0, 1, 0, 1]).shi], [6, 1, 4]);
});

test('爻辞齐全且按通行本校对', () => {
  assert.equal(Object.keys(YAO_CI).length, 64);
  Object.entries(YAO_CI).forEach(([name, entry]) => {
    assert.ok(HEXAGRAM_MAP[Object.keys(HEXAGRAM_MAP).find((key) => HEXAGRAM_MAP[key].name === name)], name);
    assert.equal(entry.lines.length, 6, name);
  });
  assert.deepEqual(getYaoCi('乾为天', 1), { title: '初九', text: '潜龙，勿用。' });
  assert.equal(getYaoCi('泽水困', 1).text, '臀困于株木，入于幽谷，三岁不觌。');
  assert.equal(getYaoCi('地雷复', 1).text, '不远复，无祗悔，元吉。');
  assert.equal(getYaoCi('地天泰', 1).text, '拔茅茹，以其汇，征吉。');
  assert.equal(getYaoCi('水雷屯', 3).text, '即鹿无虞，惟入于林中，君子几不如舍，往吝。');
  assert.equal(YAO_CI['坤为地'].extra, '用六：利永贞。');
  assert.equal(getYaoCi('乾为天', 7), null);
});

test('铜钱字面数 → 爻值', () => {
  assert.deepEqual([0, 1, 2, 3].map(coinsToLineValue), [6, 7, 8, 9]);
});

test('天风姤：纳甲、六亲、六神、世应、伏神与旬空', () => {
  const reading = buildLiuYaoReading([8, 7, 7, 7, 7, 7], castAt);
  assert.equal(reading.hexagram.name, '天风姤');
  assert.deepEqual([reading.hexagram.palace, reading.hexagram.palaceLabel, reading.hexagram.shi, reading.hexagram.ying], ['乾', '一世', 1, 4]);
  assert.deepEqual(
    reading.lines.map((line) => `${line.god}${line.relative}${line.ganZhi}`),
    ['玄武父母辛丑', '青龙子孙辛亥', '朱雀兄弟辛酉', '勾陈官鬼壬午', '螣蛇兄弟壬申', '白虎父母壬戌'],
  );
  assert.deepEqual(reading.lines.map((line) => line.marks), [[], ['旬空'], [], [], [], ['旬空']]);
  assert.deepEqual(reading.hidden.map((item) => `${item.relative}${item.ganZhi}伏${item.position}`), ['妻财甲寅伏2']);
  assert.equal(reading.changed, null);
  assert.deepEqual([reading.time.year, reading.time.month, reading.time.day, reading.time.hour, reading.time.xunKong.join('')], ['丙午', '戊戌', '癸酉', '丁巳', '戌亥']);
});

test('火泽睽二五爻动：变卦、互卦、变爻六亲以本宫论、动爻爻辞', () => {
  const reading = buildLiuYaoReading([7, 9, 8, 7, 6, 7], castAt, { question: '能否成交', method: 'coins' });
  assert.equal(reading.hexagram.name, '火泽睽');
  assert.equal(reading.changed.name, '天雷无妄');
  assert.equal(reading.mutual.name, '水火既济');
  assert.deepEqual(reading.movingPositions, [2, 5]);
  const second = reading.lines[1];
  assert.deepEqual([second.relative, second.ganZhi, second.marks, second.changed.relative, second.changed.ganZhi], ['官鬼', '丁卯', ['日冲'], '官鬼', '庚寅']);
  assert.equal(reading.lines[4].changed.ganZhi, '壬申');
  assert.equal(reading.lines[4].changed.relative, '子孙');
  assert.equal(second.yaoCi.title, '九二');
  assert.equal(reading.lines[0].yaoCi, null);
  assert.deepEqual(reading.hidden.map((item) => `${item.relative}${item.ganZhi}伏${item.position}`), ['妻财丙子伏5']);

  const prompt = buildLiuYaoPrompt(reading);
  ['【所问】能否成交', '【本卦】火泽睽', '艮宫四世', '【变卦】天雷无妄', '二爻 青龙 官鬼丁卯木 老阳（动） [日冲] → 变官鬼庚寅', '- 九二：遇主于巷，无咎。', '伏神：妻财丙子伏于五爻下']
    .forEach((text) => assert.ok(prompt.includes(text), text));
});

test('乾六爻皆动变坤，附用九', () => {
  const reading = buildLiuYaoReading([9, 9, 9, 9, 9, 9], castAt);
  assert.equal(reading.changed.name, '坤为地');
  assert.equal(reading.useExtra, '用九：见群龙无首，吉。');
  assert.throws(() => buildLiuYaoReading([1, 2, 3, 4, 5, 6], castAt));
});
