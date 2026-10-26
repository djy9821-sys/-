/**
 * 六爻结果页：本卦与变卦的装卦表（六神、六亲、纳甲、世应、动爻、变爻、伏神）、
 * 卦辞与动爻爻辞、起卦四柱，并可存入档案或整理成提示词交给 AI 分析。
 */
import React, { useMemo, useRef, useState } from 'react';
import { Bot, Copy, RotateCcw, Save, Share2 } from 'lucide-react';
import { buildLiuYaoPrompt } from '../utils/liuyao';
import { buildLiuYaoRecord, LIUYAO_METHODS } from '../utils/liuyaoRecord';
import { ARCHIVE_GROUP_OPTIONS } from '../utils/baziRecord';
import { archiveManager } from '../utils/archiveManager';
import { INPUT_FIELD_CLASS, wuxingText } from './bazi/baziTheme';

const MARK_SHORT = { 旬空: '空', 月破: '破', 日冲: '冲' };
const RELATIVE_TONE = {
    父母: 'text-[#86603b]',
    兄弟: 'text-[#315f7d]',
    子孙: 'text-[#247055]',
    妻财: 'text-[#9a7119]',
    官鬼: 'text-[#ad3f32]',
};

const YaoBar = ({ isYang, strong = true }) => (
    <span className="flex h-3 w-full items-center justify-between" aria-hidden="true">
        {isYang ? (
            <span className={`h-2.5 w-full rounded-[2px] ${strong ? 'bg-[#302a25]' : 'bg-[#302a25]/55'}`} />
        ) : (
            <>
                <span className={`h-2.5 w-[42%] rounded-[2px] ${strong ? 'bg-[#302a25]' : 'bg-[#302a25]/55'}`} />
                <span className={`h-2.5 w-[42%] rounded-[2px] ${strong ? 'bg-[#302a25]' : 'bg-[#302a25]/55'}`} />
            </>
        )}
    </span>
);

const HexagramFigure = ({ bits, movingPositions = [] }) => (
    <span className="flex w-9 flex-col-reverse gap-[3px]" aria-hidden="true">
        {bits.map((bit, index) => (
            <span key={index} className={`flex h-1.5 items-center justify-between ${movingPositions.includes(index + 1) ? 'opacity-100' : 'opacity-70'}`}>
                {bit ? <span className="h-full w-full rounded-[1px] bg-current" /> : (
                    <>
                        <span className="h-full w-[42%] rounded-[1px] bg-current" />
                        <span className="h-full w-[42%] rounded-[1px] bg-current" />
                    </>
                )}
            </span>
        ))}
    </span>
);

const hexagramCaption = (hexagram) => `${hexagram.upper}${hexagram.upperSymbol}上 · ${hexagram.lower}${hexagram.lowerSymbol}下`;

const PaperCard = ({ title, note, children, className = '' }) => (
    <section className={`rounded-[22px] border border-[#8f816d]/60 bg-[#f2eadc] p-4 text-[#302a25] shadow-xl shadow-black/30 sm:p-5 ${className}`}>
        {title && (
            <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="font-serif text-base font-bold tracking-[0.12em] text-[#3b342e]">{title}</h2>
                {note && <p className="text-[11px] text-[#81776b]">{note}</p>}
            </header>
        )}
        {children}
    </section>
);

/**
 * @param reading buildLiuYaoReading 的结果
 * @param {Date} castDate 起卦时间（真太阳时墙上时间）
 * @param archiveRecord 从档案打开时的原记录；为空表示刚起的卦
 * @param placeLabel 起卦时按哪里的真太阳时（设备时间时为空）
 */
