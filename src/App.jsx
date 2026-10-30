import React, { useState, Suspense, lazy } from 'react';
import ErrorBoundary from "./components/ErrorBoundary";
import WelcomeCover from "./components/WelcomeCover";
import { AlertCircle, ArrowLeft, CheckCircle2, Save } from "lucide-react";
import { archiveManager } from './utils/archiveManager';
import { readLastBaziRecord, recordToBaziForm } from './utils/baziRecord';
import { placeDisplayName, toLocalSolarNow } from './utils/currentPlace';
import { buildZiweiShareUrl, decodeBaziLink, decodeZiweiLink, hashQueryOf } from './utils/baziLink';
import { track } from './utils/analytics';
import { useCurrentPlace } from './components/common/useCurrentPlace';
import { BIRTH_PROVINCES, findBirthPlace, TIMEZONE_OPTIONS } from './utils/birthPlaces';

// Lazy load the heavy components
// 六爻起卦（含摇铜钱与手势两种起卦动画，动画再按需加载）。
const LiuYaoDivination = lazy(() => import("./components/LiuYaoDivination"));
const ArchiveView = lazy(() => import("./components/ArchiveView"));
const VideoLessons = lazy(() => import("./components/VideoLessons"));
const BaziDivination = lazy(() => import("./components/BaziDivination"));
// 紫微专业盘体量最大，只有打开命盘时才加载。
const ProfessionalChart = lazy(() => import("./components/ProfessionalChart"));
const HomeBaziToday = lazy(() => import("./components/bazi/HomeBaziToday"));
const AboutView = lazy(() => import("./components/AboutView"));

const APP_VERSION = import.meta.env.VITE_APP_BUILD || 'dev';

// 首页「八字 · 今日」显示谁的盘：记住上次的选择，默认档案里的「自己」。
const HOME_BAZI_KEY = 'gushupai-home-bazi-profile';
const readHomeBaziKey = () => {
  try {
    return globalThis.localStorage?.getItem(HOME_BAZI_KEY) ?? null;
  } catch {
    return null;
  }
};
const baziSignature = (record) => {
  const form = recordToBaziForm(record);
  return form ? [form.calendarType, form.year, form.month, form.day, form.hourIndex, form.clockTime, form.gender].join('|') : '';
};

// 紫微排盘库（iztro 与农历库）压缩后约 250 KB，首页初次访问用不到。
// 打开紫微录入、命盘，或首页需要生成紫微简报时才下载，下载一次后共用。
let ziweiLibPromise = null;
const loadZiweiLib = () => {
  ziweiLibPromise ??= Promise.all([
    import('./utils/homeFortune'),
    import('./utils/fortuneContext'),
    import('./utils/ziweiBirth'),
  ]).then(([homeFortune, fortuneContext, ziweiBirth]) => ({
    buildHomeFortune: homeFortune.buildHomeFortune,
    HOME_FORTUNE_PERIODS: homeFortune.HOME_FORTUNE_PERIODS,
    getLunarMonthDays: fortuneContext.getLunarMonthDays,
    getLunarMonthOptions: fortuneContext.getLunarMonthOptions,
    createZiweiHoroscope: ziweiBirth.createZiweiHoroscope,
    ZIWEI_LATE_ZI_MODES: ziweiBirth.ZIWEI_LATE_ZI_MODES,
    normalizeLateZiMode: ziweiBirth.normalizeLateZiMode,
  })).catch((error) => {
    ziweiLibPromise = null;
    throw error;
  });
  return ziweiLibPromise;
};

// 紫微「精确到分钟」的真太阳时换算用到农历库，同样按需加载。
let ziweiTimePromise = null;
const loadZiweiTime = () => {
  ziweiTimePromise ??= import('./utils/ziweiTime').catch((error) => {
    ziweiTimePromise = null;
    throw error;
  });
  return ziweiTimePromise;
};

const EMPTY_ZIWEI_PLACE = Object.freeze({ province: '', city: '', longitude: '', timezone: 8 });
const ziweiExactKeyOf = ({ calendarType, birthDate, isLeapMonth, clockTime, place, applyDst }) => JSON.stringify({
  calendarType, birthDate, isLeapMonth, clockTime,
  placeProvince: place.province, placeCity: place.city, longitude: place.longitude, timezone: place.timezone, applyDst,
});

// 地址栏 #/bazi 等与页面同步：手机返回键回到上一页，链接也能直接打开对应功能。
const VIEW_ROUTES = Object.freeze({
  input: 'ziwei', chart: 'ziwei/chart', liuyao: 'liuyao', archive: 'archive', bazi: 'bazi',
  about: 'about',
  // 课程视频（VideoLessons）仍在筹备，暂不开放地址。
});
const ROUTE_VIEWS = Object.freeze(Object.fromEntries(Object.entries(VIEW_ROUTES).map(([view, route]) => [route, view])));
// 旧地址：金钱卦与手势八卦已合并为六爻起卦，旧链接仍能打开，并预选对应的起卦方式。
const LEGACY_ROUTES = Object.freeze({ money: { view: 'liuyao', method: 'coins' }, bagua: { view: 'liuyao', method: 'gesture' } });
const VIEW_TITLES = Object.freeze({
  home: '古书派｜紫微斗数与八字排盘',
  input: '紫微斗数排盘 · 古书派',
  chart: '紫微命盘 · 古书派',
  bazi: '八字排盘 · 古书派',
  liuyao: '六爻起卦 · 古书派',
  archive: '命盘档案 · 古书派',
  about: '关于与隐私 · 古书派',
});
// #/bazi?cal=s&d=… 这类带参数的地址：路由只看问号前面的部分。
const routeFromHash = (hash = '') => hash.replace(/^#\/?/, '').split('?')[0].replace(/\/$/, '');
// 带生辰参数的八字链接 → 临时记录，打开即出盘。
const baziRecordFromHash = (hash = '') => (viewFromHash(hash) === 'bazi' ? decodeBaziLink(hashQueryOf(hash)) : null);
// 带生辰参数的紫微链接（#/ziwei?…）→ 紫微记录，交给 handleLoadRecord 直接排盘。
const ziweiRecordFromHash = (hash = '') => (viewFromHash(hash) === 'input' ? decodeZiweiLink(hashQueryOf(hash)) : null);
const viewFromHash = (hash = '') => {
  const route = routeFromHash(hash);
  return ROUTE_VIEWS[route] ?? LEGACY_ROUTES[route]?.view ?? 'home';
};
const liuyaoMethodFromHash = (hash = '') => LEGACY_ROUTES[routeFromHash(hash)]?.method ?? null;
const hashForView = (view) => (VIEW_ROUTES[view] ? `#/${VIEW_ROUTES[view]}` : '');
// 没有命盘数据时，紫微命盘页退回到输入页。
const initialViewFromLocation = () => {
  const view = viewFromHash(globalThis.location?.hash);
  return view === 'chart' ? 'input' : view;
};

const WELCOME_COVER_KEY = 'gushupai-welcome-cover-seen-v1';

const FORTUNE_KEYWORDS_BY_PALACE = Object.freeze({
  '命宫': ['定心', '取舍', '自省'],
  '兄弟': ['协作', '边界', '互助'],
  '夫妻': ['沟通', '倾听', '坦诚'],
  '子女': ['创造', '陪伴', '耐心'],
  '财帛': ['盘点', '节制', '价值'],
  '疾厄': ['休息', '节律', '照顾'],
  '迁移': ['准备', '应变', '探索'],
  '仆役': ['协同', '边界', '信任'],
  '官禄': ['专注', '交付', '担当'],
  '田宅': ['安顿', '整理', '长期'],
  '福德': ['静心', '恢复', '觉察'],
  '父母': ['确认', '尊重', '留痕'],
});

const FORTUNE_DIMENSION_META = Object.freeze([
  Object.freeze({ key: 'career', label: '事业', seal: '业', fallback: '排清轻重缓急，先完成最能推动局面的一项。' }),
  Object.freeze({ key: 'finance', label: '财务', seal: '财', fallback: '重要收支先核对信息，避免因一时情绪作决定。' }),
  Object.freeze({ key: 'relationships', label: '关系', seal: '缘', fallback: '重要表达先讲事实，再说感受与真实需要。' }),
  Object.freeze({ key: 'wellbeing', label: '身心', seal: '身', fallback: '给精力留出余量，照顾作息、饮食与恢复。' }),
]);

const PALACE_DIMENSION = Object.freeze({
  '官禄': 'career',
  '迁移': 'career',
  '财帛': 'finance',
  '田宅': 'finance',
  '兄弟': 'relationships',
  '夫妻': 'relationships',
  '子女': 'relationships',
  '仆役': 'relationships',
  '父母': 'relationships',
  '命宫': 'wellbeing',
  '疾厄': 'wellbeing',
  '福德': 'wellbeing',
});

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

const isHomeFortuneRecordReady = (record) => {
  if (!record || record.type !== 'ziwei') return false;
  if (!['male', 'female'].includes(record.gender)) return false;

  const timeHour = Number(record.timeHour);
  if (record.timeHour == null || record.timeHour === '' || !Number.isInteger(timeHour) || timeHour < 0 || timeHour > 12) {
    return false;
  }

  const birthDate = cleanText(
    record.birthDate
      || record.solarDate
      || record.data?.birthDate
      || record.data?.solarDate,
  );
  if (!birthDate) return false;

  return ['solar', 'lunar'].includes(record.calendarType)
    || (!record.calendarType && Boolean(record.solarDate || record.data?.solarDate));
};

const getFortuneKeywords = (fortune) => {
  const provided = Array.isArray(fortune?.keywords)
    ? fortune.keywords.map(cleanText).filter(Boolean)
    : [];
  const defaults = FORTUNE_KEYWORDS_BY_PALACE[fortune?.palaceName] || ['观察', '整理', '稳步'];
  return [...new Set([...provided, ...defaults])].slice(0, 3);
};

const getDimensionText = (fortune, key, fallback, isFocus) => {
  const contractDimension = Array.isArray(fortune?.lifeDimensions)
    ? fortune.lifeDimensions.find((item) => item?.key === key)
    : null;
  const source = contractDimension?.prompt
    ?? contractDimension?.summary
    ?? fortune?.dimensions?.[key]
    ?? fortune?.dimensionSummaries?.[key];
  if (typeof source === 'string' && source.trim()) return source.trim();
  if (source && typeof source === 'object') {
    const objectText = cleanText(source.summary) || cleanText(source.text) || cleanText(source.guidance);
    if (objectText) return objectText;
  }
  return isFocus && cleanText(fortune?.action) ? fortune.action.trim() : fallback;
};

const getFortuneDimensions = (fortune) => {
  const focusKey = PALACE_DIMENSION[fortune?.palaceName] || '';
  return FORTUNE_DIMENSION_META.map((item) => {
    const contractDimension = Array.isArray(fortune?.lifeDimensions)
      ? fortune.lifeDimensions.find((dimension) => dimension?.key === item.key)
      : null;
    const isFocus = contractDimension
      ? Boolean(contractDimension.isFocus)
      : focusKey === item.key;
    return {
      ...item,
      label: cleanText(contractDimension?.label) || item.label,
      isFocus,
      text: getDimensionText(fortune, item.key, item.fallback, isFocus),
    };
  });
};

const getCustomEvidence = (fortune) => {
  if (!Array.isArray(fortune?.evidence)) return [];
  return fortune.evidence.map((item, index) => {
    if (typeof item === 'string') return { label: `补充依据 ${index + 1}`, value: item.trim() };
    if (!item || typeof item !== 'object') return null;
    return {
      label: cleanText(item.label) || cleanText(item.title) || `补充依据 ${index + 1}`,
      value: cleanText(item.value) || cleanText(item.text) || cleanText(item.description),
      source: cleanText(item.source),
    };
  }).filter((item) => item?.value);
};

const copyPlainText = async (text) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some browsers expose Clipboard API but reject it outside a secure
      // context. Continue with the compatibility fallback below.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    textarea.remove();
  }
  if (!copied) throw new Error('copy unavailable');
};

