/**
 * 六爻起卦：写下所问、选类别 → 选起卦方式（摇铜钱、手势、手动录卦、时间起卦、报数起卦）→ 装卦结果。
 * 两种起卦动画各自按需加载；起卦时间按「所在地」真太阳时记录，用来定月建、日辰与旬空。
 */
import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Coins, Hand, Hash, PenLine } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';
import PlaceSetting from './common/PlaceSetting';
import LiuYaoResult from './LiuYaoResult';
import ManualCast from './liuyao/ManualCast';
import { useCurrentPlace } from './common/useCurrentPlace';
import { buildLiuYaoReading, describeCastTime } from '../utils/liuyao';
import { castByNumbers, castByTime } from '../utils/liuyaoCast';
import { LIUYAO_TOPICS } from '../utils/liuyaoJudge';
import { liuYaoRecordToInput } from '../utils/liuyaoRecord';
import { toLocalSolarNow } from '../utils/currentPlace';
import { track } from '../utils/analytics';
import { INPUT_FIELD_CLASS } from './bazi/baziTheme';

const MoneyDivination = lazy(() => import('./MoneyDivination'));
const BaguaDivination = lazy(() => import('./BaguaDivination.jsx'));

const METHODS = Object.freeze([
    Object.freeze({
        value: 'coins',
        icon: Coins,
        title: '摇铜钱',
        caption: '三枚铜钱落定六次',
        description: '宋画意境的 3D 铜钱动画，点一次得一爻；随机数来自浏览器加密级随机。',
        action: '开始摇铜钱',
    }),
    Object.freeze({
        value: 'gesture',
        icon: Hand,
        title: '手势起卦',
        caption: '对镜头握拳，一拳一爻',
        description: '沉浸式 3D 八卦阵，开启摄像头后握拳生爻；没有摄像头也能点按钮完成。',
        action: '进入手势起卦',
    }),
    Object.freeze({
        value: 'manual',
        icon: PenLine,
        title: '手动录卦',
        caption: '自己摇了真铜钱',
        description: '按每一爻的背面数录入（一背、两背、三背、三字），程序只负责装卦。',
        action: '录入六爻',
    }),
    Object.freeze({
        value: 'time',
        icon: Clock3,
        title: '时间起卦',
        caption: '梅花易数 · 以此刻为卦',
        description: '农历年月日数取上卦，再加时辰数取下卦与动爻，不必摇钱。',
        action: '按此刻时间起卦',
    }),
    Object.freeze({
        value: 'number',
        icon: Hash,
        title: '报数起卦',
        caption: '心中默念，报两个数',
        description: '第一个数取上卦、第二个数取下卦，两数之和定动爻。',
        action: '按报数起卦',
    }),
]);

