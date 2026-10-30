import test from 'node:test';
import assert from 'node:assert/strict';

import { loadDataFiles } from '../scripts/lib/dataFiles.mjs';
import {
  BAZI_LIUQIN, baziContextOf, baziGlossarySeeds, baziLiuqinHits, buildGlossary, buildLibrary, conditionMatches, entriesOfClassic, entryById, liuyaoContextOf, lookupTerm, matchEntries,
  patternNamesOf, pickLimitHits, searchGlossary, termsIn, ziweiBorrowedStarsOf, ziweiContextOf, ziweiGlossarySeeds, ziweiLifePalaceHits, ziweiLimitPalaceHits, ziweiMeetStarsOf, ziweiNeighborsOf,
  ziweiOppositeOf, ziweiPalaceContextOf, ziweiPalaceHits, ziweiSurroundOf,
} from '../src/data/classics/library.js';
import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';
import { findRelations } from '../src/utils/baziRelations.js';
import { validateClassicsDoc } from '../src/data/classics/schema.js';

const files = loadDataFiles();
const library = buildLibrary(files.classics);
const glossary = buildGlossary(files.glossary);

const chartOf = (year, month, day, hourIndex, gender = 'male') => {
  const chart = buildBaziChart({ calendarType: 'solar', year, month, day, gender, hourIndex });
  const strength = analyzeStrength(chart);
  const judge = judgeBaziPattern(chart, strength);
  const relations = findRelations(chart.pillars.map((pillar) => ({ key: pillar.key, label: pillar.name, gan: pillar.gan, zhi: pillar.zhi })));
  return { chart, strength, judge, relations };
};

test('仓库数据能合成索引：每条带书名、篇名、出处，按书统计状态', () => {
  assert.ok(library.total >= 6);
  assert.ok(library.books['子平真诠'].total >= 4);
  assert.equal(library.books['子平真诠'].classic, 'ziping');
  const entry = entryById(library, 'ziping.chengbai.001');
  assert.equal(entry.book, '子平真诠');
  assert.equal(entry.section, '论用神成败救应');
  assert.equal(entry.source, '《子平真诠》·论用神成败救应');
  assert.ok(entry.file.endsWith('ziping-chengbai.json'));
  const sanming = entriesOfClassic(library, 'sanming');
  assert.ok(sanming.some((item) => item.applies.some((cond) => cond.shensha === '天乙贵人')));
  assert.ok(sanming.every((item) => item.classic === 'sanming'));
  assert.equal(entryById(library, 'nope'), null);
});

test('八字上下文：日干、月令、十神（透干 + 藏干）、神煞、格名同义展开、季节、合冲刑害、性别', () => {
  const { chart, strength, judge, relations } = chartOf(1960, 6, 2, 1);
  const ctx = baziContextOf({ chart, strength, judge, relations });
  assert.equal(ctx.module, 'bazi');
  assert.equal(ctx.dayGan, '辛');
  assert.equal(ctx.monthZhi, '巳');
  assert.ok(ctx.tenGod.includes('正官') && ctx.tenGod.includes('比肩') && ctx.tenGod.includes('偏印'));
  assert.deepEqual(ctx.transparent.sort(), ['劫财', '比肩', '偏印'].sort());
  assert.ok(ctx.shensha.includes('天德贵人'));
  assert.deepEqual(ctx.pattern, ['正官格']);
  assert.deepEqual(ctx.season, ['夏']);
  assert.equal(ctx.strength, strength.band);
  assert.ok(ctx.relation.includes('合') || ctx.relation.includes('半合') || ctx.relation.includes('三合'));
  assert.equal(ctx.gender, '男');

  const leap = chartOf(2023, 4, 10, 6, 'female');
  const leapCtx = baziContextOf(leap);
  assert.equal(leapCtx.gender, '女');
  assert.ok(leapCtx.season.includes('春') && leapCtx.season.includes('四季'), leapCtx.season.join());
  assert.ok(leapCtx.pattern.includes('杂气正财格') && leapCtx.pattern.includes('正财格') && leapCtx.pattern.includes('财格'));
});

test('格名同义展开', () => {
  assert.deepEqual(patternNamesOf('偏财格'), ['偏财格', '财格']);
  assert.deepEqual(patternNamesOf('杂气正印格'), ['杂气正印格', '正印格', '印格', '印绶格']);
  assert.deepEqual(patternNamesOf('羊刃格'), ['羊刃格', '阳刃格', '刃格']);
  assert.deepEqual(patternNamesOf('建禄格'), ['建禄格', '建禄月劫', '禄劫格']);
  assert.deepEqual(patternNamesOf('疑似从杀格'), ['疑似从杀格', '从杀格', '从格', '从煞格', '从官杀格']);
  assert.deepEqual(patternNamesOf(null), []);
});

test('真实命盘能从仓库数据里匹配到条目：正官格命中《子平真诠》成败两段，乾隆命中《三命通会》论天乙贵人', () => {
  const guan = baziContextOf(chartOf(1960, 6, 2, 1));
  const hits = matchEntries(library, guan);
  const ids = hits.map(({ entry }) => entry.id);
  assert.ok(ids.includes('ziping.chengbai.001') && ids.includes('ziping.chengbai.002'), ids.join());
  const isTianYi = (id) => id.startsWith('sanming.shensha.tianyi.');
  assert.ok(ids.some(isTianYi), '时柱丑为年干庚的天乙贵人');
  const noTianYi = matchEntries(library, { module: 'bazi', shensha: ['文昌贵人'] }).map(({ entry }) => entry.id);
  assert.ok(!noTianYi.some(isTianYi));
  const first = hits.find(({ entry }) => entry.id === 'ziping.chengbai.001');
  assert.equal(first.reason, '格局·正官格');
  assert.deepEqual(first.matched, [{ key: 'pattern', value: '正官格' }]);

  const qianlong = baziContextOf(chartOf(1711, 9, 25, 0));
  assert.ok(qianlong.shensha.includes('天乙贵人'));
  const qianlongIds = matchEntries(library, qianlong).map(({ entry }) => entry.id);
  assert.ok(qianlongIds.some(isTianYi));
  assert.ok(qianlongIds.includes('ziping.chengbai.001'), '羊刃格也在成败两段的适用范围里');

  // 支线还在陆续录入，这里只断言「该命中的在、不该命中的不在」，不锁死条目总数。
  const ziweiIds = matchEntries(library, ziweiContextOf({ stars: ['紫微'] })).map(({ entry }) => entry.id);
  assert.ok(ziweiIds.includes('ziwei.quanshu.zhuxing.001'), ziweiIds.join());
  const tianjiIds = matchEntries(library, ziweiContextOf({ stars: ['天机'] })).map(({ entry }) => entry.id);
  assert.ok(!tianjiIds.includes('ziwei.quanshu.zhuxing.001'), '紫微星的条目不会因为天机命中');
  assert.deepEqual(matchEntries(library, ziweiContextOf({ stars: ['不存在的星'] })), []);
});

