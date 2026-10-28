import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateBaziCase, findSolarDateByPillars, useGodElement } from '../scripts/lib/baziCases.mjs';

test('八字命例：按四柱找日子（时柱可缺），找不到或干支不合法时为 null', () => {
  // 乾隆：辛卯 丁酉 庚午 丙子，康熙五十年八月十三日子时
  assert.deepEqual(findSolarDateByPillars(['辛卯', '丁酉', '庚午', '丙子']), { year: 1711, month: 9, day: 25, hourIndex: 0 });
  const noHour = findSolarDateByPillars(['庚午', '辛巳', '乙酉']);
  assert.ok(noHour && noHour.hourIndex === null);
  assert.equal(findSolarDateByPillars(['庚午', '辛巳', '乙酉', '壬丑']), null, '壬丑不是六十甲子');
  assert.equal(findSolarDateByPillars(['甲子', '甲子', '甲子', '甲子']), null, '甲年没有甲子月');
});

test('八字命例：十神或类别换成五行；排盘四柱与命例一致，并给出旺衰、喜用的对照', () => {
  assert.equal(useGodElement('印', '木'), '水');
  assert.equal(useGodElement('七杀', '木'), '金');
  assert.equal(useGodElement('食伤', '火'), '土');
  assert.equal(useGodElement('比劫', '金'), '金');
  assert.equal(useGodElement('偏财', '水'), '火');
  assert.equal(useGodElement('土', '水'), '土');
  const result = evaluateBaziCase({
    id: 'bazi.test.001',
    pillars: ['庚午', '辛巳', '乙酉', '壬午'],
    birth: { calendar: 'unknown', gender: 'male' },
    expected: { strength: '弱', useGod: ['水', '印'] },
  });
  assert.equal(result.pillarsMatch, true);
  assert.equal(result.program.class, '弱');
  assert.equal(result.checks.strength, 'same');
  assert.equal(result.checks.useGod, 'same');
  const unknown = evaluateBaziCase({ id: 'bazi.test.002', pillars: ['甲子', '甲子', '甲子', '甲子'], expected: { strength: '旺' } });
  assert.match(unknown.error, /找不到/);
});
