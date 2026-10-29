/**
 * 六亲宫星（程序初判）：配偶、子女、父母、兄弟各看六亲星与宫位的喜忌、透藏与冲合；
 * 古籍库里讲这一亲的条目（applies 写了 liuqin 的）折叠列在每张卡下面。
 */
import React from 'react';
import { ClassicsEntryCard } from '../common/ClassicsPanel';
import { WUXING_STYLES } from './baziTheme';

const TONE_BADGE = {
    good: { className: 'bg-[#2d6b62] text-white', label: '喜' },
    bad: { className: 'bg-[#a33b30] text-white', label: '忌' },
    neutral: { className: 'bg-[#8a8074] text-white', label: '平' },
};

const ToneBadge = ({ tone }) => {
    const badge = TONE_BADGE[tone] ?? TONE_BADGE.neutral;
    return <span className={`inline-flex shrink-0 rounded px-1 text-[10px] font-bold leading-4 ${badge.className}`}>{badge.label}</span>;
};

const StarLine = ({ star }) => (
    <li className="flex items-start gap-1.5 text-xs leading-5 text-[#514941]">
        {star.places.length ? <ToneBadge tone={star.tone} /> : <span className="inline-flex shrink-0 rounded border border-[#b9ad98] px-1 text-[10px] leading-4 text-[#81776b]">无</span>}
        <span>
            <b className="text-[#3b342e]">{star.label}</b>
            <b className={`mx-0.5 font-serif ${WUXING_STYLES[star.element]?.text ?? ''}`}>{star.element}</b>
            <span className="text-[11px] text-[#81776b]">（{star.note}）</span>
            {star.places.length ? (
                <>
                    {star.places.some((place) => place.part === '干') && <>：透{star.places.filter((place) => place.part === '干').map((place) => place.text).join('、')}</>}
                    {star.places.some((place) => place.part === '支') && <>{star.places.some((place) => place.part === '干') ? '，' : '：'}藏{star.places.filter((place) => place.part === '支').map((place) => place.text).join('、')}</>}
                    {star.he.length > 0 && <span className="block text-[11px] text-[#7f4b12]">{star.he.join('；')}</span>}
                </>
            ) : '：四柱不见'}
        </span>
    </li>
);

const PalaceLine = ({ palace }) => (
    <li className="flex items-start gap-1.5 text-xs leading-5 text-[#514941]">
        {palace.missing ? <span className="inline-flex shrink-0 rounded border border-[#b9ad98] px-1 text-[10px] leading-4 text-[#81776b]">缺</span> : <ToneBadge tone={palace.tone} />}
        <span>
            <b className="text-[#3b342e]">{palace.label}</b>
            {palace.missing ? '：时辰不详，不论' : (
                <>
                    ：<b className={`font-serif ${WUXING_STYLES[palace.element]?.text ?? ''}`}>{palace.zhi}</b>，本气{palace.shiShen}
                    {palace.relations.length > 0 && (
                        <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
                            {palace.relations.map((title) => (
                                <span key={title} className={`rounded border px-1 text-[10px] leading-4 ${/冲|反吟/.test(title) ? 'border-[#a33b30]/40 text-[#8f3027]' : 'border-[#b9ad98] text-[#6f665d]'}`}>{title}</span>
                            ))}
                        </span>
                    )}
                </>
            )}
        </span>
    </li>
);

/** 古籍库里讲这一亲的条目：默认收起，原文与白话对照。 */
const LiuqinClassics = ({ kind, hits }) => {
    if (!hits?.length) return null;
    return (
        <details className="group mt-2 rounded-lg border border-[#cbbfac]/70 bg-[#f4ecdc]/50" data-testid="bazi-liuqin-classics">
            <summary className="cursor-pointer select-none px-2.5 py-1.5 text-xs font-bold text-[#7f4b12] marker:text-[#b06a1f]">
                古籍论{kind}（{hits.length} 条）
            </summary>
            <div className="space-y-2 px-2 pb-2">
                {hits.map((hit) => <ClassicsEntryCard key={hit.entry.id} hit={hit} mode="both" testId="bazi-liuqin-classic-entry" />)}
            </div>
        </details>
    );
};

export default function BaziLiuqinPanel({ liuqin, classics = null }) {
    if (!liuqin) return null;
    return (
        <div className="mt-4 space-y-3" data-testid="bazi-liuqin">
            <ul className="grid gap-2.5 sm:grid-cols-2">
                {liuqin.items.map((item) => (
                    <li key={item.key} className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 p-3">
                        <p className="flex items-baseline gap-2">
                            <strong className="shrink-0 whitespace-nowrap font-serif text-lg font-bold tracking-wide text-[#3b342e]">{item.title}</strong>
                            <span className="text-xs leading-5 text-[#514941]">{item.verdict}</span>
                        </p>
                        <ul className="mt-2 space-y-1">
                            {item.stars.map((star) => <StarLine key={star.label} star={star} />)}
                            {item.palaces.map((palace) => <PalaceLine key={palace.key} palace={palace} />)}
                        </ul>
                        <p className="mt-2 border-t border-[#cbbfac]/60 pt-1.5 text-[11px] leading-5 text-[#81776b]">
                            {item.classic.source}：「{item.classic.text}」
                        </p>
                        <LiuqinClassics kind={item.kind} hits={classics?.[item.key]} />
                    </li>
                ))}
            </ul>
            <p className="rounded-lg bg-[#e9dfcd]/55 px-3 py-2 text-[11px] leading-5 text-[#6f665d] sm:text-xs">
                {`${liuqin.basis}宫位按《子平真诠》「年月日时，自上而下」，六亲星按「正印为母、偏财为父、财为妻、官杀为子女、比肩为兄弟」，女命以官杀为夫、食伤为子女。这里只列星宫的喜忌、透藏与冲合，具体人事还要看岁运引动，并结合实际情况判断。`}
            </p>
        </div>
    );
}
