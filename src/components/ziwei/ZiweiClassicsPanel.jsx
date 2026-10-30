/**
 * 紫微页的古籍原文：选一个宫，按宫里的星曜（主星、辅星、杂曜）、宫名、地支、庙旺、四化与性别，
 * 从古籍库里找出相关条目（如《紫微斗数全书》诸星问答论里这颗星怎么说）。界面在 common/ClassicsPanel.jsx。
 */
import React, { useMemo, useState } from 'react';
import { ziweiBorrowedStarsOf, ziweiFlowOf, ziweiNeighborsOf, ziweiOppositeOf, ziweiPalaceContextOf, ziweiSurroundOf } from '../../data/classics/index.js';
import ClassicsPanel from '../common/ClassicsPanel.jsx';

/** 按命盘习惯的顺序列宫：命宫起，逆行到父母。 */
const PALACE_ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母'];
const palaceLabel = (name = '') => (name === '仆役' ? '交友' : name);

const starLabel = (star) => `${star.name}${star.brightness || ''}${star.mutagen ? `·化${String(star.mutagen).replace(/^化/, '')}` : ''}`;

const EMPTY = Object.freeze([]);

/** 看哪一层：本命盘的各宫，或此刻所行大限、小限、流年的命宫（古籍里写「大限逢……」「二限……」「流年……」的条目只在这几层出现）。 */
const LAYERS = Object.freeze([
    { value: '本命', label: '本命盘' },
    { value: '大限', label: '当前大限' },
    { value: '小限', label: '今年小限' },
    { value: '流年', label: '今年流年' },
]);
const LAYER_KEYS = Object.freeze({ 大限: 'decadal', 小限: 'age', 流年: 'yearly' });

/**
 * @param {{ palaces?: object[], focusedIndex?: number|null, gender?: string|null, patterns?: string[], limits?: { decadal?: { index: number, label: string, scope?: object|null }|null, age?: { index: number, label: string, scope?: object|null }|null, yearly?: { index: number, label: string, scope?: object|null, doujun?: { name: string, earthlyBranch: string }|null }|null }, natal?: { yearGan?: string|null, yearZhi?: string|null }|null }} props
 *   patterns：程序认出的格局名（按命宫三方四正判的），只在看本命盘的命宫时算进匹配条件。
 *   limits：此刻所行大限、小限（age）、流年的命宫在哪一宫（宫的 index）与说明，scope 是排盘库该层的运限对象（带流曜与四化，流羊算擎羊、运昌算文昌一起找；小限只有四化）；流年另带 doujun（流年斗君所落本命宫，「斗君过度在妻宫」一类条目靠它判）；不传则只看本命盘。
 *   natal：生年干支（ziweiNatalOf），给「壬甲生人」这类条件用。
 */
