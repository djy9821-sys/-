// 九星气学里按人算的部分：十二神兽与四季、年月日三柱、相性三项、守护本尊、某个方向哪些天走得通。
// 期望值取自《スゴ運。》的正文与图表（图19、33、34、36、37），以及 Codex 独立整理的二十个生日。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JX from '../src/utils/jiuxing/core.js';
import JXP from '../src/utils/jiuxing/person.js';
import { PRINTED_DIFF } from '../src/utils/jiuxing/data.js';

const dn = (y, m, d) => JX.dayNumber(y, m, d);
const BEASTS = JSON.parse(readFileSync(new URL('./golden/jiuxing-beasts.json', import.meta.url), 'utf8'));

test('书中的 Y（1983-02-07）：三柱、应龙、2017 秋三、2018 冬一', () => {
  const pillars = JXP.pillarsOf(1983, 2, 7);
  assert.deepEqual([pillars.year.branch, pillars.year.star, pillars.month.branch, pillars.month.star, pillars.day.branch, pillars.day.star], ['亥', 8, '寅', 2, '寅', 9]);
  const y = JXP.profileOf(1983, 2, 7);
  assert.deepEqual([y.name, y.element, y.pillar], ['应龙', '土', '丙寅']);
  assert.equal(JXP.stageShort(JXP.stageOf(y, 2017)), '秋三');
  assert.equal(JXP.stageShort(JXP.stageOf(y, 2018)), '冬一');
});

test('二十个生日：日柱、旬、单双、神兽、入春地支，以及十二年逐年的季次', () => {
  const seen = new Set(); let cells = 0;
  for (const item of BEASTS) {
    const [y, m, d] = item.date.split('-').map(Number);
    const p = JXP.profileOf(y, m, d);
    assert.deepEqual([p.index, p.pillar, JXP.XUN[p.xun] + '旬', p.yin ? '单' : '双', p.name, JX.BRANCHES[p.spring]], [item.serial, item.pillar, item.xun, item.parity, item.beast, item.spring], item.date);
    for (let k = 0; k < item.seasons.length / 2; k++) {
      const stage = JXP.stageOf(p, item.fromYear + k);
      assert.equal('春夏秋冬'[Math.floor(stage / 3)] + (stage % 3 + 1), item.seasons.slice(k * 2, k * 2 + 2), `${item.date} ${item.fromYear + k}`);
      cells++;
    }
    // 速查表与日柱对不上的生日，按表查出来的名字也要对得上
    assert.equal(JXP.printedBeastOf(y, m, d), item.tableBeast === item.beast ? null : item.tableBeast, item.date);
    seen.add(p.name);
  }
  assert.equal(seen.size, 12);
  assert.equal(cells, 240);
});

test('图37：十二兽各自入春的地支；冬三年盖住日柱旬空的两支', () => {
  const want = { 黄龙: '子', 应龙: '丑', 白虎: '戌', 麒麟: '亥', 朱雀: '申', 凤凰: '酉', 狮子: '午', 天马: '未', 青龙: '辰', 苍龙: '巳', 玄武: '寅', 灵龟: '卯' };
  const seen = {};
  for (let k = 0; k < 800; k++) {
    const [y, m, d] = JX.ymdOf(dn(1990, 1, 1) + k);
    const p = JXP.profileOf(y, m, d);
    seen[p.name] = JX.BRANCHES[p.spring];
    const winter = [9, 10, 11].map((stage) => JX.BRANCHES[(p.spring + stage) % 12]).join('');
    assert.ok([...JXP.VOID[p.xun]].every((branch) => winter.includes(branch)), p.name);
  }
  assert.deepEqual(seen, want);
});

test('气学年在立春换：Y 在 2018-02-03 仍是秋三，02-04 起是冬一', () => {
  const y = JXP.profileOf(1983, 2, 7);
  const at = (yy, mm, dd) => JXP.stageShort(JXP.stageOf(y, JX.yearMonthInfo(dn(yy, mm, dd), 8).kiYear));
  assert.equal(at(2018, 2, 3), '秋三');
  assert.equal(at(2018, 2, 4), '冬一');
});

test('神兽取公历年的单双，立春前出生也一样', () => {
  // 1983-01-10 的气学年是 1982，但单双照公历 1983 年算
  const p = JXP.profileOf(1983, 1, 10);
  assert.equal(p.yin, true);
  assert.equal(p.birthYear, 1982);
});

