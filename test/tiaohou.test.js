import test from 'node:test';
import assert from 'node:assert/strict';

import { MONTH_ZHI, TIAOHOU_TABLE, seasonNoteOf, tiaoHouOf } from '../src/data/tiaohou.js';
import { CLASSICS } from '../src/data/classics.js';
import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

test('调候用神表：十干十二月 120 格齐全，每格只含天干且不重复', () => {
  assert.deepEqual(Object.keys(TIAOHOU_TABLE), GAN);
  GAN.forEach((gan) => {
    assert.deepEqual(Object.keys(TIAOHOU_TABLE[gan]), MONTH_ZHI, gan);
    MONTH_ZHI.forEach((zhi) => {
      const cell = TIAOHOU_TABLE[gan][zhi];
      assert.ok(cell.length >= 1 && cell.length <= 5, `${gan}${zhi}: ${cell}`);
      assert.ok([...cell].every((stem) => GAN.includes(stem)), `${gan}${zhi}: ${cell}`);
      assert.equal(new Set([...cell]).size, cell.length, `${gan}${zhi} 重复：${cell}`);
    });
  });
  assert.equal(CLASSICS.qiongtong.title, '穷通宝鉴');
});

test('调候用神表：与《穷通宝鉴》通行本逐格核对过的主用神', () => {
  // 主用神（每格首位）：与两份独立录文完全一致。
  const primary = {
    甲: '丙庚庚癸癸癸庚庚庚庚丁丁',
    乙: '丙丙癸癸癸癸丙癸癸丙丙丙',
    丙: '壬壬壬壬壬壬壬壬甲甲壬壬',
    丁: '甲庚甲甲壬甲甲甲甲甲甲甲',
    戊: '丙丙甲甲壬癸丙丙甲甲丙丙',
    己: '丙甲丙癸癸癸丙丙甲丙丙丙',
    庚: '戊丁甲壬壬丁丁丁甲丁丁丙',
    辛: '己壬壬壬壬壬壬壬壬壬丙丙',
    壬: '庚戊甲壬癸辛戊甲甲戊戊丙',
    癸: '辛庚丙辛庚庚丁辛辛庚丙丙',
  };
  GAN.forEach((gan) => {
    assert.equal(MONTH_ZHI.map((zhi) => TIAOHOU_TABLE[gan][zhi][0]).join(''), primary[gan], gan);
  });
  // 几格全文：原书最常被引用的条目。
  assert.equal(TIAOHOU_TABLE.甲.寅, '丙癸');
  assert.equal(TIAOHOU_TABLE.甲.戌, '庚甲丁壬癸');
  assert.equal(TIAOHOU_TABLE.乙.巳, '癸');
  assert.equal(TIAOHOU_TABLE.丙.亥, '甲戊庚壬');
  assert.equal(TIAOHOU_TABLE.庚.寅, '戊甲壬丙丁');
  assert.equal(TIAOHOU_TABLE.辛.子, '丙戊壬甲');
  assert.equal(TIAOHOU_TABLE.癸.申, '丁');
});

test('tiaoHouOf 给出主次用神、五行、季节与出处', () => {
  const result = tiaoHouOf('甲', '寅');
  assert.deepEqual(result.stems, ['丙', '癸']);
  assert.equal(result.primary, '丙');
  assert.deepEqual(result.secondary, ['癸']);
  assert.equal(result.element, '火');
  assert.deepEqual(result.elements, ['火', '水']);
  assert.equal(result.season, null);
  assert.equal(result.text, '甲木生寅月（正月），调候用丙，次取癸');
  assert.equal(result.source, '《穷通宝鉴》·调候用神表');

  assert.equal(tiaoHouOf('癸', '申').text, '癸水生申月（七月），调候用丁');
  assert.equal(seasonNoteOf('子'), '冬月寒冷');
  assert.equal(seasonNoteOf('午'), '夏月炎热');
  assert.equal(seasonNoteOf('卯'), null);
  assert.equal(tiaoHouOf('甲', '天'), null);
  assert.equal(tiaoHouOf('X', '寅'), null);
});

test('旺衰喜用：调候主用神的五行附在喜用末尾（扶抑已取的不重复）；与用神相生的同列喜用，克用神或为用神所克的让位于用神；次用神只作说明', () => {
  // 丙火生子月：原书用壬（杀），不是粗略的「冬月用火」。此造身弱、官杀重，扶抑取印（甲木）化杀，用神木；
  // 壬水生甲木，调候与用神相生，同列喜用。
  const winterBing = buildBaziChart({ calendarType: 'solar', year: 1996, month: 12, day: 15, gender: 'male', hourIndex: 6 });
  assert.equal(winterBing.dayMaster.gan, '丙');
  assert.equal(winterBing.pillars[1].zhi, '子');
  const strength = analyzeStrength(winterBing);
  assert.equal(strength.tiaoHou.primary, '壬');
  assert.equal(strength.favorable.at(-1).element, '水');
  assert.equal(strength.favorable.at(-1).tiaoHou, true);
  assert.equal(strength.favorable[0].element, '木');
  assert.ok(strength.unfavorable.every((item) => item.element !== '水'));
  assert.ok(strength.favorable.filter((item) => item.tiaoHou).length === 1);
  assert.equal(strength.tiaoHouNote, '调候宜水，水生用神，同列喜用');
  // 丙午 甲午 丁巳 丙午：旺极取土泄秀，调候宜水，水为土所克，让位于用神，列为忌。
  const fire = analyzeStrength(buildBaziChart({ calendarType: 'solar', year: 2026, month: 6, day: 12, gender: 'male', hourIndex: 6 }));
  assert.equal(fire.favorable[0].element, '土');
  assert.ok(fire.unfavorable.some((item) => item.element === '水' && item.tiaoHou));
  assert.equal(fire.tiaoHouNote, '调候宜水，但水为用神所克，以用神为重，不作喜用');
});
