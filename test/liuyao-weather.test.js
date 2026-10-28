import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiuYaoPrompt, buildLiuYaoReading } from '../src/utils/liuyao.js';
import { judgeLiuYao, LIUYAO_TOPICS } from '../src/utils/liuyaoJudge.js';
import { liuyaoReadingContextOf } from '../src/data/classics/library.js';
import { normalizeLiuYaoTopic } from '../src/utils/liuyaoRecord.js';

// 2026-10-26 13:47：戊戌月 癸酉日，旬空戌亥。
const castAt = new Date(2026, 9, 26, 13, 47);
const weatherOf = (values) => {
  const reading = buildLiuYaoReading(values, castAt, { topic: 'weather' });
  return { reading, judge: judgeLiuYao(reading) };
};

test('天时晴雨、终身运势是正式类别，档案能存', () => {
  const values = LIUYAO_TOPICS.map((topic) => topic.value);
  assert.ok(values.includes('weather') && values.includes('life'));
  assert.equal(normalizeLiuYaoTopic('weather'), 'weather');
  assert.equal(normalizeLiuYaoTopic('life'), 'life');
});

test('天时：六爻安静为难定，主张再占', () => {
  const { judge } = weatherOf([7, 7, 7, 7, 7, 7]);
  assert.equal(judge.verdict.title, '难定');
  assert.equal(judge.verdict.weather, 'unsettled');
  assert.match(judge.verdict.text, /一卦不现，再占两卦/);
  // 不硬断，但按「静者逢值逢冲」列出父母、子孙之日供参考
  assert.equal(judge.timing[0], '六爻安静难断，最好再占得动爻');
  assert.ok(judge.timing.some((hint) => hint.startsWith('父母壬戌（上爻）安静') && hint.includes('或可有雨')));
  assert.ok(judge.timing.some((hint) => hint.startsWith('子孙甲子（初爻）安静') && hint.includes('或可转晴')));
  assert.ok(judge.points.at(-2).startsWith('倾向：难定'));
  assert.ok(judge.points.at(-1).startsWith('应期：'));
});

test('天时：子孙发动主晴，长生之日望晴', () => {
  // 雷地豫四爻子孙庚午发动 → 坤为地
  const { judge } = weatherOf([8, 8, 8, 9, 8, 8]);
  assert.equal(judge.verdict.title, '晴');
  assert.match(judge.verdict.text, /子孙主晴/);
  assert.equal(judge.yongShen.relative, '子孙');
  assert.equal(judge.yongShen.ganZhi, '庚午');
  assert.equal(judge.yongShen.state, '动');
  assert.ok(judge.timing.some((hint) => hint.includes('午日或未日')));
  assert.ok(judge.timing.some((hint) => hint.includes('寅日')), '火长生在寅');
  // 只断晴时，补一句「问雨」：子孙午火入墓于戌、绝于亥（雨遇财兴）
  assert.ok(judge.timing.some((hint) => hint.startsWith('问雨') && hint.includes('戌日') && hint.includes('亥日')));
  // 卯木兄弟静而逢日冲（酉日），暗动主轻风薄雾：晴而间有浮云
  assert.match(judge.verdict.text, /间有浮云/);
});

test('天时：父母与子孙同动，晴雨各应其时；父化兄风雨交作', () => {
  // 天水讼：初爻父母戊寅、上爻子孙壬戌发动 → 兑为泽
  const { judge } = weatherOf([6, 7, 8, 7, 7, 9]);
  assert.equal(judge.verdict.title, '晴雨各有其时');
  assert.equal(judge.verdict.weather, 'mixed');
  assert.match(judge.verdict.text, /不是半晴半雨/);
  assert.match(judge.verdict.text, /父化兄，风雨交作/);
  // 雨、晴各给应期；子孙壬戌旬空（癸酉日），动而逢空应冲空、填实
  assert.ok(judge.timing[0].startsWith('雨应寅日或亥日'));
  assert.ok(judge.timing[1].startsWith('晴应辰日冲空或戌日填实'));
  assert.equal(judge.yongShen.relative, '父母');
  assert.ok(judge.dynamics.some((text) => text.includes('木动生风')), '寅木发动生风');
});

test('天时：官鬼发动而父母不动为阴，兄化子孙则先阴后晴', () => {
  // 火泽睽：二爻官鬼丁卯、五爻兄弟己未发动（兄化子孙）→ 天雷无妄
  const { judge } = weatherOf([7, 9, 8, 7, 6, 7]);
  assert.equal(judge.verdict.title, '先阴后晴');
  assert.match(judge.verdict.text, /动者为先，变者为后/);
  assert.match(judge.verdict.text, /兄化子孙，云开日出/);
  assert.equal(judge.yongShen.relative, '官鬼');
  assert.deepEqual(judge.weather.kinds.sort(), ['clear', 'cloudy', 'overcast', 'wind']);
  assert.equal(judge.weather.now, 'overcast');
  assert.equal(judge.weather.later, 'clear');
  // 后来转晴看化出子孙壬申之日
  assert.ok(judge.timing.some((hint) => hint.startsWith('后晴应申日')));
});

