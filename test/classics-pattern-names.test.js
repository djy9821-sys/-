import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BAZI_PATTERN_VOCAB, BAZI_PROGRAM_PATTERNS, ZIWEI_PATTERN_VOCAB, ZIWEI_PROGRAM_PATTERNS, patternNamesOf, ziweiPatternNamesOf,
} from '../src/data/classics/patternNames.js';
import { buildLibrary, ziweiContextOf, matchEntries } from '../src/data/classics/library.js';
import { chaptersOf, sectionOfEntry, validateClassicsDoc } from '../src/data/classics/schema.js';
import { ZIWEI_PATTERN_NAMES } from '../src/utils/ziweiPatterns.js';
import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';

test('紫微格名表与程序规则库一致（程序加了格局，这里要同步登记）', () => {
  assert.deepEqual([...ZIWEI_PROGRAM_PATTERNS].sort(), [...ZIWEI_PATTERN_NAMES].sort());
  ZIWEI_PROGRAM_PATTERNS.forEach((name) => assert.ok(ZIWEI_PATTERN_VOCAB.includes(name), name));
  assert.deepEqual(ziweiPatternNamesOf('三奇加会'), ['三奇加会', '三奇加会格', '三奇嘉会', '三奇嘉会格']);
  assert.ok(ziweiPatternNamesOf('机月同梁格').includes('机月同梁'));
  assert.ok(ziweiPatternNamesOf('杀破狼星系').includes('杀破狼'));
});

test('八字：程序判出的格局名（含疑似、杂气、专旺注记）展开后都在登记表里', () => {
  let seed = 11;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const seen = new Set();
  for (let i = 0; i < 1500; i += 1) {
    const chart = buildBaziChart({
      calendarType: 'solar', year: 1930 + Math.floor(rnd() * 90), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28),
      gender: 'male', hourIndex: Math.floor(rnd() * 12),
    });
    const judge = judgeBaziPattern(chart, analyzeStrength(chart));
    [judge?.pattern?.name, judge?.special?.name].filter(Boolean).forEach((name) => {
      seen.add(name);
      const names = patternNamesOf(name);
      const certain = names.find((item) => BAZI_PROGRAM_PATTERNS.includes(item));
      assert.ok(certain, `程序格名「${name}」没有对应的登记名：${names.join('、')}`);
    });
  }
  assert.ok(seen.size >= 12, [...seen].join('、'));
  BAZI_PROGRAM_PATTERNS.forEach((name) => assert.ok(BAZI_PATTERN_VOCAB.includes(name), name));
});

test('八字格名同义展开：专旺去注记、化气两干排序、七杀作七煞', () => {
  const zhuanWang = patternNamesOf('疑似曲直格（专旺）');
  assert.ok(zhuanWang.includes('曲直格') && zhuanWang.includes('专旺格'), zhuanWang.join());
  const hua = patternNamesOf('疑似己甲化土格');
  assert.ok(hua.includes('甲己化土格') && hua.includes('化土格') && hua.includes('化气格'), hua.join());
  assert.ok(patternNamesOf('七杀格').includes('七煞格'));
  assert.ok(patternNamesOf('疑似从杀格').includes('从煞格'));
  assert.ok(!patternNamesOf('正官格').includes('从格'));
});

test('紫微上下文的格局按写法展开：条目写「机月同梁」也能被「机月同梁格」命中', () => {
  const lib = buildLibrary([{
    classic: 'ziwei', section: '测试', edition: '测试',
    entries: [{ id: 'ziwei.t.001', title: '机月同梁', original: '甲', status: 'draft', applies: [{ module: 'ziwei', pattern: '机月同梁' }] }],
  }]);
  assert.deepEqual(matchEntries(lib, ziweiContextOf({ patterns: ['机月同梁格'] })).map(({ entry }) => entry.id), ['ziwei.t.001']);
  assert.deepEqual(matchEntries(lib, ziweiContextOf({ patterns: ['紫府朝垣格'] })), []);
});

const doc = (applies, overrides = {}) => ({
  classic: 'ziping',
  section: '论用神',
  edition: '测试',
  entries: [{ id: 'ziping.t.001', title: '论用神·其一', original: '甲。', vernacular: '甲', status: 'translated', applies }],
  ...overrides,
});

test('校验：pattern / shensha 写成程序不认的名字会报错，同义名放行', () => {
  assert.deepEqual(validateClassicsDoc(doc([{ module: 'bazi', pattern: ['正官格', '财格', '阳刃格', '七煞格', '杂气正财格'] }])), []);
  assert.deepEqual(validateClassicsDoc(doc([{ module: 'bazi', shensha: '天乙贵人' }])), []);
  assert.match(validateClassicsDoc(doc([{ module: 'bazi', pattern: '正官' }])).join('\n'), /「正官」不是程序认得的格局名/);
  assert.match(validateClassicsDoc(doc([{ module: 'bazi', shensha: '天乙' }])).join('\n'), /「天乙」不是程序认得的神煞名/);
  const ziwei = { classic: 'ziwei', section: '测试', edition: '测试', entries: [{ id: 'ziwei.t.001', title: '甲', original: '甲。', status: 'draft', applies: [{ module: 'ziwei', pattern: '紫府同宫' }] }] };
  assert.match(validateClassicsDoc(ziwei).join('\n'), /「紫府同宫」不是程序认得的格局名/);
  ziwei.entries[0].applies = [{ module: 'ziwei', pattern: ['机月同梁', '三奇嘉会', '杀破狼'] }];
  assert.deepEqual(validateClassicsDoc(ziwei), []);
});

