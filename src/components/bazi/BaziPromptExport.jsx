/**
 * 导出给 AI：把当前命盘与所选运限整理成提示词，一键复制或分享。
 */
import React, { useMemo, useRef, useState } from 'react';
import { Copy, LocateFixed, Share2, Sun } from 'lucide-react';
import { buildBaziPrompt, PROMPT_CLASSICS_LIMIT, PROMPT_SCOPES } from '../../utils/baziPrompt';
import { track } from '../../utils/analytics';

const describeTarget = (scope, { daYun, liuNian, liuYue, liuRi, liuShi }) => {
    if (scope === 'natal') return '本命原局（不含运限）';
    if (scope === 'year') return liuNian ? `${liuNian.year} ${liuNian.ganZhi}流年${daYun ? ` · ${daYun.ganZhi}大运` : ''}` : '尚未选择流年';
    if (scope === 'month') return liuYue ? `${liuYue.ganZhi}月（${liuYue.jieName} ${liuYue.label} 起）· ${liuNian?.year ?? ''}${liuNian?.ganZhi ?? ''}流年` : '尚未选择流月';
    if (scope === 'day') return liuRi ? `${liuRi.date} ${liuRi.weekdayLabel} · ${liuRi.ganZhi}日` : '尚未选择流日';
    return liuRi && liuShi ? `${liuRi.date} ${liuShi.hourName}（${liuShi.range}）· ${liuShi.ganZhi}时` : '尚未选择流时';
};

export default function BaziPromptExport({ chart, personName, selections, defaultScope, now, classics = null, onLocateNow, onPickTime }) {
    const [scopeChoice, setScopeChoice] = useState(null);
    const [status, setStatus] = useState(null);
    const textareaRef = useRef(null);
    const detailsRef = useRef(null);
    const scope = scopeChoice ?? defaultScope;
    const scopeLabel = PROMPT_SCOPES.find((item) => item.value === scope)?.label ?? '';
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    const prompt = useMemo(
        () => buildBaziPrompt({ chart, scope, personName, selections, now, classics }),
        [chart, scope, personName, selections, now, classics],
    );

    const chooseScope = (value) => {
        setScopeChoice(value);
        setStatus(null);
    };

    const locateNow = (value) => {
        onLocateNow();
        setScopeChoice(value);
        setStatus(null);
    };

    const selectAllText = () => {
        if (detailsRef.current) detailsRef.current.open = true;
        window.requestAnimationFrame(() => {
            textareaRef.current?.focus();
            textareaRef.current?.select();
        });
    };

    const copyPrompt = async () => {
        track('ai_export', { kind: 'bazi', scope, channel: 'copy' });
        try {
            await navigator.clipboard.writeText(prompt);
            setStatus({ type: 'success', text: `已复制${scopeLabel}提示词（${prompt.length} 字），打开 ChatGPT、Claude 等 AI 粘贴即可。` });
        } catch {
            selectAllText();
            setStatus({ type: 'info', text: '浏览器不允许自动复制，已为你选中全文：手机长按选择“复制”，电脑按 Ctrl/⌘ + C。' });
        }
    };

    const sharePrompt = async () => {
        track('ai_export', { kind: 'bazi', scope, channel: 'share' });
        try {
            await navigator.share({ title: '八字排盘提示词', text: prompt });
        } catch (error) {
            if (error?.name !== 'AbortError') {
                setStatus({ type: 'info', text: '分享没有成功，可以改用“复制提示词”。' });
            }
        }
    };

    return (
        <div className="mt-4 space-y-3">
            <div className="grid grid-cols-5 rounded-lg border border-[#b9ad98] bg-[#f7f0e5] p-0.5" role="group" aria-label="导出范围">
                {PROMPT_SCOPES.map((option) => (
                    <button key={option.value} type="button" aria-pressed={scope === option.value} onClick={() => chooseScope(option.value)} className={`min-h-11 rounded-md px-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] sm:text-sm ${scope === option.value ? 'bg-[#2d6b62] text-white' : 'text-[#6f665d]'}`}>
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 p-3">
                <p className="text-[11px] text-[#81776b]">将导出</p>
                <p className="mt-0.5 text-sm font-bold text-[#3b342e]">{describeTarget(scope, selections)}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                    {scope !== 'natal' && (
                        <button type="button" onClick={onPickTime} className="inline-flex min-h-11 items-center rounded-lg border border-[#9f917c] bg-[#fffaf0]/70 px-3 text-xs font-bold text-[#5f574f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">改选时间 ↑</button>
                    )}
                    <button type="button" onClick={() => locateNow('day')} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#9f917c] bg-[#fffaf0]/70 px-3 text-xs font-bold text-[#5f574f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                        <Sun className="size-4" aria-hidden="true" />今天
                    </button>
                    <button type="button" onClick={() => locateNow('hour')} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#9f917c] bg-[#fffaf0]/70 px-3 text-xs font-bold text-[#5f574f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                        <LocateFixed className="size-4" aria-hidden="true" />此刻
                    </button>
                </div>
            </div>

            <div className={`grid gap-2 ${canShare ? 'grid-cols-[1fr_auto]' : 'grid-cols-1'}`}>
                <button type="button" onClick={copyPrompt} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#2d6b62] px-4 text-base font-bold text-white shadow-sm hover:bg-[#245a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa]">
                    <Copy className="size-5" aria-hidden="true" />复制{scopeLabel}提示词
                </button>
                {canShare && (
                    <button type="button" onClick={sharePrompt} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-[#2d6b62]/60 px-4 text-sm font-bold text-[#2d6b62] hover:bg-[#2d6b62]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                        <Share2 className="size-4" aria-hidden="true" />分享
                    </button>
                )}
            </div>
            {status && (
                <p role="status" className={`rounded-lg border px-3 py-2 text-xs leading-5 ${status.type === 'success' ? 'border-[#2d6b62]/35 bg-[#2d6b62]/[0.07] text-[#245a52]' : 'border-[#b06a1f]/35 bg-[#b06a1f]/[0.07] text-[#7f4b12]'}`}>{status.text}</p>
            )}

            <details ref={detailsRef} className="overflow-hidden rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/55">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 text-sm font-bold text-[#514941] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2d6b62]">
                    查看提示词全文 <span className="text-xs font-normal text-[#81776b]">{prompt.length} 字</span>
                </summary>
                <textarea ref={textareaRef} readOnly value={prompt} rows={14} aria-label="提示词全文" className="block w-full resize-y border-t border-[#cbbfac]/70 bg-[#fffdf8] px-3 py-2 font-mono text-xs leading-5 text-[#3b342e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2d6b62]" />
            </details>
            <p className="text-[11px] leading-5 text-[#81776b]">
                提示词末尾留有「我的问题」，粘贴后可以接着写你想问的具体事情。
                {classics?.length ? `已附上与本命相关的古籍原文 ${Math.min(classics.length, PROMPT_CLASSICS_LIMIT)} 条，让 AI 按原书本义分析。` : ''}
                排盘数据只在你的设备上生成，不会上传。
            </p>
        </div>
    );
}
