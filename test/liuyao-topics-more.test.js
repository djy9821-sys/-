import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiuYaoReading } from '../src/utils/liuyao.js';
import { judgeLiuYao, LIUYAO_TOPICS } from '../src/utils/liuyaoJudge.js';
import { liuyaoReadingContextOf } from '../src/data/classics/library.js';
import { LIUYAO_TOPIC_PENDING } from '../src/data/classics/topicNames.js';
import { normalizeLiuYaoTopic } from '../src/utils/liuyaoRecord.js';
import { HEXAGRAM_MAP } from '../src/utils/hexagramLogic.js';

// 2026-10-26 13:47：戊戌月 癸酉日，旬空戌亥。
const castAt = new Date(2026, 9, 26, 13, 47);
const allValues = () => Array.from({ length: 4096 }, (_, code) => Array.from({ length: 6 }, (_, i) => [6, 7, 8, 9][(code >> (2 * i)) & 3]));
/** 在全部 4096 种起卦里找第一卦满足条件的。 */
const findCast = (topic, predicate) => {
  for (const values of allValues()) {
    const reading = buildLiuYaoReading(values, castAt, { topic });
    const judge = judgeLiuYao(reading);
    if (predicate(reading, judge)) return { reading, judge };
  }
  return null;
};
const pointOf = (judge, prefix) => judge.points.find((point) => point.startsWith(prefix)) ?? '';

test('新增五类：失物寻找、流年运势、避乱避祸、寻地择穴、祖坟风水；起卦页常用 12 类，其余收在更多', () => {
  const values = LIUYAO_TOPICS.map((topic) => topic.value);
  ['lost', 'year', 'refuge', 'gravesite', 'ancestral'].forEach((value) => {
    assert.ok(values.includes(value), value);
    assert.equal(normalizeLiuYaoTopic(value), value);
  });
  assert.equal(LIUYAO_TOPICS.filter((topic) => topic.common).length, 12);
  LIUYAO_TOPICS.forEach((topic) => assert.ok(topic.hint, topic.value));
  assert.deepEqual([...LIUYAO_TOPIC_PENDING], ['国朝']);
});

test('鬼神作祟：以官鬼为用神，吉凶反看——鬼休囚空破墓绝为「非鬼神之害」，旺相者按五行分神，动克世为祟，子孙制鬼（《增删卜易·鬼神章》）', () => {
  assert.ok(LIUYAO_TOPICS.some((topic) => topic.value === 'spirits' && topic.relative === '官鬼' && !topic.common));
  const weak = findCast('spirits', (reading, judge) => judge.verdict.title === '非鬼神之害' && !judge.yongShen.hidden);
  assert.ok(weak, '应能找到官鬼休囚的卦');
  assert.equal(weak.judge.yongShen.relative, '官鬼');
  assert.equal(weak.judge.verdict.level, 'good');
  assert.match(pointOf(weak.judge, '鬼神：'), /非鬼神之害/);
  const strong = findCast('spirits', (reading, judge) => judge.verdict.title === '鬼神为祟');
  assert.ok(strong, '应能找到官鬼旺相发动克世的卦');
  assert.equal(strong.judge.verdict.level, 'bad');
  assert.match(pointOf(strong.judge, '鬼神：'), /旺相，系.+神/);
  assert.match(pointOf(strong.judge, '鬼神：'), /发动克世，祟近其身/);
  const eased = findCast('spirits', (reading, judge) => judge.verdict.title === '有鬼神之事' && judge.points.some((point) => point.includes('福神制鬼')));
  assert.ok(eased, '应能找到官鬼旺相而子孙发动的卦');
  assert.equal(eased.judge.verdict.level, 'mixed');
  assert.match(eased.judge.notices.join(''), /与鬼神何干/);
  // 古籍匹配：鬼神章的条目按类别与官鬼用神命中。
  const ctx = liuyaoReadingContextOf(weak.reading, weak.judge);
  assert.ok(ctx.topic.includes('鬼神') && ctx.sixRelative.includes('官鬼'));
});

