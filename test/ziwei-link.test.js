import test from 'node:test';
import assert from 'node:assert/strict';

import { buildZiweiShareUrl, decodeZiweiLink, encodeZiweiLink, hashQueryOf } from '../src/utils/baziLink.js';
import { resolveZiweiExact, ziweiRecordToExactForm } from '../src/utils/ziweiTime.js';

const shichenForm = { calendarType: 'solar', birthDate: '1990-5-20', isLeapMonth: false, gender: 'male', timeMode: 'shichen', hourIndex: 6, name: '测试' };

test('时辰模式：编码、解码得到可直接排盘的紫微记录', () => {
  const query = encodeZiweiLink(shichenForm);
  assert.equal(query, 'cal=s&d=1990-05-20&g=m&h=6&n=%E6%B5%8B%E8%AF%95');
  const record = decodeZiweiLink(query);
  assert.equal(record.type, 'ziwei');
  assert.equal(record.name, '测试');
  assert.equal(record.gender, 'male');
  assert.equal(record.calendarType, 'solar');
  assert.equal(record.birthDate, '1990-05-20');
  assert.equal(record.timeHour, 6);
  assert.equal(record.isLeapMonth, false);
  assert.equal(record.fromLink, true);
  assert.deepEqual(record.data, { lateZi: 'next' });
  assert.equal(ziweiRecordToExactForm(record), null);
});

test('晚子时流派：不换日写入 zi=s，换次日（默认）不占参数', () => {
  const same = encodeZiweiLink({ ...shichenForm, hourIndex: 12, lateZiMode: 'same' });
  assert.equal(same, 'cal=s&d=1990-05-20&g=m&h=12&zi=s&n=%E6%B5%8B%E8%AF%95');
  assert.equal(decodeZiweiLink(same).data.lateZi, 'same');
  const next = encodeZiweiLink({ ...shichenForm, hourIndex: 12, lateZiMode: 'next' });
  assert.ok(!next.includes('zi='));
  assert.equal(decodeZiweiLink(next).data.lateZi, 'next');
  const exact = decodeZiweiLink(encodeZiweiLink({ ...shichenForm, timeMode: 'exact', clockTime: '23:30', longitude: 116.4, lateZiMode: 'same' }));
  assert.equal(exact.data.lateZi, 'same');
  assert.equal(exact.data.timeMode, 'exact');
});

test('农历闰月与精确时间：出生地、时区、夏令时都在链接里', () => {
  const lunar = encodeZiweiLink({ calendarType: 'lunar', birthDate: '1990-05-20', isLeapMonth: true, gender: 'female', timeMode: 'shichen', hourIndex: 12 }, { name: '甲乙丙丁戊己庚辛壬癸甲乙丙丁戊己庚辛壬癸多出来的' });
  const lunarRecord = decodeZiweiLink(lunar);
  assert.equal(lunarRecord.calendarType, 'lunar');
  assert.equal(lunarRecord.isLeapMonth, true);
  assert.equal(lunarRecord.timeHour, 12);
  assert.equal(lunarRecord.gender, 'female');
  assert.equal(lunarRecord.name.length, 20);

  const exact = encodeZiweiLink({
    calendarType: 'solar', birthDate: '1988-07-15', gender: 'male', timeMode: 'exact', clockTime: '09:05',
    placeProvince: '河北省', placeCity: '石家庄', longitude: '114.48', timezone: 8, applyDst: true,
  }, { name: '阿明' });
  assert.equal(exact, 'cal=s&d=1988-07-15&g=m&c=09%3A05&lon=114.48&prov=%E6%B2%B3%E5%8C%97%E7%9C%81&city=%E7%9F%B3%E5%AE%B6%E5%BA%84&dst=1&n=%E9%98%BF%E6%98%8E');
  const record = decodeZiweiLink(exact);
  assert.equal(record.data.timeMode, 'exact');
  assert.equal(record.data.clockTime, '09:05');
  assert.equal(record.data.longitude, 114.48);
  assert.equal(record.data.timezone, 8);
  assert.equal(record.data.placeCity, '石家庄');
  assert.equal(record.data.applyDst, true);
  // 记录能走档案同一条路：换算真太阳时得到时辰。
  const form = ziweiRecordToExactForm(record);
  assert.equal(form.clockTime, '09:05');
  assert.equal(form.applyDst, true);
  const resolved = resolveZiweiExact(form);
  assert.ok(Number.isInteger(resolved.hourIndex));
  assert.equal(resolved.applyDst, true);

  // 没写 dst 时按年份自动判断；tz 非 8 时写入。
  const auto = decodeZiweiLink(encodeZiweiLink({ calendarType: 'solar', birthDate: '2000-01-01', gender: 'male', timeMode: 'exact', clockTime: '23:30', timezone: 7, applyDst: null }));
  assert.equal(auto.data.applyDst, null);
  assert.equal(auto.data.timezone, 7);
  assert.equal(auto.data.longitude, null);
  assert.equal(auto.data.applyTrueSolar, false);
});

test('无效链接返回 null；完整链接以 #/ziwei? 开头', () => {
  assert.equal(decodeZiweiLink(''), null);
  assert.equal(decodeZiweiLink('cal=s&d=1990-05-20'), null);
  assert.equal(decodeZiweiLink('cal=s&d=1990-13-20&g=m&h=6'), null);
  assert.equal(decodeZiweiLink('cal=s&d=1990-05-20&g=m&h=13'), null);
  assert.equal(decodeZiweiLink('cal=s&d=1990-05-20&g=x&h=6'), null);
  assert.equal(encodeZiweiLink({ calendarType: 'solar', birthDate: '', gender: 'male' }), '');
  const url = buildZiweiShareUrl(shichenForm, { location: { origin: 'https://www.gushupaiapp.online', pathname: '/' } });
  assert.equal(url, 'https://www.gushupaiapp.online/#/ziwei?cal=s&d=1990-05-20&g=m&h=6&n=%E6%B5%8B%E8%AF%95');
  assert.equal(decodeZiweiLink(hashQueryOf(url.slice(url.indexOf('#')))).birthDate, '1990-05-20');
});
