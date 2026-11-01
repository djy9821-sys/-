import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiuYaoReading } from '../src/utils/liuyao.js';
import { judgeLiuYao, LIUYAO_TOPICS } from '../src/utils/liuyaoJudge.js';
import { liuyaoReadingContextOf } from '../src/data/classics/library.js';
import { LIUYAO_TOPIC_PENDING } from '../src/data/classics/topicNames.js';
import { normalizeLiuYaoTopic } from '../src/utils/liuyaoRecord.js';

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
