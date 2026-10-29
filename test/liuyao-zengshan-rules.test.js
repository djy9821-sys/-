import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiuYaoPrompt, buildLiuYaoReading } from '../src/utils/liuyao.js';
import { assessStrength, judgeLiuYao, liuyaoNeedsGender, LIUYAO_SUBJECTS, topicSubjectDefault } from '../src/utils/liuyaoJudge.js';
import { buildLiuYaoRecord, describeLiuYaoRecord, LIUYAO_SUBJECT_LABELS, liuYaoRecordToInput } from '../src/utils/liuyaoRecord.js';
import { HEXAGRAM_MAP } from '../src/utils/hexagramLogic.js';

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

// 按《增删卜易》占例起卦：日期取月建、日辰与原书相同的一天正午（同 liuyao-cases.test.js）
const HEX_BITS = Object.fromEntries(Object.entries(HEXAGRAM_MAP).map(([key, hexagram]) => [hexagram.name, [...key].reverse().map(Number)]));
const bookCase = (hex, moving, date, meta) => {
  const [y, m, d] = date.split('-').map(Number);
  const values = HEX_BITS[hex].map((bit, i) => (moving.includes(i + 1) ? (bit ? 9 : 6) : (bit ? 7 : 8)));
  return judgeLiuYao(buildLiuYaoReading(values, new Date(y, m - 1, d, 12, 0), { gender: 'male', ...meta }));
};

test('回头克：化回头冲克如逢仇敌；临日月逢伤待时，寡不敌众则伤；世化回头克；卦变回头克皆以凶推', () => {
  // 占随官上任（卯月壬申日，比之井）：世临月建之官，化酉金回头冲克，又绝于申日
  const officer = bookCase('水地比', [2, 3], '2001-3-10', { topic: 'career' });
  assert.match(allText(officer), /化子孙辛酉回头冲克，如逢仇敌/);
  assert.match(allText(officer), /用神虽临月建，而日辰又来克，寡不敌众/);
  assert.equal(officer.verdict.level, 'bad');
  // 占谒贵（酉月丙寅日，蛊之蒙）：世临月建之官，被午火回头之克，须待子日冲去午火
  const visit = bookCase('山风蛊', [3], '2006-10-4', { topic: 'career' });
  assert.match(allText(visit), /用神临月建，逢伤亦伤，却有待时之用，待子日冲去克神/);
  // 占病（申月戊午日，遁之姤）：世爻午火临日辰，申金月建生亥水回头克世
  const ill = bookCase('天山遁', [2], '2001-8-23', { topic: 'health', subject: 'self' });
  assert.match(allText(ill), /用神虽临日辰，而克神得月建生扶，寡不敌众/);
  assert.equal(ill.verdict.level, 'bad');
  // 占开铺（寅月辛酉日，艮之明夷）：世化回头之克，用神是财而不是世
  const shop = bookCase('艮为山', [1, 6], '2001-2-27', { topic: 'wealth' });
  assert.match(allText(shop), /世爻动而化癸酉回头克，所谋多凶/);
  assert.equal(shop.verdict.level, 'bad');
  // 代占则只提醒问卦的人自己
  const proxy = bookCase('艮为山', [1, 6], '2001-2-27', { topic: 'health', subject: 'parents' });
  assert.match(allText(proxy), /世爻动而化癸酉回头克，问卦的人自己也要当心/);
  // 占长子病（寅月癸酉日，震之兑）：卦变回头之克，少女亦难保
  const son = bookCase('震为雷', [2, 5], '2003-3-1', { topic: 'health', subject: 'children' });
  assert.match(allText(son), /卦变回头克（震为雷木化兑为泽金）/);
  assert.equal(son.verdict.level, 'bad');
  // 不是八纯卦内外同变的，不按卦变论（艮之颐，卦宫土化木，原书吉）
  const promoted = bookCase('艮为山', [1, 3], '2007-3-3', { topic: 'career' });
  assert.doesNotMatch(allText(promoted), /卦变回头克/);
  assert.equal(promoted.verdict.level, 'good');
});

