import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiuYaoPrompt, buildLiuYaoReading } from '../src/utils/liuyao.js';
import { assessStrength, judgeLiuYao, LIUYAO_TOPICS, relationOf } from '../src/utils/liuyaoJudge.js';
import { LIUYAO_TOPIC_LABELS } from '../src/utils/liuyaoRecord.js';

// 2026-10-26 13:47：丙午年 戊戌月 癸酉日 己未时，旬空 戌亥，月建戌，日辰酉。
const castAt = new Date(2026, 9, 26, 13, 47);
const time = buildLiuYaoReading([7, 7, 7, 7, 7, 7], castAt).time;

test('五行生克关系', () => {
  assert.equal(relationOf('木', '水'), 'generated');
  assert.equal(relationOf('木', '火'), 'drained');
  assert.equal(relationOf('木', '土'), 'spent');
  assert.equal(relationOf('木', '金'), 'controlled');
  assert.equal(relationOf('木', '木'), 'same');
});

test('类别表与档案里的类别名称一致', () => {
  assert.deepEqual(LIUYAO_TOPICS.map((topic) => topic.value), Object.keys(LIUYAO_TOPIC_LABELS));
  LIUYAO_TOPICS.forEach((topic) => assert.equal(topic.label, LIUYAO_TOPIC_LABELS[topic.value]));
});

test('月建日辰下的旺衰：临月建、月破、真空与假空', () => {
  assert.equal(time.monthZhi, '戌');
  assert.equal(time.dayZhi, '酉');
  // 戌土静爻：临月建 +3，日辰酉金泄气 -1，又旬空但月建比扶 → 假空 -1，合计 1 为平
  const xu = assessStrength({ zhi: '戌', element: '土', isMoving: false, marks: ['旬空'] }, time);
  assert.equal(xu.score, 1);
  assert.equal(xu.level, '平');
  assert.equal(xu.emptyKind, '假空');
  assert.ok(xu.notes.includes('临月建'));
  // 不空的戌土静爻就是旺相
  assert.equal(assessStrength({ zhi: '戌', element: '土', isMoving: false, marks: [] }, time).level, '旺相');
  // 辰土静爻：冲月建为月破
  const chen = assessStrength({ zhi: '辰', element: '土', isMoving: false, marks: ['月破'] }, time);
  assert.ok(chen.notes.includes('月破'));
  assert.equal(chen.level, '休囚');
  // 亥水静爻：月建戌土克制，日辰酉金生扶，旬空 → 有日辰生扶算假空
  const hai = assessStrength({ zhi: '亥', element: '水', isMoving: false, marks: ['旬空'] }, time);
  assert.equal(hai.emptyKind, '假空');
  // 卯木静爻：月建戌合卯为合起，日辰酉冲卯；月建耗力不算生扶 → 日破
  const mao = assessStrength({ zhi: '卯', element: '木', isMoving: false, marks: ['日冲'] }, time);
  assert.ok(mao.notes.includes('休囚又逢日冲，日破'));
  assert.ok(mao.notes.includes('月建合起'));
});

test('按类别取用神：单现、两现取动爻、不上卦取伏神', () => {
  // 乾为天：求财取妻财，妻财甲寅在二爻
  const reading = buildLiuYaoReading([7, 7, 7, 7, 7, 7], castAt, { question: '测试', topic: 'wealth' });
  const judge = judgeLiuYao(reading);
  assert.equal(judge.topicLabel, '求财');
  assert.equal(judge.yongShen.relative, '妻财');
  assert.equal(judge.yongShen.ganZhi, '甲寅');
  assert.equal(judge.yongShen.hidden, false);
  assert.ok(judge.points.length >= 6);
  assert.ok(judge.points.at(-2).startsWith('倾向：'));
  assert.ok(judge.points.at(-1).startsWith('应期：'));
  assert.ok(['good', 'mixed', 'bad'].includes(judge.verdict.level));

  // 火泽睽（官鬼两现：二爻卯、上爻寅），二爻发动 → 取动爻
  const two = judgeLiuYao(buildLiuYaoReading([7, 9, 8, 8, 6, 7], castAt), { topic: 'career' });
  assert.equal(two.yongShen.relative, '官鬼');
  assert.equal(two.yongShen.ganZhi, '丁卯');
  assert.match(two.yongShen.text, /两现，取发动之爻/);
  assert.match(two.points.join('\n'), /化庚寅退神/);

  // 风泽中孚：妻财不上卦，伏于五爻父母之下
  const hiddenJudge = judgeLiuYao(buildLiuYaoReading([7, 7, 8, 8, 9, 7], castAt), { topic: 'wealth' });
  assert.equal(hiddenJudge.yongShen.hidden, true);
  assert.equal(hiddenJudge.yongShen.ganZhi, '丙子');
  assert.match(hiddenJudge.yongShen.text, /伏于五爻父母辛巳之下/);
  assert.match(hiddenJudge.points.join('\n'), /游魂卦/);
  // 水火既济（初爻动）：妻财戊午伏于三爻兄弟己亥之下，飞神克伏神
  const jiji = judgeLiuYao(buildLiuYaoReading([9, 8, 7, 8, 7, 8], castAt), { topic: 'wealth' });
  assert.equal(jiji.yongShen.hidden, true);
  assert.match(jiji.points[2], /飞神克伏神/);
  assert.match(jiji.points.join('\n'), /子孙己卯（初爻）发动生用神/);
});

