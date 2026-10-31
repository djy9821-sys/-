import { astro, util } from 'iztro';

export const MUTAGEN_META = Object.freeze([
  { key: 'lu', mutagen: '禄', code: 'A', color: '#18a05e' },
  { key: 'quan', mutagen: '权', code: 'B', color: '#8d3daf' },
  { key: 'ke', mutagen: '科', code: 'C', color: '#1686d9' },
  { key: 'ji', mutagen: '忌', code: 'D', color: '#ef3d35' },
]);

export const MUTAGEN_LAYER_META = Object.freeze([
  Object.freeze({ key: 'origin', label: '本', name: '本命', layerColor: '#d73b32' }),
  Object.freeze({ key: 'decadal', label: '限', name: '大限', layerColor: '#24964b' }),
  Object.freeze({ key: 'yearly', label: '年', name: '流年', layerColor: '#167bd8' }),
  Object.freeze({ key: 'monthly', label: '月', name: '流月', layerColor: '#e47b19' }),
  Object.freeze({ key: 'daily', label: '日', name: '流日', layerColor: '#8d3daf' }),
  Object.freeze({ key: 'hourly', label: '时', name: '流时', layerColor: '#078f9d' }),
]);

// 十干四化按《紫微斗数全书》「安禄权科忌四星变化诀」：九干与排盘库（iztro）默认相同；壬干全书作「壬梁紫府武」（天府化科），
// 今人排盘多用左辅化科，这里按全书用天府（排盘库已在 ziweiBrightness.js 里 config 成同样的表；界面与词典注明差异）。
export const MUTAGEN_STAR_MAP = Object.freeze({
  '甲': { lu: '廉贞', quan: '破军', ke: '武曲', ji: '太阳' },
  '乙': { lu: '天机', quan: '天梁', ke: '紫微', ji: '太阴' },
  '丙': { lu: '天同', quan: '天机', ke: '文昌', ji: '廉贞' },
  '丁': { lu: '太阴', quan: '天同', ke: '天机', ji: '巨门' },
  '戊': { lu: '贪狼', quan: '太阴', ke: '右弼', ji: '天机' },
  '己': { lu: '武曲', quan: '贪狼', ke: '天梁', ji: '文曲' },
  '庚': { lu: '太阳', quan: '武曲', ke: '太阴', ji: '天同' },
  '辛': { lu: '巨门', quan: '太阳', ke: '文曲', ji: '文昌' },
  '壬': { lu: '天梁', quan: '紫微', ke: '天府', ji: '武曲' },
  '癸': { lu: '破军', quan: '巨门', ke: '太阴', ji: '贪狼' },
});

export const getMutagenStarMap = (heavenlyStem) => {
  try {
    const stars = util.getMutagensByHeavenlyStem(heavenlyStem);
    return Object.fromEntries(MUTAGEN_META.map((meta, index) => (
      [meta.key, stars[index] || MUTAGEN_STAR_MAP[heavenlyStem]?.[meta.key] || '']
    )));
  } catch {
    return MUTAGEN_STAR_MAP[heavenlyStem] || {};
  }
};

export const getAllMutagenStarMaps = () => Object.fromEntries(
  Object.keys(MUTAGEN_STAR_MAP).map((heavenlyStem) => [heavenlyStem, getMutagenStarMap(heavenlyStem)]),
);

export const getActiveMutagenBadges = ({
  starName,
  activeStems = {},
  activeLayers = {},
}) => MUTAGEN_LAYER_META.flatMap((layer) => {
  if (!activeLayers[layer.key]) return [];

  const stem = activeStems[layer.key];
  if (!stem) return [];

  const map = getMutagenStarMap(stem);
  const meta = MUTAGEN_META.find((item) => map[item.key] === starName);
  if (!meta) return [];

  return [{
    ...layer,
    stem,
    type: meta.mutagen,
    code: meta.code,
    mutagenColor: meta.color,
    color: meta.color,
  }];
});

/**
 * Build the four palace-stem transformations for every palace.
 *
 * iztro only attaches the parent astrolabe when `astrolabe.palace(index)` is
 * called, so that binding step is kept here for every source palace.
 *
 * 落宫的找法与 iztro 的 `palace.mutagedPlaces()` 相同：宫干四化星（随排盘库当前 config，壬干按全书是天府）
 * 依宫序在主星、辅星、杂曜里找，同名取最后一处。只是 iztro 每找一颗星，都要把全盘一百来颗星名
 * 逐个拿去翻一遍六种语言的词表（kot），一张盘十二宫四十八次要一秒半，手机上打开紫微盘会卡住好几秒；
 * 这里先把全盘星名到宫位的对照建一次再查表，落宫逐条一致（test/ziwei-mutations.test.js 有对照）。
 */
export const buildPalaceFlights = (astrolabe) => {
  if (!astrolabe?.palaces?.length) return [];

  const palaceByStar = new Map();
  astrolabe.palaces.forEach((palace) => {
    [palace?.majorStars, palace?.minorStars, palace?.adjectiveStars]
      .forEach((stars) => (stars ?? []).forEach((star) => palaceByStar.set(star?.name, palace)));
  });

  return astrolabe.palaces.flatMap(({ index }) => {
    try {
      const source = astrolabe.palace(index);
      if (!source) return [];

      const opposite = astrolabe.surroundedPalaces(index)?.opposite;
      const mutagenStars = util.getMutagensByHeavenlyStem(source.heavenlyStem);

      return MUTAGEN_META.map((meta, mutagenIndex) => {
        const target = mutagenStars[mutagenIndex] ? palaceByStar.get(mutagenStars[mutagenIndex]) : null;
        if (!target) return null;

        let kind = 'fly';
        if (target.index === source.index) kind = 'outward';
        else if (target.index === opposite?.index) kind = 'inward';

        return {
          ...meta,
          kind,
          starName: mutagenStars[mutagenIndex] || MUTAGEN_STAR_MAP[source.heavenlyStem]?.[meta.key] || '',
          sourceIndex: source.index,
          sourceName: source.name,
          sourceBranch: source.earthlyBranch,
          sourceStem: source.heavenlyStem,
          targetIndex: target.index,
          targetName: target.name,
          targetBranch: target.earthlyBranch,
        };
      }).filter(Boolean);
    } catch {
      return [];
    }
  });
};

