/**
 * 源头古籍登记表：各模块口诀、神煞、格局的出处都指向这里，后续把原文接进来时按 key 对应。
 *
 * 只登记本程序实际依据的书；作者、年代用通行说法，存疑的注明「旧题」。
 */
export const CLASSICS = Object.freeze({
  sanming: Object.freeze({ key: 'sanming', title: '三命通会', author: '明·万民英', module: 'bazi', note: '子平法集大成之作，神煞、纳音、格局条目最全。' }),
  yuanhai: Object.freeze({ key: 'yuanhai', title: '渊海子平', author: '宋·徐大升（徐子平法）', module: 'bazi', note: '子平法最早的系统著作，禄、刃、贵人等口诀多出于此。' }),
  ditian: Object.freeze({ key: 'ditian', title: '滴天髓', author: '旧题宋·京图撰，明·刘伯温注，清·任铁樵阐微', module: 'bazi', note: '论干支性情、旺衰、格局高低的纲领性经典。' }),
  ziping: Object.freeze({ key: 'ziping', title: '子平真诠', author: '清·沈孝瞻', module: 'bazi', note: '以月令取格、论用神成败的代表作。' }),
  qiongtong: Object.freeze({ key: 'qiongtong', title: '穷通宝鉴', author: '旧题明·余春台辑（原名《栏江网》），民国徐乐吾评注', module: 'bazi', note: '按日干与月令取调候用神的专书，十干十二月的调候用神表出于此。' }),
  xieji: Object.freeze({ key: 'xieji', title: '协纪辨方书', author: '清·允禄等奉敕纂', module: 'bazi', note: '官修择日、神煞总汇，红鸾、天喜、黄黑道等年月神煞的权威出处。' }),
  ziwei: Object.freeze({ key: 'ziwei', title: '紫微斗数全书', author: '旧题宋·陈希夷撰，明·罗洪先辑', module: 'ziwei', note: '紫微斗数安星、诸格、星曜庙旺的源头。' }),
  jingfang: Object.freeze({ key: 'jingfang', title: '京氏易传', author: '汉·京房', module: 'liuyao', note: '八宫卦序、纳甲、世应、六亲的源头。' }),
  bushi: Object.freeze({ key: 'bushi', title: '卜筮正宗', author: '清·王洪绪', module: 'liuyao', note: '六爻装卦与断法的通行教本，八宫卦、伏神表、六神起例皆备。' }),
  zengshan: Object.freeze({ key: 'zengshan', title: '增删卜易', author: '清·野鹤老人撰，李文辉增删', module: 'liuyao', note: '以实占验证的六爻断法，用神、旬空、月破、进退神、反吟伏吟等章最常引用。' }),
  meihua: Object.freeze({ key: 'meihua', title: '梅花易数', author: '旧题宋·邵雍', module: 'liuyao', note: '时间起卦、报数起卦与体用断法的出处。' }),
});

/** 组一条可读的出处：《书名》·篇章。 */
export const cite = (key, section = '') => {
  const classic = CLASSICS[key];
  if (!classic) return section;
  return `《${classic.title}》${section ? `·${section}` : ''}`;
};

/** 某模块依据的古籍清单（按登记顺序）。 */
export const classicsOf = (module) => Object.values(CLASSICS).filter((item) => item.module === module);
