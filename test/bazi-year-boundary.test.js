import test from 'node:test';
import assert from 'node:assert/strict';

import { YEAR_BOUNDARY_OPTIONS, buildBaziChart, getYearBoundaryInfo } from '../src/utils/baziChart.js';
import { baziFormToChartInput } from '../src/utils/baziInput.js';
import { decodeBaziLink, encodeBaziLink } from '../src/utils/baziLink.js';
import { buildBaziPrompt } from '../src/utils/baziPrompt.js';
import { baziChartSignature, buildBaziRecord, recordToBaziForm } from '../src/utils/baziRecord.js';

const NOW = new Date('2026-10-26T10:00:00');
// 2016 年：立春 2 月 4 日 17:46，正月初一 2 月 8 日。2 月 6 日正好夹在中间。
const between = { calendarType: 'solar', year: 2016, month: 2, day: 6, gender: 'male', hourIndex: 6 };

test('默认按立春换年：年柱丙申；选正月初一则年柱乙未，十神、藏干、神煞、生肖一并跟着年柱走', () => {
  const lichun = buildBaziChart(between, NOW);
  const chunjie = buildBaziChart({ ...between, yearBoundary: 'chunjie' }, NOW);
  assert.equal(lichun.pillars[0].ganZhi, '丙申');
  assert.equal(chunjie.pillars[0].ganZhi, '乙未');
  assert.equal(lichun.input.yearBoundary, 'lichun');
  assert.equal(chunjie.input.yearBoundary, 'chunjie');
  assert.deepEqual(lichun.yearBoundary, { mode: 'lichun', lichun: '丙申', chunjie: '乙未', differs: true });
  assert.deepEqual(chunjie.yearBoundary, { mode: 'chunjie', lichun: '丙申', chunjie: '乙未', differs: true });
  // 月日时三柱不变：月柱按节气，与年柱分界无关。
  assert.deepEqual(chunjie.pillars.slice(1).map(({ ganZhi }) => ganZhi), lichun.pillars.slice(1).map(({ ganZhi }) => ganZhi));
  // 年柱的十神、藏干、十二长生、纳音、旬空都按新干支重算，字段齐全。
  const year = chunjie.pillars[0];
  assert.equal(year.ganShiShen, '正官');
  assert.deepEqual(year.hiddenGans, ['己', '丁', '乙']);
  assert.deepEqual(year.hiddenShiShens, ['劫财', '正印', '正官']);
  assert.equal(year.naYin, '沙中金');
  assert.equal(year.xunKong, '辰巳');
  assert.equal(year.diShi, '衰');
  assert.deepEqual(Object.keys(year).sort(), Object.keys(lichun.pillars[0]).sort());
  // 年干年支换了，由年干年支起的神煞（天乙、太极、金舆、华盖…）也换；日柱的也随之变化。
  assert.ok(year.shensha.includes('天乙贵人') && year.shensha.includes('华盖'));
  assert.ok(!lichun.pillars[0].shensha.includes('华盖'));
  assert.equal(lichun.lunarInfo.zodiac, '猴');
  assert.equal(chunjie.lunarInfo.zodiac, '羊');
  assert.equal(chunjie.lunarInfo.zodiacExact, '猴');
});

test('不在立春与正月初一之间时两派一致：开关不起作用，differs 为假', () => {
  const after = buildBaziChart({ ...between, day: 9, yearBoundary: 'chunjie' }, NOW);
  assert.equal(after.pillars[0].ganZhi, '丙申');
  assert.deepEqual(after.yearBoundary, { mode: 'chunjie', lichun: '丙申', chunjie: '丙申', differs: false });
  // 2017 年春节（1 月 28 日）在立春（2 月 3 日）之前：1 月 30 日按立春仍是丙申，按正月初一已是丁酉。
  const early = buildBaziChart({ calendarType: 'solar', year: 2017, month: 1, day: 30, gender: 'female', hourIndex: 6, yearBoundary: 'chunjie' }, NOW);
  assert.equal(early.pillars[0].ganZhi, '丁酉');
  assert.equal(early.yearBoundary.lichun, '丙申');
  assert.throws(() => buildBaziChart({ ...between, yearBoundary: 'x' }), /年柱分界/);
});

