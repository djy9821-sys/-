import test from 'node:test';
import assert from 'node:assert/strict';

import { loadDataFiles } from '../scripts/lib/dataFiles.mjs';
import {
  buildLibrary, conditionMatches, matchEntries, ziweiContextOf, ziweiFlowOf, ziweiLimitPalaceHits, ziweiOppositeOf, ziweiPalaceContextOf, ziweiPalaceHits, ziweiSurroundOf,
} from '../src/data/classics/library.js';

/**
 * 紫微条件里的庙旺跟同一条件点名的星配对：「七杀落陷」要七杀自己落陷，宫里别的星落陷不算。
 * 只用到 library.js（不排盘），宫是手写的 iztro 宫对象。
 */
const BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const palacesWith = (seats) => BRANCHES.map((branch, index) => {
  const seat = seats[index] ?? {};
  return { index, name: seat.name ?? `宫${index}`, earthlyBranch: branch, majorStars: seat.majorStars ?? [], minorStars: seat.minorStars ?? [], adjectiveStars: [] };
});
const star = (name, brightness = '', mutagen = '') => ({ name, brightness, mutagen });
const ctxOf = (majorStars, minorStars = [], options = {}) => ziweiPalaceContextOf({ index: 0, name: '命宫', earthlyBranch: '寅', majorStars, minorStars }, options);
const hit = (cond, ctx) => conditionMatches({ module: 'ziwei', ...cond }, ctx);

test('庙旺只认同条件点名的星：star 点的星自己合乎才算，宫里别的星合乎不算', () => {
  const ctx = ctxOf([star('紫微', '旺'), star('七杀', '平')]);
  assert.deepEqual(ctx.starBrightness, ['紫微|旺', '七杀|平']);
  assert.equal(hit({ star: '七杀', brightness: '旺' }, ctx), null);
  assert.deepEqual(hit({ star: '紫微', brightness: ['庙', '旺'] }, ctx), [{ key: 'star', value: '紫微' }, { key: 'brightness', value: '旺' }]);
  assert.deepEqual(hit({ star: '七杀', brightness: ['平', '陷'] }, ctx), [{ key: 'star', value: '七杀' }, { key: 'brightness', value: '平' }]);
  // 辅星的庙旺也只算它自己：文昌落陷，不连带主星。
  const chang = ctxOf([star('武曲', '庙')], [star('文昌', '陷')]);
  assert.equal(hit({ star: '武曲', brightness: '陷' }, chang), null);
  assert.ok(hit({ star: '文昌', brightness: '陷' }, chang));
});

test('stars、allStars 点的几颗星里有一颗合乎就算；star 与 stars 同写时庙旺归 star 那颗', () => {
  const tongLiang = ctxOf([star('天同', '平'), star('天梁', '庙')]);
  assert.ok(hit({ stars: ['天同', '天梁'], brightness: ['庙', '旺'] }, tongLiang));
  const tongChang = ctxOf([star('天同', '平')], [star('文昌', '庙')]);
  assert.equal(hit({ stars: ['天同', '天梁'], brightness: ['庙', '旺'] }, tongChang), null);
  assert.ok(hit({ allStars: ['武曲', '七杀'], brightness: ['庙', '旺'] }, ctxOf([star('武曲', '平'), star('七杀', '旺')])));
  // 「贪狼入庙遇火铃」：贪狼庙才算，火星庙、贪狼平不算。
  const cond = { star: '贪狼', stars: ['火星', '铃星'], brightness: '庙' };
  assert.ok(hit(cond, ctxOf([star('贪狼', '庙')], [star('火星', '陷')])));
  assert.equal(hit(cond, ctxOf([star('贪狼', '平')], [star('火星', '庙')])), null);
});

test('没点星而写了四化的，庙旺看带这几种四化的星（科权陷于凶乡）；运限层四化到的星也算', () => {
  const cond = { mutagen: ['科', '权'], brightness: '陷' };
  assert.equal(hit(cond, ctxOf([star('七杀', '平', '化权')], [star('文曲', '陷')])), null);
  assert.ok(hit(cond, ctxOf([star('天机', '陷', '科'), star('紫微', '庙')])));
  // 流年四化：流年化忌到太阳（落陷）算，化忌到天梁（入庙）不算。
  const palaces = palacesWith({ 0: { name: '命宫', majorStars: [star('太阳', '陷'), star('天梁', '庙')] } });
  const palace = palaces[0];
  const surround = ziweiSurroundOf(palaces, palace);
  const yearly = (ji) => ziweiPalaceContextOf(palace, { limit: '流年', surround, flow: ziweiFlowOf({ stars: palaces.map(() => []), mutagen: ['天同', '天机', '文昌', ji] }, palace, surround) });
  assert.deepEqual(yearly('太阳').starMutagen, ['太阳|忌']);
  assert.ok(hit({ limit: '流年', mutagen: '忌', brightness: '陷' }, yearly('太阳')));
  assert.equal(hit({ limit: '流年', mutagen: '忌', brightness: '陷' }, yearly('天梁')), null);
});

