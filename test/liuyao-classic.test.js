import test from 'node:test';
import assert from 'node:assert/strict';

import { Lunar, Solar } from 'lunar-javascript';
import { buildLiuYaoReading, coinsToLineValue, describeCastTime, getPalaceInfo, hexagramRelationOf } from '../src/utils/liuyao.js';
import { judgeLiuYao } from '../src/utils/liuyaoJudge.js';
import { castByNumbers, castByTime, valuesFromTrigrams } from '../src/utils/liuyaoCast.js';

/*
 * 六爻古法对照：不用程序里的表，按《京氏易传》《卜筮正宗》《增删卜易》的口诀独立推一遍
 * 八宫卦序、世应、纳甲、六亲、六神、旬空、伏神、六冲六合，再和装卦结果逐卦核对。
 */

// 《卜筮正宗·八宫卦序》：本宫、一世、二世、三世、四世、五世、游魂、归魂。
const PALACE_SEQUENCE = {
  乾: ['乾为天', '天风姤', '天山遁', '天地否', '风地观', '山地剥', '火地晋', '火天大有'],
  坎: ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
  艮: ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
  震: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
  巽: ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
  离: ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'],
  坤: ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
  兑: ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹'],
};
const PALACE_LABELS = ['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂'];
// 世爻：八纯卦世在上爻，一世至五世依次在初至五爻，游魂世在四爻，归魂世在三爻；应爻隔三位。
const SHI_BY_ORDER = [6, 1, 2, 3, 4, 5, 4, 3];
const PALACE_ELEMENT = { 乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' };
const SYMBOL_TRIGRAM = { 天: '乾', 泽: '兑', 火: '离', 雷: '震', 风: '巽', 水: '坎', 山: '艮', 地: '坤' };
// 三爻自下而上：乾三连、兑上缺、离中虚、震仰盂、巽下断、坎中满、艮覆碗、坤六断。
const TRIGRAM_BITS = { 乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0], 巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0] };
// 京房纳甲：乾纳甲壬、坤纳乙癸、震庚、巽辛、坎戊、离己、艮丙、兑丁；内卦取前三支，外卦取后三支。
const NAJIA = {
  乾: '甲子 甲寅 甲辰 壬午 壬申 壬戌',
  坤: '乙未 乙巳 乙卯 癸丑 癸亥 癸酉',
  震: '庚子 庚寅 庚辰 庚午 庚申 庚戌',
  巽: '辛丑 辛亥 辛酉 辛未 辛巳 辛卯',
  坎: '戊寅 戊辰 戊午 戊申 戊戌 戊子',
  离: '己卯 己丑 己亥 己酉 己未 己巳',
  艮: '丙辰 丙午 丙申 丙戌 丙子 丙寅',
  兑: '丁巳 丁卯 丁丑 丁亥 丁酉 丁未',
};
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI_ELEMENT = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
// 《京氏易传》六亲：生我者父母，我生者子孙，克我者官鬼，我克者妻财，比和者兄弟（“我”为本宫五行）。
const sixRelative = (palaceElement, element) => {
  if (element === palaceElement) return '兄弟';
  if (SHENG[element] === palaceElement) return '父母';
  if (SHENG[palaceElement] === element) return '子孙';
  if (KE[element] === palaceElement) return '官鬼';
  return '妻财';
};
// 六神起例：甲乙起青龙，丙丁起朱雀，戊日起勾陈，己日起螣蛇，庚辛起白虎，壬癸起玄武。
const SIX_GODS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
const godStartByGan = { 甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5 };
const clashOf = (zhi) => ZHI[(ZHI.indexOf(zhi) + 6) % 12];
// 地支六合：子丑、寅亥、卯戌、辰酉、巳申、午未。
const HARMONY = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
// 旬空：日柱所在旬（甲子旬……甲寅旬）之外的两个地支。
const xunKongOf = (gan, zhi) => {
  const g = GAN.indexOf(gan);
  const z = ZHI.indexOf(zhi);
  const head = (z - g + 12) % 12; // 旬首（甲X）的地支
  return [ZHI[(head + 10) % 12], ZHI[(head + 11) % 12]];
};