export default function LiuYaoResult({ reading, castDate, archiveRecord = null, placeLabel = '', onRestart }) {
    const { hexagram, changed, mutual, lines, hidden, time } = reading;
    const [savePanelOpen, setSavePanelOpen] = useState(false);
    const [saveName, setSaveName] = useState(reading.question || `${hexagram.name}卦`);
    const [saveGroup, setSaveGroup] = useState('self');
    const [saveNote, setSaveNote] = useState('');
    const [saveNotice, setSaveNotice] = useState(null);
    const [savedRecord, setSavedRecord] = useState(null);
    const [copyStatus, setCopyStatus] = useState(null);
    const textareaRef = useRef(null);
    const detailsRef = useRef(null);
    const prompt = useMemo(() => buildLiuYaoPrompt(reading), [reading]);
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const hasChange = Boolean(changed);
    const descending = [...lines].reverse();

    const saveToArchive = (event) => {
        event.preventDefault();
        const record = archiveManager.addRecord(buildLiuYaoRecord(reading, castDate, { name: saveName, group: saveGroup, note: saveNote }));
        if (!record) {
            setSaveNotice({ type: 'error', message: '保存失败，请检查浏览器存储空间后重试。' });
            return;
        }
        setSavedRecord(record);
        setSavePanelOpen(false);
        setSaveNotice({ type: 'success', message: `已存入档案「${record.name}」，可在命盘档案里再次打开。` });
    };

    const selectAllText = () => {
        if (detailsRef.current) detailsRef.current.open = true;
        window.requestAnimationFrame(() => {
            textareaRef.current?.focus();
            textareaRef.current?.select();
        });
    };

    const copyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopyStatus({ type: 'success', text: `已复制卦例提示词（${prompt.length} 字），打开 ChatGPT、Claude 等 AI 粘贴即可。` });
        } catch {
            selectAllText();
            setCopyStatus({ type: 'info', text: '浏览器不允许自动复制，已为你选中全文：手机长按选择“复制”，电脑按 Ctrl/⌘ + C。' });
        }
    };

    const sharePrompt = async () => {
        try {
            await navigator.share({ title: '六爻卦例提示词', text: prompt });
        } catch (error) {
            if (error?.name !== 'AbortError') setCopyStatus({ type: 'info', text: '分享没有成功，可以改用“复制提示词”。' });
        }
    };

    const archiveSaved = archiveRecord || savedRecord;

    return (
        <div className="mx-auto max-w-2xl space-y-4 animate-in fade-in duration-300">
            <header className="space-y-2 py-1 text-center">
                <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.28em] text-[#dcb471]/80"><span className="h-px w-8 bg-[#dcb471]/35" />卦成<span className="h-px w-8 bg-[#dcb471]/35" /></div>
                <h2 className="font-serif text-3xl font-bold tracking-[0.14em] text-[#fbf7ed]">
                    {hexagram.name}
                    {hasChange && <span className="text-[#fbf7ed]/55"> → {changed.name}</span>}
                </h2>
                <p className="text-sm leading-6 text-[#fbf7ed]/65">
                    {reading.question ? `问：${reading.question}` : '未写明所问之事'}
                </p>
                <p className="text-[11px] leading-5 text-[#fbf7ed]/45">
                    {time.solarText}（{time.lunarText}）· {LIUYAO_METHODS[reading.method] ?? LIUYAO_METHODS.coins}
                    {placeLabel ? ` · 按${placeLabel}真太阳时` : ''}
                    {archiveRecord ? ' · 来自档案' : ''}
                </p>
            </header>

            <PaperCard>
                <div className={`grid gap-3 ${hasChange ? 'sm:grid-cols-2' : ''}`}>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 p-3">
                        <span className="text-[#302a25]"><HexagramFigure bits={hexagram.bits} movingPositions={reading.movingPositions} /></span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold tracking-widest text-[#81776b]">本卦</p>
                            <p className="font-serif text-xl font-bold text-[#3b342e]">{hexagram.name}</p>
                            <p className="text-[11px] leading-5 text-[#6f665d]">{hexagramCaption(hexagram)} · {hexagram.palace}宫{hexagram.palaceLabel}（属{hexagram.palaceElement}）</p>
                            <p className="text-[11px] leading-5 text-[#6f665d]">世在{lines[hexagram.shi - 1].positionName} · 应在{lines[hexagram.ying - 1].positionName}{reading.movingPositions.length ? ` · ${reading.movingPositions.length} 个动爻` : ' · 六爻安静'}</p>
                        </div>
                    </div>
                    {hasChange && (
                        <div className="flex items-center gap-3 rounded-2xl border border-[#a33b30]/25 bg-[#a33b30]/[0.05] p-3">
                            <span className="text-[#8f3027]"><HexagramFigure bits={changed.bits} /></span>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold tracking-widest text-[#8f3027]/80">变卦</p>
                                <p className="font-serif text-xl font-bold text-[#3b342e]">{changed.name}</p>
                                <p className="text-[11px] leading-5 text-[#6f665d]">{hexagramCaption(changed)}</p>
                                <p className="text-[11px] leading-5 text-[#6f665d]">互卦 {mutual.name}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[21rem] border-separate border-spacing-y-1 text-[11px] sm:text-xs" aria-label="装卦表">
                        <thead>
                            <tr className="text-left text-[10px] font-bold tracking-widest text-[#81776b]">
                                <th scope="col" className="pb-1 pr-2 font-bold">六神</th>
                                <th scope="col" className="pb-1 pr-2 font-bold" colSpan={2}>本卦 {hexagram.name}</th>
                                <th scope="col" className="pb-1 pr-1 font-bold"><span className="sr-only">爻象</span></th>
                                <th scope="col" className="pb-1 pr-1 font-bold"><span className="sr-only">动爻与世应</span></th>
                                {hasChange && <th scope="col" className="pb-1 pl-2 font-bold" colSpan={2}>变卦 {changed.name}</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {descending.map((line) => (
                                <tr key={line.position} className={line.isMoving ? 'bg-[#a33b30]/[0.05]' : ''}>
                                    <td className="whitespace-nowrap rounded-l-lg py-1 pl-1 pr-2 text-[#6f665d]">{line.god}</td>
                                    <td className={`whitespace-nowrap py-1 pr-1 font-bold ${RELATIVE_TONE[line.relative]}`}>{line.relative}</td>
                                    <td className="whitespace-nowrap py-1 pr-2 tabular-nums">
                                        <span className="font-bold text-[#3b342e]">{line.ganZhi}</span>
                                        <span className={`ml-0.5 ${wuxingText(line.element)}`}>{line.element}</span>
                                        {line.marks.map((mark) => (
                                            <sup key={mark} className="ml-0.5 text-[9px] font-bold text-[#a33b30]" title={mark}>{MARK_SHORT[mark] ?? mark}</sup>
                                        ))}
                                    </td>
                                    <td className="w-[22%] min-w-[3.5rem] py-1 pr-1 align-middle">
                                        <YaoBar isYang={line.isYang} />
                                    </td>
                                    <td className={`whitespace-nowrap py-1 pr-1 font-bold ${hasChange ? '' : 'rounded-r-lg'}`}>
                                        <span className="inline-block w-3 text-center text-[#a33b30]" aria-label={line.isMoving ? `${line.positionName}${line.name}，动爻` : undefined}>{line.isMoving ? (line.isYang ? '○' : '×') : ''}</span>
                                        <span className="ml-1 inline-block w-3 text-center text-[#2d6b62]">{line.isShi ? '世' : line.isYing ? '应' : ''}</span>
                                    </td>
                                    {hasChange && (
                                        <>
                                            <td className="whitespace-nowrap py-1 pl-2 pr-1 tabular-nums">
                                                {line.changed ? (
                                                    <>
                                                        <span className={`font-bold ${RELATIVE_TONE[line.changed.relative]}`}>{line.changed.relative}</span>
                                                        <span className="ml-1 font-bold text-[#3b342e]">{line.changed.ganZhi}</span>
                                                        <span className={`ml-0.5 ${wuxingText(line.changed.element)}`}>{line.changed.element}</span>
                                                    </>
                                                ) : <span className="text-[#b2a896]">—</span>}
                                            </td>
                                            <td className="w-[16%] min-w-[2.5rem] rounded-r-lg py-1 pr-1 align-middle">
                                                <YaoBar isYang={line.changed ? line.changed.isYang : line.isYang} strong={Boolean(line.changed)} />
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[#81776b]">
                    ○ 老阳动、× 老阴动；世、应为世爻与应爻；上标 空＝旬空、破＝月破、冲＝日冲。变爻六亲按本卦卦宫论。
                </p>
                <p className="mt-1 text-xs leading-6 text-[#5f574f]">
                    <span className="font-bold text-[#3b342e]">伏神：</span>
                    {hidden.length
                        ? hidden.map((item) => `${item.relative}${item.ganZhi}（${item.element}）伏于${item.positionName}${lines[item.position - 1].relative}${lines[item.position - 1].ganZhi}之下`).join('；')
                        : '六亲齐全，无伏神。'}
                </p>
            </PaperCard>

            <PaperCard title="起卦时间" note="月建、日辰与旬空据此而定">
                <div className="grid grid-cols-4 gap-1.5 text-center">
                    {[['年', time.year], ['月', time.month], ['日', time.day], ['时', time.hour]].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 py-2">
                            <p className="text-[10px] text-[#81776b]">{label}</p>
                            <p className="font-serif text-base font-bold tracking-wider text-[#3b342e]">{value}</p>
                        </div>
                    ))}
                </div>
                <p className="mt-2.5 text-xs leading-6 text-[#5f574f]">
                    旬空 <strong className="text-[#3b342e]">{time.xunKong.join('')}</strong> · 月建 <strong className="text-[#3b342e]">{time.monthZhi}</strong> · 日辰 <strong className="text-[#3b342e]">{time.dayZhi}</strong>
                    <span className="block text-[11px] text-[#81776b]">{time.solarText} · {time.lunarText}{placeLabel ? ` · 按${placeLabel}真太阳时记时` : ' · 按设备时间记时'}</span>
                </p>
            </PaperCard>

            <PaperCard title="卦辞与爻辞" note={reading.movingPositions.length ? '动爻爻辞为断卦重点' : '静卦以本卦卦辞为主'}>
                <div className="space-y-3 text-sm leading-7 text-[#3b342e]">
                    <p><span className="mr-1 rounded border border-[#2d6b62]/35 bg-[#2d6b62]/[0.07] px-1.5 py-0.5 text-[11px] font-bold text-[#245a52]">本卦 · {hexagram.name}</span>{hexagram.desc}</p>
                    {hasChange && (
                        <p><span className="mr-1 rounded border border-[#a33b30]/35 bg-[#a33b30]/[0.07] px-1.5 py-0.5 text-[11px] font-bold text-[#8f3027]">变卦 · {changed.name}</span>{changed.desc}</p>
                    )}
                    {lines.filter((line) => line.yaoCi).map((line) => (
                        <p key={line.position} className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 px-3 py-2">
                            <strong className="mr-2 text-[#8f3027]">{line.yaoCi.title}</strong>{line.yaoCi.text}
                            <span className="block text-[11px] leading-5 text-[#81776b]">{line.positionName} · {line.god} {line.relative}{line.ganZhi} → 变{line.changed.relative}{line.changed.ganZhi}</span>
                        </p>
                    ))}
                    {reading.useExtra && (
                        <p className="rounded-xl border border-[#9a7119]/35 bg-[#9a7119]/[0.07] px-3 py-2 text-[#6f5313]"><strong className="mr-2">六爻皆动</strong>{reading.useExtra}</p>
                    )}
                    {!reading.movingPositions.length && <p className="text-xs leading-6 text-[#81776b]">没有动爻，一般以本卦卦辞与世爻、用神的旺衰断事。</p>}
                </div>
            </PaperCard>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button type="button" onClick={onRestart} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#dcb471]/40 px-2 text-sm font-bold text-[#f0ce91] hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]"><RotateCcw className="size-4" aria-hidden="true" />再卜一卦</button>
                <button
                    type="button"
                    onClick={() => { setSavePanelOpen((open) => !open); setSaveNotice(null); }}
                    disabled={Boolean(archiveSaved)}
                    aria-expanded={savePanelOpen}
                    aria-controls="liuyao-save-panel"
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#dcb471]/40 px-2 text-sm font-bold text-[#f0ce91] hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8] disabled:cursor-default disabled:opacity-55"
                >
                    <Save className="size-4" aria-hidden="true" />{archiveSaved ? '已在档案' : '存入档案'}
                </button>
                <button type="button" onClick={copyPrompt} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#2d6b62] px-2 text-sm font-bold text-white hover:bg-[#245a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa]"><Bot className="size-4" aria-hidden="true" />复制给 AI</button>
            </div>

            {savePanelOpen && !archiveSaved && (
                <form id="liuyao-save-panel" onSubmit={saveToArchive} className="space-y-3 rounded-2xl border border-[#dcb471]/20 bg-[#071719]/90 p-4">
                    <p className="font-serif text-base font-bold tracking-wider text-[#fbf7ed]">存入档案 · {hexagram.name}{hasChange ? ` → ${changed.name}` : ''}</p>
                    <label className="block">
                        <span className="text-xs font-bold text-[#dcb471]">卦例名称</span>
                        <input type="text" value={saveName} maxLength={30} onChange={(event) => setSaveName(event.target.value)} placeholder="例如：问换工作" className={`${INPUT_FIELD_CLASS} mt-1 w-full placeholder:text-[#fbf7ed]/30`} />
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
                        <input type="text" value={saveNote} maxLength={60} onChange={(event) => setSaveNote(event.target.value)} placeholder="例如：事后应验情况" className={`${INPUT_FIELD_CLASS} mt-1 w-full placeholder:text-[#fbf7ed]/30`} />
                    </label>
                    <button type="submit" className="min-h-11 w-full rounded-xl bg-[#2d6b62] text-sm font-bold text-white hover:bg-[#245a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa]">保存</button>
                </form>
            )}
            {saveNotice && (
                <p role={saveNotice.type === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-3 py-2 text-xs leading-5 ${saveNotice.type === 'error' ? 'border-[#d85a45]/45 bg-[#d85a45]/10 text-[#ffb4a6]' : 'border-[#55bba8]/40 bg-[#55bba8]/10 text-[#9fe0d2]'}`}>{saveNotice.message}</p>
            )}

            <PaperCard title="导出给 AI" note="复制后粘贴给 ChatGPT、Claude 等 AI 断卦">
                <div className={`grid gap-2 ${canShare ? 'grid-cols-[1fr_auto]' : 'grid-cols-1'}`}>
                    <button type="button" onClick={copyPrompt} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#2d6b62] px-4 text-base font-bold text-white shadow-sm hover:bg-[#245a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa]">
                        <Copy className="size-5" aria-hidden="true" />复制卦例提示词
                    </button>
                    {canShare && (
                        <button type="button" onClick={sharePrompt} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-[#2d6b62]/60 px-4 text-sm font-bold text-[#2d6b62] hover:bg-[#2d6b62]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                            <Share2 className="size-4" aria-hidden="true" />分享
                        </button>
                    )}
                </div>
                {copyStatus && (
                    <p role="status" className={`mt-2 rounded-lg border px-3 py-2 text-xs leading-5 ${copyStatus.type === 'success' ? 'border-[#2d6b62]/35 bg-[#2d6b62]/[0.07] text-[#245a52]' : 'border-[#b06a1f]/35 bg-[#b06a1f]/[0.07] text-[#7f4b12]'}`}>{copyStatus.text}</p>
                )}
                <details ref={detailsRef} className="mt-3 overflow-hidden rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/55">
                    <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 text-sm font-bold text-[#514941] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2d6b62]">
                        查看提示词全文 <span className="text-xs font-normal text-[#81776b]">{prompt.length} 字</span>
                    </summary>
                    <textarea ref={textareaRef} readOnly value={prompt} rows={14} aria-label="提示词全文" className="block w-full resize-y border-t border-[#cbbfac]/70 bg-[#fffdf8] px-3 py-2 font-mono text-xs leading-5 text-[#3b342e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2d6b62]" />
                </details>
                <p className="mt-2 text-[11px] leading-5 text-[#81776b]">提示词里已有装卦结果与四柱，AI 不必重新装卦；末尾留有「我的问题」，可以接着补充细节。卦例只保存在你的设备上。</p>
            </PaperCard>

            <p className="pb-2 text-center text-[11px] leading-5 text-[#fbf7ed]/40">占卜结果仅供参考，重要决定请结合实际情况判断。</p>
        </div>
    );
}
