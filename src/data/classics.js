/**
 * 源头古籍登记表：各模块口诀、神煞、格局的出处都指向这里，后续把原文接进来时按 key 对应。
 *
 * 只登记本程序实际依据的书；作者、年代用通行说法，存疑的注明「旧题」。
 * edition：给读者看的底本说明（藏经阁每本书的题名下显示），一两句话说清原文据什么本子录、怎么核对的。
 * 各古籍文件自己的 edition 字段记的是录入时的详细过程（页码、取文方式），那是给校对的人看的；
 * 一本书的文件换了底本或加了新来源，这里要跟着改。还没录入的书先不写。
 */
export const CLASSICS = Object.freeze({
  sanming: Object.freeze({ key: 'sanming', title: '三命通会', author: '明·万民英', module: 'bazi', note: '子平法集大成之作，神煞、纳音、格局条目最全。', edition: '通行本卷二、卷三，以维基文库录文为底本逐段比对，参校四库全书本。' }),
  yuanhai: Object.freeze({ key: 'yuanhai', title: '渊海子平', author: '宋·徐大升（徐子平法）', module: 'bazi', note: '子平法最早的系统著作，禄、刃、贵人等口诀多出于此。', edition: '公版通行本，据维基文库录文，繁体转简体后逐字校对。' }),
  ditian: Object.freeze({ key: 'ditian', title: '滴天髓', author: '旧题宋·京图撰，明·刘伯温注，清·任铁樵阐微', module: 'bazi', note: '论干支性情、旺衰、格局高低的纲领性经典。', edition: '通神论以维基文库《滴天髓阐微》录文为底本逐段比对；六亲论与任铁樵的阐微，据民国三十六年（1947）大东书局《滴天髓阐微》扫描本逐字核对。' }),
  ziping: Object.freeze({ key: 'ziping', title: '子平真诠', author: '清·沈孝瞻', module: 'bazi', note: '以月令取格、论用神成败的代表作。', edition: '据中国国家图书馆藏、上海世界图书馆发行《秘本子平真诠》影印本逐页核录；只录沈孝瞻正文，徐乐吾的评注不录。' }),
  qiongtong: Object.freeze({ key: 'qiongtong', title: '穷通宝鉴', author: '旧题明·余春台辑（原名《栏江网》），民国徐乐吾评注', module: 'bazi', note: '按日干与月令取调候用神的专书，十干十二月的调候用神表出于此。', edition: '据维基文库本《穷通宝鉴》录文，不改字、不补句；底本里电脑显示不了的字标作「□」。' }),
  xieji: Object.freeze({ key: 'xieji', title: '协纪辨方书', author: '清·允禄等奉敕纂', module: 'bazi', note: '官修择日、神煞总汇，红鸾、天喜、黄黑道等年月神煞的权威出处。' }),
  ziwei: Object.freeze({ key: 'ziwei', title: '紫微斗数全书', author: '旧题宋·陈希夷撰，明·罗洪先辑', module: 'ziwei', note: '紫微斗数安星、诸格、星曜庙旺的源头。', edition: '明万历刻本系统的通行本，以维基文库录文为底本，繁体转简体后逐字核对，部分篇目参校其他公版电子文本。' }),
  jingfang: Object.freeze({ key: 'jingfang', title: '京氏易传', author: '汉·京房', module: 'liuyao', note: '八宫卦序、纳甲、世应、六亲的源头。' }),
  bushi: Object.freeze({ key: 'bushi', title: '卜筮正宗', author: '清·王洪绪', module: 'liuyao', note: '六爻装卦与断法的通行教本，八宫卦、伏神表、六神起例皆备。' }),
  zengshan: Object.freeze({ key: 'zengshan', title: '增删卜易', author: '清·野鹤老人撰，李文辉增删', module: 'liuyao', note: '以实占验证的六爻断法，用神、旬空、月破、进退神、反吟伏吟等章最常引用。', edition: '据中国国家图书馆藏民国十四年（1925）文明书局《增删卜易》影印本逐页核录，繁体转简体；卦图留在底本，不改写成正文。' }),
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
