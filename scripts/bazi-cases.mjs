/**
 * 八字命例回归：拿古籍命例（src/data/cases/ 里 module 为 bazi、写了 expected 的）对照程序的旺衰、格局、喜用。
 *
 *   node scripts/bazi-cases.mjs          # 汇总，列出不一致的
 *   node scripts/bazi-cases.mjs --all    # 每一例都列
 *
 * 对照口径：
 * - 旺衰：程序的「偏强 / 极强」算旺，「偏弱 / 极弱」算弱；认出从格时从强、专旺算旺，其余从格算弱。
 *   一致记 same；一边中和、一边旺或弱记 near；旺弱相反记 reversed。
 * - 格局：命例写了从格、化格、专旺而程序认出同一类的记 same（「化气格」对程序的「某某化某格」，从强对专旺），
 *   没认出记 miss；命例没写而程序认出了记 extra。化气格的旺衰说的是化神，不比日主旺衰。
 * - 喜用：命例的用神（五行或十神，换算成五行）是程序喜用第一位记 same，在前两位记 near，
 *   是程序的忌神记 reversed，其余 miss。程序认出从格、化格、专旺时，拿「按此格论」的喜忌比，否则拿扶抑喜忌比。
 * - 岁运：命例 expected.yun 里原书说吉、凶的大运、流年，程序按同一套喜忌把干支各算一票（只写一个字的只看这个字），
 *   与原书同记 same，程序判平记 near，相反记 reversed；原书说平的不比。
 * 调权重时用它看逐条差异；一致率的下限写在 test/bazi-cases.test.js 里（命例够 40 条才跑）。
 */
import process from 'node:process';

import { loadDataFiles } from './lib/dataFiles.mjs';
import { evaluateBaziCase } from './lib/baziCases.mjs';

const showAll = process.argv.includes('--all');
const files = loadDataFiles();
const entries = files.cases
  .filter(({ doc }) => doc?.module === 'bazi')
  .flatMap(({ doc }) => doc.entries ?? [])
  .filter((entry) => entry?.expected && Array.isArray(entry.pillars) && !/自检/.test(entry.notes ?? ''));

const results = entries.map(evaluateBaziCase);
const tally = { strength: {}, pattern: {}, useGod: {}, yun: {} };
results.forEach((result) => {
  Object.entries(result.checks ?? {}).forEach(([key, value]) => {
    [].concat(value).forEach((item) => { tally[key][item] = (tally[key][item] ?? 0) + 1; });
  });
});

const fmt = (counts) => Object.entries(counts).map(([key, value]) => `${key} ${value}`).join('，') || '（无）';
console.log(`八字命例 ${entries.length} 条（写了 expected、四柱未标自检）`);
console.log(`旺衰：${fmt(tally.strength)}`);
console.log(`格局：${fmt(tally.pattern)}`);
console.log(`喜用：${fmt(tally.useGod)}`);
console.log(`岁运：${fmt(tally.yun)}`);

const errors = results.filter((result) => result.error);
if (errors.length) {
  console.log(`\n排不出盘的 ${errors.length} 条：`);
  errors.forEach((result) => console.log(`  ${result.id} ${result.pillars.join(' ')}：${result.error}`));
}
const mismatched = results.filter((result) => !result.error && !result.pillarsMatch);
if (mismatched.length) {
  console.log(`\n排出的四柱与命例不同的 ${mismatched.length} 条（多半是节气交界，检查找日子的逻辑）：`);
  mismatched.forEach((result) => console.log(`  ${result.id} 命例 ${result.pillars.join(' ')} / 程序 ${result.chartPillars.join(' ')}`));
}

const isMiss = (checks) => Object.values(checks).flat().some((value) => value === 'reversed' || value === 'miss' || value === 'extra');
const listed = results.filter((result) => !result.error && (showAll || isMiss(result.checks)));
if (listed.length) {
  console.log(showAll ? '\n逐条：' : '\n不一致的：');
  listed.forEach(({ id, pillars, expected, program, checks, yun }) => {
    const exp = [expected.strength && `旺衰${expected.strength}`, expected.pattern, expected.useGod && `用${[].concat(expected.useGod).join('')}`].filter(Boolean).join(' ');
    const gods = program.useGodSource === 'special'
      ? `按此格喜${program.specialFavorable.join('')} 忌${program.specialUnfavorable.join('')}（扶抑喜${program.favorable.join('')}）`
      : `喜${program.favorable.join('')} 忌${program.unfavorable.join('')}`;
    const got = [`${program.band}(${program.score} 分)`, program.special, gods].filter(Boolean).join(' ');
    const yunText = yun.filter((item) => item.check && item.check !== 'same').map((item) => `${item.ganZhi}${item.kind === '流年' ? '年' : '运'}书${item.verdict}程序${item.program}`).join('、');
    console.log(`  ${id} ${pillars.join(' ')}｜书：${exp}｜程序：${got}｜${Object.entries(checks).filter(([key]) => key !== 'yun').map(([key, value]) => `${key}:${value}`).join(' ')}${yunText ? ` 岁运:${yunText}` : ''}`);
  });
}
