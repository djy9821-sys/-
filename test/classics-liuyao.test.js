import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLibrary, liuyaoContextOf, liuyaoGlossarySeeds, liuyaoReadingContextOf, matchEntries } from '../src/data/classics/library.js';
import { LIUYAO_TOPIC_NAMES, LIUYAO_TOPIC_VOCAB, liuyaoTopicNamesOf } from '../src/data/classics/topicNames.js';
import { validateClassicsDoc } from '../src/data/classics/schema.js';
import { LIUYAO_TOPIC_LABELS } from '../src/utils/liuyaoRecord.js';
import { buildLiuYaoPrompt, buildLiuYaoReading } from '../src/utils/liuyao.js';
import { judgeLiuYao } from '../src/utils/liuyaoJudge.js';

// 水泽节（六合）二、四爻动 → 泽雷随；问求财。
const reading = buildLiuYaoReading([7, 9, 8, 6, 7, 8], new Date(2026, 9, 28, 10, 30), { topic: 'wealth' });
const judge = judgeLiuYao(reading);

test('类别名表与程序类别一一对应，第一个名字就是程序显示的名字', () => {
  assert.deepEqual(Object.keys(LIUYAO_TOPIC_NAMES).sort(), Object.keys(LIUYAO_TOPIC_LABELS).sort());
  Object.entries(LIUYAO_TOPIC_NAMES).forEach(([key, names]) => assert.equal(names[0], LIUYAO_TOPIC_LABELS[key], key));
  assert.ok(liuyaoTopicNamesOf('love').includes('婚姻'));
  assert.ok(liuyaoTopicNamesOf('感情婚姻').includes('姻缘'));
  assert.deepEqual(liuyaoTopicNamesOf('天时'), ['天时']);
  assert.deepEqual(liuyaoTopicNamesOf(null), []);
  assert.ok(LIUYAO_TOPIC_VOCAB.includes('词讼') && LIUYAO_TOPIC_VOCAB.includes('失物'));
});

test('从一次起卦生成上下文：本卦变卦、动爻、六合、用神六亲、动爻与用神的六神、类别展开', () => {
  const ctx = liuyaoReadingContextOf(reading, judge);
  assert.deepEqual(ctx.hexagram, ['水泽节', '泽雷随']);
  assert.deepEqual(ctx.line, [2, 4]);
  assert.equal(ctx.movingLines, '多');
  assert.deepEqual(ctx.relation, ['六合']);
  assert.deepEqual(ctx.sixRelative, ['妻财']);
  assert.ok(ctx.sixGod.includes(judge.yongShen.god));
  reading.lines.filter((line) => line.isMoving).forEach((line) => assert.ok(ctx.sixGod.includes(line.god)));
  assert.ok(ctx.topic.includes('求财') && ctx.topic.includes('买卖'));
  assert.equal(liuyaoReadingContextOf(null), null);

  const lib = buildLibrary([{
    classic: 'zengshan', section: '求财章', edition: '测试',
    entries: [
      { id: 'zengshan.t.001', title: '财章', original: '甲。', status: 'draft', applies: [{ module: 'liuyao', topic: '买卖', sixRelative: '妻财' }] },
      { id: 'zengshan.t.002', title: '婚章', original: '乙。', status: 'draft', applies: [{ module: 'liuyao', topic: '婚姻' }] },
      { id: 'zengshan.t.003', title: '六合', original: '丙。', status: 'draft', applies: [{ module: 'liuyao', relation: '六合', movingLines: '多' }] },
    ],
  }]);
  const ids = matchEntries(lib, ctx).map(({ entry }) => entry.id);
  assert.deepEqual(ids.sort(), ['zengshan.t.001', 'zengshan.t.003']);
  assert.equal(matchEntries(lib, liuyaoContextOf({ hexagram: '乾为天', topic: 'love' }))[0].entry.id, 'zengshan.t.002');
});

test('六爻词典种子：世应、用神六亲、动变、六合卦、伏神按卦里有没有来', () => {
  const seeds = liuyaoGlossarySeeds(reading, judge);
  ['世爻', '应爻', '用神', '妻财', '动爻', '变卦', '六合卦', '旬空'].forEach((term) => assert.ok(seeds.includes(term), term));
  assert.ok(!seeds.includes('静爻'));
  assert.equal(seeds.includes('伏神'), reading.hidden.length > 0);
  assert.ok(liuyaoGlossarySeeds(null).includes('世爻'));
});

test('提示词附上与本卦相关的古籍原文；没有命中时不加这一节', () => {
  const hit = { entry: { id: 'x', title: '求财章·其一', book: '增删卜易', section: '求财章', status: 'translated', original: '财爻持世。' }, reason: '问事·求财' };
  const prompt = buildLiuYaoPrompt(reading, judge, { classics: [hit] });
  assert.match(prompt, /【古籍原文（与本卦相关）】\n- 《增删卜易》·求财章「其一」（匹配：问事·求财）：财爻持世。/);
  assert.doesNotMatch(buildLiuYaoPrompt(reading, judge), /【古籍原文/);
  assert.doesNotMatch(buildLiuYaoPrompt(reading, judge, { classics: [] }), /【古籍原文/);
});

test('校验：六爻 topic 写程序认不得的类别会报错，古籍叫法与待接入类别放行', () => {
  const doc = (topic) => ({
    classic: 'zengshan', section: '测试', edition: '测试',
    entries: [{ id: 'zengshan.t.001', title: '甲', original: '甲。', status: 'draft', applies: [{ module: 'liuyao', topic }] }],
  });
  assert.deepEqual(validateClassicsDoc(doc(['求财', '婚姻', '词讼', '失物'])), []);
  assert.match(validateClassicsDoc(doc('发财')).join('\n'), /「发财」不是程序认得的问事类别/);
});
