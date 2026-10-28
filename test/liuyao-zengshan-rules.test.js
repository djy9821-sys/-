import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiuYaoPrompt, buildLiuYaoReading } from '../src/utils/liuyao.js';
import { assessStrength, judgeLiuYao, liuyaoNeedsGender, LIUYAO_SUBJECTS, topicSubjectDefault } from '../src/utils/liuyaoJudge.js';
import { buildLiuYaoRecord, describeLiuYaoRecord, LIUYAO_SUBJECT_LABELS, liuYaoRecordToInput } from '../src/utils/liuyaoRecord.js';

// 2026-10-26 13:47：戊戌月 癸酉日，旬空戌亥。
const castAt = new Date(2026, 9, 26, 13, 47);
const allValues = () => Array.from({ length: 4096 }, (_, code) => Array.from({ length: 6 }, (_, i) => [6, 7, 8, 9][(code >> (2 * i)) & 3]));
/** 在全部 4096 种起卦里找第一卦满足条件的。 */
const findCast = (meta, predicate, date = castAt) => {
  for (const values of allValues()) {
    const reading = buildLiuYaoReading(values, date, meta);
    const judge = judgeLiuYao(reading);
    if (predicate(reading, judge)) return { reading, judge };
  }
  return null;
};
const allText = (judge) => judge.points.join('\n');

test('替谁问：代占以那人的六亲为用神，类别不支持时不采用', () => {
  assert.deepEqual(LIUYAO_SUBJECTS.map((item) => item.value), Object.keys(LIUYAO_SUBJECT_LABELS));
  const values = [7, 8, 7, 9, 8, 7];
  const judgeOf = (meta) => judgeLiuYao(buildLiuYaoReading(values, castAt, meta));
  assert.equal(judgeOf({ topic: 'health' }).yongShen.isShi, true);
  const parent = judgeOf({ topic: 'health', subject: 'parents' });
  assert.equal(parent.yongShen.relative, '父母');
  assert.match(parent.yongShen.text, /^健康疾病（替父母长辈问）取父母为用神/);
  assert.deepEqual(parent.subject, { value: 'parents', label: '父母长辈' });
  assert.equal(judgeOf({ topic: 'travel', subject: 'children' }).yongShen.relative, '子孙');
  assert.equal(judgeOf({ topic: 'general', subject: 'staff' }).yongShen.relative, '妻财');
  assert.equal(judgeOf({ topic: 'health', subject: 'spouse', gender: 'male' }).yongShen.relative, '妻财');
  assert.equal(judgeOf({ topic: 'health', subject: 'spouse', gender: 'female' }).yongShen.relative, '官鬼');
  const noGender = judgeOf({ topic: 'health', subject: 'spouse' });
  assert.equal(noGender.genderMissing, true);
  assert.match(noGender.notices.join(''), /替配偶问请选择问卦人性别/);
  // 产妇平安默认是丈夫问妻子（妻财），产妇自己问取世爻，替妹妹问取兄弟
  assert.equal(topicSubjectDefault('maternity'), 'spouse');
  assert.equal(judgeOf({ topic: 'maternity' }).yongShen.relative, '妻财');
  assert.equal(judgeOf({ topic: 'maternity', subject: 'self' }).yongShen.isShi, true);
  assert.equal(judgeOf({ topic: 'maternity', subject: 'siblings' }).yongShen.relative, '兄弟');
  // 求财、事业等以所问之事为用神，替谁问不改用神
  const career = judgeOf({ topic: 'career', subject: 'parents' });
  assert.equal(career.subject, null);
  assert.equal(career.yongShen.relative, '官鬼');
  assert.equal(topicSubjectDefault('wealth'), null);
  // 官司以世为自己
  assert.equal(judgeOf({ topic: 'lawsuit' }).yongShen.isShi, true);
  // 什么时候要问卦人性别
  assert.equal(liuyaoNeedsGender('love', ''), true);
  assert.equal(liuyaoNeedsGender('health', 'spouse'), true);
  assert.equal(liuyaoNeedsGender('maternity', 'spouse'), false);
  assert.equal(liuyaoNeedsGender('maternity', ''), false);
  assert.equal(liuyaoNeedsGender('health', 'self'), false);
  assert.equal(liuyaoNeedsGender('wealth', 'spouse'), false);
});

test('替谁问与病程：档案存取、档案摘要与提示词', () => {
  const reading = buildLiuYaoReading([7, 8, 7, 9, 8, 7], castAt, { topic: 'health', subject: 'parents', illness: 'recent', question: '父亲咳嗽' });
  const record = buildLiuYaoRecord(reading, castAt);
  assert.equal(record.data.subject, 'parents');
  assert.equal(record.data.illness, 'recent');
  const back = liuYaoRecordToInput(record);
  assert.equal(back.subject, 'parents');
  assert.equal(back.illness, 'recent');
  assert.equal(describeLiuYaoRecord(record).topicText, '健康疾病（替父母长辈问）');
  const odd = liuYaoRecordToInput({ type: 'liuyao', data: { values: [7, 7, 7, 7, 7, 7], castAt: '2026-10-26 10:07', subject: 'boss', illness: 'old' } });
  assert.equal(odd.subject, '');
  assert.equal(odd.illness, '');
  const prompt = buildLiuYaoPrompt(reading, judgeLiuYao(reading));
  assert.match(prompt, /【类别】健康疾病（替父母长辈问）（新病） · 用神取父母/);
});

