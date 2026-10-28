import test from 'node:test';
import assert from 'node:assert/strict';

import { collectDataErrors, loadDataFiles, summarizeData } from '../scripts/lib/dataFiles.mjs';
import { validateCasesDoc, validateClassicsDoc, validateGlossaryDoc } from '../src/data/classics/schema.js';

const classicsDoc = (overrides = {}, entryOverrides = {}) => ({
  classic: 'ziwei',
  section: '诸星问答论',
  edition: '通行本',
  entries: [
    {
      id: 'ziwei.quanshu.zhuxing.001',
      title: '紫微星',
      original: '紫微属土，乃中天之尊星。',
      vernacular: '紫微五行属土，是中天最尊贵的星。',
      applies: [{ module: 'ziwei', star: '紫微', palace: '命宫' }],
      status: 'translated',
      ...entryOverrides,
    },
  ],
  ...overrides,
});

test('仓库里的古籍条目、术语词典、经典命例全部通过校验', () => {
  const files = loadDataFiles();
  const errors = collectDataErrors(files);
  assert.deepEqual(errors, []);
  const summary = summarizeData(files);
  assert.ok(summary.classics.total >= 2, '至少有示例条目');
  assert.ok(summary.glossary.total >= 2);
  assert.ok(summary.cases.total >= 1);
});

test('古籍条目：格式正确则无错', () => {
  assert.deepEqual(validateClassicsDoc(classicsDoc()), []);
});

test('古籍条目：抓出常见错误（书名不在登记表、id 不规范、半角标点、白话缺失、未知键）', () => {
  const messages = (doc) => validateClassicsDoc(doc).join('\n');
  assert.match(messages(classicsDoc({ classic: 'nobody' })), /不在登记表/);
  assert.match(messages(classicsDoc({}, { id: 'Bad Id' })), /id 须形如/);
  assert.match(messages(classicsDoc({}, { id: 'bazi.x.001' })), /须以「ziwei\.」开头/);
  assert.match(messages(classicsDoc({}, { original: '紫微属土, 乃中天之尊星.' })), /半角标点/);
  assert.match(messages(classicsDoc({}, { vernacular: '' })), /必须有 vernacular/);
  assert.deepEqual(validateClassicsDoc(classicsDoc({}, { vernacular: undefined, status: 'draft' })), []);
  assert.match(messages(classicsDoc({}, { applies: [{ module: 'ziwei', palace: '财富' }] })), /不在允许范围/);
  assert.match(messages(classicsDoc({}, { applies: [{ module: 'bazi', star: '紫微' }] })), /不允许的键 star/);
  assert.match(messages(classicsDoc({}, { extra: 1 })), /未知字段 extra/);
  const seenIds = new Set(['ziwei.quanshu.zhuxing.001']);
  assert.match(validateClassicsDoc(classicsDoc(), { seenIds }).join('\n'), /id 重复/);
});

test('古籍条目：宫位别名（交友/事业）按仆役/官禄接受，六爻卦名按六十四卦校验', () => {
  assert.deepEqual(validateClassicsDoc(classicsDoc({}, { applies: [{ module: 'ziwei', palace: '事业' }] })), []);
  const liuyao = classicsDoc({ classic: 'zengshan', section: '六冲章' }, { id: 'zengshan.liuchong.001', applies: [{ module: 'liuyao', hexagram: '乾为天', relation: '六冲' }] });
  assert.deepEqual(validateClassicsDoc(liuyao), []);
  const bad = classicsDoc({ classic: 'zengshan', section: '六冲章' }, { id: 'zengshan.liuchong.002', applies: [{ module: 'liuyao', hexagram: '天地人' }] });
  assert.match(validateClassicsDoc(bad).join('\n'), /「天地人」不在允许范围/);
});

