// 九星历与择方：年月日三星、九宫盘与凶方、《スゴ運。》第五章的择方实例。
// 书里的逐日表按日本时间印，所以对书的用例交节取 +9；应用里给人用时取北京时间 +8。
import test from 'node:test';
import assert from 'node:assert/strict';
import JX from '../src/utils/jiuxing/core.js';

const JST = 9;
const dn = (text) => { const [y, m, d] = text.split('-').map(Number); return JX.dayNumber(y, m, d); };
const stars = (date, tz = JST) => { const s = JX.starsOfDay(dn(date), tz); return [s.yearStar, s.monthStar, s.dayStar]; };
const passing = (date, birthStar, tz = JST) => JX.DIRECTIONS.filter((direction) => JX.judge(dn(date), direction, birthStar, tz).pass);
const sorted = (list) => [...list].sort();

test('书中的 Y（1983-02-07）：年亥八、月寅二、日寅九', () => {
  const s = JX.starsOfDay(dn('1983-02-07'), JST);
  assert.deepEqual([s.yearBranch, s.yearStar, s.monthBranch, s.monthStar, s.dayBranch, s.dayStar], ['亥', 8, '寅', 2, '寅', 9]);
});

test('年星立春当天换，月星交节当天换', () => {
  assert.deepEqual([JX.starsOfDay(dn('1983-02-03'), JST).yearBranch, JX.starsOfDay(dn('1983-02-03'), JST).yearStar], ['戌', 9]);
  assert.deepEqual([JX.starsOfDay(dn('1983-02-04'), JST).yearBranch, JX.starsOfDay(dn('1983-02-04'), JST).yearStar], ['亥', 8]);
  assert.equal(JX.starsOfDay(dn('1983-03-05'), JST).monthBranch, '寅');
  assert.equal(JX.starsOfDay(dn('1983-03-06'), JST).monthBranch, '卯');
  // 2017 年立冬在 11 月 7 日：6 日月星九紫，7 日起八白
  assert.equal(stars('2017-11-06')[1], 9);
  assert.equal(stars('2017-11-07')[1], 8);
  assert.equal(JX.starsOfDay(dn('2017-11-07'), JST).isTermDay, true);
});

test('书中逐日表的几天：年、月、日三盘的中宫', () => {
  assert.deepEqual(stars('2017-04-05'), [1, 6, 2]);
  assert.deepEqual(stars('2017-04-04'), [1, 6, 1]);
  assert.deepEqual(stars('2017-02-05'), [1, 8, 6]);
});

test('日星：阴遁逆数、阳遁顺数；平常在甲子日换，置闰那一回在甲午日换', () => {
  // 2020-06-20 甲午，阴遁起三碧（置闰的一回）；下一回在 2031-12-20 甲午，阳遁起七赤
  assert.deepEqual([JX.dayStarInfo(dn('2020-06-20')).star, JX.dayStarInfo(dn('2020-06-20')).dun], [3, '阴遁']);
  assert.deepEqual([JX.dayStarInfo(dn('2020-06-21')).star, JX.dayStarInfo(dn('2020-06-19')).dun], [2, '阳遁']);
  assert.deepEqual([JX.dayStarInfo(dn('2031-12-20')).star, JX.dayStarInfo(dn('2031-12-20')).dun], [7, '阳遁']);
  // 书表之后的日子，对过日本历书的两天：2026-11-11 年一白、月八白、日八白（己丑）；2026-12-16 甲子日起阳遁一白，月七赤
  assert.deepEqual(stars('2026-11-11'), [1, 8, 8]);
  assert.equal(JX.dayBranch(dn('2026-11-11')), '丑');
  assert.deepEqual(stars('2026-12-16'), [1, 7, 1]);
  assert.deepEqual([JX.dayBranch(dn('2026-12-16')), JX.dayStarInfo(dn('2026-12-16')).dun], ['子', '阳遁']);
  // 换遁的前一天（癸亥）是阴遁的最后一天，也是一白：冬至前后一白连着出现两天
  assert.deepEqual([JX.dayStarInfo(dn('2026-12-15')).star, JX.dayStarInfo(dn('2026-12-15')).dun], [1, '阴遁']);
});

test('可算的范围：1900 年立春到 2060 年底，范围外返回 null', () => {
  assert.equal(JX.starsOfDay(dn('1900-01-31'), 8), null);
  assert.ok(JX.starsOfDay(dn('1900-02-05'), 8));
  assert.ok(JX.starsOfDay(dn('2060-12-31'), 8));
  assert.equal(JX.starsOfDay(dn('2061-02-01'), 8), null);
});

