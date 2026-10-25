import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getChinaDstPeriod,
  getEquationOfTimeMinutes,
  isChinaDst,
  toTrueSolarTime,
} from '../src/utils/trueSolarTime.js';
import { buildBaziChart } from '../src/utils/baziChart.js';
import { BIRTH_PROVINCES, findBirthPlace } from '../src/utils/birthPlaces.js';

const pillarText = (chart) => chart.pillars.map(({ ganZhi }) => ganZhi).join(' ');
const GUSHI_LONGITUDE = 115.65; // 河南信阳固始县

test('中国 1986–1991 年夏令时起止日期', () => {
  const periods = [1986, 1987, 1988, 1989, 1990, 1991].map((year) => {
    const { start, end } = getChinaDstPeriod(year);
    return `${year}:${start.month}/${start.day}-${end.month}/${end.day}`;
  });
  assert.deepEqual(periods, [
    '1986:5/4-9/14', '1987:4/12-9/13', '1988:4/17-9/11',
    '1989:4/16-9/17', '1990:4/15-9/16', '1991:4/14-9/15',
  ]);
  assert.equal(getChinaDstPeriod(1992), null);
  assert.equal(isChinaDst({ year: 1988, month: 4, day: 17, hour: 1, minute: 59 }), false);
  assert.equal(isChinaDst({ year: 1988, month: 4, day: 17, hour: 2, minute: 0 }), true);
  assert.equal(isChinaDst({ year: 1988, month: 9, day: 11, hour: 2, minute: 0 }), false);
});

test('均时差在一年中的典型值', () => {
  const near = (actual, expected, tolerance = 0.7) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
  near(getEquationOfTimeMinutes({ year: 1998, month: 1, day: 2 }), -3.9);
  near(getEquationOfTimeMinutes({ year: 2026, month: 2, day: 11 }), -14.2);
  near(getEquationOfTimeMinutes({ year: 2026, month: 11, day: 3 }), 16.4);
});

test('固始 1998-01-02 北京时间 07:00 的真太阳时约为 06:39', () => {
  const result = toTrueSolarTime(
    { year: 1998, month: 1, day: 2, hour: 7, minute: 0 },
    { longitude: GUSHI_LONGITUDE, timezone: 8 },
  );
  assert.equal(`${result.hour}:${result.minute}`, '6:39');
  assert.ok(Math.abs(result.longitudeMinutes + 17.4) < 0.01);
});

test('精确时间模式：07:00 换算后为卯时（丁卯），07:30 为辰时并提示交界', () => {
  const base = {
    calendarType: 'solar', year: 1998, month: 1, day: 2, gender: 'male',
    timeMode: 'exact', longitude: GUSHI_LONGITUDE, placeName: '固始',
  };

  const seven = buildBaziChart({ ...base, clockHour: 7, clockMinute: 0 });
  assert.equal(pillarText(seven), '丁丑 壬子 己酉 丁卯');
  assert.equal(seven.timeInfo.correctedTime, '06:39');
  assert.equal(seven.input.hourOption.name, '卯时');

  const sevenThirty = buildBaziChart({ ...base, clockHour: 7, clockMinute: 30 });
  assert.equal(pillarText(sevenThirty), '丁丑 壬子 己酉 戊辰');
  assert.equal(sevenThirty.timeInfo.correctedTime, '07:09');
  assert.equal(sevenThirty.timeInfo.boundary.boundaryClockTime, '07:21');
  assert.equal(sevenThirty.timeInfo.boundary.alternative.timeGanZhi, '丁卯');
  assert.equal(sevenThirty.timeInfo.boundary.isBeforeBoundary, false);
});

test('农历输入与公历输入得到相同的真太阳时命盘', () => {
  const lunar = buildBaziChart({
    calendarType: 'lunar', year: 1997, month: 12, day: 4, gender: 'male',
    timeMode: 'exact', clockHour: 7, clockMinute: 30, longitude: GUSHI_LONGITUDE,
  });
  assert.equal(pillarText(lunar), '丁丑 壬子 己酉 戊辰');
  assert.equal(lunar.timeInfo.clockDate, '1998-01-02');
});

test('未填经度时不做真太阳时校正，夏令时可单独扣除', () => {
  const plain = buildBaziChart({
    calendarType: 'solar', year: 1998, month: 1, day: 2, gender: 'male',
    timeMode: 'exact', clockHour: 7, clockMinute: 30,
  });
  assert.equal(plain.timeInfo.trueSolarApplied, false);
  assert.equal(plain.timeInfo.correctedTime, '07:30');
  assert.equal(plain.timeInfo.boundary, null);

  const summer = {
    calendarType: 'solar', year: 1988, month: 7, day: 1, gender: 'female',
    timeMode: 'exact', clockHour: 9, clockMinute: 30,
  };
  assert.equal(buildBaziChart(summer).input.hourOption.name, '巳时');
  const withDst = buildBaziChart({ ...summer, applyDst: true });
  assert.equal(withDst.input.hourOption.name, '辰时');
  assert.equal(withDst.timeInfo.dstSuggested, true);
});

test('真太阳时跨过午夜时日期一并回退', () => {
  const chart = buildBaziChart({
    calendarType: 'solar', year: 2000, month: 1, day: 1, gender: 'male',
    timeMode: 'exact', clockHour: 0, clockMinute: 10, longitude: 87.62, placeName: '乌鲁木齐',
  });
  assert.equal(chart.timeInfo.correctedDate, '1999-12-31');
  assert.equal(chart.input.hourOption.name, '亥时');
  assert.equal(chart.solarInfo.ymd, '1999-12-31');
});

test('出生地表：省份齐全且经度合理', () => {
  assert.ok(BIRTH_PROVINCES.length >= 35);
  BIRTH_PROVINCES.forEach(({ cities }) => cities.forEach(({ name, longitude, timezone }) => {
    assert.ok(longitude > 70 && longitude < 145, `${name} ${longitude}`);
    assert.ok(timezone >= 7 && timezone <= 9, `${name} ${timezone}`);
  }));
  assert.equal(findBirthPlace('河南', '信阳').longitude, 114.09);
  assert.equal(findBirthPlace('海外（亚洲）', '胡志明市').timezone, 7);
});
