/**
 * 六爻古籍占例自检：拿原文里写明的卦与动爻、爻的地支六亲，核对条目的 applies。
 *   node scripts/check-zhanli.mjs            # 检查全部六爻古籍
 *   node scripts/check-zhanli.mjs zhanfa-2   # 只看文件名含 zhanfa-2 的
 *
 * 查三类问题（都按原文，不按程序断法）：
 * 1. 卦：原文「得X之Y」「得X变Y」「得X卦」里的本卦，applies 的 hexagram 必须是其中之一；
 * 2. 动爻：有之卦时，applies 的 line 必须正好是本卦与之卦不同的那几爻（「得X卦」只核卦名，不核动爻）；
 * 3. 地支六亲：原文「申金子动」「卯木父动」「酉父化子」一类说法，按 applies 的卦装出来，
 *    该地支所临的六亲要对得上（本卦、变出之爻、伏神任一处对上即可），说「动」的要真是动爻。
 *
 * 原书偶有图文不合、排印错误，确认后写进条目的 doubts 并在其中写明「自检」二字，本脚本就只提示不报错。
 * 有报错时以非零码退出；支线推送占例前应跑一遍。
 */
import { pathToFileURL } from 'node:url';

import { buildLiuYaoReading } from '../src/utils/liuyao.js';
import { HEXAGRAM_MAP } from '../src/utils/hexagramLogic.js';
import { loadDataFiles } from './lib/dataFiles.mjs';

const BITS = Object.fromEntries(Object.entries(HEXAGRAM_MAP).map(([key, hexagram]) => [hexagram.name, [...key].reverse().map(Number)]));
// 简称：八纯卦取首字（乾、坤……），其余去掉上下卦象两字（临、大壮、既济……）
const SHORT = Object.fromEntries(Object.keys(BITS).map((name) => [name.includes('为') ? name[0] : name.slice(2), name]));
const NAMES = [...Object.keys(BITS), ...Object.keys(SHORT)].sort((a, b) => b.length - a.length);
const fullName = (name) => (BITS[name] ? name : SHORT[name]);
const toArray = (value) => (value == null ? [] : Array.isArray(value) ? value : [value]);

const nameAt = (text, index) => NAMES.find((name) => text.startsWith(name, index)) ?? null;

/** 原文里「得X之Y」「得X变Y」「得X卦」三种写法的卦，按出现先后。 */
export const castsOf = (text) => {
  const casts = [];
  for (let i = text.indexOf('得'); i >= 0; i = text.indexOf('得', i + 1)) {
    const from = nameAt(text, i + 1);
    if (!from) continue;
    let j = i + 1 + from.length;
    if (text[j] === '卦') j += 1;
    if (text[j] === '之' || text[j] === '变') {
      const to = nameAt(text, j + 1);
      // 「之」后若不是卦名（如「得震之象」），只记本卦
      if (to) {
        casts.push({ from: fullName(from), to: fullName(to) });
        continue;
      }
    }
    // 「得X卦」「得X」后面不跟卦名的，只核本卦；紧跟「不动」「安静」的记为静卦
    const tail = text.slice(j, j + 6);
    if (text[i + 1 + from.length] === '卦' || /^[，。、；]/.test(tail) || /^(卦)?[，]?(六爻)?(不动|安静)/.test(tail)) {
      casts.push({ from: fullName(from), to: null, still: /^(卦)?[，]?(六爻)?(不动|安静)/.test(tail) });
    }
  }
  return casts;
};

const movingLinesOf = (from, to) => BITS[from].map((bit, i) => (bit !== BITS[to][i] ? i + 1 : 0)).filter(Boolean);

const RELATIVE = { 父母: '父母', 父: '父母', 子孙: '子孙', 子: '子孙', 孙: '子孙', 妻财: '妻财', 财: '妻财', 官鬼: '官鬼', 鬼: '官鬼', 官: '官鬼', 兄弟: '兄弟', 兄: '兄弟' };
const MENTION = /([子丑寅卯辰巳午未申酉戌亥])([金木水火土])?(父母|子孙|妻财|官鬼|兄弟|父|子|孙|财|鬼|官|兄)(爻)?(独发|发动|暗动|动|化|持世)?/g;
const ZHI_ELEMENT = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };

/** 原文「申金子动」一类的地支六亲说法。没有五行字时，「子」「孙」开头的不算（免得把「子孙」拆成地支子加孙）。 */
export const mentionsOf = (text) => [...text.matchAll(MENTION)]
  .filter((match) => {
    const [whole, zhi, element, relative] = match;
    if (element && ZHI_ELEMENT[zhi] !== element) return false;
    if (!element && (zhi === '子' || relative === '子' || relative === '孙')) return false;
    // 「寅木子水相生」的「子」是地支：单字「子」后面紧跟五行或地支时不算子孙
    const next = text[match.index + whole.length] ?? '';
    return !(relative === '子' && whole.endsWith('子') && /[金木水火土子丑寅卯辰巳午未申酉戌亥]/.test(next));
  })
  .map(([text_, zhi, , relative, , verb]) => ({ text: text_, zhi, relative: RELATIVE[relative], moving: verb === '动' || verb === '发动' || verb === '独发' || verb === '化' }));

