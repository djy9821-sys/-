const IZTRO_PATTERN_SOURCE = Object.freeze({
  title: 'iztro 官方研习资料《紫微斗数格局》',
  url: 'https://docs.iztro.com/learn/pattern',
});

/** 《紫微斗数全书》卷一「定富局」「定贵局」「定贫贱局」：各格的定义照原书一句，规则只按这一句判。 */
const QUANSHU_URL = 'https://docs.iztro.com/learn/ancientBook-1';
const QUANSHU_SOURCES = Object.freeze({
  定富局: Object.freeze({ title: '《紫微斗数全书》卷一·定富局', url: QUANSHU_URL }),
  定贵局: Object.freeze({ title: '《紫微斗数全书》卷一·定贵局', url: QUANSHU_URL }),
  定贫贱局: Object.freeze({ title: '《紫微斗数全书》卷一·定贫贱局', url: QUANSHU_URL }),
});
/**
 * 定贵局写「见前批注」的格，前批注在卷三《论诸星同垣》各星之下；石中隐玉的定义在卷二《论命宫》巨门条。
 * 这两卷 iztro 研习资料没有收，链接维基文库的公版录文。
 */
const QUANSHU_TONGYUAN = Object.freeze({ title: '《紫微斗数全书》卷三·论诸星同垣', url: 'https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%89' });
const QUANSHU_MINGGONG = Object.freeze({ title: '《紫微斗数全书》卷二·论命宫', url: 'https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%BA%8C' });

const MALEFIC_NAMES = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']);
/** 四杀。 */
const FOUR_KILLERS = Object.freeze(['擎羊', '陀罗', '火星', '铃星']);
/** 吉星：六吉与禄存。 */
const AUSPICIOUS_NAMES = Object.freeze(['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存']);
/** 空亡：旬空、截路空亡（iztro 写作「旬空」「截路」「空亡」）。 */
const VOID_NAMES = Object.freeze(['旬空', '截路', '空亡']);
const PROSPEROUS_BRIGHTNESS = new Set(['庙', '旺']);

const palaceStars = (palace) => [
  ...(palace?.majorStars || []),
  ...(palace?.minorStars || []),
];