export default function ZiweiClassicsPanel({ palaces = [], focusedIndex = null, gender = null, patterns = EMPTY, limits = null, natal = null }) {
    // 默认看盘上高亮的宫（没有就命宫）。面板里另选的宫记在 picked 里，并记下当时的高亮；
    // 盘上换了高亮就回到新高亮的宫，不用 effect 重置。
    const [picked, setPicked] = useState({ focusedIndex: null, index: null });
    const [layer, setLayer] = useState('本命');
    const ordered = useMemo(
        () => PALACE_ORDER.map((name) => palaces.find((palace) => palace.name === name)).filter(Boolean),
        [palaces],
    );
    const layers = LAYERS.filter((item) => item.value === '本命' || Number.isInteger(limits?.[LAYER_KEYS[item.value]]?.index));
    const activeLayer = layers.some((item) => item.value === layer) ? layer : '本命';
    const limitInfo = activeLayer === '本命' ? null : limits[LAYER_KEYS[activeLayer]];
    const defaultIndex = focusedIndex ?? ordered[0]?.index ?? null;
    const selectedIndex = limitInfo
        ? limitInfo.index
        : picked.focusedIndex === focusedIndex && picked.index !== null ? picked.index : defaultIndex;
    const palace = palaces.find((item) => item.index === selectedIndex) ?? null;
    const isMing = !limitInfo && palace?.name === '命宫';
    // 空宫借对宫的主星一起找（排盘习惯「无正曜借对宫论」），命中说明里注「借对宫」。
    const opposite = ziweiOppositeOf(palaces, palace);
    // 运限层：该层飞到这一宫及三方四正的流曜（流羊算擎羊、运昌算文昌……）与该层四化一起找，命中说明里注「（流年）」「（大限）」。
    const flow = useMemo(
        () => (limitInfo?.scope ? ziweiFlowOf(limitInfo.scope, palace, ziweiSurroundOf(palaces, palace)) : null),
        [limitInfo, palace, palaces],
    );
    // 流年层：斗君（流年正月所在的本命宫）也算进条件，古籍论流年常以「斗君过度在某宫」起论。
    const doujun = limitInfo?.doujun ?? null;
    const ctx = useMemo(
        () => ziweiPalaceContextOf(palace, { gender, natal, limit: activeLayer, patterns: isMing ? patterns : EMPTY, neighbors: ziweiNeighborsOf(palaces, palace), opposite, surround: ziweiSurroundOf(palaces, palace), flow, doujun: doujun?.name ?? null }),
        [palaces, palace, gender, natal, activeLayer, isMing, patterns, opposite, flow, doujun],
    );
    const stars = palace ? [...(palace.majorStars ?? []), ...(palace.minorStars ?? []), ...(palace.adjectiveStars ?? [])] : [];
    const borrowed = ziweiBorrowedStarsOf(palace, opposite);
    // 面板上列出该层飞入本宫的流曜（原名）与四化，读者知道多出来的星从哪来。
    const flowStarsHere = limitInfo?.scope && palace ? (limitInfo.scope.stars?.[palace.index] ?? []).map((star) => star?.name).filter(Boolean) : EMPTY;
    const flowMutagensHere = flow?.mutagens ?? EMPTY;

    return (
        <div data-testid="ziwei-classics">
            {layers.length > 1 && (
                <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="看哪一层">
                    {layers.map((item) => {
                        const active = item.value === activeLayer;
                        return (
                            <button
                                key={item.value}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setLayer(item.value)}
                                className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${active ? 'border-[#315f7d] bg-[#315f7d] text-white' : 'border-[#b9ad98] bg-[#fffaf0]/80 text-[#5f574f] hover:border-[#315f7d] hover:text-[#315f7d]'}`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            )}
            {limitInfo ? (
                <p className="text-xs leading-5 text-[#655d54]" data-testid="ziwei-classics-limit">
                    {limitInfo.label}：命宫在本命盘的{palaceLabel(palace?.name)}（{palace?.earthlyBranch}宫），按宫中星曜找，另加古籍里专讲「{activeLayer}」的条目。
                    {doujun ? <span data-testid="ziwei-classics-doujun">流年斗君（正月）在本命{palaceLabel(doujun.name)}（{doujun.earthlyBranch}宫）。</span> : null}
                </p>
            ) : (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="选择宫位">
                {ordered.map((item) => {
                    const active = item.index === selectedIndex;
                    return (
                        <button
                            key={item.index}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setPicked({ focusedIndex, index: item.index })}
                            className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${active ? 'border-[#2d6b62] bg-[#2d6b62] text-white' : 'border-[#b9ad98] bg-[#fffaf0]/80 text-[#5f574f] hover:border-[#2d6b62] hover:text-[#2d6b62]'}`}
                        >
                            {palaceLabel(item.name)}
                            <small className={`font-normal ${active ? 'text-white/80' : 'text-[#9b9185]'}`}>{item.earthlyBranch}{item.isBodyPalace ? '·身' : ''}</small>
                        </button>
                    );
                })}
            </div>
            )}

            {palace && (
                <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-[#655d54]" data-testid="ziwei-classics-stars">
                    <span className="font-bold text-[#28231f]">{palaceLabel(palace.name)}{palace.isBodyPalace ? '（身宫）' : ''}·{palace.earthlyBranch}宫</span>
                    {stars.length
                        ? stars.map((star) => (
                            <span key={star.name} className="inline-flex items-center rounded border border-[#cbbfac] bg-[#fffaf0]/80 px-1.5 leading-5">
                                {starLabel(star)}
                            </span>
                        ))
                        : <span>宫内无星（空宫）</span>}
                    {borrowed.length > 0 && (
                        <span className="inline-flex items-center gap-1" data-testid="ziwei-classics-borrowed">
                            <span className="text-[#81776b]">无主星，借对宫{palaceLabel(opposite?.name)}</span>
                            {borrowed.map((name) => (
                                <span key={name} className="inline-flex items-center rounded border border-dashed border-[#cbbfac] px-1.5 leading-5 text-[#655d54]">{name}</span>
                            ))}
                        </span>
                    )}
                    {(flowStarsHere.length > 0 || flowMutagensHere.length > 0) && (
                        <span className="inline-flex items-center gap-1" data-testid="ziwei-classics-flow">
                            <span className="text-[#81776b]">{activeLayer}飞入</span>
                            {flowStarsHere.map((name) => (
                                <span key={name} className="inline-flex items-center rounded border border-dashed border-[#315f7d]/50 px-1.5 leading-5 text-[#2b4f68]">{name}</span>
                            ))}
                            {flowMutagensHere.map((name) => (
                                <span key={`化${name}`} className="inline-flex items-center rounded border border-dashed border-[#315f7d]/50 px-1.5 leading-5 text-[#2b4f68]">{activeLayer}化{name}</span>
                            ))}
                        </span>
                    )}
                    {isMing && patterns.length > 0 && (
                        <span className="inline-flex items-center gap-1" data-testid="ziwei-classics-patterns">
                            <span className="text-[#81776b]">格局</span>
                            {patterns.map((name) => (
                                <span key={name} className="inline-flex items-center rounded border border-[#315f7d]/30 bg-[#315f7d]/[0.06] px-1.5 leading-5 text-[#2b4f68]">{name}</span>
                            ))}
                        </span>
                    )}
                </p>
            )}

            <ClassicsPanel ctx={ctx} subject={limitInfo ? `${activeLayer}命宫的星曜` : '这个宫的星曜'} testId="ziwei-classics-panel" entryTestId="ziwei-classic-entry" className="mt-3 space-y-3" />
        </div>
    );
}