test('世应与三合：用神持世；应爻休囚安静生之不起；合局之爻月破无扶，待填实', () => {
  // 占将来有官否再占（亥月己丑日，水地比）：「命若无官，难得……官星以持世也」
  const officer = bookCase('水地比', [], '2001-11-22', { topic: 'career' });
  assert.match(allText(officer), /用神持世，事在自己手里/);
  assert.equal(officer.verdict.level, 'good');
  // 占复起功名（寅月丙辰日，地泽临）：「九五来生，今被日克」
  const again = bookCase('地泽临', [], '2001-2-22', { topic: 'career' });
  assert.match(allText(again), /应爻虽生世，而休囚安静，生之不起/);
  assert.equal(again.verdict.level, 'mixed');
  // 占后遇功名（午月癸卯日，艮之观）：「子水破而化空……作元神而无用」，申子辰目下不成局
  const later = bookCase('艮为山', [3, 5], '2001-6-9', { topic: 'career' });
  assert.match(allText(later), /申子辰欲合水局，但五爻子月破无生扶，目下不成局/);
  assert.doesNotMatch(allText(later), /申子辰合成水局/);
  assert.equal(later.verdict.level, 'mixed');
});

test('不看用神而断：六冲变六合竟以吉断，久病逢冲不治、近病逢冲即愈，子孙变鬼万无一活', () => {
  // 占悔婚可成（未月丁巳日，离之旅）：「此卦从来难以吉断，因得屡验六冲变合……此婚一定还成」
  const marry = bookCase('离为火', [1], '2004-8-6', { topic: 'love' });
  assert.match(allText(marry), /六冲卦变六合者，不看用神，竟以吉断/);
  assert.equal(marry.verdict.level, 'good');
  // 占久病（戌月癸未日，乾之夬）：「久病逢冲莫治」
  const chronic = bookCase('乾为天', [6], '2003-11-6', { topic: 'health', subject: 'self', illness: 'chronic' });
  assert.equal(chronic.verdict.level, 'bad');
  // 占妻病（午月己卯日，震之丰）：「近病逢冲即愈」
  const recent = bookCase('震为雷', [3], '2003-7-5', { topic: 'health', subject: 'spouse', illness: 'recent' });
  assert.equal(recent.verdict.level, 'good');
  // 卦变回头克「新病亦主危亡」，压过近病逢冲：占长子病（震之兑）当新病问也断偏弱
  const son = bookCase('震为雷', [2, 5], '2003-3-1', { topic: 'health', subject: 'children', illness: 'recent' });
  assert.equal(son.verdict.level, 'bad');
  // 占子易养否（亥月丙辰日，姤之旅）：「亥水子孙临月建……旺莫旺于此也……岂知子孙变鬼」
  const child = bookCase('天风姤', [2, 5], '2004-12-3', { topic: 'children' });
  assert.match(allText(child), /子孙变鬼，大凶之兆/);
  assert.equal(child.verdict.level, 'bad');
});

test('出行世动逢合；进神化空仍进；用神临应克世来就我', () => {
  // 占出行（申月丙子日，明夷之小过）：「合住，必有事绊，不能动身」
  const trip = bookCase('地火明夷', [1, 4], '2002-9-5', { topic: 'travel', subject: 'self' });
  assert.match(allText(trip), /世动逢合（化合或日辰合住），必有事故阻滞不行/);
  assert.equal(trip.verdict.level, 'bad');
  // 占考试中否（酉月乙丑日，兑之讼）：「此卦动散化空亦能中矣」
  const exam = bookCase('兑为泽', [1, 6], '2005-10-8', { topic: 'study' });
  assert.match(allText(exam), /化壬戌进神，越走越旺，变爻旬空（进退不因空破而改）/);
  assert.equal(exam.verdict.level, 'good');
  // 占求财（未月庚子日，风天小畜）：「应临月建之财以克世，许之必得」
  const money = bookCase('风天小畜', [], '2001-8-5', { topic: 'wealth' });
  assert.match(allText(money), /用神临应而克世，用神来就我/);
  assert.equal(money.verdict.level, 'good');
});
