/**
 * 干支关系：天干五合、四冲；地支六合、六冲、三合（半合）、三会、相刑、自刑、相害、相破；
 * 以及整柱伏吟、反吟（天克地冲）。
 *
 * 输入为若干带 key 的柱（本命四柱、大运、流年、流月、流日、流时……），
 * 只返回涉及 focusKeys（通常是运限各层）的关系，避免重复列出原局内部结构。
 */

const pairKey = (a, b) => [a, b].sort().join('');

const GAN_ORDER = '甲乙丙丁戊己庚辛壬癸';
const ZHI_ORDER = '子丑寅卯辰巳午未申酉戌亥';
// 标题按传统顺序书写（甲己合、辰戌冲），不受柱的排列顺序影响。
const orderedPair = (a, b, order) => (order.indexOf(a) <= order.indexOf(b) ? `${a}${b}` : `${b}${a}`);

const GAN_HE = new Map([
  ['甲己', '土'], ['乙庚', '金'], ['丙辛', '水'], ['丁壬', '木'], ['戊癸', '火'],
].map(([pair, element]) => [pairKey(pair[0], pair[1]), element]));

const GAN_CHONG = new Set(['甲庚', '乙辛', '丙壬', '丁癸'].map((pair) => pairKey(pair[0], pair[1])));

const ZHI_LIU_HE = new Map([
  ['子丑', '土'], ['寅亥', '木'], ['卯戌', '火'], ['辰酉', '金'], ['巳申', '水'], ['午未', '土'],
].map(([pair, element]) => [pairKey(pair[0], pair[1]), element]));

const ZHI_CHONG = new Set(['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'].map((pair) => pairKey(pair[0], pair[1])));
const ZHI_XING = new Set(['子卯', '寅巳', '巳申', '寅申', '丑戌', '戌未', '丑未'].map((pair) => pairKey(pair[0], pair[1])));
const ZHI_SELF_XING = new Set(['辰', '午', '酉', '亥']);
const ZHI_HAI = new Set(['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'].map((pair) => pairKey(pair[0], pair[1])));
const ZHI_PO = new Set(['子酉', '卯午', '辰丑', '未戌', '寅亥', '巳申'].map((pair) => pairKey(pair[0], pair[1])));

const SAN_HE = Object.freeze([
  { zhis: ['申', '子', '辰'], element: '水' },
  { zhis: ['亥', '卯', '未'], element: '木' },
  { zhis: ['寅', '午', '戌'], element: '火' },
  { zhis: ['巳', '酉', '丑'], element: '金' },
]);

const SAN_HUI = Object.freeze([
  { zhis: ['寅', '卯', '辰'], element: '木' },
  { zhis: ['巳', '午', '未'], element: '火' },
  { zhis: ['申', '酉', '戌'], element: '金' },
  { zhis: ['亥', '子', '丑'], element: '水' },
]);

// 半合只取“生地 + 帝旺”或“帝旺 + 墓库”，与常见排盘软件一致。
const BAN_HE = new Map(SAN_HE.flatMap(({ zhis: [sheng, wang, mu], element }) => [
  [pairKey(sheng, wang), { element, title: `${sheng}${wang}` }],
  [pairKey(wang, mu), { element, title: `${wang}${mu}` }],
]));

export const RELATION_TONES = Object.freeze({
  clash: { label: '冲', priority: 0 },
  punish: { label: '刑', priority: 1 },
  harm: { label: '害', priority: 2 },
  harmony: { label: '合', priority: 3 },
  echo: { label: '伏吟', priority: 4 },
  break: { label: '破', priority: 5 },
});

const KIND_TONE = Object.freeze({
  反吟: 'clash',
  冲: 'clash',
  刑: 'punish',
  自刑: 'punish',
  害: 'harm',
  合: 'harmony',
  半合: 'harmony',
  三合: 'harmony',
  三会: 'harmony',
  伏吟: 'echo',
  破: 'break',
});

const strongestTone = (kinds) => kinds
  .map((kind) => KIND_TONE[kind])
  .sort((a, b) => RELATION_TONES[a].priority - RELATION_TONES[b].priority)[0];

const describeMember = (item, char) => `${item.label}${char}`;

const ganPairKinds = (a, b) => {
  const key = pairKey(a, b);
  const kinds = [];
  let element = '';
  if (GAN_HE.has(key)) {
    kinds.push('合');
    element = GAN_HE.get(key);
  }
  if (GAN_CHONG.has(key)) kinds.push('冲');
  return { kinds, element };
};

const zhiPairKinds = (a, b) => {
  const key = pairKey(a, b);
  const kinds = [];
  let element = '';
  if (ZHI_LIU_HE.has(key)) {
    kinds.push('合');
    element = ZHI_LIU_HE.get(key);
  } else if (BAN_HE.has(key)) {
    kinds.push('半合');
    element = BAN_HE.get(key).element;
  }
  if (ZHI_CHONG.has(key)) kinds.push('冲');
  if (ZHI_XING.has(key)) kinds.push('刑');
  if (a === b && ZHI_SELF_XING.has(a)) kinds.push('自刑');
  if (ZHI_HAI.has(key)) kinds.push('害');
  if (ZHI_PO.has(key)) kinds.push('破');
  return { kinds, element };
};

const isFocused = (focus, ...items) => !focus || items.some((item) => focus.has(item.key));

