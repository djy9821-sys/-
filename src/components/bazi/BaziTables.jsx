/**
 * 八字命盘表格：基本命盘四柱表、专业运限对照表。
 */
import React from 'react';
import { ShenshaTags } from './BaziBits';
import { COLUMN_TONES, GAN_WUXING, ZHI_WUXING, wuxingText } from './baziTheme';

const PillarCell = ({ pillar, children, className = '' }) => (
    <td className={`border-b border-l border-[#cabfac]/70 px-1 py-2 text-center align-middle ${pillar.key === 'day' ? 'bg-[#a33b30]/[0.045]' : ''} ${className}`}>
        {children}
    </td>
);

export const PillarTable = ({ pillars }) => (
    <div className="mt-4 overflow-hidden rounded-xl border border-[#b9ad98]/80 bg-[#fffaf0]/75">
        <table className="w-full table-fixed border-collapse" aria-label="四柱八字专业命盘">
            <colgroup>
                <col className="w-10 sm:w-16" />
                {pillars.map((pillar) => <col key={pillar.key} />)}
            </colgroup>
            <thead>
                <tr>
                    <th className="border-b border-[#b9ad98]/80 bg-[#e9dfcd]/65 px-1 py-2 text-[11px] font-medium text-[#81776b] sm:text-xs">四柱</th>
                    {pillars.map((pillar) => (
                        <th key={pillar.key} scope="col" className={`relative border-b border-l border-[#b9ad98]/80 px-1 py-2 text-xs font-bold tracking-[0.08em] sm:text-sm ${pillar.key === 'day' ? 'bg-[#a33b30]/[0.065] text-[#96372e]' : 'bg-[#e9dfcd]/45 text-[#514941]'}`}>
                            {pillar.key === 'day' && <span className="absolute inset-x-0 top-0 h-0.5 bg-[#a33b30]" aria-hidden="true" />}
                            {pillar.name}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th scope="row" className="border-b border-[#cabfac]/70 bg-[#e9dfcd]/45 px-1 py-2 text-[11px] font-medium text-[#756d63] sm:text-xs">主星</th>
                    {pillars.map((pillar) => (
                        <PillarCell key={pillar.key} pillar={pillar}>
                            <span className={`text-[11px] font-semibold sm:text-sm ${pillar.key === 'day' ? 'text-[#96372e]' : 'text-[#514941]'}`}>{pillar.ganShiShen || (pillar.unknown ? '不详' : '—')}</span>
                        </PillarCell>
                    ))}
                </tr>
                <tr>
                    <th scope="row" className="border-b border-[#cabfac]/70 bg-[#e9dfcd]/45 px-1 py-2 text-[11px] font-medium text-[#756d63] sm:text-xs">天干</th>
                    {pillars.map((pillar) => (
                        <PillarCell key={pillar.key} pillar={pillar} className="py-3">
                            {pillar.unknown ? (
                                <span className="block text-[11px] leading-5 text-[#9b9185]">时辰<br />不详</span>
                            ) : (
                                <>
                                    <span className={`font-serif text-[1.75rem] font-bold leading-none sm:text-4xl ${wuxingText(pillar.ganWuxing)}`}>{pillar.gan}</span>
                                    <span className="mt-1 block text-[11px] text-[#948a7d] sm:text-[11px]">{pillar.ganWuxing}</span>
                                </>
                            )}
                        </PillarCell>
                    ))}
                </tr>
                <tr>
                    <th scope="row" className="border-b border-[#cabfac]/70 bg-[#e9dfcd]/45 px-1 py-2 text-[11px] font-medium text-[#756d63] sm:text-xs">地支</th>
                    {pillars.map((pillar) => (
                        <PillarCell key={pillar.key} pillar={pillar} className="py-3">
                            {pillar.unknown ? (
                                <span className="text-xs text-[#9b9185]">—</span>
                            ) : (
                                <>
                                    <span className={`font-serif text-[1.75rem] font-bold leading-none sm:text-4xl ${wuxingText(pillar.zhiWuxing)}`}>{pillar.zhi}</span>
                                    <span className="mt-1 block text-[11px] text-[#948a7d] sm:text-[11px]">{pillar.zhiWuxing}</span>
                                </>
                            )}
                        </PillarCell>
                    ))}
                </tr>
                <tr>
                    <th scope="row" className="border-b border-[#cabfac]/70 bg-[#e9dfcd]/45 px-1 py-2 text-[11px] font-medium text-[#756d63] sm:text-xs">藏干</th>
                    {pillars.map((pillar) => (
                        <PillarCell key={pillar.key} pillar={pillar} className="py-2.5">
                            <div className="flex min-h-[3.75rem] flex-col items-center justify-center gap-1">
                                {pillar.hiddenGanDetails.length ? pillar.hiddenGanDetails.map((detail) => (
                                    <span key={`${pillar.key}-${detail.gan}`} className="inline-flex items-baseline justify-center gap-0.5 whitespace-nowrap">
                                        <b className={`font-serif text-xs sm:text-sm ${wuxingText(detail.wuxing)}`}>{detail.gan}</b>
                                        <small className="text-[11px] text-[#756d63] sm:text-[10px]">{detail.shiShen}</small>
                                    </span>
                                )) : <span className="text-xs text-[#9b9185]">—</span>}
                            </div>
                        </PillarCell>
                    ))}
                </tr>
                <tr>
                    <th scope="row" className="border-b border-[#cabfac]/70 bg-[#e9dfcd]/45 px-1 py-2 text-[11px] font-medium text-[#756d63] sm:text-xs">纳音</th>
                    {pillars.map((pillar) => (
                        <PillarCell key={pillar.key} pillar={pillar}>
                            <span className="text-[11px] leading-4 text-[#5c544b] sm:text-xs">{pillar.naYin || '—'}</span>
                        </PillarCell>
                    ))}
                </tr>
                <tr>
                    <th scope="row" className="border-b border-[#cabfac]/70 bg-[#e9dfcd]/45 px-1 py-2 text-[11px] font-medium text-[#756d63] sm:text-xs">神煞</th>
                    {pillars.map((pillar) => (
                        <PillarCell key={pillar.key} pillar={pillar} className="align-top">
                            <ShenshaTags names={pillar.shensha} />
                        </PillarCell>
                    ))}
                </tr>
            </tbody>
        </table>
    </div>
);

const normalizeComparisonColumn = (source, key, fallbackName, meta = '') => {
    const ganZhi = source?.ganZhi ?? '';
    const gan = source?.gan ?? ganZhi.slice(0, 1);
    const zhi = source?.zhi ?? ganZhi.slice(1, 2);
    const hiddenGanDetails = source?.hiddenGanDetails?.length
        ? source.hiddenGanDetails
        : (source?.hiddenGans ?? []).map((hiddenGan, index) => ({
            gan: hiddenGan,
            shiShen: source?.hiddenShiShens?.[index] ?? '',
            wuxing: GAN_WUXING[hiddenGan] ?? '',
        }));

    return {
        ...source,
        key,
        name: source?.name ?? fallbackName,
        meta,
        gan,
        zhi,
        ganWuxing: source?.ganWuxing ?? GAN_WUXING[gan] ?? '',
        zhiWuxing: source?.zhiWuxing ?? ZHI_WUXING[zhi] ?? '',
        hiddenGanDetails,
    };
};

const comparisonTone = (column) => COLUMN_TONES[column.key]?.cell ?? 'bg-[#fffaf0]/65';

export const ProfessionalComparisonTable = ({ pillars, daYun, liuNian, flowColumns = [], detail = 'compact', describedBy }) => {
    const columns = [
        ...flowColumns.map(({ source, key, name, meta }) => normalizeComparisonColumn(source, key, name, meta)),
        normalizeComparisonColumn(
            liuNian,
            'liu-nian',
            '流年',
            liuNian ? `${liuNian.year}年 · ${liuNian.age}虚岁` : '',
        ),
        normalizeComparisonColumn(
            daYun,
            'da-yun',
            '大运',
            daYun ? `${daYun.startAge}-${daYun.endAge}虚岁` : '',
        ),
        ...pillars.map((pillar) => normalizeComparisonColumn(pillar, pillar.key, pillar.name, pillar.unknown ? '时辰不详' : '')),
    ];
    const rowHeaderClass = 'sticky left-0 z-20 w-14 border-b border-r border-[#b9ad98]/80 bg-[#e7ddcc] px-1.5 py-2 text-[11px] font-semibold text-[#685f56] shadow-[3px_0_5px_rgba(76,62,46,0.06)] print:static print:text-[8px] print:shadow-none sm:w-16 sm:text-xs';
    const dataCellClass = (column) => `border-b border-r border-[#cabfac]/70 px-1.5 py-2 text-center align-middle last:border-r-0 ${comparisonTone(column)}`;

    return (
        <div className="-mx-2 mt-4 overflow-x-auto rounded-xl border border-[#b9ad98]/80 bg-[#fffaf0]/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] print:mx-0 print:overflow-visible print:ring-0 sm:mx-0" tabIndex={describedBy ? 0 : undefined} aria-describedby={describedBy}>
            <table className="w-full table-fixed border-collapse print:min-w-0!" style={{ minWidth: `${Math.max(680, 64 + columns.length * 88)}px` }}>
                <caption className="sr-only">
                    {flowColumns.map(({ source, name }) => `${source?.ganZhi ?? ''}${name}、`).join('')}{liuNian ? `${liuNian.year}年${liuNian.ganZhi}流年、` : ''}{daYun ? `${daYun.ganZhi}大运与` : ''}本命四柱专业对照表，{detail === 'full' ? '完整' : '精简'}模式
                </caption>
                <colgroup>
                    <col className="w-14 print:w-12 sm:w-16" />
                    {columns.map((column) => <col key={column.key} />)}
                </colgroup>
                <thead>
                    <tr>
                        <th className="sticky left-0 z-30 border-b border-r border-[#b9ad98]/80 bg-[#dfd3c0] px-1 py-2 text-[11px] font-semibold text-[#756d63] print:static print:text-[8px] sm:text-xs">对照</th>
                        {columns.map((column) => (
                            <th key={column.key} scope="col" className={`border-b border-r border-[#b9ad98]/80 px-1 py-2 text-xs font-bold last:border-r-0 print:text-[9px] sm:text-sm ${COLUMN_TONES[column.key]?.head ?? 'bg-[#e9dfcd]/45 text-[#514941]'}`}>
                                <span className="block">{column.name}</span>
                                {column.meta && <span className="mt-0.5 block text-[11px] font-normal tabular-nums opacity-70 print:text-[6px]">{column.meta}</span>}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th scope="row" className={rowHeaderClass}>主星</th>
                        {columns.map((column) => <td key={column.key} className={dataCellClass(column)}><span className="text-[11px] font-semibold text-[#514941] print:text-[8px] sm:text-sm">{column.ganShiShen || '—'}</span></td>)}
                    </tr>
                    <tr>
                        <th scope="row" className={rowHeaderClass}>天干</th>
                        {columns.map((column) => (
                            <td key={column.key} className={`${dataCellClass(column)} py-3`}>
                                <span className={`font-serif text-2xl font-bold leading-none print:text-lg sm:text-3xl ${wuxingText(column.ganWuxing)}`}>{column.gan || '—'}</span>
                                <span className="mt-1 block text-[11px] text-[#948a7d] print:hidden">{column.ganWuxing || '—'}</span>
                            </td>
                        ))}
                    </tr>
                    <tr>
                        <th scope="row" className={rowHeaderClass}>地支</th>
                        {columns.map((column) => (
                            <td key={column.key} className={`${dataCellClass(column)} py-3`}>
                                <span className={`font-serif text-2xl font-bold leading-none print:text-lg sm:text-3xl ${wuxingText(column.zhiWuxing)}`}>{column.zhi || '—'}</span>
                                <span className="mt-1 block text-[11px] text-[#948a7d] print:hidden">{column.zhiWuxing || '—'}</span>
                            </td>
                        ))}
                    </tr>
                    <tr>
                        <th scope="row" className={rowHeaderClass}>藏干</th>
                        {columns.map((column) => (
                            <td key={column.key} className={dataCellClass(column)}>
                                {column.hiddenGanDetails.length > 0 ? (
                                    <div className="flex min-h-12 flex-col items-center justify-center gap-0.5">
                                        {column.hiddenGanDetails.map((detail, index) => (
                                            <span key={`${column.key}-${detail.gan}-${index}`} className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                                                <b className={`font-serif text-xs print:text-[9px] sm:text-sm ${wuxingText(detail.wuxing ?? GAN_WUXING[detail.gan])}`}>{detail.gan}</b>
                                                <small className="text-[11px] text-[#756d63] print:text-[6px]">{detail.shiShen || '—'}</small>
                                            </span>
                                        ))}
                                    </div>
                                ) : <span className="text-xs text-[#9b9185]">—</span>}
                            </td>
                        ))}
                    </tr>
                    {detail === 'full' && (
                        <>
                            <tr>
                                <th scope="row" className={rowHeaderClass}>纳音</th>
                                {columns.map((column) => <td key={column.key} className={dataCellClass(column)}><span className="text-[11px] leading-4 text-[#5c544b] print:text-[7px] sm:text-xs">{column.naYin || '—'}</span></td>)}
                            </tr>
                            <tr>
                                <th scope="row" className={rowHeaderClass}>星运</th>
                                {columns.map((column) => <td key={column.key} className={dataCellClass(column)}><span className="text-[11px] font-medium text-[#2d6b62] print:text-[7px] sm:text-xs">{column.diShi || '—'}</span></td>)}
                            </tr>
                            <tr>
                                <th scope="row" className={rowHeaderClass}>自坐</th>
                                {columns.map((column) => <td key={column.key} className={dataCellClass(column)}><span className="text-[11px] text-[#5c544b] print:text-[7px] sm:text-xs">{column.ziZuo || '—'}</span></td>)}
                            </tr>
                            <tr>
                                <th scope="row" className={rowHeaderClass}>空亡</th>
                                {columns.map((column) => <td key={column.key} className={dataCellClass(column)}><span className="text-[11px] text-[#5c544b] print:text-[7px] sm:text-xs">{column.xunKong || '—'}</span></td>)}
                            </tr>
                            <tr>
                                <th scope="row" className={`${rowHeaderClass} border-b-0`}>神煞</th>
                                {columns.map((column) => <td key={column.key} className={`${dataCellClass(column)} border-b-0 align-top`}><ShenshaTags names={column.shensha ?? []} /></td>)}
                            </tr>
                        </>
                    )}
                </tbody>
            </table>
        </div>
    );
};
