/**
 * 手动录卦：在家用真铜钱摇好了六爻，按每爻的背面数录入，交给程序装卦。
 */
import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { MANUAL_LINE_OPTIONS } from '../../utils/liuyaoCast';

const POSITION_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

export default function ManualCast({ onBack, onComplete }) {
    // 下标 0 为初爻；null 表示还没选。
    const [values, setValues] = useState(() => Array(6).fill(null));
    const filled = values.filter((value) => value !== null).length;
    const nextIndex = values.findIndex((value) => value === null);
    const complete = filled === 6;

    const choose = (index, value) => {
        setValues((current) => current.map((item, i) => (i === index ? value : item)));
    };

    return (
        <div className="relative flex flex-1 flex-col overflow-clip bg-[#020b0c] text-[#fbf7ed]">
            <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-[#dcb471]/15 bg-[#020b0c]/80 px-4 pb-3 backdrop-blur-xl" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                <button type="button" onClick={onBack} className="inline-flex size-11 items-center justify-center rounded-full border border-[#dcb471]/20 bg-white/[0.03] hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]" aria-label="返回起卦设置">
                    <ArrowLeft className="size-5 text-[#f0ce91]" aria-hidden="true" />
                </button>
                <div>
                    <h1 className="font-serif text-lg font-bold tracking-[0.16em] text-[#fbf7ed]">手动录卦</h1>
                    <p className="text-[11px] tracking-[0.2em] text-[#fbf7ed]/55">从初爻开始，录入每一爻的背面数</p>
                </div>
            </header>

            <main className="relative z-10 flex-1 px-4 pt-5" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                <div className="mx-auto max-w-md space-y-4 animate-in fade-in duration-300">
                    <p className="text-center text-sm leading-6 text-[#fbf7ed]/65">
                        三枚铜钱摇一次得一爻，先摇的是初爻（最下）。背面（无字的一面）为阳：一背少阳、两背少阴、三背老阳动、三字老阴动。
                    </p>
                    <ol className="space-y-2" aria-label="六爻录入">
                        {[...values.keys()].reverse().map((index) => {
                            const value = values[index];
                            const isNext = index === nextIndex;
                            return (
                                <li key={index} className={`rounded-2xl border p-3 transition-colors ${isNext ? 'border-[#55bba8]/50 bg-[#55bba8]/[0.08]' : 'border-[#dcb471]/15 bg-[#071719]/85'}`}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-serif text-sm font-bold tracking-wider text-[#f0ce91]">{POSITION_NAMES[index]}</span>
                                        <span className="text-[11px] text-[#fbf7ed]/50">{value === null ? (isNext ? '请选择' : '待录入') : MANUAL_LINE_OPTIONS.find((option) => option.value === value)?.note}</span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-4 gap-1.5" role="group" aria-label={`${POSITION_NAMES[index]}的爻值`}>
                                        {MANUAL_LINE_OPTIONS.map((option) => {
                                            const active = value === option.value;
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    aria-pressed={active}
                                                    onClick={() => choose(index, option.value)}
                                                    className={`min-h-14 rounded-xl border px-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8] ${active ? 'border-[#dcb471]/60 bg-[#dcb471]/15 text-[#f0ce91]' : 'border-white/10 bg-black/20 text-[#fbf7ed]/70 hover:border-[#dcb471]/35'}`}
                                                >
                                                    <span className="block font-mono text-sm leading-5" aria-hidden="true">{option.symbol}</span>
                                                    <span className="block text-xs font-bold">{option.label}</span>
                                                    <span className="block text-[10px] opacity-70">{option.coins}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                    <button
                        type="button"
                        disabled={!complete}
                        onClick={() => onComplete(values)}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2d6b62] text-base font-bold tracking-wider text-white shadow-lg shadow-black/30 hover:bg-[#245a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Check className="size-5" aria-hidden="true" />{complete ? '装卦' : `已录入 ${filled}/6 爻`}
                    </button>
                </div>
            </main>
        </div>
    );
}
