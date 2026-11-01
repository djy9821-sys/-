/**
 * 古籍原文面板（八字、紫微、六爻通用）：给一个匹配上下文 ctx，从古籍库里找出相关条目，
 * 原文与白话可切换；每条注明书名篇章、匹配依据与录入状态。数据块按需加载，不进首屏。
 *
 * 各模块只负责算 ctx（baziContextOf / ziweiContextOf / liuyaoContextOf），界面在这里统一。
 */
import React, { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { CONDITION_LABELS, STATUS_LABELS, matchEntries } from '../../data/classics/index.js';
import { useClassicsLibrary } from './useClassicsLibrary.js';

const MODES = [
    ['vernacular', '白话'],
    ['original', '原文'],
    ['both', '对照'],
];

const STATUS_CLASS = {
    reviewed: 'border-[#2d6b62]/35 bg-[#2d6b62]/[0.07] text-[#245a52]',
    translated: 'border-[#b06a1f]/40 bg-[#b06a1f]/[0.08] text-[#7f4b12]',
    draft: 'border-[#cbbfac] bg-[#fffaf0]/70 text-[#6f665d]',
};

const STATUS_TITLE = {
    reviewed: '主线已核对原文与白话',
    translated: '已有白话，待主线核对',
    draft: '只录了原文，白话待补',
};

const PAGE = 8;

/** 原文按 \n 分段显示。 */
const Paragraphs = ({ text, className }) => (
    <>
        {String(text ?? '').split('\n').filter(Boolean).map((line, index) => (
            <p key={index} className={className}>{line}</p>
        ))}
    </>
);

export const ClassicsEntryCard = ({ hit, mode, testId = 'classic-entry' }) => {
    const { entry, matched } = hit;
    const showOriginal = mode !== 'vernacular' || !entry.vernacular;
    const showVernacular = mode !== 'original' && Boolean(entry.vernacular);
    return (
        <article className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/70 p-3 sm:p-4" data-testid={testId}>
            <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h4 className="font-serif text-base font-bold tracking-wide text-[#28231f]">{entry.title}</h4>
                    <p className="mt-0.5 text-[11px] text-[#81776b]">
                        《{entry.book}》{entry.volume ? `·${entry.volume}` : ''}·{entry.section}
                    </p>
                </div>
                <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_CLASS[entry.status] ?? STATUS_CLASS.draft}`} title={STATUS_TITLE[entry.status] ?? STATUS_TITLE.draft}>
                    {STATUS_LABELS[entry.status] ?? entry.status}
                </span>
            </header>
            <p className="mt-1.5 flex flex-wrap gap-1" aria-label="匹配依据">
                {matched.map(({ key, value }) => (
                    <span key={`${key}-${value}`} className="inline-flex items-center rounded border border-[#315f7d]/30 bg-[#315f7d]/[0.06] px-1.5 text-[11px] leading-5 text-[#2b4f68]">
                        {CONDITION_LABELS[key] ?? key}·{value}
                    </span>
                ))}
            </p>
            {showOriginal && (
                <div className={`mt-2.5 ${showVernacular ? 'border-l-2 border-[#a33b30]/30 pl-3' : ''}`}>
                    {showVernacular && <p className="text-[11px] font-bold text-[#96372e]">原文</p>}
                    <Paragraphs text={entry.original} className="font-serif text-sm leading-7 text-[#3b342e]" />
                </div>
            )}
            {showVernacular && (
                <div className={`mt-2.5 ${showOriginal ? 'border-l-2 border-[#2d6b62]/30 pl-3' : ''}`}>
                    {showOriginal && <p className="text-[11px] font-bold text-[#245a52]">白话</p>}
                    <Paragraphs text={entry.vernacular} className="text-sm leading-6 text-[#3b342e]" />
                </div>
            )}
            {!entry.vernacular && mode === 'vernacular' && <p className="mt-1.5 text-[11px] text-[#9b9185]">这条还没有白话，先看原文。</p>}
            {entry.readerNotes && <p className="mt-2 text-xs leading-5 text-[#6f665d]"><span className="font-bold">注：</span>{entry.readerNotes}</p>}
            {entry.readerDoubts?.length > 0 && (
                <p className="mt-1 text-[11px] leading-5 text-[#7f4b12]">
                    <span className="font-bold">存疑：</span>{entry.readerDoubts.join('；')}。
                </p>
            )}
        </article>
    );
};

/**
 * @param {{ ctx: object|null, subject?: string, testId?: string, entryTestId?: string, className?: string }} props
 *   ctx：匹配上下文（为 null 时只显示库的说明）；subject：提示语里的主语，如「这张盘」「这个宫」。
 */
export default function ClassicsPanel({ ctx, subject = '这张盘', testId = 'classics-panel', entryTestId = 'classic-entry', className = 'mt-4 space-y-3' }) {
    // 只下这个模块（八字 / 紫微 / 六爻）的古籍块；还没有上下文时先不加载。
    const { data, error } = useClassicsLibrary(ctx?.module ?? null, { enabled: Boolean(ctx?.module) });
    const [mode, setMode] = useState('vernacular');
    // 「再看几条」的计数跟着上下文走：换了一张盘 / 一个宫就回到第一页，不用 effect 重置。
    const [paging, setPaging] = useState({ ctx: null, count: PAGE });

    const hits = useMemo(() => (data?.library && ctx ? matchEntries(data.library, ctx) : []), [data, ctx]);
    const shown = paging.ctx === ctx ? paging.count : PAGE;

    const books = data?.library?.books ? Object.values(data.library.books) : [];
    const total = data?.library?.total ?? 0;

    return (
        <div className={className} data-testid={testId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs leading-5 text-[#655d54]" data-testid={`${testId}-summary`}>
                    {data
                        ? hits.length
                            ? <>与{subject}相关的原文 <b className="text-[#28231f]">{hits.length}</b> 条（库内共 {total} 条）</>
                            : <>古籍库里暂时没有与{subject}直接对应的条目（库内共 {total} 条）</>
                        : error ? '古籍库加载失败，请刷新后再试。' : '正在打开古籍库…'}
                </p>
                <div className="inline-flex rounded-full border border-[#b9ad98] bg-[#fffaf0]/70 p-0.5" role="group" aria-label="原文与白话">
                    {MODES.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setMode(key)}
                            aria-pressed={mode === key}
                            className={`min-h-8 rounded-full px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${mode === key ? 'bg-[#2d6b62] text-white' : 'text-[#5f574f] hover:text-[#2d6b62]'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {hits.slice(0, shown).map((hit) => <ClassicsEntryCard key={hit.entry.id} hit={hit} mode={mode} testId={entryTestId} />)}

            {hits.length > shown && (
                <button type="button" onClick={() => setPaging({ ctx, count: shown + PAGE })} className="inline-flex min-h-9 items-center rounded-full border border-[#b9ad98] bg-[#fffaf0]/70 px-4 text-xs font-bold text-[#5f574f] hover:border-[#2d6b62] hover:text-[#2d6b62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                    再看 {Math.min(PAGE, hits.length - shown)} 条（共 {hits.length} 条）
                </button>
            )}

            <div className="rounded-xl border border-[#cbbfac]/75 bg-[#e9dfcd]/45 px-3 py-2.5 text-[11px] leading-5 text-[#655d54]">
                <p className="flex items-center gap-1.5 font-bold text-[#514941]"><BookOpen className="size-3.5" aria-hidden="true" />古籍库在逐篇录入中</p>
                <p className="mt-0.5">
                    {books.length
                        ? <>已收录：{books.map((book) => `《${book.book}》${book.total} 条`).join('、')}。</>
                        : null}
                    原文取公版古籍，与底本逐段比对；白话由我们自己逐句翻译，「白话已校」表示主线逐句核对过，「白话初稿」表示已有白话、还在核对，「仅原文」表示白话待补。拿不准的句子写在「存疑」里，不猜。
                </p>
            </div>
        </div>
    );
}
