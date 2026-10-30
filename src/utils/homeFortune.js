import {
  buildCurrentFortuneContext,
  formatFortuneTime,
} from './fortuneContext.js';
import { createZiweiHoroscope, normalizeLateZiMode } from './ziweiBirth.js';

export const HOME_FORTUNE_PERIODS = Object.freeze([
  Object.freeze({ key: 'hourly', label: '今时运势', icon: '⏰' }),
  Object.freeze({ key: 'daily', label: '今日运势', icon: '☀️' }),
  Object.freeze({ key: 'monthly', label: '今月运势', icon: '🌙' }),
  Object.freeze({ key: 'yearly', label: '今年运势', icon: '📅' }),
]);

const PERIOD_META = new Map(HOME_FORTUNE_PERIODS.map((item) => [item.key, item]));
const MUTAGEN_LABELS = ['禄', '权', '科', '忌'];

const PALACE_KEYWORDS = {
  命宫: ['自我整理', '节奏优先', '审慎选择'],
  兄弟: ['协作', '边界', '坦诚沟通'],
  夫妻: ['关系经营', '倾听', '共同决定'],
  子女: ['创造', '表达', '耐心培育'],
  财帛: ['资源盘点', '量力而行', '长期价值'],
  疾厄: ['身心节奏', '温和照顾', '适度休息'],
  迁移: ['环境适应', '提前准备', '保留弹性'],
  仆役: ['团队协作', '明确分工', '守住边界'],
  官禄: ['聚焦工作', '责任排序', '稳步推进'],
  田宅: ['安定基础', '整理空间', '家庭沟通'],
  福德: ['内在整理', '恢复精力', '活在当下'],
  父母: ['核对信息', '尊重沟通', '留存资料'],
};

const DEFAULT_KEYWORDS = ['观察变化', '整理重点', '稳步行动'];

const DIMENSION_DEFINITIONS = Object.freeze([
  Object.freeze({
    key: 'career',
    label: '事业',
    focusPalaces: Object.freeze(['官禄', '迁移', '仆役', '兄弟']),
    prompt: '先明确一项可验证的重点任务，重要协作把分工与期限说清楚。',
  }),
  Object.freeze({
    key: 'finance',
    label: '财务',
    focusPalaces: Object.freeze(['财帛', '田宅']),
    prompt: '先核对可用资源与必要支出，重大安排以预算和完整信息为准。',
  }),
  Object.freeze({
    key: 'relationships',
    label: '关系',
    focusPalaces: Object.freeze(['夫妻', '兄弟', '仆役', '父母', '子女']),
    prompt: '用具体事实表达需要，也给对方完整回应的空间，避免仓促推测动机。',
  }),
  Object.freeze({
    key: 'wellbeing',
    label: '身心',
    focusPalaces: Object.freeze(['命宫', '疾厄', '福德']),
    prompt: '保留休息、饮食和活动的基本节奏；持续不适时请咨询专业人士。',
  }),
]);

const PALACE_GUIDANCE = {
  命宫: {
    summary: '把注意力放回自身状态、节奏与当前最重要的选择。',
    action: '先确认一件真正重要的事，再安排精力与顺序。',
    caution: '避免因一时情绪给自己下定论，给变化留出余地。',
  },
  兄弟: {
    summary: '同辈关系、协作方式与彼此边界值得多留意。',
    action: '把分工、期待和可提供的帮助说清楚。',
    caution: '避免无谓比较，也不要把默契当成已经沟通。',
  },
  夫妻: {
    summary: '亲密关系与重要合作中的互动质量是当前重点。',
    action: '用具体事实表达需要，并留时间听完对方的想法。',
    caution: '避免猜测对方动机，重要决定宜在信息完整后再定。',
  },
  子女: {
    summary: '创造、表达、陪伴与培育新事物的议题较受关注。',
    action: '把想法推进成一个可见的小成果，再观察反馈。',
    caution: '避免过度控制进度，给人和事情保留成长空间。',
  },
  财帛: {
    summary: '资源分配、收支节奏与价值取舍是当前关注点。',
    action: '先核对必要支出和可用资源，再决定下一步。',
    caution: '避免因短期波动冲动消费或作出超出承受力的承诺。',
  },
  疾厄: {
    summary: '身心能量、作息和日常习惯需要被温和照顾。',
    action: '优先补足休息、饮食与活动；如有不适应咨询专业人士。',
    caution: '命盘提示不是医学结论，不要据此自行诊断或停药。',
  },
  迁移: {
    summary: '外部环境、出行变化与新场域带来的适应是重点。',
    action: '提前确认时间、路线、文件和备用方案。',
    caution: '避免在信息不全时仓促承诺，也留意环境变化。',
  },
  仆役: {
    summary: '团队、人脉、客户与合作网络的互动值得关注。',
    action: '主动对齐目标、交付边界与彼此可承担的部分。',
    caution: '避免为了维持关系过度承诺，关键事项应留有记录。',
  },
  官禄: {
    summary: '工作方向、责任安排与阶段成果是当前重点。',
    action: '先完成最能推动局面的一个交付，再处理次要任务。',
    caution: '避免把所有责任都揽在自己身上，必要时及时协调。',
  },
  田宅: {
    summary: '居住环境、家庭基础与长期安定感值得整理。',
    action: '从一项具体家务、家庭沟通或资料核对开始。',
    caution: '涉及房产与大额安排时，应以合同和专业意见为准。',
  },
  福德: {
    summary: '内在感受、休息质量与长期兴趣是当前关注点。',
    action: '留出一段不被打扰的时间，整理思绪并恢复精力。',
    caution: '避免反复推演尚未发生的事，把注意力带回当下。',
  },
  父母: {
    summary: '长辈、师长、制度与文书沟通方面值得多确认。',
    action: '主动问清要求，重要资料逐项核对并妥善留存。',
    caution: '避免只凭权威或旧经验判断，也要照顾沟通方式。',
  },
};

