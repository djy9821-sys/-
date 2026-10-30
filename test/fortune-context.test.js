import test from 'node:test';
import assert from 'node:assert/strict';
import { astro } from 'iztro';

import {
  birthLunarYearOf,
  buildCurrentFortuneContext,
  flowYearOf,
  formatLocalDate,
  getCurrentTimeIndex,
  getLunarMonthDays,
  getLunarMonthOptions,
  getFortuneScopeKeys,
  getTimelineFortune,
} from '../src/utils/fortuneContext.js';
import { generateFortunePromptText } from '../src/utils/aiPrompts.js';
import { createZiweiHoroscope, getZiweiFortune } from '../src/utils/ziweiBirth.js';
import { buildFlyYearMarkers } from '../src/utils/ziweiMutations.js';

const BASIC_INFO = {
  gender: 'male',
  birthday: '1990-1-1',
  birthTime: '早子时',
};

const createNatalChart = () => astro.bySolar(
  BASIC_INFO.birthday,
  0,
  '男',
  true,
  'zh-CN',
);

test('当前时辰区分早子时和晚子时', () => {
  assert.equal(getCurrentTimeIndex(new Date(2024, 1, 10, 0, 30)), 0);
  assert.equal(getCurrentTimeIndex(new Date(2024, 1, 10, 1, 0)), 1);
  assert.equal(getCurrentTimeIndex(new Date(2024, 1, 10, 22, 59)), 11);
  assert.equal(getCurrentTimeIndex(new Date(2024, 1, 10, 23, 30)), 12);
});

test('本地日期不使用 UTC 转换', () => {
  assert.equal(formatLocalDate(new Date(2024, 1, 10, 0, 30)), '2024-2-10');
});

test('运限层级从大限递进到目标层', () => {
  assert.deepEqual(getFortuneScopeKeys('yearly'), ['decadal', 'yearly']);
  assert.deepEqual(getFortuneScopeKeys('monthly'), ['decadal', 'yearly', 'monthly']);
  assert.deepEqual(getFortuneScopeKeys('hourly'), ['decadal', 'yearly', 'monthly', 'daily', 'hourly']);
});

test('农历月份只生成 29/30 日并区分闰月', () => {
  assert.equal(getLunarMonthDays(2024, 1), 29);
  assert.equal(getLunarMonthDays(2024, 2), 30);
  assert.equal(getLunarMonthDays(2023, 2, true), 29);

  const options = getLunarMonthOptions(2023);
  assert.ok(options.some((item) => item.month === 2 && item.isLeap === false));
  assert.ok(options.some((item) => item.month === 2 && item.isLeap === true));
});

test('iztro 日期字段契约与当前农历正确', () => {
  const chart = createNatalChart();
  const current = astro.bySolar('2024-2-10', 0, '男', true, 'zh-CN');

  assert.equal(typeof current.lunarDate, 'string');
  assert.equal(current.rawDates.lunarDate.lunarYear, 2024);
  assert.equal(current.rawDates.lunarDate.lunarMonth, 1);
  assert.equal(current.rawDates.lunarDate.lunarDay, 1);
  assert.equal(typeof chart.horoscope, 'function');
});

test('四个“今”运势入口自动填充当前运限', () => {
  const horoscope = createNatalChart();
  const now = new Date(2024, 1, 10, 0, 30);
  const expected = {
    yearly: { month: null, day: null, hour: null },
    monthly: { month: 1, day: null, hour: null },
    daily: { month: 1, day: 1, hour: null },
    hourly: { month: 1, day: 1, hour: 0 },
  };

  Object.entries(expected).forEach(([type, expectedSelection]) => {
    const context = buildCurrentFortuneContext({
      horoscope,
      basicInfo: BASIC_INFO,
      type,
      now,
    });

    assert.equal(context.selection.daxianIndex, context.fortune.decadal.index);
    assert.equal(context.selection.year, 2024);
    assert.equal(context.selection.lunarYear, 2024);
    assert.equal(context.selection.month, expectedSelection.month);
    assert.equal(context.selection.day, expectedSelection.day);
    assert.equal(context.selection.hour, expectedSelection.hour);
    assert.equal(context.activeStems[type], context.fortune[type].heavenlyStem);

    const prompt = generateFortunePromptText(
      type,
      context.selection,
      context.activeStems,
      BASIC_INFO,
      horoscope,
      horoscope.palaces,
      {},
      context,
    );

    assert.ok(prompt);
    assert.doesNotMatch(prompt, /undefined|null/);
    assert.doesNotMatch(prompt, /程序认出的格局/, '没传 patterns 就不写这一行');
    // 传了程序认出的格局（哪怕一个没认出）就在【基本信息】里写一行，AI 论「本命盘格局」时有据。
    const withPatterns = generateFortunePromptText(type, context.selection, context.activeStems, BASIC_INFO, horoscope, horoscope.palaces, {}, context, { patterns: [{ name: '机月同梁格', source: { title: '甲', rule: '乙' } }] });
    assert.match(withPatterns, /【基本信息】\n[\s\S]*?\n程序认出的格局：机月同梁格（甲；原书：乙）\n\n【/);
    assert.match(prompt, /【大限盘】/);
    assert.match(prompt, new RegExp(`【${context.fortune[type].name}盘】`));
    assert.match(prompt, /十二宫叠盘/);
    assert.match(prompt, /流耀落宫/);
  });
});