// 《周易》六十四卦序（上经三十、下经三十四），用于核对卦序号。
const KING_WEN = ['乾', '坤', '屯', '蒙', '需', '讼', '师', '比', '小畜', '履', '泰', '否', '同人', '大有', '谦', '豫', '随', '蛊', '临', '观', '噬嗑', '贲', '剥', '复', '无妄', '大畜', '颐', '大过', '坎', '离',
  '咸', '恒', '遁', '大壮', '晋', '明夷', '家人', '睽', '蹇', '解', '损', '益', '夬', '姤', '萃', '升', '困', '井', '革', '鼎', '震', '艮', '渐', '归妹', '丰', '旅', '巽', '兑', '涣', '节', '中孚', '小过', '既济', '未济'];
const shortName = (name) => (name.includes('为') ? name.slice(0, 1) : name.slice(2));

const trigramsOf = (name) => {
  if (name.includes('为')) return [name[0], name[0]];
  return [SYMBOL_TRIGRAM[name[0]], SYMBOL_TRIGRAM[name[1]]]; // [上卦, 下卦]
};
const bitsOf = (name) => {
  const [upper, lower] = trigramsOf(name);
  return [...TRIGRAM_BITS[lower], ...TRIGRAM_BITS[upper]];
};
const najiaOf = (name) => {
  const [upper, lower] = trigramsOf(name);
  return [...NAJIA[lower].split(' ').slice(0, 3), ...NAJIA[upper].split(' ').slice(3)];
};
const staticValues = (bits) => bits.map((bit) => (bit ? 7 : 8));

/** 按口诀推出的六十四卦档案：{ name, palace, order, bits, najia, relatives }。 */
const CLASSIC = Object.entries(PALACE_SEQUENCE).flatMap(([palace, names]) => names.map((name, order) => {
  const najia = najiaOf(name);
  return {
    name,
    palace,
    order,
    bits: bitsOf(name),
    najia,
    relatives: najia.map((ganZhi) => sixRelative(PALACE_ELEMENT[palace], ZHI_ELEMENT[ganZhi[1]])),
  };
}));

const dateFor = (dayGanZhi) => {
  // 2026-10-26 为癸酉日，往前后找到指定日柱的一天（午时，避开子时的换日问题）。
  for (let offset = -60; offset <= 60; offset += 1) {
    const date = new Date(2026, 9, 26 + offset, 12, 0);
    if (describeCastTime(date).day === dayGanZhi) return date;
  }
  throw new Error(`找不到 ${dayGanZhi} 日`);
};

test('八宫卦序推出的六十四卦与装卦结果逐一相符：卦名、卦序号、宫位、世应', () => {
  assert.equal(CLASSIC.length, 64);
  assert.equal(new Set(CLASSIC.map((item) => item.bits.join(''))).size, 64);
  const castAt = dateFor('癸酉');
  CLASSIC.forEach((item) => {
    const palace = getPalaceInfo(item.bits);
    assert.equal(palace.palace, item.palace, item.name);
    assert.equal(palace.label, PALACE_LABELS[item.order], item.name);
    assert.equal(palace.palaceElement, PALACE_ELEMENT[item.palace], item.name);
    assert.equal(palace.shi, SHI_BY_ORDER[item.order], item.name);
    assert.equal(palace.ying, palace.shi > 3 ? palace.shi - 3 : palace.shi + 3, item.name);
    const reading = buildLiuYaoReading(staticValues(item.bits), castAt);
    assert.equal(reading.hexagram.name, item.name);
    assert.equal(reading.hexagram.number, KING_WEN.indexOf(shortName(item.name)) + 1, item.name);
    assert.deepEqual(reading.lines.map((line) => line.isShi), reading.lines.map((line) => line.position === SHI_BY_ORDER[item.order]), item.name);
  });
});

test('纳甲与六亲：六十四卦三百八十四爻与京房纳甲、六亲生克口诀一致', () => {
  const castAt = dateFor('癸酉');
  CLASSIC.forEach((item) => {
    const reading = buildLiuYaoReading(staticValues(item.bits), castAt);
    assert.deepEqual(reading.lines.map((line) => line.ganZhi), item.najia, item.name);
    assert.deepEqual(reading.lines.map((line) => line.relative), item.relatives, item.name);
    assert.deepEqual(reading.lines.map((line) => line.element), item.najia.map((ganZhi) => ZHI_ELEMENT[ganZhi[1]]), item.name);
  });
  // 几处容易记混的爻位：坎卦初爻戊寅、离卦初爻己卯、艮卦初爻丙辰、兑卦初爻丁巳；外卦乾用壬、坤用癸。
  const byName = Object.fromEntries(CLASSIC.map((item) => [item.name, item]));
  assert.deepEqual(byName['坎为水'].najia, ['戊寅', '戊辰', '戊午', '戊申', '戊戌', '戊子']);
  assert.deepEqual(byName['离为火'].najia, ['己卯', '己丑', '己亥', '己酉', '己未', '己巳']);
  assert.deepEqual(byName['水天需'].najia, ['甲子', '甲寅', '甲辰', '戊申', '戊戌', '戊子']);
  assert.deepEqual(byName['地天泰'].najia, ['甲子', '甲寅', '甲辰', '癸丑', '癸亥', '癸酉']);
  assert.deepEqual(byName['地天泰'].relatives, ['妻财', '官鬼', '兄弟', '兄弟', '妻财', '子孙']);
});

