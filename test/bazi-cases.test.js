import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateBaziCase, findSolarDateByPillars, samePatternFamily, useGodElement, yunVerdictOf } from '../scripts/lib/baziCases.mjs';
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
  // 程序认出从格时，喜用拿「按此格论」的喜忌比（任注此造「用土以从之」）。
  const cong = evaluateBaziCase({
    id: 'bazi.test.003',
    pillars: ['庚戌', '甲申', '甲戌', '乙丑'],
    birth: { calendar: 'unknown', gender: 'male' },
    expected: { strength: '弱', useGod: '土' },
  });
  assert.equal(cong.program.useGodSource, 'special');
  assert.equal(cong.program.class, '弱');
  assert.equal(cong.checks.useGod, 'same');
  assert.equal(cong.program.favorable[0], '木', '扶抑喜忌仍照常给出');
  // 格局按类比：「化气格」对程序的「某某化某格」，从强对专旺；从财不等于从杀。
  assert.ok(samePatternFamily('疑似甲己化土格', '化气格'));
  assert.ok(samePatternFamily('疑似曲直格（专旺）', '从强格'));
  assert.ok(samePatternFamily('疑似从强格', '曲直格'));
  assert.ok(!samePatternFamily('疑似从财格', '从杀格'));
  assert.ok(!samePatternFamily(null, '从杀格'));
  // 化气格的旺衰说的是化神，不比日主旺衰。
  const hua = evaluateBaziCase({ id: 'bazi.test.004', pillars: ['戊辰', '壬戌', '甲辰', '己巳'], expected: { strength: '旺', pattern: '化气格' } });
  assert.equal(hua.checks.pattern, 'same');
  assert.equal(hua.checks.strength, undefined);
  const unknown = evaluateBaziCase({ id: 'bazi.test.002', pillars: ['甲子', '甲子', '甲子', '甲子'], expected: { strength: '旺' } });
  assert.match(unknown.error, /找不到/);
});

test('八字命例的岁运：原书点名的大运、流年按程序喜忌判吉凶，干支各算一票', () => {
  assert.equal(yunVerdictOf('丁卯', ['木', '火', '水'], ['土', '金']), '吉');
  assert.equal(yunVerdictOf('己巳', ['木', '火', '水'], ['土', '金']), '平', '干忌支喜，相抵');
  assert.equal(yunVerdictOf('丑', ['木', '火', '水'], ['土', '金']), '凶', '原书只说「丑运」的只看丑');
  // 任注：「至丁卯运，克去辛金，破其丑土，所谓有病得药……接运丙寅，体用皆宜，仕至黄堂」。
  const good = evaluateBaziCase({
    id: 'bazi.test.005',
    pillars: ['己丑', '辛未', '丙寅', '己丑'],
    expected: { yun: [
      { ganZhi: '丁卯', kind: '大运', verdict: '吉', quote: '至丁卯运，克去辛金，破其丑土' },
      { ganZhi: '丙寅', kind: '大运', verdict: '吉', quote: '接运丙寅，体用皆宜，仕至黄堂' },
    ] },
  });
  assert.deepEqual(good.checks.yun, ['same', 'same']);
  assert.deepEqual(good.yun.map((item) => item.program), ['吉', '吉']);
  // 任注：「初运己巳戊辰，土旺之地，财喜辐辏……交丁卯，土金两伤，连遭回禄三次」——程序按身弱扶抑判，一平一反。
  const mixed = evaluateBaziCase({
    id: 'bazi.test.006',
    pillars: ['己卯', '辛未', '丙子', '辛卯'],
    expected: { yun: [
      { ganZhi: '己巳', kind: '大运', verdict: '吉', quote: '初运己巳戊辰，土旺之地，财喜辐辏' },
      { ganZhi: '丁卯', kind: '大运', verdict: '凶', quote: '交丁卯，土金两伤，连遭回禄三次' },
      { ganZhi: '丙寅', kind: '大运', verdict: '平', quote: '丙寅妻子皆克' },
    ] },
  });
  assert.deepEqual(mixed.checks.yun, ['near', 'reversed'], '原书说平的不比');
  assert.equal(mixed.yun[2].check, null);
});

// 古籍命例（src/data/cases/bazi.json）里写了旺衰、用神的，拿来卡住旺衰与喜用算法的一致率。
// 下限按《滴天髓阐微》任铁樵命造定，留了余量。第五批（六亲论从象、化象、顺局诸篇）并入后：
// 旺衰 87 造一致 71、相反 8（相反的多是「水多木漂」之类，书说弱、程序按印多算旺，取用一样），
// 喜用 103 造一致 68、相反 11；书上点名从、化、专旺的 30 造，程序认出同类 23 造
// （认不出的是假从、顺局「从儿不论身强弱」与化神失令的假化，任注各有特别的理由）。
// 新命例并进来跌破下限时，先用 node scripts/bazi-cases.mjs 看是哪些造、为什么，再决定改算法还是改下限。
const caseEntries = loadDataFiles().cases
  .filter(({ doc }) => doc?.module === 'bazi')
  .flatMap(({ doc }) => doc.entries ?? [])
  .filter((entry) => entry?.expected && Array.isArray(entry.pillars) && !/自检/.test(entry.notes ?? ''));
const strengthCaseCount = caseEntries.filter((entry) => entry.expected.strength).length;

test('古籍命例校准：旺衰与书上大体一致、极少相反；喜用之首与书上用神一致的四成以上；书上点名的特殊格局认出六成以上',
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
    const pattern = tally('pattern');
    const summary = `旺衰 ${JSON.stringify(strength)}，喜用 ${JSON.stringify(useGod)}，格局 ${JSON.stringify(pattern)}`;
    assert.ok((strength.same ?? 0) / total(strength) >= 0.7, summary);
    assert.ok((strength.reversed ?? 0) / total(strength) <= 0.12, summary);
    assert.ok((useGod.same ?? 0) / total(useGod) >= 0.4, summary);
    assert.ok((useGod.reversed ?? 0) / total(useGod) <= 0.25, summary);
    const named = (pattern.same ?? 0) + (pattern.miss ?? 0);
    assert.ok(named === 0 || (pattern.same ?? 0) / named >= 0.6, summary);
  });
