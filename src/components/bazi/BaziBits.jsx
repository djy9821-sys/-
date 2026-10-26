/**
 * 八字页面的小部件：分节标题、时辰交界提示、神煞标签。
 */
import React from 'react';
import { TriangleAlert } from 'lucide-react';
import { SHENSHA_TONE } from '../../utils/baziShensha';
import { SHENSHA_TONE_CLASS } from './baziTheme';

export const SectionHeading = ({ seal, title, note, icon: Icon }) => (
    <div className="flex items-start gap-2.5">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-[#a33b30]/35 bg-[#a33b30]/[0.06] font-serif text-xs font-bold text-[#96372e]" aria-hidden="true">
            {seal}
        </span>
        <div>
            <h3 className="flex items-center gap-2 text-base font-bold tracking-[0.08em] text-[#28231f] sm:text-lg">
                {title}
                {Icon && <Icon className="size-4 text-[#2d6b62]" aria-hidden="true" />}
            </h3>
            {note && <p className="mt-0.5 text-[11px] leading-5 text-[#756d63] sm:text-xs">{note}</p>}
        </div>
    </div>
);

/** 时辰交界提示：出生时间稍有误差就会换成另一个时柱。 */
export const BoundaryNotice = ({ boundary, currentDayGanZhi, tone }) => {
    const { alternative } = boundary;
    const dayChanged = currentDayGanZhi && alternative.dayGanZhi !== currentDayGanZhi;
    const toneClass = tone === 'paper'
        ? 'border-[#b06a1f]/40 bg-[#b06a1f]/[0.08] text-[#7f4b12]'
        : 'border-[#dcb471]/35 bg-[#dcb471]/[0.08] text-[#f0ce91]';
    return (
        <p className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs leading-5 ${toneClass}`} role="note">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
                离时辰交界只有 {boundary.minutesToBoundary} 分钟：钟表 {boundary.boundaryClockTime} {boundary.isBeforeBoundary ? '及之后' : '之前'}出生则为{alternative.hourName}，时柱 <b className="font-serif">{alternative.timeGanZhi}</b>{dayChanged ? `，日柱 ${alternative.dayGanZhi}` : ''}。出生时间记得不准时，两个时柱都值得对照。
            </span>
        </p>
    );
};

/** 神煞标签：表格内竖排，其他地方横排。 */
export const ShenshaTags = ({ names = [], layout = 'stack', empty = '—' }) => {
    if (!names.length) return <span className="text-xs text-[#9b9185]">{empty}</span>;
    return (
        <span className={layout === 'stack' ? 'flex flex-col items-center gap-0.5' : 'flex flex-wrap gap-1'}>
            {names.map((name) => (
                <span key={name} className={`inline-block whitespace-nowrap rounded border px-1 text-[11px] leading-4 print:border-0 print:px-0 print:text-[7px] ${SHENSHA_TONE_CLASS[SHENSHA_TONE[name] ?? 'neutral']}`}>
                    {name}
                </span>
            ))}
        </span>
    );
};
