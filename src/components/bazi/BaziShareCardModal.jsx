/**
 * 八字分享图弹层：显示生成好的命盘图片，手机上长按保存；也可直接分享或下载。
 * 图片由 utils/baziShareCard 在父组件里画好后传入（dataUrl + canvas）。
 */
import React, { useEffect, useRef, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { isNativeShell } from '../../utils/nativeShell';

const toBlob = (canvas) => new Promise((resolve, reject) => {
    try {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('生成图片失败'))), 'image/png');
    } catch (error) {
        reject(error);
    }
});

const fileNameOf = (name) => `八字命盘-${(name || '命主').replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 20) || '命主'}.png`;

export default function BaziShareCardModal({ card, personName = '', onClose, onTrack = () => {} }) {
    const closeRef = useRef(null);
    const [notice, setNotice] = useState('');
    const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function';

    useEffect(() => {
        if (!card) return undefined;
        const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
        const handleKey = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        return () => {
            window.cancelAnimationFrame(frame);
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = overflow;
        };
    }, [card, onClose]);

    if (!card) return null;

    const fileName = fileNameOf(personName);

    const download = () => {
        const anchor = document.createElement('a');
        anchor.href = card.dataUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setNotice(isNativeShell() ? '已打开系统分享面板：可存到相册、文件，或直接发给别人。' : '已开始下载，图片在浏览器的下载列表里。');
        onTrack('download');
    };

    const share = async () => {
        try {
            const blob = await toBlob(card.canvas);
            const file = new File([blob], fileName, { type: 'image/png' });
            if (!navigator.canShare({ files: [file] })) {
                setNotice('这台设备不支持分享图片文件，请长按图片保存或点下载。');
                return;
            }
            await navigator.share({ files: [file], title: `${personName.trim() || '命主'}的八字命盘 · 古书派` });
            onTrack('share');
        } catch (error) {
            if (error?.name === 'AbortError') return;
            setNotice('分享没有成功，请长按图片保存或点下载。');
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center print:hidden" role="dialog" aria-modal="true" aria-labelledby="bazi-share-card-title">
            <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} aria-label="关闭分享图" tabIndex={-1} />
            <div className="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#dcb471]/25 bg-[#071719] shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                    <div>
                        <p id="bazi-share-card-title" className="font-serif text-base font-bold tracking-wider text-[#fbf7ed]">命盘分享图</p>
                        <p className="text-[11px] text-[#fbf7ed]/55">{isNativeShell() ? '点下方按钮保存或发送' : '手机上长按图片即可保存或发送'}</p>
                    </div>
                    <button ref={closeRef} type="button" onClick={onClose} className="inline-flex size-10 items-center justify-center rounded-full text-[#fbf7ed]/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]" aria-label="关闭分享图">
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto bg-black/40 p-3">
                    <img src={card.dataUrl} alt={`${personName.trim() || '命主'}的八字命盘分享图：四柱、日主旺衰、格局与当前运限`} className="mx-auto block w-full max-w-[22rem] rounded-xl border border-[#dcb471]/25 shadow-xl" data-testid="bazi-share-card-image" />
                </div>
                <div className="space-y-2 border-t border-white/10 px-4 py-3">
                    <div className="grid grid-cols-2 gap-2">
                        {canShareFiles && (
                            <button type="button" onClick={share} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#2d6b62] px-3 text-sm font-bold text-white hover:bg-[#245a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa]">
                                <Share2 className="size-4" aria-hidden="true" />分享图片
                            </button>
                        )}
                        <button type="button" onClick={download} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#dcb471]/40 px-3 text-sm font-bold text-[#f0ce91] hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8] ${canShareFiles ? '' : 'col-span-2'}`}>
                            <Download className="size-4" aria-hidden="true" />下载图片
                        </button>
                    </div>
                    {notice && <p role="status" className="text-xs leading-5 text-[#9fe0d2]">{notice}</p>}
                    <p className="text-[11px] leading-5 text-[#fbf7ed]/45">图片只含生辰与命盘，没有档案备注；旺衰、格局为程序估算。</p>
                </div>
            </div>
        </div>
    );
}
