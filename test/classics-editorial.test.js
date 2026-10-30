import test from 'node:test';
import assert from 'node:assert/strict';

import { loadDataFiles } from '../scripts/lib/dataFiles.mjs';
import { buildGlossary, buildLibrary, searchGlossary } from '../src/data/classics/library.js';
import { readerNotesOf, readerSentenceOf, sentencesOf } from '../src/data/classics/editorial.js';

const files = loadDataFiles();

test('断句：按句号、分号断，「」（）里的分号不断', () => {
  assert.deepEqual(sentencesOf('「翁妇」指公公与儿媳；原录「；」，底本作「。」；末句。'), ['「翁妇」指公公与儿媳；', '原录「；」，底本作「。」；', '末句。']);
  assert.deepEqual(sentencesOf(''), []);
  assert.deepEqual(sentencesOf(undefined), []);
});

test('给读者看的注：录入过程整句不显示，底本页码从句子里删掉', () => {
  // 录入过程
  assert.equal(readerSentenceOf('本批依指定维基文库 API 整条重录并撤下旧白话；'), '');
  assert.equal(readerSentenceOf('维基文库本，出处节名「三秋壬水」，revision 2294674；'), '');
  assert.equal(readerSentenceOf('正文段落 p0475、p0476、p0477。'), '');
  assert.equal(readerSentenceOf('原录「兴」，底本作「隆」；'), '');
  assert.equal(readerSentenceOf('原文已校正，旧白话撤下待统一重译。'), '');
  assert.equal(readerSentenceOf('applies依规范写「桃花」。'), '');
  // 列在原录之后的逐条改字、「改为」也是改录记录；「不擅改为」是校勘结论，照留
  assert.equal(readerSentenceOf('「位置妥贴」作「位置妥适」；'), '');
  assert.equal(readerSentenceOf('「印透食以泄气」改为「印透食神以泄其气」。'), '');
  assert.equal(readerSentenceOf('「思荣」依底本保留，不擅改为恩荣。'), '「思荣」依底本保留，不擅改为恩荣。');
  // 只有页码的整句不显示
  assert.equal(readerSentenceOf('据1947年大东书局《滴天髓阐微》扫描本，PDF 第278、279页（CADAL 图页 286、287），书内卷三 2、3页。'), '');
  assert.equal(readerSentenceOf('底本PDF第185—186页，卷三书内第43—44页。'), '');
  assert.equal(readerSentenceOf('PDF75，卷二5。'), '');
  assert.equal(readerSentenceOf('书内卷四 77、卷四 78页。'), '');
  assert.equal(readerSentenceOf('上海世界图书馆《秘本子平真诠》、书内第十九至二十页。'), '');
  // 校勘结论留下，删掉页码
  assert.equal(readerSentenceOf('「困郁」：PDF 第353页（卷三77页）底本墨团，字形近懞；'), '「困郁」：底本墨团，字形近懞；');
  assert.equal(readerSentenceOf('底本扫描（书内第64页）确印「戊戌、乙卯、丙午、乙亥」，原文照录；'), '底本扫描确印「戊戌、乙卯、丙午、乙亥」，原文照录；');
  // 字段名换成界面上的叫法
  assert.equal(readerSentenceOf('其中「茋」字的释读待校，见 doubts。'), '其中「茋」字的释读待校，见存疑。');
  assert.equal(readerSentenceOf('original 按所见保留「茋」，待更清晰底本参校。'), '原文按所见保留「茋」，待更清晰底本参校。');
  // 术语简释照留
  assert.equal(readerSentenceOf('「劫刃」指劫财、阳刃；'), '「劫刃」指劫财、阳刃；');
});

test('一条古籍的注与存疑：注拼成一段（末句收句号），存疑逐条去掉句末标点', () => {
  const entry = {
    notes: '维基文库本，出处节名「三秋壬水」，revision 2294674；正文段落 p0475。「假杀化权」指借七杀而化为权力；「阆苑之仙」保留原书比喻；',
    doubts: ['本批依指定维基文库 API 整条重录并撤下旧白话；original 仅裁去段首段尾空白，旧版扩写、截断和跨本校字不沿用。', '底本作「印缓」，疑为印绶之讹，照录；'],
  };
  assert.deepEqual(readerNotesOf(entry), {
    notes: '「假杀化权」指借七杀而化为权力；「阆苑之仙」保留原书比喻。',
    doubts: ['底本作「印缓」，疑为印绶之讹，照录'],
  });
  assert.deepEqual(readerNotesOf({}), { notes: '', doubts: [] });
  assert.deepEqual(readerNotesOf({ notes: 'PDF318。', doubts: '原录「之」，底本作「自」。' }), { notes: '', doubts: [] });
});

test('古籍库每条的界面注、存疑都不带录入过程与底本页码', () => {
  const library = buildLibrary(files.classics);
  const internal = /revision|PDF|CADAL|本批|原录|旧录|主线|API|正文段落|撤下|旧白话|original|applies|自检|扫描本|图页|书内|doubts|notes/;
  const leaks = library.entries.filter((entry) => internal.test([entry.readerNotes, ...entry.readerDoubts].join('|'))).map((entry) => entry.id);
  assert.deepEqual(leaks, []);
  // 大部分条目仍有给读者的注（术语简释）
  assert.ok(library.entries.filter((entry) => entry.readerNotes).length > library.total * 0.8);
  // 原始字段照留，给维护的人核对
  assert.ok(library.entries.some((entry) => /revision/.test(entry.notes ?? '')));
});

test('术语词典：指定模块时，本模块与通用词典都有的同一条（纳音）只列本模块那条；不指定模块时都列', () => {
  const glossary = buildGlossary(files.glossary);
  const both = glossary.entries.filter((entry) => entry.id === 'na-yin').map((entry) => entry.module).sort();
  assert.deepEqual(both, ['bazi', 'common']);
  const inBazi = searchGlossary(glossary, '纳音', { module: 'bazi' }).filter((entry) => entry.id === 'na-yin');
  assert.deepEqual(inBazi.map((entry) => entry.module), ['bazi']);
  const inZiwei = searchGlossary(glossary, '纳音', { module: 'ziwei' }).filter((entry) => entry.id === 'na-yin');
  assert.deepEqual(inZiwei.map((entry) => entry.module), ['common']);
  const all = searchGlossary(glossary, '纳音').filter((entry) => entry.id === 'na-yin');
  assert.equal(all.length, 2);
});
