/**
 * 九星气学：十二神兽、十二年运势、吉方位、相性、守护本尊。
 * 页面主体是一段不依赖 React 的视图代码（jiuxingView.js），这里只管页头和挂载。
 */
import React, { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { archiveManager } from '../../utils/archiveManager';
import { profilesFromArchive } from '../../utils/jiuxing/archiveProfiles.js';
import { mountJiuxing } from './jiuxingView.js';
import './jiuxing.css';

export default function JiuxingQixue({ onBack }) {
    const rootRef = useRef(null);

    useEffect(() => {
        // 姓名和生日不写进本机（生辰只有主动存档才保存）；已经存进档案的人可以直接选。
        const view = mountJiuxing(rootRef.current, { remember: false, profiles: profilesFromArchive(archiveManager.getRecords()) });
        return () => view.destroy();
    }, []);

    return (
        <div className="mx-auto w-full max-w-3xl px-4 pb-10">
            <header className="flex items-center gap-3 py-3">
                <button type="button" onClick={onBack} className="inline-flex size-11 items-center justify-center rounded-full border border-[#dcb471]/20 bg-white/[0.03] text-[#fbf7ed] hover:bg-[#dcb471]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8]" aria-label="返回首页">
                    <ArrowLeft className="size-5" aria-hidden="true" />
                </button>
                <div>
                    <h2 className="font-serif text-xl font-bold tracking-[0.12em] text-[#fbf7ed]">九星气学</h2>
                    <p className="text-xs text-[#fbf7ed]/55">十二神兽 · 十二年运势 · 吉方位 · 相性</p>
                </div>
            </header>
            <div ref={rootRef} className="jx" />
        </div>
    );
}