test('感情按性别取用神，没选性别时提示', () => {
  const reading = buildLiuYaoReading([7, 8, 7, 8, 7, 8], castAt);
  const male = judgeLiuYao(reading, { topic: 'love', gender: 'male' });
  const female = judgeLiuYao(reading, { topic: 'love', gender: 'female' });
  assert.equal(male.yongShen.relative, '妻财');
  assert.equal(female.yongShen.relative, '官鬼');
  const missing = judgeLiuYao(reading, { topic: 'love' });
  assert.equal(missing.genderMissing, true);
  assert.equal(missing.yongShen.isShi, true);
  assert.equal(missing.notices.length, 1);
});

test('一般吉凶以世爻为用神，六冲卦与六合卦有提示', () => {
  const pure = judgeLiuYao(buildLiuYaoReading([7, 7, 7, 7, 7, 7], castAt, { topic: 'general' }));
  assert.equal(pure.yongShen.isShi, true);
  assert.ok(pure.structure.some((item) => item.includes('六冲')));
  assert.match(pure.dynamics[0], /六爻安静/);
  // 地天泰：六合卦
  const tai = judgeLiuYao(buildLiuYaoReading([7, 7, 7, 8, 8, 8], castAt, { topic: 'general' }));
  assert.ok(tai.structure.some((item) => item.includes('六合')));
});

test('六十四卦 × 全部类别都能生成断卦要点', () => {
  for (let code = 0; code < 64; code += 1) {
    const values = Array.from({ length: 6 }, (_, i) => ((code >> i) & 1 ? 7 : 8));
    // 再让两个爻发动，覆盖动变逻辑
    values[code % 6] = values[code % 6] === 7 ? 9 : 6;
    values[(code + 3) % 6] = values[(code + 3) % 6] === 7 ? 9 : 6;
    const reading = buildLiuYaoReading(values, castAt);
    LIUYAO_TOPICS.forEach((topic) => {
      ['', 'male', 'female'].forEach((gender) => {
        const judge = judgeLiuYao(reading, { topic: topic.value, gender });
        assert.ok(judge.yongShen.ganZhi, `${reading.hexagram.name} ${topic.value}`);
        assert.ok(judge.points.every((point) => typeof point === 'string' && point.length > 0));
        assert.ok(Number.isFinite(judge.score));
        assert.ok(judge.timing.length >= 1 && judge.timing.length <= 3);
      });
    });
  }
});

test('提示词附上类别与程序初判', () => {
  const reading = buildLiuYaoReading([9, 8, 7, 8, 7, 8], castAt, { question: '问收款', topic: 'wealth', method: 'number', castNote: '报数 3、5' });
  const judge = judgeLiuYao(reading);
  const prompt = buildLiuYaoPrompt(reading, judge);
  assert.match(prompt, /【类别】求财 · 用神取妻财/);
  assert.match(prompt, /报数起卦（报数 3、5）/);
  assert.match(prompt, /【程序初判】/);
  assert.ok(prompt.includes(`- ${judge.points[0]}`));
  // 不传初判时保持原样
  assert.doesNotMatch(buildLiuYaoPrompt(reading), /【程序初判】/);
});
