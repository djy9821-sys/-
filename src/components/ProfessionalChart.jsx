
import React, { useMemo } from 'react';
import {
    CHARACTER_PROMPT_TAIL,
    CHARACTER_PROMPT_TEMPLATE,
    WEALTH_PROMPT_TEMPLATE,
    MARRIAGE_PROMPT_TEMPLATE,
    generateChartDataPrompt,
    generateFortunePromptText,
    generateBabyPrompt
} from '../utils/aiPrompts';
import { findBestConceptionDates } from '../utils/babySelector';
import { track } from '../utils/analytics';
import {
    birthLunarYearOf,
    buildCurrentFortuneContext,
    flowYearOf,
    FORTUNE_HOUR_OPTIONS,
    FORTUNE_LAYER_LABELS,
    getLunarMonthDays,
    getLunarMonthOptions,
    getTimelineFortune,
} from '../utils/fortuneContext';
import {
    MUTAGEN_META,
    MUTAGEN_LAYER_META,
    buildFlyYearMarkers,
    buildPalaceFlights,
    buildSihuaDiagramEntries,
    getActiveMutagenBadges,
    getAllMutagenStarMaps,
    groupSelfMutationsByBranch,
} from '../utils/ziweiMutations';
import { createZiweiHoroscope, getYinYangGenderLabel, getZiweiFortune } from '../utils/ziweiBirth';
import {
    analyzeZiweiPatterns,
    analyzeZiweiStructures,
    formatZiweiPatternReport,
} from '../utils/ziweiPatterns';
import { buildBaziChart } from '../utils/baziChart';
import ZiweiClassicsPanel from './ziwei/ZiweiClassicsPanel.jsx';
import { useClassicsLibrary } from './common/useClassicsLibrary.js';
import { pickLimitHits, ziweiDoujunPalace, ziweiGlossarySeeds, ziweiLifePalaceHits, ziweiLimitPalaceHits, ziweiNatalOf, ziweiPalaceHits } from '../data/classics/index.js';
import GlossaryPanel from './common/GlossaryPanel.jsx';
import { classicsPromptSection } from '../utils/classicsPrompt.js';
import { Sparkles, Coffee, Save, Archive, Calendar, Printer } from "lucide-react";
import wechatPayImg from '../assets/wechat_pay.jpg';
import alipayImg from '../assets/alipay.jpg';

// Helper to get palace position in 4x4 grid (0-11 index to grid coordinates)
// Standard Ziwei grid:
// 巳(5) 午(6) 未(7) 申(8)
// 辰(4)             酉(9)
// 卯(3)             戌(10)
// 寅(2) 丑(1) 子(0) 亥(11)
// Note: iztro index 0 is usually the first palace (Ming), but we need to map it to Earthly Branches.
// Actually iztro palaces have .earthlyBranch property.
// We need to map Earthly Branch to grid position.
// 子(Zi) -> Bottom-Right (approx)
// Let's define a fixed map based on standard layout.
// Top Row: Si, Wu, Wei, Shen (Snake, Horse, Goat, Monkey) -> Indices 5, 6, 7, 8
// Right Col: Shen, You, Xu, Hai (Monkey, Rooster, Dog, Pig) -> Indices 8, 9, 10, 11
// Bottom Row: Hai, Zi, Chou, Yin (Pig, Rat, Ox, Tiger) -> Indices 11, 0, 1, 2
// Left Col: Yin, Mao, Chen, Si (Tiger, Rabbit, Dragon, Snake) -> Indices 2, 3, 4, 5

const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// Grid positions (row, col) 1-based or 0-based. 4x4 grid.
// Row 0: 巳(5), 午(6), 未(7), 申(8)
// Row 1: 辰(4), [CENTER], [CENTER], 酉(9)
// Row 2: 卯(3), [CENTER], [CENTER], 戌(10)
// Row 3: 寅(2), 丑(1), 子(0), 亥(11)

const GRID_MAP = {
    '巳': { row: 1, col: 1 }, '午': { row: 1, col: 2 }, '未': { row: 1, col: 3 }, '申': { row: 1, col: 4 },
    '辰': { row: 2, col: 1 }, '酉': { row: 2, col: 4 },
    '卯': { row: 3, col: 1 }, '戌': { row: 3, col: 4 },
    '寅': { row: 4, col: 1 }, '丑': { row: 4, col: 2 }, '子': { row: 4, col: 3 }, '亥': { row: 4, col: 4 },
};

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const TIME_RANGES = [
    "00:00-01:00（早子时）", // Early Zi
    "01:00-03:00", // Chou
    "03:00-05:00", // Yin
    "05:00-07:00", // Mao
    "07:00-09:00", // Chen
    "09:00-11:00", // Si
    "11:00-13:00", // Wu
    "13:00-15:00", // Wei
    "15:00-17:00", // Shen
    "17:00-19:00", // You
    "19:00-21:00", // Xu
    "21:00-23:00", // Hai
    "23:00-24:00（晚子时）" // Late Zi
];

