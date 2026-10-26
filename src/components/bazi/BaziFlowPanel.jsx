/**
 * 流月 · 流日 · 流时 选择面板，以及运限关系提示。
 * 数据全部由父组件计算后传入，本组件只负责展示与交互。
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, Clock, LocateFixed } from 'lucide-react';
import { RELATION_TONES } from '../../utils/baziRelations';

const RELATION_STYLES = {
    clash: { chip: 'border-[#a33b30]/40 bg-[#a33b30]/[0.07] text-[#8f3027]', badge: 'bg-[#a33b30] text-white', dot: 'bg-[#a33b30]' },
    punish: { chip: 'border-[#b06a1f]/40 bg-[#b06a1f]/[0.08] text-[#7f4b12]', badge: 'bg-[#b06a1f] text-white', dot: 'bg-[#b06a1f]' },
    harm: { chip: 'border-[#6b4f8a]/35 bg-[#6b4f8a]/[0.07] text-[#56406f]', badge: 'bg-[#6b4f8a] text-white', dot: 'bg-[#6b4f8a]' },
    harmony: { chip: 'border-[#2d6b62]/40 bg-[#2d6b62]/[0.07] text-[#245a52]', badge: 'bg-[#2d6b62] text-white', dot: 'bg-[#2d6b62]' },
    echo: { chip: 'border-[#315f7d]/35 bg-[#315f7d]/[0.06] text-[#2a5470]', badge: 'bg-[#315f7d] text-white', dot: 'bg-[#315f7d]' },
    break: { chip: 'border-[#9b9185]/40 bg-[#9b9185]/[0.08] text-[#615950]', badge: 'bg-[#8a8074] text-white', dot: 'bg-[#9b9185]' },
};

const WEEK_HEADER = ['一', '二', '三', '四', '五', '六', '日'];
// '07:00-09:00' → '07–09'，在手机四列格子里不折行。
const compactRange = (range) => range.split('-').map((part) => part.slice(0, 2)).join('–');
const LEGEND_TONES = ['clash', 'punish', 'harm', 'harmony', 'echo'];
// 流日格子的筛选：只看需要留意的日子，或只看相合的日子。
const DAY_FILTERS = [
    { value: 'all', label: '全部' },
    { value: 'risky', label: '冲刑害', tones: ['clash', 'punish', 'harm'] },
    { value: 'clash', label: '只看冲', tones: ['clash'] },
    { value: 'harmony', label: '相合', tones: ['harmony'] },
];
const matchesFilter = (mark, filter) => {
    const option = DAY_FILTERS.find(({ value }) => value === filter);
    if (!option?.tones) return true;
    return Boolean(mark?.tones?.some((tone) => option.tones.includes(tone)));
};
const LUCK_STYLE = { 吉: 'text-[#245a52]', 凶: 'text-[#8f3027]' };

const AlmanacList = ({ label, items, tone }) => (
    <div className="flex items-start gap-2">
        <span className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md font-serif text-sm font-bold text-white ${tone === 'good' ? 'bg-[#2d6b62]' : 'bg-[#a33b30]'}`}>{label}</span>
        <p className="min-w-0 flex-1 text-xs leading-6 text-[#514941]">{items.length ? items.join(' · ') : '—'}</p>
    </div>
);

const badgeLabel = (relation) => {
    if (relation.tone === 'echo') return '伏吟';
    if (relation.kinds.includes('反吟')) return '反吟';
    if (relation.kinds.includes('三合') || relation.kinds.includes('三会')) return '成局';
    return RELATION_TONES[relation.tone].label;
};

export const RelationList = ({ relations, emptyText, initialCount = 6 }) => {
    const [expanded, setExpanded] = useState(false);
    if (!relations.length) {
        return <p className="mt-3 rounded-lg bg-[#e9dfcd]/50 px-3 py-2 text-xs text-[#756d63]">{emptyText}</p>;
    }
    const visible = expanded ? relations : relations.slice(0, initialCount);
    return (
        <>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {visible.map((relation) => {
                    const style = RELATION_STYLES[relation.tone];
                    return (
                        <li key={relation.id} className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${style.chip}`}>
                            <span className={`mt-0.5 inline-flex min-w-[2.25rem] shrink-0 justify-center rounded px-1.5 py-0.5 text-[11px] font-bold ${style.badge}`}>{badgeLabel(relation)}</span>
                            <span className="min-w-0">
                                <strong className="block font-serif text-sm font-bold tracking-wide">{relation.title}</strong>
                                <span className="mt-0.5 block text-[11px] leading-4 opacity-80">{relation.detail}</span>
                            </span>
                        </li>
                    );
                })}
            </ul>
            {relations.length > initialCount && (
                <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-[#2d6b62] hover:bg-[#2d6b62]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                    {expanded ? '收起' : `展开全部 ${relations.length} 条`}
                </button>
            )}
        </>
    );
};

const ToneDot = ({ tone }) => (tone
    ? <span className={`absolute right-1 top-1 size-1.5 rounded-full ${RELATION_STYLES[tone].dot}`} aria-hidden="true" />
    : null);

const LayerLabel = ({ icon: Icon, children, note }) => (
    <div className="flex items-baseline justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-sm font-bold tracking-[0.08em] text-[#3b342e]">
            {Icon && <Icon className="size-3.5 text-[#2d6b62]" aria-hidden="true" />}
            {children}
        </h4>
        {note && <span className="text-[11px] text-[#81776b]">{note}</span>}
    </div>
);

export default function BaziFlowPanel({
    liuNian,
    liuYueList,
    selectedLiuYue,
    liuRiList,
    selectedLiuRi,
    liuShiList,
    selectedLiuShi,
    dayMarks,
    hourMarks,
    selectionRelations,
    onSelectMonth,
    onSelectDay,
    onSelectHour,
    onJumpToDate,
    onNow,
}) {
    const dateInputId = useId();
    const [jumpError, setJumpError] = useState('');
    const [dayFilter, setDayFilter] = useState('all');
    const monthScrollerRef = useRef(null);
    const selectedMonthIndex = selectedLiuYue?.index;
    const liuNianYear = liuNian?.year;

    // 选中的流月（默认是本月）滚动到可见位置。
    useEffect(() => {
        const scroller = monthScrollerRef.current;
        const button = scroller?.querySelector(`[data-month-index="${selectedMonthIndex}"]`);
        if (!scroller || !button) return;
        const scrollerRect = scroller.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const target = scroller.scrollLeft + (buttonRect.left - scrollerRect.left) - (scroller.clientWidth - buttonRect.width) / 2;
        scroller.scrollTo({ left: Math.max(0, target), behavior: 'auto' });
    }, [selectedMonthIndex, liuNianYear]);

    if (!liuNian || !selectedLiuYue || !selectedLiuRi) return null;

    const leadingBlanks = (liuRiList[0].weekday + 6) % 7;
    const filteredCount = liuRiList.filter((day) => matchesFilter(dayMarks[day.date], dayFilter)).length;
    const almanac = selectedLiuRi.almanac;
    const handleJump = (value) => {
        if (!value) return;
        setJumpError(onJumpToDate(value) ?? '');
    };

    return (
        <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[#cbbfac]/75 bg-[#e9dfcd]/45 p-2.5 sm:p-3">
                <div className="min-w-0 flex-1">
                    <label htmlFor={dateInputId} className="block text-[11px] font-medium text-[#81776b]">跳转到任意日期</label>
                    <input
                        id={dateInputId}
                        type="date"
                        min="1901-01-01"
                        max="2099-12-31"
                        value={selectedLiuRi.date}
                        onChange={(event) => handleJump(event.target.value)}
                        className="mt-1 min-h-11 w-full rounded-lg border border-[#b9ad98] bg-[#fffaf0] px-3 text-sm font-semibold tabular-nums text-[#3b342e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]"
                        style={{ colorScheme: 'light' }}
                    />
                </div>
                <button type="button" onClick={() => { setJumpError(''); onNow(); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#2d6b62] px-3 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa]">
                    <LocateFixed className="size-4" aria-hidden="true" />回到此刻
                </button>
                {jumpError && <p className="w-full text-[11px] text-[#96372e]" role="alert">{jumpError}</p>}
            </div>

            <div>
                <LayerLabel icon={CalendarDays} note={`${liuNian.year}${liuNian.ganZhi}年 · 以节令换月`}>流月</LayerLabel>
                <div ref={monthScrollerRef} className="-mx-3 mt-1 overflow-x-auto px-3 pb-1 pt-2.5 sm:-mx-6 sm:px-6">
                    <div className="flex w-max gap-1.5">
                        {liuYueList.map((month) => {
                            const isSelected = month.index === selectedLiuYue.index;
                            return (
                                <button
                                    key={month.index}
                                    data-month-index={month.index}
                                    type="button"
                                    aria-pressed={isSelected}
                                    aria-label={`${month.jieName}${month.label}起，${month.ganZhi}月，${month.ganShiShen}`}
                                    onClick={() => onSelectMonth(month.index)}
                                    className={`relative min-h-[4.75rem] w-[3.9rem] shrink-0 rounded-lg border px-1 py-1.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${isSelected ? 'border-[#a33b30] bg-[#fffaf0] shadow-sm' : month.isCurrent ? 'border-[#2d6b62]/70 bg-[#2d6b62]/[0.07]' : 'border-[#d5c9b8] bg-[#f7f0e5] hover:border-[#a99b87]'}`}
                                >
                                    {month.isCurrent && <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#2d6b62] px-1.5 text-[10px] font-bold leading-4 text-white">本月</span>}
                                    <span className="block text-[11px] text-[#81776b]">{month.jieName}</span>
                                    <span className="block text-[11px] tabular-nums text-[#9b9185]">{month.label}</span>
                                    <span className="mt-0.5 block font-serif text-base font-bold leading-5 text-[#3b342e]">{month.ganZhi}</span>
                                    <span className="block text-[11px] text-[#2d6b62]">{month.ganShiShen}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div>
                <LayerLabel icon={CalendarDays} note={`${selectedLiuYue.jieName} ${selectedLiuYue.label} — ${selectedLiuYue.nextJieName}前`}>流日</LayerLabel>
                <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="流日筛选">
                    {DAY_FILTERS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={dayFilter === option.value}
                            onClick={() => setDayFilter(option.value)}
                            className={`inline-flex min-h-8 items-center rounded-full border px-2.5 text-[11px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${dayFilter === option.value ? 'border-[#2d6b62] bg-[#2d6b62] text-white' : 'border-[#cbbfac] bg-[#fffaf0]/70 text-[#5f574f] hover:border-[#2d6b62]'}`}
                        >
                            {option.label}
                        </button>
                    ))}
                    {dayFilter !== 'all' && <span className="text-[11px] text-[#81776b]" aria-live="polite">本月 {filteredCount} 天</span>}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1 text-center" role="group" aria-label={`${selectedLiuYue.ganZhi}月流日`}>
                    {WEEK_HEADER.map((label) => (
                        <span key={label} aria-hidden="true" className="pb-0.5 text-[11px] font-medium text-[#9b9185]">{label}</span>
                    ))}
                    {Array.from({ length: leadingBlanks }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
                    {liuRiList.map((day, index) => {
                        const isSelected = day.date === selectedLiuRi.date;
                        const mark = dayMarks[day.date];
                        const showMonth = index === 0 || day.day === 1;
                        const bottom = day.jieQi || (day.lunarDayChinese === '初一' ? `${day.lunarMonthChinese}月` : day.lunarDayChinese);
                        const dimmed = !isSelected && !matchesFilter(mark, dayFilter);
                        return (
                            <button
                                key={day.date}
                                type="button"
                                aria-pressed={isSelected}
                                aria-label={`${day.month}月${day.day}日 ${day.weekdayLabel}，${day.ganZhi}日，${day.ganShiShen}${mark ? `，${mark.title}` : ''}${day.isToday ? '，今天' : ''}`}
                                onClick={() => onSelectDay(day.date)}
                                className={`relative min-h-[3.6rem] rounded-lg border px-0.5 py-1 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${dimmed ? 'opacity-30' : ''} ${isSelected ? 'border-[#a33b30] bg-[#fffaf0] shadow-sm' : day.isToday ? 'border-[#2d6b62]/70 bg-[#2d6b62]/[0.08]' : 'border-[#ddd2c1] bg-[#f8f2e8] hover:border-[#a99b87]'}`}
                            >
                                <ToneDot tone={mark?.tone} />
                                <span className={`block text-[11px] leading-3 tabular-nums ${day.isToday ? 'font-bold text-[#2d6b62]' : 'text-[#81776b]'}`}>{showMonth ? `${day.month}/${day.day}` : day.day}</span>
                                <span className={`mt-0.5 block font-serif text-[15px] font-bold leading-5 ${isSelected ? 'text-[#96372e]' : 'text-[#3b342e]'}`}>{day.ganZhi}</span>
                                <span className={`block truncate text-[11px] leading-3 ${day.jieQi ? 'font-bold text-[#a33b30]' : 'text-[#9b9185]'}`}>{bottom}</span>
                            </button>
                        );
                    })}
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#81776b]">
                    <span>圆点：当日地支与本命四柱的主要关系</span>
                    {LEGEND_TONES.map((tone) => (
                        <span key={tone} className="inline-flex items-center gap-1">
                            <span className={`size-1.5 rounded-full ${RELATION_STYLES[tone].dot}`} aria-hidden="true" />
                            {RELATION_TONES[tone].label}
                        </span>
                    ))}
                </p>
            </div>

            <div>
                <LayerLabel icon={Clock} note={`${selectedLiuRi.month}月${selectedLiuRi.day}日 ${selectedLiuRi.ganZhi}日`}>流时</LayerLabel>
                <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                    {liuShiList.map((hour) => {
                        const isSelected = hour.index === selectedLiuShi?.index;
                        const mark = hourMarks[hour.index];
                        const isZi = hour.index === 0 || hour.index === 12;
                        return (
                            <button
                                key={hour.index}
                                type="button"
                                aria-pressed={isSelected}
                                aria-label={`${hour.hourName} ${hour.range}，${hour.ganZhi}时，${hour.ganShiShen}${mark ? `，${mark.title}` : ''}${hour.isCurrent ? '，此刻' : ''}`}
                                onClick={() => onSelectHour(hour.index)}
                                className={`relative min-h-[4.1rem] rounded-lg border px-1 py-1.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${isSelected ? 'border-[#a33b30] bg-[#fffaf0] shadow-sm' : hour.isCurrent ? 'border-[#2d6b62]/70 bg-[#2d6b62]/[0.08]' : 'border-[#ddd2c1] bg-[#f8f2e8] hover:border-[#a99b87]'}`}
                            >
                                <ToneDot tone={mark?.tone} />
                                {hour.isCurrent && <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#2d6b62] px-1.5 text-[10px] font-bold leading-4 text-white">此刻</span>}
                                <span className="block text-[11px] text-[#81776b]">{isZi ? hour.hourName : hour.branchName}</span>
                                <span className="block text-[11px] tabular-nums text-[#9b9185]">{compactRange(hour.range)}</span>
                                <span className={`mt-0.5 block font-serif text-[15px] font-bold leading-5 ${isSelected ? 'text-[#96372e]' : 'text-[#3b342e]'}`}>{hour.ganZhi}</span>
                                <span className="block text-[11px] text-[#2d6b62]">{hour.ganShiShen}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 p-3 sm:p-4">
                <p className="text-[11px] font-medium text-[#81776b]">已选时刻</p>
                <p className="mt-0.5 text-sm font-bold text-[#3b342e]">
                    {selectedLiuRi.year}年{selectedLiuRi.month}月{selectedLiuRi.day}日 {selectedLiuRi.weekdayLabel}
                    <span className="font-normal text-[#81776b]"> · 农历{selectedLiuRi.lunarMonthChinese}月{selectedLiuRi.lunarDayChinese}</span>
                    {selectedLiuShi && <span> · {selectedLiuShi.hourName}</span>}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {[
                        ['流月', selectedLiuYue],
                        ['流日', selectedLiuRi],
                        ['流时', selectedLiuShi],
                    ].filter(([, item]) => item).map(([label, item]) => (
                        <span key={label} className="inline-flex items-baseline gap-1 rounded-md border border-[#d5c9b8] bg-[#f7f0e5] px-2 py-1">
                            <span className="text-[11px] text-[#81776b]">{label}</span>
                            <b className="font-serif text-sm text-[#3b342e]">{item.ganZhi}</b>
                            <span className="text-[11px] text-[#2d6b62]">{item.ganShiShen}</span>
                        </span>
                    ))}
                </div>
                {almanac && (
                    <div className="mt-3 space-y-1.5 rounded-lg border border-[#ddd2c1] bg-[#f8f2e8] p-2.5">
                        <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[#6f665d]">
                            <b className="text-[#514941]">黄历</b>
                            <span>{almanac.zhiXing}日</span>
                            <span>值神 <b className={LUCK_STYLE[almanac.tianShenLuck] ?? ''}>{almanac.tianShen}</b>（{almanac.tianShenLuck === '吉' ? '黄道' : '黑道'}）</span>
                            <span>冲{almanac.chong}</span>
                            <span>煞{almanac.sha}</span>
                        </p>
                        <AlmanacList label="宜" items={almanac.yi} tone="good" />
                        <AlmanacList label="忌" items={almanac.ji} tone="bad" />
                        <p className="text-[10px] text-[#9b9185]">黄历宜忌为传统通书择日用语，供参考；与个人命局的关系请看下方。</p>
                    </div>
                )}
                <p className="mt-3 text-xs font-bold text-[#514941]">流日、流时与命局及运限的关系</p>
                <RelationList relations={selectionRelations} emptyText="这一天与命局、运限之间没有明显的合冲刑害。" />
            </div>
        </div>
    );
}
