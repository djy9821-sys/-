import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { baziChartSignature, buildBaziRecord, findSameBaziRecord, parseClockTime, recordToBaziForm } from '../src/utils/baziRecord.js';

const form = {
  personName: '杨先生',
  calendarType: 'solar',
  year: 1998,
  month: 1,
  day: 2,
  hourIndex: 4,
  gender: 'male',
  daySect: 2,
  timeMode: 'exact',
  clockTime: '07:30',
  placeProvince: '河南',
  placeCity: '信阳',
  longitude: '115.65',
  timezone: 8,
  applyTrueSolar: true,
  applyDst: false,
};

test('八字命例存档后可完整还原（含真太阳时设置）', () => {
  const chart = buildBaziChart({
    ...form, clockHour: 7, clockMinute: 30,
  });
  const record = buildBaziRecord(form, chart, { group: 'self', note: '本人' });

  assert.equal(record.type, 'bazi');
  assert.equal(record.birthDate, '1998-1-2');
  assert.equal(record.solarDate, '1998-01-02');
  assert.equal(record.timeHour, 4);
  assert.equal(record.data.longitude, 115.65);

  const restored = recordToBaziForm({ ...record, id: 'x', createdAt: 1 });
  assert.deepEqual(restored, { ...form, longitude: '115.65', yearBoundary: 'lichun' });
});

test('紫微档案可直接带入八字，闰月转为负数月份', () => {
  const restored = recordToBaziForm({
    id: 'z', name: '母亲', type: 'ziwei', gender: 'female', calendarType: 'lunar',
    birthDate: '2023-2-10', isLeapMonth: true, timeHour: 12,
  });
  assert.equal(restored.month, -2);
  assert.equal(restored.hourIndex, 12);
  assert.equal(restored.timeMode, 'shichen');
});

test('资料不完整或非命盘记录返回 null', () => {
  assert.equal(recordToBaziForm({ type: 'money', gender: 'male', birthDate: '2000-1-1', timeHour: 1 }), null);
  assert.equal(recordToBaziForm({ type: 'bazi', gender: 'male', birthDate: '', timeHour: 1 }), null);
  assert.equal(recordToBaziForm({ type: 'bazi', gender: 'male', birthDate: '2000-1-1', timeHour: 13 }), null);
  assert.equal(parseClockTime('7:30'), null);
  assert.deepEqual(parseClockTime('23:05'), { hour: 23, minute: 5 });
});

test('同名、同一张盘再次存档时能找到原记录，不同名或不同时间不算重复', () => {
  const chart = buildBaziChart({ ...form, clockHour: 7, clockMinute: 30 });
  const saved = { ...buildBaziRecord(form, chart, { group: 'self' }), id: 'a1', createdAt: 1 };
  const again = buildBaziRecord(form, chart, { group: 'customer', note: '再存一次' });

  assert.equal(findSameBaziRecord([saved], again)?.id, 'a1');
  assert.equal(baziChartSignature(saved), baziChartSignature(again));

  const otherPerson = buildBaziRecord({ ...form, personName: '李女士' }, chart);
  assert.equal(findSameBaziRecord([saved], otherPerson), null);

  const otherTime = buildBaziRecord({ ...form, clockTime: '07:10' }, chart);
  assert.equal(findSameBaziRecord([saved], otherTime), null);

  const ziweiRecord = { ...saved, id: 'z1', type: 'ziwei' };
  assert.equal(findSameBaziRecord([ziweiRecord], again), null);
  assert.equal(findSameBaziRecord(null, again), null);
});
