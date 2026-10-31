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
  assert.match(allText(visit), /用神临月建，逢伤亦伤，却有待时之用，目下不成，待子日冲去克神则必成/);
  // 月将章其七「待至冲去伤爻之日……图事必成」：回头克不扣分，原书「定得见」
  assert.equal(visit.verdict.level, 'good');
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

test('行人三合冲开而来；世爻独发与日月共成三合；寻地世爻化回头克非吉地', () => {
  // 占伯何日来（未月戊戌日，屯之随）：「父母为用神，克世者速至」；用神在申子辰局中，行人章「用神三合，冲开之月日而来」
  const uncle = bookCase('水雷屯', [4], '2001-8-3', { topic: 'travel', subject: 'parents' });
  assert.match(allText(uncle), /用神在局中，被合住，冲开之月日而来/);
  assert.equal(uncle.verdict.level, 'good');
  // 占墓地（寅月戊午日，颐之无妄）：「日月世爻共成三合，青龙戏水」
  const tomb = bookCase('山雷颐', [4, 5], '2001-2-24', { topic: 'gravesite' });
  assert.match(allText(tomb), /寅午戌合成火局，生用神/);
  assert.equal(tomb.verdict.level, 'good');
  // 占以父柩附葬祖茔（子月丙申日，复之坤）：「世爻被克，不宜附葬」；寻地章「化回头克……皆非吉地」
  const rebury = bookCase('地雷复', [1], '2007-1-2', { topic: 'gravesite' });
  assert.match(allText(rebury), /世爻动而化破、化墓绝、化退或化回头克，但逢一者，皆非吉地/);
  assert.equal(rebury.verdict.level, 'bad');
});

test('六冲章：用神旺虽冲不破、失陷凶而又凶；卦体的世应冲合不重复计分；静应不旺克不动世（动静生克章）', () => {
  // 占流年（未月癸亥日，艮为山）：「官星持世，长生于亥日，业已成矣」，不以六冲、申金应爻克世为嫌
  const year = bookCase('艮为山', [], '2005-8-7', { topic: 'career' });
  assert.match(allText(year), /本卦六冲本主散、不久，但用神旺相，虽冲不破/);
  assert.match(allText(year), /应爻虽克世，而安静不旺，克之不动/);
  assert.match(allText(year), /世应相冲（六冲卦体）/);
  assert.equal(year.verdict.level, 'good');
  // 占子久出不归（酉月乙未日，坤为地）：「虽是六冲卦，此子必归」——行人用神旺相安静，冲动之日必归
  const son = bookCase('坤为地', [], '2001-9-29', { topic: 'travel', subject: 'children' });
  assert.match(allText(son), /用神旺相安静，静待冲动之卯日必归/);
  assert.equal(son.verdict.level, 'good');
  // 六合卦的世应相合同理只记卦体
  const he = bookCase('天地否', [], '2026-10-26', { topic: 'wealth' });
  assert.match(allText(he), /世应相合（六合卦体）/);
});

test('日辰章：用神临日辰，单个动爻克不为害，仇神同动生忌神则寡不敌众；伏神自身空破被克终不能出', () => {
  // 占借贷（未月丁卯日，火地晋）：「虽则兄爻持世而曰无财，所喜卯日即是财星」——酉金兄爻暗动不克临日辰之财
  const loan = bookCase('火地晋', [], '2006-8-6', { topic: 'wealth' });
  assert.match(allText(loan), /兄弟己酉（四爻）暗动为忌神，但用神临日辰，如山如冈，逢动爻之克亦不为害/);
  assert.equal(loan.verdict.level, 'good');
  // 占母血崩（戌月己卯日，同人之解）：卯木父母临日辰，但戌土、丑土仇神同动生申金忌神，「父母爻既无水养，且化退神」
  const mother = bookCase('天火同人', [2, 3, 5, 6], '2001-10-24', { topic: 'health', subject: 'parents' });
  assert.match(allText(mother), /妻财壬申（五爻）发动为忌神克用神/);
  assert.equal(mother.verdict.level, 'bad');
  // 占求财再占（辰月乙卯日，睽之损）：「子财空伏于五爻未土之下，伏而又空，空而被克，知其无财而无疑也」
  const again = bookCase('火泽睽', [4], '2001-4-22', { topic: 'wealth' });
  assert.match(allText(again), /伏神休囚值空破、被日月冲克、墓绝于日月飞爻，虽则日月动爻冲克飞神，伏而又空、空而被克者，虽有如无，终不能出/);
  assert.equal(again.verdict.level, 'bad');
  // 占子病（酉月丙辰日，地风升）：只是休囚无气的伏神，飞神丑土旬空，「空下伏神，易于引拔」
  const child = bookCase('地风升', [], '2004-10-4', { topic: 'health', subject: 'children' });
  assert.match(allText(child), /伏神易出（飞神空破衰墓）/);
});

