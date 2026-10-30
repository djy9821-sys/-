/**
 * 术语白话词典（八字、紫微、六爻通用）：先看与这张盘相关的术语，也可按关键字搜；
 * 每条有一句话解释、展开说明、例子、出处与相关术语。词典数据单独一块按需加载，不进首屏，也不连带下载古籍原文。
 */
import React, { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { lookupTerm, searchGlossary } from '../../data/classics/index.js';
import { useGlossary } from './useClassicsLibrary.js';

const MODULE_LABELS = { bazi: '八字', ziwei: '紫微', liuyao: '六爻', common: '通用' };

const uniqueEntries = (entries) => {
    const seen = new Set();
    return entries.filter((entry) => {
        if (!entry || seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
    });
};

/** 一条术语：标题行常显，说明、例子、出处、相关术语点开看。 */
const TermCard = ({ entry, module, onPick, open = false, testId = 'glossary-term' }) => (
    <details open={open} className="group rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/70" data-testid={testId} data-term={entry.term}>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-2 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2d6b62] sm:p-4 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
                <span className="font-serif text-base font-bold tracking-wide text-[#28231f]">{entry.term}</span>
                {entry.aliases.length > 0 && <span className="ml-1.5 text-[11px] text-[#81776b]">又称 {entry.aliases.join('、')}</span>}
                <span className="mt-0.5 block text-sm leading-6 text-[#3b342e]">{entry.brief}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-[#81776b]">
                {entry.module !== module && <span className="rounded border border-[#cbbfac] px-1 leading-4">{MODULE_LABELS[entry.module] ?? entry.module}</span>}
                <span aria-hidden="true" className="transition group-open:rotate-90">›</span>
            </span>
        </summary>
        <div className="border-t border-[#cbbfac]/60 px-3 pb-3 pt-2.5 sm:px-4">
            <p className="text-sm leading-6 text-[#3b342e]">{entry.explain}</p>
            {entry.example && <p className="mt-2 text-xs leading-5 text-[#6f665d]"><span className="font-bold">例：</span>{entry.example}</p>}
            {entry.sourceText && <p className="mt-1 text-[11px] leading-5 text-[#81776b]">出处：{entry.sourceText}</p>}
            {entry.related.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-[#81776b]">
                    相关：
                    {entry.related.map((term) => (
                        <button key={term} type="button" onClick={() => onPick(term)} className="inline-flex min-h-6 items-center rounded border border-[#315f7d]/30 bg-[#315f7d]/[0.06] px-1.5 text-[11px] leading-5 text-[#2b4f68] hover:border-[#2d6b62] hover:text-[#2d6b62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                            {term}
                        </button>
                    ))}
                </p>
            )}
        </div>
    </details>
);

/**
 * @param {{ module: 'bazi'|'ziwei'|'liuyao', seedTerms?: string[], subject?: string, testId?: string, className?: string }} props
 *   seedTerms：这张盘里出现的术语（十神、格局、星曜……），没有查询时先列出来；subject：提示语里的主语。
 */
export default function GlossaryPanel({ module, seedTerms = [], subject = '这张盘', testId = 'glossary-panel', className = 'mt-4 space-y-3' }) {
    // 词典单独一块，不连带下载古籍原文。
    const { glossary, error } = useGlossary();
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState(null);

    const seeds = useMemo(
        () => (glossary ? uniqueEntries(seedTerms.map((term) => lookupTerm(glossary, term, { module }))) : []),
        [glossary, seedTerms, module],
    );
    const needle = query.trim();
    const results = useMemo(() => (glossary && needle ? searchGlossary(glossary, needle, { module, limit: 30 }) : []), [glossary, needle, module]);
    const pickedEntry = useMemo(() => (glossary && picked ? lookupTerm(glossary, picked, { module }) : null), [glossary, picked, module]);
    // 本模块与通用词典都有的同一条（如「纳音」）只列本模块那条（排序后本模块在前）。
    const browse = useMemo(() => (glossary
        ? uniqueEntries(glossary.entries
            .filter((entry) => entry.module === module || entry.module === 'common')
            .sort((a, b) => (a.module === b.module ? a.term.localeCompare(b.term, 'zh') : a.module === module ? -1 : 1)))
        : []), [glossary, module]);

    const pick = (term) => {
        setPicked(term);
        setQuery('');
    };

    const total = glossary?.total ?? 0;
    const status = glossary
        ? `词典共 ${total} 条，${MODULE_LABELS[module] ?? module}与通用 ${browse.length} 条`
        : error ? '词典加载失败，请刷新后再试。' : '正在打开词典…';

    return (
        <div className={className} data-testid={testId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs leading-5 text-[#655d54]" data-testid={`${testId}-summary`}>{status}</p>
                <label className="relative block w-full sm:w-64">
                    <span className="sr-only">搜索术语</span>
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#9b9185]" aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => { setQuery(event.target.value); setPicked(null); }}
                        placeholder="搜术语，如：用神、化忌、世爻"
                        className="min-h-9 w-full rounded-full border border-[#b9ad98] bg-[#fffaf0]/80 pl-8 pr-3 text-sm text-[#3b342e] placeholder:text-[#9b9185] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]"
                    />
                </label>
            </div>

            {pickedEntry && (
                <div className="space-y-2">
                    <button type="button" onClick={() => setPicked(null)} className="text-xs font-bold text-[#2d6b62] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">‹ 返回</button>
                    <TermCard entry={pickedEntry} module={module} onPick={pick} open />
                </div>
            )}
            {!pickedEntry && picked && glossary && (
                <p className="text-xs text-[#7f4b12]">词典里还没有「{picked}」这一条。</p>
            )}

            {!pickedEntry && needle && glossary && (
                results.length
                    ? results.map((entry) => <TermCard key={entry.id} entry={entry} module={module} onPick={pick} open={results.length === 1} />)
                    : <p className="text-xs text-[#7f4b12]">没有找到包含「{needle}」的术语。</p>
            )}

            {!pickedEntry && !needle && glossary && (
                <>
                    {seeds.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-[#514941]">{subject}里出现的术语</p>
                            {seeds.map((entry) => <TermCard key={entry.id} entry={entry} module={module} onPick={pick} />)}
                        </div>
                    )}
                    {browse.length > 0 && (
                        <details className="rounded-xl border border-[#cbbfac]/75 bg-[#e9dfcd]/45 px-3 py-2.5">
                            <summary className="cursor-pointer text-xs font-bold text-[#514941] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                                浏览全部术语（{browse.length}）
                            </summary>
                            <p className="mt-2 flex flex-wrap gap-1.5" aria-label="全部术语">
                                {browse.map((entry) => (
                                    <button key={entry.id} type="button" onClick={() => pick(entry.term)} className="inline-flex min-h-7 items-center rounded-full border border-[#b9ad98] bg-[#fffaf0]/80 px-2.5 text-xs text-[#5f574f] hover:border-[#2d6b62] hover:text-[#2d6b62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                                        {entry.term}
                                    </button>
                                ))}
                            </p>
                        </details>
                    )}
                </>
            )}

            <div className="rounded-xl border border-[#cbbfac]/75 bg-[#e9dfcd]/45 px-3 py-2.5 text-[11px] leading-5 text-[#655d54]">
                <p className="flex items-center gap-1.5 font-bold text-[#514941]"><BookOpen className="size-3.5" aria-hidden="true" />术语白话由我们自己写</p>
                <p className="mt-0.5">解释只说这个词是什么、程序怎么用它，不替你下吉凶判断；标了出处的，以古籍原文为准。</p>
            </div>
        </div>
    );
}