// 同一种关系出现多次（如流日戌、流月戌都冲时柱辰）时合并成一条，
// 按两侧的字分组书写：“时柱辰 · 流月戌、流日戌”。
const mergeSameRelations = (relations) => {
  const groups = new Map();
  relations.forEach((relation) => {
    const groupKey = relation.members ? `${relation.scope}|${relation.title}` : relation.id;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), relation]);
  });

  return [...groups.values()].map((group) => {
    if (group.length === 1) return group[0];
    const sides = new Map();
    group.forEach((relation) => relation.members.forEach(({ char, text }) => {
      sides.set(char, new Set([...(sides.get(char) ?? []), text]));
    }));
    const separator = sides.size === 1 ? ' · ' : '、';
    return {
      ...group[0],
      id: group.map((relation) => relation.id).join('+'),
      detail: [...sides.values()].map((texts) => [...texts].join(separator)).join(' · '),
      memberKeys: [...new Set(group.flatMap((relation) => relation.memberKeys))],
    };
  });
};

export const findRelations = (items, { focusKeys = null } = {}) => {
  const pillars = (items ?? []).filter((item) => item?.gan && item?.zhi);
  const focus = focusKeys ? new Set(focusKeys) : null;
  const relations = [];
  const fullSanHeGroups = [];

  // 三合、三会：三个地支齐全，且至少一个来自关注层。
  [
    ...SAN_HE.map((group) => ({ ...group, kind: '三合' })),
    ...SAN_HUI.map((group) => ({ ...group, kind: '三会' })),
  ].forEach((group) => {
    const memberGroups = group.zhis.map((zhi) => pillars.filter((item) => item.zhi === zhi));
    if (memberGroups.some((members) => members.length === 0)) return;
    const members = memberGroups.flat();
    if (!isFocused(focus, ...members)) return;
    if (group.kind === '三合') fullSanHeGroups.push(group.zhis);
    relations.push({
      id: `${group.kind}-${group.zhis.join('')}`,
      scope: 'zhi',
      kinds: [group.kind],
      tone: 'harmony',
      title: `${group.zhis.join('')}${group.kind}${group.element}局`,
      detail: members.map((item) => describeMember(item, item.zhi)).join(' · '),
      memberKeys: members.map((item) => item.key),
    });
  });

  for (let i = 0; i < pillars.length; i += 1) {
    for (let j = i + 1; j < pillars.length; j += 1) {
      const a = pillars[i];
      const b = pillars[j];
      if (!isFocused(focus, a, b)) continue;

      if (a.gan === b.gan && a.zhi === b.zhi) {
        relations.push({
          id: `伏吟-${a.key}-${b.key}`,
          scope: 'pillar',
          kinds: ['伏吟'],
          tone: 'echo',
          title: `${a.gan}${a.zhi}伏吟`,
          detail: `${a.label}与${b.label}同为${a.gan}${a.zhi}`,
          memberKeys: [a.key, b.key],
        });
      }
      const isFanYin = GAN_CHONG.has(pairKey(a.gan, b.gan)) && ZHI_CHONG.has(pairKey(a.zhi, b.zhi));
      if (isFanYin) {
        relations.push({
          id: `反吟-${a.key}-${b.key}`,
          scope: 'pillar',
          kinds: ['反吟'],
          tone: 'clash',
          title: '天克地冲',
          detail: `${a.label}${a.gan}${a.zhi} 与 ${b.label}${b.gan}${b.zhi} 反吟`,
          memberKeys: [a.key, b.key],
        });
      }

      // 反吟已涵盖天干冲与地支冲，两者不再单独列出。
      const gan = ganPairKinds(a.gan, b.gan);
      if (isFanYin) gan.kinds = gan.kinds.filter((kind) => kind !== '冲');
      if (gan.kinds.length) {
        relations.push({
          id: `gan-${a.key}-${b.key}`,
          scope: 'gan',
          kinds: gan.kinds,
          tone: strongestTone(gan.kinds),
          title: `${orderedPair(a.gan, b.gan, GAN_ORDER)}${gan.kinds.join('·')}${gan.element ? `（化${gan.element}）` : ''}`,
          detail: `${describeMember(a, a.gan)} · ${describeMember(b, b.gan)}`,
          members: [{ char: a.gan, text: describeMember(a, a.gan) }, { char: b.gan, text: describeMember(b, b.gan) }],
          memberKeys: [a.key, b.key],
        });
      }

      const zhi = zhiPairKinds(a.zhi, b.zhi);
      // 已成三合局的两两半合不再重复列出。
      const coveredBySanHe = fullSanHeGroups.some((group) => group.includes(a.zhi) && group.includes(b.zhi));
      const zhiKinds = zhi.kinds.filter((kind) => !(coveredBySanHe && kind === '半合') && !(isFanYin && kind === '冲'));
      if (zhiKinds.length) {
        const shownElement = zhiKinds.some((kind) => kind === '合' || kind === '半合') ? zhi.element : '';
        const banHe = zhiKinds.includes('半合') ? BAN_HE.get(pairKey(a.zhi, b.zhi)) : null;
        const pairTitle = banHe ? banHe.title : orderedPair(a.zhi, b.zhi, ZHI_ORDER);
        relations.push({
          id: `zhi-${a.key}-${b.key}`,
          scope: 'zhi',
          kinds: zhiKinds,
          tone: strongestTone(zhiKinds),
          title: `${pairTitle}${zhiKinds.join('·')}${shownElement ? `（${shownElement}）` : ''}`,
          detail: `${describeMember(a, a.zhi)} · ${describeMember(b, b.zhi)}`,
          members: [{ char: a.zhi, text: describeMember(a, a.zhi) }, { char: b.zhi, text: describeMember(b, b.zhi) }],
          memberKeys: [a.key, b.key],
        });
      }
    }
  }

  return mergeSameRelations(relations)
    .sort((x, y) => RELATION_TONES[x.tone].priority - RELATION_TONES[y.tone].priority);
};

/** 一组关系中最值得提示的一种（用于日历上的小圆点）。 */
export const getStrongestRelationTone = (relations) => relations?.[0]?.tone ?? null;
