/**
 * 六爻「问事类别」的名字（古籍匹配与数据校验共用，纯数据、无依赖）。
 *
 * 程序的类别（src/utils/liuyaoRecord.js 的 LIUYAO_TOPIC_LABELS）比古籍的分类占法粗：
 * 《增删卜易》分天时、身命、婚姻、胎孕、求财、求名、仕宦、出行、行人、疾病、词讼、家宅、茔葬、趋避……
 * 这里把古籍里的叫法对到程序类别上，条目 applies.topic 写哪一种都能被对应类别的卦命中。
 */

/** 程序类别 → 古籍里的各种叫法（第一个是程序显示的名字）。 */
export const LIUYAO_TOPIC_NAMES = Object.freeze({
  general: Object.freeze(['一般吉凶', '杂占', '诸事']),
  wealth: Object.freeze(['求财', '财运', '买卖', '生意', '交易', '借贷', '索债']),
  career: Object.freeze(['事业工作', '事业', '工作', '求名', '功名', '仕宦', '求官', '谋事']),
  love: Object.freeze(['感情婚姻', '婚姻', '姻缘', '感情', '恋爱']),
  health: Object.freeze(['健康疾病', '疾病', '病', '医药', '身体']),
  travel: Object.freeze(['出行', '行人', '远行', '旅行']),
  study: Object.freeze(['考试学业', '考试', '学业', '求名', '功名', '科举', '求学']),
  lawsuit: Object.freeze(['官司是非', '词讼', '官讼', '诉讼', '口舌']),
  children: Object.freeze(['子女孕育', '胎孕', '子嗣', '产育', '生产']),
  parents: Object.freeze(['父母长辈', '父母', '长辈']),
  friends: Object.freeze(['兄弟朋友', '兄弟', '朋友', '同事']),
  home: Object.freeze(['房屋田产', '宅舍', '家宅', '田土', '房屋', '买房']),
  life: Object.freeze(['终身运势', '身命', '终身']),
  // 「产育」「生产」两类都算：问产期、婴童看子孙（子女孕育），问产妇安否看妻财（产妇平安）。
  maternity: Object.freeze(['产妇平安', '产妇', '产育', '生产', '临产']),
  weather: Object.freeze(['天时晴雨', '天时', '晴雨', '天气']),
  lost: Object.freeze(['失物寻找', '失物', '失脱', '寻物', '遗失']),
  // 「年时」是《增删卜易》序与千金赋里占流年、月令的说法
  year: Object.freeze(['流年运势', '年时', '流年', '月令', '岁运']),
  refuge: Object.freeze(['避乱避祸', '避乱', '趋避', '避兵', '避盗', '避难']),
  // 「坟墓」两类都算：寻新地以世爻为穴，已葬的祖坟以父母为用神。
  gravesite: Object.freeze(['寻地择穴', '坟墓', '茔葬', '寻地', '点穴', '葬地', '阴宅']),
  ancestral: Object.freeze(['祖坟风水', '坟墓', '祖坟', '祖茔', '旧坟', '修坟']),
  // 《增删卜易·鬼神章》：病痛灾祸疑为鬼神所为时，以官鬼分神祇、邪祟。
  spirits: Object.freeze(['鬼神作祟', '鬼神', '邪祟', '祭祀', '祟']),
});

/** 古籍有、程序还没有对应类别的占法：校验放行（将来加类别时接上），眼下不会被匹配到。 */
export const LIUYAO_TOPIC_PENDING = Object.freeze(['国朝']);

const LABEL_TO_KEY = Object.freeze(Object.fromEntries(
  Object.entries(LIUYAO_TOPIC_NAMES).flatMap(([key, names]) => names.map((name) => [name, key])).reverse(),
));

/** 一个卦的类别（程序 key 如 wealth，或中文名如 求财）→ 该类别的全部叫法；认不出时只返回原词。 */
export const liuyaoTopicNamesOf = (topic) => {
  if (!topic) return [];
  const key = LIUYAO_TOPIC_NAMES[topic] ? topic : LABEL_TO_KEY[topic];
  return key ? [...LIUYAO_TOPIC_NAMES[key]] : [String(topic)];
};

/** 六爻 applies.topic 允许的全部写法。 */
export const LIUYAO_TOPIC_VOCAB = Object.freeze([...new Set([...Object.values(LIUYAO_TOPIC_NAMES).flat(), ...LIUYAO_TOPIC_PENDING])]);