test('早晚子时的话术时段正确', () => {
  const horoscope = createNatalChart();

  const earlyContext = buildCurrentFortuneContext({
    horoscope,
    basicInfo: BASIC_INFO,
    type: 'hourly',
    now: new Date(2024, 1, 10, 0, 30),
  });
  const earlyPrompt = generateFortunePromptText(
    'hourly',
    earlyContext.selection,
    earlyContext.activeStems,
    BASIC_INFO,
    horoscope,
    horoscope.palaces,
    {},
    earlyContext,
  );
  assert.match(earlyPrompt, /早子时 00:00-01:00/);

  const lateContext = buildCurrentFortuneContext({
    horoscope,
    basicInfo: BASIC_INFO,
    type: 'hourly',
    now: new Date(2024, 1, 10, 23, 30),
  });
  const latePrompt = generateFortunePromptText(
    'hourly',
    lateContext.selection,
    lateContext.activeStems,
    BASIC_INFO,
    horoscope,
    horoscope.palaces,
    {},
    lateContext,
  );

  assert.equal(lateContext.selection.hour, 12);
  assert.match(latePrompt, /晚子时 23:00-24:00/);
  assert.match(latePrompt, /晚子时换次日：流日、流时按次日子时/);
  // 换次日：日期按次日，流日宫位与干支和次日早子时一致。
  assert.equal(lateContext.solarDate, '2024-2-11');
  const nextMorning = buildCurrentFortuneContext({ horoscope, basicInfo: BASIC_INFO, type: 'hourly', now: new Date(2024, 1, 11, 0, 30) });
  assert.equal(lateContext.selection.day, nextMorning.selection.day);
  assert.equal(lateContext.fortune.daily.index, nextMorning.fortune.daily.index);
  assert.equal(lateContext.fortune.daily.heavenlyStem, nextMorning.fortune.daily.heavenlyStem);
  assert.equal(lateContext.fortune.hourly.index, nextMorning.fortune.hourly.index);
  assert.equal(lateContext.activeStems.daily, nextMorning.activeStems.daily);
});

// 专业盘时间轴「手动选」：选到某一天后与「当前运势」同一口径。
const TIMELINE_BIRTH = { calendarType: 'solar', birthDate: '1990-05-20', timeIndex: 6, gender: 'male' };
const pick = (overrides) => ({
  daxianIndex: null, year: null, lunarYear: null, month: null, isLeapMonth: false, day: null, hour: null, ...overrides,
});

test('时间轴只选到年、月：流年取所选年干，流月以农历年干起五虎遁', () => {
  const horoscope = createZiweiHoroscope(TIMELINE_BIRTH);
  const yearOnly = getTimelineFortune(horoscope, pick({ year: 2026, lunarYear: 2026 }));
  assert.deepEqual(yearOnly.stems, { origin: '庚', yearly: '丙' });
  assert.equal(yearOnly.fortune, null);
  // 丙辛之岁寻庚上：正月庚寅……九月戊戌。
  assert.equal(getTimelineFortune(horoscope, pick({ year: 2026, lunarYear: 2026, month: 9 })).stems.monthly, '戊');
  // 所选大限的宫干。
  const decadal = horoscope.palaces[3];
  assert.equal(getTimelineFortune(horoscope, pick({ daxianIndex: decadal.index })).stems.decadal, decadal.heavenlyStem);
});

