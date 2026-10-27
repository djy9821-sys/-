import { cite } from './classics.js';

/** 六爻装卦与程序初判所依据的古籍条目：topic 对应程序里的一组规则。 */
export const LIUYAO_RULE_SOURCES = Object.freeze([
  Object.freeze({ topic: '八宫卦序与世应', classic: 'jingfang', section: '八宫卦', rule: '本宫卦世在上爻；自初爻起依次变为一世至五世，五世再变四爻为游魂，游魂下卦归位为归魂；应爻与世爻隔三位。' }),
  Object.freeze({ topic: '纳甲', classic: 'jingfang', section: '纳甲', rule: '乾纳甲壬（子寅辰、午申戌），坤纳乙癸（未巳卯、丑亥酉），震纳庚，巽纳辛，坎纳戊，离纳己，艮纳丙，兑纳丁；内卦取前三支，外卦取后三支。' }),
  Object.freeze({ topic: '六亲', classic: 'jingfang', section: '六亲', rule: '以本宫五行为我：生我者父母，我生者子孙，克我者官鬼，我克者妻财，比和者兄弟。变爻六亲仍以本宫论。' }),
  Object.freeze({ topic: '六神起例', classic: 'bushi', section: '六神歌诀', rule: '甲乙起青龙，丙丁起朱雀，戊日起勾陈，己日起螣蛇，庚辛起白虎，壬癸起玄武；自初爻起顺布。' }),
  Object.freeze({ topic: '伏神', classic: 'bushi', section: '八宫伏神', rule: '本卦六亲不全时，到本宫首卦同一爻位之下取伏神，飞神即本卦该爻。' }),
  Object.freeze({ topic: '铜钱起卦', classic: 'zengshan', section: '以钱代蓍法', rule: '一背为单（少阳），二背为拆（少阴），三背为重（老阳动），三字为交（老阴动）。' }),
  Object.freeze({ topic: '月建、日辰、旬空', classic: 'zengshan', section: '月建章、日辰章、旬空章', rule: '月建按节气定；旬空按日柱所在旬取。旺相不为空、动不为空、有日月动爻生扶不为空；休囚安静者为真空，出空、填实方可用。' }),
  Object.freeze({ topic: '取用神', classic: 'zengshan', section: '用神章、用神两现章', rule: '按所问之事取六亲为用神，自占以世爻为用。用神两现：舍静取动，舍不空破取空破，舍不临世应取临世应。' }),
  Object.freeze({ topic: '月破、暗动', classic: 'zengshan', section: '月破章、暗动章', rule: '爻与月建相冲为月破；旺相静爻逢日辰冲为暗动，休囚静爻逢日冲为日破。' }),
  Object.freeze({ topic: '六冲六合', classic: 'zengshan', section: '六冲章、六合章', rule: '八纯卦与天雷无妄、雷天大壮为六冲；天地否、地天泰、泽水困、水泽节、火山旅、山火贲、雷地豫、地雷复为六合。' }),
  Object.freeze({ topic: '进退神、回头生克、入墓', classic: 'zengshan', section: '进神退神章、墓库章及论动变诸章', rule: '亥子、寅卯、巳午、申酉、丑辰未戌，前化后为进神，后化前为退神；变爻生本爻为回头生，克本爻为回头克；木墓未、火墓戌、金墓丑、水土墓辰。' }),
  Object.freeze({ topic: '反吟伏吟', classic: 'zengshan', section: '反吟章、伏吟章', rule: '变爻与本爻相冲为反吟，变出同支为伏吟，皆主反复难进。' }),
  Object.freeze({ topic: '时间起卦、报数起卦', classic: 'meihua', section: '年月日时起例、物数占', rule: '年支数加月数加日数，除八取上卦；再加时辰数，除八取下卦；总数除六取动爻。报数以首数取上卦、次数取下卦、两数之和取动爻。' }),
]);

/** 一行文字，供提示词与界面脚注使用。 */
export const describeLiuYaoSources = () => {
  const by = (key, skip = []) => LIUYAO_RULE_SOURCES.filter((item) => item.classic === key && !skip.includes(item.topic)).map((item) => item.topic).join('、');
  return `装卦依据${cite('jingfang')}（${by('jingfang')}）与${cite('bushi')}（${by('bushi')}）；起卦依据${cite('zengshan', '以钱代蓍法')}与${cite('meihua')}（${by('meihua')}）；断法依据${cite('zengshan')}（${by('zengshan', ['铜钱起卦'])}）。`;
};
