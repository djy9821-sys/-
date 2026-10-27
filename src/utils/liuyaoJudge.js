/**
 * 六爻断卦辅助（程序初判）
 *
 * 按所问类别取用神，看用神在月建、日辰下的旺衰，动爻与变爻对用神的生克，
 * 世应关系、卦的六冲六合与游魂归魂，再给出倾向与应期提示，整理成几条断语要点。
 * 规则取自《增删卜易》《卜筮正宗》等通行口诀的简化版，用计分把它们串起来：
 * 只做“程序初判”，帮助看不懂装卦表的人抓住重点，不替代人的综合判断。
 */
import { CONTROLS, GENERATES, ZHI_CLASH, ZHI_ELEMENT, ZHI_HARMONY } from './liuyao.js';
import { LIUYAO_TOPIC_LABELS } from './liuyaoRecord.js';

/** 问事类别：值、名称、说明，以及用神怎么取（relative 为 null 表示自占以世爻为用神）。 */
export const LIUYAO_TOPICS = Object.freeze([
  { value: 'general', label: LIUYAO_TOPIC_LABELS.general, hint: '不便归类的事，以世爻为用神看走势', relative: null },
  { value: 'wealth', label: LIUYAO_TOPIC_LABELS.wealth, hint: '买卖、投资、收款、财运', relative: '妻财', aux: [['兄弟', '劫财竞争']] },
  { value: 'career', label: LIUYAO_TOPIC_LABELS.career, hint: '职位、求职、公司、上司', relative: '官鬼', aux: [['妻财', '薪酬待遇'], ['父母', '文书合同']] },
  { value: 'love', label: LIUYAO_TOPIC_LABELS.love, hint: '恋爱、婚姻、对方心意', relative: null, byGender: { male: '妻财', female: '官鬼' } },
  { value: 'health', label: LIUYAO_TOPIC_LABELS.health, hint: '自己的身体与病情', relative: null, aux: [['官鬼', '病症'], ['子孙', '医药']] },
  { value: 'travel', label: LIUYAO_TOPIC_LABELS.travel, hint: '出差、旅行、搬迁', relative: null, aux: [['官鬼', '阻碍'], ['父母', '车船行李']] },
  { value: 'study', label: LIUYAO_TOPIC_LABELS.study, hint: '考试、升学、证书', relative: '父母', aux: [['官鬼', '名次录取']] },
  { value: 'lawsuit', label: LIUYAO_TOPIC_LABELS.lawsuit, hint: '诉讼、纠纷、口舌', relative: '官鬼', aux: [['父母', '文书证据']] },
  { value: 'children', label: LIUYAO_TOPIC_LABELS.children, hint: '子女、怀孕、晚辈', relative: '子孙' },
  { value: 'parents', label: LIUYAO_TOPIC_LABELS.parents, hint: '父母、长辈、师长', relative: '父母' },
  { value: 'friends', label: LIUYAO_TOPIC_LABELS.friends, hint: '兄弟姐妹、朋友、同事', relative: '兄弟' },
  { value: 'home', label: LIUYAO_TOPIC_LABELS.home, hint: '买房租房、房屋、车辆', relative: '父母', aux: [['妻财', '价钱']] },
]);

const TOPIC_BY_VALUE = Object.fromEntries(LIUYAO_TOPICS.map((topic) => [topic.value, topic]));

/** 五行的墓库（土随水，墓于辰）。 */
const TOMB = Object.freeze({ 木: '未', 火: '戌', 金: '丑', 水: '辰', 土: '辰' });
/** 进神：亥子、寅卯、巳午、申酉、丑辰未戌，前者化后者为进。 */
const PROGRESS = Object.freeze({ 亥: '子', 寅: '卯', 巳: '午', 申: '酉', 丑: '辰', 辰: '未', 未: '戌', 戌: '丑' });
const GOD_HINTS = Object.freeze({
  青龙: '青龙主喜庆、酒色',
  朱雀: '朱雀主口舌、文书、消息',
  勾陈: '勾陈主迟滞、田土、牵连',
  螣蛇: '螣蛇主虚惊、怪异、反复',
  白虎: '白虎主刚猛、血光、丧服',
  玄武: '玄武主暗昧、盗失、不明',
});

