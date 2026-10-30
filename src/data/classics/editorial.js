/**
 * 古籍条目的「注」「存疑」给读者看的部分。
 *
 * 录入时 notes、doubts 里还记了录入过程（「本批依指定维基文库 API 整条重录」「原录某字，底本作某字」
 * 「旧白话撤下待统一重译」「正文段落 p0475」）与底本页码（「PDF 第278页（CADAL 图页 286）」），
 * 这些是给维护的人核对用的，数据里照留；界面上只显示读者用得上的：术语简释、校勘结论、拿不准的地方。
 * 做法：按句号、分号断句（「」（）里的不断），录入过程的整句不显示，底本页码从句子里删掉，删完只剩标点的也不显示。
 */

/** 录入过程：说的是这批数据怎么录、怎么改（原录、本批、主线、条件怎么编码成 applies），不是书的内容。 */
const WORKFLOW = /本批|本次扫描校正|整条重录|撤下|旧白话|旧版|旧录|跨本校字|段首段尾|待统一重译|核对一致|逐句自译|逐字核对|体例|主线|程序内置|revision|正文段落|API|仅录|不并入|原录|后补「|补入|补回|自检|applies|另补|另加|另推|未添|跨入|页首|页末|notes|写入|编码|程序条件|程序规则|判格规则|程序优先级|程序已|检索|条件键|关系键|机器键|六亲条件|写为.{0,6}条件|校验|接入|映射|十神表|藏干表|程序.{0,2}藏干|另核|任务卡|本次任务|私用区|original\s*仅|在\s*original\s*中/;

const VOLUME = '[一二三四五六七八九十]+';
const NUM = '[\\d一二三四五六七八九十百]+';
/** 页码串：「278」「185—186」「287、288」「77、卷四 78」「十九至二十」。 */
const PAGES = `${NUM}(?:\\s*(?:[—–\\-、至]|、卷${VOLUME})\\s*${NUM})*`;
/** 底本页码：删掉这些片段，句子其余部分照留。 */
const LOCATORS = [
  /据\s*\d{4}\s*年[^，。；]*?扫描本[，,]?\s*/g,
  new RegExp(`(?:底本)?PDF\\s*第?\\s*${PAGES}\\s*页?`, 'g'),
  /（CADAL[^）]*）/g,
  new RegExp(`（(?:卷${VOLUME}|书内第?)\\s*${PAGES}\\s*页）`, 'g'),
  new RegExp(`[，,]?\\s*卷${VOLUME}书内第?\\s*${PAGES}\\s*页`, 'g'),
  new RegExp(`[，,、]?\\s*序?书内(?:卷${VOLUME})?\\s*第?\\s*${PAGES}\\s*页`, 'g'),
  new RegExp(`[，,]?\\s*卷${VOLUME}\\s*${PAGES}(?=[。；]|$)`, 'g'),
  /维基文库本，出处节名「[^」]*」[，,]?\s*/g,
];
/** 删完页码只剩底本名的（「上海世界图书馆《秘本子平真诠》」）也不显示：出处标题里已有书名。 */
const EDITION_ONLY = /^[^。；，]*(?:书局|图书馆|书馆)[^。；，]*《[^》]+》[、，]?[。；]?$/;

/** 按句号、分号断句，「」『』（）里的不断；句末标点留在句子里。 */
export const sentencesOf = (text) => {
  const out = [];
  let depth = 0;
  let current = '';
  for (const char of String(text ?? '')) {
    current += char;
    if ('「『（'.includes(char)) depth += 1;
    else if ('」』）'.includes(char)) depth = Math.max(0, depth - 1);
    else if (depth === 0 && '。；'.includes(char)) {
      if (current.trim()) out.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
};

/**
 * 改录记录：列在「原录」之后的逐条改字（「「X」作「Y」」）、「依底本改遇为逢」「X改为Y」。
 * 读者看到的已是改好的原文，改字过程不必显示；「不擅改为」「未改为」是校勘结论（照录不改），照留。
 */
const isCorrection = (sentence) => /^「[^」]*」作「[^」]*」[；。，]?$/.test(sentence)
  || /依底本改/.test(sentence)
  || (/改为/.test(sentence) && !/[不未][^，。；]*改为/.test(sentence));

/** 一句话给读者看的样子；录入过程或删完页码只剩标点的返回空串。 */
export const readerSentenceOf = (sentence) => {
  if (WORKFLOW.test(sentence) || isCorrection(sentence)) return '';
  let text = LOCATORS.reduce((acc, pattern) => acc.replace(pattern, ''), sentence);
  if (EDITION_ONLY.test(text.trim())) return '';
  text = text
    .replace(/original\s*/g, '原文')
    .replace(/\s*doubts/g, '存疑')
    .replace(/^[\s，、：；。]+/, '')
    .replace(/([，、：])\s*([，、：；。])/g, '$2')
    .trim();
  // 删完页码还带着英文词的（sixRelative、movingLines、health 之类数据字段名），是说条件怎么编码的，也不显示。
  if (/[A-Za-z]{3,}/.test(text)) return '';
  return /[\p{Script=Han}A-Za-z0-9]/u.test(text) ? text : '';
};

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []);
/** 句末的分号、逗号换成句号（几句拼在一起时，末句的分号原是接下一句的）。 */
const closeSentence = (text) => text.replace(/[；，、]$/, '。');

/**
 * @param {{ notes?: string, doubts?: string[]|string }} entry 古籍条目
 * @returns {{ notes: string, doubts: string[] }} notes 拼成一段；doubts 每条一句（去掉句末标点，界面用「；」连）
 */
export const readerNotesOf = (entry) => {
  const notes = sentencesOf(entry?.notes).map(readerSentenceOf).filter(Boolean);
  const doubts = toList(entry?.doubts).flatMap(sentencesOf).map(readerSentenceOf).filter(Boolean)
    .map((text) => text.replace(/[；，、。]$/, ''));
  return {
    notes: notes.length ? closeSentence(notes.join('')) : '',
    doubts: [...new Set(doubts)],
  };
};
