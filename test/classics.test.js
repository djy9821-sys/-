import test from 'node:test';
import assert from 'node:assert/strict';

import { CLASSICS, cite, classicsOf } from '../src/data/classics.js';
import { describeLiuYaoSources, LIUYAO_RULE_SOURCES } from '../src/data/liuyaoSources.js';
import { SHENSHA_ORDER, SHENSHA_SOURCES } from '../src/utils/baziShensha.js';
import { buildBaziChart } from '../src/utils/baziChart.js';
import { buildBaziPrompt } from '../src/utils/baziPrompt.js';
import { buildLiuYaoPrompt, buildLiuYaoReading } from '../src/utils/liuyao.js';

test('古籍登记表：每本书有书名、作者、所属模块，cite 组出《书名》·篇章', () => {
  Object.entries(CLASSICS).forEach(([key, classic]) => {
    assert.equal(classic.key, key);
    assert.ok(classic.title && classic.author && ['bazi', 'ziwei', 'liuyao'].includes(classic.module), key);
  });
  assert.equal(cite('sanming', '卷二·论天乙贵人'), '《三命通会》·卷二·论天乙贵人');
  assert.equal(cite('zengshan'), '《增删卜易》');
  assert.equal(cite('unknown', '某篇'), '某篇');
  assert.deepEqual(classicsOf('liuyao').map((item) => item.title), ['京氏易传', '卜筮正宗', '增删卜易', '梅花易数']);
  assert.deepEqual(classicsOf('bazi').map((item) => item.title), ['三命通会', '渊海子平', '滴天髓', '子平真诠', '协纪辨方书']);
});

test('二十九种神煞都有出处与查法，引用的书都在登记表里', () => {
  SHENSHA_ORDER.forEach((name) => {
    const source = SHENSHA_SOURCES[name];
    assert.ok(source, name);
    assert.ok(CLASSICS[source.classic], `${name} 的出处 ${source.classic} 未登记`);
    assert.ok(source.section && source.rule.length > 10, name);
  });
  assert.equal(Object.keys(SHENSHA_SOURCES).length, SHENSHA_ORDER.length);
  assert.match(SHENSHA_SOURCES['天乙贵人'].quote, /^甲戊庚牛羊/);
  assert.match(SHENSHA_SOURCES['天乙贵人'].variant, /渊海子平/);
  assert.match(SHENSHA_SOURCES['羊刃'].variant, /阴刃/);
});

test('六爻规则出处：每条引用登记过的书，汇总句分装卦、起卦、断法三段', () => {
  LIUYAO_RULE_SOURCES.forEach((item) => {
    assert.ok(CLASSICS[item.classic], item.topic);
    assert.ok(item.topic && item.section && item.rule, item.topic);
  });
  const text = describeLiuYaoSources();
  assert.match(text, /^装卦依据《京氏易传》/);
  assert.match(text, /起卦依据《增删卜易》·以钱代蓍法与《梅花易数》/);
  assert.match(text, /断法依据《增删卜易》（月建、日辰、旬空、取用神/);
  assert.ok(!text.includes('断法依据《增删卜易》（铜钱起卦'));
});

test('提示词带上出处：八字列本命所见神煞的查法，六爻附装卦与断法依据', () => {
  const chart = buildBaziChart({ calendarType: 'solar', year: 1990, month: 5, day: 20, hourIndex: 6, gender: 'male' });
  const prompt = buildBaziPrompt({ chart, scope: 'natal' });
  const section = prompt.split('【神煞查法出处】')[1].split('\n\n')[0];
  const seen = new Set(chart.pillars.flatMap((pillar) => pillar.shensha));
  seen.forEach((name) => assert.ok(section.includes(`- ${name}：《`), name));
  assert.match(section, /神煞口诀主要取自《三命通会》/);

  const reading = buildLiuYaoReading([8, 7, 7, 7, 7, 7], new Date(2026, 9, 26, 10, 0));
  const liuyaoPrompt = buildLiuYaoPrompt(reading);
  assert.match(liuyaoPrompt, /【依据】装卦依据《京氏易传》/);
  assert.ok(liuyaoPrompt.indexOf('【依据】') < liuyaoPrompt.indexOf('【请回答】'));
});