test('速查表异格：53 格、218 个生日', () => {
  const keys = Object.keys(PRINTED_DIFF);
  assert.equal(keys.length, 53);
  let split = 0;
  for (const key of keys) {
    const [y, m] = key.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let d = 1; d <= last; d++) if (JXP.printedBeastOf(y, m, d) !== JXP.profileOf(y, m, d).name) split++;
  }
  assert.equal(split, 218);
  assert.deepEqual([JXP.printedBeastOf(2016, 8, 30), JXP.profileOf(2016, 8, 30).name], ['白虎', '朱雀']);
  assert.deepEqual([JXP.printedBeastOf(2026, 1, 29), JXP.profileOf(2026, 1, 29).name], ['青龙', '狮子']);
  assert.equal(JXP.printedBeastOf(1983, 2, 7), null);
});

test('图33：地支只看三合与冲', () => {
  const table = { 子: ['辰申', '午'], 丑: ['巳酉', '未'], 寅: ['午戌', '申'], 卯: ['未亥', '酉'], 辰: ['申子', '戌'], 巳: ['酉丑', '亥'], 午: ['戌寅', '子'], 未: ['亥卯', '丑'], 申: ['子辰', '寅'], 酉: ['丑巳', '卯'], 戌: ['寅午', '辰'], 亥: ['卯未', '巳'] };
  for (const [branch, [good, bad]] of Object.entries(table)) {
    const mine = JXP.branchPartners(branch);
    assert.deepEqual([...mine.good].sort(), [...good].sort(), branch);
    assert.equal(mine.bad, bad, branch);
    for (const g of good) assert.equal(JXP.branchRelation(branch, g), '三合');
    assert.equal(JXP.branchRelation(branch, bad), '冲');
  }
  // 书里举的人物：申与寅冲、子与午冲；申与子三合、寅与午三合
  assert.deepEqual([JXP.branchRelation('申', '寅'), JXP.branchRelation('子', '午'), JXP.branchRelation('申', '子'), JXP.branchRelation('寅', '午')], ['冲', '冲', '三合', '三合']);
  assert.deepEqual([JXP.branchRelation('子', '子'), JXP.branchRelation('子', '丑')], ['同', null]);
});

test('图34：人与人的九星相性，五黄照常算土', () => {
  const good = { 1: [3, 4, 6, 7], 2: [5, 6, 7, 8, 9], 3: [1, 4, 9], 4: [1, 3, 9], 5: [2, 6, 7, 8, 9], 6: [1, 2, 5, 7, 8], 7: [1, 2, 5, 6, 8], 8: [2, 5, 6, 7, 9], 9: [2, 3, 4, 5, 8] };
  const bad = { 1: [2, 5, 8, 9], 2: [1, 3, 4], 3: [2, 5, 6, 7, 8], 4: [2, 5, 6, 7, 8], 5: [1, 3, 4], 6: [3, 4, 9], 7: [3, 4, 9], 8: [1, 3, 4], 9: [1, 6, 7] };
  for (let star = 1; star <= 9; star++) {
    assert.deepEqual(JXP.humanHarmonyOf(star), good[star], `星${star}`);
    assert.deepEqual(JXP.humanClashOf(star), bad[star], `星${star}`);
  }
});

test('五行：谁生谁、谁克谁，相克时居中的那一行', () => {
  assert.deepEqual([JXP.starRelation(8, 9).kind, JXP.starRelation(8, 9).toward], ['生', 'me']); // 火生土
  assert.deepEqual([JXP.starRelation(8, 6).kind, JXP.starRelation(8, 6).toward], ['生', 'them']); // 土生金
  assert.equal(JXP.starRelation(8, 2).kind, '比和');
  const wood = JXP.starRelation(8, 3);
  assert.deepEqual([wood.kind, wood.toward, wood.bridge], ['克', 'me', '火']); // 木克土，请属火的人居中
  for (const [a, b, bridge] of [[3, 8, '火'], [8, 1, '金'], [1, 9, '木'], [9, 6, '土'], [6, 3, '水']]) {
    const r = JXP.starRelation(a, b);
    assert.deepEqual([r.kind, r.toward, r.bridge], ['克', 'them', bridge]);
  }
  assert.deepEqual(JXP.starsOfElement('土'), [2, 5, 8]);
});

test('图36：木火土金水的上下，在上的带着在下的', () => {
  assert.deepEqual([JXP.leaderOf(8, 9), JXP.leaderOf(9, 8), JXP.leaderOf(8, 2), JXP.leaderOf(3, 1), JXP.leaderOf(6, 4)], ['them', 'me', null, 'me', 'them']);
});

