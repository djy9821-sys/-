/**
 * 格局与命局特点（程序初判）：取格依据、疑似特殊格局、常见组合、十神力量与五行缺失。
 */
import React from 'react';
import { WUXING_STYLES } from './baziTheme';

const TRAIT_TONE = {
    good: { chip: 'border-[#2d6b62]/35 bg-[#2d6b62]/[0.07]', badge: 'bg-[#2d6b62] text-white', label: '利' },
    caution: { chip: 'border-[#b06a1f]/40 bg-[#b06a1f]/[0.08]', badge: 'bg-[#b06a1f] text-white', label: '留意' },
    neutral: { chip: 'border-[#cbbfac]/80 bg-[#fffaf0]/70', badge: 'bg-[#8a8074] text-white', label: '参考' },
};

const VERDICT_STYLE = {
    成: 'bg-[#2d6b62] text-white',
    败: 'bg-[#a33b30] text-white',
    成中有败: 'bg-[#b06a1f] text-white',
    败中有成: 'bg-[#315f7d] text-white',
    待详辨: 'bg-[#8a8074] text-white',
};

const ROLE_ORDER = ['比劫', '印', '食伤', '财', '官杀'];

const GodChip = ({ item, tone }) => (
    <span className={`inline-flex items-baseline gap-1 rounded-md border px-1.5 py-0.5 ${tone === 'good' ? 'border-[#2d6b62]/35 bg-[#2d6b62]/[0.07]' : 'border-[#a33b30]/30 bg-[#a33b30]/[0.06]'}`}>
        <b className={`font-serif text-sm ${WUXING_STYLES[item.element]?.text ?? ''}`}>{item.element}</b>
        <span className="text-[11px] text-[#6f665d]">{item.label}</span>
    </span>
);
const ROLE_CLASS = { 比劫: 'bg-[#a33b30]/70', 印: 'bg-[#2d6b62]/70', 食伤: 'bg-[#b06a1f]/70', 财: 'bg-[#9a7119]/70', 官杀: 'bg-[#315f7d]/70' };