test('时间轴选到日与时辰：各层干支与 getZiweiFortune 在那一刻一致', () => {
  const horoscope = createZiweiHoroscope(TIMELINE_BIRTH);
  // 农历 2026 年九月十八 = 公历 2026-10-27（甲戌日）。
  const day = getTimelineFortune(horoscope, pick({ year: 2026, lunarYear: 2026, month: 9, day: 18 }));
  assert.equal(day.stems.daily, '甲');
  assert.equal(day.stems.hourly, undefined, '没选时辰就不出流时');
  assert.deepEqual(day.notes, []);
  for (const hour of [0, 5, 11]) {
    const picked = getTimelineFortune(horoscope, pick({ year: 2026, lunarYear: 2026, month: 9, day: 18, hour }));
    const expected = getZiweiFortune(horoscope, new Date(2026, 9, 27, hour === 0 ? 0 : hour * 2 - 1, 30), hour);
    assert.deepEqual(
      [picked.stems.yearly, picked.stems.monthly, picked.stems.daily, picked.stems.hourly],
      [expected.yearly.heavenlyStem, expected.monthly.heavenlyStem, expected.daily.heavenlyStem, expected.hourly.heavenlyStem],
    );
  }
});

test('时间轴的晚子时按命盘流派：默认换次日（跨月连流月一起换），「晚子不换日」流日按当天、流时用次日之子', () => {
  const next = createZiweiHoroscope(TIMELINE_BIRTH);
  const same = createZiweiHoroscope({ ...TIMELINE_BIRTH, timeIndex: 12, lateZiMode: 'same' });
  const lateZi = pick({ year: 2026, lunarYear: 2026, month: 9, day: 18, hour: 12 });

  const nextResult = getTimelineFortune(next, lateZi);
  assert.equal(nextResult.stems.daily, '乙', '换次日：乙亥日');
  assert.equal(nextResult.stems.hourly, '丙', '丙子时');
  assert.match(nextResult.notes.join('；'), /晚子时换次日.*九月十九/);

  const sameResult = getTimelineFortune(same, lateZi);
  assert.equal(sameResult.stems.daily, '甲', '不换日：仍是甲戌日');
  assert.equal(sameResult.stems.hourly, '丙', '时柱用次日之子');
  assert.match(sameResult.notes.join('；'), /晚子时不换日/);
  assert.equal(sameResult.fortune.daily.index, getZiweiFortune(same, new Date(2026, 9, 27, 22, 0), 11).daily.index);

  // 九月三十的晚子时：换次日就是十月初一，流月随之按十月（己亥）。
  const monthEnd = pick({ year: 2026, lunarYear: 2026, month: 9, day: 30, hour: 12 });
  assert.deepEqual(
    [getTimelineFortune(next, monthEnd).stems.monthly, getTimelineFortune(next, monthEnd).stems.daily],
    ['己', '丁'],
  );
  assert.deepEqual(
    [getTimelineFortune(same, monthEnd).stems.monthly, getTimelineFortune(same, monthEnd).stems.daily],
    ['戊', '丙'],
  );
});

test('时间轴选到立春前后的日子：流年按立春换年，并在说明里写明', () => {
  const horoscope = createZiweiHoroscope(TIMELINE_BIRTH);
  // 农历乙巳年腊月二十 = 公历 2026-02-07，已过立春（2 月 4 日）：流年丙午，流月仍是腊月己丑。
  const afterLichun = getTimelineFortune(horoscope, pick({ year: 2025, lunarYear: 2025, month: 12, day: 20 }));
  assert.deepEqual([afterLichun.stems.yearly, afterLichun.stems.monthly], ['丙', '己']);
  assert.deepEqual(afterLichun.notes, ['这一刻的流年是丙午（流年以立春为界）']);
  // 腊月初十 = 2026-01-28，立春前：仍是乙巳年，不加说明。
  const beforeLichun = getTimelineFortune(horoscope, pick({ year: 2025, lunarYear: 2025, month: 12, day: 10 }));
  assert.equal(beforeLichun.stems.yearly, '乙');
  assert.deepEqual(beforeLichun.notes, []);
  // 2028 年正月初三 = 公历 1 月 28 日，春节已过、立春（2 月 4 日）未到：流年仍是丁未，流月正月甲寅（戊年起）。
  const newYearBeforeLichun = getTimelineFortune(horoscope, pick({ year: 2028, lunarYear: 2028, month: 1, day: 3 }));
  assert.deepEqual([newYearBeforeLichun.stems.yearly, newYearBeforeLichun.stems.monthly], ['丁', '甲']);
  assert.match(newYearBeforeLichun.notes[0], /丁未/);
});

