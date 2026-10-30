import test from 'node:test';
import assert from 'node:assert/strict';
import { astro } from 'iztro';
import {
  analyzeZiweiPatterns,
  analyzeZiweiStructures,
  formatZiweiPatternReport,
  ZIWEI_PATTERN_NAMES,
  ZIWEI_PATTERN_RULE_COUNT,
} from '../src/utils/ziweiPatterns.js';

test('本命三奇加会只在生年禄权科齐会命宫三方四正时成立', () => {
  const positive = astro.bySolar('1995-1-1', 0, '女', true, 'zh-CN');
  const negative = astro.bySolar('1998-1-2', 4, '女', true, 'zh-CN');

  const hit = analyzeZiweiPatterns(positive).find((pattern) => pattern.id === 'origin-three-wonders');
  assert.equal(hit?.name, '三奇加会');
  assert.equal(hit?.status, 'established');
  assert.equal(hit?.fortuneLabel, '成');
  assert.equal(hit?.evidence.length, 3);
  assert.match(hit?.evidence.join('\n') || '', /生年化禄/);
  assert.match(hit?.evidence.join('\n') || '', /生年化权/);
  assert.match(hit?.evidence.join('\n') || '', /生年化科/);
  assert.match(hit?.source.rule || '', /不可跨层拼接/);
  assert.equal(
    analyzeZiweiPatterns(negative).some((pattern) => pattern.id === 'origin-three-wonders'),
    false,
  );
});

test('机月同梁同时核对命宫寅申与四星齐会', () => {
  const positive = astro.bySolar('1990-1-4', 11, '女', true, 'zh-CN');
  const negative = astro.bySolar('1998-1-2', 4, '女', true, 'zh-CN');

  const hit = analyzeZiweiPatterns(positive).find((pattern) => pattern.name === '机月同梁格');
  assert.equal(hit?.status, 'established');
  assert.match(hit?.evidence.join('\n') || '', /命宫在[寅申]/);
  assert.match(hit?.evidence.join('\n') || '', /天机/);
  assert.match(hit?.evidence.join('\n') || '', /太阴/);
  assert.match(hit?.evidence.join('\n') || '', /天同/);
  assert.match(hit?.evidence.join('\n') || '', /天梁/);
  assert.equal(analyzeZiweiPatterns(negative).some((pattern) => pattern.name === '机月同梁格'), false);
});

test('七杀朝斗按命宫主星和子午寅申地支共同判定', () => {
  const positive = astro.bySolar('1988-1-6', 4, '女', true, 'zh-CN');
  const hit = analyzeZiweiPatterns(positive).find((pattern) => pattern.name === '七杀朝斗格');

  assert.equal(hit?.status, 'established');
  assert.match(hit?.evidence.join('\n') || '', /七杀/);
  assert.match(hit?.evidence.join('\n') || '', /命宫地支为申/);
});

test('参考命盘不再用自创结构冒充古典格局', () => {
  const chart = astro.bySolar('1998-1-2', 4, '女', true, 'zh-CN');
  const patterns = analyzeZiweiPatterns(chart);
  const structures = analyzeZiweiStructures(chart);

  // 只认《全书》定贫贱局「财与囚仇：武贞同守身命」：武曲守命宫（酉），廉贞守身宫（财帛，巳）。
  assert.deepEqual(patterns.map((item) => item.name), ['财与囚仇格']);
  assert.equal(patterns[0].group, '定贫贱局');
  assert.match(patterns[0].evidence.join('\n'), /武曲.*命宫.*\n.*廉贞.*身宫/);
  assert.deepEqual(structures.map((item) => item.name), ['杀破狼星系']);
  assert.equal(structures[0].category, 'star-system');
  assert.equal(structures[0].status, 'observed');
  assert.match(structures[0].summary, /不等同于古典吉格/);
  assert.match(structures[0].evidence.join('\n'), /七杀.*命宫/);
  assert.match(structures[0].evidence.join('\n'), /破军.*官禄/);
  assert.match(structures[0].evidence.join('\n'), /贪狼.*财帛/);
});

