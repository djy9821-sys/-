/**
 * 择日参考：选事务、选时段，按黄历宜忌与命局喜忌、合冲给出较宜与需避开的日子。
 * 计算在 utils/zeri.js，这里只负责交互与展示。
 */
import React, { useId, useMemo, useState } from 'react';
import { CalendarCheck, ClipboardCopy, ExternalLink } from 'lucide-react';
import { formatZeriText, pickAuspiciousDays, sortReasons, ZERI_GRADES, ZERI_PURPOSES, ZERI_RANGES } from '../../utils/zeri';
import { toYmd } from '../../utils/baziFlow';
import { track } from '../../utils/analytics';

const GRADE_CLASS = {
    good: 'bg-[#2d6b62] text-white',
    ok: 'bg-[#2d6b62]/75 text-white',
    plain: 'bg-[#8a8074] text-white',
    avoid: 'bg-[#a33b30] text-white',
};
const REASON_CLASS = {
    good: 'border-[#2d6b62]/35 bg-[#2d6b62]/[0.07] text-[#245a52]',
    bad: 'border-[#a33b30]/35 bg-[#a33b30]/[0.07] text-[#8f3027]',
    neutral: 'border-[#cbbfac] bg-[#fffaf0]/70 text-[#6f665d]',
};
const BEST_LIMIT = 6;
const AVOID_PREVIEW = 6;
const asOf = (now) => (now instanceof Date ? now : new Date());

const DayRow = ({ item, onJump, jumpLabel }) => {
    const reasons = sortReasons(item).slice(0, 4);
    return (
        <li className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/70 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`inline-flex min-w-7 justify-center rounded px-1.5 py-0.5 font-serif text-xs font-bold ${GRADE_CLASS[item.grade]}`}>{ZERI_GRADES[item.grade].label}</span>
                <b className="text-sm tabular-nums text-[#3b342e]">{item.month}/{item.day}</b>
                <span className="text-xs text-[#81776b]">{item.weekdayLabel} · 农历{item.lunarText}{item.jieQi ? ` · ${item.jieQi}` : ''}</span>
                <span className="font-serif text-sm font-bold text-[#3b342e]">{item.ganZhi}日</span>
                <span className="text-xs text-[#2d6b62]">{item.ganShiShen}</span>
                {item.isToday && <span className="rounded-full bg-[#2d6b62] px-1.5 text-[10px] font-bold leading-4 text-white">今天</span>}
                {onJump && (
                    <button type="button" onClick={() => onJump(item.date)} className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-[#2d6b62] hover:bg-[#2d6b62]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                        {jumpLabel}<ExternalLink className="size-3" aria-hidden="true" />
                    </button>
                )}
            </div>
            <ul className="mt-1.5 flex flex-wrap gap-1" aria-label={`${item.month}月${item.day}日的依据`}>
                {reasons.map((reason) => (
                    <li key={reason.text} className={`rounded border px-1.5 py-0.5 text-[11px] leading-4 ${REASON_CLASS[reason.tone]}`}>{reason.text}</li>
                ))}
            </ul>
        </li>
    );
};

