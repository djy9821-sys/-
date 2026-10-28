const IZTRO_PATTERN_SOURCE = Object.freeze({
  title: 'iztro 官方研习资料《紫微斗数格局》',
  url: 'https://docs.iztro.com/learn/pattern',
});

const ANCIENT_PATTERN_SOURCE = Object.freeze({
  title: '《紫微斗数全书》卷一·定贵局',
  url: 'https://docs.iztro.com/learn/ancientBook-1',
});

const MALEFIC_NAMES = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']);
const PROSPEROUS_BRIGHTNESS = new Set(['庙', '旺']);

const palaceStars = (palace) => [
  ...(palace?.majorStars || []),
  ...(palace?.minorStars || []),
];

const majorStarNames = (palace) => new Set((palace?.majorStars || []).map((star) => star.name));
const starNames = (palaces) => new Set(palaces.flatMap((palace) => palaceStars(palace).map((star) => star.name)));
const includesEvery = (set, names) => names.every((name) => set.has(name));

const palaceLabel = (palace) => `${palace?.name || '未命名宫'}（${palace?.earthlyBranch || '?'}）`;

const findStar = (palaces, name) => {
  for (const palace of palaces) {
    const star = palaceStars(palace).find((item) => item.name === name);
    if (star) return { palace, star };
  }
  return null;
};

const findMajorStar = (palaces, name) => {
  for (const palace of palaces) {
    const star = (palace?.majorStars || []).find((item) => item.name === name);
    if (star) return { palace, star };
  }
  return null;
};

const describeStar = ({ palace, star }) => (
  `${star.name}${star.brightness ? `（${star.brightness}）` : ''}在${palaceLabel(palace)}`
);

const buildFacts = (astrolabe) => {
  if (!astrolabe || !Array.isArray(astrolabe.palaces)) return null;

  const root = astrolabe.palaces.find((palace) => palace.name === '命宫')
    || astrolabe.palaces.find((palace) => palace.earthlyBranch === astrolabe.earthlyBranchOfSoulPalace);
  if (!root || !Number.isInteger(root.index) || typeof astrolabe.surroundedPalaces !== 'function') return null;

  let surrounded;
  try {
    surrounded = astrolabe.surroundedPalaces(root.index);
  } catch {
    return null;
  }

  const triad = [surrounded.target, surrounded.opposite, surrounded.wealth, surrounded.career]
    .filter(Boolean)
    .filter((palace, index, palaces) => palaces.findIndex((item) => item.index === palace.index) === index);
  if (triad.length !== 4) return null;

  const byBranch = new Map(astrolabe.palaces.map((palace) => [palace.earthlyBranch, palace]));
  const transformations = new Map();
  for (const palace of triad) {
    for (const star of palaceStars(palace)) {
      if (['禄', '权', '科', '忌'].includes(star.mutagen)) {
        transformations.set(star.mutagen, { palace, star });
      }
    }
  }

  return {
    astrolabe,
    root,
    rootMajorNames: majorStarNames(root),
    surrounded,
    triad,
    triadNames: starNames(triad),
    byBranch,
    transformations,
  };
};

const makeSource = (base, section, rule) => ({ ...base, section, rule });

const commonLimitations = Object.freeze([
  '这里只核对格局的必要盘面条件，不把格名直接等同于吉凶或具体事件。',
  '庙旺落陷、辅煞、四化和不同流派的破格条件仍须另行研判。',
]);

const makeResult = (rule, facts, evidence) => ({
  id: `origin-${rule.id}`,
  category: 'classical-pattern',
  status: 'established',
  scope: 'origin',
  scopeLabel: '本命',
  name: rule.name,
  fortune: 'established',
  fortuneLabel: '成',
  summary: `当前本命盘完整满足“${rule.name}”在本规则库收录的必要条件。`,
  evidence,
  limitations: [...(rule.limitations || []), ...commonLimitations],
  ruleVersion: '2026.08-strict.1',
  source: rule.source,
  chartBasis: `${facts.astrolabe.solarDate || '-'} · 命宫${facts.root.earthlyBranch || '?'}`,
});

