/**
 * 藏经阁：把批命所依据的古籍摆上书架，原文与白话逐句对照。
 * 页面主体是一段不依赖 React 的视图代码（cangjingView.js），这里只管页头和挂载。
 */
import React, { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { catalog, loadEntries } from './cangjingData.js';
import { mountCangjing } from './cangjingView.js';
import './cangjing.css';

/**
 * @param {{ onBack: () => void, initialQuery?: string }} props
 *   initialQuery：打开时要翻到的地方（e=条目 id，或 b=书&c=第几篇），空着就是书架；只在挂载时读一次。
 */
export default function CangjingGe({ onBack, initialQuery = '' }) {
    const rootRef = useRef(null);
    const initialQueryRef = useRef(initialQuery);

    useEffect(() => {
        const view = mountCangjing(rootRef.current, { catalog, loadEntries, initialQuery: initialQueryRef.current });
        return () => view.destroy();
    }, []);

    return (
        <div className="mx-auto w-full max-w-3xl px-4 pb-10">
            <header className="flex items-center gap-3 py-3">
                <button type="button" onClick={onBack} className="inline-flex size-11 items-center justify-center rounded-full border border-[#dcb471]/20 bg-white/[0.03] text-[#fbf7ed] hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]" aria-label="返回首页">
                    <ArrowLeft className="size-5" aria-hidden="true" />
                </button>
                <div>
                    <h2 className="font-serif text-xl font-bold tracking-[0.12em] text-[#fbf7ed]">藏经阁</h2>
                    <p className="text-xs text-[#fbf7ed]/55">批命所据的古籍 · 原文与白话逐句对照</p>
                </div>
            </header>
            <div ref={rootRef} className="cjg" />
        </div>
    );
}
