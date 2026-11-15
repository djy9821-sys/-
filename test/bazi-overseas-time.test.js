/**
 * 海外出生与真太阳时的两个口径：
 *
 * 1. 交节按出生的绝对时刻比。节气是天文上的同一个瞬间（库里用北京时间给出），
 *    年柱、月柱、起运拿出生时刻换成北京时间去比；日柱、时柱看当地的太阳，仍用真太阳时。
 * 2. 历史时区。马来西亚半岛与新加坡 1982 年以前用 UTC+7:30，爪哇 1964 年以前用 UTC+7:30，
 *    西加里曼丹 1964–1987 年用 UTC+8。按现在的时区换算这些年份的出生时间，时柱会错。
 *
 * 例子都是造出来的时刻，不是真人。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { LunarUtil, Solar } from 'lunar-javascript';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { buildBaziPrompt } from '../src/utils/baziPrompt.js';
import { getZoneOffsetHours } from '../src/utils/trueSolarTime.js';
import {
  BIRTH_PROVINCES,
  findBirthPlace,
  formatUtcOffset,
  historicalTimezoneOf,
  isBeforeZoneRecord,
  NON_MAINLAND_PROVINCES,
  OVERSEAS_PROVINCES,
  TIMEZONE_OPTIONS,
} from '../src/utils/birthPlaces.js';

const NOW = new Date('2026-11-15T00:00:00Z');
const pillarText = (chart) => chart.pillars.map(({ ganZhi }) => ganZhi).join(' ');
const exact = (date, time, place, extra = {}) => {
  const [year, month, day] = date.split('-').map(Number);
  const [clockHour, clockMinute] = time.split(':').map(Number);
  return buildBaziChart({
    calendarType: 'solar', year, month, day, timeMode: 'exact', clockHour, clockMinute, gender: 'male', ...place, ...extra,
  }, NOW);
};

const JAKARTA = { longitude: 106.85, timezone: 7 };
const KUALA_LUMPUR = { longitude: 101.69, timezone: 8 };
const URUMQI = { longitude: 87.62, timezone: 8 };
const TOKYO = { longitude: 139.69, timezone: 9 };

test('2024 年立春与惊蛰的时刻（北京时间），下面各例以此为准', () => {
  const table = Solar.fromYmd(2024, 6, 1).getLunar().getJieQiTable();
  assert.equal(table['立春'].toYmdHms(), '2024-02-04 16:27:07');
  assert.equal(table['惊蛰'].toYmdHms(), '2024-03-05 10:22:45');
});

test('交节按绝对时刻：雅加达立春后 18 分钟出生，年柱月柱已换', () => {
  // 当地 15:45 是北京时间 16:45；真太阳时 15:39，只看它会以为还没到立春。
  const chart = exact('2024-02-04', '15:45', JAKARTA);
  assert.equal(pillarText(chart), '甲辰 丙寅 戊戌 庚申');
  assert.equal(chart.timeInfo.correctedTime, '15:39');
  assert.equal(`${chart.timeInfo.instantDate} ${chart.timeInfo.instantTime}`, '2024-02-04 16:45');
  assert.deepEqual(chart.timeInfo.jieAdjustment, { year: '癸卯', month: '乙丑' });
  assert.equal(chart.yearBoundary.lichun, '甲辰');
  assert.equal(chart.lunarInfo.zodiacExact, '龙');
  // 日柱、时柱不动：仍按当地真太阳时。
  assert.equal(chart.input.hourOption.name, '申时');
});

test('交节按绝对时刻：雅加达立春前 7 分钟出生，仍在上一年', () => {
  // 当地 15:20 是北京时间 16:20，还没到 16:27。
  const chart = exact('2024-02-04', '15:20', JAKARTA);
  assert.equal(pillarText(chart).slice(0, 5), '癸卯 乙丑');
  assert.equal(chart.timeInfo.jieAdjustment, null);
});

test('交节按绝对时刻：吉隆坡、乌鲁木齐真太阳时比钟表早一两个小时，立春后出生不能排回上一年', () => {
  const kualaLumpur = exact('2024-02-04', '16:40', KUALA_LUMPUR);
  assert.equal(kualaLumpur.timeInfo.correctedTime, '15:13');
  assert.equal(pillarText(kualaLumpur), '甲辰 丙寅 戊戌 庚申');
  assert.deepEqual(kualaLumpur.timeInfo.jieAdjustment, { year: '癸卯', month: '乙丑' });

  const urumqi = exact('2024-02-04', '16:40', URUMQI);
  assert.equal(urumqi.timeInfo.correctedTime, '14:17');
  assert.equal(pillarText(urumqi).slice(0, 5), '甲辰 丙寅');
  assert.equal(urumqi.input.hourOption.name, '未时');
});

test('交节按绝对时刻：东京真太阳时比北京时间晚，立春前出生不能提前换年', () => {
  // 东京 17:20 是北京时间 16:20，还没到立春；真太阳时约 17:25，只看它会以为已过。
  const chart = exact('2024-02-04', '17:20', TOKYO);
  assert.equal(pillarText(chart).slice(0, 5), '癸卯 乙丑');
  assert.deepEqual(chart.timeInfo.jieAdjustment, { year: '甲辰', month: '丙寅' });
  assert.equal(chart.lunarInfo.zodiacExact, '兔');
});

test('交节按绝对时刻：不开真太阳时，别的时区也要换成北京时间再比', () => {
  const chart = exact('2024-02-04', '15:45', { timezone: 7 });
  assert.equal(chart.timeInfo.trueSolarApplied, false);
  assert.equal(pillarText(chart), '甲辰 丙寅 戊戌 庚申');
});

test('交节按绝对时刻：月柱同理（惊蛰），年柱、日柱、时柱不受影响', () => {
  // 吉隆坡 10:40 已过惊蛰（10:22）；真太阳时约 09:16。
  const after = exact('2024-03-05', '10:40', KUALA_LUMPUR);
  assert.equal(after.pillars[1].ganZhi, '丁卯');
  assert.deepEqual(after.timeInfo.jieAdjustment, { year: '甲辰', month: '丙寅' });
  const before = exact('2024-03-05', '10:10', KUALA_LUMPUR);
  assert.equal(before.pillars[1].ganZhi, '丙寅');
  assert.equal(before.timeInfo.jieAdjustment, null);
  // 年柱、日柱相同；时柱各按自己的真太阳时（09:16 巳时、08:46 辰时）。
  assert.equal(after.pillars[0].ganZhi, before.pillars[0].ganZhi);
  assert.equal(after.pillars[2].ganZhi, before.pillars[2].ganZhi);
  assert.equal(after.input.hourOption.name, '巳时');
  assert.equal(before.input.hourOption.name, '辰时');
});

test('年月与日时出自两个时刻时，大运、胎元、命宫、身宫与同一刻的北京时间盘一致', () => {
  // 雅加达 15:45 与北京 16:45 是同一刻，时辰也同在申时，所以整张盘应当一样。
  const jakarta = exact('2024-02-04', '15:45', JAKARTA);
  const beijing = exact('2024-02-04', '16:45', { timezone: 8 });
  assert.equal(pillarText(jakarta), pillarText(beijing));
  assert.deepEqual(jakarta.pillars.map((pillar) => ({ ...pillar })), beijing.pillars.map((pillar) => ({ ...pillar })));
  assert.deepEqual(jakarta.yun.dayun.map((item) => item.ganZhi), beijing.yun.dayun.map((item) => item.ganZhi));
  assert.deepEqual(jakarta.yun.xiaoYun.years.map((item) => item.xiaoYun?.ganZhi), beijing.yun.xiaoYun.years.map((item) => item.xiaoYun?.ganZhi));
  assert.equal(jakarta.yun.forward, beijing.yun.forward);
  assert.deepEqual(
    [jakarta.extras.taiYuan, jakarta.extras.mingGong, jakarta.extras.shenGong, jakarta.extras.mingGongNaYin, jakarta.extras.shenGongNaYin],
    [beijing.extras.taiYuan, beijing.extras.mingGong, beijing.extras.shenGong, beijing.extras.mingGongNaYin, beijing.extras.shenGongNaYin],
  );
  // 交运时刻换回当地标准时间：比北京时间早一小时。
  const toMinutes = (text) => Date.parse(`${text.replace(' ', 'T')}Z`) / 60000;
  assert.equal(toMinutes(beijing.yun.startSolar) - toMinutes(jakarta.yun.startSolar), 60);
});

test('小运从当地真太阳时的时柱起数，顺逆跟着按绝对时刻排出的年干', () => {
  const expected = (chart, forward) => {
    const timeIndex = LunarUtil.getJiaZiIndex(chart.pillars[3].ganZhi);
    return chart.yun.xiaoYun.years.map((_, index) => LunarUtil.JIA_ZI[(((timeIndex + (forward ? 1 : -1) * (index + 1)) % 60) + 60) % 60]);
  };
  // 雅加达 16:30 是北京时间 17:30（酉时），当地真太阳时 16:24（申时）：小运要从申时柱起。
  // 已过立春，甲辰年阳男顺行；只看当地真太阳时会当成癸卯年阴男逆行。
  const jakarta = exact('2024-02-04', '16:30', JAKARTA);
  assert.equal(jakarta.input.hourOption.name, '申时');
  assert.equal(jakarta.pillars[0].ganZhi, '甲辰');
  assert.equal(jakarta.yun.forward, true);
  assert.ok(jakarta.yun.xiaoYun.years.length >= 9);
  assert.deepEqual(jakarta.yun.xiaoYun.years.map((item) => item.xiaoYun.ganZhi), expected(jakarta, true));
  // 东京 17:20 是北京时间 16:20，还没到立春，癸卯年阴男逆行；当地真太阳时已在酉时，小运从酉时柱倒数。
  const tokyo = exact('2024-02-04', '17:20', TOKYO);
  assert.equal(tokyo.input.hourOption.name, '酉时');
  assert.equal(tokyo.pillars[0].ganZhi, '癸卯');
  assert.equal(tokyo.yun.forward, false);
  assert.ok(tokyo.yun.xiaoYun.years.length >= 9);
  assert.deepEqual(tokyo.yun.xiaoYun.years.map((item) => item.xiaoYun.ganZhi), expected(tokyo, false));
});

test('没有跨节的盘：小运、命宫、身宫与库里直接算的一致', () => {
  // 开了真太阳时就会走「年月与日时分开取」的路；不在交节附近时，结果必须和库里按同一刻直接算的相同。
  const cities = [{ longitude: 116.41, timezone: 8 }, URUMQI, KUALA_LUMPUR, JAKARTA, TOKYO, { longitude: 121.47, timezone: 8 }];
  let checked = 0;
  for (let index = 0; index < 240; index += 1) {
    const year = 1940 + ((index * 37) % 80);
    const month = 1 + ((index * 5) % 12);
    const day = 1 + ((index * 11) % 28);
    const hour = (index * 7) % 24;
    const minute = (index * 13) % 60;
    const chart = buildBaziChart({
      calendarType: 'solar', year, month, day, timeMode: 'exact', clockHour: hour, clockMinute: minute, gender: index % 2 ? 'male' : 'female', ...cities[index % cities.length],
    }, NOW);
    if (chart.timeInfo.jieAdjustment) continue;
    const [date, time] = [chart.timeInfo.correctedDate, chart.timeInfo.correctedTime];
    const [y, m, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    const eightChar = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar();
    eightChar.setSect(2);
    const childhood = eightChar.getYun(index % 2 ? 1 : 0, 2).getDaYun(2)[0];
    assert.equal(pillarText(chart), [eightChar.getYear(), eightChar.getMonth(), eightChar.getDay(), eightChar.getTime()].join(' '), `${date} ${time}`);
    assert.equal(chart.extras.mingGong, eightChar.getMingGong(), `${date} ${time} 命宫`);
    assert.equal(chart.extras.shenGong, eightChar.getShenGong(), `${date} ${time} 身宫`);
    assert.equal(chart.extras.taiYuan, eightChar.getTaiYuan(), `${date} ${time} 胎元`);
    // 起运年数相同时，小运逐年相同（起运时刻差几天，偶尔会差出一年，那几例只比较共有的年份）。
    const library = childhood.getXiaoYun().map((item) => item.getGanZhi());
    const ours = (chart.yun.xiaoYun?.years ?? []).map((item) => item.xiaoYun?.ganZhi);
    const shared = Math.min(library.length, ours.length);
    assert.deepEqual(ours.slice(0, shared), library.slice(0, shared), `${date} ${time} 小运`);
    checked += 1;
  }
  assert.ok(checked > 200, `只核到 ${checked} 例`);
});

test('起运按绝对时刻算：真太阳时比钟表早的地方，顺行的起运不再偏晚', () => {
  // 乌鲁木齐真太阳时比北京时间早两小时多。按真太阳时去量「到下一个节还有多久」会多量两小时，起运晚十来天。
  const urumqi = exact('1990-06-15', '10:00', URUMQI);
  const beijingClock = exact('1990-06-15', '10:00', { timezone: 8 });
  assert.equal(urumqi.yun.forward, beijingClock.yun.forward);
  assert.equal(urumqi.yun.startSolar, beijingClock.yun.startSolar);
});

test('提示词：跨节的盘写明年柱月柱按绝对时刻取', () => {
  const prompt = buildBaziPrompt({ chart: exact('2024-02-04', '15:45', JAKARTA), now: NOW });
  assert.match(prompt, /交节：出生在交节前后.*北京时间 2024-02-04 16:45.*取甲辰年丙寅月.*会排成癸卯年乙丑月/);
  const plain = buildBaziPrompt({ chart: exact('2024-02-04', '15:20', JAKARTA), now: NOW });
  assert.doesNotMatch(plain, /交节：/);
});

test('历史时区：时区库里各地各年的实际偏移', () => {
  const at = (zone, year, month = 6, day = 15, hour = 12, minute = 0) => getZoneOffsetHours(zone, { year, month, day, hour, minute });
  assert.equal(at('Asia/Kuala_Lumpur', 1975), 7.5);
  assert.equal(at('Asia/Kuala_Lumpur', 1981, 12, 31, 23, 50), 7.5);
  assert.equal(at('Asia/Kuala_Lumpur', 1982, 1, 1, 12, 0), 8);
  assert.equal(at('Asia/Singapore', 1975), 7.5);
  assert.equal(at('Asia/Kuching', 1975), 8);
  assert.equal(at('Asia/Jakarta', 1960), 7.5);
  assert.equal(at('Asia/Jakarta', 1964, 6, 15), 7);
  assert.equal(at('Asia/Pontianak', 1985), 8);
  assert.equal(at('Asia/Pontianak', 1990), 7);
  assert.equal(at('Asia/Makassar', 1960), 8);
  assert.equal(at('Asia/Nowhere', 2000), null);
  assert.equal(getZoneOffsetHours('', { year: 2000, month: 1, day: 1 }), null);
  assert.equal(getZoneOffsetHours('Asia/Jakarta', null), null);
});

test('历史时区：差半小时，时柱不同', () => {
  // 吉隆坡 1975 年用 UTC+7:30。钟表 08:00：按现在的 UTC+8 是卯时，按当年的时区是辰时。
  const klNow = exact('1975-06-15', '08:00', { longitude: 101.69, timezone: 8 }, { gender: 'female' });
  const klThen = exact('1975-06-15', '08:00', { longitude: 101.69, timezone: 7.5 }, { gender: 'female' });
  assert.equal(klNow.pillars[3].ganZhi, '癸卯');
  assert.equal(klThen.pillars[3].ganZhi, '甲辰');
  assert.equal(klThen.timeInfo.correctedTime, '07:17');
  // 雅加达 1960 年用 UTC+7:30。钟表 07:10：按现在的 UTC+7 是辰时，按当年的时区是卯时。
  const jktNow = exact('1960-06-15', '07:10', { longitude: 106.85, timezone: 7 });
  const jktThen = exact('1960-06-15', '07:10', { longitude: 106.85, timezone: 7.5 });
  assert.equal(jktNow.pillars[3].ganZhi, '戊辰');
  assert.equal(jktThen.pillars[3].ganZhi, '丁卯');
});

test('出生地表：马来西亚、印尼的城市带时区资料，现在的时区与时区库一致', () => {
  const groups = Object.fromEntries(BIRTH_PROVINCES.map((item) => [item.province, item.cities]));
  assert.ok(groups['马来西亚'].length >= 15);
  assert.ok(groups['印度尼西亚'].length >= 19);
  assert.ok(NON_MAINLAND_PROVINCES.has('马来西亚') && NON_MAINLAND_PROVINCES.has('印度尼西亚'));
  assert.ok(TIMEZONE_OPTIONS.some((option) => option.value === 7.5));
  const today = { year: 2020, month: 6, day: 15, hour: 12, minute: 0 };
  let withZone = 0;
  BIRTH_PROVINCES.forEach(({ cities }) => cities.forEach((city) => {
    if (!city.zone) return;
    withZone += 1;
    assert.ok(Number.isInteger(city.zoneSince) && city.zoneSince >= 1946 && city.zoneSince <= 1964, `${city.name} 起始年`);
    assert.equal(historicalTimezoneOf(city, today), city.timezone, `${city.name} 现在的时区`);
  }));
  assert.ok(withZone >= 36);
});

test('出生地表：海外的几组单列出来，录入页排在最前面', () => {
  assert.deepEqual([...OVERSEAS_PROVINCES], ['马来西亚', '印度尼西亚', '海外（亚洲）']);
  const names = new Set(BIRTH_PROVINCES.map((item) => item.province));
  OVERSEAS_PROVINCES.forEach((name) => assert.ok(names.has(name), `${name} 在出生地表里`));
});

test('出生地表：按出生日期取当年的时区；资料靠不住的年份不自动换算', () => {
  const at = (year) => ({ year, month: 6, day: 15, hour: 8, minute: 0 });
  const kualaLumpur = findBirthPlace('马来西亚', '吉隆坡');
  assert.equal(historicalTimezoneOf(kualaLumpur, at(1975)), 7.5);
  assert.equal(historicalTimezoneOf(kualaLumpur, at(1990)), 8);
  assert.equal(historicalTimezoneOf(kualaLumpur, at(1940)), null);
  assert.equal(isBeforeZoneRecord(kualaLumpur, at(1940)), true);
  assert.equal(historicalTimezoneOf(findBirthPlace('海外（亚洲）', '新加坡'), at(1975)), 7.5);
  assert.equal(historicalTimezoneOf(findBirthPlace('马来西亚', '古晋'), at(1975)), 8);
  assert.equal(historicalTimezoneOf(findBirthPlace('印度尼西亚', '雅加达'), at(1960)), 7.5);
  assert.equal(historicalTimezoneOf(findBirthPlace('印度尼西亚', '坤甸'), at(1985)), 8);
  // 棉兰在苏门答腊，1964 年以前另有时区，时区库里跟的是雅加达，不能照搬。
  const medan = findBirthPlace('印度尼西亚', '棉兰');
  assert.equal(historicalTimezoneOf(medan, at(1960)), null);
  assert.equal(isBeforeZoneRecord(medan, at(1960)), true);
  assert.equal(historicalTimezoneOf(medan, at(1970)), 7);
  // 没有时区资料的城市、没填日期：返回 null，沿用城市现在的时区。
  assert.equal(historicalTimezoneOf(findBirthPlace('海外（亚洲）', '河内'), at(1960)), null);
  assert.equal(historicalTimezoneOf(findBirthPlace('河南', '信阳'), at(1988)), null);
  assert.equal(historicalTimezoneOf(kualaLumpur, null), null);
  assert.equal(isBeforeZoneRecord(findBirthPlace('河南', '信阳'), at(1900)), false);
});

test('时区的写法：整点、半点和老时区都能写成钟点', () => {
  assert.equal(formatUtcOffset(8), 'UTC+8');
  assert.equal(formatUtcOffset(7.5), 'UTC+7:30');
  assert.equal(formatUtcOffset(22 / 3), 'UTC+7:20');
  assert.equal(formatUtcOffset(-3.5), 'UTC−3:30');
});