/** other 对 subject 的作用：同我、生我、我生（泄）、我克（耗）、克我。 */
export const relationOf = (subject, other) => {
  if (subject === other) return 'same';
  if (GENERATES[other] === subject) return 'generated';
  if (GENERATES[subject] === other) return 'drained';
  if (CONTROLS[subject] === other) return 'spent';
  return 'controlled';
};

const MONTH_TEXT = { same: '月建比扶', generated: '月建生扶', drained: '月建泄气', spent: '月建耗力', controlled: '月建克制' };
const DAY_TEXT = { same: '日辰比扶', generated: '日辰生扶', drained: '日辰泄气', spent: '日辰耗力', controlled: '日辰克制' };
const RELATION_SCORE = { same: 2, generated: 2, drained: -1, spent: -1, controlled: -2 };

const describeTopic = (topic, gender) => {
  const meta = TOPIC_BY_VALUE[topic] ?? TOPIC_BY_VALUE.general;
  const relative = meta.byGender ? (meta.byGender[gender] ?? null) : meta.relative;
  return { meta, relative, genderMissing: Boolean(meta.byGender) && !meta.byGender[gender] };
};

/** 用神两现：先取动爻，再取空破之爻，再取临世应者，最后取在上者。 */
const pickAmong = (candidates) => {
  const moving = candidates.filter((line) => line.isMoving);
  if (moving.length) return { line: moving[moving.length - 1], reason: '取发动之爻' };
  const marked = candidates.filter((line) => line.marks.some((mark) => mark === '月破' || mark === '旬空'));
  if (marked.length) return { line: marked[marked.length - 1], reason: '取空破之爻（有变化者）' };
  const shiYing = candidates.filter((line) => line.isShi || line.isYing);
  if (shiYing.length) return { line: shiYing[shiYing.length - 1], reason: '取临世应之爻' };
  return { line: candidates[candidates.length - 1], reason: '取在上之爻' };
};

const marksOf = (zhi, time) => {
  const marks = [];
  if (time.xunKong.includes(zhi)) marks.push('旬空');
  if (ZHI_CLASH[time.monthZhi] === zhi) marks.push('月破');
  if (ZHI_CLASH[time.dayZhi] === zhi) marks.push('日冲');
  return marks;
};

/**
 * 一个爻在月建、日辰下的旺衰：返回分数、等级与说明。
 * @param target { zhi, element, isMoving, marks }
 */
export const assessStrength = (target, time) => {
  const monthElement = ZHI_ELEMENT[time.monthZhi];
  const dayElement = ZHI_ELEMENT[time.dayZhi];
  const monthRelation = relationOf(target.element, monthElement);
  const dayRelation = relationOf(target.element, dayElement);
  const marks = target.marks ?? marksOf(target.zhi, time);
  const notes = [];
  let score = 0;

  // 月建
  if (marks.includes('月破')) {
    score -= 3;
    notes.push('月破');
  } else if (target.zhi === time.monthZhi) {
    score += 3;
    notes.push('临月建');
  } else {
    score += RELATION_SCORE[monthRelation];
    notes.push(MONTH_TEXT[monthRelation]);
  }
  if (ZHI_HARMONY[time.monthZhi] === target.zhi) {
    score += target.isMoving ? -1 : 1;
    notes.push(target.isMoving ? '月建合绊' : '月建合起');
  }

  // 日辰
  const monthSupports = marks.includes('月破') ? false : (monthRelation === 'same' || monthRelation === 'generated');
  if (marks.includes('日冲')) {
    if (target.isMoving) {
      score -= 1;
      notes.push('动而逢日冲，力量分散');
    } else if (monthSupports) {
      score += 1;
      notes.push('日辰冲起，静爻暗动');
    } else {
      score -= 2;
      notes.push('休囚又逢日冲，日破');
    }
  } else if (target.zhi === time.dayZhi) {
    score += 3;
    notes.push('临日辰');
  } else {
    score += RELATION_SCORE[dayRelation];
    notes.push(DAY_TEXT[dayRelation]);
  }
  if (ZHI_HARMONY[time.dayZhi] === target.zhi) {
    score += target.isMoving ? -1 : 1;
    notes.push(target.isMoving ? '日辰合住' : '日辰合起');
  }

  // 旬空
  const daySupports = dayRelation === 'same' || dayRelation === 'generated' || target.zhi === time.dayZhi;
  let emptyKind = '';
  if (marks.includes('旬空')) {
    if (marks.includes('月破')) {
      emptyKind = '破空';
      score -= 2;
      notes.push('又逢旬空，破而且空');
    } else if (target.isMoving || marks.includes('日冲') || monthSupports || daySupports) {
      emptyKind = '假空';
      score -= 1;
      notes.push('旬空，但有气（动、冲、生扶），出空即实');
    } else {
      emptyKind = '真空';
      score -= 3;
      notes.push('休囚又旬空，真空无用');
    }
  }

  const level = score >= 2 ? '旺相' : score <= -2 ? '休囚' : '平';
  return { score, level, notes, monthRelation, dayRelation, marks, emptyKind };
};