test('什么星都没点的看整宫；空宫借来的对宫星只借名字，配不上庙旺；不给每颗星的庙旺时照旧按整宫判', () => {
  const ctx = ctxOf([star('紫微', '庙')], [star('擎羊', '陷')]);
  assert.ok(hit({ palace: '命宫', brightness: '陷' }, ctx));
  // 命宫空，坐落陷的文昌，借对宫七杀：七杀「落陷」不能借文昌的陷。
  const palaces = palacesWith({ 0: { name: '命宫', minorStars: [star('文昌', '陷')] }, 6: { name: '迁移', majorStars: [star('七杀', '庙')] } });
  const empty = ziweiPalaceContextOf(palaces[0], { opposite: ziweiOppositeOf(palaces, palaces[0]) });
  assert.deepEqual(empty.star, ['文昌', '七杀']);
  assert.equal(hit({ star: '七杀', brightness: '陷' }, empty), null);
  assert.ok(hit({ star: '文昌', brightness: '陷' }, empty));
  // 直接拿 ziweiContextOf 拼的上下文（没有 starBrightness）：维持整宫判。
  assert.ok(hit({ star: '七杀', brightness: '陷' }, ziweiContextOf({ stars: ['七杀', '文昌'], brightness: ['陷'] })));
});

test('藏经阁实数据：骨髓赋「武曲闲宫」要武曲自己不在庙旺，彀率「七杀临于陷地」七杀不落陷就不命中', () => {
  const library = buildLibrary(loadDataFiles().classics);
  const ids = (hits) => hits.map(({ entry }) => entry.id);
  // 命宫在子：武曲入庙（全书子宫武曲旺），同宫擎羊落陷。旧做法看整宫会把「武曲闲宫」算进来。
  const wuQiang = palacesWith({ 10: { name: '命宫', majorStars: [star('武曲', '旺')], minorStars: [star('擎羊', '陷')] } });
  const wuHits = ziweiPalaceHits(library, wuQiang, ['命宫']);
  assert.ok(!wuHits.some(({ entry, matched }) => entry.id === 'ziwei.quanshu.gusui.021' && matched.some(({ key }) => key === 'brightness')));
  // 命宫在巳：武曲平和，「武曲闲宫」命中，说明里是庙旺·平（亥宫另有「武曲居乾」一条分量更重，所以拿巳宫看）。
  const wuXian = palacesWith({ 3: { name: '命宫', majorStars: [star('武曲', '平')] } });
  const xian = ziweiPalaceHits(library, wuXian, ['命宫']).find(({ entry }) => entry.id === 'ziwei.quanshu.gusui.021');
  assert.ok(xian);
  assert.ok(xian.reason.includes('庙旺·平'));
  // 流年命宫坐七杀（旺）与落陷的擎羊：七杀不落陷，彀率其十五不命中（另一条件要火铃，这里没有）。
  const sha = palacesWith({ 4: { name: '命宫', majorStars: [star('七杀', '旺')], minorStars: [star('擎羊', '陷')] } });
  assert.ok(!ids(ziweiLimitPalaceHits(library, sha, 4, '流年')).includes('ziwei.quanshu.goulv.015'));
  // 同一宫看本命：靠庙旺命中的，旺要是七杀的、陷要是擎羊的，而且那颗星就在条件里点了名。
  const ownerOf = { 旺: '七杀', 陷: '擎羊' };
  const named = (cond) => [cond.star, cond.stars, cond.allStars].flat().filter(Boolean);
  const ctx = ziweiPalaceContextOf(sha[4], { surround: ziweiSurroundOf(sha, sha[4]) });
  const withBrightness = matchEntries(library, ctx).filter(({ matched }) => matched.some(({ key }) => key === 'brightness'));
  assert.ok(withBrightness.length > 0);
  withBrightness.forEach(({ entry, matched }) => {
    const { value } = matched.find(({ key }) => key === 'brightness');
    assert.ok(value in ownerOf, `${entry.id}：庙旺·${value}`);
    assert.ok(entry.applies.some((cond) => cond.module === 'ziwei' && cond.brightness !== undefined && (named(cond).length === 0 || named(cond).includes(ownerOf[value]))), entry.id);
  });
});
