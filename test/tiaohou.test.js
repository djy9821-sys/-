import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { MONTH_ZHI, TIAOHOU_TABLE, describeTiaoHouPresence, seasonNoteOf, tiaoHouOf, tiaoHouPresenceOf, tiaoHouSectionOf } from '../src/data/tiaohou.js';
import { CLASSICS } from '../src/data/classics.js';
import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const PINYIN = { 甲: 'jia', 乙: 'yi', 丙: 'bing', 丁: 'ding', 戊: 'wu', 己: 'ji', 庚: 'geng', 辛: 'xin', 壬: 'ren', 癸: 'gui' };
/** 古籍库里《穷通宝鉴》某日干的全部条目。 */
const qiongtongOf = (gan) => JSON.parse(readFileSync(new URL(`../src/data/classics/bazi/qiongtong-${PINYIN[gan]}.json`, import.meta.url), 'utf8')).entries;
const sectionTitleOf = (entry) => (entry.title ?? '').replace(/·其.+$/, '');

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

test('调候用神：主用神按《穷通宝鉴》各月论原文逐格核对', () => {
  // 主用神（每格首位）：按原书正文的先后，与两份独立录文一致。
  const primary = {
    甲: '丙庚庚癸癸丁丁丁丁庚丁丁',
    乙: '丙丙癸癸癸癸己癸癸丙丙丙',
    丙: '壬壬壬壬壬壬壬壬甲甲壬壬',
    丁: '庚庚甲甲壬甲甲甲甲甲甲甲',
    戊: '丙丙甲甲壬癸丙丙甲甲丙丙',
    己: '丙甲丙癸癸癸癸癸甲丙丙丙',
    庚: '丙丁甲壬壬丁丁丁甲丁丁丙',
    辛: '己壬壬壬壬壬壬壬壬壬丙丙',
    壬: '庚戊甲壬癸辛戊甲甲戊戊丙',
    癸: '辛庚丙辛庚庚丁辛辛庚丙丙',
  };
  GAN.forEach((gan) => {
    assert.equal(MONTH_ZHI.map((zhi) => TIAOHOU_TABLE[gan][zhi][0]).join(''), primary[gan], gan);
  });
  // 几格全文：原书最常被引用的条目。
  assert.equal(TIAOHOU_TABLE.甲.寅, '丙癸');
  assert.equal(TIAOHOU_TABLE.甲.戌, '丁癸庚');
  assert.equal(TIAOHOU_TABLE.乙.巳, '癸');
  assert.equal(TIAOHOU_TABLE.丙.亥, '甲戊庚壬');
  assert.equal(TIAOHOU_TABLE.庚.寅, '丙甲丁');
  assert.equal(TIAOHOU_TABLE.辛.子, '丙戊壬甲');
  assert.equal(TIAOHOU_TABLE.癸.申, '丁');
});

test('调候用神：与坊间通行表不同的十二格照原书改，所引原文都在古籍库对应的节里', () => {
  // [日干, 月支, 本表, 原书节名, 原文]；通行表原作：甲辰庚丁壬、甲未癸丁庚、甲申庚丁壬、甲酉庚丁丙、甲戌庚甲丁壬癸、
  // 乙申丙癸己、丁寅甲庚、戊戌甲丙癸、己申丙癸、己酉丙癸、己戌甲丙癸、庚寅戊甲壬丙丁。
  const basis = [
    ['甲', '辰', '庚壬', '三月甲木', ['先取庚金，次用壬水', '三月无用丁之法。惟有先庚后壬取用']],
    ['甲', '未', '丁庚', '五六月甲木', ['六月三伏生寒，丁火退气。先丁后庚，无癸亦可']],
    ['甲', '申', '丁庚', '七月甲木', ['丁火为尊，庚金次之，庚金不可少', '壬水无碍']],
    ['甲', '酉', '丁丙庚', '八月甲木', ['丁火为先，次用丙火，庚金再次']],
    ['甲', '戌', '丁癸庚', '九月甲木', ['独爱丁火，壬癸滋扶', '耑用丁癸', '癸庚决不可少']],
    ['乙', '申', '己丙癸', '七月乙木', ['七月喜己土为用，或不见丙癸。己土必不可少']],
    ['丁', '寅', '庚甲', '正月丁火', ['非庚不能噼甲，何以引丁，姑用庚金']],
    ['戊', '戌', '甲癸丙', '九月戊土', ['先看甲木，次取癸水', '见金先用癸水，后取丙火']],
    ['己', '申', '癸丙辛', '三秋己土', ['癸先丙后', '先癸后丙，取辛辅癸']],
    ['己', '酉', '癸丙辛', '三秋己土', ['癸先丙后', '先癸后丙，取辛辅癸']],
    ['己', '戌', '甲癸丙', '三秋己土', ['先癸后丙', '九月土盛，宜甲木疏之']],
    ['庚', '寅', '丙甲丁', '正月庚金', ['先用丙暖庚性，又虑土厚埋金，须甲疏泄', '正月庚金，丙甲为上，丁火次之']],
  ];
  basis.forEach(([gan, zhi, cell, section, quotes]) => {
    assert.equal(TIAOHOU_TABLE[gan][zhi], cell, `${gan}${zhi}`);
    assert.equal(tiaoHouSectionOf(gan, zhi), section, `${gan}${zhi}`);
    const text = qiongtongOf(gan).filter((entry) => sectionTitleOf(entry) === section).map((entry) => entry.original).join('');
    quotes.forEach((quote) => assert.ok(text.includes(quote), `${gan}${zhi}：「${quote}」不在《穷通宝鉴》·${section}`));
  });
});