test('术语词典与命例：抓出缺字段与超长', () => {
  const glossary = { module: 'bazi', entries: [{ term: '十神', brief: '一句话', explain: '太短' }] };
  assert.match(validateGlossaryDoc(glossary).join('\n'), /explain 太短/);
  const cases = { module: 'bazi', entries: [{ id: 'bazi.x.001', name: '某造', source: { title: '某书', section: '卷一' }, birth: { calendar: 'lunar', year: 1900, month: 13, day: 1, gender: 'male' }, original: '原文', status: 'draft' }] };
  assert.match(validateCasesDoc(cases).join('\n'), /birth\.month 须是 1–12/);
});

test('六爻占例用 cast：卦名、动爻、干支都校验', () => {
  const entry = (cast) => ({ module: 'liuyao', entries: [{ id: 'liuyao.zengshan.001', name: '占例', source: { classic: 'zengshan', section: '求财章' }, cast, original: '原文', status: 'draft' }] });
  assert.deepEqual(validateCasesDoc(entry({ hexagram: '地天泰', changed: '地泽临', movingLines: [3], monthGanZhi: '戊辰', dayGanZhi: '癸亥', topic: '求财' })), []);
  assert.match(validateCasesDoc(entry({ hexagram: '天地人', movingLines: [] })).join('\n'), /不是六十四卦全名/);
  assert.match(validateCasesDoc(entry({ hexagram: '乾为天', movingLines: [7] })).join('\n'), /movingLines/);
  assert.match(validateCasesDoc(entry({ hexagram: '乾为天', movingLines: [], dayGanZhi: '甲甲' })).join('\n'), /dayGanZhi 须是干支/);
  const withBirth = { module: 'liuyao', entries: [{ id: 'liuyao.x.001', name: 'x', source: { classic: 'zengshan', section: 'x' }, birth: {}, cast: { hexagram: '乾为天', movingLines: [] }, original: 'x', status: 'draft' }] };
  assert.match(validateCasesDoc(withBirth).join('\n'), /用 cast 不用 birth/);
  // 动爻须与本卦、之卦对得上
  assert.match(validateCasesDoc(entry({ hexagram: '水雷屯', changed: '风雷益', movingLines: [2, 6] })).join('\n'), /水雷屯之风雷益动爻应为 \[6\]，写的是 \[2,6\]/);
  assert.match(validateCasesDoc(entry({ hexagram: '天水讼', movingLines: [1, 2, 6] })).join('\n'), /有动爻须写 cast\.changed/);
  assert.deepEqual(validateCasesDoc(entry({ hexagram: '天水讼', changed: '泽雷随', movingLines: [6, 1, 2] })), []);
});

test('六爻占例的 expected：原书用神、断语归类、应期与应验', () => {
  const doc = (expected, source = {}) => ({ module: 'liuyao', entries: [{ id: 'liuyao.zengshan.015', name: '占例', source: { classic: 'zengshan', section: '天时章', ...source }, cast: { date: '酉月乙巳日', dayGanZhi: '乙巳', hexagram: '地风升', changed: '雷风恒', movingLines: [4], topic: '天时' }, expected, original: '原文', status: 'translated', vernacular: '白话' }] });
  assert.deepEqual(validateCasesDoc(doc({ yongShen: '子孙', verdict: '晴', timing: '午时', outcome: '日午时之后，满天红日无云' }, { entry: 'zengshan.zhanfa.015' })), []);
  assert.deepEqual(validateCasesDoc(doc({ yongShen: '世爻', verdict: '先雨后晴' })), []);
  assert.deepEqual(validateCasesDoc(doc({ verdict: '晴雨各有其时' })), []);
  const messages = validateCasesDoc(doc({ yongShen: '财爻', verdict: '大吉', timing: '', luck: 1 }, { entry: '015' })).join('\n');
  assert.match(messages, /expected\.yongShen 须是/);
  assert.match(messages, /expected\.verdict 须是/);
  assert.match(messages, /expected\.timing 须是非空字符串/);
  assert.match(messages, /expected 未知字段 luck/);
  assert.match(messages, /source\.entry 须是古籍条目 id/);
});