const lineLabel = (line) => `${line.relative}${line.ganZhi}（${line.positionName}）`;

const changeOf = (line, time) => {
  const changed = line.changed;
  if (!changed) return null;
  const relation = relationOf(line.element, changed.element);
  const changedMarks = marksOf(changed.zhi, time);
  let score;
  let text;
  if (changed.zhi === line.zhi) {
    text = '化伏吟，事情反复难进';
    score = -1;
  } else if (ZHI_CLASH[line.zhi] === changed.zhi) {
    text = '化反吟，反复不定';
    score = -1;
  } else if (relation === 'generated') {
    text = `化${changed.relative}${changed.ganZhi}回头生`;
    score = 2;
  } else if (relation === 'controlled') {
    text = `化${changed.relative}${changed.ganZhi}回头克`;
    score = -3;
  } else if (relation === 'same') {
    if (PROGRESS[line.zhi] === changed.zhi) {
      text = `化${changed.ganZhi}进神，越走越旺`;
      score = 2;
    } else if (PROGRESS[changed.zhi] === line.zhi) {
      text = `化${changed.ganZhi}退神，渐渐退缩`;
      score = -1;
    } else {
      text = `化${changed.ganZhi}比和`;
      score = 1;
    }
  } else if (TOMB[line.element] === changed.zhi) {
    text = `化${changed.ganZhi}入墓，受困难出`;
    score = -2;
  } else if (relation === 'drained') {
    text = `化${changed.relative}${changed.ganZhi}泄气`;
    score = -1;
  } else {
    text = `化${changed.relative}${changed.ganZhi}耗力`;
    score = -1;
  }
  if (changedMarks.includes('旬空')) {
    text += '，变爻旬空';
    score -= 1;
  }
  if (changedMarks.includes('月破')) {
    text += '，变爻月破';
    score -= 1;
  }
  return { score, text, relation };
};

/** 另一动爻对用神的作用。 */
const influenceOf = (line, yong, time) => {
  const relation = relationOf(yong.element, line.element);
  const weak = line.marks.includes('旬空') || line.marks.includes('月破');
  const harmonized = ZHI_HARMONY[line.zhi] === yong.zhi;
  const clashed = ZHI_CLASH[line.zhi] === yong.zhi;
  let score;
  let text;
  if (relation === 'generated') {
    text = `${lineLabel(line)}发动生用神`;
    score = 2;
  } else if (relation === 'controlled') {
    text = `${lineLabel(line)}发动克用神`;
    score = -2;
  } else if (relation === 'same') {
    text = `${lineLabel(line)}发动比扶用神`;
    score = 1;
  } else if (relation === 'drained') {
    text = `${lineLabel(line)}发动，用神生之而泄气`;
    score = -1;
  } else {
    text = `${lineLabel(line)}发动，受用神所克`;
    score = 0;
  }
  if (harmonized) {
    text += yong.isMoving ? '，又合绊用神' : '，又合起用神';
    score += yong.isMoving ? -1 : 1;
  }
  if (clashed) {
    text += '，又冲用神';
    score -= 1;
  }
  const change = changeOf(line, time);
  if (change?.relation === 'controlled' && score !== 0) {
    text += '，但自身化回头克，力量减半';
    score = Math.round(score / 2);
  }
  if (weak && score !== 0) {
    text += `（本身${line.marks.filter((mark) => mark !== '日冲').join('、')}，力量有限）`;
    score = Math.round(score / 2);
  }
  return { score, text };
};