test('伏神：本卦缺的六亲到本宫首卦同位去找，与《卜筮正宗》伏神例相符', () => {
  const castAt = dateFor('癸酉');
  const pureByPalace = Object.fromEntries(CLASSIC.filter((item) => item.order === 0).map((item) => [item.palace, item]));
  CLASSIC.forEach((item) => {
    const reading = buildLiuYaoReading(staticValues(item.bits), castAt);
    const pure = pureByPalace[item.palace];
    const missing = ['父母', '兄弟', '子孙', '妻财', '官鬼'].filter((relative) => !item.relatives.includes(relative));
    const expected = missing.flatMap((relative) => pure.relatives
      .map((pureRelative, i) => (pureRelative === relative ? `${relative}${pure.najia[i]}伏${i + 1}` : null))
      .filter(Boolean));
    assert.deepEqual(reading.hidden.map((hiddenItem) => `${hiddenItem.relative}${hiddenItem.ganZhi}伏${hiddenItem.position}`), expected, item.name);
  });
  const hiddenOf = (name) => buildLiuYaoReading(staticValues(bitsOf(name)), castAt).hidden.map((hiddenItem) => `${hiddenItem.relative}${hiddenItem.ganZhi}伏${hiddenItem.position}`);
  assert.deepEqual(hiddenOf('天风姤'), ['妻财甲寅伏2']);
  assert.deepEqual(hiddenOf('风地观'), ['兄弟壬申伏5', '子孙甲子伏1']);
  assert.deepEqual(hiddenOf('水天需'), ['父母乙巳伏2']);
  assert.deepEqual(hiddenOf('雷地豫'), ['父母庚子伏1']);
  assert.deepEqual(hiddenOf('地火明夷'), ['妻财戊午伏3']);
  assert.deepEqual(hiddenOf('山雷颐'), ['子孙辛巳伏5', '官鬼辛酉伏3']);
  assert.deepEqual(hiddenOf('火天大有'), []);
});

test('六神按日干起例，六十甲子日逐一核对', () => {
  const bits = bitsOf('天风姤');
  for (let offset = 0; offset < 60; offset += 1) {
    const date = new Date(2026, 9, 26 + offset, 12, 0);
    const time = describeCastTime(date);
    const reading = buildLiuYaoReading(staticValues(bits), date);
    const start = godStartByGan[time.dayGan];
    assert.deepEqual(reading.lines.map((line) => line.god), [0, 1, 2, 3, 4, 5].map((i) => SIX_GODS[(start + i) % 6]), time.day);
  }
});

test('旬空、月破、日冲：按日柱所在旬与月建、日辰的对冲独立核算', () => {
  const bits = bitsOf('乾为天'); // 子寅辰午申戌六支齐全
  for (let offset = 0; offset < 60; offset += 1) {
    const date = new Date(2026, 9, 26 + offset, 12, 0);
    const time = describeCastTime(date);
    const kong = xunKongOf(time.dayGan, time.dayZhi);
    assert.deepEqual([...time.xunKong].sort(), [...kong].sort(), time.day);
    const reading = buildLiuYaoReading(staticValues(bits), date);
    reading.lines.forEach((line) => {
      assert.equal(line.marks.includes('旬空'), kong.includes(line.zhi), `${time.day} ${line.ganZhi} 旬空`);
      assert.equal(line.marks.includes('月破'), clashOf(time.monthZhi) === line.zhi, `${time.day} ${line.ganZhi} 月破`);
      assert.equal(line.marks.includes('日冲'), clashOf(time.dayZhi) === line.zhi, `${time.day} ${line.ganZhi} 日冲`);
    });
  }
  // 口诀校验：甲子旬空戌亥，甲戌旬空申酉，甲申旬空午未，甲午旬空辰巳，甲辰旬空寅卯，甲寅旬空子丑。
  assert.deepEqual(xunKongOf('甲', '子'), ['戌', '亥']);
  assert.deepEqual(xunKongOf('癸', '酉'), ['戌', '亥']);
  assert.deepEqual(xunKongOf('乙', '亥'), ['申', '酉']);
  assert.deepEqual(xunKongOf('戊', '子'), ['午', '未']);
  assert.deepEqual(xunKongOf('癸', '亥'), ['子', '丑']);
});