export default function BaziPatternPanel({ judge }) {
    if (!judge) return null;
    const { pattern, chengBai, special, traits, absent, wuxingGap, roleShare, timeUnknown } = judge;

    return (
        <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#3b342e]">取格</p>
                    {pattern && <span className="rounded-full bg-[#a33b30] px-3 py-1 font-serif text-sm font-bold tracking-wider text-white">{pattern.name}</span>}
                </div>
                {pattern && <p className="mt-2 text-xs leading-5 text-[#514941]">{pattern.basis}</p>}
                {chengBai && (
                    <div className="mt-3 rounded-lg border border-[#cbbfac]/80 bg-[#fffaf0]/80 px-3 py-2">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#3b342e]">
                            成败
                            <span className={`inline-flex rounded px-1.5 py-0.5 font-serif text-xs font-bold tracking-wide ${VERDICT_STYLE[chengBai.verdict] ?? VERDICT_STYLE.待详辨}`}>{pattern.name}{chengBai.verdict}</span>
                            <span className="text-[11px] font-normal text-[#81776b]">按{chengBai.source}</span>
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#514941]">{chengBai.summary}</p>
                        <details className="mt-1.5 text-[11px] leading-5 text-[#6f665d]">
                            <summary className="cursor-pointer font-bold text-[#514941]">原文</summary>
                            <p className="mt-1">成：{chengBai.quotes.成}</p>
                            <p>败：{chengBai.quotes.败}</p>
                            <p className="mt-1 text-[#9b9185]">「见」「逢」「透」按天干透出判断，「刑冲会合」看月支与其余地支；原书未提的条件不判，标「待详辨」。</p>
                        </details>
                    </div>
                )}
                {special && (
                    <div className="mt-3 rounded-lg border border-[#b06a1f]/35 bg-[#b06a1f]/[0.07] px-3 py-2" data-testid="bazi-special-pattern">
                        <p className="text-sm font-bold text-[#7f4b12]">{special.name}</p>
                        <p className="mt-1 text-xs leading-5 text-[#5c4a2c]">{special.basis}</p>
                        <p className="mt-1 text-xs leading-5 text-[#7f4b12]">{special.note}</p>
                        {special.favorable?.length > 0 && (
                            <div className="mt-2 border-t border-[#b06a1f]/20 pt-2" data-testid="bazi-special-gods">
                                <p className="text-xs font-bold text-[#5c4a2c]">若按此格论</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="font-bold text-[#245a52]">喜</span>
                                    {special.favorable.map((item) => <GodChip key={`good-${item.element}`} item={item} tone="good" />)}
                                    <span className="ml-1 font-bold text-[#8f3027]">忌</span>
                                    {special.unfavorable.map((item) => <GodChip key={`bad-${item.element}`} item={item} tone="bad" />)}
                                </div>
                                <p className="mt-1.5 text-[11px] leading-5 text-[#6f665d]">{special.godsBasis}。这与「五行与旺衰」一节按扶抑取的喜忌不同，真从、真化才用这一套，请人工确认。</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div>
                <p className="text-xs font-bold text-[#514941]">十神力量（按五行力量折算）</p>
                <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-[#d9cfbf] ring-1 ring-[#c5b9a6]" role="img" aria-label={ROLE_ORDER.map((role) => `${role}${Math.round(roleShare[role])}%`).join('，')}>
                    {ROLE_ORDER.map((role) => (roleShare[role] > 0
                        ? <span key={role} className={ROLE_CLASS[role]} style={{ width: `${roleShare[role]}%` }} aria-hidden="true" />
                        : null))}
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1.5 text-center sm:gap-3">
                    {ROLE_ORDER.map((role) => (
                        <div key={role} className="rounded-lg border border-[#cbbfac]/80 bg-[#fffaf0]/70 px-1 py-1.5">
                            <span className="block text-[11px] text-[#81776b]">{role}</span>
                            <span className="block text-sm font-semibold tabular-nums text-[#38312b] sm:text-base">{Math.round(roleShare[role])}%</span>
                        </div>
                    ))}
                </div>
                {absent.length > 0 && (
                    <p className="mt-2 text-xs leading-5 text-[#514941]">
                        命中{absent.map((item) => item.text).join('、')}：对应的人事与机会要靠大运流年带来，不是没有，只是来得晚些或要主动去争取。
                    </p>
                )}
            </div>

            <div>
                <p className="text-xs font-bold text-[#514941]">命局组合</p>
                {traits.length ? (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {traits.map((trait) => {
                            const tone = TRAIT_TONE[trait.tone] ?? TRAIT_TONE.neutral;
                            return (
                                <li key={trait.key} className={`rounded-lg border px-3 py-2 ${tone.chip}`}>
                                    <p className="flex items-center gap-2">
                                        <span className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${tone.badge}`}>{tone.label}</span>
                                        <strong className="font-serif text-sm font-bold tracking-wide text-[#3b342e]">{trait.name}</strong>
                                    </p>
                                    <p className="mt-1 text-[11px] leading-4 text-[#6f665d]">{trait.basis}</p>
                                    <p className="mt-1 text-xs leading-5 text-[#514941]">{trait.note}</p>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="mt-2 rounded-lg bg-[#e9dfcd]/50 px-3 py-2 text-xs text-[#756d63]">没有识别出特别的组合，命局结构相对平顺。</p>
                )}
            </div>

            <div className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 p-3 sm:p-4">
                <p className="text-sm font-bold text-[#3b342e]">五行缺失</p>
                <p className="mt-1.5 text-xs leading-5 text-[#514941]">
                    {wuxingGap.text}。
                    {wuxingGap.missingSurface.length > 0 && (
                        <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
                            {wuxingGap.missingSurface.map((element) => (
                                <b key={element} className={`inline-flex size-5 items-center justify-center rounded border border-[#cbbfac] bg-[#fffaf0] font-serif text-xs ${WUXING_STYLES[element].text}`}>{element}</b>
                            ))}
                        </span>
                    )}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#7f4b12]">{wuxingGap.hint}</p>
            </div>

            <p className="rounded-lg bg-[#e9dfcd]/55 px-3 py-2 text-[11px] leading-5 text-[#6f665d] sm:text-xs">
                以上由程序按子平常法与简化规则初判：月令取格、按透干与五行力量识别组合，特殊格局只在比例极端时提示。
                {timeUnknown ? '出生时辰不详，时柱相关的格局与十神未计。' : ''}
                格局高低、用神取舍仍需结合全局人工判断。
            </p>
        </div>
    );
}