export default function BaziDatePicker({ chart, strength, now, personName = '', onJumpToDate = null, onCopy = null }) {
    const [purpose, setPurpose] = useState('general');
    const [days, setDays] = useState(30);
    const [startDate, setStartDate] = useState(() => toYmd(asOf(now)));
    const [showAllAvoid, setShowAllAvoid] = useState(false);
    const [copyState, setCopyState] = useState(null);
    const startId = useId();

    const result = useMemo(() => {
        if (!chart) return null;
        try {
            return pickAuspiciousDays(chart, strength, { purpose, startDate, days, now: asOf(now) });
        } catch (error) {
            console.error('择日计算失败:', error);
            return null;
        }
    }, [chart, strength, purpose, startDate, days, now]);

    if (!chart || !result) return null;

    const purposeInfo = result.purpose;
    const best = result.best.slice(0, BEST_LIMIT);
    const avoid = showAllAvoid ? result.avoid : result.avoid.slice(0, AVOID_PREVIEW);

    const choosePurpose = (value) => {
        setPurpose(value);
        setShowAllAvoid(false);
        track('bazi_zeri', { purpose: value, days });
    };

    const copyList = async () => {
        const text = formatZeriText(result, { personName, dayMaster: `${chart.dayMaster.gan}${chart.dayMaster.wuxing}` });
        const copied = onCopy ? await onCopy(text).catch(() => false) : false;
        setCopyState(copied ? 'done' : 'failed');
        track('bazi_zeri_copy', { purpose, days, copied: Boolean(copied) });
        window.setTimeout(() => setCopyState(null), 2400);
    };

    const jump = (date) => {
        if (!onJumpToDate) return;
        onJumpToDate(date);
        track('bazi_zeri_jump', { purpose });
    };

    return (
        <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 p-3 sm:p-4">
                <p className="text-xs font-bold text-[#514941]">要办什么事</p>
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="事务类型">
                    {ZERI_PURPOSES.map((option) => (
                        <button key={option.value} type="button" aria-pressed={purpose === option.value} title={option.hint} onClick={() => choosePurpose(option.value)} className={`min-h-9 rounded-lg border px-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${purpose === option.value ? 'border-[#a33b30] bg-[#a33b30]/[0.08] text-[#8f3027]' : 'border-[#d5c9b8] bg-[#f7f0e5] text-[#514941] hover:border-[#a99b87]'}`}>
                            {option.label}
                        </button>
                    ))}
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-[#81776b]">{purposeInfo.hint}。</p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-1">
                        <label htmlFor={startId} className="block text-[11px] font-medium text-[#81776b]">从哪天开始看</label>
                        <input
                            id={startId}
                            type="date"
                            min="1901-01-01"
                            max="2099-12-31"
                            value={startDate}
                            onChange={(event) => { if (event.target.value) setStartDate(event.target.value); }}
                            className="mt-1 min-h-11 w-full rounded-lg border border-[#b9ad98] bg-[#fffaf0] px-3 text-sm font-semibold tabular-nums text-[#3b342e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]"
                            style={{ colorScheme: 'light' }}
                        />
                    </div>
                    <div className="flex rounded-lg border border-[#b9ad98] bg-[#f7f0e5] p-0.5" role="group" aria-label="看多长时间">
                        {ZERI_RANGES.map((option) => (
                            <button key={option.value} type="button" aria-pressed={days === option.value} onClick={() => setDays(option.value)} className={`min-h-10 rounded-md px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${days === option.value ? 'bg-[#2d6b62] text-white' : 'text-[#514941]'}`}>{option.label}</button>
                        ))}
                    </div>
                </div>
            </div>

            <p className="text-xs leading-5 text-[#514941]" role="status">
                {result.start} 至 {result.end}：较宜 <b className="text-[#245a52]">{result.counts.good + result.counts.ok}</b> 天（佳 {result.counts.good}、可 {result.counts.ok}），平 {result.counts.plain} 天，需避开 <b className="text-[#8f3027]">{result.counts.avoid}</b> 天。
            </p>

            <div>
                <p className="flex items-center gap-1.5 text-xs font-bold text-[#245a52]"><CalendarCheck className="size-3.5" aria-hidden="true" />较宜的日子{result.best.length > BEST_LIMIT ? `（得分最高的 ${BEST_LIMIT} 天）` : ''}</p>
                {best.length ? (
                    <ul className="mt-2 space-y-2">
                        {best.map((item) => <DayRow key={item.date} item={item} onJump={onJumpToDate ? jump : null} jumpLabel="看这天" />)}
                    </ul>
                ) : (
                    <p className="mt-2 rounded-lg bg-[#e9dfcd]/50 px-3 py-2 text-xs text-[#756d63]">这段时间没有特别合适的日子，可以放宽时段或换一类事务再看。</p>
                )}
            </div>

            <div>
                <p className="text-xs font-bold text-[#8f3027]">需避开的日子{result.avoid.length ? `（${result.avoid.length} 天）` : ''}</p>
                {avoid.length ? (
                    <>
                        <ul className="mt-2 space-y-2">
                            {avoid.map((item) => <DayRow key={item.date} item={item} onJump={onJumpToDate ? jump : null} jumpLabel="看这天" />)}
                        </ul>
                        {result.avoid.length > AVOID_PREVIEW && (
                            <button type="button" onClick={() => setShowAllAvoid((open) => !open)} aria-expanded={showAllAvoid} className="mt-2 inline-flex min-h-9 items-center text-xs font-bold text-[#2d6b62] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                                {showAllAvoid ? '收起' : `展开全部 ${result.avoid.length} 天`}
                            </button>
                        )}
                    </>
                ) : (
                    <p className="mt-2 rounded-lg bg-[#e9dfcd]/50 px-3 py-2 text-xs text-[#756d63]">这段时间没有硬忌的日子。</p>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {onCopy && (
                    <button type="button" onClick={copyList} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#2d6b62]/40 px-3 text-xs font-bold text-[#245a52] hover:bg-[#2d6b62]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                        <ClipboardCopy className="size-4" aria-hidden="true" />复制择日清单
                    </button>
                )}
                {copyState && <span role="status" className={`text-xs ${copyState === 'done' ? 'text-[#245a52]' : 'text-[#8f3027]'}`}>{copyState === 'done' ? '已复制，可以直接发给家人或师傅核对。' : '复制失败，请手动选择文字。'}</span>}
            </div>

            <p className="rounded-lg bg-[#e9dfcd]/55 px-3 py-2 text-[11px] leading-5 text-[#6f665d] sm:text-xs">
                程序按黄历宜忌、建除十二神、值神黄黑道，加上流日干支对日主的喜忌、与本命四柱的合冲刑害、冲太岁初选；
                破日、岁破、冲日支、天克地冲日柱与黄历忌此事的日子一律列为「忌」。只看用事者本人的命局，没有考虑对方生辰与方位，重要日子请再请人工复核。
            </p>
        </div>
    );
}