test('匹配规则：任一条件命中、键内任一取值、复数键、只写 note 不命中、模块不符不命中、宫位别名、上下文缺键不猜', () => {
  const docs = [{
    classic: 'ziwei',
    section: '测试',
    edition: '测试',
    entries: [
      { id: 'ziwei.t.001', title: '紫微在午', original: '甲', status: 'draft', applies: [{ module: 'ziwei', stars: ['紫微', '天府'], palace: '事业' }] },
      { id: 'ziwei.t.002', title: '只有说明', original: '乙', status: 'draft', applies: [{ module: 'ziwei', note: '编不出条件' }] },
      { id: 'ziwei.t.003', title: '多条件', original: '丙', status: 'draft', applies: [{ module: 'bazi', pattern: '正官格' }, { module: 'ziwei', star: '天机' }] },
      { id: 'ziwei.t.004', title: '庙旺', original: '丁', status: 'draft', applies: [{ module: 'ziwei', star: '紫微', brightness: ['庙', '旺'] }] },
    ],
  }];
  const lib = buildLibrary(docs);
  assert.deepEqual(matchEntries(lib, ziweiContextOf({ stars: ['天府'], palace: '官禄' })).map(({ entry }) => entry.id), ['ziwei.t.001']);
  assert.deepEqual(matchEntries(lib, ziweiContextOf({ stars: ['天府'], palace: '夫妻' })), []);
  assert.deepEqual(matchEntries(lib, ziweiContextOf({ stars: ['天府'] })), [], '上下文没有宫位时，带宫位的条件不算满足');
  assert.deepEqual(matchEntries(lib, ziweiContextOf({ stars: ['天机'] })).map(({ entry }) => entry.id), ['ziwei.t.003']);
  assert.deepEqual(matchEntries(lib, { module: 'bazi', pattern: ['正官格'] }).map(({ entry }) => entry.id), ['ziwei.t.003']);
  assert.deepEqual(matchEntries(lib, ziweiContextOf({ stars: ['紫微'], brightness: ['平'] })), []);
  assert.deepEqual(matchEntries(lib, ziweiContextOf({ stars: ['紫微'], brightness: ['旺'] })).map(({ entry }) => entry.id), ['ziwei.t.004']);
  assert.equal(conditionMatches({ module: 'ziwei', note: 'x' }, ziweiContextOf({ stars: ['紫微'] })), null);
  assert.equal(conditionMatches({ module: 'ziwei', star: '紫微' }, { module: 'bazi', star: ['紫微'] }), null);
  assert.deepEqual(conditionMatches({ module: 'ziwei', palace: '交友' }, ziweiContextOf({ palace: '仆役' })), [{ key: 'palace', value: '仆役' }]);
});

test('紫微 allStars：几颗星都要在同一宫才算（同宫、同守），星越多越专门', () => {
  const lib = buildLibrary([{
    classic: 'ziwei', section: '测试', edition: '测试',
    entries: [
      { id: 'ziwei.t.101', title: '紫府同宫', original: '甲', status: 'draft', applies: [{ module: 'ziwei', palace: '命宫', allStars: ['紫微', '天府'] }] },
      { id: 'ziwei.t.102', title: '紫微或天府', original: '乙', status: 'draft', applies: [{ module: 'ziwei', palace: '命宫', stars: ['紫微', '天府'] }] },
    ],
  }]);
  const ids = (stars) => matchEntries(lib, ziweiContextOf({ stars, palace: '命宫' })).map(({ entry }) => entry.id);
  assert.deepEqual(ids(['紫微']), ['ziwei.t.102'], '只有紫微：allStars 不算，任一颗的算');
  assert.deepEqual(ids(['紫微', '天府', '左辅']), ['ziwei.t.101', 'ziwei.t.102'], '两颗都在：同宫的条目更专门，排在前面');
  assert.deepEqual(conditionMatches({ module: 'ziwei', allStars: ['紫微', '天府'] }, ziweiContextOf({ stars: ['天府', '紫微'] })), [{ key: 'star', value: '紫微、天府' }]);
  assert.equal(conditionMatches({ module: 'ziwei', allStars: ['紫微', '天府'] }, ziweiContextOf({ stars: ['天府'] })), null);
  // 校验：allStars 要两颗以上不同的星。
  const doc = (cond) => ({ classic: 'ziwei', section: '测试', edition: '测试', entries: [{ id: 'ziwei.t.201', title: '测试', original: '甲', status: 'draft', applies: [{ module: 'ziwei', ...cond }] }] });
  assert.deepEqual(validateClassicsDoc(doc({ allStars: ['武曲', '贪狼'] })), []);
  assert.match(validateClassicsDoc(doc({ allStars: ['武曲'] })).join('\n'), /allStars: 要写两颗以上不同的星/);
  assert.match(validateClassicsDoc(doc({ allStars: '武曲' })).join('\n'), /allStars: 要写两颗以上不同的星/);
  assert.match(validateClassicsDoc(doc({ allStars: ['武曲', '武曲'] })).join('\n'), /allStars: 要写两颗以上不同的星/);
});

