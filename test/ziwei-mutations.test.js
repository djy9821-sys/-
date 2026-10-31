import test from 'node:test';
import assert from 'node:assert/strict';
import { astro } from 'iztro';
import {
    MUTAGEN_LAYER_META,
    buildFlyYearMarkers,
    buildPalaceFlights,
    buildSihuaDiagramEntries,
    getActiveMutagenBadges,
    getMutagenStarMap,
    groupSelfMutationsByBranch,
} from '../src/utils/ziweiMutations.js';

test('本限年月日时使用六种固定来源层颜色', () => {
  assert.deepEqual(
    MUTAGEN_LAYER_META.map(({ label, layerColor }) => `${label}:${layerColor}`),
    [
      '本:#d73b32', '限:#24964b', '年:#167bd8',
      '月:#e47b19', '日:#8d3daf', '时:#078f9d',
    ],
  );
});

test('飞星首限十年按真实流年命宫分布到十个宫位', () => {
  const chart = astro.bySolar('2026-8-23', 8, '女', true, 'zh-CN');
  const years = Array.from({ length: 10 }, (_, index) => 2030 + index);
  const markers = buildFlyYearMarkers({ astrolabe: chart, years, birthYear: 2026 });

  assert.deepEqual(
    markers.map(({ year, nominalAge, yearlyPalaceIndex }) => [year, nominalAge, yearlyPalaceIndex]),
    [
      [2030, 5, 8], [2031, 6, 9], [2032, 7, 10], [2033, 8, 11], [2034, 9, 0],
      [2035, 10, 1], [2036, 11, 2], [2037, 12, 3], [2038, 13, 4], [2039, 14, 5],
    ],
  );
  assert.equal(new Set(markers.map((marker) => marker.yearlyPalaceIndex)).size, 10);
  assert.equal(markers.every((marker) => marker.decadalPalaceNames.length === 12), true);
});

test('宫干四化从 iztro 绑定宫位生成 48 条真实飞化', () => {
  const chart = astro.bySolar('1998-1-2', 4, '男', true, 'zh-CN');
  const flights = buildPalaceFlights(chart);

  assert.equal(flights.length, 48);
  assert.deepEqual(
    flights.filter((flight) => flight.sourceName === '命宫').map(({ mutagen, targetName }) => `${mutagen}→${targetName}`),
    ['禄→命宫', '权→财帛', '科→兄弟', '忌→兄弟'],
  );
  assert.equal(
    flights.every((flight) => chart.palace(flight.targetIndex).has([flight.starName])),
    true,
    '每条飞化显示的目标星必须确实在落宫内',
  );
});

test('十干四化星名直接跟随 iztro 当前配置', () => {
  assert.deepEqual(getMutagenStarMap('甲'), { lu: '廉贞', quan: '破军', ke: '武曲', ji: '太阳' });
  assert.deepEqual(getMutagenStarMap('己'), { lu: '武曲', quan: '贪狼', ke: '天梁', ji: '文曲' });
  assert.deepEqual(getMutagenStarMap('癸'), { lu: '破军', quan: '巨门', ke: '太阴', ji: '贪狼' });
});

test('十个天干均提供完整且不重复的禄权科忌目标星', () => {
  for (const stem of ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']) {
    const map = getMutagenStarMap(stem);
    assert.deepEqual(Object.keys(map), ['lu', 'quan', 'ke', 'ji']);
    assert.equal(new Set(Object.values(map)).size, 4, `${stem}干四化目标星应互不重复`);
  }
});

test('同一星曜的本命与运限四化来源不会被静默丢弃', () => {
  const badges = getActiveMutagenBadges({
    starName: '廉贞',
    activeStems: { origin: '甲', yearly: '丙' },
    activeLayers: { origin: true, yearly: true },
  });

  assert.deepEqual(
    badges.map(({ label, stem, type }) => `${label}${stem}${type}`),
    ['本甲禄', '年丙忌'],
  );
  assert.deepEqual(
    badges.map(({ code, type }) => `${code}${type}`),
    ['A禄', 'D忌'],
  );
  assert.deepEqual(
    badges.map(({ layerColor, mutagenColor }) => [layerColor, mutagenColor]),
    [['#d73b32', '#18a05e'], ['#167bd8', '#ef3d35']],
    '方章按来源层着色，四化性质色另行保留给箭头',
  );
});

