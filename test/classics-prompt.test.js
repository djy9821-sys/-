import test from 'node:test';
import assert from 'node:assert/strict';

import { PROMPT_CLASSICS_LIMIT, classicsPromptLines, classicsPromptSection } from '../src/utils/classicsPrompt.js';

const hit = (id, status = 'translated', original = '原文') => ({
  entry: { id, title: `题${id}`, book: '紫微斗数全书', volume: '卷一', section: '诸星问答论', status, original, vernacular: '白话' },
  reason: '星曜·紫微',
});

test('古籍原文一节：标题、主语、条数上限可配，没有命中返回 null', () => {
  assert.equal(PROMPT_CLASSICS_LIMIT, 6);
  assert.equal(classicsPromptSection(null), null);
  assert.equal(classicsPromptSection([]), null);
  assert.equal(classicsPromptSection([{ entry: { title: '无原文' } }]), null);

  const section = classicsPromptSection([hit('a', 'reviewed', '问紫微所主若何？\n答曰：紫微属土。'), hit('b'), hit('c')], {
    title: '【古籍原文（命宫、身宫星曜）】', subject: '命宫身宫星曜', limit: 2,
  });
  assert.equal(section.split('\n')[0], '【古籍原文（命宫、身宫星曜）】');
  assert.ok(section.includes('- 《紫微斗数全书》·卷一·诸星问答论「题a」（匹配：星曜·紫微）：问紫微所主若何？ 答曰：紫微属土。'));
  assert.ok(section.includes('「题b」') && !section.includes('「题c」'));
  assert.ok(section.includes('古籍库里与命宫身宫星曜相关的原文共 3 条，这里只附最相关的 2 条。'));
  assert.ok(section.includes('（条目状态：已审、待审）'));
  assert.ok(!section.includes('白话'));

  const lines = classicsPromptLines([hit('a')]);
  assert.equal(lines.length, 2);
  assert.ok(lines[1].startsWith('以上原文取自公版古籍逐字录入（条目状态：待审）'));
});

test('标题以篇名开头时只留小题，出处里不写两遍篇名', () => {
  const lines = classicsPromptLines([{
    entry: { id: 'x', title: '论用神配气候得失·其八', book: '子平真诠', section: '论用神配气候得失', status: 'translated', original: '春木逢火。' },
    reason: '日干·乙',
  }]);
  assert.equal(lines[0], '- 《子平真诠》·论用神配气候得失「其八」（匹配：日干·乙）：春木逢火。');
});