test('getYearBoundaryInfo 给录入页判断要不要显示开关（公历与农历输入都行）', () => {
  assert.deepEqual(getYearBoundaryInfo('solar', 2016, 2, 6), { lichun: '丙申', chunjie: '乙未', differs: true });
  assert.deepEqual(getYearBoundaryInfo('solar', 2016, 2, 9), { lichun: '丙申', chunjie: '丙申', differs: false });
  assert.deepEqual(getYearBoundaryInfo('lunar', 2015, 12, 28), { lichun: '丙申', chunjie: '乙未', differs: true });
  assert.equal(getYearBoundaryInfo('solar', 2016, 13, 1), null);
  assert.deepEqual(YEAR_BOUNDARY_OPTIONS.map((option) => option.value), ['lichun', 'chunjie']);
});

test('表单、档案、分享链接都带着年柱分界，缺省为立春', () => {
  const form = {
    personName: '测试', calendarType: 'solar', year: 2016, month: 2, day: 6, hourIndex: 6, gender: 'male', daySect: 2, yearBoundary: 'chunjie',
    timeMode: 'shichen', clockTime: '', placeProvince: '', placeCity: '', longitude: '', timezone: 8, applyTrueSolar: true, applyDst: false,
  };
  assert.equal(baziFormToChartInput(form).yearBoundary, 'chunjie');
  assert.equal(baziFormToChartInput({ ...form, yearBoundary: undefined }).yearBoundary, 'lichun');

  const chart = buildBaziChart(baziFormToChartInput(form), NOW);
  const record = buildBaziRecord(form, chart, { group: 'self' });
  assert.equal(record.data.yearBoundary, 'chunjie');
  assert.equal(recordToBaziForm(record).yearBoundary, 'chunjie');
  assert.equal(recordToBaziForm({ ...record, data: { ...record.data, yearBoundary: undefined } }).yearBoundary, 'lichun');
  assert.notEqual(baziChartSignature(record), baziChartSignature({ ...record, data: { ...record.data, yearBoundary: 'lichun' } }));

  const query = encodeBaziLink(form, { name: '测试' });
  assert.ok(query.includes('yb=c'), query);
  assert.equal(recordToBaziForm(decodeBaziLink(query)).yearBoundary, 'chunjie');
  assert.ok(!encodeBaziLink({ ...form, yearBoundary: 'lichun' }).includes('yb='));
  assert.equal(recordToBaziForm(decodeBaziLink(encodeBaziLink({ ...form, yearBoundary: 'lichun' }))).yearBoundary, 'lichun');
  assert.equal(buildBaziChart(baziFormToChartInput(recordToBaziForm(decodeBaziLink(query))), NOW).pillars[0].ganZhi, '乙未');
});

test('提示词：夹在两个分界之间时说明本盘口径与另一派的年柱，否则不提', () => {
  const chunjie = buildBaziPrompt({ chart: buildBaziChart({ ...between, yearBoundary: 'chunjie' }, NOW), scope: 'natal', now: NOW });
  assert.match(chunjie, /年柱分界：出生在立春与正月初一之间，本盘按农历正月初一换年，年柱取乙未；若按子平法以立春换年则为丙申/);
  const lichun = buildBaziPrompt({ chart: buildBaziChart(between, NOW), scope: 'natal', now: NOW });
  assert.match(lichun, /本盘按子平法以立春换年，年柱取丙申；若按农历正月初一换年则为乙未/);
  const plain = buildBaziPrompt({ chart: buildBaziChart({ ...between, day: 9 }, NOW), scope: 'natal', now: NOW });
  assert.ok(!plain.includes('年柱分界'));
});
