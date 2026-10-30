import { util } from 'iztro';

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

// 排盘库（iztro）默认的十干四化：九干与《紫微斗数全书》「安禄权科忌四星变化诀」相同；壬干全书作「壬梁紫府武」（天府化科），
// 这里与今人排盘一致用左辅化科（界面上注明）。
export const MUTAGEN_STAR_MAP = Object.freeze({
  '甲': { lu: '廉贞', quan: '破军', ke: '武曲', ji: '太阳' },
  '乙': { lu: '天机', quan: '天梁', ke: '紫微', ji: '太阴' },
  '丙': { lu: '天同', quan: '天机', ke: '文昌', ji: '廉贞' },
  '丁': { lu: '太阴', quan: '天同', ke: '天机', ji: '巨门' },
  '戊': { lu: '贪狼', quan: '太阴', ke: '右弼', ji: '天机' },
  '己': { lu: '武曲', quan: '贪狼', ke: '天梁', ji: '文曲' },
  '庚': { lu: '太阳', quan: '武曲', ke: '太阴', ji: '天同' },
  '辛': { lu: '巨门', quan: '太阳', ke: '文曲', ji: '文昌' },
  '壬': { lu: '天梁', quan: '紫微', ke: '左辅', ji: '武曲' },
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
 * called. Calling `mutagedPlaces()` directly on an item from
 * `astrolabe.palaces` therefore returns no useful destinations. Keep that
 * binding step here so every UI layer uses the same, reliable calculation.
 */
export const buildPalaceFlights = (astrolabe) => {
  if (!astrolabe?.palaces?.length) return [];

  return astrolabe.palaces.flatMap(({ index }) => {
    try {
      const source = astrolabe.palace(index);
      if (!source) return [];

      const opposite = astrolabe.surroundedPalaces(index)?.opposite;
      const targets = source?.mutagedPlaces?.() || [];
      const mutagenStars = util.getMutagensByHeavenlyStem(source.heavenlyStem);

      return MUTAGEN_META.map((meta, mutagenIndex) => {
        const target = targets[mutagenIndex];
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

/**
 * Map every year in a selected formal decade to the natal palace occupied by
 * that year's 流年命宫. Ten years therefore populate ten palaces and leave two
 * palaces empty, matching the compact 飞星盘 convention.
 */
export const buildFlyYearMarkers = ({ astrolabe, years = [], birthYear }) => years.map((year) => {
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
});