test('多个命例都生成十二宫乘四化的48条可落宫飞化', () => {
  const fixtures = [
    ['1962-8-26', 2, '女'],
    ['1970-7-23', 4, '男'],
    ['1998-1-2', 0, '男'],
  ];

  for (const [date, timeIndex, gender] of fixtures) {
    const chart = astro.bySolar(date, timeIndex, gender, true, 'zh-CN');
    const flights = buildPalaceFlights(chart);
    assert.equal(flights.length, 48, `${date}应生成48条宫干飞化`);
    assert.equal(
      flights.every((flight) => chart.palace(flight.targetIndex).has([flight.starName])),
      true,
      `${date}每条飞化的目标宫都应包含目标星`,
    );
  }
});

test('小箭头只标识离心自化与向心自化', () => {
  const chart = astro.bySolar('1998-1-2', 4, '男', true, 'zh-CN');
  const grouped = groupSelfMutationsByBranch(buildPalaceFlights(chart));
  const mutations = Object.values(grouped).flat();

  assert.equal(mutations.length, 8);
  assert.deepEqual(
    mutations.filter((item) => item.kind === 'outward').map((item) => `${item.sourceName}${item.mutagen}`).sort(),
    ['子女科', '命宫禄', '官禄禄', '父母禄'].sort(),
  );
  assert.deepEqual(
    mutations.filter((item) => item.kind === 'inward').map((item) => `${item.sourceName}${item.mutagen}→${item.targetName}`).sort(),
    ['仆役禄→兄弟', '疾厄忌→父母', '子女权→田宅', '父母科→疾厄'].sort(),
  );
});

test('四化参考命例的 A禄 B权 C科 D忌 与十二条自化路径定位一致', () => {
  const chart = astro.bySolar('2026-8-23', 8, '女', true, 'zh-CN');
  const entries = buildSihuaDiagramEntries(buildPalaceFlights(chart));

  assert.equal(entries.length, 12);
  assert.equal(entries.filter((item) => item.kind === 'outward').length, 5);
  assert.equal(entries.filter((item) => item.kind === 'inward').length, 7);
  assert.deepEqual(
    entries
      .map(({ kind, sourceBranch, mutagen, code, starName, targetBranch, anchorBranch }) => (
        `${kind}:${sourceBranch}:${mutagen}${code}:${starName}->${targetBranch}@${anchorBranch}`
      ))
      .sort(),
    [
      'inward:辰:科C:左辅->戌@辰',
      'inward:巳:权B:巨门->亥@巳',
      'inward:午:禄A:廉贞->子@午',
      'inward:未:权B:天梁->丑@未',
      'inward:申:科C:文昌->寅@申',
      'inward:酉:权B:天同->卯@酉',
      'inward:戌:科C:右弼->辰@戌',
      'outward:辰:忌D:武曲->辰@辰',
      'outward:午:权B:破军->午@午',
      'outward:未:禄A:天机->未@未',
      'outward:酉:禄A:太阴->酉@酉',
      'outward:戌:禄A:贪狼->戌@戌',
    ].sort(),
  );
  assert.equal(
    entries.every((entry) => chart.palace(entry.targetIndex).has([entry.starName])),
    true,
  );
});

