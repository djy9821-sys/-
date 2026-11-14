/**
 * 批命页上「在藏经阁里翻到这一条」：在当前页面上面盖一层藏经阁，展开到那一条所在的那一篇。
 * 合上（或按手机返回键）就回到刚才的地方，命盘和滚动位置都不动。
 * 里面就是整座藏经阁（同一份 cangjingView.js），可以接着翻目录、回书架，只是不改地址、不记历史。
 */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { shelfQueryOf } from '../../data/classics/shelf.js';
import { catalog, loadEntries } from './cangjingData.js';
import { mountCangjing } from './cangjingView.js';
import './cangjing.css';

/** 合上：打开时记过一步历史的就退掉那一步（退回来时再真正合上），否则直接合上。 */
const closeReader = (closeNow) => {
    if (window.history.state?.cangjingReader) window.history.back();
    else closeNow();
};

/**
 * @param {{ entryId: string, onClose: () => void }} props entryId：要翻到的条目 id
 */
export default function CangjingReader({ entryId, onClose }) {
    const rootRef = useRef(null);
    const scrollerRef = useRef(null);
    const closeRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const view = mountCangjing(rootRef.current, {
            catalog, loadEntries, initialQuery: shelfQueryOf({ entry: entryId }), history: false, scroller: scrollerRef.current,
        });
        return () => view.destroy();
    }, [entryId]);

    useEffect(() => {
        const opener = document.activeElement;
        const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
        // 记一步历史，手机返回键就是「合上这一层」，不会把命盘页也退掉。
        // 放进定时器里：开发模式下组件会挂载两次，这样也只记一步。
        const timer = window.setTimeout(() => {
            const state = window.history.state ?? {};
            window.history.pushState({ ...state, gushupaiDepth: (state.gushupaiDepth ?? 0) + 1, cangjingReader: true }, '');
        }, 0);
        const handlePopState = () => onCloseRef.current();
        const handleKey = (event) => {
            if (event.key === 'Escape') closeReader(() => onCloseRef.current());
        };
        window.addEventListener('popstate', handlePopState);
        document.addEventListener('keydown', handleKey);
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        return () => {
            window.cancelAnimationFrame(frame);
            window.clearTimeout(timer);
            window.removeEventListener('popstate', handlePopState);
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = overflow;
            if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
        };
    }, []);

    return createPortal(
        <div ref={scrollerRef} className="cjg-reader fixed inset-0 z-[130] overflow-y-auto overscroll-contain print:hidden" role="dialog" aria-modal="true" aria-labelledby="cangjing-reader-title" data-testid="cangjing-reader">
            <div className="mx-auto w-full max-w-3xl px-4 pb-10">
                <header className="flex items-center gap-3 py-3">
                    <button ref={closeRef} type="button" onClick={() => closeReader(onClose)} className="inline-flex size-11 items-center justify-center rounded-full border border-[#dcb471]/20 bg-white/[0.03] text-[#fbf7ed] hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]" aria-label="合上藏经阁，回到刚才的页面">
                        <X className="size-5" aria-hidden="true" />
                    </button>
                    <div>
                        <h2 id="cangjing-reader-title" className="font-serif text-xl font-bold tracking-[0.12em] text-[#fbf7ed]">藏经阁</h2>
                        <p className="text-xs text-[#fbf7ed]/55">合上就回到刚才的页面</p>
                    </div>
                </header>
                <div ref={rootRef} className="cjg" />
            </div>
        </div>,
        document.body,
    );
}