const allPalaceStars = (palace) => [...palaceStars(palace), ...(palace?.adjectiveStars || [])];
const findIn = (palace, name) => allPalaceStars(palace).find((item) => item.name === name) || null;
const hasStar = (palace, name) => Boolean(findIn(palace, name));
/** 宫中带生年某化的星（禄、权、科、忌）。 */
const mutagenIn = (palace, mutagen) => palaceStars(palace).find((item) => item.mutagen === mutagen) || null;

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

  const byIndex = new Map(astrolabe.palaces.map((palace) => [palace.index, palace]));
  const neighborsOf = (palace) => [byIndex.get((palace.index + 11) % 12), byIndex.get((palace.index + 1) % 12)];
  const byName = (name) => astrolabe.palaces.find((palace) => palace.name === name) || null;

  return {
    astrolabe,
    root,
    neighborsOf,
    byName,
    body: astrolabe.palaces.find((palace) => palace.isBodyPalace) || null,
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
  group: rule.group || null,
  fortune: 'established',
  fortuneLabel: '成',
  summary: rule.group
    ? `当前本命盘完整满足《紫微斗数全书》${rule.group}“${rule.name}”的原书条件。`
    : `当前本命盘完整满足“${rule.name}”在本规则库收录的必要条件。`,
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
    // 定贵局「七杀朝斗：见前批注」，前批注在卷三七杀条下。
    source: makeSource(
      QUANSHU_TONGYUAN,
      '七杀',
      '七杀寅申子午，一生爵禄荣昌。（为七杀朝斗格。）',
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
      QUANSHU_MINGGONG,
      '巨门星',
      '身命居子午宫为石中隐玉格，更会科权禄，终身福厚。',
    ),
    limitations: ['原书同条又说「会羊陀火铃化忌」则不吉；这里只判格成，不判破格。'],
    evaluate: (facts) => {
      for (const [label, palace] of [['命宫', facts.root], ['身宫', facts.body]]) {
        if (!palace || !['子', '午'].includes(palace.earthlyBranch)) continue;
        const jumen = findMajorStar([palace], '巨门');
        if (jumen) return [describeStar(jumen), `巨门守${label}，${label}在${palace.earthlyBranch}`];
      }
      return null;
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
    // 定贵局「府相朝垣：见前批注」，前批注在卷三天府条下：府相在财帛、官禄两宫朝命即是，命在寅申为上格，别宫次之。
    // 按安星法天府、天相相隔四宫，两星分居财帛、官禄只有天府在官禄、天相在财帛一种排法。
    source: makeSource(
      QUANSHU_TONGYUAN,
      '天府',
      '府相朝垣，千钟食禄。（命寅申，府相在财帛宫、官禄宫朝者上格，别宫次之。）',
    ),
    evaluate: (facts) => {
      const { career, wealth } = facts.surrounded;
      const pairs = [[career, wealth], [wealth, career]];
      for (const [fuPalace, xiangPalace] of pairs) {
        const tianfu = findMajorStar([fuPalace], '天府');
        const tianxiang = findMajorStar([xiangPalace], '天相');
        if (!tianfu || !tianxiang) continue;
        const shang = ['寅', '申'].includes(facts.root.earthlyBranch);
        return [describeStar(tianfu), describeStar(tianxiang), shang ? `命在${facts.root.earthlyBranch}，原书注为上格` : `命在${facts.root.earthlyBranch}，原书注「别宫次之」`];
      }
      return null;
    },
  },
  {
    id: 'pearl-from-sea',
    name: '明珠出海格',
    source: makeSource(
      QUANSHU_TONGYUAN,
      '太阳太阴',
      '定贵局「明珠出海：见前批注」；前批注：日卯月亥，安命未宫多折桂。',
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
      QUANSHU_TONGYUAN,
      '太阳太阴',
      '定贵局「日月同临：见前批注」；前批注：日月同未，命安丑，侯伯之材。',
    ),
    limitations: ['原书紧接着说「日月命身居丑未，三方无吉反为凶」：日月坐命不作此格。'],
    evaluate: (facts) => {
      const wei = facts.byBranch.get('未');
      if (facts.root.earthlyBranch !== '丑' || !wei || !hasStar(wei, '太阳') || !hasStar(wei, '太阴')) return null;
      return ['命宫在丑', `${describeIn(wei, '太阳')}、太阴同宫，从对宫照命`];
    },
  },
  {
    id: 'ji-ju-mao',
    name: '巨机居卯格',
    source: makeSource(
      QUANSHU_TONGYUAN,
      '巨门天机',
      '定贵局「巨机居卯：见前批注」；前批注：巨机居卯，乙辛己丙至公卿。（不贵即富。甲人平常何也？因甲禄到寅，卯宫有擎羊破格耳。）',
    ),
    evaluate: (facts) => {
      if (facts.root.earthlyBranch !== '卯' || !includesEvery(facts.rootMajorNames, ['天机', '巨门'])) return null;
      // 原书注：卯宫有擎羊即破格（甲年禄存在寅，擎羊在卯）。
      if (hasStar(facts.root, '擎羊')) return null;
      return ['天机、巨门同坐命宫', '命宫地支为卯', '卯宫不见擎羊（原书注卯宫有擎羊为破格）'];
    },
  },
  {
    id: 'zi-fu-facing',
    name: '紫府朝垣格',
    source: makeSource(
      QUANSHU_TONGYUAN,
      '紫微',
      '定贵局「紫府朝垣：见前批注」；前批注：紫府朝垣活禄逢，终身福厚至三公。（命坐寅申，再加吉星妙。）按通行解：紫微、天府在庙旺状态合照命宫三方四正。',
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

/** 两邻宫一边见甲、一边见乙（「夹」）。 */
const flankedBy = (facts, palace, a, b) => {
  const [left, right] = facts.neighborsOf(palace);
  if (!left || !right) return null;
  const hasA = (side) => (typeof a === 'function' ? a(side) : (hasStar(side, a) ? side : null));
  const hasB = (side) => (typeof b === 'function' ? b(side) : (hasStar(side, b) ? side : null));
  if (hasA(left) && hasB(right)) return [left, right];
  if (hasA(right) && hasB(left)) return [right, left];
  return null;
};
const lu = (palace) => findIn(palace, '禄存') || mutagenIn(palace, '禄');
const describeIn = (palace, name) => {
  const star = findIn(palace, name);
  return star ? describeStar({ palace, star }) : `${name}在${palaceLabel(palace)}`;
};
const quanshu = (group, name, text) => ({ ...QUANSHU_SOURCES[group], section: `${group}·${name}`, rule: text });

/**
 * 《紫微斗数全书》卷一定富局、定贵局、定贫贱局里定义明白、按安星法又能成立的格，照原书一句判。
 * 原书写「见前批注」的（日月并明、文星暗拱、明禄暗禄、科明暗禄），和按安星法不可能成立的
 * （财荫夹印：武曲不会与天相相邻；财印夹禄：梁相相邻，夹不了第三宫；金舆扶驾：太阳不会与紫微相邻；
 * 荫印拱身：梁相相邻，不能同在三方四正；马头带剑「谓马有刃」：天马只在寅申巳亥，擎羊在禄存前一位，
 * 不入寅申巳亥，两星不能同宫），以及字义两可的（禄马佩印、日月藏辉）暂不收，待考。
 */
const quanshuRules = [
  {
    id: 'ri-yue-jia-cai',
    name: '日月夹财格',
    group: '定富局',
    source: quanshu('定富局', '日月夹财', '日月夹财：武守命，日月来夹是也，财帛宫亦然。'),
    evaluate: (facts) => {
      for (const palace of [facts.root, facts.byName('财帛')].filter(Boolean)) {
        if (!findMajorStar([palace], '武曲')) continue;
        const sides = flankedBy(facts, palace, '太阳', '太阴');
        if (sides) return [describeIn(palace, '武曲'), describeIn(sides[0], '太阳'), describeIn(sides[1], '太阴')];
      }
      return null;
    },
  },
  {
    id: 'cai-lu-jia-ma',
    name: '财禄夹马格',
    group: '定富局',
    source: quanshu('定富局', '财禄夹马', '财禄夹马：马守命，武禄来夹是也，逢生旺尤妙。'),
    evaluate: (facts) => {
      if (!hasStar(facts.root, '天马')) return null;
      const sides = flankedBy(facts, facts.root, '武曲', (side) => (lu(side) ? side : null));
      if (!sides) return null;
      const luStar = lu(sides[1]);
      return [describeIn(facts.root, '天马'), describeIn(sides[0], '武曲'), `${luStar.name}${luStar.mutagen === '禄' ? '化禄' : ''}在${palaceLabel(sides[1])}`];
    },
  },
  {
    id: 'ri-yue-zhao-bi',
    name: '日月照璧格',
    group: '定富局',
    source: quanshu('定富局', '日月照璧', '日月照璧：日月临田宅宫是也，喜居墓库。'),
    evaluate: (facts) => {
      const tianzhai = facts.byName('田宅');
      if (!tianzhai || !hasStar(tianzhai, '太阳') || !hasStar(tianzhai, '太阴')) return null;
      return [describeIn(tianzhai, '太阳'), describeIn(tianzhai, '太阴')];
    },
  },
  {
    id: 'jin-can-guang-hui',
    name: '金灿光辉格',
    group: '定富局',
    source: quanshu('定富局', '金灿光辉', '金灿光辉：太阳单守，命在午宫是也。'),
    evaluate: (facts) => {
      const majors = facts.root.majorStars || [];
      if (facts.root.earthlyBranch !== '午' || majors.length !== 1 || majors[0].name !== '太阳') return null;
      return [describeIn(facts.root, '太阳'), '命宫只有太阳一颗主星（单守）'];
    },
  },
  {
    id: 'ri-yue-jia-ming',
    name: '日月夹命格',
    group: '定贵局',
    source: quanshu('定贵局', '日月夹命', '日月夹命：不坐空亡，遇逢本宫有吉星是也。'),
    evaluate: (facts) => {
      const sides = flankedBy(facts, facts.root, '太阳', '太阴');
      if (!sides) return null;
      if (VOID_NAMES.some((name) => hasStar(facts.root, name))) return null;
      const good = AUSPICIOUS_NAMES.filter((name) => hasStar(facts.root, name));
      if (!good.length) return null;
      return [describeIn(sides[0], '太阳'), describeIn(sides[1], '太阴'), '命宫不坐旬空、截空', `命宫有吉星${good.join('、')}`];
    },
  },
  {
    id: 'sun-at-mao',
    name: '日出扶桑格',
    group: '定贵局',
    source: quanshu('定贵局', '日出扶桑', '日出扶桑：日在卯守命是也，守官禄宫亦然。'),
    evaluate: (facts) => {
      for (const [label, palace] of [['命宫', facts.root], ['官禄宫', facts.surrounded.career]]) {
        if (palace?.earthlyBranch === '卯' && findMajorStar([palace], '太阳')) return [`${describeIn(palace, '太阳')}，守${label}`];
      }
      return null;
    },
  },
  {
    id: 'moon-at-hai',
    name: '月朗天门格',
    group: '定贵局',
    source: quanshu('定贵局', '月落亥宫', '月落亥宫：月在亥守命是也，又名月朗天门。'),
    evaluate: (facts) => (
      facts.root.earthlyBranch === '亥' && findMajorStar([facts.root], '太阴') ? [describeIn(facts.root, '太阴')] : null
    ),
  },
  {
    id: 'yue-sheng-cang-hai',
    name: '月生沧海格',
    group: '定贵局',
    source: quanshu('定贵局', '月生沧海', '月生沧海：月在子宫守田宅是也。'),
    evaluate: (facts) => {
      const tianzhai = facts.byName('田宅');
      if (!tianzhai || tianzhai.earthlyBranch !== '子' || !hasStar(tianzhai, '太阴')) return null;
      return [describeIn(tianzhai, '太阴')];
    },
  },
  {
    id: 'fu-bi-gong-zhu',
    name: '辅弼拱主格',
    group: '定贵局',
    source: quanshu('定贵局', '辅弼拱主', '辅弼拱主：紫微守命，二星来拱是也，夹之亦然。'),
    evaluate: (facts) => {
      if (!findMajorStar([facts.root], '紫微')) return null;
      const others = facts.triad.filter((palace) => palace.index !== facts.root.index);
      const fu = others.find((palace) => hasStar(palace, '左辅'));
      const bi = others.find((palace) => hasStar(palace, '右弼'));
      if (fu && bi) return [describeIn(facts.root, '紫微'), `${describeIn(fu, '左辅')}，来拱`, `${describeIn(bi, '右弼')}，来拱`];
      const sides = flankedBy(facts, facts.root, '左辅', '右弼');
      if (sides) return [describeIn(facts.root, '紫微'), `${describeIn(sides[0], '左辅')}、${describeIn(sides[1], '右弼')}，夹命`];
      return null;
    },
  },
  {
    id: 'jun-chen-qing-hui',
    name: '君臣庆会格',
    group: '定贵局',
    source: quanshu('定贵局', '君臣庆会', '君臣庆会：紫微左右同守命是也，更会相武阴妙上。'),
    evaluate: (facts) => {
      if (!findMajorStar([facts.root], '紫微') || !hasStar(facts.root, '左辅') || !hasStar(facts.root, '右弼')) return null;
      return [describeIn(facts.root, '紫微'), '左辅、右弼与紫微同守命宫'];
    },
  },
  {
    id: 'zuo-gui-xiang-gui',
    name: '坐贵向贵格',
    group: '定贵局',
    source: quanshu('定贵局', '坐贵向贵', '坐贵向贵：谓魁钺在命，迭相坐拱是也。'),
    evaluate: (facts) => {
      // 「坐」是守命宫，「拱」是三合（财帛、官禄）来拱；对宫是照，不算拱。
      const trine = [facts.surrounded.wealth, facts.surrounded.career].filter(Boolean);
      for (const [sit, face] of [['天魁', '天钺'], ['天钺', '天魁']]) {
        const toward = trine.find((palace) => hasStar(palace, face));
        if (hasStar(facts.root, sit) && toward) return [`${sit}坐命宫`, `${describeIn(toward, face)}，三合来拱`];
      }
      return null;
    },
  },
  {
    id: 'xing-qiu-jia-yin',
    name: '刑囚夹印格',
    group: '定贵局',
    source: quanshu('定贵局', '刑囚夹印', '刑囚夹印：天刑廉贞同临身命，主武勇之人。'),
    evaluate: (facts) => {
      for (const [label, palace] of [['命宫', facts.root], ['身宫', facts.body]]) {
        if (palace && hasStar(palace, '天刑') && findMajorStar([palace], '廉贞')) return [`天刑、廉贞同临${label}（${palaceLabel(palace)}）`];
      }
      return null;
    },
  },
  {
    id: 'tan-huo-xiang-feng',
    name: '贪火相逢格',
    group: '定贵局',
    source: quanshu('定贵局', '贪火相逢', '贪火相逢：谓二星守命，同居庙旺是也。'),
    evaluate: (facts) => {
      const tan = findIn(facts.root, '贪狼');
      const huo = findIn(facts.root, '火星');
      if (!tan || !huo || !PROSPEROUS_BRIGHTNESS.has(tan.brightness) || !PROSPEROUS_BRIGHTNESS.has(huo.brightness)) return null;
      return [describeIn(facts.root, '贪狼'), describeIn(facts.root, '火星')];
    },
  },
  {
    id: 'wuqu-at-mao',
    name: '武曲守垣格',
    group: '定贵局',
    source: quanshu('定贵局', '武曲守垣', '武曲守垣：武守命卯宫是也，余不是。'),
    evaluate: (facts) => (
      facts.root.earthlyBranch === '卯' && findMajorStar([facts.root], '武曲') ? [describeIn(facts.root, '武曲')] : null
    ),
  },
  {
    id: 'quan-lu-sheng-feng',
    name: '权禄生逢格',
    group: '定贵局',
    source: quanshu('定贵局', '权禄生逢', '权禄生逢：二星守命庙旺是也，陷不是。'),
    evaluate: (facts) => {
      const quan = mutagenIn(facts.root, '权');
      const luHua = mutagenIn(facts.root, '禄');
      if (!quan || !luHua || !PROSPEROUS_BRIGHTNESS.has(quan.brightness) || !PROSPEROUS_BRIGHTNESS.has(luHua.brightness)) return null;
      return [`${describeStar({ palace: facts.root, star: luHua })}，生年化禄`, `${describeStar({ palace: facts.root, star: quan })}，生年化权`];
    },
  },
  {
    id: 'yang-ren-ru-miao',
    name: '羊刃入庙格',
    group: '定贵局',
    source: quanshu('定贵局', '羊刃入庙', '羊刃入庙：辰戌丑未守命遇吉是也。'),
    evaluate: (facts) => {
      if (!['辰', '戌', '丑', '未'].includes(facts.root.earthlyBranch) || !hasStar(facts.root, '擎羊')) return null;
      const good = facts.triad.flatMap((palace) => AUSPICIOUS_NAMES.filter((name) => name !== '禄存' && hasStar(palace, name)).map((name) => `${name}在${palaceLabel(palace)}`));
      if (!good.length) return null;
      return [describeIn(facts.root, '擎羊'), `命宫三方四正遇吉：${good.join('、')}`];
    },
  },
  {
    id: 'sheng-bu-feng-shi',
    name: '生不逢时格',
    group: '定贫贱局',
    source: quanshu('定贫贱局', '生不逢时', '生不逢时：命坐空亡，逢廉贞是也。'),
    evaluate: (facts) => {
      const voids = VOID_NAMES.filter((name) => hasStar(facts.root, name));
      if (!voids.length || !findMajorStar([facts.root], '廉贞')) return null;
      return [describeIn(facts.root, '廉贞'), `命宫坐空亡（${voids.join('、')}）`];
    },
  },
  {
    id: 'lu-feng-liang-sha',
    name: '禄逢两杀格',
    group: '定贫贱局',
    source: quanshu('定贫贱局', '禄逢两杀', '禄逢两杀：禄坐空亡，又逢空劫杀星是也。'),
    evaluate: (facts) => {
      const luStar = lu(facts.root);
      const voids = VOID_NAMES.filter((name) => hasStar(facts.root, name));
      const kongJie = facts.triad.flatMap((palace) => ['地空', '地劫'].filter((name) => hasStar(palace, name)).map((name) => `${name}在${palaceLabel(palace)}`));
      if (!luStar || !voids.length || !kongJie.length) return null;
      return [`${luStar.name}${luStar.mutagen === '禄' ? '化禄' : ''}坐命宫`, `命宫坐空亡（${voids.join('、')}）`, `又逢${kongJie.join('、')}`];
    },
  },
  {
    id: 'ma-luo-kong-wang',
    name: '马落空亡格',
    group: '定贫贱局',
    source: quanshu('定贫贱局', '马落空亡', '马落空亡：马既落亡，虽禄冲会无用，主奔波。'),
    evaluate: (facts) => {
      const voids = VOID_NAMES.filter((name) => hasStar(facts.root, name));
      if (!voids.length || !hasStar(facts.root, '天马')) return null;
      return ['天马守命宫', `命宫坐空亡（${voids.join('、')}）`];
    },
  },
  {
    id: 'cai-yu-qiu-chou',
    name: '财与囚仇格',
    group: '定贫贱局',
    source: quanshu('定贫贱局', '财与囚仇', '财与囚仇：武贞同守身命是也。'),
    evaluate: (facts) => {
      if (!facts.body || facts.body.index === facts.root.index) return null;
      for (const [a, b] of [['武曲', '廉贞'], ['廉贞', '武曲']]) {
        if (findMajorStar([facts.root], a) && findMajorStar([facts.body], b)) return [`${describeIn(facts.root, a)}，守命宫`, `${describeIn(facts.body, b)}，守身宫`];
      }
      return null;
    },
  },
  {
    id: 'yi-sheng-gu-pin',
    name: '一生孤贫格',
    group: '定贫贱局',
    source: quanshu('定贫贱局', '一生孤贫', '一生孤贫：谓破守命星陷地是也。'),
    evaluate: (facts) => {
      const po = findMajorStar([facts.root], '破军');
      if (!po || po.star.brightness !== '陷') return null;
      return [describeStar(po)];
    },
  },
  {
    id: 'jun-zi-zai-ye',
    name: '君子在野格',
    group: '定贫贱局',
    source: quanshu('定贫贱局', '君子在野', '君子在野：谓四杀守身命，而言临陷地是也。'),
    evaluate: (facts) => {
      // 「四杀守身命」：杀星（不止一颗）守身命，而都临陷地；只一颗落陷的不算。
      const palaces = [facts.root, facts.body].filter(Boolean).filter((palace, index, list) => list.findIndex((item) => item.index === palace.index) === index);
      const killers = palaces.flatMap((palace) => FOUR_KILLERS.map((name) => findIn(palace, name)).filter(Boolean).map((star) => ({ palace, star })));
      if (killers.length < 2 || killers.some(({ star }) => star.brightness !== '陷')) return null;
      return killers.map(describeStar);
    },
  },
  {
    id: 'liang-chong-hua-gai',
    name: '两重华盖格',
    group: '定贫贱局',
    source: quanshu('定贫贱局', '两重华盖', '两重华盖：谓禄存化禄坐命，遇空劫是也。'),
    evaluate: (facts) => {
      const luHua = mutagenIn(facts.root, '禄');
      if (!hasStar(facts.root, '禄存') || !luHua) return null;
      const kongJie = facts.triad.flatMap((palace) => ['地空', '地劫'].filter((name) => hasStar(palace, name)).map((name) => `${name}在${palaceLabel(palace)}`));
      if (!kongJie.length) return null;
      return ['禄存坐命宫', `${describeStar({ palace: facts.root, star: luHua })}，生年化禄`, `遇${kongJie.join('、')}`];
    },
  },
];
strictRules.push(...quanshuRules);

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