const strictRules = [
  {
    id: 'three-wonders',
    name: '三奇加会',
    source: makeSource(
      IZTRO_PATTERN_SOURCE,
      '三奇加会',
      '本命命宫三方四正内同时见生年化禄、化权、化科；三化不可跨层拼接。',
    ),
    limitations: ['该名称属后世归纳；本规则不伪称其为《紫微斗数全书》原有格名。'],
    evaluate: (facts) => {
      const hits = ['禄', '权', '科'].map((mutagen) => facts.transformations.get(mutagen));
      if (hits.some((hit) => !hit)) return null;
      return hits.map((hit) => `${describeStar(hit)}，生年化${hit.star.mutagen}`);
    },
  },
  {
    id: 'ji-yue-tong-liang',
    name: '机月同梁格',
    source: makeSource(
      IZTRO_PATTERN_SOURCE,
      '机月同梁',
      '命宫在寅或申，且命宫三方四正完整会齐天机、太阴、天同、天梁。',
    ),
    evaluate: (facts) => {
      const required = ['天机', '太阴', '天同', '天梁'];
      if (!['寅', '申'].includes(facts.root.earthlyBranch) || !includesEvery(facts.triadNames, required)) return null;
      return [
        `命宫在${facts.root.earthlyBranch}，符合寅、申宫位条件`,
        ...required.map((name) => describeStar(findMajorStar(facts.triad, name))),
      ];
    },
  },
  {
    id: 'seven-killings-facing-dipper',
    name: '七杀朝斗格',
    source: makeSource(
      IZTRO_PATTERN_SOURCE,
      '七杀朝斗',
      '七杀坐守命宫，命宫地支为子、午、寅、申之一。',
    ),
    evaluate: (facts) => {
      const hit = findMajorStar([facts.root], '七杀');
      if (!hit || !['子', '午', '寅', '申'].includes(facts.root.earthlyBranch)) return null;
      return [describeStar(hit), `命宫地支为${facts.root.earthlyBranch}`];
    },
  },
  {
    id: 'ziwei-at-noon',
    name: '极向离明格',
    source: makeSource(
      IZTRO_PATTERN_SOURCE,
      '极向离明',
      '紫微在午宫坐命，且命宫三方四正不见煞曜与化忌。',
    ),
    evaluate: (facts) => {
      const ziwei = findMajorStar([facts.root], '紫微');
      if (!ziwei || facts.root.earthlyBranch !== '午') return null;
      const obstructing = facts.triad.flatMap((palace) => palaceStars(palace)
        .filter((star) => MALEFIC_NAMES.has(star.name) || star.mutagen === '忌')
        .map((star) => `${star.name}${star.mutagen === '忌' ? '化忌' : ''}在${palaceLabel(palace)}`));
      if (obstructing.length > 0) return null;
      return [describeStar(ziwei), '命宫三方四正未见本规则列明的六煞及生年化忌'];
    },
  },
  {
    id: 'ziwei-tanlang-maoyou',
    name: '极居卯酉格',
    source: makeSource(
      IZTRO_PATTERN_SOURCE,
      '极居卯酉',
      '紫微与贪狼同坐命宫，命宫在卯或酉。',
    ),
    evaluate: (facts) => {
      if (!['卯', '酉'].includes(facts.root.earthlyBranch)
        || !includesEvery(facts.rootMajorNames, ['紫微', '贪狼'])) return null;
      return ['紫微、贪狼同坐命宫', `命宫地支为${facts.root.earthlyBranch}`];
    },
  },
  {
    id: 'jumen-ziwu',
    name: '石中隐玉格',
    source: makeSource(
      IZTRO_PATTERN_SOURCE,
      '石中隐玉',
      '巨门坐守命宫，命宫在子或午。',
    ),
    evaluate: (facts) => {
      const jumen = findMajorStar([facts.root], '巨门');
      if (!jumen || !['子', '午'].includes(facts.root.earthlyBranch)) return null;
      return [describeStar(jumen), `命宫地支为${facts.root.earthlyBranch}`];
    },
  },
  {
    id: 'yang-liang-chang-lu',
    name: '阳梁昌禄格',
    source: makeSource(
      IZTRO_PATTERN_SOURCE,
      '阳梁昌禄',
      '命宫三方四正完整会齐太阳、天梁、文昌、禄存。',
    ),
    evaluate: (facts) => {
      const required = ['太阳', '天梁', '文昌', '禄存'];
      if (!includesEvery(facts.triadNames, required)) return null;
      return required.map((name) => describeStar(findStar(facts.triad, name)));
    },
  },
  {
    id: 'ji-liang-together',
    name: '善荫朝纲格',
    source: makeSource(
      IZTRO_PATTERN_SOURCE,
      '善荫朝纲',
      '天机、天梁同坐命宫。',
    ),
    evaluate: (facts) => (
      includesEvery(facts.rootMajorNames, ['天机', '天梁'])
        ? ['天机、天梁同坐命宫']
        : null
    ),
  },
  {
    id: 'fu-xiang-facing',
    name: '府相朝垣格',
    source: makeSource(
      ANCIENT_PATTERN_SOURCE,
      '定贵局·府相朝垣',
      '命宫无十四主星，官禄宫见天府、财帛宫见天相。',
    ),
    evaluate: (facts) => {
      if ((facts.root.majorStars || []).length > 0) return null;
      const tianfu = findMajorStar([facts.surrounded.career], '天府');
      const tianxiang = findMajorStar([facts.surrounded.wealth], '天相');
      if (!tianfu || !tianxiang) return null;
      return ['命宫无十四主星', describeStar(tianfu), describeStar(tianxiang)];
    },
  },
  {
    id: 'pearl-from-sea',
    name: '明珠出海格',
    source: makeSource(
      ANCIENT_PATTERN_SOURCE,
      '定贵局·明珠出海',
      '命宫在未，太阳在卯、太阴在亥。',
    ),
    evaluate: (facts) => {
      const sun = findMajorStar([facts.byBranch.get('卯')], '太阳');
      const moon = findMajorStar([facts.byBranch.get('亥')], '太阴');
      if (facts.root.earthlyBranch !== '未' || !sun || !moon) return null;
      return ['命宫地支为未', describeStar(sun), describeStar(moon)];
    },
  },
  {
    id: 'sun-moon-together',
    name: '日月同临格',
    source: makeSource(
      ANCIENT_PATTERN_SOURCE,
      '定贵局·日月同临',
      '太阳、太阴同坐命宫。',
    ),
    evaluate: (facts) => (
      includesEvery(facts.rootMajorNames, ['太阳', '太阴'])
        ? ['太阳、太阴同坐命宫']
        : null
    ),
  },
  {
    id: 'ji-ju-mao',
    name: '巨机居卯格',
    source: makeSource(
      ANCIENT_PATTERN_SOURCE,
      '定贵局·巨机居卯',
      '天机、巨门同坐卯宫命位。',
    ),
    evaluate: (facts) => (
      facts.root.earthlyBranch === '卯' && includesEvery(facts.rootMajorNames, ['天机', '巨门'])
        ? ['天机、巨门同坐命宫', '命宫地支为卯']
        : null
    ),
  },
  {
    id: 'sun-at-mao',
    name: '日出扶桑格',
    source: makeSource(
      ANCIENT_PATTERN_SOURCE,
      '定贵局·日出扶桑',
      '太阳在卯宫坐命。',
    ),
    evaluate: (facts) => {
      const sun = findMajorStar([facts.root], '太阳');
      return sun && facts.root.earthlyBranch === '卯' ? [describeStar(sun)] : null;
    },
  },
  {
    id: 'moon-at-hai',
    name: '月朗天门格',
    source: makeSource(
      ANCIENT_PATTERN_SOURCE,
      '定贵局·月朗天门',
      '太阴在亥宫坐命。',
    ),
    evaluate: (facts) => {
      const moon = findMajorStar([facts.root], '太阴');
      return moon && facts.root.earthlyBranch === '亥' ? [describeStar(moon)] : null;
    },
  },
  {
    id: 'wuqu-at-mao',
    name: '武曲守垣格',
    source: makeSource(
      ANCIENT_PATTERN_SOURCE,
      '定贵局·武曲守垣',
      '武曲在卯宫坐命。',
    ),
    evaluate: (facts) => {
      const wuqu = findMajorStar([facts.root], '武曲');
      return wuqu && facts.root.earthlyBranch === '卯' ? [describeStar(wuqu)] : null;
    },
  },
  {
    id: 'zi-fu-facing',
    name: '紫府朝垣格',
    source: makeSource(
      ANCIENT_PATTERN_SOURCE,
      '定贵局·紫府朝垣',
      '紫微、天府在庙旺状态合照命宫三方四正。',
    ),
    evaluate: (facts) => {
      const ziwei = findMajorStar(facts.triad, '紫微');
      const tianfu = findMajorStar(facts.triad, '天府');
      if (!ziwei || !tianfu
        || !PROSPEROUS_BRIGHTNESS.has(ziwei.star.brightness)
        || !PROSPEROUS_BRIGHTNESS.has(tianfu.star.brightness)) return null;
      return [describeStar(ziwei), describeStar(tianfu)];
    },
  },
];

