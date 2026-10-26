import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { baziFormToChartInput } from '../src/utils/baziInput.js';
import { buildBaziShareUrl, decodeBaziLink, encodeBaziLink, hashQueryOf } from '../src/utils/baziLink.js';
import { recordToBaziForm } from '../src/utils/baziRecord.js';

const NOW = new Date('2026-10-26T10:00:00');
const baseForm = {
  personName: '杨先生', calendarType: 'solar', year: 1998, month: 1, day: 2, hourIndex: 4, gender: 'male', daySect: 2,
  timeMode: 'shichen', clockTime: '', placeProvince: '', placeCity: '', longitude: '', timezone: 8, applyTrueSolar: true, applyDst: false,
};

test('时辰模式：编码与解码往返后排出同一张盘', () => {
  const query = encodeBaziLink(baseForm);
  assert.equal(query, 'cal=s&d=1998-1-2&g=m&h=4&n=%E6%9D%A8%E5%85%88%E7%94%9F');
  const record = decodeBaziLink(query);
  assert.equal(record.type, 'bazi');
  assert.equal(record.name, '杨先生');
  assert.equal(record.fromLink, true);
  const form = recordToBaziForm(record);
  assert.equal(form.hourIndex, 4);
  assert.equal(form.timeMode, 'shichen');
  const a = buildBaziChart(baziFormToChartInput(baseForm), NOW);
  const b = buildBaziChart(baziFormToChartInput(form), NOW);
  assert.deepEqual(b.pillars.map(({ ganZhi }) => ganZhi), a.pillars.map(({ ganZhi }) => ganZhi));
});

test('精确模式带出生地、夏令时与子时流派', () => {
  const form = { ...baseForm, timeMode: 'exact', clockTime: '07:30', placeProvince: '河南', placeCity: '固始', longitude: '115.65', timezone: 8, applyDst: true, daySect: 1, calendarType: 'lunar', month: -5, day: 3, year: 1987 };
  const query = encodeBaziLink(form, { name: '测试' });
  const params = new URLSearchParams(query);
  assert.equal(params.get('cal'), 'l');
  assert.equal(params.get('d'), '1987-5-3');
  assert.equal(params.get('leap'), '1');
  assert.equal(params.get('c'), '07:30');
  assert.equal(params.get('lon'), '115.65');
  assert.equal(params.get('dst'), '1');
  assert.equal(params.get('sect'), '1');
  assert.equal(params.get('n'), '测试');
  assert.equal(params.has('tz'), false);
  const restored = recordToBaziForm(decodeBaziLink(query));
  assert.equal(restored.timeMode, 'exact');
  assert.equal(restored.clockTime, '07:30');
  assert.equal(restored.longitude, '115.65');
  assert.equal(restored.placeCity, '固始');
  assert.equal(restored.applyDst, true);
  assert.equal(restored.daySect, 1);
  assert.equal(restored.month, -5);
  assert.equal(restored.calendarType, 'lunar');
});

test('时辰不详与无效链接', () => {
  const query = encodeBaziLink({ ...baseForm, timeMode: 'unknown', hourIndex: null });
  assert.ok(query.includes('h=x'));
  const form = recordToBaziForm(decodeBaziLink(query));
  assert.equal(form.timeMode, 'unknown');
  assert.equal(form.hourIndex, null);
  assert.equal(decodeBaziLink(''), null);
  assert.equal(decodeBaziLink('cal=s&d=1998-1-2'), null);
  assert.equal(decodeBaziLink('cal=s&d=1998-13-2&g=m&h=4'), null);
  assert.equal(decodeBaziLink('cal=s&d=1998-1-2&g=m&h=99'), null);
  assert.equal(decodeBaziLink('d=abc'), null);
});

test('hash 查询串与完整链接', () => {
  assert.equal(hashQueryOf('#/bazi?cal=s&d=1998-1-2'), 'cal=s&d=1998-1-2');
  assert.equal(hashQueryOf('#/bazi'), '');
  assert.equal(hashQueryOf(''), '');
  const url = buildBaziShareUrl(baseForm, { location: { origin: 'https://www.gushupaiapp.online', pathname: '/' } });
  assert.equal(url, 'https://www.gushupaiapp.online/#/bazi?cal=s&d=1998-1-2&g=m&h=4&n=%E6%9D%A8%E5%85%88%E7%94%9F');
});
