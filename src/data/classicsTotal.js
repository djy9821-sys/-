/**
 * 藏经阁现有几部书、多少篇、多少条。
 * 构建时按古籍数据现算（见 scripts/lib/classicsCatalog.mjs）；首页和封面只要这三个数，不必带上整份目录。
 */
import total from 'virtual:classics-total';

export const CLASSICS_TOTAL = Object.freeze({ ...total });

/** 形如「7 部 · 372 篇 · 2,808 条」。 */
export const CLASSICS_TOTAL_LINE = `${total.books} 部 · ${total.chapters} 篇 · ${String(total.entries).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 条`;
