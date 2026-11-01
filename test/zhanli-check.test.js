import test from 'node:test';
import assert from 'node:assert/strict';

import { castsOf, checkZhanli, mentionsOf } from '../scripts/check-zhanli.mjs';
import { loadDataFiles } from '../scripts/lib/dataFiles.mjs';

const entry = (original, applies, extra = {}) => ({ id: 'zengshan.test.001', title: '占例·测试', original, applies, ...extra });

test('占例自检：读出原文里的本卦、之卦', () => {
  assert.deepEqual(castsOf('如巳月己亥日，占夫妇不和，得需之大过卦。'), [{ from: '水天需', to: '泽风大过' }]);
  assert.deepEqual(castsOf('未月甲午日占天何日雨，得屯变益。'), [{ from: '水雷屯', to: '风雷益' }]);
  assert.deepEqual(castsOf('如午月丙午日占何日雨，得大壮之升。'), [{ from: '雷天大壮', to: '地风升' }]);
  assert.deepEqual(castsOf('又得离卦不动。'), [{ from: '离为火', to: null, still: true }]);
  assert.deepEqual(castsOf('因晴，占何日雨，得蹇卦。'), [{ from: '水山蹇', to: null, still: false }]);
  // 几占连写：按出现先后
  assert.deepEqual(castsOf('得小过之丰卦。……癸巳日又占，得屯之中孚。').map((cast) => cast.from), ['雷山小过', '水雷屯']);
});

test('占例自检：读出「申金子动」一类的地支六亲，不把「寅木子水」的子当子孙', () => {
  assert.deepEqual(mentionsOf('申金子动化进神'), [{ text: '申金子动', zhi: '申', relative: '子孙', moving: true }]);
  assert.deepEqual(mentionsOf('卯木父动，临于旬空').map((item) => [item.zhi, item.relative, item.moving]), [['卯', '父母', true]]);
  assert.deepEqual(mentionsOf('上爻酉父化子').map((item) => [item.zhi, item.relative, item.moving]), [['酉', '父母', true]]);
  assert.deepEqual(mentionsOf('幸寅木子水相生'), []);
  assert.deepEqual(mentionsOf('子孙父母同兴'), []);
});

test('占例自检：动爻与卦对不上报错，写进 doubts 并注明「自检」的只提示', () => {
  const ok = entry('如巳月己亥日，占夫妇不和，得需之大过卦。', [{ module: 'liuyao', hexagram: '水天需', line: [1, 4] }]);
  assert.deepEqual(checkZhanli(ok), { errors: [], warnings: [] });

  const wrongLines = entry('未月甲午日占天何日雨，得屯变益。', [{ module: 'liuyao', hexagram: '水雷屯', line: [2, 6] }]);
  assert.match(checkZhanli(wrongLines).errors.join(), /动爻应为 \[6\]，applies 写的是 \[2,6\]/);

  // 一个动爻拆成一条 applies 的写法合起来核对
  const split = entry('如卯月壬申日，占随官府上任，得比之井卦。', [2, 3].map((line) => ({ module: 'liuyao', hexagram: '水地比', line })));
  assert.deepEqual(checkZhanli(split).errors, []);

  const documented = entry('未月甲午日占天何日雨，得屯变益。', [{ module: 'liuyao', hexagram: '水雷屯', line: [2, 6] }], { doubts: ['卦图二爻另有动符，与「屯变益」不合，照图录入（自检已知）。'] });
  assert.deepEqual(checkZhanli(documented).errors, []);
  assert.equal(checkZhanli(documented).warnings.length, 1);
});

test('占例自检：原文只说爻、不写卦名时，按地支六亲核对卦（申金子动只能是土宫之卦）', () => {
  const original = '如卯月甲午日占晴，申金子动化进神，申酉日碧天如洗。';
  const wrong = entry(original, [{ module: 'liuyao', hexagram: '震为雷', line: 5 }]);
  assert.match(checkZhanli(wrong).errors.join(), /申在震为雷本卦是官鬼，不是子孙/);
  const right = entry(original, [{ module: 'liuyao', hexagram: '雷天大壮', line: 5 }]);
  assert.deepEqual(checkZhanli(right), { errors: [], warnings: [] });
});

test('仓库里的六爻占例都与原文的卦、动爻、地支六亲相符', () => {
  const problems = loadDataFiles().classics
    .filter(({ file }) => file.includes('/liuyao/'))
    .flatMap(({ doc }) => (doc.entries ?? []).filter((item) => String(item.title ?? '').startsWith('占例')))
    .flatMap((item) => checkZhanli(item).errors.map((message) => `${item.id}：${message}`));
  assert.deepEqual(problems, []);
});