test('六合章：用神在局内被合不作局克论；官局生应出现无情至多偏弱；旬空章动不为空', () => {
  // 占父近病（卯月癸酉日，萃之否）：「未土父爻动化进神，戌值旬空，近病逢空即愈」，不以亥卯未木局克父为嫌
  const father = bookCase('泽地萃', [6], '2001-3-11', { topic: 'health', subject: 'parents', illness: 'recent' });
  assert.match(allText(father), /亥卯未合成木局，用神在局内，随局合住，不以局克用神论/);
  assert.match(allText(father), /用遇旬空，近病何须忧虑/);
  assert.equal(father.verdict.level, 'good');
  // 占官缺得否（申月乙亥日，井之节）：「巳酉丑合成官局而生应爻，不来生世，正所谓出现无情，此缺不得」
  const post = bookCase('水风井', [1, 3], '2002-9-4', { topic: 'career' });
  assert.match(allText(post), /却生应爻不生世，出现无情，利于他人，所求不得/);
  assert.equal(post.verdict.level, 'bad');
  // 占本人婚姻（子月癸酉日，恒之鼎）：「酉官持世，戌土财爻动而生世……戌土虽值旬空，动不为空，明日出空之日，求之必允」
  const marry = bookCase('雷风恒', [6], '2002-1-5', { topic: 'love', gender: 'male' });
  assert.match(allText(marry), /旬空，但有气（动、冲、生扶），不为空，出空即实/);
  assert.match(allText(marry), /用神临应而生世，用神来就我/);
  assert.match(allText(marry), /世持官鬼、应持妻财，阴阳得位/);
  assert.equal(marry.verdict.level, 'good');
  // 占女家婚事（寅月丙午日，临之既济）：「财被回头克，又逢丑土之克……婚姻虽成，终有他变」
  const bride = bookCase('地泽临', [2, 3, 5], '2001-2-12', { topic: 'love', gender: 'female' });
  assert.match(allText(bride), /妻财癸亥（五爻）动而化回头克，财官不能相生，婚姻虽成，终有他变/);
});

test('产妇无忌即无碍；行人化出必到；世化回头克定见凶危、世被日辰克受累；寻地六冲必无气脉', () => {
  // 占妹临产（午月戊辰日，火地晋）：「月令克之，日建生之，许之无碍」
  const birth = bookCase('火地晋', [], '2001-7-4', { topic: 'maternity', subject: 'siblings' });
  assert.match(allText(birth), /兄鬼不动，用神不临空破墓绝，又无动爻克制，许之无碍/);
  assert.equal(birth.verdict.level, 'good');
  // 占主人何日回（寅月癸亥日，大畜之泰）：「子水财爻化出巳火父，动爻不克变爻，巳日必到」
  const master = bookCase('山天大畜', [5], '2001-3-1', { topic: 'travel', subject: 'parents' });
  assert.match(allText(master), /用神由动爻化出，动爻不克变爻，巳日必到/);
  assert.equal(master.verdict.level, 'good');
  // 占开铺（寅月辛酉日，艮之明夷）：「独嫌日辰克世，世化回头之克，生少克多，又是六冲卦」
  const shop = bookCase('艮为山', [1, 6], '2001-2-27', { topic: 'wealth' });
  assert.match(allText(shop), /世爻被日辰克而不旺，问卦人自身受累/);
  assert.equal(shop.verdict.level, 'bad');
  // 寻地章「若得六冲卦……冲者散也，必无气脉」：六冲卦不变合的至多偏弱
  const site = bookCase('乾为天', [], '2026-10-26', { topic: 'gravesite' });
  assert.match(allText(site), /卦逢六冲，飞砂走石，必无气脉/);
  assert.equal(site.verdict.level, 'bad');
});