test('《全书》前批注与别卷定义：日出扶桑守官禄亦然、石中隐玉身命皆是、府相朝垣命寅申上格、日月同临是日月同未命安丑、巨机居卯见擎羊破格', () => {
  const named = (date, hour, gender, name) => analyzeZiweiPatterns(astro.bySolar(date, hour, gender, true, 'zh-CN')).find((item) => item.name === name);
  // 日出扶桑：太阳在卯守官禄宫（卷一定贵局「日在卯守命是也，守官禄宫亦然」）。
  const fusang = named('1941-6-11', 7, '男', '日出扶桑格');
  assert.equal(fusang?.group, '定贵局');
  assert.match(fusang.evidence.join('\n'), /太阳.*官禄（卯），守官禄宫/);
  assert.equal(fusang.source.rule, '日出扶桑：日在卯守命是也，守官禄宫亦然。');
  // 石中隐玉：巨门守身宫，身宫在子（卷二论命宫巨门条「身命居子午宫为石中隐玉格」）。
  const shizhong = named('1955-7-24', 5, '女', '石中隐玉格');
  assert.match(shizhong?.evidence.join('\n') ?? '', /巨门守身宫，身宫在子/);
  assert.match(shizhong.source.title, /卷二·论命宫/);
  // 府相朝垣：天府在官禄、天相在财帛；前批注「命寅申……上格，别宫次之」。
  assert.match(named('1968-2-17', 0, '女', '府相朝垣格')?.evidence.join('\n') ?? '', /命在寅，原书注为上格/);
  assert.match(named('1945-8-4', 2, '女', '府相朝垣格')?.evidence.join('\n') ?? '', /命在巳，原书注「别宫次之」/);
  // 日月同临：前批注「日月同未，命安丑，侯伯之材」；日月坐命丑未的不算（原书「日月命身居丑未，三方无吉反为凶」）。
  assert.match(named('1945-6-6', 4, '男', '日月同临格')?.evidence.join('\n') ?? '', /命宫在丑[\s\S]*太阳.*迁移（未）、太阴同宫/);
  assert.equal(named('1940-11-22', 10, '男', '日月同临格'), undefined, '太阳太阴同坐命宫（丑）');
  // 日月并明：前批注「日巳月酉，丑宫命步蟾宫」；日月同在未宫照丑的是日月同临，不是并明。
  const bingming = named('1950-2-1', 0, '男', '日月并明格');
  assert.match(bingming?.evidence.join('\n') ?? '', /命宫地支为丑\n太阳.*官禄（巳）\n太阴.*财帛（酉）/);
  assert.equal(bingming.source.rule, '定贵局「日月并明：见前批注」；前批注：日巳月酉，丑宫命步蟾宫。');
  assert.equal(named('1945-6-6', 4, '男', '日月并明格'), undefined, '日月同宫在未照丑宫命，是日月同临');
  // 巨机居卯：甲年擎羊在卯，前批注「卯宫有擎羊破格」。
  assert.equal(named('1944-3-27', 1, '男', '巨机居卯格'), undefined, '甲申年，擎羊在卯宫');
  // 七杀朝斗：前批注在卷三七杀条下。
  const qisha = named('1988-1-6', 4, '女', '七杀朝斗格');
  assert.equal(qisha?.source.rule, '七杀寅申子午，一生爵禄荣昌。（为七杀朝斗格。）');
  assert.match(qisha.source.title, /卷三·论诸星同垣/);
});