const describeHiddenFlyer = (hiddenItem, flyer) => {
  const relation = relationOf(hiddenItem.element, flyer.element);
  const flyerOpen = flyer.isMoving || flyer.marks.includes('旬空') || flyer.marks.includes('月破') || flyer.marks.includes('日冲');
  const texts = {
    generated: '飞神生伏神，伏神有气',
    controlled: '飞神克伏神，伏神受压',
    same: '飞伏比和',
    drained: '伏神生飞神，泄气',
    spent: '伏神克飞神，可以出伏',
  };
  return {
    score: relation === 'generated' ? 1 : relation === 'controlled' ? -2 : relation === 'spent' ? 0 : -1,
    text: `${texts[relation]}${flyerOpen ? '；飞神动或空破，伏神容易出伏' : '；飞神安静，伏神待日月生扶或冲动飞神时出伏'}`,
  };
};

const timingOf = (yong, strength) => {
  const zhi = yong.zhi;
  const hints = [];
  if (yong.hidden) {
    hints.push(`用神伏藏，常应在${zhi}日（值）、${ZHI_CLASH[yong.flyer.zhi]}日（冲飞神）或飞神空破之时`);
  } else {
    hints.push(`用神临${zhi}，应期常看${zhi}日、${zhi}月（值），或${ZHI_HARMONY[zhi]}日（合）`);
  }
  if (strength.emptyKind && strength.emptyKind !== '破空') hints.push('用神旬空，多应在出空之后，或逢值日、冲日填实');
  if (strength.marks.includes('月破')) hints.push('用神月破，多应在出月之后，或逢合、逢值之日');
  if (!yong.hidden && !yong.isMoving && !strength.marks.includes('日冲')) hints.push(`用神安静，多待${ZHI_CLASH[zhi]}日冲动，或${zhi}日值日`);
  if (yong.isMoving && (strength.notes.includes('日辰合住') || strength.notes.includes('月建合绊'))) hints.push(`用神动而被合，待${ZHI_CLASH[zhi]}日冲开`);
  if (yong.isMoving && !hints.some((hint) => hint.includes('合'))) hints.push('用神发动，事已在进行之中，应期较近');
  return hints.slice(0, 3);
};

const verdictOf = (total, yongHidden) => {
  if (total >= 3) return { level: 'good', title: '偏吉', text: '用神有力，所问之事可成，宜顺势推进。' };
  if (total <= -3) return { level: 'bad', title: '偏弱', text: `用神${yongHidden ? '伏藏又' : ''}受制，所问之事阻力较大，宜缓宜守。` };
  return { level: 'mixed', title: '平', text: '用神平平、吉凶参半，成败看后续变化与应期。' };
};

/**
 * @param reading buildLiuYaoReading 的结果
 * @param {{ topic?: string, gender?: string }} [options] 不传时用 reading 里记录的类别与性别
 */