const LUNAR_MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LUNAR_DAY_NAMES = [
    '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];
const GANZHI_TONES = {
    甲: 'wood', 乙: 'wood', 寅: 'wood', 卯: 'wood',
    丙: 'fire', 丁: 'fire', 巳: 'fire', 午: 'fire',
    戊: 'earth', 己: 'earth', 辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth',
    庚: 'metal', 辛: 'metal', 申: 'metal', 酉: 'metal',
    壬: 'water', 癸: 'water', 子: 'water', 亥: 'water',
};
const getGanzhiTone = (ganzhi = '') => GANZHI_TONES[ganzhi[0]] || 'ink';

const MUTAGEN_MEANINGS = {
    '禄': {
        title: '舒适与获得',
        detail: '常用来观察满足感、资源与较容易投入的方向。',
    },
    '权': {
        title: '掌控与责任',
        detail: '常用来观察主导欲、责任感与需要多付出的方向。',
    },
    '科': {
        title: '表达与名声',
        detail: '常用来观察展示、名誉、信心与较平顺的方向。',
    },
    '忌': {
        title: '在意与牵挂',
        detail: '常用来观察特别在乎、容易纠结或需要反复处理的方向。',
    },
};

const ARROW_GUIDE_STORAGE_KEY = 'gushupai:ziwei-arrow-guide-v1';

const normalizePalaceName = (name = '') => name === '仆役' ? '交友' : name;
const formatPalaceName = (name = '') => {
    const normalizedName = normalizePalaceName(name);
    return normalizedName.endsWith('宫') ? normalizedName : `${normalizedName}宫`;
};
const FLY_PALACE_SHORT_NAMES = Object.freeze({
    命宫: '命', 兄弟: '兄', 夫妻: '夫', 子女: '子', 财帛: '财', 疾厄: '疾',
    迁移: '迁', 仆役: '友', 交友: '友', 官禄: '官', 田宅: '田', 福德: '福', 父母: '父',
});
const getFlyPalaceName = (name = '') => name === '仆役' ? '交友' : name;
const getFlyPalaceShortName = (name = '') => FLY_PALACE_SHORT_NAMES[name] || String(name).replace(/宫$/, '').slice(0, 1) || '限';

// Helper: Get Year Stem (0-9 index)
const getYearStemIndex = (year) => (year - 4) % 10;
const NO_STEMS = Object.freeze({});

function ProfessionalChartInner({ horoscope, basicInfo, onSave, onOpenArchive, onQuickChart, onShareLink = null }) {
    const palaces = useMemo(() => {
        if (!horoscope) return [];
        return horoscope.palaces;
    }, [horoscope]);

    // State for cascading selection
    const [selection, setSelection] = React.useState({
        daxianIndex: null, // Palace index
        year: null,        // Full Year (e.g., 2025)
        lunarYear: null,   // Numeric lunar year for daily/hourly calculations
        month: null,       // Month Index (1-12)
        day: null,         // Day Index (1-30)
        hour: null,        // Hour Index (0-12, including late Zi hour)
        isLeapMonth: false,
        targetSolarDate: null,
    });

    // iztro-computed current luck cycles used by the “current” shortcut buttons.
    const [currentFortuneContext, setCurrentFortuneContext] = React.useState(null);

    // State for focused palace (for San Fang Si Zheng lines)
    // This can be independent of timeline selection, or synced.
    // Let's make it independent but initialized by Da Xian selection.
    const [focusedIndex, setFocusedIndex] = React.useState(null);
    const [showConnections, setShowConnections] = React.useState(true);
    const [showChartSettings, setShowChartSettings] = React.useState(false);
    const [showCommonMenu, setShowCommonMenu] = React.useState(false);
    const [compactStarView, setCompactStarView] = React.useState(false);
    const [hideBirthDetails, setHideBirthDetails] = React.useState(false);
    const [professionalToolMode, setProfessionalToolMode] = React.useState('sanhe');
    const [flyRouteSourceIndex, setFlyRouteSourceIndex] = React.useState(null);
    const [selectedMutationInfo, setSelectedMutationInfo] = React.useState(null);
    const [showCenterDetails, setShowCenterDetails] = React.useState(false);
    const commonMenuRef = React.useRef(null);
    const commonMenuButtonRef = React.useRef(null);
    const hasOfferedArrowGuide = React.useRef(false);
    const isFlyMode = professionalToolMode === 'fly';
    const isSihuaMode = professionalToolMode === 'sihua';
    const isCompactToolMode = isFlyMode || isSihuaMode;

    // Active Layer Visibility State (Toggle)
    const [activeLayers, setActiveLayers] = React.useState({
        origin: true,
        decadal: true,
        yearly: true,
        monthly: true,
        daily: true,
        hourly: true
    });

    // State for AI Menu
    const [showAiMenu, setShowAiMenu] = React.useState(false);
    const [menuView, setMenuView] = React.useState('main'); // 'main', 'fortune', 'baby'
    const [promptPreview, setPromptPreview] = React.useState(null);
    const [showPatternAnalysis, setShowPatternAnalysis] = React.useState(false);
    const [selectedPatternId, setSelectedPatternId] = React.useState(null);
    // 古籍原文：按当前高亮的宫查古籍库（可在弹层里换宫）
    const [showClassics, setShowClassics] = React.useState(false);
    const classicsDialogRef = React.useRef(null);
    // 术语词典：先列当前高亮的宫里出现的术语
    const [showGlossary, setShowGlossary] = React.useState(false);
    const glossaryDialogRef = React.useRef(null);
    const [mobileChartMode, setMobileChartMode] = React.useState('professional');
    const patternDialogRef = React.useRef(null);
    // State for Partner Modal (Conception Planner)
    const [showPartnerModal, setShowPartnerModal] = React.useState(false);
    const [selectedBabyType, setSelectedBabyType] = React.useState(null);
    const [partnerInfo, setPartnerInfo] = React.useState({
        gender: 'female',
        birthday: '',
        birthTime: TIME_RANGES[0]
    });
    const [isCalculating, setIsCalculating] = React.useState(false);

    // State for Donation Modal
    const [showDonationModal, setShowDonationModal] = React.useState(false);

    const selectedDaxianPalace = selection.daxianIndex !== null
        ? palaces.find((palace) => palace.index === selection.daxianIndex) || palaces[selection.daxianIndex]
        : null;

    const focusedPalace = useMemo(() => {
        if (focusedIndex === null) return null;
        return palaces.find((palace) => palace.index === focusedIndex) || palaces[focusedIndex] || null;
    }, [focusedIndex, palaces]);

    // 古籍库里与命宫、身宫星曜（及程序认出的格局）相关的条目：附进各类 AI 话术（古籍库按需加载，没加载完就先不附；
    // 话术文本在下面认出格局之后再算）。
    const { data: classicsData } = useClassicsLibrary('ziwei', { enabled: palaces.length > 0 });

    React.useEffect(() => {
        if (focusedIndex !== null || palaces.length === 0) return;
        const mingPalace = palaces.find((palace) => palace.name === '命宫');
        setFocusedIndex(mingPalace?.index ?? palaces[0]?.index ?? 0);
    }, [focusedIndex, palaces]);

    React.useEffect(() => {
        if (!showCommonMenu) return undefined;

        const focusFrame = window.requestAnimationFrame(() => {
            commonMenuRef.current?.querySelector('button')?.focus();
        });
        const handlePointerDown = (event) => {
            if (!commonMenuRef.current?.contains(event.target)) setShowCommonMenu(false);
        };
        const handleKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            setShowCommonMenu(false);
            window.requestAnimationFrame(() => commonMenuButtonRef.current?.focus());
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showCommonMenu]);

    React.useEffect(() => {
        if (!showPatternAnalysis) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const focusFrame = window.requestAnimationFrame(() => {
            patternDialogRef.current?.querySelector('[data-pattern-focus]')?.focus();
        });
        const handleKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            setShowPatternAnalysis(false);
            window.requestAnimationFrame(() => commonMenuButtonRef.current?.focus());
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showPatternAnalysis]);

    React.useEffect(() => {
        if (!showClassics) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const focusFrame = window.requestAnimationFrame(() => {
            classicsDialogRef.current?.querySelector('[data-classics-focus]')?.focus();
        });
        const handleKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            setShowClassics(false);
            window.requestAnimationFrame(() => commonMenuButtonRef.current?.focus());
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showClassics]);

    React.useEffect(() => {
        if (!showGlossary) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const focusFrame = window.requestAnimationFrame(() => {
            glossaryDialogRef.current?.querySelector('[data-glossary-focus]')?.focus();
        });
        const handleKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            setShowGlossary(false);
            window.requestAnimationFrame(() => commonMenuButtonRef.current?.focus());
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showGlossary]);

    const palaceRelationship = useMemo(() => {
        if (!focusedPalace) return null;

        const branchIndex = BRANCH_ORDER.indexOf(focusedPalace.earthlyBranch);
        if (branchIndex === -1) return null;

        const self = BRANCH_ORDER[branchIndex];
        const sanHe = [
            BRANCH_ORDER[(branchIndex + 4) % 12],
            BRANCH_ORDER[(branchIndex + 8) % 12],
        ];
        const opposite = BRANCH_ORDER[(branchIndex + 6) % 12];

        return {
            self,
            sanHe,
            opposite,
            byBranch: {
                [self]: 'self',
                [sanHe[0]]: 'sanhe',
                [sanHe[1]]: 'sanhe',
                [opposite]: 'opposite',
            },
        };
    }, [focusedPalace]);

    const palaceFlights = useMemo(
        () => buildPalaceFlights(horoscope),
        [horoscope],
    );

    const selfMutationsByBranch = useMemo(
        () => groupSelfMutationsByBranch(palaceFlights),
        [palaceFlights],
    );

    const sihuaDiagramEntries = useMemo(
        () => buildSihuaDiagramEntries(palaceFlights),
        [palaceFlights],
    );

    const openArrowGuide = () => {
        setSelectedMutationInfo({ layer: 'guide', color: '#326fa8' });
    };

    const closeArrowGuide = (remember = false) => {
        if (remember && typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(ARROW_GUIDE_STORAGE_KEY, 'seen');
            } catch {
                // Private browsing can reject storage; closing the guide must still work.
            }
        }
        setSelectedMutationInfo(null);
    };

    React.useEffect(() => {
        if (!showConnections || sihuaDiagramEntries.length === 0 || hasOfferedArrowGuide.current) return;
        hasOfferedArrowGuide.current = true;

        try {
            if (window.localStorage.getItem(ARROW_GUIDE_STORAGE_KEY) === 'seen') return;
        } catch {
            // If storage is unavailable, keep the first-visit explanation accessible.
        }

        setSelectedMutationInfo((current) => current || { layer: 'guide', color: '#326fa8' });
    }, [showConnections, sihuaDiagramEntries.length]);

    const focusedPalaceFlights = useMemo(() => {
        if (flyRouteSourceIndex === null) return [];
        return palaceFlights.filter((flight) => flight.sourceIndex === flyRouteSourceIndex);
    }, [flyRouteSourceIndex, palaceFlights]);

    const selectMutationInfo = (flight, layer) => {
        setSelectedMutationInfo({ ...flight, layer });
    };

    const selectMutagenLegendInfo = (meta) => {
        setSelectedMutationInfo({ ...meta, layer: 'legend' });
    };

    const handleMutationKeyDown = (event, flight, layer) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        selectMutationInfo(flight, layer);
    };

    const selectStarTransformInfo = (event, palace, star, badges, presentation = 'standard', selectedBadge = badges[0]) => {
        event.stopPropagation();
        setSelectedMutationInfo({
            layer: 'badge',
            mutagen: selectedBadge?.type,
            color: selectedBadge?.mutagenColor,
            starName: star.name,
            targetName: palace.name,
            targetBranch: palace.earthlyBranch,
            badges,
            selectedBadge,
            presentation,
        });
    };

    const sortedDaxianPalaces = useMemo(
        () => [...palaces].sort((a, b) => a.decadal.range[0] - b.decadal.range[0]),
        [palaces],
    );
    // 出生年按农历年：虚岁、大限岁数都按农历年算，元旦到春节之间出生的人按公历年排会让时间轴整体错一年。
    const birthYear = birthLunarYearOf(horoscope)
        || Number(String(basicInfo.birthday || '').slice(0, 4))
        || new Date().getFullYear();
    const currentYear = new Date().getFullYear();
    const currentHoroscope = useMemo(() => {
        try {
            return getZiweiFortune(horoscope, new Date());
        } catch (error) {
            console.error('Unable to read current horoscope:', error);
            return null;
        }
    }, [horoscope]);
    // 「今年」的流年按立春换年（与运限一致）：元旦到立春之间仍标上一年。
    const currentFlowYear = currentHoroscope ? flowYearOf(currentHoroscope, currentYear) : currentYear;
    const virtualAge = currentHoroscope?.age?.nominalAge ?? (currentYear - birthYear + 1);
    const currentDaxianPalace = (currentHoroscope?.decadal?.name === '大限'
        ? palaces.find((palace) => palace.index === currentHoroscope?.decadal?.index)
        : null)
        || sortedDaxianPalaces.find((palace) => (
            virtualAge >= palace.decadal.range[0] && virtualAge <= palace.decadal.range[1]
        ))
        || null;
    const timelineDaxianPalace = selectedDaxianPalace || currentDaxianPalace || sortedDaxianPalaces[0] || null;
    const patternResults = useMemo(() => analyzeZiweiPatterns(horoscope), [horoscope]);
    const structureResults = useMemo(() => analyzeZiweiStructures(horoscope), [horoscope]);
    const patternEntries = useMemo(
        () => [...patternResults, ...structureResults],
        [patternResults, structureResults],
    );
    // 程序认出的格局名（三奇加会、机月同梁格……），古籍匹配时算进命宫的上下文。
    const patternNames = useMemo(() => patternEntries.map((pattern) => pattern.name), [patternEntries]);
    // 生年干支（排盘库按农历年），给古籍里「壬甲生人」「寅午戌生人」这类条件用。
    const natal = useMemo(() => ziweiNatalOf(horoscope), [horoscope]);
    const classicsPromptText = useMemo(() => {
        if (!classicsData?.library || palaces.length === 0) return null;
        const hits = ziweiLifePalaceHits(classicsData.library, palaces, { gender: basicInfo.gender, patterns: patternNames, natal });
        return classicsPromptSection(hits, { title: '【古籍原文（命宫、身宫星曜）】', subject: '命宫身宫星曜', limit: 4 });
    }, [classicsData, palaces, basicInfo.gender, patternNames, natal]);
    const withClassics = (text) => (text && classicsPromptText ? `${text}\n\n${classicsPromptText}` : text);
    // 性情婚恋、姻缘、财运三种话术各附相关几个宫的原文（命宫身宫之外再附夫妻、福德、财帛、官禄），让 AI 照原书说。
    const PROMPT_CLASSICS_PALACES = {
        character: [['夫妻'], ['福德']],
        marriage: [['夫妻']],
        wealth: [['财帛'], ['官禄']],
    };
    const withClassicsFor = (text, type) => {
        if (!text || !classicsData?.library || palaces.length === 0) return text;
        const extra = (PROMPT_CLASSICS_PALACES[type] ?? []).map((names) => {
            const hits = ziweiPalaceHits(classicsData.library, palaces, names, { gender: basicInfo.gender, natal });
            return classicsPromptSection(hits, { title: `【古籍原文（${names.join('、')}宫星曜）】`, subject: `${names.join('、')}宫星曜`, limit: 3 });
        }).filter(Boolean);
        return [withClassics(text), ...extra].join('\n\n');
    };
    // 运势话术另附此刻大限、流年命宫（落在本命盘哪一宫）的原文，连同古籍里专讲大限、流年的条目。
    const withClassicsForFortune = (text, fortuneContext) => {
        if (!text || !classicsData?.library || palaces.length === 0 || !fortuneContext?.fortune) return withClassics(text);
        // 大限、小限（排盘库的 age）、流年三层：《全书》论运限多以「二限」「岁限」并举。
        const extra = [['decadal', '大限', '当前大限'], ['age', '小限', '今年小限'], ['yearly', '流年', '今年流年']].map(([key, limit, label]) => {
            const scope = fortuneContext.fortune[key];
            // 这一层的命宫落在本命盘的哪一宫（变量不叫 natal：natal 是外面的生年干支，之前在这里被遮住，运限层就判不了「壬甲生人」）。
            const natalPalace = Number.isInteger(scope?.index) ? (palaces.find((palace) => palace?.index === scope.index) ?? palaces[scope.index] ?? null) : null;
            if (!natalPalace) return null;
            // 流年层另算斗君（流年正月所在的本命宫），「斗君过度在某宫」的条目靠它判。
            const doujun = key === 'yearly' ? ziweiDoujunPalace(horoscope, palaces, scope.index) : null;
            // 带上该层的流曜与四化（scope），流羊流陀、流昌流曲这类条件才算得到。
            const hits = ziweiLimitPalaceHits(classicsData.library, palaces, scope.index, limit, { gender: basicInfo.gender, natal, scope, doujun: doujun?.name ?? null });
            // 最多三条，其中至少一条是专讲这层运限的，其余按所落宫的星曜取。
            return classicsPromptSection(pickLimitHits(hits, 3, limit), { title: `【古籍原文（${label}命宫：本命${natalPalace.name}·${natalPalace.earthlyBranch}宫${doujun ? `，斗君在本命${doujun.name}·${doujun.earthlyBranch}宫` : ''}，及论${limit}的条目）】`, subject: `${label}`, limit: 3, total: hits.length });
        }).filter(Boolean);
        return [withClassics(text), ...extra].join('\n\n');
    };
    const selectedPattern = patternEntries.find((pattern) => pattern.id === selectedPatternId)
        || patternEntries[0]
        || null;
    const timelineYears = useMemo(() => (
        timelineDaxianPalace
            ? Array.from(
                { length: timelineDaxianPalace.decadal.range[1] - timelineDaxianPalace.decadal.range[0] + 1 },
                (_, offset) => birthYear + timelineDaxianPalace.decadal.range[0] + offset - 1,
            )
            : []
    ), [birthYear, timelineDaxianPalace]);
    const timelineYearModels = useMemo(() => buildFlyYearMarkers({
        astrolabe: horoscope,
        years: timelineYears,
        birthYear,
    }).map((model) => ({
        ...model,
        ganZhi: model.ganZhi
            || `${HEAVENLY_STEMS[getYearStemIndex(model.year)]}${EARTHLY_BRANCHES[(model.year - 4 + 12) % 12]}`,
    })), [birthYear, horoscope, timelineYears]);
    const flyYearByPalaceIndex = useMemo(() => new Map(
        timelineYearModels
            .filter((model) => model.yearlyPalaceIndex !== null)
            .map((model) => [model.yearlyPalaceIndex, model]),
    ), [timelineYearModels]);
    const timelineMonthOptions = getLunarMonthOptions(selection.lunarYear || selection.year || currentYear);
    const timelineDayCount = selection.month
        ? getLunarMonthDays(
            selection.lunarYear || selection.year || currentYear,
            selection.month,
            selection.isLeapMonth,
        )
        : 30;
    const pillarParts = typeof horoscope.chineseDate === 'string'
        ? horoscope.chineseDate.trim().split(/\s+/).slice(0, 4)
        : [];
    const yinYangGenderLabel = getYinYangGenderLabel(horoscope, basicInfo.gender);
    const currentTimeLabel = new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date()).replaceAll('/', '-');
    const centerBaziSummary = useMemo(() => {
        const dateMatch = String(basicInfo.birthday || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        const hourIndex = Number(basicInfo.birthTimeIndex);
        if (!dateMatch || !Number.isInteger(hourIndex) || hourIndex < 0 || hourIndex > 12) return null;

        const [, year, month, day] = dateMatch;
        const baziMonth = basicInfo.calendarType === 'lunar' && basicInfo.isLeapMonth
            ? -Number(month)
            : Number(month);

        try {
            const chart = buildBaziChart({
                calendarType: basicInfo.calendarType || 'solar',
                year: Number(year),
                month: baziMonth,
                day: Number(day),
                hourIndex,
                gender: basicInfo.gender,
                daySect: 2,
            });
            const startLuckParts = [
                chart.yun.startYear > 0 ? `${chart.yun.startYear}年` : '',
                chart.yun.startMonth > 0 ? `${chart.yun.startMonth}月` : '',
                chart.yun.startDay > 0 ? `${chart.yun.startDay}天` : '',
                chart.yun.startHour > 0 ? `${chart.yun.startHour}小时` : '',
            ].filter(Boolean);

            return {
                pillars: chart.pillars.map((pillar) => pillar.ganZhi),
                startLuck: startLuckParts.join('') || '出生即起运',
                startSolar: chart.yun.startSolar,
                direction: chart.yun.forward ? '顺行' : '逆行',
                dayun: chart.yun.dayun.map((item) => ({
                    ganZhi: item.ganZhi,
                    ages: `${item.startAge}-${item.endAge}岁`,
                    years: `${item.startYear}-${item.endYear}`,
                    isCurrent: item.isCurrent,
                })),
            };
        } catch (error) {
            console.error('Unable to build Bazi center summary:', error);
            return null;
        }
    }, [
        basicInfo.birthday,
        basicInfo.birthTimeIndex,
        basicInfo.calendarType,
        basicInfo.isLeapMonth,
        basicInfo.gender,
    ]);
    const centerPillarParts = centerBaziSummary?.pillars?.length === 4
        ? centerBaziSummary.pillars
        : pillarParts;
    const visibleCenterPillars = hideBirthDetails ? ['—', '—', '—', '—'] : centerPillarParts;
    const birthInputLabel = `${basicInfo.calendarType === 'lunar' ? `农历${basicInfo.isLeapMonth ? '闰月' : ''}` : '公历'} ${basicInfo.birthday || '-'}`;
    const birthSolarLabel = horoscope.solarDate || (basicInfo.calendarType === 'solar' ? basicInfo.birthday : '-');
    // 录入时选了「精确到分钟」并填了出生地，才算真正校正过真太阳时。
    const trueSolar = basicInfo.trueSolar;
    const trueSolarLabel = trueSolar?.applied
        ? `${trueSolar.correctedDate} ${trueSolar.correctedTime} · ${trueSolar.hourName}（${trueSolar.placeName || '自定义经度'}，比钟表${trueSolar.totalMinutes >= 0 ? '快' : '慢'} ${Math.abs(trueSolar.totalMinutes).toFixed(0)} 分钟${trueSolar.boundary ? `；离时辰交界 ${trueSolar.boundary.minutesToBoundary} 分钟，另一可能为${trueSolar.boundary.alternative.hourName}` : ''}）`
        : trueSolar
            ? `按钟表 ${trueSolar.clockTime} 定时辰，未填出生地经度，没有校正`
            : '未校正：录入时选「精确到分钟」并填出生地，可按真太阳时定时辰';
    const trueSolarShortLabel = trueSolar?.applied
        ? `${trueSolar.correctedTime} ${trueSolar.hourName}（${trueSolar.placeName || '自定义经度'}）`
        : '未校正（需出生地与分钟）';
    const birthClockLabel = `${birthSolarLabel} ${basicInfo.birthTime || horoscope.time || '-'}`;
    const firstDaxianPalace = sortedDaxianPalaces[0] || null;
    const viewedDaxianPalace = selectedDaxianPalace || currentDaxianPalace || firstDaxianPalace;
    const formatDaxian = (palace) => {
        if (!palace) return '暂无';
        const [startAge, endAge] = palace.decadal.range;
        const startYear = birthYear + startAge - 1;
        const endYear = birthYear + endAge - 1;
        return `${palace.decadal.heavenlyStem}${palace.decadal.earthlyBranch}限 · 虚岁${startAge}-${endAge} · ${startYear}-${endYear}`;
    };
    // 古籍弹层可切到「当前大限 / 今年流年」：那一层的命宫在本命盘的哪一宫。
    // scope 是排盘库那一层的运限对象（流曜与四化），古籍匹配时把流羊、运昌这类流曜算进去。
    const classicsLimits = {
        decadal: currentDaxianPalace ? { index: currentDaxianPalace.index, label: `当前大限（${formatDaxian(currentDaxianPalace)}）`, scope: currentHoroscope?.decadal ?? null } : null,
        age: Number.isInteger(currentHoroscope?.age?.index) ? { index: currentHoroscope.age.index, label: `${currentFlowYear} 年小限（虚岁 ${virtualAge}，${currentHoroscope.age.heavenlyStem ?? ''}${currentHoroscope.age.earthlyBranch ?? ''}）`, scope: currentHoroscope.age } : null,
        yearly: Number.isInteger(currentHoroscope?.yearly?.index) ? { index: currentHoroscope.yearly.index, label: `${currentFlowYear} 年流年`, scope: currentHoroscope.yearly, doujun: ziweiDoujunPalace(horoscope, palaces, currentHoroscope.yearly.index) } : null,
    };
    // 时间轴手动选到的各层干支：选到某一天后与「当前运势」同一口径（getZiweiFortune：流年立春换年、流月农历月、晚子时按命盘流派）。
    const timelineFortune = useMemo(
        () => (currentFortuneContext ? null : getTimelineFortune(horoscope, selection)),
        [horoscope, selection, currentFortuneContext],
    );
    const activeStems = currentFortuneContext?.activeStems ?? timelineFortune?.stems ?? NO_STEMS;
    const timelineNotes = timelineFortune?.notes ?? [];
    const currentViewLabel = currentFortuneContext
        ? `公历${currentFortuneContext.solarDate} · ${FORTUNE_LAYER_LABELS[currentFortuneContext.type] || '运限'}${currentFortuneContext.dayBoundaryNote ? `（${currentFortuneContext.dayBoundaryNote}）` : ''}`
        : selection.year
            ? `${selection.year}流年${selection.month ? ` · ${selection.isLeapMonth ? '闰' : ''}${selection.month}月` : ''}${selection.day ? ` · ${selection.day}日` : ''}${selection.hour !== null ? ` · ${FORTUNE_HOUR_OPTIONS.find((item) => item.index === selection.hour)?.name || '流时'}` : ''}${timelineNotes.length ? `（${timelineNotes.join('；')}）` : ''}`
            : selection.daxianIndex !== null
                ? `大限：${formatDaxian(selectedDaxianPalace)}`
                : '本命盘（尚未选择流年、流月、流日或流时）';

    const closeAiMenu = () => {
        setShowAiMenu(false);
        setMenuView('main');
    };

    // Helper to get Si Hua for a star from active stems
    const getActiveSiHua = (starName) => getActiveMutagenBadges({
        starName,
        activeStems,
        activeLayers,
    });

    // 文墨三合盘同屏采用三代四化窗口：本限年、限年月、年月日或月日时。
    // 徽标按来源层着色，箭头仍按禄权科忌着色，两套颜色语义不可混用。
    const visibleMutagenLayerKeys = useMemo(() => new Set(
        MUTAGEN_LAYER_META
            .filter((layer) => activeLayers[layer.key] && activeStems[layer.key])
            .map((layer) => layer.key)
            .slice(-3),
    ), [activeLayers, activeStems]);

    const handleSelection = (type, value) => {
        setCurrentFortuneContext(null);
        const layerBySelection = {
            daxian: 'decadal',
            year: 'yearly',
            month: 'monthly',
            day: 'daily',
            hour: 'hourly',
        };
        setActiveLayers(prev => ({ ...prev, [layerBySelection[type]]: true }));
        setSelection(prev => {
            const next = { ...prev };
            if (type === 'daxian') {
                next.daxianIndex = value;
                // Reset children
                next.year = null; next.lunarYear = null; next.month = null; next.day = null; next.hour = null;
                next.isLeapMonth = false; next.targetSolarDate = null;
                // Auto-select first year of Da Xian? Or wait for user?
                // Let's wait.
                // Also set focusedIndex to highlight the palace
                setFocusedIndex(value);
            } else if (type === 'year') {
                next.year = value;
                next.lunarYear = value;
                next.month = null; next.day = null; next.hour = null;
                next.isLeapMonth = false; next.targetSolarDate = null;
            } else if (type === 'month') {
                next.month = typeof value === 'object' ? value.month : value;
                next.day = null; next.hour = null;
                next.isLeapMonth = typeof value === 'object' ? Boolean(value.isLeap) : false;
                next.targetSolarDate = null;
            } else if (type === 'day') {
                next.day = value;
                next.hour = null;
            } else if (type === 'hour') {
                next.hour = value;
            }
            return next;
        });
    };

    const handleTimelineYear = (year) => {
        if (selection.daxianIndex !== null || !timelineDaxianPalace) {
            handleSelection('year', year);
            return;
        }

        setCurrentFortuneContext(null);
        setFocusedIndex(timelineDaxianPalace.index);
        setActiveLayers((prev) => ({ ...prev, decadal: true, yearly: true }));
        setSelection((prev) => ({
            ...prev,
            daxianIndex: timelineDaxianPalace.index,
            year,
            lunarYear: year,
            month: null,
            day: null,
            hour: null,
            isLeapMonth: false,
            targetSolarDate: null,
        }));
    };

    // Helper to render a palace cell
    const renderPalace = (branch) => {
        const palace = palaces.find(p => p.earthlyBranch === branch);
        if (!palace) return <div className="w-full h-full bg-stone-50" />;

        const isFocused = focusedPalace?.earthlyBranch === branch;
        const relationship = palaceRelationship?.byBranch?.[branch] || null;

        // Determine if this palace is Ming or Shen
        const isMing = palace.name === '命宫';
        const isShen = palace.isBodyPalace;

        // Filter Stars by Type for styling
        const softStars = palace.minorStars.filter(s => s.type === 'soft');
        const toughStars = palace.minorStars.filter(s => s.type === 'tough');
        const adjectiveStars = palace.adjectiveStars || [];

        // --- Age Calculations ---
        // 1. Xiao Xian (Small Limit) - from iztro
        const xiaoXianAges = palace.ages || [];

        // 2. Liu Nian (Flow Year)
        // Formula: Ages where (Age - 1 + BirthBranchIndex) % 12 === PalaceBranchIndex
        // 虚岁 1 岁那年的流年地支：按出生农历年（与虚岁、大限、时间轴同一口径；元旦到春节出生的人不能按公历年）。
        const birthBranchIndex = ((birthYear - 4) % 12 + 12) % 12;
        const palaceBranchIndex = BRANCH_ORDER.indexOf(palace.earthlyBranch);

        // Generate Liu Nian ages (e.g., 1 to 100)
        const liuNianAges = [];
        // Age 1 corresponds to the birth branch.
        // We want ages where the current branch (calculated as (birthBranchIndex + age - 1) % 12)
        // matches the palaceBranchIndex.
        // (birthBranchIndex + age - 1) % 12 === palaceBranchIndex
        // age - 1 === (palaceBranchIndex - birthBranchIndex + 12) % 12
        // age = (palaceBranchIndex - birthBranchIndex + 12) % 12 + 1
        let baseAge = (palaceBranchIndex - birthBranchIndex + 12) % 12 + 1;
        for (let a = baseAge; a <= 110; a += 12) {
            liuNianAges.push(a);
        }

        // Display Logic: Limit to ~5 entries to prevent overflow
        const displayLiuNian = liuNianAges.slice(0, 5); // e.g. 11, 23, 35, 47, 59
        const displayXiaoXian = xiaoXianAges.slice(0, 5);
        const starColumns = [
            ...palace.majorStars.map((star) => ({ star, kind: 'major' })),
            ...softStars.map((star) => ({ star, kind: 'soft' })),
            ...toughStars.map((star) => ({ star, kind: 'tough' })),
            ...adjectiveStars.map((star) => ({ star, kind: 'adjective' })),
        ];
        const isPalaceHighlighted = isFlyMode ? flyRouteSourceIndex === palace.index : isSihuaMode ? false : isFocused;
        const compactBaseStars = [
            ...palace.majorStars.map((star) => ({ star, kind: 'major' })),
            ...palace.minorStars.map((star) => ({ star, kind: 'soft' })),
        ];
        const mutationStarNames = new Set([
            ...compactBaseStars
                .filter(({ star }) => getActiveSiHua(star.name).length > 0)
                .map(({ star }) => star.name),
            ...sihuaDiagramEntries
                .filter((entry) => entry.targetIndex === palace.index)
                .map((entry) => entry.starName),
        ]);
        const compactStars = [
            ...compactBaseStars.slice(0, 2),
            ...compactBaseStars.filter(({ star }) => mutationStarNames.has(star.name)),
            ...compactBaseStars,
        ]
            .filter((model, index, models) => models.findIndex(({ star }) => star.name === model.star.name) === index)
            .slice(0, isSihuaMode ? 5 : 6);
        const flyYearModel = flyYearByPalaceIndex.get(palace.index) || null;
        const compactDecadalPalaceName = timelineYearModels[0]?.decadalPalaceNames?.[palace.index]
            || currentHoroscope?.decadal?.palaceNames?.[palace.index]
            || '';

        const renderStarColumn = ({ star, kind }, idx, displayMode = 'standard') => {
            const activeSiHua = getActiveSiHua(star.name);
            const visibleSiHua = activeSiHua
                .filter((badge) => visibleMutagenLayerKeys.has(badge.key))
                .slice(-3);
            const hiddenSiHuaCount = Math.max(0, activeSiHua.length - visibleSiHua.length);
            const sourceSummary = activeSiHua
                .map((badge) => `${badge.name}${badge.stem}干化${badge.type}`)
                .join('、');

            return (
                <span key={`${displayMode}-${kind}-${star.name}-${idx}`} className="wenmo-star-column" data-kind={kind}>
                    <b>{star.name}</b>
                    {displayMode === 'standard' && star.brightness && <small>{star.brightness}</small>}
                    {visibleSiHua.map((badge) => (
                        <button
                            key={`${badge.key}-${badge.type}`}
                            type="button"
                            className="wenmo-star-transform"
                            data-layer={badge.key}
                            data-mutagen={badge.type}
                            aria-label={`${star.name}，${badge.name}${badge.stem}干化${badge.type}${displayMode === 'sihua' ? `，四化代码${badge.code}` : ''}；${badge.label}层章；点击查看全部来源`}
                            title={sourceSummary}
                            style={{ '--badge-color': badge.layerColor, '--mutagen-color': badge.mutagenColor }}
                            onClick={(event) => selectStarTransformInfo(event, palace, star, activeSiHua, displayMode, badge)}
                            onKeyDown={(event) => {
                                event.stopPropagation();
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                event.preventDefault();
                                selectStarTransformInfo(event, palace, star, activeSiHua, displayMode, badge);
                            }}
                        >
                            <span>{displayMode === 'sihua' ? badge.type : badge.label}</span><strong>{displayMode === 'sihua' ? badge.code : badge.type}</strong>
                        </button>
                    ))}
                    {hiddenSiHuaCount > 0 && (
                        <button
                            type="button"
                            className="wenmo-star-transform wenmo-star-transform--more"
                            aria-label={`${star.name}另有${hiddenSiHuaCount}层四化来源未在当前三代窗口显示；点击查看全部`}
                            title={sourceSummary}
                            onClick={(event) => selectStarTransformInfo(event, palace, star, activeSiHua)}
                            onKeyDown={(event) => {
                                event.stopPropagation();
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                event.preventDefault();
                                selectStarTransformInfo(event, palace, star, activeSiHua);
                            }}
                        >+{hiddenSiHuaCount}</button>
                    )}
                </span>
            );
        };

        return (
            <div
                className={`wenmo-palace ${isFlyMode ? 'wenmo-palace--fly' : isSihuaMode ? 'wenmo-palace--sihua' : 'wenmo-palace--standard'} w-full h-full relative p-0.5 md:p-1 flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden
                ${isPalaceHighlighted ? 'bg-amber-50 ring-2 ring-amber-400 z-10 shadow-lg' : 'bg-stone-50 hover:bg-stone-100'}
                ${isMing ? 'bg-red-50/30' : ''}
            `}
                data-relation={showConnections && professionalToolMode === 'sanhe' ? relationship || undefined : undefined}
                onClick={() => {
                    setFocusedIndex(palace.index);
                    if (isFlyMode) {
                        setFlyRouteSourceIndex((current) => current === palace.index ? null : palace.index);
                    }
                    setSelectedMutationInfo(null);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setFocusedIndex(palace.index);
                        if (isFlyMode) {
                            setFlyRouteSourceIndex((current) => current === palace.index ? null : palace.index);
                        }
                        setSelectedMutationInfo(null);
                    }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={isPalaceHighlighted}
                aria-label={`${palace.name}，${palace.heavenlyStem}${palace.earthlyBranch}宫${isFlyMode ? '，点击显示或隐藏该宫四化飞线' : isSihuaMode ? '，四化盘宫位' : ''}`}
            >
                <div className={`wenmo-star-columns ${isFlyMode ? 'wenmo-star-columns--fly' : isSihuaMode ? 'wenmo-star-columns--sihua' : ''}`}>
                    {(compactStarView ? compactStars.slice(0, 4) : isCompactToolMode ? compactStars : starColumns.slice(0, 10))
                        .map((model, idx) => renderStarColumn(model, idx, isFlyMode ? 'fly' : isSihuaMode ? 'sihua' : 'standard'))}
                </div>

                {/* --- BOTTOM AREA: Meta Info (Wen Mo Style) --- */}
                {isFlyMode ? (
                    <div className="wenmo-fly-palace-meta" data-testid="ziwei-fly-palace-meta">
                        <div className="wenmo-fly-year-context">
                            {flyYearModel && (
                                <>
                                    <b>{flyYearModel.nominalAge}岁</b>
                                    <b>{flyYearModel.year}</b>
                            <span>大{getFlyPalaceShortName(compactDecadalPalaceName)}</span>
                                </>
                            )}
                        </div>
                        <div className="wenmo-fly-palace-identity">
                            <span className="wenmo-fly-decade-range">{palace.decadal.range[0]}-{palace.decadal.range[1]}</span>
                            {isShen && <em>身宫</em>}
                            <strong>{getFlyPalaceName(palace.name)}</strong>
                            <b>{palace.heavenlyStem}<br />{palace.earthlyBranch}</b>
                        </div>
                    </div>
                ) : isSihuaMode ? (
                    <div className="wenmo-sihua-palace-layout" data-testid="ziwei-sihua-palace-meta">
                        {flyYearModel && (
                            <div className="wenmo-sihua-year-context">
                                {flyYearModel.year}年{flyYearModel.nominalAge}岁
                            </div>
                        )}
                        <div className="wenmo-sihua-palace-meta">
                            <b>{palace.heavenlyStem}<br />{palace.earthlyBranch}</b>
                            <span>
                                <strong>大{getFlyPalaceShortName(compactDecadalPalaceName)}</strong>
                                <small>{palace.decadal.range[0]}-{palace.decadal.range[1]}</small>
                            </span>
                            <span>
                                {isShen && <em>身</em>}
                                <strong>{getFlyPalaceName(palace.name)}</strong>
                            </span>
                        </div>
                    </div>
                ) : (
                <div className="wenmo-palace-meta mt-auto flex justify-between items-end w-full border-t border-gray-100/50 pt-1">

                    {/* Left Bottom: Stacked Ages (Liu Nian / Xiao Xian) */}
                    <div className="flex flex-col gap-0.5 text-[9px] leading-tight">
                        {/* Row 1: Liu Nian */}
                        <div className="flex items-baseline gap-1">
                            <span className="text-gray-400 scale-90 origin-left whitespace-nowrap">流年</span>
                            <span className="text-black font-mono">{displayLiuNian.join(' ')}</span>
                        </div>
                        {/* Row 2: Xiao Xian */}
                        <div className="flex items-baseline gap-1">
                            <span className="text-gray-400 scale-90 origin-left whitespace-nowrap">小限</span>
                            <span className="text-black font-mono">{displayXiaoXian.join(' ')}</span>
                        </div>
                    </div>

                    {/* Right Bottom: Palace Info & Gods */}
                    <div className="flex flex-col items-end text-right min-w-[35%]">

                        {/* Gods Row (Compact, Top) */}
                        <div className="flex flex-wrap justify-end gap-1 text-[9px] text-gray-800 scale-90 origin-right mb-0.5 opacity-80">
                            <span>{palace.boshi12} • {palace.jiangqian12} • {palace.suiqian12}</span>
                        </div>

                        {/* Main Info Block: Separated into Columns for strict alignment */}
                        <div className="flex items-end justify-end gap-1.5">

                            {/* Col 1: Life Stage & Stem/Branch */}
                            <div className="flex flex-col items-end gap-0.5">
                                {/* Life Stage */}
                                <div className="text-[10px] text-gray-900 font-bold leading-none">
                                    {palace.changsheng12}
                                </div>
                                {/* Stem/Branch */}
                                <div className="text-[10px] text-stone-500 font-mono leading-none">
                                    {palace.heavenlyStem}{palace.earthlyBranch}
                                </div>
                            </div>

                            {/* Col 2: Palace Name & Decade (Target: Aligned) */}
                            <div className="flex flex-col items-end gap-0.5">
                                {/* Palace Name Row (with Body Palace Badge) */}
                                <div className="flex items-center justify-end gap-1">
                                    {/* Body Palace Badge */}
                                    {isShen && (
                                        <span className="text-[9px] border border-amber-600 text-amber-700 px-0.5 rounded-sm leading-none bg-amber-50">
                                            身宫
                                        </span>
                                    )}
                                    {/* Palace Name */}
                                    <div className={`font-serif font-bold text-sm md:text-base leading-none ${isMing ? 'text-red-700' : isShen ? 'text-amber-700' : 'text-slate-700'}`}>
                                        {palace.name}
                                    </div>
                                </div>
                                {/* Decade Range - Aligned under Palace Name */}
                                <div className="text-blue-500 font-bold text-[10px] leading-none">
                                    {palace.decadal.range[0]}-{palace.decadal.range[1]}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        );
    };

    const renderSimplePalaceCard = (palace) => {
        if (!palace) return null;

        const isFocused = focusedIndex === palace.index;
        const isSelectedDaxian = selection.daxianIndex === palace.index;
        const majorStars = palace.majorStars || [];
        const minorStars = palace.minorStars || [];
        const visibleMinorStars = minorStars.slice(0, 5);
        const hiddenMinorStarCount = Math.max(minorStars.length - visibleMinorStars.length, 0);

        return (
            <button
                key={palace.earthlyBranch}
                type="button"
                onClick={() => setFocusedIndex(palace.index)}
                aria-pressed={isFocused}
                aria-label={`${palace.name}，${palace.heavenlyStem}${palace.earthlyBranch}，大限${palace.decadal.range[0]}至${palace.decadal.range[1]}岁`}
                className={`min-h-36 rounded-2xl border p-3 text-left shadow-sm transition active:scale-[0.98]
                    ${isFocused
                        ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300/60'
                        : 'border-stone-200 bg-white hover:border-purple-300'
                    }`}
            >
                <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-base font-black ${palace.name === '命宫' ? 'text-red-700' : 'text-slate-800'}`}>
                                {palace.name}
                            </span>
                            {palace.isBodyPalace && (
                                <span className="rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                    身宫
                                </span>
                            )}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-stone-500">
                            {palace.heavenlyStem}{palace.earthlyBranch} · {palace.changsheng12}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-blue-600">
                            大限 {palace.decadal.range[0]}-{palace.decadal.range[1]}
                        </div>
                        {isSelectedDaxian && (
                            <span className="mt-1 inline-block rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                {currentFortuneContext ? '当前大限' : '已选大限'}
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-2 space-y-2">
                    <div>
                        <div className="mb-1 text-[10px] font-bold tracking-wider text-stone-400">主星</div>
                        <div className="flex flex-wrap gap-1.5">
                            {majorStars.length > 0 ? majorStars.map((star) => (
                                <span key={star.name} className="rounded-lg bg-red-50 px-2 py-1 text-sm font-bold text-red-700">
                                    {star.name}
                                    {star.brightness && <span className="ml-0.5 text-[10px] font-normal text-red-400">{star.brightness}</span>}
                                </span>
                            )) : (
                                <span className="text-sm text-stone-400">无主星</span>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="mb-1 text-[10px] font-bold tracking-wider text-stone-400">辅星</div>
                        <div className="flex flex-wrap gap-1 text-xs text-purple-700">
                            {visibleMinorStars.length > 0 ? visibleMinorStars.map((star) => (
                                <span key={star.name} className="rounded-md bg-purple-50 px-1.5 py-1 font-semibold">
                                    {star.name}
                                </span>
                            )) : (
                                <span className="text-stone-400">无辅星</span>
                            )}
                            {hiddenMinorStarCount > 0 && (
                                <span className="rounded-md bg-stone-100 px-1.5 py-1 text-stone-500">+{hiddenMinorStarCount}</span>
                            )}
                        </div>
                    </div>
                </div>
            </button>
        );
    };

    const getBranchCenter = (branch) => {
        const pos = GRID_MAP[branch];
        if (!pos) return null;
        return {
            x: (pos.col - 0.5) * 100,
            y: (pos.row - 0.5) * 100,
            pos,
        };
    };

    const getCenterFacingPoint = (branch) => {
        const point = getBranchCenter(branch);
        if (!point) return null;

        return {
            x: point.pos.col === 1 ? 100 : point.pos.col === 4 ? 300 : point.x,
            y: point.pos.row === 1 ? 100 : point.pos.row === 4 ? 300 : point.y,
        };
    };

    const getOutwardVector = (branch) => {
        const point = getBranchCenter(branch);
        if (!point) return null;

        const rawX = point.pos.col === 1 ? -1 : point.pos.col === 4 ? 1 : 0;
        const rawY = point.pos.row === 1 ? -1 : point.pos.row === 4 ? 1 : 0;
        const length = Math.hypot(rawX, rawY) || 1;
        return { x: rawX / length, y: rawY / length };
    };

    const getMutationArrowGeometry = (entry, slotIndex, slotCount) => {
        // 自化符号永远锚在发起宫。向心表示“本宫宫干使对宫星曜四化”，
        // 所以箭头从发起宫内缘指向中宫，而不是搬到真实落宫一侧。
        const anchorBranch = entry.sourceBranch;
        const center = getBranchCenter(anchorBranch);
        const outward = getOutwardVector(anchorBranch);
        if (!center || !outward) return null;

        const tangent = { x: -outward.y, y: outward.x };
        const offset = (slotIndex - (slotCount - 1) / 2) * 6.5;
        const direction = entry.kind === 'outward'
            ? outward
            : { x: -outward.x, y: -outward.y };

        let boundaryDistance;
        if (entry.kind === 'outward') {
            const candidates = [];
            if (direction.x < 0) candidates.push((0 - center.x) / direction.x);
            if (direction.x > 0) candidates.push((400 - center.x) / direction.x);
            if (direction.y < 0) candidates.push((0 - center.y) / direction.y);
            if (direction.y > 0) candidates.push((400 - center.y) / direction.y);
            boundaryDistance = Math.min(...candidates.filter((distance) => distance >= 0));
        } else {
            const candidates = [];
            if (center.x < 100 && direction.x > 0) candidates.push((100 - center.x) / direction.x);
            if (center.x > 300 && direction.x < 0) candidates.push((300 - center.x) / direction.x);
            if (center.y < 100 && direction.y > 0) candidates.push((100 - center.y) / direction.y);
            if (center.y > 300 && direction.y < 0) candidates.push((300 - center.y) / direction.y);
            boundaryDistance = Math.max(...candidates.filter((distance) => distance >= 0));
        }

        if (!Number.isFinite(boundaryDistance)) return null;

        const startDistance = Math.max(8, boundaryDistance - (entry.kind === 'outward' ? 21 : 22));
        const endDistance = boundaryDistance + (entry.kind === 'outward' ? 4 : 6);

        return {
            start: {
                x: center.x + direction.x * startDistance + tangent.x * offset,
                y: center.y + direction.y * startDistance + tangent.y * offset,
            },
            end: {
                x: center.x + direction.x * endDistance + tangent.x * offset,
                y: center.y + direction.y * endDistance + tangent.y * offset,
            },
        };
    };

    // 三方四正只使用灰色虚线；四化颜色不再冒充宫位关系。
    const renderSanheConnections = () => {
        if (!showConnections || professionalToolMode !== 'sanhe' || !palaceRelationship) return null;

        const selfPoint = getCenterFacingPoint(palaceRelationship.self);
        const sanHePoints = palaceRelationship.sanHe.map(getCenterFacingPoint).filter(Boolean);
        const oppositePoint = getCenterFacingPoint(palaceRelationship.opposite);
        if (!selfPoint || sanHePoints.length !== 2 || !oppositePoint) return null;

        return (
            <svg
                className="wenmo-sanhe-lines absolute inset-0 h-full w-full pointer-events-none"
                data-testid="ziwei-sanhe-layer"
                viewBox="0 0 400 400"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                <defs>
                    <marker id="sanhe-opposite-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L7,3.5 L0,7 Z" fill="#858585" />
                    </marker>
                </defs>
                <polygon
                    points={[selfPoint, ...sanHePoints].map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="rgba(80, 80, 80, 0.018)"
                    stroke="rgba(105, 105, 105, 0.52)"
                    strokeWidth="1.15"
                    strokeDasharray="4 4"
                    vectorEffect="non-scaling-stroke"
                />
                <line
                    x1={selfPoint.x}
                    y1={selfPoint.y}
                    x2={oppositePoint.x}
                    y2={oppositePoint.y}
                    stroke="rgba(105, 105, 105, 0.52)"
                    strokeWidth="1.15"
                    strokeDasharray="4 4"
                    markerEnd="url(#sanhe-opposite-arrow)"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        );
    };

    // 宫干四化：落本宫为离心自化（向盘外），落对宫为向心自化（向中宫）。
    const renderSelfMutationArrows = () => {
        if (!showConnections || isSihuaMode) return null;
        const isInteractive = true;
        const arrowModels = Object.entries(selfMutationsByBranch).flatMap(([branch, entries]) => (
            ['outward', 'inward'].flatMap((kind) => {
                const sameDirection = entries.filter((entry) => entry.kind === kind);
                return sameDirection.map((entry, slotIndex) => ({
                    ...entry,
                    sourceBranch: branch,
                    geometry: getMutationArrowGeometry(entry, slotIndex, sameDirection.length),
                }));
            })
        )).filter((entry) => entry.geometry);

        if (arrowModels.length === 0) return null;
        const hasSelectedSelfArrow = selectedMutationInfo?.layer === 'self';

        return (
            <svg
                className={`wenmo-self-mutations absolute inset-0 h-full w-full${hasSelectedSelfArrow ? ' has-selection' : ''}`}
                data-testid="ziwei-self-mutation-layer"
                viewBox="0 0 400 400"
                preserveAspectRatio="none"
                role="group"
                aria-label="宫干自化箭头，点击查看含义"
            >
                <defs>
                    {MUTAGEN_META.map((meta) => (
                        <marker
                            key={meta.key}
                            id={`self-mutation-arrow-${meta.key}`}
                            markerWidth="5.4"
                            markerHeight="5.4"
                            refX="4.65"
                            refY="2.7"
                            orient="auto"
                            markerUnits="strokeWidth"
                        >
                            <path d="M0,0 L5.4,2.7 L0,5.4 Z" fill={meta.color} />
                        </marker>
                    ))}
                </defs>
                {arrowModels.map((entry) => {
                    const isSelected = hasSelectedSelfArrow
                        && selectedMutationInfo.sourceIndex === entry.sourceIndex
                        && selectedMutationInfo.targetIndex === entry.targetIndex
                        && selectedMutationInfo.mutagen === entry.mutagen;
                    return (
                    <g
                        key={`${entry.sourceIndex}-${entry.mutagen}-${entry.kind}`}
                        className={`wenmo-mutation-hit${isInteractive ? '' : ' is-passive'}${isSelected ? ' is-selected' : ''}`}
                        data-mutagen={entry.mutagen}
                        data-mutation-direction={entry.kind}
                        data-selected={isSelected ? 'true' : 'false'}
                        style={{ '--route-color': entry.color }}
                        role={isInteractive ? 'button' : undefined}
                        tabIndex={isInteractive ? 0 : undefined}
                        aria-label={isInteractive ? `${formatPalaceName(entry.sourceName)}${entry.sourceStem}干使${entry.starName}化${entry.mutagen}，${entry.kind === 'outward' ? '离心自化' : '向心自化'}，点击查看说明` : undefined}
                        onClick={isInteractive ? (event) => {
                            event.stopPropagation();
                            selectMutationInfo(entry, 'self');
                        } : undefined}
                        onKeyDown={isInteractive ? (event) => handleMutationKeyDown(event, entry, 'self') : undefined}
                    >
                        <title>{`${formatPalaceName(entry.sourceName)}干化${entry.mutagen}·${entry.kind === 'outward' ? '离心自化' : '向心自化'}`}</title>
                        {isInteractive && (
                            <>
                                <circle
                                    className="wenmo-arrow-hit-pad"
                                    cx={(entry.geometry.start.x + entry.geometry.end.x) / 2}
                                    cy={(entry.geometry.start.y + entry.geometry.end.y) / 2}
                                    r="4.5"
                                />
                                <line
                                    className="wenmo-arrow-hit-target"
                                    x1={entry.geometry.start.x}
                                    y1={entry.geometry.start.y}
                                    x2={entry.geometry.end.x}
                                    y2={entry.geometry.end.y}
                                    vectorEffect="non-scaling-stroke"
                                />
                            </>
                        )}
                        <line
                            className="wenmo-self-arrow-line"
                            x1={entry.geometry.start.x}
                            y1={entry.geometry.start.y}
                            x2={entry.geometry.end.x}
                            y2={entry.geometry.end.y}
                            stroke={entry.color}
                            strokeWidth="1.75"
                            markerEnd={`url(#self-mutation-arrow-${entry.key})`}
                            vectorEffect="non-scaling-stroke"
                        />
                    </g>
                    );
                })}
            </svg>
        );
    };

    // 四化盘：宫内 A/B/C/D 是四化类型；短外箭头是离心自化，
    // 短内箭头是向心自化。真实落宫只用于说明，不改变箭头的发起宫锚点。
    const renderSihuaConnections = () => {
        if (!showConnections || !isSihuaMode || sihuaDiagramEntries.length === 0) return null;

        const routeCounts = sihuaDiagramEntries.reduce((counts, entry) => {
            const routeKey = `${entry.track}-${entry.anchorBranch}`;
            counts[routeKey] = (counts[routeKey] || 0) + 1;
            return counts;
        }, {});
        const routeSlots = {};
        const diagramModels = sihuaDiagramEntries.map((entry) => {
            const routeKey = `${entry.track}-${entry.anchorBranch}`;
            const slotIndex = routeSlots[routeKey] || 0;
            routeSlots[routeKey] = slotIndex + 1;
            const slotCount = routeCounts[routeKey] || 1;
            const outward = getOutwardVector(entry.anchorBranch);
            if (!outward) return null;

            const geometry = getMutationArrowGeometry(entry, slotIndex, slotCount);
            if (!geometry) return null;
            return {
                ...entry,
                path: `M ${geometry.start.x} ${geometry.start.y} L ${geometry.end.x} ${geometry.end.y}`,
                hitCenter: {
                    x: (geometry.start.x + geometry.end.x) / 2,
                    y: (geometry.start.y + geometry.end.y) / 2,
                },
                label: {
                    x: geometry.start.x + outward.x * 5,
                    y: geometry.start.y + outward.y * 5,
                },
            };
        }).filter(Boolean);

        const guideAxes = Array.from(new Map(
            diagramModels
                .filter((entry) => entry.kind === 'inward')
                .map((entry) => {
                    const branches = [entry.sourceBranch, entry.targetBranch].sort();
                    return [branches.join('-'), branches];
                }),
        ).values()).map(([sourceBranch, targetBranch]) => ({
            key: `${sourceBranch}-${targetBranch}`,
            start: getCenterFacingPoint(sourceBranch),
            end: getCenterFacingPoint(targetBranch),
        })).filter((axis) => axis.start && axis.end);
        const hasSelectedSihuaArrow = selectedMutationInfo?.layer === 'sihua';

        return (
            <svg
                className={`wenmo-sihua-lines absolute inset-0 h-full w-full${hasSelectedSihuaArrow ? ' has-selection' : ''}`}
                data-testid="ziwei-sihua-layer"
                viewBox="0 0 400 400"
                preserveAspectRatio="none"
                role="group"
                aria-label="四化自化图，A禄、B权、C科、D忌，点击箭头查看含义"
            >
                <defs>
                    {MUTAGEN_META.map((meta) => (
                        <marker
                            key={meta.key}
                            id={`sihua-reference-arrow-${meta.key}`}
                            markerWidth="6"
                            markerHeight="6"
                            refX="5.2"
                            refY="3"
                            orient="auto"
                            markerUnits="strokeWidth"
                        >
                            <path d="M0,0 L6,3 L0,6 Z" fill={meta.color} />
                        </marker>
                    ))}
                </defs>
                <g className="wenmo-sihua-guides" aria-hidden="true">
                    {guideAxes.map((axis) => (
                        <line
                            key={axis.key}
                            x1={axis.start.x}
                            y1={axis.start.y}
                            x2={axis.end.x}
                            y2={axis.end.y}
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                </g>
                {diagramModels.map((entry) => {
                    const isSelected = hasSelectedSihuaArrow
                        && selectedMutationInfo.sourceIndex === entry.sourceIndex
                        && selectedMutationInfo.targetIndex === entry.targetIndex
                        && selectedMutationInfo.mutagen === entry.mutagen;
                    return (
                    <g
                        key={`sihua-${entry.sourceIndex}-${entry.mutagen}-${entry.targetIndex}`}
                        className={`wenmo-sihua-route wenmo-mutation-hit${isSelected ? ' is-selected' : ''}`}
                        data-mutagen={entry.mutagen}
                        data-reference-code={entry.code}
                        data-mutation-direction={entry.kind}
                        data-anchor-branch={entry.anchorBranch}
                        data-selected={isSelected ? 'true' : 'false'}
                        style={{ '--route-color': entry.color }}
                        role="button"
                        tabIndex="0"
                        aria-label={`${entry.code}=化${entry.mutagen}，${formatPalaceName(entry.sourceName)}${entry.sourceStem}干使${entry.starName}化${entry.mutagen}，${entry.kind === 'outward' ? '离心自化' : `向心自化并落入${formatPalaceName(entry.targetName)}`}，点击查看说明`}
                        onClick={(event) => {
                            event.stopPropagation();
                            selectMutationInfo(entry, 'sihua');
                        }}
                        onKeyDown={(event) => handleMutationKeyDown(event, entry, 'sihua')}
                    >
                        <title>{`${entry.code}＝化${entry.mutagen} · ${formatPalaceName(entry.sourceName)}→${formatPalaceName(entry.targetName)}`}</title>
                        <path
                            className="wenmo-arrow-hit-target"
                            d={entry.path}
                            fill="none"
                            vectorEffect="non-scaling-stroke"
                        />
                        <path
                            className="wenmo-sihua-path"
                            d={entry.path}
                            fill="none"
                            stroke={entry.color}
                            markerEnd={`url(#sihua-reference-arrow-${entry.key})`}
                            vectorEffect="non-scaling-stroke"
                        />
                        <ellipse
                            className="wenmo-arrow-hit-pad wenmo-sihua-code-hit"
                            cx={entry.label.x}
                            cy={entry.label.y}
                            rx="30"
                            ry="23"
                        />
                        <text
                            className="wenmo-sihua-route-code"
                            x={entry.label.x}
                            y={entry.label.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={entry.color}
                        >{entry.code}</text>
                        <circle
                            className="wenmo-arrow-hit-pad wenmo-sihua-anchor"
                            cx={entry.hitCenter.x}
                            cy={entry.hitCenter.y}
                            r="12"
                        />
                    </g>
                    );
                })}
            </svg>
        );
    };

    // 飞星模式只画当前所选宫位的四条宫干四化，避免 48 条线同时堆叠。
    const renderFlyConnections = () => {
        if (!showConnections || professionalToolMode !== 'fly' || focusedPalaceFlights.length === 0) return null;

        const duplicateCounts = focusedPalaceFlights.reduce((counts, flight) => {
            counts[flight.targetIndex] = (counts[flight.targetIndex] || 0) + 1;
            return counts;
        }, {});
        const duplicateSlots = {};

        const paths = focusedPalaceFlights.map((flight, flightIndex) => {
            const source = getBranchCenter(flight.sourceBranch);
            const target = getBranchCenter(flight.targetBranch);
            if (!source || !target) return null;

            const slotIndex = duplicateSlots[flight.targetIndex] || 0;
            duplicateSlots[flight.targetIndex] = slotIndex + 1;
            const slotCount = duplicateCounts[flight.targetIndex] || 1;
            const slotOffset = (slotIndex - (slotCount - 1) / 2) * 12;

            if (flight.sourceIndex === flight.targetIndex) {
                const outward = getOutwardVector(flight.sourceBranch) || { x: 0, y: -1 };
                const tangent = { x: -outward.y, y: outward.x };
                const anchor = {
                    x: source.x + outward.x * 23 + tangent.x * slotOffset,
                    y: source.y + outward.y * 23 + tangent.y * slotOffset,
                };
                const start = { x: anchor.x - tangent.x * 11, y: anchor.y - tangent.y * 11 };
                const end = { x: anchor.x + tangent.x * 11, y: anchor.y + tangent.y * 11 };
                const controlA = { x: start.x + outward.x * 29 - tangent.x * 8, y: start.y + outward.y * 29 - tangent.y * 8 };
                const controlB = { x: end.x + outward.x * 29 + tangent.x * 8, y: end.y + outward.y * 29 + tangent.y * 8 };
                return {
                    ...flight,
                    flightIndex,
                    path: `M ${start.x} ${start.y} C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${end.x} ${end.y}`,
                    hitCenter: {
                        x: (start.x + 3 * controlA.x + 3 * controlB.x + end.x) / 8,
                        y: (start.y + 3 * controlA.y + 3 * controlB.y + end.y) / 8,
                    },
                };
            }

            const delta = { x: target.x - source.x, y: target.y - source.y };
            const length = Math.hypot(delta.x, delta.y) || 1;
            const unit = { x: delta.x / length, y: delta.y / length };
            const tangent = { x: -unit.y, y: unit.x };
            const start = {
                x: source.x + unit.x * 19 + tangent.x * slotOffset,
                y: source.y + unit.y * 19 + tangent.y * slotOffset,
            };
            const end = {
                x: target.x - unit.x * 20 + tangent.x * slotOffset,
                y: target.y - unit.y * 20 + tangent.y * slotOffset,
            };
            const bend = (flightIndex - 1.5) * 5;
            const control = {
                x: (start.x + end.x) / 2 + tangent.x * bend,
                y: (start.y + end.y) / 2 + tangent.y * bend,
            };

            return {
                ...flight,
                flightIndex,
                path: `M ${start.x} ${start.y} Q ${control.x} ${control.y}, ${end.x} ${end.y}`,
                hitCenter: {
                    x: (start.x + 2 * control.x + end.x) / 4,
                    y: (start.y + 2 * control.y + end.y) / 4,
                },
            };
        }).filter(Boolean);

        return (
            <svg
                className="wenmo-fly-lines absolute inset-0 h-full w-full"
                data-testid="ziwei-fly-layer"
                viewBox="0 0 400 400"
                preserveAspectRatio="none"
                role="group"
                aria-label="宫干飞星箭头，点击查看含义"
            >
                <defs>
                    {MUTAGEN_META.map((meta) => (
                        <marker
                            key={meta.key}
                            id={`fly-arrow-${meta.key}`}
                            markerWidth="6"
                            markerHeight="6"
                            refX="5.2"
                            refY="3"
                            orient="auto"
                            markerUnits="strokeWidth"
                        >
                            <path d="M0,0 L6,3 L0,6 Z" fill={meta.color} />
                        </marker>
                    ))}
                </defs>
                {paths.map((flight) => (
                    <g
                        key={`${flight.sourceIndex}-${flight.mutagen}-${flight.targetIndex}`}
                        className="wenmo-mutation-hit"
                        data-mutagen={flight.mutagen}
                        onClick={(event) => {
                            event.stopPropagation();
                            selectMutationInfo(flight, 'fly');
                        }}
                    >
                        <title>{`${formatPalaceName(flight.sourceName)}化${flight.mutagen}→${formatPalaceName(flight.targetName)}`}</title>
                        <path
                            className="wenmo-arrow-hit-target"
                            d={flight.path}
                            pathLength="100"
                            fill="none"
                            vectorEffect="non-scaling-stroke"
                        />
                        <path
                            className="wenmo-fly-path"
                            d={flight.path}
                            pathLength="100"
                            stroke={flight.color}
                            strokeWidth="1.65"
                            fill="none"
                            markerEnd={`url(#fly-arrow-${flight.key})`}
                            vectorEffect="non-scaling-stroke"
                            style={{ '--flight-index': flight.flightIndex }}
                        />
                    </g>
                ))}
                {paths.map((flight) => (
                    <circle
                        key={`fly-hit-${flight.sourceIndex}-${flight.mutagen}-${flight.targetIndex}`}
                        className="wenmo-arrow-hit-pad wenmo-fly-anchor"
                        cx={flight.hitCenter.x}
                        cy={flight.hitCenter.y}
                        r="4.5"
                        role="button"
                        tabIndex="0"
                        aria-label={`${formatPalaceName(flight.sourceName)}${flight.sourceStem}干使${flight.starName}化${flight.mutagen}飞入${formatPalaceName(flight.targetName)}，点击查看说明`}
                        style={{ color: flight.color }}
                        onClick={(event) => {
                            event.stopPropagation();
                            selectMutationInfo(flight, 'fly');
                        }}
                        onKeyDown={(event) => handleMutationKeyDown(event, flight, 'fly')}
                    />
                ))}
            </svg>
        );
    };

    // Generic Copy Helper
    const copyToClipboard = async (text) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                alert('已复制分析指令！\n请发送给AI进行分析。');
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch {
            // Fallback for HTTP or Mobile restrictions
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed"; // Avoid scrolling to bottom
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    alert('已复制分析指令！\n请发送给AI进行分析。');
                    return;
                }
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
            }
            alert('自动复制失败，可能因浏览器安全限制(非HTTPS)。\n请尝试截图或手动输入。');
        }
    };

    const toggleCommonMenu = () => {
        if (!showCommonMenu) {
            setSelectedMutationInfo(null);
            setShowCenterDetails(false);
            setShowChartSettings(false);
            setShowAiMenu(false);
            setShowPatternAnalysis(false);
            setShowClassics(false);
            setShowGlossary(false);
        }
        setShowCommonMenu((visible) => !visible);
    };

    const openAiFromCommonMenu = () => {
        setSelectedMutationInfo(null);
        setMenuView('main');
        setShowCommonMenu(false);
        setShowAiMenu(true);
    };

    const openPatternAnalysis = () => {
        setSelectedMutationInfo(null);
        setShowCommonMenu(false);
        setPromptPreview(null);
        setSelectedPatternId(patternEntries[0]?.id || null);
        setShowPatternAnalysis(true);
    };

    const closePatternAnalysis = () => {
        setShowPatternAnalysis(false);
        window.requestAnimationFrame(() => commonMenuButtonRef.current?.focus());
    };

    const openClassics = () => {
        setSelectedMutationInfo(null);
        setShowCommonMenu(false);
        setPromptPreview(null);
        setShowPatternAnalysis(false);
        setShowClassics(true);
    };

    const closeClassics = () => {
        setShowClassics(false);
        window.requestAnimationFrame(() => commonMenuButtonRef.current?.focus());
    };

    const openGlossary = () => {
        setSelectedMutationInfo(null);
        setShowCommonMenu(false);
        setPromptPreview(null);
        setShowPatternAnalysis(false);
        setShowClassics(false);
        setShowGlossary(true);
    };

    const closeGlossary = () => {
        setShowGlossary(false);
        window.requestAnimationFrame(() => commonMenuButtonRef.current?.focus());
    };
    const glossarySeeds = useMemo(() => ziweiGlossarySeeds(focusedPalace), [focusedPalace]);

    const copyPatternAnalysis = async (feedback = false) => {
        const report = formatZiweiPatternReport(patternResults, structureResults);
        const text = feedback
            ? `格局分析反馈资料\n命盘：${horoscope.solarDate || basicInfo.birthday || '-'} ${basicInfo.birthTime || ''}\n规则版本：2026.08\n\n${report}`
            : report;
        try {
            await navigator.clipboard.writeText(text);
            alert(feedback ? '反馈资料已复制，可粘贴给我们。' : '格局分析已复制。');
        } catch {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            const copied = document.execCommand('copy');
            document.body.removeChild(textArea);
            alert(copied ? '格局分析已复制。' : '复制失败，请使用系统截图保存。');
        }
    };

    const sharePatternAnalysis = async () => {
        const text = formatZiweiPatternReport(patternResults, structureResults);
        if (navigator.share) {
            try {
                await navigator.share({ title: '古书派紫微 · 格局分析', text });
                return;
            } catch (error) {
                if (error?.name === 'AbortError') return;
            }
        }
        await copyPatternAnalysis();
    };

    const openChartAdjustment = () => {
        setShowCommonMenu(false);
        setShowChartSettings(true);
        window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    };

    const handleScreenshotSave = async () => {
        setShowCommonMenu(false);
        await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

        const target = mobileChartMode === 'simple'
            ? document.querySelector('.chart-simple-grid')
            : document.querySelector('.chart-professional-grid');
        if (!target) {
            alert('未找到可保存的命盘区域。');
            return;
        }

        const styleProperties = [
            'display', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height',
            'min-width', 'min-height', 'max-width', 'max-height', 'box-sizing',
            'margin', 'padding', 'grid-template-columns', 'grid-template-rows',
            'grid-column', 'grid-row', 'align-items', 'justify-content', 'place-items',
            'gap', 'flex', 'flex-direction', 'flex-wrap', 'overflow', 'border',
            'border-radius', 'background', 'background-color', 'color', 'font-family',
            'font-size', 'font-weight', 'font-style', 'line-height', 'text-align',
            'letter-spacing', 'white-space', 'writing-mode', 'opacity', 'transform',
            'transform-origin', 'box-shadow', 'text-shadow', 'fill', 'stroke', 'stroke-width',
        ];
        const clone = target.cloneNode(true);
        const sourceNodes = [target, ...target.querySelectorAll('*')];
        const cloneNodes = [clone, ...clone.querySelectorAll('*')];

        sourceNodes.forEach((sourceNode, index) => {
            const cloneNode = cloneNodes[index];
            if (!cloneNode?.style) return;
            const computed = window.getComputedStyle(sourceNode);
            styleProperties.forEach((property) => {
                const value = computed.getPropertyValue(property);
                if (value) cloneNode.style.setProperty(property, value);
            });
        });

        const width = Math.ceil(target.scrollWidth || target.getBoundingClientRect().width);
        const height = Math.ceil(target.scrollHeight || target.getBoundingClientRect().height);
        const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1, 4096 / width, 4096 / height));
        clone.style.width = `${width}px`;
        clone.style.height = `${height}px`;
        clone.style.margin = '0';

        try {
            if (document.fonts?.ready) await document.fonts.ready;
            const serialized = new XMLSerializer().serializeToString(clone);
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${serialized}</div></foreignObject></svg>`;
            const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
            const image = new Image();
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
                image.src = svgUrl;
            });

            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const context = canvas.getContext('2d');
            context.scale(scale, scale);
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);
            URL.revokeObjectURL(svgUrl);

            const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.96));
            if (!pngBlob) throw new Error('PNG export failed');
            const fileName = `古书派紫微-${horoscope.solarDate || '命盘'}.png`;
            const file = typeof File === 'function' ? new File([pngBlob], fileName, { type: 'image/png' }) : null;

            if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({ title: '古书派紫微命盘', files: [file] });
            } else {
                const downloadUrl = URL.createObjectURL(pngBlob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            }
        } catch (error) {
            if (error?.name === 'AbortError') return;
            console.error('Screenshot export failed:', error);
            alert('当前浏览器无法直接生成图片，请使用“打印分享”保存为 PDF。');
        }
    };

    // Generate Prompt for AI Analysis
    const handleGeneratePrompt = async (type) => {
        try {
            let prompt = '';
            const chartData = generateChartDataPrompt(horoscope, { gender: basicInfo.gender, patterns: patternEntries });
            const basicInfoData = `\n**--- 命主基本信息 (用于推算大限流年) ---**\n- **姓名**：${basicInfo.name || '未填写'}\n- **性别**：${basicInfo.gender === 'male' ? '男' : '女'}\n- **生辰**：${basicInfo.birthday}\n- **出生时辰**：${basicInfo.birthTime}\n`;

            if (type === 'character') {
                prompt = `${withClassicsFor(`${CHARACTER_PROMPT_TEMPLATE}\n${basicInfoData}\n${chartData}`, type)}\n\n${CHARACTER_PROMPT_TAIL}`;
            } else if (type === 'marriage') {
                prompt = withClassicsFor(`${MARRIAGE_PROMPT_TEMPLATE}\n${basicInfoData}\n${chartData}`, type);
            } else if (type === 'wealth') {
                prompt = withClassicsFor(`${WEALTH_PROMPT_TEMPLATE}\n${basicInfoData}\n${chartData}`, type);
            } else if (['yearly', 'monthly', 'daily', 'hourly'].includes(type)) {
                const fortuneContext = buildCurrentFortuneContext({
                    horoscope,
                    basicInfo,
                    type,
                    now: new Date(),
                });
                const targetOrder = ['yearly', 'monthly', 'daily', 'hourly'];
                const targetIndex = targetOrder.indexOf(type);

                setSelection(fortuneContext.selection);
                setCurrentFortuneContext(fortuneContext);
                setFocusedIndex(fortuneContext.fortune[type]?.index ?? fortuneContext.fortune.decadal.index);
                setActiveLayers({
                    origin: true,
                    decadal: true,
                    yearly: true,
                    monthly: targetIndex >= 1,
                    daily: targetIndex >= 2,
                    hourly: targetIndex >= 3,
                });

                prompt = withClassicsForFortune(generateFortunePromptText(
                    type,
                    fortuneContext.selection,
                    fortuneContext.activeStems,
                    basicInfo,
                    horoscope,
                    palaces,
                    getAllMutagenStarMaps(),
                    fortuneContext,
                    { patterns: patternEntries },
                ), fortuneContext);

                if (!prompt) throw new Error(`无法生成${FORTUNE_LAYER_LABELS[type] || '运势'}话术`);

                setSelectedMutationInfo(null);
                setPromptPreview({
                    title: `${FORTUNE_LAYER_LABELS[type]}运势话术`,
                    text: prompt,
                });
                setShowAiMenu(false);
                return;
            } else if (type.startsWith('baby_')) {
                const babyType = type.replace('baby_', '');
                setSelectedBabyType(babyType);
                setSelectedMutationInfo(null);
                setShowPartnerModal(true);
                setShowAiMenu(false); // Close menu
                return; // Stop here, wait for modal
            }

            if (prompt) {
                track('ai_export', { kind: 'ziwei', scope: type, channel: 'copy' });
                await copyToClipboard(prompt);
                setShowAiMenu(false);
            }
        } catch (error) {
            console.error("Generate prompt error:", error);
            alert("生成话术失败，请检查数据完整性或刷新重试。");
        }
    };

    const handleConfirmPartner = async () => {
        if (!partnerInfo.birthday) {
            alert('请选择配偶出生日期');
            return;
        }

        setIsCalculating(true);

        // Use setTimeout to allow UI to update with "Calculating..." state
        setTimeout(async () => {
            try {
                // Calculate Partner Horoscope
                // 走同一套排盘入口，晚子时的处理与本人命盘一致。
                const partnerHoroscope = createZiweiHoroscope({
                    calendarType: 'solar',
                    birthDate: partnerInfo.birthday,
                    timeIndex: TIME_RANGES.indexOf(partnerInfo.birthTime),
                    gender: partnerInfo.gender === 'male' ? 'male' : 'female',
                });

                // Calculate Best Dates (The Heavy Lifting)
                const bestDates = await findBestConceptionDates(selectedBabyType);

                const prompt = generateBabyPrompt(selectedBabyType, basicInfo, horoscope, partnerHoroscope, bestDates);
                track('ai_export', { kind: 'ziwei', scope: 'baby', channel: 'copy' });

                navigator.clipboard.writeText(prompt).then(() => {
                    alert(`✅ 已生成【${selectedBabyType === 'leader' ? '帝王' : selectedBabyType === 'iq' ? '文昌' : selectedBabyType === 'sport' ? '武曲' : '陶朱'}起居注】指令！\n\n已为您筛选出未来14天内Top3最佳受孕时机。\n请发送给AI获取详细解读。`);
                    setShowPartnerModal(false);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    alert('复制失败，请手动复制。');
                });

            } catch (error) {
                console.error('Calculation failed:', error);
                alert('计算失败，请重试。');
            } finally {
                setIsCalculating(false);
            }
        }, 100);
    };

    const renderMutationExplanation = () => {
        if (!selectedMutationInfo) return null;

        const info = selectedMutationInfo;
        if (info.layer === 'guide') {
            return (
                <aside
                    className="wenmo-arrow-explainer wenmo-arrow-guide print:hidden"
                    data-testid="ziwei-arrow-onboarding"
                    role="dialog"
                    aria-modal="false"
                    aria-live="polite"
                    aria-labelledby="arrow-guide-title"
                    style={{ '--mutation-color': info.color }}
                >
                    <header>
                        <span className="wenmo-arrow-explainer__badge" aria-hidden="true">?</span>
                        <div>
                            <small>新手图解 · 大约 30 秒</small>
                            <h2 id="arrow-guide-title">彩色箭头是怎么产生的？</h2>
                        </div>
                        <button type="button" onClick={() => closeArrowGuide(false)} aria-label="稍后再看箭头说明">×</button>
                    </header>

                    <p className="wenmo-arrow-guide__intro">它不是装饰，也不是直接判吉凶。系统按下面的计算链，把宫位之间的四化关系画成箭头。</p>

                    <div className="wenmo-arrow-guide__formula" aria-label="箭头生成过程">
                        <span>起宫（宫干）</span><i>→</i><span>查十干四化表</span><i>→</i><span>找到目标星</span><i>→</i><span>看星所在宫</span>
                    </div>

                    <ol className="wenmo-arrow-guide__steps">
                        <li><b>先看颜色</b><span>绿色 A＝禄，紫色 B＝权，蓝色 C＝科，红色 D＝忌。</span></li>
                        <li><b>再看方向</b><span>箭头挂在哪个宫，哪个宫就是发起宫；朝盘外是离心自化，朝中宫是向心自化。</span></li>
                        <li><b>最后点箭头</b><span>会展开起宫、宫干、目标星、落宫和完整产生依据。</span></li>
                    </ol>

                    <div className="wenmo-arrow-guide__mutagens" aria-label="四化箭头颜色">
                        {MUTAGEN_META.map((meta) => (
                            <span key={meta.key} style={{ '--guide-color': meta.color }}><b>{meta.code}</b>{meta.mutagen}</span>
                        ))}
                    </div>

                    <div className="wenmo-arrow-guide__directions">
                        <div><b>箭头 → 盘外</b><span>本宫星曜被本宫宫干引动，称“离心自化”。</span></div>
                        <div><b>箭头 → 盘心</b><span>本宫宫干引动对宫星曜，称“向心自化”。</span></div>
                    </div>

                    <p className="wenmo-arrow-guide__note">灰色虚线只帮助定位对宫，不是另一种飞化。箭头颜色表示禄权科忌；星曜旁方章底色表示本命、大限、年、月、日、时，两套颜色不要混看。</p>

                    <div className="wenmo-arrow-guide__actions">
                        <button type="button" onClick={() => closeArrowGuide(false)}>稍后再看</button>
                        <button type="button" onClick={() => closeArrowGuide(true)}>开始看盘</button>
                    </div>
                </aside>
            );
        }

        if (info.layer === 'legend') {
            const meaning = MUTAGEN_MEANINGS[info.mutagen];
            return (
                <aside
                    className="wenmo-arrow-explainer print:hidden"
                    data-testid="ziwei-mutation-explainer"
                    data-mutagen={info.mutagen}
                    role="dialog"
                    aria-modal="false"
                    aria-live="polite"
                    aria-labelledby="mutation-explainer-title"
                    style={{ '--mutation-color': info.color }}
                >
                    <header>
                        <span className="wenmo-arrow-explainer__badge">{info.code}{info.mutagen}</span>
                        <div>
                            <small>四化代码基础说明</small>
                            <h2 id="mutation-explainer-title">{info.code} 代表化{info.mutagen} · {meaning.title}</h2>
                        </div>
                        <button type="button" onClick={() => setSelectedMutationInfo(null)} aria-label="关闭四化代码说明">×</button>
                    </header>

                    <p>在本盘中，字母 {info.code} 始终代表“化{info.mutagen}”。{meaning.detail} 字母只说明四化类型，本身不单独代表吉或凶。</p>

                    <dl>
                        <div><dt>代码</dt><dd>{info.code}</dd></div>
                        <div><dt>名称</dt><dd>化{info.mutagen}</dd></div>
                        <div><dt>常见重点</dt><dd>{meaning.title}</dd></div>
                        <div><dt>继续查看</dt><dd>点击同字母箭头</dd></div>
                    </dl>

                    <footer>
                        <span aria-hidden="true" />
                        <strong>如何看具体关系</strong>
                        <p>再点击盘中的 {info.code} 字母或箭头，可查看起宫、宫干、目标星与实际落宫。</p>
                        <small>十干四化：九干同《紫微斗数全书》，壬干依今人排盘作左辅化科（全书原文「壬梁紫府武」作天府化科）；不同流派配置可能不同。</small>
                    </footer>
                </aside>
            );
        }

        if (info.layer === 'badge') {
            const isSihuaCode = info.presentation === 'sihua';
            const selectedBadge = info.selectedBadge || info.badges[0];
            return (
                <aside
                    className="wenmo-arrow-explainer print:hidden"
                    data-testid="ziwei-mutation-explainer"
                    data-mutagen={info.mutagen}
                    role="dialog"
                    aria-modal="false"
                    aria-live="polite"
                    aria-labelledby="mutation-explainer-title"
                    style={{ '--mutation-color': info.color || '#6d67cc' }}
                >
                    <header>
                        <span className="wenmo-arrow-explainer__badge">{isSihuaCode ? `${selectedBadge?.code}${selectedBadge?.type}` : '四化'}</span>
                        <div>
                            <small>{isSihuaCode ? `${selectedBadge?.name || '当前'}四化代码 · A禄 B权 C科 D忌` : '星曜四化来源 · 本限年月日时'}</small>
                            <h2 id="mutation-explainer-title">{info.starName} · {formatPalaceName(info.targetName)}</h2>
                        </div>
                        <button type="button" onClick={() => setSelectedMutationInfo(null)} aria-label="关闭四化来源说明">×</button>
                    </header>

                    <p>{isSihuaCode
                        ? `宫内字母表示四化类型：${selectedBadge?.code} 对应化${selectedBadge?.type}。方章底色与左上角“本、限、年、月、日、时”共同表示来源层级。`
                        : '同一颗星可以同时承接多层四化。方章底色表示本命、大限、流年、流月、流日、流时，章中文字表示禄、权、科、忌。'}</p>

                    <div className="wenmo-transform-source-list" aria-label={`${info.starName}的全部四化来源`}>
                        {info.badges.map((badge) => (
                            <div key={`${badge.key}-${badge.type}`} style={{ '--source-color': badge.layerColor, '--mutagen-color': badge.mutagenColor }}>
                                <span>{badge.label}</span>
                                <strong>{badge.name}</strong>
                                <b>{badge.stem}干化{badge.type}</b>
                            </div>
                        ))}
                    </div>

                    <footer>
                        <span aria-hidden="true" />
                        <strong>当前四化表</strong>
                        <p>九干同《紫微斗数全书》十干四化，壬干用左辅化科（全书原文作天府）</p>
                        <small>不同流派的四化表可能不同；当前显示的是本项目采用的固定算法口径。</small>
                    </footer>
                </aside>
            );
        }

        const meaning = MUTAGEN_MEANINGS[info.mutagen] || {
            title: '四化关系',
            detail: '请结合整张命盘综合观察。',
        };
        const typeLabel = info.kind === 'outward'
            ? '离心自化'
            : info.kind === 'inward'
                ? '向心自化'
                : '宫干飞化';
        const sourceMutagenMap = getAllMutagenStarMaps()[info.sourceStem] || {};
        const sourceTableText = MUTAGEN_META.map((meta) => (
            `${sourceMutagenMap[meta.key] || '—'}化${meta.mutagen}`
        )).join(' · ');

        let ruleText;
        if ((info.layer === 'self' || info.layer === 'sihua') && info.kind === 'outward') {
            ruleText = `${formatPalaceName(info.sourceName)}的${info.sourceStem}干使本宫${info.starName}化${info.mutagen}。四化星仍落在本宫，所以用朝盘外的箭头标记“离心自化”。`;
        } else if ((info.layer === 'self' || info.layer === 'sihua') && info.kind === 'inward') {
            ruleText = `${formatPalaceName(info.sourceName)}的${info.sourceStem}干使对宫${formatPalaceName(info.targetName)}的${info.starName}化${info.mutagen}。箭头挂在发起宫内缘并朝中宫，标记“向心自化”；落宫资料仍保留为真实对宫。`;
        } else {
            const relationNote = info.kind === 'outward'
                ? '这条飞化落回本宫，同时构成离心自化。'
                : info.kind === 'inward'
                    ? '这条飞化落入对宫，同时构成向心自化。'
                    : '彩色箭头从起宫指向真实落宫。';
            ruleText = `${formatPalaceName(info.sourceName)}的${info.sourceStem}干使${info.starName}化${info.mutagen}，飞入${formatPalaceName(info.targetName)}。${relationNote}`;
        }

        return (
            <aside
                className="wenmo-arrow-explainer print:hidden"
                data-testid="ziwei-mutation-explainer"
                data-mutagen={info.mutagen}
                role="dialog"
                aria-modal="false"
                aria-live="polite"
                aria-labelledby="mutation-explainer-title"
                style={{ '--mutation-color': info.color }}
            >
                <header>
                    <span className="wenmo-arrow-explainer__badge">{info.layer === 'sihua' && info.code ? `${info.code}${info.mutagen}` : `化${info.mutagen}`}</span>
                    <div>
                        <small>本命宫干 · {info.layer === 'fly' ? '飞星箭头' : info.layer === 'sihua' ? `四化盘路径 · ${info.code}=化${info.mutagen}` : '宫干自化箭头'} · {typeLabel}</small>
                        <h2 id="mutation-explainer-title">{formatPalaceName(info.sourceName)} · {info.sourceStem}干 · {info.starName}化{info.mutagen}</h2>
                    </div>
                    <button type="button" onClick={() => setSelectedMutationInfo(null)} aria-label="关闭箭头说明">×</button>
                </header>

                <p>{ruleText}</p>

                <section className="wenmo-arrow-derivation" aria-label="这条箭头的产生依据">
                    <h3>这条箭头怎么来的</h3>
                    <ol>
                        <li><b>① 起宫</b><span>{formatPalaceName(info.sourceName)}的宫干是{info.sourceStem}。</span></li>
                        <li><b>② 查表</b><span>{info.sourceStem}干规定：{info.starName}化{info.mutagen}（{info.code || MUTAGEN_META.find((meta) => meta.mutagen === info.mutagen)?.code}）。</span></li>
                        <li><b>③ 找星</b><span>{info.starName}实际位于{formatPalaceName(info.targetName)}。</span></li>
                        <li><b>④ 定方向</b><span>{info.kind === 'outward' ? '目标星仍在起宫，所以箭头朝盘外。' : info.kind === 'inward' ? '目标星在起宫对宫，所以箭头从起宫内缘朝盘心。' : `目标星落在${formatPalaceName(info.targetName)}，所以画出宫干飞化线。`}</span></li>
                    </ol>
                    <details>
                        <summary>查看{info.sourceStem}干完整四化表</summary>
                        <p>{sourceTableText}</p>
                    </details>
                </section>

                <dl>
                    <div><dt>来源层级</dt><dd>本命宫干</dd></div>
                    <div><dt>起宫</dt><dd>{info.sourceBranch} · {formatPalaceName(info.sourceName)}</dd></div>
                    <div><dt>宫干</dt><dd>{info.sourceStem}干</dd></div>
                    <div><dt>目标星</dt><dd>{info.starName}化{info.mutagen}</dd></div>
                    <div><dt>落宫</dt><dd>{info.targetBranch} · {formatPalaceName(info.targetName)}</dd></div>
                    <div><dt>方向</dt><dd>{typeLabel}</dd></div>
                </dl>

                <footer>
                    <span aria-hidden="true" />
                    <strong>{meaning.title}</strong>
                    <p>{meaning.detail}</p>
                    <small>当前箭头按十干四化：九干同《紫微斗数全书》，壬干左辅化科（全书原文作天府）；不同流派可能不同。单条飞化只表示结构关系，不宜单独下吉凶结论。</small>
                </footer>
            </aside>
        );
    };

    const renderCenterDetails = () => {
        if (!showCenterDetails) return null;

        return (
            <div
                className="wenmo-center-details-modal print:hidden"
                data-testid="ziwei-center-details"
                role="presentation"
            >
                <button
                    type="button"
                    className="wenmo-center-details-backdrop"
                    aria-label="关闭排盘资料"
                    onClick={() => setShowCenterDetails(false)}
                />
                <aside
                    id="ziwei-center-details"
                    className="wenmo-center-details-sheet"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="ziwei-center-details-title"
                >
                    <header>
                        <div>
                            <small>中宫资料 · 计算口径透明</small>
                            <h2 id="ziwei-center-details-title">完整排盘资料</h2>
                        </div>
                        <button type="button" aria-label="关闭完整排盘资料" onClick={() => setShowCenterDetails(false)}>×</button>
                    </header>

                    <div className="wenmo-center-details-scroll">
                        <section>
                            <h3><span>壹</span>出生与校时</h3>
                            <dl className="wenmo-center-detail-list">
                                <div><dt>姓名</dt><dd>{basicInfo.name || '匿名'}</dd></div>
                                <div><dt>阴阳性别</dt><dd>{yinYangGenderLabel}</dd></div>
                                <div><dt>五行局</dt><dd>{horoscope.fiveElementsClass || '-'}</dd></div>
                                <div><dt>原始输入</dt><dd>{hideBirthDetails ? '已隐藏' : birthInputLabel}</dd></div>
                                <div><dt>出生公历</dt><dd>{hideBirthDetails ? '已隐藏' : birthSolarLabel}</dd></div>
                                <div><dt>出生钟表时</dt><dd>{hideBirthDetails ? '已隐藏' : basicInfo.birthTime || horoscope.time || '-'}</dd></div>
                                <div><dt>出生农历</dt><dd>{hideBirthDetails ? '已隐藏' : horoscope.lunarDate || basicInfo.lunarDate || '-'}</dd></div>
                                {horoscope.lateZi && <div><dt>晚子时</dt><dd>{hideBirthDetails ? '已隐藏' : horoscope.lateZi.text}</dd></div>}
                                <div className={basicInfo.trueSolar?.applied ? '' : 'is-warning'}><dt>真太阳时</dt><dd>{hideBirthDetails ? '已隐藏' : trueSolarLabel}</dd></div>
                                <div><dt>制盘时间</dt><dd>{currentTimeLabel}</dd></div>
                            </dl>
                        </section>

                        <section>
                            <h3><span>贰</span>紫微核心资料</h3>
                            <dl className="wenmo-center-detail-list is-two-columns">
                                <div><dt>命主</dt><dd>{horoscope.soul || '-'}</dd></div>
                                <div><dt>身主</dt><dd>{horoscope.body || '-'}</dd></div>
                                <div><dt>生肖</dt><dd>{horoscope.zodiac || '-'}</dd></div>
                                <div><dt>命宫地支</dt><dd>{horoscope.earthlyBranchOfSoulPalace || '-'}宫</dd></div>
                                <div><dt>身宫地支</dt><dd>{horoscope.earthlyBranchOfBodyPalace || '-'}宫</dd></div>
                                <div className="is-pending"><dt>子斗</dt><dd>尚未接入经过校验的算法</dd></div>
                            </dl>
                            <p className="wenmo-center-detail-note">安星依据《紫微斗数全书》安星诀：安命身、定五行局、起紫微天府、十四主星与辅佐煞曜、长生博士将前岁前十二神、大限小限；十干四化取《全书》「甲廉破武阳」歌诀（庚：阳武阴同）；惟壬干全书作「梁紫府武」，本程序依今人排盘用「梁紫左武」。年柱以立春为界，闰月十五以后按下月安命，晚子时见上方说明。</p>
                        </section>

                        <section>
                            <h3><span>叁</span>历法与节气四柱</h3>
                            <div className="wenmo-center-detail-pillars" aria-label="节气四柱">
                                {['年柱', '月柱', '日柱', '时柱'].map((label, index) => (
                                    <div key={label}>
                                        <small>{label}</small>
                                        <b data-tone={getGanzhiTone(visibleCenterPillars[index])}>{visibleCenterPillars[index] || '—'}</b>
                                    </div>
                                ))}
                            </div>
                            <p className="wenmo-center-detail-note">{hideBirthDetails ? '隐私模式已隐藏四柱显示，命盘计算结果并未改变。' : '四柱采用节气口径：年柱以立春为界，月柱以节令为界。上方农历日期用于历法对照，不把农历月份冒充八字月柱。'}</p>
                        </section>

                        <section>
                            <h3><span>肆</span>紫微大限</h3>
                            <dl className="wenmo-center-detail-list">
                                <div><dt>紫微首限</dt><dd>{formatDaxian(firstDaxianPalace)}</dd></div>
                                <div><dt>当前查看大限</dt><dd>{formatDaxian(viewedDaxianPalace)}</dd></div>
                            </dl>
                            <div className="wenmo-center-detail-decades" aria-label="紫微十年大限表">
                                {sortedDaxianPalaces.map((palace) => {
                                    const [startAge, endAge] = palace.decadal.range;
                                    return (
                                        <span key={palace.index} className={viewedDaxianPalace?.index === palace.index ? 'is-active' : ''}>
                                            <b>{palace.decadal.heavenlyStem}{palace.decadal.earthlyBranch}</b>
                                            <small>{startAge}-{endAge}岁</small>
                                            <em>{birthYear + startAge - 1}-{birthYear + endAge - 1}</em>
                                        </span>
                                    );
                                })}
                            </div>
                        </section>

                        <section>
                            <h3><span>伍</span>八字起运（另一套体系）</h3>
                            {centerBaziSummary && !hideBirthDetails ? (
                                <>
                                    <dl className="wenmo-center-detail-list">
                                        <div><dt>起运时间差</dt><dd>出生后 {centerBaziSummary.startLuck}</dd></div>
                                        <div><dt>交运时刻</dt><dd>{centerBaziSummary.startSolar}</dd></div>
                                        <div><dt>行运方向</dt><dd>{centerBaziSummary.direction}</dd></div>
                                    </dl>
                                    <h4 className="wenmo-center-detail-subtitle">八字十年大运</h4>
                                    <div className="wenmo-center-detail-decades" aria-label="八字十年大运表">
                                        {centerBaziSummary.dayun.slice(0, 10).map((item) => (
                                            <span key={`${item.ganZhi}-${item.years}`} className={item.isCurrent ? 'is-active' : ''}>
                                                <b>{item.ganZhi}</b>
                                                <small>{item.ages}</small>
                                                <em>{item.years}</em>
                                            </span>
                                        ))}
                                    </div>
                                </>
                            ) : <p className="wenmo-center-detail-note">{hideBirthDetails ? '隐私模式已隐藏八字起运与大运资料。' : '当前出生资料不足，暂时无法计算八字起运。'}</p>}
                            <p className="wenmo-center-detail-note is-warning">八字起运与紫微大限不是同一个体系。当前只知道所选时辰范围，起运结果按该时辰起点估算；补录准确分钟及出生地后才可进一步校正。</p>
                        </section>

                        <section>
                            <h3><span>陆</span>当前查看层级</h3>
                            <p className="wenmo-center-current-view">{currentViewLabel}</p>
                            <div className="wenmo-center-layer-status" aria-label="本限年月日时状态">
                                {MUTAGEN_LAYER_META.map((layer) => (
                                    <span key={layer.key} data-active={Boolean(activeLayers[layer.key] && activeStems[layer.key])} style={{ '--layer-color': layer.layerColor }}>
                                        <b>{layer.label}</b><small>{activeStems[layer.key] || '未选'}</small>
                                    </span>
                                ))}
                            </div>
                            <p className="wenmo-center-detail-note">“当前查看”只控制本命、大限、流年、流月、流日、流时叠层，不会改变出生时间。</p>
                        </section>
                    </div>
                </aside>
            </div>
        );
    };

    return (
        <div
            className="professional-chart wenmo-chart"
            data-chart-mode={professionalToolMode}
            data-star-density={compactStarView ? 'compact' : 'full'}
            data-birth-details={hideBirthDetails ? 'hidden' : 'visible'}
        >
            <header className="wenmo-professional-bar print:hidden">
                <button type="button" onClick={onOpenArchive} aria-label="打开命例档案">
                    <span aria-hidden="true">‹</span> 命例
                </button>
                <h1 data-testid="ziwei-chart-title">古书派紫微专业版</h1>
                <button
                    type="button"
                    onClick={() => {
                        setSelectedMutationInfo(null);
                        setShowCommonMenu(false);
                        setShowChartSettings((visible) => !visible);
                    }}
                    aria-expanded={showChartSettings}
                    aria-controls="chart-settings-panel"
                >
                    设置 <span aria-hidden="true">›</span>
                </button>
            </header>

            {showChartSettings && (
                <section id="chart-settings-panel" className="wenmo-settings-panel print:hidden" aria-label="命盘设置">
                    <div>
                        <span>显示模式</span>
                        <button type="button" aria-pressed={mobileChartMode === 'professional'} onClick={() => setMobileChartMode('professional')}>专业盘</button>
                        <button type="button" aria-pressed={mobileChartMode === 'simple'} onClick={() => setMobileChartMode('simple')}>简洁盘</button>
                    </div>
                    <div>
                        <span>连线图层</span>
                        <button type="button" aria-pressed={showConnections} onClick={() => setShowConnections((visible) => !visible)}>盘式连线</button>
                    </div>
                    <div>
                        <span>命盘资料</span>
                        <button type="button" onClick={onSave}>保存档案</button>
                        <button type="button" onClick={onQuickChart}>修改生辰</button>
                    </div>
                    <div className="wenmo-settings-layers">
                        <span>四化来源</span>
                        <div className="wenmo-layer-grid" role="group" aria-label="选择四化来源层级">
                            {MUTAGEN_LAYER_META.map((layer) => (
                                <button
                                    key={layer.key}
                                    type="button"
                                    className="wenmo-layer-button"
                                    aria-pressed={activeLayers[layer.key]}
                                    aria-label={`${activeLayers[layer.key] ? '隐藏' : '显示'}${layer.name}四化${activeStems[layer.key] ? `，当前${activeStems[layer.key]}干` : '，当前尚未选择对应运限'}`}
                                    style={{ '--layer-color': layer.layerColor }}
                                    onClick={() => setActiveLayers((previous) => ({
                                        ...previous,
                                        [layer.key]: !previous[layer.key],
                                    }))}
                                >
                                    <span>{layer.label}</span>
                                    <span>{activeStems[layer.key] || '—'}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {mobileChartMode === 'professional' && showConnections && (
                <section
                    className="wenmo-arrow-help-strip print:hidden"
                    data-testid="ziwei-arrow-legend"
                    aria-label="彩色箭头常驻说明"
                >
                    <button type="button" className="wenmo-arrow-help-strip__trigger" onClick={openArrowGuide}>
                        <span aria-hidden="true">?</span>
                        <span><b>彩色箭头怎么看</b><small>宫干 → 四化表 → 目标星 → 所在宫</small></span>
                        <em>30 秒图解 ›</em>
                    </button>
                    <div className="wenmo-arrow-help-strip__key" aria-label="箭头颜色与方向">
                        {MUTAGEN_META.map((meta) => (
                            <span key={meta.key} style={{ '--guide-color': meta.color }}><b>{meta.code}</b>{meta.mutagen}</span>
                        ))}
                        <span className="is-direction">外＝离心</span>
                        <span className="is-direction">心＝向心</span>
                    </div>
                </section>
            )}

            {mobileChartMode === 'simple' && (
                <section className="chart-simple-grid md:hidden" aria-label="简洁十二宫命盘">
                    <div className="mb-2 flex items-center justify-between px-1">
                        <h2 className="text-sm font-black text-slate-800">十二宫速览</h2>
                        <span className="text-[11px] text-stone-500">点宫位可高亮查看</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
                        {BRANCH_ORDER
                            .map((branch) => palaces.find((palace) => palace.earthlyBranch === branch))
                            .filter(Boolean)
                            .map(renderSimplePalaceCard)}
                    </div>
                </section>
            )}

            {/* Chart Grid - Min width to ensure readability on mobile */}
            <div className={`chart-professional-grid ${mobileChartMode === 'professional' ? 'block' : 'hidden'} md:block`}>
                <div className="wenmo-board-shell">
                    <div className="wenmo-direction wenmo-direction--top" data-direction="south">
                        <span>正南方</span><span>南偏西</span>
                    </div>
                    <div className="wenmo-direction wenmo-direction--right" data-direction="west">
                        <span>西偏南</span><span>正西方</span><span>西偏北</span><span>北偏西</span>
                    </div>
                    <div className="wenmo-direction wenmo-direction--bottom" data-direction="north">
                        <span>北偏东</span><span>正北方</span>
                    </div>
                    <div className="wenmo-direction wenmo-direction--left" data-direction="east">
                        <span>南偏东</span><span>东偏南</span><span>正东方</span><span>东偏北</span>
                    </div>
                    <div className={`wenmo-board relative grid grid-cols-4 grid-rows-4 ${isFlyMode ? 'wenmo-board--fly' : isSihuaMode ? 'wenmo-board--sihua' : ''}`}>
                {renderSanheConnections()}
                {renderFlyConnections()}
                {renderSelfMutationArrows()}
                {renderSihuaConnections()}
                {/* Row 1 */}
                <div className="wenmo-grid-cell">{renderPalace('巳')}</div>
                <div className="wenmo-grid-cell">{renderPalace('午')}</div>
                <div className="wenmo-grid-cell">{renderPalace('未')}</div>
                <div className="wenmo-grid-cell">{renderPalace('申')}</div>

                {/* Row 2 */}
                <div className="wenmo-grid-cell">{renderPalace('辰')}</div>
                <div className="wenmo-center col-span-2 row-span-2 flex flex-col relative overflow-hidden">
                    <div className={`wenmo-center-info z-10 flex flex-col ${isFlyMode ? 'wenmo-center-info--fly' : isSihuaMode ? 'wenmo-center-info--sihua' : ''}`}>
                        <div className="wenmo-center-heading">
                            <strong>古书派紫微</strong><sup>PRO</sup>
                            <span>{yinYangGenderLabel} · {horoscope.fiveElementsClass}{isFlyMode ? ' · 飞星盘' : isSihuaMode ? ' · 四化盘' : ''}</span>
                            <button
                                type="button"
                                className="wenmo-center-detail-trigger print:hidden"
                                aria-expanded={showCenterDetails}
                                aria-controls="ziwei-center-details"
                                onClick={() => setShowCenterDetails(true)}
                            >资料ⓘ</button>
                        </div>

                        <div className="wenmo-profile-lines" data-testid="ziwei-center-summary">
                            <p><span>姓名：</span><strong>{basicInfo.name || '匿名'}</strong><span className="wenmo-profile-side">{yinYangGenderLabel} · 虚岁{virtualAge}</span></p>
                            <p><span>出生公历：</span><strong>{hideBirthDetails ? '已隐藏' : birthClockLabel}</strong></p>
                            <p><span>出生农历：</span><strong>{hideBirthDetails ? '已隐藏' : horoscope.lunarDate || basicInfo.lunarDate || '-'}</strong></p>
                            <p><span>真太阳时：</span><strong className={basicInfo.trueSolar?.applied ? '' : 'wenmo-profile-warning'}>{hideBirthDetails ? '已隐藏' : trueSolarShortLabel}</strong></p>
                            <p><span>命主：</span><strong>{horoscope.soul || '-'}</strong><span>身主：</span><strong>{horoscope.body || '-'}</strong><span>生肖：</span><strong>{horoscope.zodiac || '-'}</strong></p>
                            <p><span>命宫：</span><strong>{horoscope.earthlyBranchOfSoulPalace || '-'}宫</strong><span>身宫：</span><strong>{horoscope.earthlyBranchOfBodyPalace || '-'}宫</strong></p>
                            <p><span>当前查看：</span><strong>{currentViewLabel}</strong></p>
                        </div>

                        <div className="wenmo-pillar-panels">
                            <div>
                                <b>节气四柱（八字）</b>
                                <div className="wenmo-pillar-row">
                                    {visibleCenterPillars.map((pillar, index) => (
                                        <span key={`${pillar}-${index}`} data-tone={getGanzhiTone(pillar)}>{pillar}</span>
                                    ))}
                                </div>
                            </div>
                            {!isFlyMode && <div className="wenmo-active-transform-panel">
                                <b>四化来源天干</b>
                                <div className="wenmo-layer-stem-row">
                                    {MUTAGEN_LAYER_META.map((layer) => (
                                        <span
                                            key={layer.key}
                                            data-tone={getGanzhiTone(activeStems[layer.key])}
                                            data-enabled={activeLayers[layer.key]}
                                            title={`${layer.name}：${activeStems[layer.key] || '尚未选择'}`}
                                            style={{ '--layer-color': layer.layerColor }}
                                        >
                                            <small>{layer.label}</small>{activeStems[layer.key] || '—'}
                                        </span>
                                    ))}
                                </div>
                            </div>}
                        </div>

                        <p className="wenmo-start-limit">
                            <span>紫微首限：虚岁 {firstDaxianPalace?.decadal.range[0] || 1}-{firstDaxianPalace?.decadal.range[1] || 10}</span>
                            <span>八字起运：{hideBirthDetails ? '已隐藏' : centerBaziSummary?.startLuck || '资料不足'}{hideBirthDetails ? '' : '*'}</span>
                        </p>

                        {isFlyMode && (
                            <div className="wenmo-fly-decade-strip" aria-label="飞星大限序列">
                                {sortedDaxianPalaces.slice(0, 8).map((palace) => (
                                    <span
                                        key={palace.index}
                                        className={timelineDaxianPalace?.index === palace.index ? 'is-active' : ''}
                                        title={`${palace.decadal.range[0]}至${palace.decadal.range[1]}岁，${palace.decadal.heavenlyStem}${palace.decadal.earthlyBranch}限`}
                                    >
                                        <b>{palace.decadal.heavenlyStem}{palace.decadal.earthlyBranch}</b>
                                        <small>{palace.decadal.range[0]}岁</small>
                                    </span>
                                ))}
                            </div>
                        )}

                        {!isCompactToolMode && <div className="wenmo-center-stepper" role="group" aria-label="运盘快捷调整">
                            <button type="button" disabled={!selection.day} onClick={() => handleSelection('day', Math.max(1, selection.day - 1))}>日↑</button>
                            <button type="button" disabled={!selection.day || selection.day >= timelineDayCount} onClick={() => handleSelection('day', selection.day + 1)}>日↓</button>
                            <button type="button" aria-pressed={activeLayers.origin} onClick={() => setActiveLayers((prev) => ({ ...prev, origin: !prev.origin }))}>天盘▽</button>
                            <button type="button" disabled={selection.hour === null} onClick={() => handleSelection('hour', Math.max(0, selection.hour - 1))}>时↑</button>
                            <button type="button" disabled={selection.hour === null || selection.hour >= FORTUNE_HOUR_OPTIONS.length - 1} onClick={() => handleSelection('hour', selection.hour + 1)}>时↓</button>
                        </div>}

                        {isSihuaMode ? (
                            <div className="wenmo-sihua-code-legend" aria-label="四化代码说明">
                                {MUTAGEN_META.map((meta) => (
                                    <button
                                        key={meta.key}
                                        type="button"
                                        aria-label={`${meta.code}代表化${meta.mutagen}；点击查看含义`}
                                        style={{ '--legend-color': meta.color }}
                                        onClick={() => selectMutagenLegendInfo(meta)}
                                        onKeyDown={(event) => {
                                            if (event.key !== 'Enter' && event.key !== ' ') return;
                                            event.preventDefault();
                                            event.stopPropagation();
                                            selectMutagenLegendInfo(meta);
                                        }}
                                    ><b>{meta.code}</b><small>{meta.mutagen}</small></button>
                                ))}
                                <div className="wenmo-sihua-layer-legend" role="group" aria-label="四化来源层级颜色">
                                    {MUTAGEN_LAYER_META.map((layer) => (
                                        <button
                                            key={layer.key}
                                            type="button"
                                            aria-pressed={activeLayers[layer.key]}
                                            aria-label={`${layer.name}层，${activeStems[layer.key] ? `${activeStems[layer.key]}干` : '尚未选择'}；方章颜色${layer.label}`}
                                            style={{ '--layer-color': layer.layerColor }}
                                            onClick={() => setActiveLayers((previous) => ({
                                                ...previous,
                                                [layer.key]: !previous[layer.key],
                                            }))}
                                        >
                                            <b>{layer.label}</b><small>{activeStems[layer.key] || '—'}</small>
                                        </button>
                                    ))}
                                </div>
                                <p>箭头：禄绿·权紫·科蓝·忌红 · 方章：本红·限绿·年蓝·月橙·日紫·时青</p>
                                <small>盘外短箭头＝离心；起宫内缘朝中宫＝向心。点击字母、方章或箭头查看依据。</small>
                            </div>
                        ) : (
                            <div className="wenmo-transform-legend">
                                <span className="wenmo-transform-legend__mutagens">{isFlyMode ? '自化图示：' : '性质：'}<b>禄</b><b>权</b><b>科</b><b>忌</b></span>
                                <span className="wenmo-transform-legend__layers">方章来源：本红·限绿·年蓝·月橙·日紫·时青</span>
                                <small>{isFlyMode ? '箭头指向盘外＝离心自化；起宫内缘朝中宫＝向心自化（点箭头看说明）' : '箭头颜色＝禄权科忌；方章颜色＝时间层级'}</small>
                            </div>
                        )}

                        <div className="wenmo-powered">Powered by iztro</div>
                    </div>
                </div>
                <div className="wenmo-grid-cell">{renderPalace('酉')}</div>

                {/* Row 3 */}
                <div className="wenmo-grid-cell">{renderPalace('卯')}</div>
                {/* Center spans here */}
                <div className="wenmo-grid-cell">{renderPalace('戌')}</div>

                {/* Row 4 */}
                <div className="wenmo-grid-cell">{renderPalace('寅')}</div>
                <div className="wenmo-grid-cell">{renderPalace('丑')}</div>
                <div className="wenmo-grid-cell">{renderPalace('子')}</div>
                <div className="wenmo-grid-cell">{renderPalace('亥')}</div>
                    </div>
                </div>
            </div>

            <div className={`wenmo-luck-table chart-timeline ${isFlyMode ? 'wenmo-luck-table--fly' : isSihuaMode ? 'wenmo-luck-table--sihua' : ''}`} aria-label="运限时间选择">
                <section className="wenmo-luck-row" aria-label="大限">
                    <h3>大限</h3>
                    <div className="wenmo-luck-viewport">
                        <div className="wenmo-luck-track">
                            <button type="button" className="wenmo-luck-cell is-childhood" disabled><b>起限前</b><small>童限</small></button>
                            {sortedDaxianPalaces.map((palace) => (
                                <button
                                    key={palace.index}
                                    type="button"
                                    className={`wenmo-luck-cell ${selection.daxianIndex === palace.index ? 'is-active' : ''} ${currentDaxianPalace?.index === palace.index ? 'is-current' : ''}`}
                                    aria-pressed={selection.daxianIndex === palace.index}
                                    aria-label={`选择${palace.decadal.range[0]}至${palace.decadal.range[1]}岁大限，${palace.decadal.heavenlyStem}${palace.decadal.earthlyBranch}`}
                                    onClick={() => handleSelection('daxian', palace.index)}
                                >
                                    <b>{palace.decadal.range[0]}-{palace.decadal.range[1]}</b>
                                    <small>{palace.decadal.heavenlyStem}{palace.decadal.earthlyBranch}限</small>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="wenmo-luck-row" aria-label="流年">
                    <h3>流年<small>小限</small></h3>
                    <div className="wenmo-luck-viewport">
                        <div className="wenmo-luck-track">
                            {timelineYearModels.map(({ year, nominalAge, ganZhi }) => (
                                <button
                                    key={year}
                                    type="button"
                                    className={`wenmo-luck-cell ${selection.year === year ? 'is-active' : ''} ${year === currentFlowYear ? 'is-current' : ''}`}
                                    aria-pressed={selection.year === year}
                                    aria-label={`选择${year}流年`}
                                    onClick={() => handleTimelineYear(year)}
                                >
                                    <b>{year}年</b>
                                    <small>{ganZhi}{nominalAge}岁</small>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="wenmo-luck-row" aria-label="流月">
                    <h3>流月</h3>
                    <div className="wenmo-luck-viewport">
                        <div className="wenmo-luck-track">
                            {timelineMonthOptions.map((monthOption, index) => (
                                <button
                                    key={`${monthOption.month}-${monthOption.isLeap ? 'leap' : 'regular'}`}
                                    type="button"
                                    className={`wenmo-luck-cell ${selection.month === monthOption.month && selection.isLeapMonth === monthOption.isLeap ? 'is-active' : ''}`}
                                    aria-pressed={selection.month === monthOption.month && selection.isLeapMonth === monthOption.isLeap}
                                    aria-label={`选择${monthOption.label}`}
                                    disabled={!selection.year}
                                    onClick={() => handleSelection('month', monthOption)}
                                >
                                    <b>{monthOption.isLeap ? `闰${LUNAR_MONTH_NAMES[index % 12]}` : LUNAR_MONTH_NAMES[(monthOption.month - 1) % 12]}</b>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="wenmo-luck-row wenmo-luck-row--days" aria-label="流日">
                    <h3>流日</h3>
                    <div className="wenmo-day-grid">
                        {Array.from({ length: 30 }, (_, index) => index + 1).map((day) => (
                            <button
                                key={day}
                                type="button"
                                className={`wenmo-day-cell ${selection.day === day ? 'is-active' : ''}`}
                                aria-pressed={selection.day === day}
                                aria-label={`选择农历${day}日`}
                                disabled={!selection.month || day > timelineDayCount}
                                onClick={() => handleSelection('day', day)}
                            >
                                {LUNAR_DAY_NAMES[day - 1]}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="wenmo-luck-row" aria-label="流时">
                    <h3>流时</h3>
                    <div className="wenmo-luck-viewport">
                        <div className="wenmo-luck-track">
                            {FORTUNE_HOUR_OPTIONS.map((hourOption) => (
                                <button
                                    key={hourOption.index}
                                    type="button"
                                    className={`wenmo-luck-cell ${selection.hour === hourOption.index ? 'is-active' : ''}`}
                                    aria-pressed={selection.hour === hourOption.index}
                                    aria-label={`选择${hourOption.name}，${hourOption.range}`}
                                    disabled={!selection.day}
                                    onClick={() => handleSelection('hour', hourOption.index)}
                                >
                                    <b>{hourOption.name}</b>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            <div className="wenmo-mode-bar print:hidden">
                <div className="wenmo-common-anchor" ref={commonMenuRef}>
                    <button
                        ref={commonMenuButtonRef}
                        type="button"
                        className="wenmo-mode-side"
                        onClick={toggleCommonMenu}
                        aria-expanded={showCommonMenu}
                        aria-controls="wenmo-common-actions"
                    >常用功能</button>

                    {showCommonMenu && (
                        <nav
                            id="wenmo-common-actions"
                            className="wenmo-common-menu"
                            data-testid="ziwei-common-menu"
                            aria-label="常用功能菜单"
                        >
                            <button type="button" onClick={openAiFromCommonMenu}>AI 分析</button>
                            <button type="button" onClick={openPatternAnalysis}>格局分析</button>
                            <button type="button" onClick={openClassics}>古籍原文</button>
                            <button type="button" onClick={openGlossary}>术语词典</button>
                            <button
                                type="button"
                                aria-pressed={compactStarView}
                                onClick={() => {
                                    setCompactStarView((compact) => !compact);
                                    setShowCommonMenu(false);
                                }}
                            >精简星曜</button>
                            <button type="button" onClick={openChartAdjustment}>命盘调整</button>
                            <button
                                type="button"
                                aria-pressed={mobileChartMode === 'simple'}
                                title={mobileChartMode === 'professional' ? '切换到简洁盘' : '切换到专业盘'}
                                onClick={() => {
                                    setMobileChartMode((mode) => mode === 'professional' ? 'simple' : 'professional');
                                    setShowCommonMenu(false);
                                }}
                            >显示模式</button>
                            <button
                                type="button"
                                aria-pressed={hideBirthDetails}
                                onClick={() => {
                                    setHideBirthDetails((hidden) => !hidden);
                                    setShowCommonMenu(false);
                                }}
                            >隐藏生辰</button>
                            <button type="button" onClick={handleScreenshotSave}>截图保存</button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCommonMenu(false);
                                    window.print();
                                }}
                            >打印分享</button>
                            {onShareLink && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCommonMenu(false);
                                        onShareLink();
                                    }}
                                >分享链接</button>
                            )}
                        </nav>
                    )}
                </div>
                <div className="wenmo-mode-segments" role="group" aria-label="命盘叠层模式">
                    {[
                        { key: 'fly', label: '飞星' },
                        { key: 'sanhe', label: '三合' },
                        { key: 'sihua', label: '四化' },
                    ].map((mode) => (
                        <button
                            key={mode.key}
                            type="button"
                            aria-pressed={professionalToolMode === mode.key}
                            onClick={() => {
                                setSelectedMutationInfo(null);
                                setShowCommonMenu(false);
                                setProfessionalToolMode(mode.key);
                                setFlyRouteSourceIndex(null);
                                setShowConnections(true);
                                if (mode.key === 'sihua') setActiveLayers((prev) => ({ ...prev, origin: true }));
                            }}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
                <button type="button" className="wenmo-mode-side" onClick={() => { setShowCommonMenu(false); onQuickChart(); }}>快捷排盘</button>
            </div>

            {renderMutationExplanation()}
            {renderCenterDetails()}

            <nav className="wenmo-bottom-tabs print:hidden" aria-label="专业盘导航">
                <button type="button" className="is-active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><span>◉</span>命盘</button>
                <button type="button" onClick={() => { setSelectedMutationInfo(null); setShowAiMenu(true); }}><span>?</span>帮助</button>
                <button type="button" onClick={() => { setSelectedMutationInfo(null); setShowDonationModal(true); }}><span>ⓘ</span>关于</button>
            </nav>

            {/* --- Unified Floating Action Buttons (Stack) --- */}
            <div className="chart-action-bar fixed inset-x-0 bottom-0 z-50 pointer-events-none md:inset-x-auto md:right-4 md:bottom-6">
                <nav
                    className="pointer-events-auto grid grid-cols-4 gap-2 border-t border-white/10 bg-black/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl md:flex md:flex-col md:items-end md:border-0 md:bg-transparent md:p-0 md:shadow-none"
                    aria-label="命盘操作"
                >

                    {/* 1. Archive List Button */}
                    <button
                        type="button"
                        onClick={onOpenArchive}
                        className="group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-cyan-700 text-white shadow-lg transition active:scale-95 md:h-12 md:min-h-0 md:w-12 md:rounded-full md:bg-cyan-600 md:hover:scale-110 md:hover:bg-cyan-500"
                        title="查看档案"
                        aria-label="查看档案"
                    >
                        <Archive className="w-5 h-5" />
                        <span className="text-[11px] font-bold md:hidden">档案</span>
                        <span className="absolute right-14 hidden bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none md:block">
                            查看档案
                        </span>
                    </button>

                    {/* 2. Save Button */}
                    <button
                        type="button"
                        onClick={onSave}
                        className="group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-indigo-700 text-white shadow-lg transition active:scale-95 md:h-12 md:min-h-0 md:w-12 md:rounded-full md:bg-indigo-600 md:hover:scale-110 md:hover:bg-indigo-500"
                        title="保存档案"
                        aria-label="保存档案"
                    >
                        <Save className="w-5 h-5" />
                        <span className="text-[11px] font-bold md:hidden">保存</span>
                        <span className="absolute right-14 hidden bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none md:block">
                            保存档案
                        </span>
                    </button>

                    {/* 2. AI Analysis Button */}
                    <button
                        type="button"
                        onClick={() => {
                            if (showAiMenu) closeAiMenu();
                            else {
                                setSelectedMutationInfo(null);
                                setShowAiMenu(true);
                            }
                        }}
                        className="group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-purple-700 to-pink-700 text-white shadow-lg transition active:scale-95 md:h-12 md:min-h-0 md:w-12 md:rounded-full md:from-purple-600 md:to-pink-600 md:hover:scale-110"
                        title="AI 分析"
                        aria-label="打开 AI 分析菜单"
                        aria-expanded={showAiMenu}
                        aria-controls="ai-analysis-menu"
                    >
                        <Sparkles className="w-5 h-5" />
                        <span className="text-[11px] font-bold md:hidden">AI 分析</span>
                        <span className="absolute right-14 hidden bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none md:block">
                            AI 分析
                        </span>
                    </button>

                    {/* 4. Print / PDF Export Button */}
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-amber-700 to-orange-700 text-white shadow-lg transition active:scale-95 md:h-12 md:min-h-0 md:w-12 md:rounded-full md:from-amber-600 md:to-orange-600 md:hover:scale-110"
                        title="打印 / 存为 PDF"
                        aria-label="打印命盘或存为 PDF"
                    >
                        <Printer className="w-5 h-5" />
                        <span className="text-[11px] font-bold md:hidden">导出</span>
                        <span className="absolute right-14 hidden bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none md:block">
                            打印 / 存为 PDF
                        </span>
                    </button>
                </nav>
            </div>

            {/* Mobile bottom sheet / desktop popover for AI actions. */}
            {showAiMenu && (
                <div className="chart-modal fixed inset-0 z-[60]">
                    <button
                        type="button"
                        className="absolute inset-0 h-full w-full bg-black/60 md:bg-transparent"
                        onClick={closeAiMenu}
                        aria-label="关闭 AI 分析菜单"
                    />
                    <div
                        id="ai-analysis-menu"
                        role="dialog"
                        aria-modal="true"
                        aria-label="AI 分析菜单"
                        className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-hidden rounded-t-3xl border border-purple-500/30 bg-[#111]/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 fade-in duration-300 md:inset-x-auto md:right-20 md:bottom-24 md:w-72 md:rounded-xl md:pb-4"
                    >
                        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3 md:hidden">
                            <div>
                                <div className="text-base font-black text-white">AI 分析</div>
                                <div className="text-[11px] text-gray-400">选择要生成的话术</div>
                            </div>
                            <button
                                type="button"
                                onClick={closeAiMenu}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white"
                                aria-label="关闭 AI 分析菜单"
                            >
                                ×
                            </button>
                        </div>
                        <div className="max-h-[62vh] space-y-2 overflow-y-auto overscroll-contain md:max-h-none">
                        {menuView === 'main' && (
                            <>
                                <button onClick={() => handleGeneratePrompt('character')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center gap-3 text-sm font-bold text-gray-200 border border-transparent hover:border-purple-500/30 transition-all">
                                    <span className="text-xl">📜</span> 性情与婚恋
                                </button>
                                <button onClick={() => handleGeneratePrompt('marriage')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center gap-3 text-sm font-bold text-pink-300 border border-transparent hover:border-pink-500/30 transition-all">
                                    <span className="text-xl">💍</span> 何时结婚
                                </button>
                                <button onClick={() => handleGeneratePrompt('wealth')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center gap-3 text-sm font-bold text-yellow-300 border border-transparent hover:border-yellow-500/30 transition-all">
                                    <span className="text-xl">💰</span> 何时发财
                                </button>
                                <div className="h-px bg-white/10 my-2"></div>
                                <button onClick={() => setMenuView('fortune')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center justify-between text-sm font-bold text-blue-300 border border-transparent hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-3"><span className="text-xl">📅</span> 运势分析</div>
                                    <span>›</span>
                                </button>
                                <button onClick={() => setMenuView('baby')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center justify-between text-sm font-bold text-green-300 border border-transparent hover:border-green-500/30 transition-all">
                                    <div className="flex items-center gap-3"><span className="text-xl">👶</span> 起居注 (备孕)</div>
                                    <span>›</span>
                                </button>
                                <div className="h-px bg-white/10 my-2"></div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        closeAiMenu();
                                        setSelectedMutationInfo(null);
                                        setShowDonationModal(true);
                                    }}
                                    className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center gap-3 text-sm font-bold text-orange-300 border border-transparent hover:border-orange-500/30 transition-all"
                                >
                                    <Coffee className="h-5 w-5" /> 支持作者
                                </button>
                            </>
                        )}

                        {menuView === 'fortune' && (
                            <>
                                <button onClick={() => setMenuView('main')} className="w-full text-left px-4 py-2 rounded hover:bg-white/10 flex items-center gap-2 text-xs font-bold text-gray-400 mb-2">
                                    <span>⬅️</span> 返回上一级
                                </button>
                                <button onClick={() => handleGeneratePrompt('yearly')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center gap-3 text-sm font-bold text-blue-300 border border-transparent hover:border-blue-500/30 transition-all">
                                    <span className="text-xl">📅</span> 今年运势
                                </button>
                                <button onClick={() => handleGeneratePrompt('monthly')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center gap-3 text-sm font-bold text-yellow-300 border border-transparent hover:border-yellow-500/30 transition-all">
                                    <span className="text-xl">🌙</span> 今月运势
                                </button>
                                <button onClick={() => handleGeneratePrompt('daily')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center gap-3 text-sm font-bold text-purple-300 border border-transparent hover:border-purple-500/30 transition-all">
                                    <span className="text-xl">☀️</span> 今日运势
                                </button>
                                <button onClick={() => handleGeneratePrompt('hourly')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center gap-3 text-sm font-bold text-cyan-300 border border-transparent hover:border-cyan-500/30 transition-all">
                                    <span className="text-xl">⏰</span> 今时运势
                                </button>
                            </>
                        )}

                        {menuView === 'baby' && (
                            <>
                                <button onClick={() => setMenuView('main')} className="w-full text-left px-4 py-2 rounded hover:bg-white/10 flex items-center gap-2 text-xs font-bold text-gray-400 mb-2">
                                    <span>⬅️</span> 返回上一级
                                </button>
                                <button onClick={() => handleGeneratePrompt('baby_leader')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center gap-3 text-sm font-bold text-yellow-500 border border-transparent hover:border-yellow-500/30 transition-all">
                                    <span className="text-xl">👑</span> 帝王起居注 (领导型)
                                </button>
                                <button onClick={() => handleGeneratePrompt('baby_iq')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center gap-3 text-sm font-bold text-blue-400 border border-transparent hover:border-blue-500/30 transition-all">
                                    <span className="text-xl">🧠</span> 文昌起居注 (高IQ)
                                </button>
                                <button onClick={() => handleGeneratePrompt('baby_sport')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center gap-3 text-sm font-bold text-red-400 border border-transparent hover:border-red-500/30 transition-all">
                                    <span className="text-xl">💪</span> 武曲起居注 (体育型)
                                </button>
                                <button onClick={() => handleGeneratePrompt('baby_wealth')} className="w-full text-left px-4 py-3 rounded hover:bg-white/10 flex items-center gap-3 text-sm font-bold text-green-400 border border-transparent hover:border-green-500/30 transition-all">
                                    <span className="text-xl">💰</span> 陶朱起居注 (搞钱型)
                                </button>
                            </>
                        )}
                        </div>
                    </div>
                </div>
            )}

            {showPatternAnalysis && (
                <div
                    className="wenmo-pattern-modal chart-modal"
                    data-testid="ziwei-pattern-modal"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closePatternAnalysis();
                    }}
                >
                    <section
                        ref={patternDialogRef}
                        className="wenmo-pattern-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="wenmo-pattern-title"
                        aria-describedby="wenmo-pattern-disclaimer"
                    >
                        <div className="wenmo-pattern-paper">
                            <header>
                                <h2 id="wenmo-pattern-title" tabIndex="-1" data-pattern-focus>
                                    格局分析 <small>beta</small>
                                </h2>
                                <p>读取当前出生命盘，只列完整命中且有来源的本命规则</p>
                            </header>

                            <h3 className="wenmo-pattern-group-title">经典格局（完整命中）</h3>
                            <div className="wenmo-pattern-results" aria-label="已识别格局">
                                {patternResults.length > 0 ? patternResults.map((pattern) => (
                                    <button
                                        key={pattern.id}
                                        type="button"
                                        className="wenmo-pattern-card"
                                        data-testid="ziwei-pattern-result"
                                        data-fortune={pattern.fortune}
                                        data-group={pattern.group || undefined}
                                        aria-pressed={selectedPattern?.id === pattern.id}
                                        onClick={() => setSelectedPatternId(pattern.id)}
                                    >
                                        <span>
                                            {pattern.scopeLabel} · {pattern.name}
                                            {pattern.group && <small>《全书》{pattern.group}</small>}
                                        </span>
                                        <b>{pattern.fortuneLabel}</b>
                                    </button>
                                )) : (
                                    <div className="wenmo-pattern-empty" data-testid="ziwei-pattern-empty">
                                        <b>当前范围暂未识别到已收录格局</b>
                                        <span>这不表示命盘没有特点，只表示目前已校验的严格条件尚未完整命中。</span>
                                    </div>
                                )}
                            </div>

                            {structureResults.length > 0 && (
                                <>
                                    <h3 className="wenmo-pattern-group-title wenmo-pattern-group-title--structure">
                                        星系观察（不等于古典吉格）
                                    </h3>
                                    <div className="wenmo-pattern-results" aria-label="已识别星系观察">
                                        {structureResults.map((pattern) => (
                                            <button
                                                key={pattern.id}
                                                type="button"
                                                className="wenmo-pattern-card"
                                                data-testid="ziwei-structure-result"
                                                data-fortune={pattern.fortune}
                                                aria-pressed={selectedPattern?.id === pattern.id}
                                                onClick={() => setSelectedPatternId(pattern.id)}
                                            >
                                                <span>{pattern.scopeLabel} · {pattern.name}</span>
                                                <b>{pattern.fortuneLabel}</b>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="wenmo-pattern-explanation" data-testid="ziwei-pattern-evidence">
                                <span className="wenmo-pattern-label">说明：</span>
                                {selectedPattern ? (
                                    <>
                                        <p>{selectedPattern.summary}</p>
                                        <h3>判定依据</h3>
                                        <ol>
                                            {selectedPattern.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}
                                        </ol>
                                        <h3>口径与限制</h3>
                                        <ul>
                                            {selectedPattern.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
                                        </ul>
                                        <h3>规则来源</h3>
                                        <p className="wenmo-pattern-source-rule">{selectedPattern.source.rule}</p>
                                        <a
                                            className="wenmo-pattern-source"
                                            href={selectedPattern.source.url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {selectedPattern.source.title} · {selectedPattern.source.section} ↗
                                        </a>
                                    </>
                                ) : (
                                    <p>当前没有可展开的严格匹配结果。条件不完整的候选不会冒充已成立格局。</p>
                                )}

                                <div id="wenmo-pattern-disclaimer" className="wenmo-pattern-disclaimer" data-testid="ziwei-pattern-disclaimer">
                                    <p>1. 格局分析面向紫微斗数学习与研究，属于辅助参考，不应作为判断人生或作出重要决定的唯一依据。</p>
                                    <p>2. 古籍及现代整理的格局口径存在流派差异；经典格局栏只显示全部必要条件可由当前本命盘核验的结果。</p>
                                    <p>3. 星系观察与古典格局分栏显示，不把主星同宫、无正曜或部分命中结果伪装成格局，也不单凭格名判吉凶。</p>
                                    <p>4. 本版暂不把本命规则直接套到大限；运限格局须另按运限命宫与该层四化独立验算。</p>
                                    <p>5. 每个结果均提供判定证据、规则文字和资料链接；若有误可复制反馈资料供后续复核。</p>
                                </div>
                            </div>
                        </div>

                        <footer className="wenmo-pattern-actions">
                            <button type="button" onClick={() => copyPatternAnalysis(true)}>反馈问题建议</button>
                            <button type="button" aria-label="分享格局分析" onClick={sharePatternAnalysis}>⇧</button>
                            <button type="button" onClick={closePatternAnalysis}>关闭</button>
                        </footer>
                    </section>
                </div>
            )}

            {showClassics && (
                <div
                    className="wenmo-pattern-modal chart-modal"
                    data-testid="ziwei-classics-modal"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeClassics();
                    }}
                >
                    <section
                        ref={classicsDialogRef}
                        className="wenmo-pattern-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="wenmo-classics-title"
                    >
                        <div className="wenmo-pattern-paper">
                            <header>
                                <h2 id="wenmo-classics-title" tabIndex="-1" data-classics-focus>
                                    古籍原文 <small>beta</small>
                                </h2>
                                <p>选一个宫，看古籍里怎么说宫中的星曜；原文逐字照录公版古籍，白话另译并标注审核状态</p>
                            </header>
                            <ZiweiClassicsPanel palaces={palaces} focusedIndex={focusedIndex} gender={basicInfo.gender} patterns={patternNames} limits={classicsLimits} natal={natal} />
                        </div>

                        <footer className="wenmo-pattern-actions wenmo-pattern-actions--single">
                            <button type="button" onClick={closeClassics}>关闭</button>
                        </footer>
                    </section>
                </div>
            )}

            {showGlossary && (
                <div
                    className="wenmo-pattern-modal chart-modal"
                    data-testid="ziwei-glossary-modal"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeGlossary();
                    }}
                >
                    <section
                        ref={glossaryDialogRef}
                        className="wenmo-pattern-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="wenmo-glossary-title"
                    >
                        <div className="wenmo-pattern-paper">
                            <header>
                                <h2 id="wenmo-glossary-title" tabIndex="-1" data-glossary-focus>
                                    术语词典 <small>beta</small>
                                </h2>
                                <p>看不懂的名词在这里查：先列当前宫里出现的星曜与四化，也能搜任何术语</p>
                            </header>
                            <GlossaryPanel module="ziwei" seedTerms={glossarySeeds} subject={focusedPalace ? `${focusedPalace.name === '仆役' ? '交友' : focusedPalace.name}宫` : '这张盘'} testId="ziwei-glossary" className="mt-3 space-y-3" />
                        </div>

                        <footer className="wenmo-pattern-actions wenmo-pattern-actions--single">
                            <button type="button" onClick={closeGlossary}>关闭</button>
                        </footer>
                    </section>
                </div>
            )}

            {/* Generated fortune prompt preview */}
            {promptPreview && (
                <div className="chart-modal fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
                    <div className="w-full max-w-3xl max-h-[88vh] bg-stone-50 text-slate-900 rounded-2xl shadow-2xl border border-purple-300 flex flex-col overflow-hidden">
                        <div className="px-4 py-3 md:px-6 md:py-4 bg-gradient-to-r from-purple-700 to-cyan-700 text-white flex items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-lg">{promptPreview.title}</h3>
                                <p className="text-xs text-white/80">已自动带入当前大限与对应运限盘</p>
                            </div>
                            <button
                                onClick={() => setPromptPreview(null)}
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-xl leading-none"
                                aria-label="关闭话术预览"
                            >
                                ×
                            </button>
                        </div>

                        <textarea
                            readOnly
                            value={promptPreview.text}
                            className="flex-1 min-h-[52vh] p-4 md:p-6 bg-stone-50 text-slate-800 text-sm leading-relaxed font-mono resize-none outline-none"
                            aria-label="运势分析话术"
                        />

                        <div className="p-3 md:p-4 border-t border-stone-200 bg-white flex gap-3 justify-end">
                            <button
                                onClick={() => setPromptPreview(null)}
                                className="px-4 py-2 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100"
                            >
                                关闭
                            </button>
                            <button
                                onClick={() => { track('ai_export', { kind: 'ziwei', scope: 'fortune', channel: 'copy' }); copyToClipboard(promptPreview.text); }}
                                className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold shadow hover:opacity-90"
                            >
                                复制完整话术
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Partner Info Modal */}
            {showPartnerModal && (
                <div className="chart-modal fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" role="dialog" aria-modal="true" aria-labelledby="partner-dialog-title">
                    <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col overflow-hidden rounded-xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="bg-purple-600 px-4 py-3 flex justify-between items-center">
                            <h3 id="partner-dialog-title" className="text-white font-bold text-lg">💑 输入配偶信息</h3>
                            <button type="button" aria-label="关闭配偶信息" onClick={() => setShowPartnerModal(false)} className="text-white/80 hover:text-white">✕</button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-4">
                            <div className="text-sm text-gray-500 bg-purple-50 p-2 rounded">
                                为了更精准地进行优生备孕择吉，请提供另一半的生辰信息，系统将结合双人命盘进行推算。
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700">性别</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            checked={partnerInfo.gender === 'male'}
                                            onChange={() => setPartnerInfo({ ...partnerInfo, gender: 'male' })}
                                            className="accent-purple-600"
                                        />
                                        <span className="text-sm">男</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            checked={partnerInfo.gender === 'female'}
                                            onChange={() => setPartnerInfo({ ...partnerInfo, gender: 'female' })}
                                            className="accent-purple-600"
                                        />
                                        <span className="text-sm">女</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700">出生日期 (阳历)</label>
                                {/* Date Picker with Enhanced UX for Android */}
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calendar className="h-5 w-5 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
                                    </div>
                                    <input
                                        type="date"
                                        id="partner-birthday"
                                        required
                                        className="block w-full pl-10 pr-3 py-3 text-base border-2 border-dashed border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/50 text-indigo-900 shadow-sm transition-all hover:bg-white hover:border-indigo-400 cursor-pointer appearance-none"
                                        value={partnerInfo.birthday}
                                        onChange={(e) => setPartnerInfo({ ...partnerInfo, birthday: e.target.value })}
                                    />
                                    {/* Visual Cue for interaction */}
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-xs text-indigo-400 font-medium bg-white/80 px-1 rounded">
                                            选取
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700">出生时辰</label>
                                <select
                                    value={partnerInfo.birthTime}
                                    onChange={(e) => setPartnerInfo({ ...partnerInfo, birthTime: e.target.value })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                                >
                                    {TIME_RANGES.map((time, index) => (
                                        <option key={index} value={time}>{time}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleConfirmPartner}
                                disabled={isCalculating}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg shadow-lg hover:opacity-90 transition-opacity mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isCalculating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>正在遍历未来14天命盘...</span>
                                    </>
                                ) : (
                                    <span>生成双人分析指令</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Donation Modal */}
            {showDonationModal && (
                <div className="chart-modal fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={() => setShowDonationModal(false)} role="dialog" aria-modal="true" aria-labelledby="donation-dialog-title">
                    <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-4 text-white flex justify-between items-center">
                            <h3 id="donation-dialog-title" className="font-bold text-lg flex items-center gap-2">
                                <Coffee className="w-5 h-5" />
                                随喜打赏 (Buy me a coffee)
                            </h3>
                            <button type="button" aria-label="关闭打赏窗口" onClick={() => setShowDonationModal(false)} className="hover:bg-white/20 rounded-full p-1">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-6 flex flex-col items-center gap-6">
                            <p className="text-center text-gray-600 text-sm">
                                如果觉得这个工具对您有帮助，<br />欢迎请作者喝杯咖啡，支持持续开发！☕️
                            </p>

                            <div className="flex justify-center gap-4 w-full">
                                <div className="flex flex-col items-center gap-2 flex-1">
                                    <div className="relative group">
                                        <img src={wechatPayImg} alt="微信支付" className="w-full rounded-lg shadow-md border border-green-100" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg" />
                                    </div>
                                    <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8.5,16.5c0-4.7,4.7-8.5,10.5-8.5c5.8,0,10.5,3.8,10.5,8.5c0,4.7-4.7,8.5-10.5,8.5c-1.3,0-2.6-0.2-3.7-0.6 c-0.5-0.2-1-0.2-1.5,0l-3.2,1.6c-0.6,0.3-1.2-0.3-1-0.9l0.8-3.3c0.1-0.5,0-1-0.3-1.4C8.9,19.1,8.5,17.8,8.5,16.5z M3,18.5 c0-4.1,4.1-7.5,9.2-7.5c0.6,0,1.2,0.1,1.8,0.2C13.2,7.3,9.8,4.5,5.5,4.5C2.5,4.5,0,6.5,0,9c0,1.5,0.9,2.8,2.3,3.6 c0.3,0.2,0.4,0.6,0.3,0.9l-0.6,2.3c-0.2,0.6,0.5,1.1,1,0.8l2.5-1.2c0.4-0.2,0.8-0.2,1.2,0c0.9,0.5,2,0.8,3.1,0.8 C6.8,15.7,4.7,14.4,3,12.6C3,12.6,3,18.5,3,18.5z" /></svg>
                                        微信支付
                                    </span>
                                </div>
                                <div className="flex flex-col items-center gap-2 flex-1">
                                    <div className="relative group">
                                        <img src={alipayImg} alt="支付宝" className="w-full rounded-lg shadow-md border border-blue-100" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg" />
                                    </div>
                                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.7,6.2c0.5,0,0.8-0.4,0.8-0.8s-0.4-0.8-0.8-0.8h-4.5V3.3c0-0.5-0.4-0.8-0.8-0.8s-0.8,0.4-0.8,0.8v1.3H8.1 c-0.5,0-0.8,0.4-0.8,0.8s0.4,0.8,0.8,0.8h8.2c-0.5,2.4-1.9,4.5-3.8,5.9c-1.2-1.1-2.1-2.4-2.6-3.8c-0.2-0.4-0.7-0.6-1.1-0.4 c-0.4,0.2-0.6,0.7-0.4,1.1c0.7,1.8,1.8,3.4,3.3,4.7c-1.7,0.9-3.6,1.4-5.6,1.4c-0.5,0-0.8,0.4-0.8,0.8s0.4,0.8,0.8,0.8 c2.3,0,4.5-0.6,6.4-1.7c1.6,1.1,3.5,1.7,5.5,1.7c0.5,0,0.8-0.4,0.8-0.8s-0.4-0.8-0.8-0.8c-1.7,0-3.3-0.5-4.7-1.4 c2.1-1.3,3.6-3.4,4.2-5.9H18.7z" /></svg>
                                        支付宝
                                    </span>
                                </div>
                            </div>

                            <div className="text-[10px] text-gray-400 text-center">
                                感谢您的每一份支持，都将化作代码的动力！❤️
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ProfessionalChart Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <div className="p-4 text-red-500">Chart Error: {this.state.error.toString()}</div>;
        }
        return this.props.children;
    }
}

export default function ProfessionalChart(props) {
    return (
        <ErrorBoundary>
            <ProfessionalChartInner {...props} />
        </ErrorBoundary>
    );
}
