import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveZiweiExact, ziweiRecordToExactForm } from '../src/utils/ziweiTime.js';

test('紫微精确到分钟：钟表 07:30 信阳附近 → 辰时，并提示卯时交界', () => {
  const result = resolveZiweiExact({
    calendarType: 'solar', birthDate: '1998-01-02', clockTime: '07:30',
    placeProvince: '河南', placeCity: '信阳', longitude: '115.65', timezone: 8, applyDst: null,
  });
  assert.equal(result.hourIndex, 4);
  assert.equal(result.hourName, '辰时');
  assert.equal(result.solarDate, '1998-01-02');
  assert.equal(result.placeName, '信阳附近');
  assert.equal(result.timeInfo.correctedTime, '07:09');
  assert.equal(result.timeInfo.boundary.alternative.hourName, '卯时');
  assert.equal(result.applyDst, false);
});

test('农历输入与闰月也能换算；没有钟表时间或日期时返回 null', () => {
  const lunar = resolveZiweiExact({ calendarType: 'lunar', birthDate: '1997-12-04', clockTime: '07:30', longitude: 115.65, timezone: 8 });
  assert.equal(lunar.solarDate, '1998-01-02');
  assert.equal(lunar.hourIndex, 4);
  assert.equal(resolveZiweiExact({ calendarType: 'solar', birthDate: '', clockTime: '07:30' }), null);
  assert.equal(resolveZiweiExact({ calendarType: 'solar', birthDate: '1998-01-02', clockTime: '7:30' }), null);
});

test('夏令时年份自动建议，并可手动关闭', () => {
  const auto = resolveZiweiExact({ calendarType: 'solar', birthDate: '1988-07-01', clockTime: '12:00', longitude: 116.41, timezone: 8, applyDst: null });
  assert.equal(auto.dstSuggested, true);
  assert.equal(auto.applyDst, true);
  const manual = resolveZiweiExact({ calendarType: 'solar', birthDate: '1988-07-01', clockTime: '12:00', longitude: 116.41, timezone: 8, applyDst: false });
  assert.equal(manual.applyDst, false);
  assert.notEqual(auto.timeInfo.correctedTime, manual.timeInfo.correctedTime);
});

test('档案记录 → 精确时间表单', () => {
  const record = {
    type: 'ziwei', calendarType: 'solar', birthDate: '1998-01-02', timeHour: 4,
    data: { timeMode: 'exact', clockTime: '07:30', placeProvince: '河南', placeCity: '信阳', longitude: 115.65, timezone: 8, applyTrueSolar: true, applyDst: false },
  };
  const form = ziweiRecordToExactForm(record);
  assert.equal(form.clockTime, '07:30');
  assert.equal(resolveZiweiExact(form).hourIndex, 4);
  assert.equal(ziweiRecordToExactForm({ type: 'ziwei', data: {} }), null);
});
