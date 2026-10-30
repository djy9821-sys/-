/**
 * 八字排盘组件 - 古书派·紫微
 * 计算由 baziChart 统一提供；页面采用紧凑、专业的命盘信息架构。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookA, BookOpen, Bot, Calendar, CalendarCheck, CalendarDays, Clock, Compass, FolderOpen, ImageDown, Link2, MapPin, Printer, Save, Scale, Share2, Sparkles, TrendingUp, User, Users } from 'lucide-react';
import BaziLanding from './bazi/BaziLanding';
import BaziDatePicker from './bazi/BaziDatePicker';
import BaziFlowPanel, { RelationList } from './bazi/BaziFlowPanel';
import BaziPatternPanel from './bazi/BaziPatternPanel';
import BaziLiuqinPanel from './bazi/BaziLiuqinPanel';
import BaziClassicsPanel from './bazi/BaziClassicsPanel';
import BaziPromptExport from './bazi/BaziPromptExport';
import { useClassicsLibrary } from './common/useClassicsLibrary.js';
import { baziContextOf, baziGlossarySeeds, baziLiuqinHits, matchEntries } from '../data/classics/index.js';
import GlossaryPanel from './common/GlossaryPanel.jsx';
import BaziShareCardModal from './bazi/BaziShareCardModal';
import BaziStrengthPanel from './bazi/BaziStrengthPanel';
import { BoundaryNotice, SectionHeading } from './bazi/BaziBits';
import { PillarTable, ProfessionalComparisonTable } from './bazi/BaziTables';
import {
    formatSignedMinutes,
    INPUT_FIELD_CLASS,
    INPUT_HINT_CLASS,
    INPUT_LABEL_CLASS,
    SEGMENT_CLASS,
    segmentButtonClass,
    wuxingText,
} from './bazi/baziTheme';
import {
    BAZI_HOUR_OPTIONS,
    YEAR_BOUNDARY_OPTIONS,
    buildBaziChart,
    getBaziDayCount,
    getBaziMonthOptions,
    getClockSolarDate,
    getYearBoundaryInfo,
} from '../utils/baziChart';
import { archiveManager } from '../utils/archiveManager';
import { BIRTH_PROVINCES, findBirthPlace, TIMEZONE_OPTIONS } from '../utils/birthPlaces';
import { ARCHIVE_GROUP_OPTIONS, buildBaziRecord, clearLastBaziRecord, findSameBaziRecord, parseClockTime, readLastBaziRecord, recordToBaziForm, saveLastBaziRecord } from '../utils/baziRecord';
import { isChinaDst } from '../utils/trueSolarTime';
import { CURRENT_PLACE_EVENT, readCurrentPlace, toLocalSolarNow } from '../utils/currentPlace';
import { track } from '../utils/analytics';
import PlaceSetting from './common/PlaceSetting';
import {
    buildLiuRi,
    buildLiuShi,
    buildLiuYue,
    getBaziYearOfDate,
    isValidYmd,
    resolveFlowSelection,
} from '../utils/baziFlow';
import { findRelations } from '../utils/baziRelations';
import { getShensha, SHENSHA_ORDER, SHENSHA_SOURCES } from '../utils/baziShensha';
import { cite } from '../data/classics';
import { analyzeStrength, favorBasisOf } from '../utils/baziStrength';
import { judgeBaziPattern } from '../utils/baziPattern';
import { analyzeLiuqin } from '../utils/baziLiuqin';

// 摘要卡上的格局成败小标签（《子平真诠》口径）。
const CHENG_BAI_CHIP = {
    成: 'border-[#2d6b62]/35 bg-[#2d6b62]/[0.07] text-[#245a52]',
    败: 'border-[#a33b30]/40 bg-[#a33b30]/[0.06] text-[#96372e]',
    成中有败: 'border-[#b06a1f]/40 bg-[#b06a1f]/[0.08] text-[#7f4b12]',
    败中有成: 'border-[#315f7d]/40 bg-[#315f7d]/[0.08] text-[#2b4f68]',
    default: 'border-[#cbbfac] text-[#5f574f]',
};
import { describeYearMarks, describeYearSummary, getDaYunMarks, getLiuNianMarks, zhiFavorText } from '../utils/baziYearMarks';
import { buildBaziShareUrl } from '../utils/baziLink';
import { buildShareCardModel, renderBaziShareCard } from '../utils/baziShareCard';

// 大运卡片底边、流年按钮右上角的喜忌颜色。
const FAVOR_CLASS = { good: 'bg-[#2d6b62]', bad: 'bg-[#a33b30]', neutral: 'bg-[#b9ad98]', mixed: 'bg-[linear-gradient(90deg,#2d6b62_50%,#a33b30_50%)]' };
const FAVOR_TEXT = { good: '喜', bad: '忌', neutral: '平', mixed: '喜忌参半' };
const YEAR_BADGE_CLASS = {
    clash: 'bg-[#a33b30] text-white', punish: 'bg-[#b06a1f] text-white', harm: 'bg-[#6b4f8a] text-white',
    echo: 'bg-[#315f7d] text-white', break: 'bg-[#8a8074] text-white',
};
// 流年提要的标题色：顺遂 / 宜守 / 参半 / 平。
const YEAR_SUMMARY_CLASS = {
    good: 'border-[#2d6b62]/40 bg-[#2d6b62]/[0.07] text-[#245a52]',
    bad: 'border-[#a33b30]/40 bg-[#a33b30]/[0.07] text-[#8f3027]',
    mixed: 'border-[#b06a1f]/40 bg-[#b06a1f]/[0.08] text-[#7f4b12]',
    neutral: 'border-[#cbbfac] bg-[#fffaf0]/70 text-[#514941]',
};

const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // 继续用兼容写法
        }
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        return document.execCommand('copy');
    } finally {
        textarea.remove();
    }
};

const PROFESSIONAL_GLOSSARY = [
    ['主星', '以日主天干为基准，观察其与各柱天干之间的十神关系。'],
    ['藏干', '地支内部所含的天干，并列显示其与日主的十神关系。'],
    ['纳音', '六十甲子的传统配属名称，不等同于命局五行旺衰。'],
    ['星运', '日主临该地支的十二长生状态（地势），并非单柱吉凶结论。'],
    ['自坐', '本柱天干坐在本柱地支上的十二长生状态。'],
    ['神煞', '按年干、日干、年支、日支与月支查出的常用神煞，吉凶仍以五行喜忌为主。'],
    ['空亡', '该干支所在旬的旬空提示，需要结合全局关系判断。'],
    ['大运／流年', '大运表示十年阶段，流年表示其中的单年时间层。'],
    ['流月／流日／流时', '流月以节令交节为界，流日、流时为具体日期与时辰的干支，用于细看某一天、某个时辰。'],
    ['合冲刑害', '对照表下方列出运限各层与本命四柱之间的干支关系，仅作结构提示，吉凶需结合喜忌判断。'],
    ['合化', '天干五合、地支六合后面标注的「化某」只是可能的化气方向；是否真的化气要看月令与周围干支，多数情况合而不化。'],
    ['太岁', '流年地支与本命年支相同为值太岁，相冲、相刑、相害、相破分别为冲、刑、害、破太岁；大运与流年干支相同为岁运并临。都是提醒留意的年份，不是定吉凶。'],
];

// 对照层级：流年为原有默认，向下逐层增加流月、流日、流时列。
const COMPARE_DEPTHS = [
    { value: 'year', label: '流年' },
    { value: 'month', label: '流月' },
    { value: 'day', label: '流日' },
    { value: 'hour', label: '流时' },
];
const DEPTH_RANK = { year: 0, month: 1, day: 2, hour: 3 };
// 导出范围默认跟随专业细盘当前的对照层级。
const DEPTH_TO_PROMPT_SCOPE = { year: 'year', month: 'month', day: 'day', hour: 'hour' };
const deeperDepth = (current, next) => (DEPTH_RANK[next] > DEPTH_RANK[current] ? next : current);

const FLOW_KEYS = ['liu-shi', 'liu-ri', 'liu-yue', 'liu-nian', 'da-yun'];

const NON_MAINLAND_PROVINCES = new Set(['香港', '澳门', '台湾', '海外（亚洲）']);

const formatStartSolar = (value) => value?.split(' ')[0]?.replaceAll('-', '.') ?? '—';

// 日历、时辰上的小圆点只看地支（及整柱伏吟、反吟）与本命四柱的关系；
// 天干关系与“破”在选中后的关系列表里完整列出，不占用圆点，避免满屏都是标记。
const readLastChartForm = () => recordToBaziForm(readLastBaziRecord());
const describeSavedForm = (form) => {
    if (!form) return '';
    const hour = form.timeMode === 'unknown'
        ? '时辰不详'
        : form.timeMode === 'exact' && form.clockTime
            ? form.clockTime
            : BAZI_HOUR_OPTIONS.find((option) => option.index === form.hourIndex)?.name ?? '';
    const date = `${form.calendarType === 'lunar' ? '农历' : ''}${form.year}年${form.month < 0 ? '闰' : ''}${Math.abs(form.month)}月${form.day}日`;
    return `${form.personName?.trim() || '未命名'} · ${date} ${hour}`;
};

// 「此刻」按所在地真太阳时：没有设置所在地时就是设备时间。
const nowAtPlace = () => toLocalSolarNow(new Date(), readCurrentPlace());

// 八字页的三步记在浏览器历史里（history.state.baziStep），手机返回键和左上角返回按钮一样逐步后退。
const BAZI_STEPS = ['landing', 'input', 'result'];
const readHistoryStep = () => {
    const step = globalThis.history?.state?.baziStep;
    return BAZI_STEPS.includes(step) ? step : null;
};

const strongestNatalMark = (natalItems, key, label, item) => {
    const relations = findRelations([{ key, label, gan: item.gan, zhi: item.zhi }, ...natalItems], { focusKeys: [key] })
        .filter(({ scope, tone }) => scope !== 'gan' && tone !== 'break');
    if (!relations.length) return null;
    return { tone: relations[0].tone, title: relations[0].title, tones: [...new Set(relations.map(({ tone }) => tone))] };
};

export default function BaziDivination({ onBack, initialRecord = null }) {
    // 从档案打开时直接进入结果页。
    const [initialForm] = useState(() => recordToBaziForm(initialRecord));
    const [lastForm, setLastForm] = useState(() => (initialRecord ? null : readLastChartForm()));
    // 没有从档案打开时，用上一次的生辰预填输入页。
    const prefill = initialForm ?? lastForm;
    const [step, setStep] = useState(() => {
        if (initialForm) return 'result';
        // 从别的页面按返回键回到八字页时，回到离开前的那一步。
        const restored = readHistoryStep();
        return restored && restored !== 'landing' && prefill ? restored : 'landing';
    });
    const initialStepRef = useRef(step);
    const stepIndexRef = useRef(0);
    // 清除「上次的命盘」后先留一份，卷首页可以撤销，避免误触就丢。
    const [forgottenRecord, setForgottenRecord] = useState(null);
    const [calendarType, setCalendarType] = useState(prefill?.calendarType ?? 'solar');
    const [birthYear, setBirthYear] = useState(prefill?.year ?? 1990);
    const [birthMonth, setBirthMonth] = useState(prefill?.month ?? 1);
    const [birthDay, setBirthDay] = useState(prefill?.day ?? 1);
    const [birthHour, setBirthHour] = useState(prefill?.hourIndex ?? 6);
    const [daySect, setDaySect] = useState(prefill?.daySect ?? 2);
    const [yearBoundary, setYearBoundary] = useState(prefill?.yearBoundary ?? 'lichun');
    const [gender, setGender] = useState(prefill?.gender ?? 'male');
    const [personName, setPersonName] = useState(prefill?.personName ?? '');
    const [timeMode, setTimeMode] = useState(prefill?.timeMode ?? 'exact');
    const [clockTime, setClockTime] = useState(prefill?.clockTime ?? '');
    const [placeProvince, setPlaceProvince] = useState(prefill?.placeProvince ?? '');
    const [placeCity, setPlaceCity] = useState(prefill?.placeCity ?? '');
    const [longitude, setLongitude] = useState(prefill?.longitude ?? '');
    const [timezone, setTimezone] = useState(prefill?.timezone ?? 8);
    const [applyTrueSolar, setApplyTrueSolar] = useState(prefill?.applyTrueSolar ?? true);
    // null 表示按出生日期自动判断是否处于夏令时。
    const [dstChoice, setDstChoice] = useState(prefill?.timeMode === 'exact' ? prefill.applyDst : null);
    const [archiveRecords, setArchiveRecords] = useState(() => archiveManager.getRecords());
    const [savePanelOpen, setSavePanelOpen] = useState(false);
    const [saveGroup, setSaveGroup] = useState('self');
    const [saveNote, setSaveNote] = useState('');
    const [saveNotice, setSaveNotice] = useState(null);
    const [resultMode, setResultMode] = useState('basic');
    const [professionalDetail, setProfessionalDetail] = useState(() => {
        try {
            return window.localStorage.getItem('bazi-professional-detail') === 'full' ? 'full' : 'compact';
        } catch {
            return 'compact';
        }
    });
    const [fortuneSelection, setFortuneSelection] = useState({ mode: 'current', daYunIndex: null, liuNianYear: null });
    const [chartAsOf, setChartAsOf] = useState(() => nowAtPlace());
    const [showSelectionDock, setShowSelectionDock] = useState(false);
    const [loading, setLoading] = useState(false);
    const [flowSelection, setFlowSelection] = useState(null);
    const [compareDepth, setCompareDepth] = useState('year');
    // 分享图：点「分享图片」时画好，弹层里长按保存。
    const [shareCard, setShareCard] = useState(null);
    const closeShareCard = useCallback(() => setShareCard(null), []);
    const daYunScrollerRef = useRef(null);
    const professionalSectionRef = useRef(null);
    const liuNianSectionRef = useRef(null);
    const flowSectionRef = useRef(null);
    const zeriSectionRef = useRef(null);
    const wuxingSectionRef = useRef(null);
    const patternSectionRef = useRef(null);
    const liuqinSectionRef = useRef(null);
    const classicsSectionRef = useRef(null);
    const aiSectionRef = useRef(null);
    const glossarySectionRef = useRef(null);
    const calculateTimerRef = useRef(null);
    const stepRegionRef = useRef(null);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1900 + 1 }, (_, index) => 1900 + index);
    const monthOptions = useMemo(() => getBaziMonthOptions(calendarType, birthYear), [calendarType, birthYear]);
    const activeMonth = monthOptions.find((month) => month.value === birthMonth)?.value ?? monthOptions[0]?.value ?? 1;
    const dayCount = getBaziDayCount(calendarType, birthYear, activeMonth);
    const activeDay = Math.min(birthDay, dayCount || 1);
    const days = Array.from({ length: dayCount }, (_, index) => index + 1);
    // 只有出生在立春与正月初一之间，两种年柱分界才有差别，才显示开关。
    const yearBoundaryInfo = useMemo(() => getYearBoundaryInfo(calendarType, birthYear, activeMonth, activeDay), [calendarType, birthYear, activeMonth, activeDay]);
    const clock = useMemo(() => parseClockTime(clockTime), [clockTime]);
    const exactMode = timeMode === 'exact';
    const unknownMode = timeMode === 'unknown';
    const placeCities = BIRTH_PROVINCES.find((item) => item.province === placeProvince)?.cities ?? [];
    const longitudeValue = longitude.trim() === '' ? null : Number(longitude);
    const longitudeInvalid = longitudeValue !== null && (!Number.isFinite(longitudeValue) || longitudeValue < -180 || longitudeValue > 180);
    const cityLongitude = findBirthPlace(placeProvince, placeCity)?.longitude ?? null;
    const placeName = placeCity
        ? (cityLongitude !== null && longitudeValue !== null && Math.abs(cityLongitude - longitudeValue) < 0.005 ? placeCity : `${placeCity}附近`)
        : (longitudeValue !== null ? '自定义经度' : '');

    // 输入页实时预览与结果页共用同一份计算。
    const chartInput = useMemo(() => ({
        calendarType,
        year: birthYear,
        month: activeMonth,
        day: activeDay,
        gender,
        daySect,
        yearBoundary,
        ...(exactMode
            ? {
                timeMode: 'exact',
                clockHour: clock ? clock.hour : null,
                clockMinute: clock ? clock.minute : null,
                longitude: longitudeInvalid ? null : longitudeValue,
                timezone,
                placeName,
                applyTrueSolar,
                applyDst: Boolean(dstChoice),
            }
            : unknownMode
                ? { timeMode: 'unknown' }
                : { hourIndex: birthHour }),
    }), [calendarType, birthYear, activeMonth, activeDay, gender, daySect, yearBoundary, exactMode, unknownMode, clock, longitudeInvalid, longitudeValue, timezone, placeName, applyTrueSolar, dstChoice, birthHour]);

    // 只对按北京时间记录的大陆出生时间自动判断 1986–1991 年夏令时。
    const dstSuggested = useMemo(() => {
        if (!exactMode || !clock || timezone !== 8 || NON_MAINLAND_PROVINCES.has(placeProvince)) return false;
        const date = getClockSolarDate(calendarType, birthYear, activeMonth, activeDay);
        return date ? isChinaDst({ ...date, hour: clock.hour, minute: clock.minute }) : false;
    }, [exactMode, clock, timezone, placeProvince, calendarType, birthYear, activeMonth, activeDay]);
    const applyDst = dstChoice ?? dstSuggested;
    const resolvedChartInput = useMemo(
        () => (exactMode ? { ...chartInput, applyDst } : chartInput),
        [exactMode, chartInput, applyDst],
    );

    const computedChart = useMemo(() => {
        if (step === 'landing' || (exactMode && !clock)) return null;
        try {
            return buildBaziChart(resolvedChartInput, chartAsOf);
        } catch (error) {
            console.error('计算八字失败:', error);
            return null;
        }
    }, [step, exactMode, clock, resolvedChartInput, chartAsOf]);
    const baziResult = step === 'result' ? computedChart : null;
    const timeInfo = computedChart?.timeInfo ?? null;
    const resolvedHourIndex = computedChart?.input?.hourIndex ?? birthHour;
    const selectedHour = BAZI_HOUR_OPTIONS.find((option) => option.index === resolvedHourIndex) ?? BAZI_HOUR_OPTIONS[6];
    const isLateZiHour = resolvedHourIndex === 12;
    const canCalculate = !exactMode || (clock !== null && !longitudeInvalid);
    const baziArchiveCandidates = useMemo(
        () => archiveRecords.map((record) => ({ record, form: recordToBaziForm(record) })).filter(({ form }) => form),
        [archiveRecords],
    );

    // 起运之前的“小运”当作第 0 步，与大运共用同一套选择逻辑。
    const xiaoYunDaYun = useMemo(() => {
        const period = baziResult?.yun?.xiaoYun;
        if (!period) return null;
        return {
            index: 0,
            isXiaoYun: true,
            name: '小运',
            startAge: period.startAge,
            endAge: period.endAge,
            startYear: period.startYear,
            endYear: period.endYear,
            isCurrent: period.years.some((year) => year.isCurrent),
            liuNian: period.years,
        };
    }, [baziResult]);

    const currentDaYun = useMemo(
        () => baziResult?.yun?.dayun?.find((item) => item.isCurrent) ?? (xiaoYunDaYun?.isCurrent ? xiaoYunDaYun : null),
        [baziResult, xiaoYunDaYun],
    );
    const currentLiuNian = baziResult?.yun?.currentLiuNian ?? null;

    const selectedDaYun = useMemo(() => {
        const daYun = baziResult?.yun?.dayun ?? [];
        const manual = fortuneSelection.mode === 'manual'
            ? (fortuneSelection.daYunIndex === 0 ? xiaoYunDaYun : daYun.find((item) => item.index === fortuneSelection.daYunIndex))
            : null;
        return manual
            ?? currentDaYun
            ?? daYun[0]
            ?? null;
    }, [baziResult, currentDaYun, fortuneSelection, xiaoYunDaYun]);

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

    // 对照表、关系与导出里“大运”这一层：起运前用当年的小运干支。
    const daYunPillar = useMemo(() => {
        if (!selectedDaYun?.isXiaoYun) return selectedDaYun;
        const xiaoYun = selectedLiuNian?.xiaoYun;
        return xiaoYun ? { ...xiaoYun, startAge: selectedDaYun.startAge, endAge: selectedDaYun.endAge, startYear: selectedDaYun.startYear, endYear: selectedDaYun.endYear } : null;
    }, [selectedDaYun, selectedLiuNian]);

    const strength = useMemo(() => (baziResult ? analyzeStrength(baziResult) : null), [baziResult]);
    const patternJudge = useMemo(() => {
        if (!baziResult || !strength) return null;
        try {
            return judgeBaziPattern(baziResult, strength);
        } catch (error) {
            console.error('格局初判失败:', error);
            return null;
        }
    }, [baziResult, strength]);
    // 运限（大运、流年、择日）的喜忌依据：认出疑似从、化、专旺的按此格论，否则扶抑。
    const favorBasis = useMemo(() => (strength ? favorBasisOf(strength, patternJudge?.special ?? null) : null), [strength, patternJudge]);
    const liuqin = useMemo(() => {
        if (!baziResult || !strength) return null;
        try {
            return analyzeLiuqin(baziResult, strength, { special: patternJudge?.special ?? null });
        } catch (error) {
            console.error('六亲初判失败:', error);
            return null;
        }
    }, [baziResult, strength, patternJudge]);
    const shenshaContext = baziResult?.shenshaContext ?? null;

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

    const promptSelections = useMemo(() => ({
        daYun: daYunPillar,
        liuNian: selectedLiuNian,
        liuYue: selectedLiuYue,
        liuRi: selectedLiuRi,
        liuShi: selectedLiuShi,
        liuYueList,
        liuRiList,
        liuShiList,
    }), [daYunPillar, selectedLiuNian, selectedLiuYue, selectedLiuRi, selectedLiuShi, liuYueList, liuRiList, liuShiList]);

    const flowColumns = useMemo(() => {
        const rank = DEPTH_RANK[compareDepth];
        const withShensha = (source) => ({ ...source, shensha: getShensha(source, shenshaContext) });
        return [
            rank >= 3 && selectedLiuShi && { key: 'liu-shi', name: '流时', source: withShensha(selectedLiuShi), meta: `${selectedLiuShi.hourName} ${selectedLiuShi.range}` },
            rank >= 2 && selectedLiuRi && { key: 'liu-ri', name: '流日', source: withShensha(selectedLiuRi), meta: `${selectedLiuRi.month}/${selectedLiuRi.day} ${selectedLiuRi.weekdayLabel}` },
            rank >= 1 && selectedLiuYue && { key: 'liu-yue', name: '流月', source: withShensha(selectedLiuYue), meta: `${selectedLiuYue.jieName} ${selectedLiuYue.label}起` },
        ].filter(Boolean);
    }, [compareDepth, selectedLiuShi, selectedLiuRi, selectedLiuYue, shenshaContext]);

    // 关系计算统一使用 { key, label, gan, zhi } 结构。
    const natalItems = useMemo(
        () => (baziResult?.pillars ?? []).map((pillar) => ({ key: pillar.key, label: pillar.name, gan: pillar.gan, zhi: pillar.zhi })),
        [baziResult],
    );
    const fortuneItems = useMemo(() => [
        daYunPillar && { key: 'da-yun', label: daYunPillar.name ?? '大运', gan: daYunPillar.gan, zhi: daYunPillar.zhi },
        selectedLiuNian && { key: 'liu-nian', label: '流年', gan: selectedLiuNian.gan, zhi: selectedLiuNian.zhi },
    ].filter(Boolean), [daYunPillar, selectedLiuNian]);

    const comparisonRelations = useMemo(() => findRelations([
        ...flowColumns.map(({ key, name, source }) => ({ key, label: name, gan: source.gan, zhi: source.zhi })),
        ...fortuneItems,
        ...natalItems,
    ], { focusKeys: FLOW_KEYS }), [flowColumns, fortuneItems, natalItems]);

    // 原局四柱之间的合冲刑害（不含运限）。
    const natalRelations = useMemo(() => findRelations(natalItems), [natalItems]);
    // 古籍库里与本命相关的条目：附进「导出给 AI」的提示词（古籍库按需加载，未加载完就先不附）。
    const { data: classicsData } = useClassicsLibrary('bazi', { enabled: Boolean(baziResult) });
    const classicsContext = useMemo(
        () => (baziResult ? baziContextOf({ chart: baziResult, strength, judge: patternJudge, relations: natalRelations }) : null),
        [baziResult, strength, patternJudge, natalRelations],
    );
    const classicsHits = useMemo(() => {
        if (!classicsData?.library || !classicsContext) return null;
        return matchEntries(classicsData.library, classicsContext);
    }, [classicsData, classicsContext]);
    // 六亲宫星每一亲下面列讲这一亲的古籍（applies 写了 liuqin 的条目，不进上面的总列表）。
    const liuqinClassics = useMemo(() => {
        if (!classicsData?.library || !classicsContext || !liuqin) return null;
        return Object.fromEntries(liuqin.items.map((item) => [item.key, baziLiuqinHits(classicsData.library, classicsContext, item.kind)]));
    }, [classicsData, classicsContext, liuqin]);
    // 词典面板先列这张盘里出现的术语（十神、格局、神煞、旺衰）。
    const glossarySeeds = useMemo(() => (baziResult ? baziGlossarySeeds({ chart: baziResult, judge: patternJudge, strength }) : []), [baziResult, patternJudge, strength]);
    // 本命四柱所见的神煞（去重，按收录顺序），供「神煞查法与出处」先列。
    const natalShenshaNames = useMemo(() => {
        const seen = new Set((baziResult?.pillars ?? []).flatMap((pillar) => pillar.shensha ?? []));
        return SHENSHA_ORDER.filter((name) => seen.has(name));
    }, [baziResult]);

    // 流年按钮上的太岁、岁运并临与喜忌标记；起运前的年份以当年小运为「运」。
    const liuNianMarks = useMemo(() => {
        if (!baziResult) return {};
        return Object.fromEntries(visibleLiuNian.map((liuNian) => [
            liuNian.year,
            getLiuNianMarks(liuNian, { chart: baziResult, daYun: selectedDaYun?.isXiaoYun ? liuNian.xiaoYun : selectedDaYun, strength: favorBasis }),
        ]));
    }, [baziResult, visibleLiuNian, selectedDaYun, favorBasis]);
    const selectedYearMarks = selectedLiuNian ? liuNianMarks[selectedLiuNian.year] ?? null : null;
    // 流年提要：天干十神主题、地支喜忌与太岁标注合成两三句话。
    const selectedYearSummary = useMemo(() => {
        if (!selectedLiuNian || !baziResult) return null;
        try {
            return describeYearSummary(selectedLiuNian, { chart: baziResult, daYun: daYunPillar, strength: favorBasis, marks: selectedYearMarks });
        } catch (error) {
            console.error('流年提要生成失败:', error);
            return null;
        }
    }, [selectedLiuNian, baziResult, daYunPillar, strength, selectedYearMarks]);

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

    useEffect(() => {
        const state = window.history.state ?? {};
        stepIndexRef.current = readHistoryStep() ? Number(state.baziStepIndex) || 0 : 0;
        window.history.replaceState({ ...state, baziStep: initialStepRef.current, baziStepIndex: stepIndexRef.current }, '');
        const handlePopState = (event) => {
            const target = event.state?.baziStep;
            if (!BAZI_STEPS.includes(target)) return;
            stepIndexRef.current = Number(event.state.baziStepIndex) || 0;
            if (calculateTimerRef.current) {
                window.clearTimeout(calculateTimerRef.current);
                calculateTimerRef.current = null;
            }
            setLoading(false);
            setStep(target);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        const refreshPlace = () => setChartAsOf(nowAtPlace());
        window.addEventListener(CURRENT_PLACE_EVENT, refreshPlace);
        return () => window.removeEventListener(CURRENT_PLACE_EVENT, refreshPlace);
    }, []);

    useEffect(() => {
        const refreshArchive = () => setArchiveRecords(archiveManager.getRecords());
        window.addEventListener('archive-updated', refreshArchive);
        return () => window.removeEventListener('archive-updated', refreshArchive);
    }, []);

    const changePlaceProvince = (province) => {
        const cities = BIRTH_PROVINCES.find((item) => item.province === province)?.cities ?? [];
        const onlyCity = cities.length === 1 ? cities[0] : null;
        setPlaceProvince(province);
        setPlaceCity(onlyCity?.name ?? '');
        setLongitude(onlyCity ? onlyCity.longitude.toFixed(2) : '');
        setTimezone(cities[0]?.timezone ?? 8);
    };

    const changePlaceCity = (city) => {
        const place = findBirthPlace(placeProvince, city);
        setPlaceCity(city);
        if (place) {
            setLongitude(place.longitude.toFixed(2));
            setTimezone(place.timezone);
        }
    };

    const applyFormValues = (form) => {
        setPersonName(form.personName);
        setCalendarType(form.calendarType);
        setBirthYear(form.year);
        setBirthMonth(form.month);
        setBirthDay(form.day);
        setBirthHour(form.hourIndex ?? 6);
        setGender(form.gender);
        setDaySect(form.daySect);
        setYearBoundary(form.yearBoundary ?? 'lichun');
        setTimeMode(form.timeMode);
        setClockTime(form.clockTime);
        setPlaceProvince(form.placeProvince);
        setPlaceCity(form.placeCity);
        setLongitude(form.longitude);
        setTimezone(form.timezone);
        setApplyTrueSolar(form.applyTrueSolar);
        setDstChoice(form.timeMode === 'exact' ? form.applyDst : null);
    };

    const applyArchiveRecord = (recordId) => {
        const candidate = baziArchiveCandidates.find(({ record }) => record.id === recordId);
        if (!candidate) return;
        applyFormValues(candidate.form);
        track('archive_prefill', { record_type: candidate.record.type, target: 'bazi' });
    };

    const collectForm = () => ({
        personName,
        calendarType,
        year: birthYear,
        month: activeMonth,
        day: activeDay,
        hourIndex: birthHour,
        gender,
        daySect,
        yearBoundary,
        timeMode,
        clockTime,
        placeProvince,
        placeCity,
        longitude,
        timezone,
        applyTrueSolar,
        applyDst,
    });

    const rememberLastChart = (chart) => {
        if (!chart) return;
        const record = buildBaziRecord(collectForm(), chart, { group: 'self' });
        saveLastBaziRecord(record);
        setLastForm(recordToBaziForm(record));
        setForgottenRecord(null);
    };

    const forgetLastChart = () => {
        setForgottenRecord(readLastBaziRecord());
        clearLastBaziRecord();
        setLastForm(null);
    };

    const undoForgetLastChart = () => {
        if (!forgottenRecord) return;
        saveLastBaziRecord(forgottenRecord);
        setLastForm(recordToBaziForm(forgottenRecord));
        setForgottenRecord(null);
    };

    // 前进到下一步：新增一条历史，返回键能回到上一步。
    const pushStep = (next) => {
        const state = window.history.state ?? {};
        stepIndexRef.current += 1;
        window.history.pushState({
            ...state,
            gushupaiDepth: (state.gushupaiDepth ?? 0) + 1,
            baziStep: next,
            baziPrev: step,
            baziStepIndex: stepIndexRef.current,
        }, '');
        setStep(next);
    };

    // 退回某一步：上一条历史正好是它就用浏览器后退，否则原地改写当前这条，避免历史越堆越多。
    const goBackTo = (wanted) => {
        const state = window.history.state ?? {};
        if (stepIndexRef.current > 0 && state.baziPrev === wanted) {
            window.history.back();
            return;
        }
        window.history.replaceState({ ...state, baziStep: wanted }, '');
        setStep(wanted);
    };

    const handleSaveToArchive = () => {
        if (!baziResult) return;
        const record = buildBaziRecord(collectForm(), baziResult, { group: saveGroup, note: saveNote });
        // 同名、同一张盘已经在档案里（比如从档案打开后再点保存）：更新原来那条，不再重复存一份。
        const existing = findSameBaziRecord(archiveManager.getRecords(), record);
        const saved = existing
            ? archiveManager.updateRecord(existing.id, { group: record.group, note: record.note || existing.note, solarDate: record.solarDate, data: record.data })
            : archiveManager.addRecord(record);
        if (!saved) {
            setSaveNotice({ type: 'error', message: '保存失败，请检查浏览器存储空间后重试。' });
            return;
        }
        setSavePanelOpen(false);
        setSaveNote('');
        setSaveNotice({
            type: 'success',
            message: existing
                ? `档案里已经有「${saved.name}」的这张命盘，已更新分组和备注，没有重复保存。`
                : `已保存「${saved.name}」的八字命盘，可在档案或排盘页「从档案带入」中找到。`,
        });
        track('archive_save', { record_type: 'bazi', time_mode: timeMode, updated: Boolean(existing) });
    };

    // 带生辰参数的链接：发给别人打开即出盘；没有分享面板的设备直接复制。
    const shareChartLink = async () => {
        if (!baziResult) return;
        const url = buildBaziShareUrl(collectForm(), { name: personName });
        if (!url) return;
        const title = `${personName.trim() || '命主'}的八字命盘 · 古书派`;
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
                await navigator.share({ title, url });
                track('bazi_link_share', { channel: 'share', time_mode: timeMode });
                return;
            } catch (error) {
                if (error?.name === 'AbortError') return;
                // 分享面板不可用时改为复制
            }
        }
        const copied = await copyText(url).catch(() => false);
        setSaveNotice(copied
            ? { type: 'success', message: '命盘链接已复制：对方打开就能看到这张盘（链接里只有生辰与称呼，没有档案备注）。' }
            : { type: 'error', message: `复制失败，可以手动复制：${url}` });
        track('bazi_link_share', { channel: copied ? 'copy' : 'manual', time_mode: timeMode });
    };

    // 分享图：四柱、日主旺衰、格局与当前运限画成一张图，手机长按即可保存。
    const openShareCard = () => {
        if (!baziResult) return;
        try {
            const model = buildShareCardModel(baziResult, {
                strength,
                pattern: patternJudge,
                personName,
                daYun: currentDaYun?.isXiaoYun ? currentLiuNian?.xiaoYun ?? null : currentDaYun,
                liuNian: currentLiuNian,
                link: buildBaziShareUrl(collectForm(), { name: personName }),
            });
            const canvas = document.createElement('canvas');
            renderBaziShareCard(canvas, model, { pixelRatio: window.devicePixelRatio || 1 });
            setShareCard({ dataUrl: canvas.toDataURL('image/png'), canvas });
            track('bazi_share_card', { channel: 'open', time_mode: timeMode });
        } catch (error) {
            console.error('生成分享图失败:', error);
            setSaveNotice({ type: 'error', message: '生成分享图失败，可以改用「导出细盘」或系统截图。' });
        }
    };

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

    const resetResultView = () => {
        setSavePanelOpen(false);
        setSaveNotice(null);
        setChartAsOf(nowAtPlace());
        setFortuneSelection({ mode: 'current', daYunIndex: null, liuNianYear: null });
        setFlowSelection(null);
        setCompareDepth('year');
        setShowSelectionDock(false);
        setResultMode('basic');
    };

    const openLastChart = () => {
        if (!lastForm) return;
        applyFormValues(lastForm);
        resetResultView();
        pushStep('result');
    };

    const handleCalculate = () => {
        if (!canCalculate) return;
        if (calculateTimerRef.current) window.clearTimeout(calculateTimerRef.current);
        rememberLastChart(computedChart);
        resetResultView();
        track('bazi_chart', { time_mode: timeMode, calendar: calendarType, true_solar: Boolean(exactMode && applyTrueSolar && longitudeValue !== null) });
        setLoading(true);
        calculateTimerRef.current = window.setTimeout(() => {
            calculateTimerRef.current = null;
            pushStep('result');
            setLoading(false);
        }, 350);
    };

    const handleHeaderBack = () => {
        if (step === 'result') {
            goBackTo('input');
            return;
        }
        if (calculateTimerRef.current) {
            window.clearTimeout(calculateTimerRef.current);
            calculateTimerRef.current = null;
        }
        setLoading(false);
        goBackTo('landing');
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
        setChartAsOf(nowAtPlace());
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
        const daYun = baziResult?.yun?.dayun?.find((item) => item.liuNian.some((liuNian) => liuNian.year === baziYear))
            ?? (xiaoYunDaYun?.liuNian.some((liuNian) => liuNian.year === baziYear) ? xiaoYunDaYun : null);
        if (!daYun) return `${baziYear}年不在本命盘的运限范围内（出生前或超出排列年份）`;
        setFortuneSelection({ mode: 'manual', daYunIndex: daYun.index, liuNianYear: baziYear });
        applyFlowSelection({ baziYear, monthIndex: null, date: ymd, hourIndex: activeFlow?.hourIndex ?? null }, 'day');
        return null;
    };

    const returnFlowToNow = () => {
        setChartAsOf(nowAtPlace());
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
        return (
            <BaziLanding
                onBack={onBack}
                onStart={() => pushStep('input')}
                lastChart={lastForm ? { label: describeSavedForm(lastForm), onOpen: openLastChart, onForget: forgetLastChart } : null}
                forgotten={!lastForm && forgottenRecord ? { label: describeSavedForm(recordToBaziForm(forgottenRecord)), onUndo: undoForgetLastChart } : null}
            />
        );
    }

    return (
        <div className="relative flex flex-1 flex-col overflow-clip bg-[#020b0c] text-[#fbf7ed] print:block print:overflow-visible print:bg-white">
            <div className="pointer-events-none absolute inset-0 overflow-hidden print:hidden" aria-hidden="true">
                <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#175b4f]/25 blur-3xl" />
                <div className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-[#8e231d]/15 blur-3xl" />
            </div>

            <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-[#dcb471]/15 bg-[#020b0c]/80 px-4 pb-3 backdrop-blur-xl print:hidden" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                <button type="button" onClick={handleHeaderBack} disabled={loading} className="inline-flex size-11 items-center justify-center rounded-full border border-[#dcb471]/20 bg-white/[0.03] transition-colors hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8] disabled:cursor-wait disabled:opacity-45" aria-label={step === 'result' ? '返回八字输入' : loading ? '正在排盘，请稍候' : '返回八字卷首'}>
                    <ArrowLeft className="size-5 text-[#f0ce91]" aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-[9px_9px_9px_3px] border border-[#d85a45]/60 bg-gradient-to-br from-[#a92f26] to-[#6f1714] text-[#ffd7bd] shadow-inner"><span className="font-serif text-base font-extrabold" aria-hidden="true">命</span></div>
                    <div>
                        <h1 className="font-serif text-lg font-bold tracking-[0.16em] text-[#fbf7ed]">八字排盘</h1>
                        <p className="text-[11px] tracking-[0.2em] text-[#fbf7ed]/55">四柱命理 · 本地排盘</p>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 px-4 pt-5 print:overflow-visible print:p-0" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                {step === 'input' ? (
                    <div ref={stepRegionRef} tabIndex={-1} role="region" aria-label="八字出生信息输入" className="mx-auto max-w-md animate-in space-y-5 fade-in duration-300 focus:outline-none">
                        <div className="space-y-2 py-2 text-center">
                            <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.28em] text-[#dcb471]/80"><span className="h-px w-8 bg-[#dcb471]/35" />生辰入盘<span className="h-px w-8 bg-[#dcb471]/35" /></div>
                            <h2 className="font-serif text-2xl font-bold tracking-[0.12em] text-[#fbf7ed]">录入生辰</h2>
                            <p className="text-sm leading-6 text-[#fbf7ed]/60">填写出生时间与出生地，按真太阳时排出四柱</p>
                        </div>

                        <section className="space-y-5 rounded-[24px] border border-[#dcb471]/15 bg-[#071719]/85 p-4 shadow-2xl shadow-black/40 sm:p-6" aria-label="八字出生信息">
                            {baziArchiveCandidates.length > 0 && (
                                <div className="space-y-2">
                                    <label htmlFor="bazi-archive" className={INPUT_LABEL_CLASS}><FolderOpen className="size-3.5" aria-hidden="true" /> 从档案带入</label>
                                    <select id="bazi-archive" value="" onChange={(event) => applyArchiveRecord(event.target.value)} className={`${INPUT_FIELD_CLASS} w-full cursor-pointer`}>
                                        <option value="">选择已保存的命例…</option>
                                        {baziArchiveCandidates.map(({ record, form }) => (
                                            <option key={record.id} value={record.id}>
                                                {record.name || '未命名'} · {record.type === 'bazi' ? '八字' : '紫微'} · {form.calendarType === 'lunar' ? '农历' : '公历'}{form.year}-{Math.abs(form.month)}-{form.day}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label htmlFor="bazi-name" className={INPUT_LABEL_CLASS}><User className="size-3.5" aria-hidden="true" /> 命主称呼 <span className="font-normal tracking-normal text-[#fbf7ed]/50">（选填）</span></label>
                                <input id="bazi-name" type="text" value={personName} maxLength={20} onChange={(event) => setPersonName(event.target.value)} placeholder="例如：杨先生" className={`${INPUT_FIELD_CLASS} w-full placeholder:text-[#fbf7ed]/30`} />
                            </div>

                            <div className="space-y-2">
                                <span className={INPUT_LABEL_CLASS}><Calendar className="size-3.5" aria-hidden="true" /> 出生日期</span>
                                <div className={SEGMENT_CLASS} role="group" aria-label="日期类型">
                                    {[{ value: 'solar', label: '阳历' }, { value: 'lunar', label: '农历' }].map((option) => (
                                        <button key={option.value} type="button" onClick={() => changeCalendarType(option.value)} aria-pressed={calendarType === option.value} className={segmentButtonClass(calendarType === option.value)}>{option.label}</button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <select aria-label="出生年份" value={birthYear} onChange={(event) => changeBirthYear(Number(event.target.value))} className={`${INPUT_FIELD_CLASS} cursor-pointer text-center`}>
                                        {years.map((year) => <option key={year} value={year}>{year}年</option>)}
                                    </select>
                                    <select aria-label="出生月份" value={activeMonth} onChange={(event) => changeBirthMonth(Number(event.target.value))} className={`${INPUT_FIELD_CLASS} cursor-pointer text-center`}>
                                        {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                                    </select>
                                    <select aria-label="出生日期" value={activeDay} onChange={(event) => setBirthDay(Number(event.target.value))} className={`${INPUT_FIELD_CLASS} cursor-pointer text-center`}>
                                        {days.map((day) => <option key={day} value={day}>{day}日</option>)}
                                    </select>
                                </div>
                                {calendarType === 'lunar' && <p className={INPUT_HINT_CLASS}>农历月份已按所选年份列出闰月与实际天数。</p>}
                            </div>

                            <div className="space-y-2">
                                <span className={INPUT_LABEL_CLASS}><Clock className="size-3.5" aria-hidden="true" /> 出生时间</span>
                                <div className={SEGMENT_CLASS} role="group" aria-label="出生时间的精确程度">
                                    {[{ value: 'exact', label: '精确到分钟' }, { value: 'shichen', label: '只知道时辰' }, { value: 'unknown', label: '时辰不详' }].map((option) => (
                                        <button key={option.value} type="button" onClick={() => setTimeMode(option.value)} aria-pressed={timeMode === option.value} className={segmentButtonClass(timeMode === option.value)}>{option.label}</button>
                                    ))}
                                </div>

                                {unknownMode ? (
                                    <div className="space-y-1.5 rounded-xl border border-[#dcb471]/15 bg-[#dcb471]/[0.05] p-3">
                                        <p className="text-sm leading-6 text-[#fbf7ed]/85">不知道几点出生也能排：按年、月、日三柱排盘，日主、大运、流年、旺衰与格局照常给出。</p>
                                        <p className={INPUT_HINT_CLASS}>时柱、命宫、身宫不排；起运时间按正午估算，实际交运可能前后相差约两个月。之后问清时辰，重新排一次即可。</p>
                                    </div>
                                ) : exactMode ? (
                                    <div className="space-y-3">
                                        <input id="bazi-clock" type="time" step="60" aria-label="出生时间（钟表时间）" value={clockTime} onChange={(event) => setClockTime(event.target.value)} className={`${INPUT_FIELD_CLASS} w-full text-base tabular-nums`} style={{ colorScheme: 'dark' }} />
                                        <p className={INPUT_HINT_CLASS}>填出生证明或家人记得的钟表时间。只记得大概时，可以先填中间值，再看下方的时辰交界提示。</p>

                                        <div className="space-y-2 rounded-xl border border-[#dcb471]/12 bg-black/20 p-3">
                                            <span className="flex items-center gap-1 text-xs font-bold text-[#dcb471]"><MapPin className="size-3.5" aria-hidden="true" /> 出生地（用于真太阳时）</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                <select aria-label="出生省份" value={placeProvince} onChange={(event) => changePlaceProvince(event.target.value)} className={`${INPUT_FIELD_CLASS} cursor-pointer`}>
                                                    <option value="">选择省份</option>
                                                    {BIRTH_PROVINCES.map((item) => <option key={item.province} value={item.province}>{item.province}</option>)}
                                                </select>
                                                <select aria-label="出生城市" value={placeCity} onChange={(event) => changePlaceCity(event.target.value)} disabled={!placeProvince} className={`${INPUT_FIELD_CLASS} cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}>
                                                    <option value="">选择城市</option>
                                                    {placeCities.map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 items-end gap-2">
                                                <label className="block min-w-0">
                                                    <span className="block text-[11px] text-[#fbf7ed]/60">经度（°E，县区可微调）</span>
                                                    <input type="text" inputMode="decimal" aria-label="出生地经度" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="例如 115.65" aria-invalid={longitudeInvalid} className={`${INPUT_FIELD_CLASS} mt-1 w-full tabular-nums placeholder:text-[#fbf7ed]/30 ${longitudeInvalid ? 'border-[#d85a45]' : ''}`} />
                                                </label>
                                                <label className="block">
                                                    <span className="block text-[11px] text-[#fbf7ed]/60">时区</span>
                                                    <select aria-label="出生地时区" value={timezone} onChange={(event) => setTimezone(Number(event.target.value))} className={`${INPUT_FIELD_CLASS} mt-1 cursor-pointer`}>
                                                        {TIMEZONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                                    </select>
                                                </label>
                                            </div>
                                            {longitudeInvalid && <p className="text-[11px] text-[#ff9c8a]" role="alert">经度请填 -180 到 180 之间的数字，例如 115.65。</p>}
                                            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-[#fbf7ed]/85">
                                                <input type="checkbox" checked={applyTrueSolar && longitudeValue !== null} disabled={longitudeValue === null} onChange={(event) => setApplyTrueSolar(event.target.checked)} className="size-4 accent-[#55bba8]" />
                                                按真太阳时排盘
                                            </label>
                                            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-[#fbf7ed]/85">
                                                <input type="checkbox" checked={applyDst} onChange={(event) => setDstChoice(event.target.checked)} className="size-4 accent-[#55bba8]" />
                                                <span>出生时正实行夏令时{dstSuggested && dstChoice === null ? <span className="ml-1 text-[11px] text-[#55bba8]">（已按 1986–1991 年夏令时自动勾选）</span> : null}</span>
                                            </label>
                                        </div>

                                        {computedChart?.timeInfo?.mode === 'exact' && (
                                            <div className="space-y-1.5 rounded-xl border border-[#55bba8]/25 bg-[#55bba8]/[0.07] p-3" aria-live="polite">
                                                <p className="text-[11px] font-bold tracking-wider text-[#7bd2c0]">换算结果</p>
                                                <p className="text-sm leading-6 text-[#fbf7ed]">
                                                    钟表 {timeInfo.clockTime} → {timeInfo.trueSolarApplied ? '真太阳时' : '按钟表时间'} <b className="tabular-nums">{timeInfo.correctedTime}</b>
                                                    {' · '}{selectedHour.name} · 时柱 <b className="font-serif text-base text-[#f0ce91]">{computedChart.pillars[3].ganZhi}</b>
                                                </p>
                                                <p className="text-[11px] leading-5 text-[#fbf7ed]/60">
                                                    {timeInfo.trueSolarApplied
                                                        ? `经度时差 ${formatSignedMinutes(timeInfo.longitudeMinutes)} · 均时差 ${formatSignedMinutes(timeInfo.equationMinutes)}`
                                                        : '未填出生地经度，不做真太阳时校正'}
                                                    {timeInfo.dstApplied ? ' · 夏令时 −60 分' : ''}
                                                    {timeInfo.correctedDate !== timeInfo.clockDate ? ` · 日期调整为 ${timeInfo.correctedDate}` : ''}
                                                </p>
                                                {timeInfo.boundary && <BoundaryNotice boundary={timeInfo.boundary} tone="dark" />}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <select id="bazi-hour" aria-label="出生时辰" value={birthHour} onChange={(event) => setBirthHour(Number(event.target.value))} className={`${INPUT_FIELD_CLASS} w-full cursor-pointer`}>
                                            {BAZI_HOUR_OPTIONS.map((option) => <option key={option.index} value={option.index}>{option.name}（{option.range}）</option>)}
                                        </select>
                                        <p className={INPUT_HINT_CLASS}>只按时辰排盘时不做真太阳时校正。出生在时辰交界附近（如 6:40–7:20）时，建议改用精确时间。</p>
                                    </>
                                )}
                            </div>

                            {isLateZiHour && (
                                <fieldset className="space-y-2 rounded-xl border border-[#dcb471]/15 bg-[#dcb471]/[0.05] p-3">
                                    <legend className="px-1 text-xs font-bold tracking-wider text-[#dcb471]">子时换日法</legend>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[{ value: 2, label: '晚子不换日', note: '23时仍属当日' }, { value: 1, label: '晚子换次日', note: '23时计入次日' }].map((option) => (
                                            <button key={option.value} type="button" onClick={() => setDaySect(option.value)} aria-pressed={daySect === option.value} className={`min-h-12 rounded-lg border px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8] ${daySect === option.value ? 'border-[#dcb471]/55 bg-[#dcb471]/15 text-[#f0ce91]' : 'border-white/10 bg-black/25 text-[#fbf7ed]/60'}`}>
                                                <span className="block text-xs font-bold">{option.label}</span><span className="mt-0.5 block text-[11px] opacity-75">{option.note}</span>
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                            )}

                            {yearBoundaryInfo?.differs && (
                                <fieldset className="space-y-2 rounded-xl border border-[#dcb471]/15 bg-[#dcb471]/[0.05] p-3">
                                    <legend className="px-1 text-xs font-bold tracking-wider text-[#dcb471]">年柱分界</legend>
                                    <p className="text-[11px] leading-5 text-[#fbf7ed]/60">这个生日在立春与农历正月初一之间，两派年柱不同：按立春为 <b className="font-serif text-[#f0ce91]">{yearBoundaryInfo.lichun}</b>，按正月初一为 <b className="font-serif text-[#f0ce91]">{yearBoundaryInfo.chunjie}</b>。子平法通行以立春换年。</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {YEAR_BOUNDARY_OPTIONS.map((option) => (
                                            <button key={option.value} type="button" onClick={() => setYearBoundary(option.value)} aria-pressed={yearBoundary === option.value} className={`min-h-12 rounded-lg border px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8] ${yearBoundary === option.value ? 'border-[#dcb471]/55 bg-[#dcb471]/15 text-[#f0ce91]' : 'border-white/10 bg-black/25 text-[#fbf7ed]/60'}`}>
                                                <span className="block text-xs font-bold">{option.label}</span><span className="mt-0.5 block text-[11px] opacity-75">{option.note}</span>
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                            )}

                            <fieldset className="space-y-2">
                                <legend className={INPUT_LABEL_CLASS}><User className="size-3.5" aria-hidden="true" /> 性别</legend>
                                <div className="grid grid-cols-2 gap-3">
                                    {[{ value: 'male', symbol: '♂', label: '男命' }, { value: 'female', symbol: '♀', label: '女命' }].map((option) => (
                                        <button key={option.value} type="button" onClick={() => setGender(option.value)} aria-pressed={gender === option.value} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8] ${gender === option.value ? 'border-[#dcb471]/55 bg-[#dcb471]/15 text-[#f0ce91]' : 'border-[#dcb471]/15 bg-[#04191a] text-[#fbf7ed]/55'}`}><span aria-hidden="true">{option.symbol}</span><span className="font-bold">{option.label}</span></button>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="space-y-2">
                                <button type="button" onClick={handleCalculate} disabled={loading || !canCalculate} aria-busy={loading} aria-describedby={canCalculate ? undefined : 'bazi-calc-hint'} className="min-h-[54px] w-full rounded-[15px_15px_15px_5px] border border-[#f0ce91]/45 bg-gradient-to-br from-[#8e231d] to-[#651410] px-4 font-serif text-[17px] font-bold tracking-[0.13em] text-[#ffe0b0] shadow-[0_15px_34px_rgba(67,9,7,0.35)] hover:from-[#a92f26] hover:to-[#741713] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0ce91] disabled:cursor-not-allowed disabled:opacity-50">
                                    {loading ? '排盘中…' : '起命盘'}
                                </button>
                                {!canCalculate && <p id="bazi-calc-hint" className="text-center text-[11px] text-[#fbf7ed]/60">{longitudeInvalid ? '请先改正经度。' : '请填写出生时间，或改选「只知道时辰」。'}</p>}
                            </div>
                        </section>
                    </div>
                ) : (
                    <div ref={stepRegionRef} tabIndex={-1} className="mx-auto max-w-4xl animate-in fade-in duration-300 focus:outline-none print:max-w-none" role="region" aria-label="八字排盘结果">
                        {baziResult ? (
                            <>
                                <article className="overflow-clip rounded-[24px] border border-[#d0c4b2] bg-[#f3ecdf] text-[#302a25] shadow-2xl shadow-black/35 print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
                                    <div className="border-b border-[#c8bba7]/80 bg-[#e7ddcc]/75 px-3 pt-3 sm:px-6 sm:pt-5">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="inline-flex size-9 items-center justify-center rounded-lg border border-[#a33b30]/45 bg-[#a33b30]/[0.06] font-serif text-base font-bold text-[#96372e]" aria-hidden="true">命</span>
                                                <div><p className="font-serif text-lg font-bold tracking-[0.16em] text-[#28231f] sm:text-xl"><span className="print:hidden">四柱命盘</span><span className="hidden print:inline">八字专业细盘</span></p><p className="text-[11px] tracking-[0.2em] text-[#81776b]">古书派 · 本地排盘</p></div>
                                            </div>
                                            <div className="text-right"><p className="text-sm font-bold text-[#96372e]">{personName.trim() ? `${personName.trim()} · ` : ''}{genderLabel}</p><p className="mt-0.5 text-[11px] text-[#81776b]">生肖 {baziResult.lunarInfo.zodiac}</p><p className="mt-0.5 hidden text-[11px] text-[#81776b] print:block">生成日期 {new Date().toLocaleDateString('zh-CN')}</p></div>
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
                                                <div><span className="block text-[11px] text-[#8a8074] sm:text-xs">公历</span><strong className="mt-1 block font-semibold tabular-nums text-[#3c352f]">{baziResult.solarInfo.year}.{baziResult.solarInfo.month}.{baziResult.solarInfo.day}</strong></div>
                                                <div><span className="block text-[11px] text-[#8a8074] sm:text-xs">农历</span><strong className="mt-1 block font-semibold text-[#3c352f]">{baziResult.lunarInfo.yearChinese}年 {baziResult.lunarInfo.monthChinese}月{baziResult.lunarInfo.dayChinese}</strong></div>
                                                {timeInfo?.mode === 'unknown' ? (
                                                    <div><span className="block text-[11px] text-[#8a8074] sm:text-xs">出生时辰</span><strong className="mt-1 block font-semibold text-[#3c352f]">不详 · 按三柱排盘</strong></div>
                                                ) : timeInfo?.mode === 'exact' ? (
                                                    <div><span className="block text-[11px] text-[#8a8074] sm:text-xs">{timeInfo.trueSolarApplied ? '真太阳时' : '出生时间'}</span><strong className="mt-1 block font-semibold tabular-nums text-[#3c352f]">{timeInfo.correctedTime} · {selectedHour.name}</strong></div>
                                                ) : (
                                                    <div><span className="block text-[11px] text-[#8a8074] sm:text-xs">当地钟表时辰</span><strong className="mt-1 block font-semibold text-[#3c352f]">{selectedHour.name} · {selectedHour.range}</strong></div>
                                                )}
                                                <div><span className="block text-[11px] text-[#8a8074] sm:text-xs">日主</span><strong className={`mt-1 block font-semibold ${wuxingText(baziResult.dayMaster.wuxing)}`}>{baziResult.dayMaster.gan}{baziResult.dayMaster.wuxing}{strength ? <span className="text-[#5c544b]"> · {strength.band}</span> : null}</strong></div>
                                            </div>
                                            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                                                {[
                                                    ['胎元', baziResult.extras.taiYuan, baziResult.extras.taiYuanNaYin],
                                                    ['命宫', baziResult.extras.mingGong, baziResult.extras.mingGongNaYin],
                                                    ['身宫', baziResult.extras.shenGong, baziResult.extras.shenGongNaYin],
                                                ].map(([label, ganZhi, naYin]) => (
                                                    <div key={label} className="rounded-lg border border-[#d5c9b8] bg-[#f7f0e5] px-1 py-1.5">
                                                        <dt className="text-[11px] text-[#8a8074]">{label}</dt>
                                                        <dd className="font-serif text-base font-bold text-[#3b342e]">{ganZhi || '—'}</dd>
                                                        <dd className="text-[11px] text-[#81776b]">{naYin || (ganZhi ? '' : '需时辰')}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                            {patternJudge?.pattern && (
                                                <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#514941]">
                                                    <span className="inline-flex items-center rounded-full border border-[#a33b30]/40 bg-[#a33b30]/[0.06] px-2.5 py-0.5 font-serif text-sm font-bold text-[#96372e]">{patternJudge.pattern.name}</span>
                                                    {patternJudge.chengBai && patternJudge.chengBai.verdict !== '待详辨' && <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${CHENG_BAI_CHIP[patternJudge.chengBai.verdict] ?? CHENG_BAI_CHIP.default}`} title={`《子平真诠》成败：${patternJudge.chengBai.summary}`}>格{patternJudge.chengBai.verdict}</span>}
                                                    {patternJudge.special && <span className="inline-flex items-center rounded-full border border-[#b06a1f]/40 bg-[#b06a1f]/[0.08] px-2 py-0.5 text-[11px] font-bold text-[#7f4b12]">{patternJudge.special.name}</span>}
                                                    {patternJudge.traits.filter((item) => item.key !== 'rizuo').slice(0, 3).map((item) => (
                                                        <span key={item.key} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${item.tone === 'good' ? 'border-[#2d6b62]/35 bg-[#2d6b62]/[0.07] text-[#245a52]' : item.tone === 'caution' ? 'border-[#b06a1f]/40 bg-[#b06a1f]/[0.08] text-[#7f4b12]' : 'border-[#cbbfac] text-[#5f574f]'}`}>{item.name}</span>
                                                    ))}
                                                    <button type="button" onClick={() => scrollToSection(patternSectionRef)} className="inline-flex min-h-8 items-center text-[11px] font-bold text-[#2d6b62] underline-offset-2 hover:underline">看格局与组合 ↓</button>
                                                </p>
                                            )}
                                            {strength?.favorable.length > 0 && (
                                                <p className="mt-2 text-xs text-[#514941]">
                                                    喜用参考：<b className="text-[#245a52]">{strength.favorable.map((item) => `${item.element}（${item.role}${item.tiaoHou ? '·调候' : ''}）`).join('、')}</b>
                                                    <button type="button" onClick={() => scrollToSection(wuxingSectionRef)} className="ml-1.5 inline-flex min-h-8 items-center text-[11px] font-bold text-[#2d6b62] underline-offset-2 hover:underline">看依据 ↓</button>
                                                </p>
                                            )}
                                            {patternJudge?.wuxingGap && (
                                                <p className="mt-1 text-xs text-[#514941]">
                                                    {patternJudge.wuxingGap.text}。<span className="text-[#7f4b12]">{patternJudge.wuxingGap.hint}</span>
                                                </p>
                                            )}
                                            <p className="mt-3 text-[11px] leading-5 text-[#8a8074]">
                                                日期按{calendarType === 'solar' ? '阳历' : '农历'}输入 · {genderLabel}
                                                {timeInfo?.mode === 'unknown'
                                                    ? ' · 时辰不详，按年月日三柱排盘，时柱、命宫、身宫未排'
                                                    : timeInfo?.mode === 'exact'
                                                        ? ` · 钟表 ${timeInfo.clockTime}${timeInfo.dstApplied ? '（已扣夏令时）' : ''}${timeInfo.trueSolarApplied ? ` · 已按${timeInfo.placeName || '出生地'}（东经 ${Number(timeInfo.longitude).toFixed(2)}°）校正真太阳时` : ' · 未校正真太阳时'}`
                                                        : ' · 按时辰排盘，未校正真太阳时'}
                                                {isLateZiHour ? ` · ${daySect === 1 ? '晚子换次日' : '晚子不换日'}` : ''}
                                                {baziResult.yearBoundary?.differs ? ` · 年柱按${baziResult.yearBoundary.mode === 'chunjie' ? '正月初一' : '立春'}换年（按${baziResult.yearBoundary.mode === 'chunjie' ? '立春' : '正月初一'}则为${baziResult.yearBoundary.mode === 'chunjie' ? baziResult.yearBoundary.lichun : baziResult.yearBoundary.chunjie}）` : ''}
                                            </p>
                                            {timeInfo?.boundary && (
                                                <div className="mt-2.5">
                                                    <BoundaryNotice boundary={timeInfo.boundary} currentDayGanZhi={baziResult.pillars[2].ganZhi} tone="paper" />
                                                </div>
                                            )}
                                            <nav className="mt-3 flex flex-wrap gap-1.5 print:hidden" aria-label="跳转到命盘各部分">
                                                {[
                                                    ['四柱', professionalSectionRef],
                                                    ['五行旺衰', wuxingSectionRef],
                                                    ['格局组合', patternSectionRef],
                                                    ['六亲', liuqinSectionRef],
                                                    ['古籍', classicsSectionRef],
                                                    ['大运流年', liuNianSectionRef],
                                                    ['流月流日', flowSectionRef],
                                                    ['择日', zeriSectionRef],
                                                    ['导出给 AI', aiSectionRef],
                                                    ['词典', glossarySectionRef],
                                                ].map(([label, ref]) => (
                                                    <button key={label} type="button" onClick={() => scrollToSection(ref)} className="inline-flex min-h-9 items-center rounded-full border border-[#b9ad98] bg-[#fffaf0]/70 px-3 text-xs font-bold text-[#5f574f] hover:border-[#2d6b62] hover:text-[#2d6b62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">{label}</button>
                                                ))}
                                            </nav>
                                        </section>

                                        <section ref={professionalSectionRef} tabIndex={-1} className="scroll-mt-4 px-2 py-5 focus:outline-none sm:px-6 sm:py-6" aria-labelledby="bazi-pillars-title">
                                            <div id="bazi-pillars-title" className="px-1 print:hidden sm:px-0">
                                                <SectionHeading
                                                    seal="壹"
                                                    title={resultMode === 'professional' ? '专业运限同参' : '四柱八字'}
                                                    note={resultMode === 'professional'
                                                        ? '所选运限（流时、流日、流月、流年、大运）与本命四柱并列对照；横向滑动查看完整命盘'
                                                        : '主星、干支、藏干十神、纳音与神煞'}
                                                    icon={Sparkles}
                                                />
                                            </div>
                                            <div className="print:hidden">
                                                {resultMode === 'professional' ? (
                                                    <>
                                                        {/* 吸顶工具栏：在对照表与关系列表中滚动时一直可调。 */}
                                                        <div className="sticky top-2 z-40 mt-3 rounded-xl border border-[#cbbfac] bg-[#ece3d4]/95 p-2.5 shadow-md shadow-[#4c3e2e]/10 backdrop-blur sm:p-3">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <span className="text-[11px] text-[#81776b]">正在对照</span>
                                                                    <p className="truncate text-sm font-bold text-[#3b342e]" title={selectionSummary}>{selectionSummary}</p>
                                                                </div>
                                                                <div className="flex shrink-0 gap-1.5">
                                                                    <button type="button" onClick={() => scrollToSection(liuNianSectionRef)} className="inline-flex min-h-11 items-center rounded-lg border border-[#9f917c] bg-[#fffaf0]/70 px-2.5 text-xs font-bold text-[#5f574f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">换流年 ↓</button>
                                                                    <button type="button" onClick={returnToCurrentFortune} disabled={!currentDaYun || !currentLiuNian} className="inline-flex min-h-11 items-center rounded-lg bg-[#2d6b62] px-2.5 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa] disabled:cursor-default disabled:bg-[#9b9489]">
                                                                        {isViewingCurrentFortune ? '刷新今年' : '回到今年'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 flex items-center gap-2 border-t border-[#c8bba7]/70 pt-2">
                                                                <div className="grid flex-1 grid-cols-4 rounded-lg border border-[#b9ad98] bg-[#f7f0e5] p-0.5" role="group" aria-label="对照到哪一层运限">
                                                                    {COMPARE_DEPTHS.map((option) => (
                                                                        <button key={option.value} type="button" aria-pressed={compareDepth === option.value} onClick={() => setCompareDepth(option.value)} className={`min-h-11 rounded-md px-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${compareDepth === option.value ? 'bg-[#2d6b62] text-white' : 'text-[#6f665d]'}`}>
                                                                            {option.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <button type="button" aria-pressed={professionalDetail === 'full'} onClick={() => setProfessionalDetail((value) => (value === 'full' ? 'compact' : 'full'))} className={`min-h-11 shrink-0 rounded-lg border px-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${professionalDetail === 'full' ? 'border-[#2d6b62] bg-[#2d6b62] text-white' : 'border-[#b9ad98] bg-[#f7f0e5] text-[#6f665d]'}`}>
                                                                    {professionalDetail === 'full' ? '完整 ✓' : '完整'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p id="bazi-professional-scroll-tip" className="mt-2 px-1 text-[11px] leading-5 text-[#81776b]">可左右滑动查看运限与四柱；打开「完整」显示纳音、星运、自坐、空亡与神煞。具体日期时辰在下方「流月 · 流日 · 流时」中点选。</p>
                                                        <ProfessionalComparisonTable
                                                            pillars={baziResult.pillars}
                                                            daYun={daYunPillar}
                                                            liuNian={selectedLiuNian}
                                                            flowColumns={flowColumns}
                                                            detail={professionalDetail}
                                                            describedBy="bazi-professional-scroll-tip"
                                                        />
                                                        <div className="mt-4 rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/55 p-3">
                                                            <p className="flex items-center gap-1.5 text-sm font-bold text-[#514941]">
                                                                <Link2 className="size-4 text-[#2d6b62]" aria-hidden="true" />合冲刑害
                                                                <span className="text-[11px] font-normal text-[#81776b]">运限各层与命局之间的干支关系</span>
                                                            </p>
                                                            <RelationList relations={comparisonRelations} emptyText="所选运限与命局之间没有明显的合冲刑害。" />
                                                        </div>
                                                        <details className="mt-3 overflow-hidden rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/55">
                                                            <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 text-sm font-bold text-[#514941] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2d6b62]">
                                                                原局内部的合冲刑害 <span className="text-xs font-normal text-[#81776b]">{natalRelations.length ? `${natalRelations.length} 条` : '无'}</span>
                                                            </summary>
                                                            <div className="border-t border-[#cbbfac]/70 px-3 pb-3">
                                                                <RelationList relations={natalRelations} emptyText="原局四柱之间没有明显的合冲刑害。" />
                                                            </div>
                                                        </details>
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
                                                        <details className="mt-3 overflow-hidden rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/55">
                                                            <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 text-sm font-bold text-[#514941] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2d6b62]">
                                                                神煞查法与出处 <span className="text-xs font-normal text-[#81776b]">{natalShenshaNames.length ? `本命见 ${natalShenshaNames.length} 种` : '本命未见'}</span>
                                                            </summary>
                                                            <div className="border-t border-[#cbbfac]/70 px-3 py-3">
                                                                <p className="text-[11px] leading-5 text-[#81776b]">查法沿用{cite('sanming')}等古籍口诀，与通行排盘一致；有流派差异的在条目里注明。先列本命所见，再列其余。</p>
                                                                <dl className="mt-2 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
                                                                    {[...natalShenshaNames, ...SHENSHA_ORDER.filter((name) => !natalShenshaNames.includes(name))].map((name) => {
                                                                        const source = SHENSHA_SOURCES[name];
                                                                        if (!source) return null;
                                                                        const present = natalShenshaNames.includes(name);
                                                                        return (
                                                                            <div key={name} className={present ? '' : 'opacity-70'}>
                                                                                <dt className="text-xs font-bold text-[#2d6b62]">{name}{present ? <span className="ml-1 rounded border border-[#2d6b62]/40 px-1 text-[10px] font-normal text-[#245a52]">本命</span> : null} <span className="font-normal text-[#81776b]">{cite(source.classic, source.section)}</span></dt>
                                                                                <dd className="mt-0.5 text-[11px] leading-5 text-[#6f665d]">{source.rule}{source.quote ? <span className="block text-[#514941]">口诀：{source.quote}</span> : null}{source.variant ? <span className="block">{source.variant}</span> : null}</dd>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </dl>
                                                            </div>
                                                        </details>
                                                    </>
                                                ) : (
                                                    <>
                                                        <PillarTable pillars={baziResult.pillars} />
                                                        <div className="mt-3 rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/55 p-3">
                                                            <p className="flex items-center gap-1.5 text-sm font-bold text-[#514941]">
                                                                <Link2 className="size-4 text-[#2d6b62]" aria-hidden="true" />原局合冲刑害
                                                                <span className="text-[11px] font-normal text-[#81776b]">四柱之间的干支关系，吉凶需结合喜忌</span>
                                                            </p>
                                                            <RelationList relations={natalRelations} emptyText="原局四柱之间没有明显的合冲刑害。" initialCount={4} />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div className="hidden print:block">
                                                <SectionHeading seal="壹" title="专业运限同参" note="所选运限与本命四柱并列对照" icon={Sparkles} />
                                                <ProfessionalComparisonTable
                                                    pillars={baziResult.pillars}
                                                    daYun={daYunPillar}
                                                    liuNian={selectedLiuNian}
                                                    flowColumns={flowColumns}
                                                    detail="full"
                                                />
                                            </div>
                                        </section>

                                        <section ref={wuxingSectionRef} tabIndex={-1} className="scroll-mt-4 px-3 py-5 focus:outline-none sm:px-6 sm:py-6" aria-labelledby="wuxing-title">
                                            <div id="wuxing-title"><SectionHeading seal="贰" title="五行与旺衰" note="计入藏干的五行力量、日主强弱与喜用参考（程序估算）" icon={Scale} /></div>
                                            {strength && <BaziStrengthPanel strength={strength} surfaceCounts={baziResult.surfaceWuxingCount} dayMaster={baziResult.dayMaster} special={patternJudge?.special ?? null} />}
                                        </section>

                                        {patternJudge && (
                                            <section ref={patternSectionRef} tabIndex={-1} className="scroll-mt-4 px-3 py-5 focus:outline-none sm:px-6 sm:py-6" aria-labelledby="pattern-title">
                                                <div id="pattern-title"><SectionHeading seal="叁" title="格局与命局组合" note="月令取格、常见十神组合与五行缺失（程序初判，仅供参考）" icon={Compass} /></div>
                                                <BaziPatternPanel judge={patternJudge} />
                                            </section>
                                        )}

                                        {liuqin && (
                                            <section ref={liuqinSectionRef} tabIndex={-1} className="scroll-mt-4 px-3 py-5 focus:outline-none sm:px-6 sm:py-6" aria-labelledby="liuqin-title">
                                                <div id="liuqin-title"><SectionHeading seal="肆" title="六亲宫星" note="配偶、子女、父母、兄弟：六亲星与宫位的喜忌、透藏与冲合（程序初判，仅供参考）" icon={Users} /></div>
                                                <BaziLiuqinPanel liuqin={liuqin} classics={liuqinClassics} />
                                            </section>
                                        )}

                                        <section ref={classicsSectionRef} tabIndex={-1} className="scroll-mt-4 px-3 py-5 focus:outline-none sm:px-6 sm:py-6" aria-labelledby="classics-title">
                                            <div id="classics-title"><SectionHeading seal="伍" title="古籍原文" note="按这张盘的格局、十神、神煞与日干月令，从源头古籍里找出相关原文，原文与白话可切换（古籍库逐篇录入中）" icon={BookOpen} /></div>
                                            <BaziClassicsPanel chart={baziResult} strength={strength} judge={patternJudge} relations={natalRelations} />
                                        </section>

                                        {baziResult.yun?.dayun?.length > 0 && (
                                            <section ref={liuNianSectionRef} tabIndex={-1} className="scroll-mt-4 px-3 py-5 focus:outline-none sm:px-6 sm:py-6" aria-labelledby="dayun-title">
                                                <div id="dayun-title"><SectionHeading seal="陆" title="大运流年" note="点击大运与流年可联动上方专业细盘；交运年份可能跨两步大运" icon={TrendingUp} /></div>
                                                <div className="mt-4 rounded-xl border border-[#cbbfac]/75 bg-[#e9dfcd]/45 px-3 py-2.5 text-[11px] leading-5 text-[#655d54] sm:text-xs">
                                                    <span className="font-semibold text-[#2d6b62]">{baziResult.yun.forward ? '顺排' : '逆排'}</span><span className="mx-2 text-[#a79b8a]" aria-hidden="true">·</span>
                                                    出生后 {baziResult.yun.startYear}年{baziResult.yun.startMonth}月{baziResult.yun.startDay}天{baziResult.yun.startHour ? `${baziResult.yun.startHour}小时` : ''}起运
                                                    <span className="mx-2 text-[#a79b8a]" aria-hidden="true">·</span>交运 {formatStartSolar(baziResult.yun.startSolar)}
                                                    {baziResult.yun.estimated && <span className="ml-2 text-[#7f4b12]">时辰不详，按正午估算，实际交运可能前后相差约两个月</span>}
                                                </div>
                                                <div ref={daYunScrollerRef} className="-mx-3 mt-2 overflow-x-auto px-3 pb-2 pt-2.5 print:hidden sm:-mx-6 sm:px-6" aria-label="大运时间轴">
                                                    <div className="flex w-max min-w-full snap-x gap-2">
                                                        {[...(xiaoYunDaYun ? [xiaoYunDaYun] : []), ...baziResult.yun.dayun].map((daYun) => {
                                                            const isSelected = selectedDaYun?.index === daYun.index;
                                                            const favor = daYun.isXiaoYun ? null : getDaYunMarks(daYun, { strength: favorBasis, chart: baziResult }).favor;
                                                            return (
                                                                <button key={daYun.index} data-dayun-index={daYun.index} type="button" aria-pressed={isSelected} aria-expanded={isSelected} onClick={() => selectDaYun(daYun)} className={`relative min-h-[5.75rem] w-[5.6rem] shrink-0 snap-start overflow-hidden rounded-xl border px-2 py-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3ecdf] ${isSelected ? 'border-[#a33b30] bg-[#fffaf0] shadow-sm' : daYun.isCurrent ? 'border-[#2d6b62]/70 bg-[#2d6b62]/[0.07]' : 'border-[#cbbfac] bg-[#f8f1e6] hover:border-[#9e8f7a]'}`}>
                                                                    {daYun.isCurrent && <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#2d6b62] px-1.5 py-0.5 text-[10px] font-bold leading-4 text-white">当前</span>}
                                                                    <span className="block text-[11px] tabular-nums text-[#81776b]">{daYun.startAge}-{daYun.endAge}虚岁</span><span className="mt-1 block font-serif text-xl font-bold tracking-[0.12em] text-[#3b342e]">{daYun.isXiaoYun ? '小运' : daYun.ganZhi}</span><span className="mt-1 block text-[11px] tabular-nums text-[#81776b]">{daYun.startYear}-{daYun.endYear}</span>
                                                                    {favor?.cover?.kind === '截脚' && <span className="absolute right-1 top-1 text-[10px] font-bold leading-none text-[#a33b30]" aria-hidden="true" data-testid="bazi-dayun-jiejiao">截</span>}
                                                                    {favor && (
                                                                        <span className="absolute inset-x-0 bottom-0 flex h-1" role="img" aria-label={`天干${favor.gan.element}${FAVOR_TEXT[favor.gan.tone]}，${zhiFavorText(daYun.zhi, favor.zhi)}${FAVOR_TEXT[favor.zhi.tone]}${favor.cover ? `；${favor.cover.text}` : ''}`}>
                                                                            <span className={`flex-1 ${FAVOR_CLASS[favor.gan.tone]}`} /><span className={`flex-1 ${FAVOR_CLASS[favor.zhi.tone]}`} />
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <p className="text-[11px] leading-5 text-[#81776b] print:hidden">
                                                    卡片底边左半为天干、右半为地支对日主的
                                                    <span className="mx-1 inline-block size-2 rounded-sm bg-[#2d6b62] align-middle" aria-hidden="true" />喜
                                                    <span className="mx-1 inline-block size-2 rounded-sm bg-[#a33b30] align-middle" aria-hidden="true" />忌
                                                    <span className="mx-1 inline-block size-2 rounded-sm bg-[#b9ad98] align-middle" aria-hidden="true" />平；地支与原局凑齐三会方、三合局的，按局的五行论。流年右上角的圆点同理。大运的运干坐库的（丙戌、癸丑之类，库里藏着运干的同类），运支随运干论（任注「癸丑北方湿土，亦作水论」）。运以地支为重：运干是喜、运支是忌又克运干的（截脚，任注「支不载干，则十年皆否」），右上角标<span className="mx-0.5 font-bold text-[#a33b30]">截</span>，整步运按忌论。
                                                    {favorBasis?.source === 'special' && (
                                                        <span className="block text-[#7f4b12]" data-testid="bazi-favor-basis">此盘{favorBasis.specialName}，大运流年与择日的喜忌按此格论（顺其气势为吉）；若不成格，以「五行与旺衰」一节的扶抑喜忌为准。</span>
                                                    )}
                                                </p>
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
                                                            <div><p className="text-sm font-bold text-[#3b342e]">{selectedDaYun.isXiaoYun ? '起运前 · 小运与流年' : `${selectedDaYun.ganZhi}大运 · 流年`}</p><p className="mt-0.5 text-[11px] text-[#81776b]">{selectedDaYun.startAge}-{selectedDaYun.endAge}虚岁</p></div>
                                                            <div className="flex items-center gap-2">
                                                                {selectedDaYun.isCurrent && <span className="rounded-full bg-[#2d6b62]/10 px-2 py-1 text-[11px] font-bold text-[#2d6b62]">{selectedDaYun.isXiaoYun ? '当前所行小运' : '当前所行大运'}</span>}
                                                                <button type="button" onClick={viewProfessionalSelection} className="hidden min-h-11 rounded-lg bg-[#2d6b62] px-3 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa] sm:inline-flex sm:items-center">查看专业盘 ↑</button>
                                                            </div>
                                                        </div>
                                                        <ul className="mt-3 grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-5">
                                                            {visibleLiuNian.map((liuNian) => {
                                                                const isSelected = selectedLiuNian?.year === liuNian.year;
                                                                const marks = liuNianMarks[liuNian.year];
                                                                const favorTone = marks?.favor?.overall;
                                                                return (
                                                                    <li key={liuNian.year}>
                                                                        <button
                                                                            type="button"
                                                                            aria-pressed={isSelected}
                                                                            onClick={() => selectLiuNian(liuNian)}
                                                                            aria-label={`${liuNian.year}年 ${liuNian.ganZhi}${marks?.labels?.length ? `，${marks.labels.join('、')}` : ''}${favorTone && favorTone !== 'neutral' ? `，${FAVOR_TEXT[favorTone]}` : ''}`}
                                                                            className={`relative min-h-12 w-full rounded-lg border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${isSelected
                                                                                ? 'border-[#a33b30] bg-[#a33b30]/[0.08] shadow-sm'
                                                                                : liuNian.isCurrent
                                                                                    ? 'border-[#2d6b62]/60 bg-[#2d6b62]/[0.06]'
                                                                                    : 'border-[#d5c9b8] bg-[#f7f0e5] hover:border-[#a99b87]'
                                                                            }`}
                                                                        >
                                                                            {liuNian.isCurrent && <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#2d6b62] px-1.5 text-[10px] font-bold leading-4 text-white">今年</span>}
                                                                            {favorTone && favorTone !== 'neutral' && <span className={`absolute right-1.5 top-1.5 size-2 rounded-full ${FAVOR_CLASS[favorTone]}`} aria-hidden="true" />}
                                                                            <span className="block text-[11px] tabular-nums text-[#81776b]">{liuNian.year} · {liuNian.age}虚岁</span>
                                                                            <span className="mt-0.5 block font-serif text-base font-bold text-[#3b342e]">{liuNian.ganZhi}</span>
                                                                            {resultMode === 'professional' && <span className="mt-0.5 block text-[11px] text-[#2d6b62]">{liuNian.ganShiShen}</span>}
                                                                            {liuNian.xiaoYun && <span className="mt-0.5 block text-[11px] text-[#81776b]">小运 {liuNian.xiaoYun.ganZhi}</span>}
                                                                            {marks?.badge && <span className={`mt-1 inline-block rounded px-1 text-[10px] font-bold leading-4 ${YEAR_BADGE_CLASS[marks.badgeTone] ?? 'bg-[#8a8074] text-white'}`}>{marks.badge}</span>}
                                                                        </button>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                        {selectedLiuNian && selectedYearMarks && (
                                                            <p className="mt-3 rounded-lg bg-[#e9dfcd]/50 px-3 py-2 text-xs leading-5 text-[#514941]">
                                                                <b className="font-serif text-[#3b342e]">{selectedLiuNian.year} {selectedLiuNian.ganZhi}流年</b>：{describeYearMarks(selectedLiuNian, selectedYearMarks) || '与本命年支、日柱没有特别的冲合'}
                                                            </p>
                                                        )}
                                                        {selectedYearSummary && (
                                                            <div className={`mt-2 rounded-lg border px-3 py-2 ${YEAR_SUMMARY_CLASS[selectedYearSummary.tone] ?? YEAR_SUMMARY_CLASS.neutral}`} data-testid="bazi-year-summary">
                                                                <p className="font-serif text-sm font-bold tracking-wide">流年提要 · {selectedYearSummary.headline}</p>
                                                                <p className="mt-1 text-xs leading-5 text-[#514941]">{selectedYearSummary.text}</p>
                                                                <p className="mt-1 text-[11px] leading-4 text-[#81776b]">按流年天干十神、地支喜忌与太岁标注自动合成，是提示方向，不是断语。</p>
                                                            </div>
                                                        )}
                                                        {visibleLiuNian.length > selectedDaYun.liuNian.length && (
                                                            <p className="mt-2 text-[11px] leading-5 text-[#81776b]">当前流年跨越交运节点，已与本步大运的十个标称年份一并显示。</p>
                                                        )}
                                                    </div>
                                                )}
                                                {selectedDaYun && (
                                                    <div className="mt-2 hidden print:block">
                                                        <p className="mb-1 text-[11px] font-bold text-[#3b342e]">{selectedDaYun.ganZhi}大运流年对照</p>
                                                        <div className="grid grid-cols-10 border-l border-t border-[#b9ad98]">
                                                            {visibleLiuNian.map((liuNian) => (
                                                                <div key={`print-year-${liuNian.year}`} className={`border-b border-r border-[#b9ad98] px-0.5 py-1 text-center ${selectedLiuNian?.year === liuNian.year ? 'bg-[#a33b30]/[0.07]' : ''}`}>
                                                                    <span className="block text-[6px] text-[#81776b]">{liuNian.year}</span>
                                                                    <strong className="block font-serif text-[11px] text-[#3b342e]">{liuNian.ganZhi}</strong>
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
                                                <div id="flow-title"><SectionHeading seal="柒" title="流月 · 流日 · 流时" note="在所选流年内细看某月、某天、某个时辰；点选后上方专业盘同步加列" icon={CalendarDays} /></div>
                                                <PlaceSetting tone="paper" now={new Date()} className="mt-3" />
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

                                        <section ref={zeriSectionRef} tabIndex={-1} className="scroll-mt-4 px-3 py-5 focus:outline-none print:hidden sm:px-6 sm:py-6" aria-labelledby="zeri-title">
                                            <div id="zeri-title"><SectionHeading seal="捌" title="择日参考" note="选一类事务，按黄历宜忌与这张盘的喜忌、合冲，列出近期较宜与需避开的日子（程序初选）" icon={CalendarCheck} /></div>
                                            <BaziDatePicker
                                                chart={baziResult}
                                                strength={favorBasis}
                                                now={chartAsOf}
                                                personName={personName}
                                                onJumpToDate={(date) => {
                                                    const error = jumpToFlowDate(date);
                                                    if (error) {
                                                        setSaveNotice({ type: 'error', message: error });
                                                        return;
                                                    }
                                                    scrollToSection(flowSectionRef);
                                                }}
                                                onCopy={copyText}
                                            />
                                        </section>

                                        <section ref={aiSectionRef} tabIndex={-1} className="scroll-mt-4 px-3 py-5 focus:outline-none print:hidden sm:px-6 sm:py-6" aria-labelledby="ai-export-title">
                                            <div id="ai-export-title"><SectionHeading seal="玖" title="导出给 AI" note="把命盘和所选时段整理成提示词，复制后粘贴给 ChatGPT、Claude 等 AI 直接分析" icon={Bot} /></div>
                                            <BaziPromptExport
                                                chart={baziResult}
                                                personName={personName}
                                                selections={promptSelections}
                                                defaultScope={DEPTH_TO_PROMPT_SCOPE[compareDepth]}
                                                now={chartAsOf}
                                                classics={classicsHits}
                                                liuqinClassics={liuqinClassics}
                                                onLocateNow={returnFlowToNow}
                                                onPickTime={() => scrollToSection(flowSectionRef)}
                                            />
                                        </section>

                                        <section ref={glossarySectionRef} tabIndex={-1} className="scroll-mt-4 px-3 py-5 focus:outline-none print:hidden sm:px-6 sm:py-6" aria-labelledby="glossary-title">
                                            <div id="glossary-title"><SectionHeading seal="拾" title="术语词典" note="看不懂的名词在这里查：先列这张盘里出现的十神、格局、神煞，也能搜任何术语" icon={BookA} /></div>
                                            <GlossaryPanel module="bazi" seedTerms={glossarySeeds} subject="这张盘" testId="bazi-glossary" />
                                        </section>
                                    </div>
                                </article>

                                <div className="mt-4 grid grid-cols-2 gap-2 print:hidden sm:grid-cols-5 sm:gap-3">
                                    <button type="button" onClick={() => goBackTo('input')} className="min-h-11 rounded-xl border border-[#dcb471]/40 px-2 text-sm font-bold text-[#f0ce91] hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]">重新排盘</button>
                                    <button type="button" onClick={() => { setSavePanelOpen((open) => !open); setSaveNotice(null); }} aria-expanded={savePanelOpen} aria-controls="bazi-save-panel" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#dcb471]/40 px-2 text-sm font-bold text-[#f0ce91] hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]"><Save className="size-4" aria-hidden="true" />存入档案</button>
                                    <button type="button" onClick={shareChartLink} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#dcb471]/40 px-2 text-sm font-bold text-[#f0ce91] hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]"><Share2 className="size-4" aria-hidden="true" />分享链接</button>
                                    <button type="button" onClick={openShareCard} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#dcb471]/40 px-2 text-sm font-bold text-[#f0ce91] hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]"><ImageDown className="size-4" aria-hidden="true" />分享图片</button>
                                    <button type="button" onClick={() => window.print()} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#2d6b62] px-2 text-sm font-bold text-white hover:bg-[#245a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa] sm:col-span-1"><Printer className="size-4" aria-hidden="true" />导出细盘</button>
                                </div>
                                <BaziShareCardModal card={shareCard} personName={personName} onClose={closeShareCard} onTrack={(channel) => track('bazi_share_card', { channel, time_mode: timeMode })} />
                                {savePanelOpen && (
                                    <form id="bazi-save-panel" onSubmit={(event) => { event.preventDefault(); handleSaveToArchive(); }} className="mt-3 space-y-3 rounded-2xl border border-[#dcb471]/20 bg-[#071719]/90 p-4 print:hidden">
                                        <p className="font-serif text-base font-bold tracking-wider text-[#fbf7ed]">存入档案 · {personName.trim() || '未命名'}</p>
                                        <label className="block">
                                            <span className="text-xs font-bold text-[#dcb471]">命主称呼</span>
                                            <input type="text" value={personName} maxLength={20} onChange={(event) => setPersonName(event.target.value)} placeholder="例如：杨先生" className={`${INPUT_FIELD_CLASS} mt-1 w-full placeholder:text-[#fbf7ed]/30`} />
                                        </label>
                                        <fieldset>
                                            <legend className="text-xs font-bold text-[#dcb471]">分组</legend>
                                            <div className="mt-1.5 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                                                {ARCHIVE_GROUP_OPTIONS.map((option) => (
                                                    <button key={option.value} type="button" aria-pressed={saveGroup === option.value} onClick={() => setSaveGroup(option.value)} className={`min-h-11 rounded-lg border px-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8] ${saveGroup === option.value ? 'border-[#dcb471]/55 bg-[#dcb471]/15 text-[#f0ce91]' : 'border-white/10 bg-black/20 text-[#fbf7ed]/60'}`}>{option.label}</button>
                                                ))}
                                            </div>
                                        </fieldset>
                                        <label className="block">
                                            <span className="text-xs font-bold text-[#dcb471]">备注（选填）</span>
                                            <input type="text" value={saveNote} maxLength={60} onChange={(event) => setSaveNote(event.target.value)} placeholder="例如：出生时间是母亲回忆的 7 点多" className={`${INPUT_FIELD_CLASS} mt-1 w-full placeholder:text-[#fbf7ed]/30`} />
                                        </label>
                                        <button type="submit" className="min-h-11 w-full rounded-xl bg-[#2d6b62] text-sm font-bold text-white hover:bg-[#245a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa]">保存</button>
                                    </form>
                                )}
                                {saveNotice && (
                                    <p role={saveNotice.type === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-5 print:hidden ${saveNotice.type === 'error' ? 'border-[#d85a45]/45 bg-[#d85a45]/10 text-[#ffb4a6]' : 'border-[#55bba8]/40 bg-[#55bba8]/10 text-[#9fe0d2]'}`}>{saveNotice.message}</p>
                                )}
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
                                                <span className="block text-[11px] font-medium text-[#81776b]">已选择</span>
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
