/**
 * 古籍原文：按这张盘的格局、十神、神煞、日干月令、季节、合冲刑害，从古籍库里找出相关条目，
 * 原文与白话可切换；每条注明书名篇章、匹配依据与录入状态。数据块按需加载，不进首屏。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { CONDITION_LABELS, STATUS_LABELS, baziContextOf, loadClassicsLibrary, matchEntries } from '../../data/classics/index.js';

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

const PAGE = 8;

/** 原文按 \n 分段显示。 */
const Paragraphs = ({ text, className }) => (
    <>
        {String(text ?? '').split('\n').filter(Boolean).map((line, index) => (
            <p key={index} className={className}>{line}</p>
        ))}
    </>
);

const EntryCard = ({ hit, mode }) => {
    const { entry, matched } = hit;
    const showOriginal = mode !== 'vernacular' || !entry.vernacular;
    const showVernacular = mode !== 'original' && Boolean(entry.vernacular);
    return (
        <article className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/70 p-3 sm:p-4" data-testid="bazi-classic-entry">
            <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h4 className="font-serif text-base font-bold tracking-wide text-[#28231f]">{entry.title}</h4>
                    <p className="mt-0.5 text-[11px] text-[#81776b]">
                        《{entry.book}》{entry.volume ? `·${entry.volume}` : ''}·{entry.section}
                    </p>
                </div>
                <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_CLASS[entry.status] ?? STATUS_CLASS.draft}`} title={entry.status === 'reviewed' ? '主线已核对原文与白话' : entry.status === 'translated' ? '已有白话，待主线核对' : '只录了原文，白话待补'}>
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
            {entry.notes && <p className="mt-2 text-xs leading-5 text-[#6f665d]"><span className="font-bold">注：</span>{entry.notes}</p>}
            {entry.doubts.length > 0 && (
                <p className="mt-1 text-[11px] leading-5 text-[#7f4b12]">
                    <span className="font-bold">存疑：</span>{entry.doubts.join('；')}
                </p>
            )}
        </article>
    );
};

export default function BaziClassicsPanel({ chart, strength, judge, relations }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('vernacular');
    const [shown, setShown] = useState(PAGE);

    useEffect(() => {
        let alive = true;
        loadClassicsLibrary()
            .then((loaded) => { if (alive) setData(loaded); })
            .catch((loadError) => {
                console.error('古籍库加载失败:', loadError);
                if (alive) setError(loadError);
            });
        return () => { alive = false; };
    }, []);

    const ctx = useMemo(() => (chart ? baziContextOf({ chart, strength, judge, relations }) : null), [chart, strength, judge, relations]);
    const hits = useMemo(() => (data?.library && ctx ? matchEntries(data.library, ctx) : []), [data, ctx]);
    useEffect(() => { setShown(PAGE); }, [ctx]);

    const books = data?.library?.books ? Object.values(data.library.books) : [];
    const total = data?.library?.total ?? 0;

    return (
        <div className="mt-4 space-y-3" data-testid="bazi-classics">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs leading-5 text-[#655d54]">
                    {data
                        ? hits.length
                            ? <>与这张盘相关的原文 <b className="text-[#28231f]">{hits.length}</b> 条（库内共 {total} 条）</>
                            : <>古籍库里暂时没有与这张盘直接对应的条目（库内共 {total} 条）</>
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

            {hits.slice(0, shown).map((hit) => <EntryCard key={hit.entry.id} hit={hit} mode={mode} />)}

            {hits.length > shown && (
                <button type="button" onClick={() => setShown((count) => count + PAGE)} className="inline-flex min-h-9 items-center rounded-full border border-[#b9ad98] bg-[#fffaf0]/70 px-4 text-xs font-bold text-[#5f574f] hover:border-[#2d6b62] hover:text-[#2d6b62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                    再看 {Math.min(PAGE, hits.length - shown)} 条（共 {hits.length} 条）
                </button>
            )}

            <div className="rounded-xl border border-[#cbbfac]/75 bg-[#e9dfcd]/45 px-3 py-2.5 text-[11px] leading-5 text-[#655d54]">
                <p className="flex items-center gap-1.5 font-bold text-[#514941]"><BookOpen className="size-3.5" aria-hidden="true" />古籍库在逐篇录入中</p>
                <p className="mt-0.5">
                    {books.length
                        ? <>已收录：{books.map((book) => `《${book.book}》${book.total} 条`).join('、')}。</>
                        : null}
                    原文取公版古籍逐字校对，白话由我们自己翻译并标注状态；「已审」表示主线核对过，「待审」表示已有白话待核，「仅原文」表示白话待补。拿不准的句子写在「存疑」里，不猜。
                </p>
            </div>
        </div>
    );
}