test('六冲卦十个、六合卦八个，按三对爻的地支对冲、相合判定', () => {
  const clash = CLASSIC.filter((item) => [[0, 3], [1, 4], [2, 5]].every(([a, b]) => clashOf(item.najia[a][1]) === item.najia[b][1])).map((item) => item.name);
  const harmony = CLASSIC.filter((item) => [[0, 3], [1, 4], [2, 5]].every(([a, b]) => HARMONY[item.najia[a][1]] === item.najia[b][1])).map((item) => item.name);
  assert.deepEqual(clash.sort(), ['乾为天', '坤为地', '震为雷', '巽为风', '坎为水', '离为火', '艮为山', '兑为泽', '天雷无妄', '雷天大壮'].sort());
  assert.deepEqual(harmony.sort(), ['天地否', '地天泰', '泽水困', '水泽节', '火山旅', '山火贲', '雷地豫', '地雷复'].sort());
  CLASSIC.forEach((item) => {
    const expected = clash.includes(item.name) ? '六冲' : harmony.includes(item.name) ? '六合' : '';
    assert.equal(hexagramRelationOf(item.bits), expected, item.name);
  });
  const castAt = dateFor('癸酉');
  const readingOf = (name) => buildLiuYaoReading(staticValues(bitsOf(name)), castAt);
  assert.equal(readingOf('雷地豫').hexagram.relation, '六合');
  assert.equal(readingOf('地雷复').hexagram.relation, '六合');
  assert.equal(readingOf('雷天大壮').hexagram.relation, '六冲');
  assert.equal(readingOf('水雷屯').hexagram.relation, '');
  // 程序初判也要认得全部八个六合卦。
  ['雷地豫', '地雷复', '天地否', '火山旅'].forEach((name) => {
    assert.ok(judgeLiuYao(readingOf(name)).structure.some((text) => text.includes('本卦六合')), name);
  });
  ['乾为天', '天雷无妄'].forEach((name) => {
    assert.ok(judgeLiuYao(readingOf(name)).structure.some((text) => text.includes('本卦六冲')), name);
  });
  // 变卦：天风姤初爻动变乾为天，变卦六冲。
  const gou = buildLiuYaoReading([6, 7, 7, 7, 7, 7], castAt);
  assert.equal(gou.changed.name, '乾为天');
  assert.equal(gou.changed.relation, '六冲');
  assert.ok(judgeLiuYao(gou).structure.some((text) => text.includes('变卦六冲')));
});

test('变卦与互卦：动爻阴阳互变，互卦取二三四爻与三四五爻', () => {
  const castAt = dateFor('癸酉');
  // 泽火革初爻动变泽山咸，互卦天风姤（《梅花易数》观梅占）。
  const ge = buildLiuYaoReading([9, 8, 7, 7, 7, 8], castAt);
  assert.equal(ge.hexagram.name, '泽火革');
  assert.equal(ge.changed.name, '泽山咸');
  assert.equal(ge.mutual.name, '天风姤');
  // 天风姤五爻动变火风鼎，互见重乾（牡丹占）。
  const gou = buildLiuYaoReading([8, 7, 7, 7, 9, 7], castAt);
  assert.equal(gou.hexagram.name, '天风姤');
  assert.equal(gou.changed.name, '火风鼎');
  assert.equal(gou.mutual.name, '乾为天');
  // 变爻纳甲取变卦的卦，六亲仍以本宫五行论。
  assert.equal(gou.lines[4].changed.ganZhi, '己未');
  assert.equal(gou.lines[4].changed.relative, '父母');
});