const DEFAULT_GUIDANCE = {
  summary: '当前适合放慢一步，观察信息、关系与自身节奏。',
  action: '先完成一件范围清楚、可以验证的小事。',
  caution: '命盘用于文化参考与自我观察，不替代专业判断。',
};

const parseBirthDate = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('紫微档案缺少出生日期');
  }

  const match = value.trim().match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!match) {
    throw new Error('出生日期格式无效：请使用 YYYY-MM-DD');
  }

  const [, rawYear, rawMonth, rawDay] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);

  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`出生日期数值无效：${value}`);
  }

  return {
    year,
    month,
    day,
    normalized: `${year}-${month}-${day}`,
  };
};

const assertSolarDate = ({ year, month, day, normalized }) => {
  const candidate = new Date(0);
  candidate.setUTCHours(0, 0, 0, 0);
  candidate.setUTCFullYear(year, month - 1, day);

  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) {
    throw new Error(`公历出生日期无效：${normalized}`);
  }
};

const validateRecord = (record) => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('紫微档案必须是一个对象');
  }
  if (record.type !== 'ziwei') {
    throw new Error(`不支持的档案类型：${record.type || '未填写'}`);
  }

  const calendarType = record.calendarType || 'solar';
  if (!['solar', 'lunar'].includes(calendarType)) {
    throw new Error(`档案日历类型无效：${calendarType}`);
  }

  if (!['male', 'female'].includes(record.gender)) {
    throw new Error('档案性别无效：只支持 male 或 female');
  }

  if (record.timeHour == null || record.timeHour === '') {
    throw new Error('档案缺少出生时辰');
  }
  const rawTimeHour = record.timeHour;
  const timeHour = Number(rawTimeHour);
  if (!Number.isInteger(timeHour) || timeHour < 0 || timeHour > 12) {
    throw new Error('档案出生时辰无效：timeHour 必须为 0 至 12 的整数');
  }

  const parsedDate = parseBirthDate(
    record.birthDate
      || record.solarDate
      || record.data?.birthDate
      || record.data?.solarDate,
  );
  if (calendarType === 'solar') assertSolarDate(parsedDate);

  return {
    calendarType,
    birthDate: parsedDate,
    timeHour,
    gender: record.gender,
    genderLabel: record.gender === 'female' ? '女' : '男',
    isLeapMonth: Boolean(record.isLeapMonth ?? record.isLeap),
    lateZiMode: normalizeLateZiMode(record.data?.lateZi),
  };
};

export const createHoroscopeFromRecord = (record) => {
  const normalized = validateRecord(record);
  const {
    calendarType,
    birthDate,
    timeHour,
    genderLabel,
    isLeapMonth,
    lateZiMode,
  } = normalized;

  try {
    const horoscope = createZiweiHoroscope({
      calendarType,
      birthDate: birthDate.normalized,
      timeIndex: timeHour,
      gender: genderLabel,
      isLeapMonth,
      lateZiMode,
    });

    if (!horoscope || !Array.isArray(horoscope.palaces) || horoscope.palaces.length !== 12) {
      throw new Error('排盘结果缺少十二宫');
    }

    if (calendarType === 'lunar') {
      const actual = horoscope.rawDates?.lunarDate;
      if (
        actual?.lunarYear !== birthDate.year
        || Math.abs(actual?.lunarMonth) !== birthDate.month
        || actual?.lunarDay !== birthDate.day
        || Boolean(actual?.isLeap) !== isLeapMonth
      ) {
        throw new Error(`农历出生日期无效：${birthDate.normalized}`);
      }
    }

    return horoscope;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('农历出生日期无效')) {
      throw error;
    }
    const calendarLabel = calendarType === 'lunar' ? '农历' : '公历';
    const reason = error instanceof Error && error.message ? `：${error.message}` : '';
    throw new Error(`无法重建紫微命盘（${calendarLabel} ${birthDate.normalized}）${reason}`);
  }
};

const getPalaceAt = (horoscope, index, scopeLabel) => {
  if (!Number.isInteger(index) || index < 0 || !horoscope.palaces?.[index]) {
    throw new Error(`当前${scopeLabel}命宫落宫无效`);
  }
  return horoscope.palaces[index];
};

const getStemBranch = (scope) => (
  `${scope?.heavenlyStem || '干'}${scope?.earthlyBranch || '支'}`
);