test('终身财福章：世居空位无生终身无成；旺财持世多自成家；兄爻持世而不旺永无发福之秋', () => {
  // 酉月辛未日得颐：「财爻持世，虽有未日扶拱，不宜旬空，且卦中无火生助……难许成家」
  const empty = bookCase('山雷颐', [], '2007-10-4', { topic: 'life', subject: 'self' });
  assert.match(allText(empty), /终身财福（终身财福章）：世居空位，又无日月动爻来生，终身作事无成/);
  assert.equal(empty.verdict.level, 'bad');
  // 戌月辛亥日得比之观：「世爻虽空，月建合之，亥日生之……卯年一定成家」——得日辰来生，不作空论
  const born = bookCase('水地比', [6], '2001-10-15', { topic: 'life', subject: 'self' });
  assert.doesNotMatch(allText(born), /世居空位/);
  assert.equal(born.verdict.level, 'good');
  // 午月丙戌日得节：「旺财临世，平素手有余钱」
  const cai = bookCase('水泽节', [], '2004-7-6', { topic: 'life', subject: 'self' });
  assert.match(allText(cai), /旺财持世，自强自旺，多自成家/);
  assert.equal(cai.verdict.level, 'good');
  // 申月壬子日得泰之临：「兄爻持世，永无发福之秋，且世爻逢退，难许长年」
  const xiong = bookCase('地天泰', [3], '2001-8-17', { topic: 'life', subject: 'self' });
  assert.match(allText(xiong), /兄爻持世而不旺，永无发福之秋/);
  assert.equal(xiong.verdict.level, 'bad');
  // 占寿得中孚，世兄弟未土「巳日生之，月建扶之」：世旺不论；替别人问也不论
  assert.doesNotMatch(allText(bookCase('风泽中孚', [], '2001-4-12', { topic: 'life', subject: 'self' })), /终身财福/);
  assert.doesNotMatch(allText(bookCase('山雷颐', [], '2007-10-4', { topic: 'life', subject: 'parents' })), /终身财福/);
});

test('乡试会试章：旺官持世功名可望（日月动爻合成官局亦是）；世动化出官鬼回头克世，化鬼更凶', () => {
  // 卯月甲申日占会试得艮之益：「寅木旺官持世……一定高捷」
  const wang = bookCase('艮为山', [1, 3, 5], '2001-3-22', { topic: 'study' });
  assert.match(allText(wang), /考试中否（乡试会试章）：旺官持世，功名可望/);
  assert.equal(wang.verdict.level, 'good');
  // 戌月甲寅日占会试能联捷否得小过：「日月合成官局，旺相当时，卦之全美」
  const ju = bookCase('雷山小过', [4, 6], '2001-10-18', { topic: 'study' });
  assert.match(allText(ju), /旺官持世（日月动爻合成官局），功名可望/);
  assert.equal(ju.verdict.level, 'good');
  // 卯月戊辰日占乡试得离之既济：「变出子水之鬼回头克世，客死于途中」
  const hua = bookCase('离为火', [4, 5, 6], '2001-3-6', { topic: 'study' });
  assert.match(allText(hua), /世动化出官鬼回头克世，化鬼更凶/);
  assert.equal(hua.verdict.level, 'bad');
});

test('功名诸章：子孙持世，子孙克官，休问功名，倾向至多偏弱', () => {
  // 戌月丁卯日占终身功名有无得需：「子孙持世，休问功名……终身不许成名」
  const zi = bookCase('水天需', [], '2001-10-31', { topic: 'career' });
  assert.match(allText(zi), /功名（升选候补章、终身功名有无章）：子孙持世，子孙克官，休问功名/);
  assert.equal(zi.verdict.level, 'bad');
  // 申月戊寅日占得差否得夬：「子孙持世，此差不得；世空亦不得」
  assert.equal(bookCase('泽天夬', [], '2002-9-7', { topic: 'career' }).verdict.level, 'bad');
  // 只论功名：同一卦问求财不加这一条
  assert.doesNotMatch(allText(bookCase('水天需', [], '2001-10-31', { topic: 'wealth' })), /休问功名/);
});

test('婚姻章：女占而子孙持世，克夫之神，未成者不成、已成者伤夫，倾向至多偏弱；男占不论', () => {
  // 巳月己亥日女占夫妇将来和好否得需之大过：「女占夫，不宜子孙持世，乃克夫之象……必有生离」
  const female = bookCase('水天需', [1, 4], '2001-6-5', { topic: 'love', gender: 'female' });
  assert.match(allText(female), /女占而子孙持世，克夫之象，未成者不成，已成者伤夫/);
  assert.equal(female.verdict.level, 'bad');
  // 巳月丁未日男占夫妻偕老否得无妄之观，世亦临子孙：「不独偕老，且许贤比周南」
  const male = bookCase('天雷无妄', [1, 4], '2003-6-3', { topic: 'love', gender: 'male' });
  assert.doesNotMatch(allText(male), /克夫/);
  assert.equal(male.verdict.level, 'good');
});
