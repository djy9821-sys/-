import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HOME_FORTUNE_PERIODS,
  buildHomeFortune,
  createHoroscopeFromRecord,
} from '../src/utils/homeFortune.js';

const SOLAR_RECORD = Object.freeze({
  id: 'solar-profile',
  type: 'ziwei',
  name: '测试档案',
  calendarType: 'solar',
  birthDate: '1990-01-01',
  solarDate: '1990-01-01',
  timeHour: 0,
  gender: 'male',
});

const CURRENT_TIME = new Date(2024, 1, 10, 12, 30);
const STEM_BRANCH_PATTERN = /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/;

test('首页运势入口顺序稳定且包含展示元数据', () => {
  assert.deepEqual(
    HOME_FORTUNE_PERIODS.map(({ key, label }) => ({ key, label })),
    [
      { key: 'hourly', label: '今时运势' },
      { key: 'daily', label: '今日运势' },
      { key: 'monthly', label: '今月运势' },
      { key: 'yearly', label: '今年运势' },
    ],
  );
  assert.ok(HOME_FORTUNE_PERIODS.every(({ icon }) => typeof icon === 'string' && icon));
});

test('阳历档案可生成今时、今日、今月和今年摘要', () => {
  for (const { key, label, icon } of HOME_FORTUNE_PERIODS) {
    const result = buildHomeFortune(SOLAR_RECORD, key, CURRENT_TIME);

    assert.equal(result.period, key);
    assert.equal(result.periodLabel, label);
    assert.equal(result.periodIcon, icon);
    assert.equal(result.profileName, SOLAR_RECORD.name);
    assert.equal(result.record, SOLAR_RECORD);
    assert.match(result.dateLabel, /2024/);
    assert.match(result.stemBranch, STEM_BRANCH_PATTERN);
    assert.ok(result.palaceName);
    assert.match(result.palaceBranch, /^[子丑寅卯辰巳午未申酉戌亥]$/);
    assert.ok(result.decadalPalaceName);
    assert.ok(Number.isInteger(result.nominalAge) && result.nominalAge > 0);
    assert.deepEqual(result.mutagens.map(({ label: mutagenLabel }) => mutagenLabel), ['禄', '权', '科', '忌']);
    assert.ok(result.mutagens.every(({ star }) => typeof star === 'string' && star));
    assert.ok(Array.isArray(result.movingStars));
    assert.ok(result.movingStars.every((name) => typeof name === 'string' && name));
    assert.equal(result.keywords.length, 3);
    assert.equal(new Set(result.keywords).size, 3);
    assert.ok(result.keywords.every((keyword) => typeof keyword === 'string' && keyword));
    assert.deepEqual(
      result.lifeDimensions.map(({ key, label }) => ({ key, label })),
      [
        { key: 'career', label: '事业' },
        { key: 'finance', label: '财务' },
        { key: 'relationships', label: '关系' },
        { key: 'wellbeing', label: '身心' },
      ],
    );
    assert.ok(result.lifeDimensions.every(({ isFocus, prompt }) => (
      typeof isFocus === 'boolean' && typeof prompt === 'string' && prompt.length > 12
    )));
    assert.ok(result.evidence.length >= 4);
    assert.ok(result.evidence.every(({ id, kind, layer, label: evidenceLabel, value, source }) => (
      typeof id === 'string'
      && typeof kind === 'string'
      && typeof layer === 'string'
      && typeof evidenceLabel === 'string'
      && typeof value === 'string'
      && typeof source === 'string'
    )));
    assert.ok(result.evidence.some(({ layer, kind }) => layer === 'decadal' && kind === 'palace'));
    assert.ok(result.evidence.some(({ layer, kind }) => layer === key && kind === 'palace'));
    assert.ok(result.evidence.some(({ kind }) => kind === 'mutagen'));
    assert.ok(result.evidence.some(({ kind }) => kind === 'moving-stars'));
    assert.equal(typeof result.privacySafeShareText, 'string');
    assert.match(result.privacySafeShareText, new RegExp(label));
    assert.doesNotMatch(result.privacySafeShareText, /1990[-/.]0?1[-/.]0?1/);
    assert.doesNotMatch(result.privacySafeShareText, /测试档案/);
    assert.ok(result.summary.length > 8);
    assert.ok(result.action.length > 8);
    assert.ok(result.caution.length > 8);
    assert.equal(typeof result.dayBoundaryNote, 'string');
  }
});

