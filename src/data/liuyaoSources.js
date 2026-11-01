import { cite } from './classics.js';

/** 六爻装卦与程序初判所依据的古籍条目：topic 对应程序里的一组规则。 */
export const LIUYAO_RULE_SOURCES = Object.freeze([
  Object.freeze({ topic: '八宫卦序与世应', classic: 'jingfang', section: '八宫卦', rule: '本宫卦世在上爻；自初爻起依次变为一世至五世，五世再变四爻为游魂，游魂下卦归位为归魂；应爻与世爻隔三位。' }),
  Object.freeze({ topic: '纳甲', classic: 'jingfang', section: '纳甲', rule: '乾纳甲壬（子寅辰、午申戌），坤纳乙癸（未巳卯、丑亥酉），震纳庚，巽纳辛，坎纳戊，离纳己，艮纳丙，兑纳丁；内卦取前三支，外卦取后三支。' }),
  Object.freeze({ topic: '六亲', classic: 'jingfang', section: '六亲', rule: '以本宫五行为我：生我者父母，我生者子孙，克我者官鬼，我克者妻财，比和者兄弟。变爻六亲仍以本宫论。' }),
  Object.freeze({ topic: '六神起例', classic: 'bushi', section: '六神歌诀', rule: '甲乙起青龙，丙丁起朱雀，戊日起勾陈，己日起螣蛇，庚辛起白虎，壬癸起玄武；自初爻起顺布。' }),
  Object.freeze({ topic: '伏神', classic: 'bushi', section: '八宫伏神', rule: '本卦六亲不全时，到本宫首卦同一爻位之下取伏神，飞神即本卦该爻。' }),
  Object.freeze({ topic: '铜钱起卦', classic: 'zengshan', section: '以钱代蓍法', rule: '一背为单（少阳），二背为拆（少阴），三背为重（老阳动），三字为交（老阴动）。' }),
  Object.freeze({ topic: '月建、日辰、旬空', classic: 'zengshan', section: '月建章、日辰章、旬空章', rule: '月建按节气定；旬空按日柱所在旬取。旺不为空、动不为空、有日建动爻生扶不为空；真空者春土夏金秋木冬火，其余静而无扶的出空、填实之日方有用。' }),
  Object.freeze({ topic: '取用神', classic: 'zengshan', section: '用神章、两现章、飞伏神章', rule: '按所问之事取六亲为用神，自占以世爻为用；代占以所问之人的六亲为用（父母、师长、东家取父母，兄弟朋友取兄弟，妻与仆役取妻财，妻占夫取官鬼，子女晚辈取子孙）。两现舍静取动、舍休囚取旺相；不上卦而动爻化出者取化出之爻，日月同五行者以日月为用，再寻伏神。' }),
  Object.freeze({ topic: '元神、忌神、仇神', classic: 'zengshan', section: '用神元神忌神仇神章、元神忌神衰旺章、静动章', rule: '生用神者为元神，克用神者为忌神，克元神者为仇神。元神旺相、临日月、化回头生或进神、长生帝旺于日辰为有力；休囚空破、化退、化绝化克化破、入墓为无力。忌神与元神同动则接续相生，反为吉；忌神与仇神同动更凶；用神无根，元神有力亦难生。' }),
  Object.freeze({ topic: '月破、暗动、伏神', classic: 'zengshan', section: '月破章、日辰章、飞伏神章', rule: '爻与月建相冲为月破，静而无生扶到底破，动或有日月动爻生扶者出月、逢合、实破之日仍可用；旺相静爻逢日辰冲为暗动，休囚者为日破；动爻逢冲不论冲散。伏神得日月生扶、飞神空破或被冲克者易出，休囚又被日月冲克者终难出。' }),
  Object.freeze({ topic: '六冲六合、三合', classic: 'zengshan', section: '六冲章、六合章', rule: '八纯卦与天雷无妄、雷天大壮为六冲；天地否、地天泰、泽水困、水泽节、火山旅、山火贲、雷地豫、地雷复为六合。凡占凶事宜于冲散，六冲变六合散而复聚。三爻动、或两爻动一爻静、或变出之爻凑成三合者成局，局生用神为吉、克用神为凶，世在局中为美。' }),
  Object.freeze({ topic: '疾病、出行、行人、官司', classic: 'zengshan', section: '疾病章、出行章、行人章、防非避讼章', rule: '近病逢冲即愈、久病逢冲难治；用遇旬空近病不忧；用化鬼、鬼化用防不测；子孙为医药、解忧之神。出行世为行人、应为地头，子孙发动百祸潜消；行人明摇暗动归鞭发矣，墓绝空破归信杳然，化退而归、化进不返。官司世为己、应为对方，忧讼喜官居空破、子孙发动。' }),
  Object.freeze({ topic: '进退神、回头生克、入墓', classic: 'zengshan', section: '进神退神章、墓库章及论动变诸章', rule: '亥子、寅卯、巳午、申酉、丑辰未戌，前化后为进神，后化前为退神；变爻生本爻为回头生，克本爻为回头克；木墓未、火墓戌、金墓丑、水土墓辰。' }),
  Object.freeze({ topic: '反吟伏吟', classic: 'zengshan', section: '反吟章、伏吟章', rule: '变爻与本爻相冲为反吟，变出同支为伏吟，皆主反复难进。' }),
  Object.freeze({ topic: '天时', classic: 'zengshan', section: '天时章', rule: '父母为雨，子孙为晴，妻财亦主晴，官鬼为浓云雷电，兄弟为风云；只看发动、暗动与化出，不论旺衰。动者逢值逢合之日应，静者逢值逢冲之日应，动而逢空应冲空、填实之日。' }),
  Object.freeze({ topic: '时间起卦、报数起卦', classic: 'meihua', section: '年月日时起例、物数占', rule: '年支数加月数加日数，除八取上卦；再加时辰数，除八取下卦；总数除六取动爻。报数以首数取上卦、次数取下卦、两数之和取动爻。' }),
]);

/** 一行文字，供提示词与界面脚注使用。 */
export const describeLiuYaoSources = () => {
  const by = (key, skip = []) => LIUYAO_RULE_SOURCES.filter((item) => item.classic === key && !skip.includes(item.topic)).map((item) => item.topic).join('、');
  return `装卦依据${cite('jingfang')}（${by('jingfang')}）与${cite('bushi')}（${by('bushi')}）；起卦依据${cite('zengshan', '以钱代蓍法')}与${cite('meihua')}（${by('meihua')}）；断法依据${cite('zengshan')}（${by('zengshan', ['铜钱起卦'])}）。`;
};