test('1998-01-02 辰时女参考盘的八条箭头全部锚在发起宫', () => {
  const chart = astro.bySolar('1998-1-2', 4, '女', true, 'zh-CN');
  const entries = buildSihuaDiagramEntries(buildPalaceFlights(chart));

  assert.deepEqual(
    entries
      .map(({ kind, sourceBranch, mutagen, starName, targetBranch, anchorBranch, color }) => (
        `${kind}:${sourceBranch}:${mutagen}:${starName}->${targetBranch}@${anchorBranch}:${color}`
      ))
      .sort(),
    [
      'inward:寅:禄:天梁->申@寅:#18a05e',
      'inward:辰:忌:太阳->戌@辰:#ef3d35',
      'inward:午:权:天机->子@午:#8d3daf',
      'inward:戌:科:太阴->辰@戌:#1686d9',
      'outward:午:科:文昌->午@午:#1686d9',
      'outward:酉:禄:武曲->酉@酉:#18a05e',
      'outward:戌:禄:太阳->戌@戌:#18a05e',
      'outward:丑:禄:破军->丑@丑:#18a05e',
    ].sort(),
  );
  assert.equal(entries.every((entry) => entry.anchorBranch === entry.sourceBranch), true);
});

test('宫干四化落宫查表与 iztro mutagedPlaces 逐条一致，且不再走逐星翻词表的慢路', () => {
  for (const [date, timeIndex, gender] of [['1998-1-2', 4, '男'], ['1962-8-26', 2, '女'], ['2026-8-23', 8, '女']]) {
    const chart = astro.bySolar(date, timeIndex, gender, true, 'zh-CN');
    const reference = chart.palaces.map(({ index }) => chart.palace(index).mutagedPlaces().map((palace) => palace.index));
    // mutagedPlaces 每找一颗星都把全盘星名逐个翻多语种词表，一张盘要一秒多；这里堵死它，确认查表路径独立成立。
    chart.palaces.forEach((palace) => {
      palace.mutagedPlaces = () => { throw new Error('buildPalaceFlights 不应再调用 mutagedPlaces'); };
    });
    const flights = buildPalaceFlights(chart);
    assert.equal(flights.length, 48, `${date}应生成48条宫干飞化`);
    assert.deepEqual(
      chart.palaces.map(({ index }) => flights.filter((flight) => flight.sourceIndex === index).map((flight) => flight.targetIndex)),
      reference,
      `${date}十二宫四化落宫应与 iztro 一致`,
    );
  }
});

test('飞星年表同一大限只起一次运限盘，推出的各年与逐年起盘逐条一致', () => {
  const chart = astro.bySolar('1990-5-17', 3, '男', true, 'zh-CN');
  const birthYear = 1990;
  const exact = (year) => {
    try {
      const fortune = chart.horoscope(`${year}-06-15`);
      return {
        year,
        nominalAge: fortune?.age?.nominalAge ?? (year - birthYear + 1),
        ganZhi: `${fortune?.yearly?.heavenlyStem || ''}${fortune?.yearly?.earthlyBranch || ''}`,
        yearlyPalaceIndex: fortune?.yearly?.index ?? null,
        decadalPalaceNames: fortune?.decadal?.palaceNames || [],
      };
    } catch {
      return { year, nominalAge: year - birthYear + 1, ganZhi: '', yearlyPalaceIndex: null, decadalPalaceNames: [] };
    }
  };
  const decades = chart.palaces.map((palace) => palace.decadal.range).sort((a, b) => a[0] - b[0]);
  const decadeYears = ([from, to]) => Array.from({ length: to - from + 1 }, (_, offset) => birthYear + from + offset - 1);
  const original = chart.horoscope;
  for (const years of [...decades.slice(0, 3).map(decadeYears), Array.from({ length: 14 }, (_, offset) => birthYear - 2 + offset)]) {
    const expected = years.map(exact);
    let calls = 0;
    chart.horoscope = (...args) => { calls += 1; return original(...args); };
    const markers = buildFlyYearMarkers({ astrolabe: chart, years, birthYear });
    chart.horoscope = original;
    assert.deepEqual(markers, expected, `${years[0]}起${years.length}年应与逐年起盘一致`);
    if (years.length === 10) assert.equal(calls, 1, '同一大限的十年只需起一次运限盘');
  }
});