const CastFallback = ({ text }) => (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-[#020b0c] text-[#fbf7ed]">
        <div className="text-center">
            <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-[#dcb471] border-t-transparent" />
            <p>{text}</p>
        </div>
    </div>
);

const placeLabelOf = (place) => (place ? place.city || place.province || `东经 ${place.longitude}°` : '');

const parseCastNumber = (text) => {
    const trimmed = String(text ?? '').trim();
    if (!/^\d{1,4}$/.test(trimmed)) return null;
    const value = Number(trimmed);
    return value >= 1 && value <= 9999 ? value : null;
};

const chipClass = (active) => `min-h-10 rounded-xl border px-2 text-xs font-bold leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8] ${active ? 'border-[#dcb471]/60 bg-[#dcb471]/15 text-[#f0ce91]' : 'border-white/10 bg-black/20 text-[#fbf7ed]/65 hover:border-[#dcb471]/35'}`;

/**
 * @param initialMethod 从旧地址 #/money、#/bagua 进入时预选的起卦方式
 * @param initialRecord 从档案打开的卦例；有它时直接显示结果
 */
export default function LiuYaoDivination({ onBack, initialMethod = null, initialRecord = null }) {
    const initialCast = useMemo(() => (initialRecord ? liuYaoRecordToInput(initialRecord) : null), [initialRecord]);
    const [step, setStep] = useState(initialCast ? 'result' : 'ask');
    const [question, setQuestion] = useState(initialCast?.question ?? '');
    const [topic, setTopic] = useState(initialCast?.topic ?? 'general');
    const [gender, setGender] = useState(initialCast?.gender ?? '');
    const [method, setMethod] = useState(initialMethod === 'gesture' ? 'gesture' : 'coins');
    const [numbers, setNumbers] = useState({ first: '', second: '' });
    const [formError, setFormError] = useState('');
    // 最近一次起卦；回到提问页时保留，方便再看一眼结果。
    const [cast, setCast] = useState(initialCast);
    // 当前显示的是否档案里的卦例（改了类别也还是同一卦例）。
    const [fromArchive, setFromArchive] = useState(Boolean(initialCast));
    const place = useCurrentPlace();
    // 提问页上的起卦时间预览每半分钟刷新一次；真正记录的是六爻落定那一刻。
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 30000);
        return () => window.clearInterval(timer);
    }, []);

    const reading = useMemo(() => {
        if (!cast) return null;
        try {
            return buildLiuYaoReading(cast.values, cast.castDate, {
                question: cast.question, method: cast.method, topic: cast.topic, gender: cast.gender, castNote: cast.castNote,
            });
        } catch {
            return null;
        }
    }, [cast]);
    const castTimeNow = useMemo(() => {
        try {
            return describeCastTime(toLocalSolarNow(now, place));
        } catch {
            return null;
        }
    }, [now, place]);

    const finishCast = (values, castDate, castNote = '') => {
        setCast({
            values,
            castDate,
            question: question.trim(),
            method,
            topic,
            gender: topic === 'love' ? gender : '',
            castNote,
            placeLabel: placeLabelOf(place),
        });
        setFromArchive(false);
        setFormError('');
        setStep('result');
        track('liuyao_cast', { method, topic });
    };

    const handleComplete = (values) => finishCast(values, toLocalSolarNow(new Date(), place));

    const handleStart = () => {
        if (topic === 'love' && !gender) {
            setFormError('问感情请先选择问卦人是男是女，用神才能取准。');
            return;
        }
        if (method === 'time') {
            try {
                const castDate = toLocalSolarNow(new Date(), place);
                const result = castByTime(castDate);
                finishCast(result.values, castDate, result.note);
            } catch (error) {
                setFormError(error instanceof Error ? error.message : '时间起卦失败，请重试。');
            }
            return;
        }
        if (method === 'number') {
            const first = parseCastNumber(numbers.first);
            const second = parseCastNumber(numbers.second);
            if (first === null || second === null) {
                setFormError('请报两个 1 到 9999 之间的整数。');
                return;
            }
            try {
                const result = castByNumbers(first, second);
                finishCast(result.values, toLocalSolarNow(new Date(), place), result.note);
            } catch (error) {
                setFormError(error instanceof Error ? error.message : '报数起卦失败，请重试。');
            }
            return;
        }
        setFormError('');
        setStep('cast');
    };

    // 结果页上换个类别重看：同一卦，只是换用神；存档时按最新的类别记录。
    const changeTopic = (nextTopic, nextGender) => {
        setTopic(nextTopic);
        setGender(nextGender);
        setCast((current) => (current ? { ...current, topic: nextTopic, gender: nextTopic === 'love' ? nextGender : '' } : current));
    };

    if (step === 'cast') {
        if (method === 'manual') {
            return <ManualCast onBack={() => setStep('ask')} onComplete={handleComplete} />;
        }
        return (
            <ErrorBoundary>
                <Suspense fallback={<CastFallback text={method === 'gesture' ? '正在加载全息起卦引擎...' : '正在加载 3D 铜钱...'} />}>
                    {method === 'gesture'
                        ? <BaguaDivination onBack={() => setStep('ask')} onComplete={handleComplete} />
                        : <MoneyDivination onBack={() => setStep('ask')} onComplete={handleComplete} question={question.trim()} />}
                </Suspense>
            </ErrorBoundary>
        );
    }

    const showingResult = step === 'result' && reading;
    // 刚起的卦：返回键回到提问页（结果仍保留）；从档案打开的卦例：返回键离开本页。
    const backToAsk = showingResult && !fromArchive;
    const activeMethod = METHODS.find((option) => option.value === method) ?? METHODS[0];

    return (
        <div className="relative flex flex-1 flex-col overflow-clip bg-[#020b0c] text-[#fbf7ed]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#175b4f]/25 blur-3xl" />
                <div className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-[#8e231d]/15 blur-3xl" />
            </div>

            <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-[#dcb471]/15 bg-[#020b0c]/80 px-4 pb-3 backdrop-blur-xl" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                <button
                    type="button"
                    onClick={() => (backToAsk ? setStep('ask') : onBack())}
                    className="inline-flex size-11 items-center justify-center rounded-full border border-[#dcb471]/20 bg-white/[0.03] transition-colors hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]"
                    aria-label={backToAsk ? '返回起卦设置' : '返回上一页'}
                >
                    <ArrowLeft className="size-5 text-[#f0ce91]" aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-[9px_9px_9px_3px] border border-[#dcb471]/60 bg-gradient-to-br from-[#8a6a2a] to-[#4d3812] text-[#ffe9b8] shadow-inner"><span className="font-serif text-base font-extrabold" aria-hidden="true">卦</span></div>
                    <div>
                        <h1 className="font-serif text-lg font-bold tracking-[0.16em] text-[#fbf7ed]">六爻起卦</h1>
                        <p className="text-[11px] tracking-[0.2em] text-[#fbf7ed]/55">一事一问 · 纳甲装卦</p>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 px-4 pt-5" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                {showingResult ? (
                    <LiuYaoResult
                        key={cast.castDate.getTime()}
                        reading={reading}
                        castDate={cast.castDate}
                        archiveRecord={fromArchive ? initialRecord : null}
                        placeLabel={cast.placeLabel ?? ''}
                        onRestart={() => setStep('ask')}
                        onChangeTopic={changeTopic}
                    />
                ) : (
                    <div className="mx-auto max-w-md space-y-5 animate-in fade-in duration-300" role="region" aria-label="六爻起卦设置">
                        <div className="space-y-2 py-2 text-center">
                            <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.28em] text-[#dcb471]/80"><span className="h-px w-8 bg-[#dcb471]/35" />问事<span className="h-px w-8 bg-[#dcb471]/35" /></div>
                            <h2 className="font-serif text-2xl font-bold tracking-[0.12em] text-[#fbf7ed]">静心默念所问之事</h2>
                            <p className="text-sm leading-6 text-[#fbf7ed]/60">一事一问，写下来便于日后对照；起卦后自动装卦、取用神，可存档或交给 AI 分析</p>
                        </div>

                        {reading && (
                            <button type="button" onClick={() => setStep('result')} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#55bba8]/35 bg-[#55bba8]/10 px-4 text-left text-sm text-[#9fe0d2] hover:bg-[#55bba8]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]">
                                <span className="min-w-0 truncate">
                                    <span className="font-bold">刚才的卦：{reading.hexagram.name}{reading.changed ? ` → ${reading.changed.name}` : ''}</span>
                                    {reading.question && <span className="text-[#9fe0d2]/70"> · {reading.question}</span>}
                                </span>
                                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                            </button>
                        )}

                        <section className="space-y-5 rounded-[24px] border border-[#dcb471]/15 bg-[#071719]/85 p-4 shadow-2xl shadow-black/40 sm:p-6">
                            <label className="block">
                                <span className="flex items-center justify-between text-xs font-bold tracking-widest text-[#dcb471]">
                                    <span>所问之事（选填）</span>
                                    <span className="font-normal tabular-nums text-[#fbf7ed]/40">{question.length}/60</span>
                                </span>
                                <textarea
                                    value={question}
                                    maxLength={60}
                                    rows={2}
                                    onChange={(event) => setQuestion(event.target.value)}
                                    placeholder="例如：这个月换工作是否顺利？"
                                    className={`${INPUT_FIELD_CLASS} mt-1.5 w-full resize-none py-2.5 leading-6 placeholder:text-[#fbf7ed]/30`}
                                />
                            </label>

                            <fieldset>
                                <legend className="text-xs font-bold tracking-widest text-[#dcb471]">问事类别 <span className="font-normal tracking-normal text-[#fbf7ed]/45">决定用神怎么取</span></legend>
                                <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                                    {LIUYAO_TOPICS.map((option) => (
                                        <button key={option.value} type="button" aria-pressed={topic === option.value} title={option.hint} onClick={() => { setTopic(option.value); setFormError(''); }} className={chipClass(topic === option.value)}>
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                {topic === 'love' && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-[#fbf7ed]/70" role="group" aria-label="问卦人性别">
                                        <span>问卦人是</span>
                                        {[['male', '男'], ['female', '女']].map(([value, label]) => (
                                            <button key={value} type="button" aria-pressed={gender === value} onClick={() => { setGender(value); setFormError(''); }} className={`${chipClass(gender === value)} min-w-12`}>{label}</button>
                                        ))}
                                        <span className="text-[#fbf7ed]/45">男测取妻财，女测取官鬼</span>
                                    </div>
                                )}
                                <p className="mt-1.5 text-[11px] leading-5 text-[#fbf7ed]/45">{LIUYAO_TOPICS.find((option) => option.value === topic)?.hint}</p>
                            </fieldset>

                            <fieldset>
                                <legend className="text-xs font-bold tracking-widest text-[#dcb471]">起卦方式</legend>
                                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                                    {METHODS.map((option) => {
                                        const Icon = option.icon;
                                        const active = method === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => { setMethod(option.value); setFormError(''); }}
                                                className={`flex min-h-20 items-start gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8] ${active ? 'border-[#dcb471]/60 bg-[#dcb471]/15' : 'border-[#dcb471]/15 bg-[#04191a] hover:border-[#dcb471]/35'}`}
                                            >
                                                <span className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl border ${active ? 'border-[#dcb471]/60 bg-[#dcb471]/20 text-[#ffe9b8]' : 'border-[#dcb471]/20 bg-white/[0.03] text-[#dcb471]/80'}`}>
                                                    <Icon className="size-5" aria-hidden="true" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className={`block font-serif text-base font-bold tracking-wider ${active ? 'text-[#f0ce91]' : 'text-[#fbf7ed]'}`}>{option.title}</span>
                                                    <span className="block text-[11px] text-[#fbf7ed]/55">{option.caption}</span>
                                                    {active && <span className="mt-1 block text-[11px] leading-5 text-[#fbf7ed]/45">{option.description}</span>}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {method === 'number' && (
                                    <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="报数">
                                        {[['first', '第一个数（上卦）'], ['second', '第二个数（下卦）']].map(([key, label]) => (
                                            <label key={key} className="block">
                                                <span className="text-[11px] text-[#fbf7ed]/55">{label}</span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    maxLength={4}
                                                    value={numbers[key]}
                                                    onChange={(event) => { setNumbers((current) => ({ ...current, [key]: event.target.value.replace(/\D/g, '') })); setFormError(''); }}
                                                    placeholder="1–9999"
                                                    className={`${INPUT_FIELD_CLASS} mt-1 w-full text-center tabular-nums placeholder:text-[#fbf7ed]/30`}
                                                />
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </fieldset>

                            <div className="rounded-2xl border border-[#dcb471]/15 bg-[#04191a] p-3">
                                <p className="text-xs font-bold tracking-widest text-[#dcb471]">起卦时间</p>
                                {castTimeNow ? (
                                    <p className="mt-1 text-sm leading-6 text-[#fbf7ed]/85">
                                        {castTimeNow.year}年 {castTimeNow.month}月 <strong className="text-[#f0ce91]">{castTimeNow.day}日</strong> {castTimeNow.hour}时
                                        <span className="block text-[11px] text-[#fbf7ed]/50">{castTimeNow.solarText} · {castTimeNow.lunarText} · 旬空 {castTimeNow.xunKong.join('')}</span>
                                    </p>
                                ) : (
                                    <p className="mt-1 text-sm text-[#fbf7ed]/70">按起卦完成时的时间记录</p>
                                )}
                                <PlaceSetting tone="ink" now={now} className="mt-2" lead="" />
                                <p className="mt-2 text-[11px] leading-5 text-[#fbf7ed]/45">{method === 'time' ? '时间起卦按此刻的农历年月日时取卦；' : '以六爻落定的那一刻为准；'}月建、日辰、旬空据此而定。</p>
                            </div>

                            {formError && <p role="alert" className="rounded-xl border border-[#d85a45]/45 bg-[#d85a45]/10 px-3 py-2 text-xs leading-5 text-[#ffb4a6]">{formError}</p>}

                            {/* 所在地设置自带表单，这里不用 form 包裹，避免表单嵌套 */}
                            <button type="button" onClick={handleStart} className="min-h-12 w-full rounded-xl bg-[#2d6b62] text-base font-bold tracking-wider text-white shadow-lg shadow-black/30 hover:bg-[#245a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa]">
                                {activeMethod.action}
                            </button>
                        </section>

                        <p className="text-center text-[11px] leading-5 text-[#fbf7ed]/40">起卦与装卦都在你的设备上完成；只有存入档案后才会保存在本机浏览器。</p>
                    </div>
                )}
            </main>
        </div>
    );
}