test('疾病章：近病逢冲即愈，久病逢冲难治', () => {
  const found = findCast({ topic: 'health' }, (reading) => reading.hexagram.relation === '六冲' && !reading.changed);
  const values = found.reading.lines.map((line) => line.value);
  const judgeOf = (illness) => judgeLiuYao(buildLiuYaoReading(values, castAt, { topic: 'health', illness }));
  const recent = judgeOf('recent');
  const chronic = judgeOf('chronic');
  assert.match(allText(recent), /近病逢冲，不药而愈/);
  assert.match(allText(chronic), /久病逢冲，不论用神衰旺，难以调治/);
  assert.equal(recent.illness, 'recent');
  assert.ok(recent.score - chronic.score >= 5);
  assert.match(allText(judgeOf('')), /近病逢冲即愈，久病逢冲难治/);
});

test('元神忌神衰旺章：忌神与元神同动，接续相生；贪合忘生', () => {
  const chain = findCast({ topic: 'wealth' }, (reading, judge) => judge.dynamics.some((text) => text.includes('接续相生')));
  assert.ok(chain, '应能找到忌神与元神同动的卦');
  assert.match(chain.judge.dynamics.join('\n'), /为元神.*与忌神同动，生用神/);
  const greedy = findCast({ topic: 'wealth' }, (reading, judge) => judge.dynamics.some((text) => text.includes('贪合忘生')));
  assert.ok(greedy, '应能找到元神化合、贪合忘生的卦');
});

test('日辰章：旺相静爻逢日冲为暗动，作元神、忌神论', () => {
  // 2026-02-15 庚寅月庚申日：寅木静爻临月建、逢日冲为暗动
  const found = findCast({ topic: 'career' }, (reading, judge) => judge.dynamics.some((text) => /寅（.爻）暗动为/.test(text)), new Date(2026, 1, 15, 12, 0));
  assert.ok(found, '应能找到暗动之爻');
});

test('六合章：两爻动、一爻静亦成三合局，局生用神为吉', () => {
  const found = findCast({ topic: 'wealth' }, (reading, judge) => judge.dynamics.some((text) => /合成.局/.test(text)));
  assert.ok(found, '应能找到合局的卦');
  assert.match(found.judge.dynamics.find((text) => /合成.局/.test(text)), /《增删卜易·六合章》/);
});

test('旬空章：真空者春土夏金秋木冬火，其余静而无扶的出空方有用', () => {
  // 寅月甲子日（旬空戌亥）：戌土静而无扶为真空，亥水为静空
  const time = { monthZhi: '寅', dayZhi: '子', dayGan: '甲', xunKong: ['戌', '亥'] };
  assert.equal(assessStrength({ zhi: '戌', element: '土', isMoving: false, marks: ['旬空'] }, time).emptyKind, '真空');
  const hai = assessStrength({ zhi: '亥', element: '水', isMoving: false, marks: ['旬空'] }, time);
  assert.equal(hai.emptyKind, '假空'); // 子日比扶
  const spring = { monthZhi: '卯', dayZhi: '午', dayGan: '甲', xunKong: ['戌', '亥'] };
  assert.equal(assessStrength({ zhi: '亥', element: '水', isMoving: false, marks: ['旬空'] }, spring).emptyKind, '静空');
  assert.equal(assessStrength({ zhi: '亥', element: '水', isMoving: true, marks: ['旬空'] }, spring).emptyKind, '假空');
});

test('行人章：问在外的人看来与不来，用神发动归鞭发矣，化进不返', () => {
  const coming = findCast({ topic: 'travel', subject: 'parents' }, (reading, judge) => !judge.yongShen.hidden && judge.yongShen.state === '动');
  assert.match(allText(coming.judge), /行人（行人章）：用神发动，明摇暗动归鞭发矣/);
  const away = findCast({ topic: 'travel', subject: 'parents' }, (reading, judge) => allText(judge).includes('动化进神，越行越远'));
  assert.ok(away, '应能找到用神化进神的卦');
  // 自己出行仍看世爻与出行章
  const self = judgeLiuYao(coming.reading, { topic: 'travel', subject: 'self' });
  assert.equal(self.yongShen.isShi, true);
  assert.doesNotMatch(allText(self), /行人（行人章）/);
});

test('官司：子孙发动必不成非，官鬼持世定然有讼', () => {
  const sons = findCast({ topic: 'lawsuit' }, (reading) => reading.lines.some((line) => line.isMoving && line.relative === '子孙'));
  assert.match(allText(sons.judge), /子孙发动，必不成非/);
  const ghost = findCast({ topic: 'lawsuit' }, (reading) => reading.lines[reading.hexagram.shi - 1].relative === '官鬼' && !reading.movingPositions.length);
  assert.match(allText(ghost.judge), /官鬼持世，定然有讼/);
});