// 晚子时流派（与 utils/ziweiBirth.js 的 ZIWEI_LATE_ZI_MODES 一致；写在这里是因为紫微库按需加载）。
const ZIWEI_LATE_ZI_OPTIONS = [
  { value: 'next', label: '晚子换次日', note: '23 时起算次日，命盘按次日子时排' },
  { value: 'same', label: '晚子不换日', note: '23 时仍属当日，时柱用次日子时' },
];

const getTimeDescription = (time) => {
  const timeMap = {
    0: "早子时 (00:00-01:00)",
    1: "丑时 (01:00-03:00)",
    2: "寅时 (03:00-05:00)",
    3: "卯时 (05:00-07:00)",
    4: "辰时 (07:00-09:00)",
    5: "巳时 (09:00-11:00)",
    6: "午时 (11:00-13:00)",
    7: "未时 (13:00-15:00)",
    8: "申时 (15:00-17:00)",
    9: "酉时 (17:00-19:00)",
    10: "戌时 (19:00-21:00)",
    11: "亥时 (21:00-23:00)",
    12: "晚子时 (23:00-24:00)"
  };
  return timeMap[time] || "未知时辰";
};

const BIRTH_YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 1899 },
  (_, index) => String(new Date().getFullYear() - index),
);
const BIRTH_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));

const getBirthDateParts = (value) => {
  const [rawYear = '', rawMonth = '', rawDay = ''] = cleanText(value).split('-');
  return {
    year: /^\d{4}$/.test(rawYear) ? rawYear : '',
    month: /^\d{1,2}$/.test(rawMonth) ? rawMonth.padStart(2, '0') : '',
    day: /^\d{1,2}$/.test(rawDay) ? rawDay.padStart(2, '0') : '',
  };
};

const lunarMonthSupportsLeap = (lib, year, month) => {
  if (!lib || !/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) return false;

  try {
    return lib.getLunarMonthOptions(Number(year)).some((option) => (
      option.month === Number(month) && option.isLeap
    ));
  } catch {
    return false;
  }
};

const getBirthDayCount = (lib, calendarType, year, month, isLeapMonth = false) => {
  if (calendarType === 'lunar') {
    return lib?.getLunarMonthDays(Number(year), Number(month), isLeapMonth) || 30;
  }
  if (!year || !month) return 31;
  return new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
};

