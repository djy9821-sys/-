/**
 * 八字排盘组件 - 古书派·紫微
 * 计算由 baziChart 统一提供；页面采用紧凑、专业的命盘信息架构。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Calendar, CalendarDays, Clock, Link2, Printer, Sparkles, TrendingUp, User } from 'lucide-react';
import BaziLanding from './bazi/BaziLanding';
import BaziFlowPanel, { RelationList } from './bazi/BaziFlowPanel';
import {
    BAZI_HOUR_OPTIONS,
    buildBaziChart,
    getBaziDayCount,
    getBaziMonthOptions,
} from '../utils/baziChart';
import {
    buildLiuRi,
    buildLiuShi,
    buildLiuYue,
    getBaziYearOfDate,
    isValidYmd,
    resolveFlowSelection,
} from '../utils/baziFlow';
import { findRelations } from '../utils/baziRelations';

const WUXING_STYLES = {
    '木': { text: 'text-[#247055]', solid: 'bg-[#247055]' },
    '火': { text: 'text-[#ad3f32]', solid: 'bg-[#ad3f32]' },
    '土': { text: 'text-[#86603b]', solid: 'bg-[#86603b]' },
    '金': { text: 'text-[#9a7119]', solid: 'bg-[#b48a2e]' },
    '水': { text: 'text-[#315f7d]', solid: 'bg-[#315f7d]' },
};

const WUXING_ORDER = ['木', '火', '土', '金', '水'];
const wuxingText = (wuxing) => WUXING_STYLES[wuxing]?.text ?? 'text-[#302a25]';

const PROFESSIONAL_GLOSSARY = [
    ['主星', '以日主天干为基准，观察其与各柱天干之间的十神关系。'],
    ['藏干', '地支内部所含的天干，并列显示其与日主的十神关系。'],
    ['纳音', '六十甲子的传统配属名称，不等同于命局五行旺衰。'],
    ['地势', '日主临该地支的十二长生状态，并非单柱吉凶结论。'],
    ['空亡', '该干支所在旬的旬空提示，需要结合全局关系判断。'],
    ['大运／流年', '大运表示十年阶段，流年表示其中的单年时间层。'],
    ['流月／流日／流时', '流月以节令交节为界，流日、流时为具体日期与时辰的干支，用于细看某一天、某个时辰。'],
    ['合冲刑害', '对照表下方列出运限各层与本命四柱之间的干支关系，仅作结构提示，吉凶需结合喜忌判断。'],
];

// 对照层级：流年为原有默认，向下逐层增加流月、流日、流时列。
const COMPARE_DEPTHS = [
    { value: 'year', label: '流年' },
    { value: 'month', label: '流月' },
    { value: 'day', label: '流日' },
    { value: 'hour', label: '流时' },
];
const DEPTH_RANK = { year: 0, month: 1, day: 2, hour: 3 };
const deeperDepth = (current, next) => (DEPTH_RANK[next] > DEPTH_RANK[current] ? next : current);

const COLUMN_TONES = {
    'liu-shi': { cell: 'bg-[#6b4f8a]/[0.045]', head: 'bg-[#6b4f8a]/10 text-[#56406f]' },
    'liu-ri': { cell: 'bg-[#9a7119]/[0.055]', head: 'bg-[#9a7119]/10 text-[#7d5c14]' },
    'liu-yue': { cell: 'bg-[#315f7d]/[0.05]', head: 'bg-[#315f7d]/10 text-[#2a5470]' },
    'liu-nian': { cell: 'bg-[#a33b30]/[0.055]', head: 'bg-[#a33b30]/10 text-[#96372e]' },
    'da-yun': { cell: 'bg-[#2d6b62]/[0.06]', head: 'bg-[#2d6b62]/10 text-[#2d6b62]' },
    day: { cell: 'bg-[#a33b30]/[0.035]', head: 'bg-[#a33b30]/[0.07] text-[#96372e]' },
};
const FLOW_KEYS = ['liu-shi', 'liu-ri', 'liu-yue', 'liu-nian', 'da-yun'];

const GAN_WUXING = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

const ZHI_WUXING = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
    '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

const SectionHeading = ({ seal, title, note, icon: Icon }) => (
    <div className="flex items-start gap-2.5">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-[#a33b30]/35 bg-[#a33b30]/[0.06] font-serif text-xs font-bold text-[#96372e]" aria-hidden="true">
            {seal}
        </span>
        <div>
            <h3 className="flex items-center gap-2 text-base font-bold tracking-[0.08em] text-[#28231f] sm:text-lg">
                {title}
                {Icon && <Icon className="size-4 text-[#2d6b62]" aria-hidden="true" />}
            </h3>
            {note && <p className="mt-0.5 text-[11px] leading-5 text-[#756d63] sm:text-xs">{note}</p>}
        </div>
    </div>
);

const PillarCell = ({ pillar, children, className = '' }) => (
    <td className={`border-b border-l border-[#cabfac]/70 px-1 py-2 text-center align-middle ${pillar.key === 'day' ? 'bg-[#a33b30]/[0.045]' : ''} ${className}`}>
        {children}
    </td>
);

const PillarTable = ({ pillars }) => (
    <div className="mt-4 overflow-hidden rounded-xl border border-[#b9ad98]/80 bg-[#fffaf0]/75">
        <table className="w-full table-fixed border-collapse" aria-label="四柱八字专业命盘">
            <colgroup>
                <col className="w-10 sm:w-16" />
                {pillars.map((pillar) => <col key={pillar.key} />)}
            </colgroup>
            <thead>
                <tr>
                    <th className="border-b border-[#b9ad98]/80 bg-[#e9dfcd]/65 px-1 py-2 text-[10px] font-medium text-[#81776b] sm:text-xs">四柱</th>
                    {pillars.map((pillar) => (
                        <th key={pillar.key} scope="col" className={`relative border-b border-l border-[#b9ad98]/80 px-1 py-2 text-xs font-bold tracking-[0.08em] sm:text-sm ${pillar.key === 'day' ? 'bg-[#a33b30]/[0.065] text-[#96372e]' : 'bg-[#e9dfcd]/45 text-[#514941]'}`}>
                            {pillar.key === 'day' && <span className="absolute inset-x-0 top-0 h-0.5 bg-[#a33b30]" aria-hidden="true" />}
                            {pillar.name}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th scope="row" className="border-b border-[#cabfac]/70 bg-[#e9dfcd]/45 px-1 py-2 text-[10px] font-medium text-[#756d63] sm:text-xs">主星</th>
                    {pillars.map((pillar) => (
                        <PillarCell key={pillar.key} pillar={pillar}>
                            <span className={`text-[11px] font-semibold sm:text-sm ${pillar.key === 'day' ? 'text-[#96372e]' : 'text-[#514941]'}`}>{pillar.ganShiShen}</span>
                        </PillarCell>
                    ))}
                </tr>
                <tr>
                    <th scope="row" className="border-b border-[#cabfac]/70 bg-[#e9dfcd]/45 px-1 py-2 text-[10px] font-medium text-[#756d63] sm:text-xs">天干</th>
                    {pillars.map((pillar) => (
                        <PillarCell key={pillar.key} pillar={pillar} className="py-3">
                            <span className={`font-serif text-[1.75rem] font-bold leading-none sm:text-4xl ${wuxingText(pillar.ganWuxing)}`}>{pillar.gan}</span>
                            <span className="mt-1 block text-[9px] text-[#948a7d] sm:text-[11px]">{pillar.ganWuxing}</span>
                        </PillarCell>
                    ))}
                </tr>
                <tr>
                    <th scope="row" className="border-b border-[#cabfac]/70 bg-[#e9dfcd]/45 px-1 py-2 text-[10px] font-medium text-[#756d63] sm:text-xs">地支</th>
                    {pillars.map((pillar) => (
                        <PillarCell key={pillar.key} pillar={pillar} className="py-3">
                            <span className={`font-serif text-[1.75rem] font-bold leading-none sm:text-4xl ${wuxingText(pillar.zhiWuxing)}`}>{pillar.zhi}</span>
                            <span className="mt-1 block text-[9px] text-[#948a7d] sm:text-[11px]">{pillar.zhiWuxing}</span>
                        </PillarCell>
                    ))}
                </tr>
                <tr>
                    <th scope="row" className="border-b border-[#cabfac]/70 bg-[#e9dfcd]/45 px-1 py-2 text-[10px] font-medium text-[#756d63] sm:text-xs">藏干</th>
                    {pillars.map((pillar) => (
                        <PillarCell key={pillar.key} pillar={pillar} className="py-2.5">
                            <div className="flex min-h-[3.75rem] flex-col items-center justify-center gap-1">
                                {pillar.hiddenGanDetails.map((detail) => (
                                    <span key={`${pillar.key}-${detail.gan}`} className="inline-flex items-baseline justify-center gap-0.5 whitespace-nowrap">
                                        <b className={`font-serif text-xs sm:text-sm ${wuxingText(detail.wuxing)}`}>{detail.gan}</b>
                                        <small className="text-[8px] text-[#756d63] sm:text-[10px]">{detail.shiShen}</small>
                                    </span>
                                ))}
                            </div>
                        </PillarCell>
                    ))}
                </tr>
                <tr>
                    <th scope="row" className="border-b border-[#cabfac]/70 bg-[#e9dfcd]/45 px-1 py-2 text-[10px] font-medium text-[#756d63] sm:text-xs">纳音</th>
                    {pillars.map((pillar) => (
                        <PillarCell key={pillar.key} pillar={pillar}>
                            <span className="text-[9px] leading-4 text-[#5c544b] sm:text-xs">{pillar.naYin}</span>
                        </PillarCell>
                    ))}
                </tr>
            </tbody>
        </table>
    </div>
);

const normalizeComparisonColumn = (source, key, fallbackName, meta = '') => {
    const ganZhi = source?.ganZhi ?? '';
    const gan = source?.gan ?? ganZhi.slice(0, 1);
    const zhi = source?.zhi ?? ganZhi.slice(1, 2);
    const hiddenGanDetails = source?.hiddenGanDetails?.length
        ? source.hiddenGanDetails
        : (source?.hiddenGans ?? []).map((hiddenGan, index) => ({
            gan: hiddenGan,
            shiShen: source?.hiddenShiShens?.[index] ?? '',
            wuxing: GAN_WUXING[hiddenGan] ?? '',
        }));

    return {
        ...source,
        key,
        name: source?.name ?? fallbackName,
        meta,
        gan,
        zhi,
        ganWuxing: source?.ganWuxing ?? GAN_WUXING[gan] ?? '',
        zhiWuxing: source?.zhiWuxing ?? ZHI_WUXING[zhi] ?? '',
        hiddenGanDetails,
    };
};

const comparisonTone = (column) => COLUMN_TONES[column.key]?.cell ?? 'bg-[#fffaf0]/65';

const ProfessionalComparisonTable = ({ pillars, daYun, liuNian, flowColumns = [], detail = 'compact', describedBy }) => {
    const columns = [
        ...flowColumns.map(({ source, key, name, meta }) => normalizeComparisonColumn(source, key, name, meta)),
        normalizeComparisonColumn(
            liuNian,
            'liu-nian',
            '流年',
            liuNian ? `${liuNian.year}年 · ${liuNian.age}虚岁` : '',
        ),
        normalizeComparisonColumn(
            daYun,
            'da-yun',
            '大运',
            daYun ? `${daYun.startAge}-${daYun.endAge}虚岁` : '',
        ),
        ...pillars.map((pillar) => normalizeComparisonColumn(pillar, pillar.key, pillar.name)),
    ];
    const rowHeaderClass = 'sticky left-0 z-20 w-14 border-b border-r border-[#b9ad98]/80 bg-[#e7ddcc] px-1.5 py-2 text-[11px] font-semibold text-[#685f56] shadow-[3px_0_5px_rgba(76,62,46,0.06)] print:static print:text-[8px] print:shadow-none sm:w-16 sm:text-xs';
    const dataCellClass = (column) => `border-b border-r border-[#cabfac]/70 px-1.5 py-2 text-center align-middle last:border-r-0 ${comparisonTone(column)}`;

    return (
        <div className="-mx-2 mt-4 overflow-x-auto rounded-xl border border-[#b9ad98]/80 bg-[#fffaf0]/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] print:mx-0 print:overflow-visible print:ring-0 sm:mx-0" tabIndex={describedBy ? 0 : undefined} aria-describedby={describedBy}>
            <table className="w-full table-fixed border-collapse print:min-w-0!" style={{ minWidth: `${Math.max(680, 64 + columns.length * 88)}px` }}>
                <caption className="sr-only">
                    {flowColumns.map(({ source, name }) => `${source?.ganZhi ?? ''}${name}、`).join('')}{liuNian ? `${liuNian.year}年${liuNian.ganZhi}流年、` : ''}{daYun ? `${daYun.ganZhi}大运与` : ''}本命四柱专业对照表，{detail === 'full' ? '完整' : '精简'}模式
                </caption>
                <colgroup>
                    <col className="w-14 print:w-12 sm:w-16" />
                    {columns.map((column) => <col key={column.key} />)}
                </colgroup>
                <thead>
                    <tr>
                        <th className="sticky left-0 z-30 border-b border-r border-[#b9ad98]/80 bg-[#dfd3c0] px-1 py-2 text-[10px] font-semibold text-[#756d63] print:static print:text-[8px] sm:text-xs">对照</th>
                        {columns.map((column) => (
                            <th key={column.key} scope="col" className={`border-b border-r border-[#b9ad98]/80 px-1 py-2 text-xs font-bold last:border-r-0 print:text-[9px] sm:text-sm ${COLUMN_TONES[column.key]?.head ?? 'bg-[#e9dfcd]/45 text-[#514941]'}`}>
                                <span className="block">{column.name}</span>
                                {column.meta && <span className="mt-0.5 block text-[10px] font-normal tabular-nums opacity-70 print:text-[6px]">{column.meta}</span>}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th scope="row" className={rowHeaderClass}>主星</th>
                        {columns.map((column) => <td key={column.key} className={dataCellClass(column)}><span className="text-[11px] font-semibold text-[#514941] print:text-[8px] sm:text-sm">{column.ganShiShen || '—'}</span></td>)}
                    </tr>
                    <tr>
                        <th scope="row" className={rowHeaderClass}>天干</th>
                        {columns.map((column) => (
                            <td key={column.key} className={`${dataCellClass(column)} py-3`}>
                                <span className={`font-serif text-2xl font-bold leading-none print:text-lg sm:text-3xl ${wuxingText(column.ganWuxing)}`}>{column.gan || '—'}</span>
                                <span className="mt-1 block text-[10px] text-[#948a7d] print:hidden">{column.ganWuxing || '—'}</span>
                            </td>
                        ))}
                    </tr>
                    <tr>
                        <th scope="row" className={rowHeaderClass}>地支</th>
                        {columns.map((column) => (
                            <td key={column.key} className={`${dataCellClass(column)} py-3`}>
                                <span className={`font-serif text-2xl font-bold leading-none print:text-lg sm:text-3xl ${wuxingText(column.zhiWuxing)}`}>{column.zhi || '—'}</span>
                                <span className="mt-1 block text-[10px] text-[#948a7d] print:hidden">{column.zhiWuxing || '—'}</span>
                            </td>
                        ))}
                    </tr>
                    <tr>
                        <th scope="row" className={rowHeaderClass}>藏干</th>
                        {columns.map((column) => (
                            <td key={column.key} className={dataCellClass(column)}>
                                {column.hiddenGanDetails.length > 0 ? (
                                    <div className="flex min-h-12 flex-col items-center justify-center gap-0.5">
                                        {column.hiddenGanDetails.map((detail, index) => (
                                            <span key={`${column.key}-${detail.gan}-${index}`} className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                                                <b className={`font-serif text-xs print:text-[9px] sm:text-sm ${wuxingText(detail.wuxing ?? GAN_WUXING[detail.gan])}`}>{detail.gan}</b>
                                                <small className="text-[10px] text-[#756d63] print:text-[6px]">{detail.shiShen || '—'}</small>
                                            </span>
                                        ))}
                                    </div>
                                ) : <span className="text-xs text-[#9b9185]">—</span>}
                            </td>
                        ))}
                    </tr>
                    {detail === 'full' && (
                        <>
                            <tr>
                                <th scope="row" className={rowHeaderClass}>纳音</th>
                                {columns.map((column) => <td key={column.key} className={dataCellClass(column)}><span className="text-[11px] leading-4 text-[#5c544b] print:text-[7px] sm:text-xs">{column.naYin || '—'}</span></td>)}
                            </tr>
                            <tr>
                                <th scope="row" className={rowHeaderClass}>地势</th>
                                {columns.map((column) => <td key={column.key} className={dataCellClass(column)}><span className="text-[11px] font-medium text-[#2d6b62] print:text-[7px] sm:text-xs">{column.diShi || '—'}</span></td>)}
                            </tr>
                            <tr>
                                <th scope="row" className={`${rowHeaderClass} border-b-0`}>空亡</th>
                                {columns.map((column) => <td key={column.key} className={`${dataCellClass(column)} border-b-0`}><span className="text-[11px] text-[#5c544b] print:text-[7px] sm:text-xs">{column.xunKong || '—'}</span></td>)}
                            </tr>
                        </>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const WuxingStructure = ({ counts }) => {
    const total = WUXING_ORDER.reduce((sum, wuxing) => sum + (counts[wuxing] ?? 0), 0);
    return (
        <>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[#d9cfbf] ring-1 ring-[#c5b9a6]" role="img" aria-label={WUXING_ORDER.map((wuxing) => `${wuxing}${counts[wuxing] ?? 0}个`).join('，')}>
                {WUXING_ORDER.map((wuxing) => {
                    const count = counts[wuxing] ?? 0;
                    if (!count) return null;
                    return <span key={wuxing} className={WUXING_STYLES[wuxing].solid} style={{ width: `${(count / total) * 100}%` }} aria-hidden="true" />;
                })}
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-3">
                {WUXING_ORDER.map((wuxing) => (
                    <div key={wuxing} className="rounded-lg border border-[#cbbfac]/80 bg-[#fffaf0]/70 px-1 py-2 text-center sm:px-3">
                        <span className={`block text-sm font-bold sm:text-base ${WUXING_STYLES[wuxing].text}`}>{wuxing}</span>
                        <span className="mt-0.5 block text-base font-semibold tabular-nums text-[#38312b] sm:text-lg">{counts[wuxing] ?? 0}</span>
                    </div>
                ))}
            </div>
            <p className="mt-3 rounded-lg bg-[#e9dfcd]/55 px-3 py-2 text-[11px] leading-5 text-[#6f665d] sm:text-xs">
                统计四个天干与四个地支，共 8 字。此处仅展示表层五行数量，不等同于命局旺衰、喜忌或用神判断。
            </p>
        </>
    );
};

const formatStartSolar = (value) => value?.split(' ')[0]?.replaceAll('-', '.') ?? '—';

// 日历、时辰上的小圆点只看地支（及整柱伏吟、反吟）与本命四柱的关系；
// 天干关系与“破”在选中后的关系列表里完整列出，不占用圆点，避免满屏都是标记。
const strongestNatalMark = (natalItems, key, label, item) => {
    const relation = findRelations([{ key, label, gan: item.gan, zhi: item.zhi }, ...natalItems], { focusKeys: [key] })
        .find(({ scope, tone }) => scope !== 'gan' && tone !== 'break');
    return relation ? { tone: relation.tone, title: relation.title } : null;
};

export default function BaziDivination({ onBack }) {
    const [step, setStep] = useState('landing');
    const [calendarType, setCalendarType] = useState('solar');
    const [birthYear, setBirthYear] = useState(1990);
    const [birthMonth, setBirthMonth] = useState(1);
    const [birthDay, setBirthDay] = useState(1);
    const [birthHour, setBirthHour] = useState(6);
    const [daySect, setDaySect] = useState(2);
    const [gender, setGender] = useState('male');
    const [personName, setPersonName] = useState('');
    const [resultMode, setResultMode] = useState('basic');
    const [professionalDetail, setProfessionalDetail] = useState(() => {
        try {
            return window.localStorage.getItem('bazi-professional-detail') === 'full' ? 'full' : 'compact';
        } catch {
            return 'compact';
        }
    });
    const [fortuneSelection, setFortuneSelection] = useState({ mode: 'current', daYunIndex: null, liuNianYear: null });
    const [chartAsOf, setChartAsOf] = useState(() => new Date());
    const [showSelectionDock, setShowSelectionDock] = useState(false);
    const [loading, setLoading] = useState(false);
    const [flowSelection, setFlowSelection] = useState(null);
    const [compareDepth, setCompareDepth] = useState('year');
    const daYunScrollerRef = useRef(null);
    const professionalSectionRef = useRef(null);
    const liuNianSectionRef = useRef(null);
    const flowSectionRef = useRef(null);
    const calculateTimerRef = useRef(null);
    const stepRegionRef = useRef(null);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1900 + 1 }, (_, index) => 1900 + index);
    const monthOptions = useMemo(() => getBaziMonthOptions(calendarType, birthYear), [calendarType, birthYear]);
    const activeMonth = monthOptions.find((month) => month.value === birthMonth)?.value ?? monthOptions[0]?.value ?? 1;
    const dayCount = getBaziDayCount(calendarType, birthYear, activeMonth);
    const activeDay = Math.min(birthDay, dayCount || 1);
    const days = Array.from({ length: dayCount }, (_, index) => index + 1);
    const selectedHour = BAZI_HOUR_OPTIONS.find((option) => option.index === birthHour) ?? BAZI_HOUR_OPTIONS[6];
    const isLateZiHour = birthHour === 12;

    const baziResult = useMemo(() => {
        if (step !== 'result') return null;
        try {
            return buildBaziChart({
                calendarType,
                year: birthYear,
                month: activeMonth,
                day: activeDay,
                hourIndex: birthHour,
                gender,
                daySect,
            }, chartAsOf);
        } catch (error) {
            console.error('计算八字失败:', error);
            return null;
        }
    }, [step, calendarType, birthYear, activeMonth, activeDay, birthHour, gender, daySect, chartAsOf]);

    const currentDaYun = useMemo(
        () => baziResult?.yun?.dayun?.find((item) => item.isCurrent) ?? null,
        [baziResult],
    );
    const currentLiuNian = baziResult?.yun?.currentLiuNian ?? null;

    const selectedDaYun = useMemo(() => {
        const daYun = baziResult?.yun?.dayun ?? [];
        return (fortuneSelection.mode === 'manual'
            ? daYun.find((item) => item.index === fortuneSelection.daYunIndex)
            : currentDaYun)
            ?? currentDaYun
            ?? daYun[0]
            ?? null;
    }, [baziResult, currentDaYun, fortuneSelection]);

    const selectedLiuNian = useMemo(() => {
        const liuNian = selectedDaYun?.liuNian ?? [];
        const requestedYear = fortuneSelection.mode === 'manual' ? fortuneSelection.liuNianYear : currentLiuNian?.year;
        return liuNian.find((item) => item.year === requestedYear)
            ?? (currentLiuNian?.year === requestedYear && selectedDaYun?.isCurrent ? currentLiuNian : null)
            ?? (selectedDaYun?.isCurrent ? currentLiuNian : null)
            ?? liuNian.find((item) => item.isCurrent)
            ?? liuNian[0]
            ?? null;
    }, [currentLiuNian, fortuneSelection, selectedDaYun]);

    const visibleLiuNian = useMemo(() => {
        const liuNian = selectedDaYun?.liuNian ?? [];
        const currentLiuNian = baziResult?.yun?.currentLiuNian ?? null;
        if (!selectedDaYun?.isCurrent || !currentLiuNian || liuNian.some((item) => item.year === currentLiuNian.year)) {
            return liuNian;
        }
        return [...liuNian, currentLiuNian].sort((a, b) => a.year - b.year);
    }, [baziResult, selectedDaYun]);

    const dayMasterGan = baziResult?.dayMaster?.gan ?? null;

    const liuYueList = useMemo(() => {
        if (!selectedLiuNian || !dayMasterGan) return [];
        try {
            return buildLiuYue(selectedLiuNian.year, dayMasterGan, chartAsOf);
        } catch (error) {
            console.error('计算流月失败:', error);
            return [];
        }
    }, [selectedLiuNian, dayMasterGan, chartAsOf]);

    const activeFlow = useMemo(
        () => resolveFlowSelection(liuYueList, flowSelection, chartAsOf),
        [liuYueList, flowSelection, chartAsOf],
    );
    const selectedLiuYue = activeFlow ? liuYueList[activeFlow.monthIndex] : null;

    const liuRiList = useMemo(
        () => (selectedLiuYue && dayMasterGan ? buildLiuRi(selectedLiuYue, dayMasterGan, chartAsOf) : []),
        [selectedLiuYue, dayMasterGan, chartAsOf],
    );
    const selectedLiuRi = liuRiList.find((day) => day.date === activeFlow?.date) ?? liuRiList[0] ?? null;

    const liuShiList = useMemo(
        () => (selectedLiuRi && dayMasterGan ? buildLiuShi(selectedLiuRi.date, dayMasterGan, chartAsOf) : []),
        [selectedLiuRi, dayMasterGan, chartAsOf],
    );
    const selectedLiuShi = liuShiList.find((hour) => hour.index === activeFlow?.hourIndex) ?? liuShiList[0] ?? null;

    const flowColumns = useMemo(() => {
        const rank = DEPTH_RANK[compareDepth];
        return [
            rank >= 3 && selectedLiuShi && { key: 'liu-shi', name: '流时', source: selectedLiuShi, meta: `${selectedLiuShi.hourName} ${selectedLiuShi.range}` },
            rank >= 2 && selectedLiuRi && { key: 'liu-ri', name: '流日', source: selectedLiuRi, meta: `${selectedLiuRi.month}/${selectedLiuRi.day} ${selectedLiuRi.weekdayLabel}` },
            rank >= 1 && selectedLiuYue && { key: 'liu-yue', name: '流月', source: selectedLiuYue, meta: `${selectedLiuYue.jieName} ${selectedLiuYue.label}起` },
        ].filter(Boolean);
    }, [compareDepth, selectedLiuShi, selectedLiuRi, selectedLiuYue]);

    // 关系计算统一使用 { key, label, gan, zhi } 结构。
    const natalItems = useMemo(
        () => (baziResult?.pillars ?? []).map((pillar) => ({ key: pillar.key, label: pillar.name, gan: pillar.gan, zhi: pillar.zhi })),
        [baziResult],
    );
    const fortuneItems = useMemo(() => [
        selectedDaYun && { key: 'da-yun', label: '大运', gan: selectedDaYun.gan, zhi: selectedDaYun.zhi },
        selectedLiuNian && { key: 'liu-nian', label: '流年', gan: selectedLiuNian.gan, zhi: selectedLiuNian.zhi },
    ].filter(Boolean), [selectedDaYun, selectedLiuNian]);

    const comparisonRelations = useMemo(() => findRelations([
        ...flowColumns.map(({ key, name, source }) => ({ key, label: name, gan: source.gan, zhi: source.zhi })),
        ...fortuneItems,
        ...natalItems,
    ], { focusKeys: FLOW_KEYS }), [flowColumns, fortuneItems, natalItems]);

    const selectionRelations = useMemo(() => {
        if (!selectedLiuRi) return [];
        return findRelations([
            selectedLiuShi && { key: 'liu-shi', label: '流时', gan: selectedLiuShi.gan, zhi: selectedLiuShi.zhi },
            { key: 'liu-ri', label: '流日', gan: selectedLiuRi.gan, zhi: selectedLiuRi.zhi },
            selectedLiuYue && { key: 'liu-yue', label: '流月', gan: selectedLiuYue.gan, zhi: selectedLiuYue.zhi },
            ...fortuneItems,
            ...natalItems,
        ].filter(Boolean), { focusKeys: ['liu-ri', 'liu-shi'] });
    }, [selectedLiuRi, selectedLiuShi, selectedLiuYue, fortuneItems, natalItems]);

    const dayMarks = useMemo(
        () => Object.fromEntries(liuRiList.map((day) => [day.date, strongestNatalMark(natalItems, 'liu-ri', '流日', day)])),
        [liuRiList, natalItems],
    );
    const hourMarks = useMemo(
        () => Object.fromEntries(liuShiList.map((hour) => [hour.index, strongestNatalMark(natalItems, 'liu-shi', '流时', hour)])),
        [liuShiList, natalItems],
    );

    useEffect(() => {
        if (!selectedDaYun || !daYunScrollerRef.current) return;
        const selectedButton = daYunScrollerRef.current.querySelector(`[data-dayun-index="${selectedDaYun.index}"]`);
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        selectedButton?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    }, [selectedDaYun]);

    useEffect(() => {
        try {
            window.localStorage.setItem('bazi-professional-detail', professionalDetail);
        } catch {
            // 无痕模式或受限存储下仍可在本次会话使用。
        }
    }, [professionalDetail]);

    useEffect(() => {
        if (step === 'landing') return undefined;
        const frame = window.requestAnimationFrame(() => {
            stepRegionRef.current?.focus({ preventScroll: true });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [step]);

    useEffect(() => () => {
        if (calculateTimerRef.current) window.clearTimeout(calculateTimerRef.current);
    }, []);

    const changeCalendarType = (nextType) => {
        const nextMonths = getBaziMonthOptions(nextType, birthYear);
        const nextMonth = nextMonths.find((month) => month.value === birthMonth)?.value
            ?? nextMonths.find((month) => month.value === Math.abs(birthMonth))?.value
            ?? nextMonths[0]?.value
            ?? 1;
        setCalendarType(nextType);
        setBirthMonth(nextMonth);
        setBirthDay((day) => Math.min(day, getBaziDayCount(nextType, birthYear, nextMonth) || 1));
    };

    const changeBirthYear = (nextYear) => {
        const nextMonths = getBaziMonthOptions(calendarType, nextYear);
        const nextMonth = nextMonths.find((month) => month.value === birthMonth)?.value
            ?? nextMonths.find((month) => month.value === Math.abs(birthMonth))?.value
            ?? nextMonths[0]?.value
            ?? 1;
        setBirthYear(nextYear);
        setBirthMonth(nextMonth);
        setBirthDay((day) => Math.min(day, getBaziDayCount(calendarType, nextYear, nextMonth) || 1));
    };

    const changeBirthMonth = (nextMonth) => {
        setBirthMonth(nextMonth);
        setBirthDay((day) => Math.min(day, getBaziDayCount(calendarType, birthYear, nextMonth) || 1));
    };

    const handleCalculate = () => {
        if (calculateTimerRef.current) window.clearTimeout(calculateTimerRef.current);
        setLoading(true);
        setChartAsOf(new Date());
        setFortuneSelection({ mode: 'current', daYunIndex: null, liuNianYear: null });
        setFlowSelection(null);
        setCompareDepth('year');
        setShowSelectionDock(false);
        setResultMode('basic');
        calculateTimerRef.current = window.setTimeout(() => {
            calculateTimerRef.current = null;
            setStep('result');
            setLoading(false);
        }, 350);
    };

    const handleHeaderBack = () => {
        if (step === 'result') {
            setStep('input');
            return;
        }
        if (calculateTimerRef.current) {
            window.clearTimeout(calculateTimerRef.current);
            calculateTimerRef.current = null;
        }
        setLoading(false);
        setStep('landing');
    };

    const selectDaYun = (daYun) => {
        const initialLiuNian = (daYun.isCurrent ? baziResult?.yun?.currentLiuNian : null)
            ?? daYun.liuNian?.find((item) => item.isCurrent)
            ?? daYun.liuNian?.[0]
            ?? null;
        setFortuneSelection({ mode: 'manual', daYunIndex: daYun.index, liuNianYear: initialLiuNian?.year ?? null });
        setShowSelectionDock(false);
    };

    const scrollToSection = (targetRef) => {
        window.requestAnimationFrame(() => {
            const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            targetRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            targetRef.current?.focus({ preventScroll: true });
        });
    };

    const selectLiuNian = (liuNian) => {
        setFortuneSelection({ mode: 'manual', daYunIndex: selectedDaYun?.index ?? null, liuNianYear: liuNian.year });
        setResultMode('professional');
        setShowSelectionDock(true);
    };

    const viewProfessionalSelection = () => {
        setResultMode('professional');
        setShowSelectionDock(false);
        scrollToSection(professionalSectionRef);
    };

    const returnToCurrentFortune = () => {
        setChartAsOf(new Date());
        setFortuneSelection({ mode: 'current', daYunIndex: null, liuNianYear: null });
        setFlowSelection(null);
        setResultMode('professional');
        setShowSelectionDock(false);
        scrollToSection(professionalSectionRef);
    };

    // 流月、流日、流时的选择：对照表自动加深到所点的层级，并在手机端提示查看专业盘。
    const applyFlowSelection = (nextSelection, depth) => {
        setFlowSelection(nextSelection);
        setCompareDepth((current) => deeperDepth(current, depth));
        setResultMode('professional');
        setShowSelectionDock(true);
    };

    const selectFlowMonth = (monthIndex) => {
        if (!activeFlow) return;
        applyFlowSelection({ baziYear: activeFlow.baziYear, monthIndex, date: null, hourIndex: activeFlow.hourIndex }, 'month');
    };

    const selectFlowDay = (date) => {
        if (!activeFlow) return;
        applyFlowSelection({ baziYear: activeFlow.baziYear, monthIndex: activeFlow.monthIndex, date, hourIndex: activeFlow.hourIndex }, 'day');
    };

    const selectFlowHour = (hourIndex) => {
        if (!activeFlow) return;
        applyFlowSelection({ baziYear: activeFlow.baziYear, monthIndex: activeFlow.monthIndex, date: activeFlow.date, hourIndex }, 'hour');
    };

    const jumpToFlowDate = (ymd) => {
        if (!isValidYmd(ymd)) return '请输入有效的日期';
        const baziYear = getBaziYearOfDate(ymd);
        const daYun = baziResult?.yun?.dayun?.find((item) => item.liuNian.some((liuNian) => liuNian.year === baziYear));
        if (!daYun) return `${baziYear}年不在本命盘的大运范围内（起运前或超出排列年份）`;
        setFortuneSelection({ mode: 'manual', daYunIndex: daYun.index, liuNianYear: baziYear });
        applyFlowSelection({ baziYear, monthIndex: null, date: ymd, hourIndex: activeFlow?.hourIndex ?? null }, 'day');
        return null;
    };

    const returnFlowToNow = () => {
        setChartAsOf(new Date());
        setFortuneSelection({ mode: 'current', daYunIndex: null, liuNianYear: null });
        applyFlowSelection(null, 'hour');
    };

    const isViewingCurrentFortune = Boolean(
        currentDaYun
        && currentLiuNian
        && selectedDaYun?.index === currentDaYun.index
        && selectedLiuNian?.year === currentLiuNian.year,
    );

    const genderLabel = gender === 'male' ? '乾造' : '坤造';

    const selectionSummary = (() => {
        const yearText = selectedLiuNian ? `${selectedLiuNian.year}${selectedLiuNian.ganZhi}流年` : '未选择流年';
        if (compareDepth === 'hour' && selectedLiuRi && selectedLiuShi) {
            return `${selectedLiuRi.month}/${selectedLiuRi.day} ${selectedLiuShi.hourName} · ${selectedLiuRi.ganZhi}日 ${selectedLiuShi.ganZhi}时`;
        }
        if (compareDepth === 'day' && selectedLiuRi && selectedLiuYue) {
            return `${selectedLiuRi.month}/${selectedLiuRi.day} ${selectedLiuRi.ganZhi}日 · ${selectedLiuYue.ganZhi}月`;
        }
        if (compareDepth === 'month' && selectedLiuYue) {
            return `${selectedLiuYue.ganZhi}月 · ${yearText}`;
        }
        return `${selectedDaYun?.ganZhi ?? '—'}大运 · ${yearText}`;
    })();

    if (step === 'landing') {
        return <BaziLanding onBack={onBack} onStart={() => setStep('input')} />;
    }

    return (
        <div className="relative flex flex-1 flex-col overflow-hidden bg-[#090806] text-stone-100 print:block print:overflow-visible print:bg-white">
            <div className="pointer-events-none absolute inset-0 overflow-hidden print:hidden" aria-hidden="true">
                <div className="absolute -right-24 -top-32 h-72 w-72 rounded-full bg-red-950/20 blur-3xl" />
                <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-amber-900/10 blur-3xl" />
            </div>

            <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-amber-100/10 bg-stone-950/80 px-4 pb-3 backdrop-blur-xl print:hidden" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                <button type="button" onClick={handleHeaderBack} disabled={loading} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-wait disabled:opacity-45" aria-label={step === 'result' ? '返回八字输入' : loading ? '正在排盘，请稍候' : '返回八字卷首'}>
                    <ArrowLeft className="size-5 text-amber-300" aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-md border border-red-400/60 bg-red-950/60 text-red-200 shadow-inner shadow-red-950"><span className="font-serif text-base" aria-hidden="true">命</span></div>
                    <div>
                        <h1 className="text-lg font-bold tracking-[0.16em] text-stone-100">八字排盘</h1>
                        <p className="text-[10px] tracking-[0.2em] text-stone-500">四柱命理 · 本地排盘</p>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 overflow-auto px-3 pt-5 print:overflow-visible print:p-0 sm:px-4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                {step === 'input' ? (
                    <div ref={stepRegionRef} tabIndex={-1} role="region" aria-label="八字出生信息输入" className="mx-auto max-w-md animate-in space-y-5 fade-in duration-300 focus:outline-none">
                        <div className="space-y-2 py-2 text-center">
                            <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.28em] text-amber-300/70"><span className="h-px w-8 bg-amber-300/30" />生辰入盘<span className="h-px w-8 bg-amber-300/30" /></div>
                            <h2 className="text-2xl font-bold tracking-[0.12em] text-stone-100">探索四柱命格</h2>
                            <p className="text-sm leading-6 text-stone-400">选择历法、生辰与性别，生成专业八字命盘</p>
                        </div>

                        <section className="space-y-5 rounded-[28px] border border-amber-100/10 bg-stone-950/70 p-4 shadow-2xl shadow-black/30 sm:p-6" aria-label="八字出生信息">
                            <div className="space-y-2">
                                <label htmlFor="bazi-name" className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-orange-500"><User className="size-3" aria-hidden="true" /> 命主称呼 <span className="font-normal tracking-normal text-stone-500">（选填）</span></label>
                                <input id="bazi-name" type="text" value={personName} maxLength={20} onChange={(event) => setPersonName(event.target.value)} placeholder="例如：杨先生" className="min-h-11 w-full rounded-xl border border-white/10 bg-black/50 px-4 text-white outline-none transition-all placeholder:text-stone-600 focus:border-orange-500/50 focus-visible:ring-2 focus-visible:ring-amber-400/40" />
                            </div>

                            <div className="space-y-2">
                                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-orange-500"><Calendar className="size-3" aria-hidden="true" /> 日期类型</span>
                                <div className="flex rounded-xl border border-white/10 bg-black/50 p-1">
                                    {[{ value: 'solar', label: '阳历' }, { value: 'lunar', label: '农历' }].map((option) => (
                                        <button key={option.value} type="button" onClick={() => changeCalendarType(option.value)} aria-pressed={calendarType === option.value} className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${calendarType === option.value ? 'border border-orange-500/50 bg-orange-900/50 text-orange-300' : 'text-gray-500'}`}>{option.label}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-orange-500">出生日期</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <select aria-label="出生年份" value={birthYear} onChange={(event) => changeBirthYear(Number(event.target.value))} className="min-h-11 cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/50 px-2 text-center text-white outline-none focus:border-orange-500/50 focus-visible:ring-2 focus-visible:ring-amber-400/40">
                                        {years.map((year) => <option key={year} value={year}>{year}年</option>)}
                                    </select>
                                    <select aria-label="出生月份" value={activeMonth} onChange={(event) => changeBirthMonth(Number(event.target.value))} className="min-h-11 cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/50 px-2 text-center text-white outline-none focus:border-orange-500/50 focus-visible:ring-2 focus-visible:ring-amber-400/40">
                                        {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                                    </select>
                                    <select aria-label="出生日期" value={activeDay} onChange={(event) => setBirthDay(Number(event.target.value))} className="min-h-11 cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/50 px-2 text-center text-white outline-none focus:border-orange-500/50 focus-visible:ring-2 focus-visible:ring-amber-400/40">
                                        {days.map((day) => <option key={day} value={day}>{day}日</option>)}
                                    </select>
                                </div>
                                {calendarType === 'lunar' && <p className="text-[11px] leading-5 text-stone-500">农历月份已按所选年份列出闰月与实际天数。</p>}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="bazi-hour" className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-orange-500"><Clock className="size-3" aria-hidden="true" /> 出生时辰</label>
                                <select id="bazi-hour" value={birthHour} onChange={(event) => setBirthHour(Number(event.target.value))} className="min-h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/50 px-4 text-white outline-none focus:border-orange-500/50 focus-visible:ring-2 focus-visible:ring-amber-400/40">
                                    {BAZI_HOUR_OPTIONS.map((option) => <option key={option.index} value={option.index}>{option.name}（{option.range}）</option>)}
                                </select>
                                <p className="text-[11px] leading-5 text-stone-500">按出生地当地钟表时间选择，本排盘不含真太阳时校正。</p>
                            </div>

                            {isLateZiHour && (
                                <fieldset className="space-y-2 rounded-xl border border-amber-300/10 bg-amber-950/15 p-3">
                                    <legend className="px-1 text-xs font-bold tracking-wider text-amber-300">子时换日法</legend>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[{ value: 2, label: '晚子不换日', note: '23时仍属当日' }, { value: 1, label: '晚子换次日', note: '23时计入次日' }].map((option) => (
                                            <button key={option.value} type="button" onClick={() => setDaySect(option.value)} aria-pressed={daySect === option.value} className={`min-h-12 rounded-lg border px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${daySect === option.value ? 'border-amber-500/50 bg-amber-900/35 text-amber-200' : 'border-white/10 bg-black/25 text-stone-400'}`}>
                                                <span className="block text-xs font-bold">{option.label}</span><span className="mt-0.5 block text-[10px] opacity-70">{option.note}</span>
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                            )}

                            <fieldset className="space-y-2">
                                <legend className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-orange-500"><User className="size-3" aria-hidden="true" /> 性别</legend>
                                <div className="grid grid-cols-2 gap-3">
                                    {[{ value: 'male', symbol: '♂', label: '男命' }, { value: 'female', symbol: '♀', label: '女命' }].map((option) => (
                                        <button key={option.value} type="button" onClick={() => setGender(option.value)} aria-pressed={gender === option.value} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${gender === option.value ? 'border-orange-500/55 bg-orange-900/30 text-orange-300' : 'border-white/10 bg-black/50 text-gray-500'}`}><span aria-hidden="true">{option.symbol}</span><span className="font-bold">{option.label}</span></button>
                                    ))}
                                </div>
                            </fieldset>

                            <button type="button" onClick={handleCalculate} disabled={loading} aria-busy={loading} className="min-h-12 w-full rounded-xl bg-gradient-to-r from-amber-700 via-orange-700 to-red-800 px-4 text-base font-bold tracking-[0.18em] text-white shadow-lg shadow-orange-950/40 hover:from-amber-600 hover:to-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-50">
                                {loading ? '排盘中...' : '开始排盘'}
                            </button>
                        </section>
                    </div>
                ) : (
                    <div ref={stepRegionRef} tabIndex={-1} className="mx-auto max-w-4xl animate-in fade-in duration-300 focus:outline-none print:max-w-none" role="region" aria-label="八字排盘结果">
                        {baziResult ? (
                            <>
                                <article className="overflow-hidden rounded-[24px] border border-[#d0c4b2] bg-[#f3ecdf] text-[#302a25] shadow-2xl shadow-black/35 print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
                                    <div className="border-b border-[#c8bba7]/80 bg-[#e7ddcc]/75 px-3 pt-3 sm:px-6 sm:pt-5">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="inline-flex size-9 items-center justify-center rounded-lg border border-[#a33b30]/45 bg-[#a33b30]/[0.06] font-serif text-base font-bold text-[#96372e]" aria-hidden="true">命</span>
                                                <div><p className="font-serif text-lg font-bold tracking-[0.16em] text-[#28231f] sm:text-xl"><span className="print:hidden">四柱命盘</span><span className="hidden print:inline">八字专业细盘</span></p><p className="text-[10px] tracking-[0.2em] text-[#81776b]">古书派 · 本地排盘</p></div>
                                            </div>
                                            <div className="text-right"><p className="text-sm font-bold text-[#96372e]">{personName.trim() ? `${personName.trim()} · ` : ''}{genderLabel}</p><p className="mt-0.5 text-[10px] text-[#81776b]">生肖 {baziResult.lunarInfo.zodiac}</p><p className="mt-0.5 hidden text-[8px] text-[#81776b] print:block">生成日期 {new Date().toLocaleDateString('zh-CN')}</p></div>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 rounded-t-xl border border-b-0 border-[#b9ad98]/80 bg-[#f7f0e5] p-1 print:hidden" role="group" aria-label="命盘详细程度">
                                            {[{ value: 'basic', label: '基本命盘' }, { value: 'professional', label: '专业细盘' }].map((option) => (
                                                <button key={option.value} type="button" aria-pressed={resultMode === option.value} onClick={() => setResultMode(option.value)} className={`min-h-11 rounded-lg px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${resultMode === option.value ? 'bg-[#2d6b62] text-white shadow-sm' : 'text-[#6f665d] hover:bg-[#e9dfcd]'}`}>{option.label}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="divide-y divide-[#c8bba7]/80">
                                        <section className="px-3 py-4 sm:px-6 sm:py-5" aria-label="命盘摘要">
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-3 text-xs sm:grid-cols-4 sm:text-sm">
                                                <div><span className="block text-[10px] text-[#8a8074] sm:text-xs">公历</span><strong className="mt-1 block font-semibold tabular-nums text-[#3c352f]">{baziResult.solarInfo.year}.{baziResult.solarInfo.month}.{baziResult.solarInfo.day}</strong></div>
                                                <div><span className="block text-[10px] text-[#8a8074] sm:text-xs">农历</span><strong className="mt-1 block font-semibold text-[#3c352f]">{baziResult.lunarInfo.yearChinese}年 {baziResult.lunarInfo.monthChinese}月{baziResult.lunarInfo.dayChinese}</strong></div>
                                                <div><span className="block text-[10px] text-[#8a8074] sm:text-xs">当地钟表时辰</span><strong className="mt-1 block font-semibold text-[#3c352f]">{selectedHour.name} · {selectedHour.range}</strong></div>
                                                <div><span className="block text-[10px] text-[#8a8074] sm:text-xs">日主</span><strong className={`mt-1 block font-semibold ${wuxingText(baziResult.dayMaster.wuxing)}`}>{baziResult.dayMaster.gan}{baziResult.dayMaster.wuxing}</strong></div>
                                            </div>
                                            <p className="mt-3 text-[10px] leading-5 text-[#8a8074]">日期按{calendarType === 'solar' ? '阳历' : '农历'}输入 · {genderLabel} · 不含真太阳时校正{isLateZiHour ? ` · ${daySect === 1 ? '晚子换次日' : '晚子不换日'}` : ''}</p>
                                        </section>

                                        <section ref={professionalSectionRef} tabIndex={-1} className="scroll-mt-4 px-2 py-5 focus:outline-none sm:px-6 sm:py-6" aria-labelledby="bazi-pillars-title">
                                            <div id="bazi-pillars-title" className="px-1 print:hidden sm:px-0">
                                                <SectionHeading
                                                    seal="壹"
                                                    title={resultMode === 'professional' ? '专业运限同参' : '四柱八字'}
                                                    note={resultMode === 'professional'
                                                        ? '所选运限（流时、流日、流月、流年、大运）与本命四柱并列对照；横向滑动查看完整命盘'
                                                        : '主星、干支、藏干十神与纳音'}
                                                    icon={Sparkles}
                                                />
                                            </div>
                                            <div className="print:hidden">
                                                {resultMode === 'professional' ? (
                                                    <>
                                                        <div className="mt-3 rounded-xl border border-[#cbbfac]/80 bg-[#e9dfcd]/45 p-2.5 sm:p-3">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <div>
                                                                    <span className="text-[10px] text-[#81776b]">正在对照</span>
                                                                    <p className="mt-0.5 text-sm font-bold text-[#3b342e]">{selectionSummary}</p>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button type="button" onClick={() => scrollToSection(liuNianSectionRef)} className="inline-flex min-h-11 items-center rounded-lg border border-[#9f917c] bg-[#fffaf0]/70 px-3 text-xs font-bold text-[#5f574f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">换流年 ↓</button>
                                                                    <button type="button" onClick={returnToCurrentFortune} disabled={!currentDaYun || !currentLiuNian} className="inline-flex min-h-11 items-center rounded-lg bg-[#2d6b62] px-3 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa] disabled:cursor-default disabled:bg-[#9b9489]">
                                                                        {isViewingCurrentFortune ? '刷新今年' : '回到今年'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <fieldset className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#c8bba7]/70 pt-2.5">
                                                                <legend className="sr-only">对照到哪一层运限</legend>
                                                                <span className="text-[11px] font-medium text-[#6f665d]">对照层级</span>
                                                                <div className="grid grid-cols-4 rounded-lg border border-[#b9ad98] bg-[#f7f0e5] p-1" role="group" aria-label="对照到哪一层运限">
                                                                    {COMPARE_DEPTHS.map((option) => (
                                                                        <button key={option.value} type="button" aria-pressed={compareDepth === option.value} onClick={() => setCompareDepth(option.value)} className={`min-h-11 min-w-[3.25rem] rounded-md px-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${compareDepth === option.value ? 'bg-[#2d6b62] text-white' : 'text-[#6f665d]'}`}>
                                                                            {option.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </fieldset>
                                                            <fieldset className="mt-2.5 flex items-center justify-between gap-3 border-t border-[#c8bba7]/70 pt-2.5">
                                                                <legend className="sr-only">专业细盘显示内容</legend>
                                                                <span className="text-[11px] font-medium text-[#6f665d]">显示内容</span>
                                                                <div className="grid grid-cols-2 rounded-lg border border-[#b9ad98] bg-[#f7f0e5] p-1" role="group" aria-label="专业细盘显示内容">
                                                                    {[{ value: 'compact', label: '精简' }, { value: 'full', label: '完整' }].map((option) => (
                                                                        <button key={option.value} type="button" aria-pressed={professionalDetail === option.value} onClick={() => setProfessionalDetail(option.value)} className={`min-h-11 min-w-[4.25rem] rounded-md px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${professionalDetail === option.value ? 'bg-[#2d6b62] text-white' : 'text-[#6f665d]'}`}>
                                                                            {option.label}{professionalDetail === option.value ? ' ✓' : ''}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </fieldset>
                                                        </div>
                                                        <p id="bazi-professional-scroll-tip" className="mt-2 px-1 text-[10px] leading-5 text-[#81776b]">可左右滑动查看运限与四柱；精简模式优先展示干支与藏干。在下方「流月 · 流日 · 流时」中点选具体日期时辰。</p>
                                                        <ProfessionalComparisonTable
                                                            pillars={baziResult.pillars}
                                                            daYun={selectedDaYun}
                                                            liuNian={selectedLiuNian}
                                                            flowColumns={flowColumns}
                                                            detail={professionalDetail}
                                                            describedBy="bazi-professional-scroll-tip"
                                                        />
                                                        <div className="mt-4 rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/55 p-3">
                                                            <p className="flex items-center gap-1.5 text-sm font-bold text-[#514941]">
                                                                <Link2 className="size-4 text-[#2d6b62]" aria-hidden="true" />合冲刑害
                                                                <span className="text-[10px] font-normal text-[#81776b]">运限各层与命局之间的干支关系</span>
                                                            </p>
                                                            <RelationList relations={comparisonRelations} emptyText="所选运限与命局之间没有明显的合冲刑害。" />
                                                        </div>
                                                        <details className="mt-3 overflow-hidden rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/55">
                                                            <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 text-sm font-bold text-[#514941] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2d6b62]">
                                                                术语说明 <span className="text-xs font-normal text-[#81776b]">点击展开</span>
                                                            </summary>
                                                            <dl className="grid gap-x-5 gap-y-3 border-t border-[#cbbfac]/70 px-3 py-3 sm:grid-cols-2">
                                                                {PROFESSIONAL_GLOSSARY.map(([term, explanation]) => (
                                                                    <div key={term}>
                                                                        <dt className="text-sm font-bold text-[#2d6b62]">{term}</dt>
                                                                        <dd className="mt-1 text-xs leading-5 text-[#6f665d]">{explanation}</dd>
                                                                    </div>
                                                                ))}
                                                            </dl>
                                                        </details>
                                                    </>
                                                ) : <PillarTable pillars={baziResult.pillars} />}
                                            </div>
                                            <div className="hidden print:block">
                                                <SectionHeading seal="壹" title="专业运限同参" note="所选运限与本命四柱并列对照" icon={Sparkles} />
                                                <ProfessionalComparisonTable
                                                    pillars={baziResult.pillars}
                                                    daYun={selectedDaYun}
                                                    liuNian={selectedLiuNian}
                                                    flowColumns={flowColumns}
                                                    detail="full"
                                                />
                                            </div>
                                        </section>

                                        <section className="px-3 py-5 sm:px-6 sm:py-6" aria-labelledby="wuxing-title">
                                            <div id="wuxing-title"><SectionHeading seal="贰" title="表层五行结构" note="四干四支的可见五行数量" /></div>
                                            <WuxingStructure counts={baziResult.surfaceWuxingCount} />
                                        </section>

                                        {baziResult.yun?.dayun?.length > 0 && (
                                            <section ref={liuNianSectionRef} tabIndex={-1} className="scroll-mt-4 px-3 py-5 focus:outline-none sm:px-6 sm:py-6" aria-labelledby="dayun-title">
                                                <div id="dayun-title"><SectionHeading seal="叁" title="大运流年" note="点击大运与流年可联动上方专业细盘；交运年份可能跨两步大运" icon={TrendingUp} /></div>
                                                <div className="mt-4 rounded-xl border border-[#cbbfac]/75 bg-[#e9dfcd]/45 px-3 py-2.5 text-[11px] leading-5 text-[#655d54] sm:text-xs">
                                                    <span className="font-semibold text-[#2d6b62]">{baziResult.yun.forward ? '顺排' : '逆排'}</span><span className="mx-2 text-[#a79b8a]" aria-hidden="true">·</span>
                                                    出生后 {baziResult.yun.startYear}年{baziResult.yun.startMonth}月{baziResult.yun.startDay}天{baziResult.yun.startHour ? `${baziResult.yun.startHour}小时` : ''}起运
                                                    <span className="mx-2 text-[#a79b8a]" aria-hidden="true">·</span>交运 {formatStartSolar(baziResult.yun.startSolar)}
                                                </div>
                                                <div ref={daYunScrollerRef} className="-mx-3 mt-4 overflow-x-auto px-3 pb-2 print:hidden sm:-mx-6 sm:px-6" aria-label="大运时间轴">
                                                    <div className="flex w-max min-w-full snap-x gap-2">
                                                        {baziResult.yun.dayun.map((daYun) => {
                                                            const isSelected = selectedDaYun?.index === daYun.index;
                                                            return (
                                                                <button key={daYun.index} data-dayun-index={daYun.index} type="button" aria-pressed={isSelected} aria-expanded={isSelected} onClick={() => selectDaYun(daYun)} className={`relative min-h-[5.75rem] w-[5.6rem] shrink-0 snap-start rounded-xl border px-2 py-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3ecdf] ${isSelected ? 'border-[#a33b30] bg-[#fffaf0] shadow-sm' : daYun.isCurrent ? 'border-[#2d6b62]/70 bg-[#2d6b62]/[0.07]' : 'border-[#cbbfac] bg-[#f8f1e6] hover:border-[#9e8f7a]'}`}>
                                                                    {daYun.isCurrent && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#2d6b62] px-1.5 py-0.5 text-[8px] font-bold text-white">当前</span>}
                                                                    <span className="block text-[10px] tabular-nums text-[#81776b]">{daYun.startAge}-{daYun.endAge}虚岁</span><span className="mt-1 block font-serif text-xl font-bold tracking-[0.12em] text-[#3b342e]">{daYun.ganZhi}</span><span className="mt-1 block text-[9px] tabular-nums text-[#81776b]">{daYun.startYear}-{daYun.endYear}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="hidden border-l border-t border-[#b9ad98] print:grid print:grid-cols-7">
                                                    {baziResult.yun.dayun.map((daYun) => (
                                                        <div key={`print-${daYun.index}`} className={`border-b border-r border-[#b9ad98] px-1 py-1.5 text-center ${selectedDaYun?.index === daYun.index ? 'bg-[#a33b30]/[0.07]' : ''}`}>
                                                            <span className="block text-[7px] text-[#756d63]">{daYun.startAge}-{daYun.endAge}虚岁</span>
                                                            <strong className="block font-serif text-sm text-[#3b342e]">{daYun.ganZhi}</strong>
                                                            <span className="block text-[6px] text-[#81776b]">{daYun.startYear}-{daYun.endYear}{daYun.isCurrent ? ' · 当前' : ''}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {selectedDaYun && (
                                                    <div className="mt-3 rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 p-3 print:hidden sm:p-4">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div><p className="text-sm font-bold text-[#3b342e]">{selectedDaYun.ganZhi}大运 · 流年</p><p className="mt-0.5 text-[10px] text-[#81776b]">{selectedDaYun.startAge}-{selectedDaYun.endAge}虚岁</p></div>
                                                            <div className="flex items-center gap-2">
                                                                {selectedDaYun.isCurrent && <span className="rounded-full bg-[#2d6b62]/10 px-2 py-1 text-[10px] font-bold text-[#2d6b62]">当前所行大运</span>}
                                                                <button type="button" onClick={viewProfessionalSelection} className="hidden min-h-11 rounded-lg bg-[#2d6b62] px-3 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa] sm:inline-flex sm:items-center">查看专业盘 ↑</button>
                                                            </div>
                                                        </div>
                                                        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                                                            {visibleLiuNian.map((liuNian) => {
                                                                const isSelected = selectedLiuNian?.year === liuNian.year;
                                                                return (
                                                                    <li key={liuNian.year}>
                                                                        <button
                                                                            type="button"
                                                                            aria-pressed={isSelected}
                                                                            onClick={() => selectLiuNian(liuNian)}
                                                                            className={`relative min-h-12 w-full rounded-lg border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${isSelected
                                                                                ? 'border-[#a33b30] bg-[#a33b30]/[0.08] shadow-sm'
                                                                                : liuNian.isCurrent
                                                                                    ? 'border-[#2d6b62]/60 bg-[#2d6b62]/[0.06]'
                                                                                    : 'border-[#d5c9b8] bg-[#f7f0e5] hover:border-[#a99b87]'
                                                                            }`}
                                                                        >
                                                                            {isSelected && <span className="absolute left-1 top-1 text-[8px] font-bold text-[#96372e]">已选</span>}
                                                                            {liuNian.isCurrent && <span className="absolute right-1 top-1 text-[8px] font-bold text-[#2d6b62]">今年</span>}
                                                                            <span className="block text-[10px] tabular-nums text-[#81776b]">{liuNian.year} · {liuNian.age}虚岁</span>
                                                                            <span className="mt-0.5 block font-serif text-base font-bold text-[#3b342e]">{liuNian.ganZhi}</span>
                                                                            {resultMode === 'professional' && <span className="mt-0.5 block text-[9px] text-[#2d6b62]">{liuNian.ganShiShen}</span>}
                                                                        </button>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                        {visibleLiuNian.length > selectedDaYun.liuNian.length && (
                                                            <p className="mt-2 text-[10px] leading-5 text-[#81776b]">当前流年跨越交运节点，已与本步大运的十个标称年份一并显示。</p>
                                                        )}
                                                    </div>
                                                )}
                                                {selectedDaYun && (
                                                    <div className="mt-2 hidden print:block">
                                                        <p className="mb-1 text-[8px] font-bold text-[#3b342e]">{selectedDaYun.ganZhi}大运流年对照</p>
                                                        <div className="grid grid-cols-10 border-l border-t border-[#b9ad98]">
                                                            {visibleLiuNian.map((liuNian) => (
                                                                <div key={`print-year-${liuNian.year}`} className={`border-b border-r border-[#b9ad98] px-0.5 py-1 text-center ${selectedLiuNian?.year === liuNian.year ? 'bg-[#a33b30]/[0.07]' : ''}`}>
                                                                    <span className="block text-[6px] text-[#81776b]">{liuNian.year}</span>
                                                                    <strong className="block font-serif text-[10px] text-[#3b342e]">{liuNian.ganZhi}</strong>
                                                                    <span className="block text-[6px] text-[#756d63]">{liuNian.age}虚岁</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </section>
                                        )}

                                        {selectedLiuNian && selectedLiuRi && (
                                            <section ref={flowSectionRef} tabIndex={-1} className="scroll-mt-4 px-3 py-5 focus:outline-none print:hidden sm:px-6 sm:py-6" aria-labelledby="flow-title">
                                                <div id="flow-title"><SectionHeading seal="肆" title="流月 · 流日 · 流时" note="在所选流年内细看某月、某天、某个时辰；点选后上方专业盘同步加列" icon={CalendarDays} /></div>
                                                <BaziFlowPanel
                                                    liuNian={selectedLiuNian}
                                                    liuYueList={liuYueList}
                                                    selectedLiuYue={selectedLiuYue}
                                                    liuRiList={liuRiList}
                                                    selectedLiuRi={selectedLiuRi}
                                                    liuShiList={liuShiList}
                                                    selectedLiuShi={selectedLiuShi}
                                                    dayMarks={dayMarks}
                                                    hourMarks={hourMarks}
                                                    selectionRelations={selectionRelations}
                                                    onSelectMonth={selectFlowMonth}
                                                    onSelectDay={selectFlowDay}
                                                    onSelectHour={selectFlowHour}
                                                    onJumpToDate={jumpToFlowDate}
                                                    onNow={returnFlowToNow}
                                                />
                                            </section>
                                        )}
                                    </div>
                                </article>

                                <div className="mt-4 grid grid-cols-2 gap-3 print:hidden">
                                    <button type="button" onClick={() => setStep('input')} className="min-h-11 rounded-xl border border-orange-500/35 px-4 font-bold text-orange-300 hover:bg-orange-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">重新排盘</button>
                                    <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2d6b62] px-3 font-bold text-white hover:bg-[#245a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa]"><Printer className="size-4" aria-hidden="true" />导出专业细盘</button>
                                </div>
                                {showSelectionDock && <div className="h-20 sm:hidden" aria-hidden="true" />}
                                <p className="sr-only" role="status" aria-live="polite">
                                    {showSelectionDock && selectedLiuNian && selectedDaYun
                                        ? `已选择${selectionSummary}，专业盘已更新`
                                        : ''}
                                </p>
                                {showSelectionDock && selectedLiuNian && selectedDaYun && (
                                    <div className="fixed inset-x-3 z-50 rounded-2xl border border-[#8f816d] bg-[#f3ecdf]/95 p-2.5 text-[#302a25] shadow-2xl shadow-black/40 backdrop-blur sm:hidden print:hidden" style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0 pl-1">
                                                <span className="block text-[10px] font-medium text-[#81776b]">已选择</span>
                                                <strong className="mt-0.5 block truncate text-sm text-[#3b342e]">{selectionSummary}</strong>
                                            </div>
                                            <button type="button" onClick={viewProfessionalSelection} className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-[#2d6b62] px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa]">查看专业盘 ↑</button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : <div className="py-10 text-center text-red-300" role="alert">计算失败，请检查输入的日期是否正确</div>}
                    </div>
                )}
            </main>
        </div>
    );
}
