import test from 'node:test';
import assert from 'node:assert/strict';

import { describeCurrentPlace, formatLongitude, locateCurrentPlace, normalizePlace, placeDisplayName, toLocalSolarNow } from '../src/utils/currentPlace.js';

const hcmc = { province: '海外（亚洲）', city: '胡志明市', longitude: 106.7, timezone: 7 };

test('设备在越南、所在地胡志明市：此刻按真太阳时约快 20 多分钟', () => {
  // 2026-10-26 08:52 越南时间 = 01:52 UTC
  const now = new Date(Date.UTC(2026, 9, 26, 1, 52, 0));
  const solar = toLocalSolarNow(now, hcmc);
  // 经度时差 (106.7-105)*4 ≈ +6.8 分，10 月底均时差约 +16 分
  assert.equal(solar.getFullYear(), 2026);
  assert.equal(solar.getMonth(), 9);
  assert.equal(solar.getDate(), 26);
  const minutes = solar.getHours() * 60 + solar.getMinutes();
  assert.ok(minutes >= 9 * 60 + 10 && minutes <= 9 * 60 + 20, `got ${solar.getHours()}:${solar.getMinutes()}`);
});

test('设备时区与所在地时区不同也按所在地算', () => {
  // 北京时间 09:52（同一瞬间），所在地仍是胡志明市，结果应与上面相同
  const now = new Date(Date.UTC(2026, 9, 26, 1, 52, 0));
  const a = toLocalSolarNow(now, hcmc);
  const b = toLocalSolarNow(new Date(now.getTime()), { ...hcmc });
  assert.equal(a.getTime(), b.getTime());
});

test('跨日：固始 23:50 北京时间，真太阳时还在前一天', () => {
  const now = new Date(Date.UTC(2026, 0, 2, 15, 50, 0)); // 北京时间 2026-01-02 23:50
  const solar = toLocalSolarNow(now, { province: '河南', city: '固始', longitude: 115.65, timezone: 8 });
  assert.equal(solar.getDate(), 2);
  assert.equal(solar.getHours(), 23);
});

test('没有所在地时原样返回；资料不完整时视为未设置', () => {
  const now = new Date(2026, 9, 26, 8, 52);
  assert.equal(toLocalSolarNow(now, null), now);
  assert.equal(normalizePlace({ longitude: 'abc' }), null);
  assert.equal(normalizePlace({ longitude: 200 }), null);
  assert.deepEqual(normalizePlace({ city: '河内', longitude: 105.85, timezone: '7' }), { province: '', city: '河内', longitude: 105.85, timezone: 7, source: 'manual' });
  assert.equal(describeCurrentPlace(now, null).set, false);
  assert.match(describeCurrentPlace(now, hcmc).detail, /^按胡志明市真太阳时 \d\d:\d\d（比设备时间[+−±]\d+ 分钟）$/);
});

test('定位得到的所在地：只存经度与时区，显示名带「当前定位」', async () => {
  const now = new Date(2026, 9, 26, 8, 52);
  const geolocation = {
    getCurrentPosition: (success) => success({ coords: { latitude: 10.82, longitude: 106.6297, accuracy: 30 } }),
  };
  const place = await locateCurrentPlace(geolocation, now);
  assert.equal(place.longitude, 106.63);
  assert.equal(place.source, 'geo');
  assert.equal(place.timezone, Math.round((-now.getTimezoneOffset() / 60) * 4) / 4);
  assert.equal('latitude' in place, false);
  assert.equal(placeDisplayName(place), '当前定位 东经 106.63°');
  assert.match(describeCurrentPlace(now, place).detail, /^按当前定位 东经 106\.63°真太阳时/);
  assert.equal(formatLongitude(-74.006), '西经 74.01°');

  await assert.rejects(locateCurrentPlace({ getCurrentPosition: (_, fail) => fail({ code: 1, message: 'denied' }) }), (error) => error.code === 'denied');
  await assert.rejects(locateCurrentPlace({ getCurrentPosition: (_, fail) => fail({ code: 3 }) }), (error) => error.code === 'timeout');
  await assert.rejects(locateCurrentPlace(undefined), (error) => error.code === 'unsupported');
});