test('调候出处：120 格标到的节名，古籍库《穷通宝鉴》里都有', () => {
  GAN.forEach((gan) => {
    const sections = new Set(qiongtongOf(gan).map(sectionTitleOf));
    MONTH_ZHI.forEach((zhi) => {
      const section = tiaoHouSectionOf(gan, zhi);
      assert.ok(sections.has(section), `${gan}${zhi}：${section}`);
    });
  });
  assert.equal(tiaoHouSectionOf('甲', '申'), '七月甲木');
  assert.equal(tiaoHouSectionOf('甲', '午'), '五六月甲木');
  assert.equal(tiaoHouSectionOf('己', '子'), '三冬己土');
  assert.equal(tiaoHouSectionOf('戊', '丑'), '十一二月戊土');
  assert.equal(tiaoHouSectionOf('甲', '天'), null);
  assert.equal(tiaoHouSectionOf('X', '寅'), null);
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
  assert.equal(result.section, '正月甲木');
  assert.equal(result.source, '《穷通宝鉴》·正月甲木');

  assert.equal(tiaoHouOf('癸', '申').text, '癸水生申月（七月），调候用丁');
  assert.equal(tiaoHouOf('己', '酉').text, '己土生酉月（八月），调候用癸，次取丙辛');
  assert.equal(tiaoHouOf('己', '酉').source, '《穷通宝鉴》·三秋己土');
  assert.equal(seasonNoteOf('子'), '冬月寒冷');
  assert.equal(seasonNoteOf('午'), '夏月炎热');
  assert.equal(seasonNoteOf('卯'), null);
  assert.equal(tiaoHouOf('甲', '天'), null);
  assert.equal(tiaoHouOf('X', '寅'), null);
});

test('调候诸神在原局的透、藏、无：透只看年月时干，藏看四支藏干；时辰不详的时柱跳过', () => {
  // 庚午 甲申 丁巳（时辰不详）：丁火生申月，调候用甲，次取庚丙戊。
  const chart = buildBaziChart({ calendarType: 'solar', year: 1990, month: 8, day: 20, gender: 'male', timeMode: 'unknown' });
  assert.equal(chart.pillars.map((pillar) => pillar.ganZhi).join(' ').trim(), '庚午 甲申 丁巳');
  const presence = tiaoHouPresenceOf(chart.pillars, ['甲', '庚', '丙', '戊', '癸']);
  assert.deepEqual(presence, [
    { gan: '甲', tou: ['月干'], cang: [] },
    { gan: '庚', tou: ['年干'], cang: ['申', '巳'] },
    { gan: '丙', tou: [], cang: ['巳'] },
    { gan: '戊', tou: [], cang: ['申', '巳'] },
    { gan: '癸', tou: [], cang: [] },
  ]);
  assert.equal(describeTiaoHouPresence(presence), '原局：甲透月干；庚透年干、藏于申、巳；丙藏于巳；戊藏于申、巳；癸无');
  // 日干是日主自己，不算「透」。
  assert.deepEqual(tiaoHouPresenceOf(chart.pillars, ['丁'])[0].tou, []);
  const strength = analyzeStrength(chart);
  assert.equal(strength.tiaoHou.presenceText, '原局：甲透月干；庚透年干、藏于申、巳；丙藏于巳；戊藏于申、巳');
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