test('一个文件录几篇：section 用「、」列篇名，条目按 title 前缀或自带 section 归篇，出处只写本篇', () => {
  const multi = {
    classic: 'ziping',
    section: '论用神、论用神变化、论相神紧要',
    edition: '测试',
    entries: [
      { id: 'ziping.t.001', title: '论用神·其一', original: '甲。', status: 'draft' },
      { id: 'ziping.t.002', title: '论用神变化·其一', original: '乙。', status: 'draft' },
      { id: 'ziping.t.003', title: '相神总论', section: '论相神紧要', original: '丙。', status: 'draft' },
    ],
  };
  assert.deepEqual(chaptersOf(multi), ['论用神', '论用神变化', '论相神紧要']);
  assert.equal(sectionOfEntry(multi.entries[1], multi), '论用神变化');
  assert.deepEqual(validateClassicsDoc(multi), []);
  const lib = buildLibrary([multi]);
  assert.equal(lib.byId.get('ziping.t.001').source, '《子平真诠》·论用神');
  assert.equal(lib.byId.get('ziping.t.002').section, '论用神变化');
  assert.equal(lib.byId.get('ziping.t.003').source, '《子平真诠》·论相神紧要');
  assert.equal(lib.byId.get('ziping.t.003').docSection, '论用神、论用神变化、论相神紧要');

  const orphan = { ...multi, entries: [{ id: 'ziping.t.009', title: '无篇名', original: '丁。', status: 'draft' }] };
  assert.match(validateClassicsDoc(orphan).join('\n'), /title 须以「篇名·」开头/);
  const wrong = { ...multi, entries: [{ id: 'ziping.t.010', title: '甲', section: '论格局', original: '戊。', status: 'draft' }] };
  assert.match(validateClassicsDoc(wrong).join('\n'), /section「论格局」不在文件 section 列出的篇名里/);
  // 单篇文件：出处就是文件的篇名，条目不用写 section。
  assert.equal(sectionOfEntry({ title: '论用神·其一' }, { section: '论用神' }), '论用神');
});

test('校验：白话超过原文 3.5 倍报错（多半加了原文没有的内容）；原文太短不查', () => {
  const entry = (original, vernacular) => ({
    classic: 'ziwei', section: '测试', edition: '测试',
    entries: [{ id: 'ziwei.t.001', title: '甲', original, vernacular, status: 'translated' }],
  });
  const original = '廉贞清白能相守，更有天同理亦然。天府尊星，也作纯和之体。';
  assert.deepEqual(validateClassicsDoc(entry(original, '女命廉贞清白，能与丈夫相守；天同坐命，道理也一样。天府是尊贵的星，坐命者体貌纯和。')), []);
  const padded = '廉贞星坐守女命若落入未宫、申宫等庙旺之地且无恶煞冲破，其人品德坚贞、清白自守，能与丈夫相守到老恪尽妇德；更有天同福星坐守女命入庙，也是这般安享福禄、和美美满的道理。天府南斗令星尊宿，则呈现出温纯安和、雍容大度的体态气质，福泽深厚。';
  assert.match(validateClassicsDoc(entry(original, padded)).join('\n'), /白话是原文的 \d+\.\d 倍，超过 3\.5 倍上限/);
  assert.deepEqual(validateClassicsDoc(entry('府相之星女命躔。', padded)), [], '原文不足 12 字不查长短');
});

test('校验：古籍文件必须在 bazi / ziwei / liuyao 目录里，条件只能写本目录的模块（网页按目录分块加载）', () => {
  const doc = (module) => ({
    classic: 'ziping', section: '测试', edition: '测试',
    entries: [{ id: 'ziping.t.001', title: '甲', original: '甲。', status: 'draft', applies: [{ module, ...(module === 'bazi' ? { pattern: '正官格' } : { star: '紫微' }) }] }],
  });
  assert.deepEqual(validateClassicsDoc(doc('bazi'), { file: 'src/data/classics/bazi/t.json' }), []);
  assert.match(validateClassicsDoc(doc('ziwei'), { file: 'src/data/classics/bazi/t.json' }).join('\n'), /文件放在 bazi 目录（只在八字页加载），条件却写 module: ziwei/);
  assert.match(validateClassicsDoc(doc('bazi'), { file: 'src/data/classics/t.json' }).join('\n'), /古籍文件要放在 src\/data\/classics\/ 下的 bazi \/ ziwei \/ liuyao 子目录里/);
  assert.deepEqual(validateClassicsDoc(doc('ziwei')), [], '不给文件路径时不查目录');
});
