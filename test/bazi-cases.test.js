import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateBaziCase, findSolarDateByPillars, useGodElement } from '../scripts/lib/baziCases.mjs';
import { loadDataFiles } from '../scripts/lib/dataFiles.mjs';

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

// 古籍命例（src/data/cases/bazi.json）里写了旺衰、用神的，拿来卡住旺衰与喜用算法的一致率。
// 下限按《滴天髓阐微》任铁樵命造定（旺衰 45 造一致 37、相反 1；用神 49 造一致 26、相反 7），留了余量。
// 新命例并进来跌破下限时，先用 node scripts/bazi-cases.mjs 看是哪些造、为什么，再决定改算法还是改下限。
const caseEntries = loadDataFiles().cases
  .filter(({ doc }) => doc?.module === 'bazi')
  .flatMap(({ doc }) => doc.entries ?? [])
  .filter((entry) => entry?.expected && Array.isArray(entry.pillars) && !/自检/.test(entry.notes ?? ''));
const strengthCaseCount = caseEntries.filter((entry) => entry.expected.strength).length;

test('古籍命例校准：旺衰与书上大体一致、极少相反；喜用之首与书上用神一致的四成以上',
  { skip: strengthCaseCount < 40 ? `写了旺衰的命例只有 ${strengthCaseCount} 条，等《滴天髓阐微》命例并入后再跑` : false },
  () => {
    const results = caseEntries.map(evaluateBaziCase);
    assert.deepEqual(results.filter((result) => result.error).map(({ id }) => id), []);
    const tally = (key) => results.reduce((acc, { checks }) => {
      if (checks?.[key]) acc[checks[key]] = (acc[checks[key]] ?? 0) + 1;
      return acc;
    }, {});
    const total = (counts) => Object.values(counts).reduce((sum, value) => sum + value, 0);
    const strength = tally('strength');
    const useGod = tally('useGod');
    const summary = `旺衰 ${JSON.stringify(strength)}，喜用 ${JSON.stringify(useGod)}`;
    assert.ok((strength.same ?? 0) / total(strength) >= 0.7, summary);
    assert.ok((strength.reversed ?? 0) / total(strength) <= 0.1, summary);
    assert.ok((useGod.same ?? 0) / total(useGod) >= 0.4, summary);
    assert.ok((useGod.reversed ?? 0) / total(useGod) <= 0.25, summary);
  });