test('梅花易数时间起卦：观梅占与牡丹占的年月日时数', () => {
  // 观梅占：辰年十二月十七日申时。辰5+12+17=34，除8余2为兑；加申9=43，除8余3为离；43除6余1动初爻。
  const guanMei = Lunar.fromYmd(2024, 12, 17).getSolar(); // 甲辰年十二月十七
  const guanMeiDate = new Date(guanMei.getYear(), guanMei.getMonth() - 1, guanMei.getDay(), 16, 0);
  assert.equal(Solar.fromDate(guanMeiDate).getLunar().getYearZhi(), '辰');
  const a = castByTime(guanMeiDate);
  assert.deepEqual([a.upperIndex, a.lowerIndex, a.movingPosition], [2, 3, 1]);
  const aReading = buildLiuYaoReading(a.values, guanMeiDate);
  assert.deepEqual([aReading.hexagram.name, aReading.changed.name, aReading.mutual.name], ['泽火革', '泽山咸', '天风姤']);
  assert.match(a.note, /年5\+月12\+日17=34/);

  // 牡丹占：巳年三月十六日卯时。巳6+3+16=25，除8余1为乾；加卯4=29，除8余5为巽；29除6余5动五爻。
  const muDan = Lunar.fromYmd(2025, 3, 16).getSolar(); // 乙巳年三月十六
  const muDanDate = new Date(muDan.getYear(), muDan.getMonth() - 1, muDan.getDay(), 6, 0);
  const b = castByTime(muDanDate);
  assert.deepEqual([b.upperIndex, b.lowerIndex, b.movingPosition], [1, 5, 5]);
  const bReading = buildLiuYaoReading(b.values, muDanDate);
  assert.deepEqual([bReading.hexagram.name, bReading.changed.name, bReading.mutual.name], ['天风姤', '火风鼎', '乾为天']);

  // 先天八卦数：乾一兑二离三震四巽五坎六艮七坤八；整除时取 8 与 6。
  const names = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
  names.forEach((upper, i) => names.forEach((lower, j) => {
    const values = valuesFromTrigrams(i + 1, j + 1, 6);
    const reading = buildLiuYaoReading(values, guanMeiDate);
    assert.deepEqual([reading.hexagram.upper, reading.hexagram.lower], [upper, lower]);
    assert.deepEqual(reading.movingPositions, [6]);
  }));
  [[37, 58], [8, 16], [1, 1], [9999, 1234], [100, 6]].forEach(([first, second]) => {
    const result = castByNumbers(first, second);
    const mod = (value, modulus) => value % modulus || modulus;
    assert.deepEqual([result.upperIndex, result.lowerIndex, result.movingPosition], [mod(first, 8), mod(second, 8), mod(first + second, 6)]);
  });
});

test('铜钱：《增删卜易》以背为阳，一背单、二背拆、三背重（老阳）、三字交（老阴）', () => {
  assert.deepEqual([0, 1, 2, 3].map(coinsToLineValue), [6, 7, 8, 9]);
  const reading = buildLiuYaoReading([coinsToLineValue(3), coinsToLineValue(0), coinsToLineValue(1), coinsToLineValue(2), coinsToLineValue(1), coinsToLineValue(1)], dateFor('癸酉'));
  assert.deepEqual(reading.lines.map((line) => line.name), ['老阳', '老阴', '少阳', '少阴', '少阳', '少阳']);
  assert.deepEqual(reading.movingPositions, [1, 2]);
});

test('起卦时间：月建按节气，年柱按立春，晚子时日柱不换日而时柱用次日之子', () => {
  // 2026-02-03 立春前：仍是乙巳年、己丑月；2026-02-04 立春（10:02 后）：丙午年、庚寅月。
  const beforeLiChun = describeCastTime(new Date(2026, 1, 3, 12, 0));
  const afterLiChun = describeCastTime(new Date(2026, 1, 4, 12, 0));
  assert.deepEqual([beforeLiChun.year, beforeLiChun.month, beforeLiChun.monthZhi], ['乙巳', '己丑', '丑']);
  assert.deepEqual([afterLiChun.year, afterLiChun.month, afterLiChun.monthZhi], ['丙午', '庚寅', '寅']);
  // 2026-10-27 23:30：日柱仍是当天的甲戌，时柱为次日乙亥日的子时丙子（夜子时之例）。
  const lateNight = describeCastTime(new Date(2026, 9, 27, 23, 30));
  assert.deepEqual([lateNight.day, lateNight.hour], ['甲戌', '丙子']);
  const earlyNight = describeCastTime(new Date(2026, 9, 28, 0, 30));
  assert.deepEqual([earlyNight.day, earlyNight.hour], ['乙亥', '丙子']);
  // 梅花时间起卦的时辰数：子1……亥12；晚子时也记作子（1）。
  const lateCast = castByTime(new Date(2026, 9, 27, 23, 30));
  assert.match(lateCast.note, /子时/);
  assert.match(lateCast.note, /再加时1=/);
});
