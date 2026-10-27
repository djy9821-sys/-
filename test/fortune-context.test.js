import test from 'node:test';
import assert from 'node:assert/strict';
import { astro } from 'iztro';

import {
  buildCurrentFortuneContext,
  formatLocalDate,
  getCurrentTimeIndex,
  getLunarMonthDays,
  getLunarMonthOptions,
  getFortuneScopeKeys,
} from '../src/utils/fortuneContext.js';
import { generateFortunePromptText } from '../src/utils/aiPrompts.js';

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
