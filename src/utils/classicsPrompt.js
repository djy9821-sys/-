/**
 * 把古籍库的命中条目整理成提示词里的一节（八字、紫微共用）。
 * 只附原文不附白话：让 AI 按原书本义解释，白话由本程序另行标注审核状态，不混进去。
 */

/** 提示词里最多附几条古籍原文：太多会把 AI 的注意力淹掉，也让提示词过长。 */
export const PROMPT_CLASSICS_LIMIT = 6;

const STATUS_TEXT = { reviewed: '已审', translated: '待审' };

/**
 * @param {object[]|null} classics matchEntries 的命中结果（已按相关度排好序）
 * @param {{ subject?: string, limit?: number }} [options] subject 写进「与 X 相关」；limit 最多附几条
 * @returns {string[]|null} 行数组（不含标题）；没有可附的原文时为 null
 */
export const classicsPromptLines = (classics, { subject = '本命', limit = PROMPT_CLASSICS_LIMIT } = {}) => {
  const hits = (classics ?? []).filter((hit) => hit?.entry?.original);
  if (!hits.length) return null;
  const shown = hits.slice(0, limit);
  const lines = shown.map(({ entry, reason }) => {
    const where = `《${entry.book}》${entry.volume ? `·${entry.volume}` : ''}·${entry.section}`;
    // 标题以篇名开头（「论用神配气候得失·其八」）时只留小题，免得出处里篇名写两遍。
    const title = entry.section && String(entry.title).startsWith(`${entry.section}·`) ? String(entry.title).slice(entry.section.length + 1) : entry.title;
    const original = String(entry.original).replace(/\s*\n\s*/g, ' ').trim();
    return `- ${where}「${title}」${reason ? `（匹配：${reason}）` : ''}：${original}`;
  });
  const tail = hits.length > shown.length
    ? `古籍库里与${subject}相关的原文共 ${hits.length} 条，这里只附最相关的 ${shown.length} 条。`
    : '';
  return [
    ...lines,
    `${tail}以上原文取自公版古籍逐字录入（条目状态：${shown.map(({ entry }) => STATUS_TEXT[entry.status] ?? '仅原文').join('、')}）。请以原文本义为据分析，引用时注明书名与篇目；原文与程序初判不一致时，说明差异而不是硬套。`,
  ];
};

/**
 * 带标题的整节文本；没有可附的原文时为 null。
 * @param {object[]|null} classics
 * @param {{ title?: string, subject?: string, limit?: number }} [options]
 */
export const classicsPromptSection = (classics, { title = '【古籍原文（与本命相关）】', ...options } = {}) => {
  const lines = classicsPromptLines(classics, options);
  return lines ? [title, ...lines].join('\n') : null;
};