const structureRules = [
  {
    id: 'sha-po-lang-system',
    name: '杀破狼星系',
    source: makeSource(
      IZTRO_PATTERN_SOURCE,
      '杀破狼',
      '命宫主星为七杀、破军、贪狼之一，并在命、财帛、官禄三合内会齐三颗。',
    ),
    evaluate: (facts) => {
      const required = ['七杀', '破军', '贪狼'];
      const trine = [facts.root, facts.surrounded.wealth, facts.surrounded.career];
      const trineNames = starNames(trine);
      if (!required.some((name) => facts.rootMajorNames.has(name)) || !includesEvery(trineNames, required)) return null;
      return required.map((name) => describeStar(findMajorStar(trine, name)));
    },
  },
];

const assertRuleRegistry = (rules) => {
  for (const rule of rules) {
    if (!rule.id || !rule.name || !rule.source?.url || !rule.source?.rule || typeof rule.evaluate !== 'function') {
      throw new Error(`Invalid Zi Wei pattern rule: ${rule.id || 'unknown'}`);
    }
  }
};

assertRuleRegistry(strictRules);
assertRuleRegistry(structureRules);

export const analyzeZiweiPatterns = (astrolabe) => {
  const facts = buildFacts(astrolabe);
  if (!facts) return [];

  return strictRules.flatMap((rule) => {
    const evidence = rule.evaluate(facts);
    return Array.isArray(evidence) && evidence.length > 0 ? [makeResult(rule, facts, evidence)] : [];
  });
};

