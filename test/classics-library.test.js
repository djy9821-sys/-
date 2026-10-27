import test from 'node:test';
import assert from 'node:assert/strict';

import { loadDataFiles } from '../scripts/lib/dataFiles.mjs';
import {
  baziContextOf, buildGlossary, buildLibrary, conditionMatches, entriesOfClassic, entryById, liuyaoContextOf, lookupTerm, matchEntries,
  patternNamesOf, searchGlossary, termsIn, ziweiContextOf, ziweiLifePalaceHits, ziweiPalaceContextOf,
} from '../src/data/classics/library.js';
import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';
import { findRelations } from '../src/utils/baziRelations.js';

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
  assert.deepEqual(entriesOfClassic(library, 'sanming').map((item) => item.id), ['sanming.shensha.tianyi.001']);
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
  assert.deepEqual(patternNamesOf('疑似从杀格'), ['疑似从杀格', '从杀格']);
  assert.deepEqual(patternNamesOf(null), []);
});

test('真实命盘能从仓库数据里匹配到条目：正官格命中《子平真诠》成败两段，乾隆命中天乙贵人歌诀', () => {
  const guan = baziContextOf(chartOf(1960, 6, 2, 1));
  const hits = matchEntries(library, guan);
  const ids = hits.map(({ entry }) => entry.id);
  assert.ok(ids.includes('ziping.chengbai.001') && ids.includes('ziping.chengbai.002'), ids.join());
  assert.ok(ids.includes('sanming.shensha.tianyi.001'), '时柱丑为年干庚的天乙贵人');
  const noTianYi = matchEntries(library, { module: 'bazi', shensha: ['文昌贵人'] }).map(({ entry }) => entry.id);
  assert.ok(!noTianYi.includes('sanming.shensha.tianyi.001'));
  const first = hits.find(({ entry }) => entry.id === 'ziping.chengbai.001');
  assert.equal(first.reason, '格局·正官格');
  assert.deepEqual(first.matched, [{ key: 'pattern', value: '正官格' }]);

  const qianlong = baziContextOf(chartOf(1711, 9, 25, 0));
  assert.ok(qianlong.shensha.includes('天乙贵人'));
  const qianlongIds = matchEntries(library, qianlong).map(({ entry }) => entry.id);
  assert.ok(qianlongIds.includes('sanming.shensha.tianyi.001'));
  assert.ok(qianlongIds.includes('ziping.chengbai.001'), '羊刃格也在成败两段的适用范围里');

  assert.deepEqual(matchEntries(library, ziweiContextOf({ stars: ['紫微'] })).map(({ entry }) => entry.id), ['ziwei.quanshu.zhuxing.001']);
  assert.deepEqual(matchEntries(library, ziweiContextOf({ stars: ['天机'] })), []);
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

test('紫微：从排盘结果的一个宫生成上下文（主辅杂曜都算，身宫同宫时命宫身宫都给，四化去掉「化」字）', () => {
  const palace = {
    name: '命宫', earthlyBranch: '亥', isBodyPalace: true,
    majorStars: [{ name: '紫微', brightness: '旺', mutagen: '' }, { name: '七杀', brightness: '平', mutagen: '化权' }],
    minorStars: [{ name: '文曲', brightness: '', mutagen: '忌' }],
    adjectiveStars: [{ name: '天巫' }, { name: '天官' }],
  };
  const ctx = ziweiPalaceContextOf(palace, { gender: 'female' });
  assert.deepEqual(ctx, {
    module: 'ziwei', star: ['紫微', '七杀', '文曲', '天巫', '天官'], palace: ['命宫', '身宫'], branches: ['亥'],
    brightness: ['旺', '平'], mutagen: ['权', '忌'], pattern: [], limit: '本命', gender: '女',
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