test('神兽与对方的地支：应龙的夏三是午、冬三是子', () => {
  const y = JXP.profileOf(1983, 2, 7);
  assert.deepEqual(['午', '子', '丑'].map((branch) => JXP.stageShort(JXP.stageOfBranch(y, branch))), ['夏三', '冬三', '春一']);
});

test('看哪一柱：未满 6 岁看日，女未满 18、男未满 25 看月，之后看年', () => {
  const key = (age, gender) => JXP.phaseOf(age, gender).key;
  assert.deepEqual([key(0, '女'), key(5, '男'), key(6, '女'), key(17, '女'), key(18, '女'), key(18, '男'), key(24, '男'), key(25, '男'), key(40, '')], ['day', 'day', 'month', 'month', 'year', 'month', 'month', 'year', 'year']);
  assert.deepEqual([JXP.phaseOf(20, '').unsure, JXP.phaseOf(20, '女').unsure, JXP.phaseOf(30, '').unsure], [true, false, false]);
  assert.deepEqual([JXP.ageOn([1983, 2, 7], dn(2026, 2, 6)), JXP.ageOn([1983, 2, 7], dn(2026, 2, 7)), JXP.ageOn([2000, 2, 29], dn(2025, 2, 28)), JXP.ageOn([2000, 2, 29], dn(2025, 3, 1))], [42, 43, 24, 25]);
});

test('生在立春前后（一到三月）：另一年的支与星', () => {
  assert.deepEqual(JXP.neighbourYearOf(1983, 2, 7), { kiYear: 1982, branch: '戌', star: 9, before: false });
  assert.deepEqual(JXP.neighbourYearOf(1983, 1, 10), { kiYear: 1983, branch: '亥', star: 8, before: true });
  assert.equal(JXP.neighbourYearOf(1983, 4, 1), null);
});

test('守护本尊：按生年地支配八尊；八方按地支方位', () => {
  const want = { 子: '千手观音菩萨', 丑: '虚空藏菩萨', 寅: '虚空藏菩萨', 卯: '文殊菩萨', 辰: '普贤菩萨', 巳: '普贤菩萨', 午: '大势至菩萨', 未: '大日如来', 申: '大日如来', 酉: '不动明王', 戌: '阿弥陀如来', 亥: '阿弥陀如来' };
  for (const [branch, guardian] of Object.entries(want)) assert.equal(JXP.guardianOf(branch), guardian);
  assert.deepEqual(JX.DIRECTIONS.map((direction) => JXP.guardianOfDirection(direction)), ['千手观音菩萨', '虚空藏菩萨', '文殊菩萨', '普贤菩萨', '大势至菩萨', '大日如来', '不动明王', '阿弥陀如来']);
});

test('两个人合看：各自按年龄取柱', () => {
  const today = dn(2026, 11, 12);
  const pair = JXP.compat({ ymd: [1983, 2, 7], gender: '男' }, { ymd: [1987, 6, 1], gender: '女' }, today);
  assert.deepEqual([pair.me.branch, pair.them.branch, pair.branch, pair.me.phase.key], ['亥', '卯', '三合', 'year']);
  const child = JXP.compat({ ymd: [1983, 2, 7], gender: '男' }, { ymd: [2022, 5, 20], gender: '女' }, today);
  assert.deepEqual([child.them.phase.key, child.them.branch], ['day', JXP.pillarsOf(2022, 5, 20).day.branch]);
  const teen = JXP.compat({ ymd: [1983, 2, 7], gender: '男' }, { ymd: [2010, 9, 9], gender: '男' }, today);
  assert.deepEqual([teen.them.phase.key, teen.them.star], ['month', JXP.pillarsOf(2010, 9, 9).month.star]);
  for (const side of [pair.now.me, pair.now.them]) assert.ok(['高', '中', '低'].includes(side.tier));
});

test('扫描某个方向：与逐日硬算一致，分段首尾相接', () => {
  const from = dn(2026, 11, 12); const to = from + 399;
  for (const star of [1, 3, 5, 8]) for (const direction of JX.DIRECTIONS) {
    const brute = [];
    for (let day = from; day <= to; day++) if (JX.judge(day, direction, star, 8).pass) brute.push(day);
    const scan = JXP.scanDirection(star, direction, from, to);
    assert.deepEqual(scan.days.map((x) => x.dn), brute, `${star}${direction}`);
    assert.equal(scan.segments[0].from, from);
    assert.equal(scan.segments[scan.segments.length - 1].to, to);
    scan.segments.slice(1).forEach((segment, i) => assert.equal(segment.from, scan.segments[i].to + 1));
  }
});