test('古籍匹配：新类别展开成古籍里的叫法，坟墓两类都算', () => {
  const contextOf = (topic) => {
    const reading = buildLiuYaoReading([7, 9, 8, 7, 6, 7], castAt, { topic });
    return liuyaoReadingContextOf(reading, judgeLiuYao(reading));
  };
  assert.ok(contextOf('lost').topic.includes('失物'));
  assert.ok(contextOf('year').topic.includes('年时'));
  assert.ok(contextOf('refuge').topic.includes('避乱'));
  const grave = contextOf('gravesite');
  assert.ok(grave.topic.includes('坟墓') && grave.topic.includes('茔葬'));
  const ancestral = contextOf('ancestral');
  assert.ok(ancestral.topic.includes('坟墓') && ancestral.topic.includes('祖茔'));
  assert.ok(ancestral.sixRelative.includes('父母'));
});

test('失物：以妻财为用神，财化墓若藏不见，内外卦定远近，兄动难寻', () => {
  const tomb = findCast('lost', (reading, judge) => !judge.yongShen.hidden && judge.points.some((point) => point.includes('财爻化墓，若藏不见')));
  assert.ok(tomb, '应能找到财爻动而化墓的卦');
  assert.equal(tomb.judge.yongShen.relative, '妻财');
  assert.match(pointOf(tomb.judge, '失物：'), /财在[内外]卦/);
  assert.match(pointOf(tomb.judge, '失物：'), /可往(东方|南方|西方|北方|四隅)/);
  assert.match(tomb.judge.notices[0], /失物以妻财为用神/);
  const robbed = findCast('lost', (reading) => reading.lines.some((line) => line.isMoving && line.relative === '兄弟'));
  assert.match(pointOf(robbed.judge, '失物：'), /兄弟发动，财物被劫/);
});

test('流年：以世爻为主，官鬼持世、官鬼发动克世为灾，子孙为福神', () => {
  const ghost = findCast('year', (reading) => reading.lines[reading.hexagram.shi - 1].relative === '官鬼');
  assert.equal(ghost.judge.yongShen.isShi, true);
  assert.match(pointOf(ghost.judge, '流年：'), /官鬼持世，流年多灾忧/);
  assert.match(ghost.judge.notices[0], /占流年、月令以世爻为主/);
  const plain = buildLiuYaoReading(ghost.reading.lines.map((line) => line.value), castAt, { topic: 'general' });
  assert.ok(judgeLiuYao(plain).score > ghost.judge.score, '同一卦问流年，官鬼持世要比一般吉凶扣分');
});

test('趋避：子孙发动俱以为吉；给出生世之方与福神之方', () => {
  const found = findCast('refuge', (reading) => reading.lines.some((line) => line.isMoving && line.relative === '子孙'));
  const text = pointOf(found.judge, '趋避：');
  assert.match(text, /子孙发动，不拘克世、生世、持世，俱以为吉/);
  assert.match(text, /避患于生世之方：世爻属[金木水火土]，[金木水火土]来生，宜往/);
  assert.match(text, /趋吉于福神之地：子孙属[金木水火土]，在/);
});

test('寻地：世为穴；六合聚气藏风，六冲飞砂走石', () => {
  const he = findCast('gravesite', (reading) => reading.hexagram.relation === '六合' && !reading.changed);
  assert.equal(he.judge.yongShen.isShi, true);
  assert.match(pointOf(he.judge, '寻地：'), /卦逢六合，聚气藏风/);
  const chong = findCast('gravesite', (reading) => reading.hexagram.relation === '六冲' && !reading.changed);
  assert.match(pointOf(chong.judge, '寻地：'), /卦逢六冲，飞砂走石/);
  assert.ok(he.judge.score > chong.judge.score);
  assert.match(he.judge.notices[0], /世为穴也/);
});