export default function App() {
  const [view, setView] = useState(initialViewFromLocation); // 'home', 'input', 'chart', 'liuyao', 'archive', 'videos', 'bazi', 'about'
  // 从档案打开的八字命例；从首页或底部导航进入八字时为空。
  const [baziRecord, setBaziRecord] = useState(() => baziRecordFromHash(globalThis.location?.hash));
  // 带参数的紫微链接：先记下来，等组件挂好后再加载排盘库出盘（见下方 effect）。
  const pendingZiweiLinkRef = React.useRef(ziweiRecordFromHash(globalThis.location?.hash));
  // 从档案打开的六爻卦例，以及旧地址 #/money、#/bagua 预选的起卦方式。
  const [liuyaoRecord, setLiuyaoRecord] = useState(null);
  const [liuyaoMethod, setLiuyaoMethod] = useState(() => liuyaoMethodFromHash(globalThis.location?.hash));
  const [showWelcomeCover, setShowWelcomeCover] = useState(() => {
    // 直接打开某个功能的链接（如 #/bazi）时不显示封面。
    if (initialViewFromLocation() !== 'home') return false;
    try {
      return globalThis.localStorage?.getItem(WELCOME_COVER_KEY) !== 'seen';
    } catch {
      return false;
    }
  });
  const [calendarType, setCalendarType] = useState('solar');
  const [gender, setGender] = useState('male');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [birthTime, setBirthTime] = useState(0);
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  // 紫微出生时间：只知道时辰，或精确到分钟并按出生地换算真太阳时（与八字共用一套换算）。
  const [ziweiTimeMode, setZiweiTimeMode] = useState('shichen');
  const [ziweiClock, setZiweiClock] = useState('');
  const [ziweiPlace, setZiweiPlace] = useState(EMPTY_ZIWEI_PLACE);
  const [ziweiDst, setZiweiDst] = useState(null);
  // 晚子时流派：换次日（默认）或不换日；只在时辰落在晚子时时显示。
  const [ziweiLateZi, setZiweiLateZi] = useState('next');
  // 换算结果带着它对应的输入（key），输入一变旧结果自动失效，不必在 effect 里同步清空。
  const [ziweiExactState, setZiweiExactState] = useState(null);
  const [horoscope, setHoroscope] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [archiveRecords, setArchiveRecords] = useState(() => archiveManager.getRecords());
  const [homeProfileId, setHomeProfileId] = useState(null);
  const [homePeriod, setHomePeriod] = useState('daily');
  const [homeNow, setHomeNow] = useState(() => new Date());
  // 「此刻」按所在地真太阳时（未设置所在地时就是设备时间），紫微简报与八字今日共用。
  const currentPlace = useCurrentPlace();
  const homeSolarNow = React.useMemo(() => toLocalSolarNow(homeNow, currentPlace), [homeNow, currentPlace]);
  const [homeShareNotice, setHomeShareNotice] = useState(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [lastBaziRecord, setLastBaziRecord] = useState(() => readLastBaziRecord());
  const [ziweiLib, setZiweiLib] = useState(null);
  // 紫微排盘库下载失败（多半是网络不稳定）时记下来，首页给出重试按钮，而不是一直显示"正在生成"。
  const [ziweiLibFailed, setZiweiLibFailed] = useState(false);
  const [homeBaziKey, setHomeBaziKey] = useState(readHomeBaziKey);

  const birthDateParts = getBirthDateParts(birthday);
  const leapMonthAvailable = calendarType === 'lunar'
    && lunarMonthSupportsLeap(ziweiLib, birthDateParts.year, birthDateParts.month);
  const effectiveIsLeapMonth = leapMonthAvailable && isLeapMonth;
  const birthDayCount = getBirthDayCount(
    ziweiLib,
    calendarType,
    birthDateParts.year,
    birthDateParts.month,
    effectiveIsLeapMonth,
  );
  const birthDayOptions = Array.from(
    { length: calendarType === 'lunar' ? 30 : birthDayCount },
    (_, index) => String(index + 1).padStart(2, '0'),
  );

  React.useEffect(() => {
    if (!birthDateParts.day || Number(birthDateParts.day) <= birthDayCount) return;
    setBirthday(`${birthDateParts.year}-${birthDateParts.month}-${String(birthDayCount).padStart(2, '0')}`);
  }, [birthDateParts.day, birthDateParts.month, birthDateParts.year, birthDayCount]);

  const updateBirthDatePart = (part, value) => {
    const nextParts = { ...birthDateParts, [part]: value };
    const nextLeapMonthAvailable = calendarType === 'lunar'
      && lunarMonthSupportsLeap(ziweiLib, nextParts.year, nextParts.month);
    const nextIsLeapMonth = nextLeapMonthAvailable && isLeapMonth;
    const nextDayCount = getBirthDayCount(
      ziweiLib,
      calendarType,
      nextParts.year,
      nextParts.month,
      nextIsLeapMonth,
    );
    if (nextParts.day && Number(nextParts.day) > nextDayCount) {
      nextParts.day = String(nextDayCount).padStart(2, '0');
    }
    if (!nextLeapMonthAvailable) setIsLeapMonth(false);
    setBirthday(`${nextParts.year}-${nextParts.month}-${nextParts.day}`);
  };

  const updateCalendarType = (nextCalendarType) => {
    const nextParts = { ...birthDateParts };
    const nextLeapMonthAvailable = nextCalendarType === 'lunar'
      && lunarMonthSupportsLeap(ziweiLib, nextParts.year, nextParts.month);
    const nextIsLeapMonth = nextLeapMonthAvailable && isLeapMonth;
    const nextDayCount = getBirthDayCount(
      ziweiLib,
      nextCalendarType,
      nextParts.year,
      nextParts.month,
      nextIsLeapMonth,
    );
    if (nextParts.day && Number(nextParts.day) > nextDayCount) {
      nextParts.day = String(nextDayCount).padStart(2, '0');
      setBirthday(`${nextParts.year}-${nextParts.month}-${nextParts.day}`);
    }
    if (!nextLeapMonthAvailable) setIsLeapMonth(false);
    setCalendarType(nextCalendarType);
  };

  const toggleLeapMonth = () => {
    if (!leapMonthAvailable) return;

    const nextIsLeapMonth = !effectiveIsLeapMonth;
    const nextDayCount = getBirthDayCount(
      ziweiLib,
      'lunar',
      birthDateParts.year,
      birthDateParts.month,
      nextIsLeapMonth,
    );
    if (birthDateParts.day && Number(birthDateParts.day) > nextDayCount) {
      setBirthday(`${birthDateParts.year}-${birthDateParts.month}-${String(nextDayCount).padStart(2, '0')}`);
    }
    setIsLeapMonth(nextIsLeapMonth);
  };

  // Archive Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveNote, setSaveNote] = useState('');
  const [saveGroup, setSaveGroup] = useState('self');
  const [archiveNotice, setArchiveNotice] = useState(null);
  const saveDialogRef = React.useRef(null);
  const saveOpenerRef = React.useRef(null);
  const moreDialogRef = React.useRef(null);
  const moreOpenerRef = React.useRef(null);

  // 精确到分钟：日期、钟表时间或出生地一变就重新换算，结果显示在表单下方并用于排盘。
  const ziweiExactKey = ziweiTimeMode === 'exact' && birthday && ziweiClock
    ? ziweiExactKeyOf({ calendarType, birthDate: birthday, isLeapMonth: effectiveIsLeapMonth, clockTime: ziweiClock, place: ziweiPlace, applyDst: ziweiDst })
    : '';
  React.useEffect(() => {
    if (!ziweiExactKey) return undefined;
    let cancelled = false;
    loadZiweiTime()
      .then(({ resolveZiweiExact }) => {
        if (cancelled) return;
        let result = null;
        let error = '';
        try {
          result = resolveZiweiExact(JSON.parse(ziweiExactKey));
        } catch (failure) {
          error = failure instanceof Error ? failure.message : '出生时间换算失败';
        }
        setZiweiExactState({ key: ziweiExactKey, result, error });
      })
      .catch((failure) => {
        if (!cancelled) setZiweiExactState({ key: ziweiExactKey, result: null, error: failure instanceof Error ? failure.message : '出生时间换算组件加载失败' });
      });
    return () => { cancelled = true; };
  }, [ziweiExactKey]);
  const ziweiExact = ziweiExactKey && ziweiExactState?.key === ziweiExactKey ? ziweiExactState.result : null;
  const isZiweiLateZi = ziweiTimeMode === 'exact' ? ziweiExact?.hourIndex === 12 : Number(birthTime) === 12;
  const ziweiExactError = ziweiExactKey && ziweiExactState?.key === ziweiExactKey ? ziweiExactState.error : '';

  const changeZiweiProvince = (province) => {
    const cities = BIRTH_PROVINCES.find((item) => item.province === province)?.cities ?? [];
    const only = cities.length === 1 ? cities[0] : null;
    setZiweiPlace({ province, city: only?.name ?? '', longitude: only ? only.longitude.toFixed(2) : '', timezone: cities[0]?.timezone ?? 8 });
  };
  const changeZiweiCity = (city) => {
    const found = findBirthPlace(ziweiPlace.province, city);
    setZiweiPlace((place) => ({ ...place, city, longitude: found ? found.longitude.toFixed(2) : place.longitude, timezone: found ? found.timezone : place.timezone }));
  };
  const ziweiExactReady = ziweiTimeMode !== 'exact' || Boolean(ziweiExact);

  // 紫微录入页「从档案带入」：八字与紫微档案的生辰字段相同，精确时间设置也一并带入。
  const ziweiArchiveCandidates = React.useMemo(
    () => archiveRecords
      .map((record) => ({ record, form: recordToBaziForm(record) }))
      // 紫微必须有时辰：时辰不详的八字记录带不进来。
      .filter(({ form }) => form && form.timeMode !== 'unknown'),
    [archiveRecords],
  );
  const applyZiweiArchiveRecord = (recordId) => {
    const candidate = ziweiArchiveCandidates.find(({ record }) => record.id === recordId);
    if (!candidate) return;
    const { form } = candidate;
    const pad = (value) => String(value).padStart(2, '0');
    setName(form.personName);
    setGender(form.gender);
    setCalendarType(form.calendarType);
    setBirthday(`${form.year}-${pad(Math.abs(form.month))}-${pad(form.day)}`);
    setIsLeapMonth(form.month < 0);
    setBirthTime(form.hourIndex);
    if (form.timeMode === 'exact') {
      setZiweiTimeMode('exact');
      setZiweiClock(form.clockTime);
      setZiweiPlace({ province: form.placeProvince, city: form.placeCity, longitude: form.longitude, timezone: form.timezone });
      // 记录里没有明确开夏令时的，按出生日期自动判断。
      setZiweiDst(form.applyDst || null);
    } else {
      setZiweiTimeMode('shichen');
    }
    track('archive_prefill', { record_type: candidate.record.type, target: 'ziwei' });
  };

  // 页面切换写入浏览器历史；返回首页时退回历史起点，避免来回堆叠。
  const routeSyncedRef = React.useRef(false);
  React.useEffect(() => {
    if (showWelcomeCover) {
      // 封面只在首页地址出现；离开封面进入某个功能时正常记入历史。
      routeSyncedRef.current = true;
      return;
    }
    document.title = VIEW_TITLES[view] ?? VIEW_TITLES.home;
    track('tool_view', { tool: view });
    const target = hashForView(view);
    const currentHash = window.location.hash.replace(/^#\/?$/, '');
    const firstSync = !routeSyncedRef.current;
    routeSyncedRef.current = true;
    if (currentHash === target) return;
    const url = `${window.location.pathname}${window.location.search}${target}`;
    // 打开的链接无效（如没有命盘数据的 #/ziwei/chart）时直接改写地址，不新增历史。
    if (firstSync) {
      window.history.replaceState(window.history.state, '', url);
      return;
    }
    const depth = window.history.state?.gushupaiDepth ?? 0;
    if (!target && depth > 0) {
      window.history.go(-depth);
      return;
    }
    window.history.pushState({ gushupaiDepth: depth + 1 }, '', url);
  }, [view, showWelcomeCover]);

  React.useEffect(() => {
    const handlePopState = () => {
      const next = viewFromHash(window.location.hash);
      const legacyMethod = liuyaoMethodFromHash(window.location.hash);
      const linkedBazi = baziRecordFromHash(window.location.hash);
      const linkedZiwei = ziweiRecordFromHash(window.location.hash);
      setIsMoreOpen(false);
      if (legacyMethod) setLiuyaoMethod(legacyMethod);
      if (linkedBazi) setBaziRecord(linkedBazi);
      if (linkedZiwei) pendingZiweiLinkRef.current = linkedZiwei;
      setView(next === 'chart' && !horoscope ? 'input' : next);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [horoscope]);

  React.useEffect(() => {
    const refreshLastBazi = () => setLastBaziRecord(readLastBaziRecord());
    window.addEventListener('bazi-last-chart-updated', refreshLastBazi);
    window.addEventListener('storage', refreshLastBazi);
    return () => {
      window.removeEventListener('bazi-last-chart-updated', refreshLastBazi);
      window.removeEventListener('storage', refreshLastBazi);
    };
  }, []);

  React.useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  React.useEffect(() => {
    const refreshArchives = () => setArchiveRecords(archiveManager.getRecords());
    const refreshNow = () => setHomeNow(new Date());
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshNow();
    };

    window.addEventListener('archive-updated', refreshArchives);
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('archive-updated', refreshArchives);
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  React.useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (showInstallModal) setShowInstallModal(false);
      if (isSaveModalOpen) setIsSaveModalOpen(false);
      if (isMoreOpen) setIsMoreOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showInstallModal, isSaveModalOpen, isMoreOpen]);

  React.useEffect(() => {
    if (!homeShareNotice) return undefined;
    const timer = window.setTimeout(() => setHomeShareNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [homeShareNotice]);

  React.useEffect(() => {
    if (!archiveNotice || archiveNotice.type === 'error') return undefined;
    const timer = window.setTimeout(() => setArchiveNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [archiveNotice]);

  React.useEffect(() => {
    if (!isSaveModalOpen || !saveDialogRef.current) return undefined;

    const dialog = saveDialogRef.current;
    const opener = saveOpenerRef.current;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const getFocusableItems = () => Array.from(dialog.querySelectorAll(focusableSelector));
    const focusFrame = window.requestAnimationFrame(() => {
      (dialog.querySelector('#archive-name') || getFocusableItems()[0])?.focus();
    });

    const trapFocus = (event) => {
      if (event.key !== 'Tab') return;
      const items = getFocusableItems();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', trapFocus);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      dialog.removeEventListener('keydown', trapFocus);
      opener?.focus?.();
    };
  }, [isSaveModalOpen]);

  React.useEffect(() => {
    if (!isMoreOpen || !moreDialogRef.current) return undefined;
    const dialog = moreDialogRef.current;
    const opener = moreOpenerRef.current;
    const focusableSelector = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const getFocusableItems = () => Array.from(dialog.querySelectorAll(focusableSelector));
    const focusFrame = window.requestAnimationFrame(() => {
      getFocusableItems()[0]?.focus();
    });

    const trapFocus = (event) => {
      if (event.key !== 'Tab') return;
      const items = getFocusableItems();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', trapFocus);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      dialog.removeEventListener('keydown', trapFocus);
      opener?.focus?.();
    };
  }, [isMoreOpen]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        track('pwa_install', { outcome: choice?.outcome ?? 'unknown' });
      } catch (error) {
        console.warn('Native install prompt unavailable:', error);
        setShowInstallModal(true);
      } finally {
        // A BeforeInstallPromptEvent can only be consumed once, including when
        // the user dismisses it. Future clicks should show the manual guide.
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const handleStartScan = async () => {
    if (!birthday) {
      alert('请输入生日');
      return;
    }
    if (ziweiTimeMode === 'exact' && !ziweiExact) {
      alert(ziweiExactError || '请填写出生的钟表时间（几点几分）。');
      return;
    }
    try {
      const lib = ziweiLib ?? await loadZiweiLib();
      // 精确模式：按真太阳时换算后的公历日期与时辰排盘。
      const newHoroscope = lib.createZiweiHoroscope(ziweiExact ? {
        calendarType: 'solar',
        birthDate: ziweiExact.solarDate,
        timeIndex: ziweiExact.hourIndex,
        gender,
        isLeapMonth: false,
        lateZiMode: ziweiLateZi,
      } : {
        calendarType,
        birthDate: birthday,
        timeIndex: birthTime,
        gender,
        isLeapMonth: effectiveIsLeapMonth,
        lateZiMode: ziweiLateZi,
      });
      if (ziweiExact) setBirthTime(ziweiExact.hourIndex);
      setHoroscope(newHoroscope);
      setView('chart');
      track('ziwei_chart', { time_mode: ziweiExact ? 'exact' : 'shichen', calendar: calendarType });
    } catch (error) {
      console.error("Error generating horoscope:", error);
      track('ziwei_chart_failed', { time_mode: ziweiExact ? 'exact' : 'shichen', calendar: calendarType });
      alert("生成星盘失败，请检查日期和时间格式是否正确。");
      setHoroscope(null);
    }
  };

  // --- Archive Logic ---

  const openSaveArchive = () => {
    saveOpenerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setSaveGroup('self');
    setSaveNote('');
    setIsSaveModalOpen(true);
  };

  const handleLoadRecord = async (record) => {
    track('archive_open', { record_type: record.type });
    if (record.type === 'bazi') {
      setBaziRecord(record);
      setView('bazi');
      return;
    }
    if (record.type === 'liuyao') {
      setLiuyaoRecord(record);
      setView('liuyao');
      return;
    }
    if (record.type === 'ziwei') {
      // Records created before calendarType/birthDate existed were always
      // reloaded as solar dates. Keep that fallback while preserving the
      // original calendar for all newly saved records.
      const recordCalendarType = record.calendarType === 'lunar' ? 'lunar' : 'solar';
      const recordBirthDate = record.birthDate
        || record.solarDate
        || record.data?.birthDate
        || record.data?.solarDate;
      const recordBirthTime = Number(record.timeHour) || 0;
      const recordGender = record.gender === 'female' ? 'female' : 'male';
      const recordIsLeapMonth = recordCalendarType === 'lunar'
        && Boolean(record.isLeapMonth ?? record.isLeap);

      if (!recordBirthDate) {
        alert('读取档案失败，缺少出生日期');
        return;
      }

      try {
        const lib = ziweiLib ?? await loadZiweiLib();
        // 档案里存了精确时间：重新按真太阳时换算，而不是直接用当时存的时辰。
        let exact = null;
        const exactData = record.data?.timeMode === 'exact' ? record.data : null;
        if (exactData) {
          const { resolveZiweiExact, ziweiRecordToExactForm } = await loadZiweiTime();
          const form = ziweiRecordToExactForm({ ...record, calendarType: recordCalendarType, birthDate: recordBirthDate, isLeapMonth: recordIsLeapMonth });
          exact = form ? resolveZiweiExact(form) : null;
        }
        const recordLateZi = lib.normalizeLateZiMode(record.data?.lateZi);
        const newHoroscope = lib.createZiweiHoroscope(exact ? {
          calendarType: 'solar',
          birthDate: exact.solarDate,
          timeIndex: exact.hourIndex,
          gender: recordGender,
          isLeapMonth: false,
          lateZiMode: recordLateZi,
        } : {
          calendarType: recordCalendarType,
          birthDate: recordBirthDate,
          timeIndex: recordBirthTime,
          gender: recordGender,
          isLeapMonth: recordIsLeapMonth,
          lateZiMode: recordLateZi,
        });

        setName(record.name || '');
        setZiweiLateZi(recordLateZi);
        setGender(recordGender);
        setBirthday(recordBirthDate);
        setBirthTime(exact ? exact.hourIndex : recordBirthTime);
        setIsLeapMonth(recordIsLeapMonth);
        setCalendarType(recordCalendarType);
        if (exact) {
          const place = { province: exactData.placeProvince ?? '', city: exactData.placeCity ?? '', longitude: exactData.longitude == null ? '' : String(exactData.longitude), timezone: exactData.timezone ?? 8 };
          const applyDst = typeof exactData.applyDst === 'boolean' ? exactData.applyDst : null;
          setZiweiTimeMode('exact');
          setZiweiClock(exactData.clockTime);
          setZiweiPlace(place);
          setZiweiDst(applyDst);
          setZiweiExactState({ key: ziweiExactKeyOf({ calendarType: recordCalendarType, birthDate: recordBirthDate, isLeapMonth: recordIsLeapMonth, clockTime: exactData.clockTime, place, applyDst }), result: exact, error: '' });
        } else {
          setZiweiTimeMode('shichen');
        }
        setHoroscope(newHoroscope);
        setView('chart');
      } catch {
        alert('读取档案失败，数据可能损坏');
      }
    }
  };

  // 打开 #/ziwei?cal=…&d=… 这类链接：排盘库加载后直接出盘，不用再填表。
  // 放进 setTimeout 里执行并在回调里清掉，StrictMode 重复挂载也只出一次盘。
  React.useEffect(() => {
    if (!pendingZiweiLinkRef.current) return undefined;
    const timer = window.setTimeout(() => {
      const record = pendingZiweiLinkRef.current;
      pendingZiweiLinkRef.current = null;
      if (record) {
        track('ziwei_link_open', { time_mode: record.data?.timeMode === 'exact' ? 'exact' : 'shichen' });
        handleLoadRecord(record);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  });

  // 紫微命盘的分享链接：带生辰参数，对方打开即出盘；没有分享面板的设备直接复制。
  const handleShareZiweiLink = async () => {
    if (!horoscope) return;
    const url = buildZiweiShareUrl({
      calendarType,
      birthDate: birthday,
      isLeapMonth: effectiveIsLeapMonth,
      gender,
      timeMode: ziweiTimeMode === 'exact' && ziweiExact ? 'exact' : 'shichen',
      hourIndex: Number(birthTime),
      clockTime: ziweiClock,
      placeProvince: ziweiPlace.province,
      placeCity: ziweiPlace.city,
      longitude: ziweiPlace.longitude,
      timezone: ziweiPlace.timezone,
      applyDst: ziweiDst,
      lateZiMode: ziweiLateZi,
    }, { name });
    if (!url) {
      setArchiveNotice({ type: 'error', message: '生成链接失败：出生日期不完整。' });
      return;
    }
    const title = `${cleanText(name) || '命主'}的紫微命盘 · 古书派`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        track('ziwei_link_share', { channel: 'share', time_mode: ziweiTimeMode });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
        // 分享面板不可用时改为复制
      }
    }
    try {
      await copyPlainText(url);
      setArchiveNotice({ type: 'success', message: '命盘链接已复制：对方打开就能看到这张盘（链接里只有生辰与称呼）。' });
      track('ziwei_link_share', { channel: 'copy', time_mode: ziweiTimeMode });
    } catch {
      setArchiveNotice({ type: 'error', message: `复制失败，可以手动复制：${url}` });
      track('ziwei_link_share', { channel: 'manual', time_mode: ziweiTimeMode });
    }
  };

  const handleSaveToArchive = () => {
    if (!horoscope) return;

    const newRecord = {
      name: name || '未命名',
      gender, // 'male' | 'female'
      type: 'ziwei',
      calendarType,
      birthDate: birthday,
      // Keep the legacy field so existing archive-list displays and exports
      // remain compatible. Loading now uses birthDate + calendarType first.
      solarDate: horoscope?.solarDate || (calendarType === 'solar' ? birthday : ''),
      timeHour: birthTime,
      isLeapMonth: effectiveIsLeapMonth,
      group: saveGroup,
      note: saveNote,
      // 精确时间设置一并保存：八字「从档案带入」也能直接用，下次打开按真太阳时重新换算。
      data: {
        lateZi: ziweiLateZi,
        ...(ziweiExact ? {
          timeMode: 'exact',
          clockTime: ziweiClock,
          placeProvince: ziweiPlace.province,
          placeCity: ziweiPlace.city,
          longitude: ziweiPlace.longitude === '' ? null : Number(ziweiPlace.longitude),
          timezone: Number(ziweiPlace.timezone ?? 8),
          applyTrueSolar: ziweiPlace.longitude !== '',
          applyDst: ziweiExact.applyDst,
        } : {}),
      },
    };

    const savedRecord = archiveManager.addRecord(newRecord);
    if (!savedRecord) {
      setArchiveNotice({ type: 'error', message: '保存失败，请检查浏览器存储空间后重试' });
      return;
    }
    setIsSaveModalOpen(false);
    setSaveNote(''); // Reset
    setArchiveNotice({ type: 'success', message: `已保存「${savedRecord.name}」的紫微命盘` });
    track('archive_save', { record_type: 'ziwei', time_mode: ziweiExact ? 'exact' : 'shichen' });
  };

  const ziweiRecords = React.useMemo(
    () => archiveRecords.filter((record) => record.type === 'ziwei'),
    [archiveRecords],
  );

  const homeReadyRecords = React.useMemo(
    () => ziweiRecords.filter(isHomeFortuneRecordReady),
    [ziweiRecords],
  );

  const homeProfile = React.useMemo(() => {
    const selected = homeReadyRecords.find((record) => record.id === homeProfileId);
    return selected
      || homeReadyRecords.find((record) => record.group === 'self')
      || homeReadyRecords[0]
      || null;
  }, [homeProfileId, homeReadyRecords]);

  // 首页八字：档案里的八字命盘（自己排在最前），只存了紫微命盘的人也按同一份生辰算八字今日，
  // 再加上八字页上次排的盘（与档案重复时不再列出）。
  const homeBaziCandidates = React.useMemo(() => {
    const baziArchived = archiveRecords
      .filter((record) => record.type === 'bazi' && recordToBaziForm(record))
      .sort((a, b) => Number(b.group === 'self') - Number(a.group === 'self'))
      .map((record) => ({ key: record.id, record, label: record.name || '未命名' }));
    const seen = new Set(baziArchived.map(({ record }) => `${(record.name ?? '').trim()}|${baziSignature(record)}`));
    const ziweiArchived = archiveRecords
      .filter((record) => record.type === 'ziwei' && recordToBaziForm(record))
      .filter((record) => !seen.has(`${(record.name ?? '').trim()}|${baziSignature(record)}`))
      .sort((a, b) => Number(b.group === 'self') - Number(a.group === 'self'))
      .map((record) => ({ key: record.id, record, label: `${record.name || '未命名'} · 紫微`, fromZiwei: true }));
    const archived = [...baziArchived, ...ziweiArchived];
    if (lastBaziRecord) {
      const signature = baziSignature(lastBaziRecord);
      if (!archived.some(({ record }) => baziSignature(record) === signature)) {
        archived.push({ key: 'last', record: lastBaziRecord, label: lastBaziRecord.name && lastBaziRecord.name !== '未命名' ? lastBaziRecord.name : '上次排盘', isLast: true });
      }
    }
    return archived;
  }, [archiveRecords, lastBaziRecord]);
  const homeBazi = homeBaziCandidates.find(({ key }) => key === homeBaziKey)
    ?? homeBaziCandidates.find(({ record }) => record.group === 'self' && record.type === 'bazi')
    ?? homeBaziCandidates.find(({ isLast }) => isLast)
    ?? homeBaziCandidates.find(({ record }) => record.group === 'self')
    ?? homeBaziCandidates[0]
    ?? null;
  const homeBaziRecord = homeBazi?.record ?? null;
  // 「看今日详情」进八字页：来源是紫微档案时也按八字打开（八字页能直接读紫微档案的生辰）。
  const openBaziToday = (record) => {
    track('archive_open', { record_type: record.type, opened_as: 'bazi' });
    setBaziRecord(record);
    setView('bazi');
  };
  const selectHomeBazi = (key) => {
    setHomeBaziKey(key);
    try {
      globalThis.localStorage?.setItem(HOME_BAZI_KEY, key);
    } catch {
      // 记不住选择也不影响显示
    }
  };

  // 需要紫微排盘库的场景：紫微录入页、紫微命盘，以及首页有可用的紫微档案。
  const needsZiweiLib = ['input', 'chart'].includes(view) || homeReadyRecords.length > 0;
  React.useEffect(() => {
    if (!needsZiweiLib || ziweiLib || ziweiLibFailed) return undefined;
    let cancelled = false;
    loadZiweiLib()
      .then((lib) => { if (!cancelled) setZiweiLib(lib); })
      .catch((error) => {
        console.warn('紫微排盘库加载失败:', error);
        if (!cancelled) setZiweiLibFailed(true);
      });
    return () => { cancelled = true; };
  }, [needsZiweiLib, ziweiLib, ziweiLibFailed]);

  const homeFortuneState = React.useMemo(() => {
    if (!homeProfile) {
      return {
        data: null,
        error: ziweiRecords.length > 0
          ? '现有紫微档案缺少历法、性别或时辰，请前往档案页检查。'
          : null,
      };
    }
    if (!ziweiLib) {
      return ziweiLibFailed
        ? { data: null, error: '紫微排盘组件没能下载，可能是网络不稳定，请稍后重试。', retry: true }
        : { data: null, error: null, loading: true };
    }

    try {
      return {
        data: ziweiLib.buildHomeFortune(homeProfile, homePeriod, homeSolarNow),
        error: null,
      };
    } catch (error) {
      console.warn('Unable to build home fortune:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : '当前档案无法生成运势简报',
      };
    }
  }, [homeSolarNow, homePeriod, homeProfile, ziweiLib, ziweiLibFailed, ziweiRecords.length]);

  const homeFortune = homeFortuneState.data;

  const homeKeywords = React.useMemo(
    () => getFortuneKeywords(homeFortune),
    [homeFortune],
  );

  const homeDimensions = React.useMemo(
    () => getFortuneDimensions(homeFortune),
    [homeFortune],
  );

  const homeEvidence = React.useMemo(() => {
    if (!homeFortune) return [];
    const contractEvidence = getCustomEvidence(homeFortune);
    if (contractEvidence.length) return contractEvidence;

    const evidence = [];
    if (homeFortune.palaceName) {
      evidence.push({
        label: '运限落宫',
        value: `${homeFortune.palaceName}${homeFortune.palaceBranch ? ` · ${homeFortune.palaceBranch}` : ''}`,
      });
    }
    if (homeFortune.decadalPalaceName) {
      evidence.push({
        label: '大限背景',
        value: `${homeFortune.decadalPalaceName}${homeFortune.nominalAge ? ` · 虚岁${homeFortune.nominalAge}` : ''}`,
      });
    }
    if (Array.isArray(homeFortune.mutagens) && homeFortune.mutagens.length) {
      evidence.push({
        label: '当前四化',
        value: homeFortune.mutagens.map((item) => `${item.label}${item.star}`).join(' · '),
      });
    }
    if (Array.isArray(homeFortune.movingStars) && homeFortune.movingStars.length) {
      evidence.push({ label: '当前流耀', value: homeFortune.movingStars.join(' · ') });
    }
    return evidence;
  }, [homeFortune]);

  const handleShareFortune = async () => {
    if (!homeFortune) return;

    const fallbackText = [
      `古书派 · ${homeFortune.periodLabel}`,
      `${homeFortune.dateLabel} · ${homeFortune.stemBranch}`,
      `关键词：${homeKeywords.join(' · ')}`,
      `宜：${homeFortune.action}`,
      `慎：${homeFortune.caution}`,
      '仅供传统文化研究与自我观察。',
    ].join('\n');
    const shareText = cleanText(homeFortune.privacySafeShareText) || fallbackText;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.search = '';
    cleanUrl.hash = '';

    if (navigator.share) {
      try {
        await navigator.share({
          title: `古书派 · ${homeFortune.periodLabel}`,
          text: shareText,
          url: cleanUrl.toString(),
        });
        setHomeShareNotice({ type: 'success', message: '已完成分享，内容不含姓名与出生资料' });
        track('fortune_share', { period: homePeriod, channel: 'share' });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    try {
      await copyPlainText(`${shareText}\n${cleanUrl}`);
      setHomeShareNotice({ type: 'success', message: '已复制隐私版摘要，不含姓名与出生资料' });
      track('fortune_share', { period: homePeriod, channel: 'copy' });
    } catch {
      setHomeShareNotice({ type: 'error', message: '暂时无法分享，请稍后再试' });
    }
  };

  const handleForceUpdate = async () => {
    if (!window.confirm('确定要清除所有缓存并强制更新吗？')) return;
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ('caches' in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
      }
    } finally {
      const refreshUrl = new URL(window.location.href);
      refreshUrl.searchParams.set('refresh', Date.now().toString());
      window.location.replace(refreshUrl.toString());
    }
  };

  const navigateFromMobile = (nextView) => {
    setIsMoreOpen(false);
    setBaziRecord(null);
    setLiuyaoRecord(null);
    setView(nextView);
  };

  const openLiuYao = () => {
    setLiuyaoRecord(null);
    setView('liuyao');
  };

  const leaveWelcomeCover = (nextView = 'home') => {
    try {
      globalThis.localStorage?.setItem(WELCOME_COVER_KEY, 'seen');
    } catch {
      // Storage can be unavailable in private browsing. The in-memory state
      // still lets the user continue normally for this visit.
    }
    setShowWelcomeCover(false);
    setView(nextView);
  };

  const showsMobileNav = !showWelcomeCover && ['home', 'input', 'archive'].includes(view);
  const usesOwnHeader = ['liuyao', 'bazi', 'archive', 'videos', 'chart', 'about'].includes(view);

  return (
    <div className={`app-shell ${showsMobileNav ? 'app-shell--mobile-nav' : ''} ${view === 'chart' ? 'app-shell--chart' : ''}`}>
      <div className="app-ambient" aria-hidden="true"></div>

      {/* Header */}
      {!showWelcomeCover && !usesOwnHeader && <header className="app-header">
        <div className="header-inner">
          <div className="brand-lockup">
            {view !== 'home' && (
              <button
                type="button"
                aria-label={view === 'chart' ? '返回生辰输入' : '返回首页'}
                onClick={() => {
                  if (view === 'chart') setView('input');
                  else setView('home');
                }}
                className="icon-button"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            <div className="brand-seal" aria-hidden="true">古</div>
            <div className="brand-copy">
              <h1 className="brand-name">古书派</h1>
              <p className="brand-caption">传统命理 · 当代排盘</p>
            </div>
          </div>
          <nav className="header-actions" aria-label="快捷入口">
            {view === 'home' && (
              <button
                type="button"
                aria-label="打开命盘档案"
                onClick={() => setView('archive')}
                className="header-action header-action--archive"
              >
                <span aria-hidden="true">册</span>
                <span className="archive-label">我的档案</span>
              </button>
            )}

            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={showInstallModal}
              onClick={handleInstallClick}
              className="header-action header-action--install"
            >
              <span aria-hidden="true">＋</span>
              {deferredPrompt ? '安装到手机' : '添加到主屏幕'}
            </button>
          </nav>
        </div>
      </header>}

      {/* Main Content */}
      <main className="app-main">
        {showWelcomeCover ? (
          <WelcomeCover
            onEnter={() => leaveWelcomeCover('home')}
            onNavigate={leaveWelcomeCover}
          />
        ) : view === 'home' ? (
          // --- HOME PORTAL VIEW ---
          <div className="home-page animate-in fade-in duration-500">
            <div className={`home-overview ${homeFortune || homeBaziRecord ? 'home-overview--personalized' : 'home-overview--empty'}`}>
              <div className="home-briefs">
              {homeBaziRecord && !homeFortune && (
                <Suspense fallback={null}>
                  <HomeBaziToday record={homeBaziRecord} source={homeBazi} candidates={homeBaziCandidates} onSelect={selectHomeBazi} now={homeSolarNow} deviceNow={homeNow} onOpenChart={openBaziToday} onOpenZiwei={() => setView('input')} />
                </Suspense>
              )}
              {(homeFortune || !homeBaziRecord) && (
              <section className={`fortune-brief ${homeFortune ? 'fortune-brief--personalized' : 'fortune-brief--empty'}`} aria-labelledby="fortune-brief-title">
                <header className="fortune-brief-header">
                  <div>
                    <p className="fortune-brief-eyebrow">私人运势简报</p>
                    <h3 id="fortune-brief-title">{homeFortune ? `${homeFortune.profileName}的${homeFortune.periodLabel}` : '每天打开，就有当下重点'}</h3>
                  </div>
                  <div className="fortune-header-actions">
                    {homeFortune && (
                      <button
                        type="button"
                        className="fortune-share-button"
                        onClick={handleShareFortune}
                        aria-describedby="fortune-share-privacy"
                      >
                        <span aria-hidden="true">↗</span> 分享
                      </button>
                    )}
                    <span className="fortune-brief-seal" aria-hidden="true">今</span>
                  </div>
                </header>

                {homeFortune ? (
                  <>
                    {homeReadyRecords.length > 1 && (
                      <div className="fortune-profiles" aria-label="切换命盘档案">
                        {homeReadyRecords.slice(0, 5).map((record) => (
                          <button
                            key={record.id}
                            type="button"
                            aria-pressed={homeProfile?.id === record.id}
                            onClick={() => setHomeProfileId(record.id)}
                          >
                            {record.name || '未命名'}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="fortune-periods" role="group" aria-label="选择运势时间层">
                      {ziweiLib.HOME_FORTUNE_PERIODS.map((period) => (
                        <button
                          key={period.key}
                          type="button"
                          aria-pressed={homePeriod === period.key}
                          onClick={() => setHomePeriod(period.key)}
                        >
                          <span aria-hidden="true">{period.icon}</span>
                          {period.label}
                        </button>
                      ))}
                    </div>

                    <div className="fortune-brief-date">
                      <span>{homeFortune.dateLabel}</span>
                      <strong>{homeFortune.stemBranch}</strong>
                    </div>

                    <div className="fortune-keywords" aria-label="运势关键词">
                      {homeKeywords.map((keyword, index) => (
                        <span key={keyword}><b>{index + 1}</b>{keyword}</span>
                      ))}
                    </div>

                    <p className="fortune-summary">{homeFortune.summary}</p>

                    <div className="fortune-dimensions" aria-label="事业、财务、关系与身心提示">
                      {homeDimensions.map((dimension) => (
                        <article
                          key={dimension.key}
                          className={`fortune-dimension ${dimension.isFocus ? 'fortune-dimension--focus' : ''}`}
                        >
                          <span className="fortune-dimension-seal" aria-hidden="true">{dimension.seal}</span>
                          <div>
                            <h4>{dimension.label}{dimension.isFocus && <small>当下重点</small>}</h4>
                            <p>{dimension.text}</p>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="fortune-guidance" aria-label="当下参考">
                      <p><span>宜</span>{homeFortune.action}</p>
                      <p><span>慎</span>{homeFortune.caution}</p>
                    </div>

                    {homeEvidence.length > 0 && (
                      <details className="fortune-evidence">
                        <summary>
                          <span>为什么这样判断</span>
                          <span className="fortune-evidence-toggle" aria-hidden="true">⌄</span>
                        </summary>
                        <div className="fortune-evidence-body">
                          <dl>
                            {homeEvidence.map((item, index) => (
                              <div key={`${item.label}-${index}`}>
                                <dt>{item.label}</dt>
                                <dd>{item.value}</dd>
                              </div>
                            ))}
                          </dl>
                          {homeFortune.dayBoundaryNote && <p className="fortune-boundary-note">{homeFortune.dayBoundaryNote}</p>}
                        </div>
                      </details>
                    )}

                    <button type="button" className="fortune-open-chart" onClick={() => handleLoadRecord(homeProfile)}>
                      查看完整命盘与专业依据 <span aria-hidden="true">→</span>
                    </button>
                    {homeShareNotice && (
                      <p className={`fortune-share-notice fortune-share-notice--${homeShareNotice.type}`} role={homeShareNotice.type === 'error' ? 'alert' : 'status'}>
                        {homeShareNotice.message}
                      </p>
                    )}
                    <p id="fortune-share-privacy" className="fortune-share-privacy">分享默认隐藏姓名、生辰、档案备注等私人资料。</p>
                    <p className="fortune-disclaimer">{currentPlace ? `按${placeDisplayName(currentPlace)}真太阳时自动排盘` : '按当前设备时间自动排盘'}，仅供传统文化研究；具体判断需结合本命与三方四正。</p>
                  </>
                ) : (
                  <div className="fortune-empty-content">
                    <p>{homeFortuneState.loading ? '正在生成今日简报…' : homeFortuneState.error || '排一次八字，或保存本人的紫微命盘，首页便会自动显示今天的运势重点、喜忌与宜忌。'}</p>
                    {!homeFortuneState.loading && <div className="fortune-empty-actions">
                      <button type="button" onClick={() => { setBaziRecord(null); setView('bazi'); }}>
                        排我的八字 <span aria-hidden="true">→</span>
                      </button>
                      <button type="button" onClick={() => (homeFortuneState.retry ? setZiweiLibFailed(false) : setView(homeFortuneState.error ? 'archive' : 'input'))}>
                        {homeFortuneState.retry ? '重新加载' : homeFortuneState.error ? '检查紫微档案' : '保存紫微命盘'} <span aria-hidden="true">→</span>
                      </button>
                    </div>}
                    <span>出生资料只保存在当前设备</span>
                  </div>
                )}
              </section>
              )}
              {homeBaziRecord && homeFortune && (
                <Suspense fallback={null}>
                  <HomeBaziToday record={homeBaziRecord} source={homeBazi} candidates={homeBaziCandidates} onSelect={selectHomeBazi} now={homeSolarNow} deviceNow={homeNow} onOpenChart={openBaziToday} />
                </Suspense>
              )}
              </div>

              <section className={`home-hero ${homeFortune || homeBaziRecord ? 'home-hero--personalized' : ''}`} aria-labelledby="home-title">
                <p className="section-kicker">{homeFortune || homeBaziRecord ? '每日一看 · 把握当下' : '古法为体 · 数理为用'}</p>
                <h2 id="home-title" className="home-title">
                  {homeFortune || homeBaziRecord ? <>从当下入手，<em>再观人生全局</em></> : <>以星曜为镜，<em>观人生脉络</em></>}
                </h2>
                <p className="home-subtitle">
                  {homeFortune || homeBaziRecord
                    ? '先用三十秒看懂今天的重点，需要时再展开命盘依据。少一点术语堆叠，多一点可以落实的提示。'
                    : '从一张命盘开始，查看紫微十二宫与八字四柱、大运流年。传统术数，用更清晰的方式呈现。'}
                </p>
                <div className="home-assurances" aria-label="产品特点">
                  <span className="assurance-chip">{homeFortune || homeBaziRecord ? '三十秒简报' : '专业命盘'}</span>
                  <span className="assurance-chip">{homeFortune || homeBaziRecord ? '喜忌提示' : '运限推演'}</span>
                  <span className="assurance-chip">{homeFortune || homeBaziRecord ? '依据可展开' : '本地保存'}</span>
                </div>
              </section>
            </div>

            <section aria-label="核心功能">
              <button
                type="button"
                aria-label="进入紫微斗数专业排盘"
                onClick={() => setView('input')}
                className="primary-destiny-card"
              >
                <div className="primary-card-copy">
                  <p className="card-overline">主入口 · 紫微斗数</p>
                  <h3 className="primary-card-title">紫微斗数专业排盘</h3>
                  <p className="primary-card-description">
                    输入出生年月日与时辰，生成十二宫命盘；继续查看大限、流年、流月、流日与分析话术。
                  </p>
                  <ul className="primary-card-features" aria-hidden="true">
                    <li>本命十二宫</li>
                    <li>大限流年</li>
                    <li>命理话术</li>
                  </ul>
                  <span className="primary-card-cta">
                    输入生辰，开始排盘 <span aria-hidden="true">→</span>
                  </span>
                </div>
                <div className="destiny-orbit" aria-hidden="true">
                  <span className="orbit-label orbit-label--top">天</span>
                  <span className="orbit-label orbit-label--right">命</span>
                  <span className="orbit-label orbit-label--bottom">地</span>
                  <span className="orbit-label orbit-label--left">运</span>
                  <span className="orbit-center">紫微</span>
                </div>
              </button>
            </section>

            <div className="section-heading">
              <h3>更多术数工具</h3>
              <p>按你的问题，选择合适的推演方式</p>
            </div>

            <section className="secondary-tools" aria-label="术数工具">
              <button
                type="button"
                onClick={() => { setBaziRecord(null); setView('bazi'); }}
                className="tool-card tool-card--cinnabar"
              >
                <span className="tool-card-copy">
                  <span className="tool-card-eyebrow">四柱 · 五行</span>
                  <span className="tool-card-title">八字排盘</span>
                  <span className="tool-card-description">从年、月、日、时四柱入门，学习十神、五行与大运流年的关系。</span>
                  <span className="tool-card-action">进入八字书院 <span aria-hidden="true">→</span></span>
                </span>
                <span className="tool-symbol" aria-hidden="true">柱</span>
              </button>

              <button
                type="button"
                onClick={openLiuYao}
                className="tool-card"
              >
                <span className="tool-card-copy">
                  <span className="tool-card-eyebrow">一事一问 · 纳甲装卦</span>
                  <span className="tool-card-title">六爻起卦</span>
                  <span className="tool-card-description">摇铜钱或手势起卦，自动排出本卦变卦、六亲六神与世应，可存档或交给 AI 断卦。</span>
                  <span className="tool-card-action">立即起卦 <span aria-hidden="true">→</span></span>
                </span>
                <span className="tool-symbol" aria-hidden="true">卦</span>
              </button>
            </section>

            <nav className="quiet-links quiet-links--archive" aria-label="命盘档案">
              <button type="button" onClick={() => setView('archive')} className="quiet-link">
                <span className="quiet-link-icon" aria-hidden="true">册</span>
                <span className="quiet-link-copy">
                  <span className="quiet-link-title">命盘档案</span>
                  <span className="quiet-link-caption">查看已保存的人物命盘</span>
                </span>
                <span className="quiet-link-arrow" aria-hidden="true">›</span>
              </button>
            </nav>

            <footer className="home-footer">
              <p>版本 {APP_VERSION}</p>
              <button
                type="button"
                onClick={() => setView('about')}
                className="force-update-button"
              >
                关于与隐私
              </button>
              <button
                type="button"
                onClick={() => setShowWelcomeCover(true)}
                className="force-update-button"
              >
                查看品牌封面
              </button>
              <button
                type="button"
                onClick={handleForceUpdate}
                className="force-update-button"
              >
                页面显示异常？清除缓存并更新
              </button>
            </footer>
          </div>
        ) : view === 'input' ? (
          // --- INPUT VIEW ---
          <div className="input-page animate-in fade-in duration-500">
            <section className="input-panel" aria-labelledby="birth-form-title">
              <header className="input-panel-header">
                <p className="input-panel-eyebrow">紫微斗数 · 生辰排盘</p>
                <h2 id="birth-form-title" className="panel-title">请录入生辰</h2>
                <p className="panel-subtitle">日期与时辰会影响命宫及星曜位置，请按出生资料准确填写。</p>
              </header>

              <form
                className="birth-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleStartScan();
                }}
              >
                {ziweiArchiveCandidates.length > 0 && (
                  <div className="form-fieldset">
                    <label htmlFor="ziwei-archive" className="field-label">
                      从档案带入<span className="field-optional">选填</span>
                    </label>
                    <select
                      id="ziwei-archive"
                      value=""
                      onChange={(event) => applyZiweiArchiveRecord(event.target.value)}
                      className="field-control"
                      aria-describedby="ziwei-archive-hint"
                    >
                      <option value="">选择已保存的命主…</option>
                      {ziweiArchiveCandidates.map(({ record, form }) => (
                        <option key={record.id} value={record.id}>
                          {record.name || '未命名'} · {record.type === 'bazi' ? '八字' : '紫微'} · {form.calendarType === 'lunar' ? '农历' : '公历'}{form.year}-{Math.abs(form.month)}-{form.day}
                        </option>
                      ))}
                    </select>
                    <p id="ziwei-archive-hint" className="field-hint">八字档案里的生辰也能直接排紫微盘，带入后仍可修改。</p>
                  </div>
                )}
                <fieldset className="form-fieldset">
                  <legend className="field-legend">历法</legend>
                  <div className="segmented-control" aria-label="选择出生日期历法">
                    <button
                      type="button"
                      aria-pressed={calendarType === 'solar'}
                      onClick={() => updateCalendarType('solar')}
                      className="segment-button"
                    >
                      阳历
                    </button>
                    <button
                      type="button"
                      aria-pressed={calendarType === 'lunar'}
                      onClick={() => updateCalendarType('lunar')}
                      className="segment-button"
                    >
                      农历
                    </button>
                  </div>
                </fieldset>

                <div className="form-fieldset">
                  <span id="birth-date-label" className="field-label">出生日期</span>
                  <div className="birth-date-grid" role="group" aria-labelledby="birth-date-label" aria-describedby="birth-date-hint">
                    <label className="birth-date-part">
                      <span className="sr-only">出生年份</span>
                      <select
                        value={birthDateParts.year}
                        onChange={(event) => updateBirthDatePart('year', event.target.value)}
                        autoComplete="bday-year"
                        required
                      >
                        <option value="">选择</option>
                        {BIRTH_YEAR_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                      </select>
                      <span aria-hidden="true">年</span>
                    </label>
                    <label className="birth-date-part">
                      <span className="sr-only">出生月份</span>
                      <select
                        value={birthDateParts.month}
                        onChange={(event) => updateBirthDatePart('month', event.target.value)}
                        autoComplete="bday-month"
                        required
                      >
                        <option value="">选择</option>
                        {BIRTH_MONTH_OPTIONS.map((month) => <option key={month} value={month}>{Number(month)}</option>)}
                      </select>
                      <span aria-hidden="true">月</span>
                    </label>
                    <label className="birth-date-part">
                      <span className="sr-only">出生日期</span>
                      <select
                        value={birthDateParts.day}
                        onChange={(event) => updateBirthDatePart('day', event.target.value)}
                        autoComplete="bday-day"
                        required
                      >
                        <option value="">选择</option>
                        {birthDayOptions.map((day) => (
                          <option key={day} value={day} disabled={Number(day) > birthDayCount}>
                            {Number(day)}
                          </option>
                        ))}
                      </select>
                      <span aria-hidden="true">日</span>
                    </label>
                  </div>
                  <p
                    id="birth-date-hint"
                    className={`field-hint ${calendarType === 'lunar' ? 'field-hint--warning' : ''}`}
                  >
                    {calendarType === 'solar'
                      ? '请依次选择出生年、月、日。'
                      : '请依次选择农历年、月、日；如为闰月，请开启下方闰月标记。'}
                  </p>
                  {calendarType === 'lunar' && (
                    <button
                      type="button"
                      className="lunar-leap-toggle"
                      aria-pressed={effectiveIsLeapMonth}
                      disabled={!leapMonthAvailable}
                      onClick={toggleLeapMonth}
                    >
                      <span aria-hidden="true">闰</span>
                      <strong>
                        {leapMonthAvailable
                          ? `${effectiveIsLeapMonth ? '已选择' : '选择'}闰${Number(birthDateParts.month)}月`
                          : '所选年月无对应闰月'}
                      </strong>
                      <small>{leapMonthAvailable ? '请按出生资料确认' : '选择有闰月的年份与月份后可用'}</small>
                    </button>
                  )}
                </div>

                <fieldset className="form-fieldset">
                  <legend className="field-legend">出生时间</legend>
                  <div className="segmented-control" aria-label="出生时间的记录方式">
                    <button type="button" aria-pressed={ziweiTimeMode === 'shichen'} onClick={() => setZiweiTimeMode('shichen')} className="segment-button">只知道时辰</button>
                    <button type="button" aria-pressed={ziweiTimeMode === 'exact'} onClick={() => setZiweiTimeMode('exact')} className="segment-button">精确到分钟</button>
                  </div>
                  {ziweiTimeMode === 'shichen' ? (
                    <>
                      <select
                        id="birth-time"
                        value={birthTime}
                        onChange={(event) => setBirthTime(Number(event.target.value))}
                        aria-label="出生时辰"
                        aria-describedby="birth-time-hint"
                        className="field-control"
                      >
                        {Array.from({ length: 13 }).map((_, i) => (
                          <option key={i} value={i}>{getTimeDescription(i)}</option>
                        ))}
                      </select>
                      <p id="birth-time-hint" className="field-hint">23:00 后请选择“晚子时”，00:00 后请选择“早子时”。知道几点几分的话，选「精确到分钟」可按真太阳时定时辰。</p>
                    </>
                  ) : (
                    <>
                      <input
                        id="birth-clock"
                        type="time"
                        value={ziweiClock}
                        onChange={(event) => setZiweiClock(event.target.value)}
                        aria-label="出生时间（钟表时间）"
                        className="field-control"
                        required
                      />
                      <div className="birth-date-grid" role="group" aria-label="出生地">
                        <label className="birth-date-part">
                          <span className="sr-only">省份</span>
                          <select value={ziweiPlace.province} onChange={(event) => changeZiweiProvince(event.target.value)}>
                            <option value="">选择省份</option>
                            {BIRTH_PROVINCES.map((item) => <option key={item.province} value={item.province}>{item.province}</option>)}
                          </select>
                          <span aria-hidden="true">省</span>
                        </label>
                        <label className="birth-date-part">
                          <span className="sr-only">城市</span>
                          <select value={ziweiPlace.city} onChange={(event) => changeZiweiCity(event.target.value)} disabled={!ziweiPlace.province}>
                            <option value="">选择城市</option>
                            {(BIRTH_PROVINCES.find((item) => item.province === ziweiPlace.province)?.cities ?? []).map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                          </select>
                          <span aria-hidden="true">市</span>
                        </label>
                        <label className="birth-date-part">
                          <span className="sr-only">时区</span>
                          <select value={ziweiPlace.timezone} onChange={(event) => setZiweiPlace((place) => ({ ...place, timezone: Number(event.target.value) }))}>
                            {TIMEZONE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                          </select>
                          <span aria-hidden="true">区</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={ziweiPlace.longitude}
                        onChange={(event) => setZiweiPlace((place) => ({ ...place, longitude: event.target.value }))}
                        placeholder="经度（°E，选城市后自动填入，县区可微调）"
                        aria-label="出生地经度"
                        className="field-control"
                      />
                      {ziweiExact?.dstSuggested && (
                        <label className="field-hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="checkbox" checked={ziweiExact.applyDst} onChange={(event) => setZiweiDst(event.target.checked)} />
                          出生时正实行夏令时（1986–1991 年），换算时减去一小时
                        </label>
                      )}
                      {ziweiExact ? (
                        <p className="field-hint" aria-live="polite">
                          钟表 {ziweiClock} → 真太阳时 {ziweiExact.timeInfo.correctedTime} · <strong>{ziweiExact.hourName}</strong>
                          {ziweiExact.timeInfo.correctedDate !== ziweiExact.timeInfo.clockDate ? `（公历 ${ziweiExact.timeInfo.correctedDate}）` : ''}
                          {ziweiExact.timeInfo.trueSolarApplied
                            ? `，经度时差 ${ziweiExact.timeInfo.longitudeMinutes >= 0 ? '+' : '−'}${Math.abs(ziweiExact.timeInfo.longitudeMinutes).toFixed(1)} 分 · 均时差 ${ziweiExact.timeInfo.equationMinutes >= 0 ? '+' : '−'}${Math.abs(ziweiExact.timeInfo.equationMinutes).toFixed(1)} 分`
                            : '。还没有填出生地经度，暂按钟表时间定时辰'}
                        </p>
                      ) : (
                        <p className={`field-hint ${ziweiExactError ? 'field-hint--warning' : ''}`}>{ziweiExactError || '填出生证明或家人记得的钟表时间，再选出生地，按真太阳时定时辰。'}</p>
                      )}
                      {ziweiExact?.timeInfo.boundary && (
                        <p className="field-hint field-hint--warning" role="note">
                          离时辰交界只有 {ziweiExact.timeInfo.boundary.minutesToBoundary} 分钟：钟表 {ziweiExact.timeInfo.boundary.boundaryClockTime}{ziweiExact.timeInfo.boundary.isBeforeBoundary ? '及之后' : '之前'}出生则为{ziweiExact.timeInfo.boundary.alternative.hourName}。出生时间记得不准时，两种时辰的命盘都值得对照。
                        </p>
                      )}
                    </>
                  )}
                  {isZiweiLateZi && (
                    <div className="late-zi-choice" role="group" aria-label="晚子时流派">
                      <div className="segmented-control">
                        {ZIWEI_LATE_ZI_OPTIONS.map((option) => (
                          <button key={option.value} type="button" aria-pressed={ziweiLateZi === option.value} onClick={() => setZiweiLateZi(option.value)} className="segment-button">{option.label}</button>
                        ))}
                      </div>
                      <p className="field-hint">{ZIWEI_LATE_ZI_OPTIONS.find((option) => option.value === ziweiLateZi)?.note}。两派都有依据，默认按通行做法换次日；八字模块默认不换日。</p>
                    </div>
                  )}
                </fieldset>

                <div className="form-fieldset">
                  <label htmlFor="birth-name" className="field-label">
                    姓名<span className="field-optional">选填</span>
                  </label>
                  <input
                    id="birth-name"
                    type="text"
                    placeholder="用于区分命盘档案"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="field-control"
                    autoComplete="name"
                  />
                </div>

                <fieldset className="form-fieldset">
                  <legend className="field-legend">性别</legend>
                  <div className="choice-grid">
                    <button
                      type="button"
                      aria-pressed={gender === 'male'}
                      onClick={() => setGender('male')}
                      className="choice-button"
                    >
                      男命
                    </button>
                    <button
                      type="button"
                      aria-pressed={gender === 'female'}
                      onClick={() => setGender('female')}
                      className="choice-button"
                    >
                      女命
                    </button>
                  </div>
                </fieldset>

                <button type="submit" className="submit-button" disabled={!ziweiExactReady} aria-disabled={!ziweiExactReady}>生成紫微命盘</button>
                <p className="privacy-note">
                  <span aria-hidden="true">◇</span>
                  生辰资料仅用于本次排盘；只有主动保存档案后，才会存入当前设备的浏览器。
                </p>
              </form>
            </section>
          </div>
        ) : view === 'liuyao' ? (
          // --- LIU YAO DIVINATION VIEW ---
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p>正在加载六爻模块...</p>
                </div>
              </div>
            }>
              <LiuYaoDivination
                key={liuyaoRecord?.id ?? 'new'}
                initialRecord={liuyaoRecord}
                initialMethod={liuyaoMethod}
                onBack={() => { setView(liuyaoRecord ? 'archive' : 'home'); setLiuyaoRecord(null); }}
              />
            </Suspense>
          </ErrorBoundary>
        ) : view === 'archive' ? (
          // --- ARCHIVE VIEW ---
          <Suspense fallback={<div className="text-white p-10 text-center">Loading Archive...</div>}>
            <ArchiveView
              onBack={() => setView('home')}
              onLoadRecord={handleLoadRecord}
            />
          </Suspense>
        ) : view === 'videos' ? (
          // --- VIDEO LESSONS VIEW ---
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center text-white">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p>正在加载课程...</p>
              </div>
            </div>
          }>
            <VideoLessons onBack={() => setView('home')} />
          </Suspense>
        ) : view === 'bazi' ? (
          // --- BAZI DIVINATION VIEW ---
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center text-white">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#55bba8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p>正在加载八字模块...</p>
              </div>
            </div>
          }>
            <BaziDivination
              key={baziRecord?.id ?? 'new'}
              initialRecord={baziRecord}
              onBack={() => { setBaziRecord(null); setView('home'); }}
            />
          </Suspense>
        ) : view === 'about' ? (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <AboutView onBack={() => setView('home')} version={APP_VERSION} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          // --- CHART VIEW ---
          <div className="chart-workspace flex-1 relative overflow-hidden flex flex-col">
            {/* Chart Area */}
            <div className="chart-scroll-area flex-1 overflow-auto p-2 md:p-4">
              <div className="chart-frame relative mx-auto w-full overflow-hidden">
                <Suspense fallback={
                  <div className="flex min-h-[60vh] items-center justify-center text-white">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-[#55bba8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p>正在加载命盘...</p>
                    </div>
                  </div>
                }>
                <ProfessionalChart
                  horoscope={horoscope}
                  basicInfo={{
                    name,
                    gender,
                    birthday,
                    birthTime: getTimeDescription(birthTime),
                    birthTimeIndex: Number(birthTime),
                    calendarType,
                    isLeapMonth: effectiveIsLeapMonth,
                    lunarDate: horoscope?.lunarDate,
                    trueSolar: ziweiExact ? {
                      clockTime: ziweiClock,
                      correctedDate: ziweiExact.timeInfo.correctedDate,
                      correctedTime: ziweiExact.timeInfo.correctedTime,
                      hourName: ziweiExact.hourName,
                      placeName: ziweiExact.placeName,
                      applied: ziweiExact.timeInfo.trueSolarApplied,
                      totalMinutes: ziweiExact.timeInfo.totalMinutes,
                      boundary: ziweiExact.timeInfo.boundary,
                    } : null,
                  }}
                  onSave={openSaveArchive}
                  onOpenArchive={() => setView('archive')}
                  onQuickChart={() => setView('input')}
                  onShareLink={handleShareZiweiLink}
                />
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </main>

      {showsMobileNav && <nav className="mobile-bottom-nav print:hidden" aria-label="手机主导航">
        <button
          type="button"
          className={view === 'home' ? 'mobile-nav-item mobile-nav-item--active' : 'mobile-nav-item'}
          aria-current={view === 'home' ? 'page' : undefined}
          onClick={() => navigateFromMobile('home')}
        >
          <span className="mobile-nav-glyph" aria-hidden="true">日</span>
          <span>今日</span>
        </button>
        <button
          type="button"
          className={['input', 'chart'].includes(view) ? 'mobile-nav-item mobile-nav-item--active' : 'mobile-nav-item'}
          aria-current={['input', 'chart'].includes(view) ? 'page' : undefined}
          onClick={() => navigateFromMobile('input')}
        >
          <span className="mobile-nav-glyph" aria-hidden="true">紫</span>
          <span>紫微</span>
        </button>
        <button
          type="button"
          className={view === 'bazi' ? 'mobile-nav-item mobile-nav-item--active' : 'mobile-nav-item'}
          aria-current={view === 'bazi' ? 'page' : undefined}
          onClick={() => navigateFromMobile('bazi')}
        >
          <span className="mobile-nav-glyph" aria-hidden="true">八</span>
          <span>八字</span>
        </button>
        <button
          type="button"
          className={view === 'archive' ? 'mobile-nav-item mobile-nav-item--active' : 'mobile-nav-item'}
          aria-current={view === 'archive' ? 'page' : undefined}
          onClick={() => navigateFromMobile('archive')}
        >
          <span className="mobile-nav-glyph" aria-hidden="true">册</span>
          <span>档案</span>
        </button>
        <button
          ref={moreOpenerRef}
          type="button"
          className={isMoreOpen || ['liuyao', 'videos'].includes(view) ? 'mobile-nav-item mobile-nav-item--active' : 'mobile-nav-item'}
          aria-haspopup="dialog"
          aria-expanded={isMoreOpen}
          onClick={() => setIsMoreOpen((isOpen) => !isOpen)}
        >
          <span className="mobile-nav-glyph" aria-hidden="true">···</span>
          <span>更多</span>
        </button>
      </nav>}

      {showsMobileNav && isMoreOpen && (
        <div
          className="mobile-more-overlay print:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsMoreOpen(false);
          }}
        >
          <section
            ref={moreDialogRef}
            className="mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
          >
            <header className="mobile-more-header">
              <div>
                <p>古书派工具箱</p>
                <h2 id="mobile-more-title">更多功能</h2>
              </div>
              <button type="button" onClick={() => setIsMoreOpen(false)} aria-label="关闭更多功能">✕</button>
            </header>

            <div className="mobile-more-grid">
              <button type="button" className="mobile-more-card" onClick={() => navigateFromMobile('liuyao')}>
                <span className="mobile-more-seal" aria-hidden="true">卦</span>
                <span><b>六爻起卦</b><small>摇铜钱或手势起卦，自动装卦</small></span>
                <i aria-hidden="true">›</i>
              </button>
              <button
                type="button"
                className="mobile-more-card"
                onClick={() => {
                  setIsMoreOpen(false);
                  handleInstallClick();
                }}
              >
                <span className="mobile-more-seal mobile-more-seal--jade" aria-hidden="true">＋</span>
                <span><b>添加到主屏幕</b><small>像 App 一样快速打开</small></span>
                <i aria-hidden="true">›</i>
              </button>
              <div className="mobile-more-card mobile-more-card--disabled" aria-label="紫微课程正在筹备中">
                <span className="mobile-more-seal" aria-hidden="true">学</span>
                <span><b>紫微课程 <em>筹备中</em></b><small>完成内容校对后开放</small></span>
              </div>
              <button type="button" className="mobile-more-card" onClick={handleForceUpdate}>
                <span className="mobile-more-seal mobile-more-seal--jade" aria-hidden="true">新</span>
                <span><b>检查页面更新</b><small>显示异常时清除旧缓存</small></span>
                <i aria-hidden="true">›</i>
              </button>
              <button
                type="button"
                className="mobile-more-card"
                onClick={() => {
                  setIsMoreOpen(false);
                  setShowWelcomeCover(true);
                }}
              >
                <span className="mobile-more-seal" aria-hidden="true">古</span>
                <span><b>查看品牌封面</b><small>重新进入古书派欢迎页</small></span>
                <i aria-hidden="true">›</i>
              </button>
              <button type="button" className="mobile-more-card" onClick={() => navigateFromMobile('about')}>
                <span className="mobile-more-seal mobile-more-seal--jade" aria-hidden="true">私</span>
                <span><b>关于与隐私</b><small>资料存放、免责声明</small></span>
                <i aria-hidden="true">›</i>
              </button>
            </div>

            <p className="mobile-more-privacy">命盘档案保存在当前设备；分享运势时默认隐藏姓名、生辰与档案备注。</p>
            <p className="mobile-more-version">版本 {APP_VERSION}</p>
          </section>
        </div>
      )}

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 safe-modal-padding">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
            onClick={() => setIsSaveModalOpen(false)}
          ></div>

          <section
            ref={saveDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-dialog-title"
            aria-describedby="save-dialog-description"
            className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[28px] border border-[#cbbfac] bg-[#f3ecdf] text-[#302a25] shadow-2xl animate-in fade-in zoom-in duration-200"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#c8bba7] bg-[#e7ddcc]/80 p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#a33b30]/40 bg-[#a33b30]/[0.06] text-[#96372e]" aria-hidden="true">
                  <Save className="size-5" />
                </span>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-[#81776b]">命盘归档</p>
                  <h3 id="save-dialog-title" className="mt-0.5 font-serif text-xl font-bold tracking-[0.08em] text-[#28231f]">保存到档案</h3>
                </div>
              </div>
              <button type="button" aria-label="关闭保存档案弹窗" onClick={() => setIsSaveModalOpen(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl text-[#756d63] hover:bg-[#d8cdbb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">✕</button>
            </div>

            <div className="space-y-5 p-5">
              <p id="save-dialog-description" className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 px-3 py-2 text-[11px] leading-5 text-[#6f665d]">
                出生资料和备注只保存在当前设备。建议定期前往档案页备份，清除浏览器数据可能导致档案丢失。
              </p>

              <div className="space-y-2">
                <label htmlFor="archive-name" className="text-xs font-bold tracking-[0.12em] text-[#6f665d]">命主称呼</label>
                <input
                  id="archive-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-[#b9ad98] bg-[#fffaf0] px-4 text-[#302a25] outline-none transition focus:border-[#2d6b62] focus-visible:ring-2 focus-visible:ring-[#2d6b62]/30"
                  placeholder="例如：杨先生"
                />
              </div>

              <fieldset className="space-y-2">
                <legend className="text-xs font-bold tracking-[0.12em] text-[#6f665d]">归档分组</legend>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'self', label: '自己' },
                    { id: 'father', label: '父亲' },
                    { id: 'mother', label: '母亲' },
                    { id: 'son', label: '儿子' },
                    { id: 'daughter', label: '女儿' },
                    { id: 'girlfriend', label: '女友' },
                    { id: 'boyfriend', label: '男友' },
                    { id: 'other', label: '其他' }
                  ].map(g => (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => setSaveGroup(g.id)}
                      aria-pressed={saveGroup === g.id}
                      className={`min-h-11 rounded-xl border px-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${saveGroup === g.id
                        ? 'border-[#2d6b62] bg-[#2d6b62] text-white shadow-sm'
                        : 'border-[#cbbfac] bg-[#fffaf0]/70 text-[#6f665d] hover:border-[#9e8f7a]'
                        }`}
                    >
                      {g.label}{saveGroup === g.id ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <label htmlFor="archive-note" className="text-xs font-bold tracking-[0.12em] text-[#6f665d]">备注</label>
                <textarea
                  id="archive-note"
                  value={saveNote}
                  onChange={e => setSaveNote(e.target.value)}
                  placeholder="记录咨询主题、关键事件或后续提醒……"
                  className="h-24 w-full resize-none rounded-xl border border-[#b9ad98] bg-[#fffaf0] p-3 text-sm text-[#302a25] outline-none transition focus:border-[#2d6b62] focus-visible:ring-2 focus-visible:ring-[#2d6b62]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button type="button" onClick={() => setIsSaveModalOpen(false)} className="min-h-12 rounded-xl border border-[#b9ad98] bg-[#fffaf0]/60 px-4 text-sm font-bold text-[#6f665d] hover:bg-[#e9dfcd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">取消</button>
                <button type="button" onClick={handleSaveToArchive} className="min-h-12 rounded-xl bg-[#a33b30] px-4 text-sm font-bold text-white shadow-lg shadow-[#7f2c24]/20 hover:bg-[#8f3028] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d18275]">确认保存</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* PWA Install Modal */}
      {showInstallModal && (
        <div
          className="modal-overlay animate-in fade-in duration-200"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowInstallModal(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-dialog-title"
            aria-describedby="install-dialog-description"
            className="install-dialog"
          >
            <button
              type="button"
              aria-label="关闭添加到主屏幕说明"
              onClick={() => setShowInstallModal(false)}
              className="install-close"
            >
              ✕
            </button>
            <p className="install-eyebrow">手机快捷入口</p>
            <h3 id="install-dialog-title" className="install-title">添加到主屏幕</h3>
            <p id="install-dialog-description" className="install-intro">
              添加后可像普通 App 一样从桌面快速打开，无需经过应用商店。
            </p>

            <div className="install-steps">
              <div className="install-step">
                <p className="install-step-title">iPhone / iPad · Safari</p>
                <p>点击浏览器的“分享”按钮，再向下找到并选择“添加到主屏幕”，最后点击“添加”。</p>
              </div>
              <div className="install-step">
                <p className="install-step-title">Android · Chrome</p>
                <p>点击右上角“⋮”菜单，选择“添加到主屏幕”或“安装应用”，按提示确认。</p>
              </div>
            </div>

            <p className="install-note">
              这是网页快捷方式，不是 App Store 下载。网络可用性与当前网站一致，不代表所有内容都能离线使用。
            </p>
            <button type="button" onClick={() => setShowInstallModal(false)} className="install-confirm">
              我知道了
            </button>
          </section>
        </div>
      )}

      {archiveNotice && (
        <div className="archive-notice fixed inset-x-3 z-[240] flex justify-center print:hidden" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }} role={archiveNotice.type === 'error' ? 'alert' : 'status'} aria-live="polite">
          <div className={`flex min-h-12 max-w-xl items-center gap-2 rounded-2xl border pl-4 pr-1 py-1 text-sm font-bold text-white shadow-2xl backdrop-blur ${archiveNotice.type === 'error' ? 'border-[#d1847b]/60 bg-[#6f2520]/95' : 'border-[#78a69f]/50 bg-[#163d38]/95'}`}>
            {archiveNotice.type === 'error'
              ? <AlertCircle className="size-5 text-[#f0b5ae]" aria-hidden="true" />
              : <CheckCircle2 className="size-5 text-[#8ec8bd]" aria-hidden="true" />}
            <span className="flex-1 py-2">{archiveNotice.message}</span>
            <button
              type="button"
              onClick={() => setArchiveNotice(null)}
              aria-label="关闭档案提示"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-lg text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