const readingOf = (hexagram, lines) => {
  const values = BITS[hexagram].map((bit, i) => (lines.includes(i + 1) ? (bit ? 9 : 6) : (bit ? 7 : 8)));
  return buildLiuYaoReading(values, new Date(2026, 0, 15, 12, 0));
};

/** 检查一条占例，返回 { errors, warnings }。 */
export const checkZhanli = (entry) => {
  const errors = [];
  const warnings = [];
  const text = String(entry.original ?? '');
  const casts = castsOf(text);
  const applies = toArray(entry.applies).filter((item) => item?.module === 'liuyao' && item.hexagram);
  const documented = toArray(entry.doubts).some((doubt) => String(doubt).includes('自检'));
  const report = (message) => (documented ? warnings : errors).push(message);

  // 同一卦拆成几条 applies（每条一个动爻）时合起来核对
  const byHexagram = new Map();
  applies.forEach((item) => {
    const hexagram = toArray(item.hexagram)[0];
    const lines = byHexagram.get(hexagram) ?? new Set();
    toArray(item.line).forEach((line) => lines.add(Number(line)));
    byHexagram.set(hexagram, lines);
  });
  // 原文接连几占、后几卦只画在卦图上时，applies 的卦可能不在正文里：只提示
  const recast = /又占|再占|复占|又得|又叫|又令|次日又|连占/.test(text);
  byHexagram.forEach((lineSet, hexagram) => {
    if (!BITS[hexagram]) {
      errors.push(`applies 的卦名「${hexagram}」不在六十四卦里`);
      return;
    }
    const lines = [...lineSet].sort((a, b) => a - b);
    if (casts.length) {
      const cast = casts.find((candidate) => candidate.from === hexagram);
      if (!cast) {
        (recast || documented ? warnings : errors).push(`applies 的卦是「${hexagram}」，原文得的是${casts.map((c) => `「${c.from}${c.to ? `之${c.to}` : ''}」`).join('、')}${recast ? '（原文有再占，可能出自卦图）' : ''}`);
      } else if (cast.to) {
        const expected = movingLinesOf(cast.from, cast.to);
        if (expected.join() !== lines.join()) {
          report(`原文「${cast.from}之${cast.to}」动爻应为 [${expected.join(',')}]，applies 写的是 [${lines.join(',')}]`);
        }
      } else if (cast.still && lines.length) {
        report(`原文「${cast.from}」六爻安静，applies 却写了动爻 [${lines.join(',')}]`);
      }
    }
  });

  // 地支六亲：applies 各卦与原文各占的卦，本卦、变出之爻、伏神任一处对上即可
  const readings = [
    ...[...byHexagram].filter(([hexagram]) => BITS[hexagram]).map(([hexagram, lineSet]) => ({ hexagram, reading: readingOf(hexagram, [...lineSet]) })),
    ...casts.filter((cast) => BITS[cast.from] && !byHexagram.has(cast.from)).map((cast) => ({ hexagram: cast.from, reading: readingOf(cast.from, cast.to ? movingLinesOf(cast.from, cast.to) : []) })),
  ];
  const seen = new Set();
  mentionsOf(text).forEach((mention) => {
    if (seen.has(mention.text)) return;
    seen.add(mention.text);
    const holders = readings.flatMap(({ hexagram, reading }) => [
      ...reading.lines.map((line) => ({ ...line, where: `${hexagram}本卦` })),
      ...reading.lines.filter((line) => line.changed).map((line) => ({ ...line.changed, where: `${hexagram}变出`, isMoving: false, changedLine: true })),
      ...reading.hidden.map((line) => ({ ...line, where: `${hexagram}伏神`, isMoving: false })),
    ]).filter((line) => line.zhi === mention.zhi);
    if (!holders.length) return; // 卦里没有这个地支：多半说的是日月或别的卦，不管
    if (!holders.some((line) => line.relative === mention.relative)) {
      (recast || documented ? warnings : errors).push(`原文「${mention.text}」：${mention.zhi}在${[...new Set(holders.map((line) => `${line.where}是${line.relative}`))].join('、')}，不是${mention.relative}`);
    } else if (mention.moving && !holders.some((line) => line.relative === mention.relative && (line.isMoving || line.changedLine))) {
      warnings.push(`原文「${mention.text}」说动，但卦里${mention.zhi}${mention.relative}不是动爻`);
    }
  });
  return { errors, warnings };
};

const run = () => {
  const filter = process.argv[2] ?? '';
  const files = loadDataFiles().classics.filter(({ file }) => file.includes('/liuyao/') && file.includes(filter));
  let checked = 0;
  let errorCount = 0;
  let warningCount = 0;
  files.forEach(({ file, doc }) => {
    (doc.entries ?? []).filter((entry) => String(entry.title ?? '').startsWith('占例')).forEach((entry) => {
      checked += 1;
      const { errors, warnings } = checkZhanli(entry);
      if (!errors.length && !warnings.length) return;
      console.log(`${entry.id}（${file.split('/').at(-1)}）${entry.title}`);
      errors.forEach((message) => console.log(`  ✗ ${message}`));
      warnings.forEach((message) => console.log(`  · ${message}`));
      errorCount += errors.length;
      warningCount += warnings.length;
    });
  });
  console.log(`\n核对占例 ${checked} 条：错误 ${errorCount} 处，提示 ${warningCount} 处。`);
  if (errorCount) process.exit(1);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