export const judgeLiuYao = (reading, options = {}) => {
  const topic = options.topic ?? reading.topic ?? 'general';
  const gender = options.gender ?? reading.gender ?? '';
  const { lines, hidden, time, hexagram, changed } = reading;
  const { meta, relative, genderMissing } = describeTopic(topic, gender);
  const shiLine = lines[hexagram.shi - 1];
  const yingLine = lines[hexagram.ying - 1];
  const points = [];
  const notices = [];
  let total = 0;

  // 一、取用神
  let yong = null;
  let yongText = '';
  if (!relative) {
    yong = shiLine;
    yongText = genderMissing
      ? `问感情没有选择问卦人性别，暂以世爻${lineLabel(yong)}为用神（男测取妻财，女测取官鬼）`
      : `${meta.label}以世爻为用神：${lineLabel(yong)}`;
    if (genderMissing) notices.push('问感情请选择问卦人性别，用神才能取准。');
  } else {
    const candidates = lines.filter((line) => line.relative === relative);
    if (candidates.length === 1) {
      yong = candidates[0];
      yongText = `${meta.label}取${relative}为用神：${lineLabel(yong)}`;
    } else if (candidates.length > 1) {
      const picked = pickAmong(candidates);
      yong = picked.line;
      yongText = `${meta.label}取${relative}为用神；${relative}两现，${picked.reason}：${lineLabel(yong)}`;
    } else {
      const hiddenItem = hidden.find((item) => item.relative === relative);
      if (hiddenItem) {
        const flyer = lines[hiddenItem.position - 1];
        yong = { ...hiddenItem, hidden: true, flyer, isMoving: false, marks: marksOf(hiddenItem.zhi, time), isShi: false, isYing: false, god: flyer.god };
        yongText = `${meta.label}取${relative}为用神；${relative}不上卦，伏于${flyer.positionName}${flyer.relative}${flyer.ganZhi}之下：伏神${relative}${hiddenItem.ganZhi}`;
      }
    }
  }
  if (!yong) {
    // 理论上不会出现：六亲不全时伏神必有；留一个兜底。
    yong = shiLine;
    yongText = `找不到${relative}，暂以世爻${lineLabel(yong)}为用神`;
  }
  points.push(yongText);

  // 二、旺衰
  const strength = assessStrength(yong, time);
  total += strength.score;
  points.push(`用神${yong.element}${yong.hidden ? '伏而' : yong.isMoving ? '动而' : '静而'}${strength.level}：${strength.notes.join('，')}`);
  if (yong.hidden) {
    const flyerInfo = describeHiddenFlyer(yong, yong.flyer);
    total += flyerInfo.score;
    points.push(flyerInfo.text);
  }
  if (!yong.hidden && GOD_HINTS[yong.god]) points.push(`用神临${yong.god}：${GOD_HINTS[yong.god]}`);

  // 三、动变
  const dynamics = [];
  if (!yong.hidden && yong.isMoving) {
    const change = changeOf(yong, time);
    if (change) {
      total += change.score;
      dynamics.push(`用神发动，${change.text}`);
    }
  }
  lines
    .filter((line) => line.isMoving && (yong.hidden || line.position !== yong.position))
    .forEach((line) => {
      const influence = influenceOf(line, yong, time);
      total += influence.score;
      dynamics.push(influence.text);
    });
  const changedToYong = relative ? lines.filter((line) => line.changed?.relative === relative && (yong.hidden || line.position !== yong.position)) : [];
  if (changedToYong.length) {
    total += 1;
    dynamics.push(`${changedToYong.map((line) => line.positionName).join('、')}动而化出${relative}，用神有应`);
  }
  if (!dynamics.length) dynamics.push(reading.movingPositions.length ? '动爻与用神无直接生克' : '六爻安静，以用神与世应的旺衰和卦辞断事');
  points.push(...dynamics);

  // 四、世应
  const shiStrength = assessStrength(shiLine, time);
  const shiYingRelation = relationOf(shiLine.element, yingLine.element);
  const shiYingTexts = { generated: '应爻生世，对方或外界有助', controlled: '应爻克世，对方或外界不利于我', same: '世应比和', drained: '世爻生应，我方付出较多', spent: '世克应，我方占主动' };
  let shiYingText = shiYingTexts[shiYingRelation];
  let shiYingScore = { generated: 1, controlled: -1, same: 0, drained: 0, spent: 0 }[shiYingRelation];
  if (ZHI_HARMONY[shiLine.zhi] === yingLine.zhi) {
    shiYingText += '，世应相合，彼此有情';
    shiYingScore += 1;
  } else if (ZHI_CLASH[shiLine.zhi] === yingLine.zhi) {
    shiYingText += '，世应相冲，彼此不合';
    shiYingScore -= 1;
  }
  if (yong !== shiLine) {
    if (!yong.hidden && yong.isShi) {
      total += 1;
      shiYingText = `用神持世，事在自己手里；${shiYingText}`;
    } else if (!yong.hidden && yong.isYing) {
      shiYingText = `用神临应，事由对方或外界决定；${shiYingText}`;
    } else {
      const yongToShi = relationOf(shiLine.element, yong.element);
      if (yongToShi === 'generated' || ZHI_HARMONY[yong.zhi] === shiLine.zhi) {
        total += 1;
        shiYingText = `用神生合世爻，事与我有缘；${shiYingText}`;
      } else if (yongToShi === 'controlled') {
        total -= 1;
        shiYingText = `用神克世，得之亦有压力；${shiYingText}`;
      }
    }
  }
  total += shiYingScore;
  points.push(`世爻${lineLabel(shiLine)}${shiStrength.level}，应爻${lineLabel(yingLine)}：${shiYingText}`);

  // 五、卦象
  const structure = [];
  // 六冲、六合按三对爻的地支算（liuyao.js 的 hexagramRelationOf）：六冲十卦、六合八卦。
  if (hexagram.relation === '六冲') {
    total -= 1;
    structure.push('本卦六冲，事多散、快，难以久长');
  }
  if (hexagram.relation === '六合') {
    total += 1;
    structure.push('本卦六合，事易成但进展缓');
  }
  if (changed) {
    if (changed.relation === '六冲') {
      total -= 1;
      structure.push('变卦六冲，先聚后散');
    }
    if (changed.relation === '六合') {
      total += 1;
      structure.push('变卦六合，终能成局');
    }
  }
  if (hexagram.palaceLabel === '游魂') structure.push('游魂卦：心神不定，有外出、变动之象');
  if (hexagram.palaceLabel === '归魂') structure.push('归魂卦：事归旧处，有回归、安定之象');
  const reverseCount = lines.filter((line) => line.changed && ZHI_CLASH[line.zhi] === line.changed.zhi).length;
  const stillCount = lines.filter((line) => line.changed && line.changed.zhi === line.zhi).length;
  if (reverseCount >= 2) structure.push('多爻反吟，事情反复');
  if (stillCount >= 2) structure.push('多爻伏吟，呻吟难进');
  if (structure.length) points.push(structure.join('；'));

  // 六、倾向与应期
  const verdict = verdictOf(total, Boolean(yong.hidden));
  const timing = timingOf(yong, strength);
  points.push(`倾向：${verdict.title}。${verdict.text}`);
  points.push(`应期：${timing.join('；')}`);

  // 辅助六亲（如求财看兄弟劫财、问病看官鬼子孙）
  const auxiliary = (meta.aux ?? []).map(([auxRelative, meaning]) => {
    const auxLines = lines.filter((line) => line.relative === auxRelative);
    if (!auxLines.length) {
      const item = hidden.find((entry) => entry.relative === auxRelative);
      return item ? `${meaning}看${auxRelative}：不上卦，伏于${item.positionName}下` : `${meaning}看${auxRelative}：不上卦`;
    }
    const line = auxLines.find((entry) => entry.isMoving) ?? auxLines[auxLines.length - 1];
    const auxStrength = assessStrength(line, time);
    return `${meaning}看${auxRelative}：${line.ganZhi}${line.isMoving ? '发动' : '安静'}，${auxStrength.level}（${auxStrength.notes.slice(0, 2).join('，')}）`;
  });

  return {
    topic: meta.value,
    topicLabel: meta.label,
    gender,
    genderMissing,
    yongShen: {
      relative: yong.relative,
      ganZhi: yong.ganZhi,
      zhi: yong.zhi,
      element: yong.element,
      positionName: yong.hidden ? `伏于${yong.flyer.positionName}下` : yong.positionName,
      god: yong.god,
      state: yong.hidden ? '伏' : yong.isMoving ? '动' : '静',
      hidden: Boolean(yong.hidden),
      isShi: Boolean(yong.isShi),
      isYing: Boolean(yong.isYing),
      text: yongText,
    },
    strength,
    dynamics,
    shiYing: shiYingText,
    structure,
    auxiliary,
    verdict,
    timing,
    score: total,
    points,
    notices,
  };
};