export const analyzeZiweiStructures = (astrolabe) => {
  const facts = buildFacts(astrolabe);
  if (!facts) return [];

  return structureRules.flatMap((rule) => {
    const evidence = rule.evaluate(facts);
    if (!Array.isArray(evidence) || evidence.length === 0) return [];
    return [{
      ...makeResult(rule, facts, evidence),
      id: `origin-structure-${rule.id}`,
      category: 'star-system',
      status: 'observed',
      fortune: 'observed',
      fortuneLabel: '系',
      summary: `当前本命盘符合“${rule.name}”的星系条件；这是盘面结构观察，不等同于古典吉格。`,
      limitations: [
        '本项属于星系观察，不计入“经典格局成立”数量，也不直接判吉凶。',
        ...commonLimitations,
      ],
    }];
  });
};

export const formatZiweiPatternReport = (patterns = [], structures = []) => {
  const lines = ['古书派紫微 · 严格格局分析', '规则口径：仅列完整命中且可回溯来源的本命规则'];

  if (patterns.length === 0) {
    lines.push('', '经典格局：当前未识别到已收录且条件完整成立的格局。');
  } else {
    lines.push('', `经典格局（${patterns.length}）：`);
    patterns.forEach((pattern, index) => {
      lines.push(`${index + 1}. ${pattern.scopeLabel} · ${pattern.name}【成立】`);
      pattern.evidence.forEach((item) => lines.push(`   - ${item}`));
      lines.push(`   来源：${pattern.source.title} · ${pattern.source.section}`);
      lines.push(`   规则：${pattern.source.rule}`);
      lines.push(`   链接：${pattern.source.url}`);
    });
  }

  if (structures.length > 0) {
    lines.push('', `星系观察（${structures.length}，不等同古典吉格）：`);
    structures.forEach((pattern, index) => {
      lines.push(`${index + 1}. ${pattern.scopeLabel} · ${pattern.name}`);
      pattern.evidence.forEach((item) => lines.push(`   - ${item}`));
      lines.push(`   来源：${pattern.source.title} · ${pattern.source.section}`);
    });
  }

  return lines.join('\n');
};

export const ZIWEI_PATTERN_RULE_COUNT = strictRules.length;

/** 本规则库判得出的全部格局与星系名（古籍库校验 applies.pattern 时对照）。 */
export const ZIWEI_PATTERN_NAMES = Object.freeze([...strictRules, ...structureRules].map((rule) => rule.name));
