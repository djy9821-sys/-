import test from 'node:test';
import assert from 'node:assert/strict';

import { astro, util } from 'iztro';
import { QUANSHU_BRIGHTNESS_FIXES } from '../src/utils/ziweiBrightness.js';
import { createZiweiHoroscope } from '../src/utils/ziweiBirth.js';

/**
 * 《紫微斗数全书》卷二庙旺表（维基文库录文），按宫列出各等的星：
 * 紫紫微 机天机 日太阳 武武曲 同天同 廉廉贞 府天府 月太阴 贪贪狼 巨巨门 相天相 梁天梁 杀七杀 破破军 昌文昌 曲文曲 羊擎羊 陀陀罗 火火星 铃铃星（禄禄存不比）。
 */
const QUANSHU = {
  子: { 庙: '机府月相梁破', 旺: '武同贪巨杀', 得: '昌曲', 利: '', 平: '紫廉', 不: '', 陷: '日羊火铃' },
  丑: { 庙: '紫武府月贪相杀昌曲羊陀', 旺: '梁破', 得: '火铃', 利: '廉', 平: '', 不: '日同巨', 陷: '机' },
  寅: { 庙: '廉府巨相梁杀火铃', 旺: '紫日月', 得: '机武破', 利: '同', 平: '贪曲', 不: '', 陷: '昌陀' },
  卯: { 庙: '日巨梁', 旺: '紫机杀曲', 得: '府', 利: '武贪昌火铃', 平: '同廉', 不: '', 陷: '月相破羊' },
  辰: { 庙: '武府贪梁杀羊陀', 旺: '日破', 得: '紫相昌曲', 利: '机廉', 平: '同', 不: '', 陷: '月巨火铃' },
  巳: { 庙: '同昌曲', 旺: '紫日巨', 得: '府相火铃', 利: '', 平: '机武杀破', 不: '', 陷: '廉月贪梁陀' },
  午: { 庙: '紫机相梁破火铃', 旺: '日武府贪巨杀', 得: '', 利: '', 平: '廉', 不: '月', 陷: '同昌曲羊' },
  未: { 庙: '紫武府贪杀羊陀', 旺: '梁破曲', 得: '日相', 利: '廉昌火铃', 平: '', 不: '同月巨', 陷: '机' },
  申: { 庙: '廉巨相杀', 旺: '紫同', 得: '机日武府破昌曲', 利: '月', 平: '贪', 不: '', 陷: '梁陀火铃' },
  酉: { 庙: '巨昌曲', 旺: '紫机府月杀', 得: '梁火铃', 利: '武贪', 平: '日同廉', 不: '', 陷: '相破羊' },
  戌: { 庙: '武府贪梁杀羊陀火铃', 旺: '月破', 得: '紫相', 利: '机廉', 平: '同', 不: '日', 陷: '巨昌曲' },
  亥: { 庙: '同月', 旺: '紫巨曲', 得: '府相', 利: '昌火铃', 平: '机武杀破', 不: '', 陷: '日廉贪梁陀' },
};
const STARS = {
  紫: '紫微', 机: '天机', 日: '太阳', 武: '武曲', 同: '天同', 廉: '廉贞', 府: '天府', 月: '太阴', 贪: '贪狼', 巨: '巨门',
  相: '天相', 梁: '天梁', 杀: '七杀', 破: '破军', 昌: '文昌', 曲: '文曲', 羊: '擎羊', 陀: '陀罗', 火: '火星', 铃: '铃星',
};
const FROM_YIN = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const quanshuOf = (abbr, zhi) => Object.entries(QUANSHU[zhi]).find(([, stars]) => stars.includes(abbr))?.[0] ?? '';

test('星曜庙旺：十四正曜与昌曲羊陀火铃，十二宫全部同《紫微斗数全书》庙旺表', () => {
  let checked = 0;
  Object.entries(STARS).forEach(([abbr, star]) => {
    FROM_YIN.forEach((zhi, index) => {
      const expected = quanshuOf(abbr, zhi);
      const actual = util.getBrightness(star, index);
      // 擎羊不入寅申巳亥、陀罗不入子午卯酉，全书不列，排盘库给空。
      if (!expected) assert.equal(actual, '', `${star}${zhi}`);
      else assert.equal(actual, expected, `${star}${zhi}：全书「${expected}」，程序「${actual}」`);
      checked += 1;
    });
  });
  assert.equal(checked, 240);
});

test('星曜庙旺：改正的三格都在酉宫（太阳平、太阴旺、七杀旺），整行其余与排盘库一致', () => {
  assert.equal(QUANSHU_BRIGHTNESS_FIXES.太阳[7], '平');
  assert.equal(QUANSHU_BRIGHTNESS_FIXES.太阴[7], '旺');
  assert.equal(QUANSHU_BRIGHTNESS_FIXES.七杀[7], '旺');
  Object.values(QUANSHU_BRIGHTNESS_FIXES).forEach((row) => assert.equal(row.length, 12));
});

test('排出的盘：太阴、太阳坐酉宫按全书显示', () => {
  const findStar = (chart, name) => chart.palaces.flatMap((palace) => palace.majorStars.map((star) => ({ star, zhi: palace.earthlyBranch }))).find(({ star }) => star.name === name);
  // 1985-02-10 午时（女）：太阴在酉。
  const moon = findStar(createZiweiHoroscope({ calendarType: 'solar', birthDate: '1985-02-10', timeIndex: 6, gender: 'female' }), '太阴');
  assert.equal(moon.zhi, '酉');
  assert.equal(moon.star.brightness, '旺');
  // 1985-03-10 丑时（女）：太阳在酉。
  const sun = findStar(createZiweiHoroscope({ calendarType: 'solar', birthDate: '1985-03-10', timeIndex: 1, gender: 'female' }), '太阳');
  assert.equal(sun.zhi, '酉');
  assert.equal(sun.star.brightness, '平');
  // 直接调排盘库（导入本模块之后）也一样。
  const direct = findStar(astro.bySolar('1985-02-10', 6, '女', true, 'zh-CN'), '太阴');
  assert.equal(direct.star.brightness, '旺');
});