test('天时：父母动而变出子孙为先雨后晴；官鬼化回头克，冲去克神之后才应', () => {
  // 山风蛊 → 风水涣：五爻父母丙子化子孙辛巳；三爻官鬼辛酉化午火回头克
  const { judge } = weatherOf([8, 7, 9, 8, 6, 7]);
  assert.equal(judge.verdict.title, '先雨后晴');
  assert.equal(judge.yongShen.relative, '父母');
  assert.ok(judge.timing.some((hint) => hint.includes('官鬼辛酉（三爻）化回头克，须待子日冲去克神方应')));
  // 后晴已断出，不再提示「问晴」
  assert.ok(!judge.timing.some((hint) => hint.startsWith('问晴')));
});

test('天时：子孙妻财化退神只说晴不久，父母化退神则转晴', () => {
  let retreatClear = null;
  let retreatRain = null;
  for (let code = 0; code < 4096 && !(retreatClear && retreatRain); code += 1) {
    const values = Array.from({ length: 6 }, (_, i) => [6, 7, 8, 9][(code >> (2 * i)) & 3]);
    const moving = values.filter((value) => value === 6 || value === 9).length;
    if (moving !== 1) continue;
    const { reading, judge } = weatherOf(values);
    const line = reading.lines.find((item) => item.isMoving);
    const retreat = line.changed && line.changed.relative === line.relative && line.changed.zhi !== line.zhi
      && ({ 子: '亥', 卯: '寅', 午: '巳', 酉: '申', 辰: '丑', 未: '辰', 戌: '未', 丑: '戌' })[line.zhi] === line.changed.zhi;
    if (!retreat || reading.lines.some((item) => item.marks.includes('日冲') && !item.isMoving)) continue;
    if (!retreatClear && line.relative === '子孙') retreatClear = judge;
    if (!retreatRain && line.relative === '父母') retreatRain = judge;
  }
  assert.ok(retreatClear && retreatRain);
  assert.equal(retreatClear.verdict.weather, 'clear');
  assert.ok(retreatClear.weather.notes.some((note) => note.includes('化退神，晴不久')));
  assert.equal(retreatRain.verdict.weather, 'rain-clear');
  assert.ok(retreatRain.timing.some((hint) => hint.startsWith('后转晴') && hint.includes('化退神')));
});

test('天时：回头克的应期待冲去克神之日；古籍上下文带上所有发动的六亲', () => {
  // 乾为天六爻皆动：初爻子孙甲子化乙未回头克
  const { reading, judge } = weatherOf([9, 9, 9, 9, 9, 9]);
  assert.ok(judge.timing.some((hint) => hint.includes('子孙甲子（初爻）化回头克，须待丑日冲去克神方应')));
  const ctx = liuyaoReadingContextOf(reading, judge);
  ['父母', '子孙', '妻财', '官鬼', '兄弟'].forEach((relative) => assert.ok(ctx.sixRelative.includes(relative), relative));
  assert.ok(ctx.topic.includes('天时'));
  const prompt = buildLiuYaoPrompt(reading, judge);
  assert.match(prompt, /【类别】天时晴雨 · 用神取父母/);
  assert.ok(prompt.includes('天时不论世应'));
});

test('终身运势：以世爻为用神，并提醒古法分占', () => {
  const reading = buildLiuYaoReading([7, 9, 8, 7, 6, 7], castAt, { topic: 'life' });
  const judge = judgeLiuYao(reading);
  assert.equal(judge.topicLabel, '终身运势');
  assert.equal(judge.yongShen.isShi, true);
  assert.equal(judge.notices.length, 1);
  assert.match(judge.notices[0], /身命章.*分开占/);
  assert.ok(judge.points.at(-2).startsWith('倾向：'));
});

test('产妇平安：夫占代占取妻财；鬼化妻财为凶，兄鬼同动反为有救', () => {
  const reading = buildLiuYaoReading([8, 7, 9, 8, 6, 7], castAt, { topic: 'maternity' });
  const judge = judgeLiuYao(reading);
  assert.equal(judge.topicLabel, '产妇平安');
  assert.equal(judge.yongShen.relative, '妻财');
  assert.ok(judge.auxiliary.some((text) => text.startsWith('胎前产后忌兄动看兄弟')));
  // 古籍上下文：产育 + 妻财 的条目（问产妇安否章）能命中，产育 + 子孙（产期章）只归子女孕育
  const ctx = liuyaoReadingContextOf(reading, judge);
  assert.ok(ctx.topic.includes('产育') && ctx.sixRelative.includes('妻财'));
  const childCtx = liuyaoReadingContextOf(reading, judgeLiuYao(reading, { topic: 'children' }));
  assert.ok(childCtx.topic.includes('产育') && childCtx.sixRelative.includes('子孙'));

  // 找一卦：官鬼动而化出妻财
  let found = null;
  for (let code = 0; code < 4096 && !found; code += 1) {
    const values = Array.from({ length: 6 }, (_, i) => [6, 7, 8, 9][(code >> (2 * i)) & 3]);
    const candidate = buildLiuYaoReading(values, castAt, { topic: 'maternity' });
    if (candidate.lines.some((line) => line.isMoving && line.relative === '官鬼' && line.changed?.relative === '妻财')) found = candidate;
  }
  assert.ok(found, '应能找到官鬼化妻财的卦');
  const bad = judgeLiuYao(found);
  assert.ok(bad.points.some((point) => point.includes('鬼化妻财命不牢')));
});