test('祖坟：以父母为用神；冲克父母之爻按五行六神断所伤之由；六爻安静父母有气则久后自安', () => {
  const snake = findCast('ancestral', (reading, judge) => judge.points.some((point) => point.includes('恐蛇蚁为巢')));
  assert.ok(snake, '应能找到螣蛇临克神的卦');
  assert.equal(snake.judge.yongShen.relative, '父母');
  assert.match(pointOf(snake.judge, '祖坟：'), /所伤之由：.*[克冲]父母，恐蛇蚁为巢/);
  const calm = findCast('ancestral', (reading, judge) => !reading.movingPositions.length && judge.points.some((point) => point.includes('久后自安')));
  assert.ok(calm, '应能找到六爻安静、父母有气的卦');
});

test('子嗣：子孙化子孙列出子嗣章的几种应法，分本宫、他宫；不改倾向；问子嗣先说清问什么（《增删卜易·子嗣章》）', () => {
  // 子嗣章占例：亥月庚子日，占子孙有无，得屯之节——世爻子孙化子孙，「此公年逾六旬……后立侄孙承嗣」，屯、节同属坎宫。
  const bits = Object.fromEntries(Object.entries(HEXAGRAM_MAP).map(([key, hexagram]) => [hexagram.name, [...key].reverse().map(Number)]));
  const values = bits['水雷屯'].map((bit, i) => (i === 1 ? (bit ? 9 : 6) : (bit ? 7 : 8)));
  const zhun = judgeLiuYao(buildLiuYaoReading(values, new Date(2001, 11, 3, 12, 0), { topic: 'children' }));
  const text = zhun.points.find((point) => point.startsWith('子孙化子孙')) ?? '';
  assert.match(text, /老年无子得此，主抚他人之子为子/);
  assert.match(text, /变卦水泽节与本卦同属坎宫，是化出本宫，若应在抚子，古法主立族中孙侄/);
  assert.match(text, /子化子，双生有准/);
  assert.match(zhun.notices.join(''), /易告未来，不告已往/);
  // 程序不知问卦人的年纪，只列古法，不改倾向（这一卦仍按用神旺相、化进神判偏吉）
  assert.equal(zhun.verdict.level, 'good');

  const other = findCast('children', (reading, judge) => judge.points.some((point) => point.includes('化出他宫')));
  assert.ok(other, '应能找到子孙化子孙而变卦属他宫的卦');
  assert.match(other.judge.points.find((point) => point.startsWith('子孙化子孙')), /属[乾坎艮震巽离坤兑]宫，是化出他宫，若应在抚子，古法主立异姓之子/);
  const plain = findCast('children', (reading) => !reading.lines.some((line) => line.isMoving && line.relative === '子孙'));
  assert.ok(!plain.judge.points.some((point) => point.startsWith('子孙化子孙')));
  assert.match(plain.judge.notices.join(''), /子嗣章/);
});

test('用神克世作「来就我」只限求财（千金赋「外此数占，皆不宜用神而克世也」；婚姻章应爻「不宜克世」）', () => {
  const valuesOf = (code) => Array.from({ length: 6 }, (_, i) => [6, 7, 8, 9][(code >> (2 * i)) & 3]);
  const judgeAs = (code, topic) => judgeLiuYao(buildLiuYaoReading(valuesOf(code), castAt, { topic, gender: 'male' }));
  // 同一卦，妻财临应而克世：问求财是财来就我，问婚姻（男占，也以妻财为用神）不作来就我论
  assert.ok(judgeAs(85, 'wealth').points.some((point) => point.includes('用神临应而克世，用神来就我')));
  const love = judgeAs(85, 'love');
  assert.ok(love.points.some((point) => point.includes('用神临应而克世，求财以外不作来就我论')));
  assert.ok(!love.points.some((point) => point.includes('用神来就我')));
  const study = findCast('study', (reading, judge) => judge.points.some((point) => point.includes('用神克世，求财以外不作来就我论')));
  assert.ok(study, '应能找到父母克世而不是求财的卦');
  assert.ok(!study.judge.points.some((point) => point.includes('用神来就我')));
});