const buildLifeDimensions = (palaceName) => DIMENSION_DEFINITIONS.map((dimension) => ({
  key: dimension.key,
  label: dimension.label,
  isFocus: dimension.focusPalaces.includes(palaceName),
  prompt: dimension.prompt,
}));

const buildEvidence = ({
  period,
  periodLabel,
  targetScope,
  targetPalace,
  decadalScope,
  decadalPalace,
  mutagens,
  movingStars,
}) => [
  {
    id: 'decadal-palace',
    kind: 'palace',
    layer: 'decadal',
    label: '当前大限落宫',
    value: `${decadalPalace.name || '未知宫位'}（${getStemBranch(decadalScope)}）`,
    source: 'fortune.decadal',
  },
  {
    id: `${period}-palace`,
    kind: 'palace',
    layer: period,
    label: `${periodLabel}落宫`,
    value: `${targetPalace.name || '未知宫位'}（${getStemBranch(targetScope)}）`,
    source: `fortune.${period}`,
  },
  {
    id: `${period}-mutagens`,
    kind: 'mutagen',
    layer: period,
    label: `${periodLabel}四化`,
    value: mutagens.map(({ label, star }) => `${label}→${star}`).join(' · '),
    source: `fortune.${period}.mutagen`,
  },
  {
    id: `${period}-moving-stars`,
    kind: 'moving-stars',
    layer: period,
    label: `${periodLabel}流耀`,
    value: movingStars.length ? movingStars.join('、') : '当前落宫未单独标注流耀',
    source: `fortune.${period}.stars[${targetScope.index}]`,
  },
];

const buildPrivacySafeShareText = ({
  periodMeta,
  keywords,
  summary,
  action,
}) => [
  `${periodMeta.icon} ${periodMeta.label}`,
  `关键词：${keywords.join(' · ')}`,
  `主调：${summary}`,
  `行动提示：${action}`,
  '仅供传统文化参考，不替代医疗、法律或财务专业意见。',
].join('\n');

export const buildHomeFortune = (record, period, now = new Date()) => {
  const periodMeta = PERIOD_META.get(period);
  if (!periodMeta) {
    throw new Error(`不支持的首页运势类型：${period || '未填写'}`);
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('首页运势日期无效');
  }

  const horoscope = createHoroscopeFromRecord(record);
  const context = buildCurrentFortuneContext({
    horoscope,
    basicInfo: { gender: record.gender },
    type: period,
    now,
  });
  const targetScope = context.fortune?.[period];

  if (!targetScope || typeof targetScope !== 'object') {
    throw new Error(`当前${periodMeta.label}缺少运限数据`);
  }

  const targetPalace = getPalaceAt(horoscope, targetScope.index, periodMeta.label);
  const decadalScope = context.fortune?.decadal;
  if (!decadalScope || typeof decadalScope !== 'object') {
    throw new Error('当前大限缺少运限数据');
  }
  const decadalPalace = getPalaceAt(horoscope, decadalScope.index, '大限');
  const guidance = PALACE_GUIDANCE[targetPalace.name] || DEFAULT_GUIDANCE;
  const targetStars = Array.isArray(targetScope.stars?.[targetScope.index])
    ? targetScope.stars[targetScope.index]
    : [];
  const movingStars = [...new Set(
    targetStars
      .map((star) => star?.name)
      .filter((name) => typeof name === 'string' && name.trim()),
  )];
  const nominalAge = Number(context.fortune?.age?.nominalAge);
  const mutagens = MUTAGEN_LABELS.map((label, index) => ({
    label,
    star: targetScope.mutagen?.[index] || '未标注',
  }));
  const keywords = [...(PALACE_KEYWORDS[targetPalace.name] || DEFAULT_KEYWORDS)];
  const lifeDimensions = buildLifeDimensions(targetPalace.name);
  const evidence = buildEvidence({
    period,
    periodLabel: periodMeta.label,
    targetScope,
    targetPalace,
    decadalScope,
    decadalPalace,
    mutagens,
    movingStars,
  });
  const privacySafeShareText = buildPrivacySafeShareText({
    periodMeta,
    keywords,
    summary: guidance.summary,
    action: guidance.action,
  });

  return {
    period,
    periodLabel: periodMeta.label,
    periodIcon: periodMeta.icon,
    profileName: typeof record.name === 'string' && record.name.trim()
      ? record.name.trim()
      : '未命名档案',
    dateLabel: formatFortuneTime(period, context),
    stemBranch: getStemBranch(targetScope),
    palaceName: targetPalace.name || '未知宫位',
    palaceBranch: targetPalace.earthlyBranch || '未知地支',
    decadalPalaceName: decadalPalace.name || '未知宫位',
    nominalAge: Number.isFinite(nominalAge) ? nominalAge : '未知',
    mutagens,
    movingStars,
    keywords,
    lifeDimensions,
    evidence,
    privacySafeShareText,
    summary: guidance.summary,
    action: guidance.action,
    caution: guidance.caution,
    dayBoundaryNote: context.dayBoundaryNote || '',
    record,
  };
};