test('回程另判：2017-11-10 朝西北去，11-12 能朝东南回；2018-03-06 朝西去，03-07 回不了、03-10 能回', () => {
  const iso = (day) => JX.ymdOf(day).join('-');
  assert.ok(JXP.returnsFor(8, '西北', dn(2017, 11, 10), 3).map(iso).includes('2017-11-12'));
  const back = JXP.returnsFor(8, '西', dn(2018, 3, 6), 5).map(iso);
  assert.ok(!back.includes('2018-3-7'));
  assert.ok(back.includes('2018-3-10'));
});

test('一趟行程：去程日配回程日（书里的两趟）', () => {
  const md = (day) => (day === null ? null : JX.ymdOf(day).slice(1).join('/'));
  // 2017-11-10 朝西北去：7 晚内能朝东南回的是 12、14、16、17 日，首选最早的 12 日（书里正是 10 日去、12 日回）
  const a = JXP.tripsOf(8, '西北', dn(2017, 11, 8), dn(2017, 11, 12), 7);
  assert.deepEqual(a.trips.map((trip) => [md(trip.go), trip.returns.map(md), md(trip.best), md(trip.later)]), [['11/10', ['11/12', '11/14', '11/16', '11/17'], '11/12', null]]);
  assert.equal(a.round.length, 1);
  // 只许住 1 晚时回不来：不算一趟，另给出期限之后最近能回的一天
  const b = JXP.tripsOf(8, '西北', dn(2017, 11, 8), dn(2017, 11, 12), 1);
  assert.deepEqual([b.round.length, md(b.trips[0].best), md(b.trips[0].later)], [0, null, '11/12']);
  assert.equal(md(JXP.nextReturnAfter(8, '西北', dn(2017, 11, 10), 2, 60)), '11/12');
  // 2018-03-06 朝西去：当天也能朝东回，但首选过夜的，最早是 10 日（书里正是 6 日去、10 日回）
  const c = JXP.tripsOf(8, '西', dn(2018, 3, 6), dn(2018, 3, 6), 5);
  assert.deepEqual([c.trips[0].returns.map(md), md(c.trips[0].best)], [['3/6', '3/10', '3/11'], '3/10']);
  // 每一趟的回程日都确实朝反方向走得通，且不早于去程日
  const year = JXP.tripsOf(3, '东', dn(2026, 11, 12), dn(2026, 11, 12) + 364, 7);
  for (const trip of year.trips) for (const day of trip.returns) {
    assert.ok(day >= trip.go && day - trip.go <= 7);
    assert.equal(JX.judge(day, '西', 3, 8).pass, true);
  }
  assert.deepEqual(year.round, year.trips.filter((trip) => trip.best !== null));
});

test('往返先挑月份：去、回两个方向年盘月盘都通的月份（书里的例子）', () => {
  const months = (direction, from, to) => JXP.scanDirection(8, direction, from, to).segments
    .filter((segment) => segment.yearOk && segment.monthOk && segment.backYearOk && segment.backMonthOk).map((segment) => segment.monthBranch).join('');
  // 2018 年走东西一线：书里说三月可以，十二月也可以
  assert.equal(months('西', dn(2018, 2, 10), dn(2019, 1, 31)), '卯未子');
  // 2019 年走西北—东南一线：书里说三月或五月
  assert.equal(months('西北', dn(2019, 2, 10), dn(2020, 1, 31)), '卯巳子');
  // 2019 年东方年盘可去，但对面的西方年盘不通，所以书里往返不走东西一线
  const east = JXP.scanDirection(8, '东', dn(2019, 3, 10), dn(2019, 3, 20)).segments[0];
  assert.deepEqual([east.yearOk, east.backYearOk], [true, false]);
  // 出发那个月回程方向卡在哪一盘；去、回都通的月份里，七晚以内都回得来
  const trips = JXP.tripsOf(8, '西', dn(2027, 2, 4), dn(2027, 3, 31), 7).trips;
  assert.equal(trips.find((trip) => JX.ymdOf(trip.go).join('-') === '2027-2-7').blocked, '月盘');
  const march = trips.filter((trip) => trip.go >= dn(2027, 3, 6));
  assert.ok(march.length > 5);
  assert.ok(march.every((trip) => trip.blocked === null && trip.best !== null));
});