// 书末九张九星盘：从北起顺时针八方的落星，以及涂灰的凶方。
const BOARDS = [
  ['64895732', ['北', '南']],
  ['75916843', ['东北', '西南']],
  ['86127954', ['东', '西']],
  ['97238165', ['北', '东南', '西北']],
  ['18349276', []],
  ['29451387', ['东南', '南', '西北']],
  ['31562498', ['东', '西']],
  ['42673519', ['东北', '西南']],
  ['53784621', ['北', '南']],
];
test('九宫盘：八方落星与凶方（五黄杀、暗剑杀、水火杀）同书末九张盘', () => {
  BOARDS.forEach(([clockwise, gray], i) => {
    const center = i + 1;
    assert.equal(JX.DIRECTIONS.map((direction) => JX.starAt(center, direction)).join(''), clockwise, `中宫${center}`);
    assert.deepEqual(sorted(JX.DIRECTIONS.filter((direction) => JX.afflictionAt(center, direction))), sorted(gray), `中宫${center}`);
  });
  assert.equal(JX.afflictionAt(1, '南'), '五黄杀');
  assert.equal(JX.afflictionAt(1, '北'), '暗剑杀');
  assert.equal(JX.afflictionAt(4, '北'), '水火杀');
  assert.equal(JX.afflictionAt(6, '南'), '水火杀');
});

test('择方的调和星：与本命星相生或同行，不含自己，不含五黄', () => {
  const want = { 1: [3, 4, 6, 7], 2: [6, 7, 8, 9], 3: [1, 4, 9], 4: [1, 3, 9], 5: [2, 6, 7, 8, 9], 6: [1, 2, 7, 8], 7: [1, 2, 6, 8], 8: [2, 6, 7, 9], 9: [2, 3, 4, 8] };
  for (let star = 1; star <= 9; star++) assert.deepEqual(JX.harmonyOf(star), want[star], `本命星${star}`);
});

// 第五章里 Y（本命八白）的三趟行程：书上点名可走的日期与方向。
const BOOK_DAYS = [
  ['2017-11-10', '西北'], ['2017-11-12', '东南'], ['2017-11-14', '东南'], ['2017-11-16', '东南'], ['2017-11-17', '东南'],
  ['2018-03-06', '西'], ['2018-03-11', '西'], ['2018-03-10', '东'], ['2018-03-11', '东'], ['2018-03-13', '东'], ['2018-03-15', '东'],
  ['2019-03-07', '西北'], ['2019-03-11', '西北'], ['2019-03-14', '西北'], ['2019-03-16', '东南'], ['2019-03-18', '东南'], ['2019-03-22', '东南'],
];
test('书里的十七组日期与方向都走得通', () => {
  for (const [date, direction] of BOOK_DAYS) assert.ok(passing(date, 8).includes(direction), `${date} ${direction}`);
});

test('同一天可以有多个方向，也可以一个都没有', () => {
  assert.deepEqual(sorted(passing('2017-11-06', 8)), ['西南']);
  assert.deepEqual(sorted(passing('2017-11-07', 8)), sorted(['东南', '西北']));
  assert.deepEqual(passing('2019-03-08', 8), []);
  assert.deepEqual(sorted(passing('2019-03-14', 8)), sorted(['东南', '西北']));
});

test('三盘里任何一盘犯凶方都不取：年盘、月盘、日盘各一例', () => {
  // 三天里该方向三盘都临调和星，只有一盘涂灰
  for (const [date, direction, layer] of [['2017-04-05', '北', '年'], ['2017-04-04', '西北', '月'], ['2017-02-05', '西北', '日']]) {
    const result = JX.judge(dn(date), direction, 8, JST);
    assert.ok(result.boards.every((board) => board.harmonious), `${date} 三盘都临调和星`);
    assert.deepEqual(result.boards.filter((board) => board.affliction).map((board) => board.layer), [layer]);
    assert.equal(result.pass, false);
  }
});

test('本命星以立春为界：1983-02-03 生是九紫，02-07 生是八白，同一天的结论不同', () => {
  assert.equal(JX.birthStarOf(1983, 2, 3, JST), 9);
  assert.equal(JX.birthStarOf(1983, 2, 7, JST), 8);
  assert.deepEqual(passing('2017-11-10', 9), []);
  assert.deepEqual(passing('2017-11-10', 8), ['西北']);
});

test('回程按返回那天、朝反方向另判', () => {
  const back = (date, outward) => JX.judge(dn(date), JX.OPPOSITE[outward], 8, JST).pass;
  assert.equal(back('2017-11-12', '西北'), true);
  assert.equal(back('2018-03-10', '西'), true);
  assert.equal(back('2018-03-07', '西'), false); // 7 日朝西是通的，朝东回却不通
  assert.equal(back('2019-03-16', '西北'), true);
  assert.equal(back('2019-04-05', '西北'), false); // 清明交节换了月盘
});

test('量方向：墨卡托图上的直线方向，四正各 30°、四隅各 60°', () => {
  const sector = (deg) => JX.sectorOf(deg).direction;
  assert.deepEqual([0, 14.9, 15, 74.9, 75, 104.9, 105, 164.9, 165, 195, 255, 285, 344.9, 345].map(sector), ['北', '北', '东北', '东北', '东', '东', '东南', '东南', '南', '西南', '西', '西北', '西北', '北']);
  assert.ok(Math.abs(JX.sectorOf(90).toEdge - 15) < 1e-9);
  const beijingToShanghai = JX.bearing(39.90, 116.41, 31.23, 121.47);
  assert.equal(sector(beijingToShanghai), '东南');
  assert.ok(Math.abs(JX.distanceKm(39.90, 116.41, 31.23, 121.47) - 1067) < 15);
  // 书里的说法：在墨卡托图上，美国在日本的正东
  assert.equal(sector(JX.bearing(35.68, 139.76, 34.05, -118.24)), '东');
});