export const groupSelfMutationsByBranch = (flights) => flights.reduce((result, flight) => {
  if (flight.kind !== 'outward' && flight.kind !== 'inward') return result;
  if (!result[flight.sourceBranch]) result[flight.sourceBranch] = [];
  result[flight.sourceBranch].push(flight);
  return result;
}, {});

/**
 * Build the compact 四化 diagram used by the dedicated 四化 board.
 *
 * 离心与向心都以发起宫为视觉锚点。真实落宫仍保留在 targetBranch，
 * 供点击说明与算法核验使用，不能拿来替代箭头的起宫位置。
 */
export const buildSihuaDiagramEntries = (flights = []) => flights
  .filter((flight) => flight.kind === 'outward' || flight.kind === 'inward')
  .map((flight) => ({
    ...flight,
    // 文墨式自化符号始终挂在发起宫：离心从发起宫向盘外，
    // 向心从发起宫内缘朝中宫；targetBranch 只保留作真实落宫解释。
    anchorBranch: flight.sourceBranch,
    track: flight.kind === 'inward' ? 'source-to-center' : 'source-to-outer',
  }));

const flyYearMarkerOf = (astrolabe, year, birthYear) => {
  try {
    const fortune = astrolabe.horoscope(`${year}-06-15`);
    return {
      year,
      nominalAge: fortune?.age?.nominalAge ?? (year - birthYear + 1),
      ganZhi: `${fortune?.yearly?.heavenlyStem || ''}${fortune?.yearly?.earthlyBranch || ''}`,
      yearlyPalaceIndex: fortune?.yearly?.index ?? null,
      decadalPalaceNames: fortune?.decadal?.palaceNames || [],
    };
  } catch {
    return {
      year,
      nominalAge: year - birthYear + 1,
      ganZhi: '',
      yearlyPalaceIndex: null,
      decadalPalaceNames: [],
    };
  }
};

const FLY_YEAR_STEMS = '甲乙丙丁戊己庚辛壬癸';
const FLY_YEAR_BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const cyclic = (value, size) => ((value % size) + size) % size;

/**
 * Map every year in a selected formal decade to the natal palace occupied by
 * that year's 流年命宫. Ten years therefore populate ten palaces and leave two
 * palaces empty, matching the compact 飞星盘 convention.
 *
 * iztro 每起一次运限盘（horoscope）要五十毫秒上下，十年就是半秒，打开紫微盘和换大限都会顿一下。
 * 这里只按年表第一年起一次：同取六月十五日，流年干支、流年命宫逐年顺进一位，虚岁（按自然年）逐年加一，
 * 同一大限的宫名表不变，所以同限各年直接推出；出了这个大限、在童限里、或排盘库改成按生日算虚岁，
 * 就退回逐年起盘。推出的结果与逐年起盘逐条一致（test/ziwei-mutations.test.js 有对照）。
 */
export const buildFlyYearMarkers = ({ astrolabe, years = [], birthYear }) => {
  let anchor = null;
  try {
    if (years.length > 1 && Number.isInteger(years[0]) && astro.getConfig?.()?.ageDivide !== 'birthday') {
      const fortune = astrolabe.horoscope(`${years[0]}-06-15`);
      const range = astrolabe.palaces?.[fortune?.decadal?.index]?.decadal?.range;
      const age = fortune?.age?.nominalAge;
      const stem = FLY_YEAR_STEMS.indexOf(fortune?.yearly?.heavenlyStem || '?');
      const branch = FLY_YEAR_BRANCHES.indexOf(fortune?.yearly?.earthlyBranch || '?');
      if (Number.isInteger(age) && Number.isInteger(fortune?.yearly?.index) && stem >= 0 && branch >= 0
        && Array.isArray(fortune?.decadal?.palaceNames) && range && age >= range[0] && age <= range[1]) {
        anchor = { year: years[0], age, stem, branch, range, index: fortune.yearly.index, names: fortune.decadal.palaceNames };
      }
    }
  } catch {
    anchor = null;
  }

  return years.map((year) => {
    const offset = anchor && Number.isInteger(year) ? year - anchor.year : null;
    const nominalAge = offset === null ? null : anchor.age + offset;
    if (nominalAge === null || nominalAge < anchor.range[0] || nominalAge > anchor.range[1]) {
      return flyYearMarkerOf(astrolabe, year, birthYear);
    }
    return {
      year,
      nominalAge,
      ganZhi: `${FLY_YEAR_STEMS[cyclic(anchor.stem + offset, 10)]}${FLY_YEAR_BRANCHES[cyclic(anchor.branch + offset, 12)]}`,
      yearlyPalaceIndex: cyclic(anchor.index + offset, 12),
      decadalPalaceNames: [...anchor.names],
    };
  });
};