test('出生农历年：元旦到春节之间出生的按上一年，晚子时换次日的除夕按次年', () => {
  const born = (birthDate, extra = {}) => createZiweiHoroscope({ calendarType: 'solar', birthDate, timeIndex: 6, gender: 'female', ...extra });
  assert.equal(birthLunarYearOf(born('1990-01-15')), 1989, '腊月十九');
  assert.equal(birthLunarYearOf(born('1990-01-27')), 1990, '正月初一');
  assert.equal(birthLunarYearOf(born('1990-06-15')), 1990);
  assert.equal(birthLunarYearOf(createZiweiHoroscope({ calendarType: 'lunar', birthDate: '1989-12-19', timeIndex: 6, gender: 'male' })), 1989);
  // 1991-02-14 是庚午年腊月三十（除夕）。
  assert.equal(birthLunarYearOf(born('1991-02-14', { timeIndex: 12, lateZiMode: 'next' })), 1991);
  assert.equal(birthLunarYearOf(born('1991-02-14', { timeIndex: 12, lateZiMode: 'same' })), 1990);
  assert.equal(birthLunarYearOf(null), null);

  // 时间轴按出生农历年排年份：每个大限的头一年正好是起限虚岁，末一年是止限虚岁。
  const horoscope = born('1990-01-15', { gender: 'male' });
  const birthYear = birthLunarYearOf(horoscope);
  horoscope.palaces.forEach((palace) => {
    const [startAge, endAge] = palace.decadal.range;
    const years = [birthYear + startAge - 1, birthYear + endAge - 1];
    const markers = buildFlyYearMarkers({ astrolabe: horoscope, years, birthYear });
    assert.deepEqual(markers.map((marker) => marker.nominalAge), [startAge, endAge]);
    years.forEach((year) => {
      assert.equal(horoscope.horoscope(new Date(year, 5, 15), 6).decadal.index, palace.index, `${year} 年在本大限内`);
    });
  });
});

test('流年年号按立春：元旦到立春之间仍是上一年；「今」运势的年份与流年干支一致', () => {
  const horoscope = createZiweiHoroscope(TIMELINE_BIRTH);
  const cases = [
    [new Date(2027, 0, 20, 12), 2026],
    [new Date(2027, 1, 5, 12), 2027],
    [new Date(2028, 0, 28, 12), 2027],
    [new Date(2026, 9, 28, 12), 2026],
  ];
  cases.forEach(([date, expected]) => {
    assert.equal(flowYearOf(getZiweiFortune(horoscope, date), date.getFullYear()), expected, date.toDateString());
  });
  assert.equal(flowYearOf(null, 2026), 2026);

  // 2027-01-20 是丙午年腊月十三：流年、月份都按 2026 年。
  const january = buildCurrentFortuneContext({ horoscope, basicInfo: BASIC_INFO, type: 'daily', now: new Date(2027, 0, 20, 12) });
  assert.deepEqual([january.selection.year, january.selection.lunarYear, january.selection.month], [2026, 2026, 12]);
  assert.equal(january.activeStems.yearly, '丙');
  // 2028-01-28 是戊申年正月初三，立春未到：流年仍是 2027 丁未，月份列戊申年的。
  const beforeLichun = buildCurrentFortuneContext({ horoscope, basicInfo: BASIC_INFO, type: 'daily', now: new Date(2028, 0, 28, 12) });
  assert.deepEqual([beforeLichun.selection.year, beforeLichun.selection.lunarYear, beforeLichun.selection.month], [2027, 2028, 1]);
  assert.equal(beforeLichun.activeStems.yearly, '丁');
  // 手动在时间轴上点回同一天，干支与「今」入口一致。
  const manual = getTimelineFortune(horoscope, { ...beforeLichun.selection, daxianIndex: beforeLichun.selection.daxianIndex });
  assert.deepEqual(
    ['yearly', 'monthly', 'daily'].map((key) => manual.stems[key]),
    ['yearly', 'monthly', 'daily'].map((key) => beforeLichun.activeStems[key]),
  );
});