test('严格结果全部带规则来源且禁用未经核验的名称和吉凶标签', () => {
  const charts = [
    astro.bySolar('1995-1-1', 0, '女', true, 'zh-CN'),
    astro.bySolar('1990-1-4', 11, '女', true, 'zh-CN'),
    astro.bySolar('1988-1-6', 4, '女', true, 'zh-CN'),
    astro.bySolar('1998-1-2', 4, '女', true, 'zh-CN'),
  ];
  const results = charts.flatMap((chart) => [
    ...analyzeZiweiPatterns(chart),
    ...analyzeZiweiStructures(chart),
  ]);

  assert.equal(ZIWEI_PATTERN_RULE_COUNT >= 10, true);
  assert.equal(results.every((result) => result.evidence.length > 0), true);
  assert.equal(results.every((result) => /^https:\/\//.test(result.source.url)), true);
  assert.equal(results.every((result) => result.source.rule && result.source.section), true);
  assert.equal(results.some((result) => /武曲七杀同宫|命位无正曜|宽式/.test(result.name)), false);
  assert.equal(results.some((result) => ['吉', '平', '凶'].includes(result.fortuneLabel)), false);
});

test('报告区分经典格局与星系观察，空数据安全', () => {
  const chart = astro.bySolar('1998-1-2', 4, '女', true, 'zh-CN');
  const patterns = analyzeZiweiPatterns(chart);
  const structures = analyzeZiweiStructures(chart);
  const report = formatZiweiPatternReport(patterns, structures);

  assert.match(report, /经典格局（1）/);
  assert.match(report, /财与囚仇格【成立】/);
  assert.match(report, /《紫微斗数全书》卷一·定贫贱局 · 定贫贱局·财与囚仇/);
  assert.match(report, /星系观察/);
  assert.match(report, /杀破狼星系/);
  assert.match(report, /不等同古典吉格/);
  assert.deepEqual(analyzeZiweiPatterns(null), []);
  assert.deepEqual(analyzeZiweiStructures(null), []);
  assert.match(formatZiweiPatternReport([], []), /当前未识别/);
});

test('《紫微斗数全书》卷一定富局、定贵局、定贫贱局：照原书一句判，带原句与分局', () => {
  const cases = [
    ['1966-2-19', 3, '男', '日月夹财格', '定富局', /武曲.*财帛[\s\S]*太阳[\s\S]*太阴/],
    ['2007-12-25', 6, '男', '金灿光辉格', '定富局', /太阳.*命宫（午）[\s\S]*单守/],
    ['1994-4-14', 3, '女', '日月夹命格', '定贵局', /太阳[\s\S]*太阴[\s\S]*不坐旬空[\s\S]*吉星/],
    ['2000-5-21', 10, '男', '君臣庆会格', '定贵局', /左辅、右弼与紫微同守命宫/],
    ['1942-1-19', 11, '女', '坐贵向贵格', '定贵局', /三合来拱/],
    ['1973-4-8', 5, '男', '财禄夹马格', '定富局', /天马在命宫[\s\S]*武曲[\s\S]*化禄/],
    ['1980-11-13', 4, '女', '生不逢时格', '定贫贱局', /廉贞[\s\S]*空亡/],
    ['1978-10-15', 1, '男', '一生孤贫格', '定贫贱局', /破军（陷）在命宫/],
    ['1999-8-2', 1, '女', '两重华盖格', '定贫贱局', /禄存坐命宫[\s\S]*生年化禄[\s\S]*遇地/],
    ['1952-10-23', 2, '女', '君子在野格', '定贫贱局', /擎羊（陷）[\s\S]*铃星（陷）/],
  ];
  for (const [date, hour, gender, name, group, evidence] of cases) {
    const hit = analyzeZiweiPatterns(astro.bySolar(date, hour, gender, true, 'zh-CN')).find((item) => item.name === name);
    assert.ok(hit, `${date} ${hour} ${gender} 应成 ${name}`);
    assert.equal(hit.group, group);
    assert.match(hit.source.title, new RegExp(`《紫微斗数全书》卷一·${group}`));
    assert.match(hit.source.rule, new RegExp(`^${name.replace(/格$/, '')}：`), '规则就是原书那一句');
    assert.match(hit.summary, /《紫微斗数全书》/);
    assert.match(hit.evidence.join('\n'), evidence);
  }
  // 按安星法不可能成立、或原书写「见前批注」的格暂不收。
  ['金舆扶驾格', '财荫夹印格', '财印夹禄格', '荫印拱身格', '文星暗拱格', '马头带剑格'].forEach((name) => assert.ok(!ZIWEI_PATTERN_NAMES.includes(name), name));
  // 马头带剑「谓马有刃」：天马只在寅申巳亥，擎羊在禄存前一位、不入寅申巳亥，十个年干排下来两星从不同宫。
  const siMa = new Set(['寅', '申', '巳', '亥']);
  for (let year = 1984; year < 1994; year += 1) {
    const chart = astro.bySolar(`${year}-6-15`, 6, '男', true, 'zh-CN');
    const branchOf = (name) => chart.palaces.find((palace) => palace.minorStars.some((star) => star.name === name))?.earthlyBranch;
    assert.ok(siMa.has(branchOf('天马')), `${year} 天马在${branchOf('天马')}`);
    assert.ok(!siMa.has(branchOf('擎羊')), `${year} 擎羊在${branchOf('擎羊')}`);
  }
});
