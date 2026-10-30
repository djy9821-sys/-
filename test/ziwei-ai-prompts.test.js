import test from 'node:test';
import assert from 'node:assert/strict';

import { CHARACTER_PROMPT_TAIL, CHARACTER_PROMPT_TEMPLATE, MARRIAGE_PROMPT_TEMPLATE, WEALTH_PROMPT_TEMPLATE, generateChartDataPrompt, natalYearText } from '../src/utils/aiPrompts.js';
import { createZiweiHoroscope } from '../src/utils/ziweiBirth.js';

/** 「正本清源、按古籍批命」：话术模板里不许再有贴标签、骂人、风水改运那一套。 */
const FORBIDDEN = /鉴渣|渣男|渣女|鉴茶|绿茶|毒舌|骂|婊|捞女|巨婴|出轨|播种机|打分|评级|风水|改运|Ayawawa/;

test('性情与婚恋话术：按《紫微斗数全书》分宫论，引原书篇目，不贴标签不打分', () => {
  assert.match(CHARACTER_PROMPT_TEMPLATE, /^\*\*--- 紫微斗数性情与婚恋分析 ---\*\*/);
  assert.match(CHARACTER_PROMPT_TEMPLATE, /《紫微斗数全书》/);
  ['命宫', '身宫', '福德宫', '夫妻宫', '迁移宫'].forEach((palace) => assert.match(CHARACTER_PROMPT_TEMPLATE, new RegExp(palace)));
  ['形性赋', '太微赋', '论诸星同垣', '论妻妾', '女命骨髓赋'].forEach((chapter) => assert.match(CHARACTER_PROMPT_TEMPLATE, new RegExp(chapter)));
  assert.match(CHARACTER_PROMPT_TEMPLATE, /存疑/);
  assert.match(CHARACTER_PROMPT_TEMPLATE, /不能断定一个人的品行/);
  // 「不用贬损、嘲讽的词，不给人打分」这类禁令句本身会提到打分、改运：去掉以「不」起头的禁令后，正文不得再出现这些词。
  const body = CHARACTER_PROMPT_TEMPLATE.replace(/不[^，。；\n]*/g, '');
  assert.doesNotMatch(body, FORBIDDEN);
  assert.match(CHARACTER_PROMPT_TAIL, /补充情况/);
});

test('姻缘、财运话术：引原书篇目、存疑，不涉风水改运', () => {
  [MARRIAGE_PROMPT_TEMPLATE, WEALTH_PROMPT_TEMPLATE].forEach((template) => {
    assert.match(template, /《紫微斗数全书》/);
    assert.match(template, /存疑/);
    const body = template.replace(/不[^，。；\n]*/g, '');
    assert.doesNotMatch(body, FORBIDDEN);
  });
});

test('命盘十二宫数据：每宫一行，列主星、四化，没有渣男渣女字样', () => {
  const horoscope = createZiweiHoroscope({ calendarType: 'solar', birthDate: '1990-05-20', timeIndex: 6, gender: 'male' });
  const text = generateChartDataPrompt(horoscope, { gender: 'male' });
  // 生年干支按农历年（全书「壬甲生人」之类按此），标阳男阴女。
  assert.match(text, /^--- 命盘十二宫数据 ---\n- 生年干支：庚午（农历一九九〇年四月廿六，午时）；阳男\n- 五行局：土五局；命主：巨门；身主：火星\n/);
  assert.match(natalYearText(horoscope, 'female'), /^生年干支：庚午（[^）]*）；阳女$/);
  assert.equal(natalYearText(null), '');
  const lines = text.trim().split('\n');
  assert.equal(lines.length, 15);
  // 从命宫起按兄弟、夫妻……父母的顺序；命宫同时是身宫；主星带庙旺与四化；每宫有长生与大限年岁。
  assert.deepEqual(lines.slice(3).map((line) => line.match(/^- \*\*(\S+?)\(/)[1]), ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母']);
  assert.match(text, /- \*\*命宫\(丁亥\)·身宫\*\*：主星\[紫微\(旺\)、七杀\(平和\)\]/);
  assert.match(text, /疾厄\(壬午\)\*\*：主星\[天同\(陷，化忌\)、太阴\(不得地，化科\)\]/);
  // 空宫写明借的是哪一宫、哪几颗星（对宫星带自己的庙旺、四化）。
  assert.match(text, /福德\(己丑\)\*\*：无主星（借对宫财帛·未：武曲\(庙，化权\)、贪狼\(庙\)），辅星\[天魁\]，长生\[衰\]，大限\[25-34岁\]/);
  assert.match(text, /田宅\(戊寅\)\*\*：无主星（借对宫子女·申：太阳\(得地，化禄\)、巨门\(庙\)）/);
  assert.doesNotMatch(text, /渣/);
  assert.equal(generateChartDataPrompt(null), '--- 命盘十二宫数据 ---\n数据获取失败\n');
});