test('紫微 jia：两颗星（或四化）分坐左右两邻才算「夹」，哪边是哪颗不论', () => {
  const palaceOf = (index, names, mutagens = {}) => ({
    index, name: `宫${index}`, earthlyBranch: '子', minorStars: [], adjectiveStars: [],
    majorStars: names.map((name) => ({ name, mutagen: mutagens[name] ?? null })),
  });
  const palaces = [
    palaceOf(0, ['文曲']), palaceOf(1, ['天机'], { 天机: '忌' }), palaceOf(2, ['文昌', '太阴'], { 太阴: '禄' }),
    ...Array.from({ length: 9 }, (_, i) => palaceOf(i + 3, [])),
  ];
  const ctx = ziweiPalaceContextOf(palaces[1], { neighbors: ziweiNeighborsOf(palaces, palaces[1]) });
  assert.deepEqual(conditionMatches({ module: 'ziwei', jia: ['文昌', '文曲'] }, ctx), [{ key: 'jia', value: '文昌、文曲' }]);
  assert.deepEqual(conditionMatches({ module: 'ziwei', jia: ['文曲', '文昌'] }, ctx), [{ key: 'jia', value: '文曲、文昌' }]);
  // 四化写成「化禄」；「羊陀夹忌」这类再加本宫的四化。
  assert.deepEqual(conditionMatches({ module: 'ziwei', jia: ['化禄', '文曲'], mutagen: '忌' }, ctx), [{ key: 'jia', value: '化禄、文曲' }, { key: 'mutagen', value: '忌' }]);
  // 两颗都在同一边不算夹；不传两邻就不判夹。
  assert.equal(conditionMatches({ module: 'ziwei', jia: ['文昌', '太阴'] }, ctx), null);
  assert.equal(conditionMatches({ module: 'ziwei', jia: ['文昌', '文曲'] }, ziweiPalaceContextOf(palaces[1])), null);
  // 十二宫首尾相接：0 宫的左邻是 11 宫。
  assert.deepEqual(ziweiNeighborsOf(palaces, palaces[0]).map(({ index }) => index), [11, 1]);
  // 校验：jia 写两个名字，四化写「化禄」等。
  const doc = (cond) => ({ classic: 'ziwei', section: '测试', edition: '测试', entries: [{ id: 'ziwei.t.301', title: '测试', original: '甲', status: 'draft', applies: [{ module: 'ziwei', ...cond }] }] });
  assert.deepEqual(validateClassicsDoc(doc({ palace: '命宫', jia: ['文昌', '文曲'] })), []);
  assert.deepEqual(validateClassicsDoc(doc({ palace: '命宫', jia: ['化权', '化禄'] })), []);
  assert.match(validateClassicsDoc(doc({ jia: ['文昌'] })).join('\n'), /jia: 要写左右两邻各一颗/);
  assert.match(validateClassicsDoc(doc({ jia: ['文昌', '禄'] })).join('\n'), /jia: 「禄」不在允许范围/);
});