test('每日运势 2.0 文案保持中性并可追溯到确定性运限事实', () => {
  const result = buildHomeFortune(SOLAR_RECORD, 'daily', CURRENT_TIME);
  const allGuidance = [
    ...result.keywords,
    ...result.lifeDimensions.map(({ prompt }) => prompt),
    result.privacySafeShareText,
  ].join('\n');
  const dailyPalaceEvidence = result.evidence.find(({ id }) => id === 'daily-palace');
  const mutagenEvidence = result.evidence.find(({ id }) => id === 'daily-mutagens');

  assert.equal(dailyPalaceEvidence.source, 'fortune.daily');
  assert.match(dailyPalaceEvidence.value, new RegExp(result.palaceName));
  assert.match(dailyPalaceEvidence.value, new RegExp(result.stemBranch));
  assert.equal(mutagenEvidence.value, result.mutagens
    .map(({ label, star }) => `${label}→${star}`)
    .join(' · '));
  assert.doesNotMatch(allGuidance, /一定|必然|保证|稳赚|治愈|包治|翻倍/);
  assert.match(result.privacySafeShareText, /不替代医疗、法律或财务专业意见/);
});

test('农历档案能重建十二宫并生成中性运势摘要', () => {
  const lunarRecord = {
    ...SOLAR_RECORD,
    id: 'lunar-profile',
    name: '',
    calendarType: 'lunar',
    birthDate: '1989-12-5',
  };

  const horoscope = createHoroscopeFromRecord(lunarRecord);
  assert.equal(horoscope.palaces.length, 12);
  assert.equal(horoscope.rawDates.lunarDate.lunarYear, 1989);

  const result = buildHomeFortune(lunarRecord, 'daily', CURRENT_TIME);
  assert.equal(result.profileName, '未命名档案');
  assert.equal(result.period, 'daily');
  assert.match(result.stemBranch, STEM_BRANCH_PATTERN);
  assert.ok(result.summary && result.action && result.caution);
});

test('旧档案的嵌套日期可读，但缺失时辰不会默认成早子时', () => {
  const nestedDateRecord = {
    ...SOLAR_RECORD,
    birthDate: undefined,
    solarDate: undefined,
    data: { solarDate: '1990-01-01' },
  };

  assert.equal(createHoroscopeFromRecord(nestedDateRecord).palaces.length, 12);
  assert.throws(
    () => createHoroscopeFromRecord({ ...SOLAR_RECORD, timeHour: undefined }),
    /缺少出生时辰/,
  );
});

test('晚子时保留换日提示', () => {
  const result = buildHomeFortune(
    SOLAR_RECORD,
    'hourly',
    new Date(2024, 1, 10, 23, 30),
  );

  assert.match(result.dateLabel, /晚子时/);
  assert.match(result.dayBoundaryNote, /晚子时换次日/);
});

test('坏日期和无效类型抛出明确错误', () => {
  assert.throws(
    () => createHoroscopeFromRecord({ ...SOLAR_RECORD, birthDate: '2024-02-31' }),
    /公历出生日期无效/,
  );
  assert.throws(
    () => createHoroscopeFromRecord({ ...SOLAR_RECORD, type: 'money' }),
    /不支持的档案类型/,
  );
  assert.throws(
    () => buildHomeFortune(SOLAR_RECORD, 'weekly', CURRENT_TIME),
    /不支持的首页运势类型/,
  );
});