test('相关度排序：专讲这颗星的条目在前，只按宫位命中的、一口气列很多星的往后；挂了很多并列条件的通论排在专论后面', () => {
  const lib = buildLibrary([{
    classic: 'ziwei', section: '测试', edition: '测试',
    entries: [
      { id: 'ziwei.r.001', title: '命宫总论', original: '甲', status: 'translated', applies: [{ module: 'ziwei', palace: '命宫' }] },
      { id: 'ziwei.r.002', title: '诸星', original: '乙', status: 'translated', applies: [{ module: 'ziwei', stars: ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府'] }] },
      { id: 'ziwei.r.003', title: '紫微', original: '丙', status: 'translated', applies: [{ module: 'ziwei', star: '紫微' }] },
      { id: 'ziwei.r.004', title: '女命紫微', original: '丁', status: 'translated', applies: [{ module: 'ziwei', star: '紫微', gender: '女' }] },
    ],
  }]);
  const ctxOf = (gender) => ziweiContextOf({ stars: ['紫微', '七杀'], palace: '命宫', gender });
  assert.deepEqual(matchEntries(lib, ctxOf('男')).map(({ entry }) => entry.id), ['ziwei.r.003', 'ziwei.r.001', 'ziwei.r.002']);
  assert.deepEqual(matchEntries(lib, ctxOf('女')).map(({ entry }) => entry.id), ['ziwei.r.004', 'ziwei.r.003', 'ziwei.r.001', 'ziwei.r.002']);

  const bazi = buildLibrary([{
    classic: 'ziping', section: '测试', edition: '测试',
    entries: [
      { id: 'ziping.r.001', title: '通论', original: '甲', status: 'reviewed', applies: ['正官格', '七杀格', '正财格', '偏财格', '正印格', '偏印格', '食神格', '伤官格'].map((pattern) => ({ module: 'bazi', pattern })) },
      { id: 'ziping.r.002', title: '论正官', original: '乙', status: 'draft', applies: [{ module: 'bazi', pattern: '正官格' }] },
      { id: 'ziping.r.003', title: '十神', original: '丙', status: 'reviewed', applies: [{ module: 'bazi', tenGods: ['正官', '七杀', '正财', '偏财', '正印', '偏印'] }] },
    ],
  }]);
  const ranked = matchEntries(bazi, { module: 'bazi', pattern: ['正官格'], tenGod: ['正官', '正财'] });
  assert.deepEqual(ranked.map(({ entry }) => entry.id), ['ziping.r.002', 'ziping.r.001', 'ziping.r.003']);
  assert.ok(ranked.every((hit, index) => index === 0 || ranked[index - 1].score >= hit.score));
});

test('相关度相近时各书各篇轮流排：一篇几首诗诀不占满前几条，同篇之内次序不变', () => {
  const official = (id, title, section, original) => ({ id, title, section, original, status: 'translated', applies: [{ module: 'bazi', pattern: '正官格' }] });
  const lib = buildLibrary([
    {
      classic: 'yuanhai', section: '正官诗诀、正官论', edition: '测试',
      entries: [
        official('yuanhai.t.001', '正官诗诀·其一', '正官诗诀', '甲'),
        official('yuanhai.t.002', '正官诗诀·其二', '正官诗诀', '乙'),
        official('yuanhai.t.003', '正官诗诀·其三', '正官诗诀', '丙'),
        official('yuanhai.t.004', '正官论·其一', '正官论', '丁'),
      ],
    },
    {
      classic: 'ziping', section: '论正官', edition: '测试',
      entries: [official('ziping.t.001', '论正官·其一', '论正官', '戊'), official('ziping.t.002', '论正官·其二', '论正官', '己')],
    },
  ]);
  const ctx = { module: 'bazi', pattern: ['正官格'] };
  const ids = matchEntries(lib, ctx).map(({ entry }) => entry.id);
  assert.deepEqual(ids, ['yuanhai.t.001', 'ziping.t.001', 'yuanhai.t.004', 'ziping.t.002', 'yuanhai.t.002', 'yuanhai.t.003']);
  assert.deepEqual(matchEntries(lib, ctx, { limit: 3 }).map(({ entry }) => entry.id), ids.slice(0, 3));
  // 分数差得多的照旧：专论在前，挂一串格局的通论在后
  const withGeneral = buildLibrary([{
    classic: 'ziping', section: '论正官、论成败', edition: '测试',
    entries: [
      { id: 'ziping.g.001', title: '何谓成', section: '论成败', original: '庚', status: 'translated', applies: ['正官格', '七杀格', '正财格', '偏财格', '正印格', '偏印格', '食神格', '伤官格'].map((pattern) => ({ module: 'bazi', pattern })) },
      official('ziping.g.002', '论正官·其一', '论正官', '辛'),
      official('ziping.g.003', '论正官·其二', '论正官', '壬'),
    ],
  }]);
  assert.deepEqual(matchEntries(withGeneral, ctx).map(({ entry }) => entry.id), ['ziping.g.002', 'ziping.g.003', 'ziping.g.001']);
});

test('紫微：从排盘结果的一个宫生成上下文（主辅杂曜都算，身宫同宫时命宫身宫都给，四化去掉「化」字）', () => {
  const palace = {
    name: '命宫', earthlyBranch: '亥', isBodyPalace: true,
    majorStars: [{ name: '紫微', brightness: '旺', mutagen: '' }, { name: '七杀', brightness: '平', mutagen: '化权' }],
    minorStars: [{ name: '文曲', brightness: '', mutagen: '忌' }],
    adjectiveStars: [{ name: '天巫' }, { name: '天官' }],
  };
  const ctx = ziweiPalaceContextOf(palace, { gender: 'female' });
  assert.deepEqual(ctx, {
    module: 'ziwei', star: ['紫微', '七杀', '文曲', '天巫', '天官'], jia: [], meet: ['紫微', '七杀', '文曲', '天巫', '天官'], palace: ['命宫', '身宫'], branches: ['亥'],
    brightness: ['旺', '平'], mutagen: ['权', '忌'], pattern: [], limit: '本命', gender: '女', borrowedStars: [], empty: [],
  });
  assert.deepEqual(ziweiPalaceContextOf({ name: '交友', earthlyBranch: '辰', majorStars: [] }, { gender: '男' }).palace, ['仆役']);
  assert.equal(ziweiPalaceContextOf(null), null);

  const lib = buildLibrary([{
    classic: 'ziwei', section: '测试', edition: '测试',
    entries: [
      { id: 'ziwei.p.001', title: '紫微守命', original: '甲', status: 'draft', applies: [{ module: 'ziwei', star: '紫微', palace: '命宫' }] },
      { id: 'ziwei.p.002', title: '紫微守身', original: '乙', status: 'draft', applies: [{ module: 'ziwei', star: '紫微', palace: '身宫' }] },
      { id: 'ziwei.p.003', title: '女命文曲化忌', original: '丙', status: 'draft', applies: [{ module: 'ziwei', star: '文曲', mutagen: '忌', gender: '女' }] },
      { id: 'ziwei.p.004', title: '紫微在午', original: '丁', status: 'draft', applies: [{ module: 'ziwei', star: '紫微', branches: '午' }] },
    ],
  }]);
  // 文曲化忌那条命中三个键，排最前；命宫、身宫两条各命中两个键，按 id 排。
  assert.deepEqual(matchEntries(lib, ctx).map(({ entry }) => entry.id), ['ziwei.p.003', 'ziwei.p.001', 'ziwei.p.002']);
  assert.deepEqual(matchEntries(lib, ziweiPalaceContextOf({ ...palace, isBodyPalace: false })).map(({ entry }) => entry.id), ['ziwei.p.001']);
});

test('紫微提示词用：命宫与身宫星曜的命中去重合并（身宫同宫只算一次），按相关度排序', () => {
  const lib = buildLibrary([{
    classic: 'ziwei', section: '测试', edition: '测试',
    entries: [
      { id: 'ziwei.l.001', title: '紫微', original: '甲', status: 'translated', applies: [{ module: 'ziwei', star: '紫微' }] },
      { id: 'ziwei.l.002', title: '天机', original: '乙', status: 'translated', applies: [{ module: 'ziwei', star: '天机' }] },
      { id: 'ziwei.l.003', title: '紫微守身', original: '丙', status: 'reviewed', applies: [{ module: 'ziwei', star: '紫微', palace: '身宫' }] },
      { id: 'ziwei.l.004', title: '左辅', original: '丁', status: 'translated', applies: [{ module: 'ziwei', star: '左辅' }] },
    ],
  }]);
  const ming = { index: 9, name: '命宫', earthlyBranch: '亥', isBodyPalace: false, majorStars: [{ name: '紫微' }], minorStars: [{ name: '左辅' }] };
  const shen = { index: 3, name: '迁移', earthlyBranch: '巳', isBodyPalace: true, majorStars: [{ name: '天机' }], minorStars: [] };
  const other = { index: 0, name: '田宅', earthlyBranch: '寅', majorStars: [{ name: '紫微' }] };
  // 命宫紫微、左辅 + 身宫天机；身宫紫微那条不命中（身宫里没有紫微）。
  assert.deepEqual(ziweiLifePalaceHits(lib, [other, shen, ming]).map(({ entry }) => entry.id), ['ziwei.l.001', 'ziwei.l.002', 'ziwei.l.004']);
  // 身宫与命宫同宫：命中带宫位条件的「紫微守身」，排最前（两键），且不重复。
  const same = { ...ming, isBodyPalace: true };
  assert.deepEqual(ziweiLifePalaceHits(lib, [other, same]).map(({ entry }) => entry.id), ['ziwei.l.003', 'ziwei.l.001', 'ziwei.l.004']);
  assert.deepEqual(ziweiLifePalaceHits(lib, []), []);
  assert.deepEqual(ziweiLifePalaceHits(null, [ming]), []);
});

test('紫微提示词用：按宫名取几个宫的命中（夫妻、福德……），别名「夫妻宫」也认，身宫与命宫同宫只算一次', () => {
  const lib = buildLibrary([{
    classic: 'ziwei', section: '测试', edition: '测试',
    entries: [
      { id: 'ziwei.p.001', title: '天相守夫妻', original: '甲', status: 'translated', applies: [{ module: 'ziwei', star: '天相', palace: '夫妻' }] },
      { id: 'ziwei.p.002', title: '天相', original: '乙', status: 'translated', applies: [{ module: 'ziwei', star: '天相' }] },
      { id: 'ziwei.p.003', title: '紫微守福德', original: '丙', status: 'translated', applies: [{ module: 'ziwei', star: '紫微', palace: '福德' }] },
      { id: 'ziwei.p.004', title: '天机', original: '丁', status: 'translated', applies: [{ module: 'ziwei', star: '天机' }] },
    ],
  }]);
  const ming = { index: 0, name: '命宫', earthlyBranch: '寅', isBodyPalace: true, majorStars: [{ name: '天机' }] };
  const fuqi = { index: 10, name: '夫妻', earthlyBranch: '子', majorStars: [{ name: '天相' }] };
  const fude = { index: 2, name: '福德', earthlyBranch: '辰', majorStars: [{ name: '紫微' }] };
  const palaces = [ming, fuqi, fude];
  // 夫妻宫：带宫位条件的「天相守夫妻」排前，泛论天相的也命中；福德宫的紫微不算进来。
  assert.deepEqual(ziweiPalaceHits(lib, palaces, ['夫妻']).map(({ entry }) => entry.id), ['ziwei.p.001', 'ziwei.p.002']);
  assert.deepEqual(ziweiPalaceHits(lib, palaces, ['夫妻宫']).map(({ entry }) => entry.id), ['ziwei.p.001', 'ziwei.p.002']);
  assert.deepEqual(ziweiPalaceHits(lib, palaces, ['福德']).map(({ entry }) => entry.id), ['ziwei.p.003']);
  // 命宫与身宫同宫：只算一次，不重复。
  assert.deepEqual(ziweiPalaceHits(lib, palaces, ['命宫', '身宫']).map(({ entry }) => entry.id), ['ziwei.p.004']);
  assert.deepEqual(ziweiPalaceHits(lib, palaces, ['田宅']), []);
  assert.deepEqual(ziweiPalaceHits(lib, palaces, null), []);
});

test('紫微提示词用：大限、流年命宫所落的本命宫，按宫中星曜加专讲该运限的条目取命中', () => {
  const lib = buildLibrary([{
    classic: 'ziwei', section: '测试', edition: '测试',
    entries: [
      { id: 'ziwei.x.001', title: '大限通论', original: '甲', status: 'translated', applies: [{ module: 'ziwei', limit: '大限' }] },
      { id: 'ziwei.x.002', title: '流年太岁', original: '乙', status: 'translated', applies: [{ module: 'ziwei', limit: '流年', palace: '命宫' }] },
      { id: 'ziwei.x.003', title: '七杀', original: '丙', status: 'translated', applies: [{ module: 'ziwei', star: '七杀' }] },
      { id: 'ziwei.x.004', title: '大限逢七杀', original: '丁', status: 'translated', applies: [{ module: 'ziwei', limit: '大限', star: '七杀' }] },
    ],
  }]);
  const ming = { index: 0, name: '命宫', earthlyBranch: '寅', majorStars: [{ name: '紫微' }] };
  const fuqi = { index: 2, name: '夫妻', earthlyBranch: '辰', majorStars: [{ name: '七杀' }] };
  const palaces = [ming, { index: 1, name: '兄弟', earthlyBranch: '卯', majorStars: [] }, fuqi];
  // 大限命宫落在本命夫妻宫（七杀）：大限以所落宫的星曜论，泛论七杀的、专讲大限逢七杀的、大限通论都命中；
  // 星曜条件更专门，排在只讲「大限」的通论前面；专讲流年的不算。
  assert.deepEqual(ziweiLimitPalaceHits(lib, palaces, 2, '大限').map(({ entry }) => entry.id), ['ziwei.x.004', 'ziwei.x.003', 'ziwei.x.001']);
  // 流年命宫落在本命命宫：专讲流年太岁在命宫的命中；大限的不算。
  assert.deepEqual(ziweiLimitPalaceHits(lib, palaces, 0, '流年').map(({ entry }) => entry.id), ['ziwei.x.002']);
  assert.deepEqual(ziweiLimitPalaceHits(lib, palaces, 9, '大限'), []);
  assert.deepEqual(ziweiLimitPalaceHits(null, palaces, 0, '流年'), []);
});

test('运势提示词取条：前 n 条里没有专讲运限的，就把最后一条换成专讲运限的（先挑论大限、论流年篇章里的）', () => {
  const hit = (id, keys, section = '测试') => ({ entry: { id, section }, matched: keys.map((key) => ({ key, value: 'x' })) });
  const star = (id) => hit(id, ['palace', 'star']);
  const limit = (id, section) => hit(id, ['limit'], section);
  assert.deepEqual(pickLimitHits([star('a'), star('b'), star('c'), limit('d'), star('e')], 3).map((item) => item.entry.id), ['a', 'b', 'd']);
  // 定杂局的一句话定义排在前，但论流年太岁那篇才是专讲流年的：先挑它
  const mixed = [star('a'), star('b'), star('c'), limit('d', '定杂局'), limit('e', '论流年太岁吉凶星杀'), limit('f', '论大限十年祸福何如')];
  assert.deepEqual(pickLimitHits(mixed, 3, '流年').map((item) => item.entry.id), ['a', 'b', 'e']);
  assert.deepEqual(pickLimitHits(mixed, 3, '大限').map((item) => item.entry.id), ['a', 'b', 'f']);
  assert.deepEqual(pickLimitHits(mixed, 3).map((item) => item.entry.id), ['a', 'b', 'd']);
  // 前几条里已有专讲运限的，照常取
  assert.deepEqual(pickLimitHits([star('a'), hit('b', ['limit', 'star']), star('c'), limit('d')], 3).map((item) => item.entry.id), ['a', 'b', 'c']);
  // 没有专讲运限的、或命中不够 n 条，照常取
  assert.deepEqual(pickLimitHits([star('a'), star('b'), star('c'), star('d')], 3).map((item) => item.entry.id), ['a', 'b', 'c']);
  assert.deepEqual(pickLimitHits([star('a'), star('b')], 3).map((item) => item.entry.id), ['a', 'b']);
  assert.deepEqual(pickLimitHits(null, 3), []);
});

test('空宫借对宫：对宫按地支相冲找；没有主星的宫把对宫主星算进匹配，命中说明注「借对宫」；对宫也空的不借', () => {
  const lib = buildLibrary([{
    classic: 'ziwei', section: '测试', edition: '测试',
    entries: [
      { id: 'ziwei.b.001', title: '太阳守田宅', original: '甲', status: 'translated', applies: [{ module: 'ziwei', star: '太阳', palace: '田宅' }] },
      { id: 'ziwei.b.002', title: '巨门', original: '乙', status: 'translated', applies: [{ module: 'ziwei', star: '巨门' }] },
      { id: 'ziwei.b.003', title: '文昌', original: '丙', status: 'translated', applies: [{ module: 'ziwei', star: '文昌' }] },
      { id: 'ziwei.b.004', title: '日巨同宫', original: '丁', status: 'translated', applies: [{ module: 'ziwei', allStars: ['太阳', '巨门'] }] },
    ],
  }]);
  const tianzhai = { index: 0, name: '田宅', earthlyBranch: '寅', majorStars: [], minorStars: [{ name: '文昌', brightness: '得' }] };
  const zinv = { index: 6, name: '子女', earthlyBranch: '申', majorStars: [{ name: '太阳', brightness: '得', mutagen: '禄' }, { name: '巨门', brightness: '庙' }] };
  const fude = { index: 11, name: '福德', earthlyBranch: '丑', majorStars: [] };
  const caibo = { index: 5, name: '财帛', earthlyBranch: '未', majorStars: [] };
  const palaces = [tianzhai, zinv, fude, caibo];
  assert.equal(ziweiOppositeOf(palaces, tianzhai), zinv);
  assert.equal(ziweiOppositeOf(palaces, zinv), tianzhai);
  assert.equal(ziweiOppositeOf(palaces, { index: 3, earthlyBranch: '巳' }), null);
  // 没有地支时按宫序隔六位
  assert.equal(ziweiOppositeOf(palaces, { index: 6 }), tianzhai);
  assert.deepEqual(ziweiBorrowedStarsOf(tianzhai, zinv), ['太阳', '巨门']);
  assert.deepEqual(ziweiBorrowedStarsOf(zinv, tianzhai), []);
  assert.deepEqual(ziweiBorrowedStarsOf(fude, caibo), []);
  assert.deepEqual(ziweiBorrowedStarsOf(tianzhai, null), []);
  const ctx = ziweiPalaceContextOf(tianzhai, { opposite: zinv });
  assert.deepEqual(ctx.star, ['文昌', '太阳', '巨门']);
  assert.deepEqual(ctx.borrowedStars, ['太阳', '巨门']);
  // 借了星也还是空宫：「命无正曜」「左右单守」这类条目（empty: 无正曜）只在没有主星的宫命中
  assert.deepEqual(ctx.empty, ['无正曜']);
  assert.deepEqual(ziweiPalaceContextOf(zinv).empty, []);
  const emptyLib = buildLibrary([{
    classic: 'ziwei', section: '测试', edition: '测试',
    entries: [
      { id: 'ziwei.e.001', title: '命无正曜', original: '甲', status: 'translated', applies: [{ module: 'ziwei', palace: '命宫', empty: '无正曜' }] },
      { id: 'ziwei.e.002', title: '左辅单守', original: '乙', status: 'translated', applies: [{ module: 'ziwei', palace: '命宫', star: '左辅', empty: '无正曜' }] },
    ],
  }]);
  const emptyMing = { index: 0, name: '命宫', earthlyBranch: '寅', majorStars: [], minorStars: [{ name: '左辅' }] };
  const fullMing = { index: 0, name: '命宫', earthlyBranch: '寅', majorStars: [{ name: '紫微' }], minorStars: [{ name: '左辅' }] };
  const emptyHits = matchEntries(emptyLib, ziweiPalaceContextOf(emptyMing));
  assert.deepEqual(emptyHits.map(({ entry }) => entry.id), ['ziwei.e.002', 'ziwei.e.001']);
  assert.equal(emptyHits[1].reason, '宫位·命宫，宫内·无正曜');
  assert.deepEqual(matchEntries(emptyLib, ziweiPalaceContextOf(fullMing)), []);
  // 借来的星只借名字：庙旺、四化仍只算这一宫自己星的
  assert.deepEqual(ctx.brightness, ['得']);
  assert.deepEqual(ctx.mutagen, []);
  const hits = ziweiPalaceHits(lib, palaces, ['田宅']);
  // 星曜 + 宫位的排最前；只凭星曜命中的（借来的太阳巨门、自己的文昌、日巨同宫）同分，按 id 排
  assert.deepEqual(hits.map(({ entry }) => entry.id), ['ziwei.b.001', 'ziwei.b.002', 'ziwei.b.003', 'ziwei.b.004']);
  assert.equal(hits.find(({ entry }) => entry.id === 'ziwei.b.001').reason, '星曜·太阳（借对宫），宫位·田宅');
  assert.equal(hits.find(({ entry }) => entry.id === 'ziwei.b.004').reason, '星曜·太阳、巨门（借对宫）');
  assert.equal(hits.find(({ entry }) => entry.id === 'ziwei.b.003').reason, '星曜·文昌');
  // 不传对宫就不借
  assert.deepEqual(matchEntries(lib, ziweiPalaceContextOf(tianzhai)).map(({ entry }) => entry.id), ['ziwei.b.003']);
});

test('三方四正：对宫与两个三合宫；「会」「拱」「照」的条件 meet（任一）、meetAll（都在）看本宫连三方四正的主星辅星', () => {
  const palaceAt = (index, branch, name, majorStars = [], minorStars = []) => ({ index, earthlyBranch: branch, name, majorStars: majorStars.map((n) => ({ name: n })), minorStars: minorStars.map((n) => ({ name: n })), adjectiveStars: [{ name: '天巫' }] });
  const branches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  const palaces = branches.map((branch, index) => palaceAt(index, branch, `宫${index}`));
  // 命宫在子：对宫午、三合申辰
  const ming = palaceAt(10, '子', '命宫', ['太阴'], ['文曲']);
  palaces[10] = ming;
  palaces[4] = palaceAt(4, '午', '迁移', ['天同'], ['禄存']);
  palaces[6] = palaceAt(6, '申', '官禄', ['天机', '天梁'], ['文昌']);
  palaces[2] = palaceAt(2, '辰', '财帛', [], ['擎羊']);
  assert.deepEqual(ziweiSurroundOf(palaces, ming).map((palace) => palace.earthlyBranch), ['午', '申', '辰']);
  assert.deepEqual(ziweiSurroundOf(palaces, { index: 10 }).map((palace) => palace.earthlyBranch).sort(), ['午', '申', '辰'].sort());
  assert.deepEqual(ziweiSurroundOf(null, ming), []);
  // 三方四正里只数主星、辅星，杂曜不算
  assert.deepEqual(ziweiMeetStarsOf(ziweiSurroundOf(palaces, ming)), ['天同', '禄存', '天机', '天梁', '文昌', '擎羊']);
  const ctx = ziweiPalaceContextOf(ming, { surround: ziweiSurroundOf(palaces, ming) });
  assert.deepEqual(ctx.star, ['太阴', '文曲', '天巫']);
  assert.deepEqual(ctx.meet, ['太阴', '文曲', '天巫', '天同', '禄存', '天机', '天梁', '文昌', '擎羊']);
  const lib = buildLibrary([{
    classic: 'ziwei', section: '测试', edition: '测试',
    entries: [
      { id: 'ziwei.m.001', title: '昌曲会命', original: '甲', status: 'translated', applies: [{ module: 'ziwei', palace: '命宫', meet: ['文昌', '文曲'] }] },
      { id: 'ziwei.m.002', title: '机梁会太阴', original: '乙', status: 'translated', applies: [{ module: 'ziwei', palace: '命宫', star: '太阴', meetAll: ['天机', '天梁'] }] },
      { id: 'ziwei.m.003', title: '府相朝垣', original: '丙', status: 'translated', applies: [{ module: 'ziwei', palace: '命宫', meetAll: ['天府', '天相'] }] },
      { id: 'ziwei.m.004', title: '太阴同宫文昌', original: '丁', status: 'translated', applies: [{ module: 'ziwei', palace: '命宫', allStars: ['太阴', '文昌'] }] },
    ],
  }]);
  const hits = matchEntries(lib, ctx);
  // 文昌在官禄（三方）：按 meet 命中；同宫条件 allStars 不算；府相不在三方不命中
  assert.deepEqual(hits.map(({ entry }) => entry.id), ['ziwei.m.002', 'ziwei.m.001']);
  assert.equal(hits[0].reason, '宫位·命宫，星曜·太阴，三方四正·天机、天梁');
  assert.equal(hits[1].reason, '宫位·命宫，三方四正·文昌');
  // 不传三方四正时只算本宫的星：文曲在本宫仍算「会」，机梁就不算了
  assert.deepEqual(matchEntries(lib, ziweiPalaceContextOf(ming)).map(({ entry }) => entry.id), ['ziwei.m.001']);
  // ziweiPalaceHits 自动带三方四正
  assert.deepEqual(ziweiPalaceHits(lib, palaces, ['命宫']).map(({ entry }) => entry.id), ['ziwei.m.002', 'ziwei.m.001']);
});

test('排序与筛选：条件更具体的在前，同样具体时已审 > 待审 > 仅原文；可按状态过滤与限制条数', () => {
  const entry = (id, status, applies) => ({ id, title: id, original: '原', vernacular: status === 'draft' ? undefined : '白', status, applies });
  const lib = buildLibrary([{
    classic: 'ziping',
    section: '测试',
    edition: '测试',
    entries: [
      entry('ziping.t.001', 'draft', [{ module: 'bazi', tenGod: '正官' }]),
      entry('ziping.t.002', 'reviewed', [{ module: 'bazi', tenGod: '正官' }]),
      entry('ziping.t.003', 'translated', [{ module: 'bazi', tenGod: '正官', dayGan: '甲' }]),
      entry('ziping.t.004', 'translated', [{ module: 'bazi', tenGod: '正官', dayGan: '乙' }]),
    ],
  }]);
  const ctx = { module: 'bazi', tenGod: ['正官', '食神'], dayGan: '甲' };
  const hits = matchEntries(lib, ctx);
  assert.deepEqual(hits.map(({ entry: item }) => item.id), ['ziping.t.003', 'ziping.t.002', 'ziping.t.001']);
  assert.equal(hits[0].reason, '十神·正官，日干·甲');
  assert.deepEqual(matchEntries(lib, ctx, { status: ['reviewed'] }).map(({ entry: item }) => item.id), ['ziping.t.002']);
  assert.equal(matchEntries(lib, ctx, { limit: 2 }).length, 2);
  assert.deepEqual(matchEntries(lib, null), []);
});

test('六爻上下文：本卦与变卦都算，动爻数归为无 / 一 / 多', () => {
  const ctx = liuyaoContextOf({ hexagram: '地天泰', changed: '地泽临', movingLines: [3], relations: ['六合'], sixRelatives: ['妻财'], topic: '求财' });
  assert.deepEqual(ctx.hexagram, ['地天泰', '地泽临']);
  assert.equal(ctx.movingLines, '一');
  assert.equal(liuyaoContextOf({ hexagram: '乾为天', movingLines: [] }).movingLines, '无');
  assert.equal(liuyaoContextOf({ hexagram: '乾为天', movingLines: [1, 4] }).movingLines, '多');
  const lib = buildLibrary([{ classic: 'zengshan', section: '求财章', edition: '测试', entries: [{ id: 'zengshan.t.001', title: 't', original: '原', status: 'draft', applies: [{ module: 'liuyao', hexagram: '地泽临', topic: '求财' }] }] }]);
  assert.equal(matchEntries(lib, ctx)[0].reason, '卦·地泽临，问事·求财');
});

test('术语词典：按术语或别名精确查，优先本模块，再通用，再其他模块；关键字搜索；找出一段话里的术语', () => {
  assert.ok(glossary.total >= 2);
  assert.equal(lookupTerm(glossary, '日元').term, '日主');
  assert.equal(lookupTerm(glossary, '不存在的词'), null);
  assert.equal(lookupTerm(glossary, '  日主 ').sourceText, '《子平真诠》·论用神');

  const mixed = buildGlossary([
    { module: 'bazi', entries: [{ term: '用神', brief: '八字的用神', explain: '八字里起关键作用的那个五行或十神，二十个字以上。' }] },
    { module: 'liuyao', entries: [{ term: '用神', brief: '六爻的用神', explain: '占卦时代表所问之事的那个爻，二十个字以上的解释。' }] },
    { module: 'common', entries: [{ term: '天干', aliases: ['十天干'], brief: '甲乙丙丁戊己庚辛壬癸', explain: '甲乙丙丁戊己庚辛壬癸十个字，纪年纪日都用得到。' }] },
  ]);
  assert.equal(lookupTerm(mixed, '用神', { module: 'liuyao' }).brief, '六爻的用神');
  assert.equal(lookupTerm(mixed, '用神', { module: 'bazi' }).brief, '八字的用神');
  assert.equal(lookupTerm(mixed, '用神', { module: 'ziwei' }).brief, '八字的用神', '都不是本模块时按词典顺序取第一条');
  assert.deepEqual(searchGlossary(mixed, '用神', { module: 'liuyao' }).map((item) => item.brief), ['六爻的用神']);
  assert.deepEqual(searchGlossary(mixed, '天干').map((item) => item.term), ['天干']);
  assert.deepEqual(searchGlossary(mixed, '').length, 0);
  assert.deepEqual(termsIn(mixed, '取十天干里的用神为主', { module: 'bazi' }).map(({ term, entry }) => `${term}=${entry.brief}`), ['十天干=甲乙丙丁戊己庚辛壬癸', '用神=八字的用神']);
});

test('词典面板的种子术语：八字盘给十神、格局、神煞、旺衰；紫微给宫名、星曜、四化', () => {
  const { chart, strength, judge } = chartOf(1998, 1, 2, 4);
  const seeds = baziGlossarySeeds({ chart, judge, strength });
  assert.deepEqual(seeds.slice(0, 2), ['日主', '十神']);
  assert.ok(seeds.includes('正财') && seeds.includes('偏财'), '透出与藏干的十神');
  assert.ok(seeds.includes(judge.pattern.name), '格局名');
  assert.ok(seeds.includes(strength.band), '旺衰档');
  assert.ok(seeds.includes('大运') && seeds.includes('流年'));
  assert.equal(new Set(seeds).size, seeds.length, '不重复');
  assert.deepEqual(baziGlossarySeeds({}), ['日主', '十神', '格局', '用神', '旺衰', '神煞', '藏干', '纳音', '空亡', '大运', '流年']);

  const palace = { name: '命宫', isBodyPalace: true, majorStars: [{ name: '紫微', mutagen: '' }, { name: '七杀', mutagen: '化权' }], minorStars: [{ name: '文曲', mutagen: '忌' }], adjectiveStars: [{ name: '天巫' }] };
  assert.deepEqual(ziweiGlossarySeeds(palace), ['命宫', '身宫', '紫微', '七杀', '文曲', '天巫', '化权', '化忌', '三方四正', '庙旺利陷', '四化', '大限', '流年']);
  assert.deepEqual(ziweiGlossarySeeds(null), ['命宫', '身宫', '十二宫', '四化', '大限', '流年']);
});

test('八字六亲：写了 liuqin 的条件只在「六亲宫星」那一亲下面命中，不进总列表；同一条件里的性别、十神也要满足', () => {
  const doc = (applies) => ({ classic: 'ditian', section: '夫妻', edition: '测试', entries: [{ id: 'ditian.t.001', title: '夫妻·其一', original: '原', status: 'draft', applies }] });
  assert.deepEqual(validateClassicsDoc(doc([{ module: 'bazi', liuqin: '夫妻' }])), []);
  assert.deepEqual(validateClassicsDoc(doc([{ module: 'bazi', liuqin: ['子女', '父母'], gender: '女' }])), []);
  assert.match(validateClassicsDoc(doc([{ module: 'bazi', liuqin: '朋友' }])).join('\n'), /liuqin: 「朋友」不在允许范围/);
  assert.deepEqual(BAZI_LIUQIN, ['夫妻', '子女', '父母', '兄弟']);

  const lib = buildLibrary([{
    classic: 'ditian',
    section: '夫妻、子女、女命',
    edition: '测试',
    entries: [
      { id: 'ditian.t.001', title: '夫妻·其一', section: '夫妻', original: '夫妻因缘宿世来', status: 'draft', applies: [{ module: 'bazi', liuqin: '夫妻' }] },
      { id: 'ditian.t.002', title: '女命·其一', section: '女命', original: '论夫论子要安详', status: 'draft', applies: [{ module: 'bazi', liuqin: ['夫妻', '子女'], gender: '女' }] },
      { id: 'ditian.t.003', title: '子女·其一', section: '子女', original: '子女根枝一世传', status: 'draft', applies: [{ module: 'bazi', liuqin: '子女', tenGod: ['伤官', '食神'] }] },
      { id: 'ditian.t.004', title: '通论', section: '夫妻', original: '通', status: 'draft', applies: [{ module: 'bazi', liuqin: '夫妻' }, { module: 'bazi', tenGod: '正财' }] },
    ],
  }]);
  const ctx = { module: 'bazi', tenGod: ['正财', '七杀'], gender: '男' };
  assert.deepEqual(matchEntries(lib, ctx).map(({ entry }) => entry.id), ['ditian.t.004'], '总列表的上下文没有 liuqin，只有带别的条件的通论命中');
  assert.deepEqual(baziLiuqinHits(lib, ctx, '夫妻').map(({ entry }) => entry.id).sort(), ['ditian.t.001', 'ditian.t.004']);
  assert.equal(baziLiuqinHits(lib, ctx, '夫妻').find(({ entry }) => entry.id === 'ditian.t.004').reason, '六亲·夫妻', '只按带 liuqin 的条件说明');
  assert.deepEqual(baziLiuqinHits(lib, ctx, '子女'), [], '男命、不见食伤：女命条与食伤条都不中');
  assert.deepEqual(baziLiuqinHits(lib, { ...ctx, gender: '女', tenGod: ['食神'] }, '子女').map(({ entry }) => entry.id), ['ditian.t.003', 'ditian.t.002']);
  assert.deepEqual(baziLiuqinHits(lib, ctx, '朋友'), []);
  assert.deepEqual(baziLiuqinHits(lib, { module: 'ziwei' }, '夫妻'), []);
  assert.deepEqual(baziLiuqinHits(lib, ctx, '夫妻', { limit: 1 }).length, 1);
});
