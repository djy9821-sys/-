/**
 * 紫微页的古籍原文：选一个宫，按宫里的星曜（主星、辅星、杂曜）、宫名、地支、庙旺、四化与性别，
 * 从古籍库里找出相关条目（如《紫微斗数全书》诸星问答论里这颗星怎么说）。界面在 common/ClassicsPanel.jsx。
 */
import React, { useMemo, useState } from 'react';
import { ziweiPalaceContextOf } from '../../data/classics/index.js';
import ClassicsPanel from '../common/ClassicsPanel.jsx';

/** 按命盘习惯的顺序列宫：命宫起，逆行到父母。 */
const PALACE_ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母'];
const palaceLabel = (name = '') => (name === '仆役' ? '交友' : name);

const starLabel = (star) => `${star.name}${star.brightness || ''}${star.mutagen ? `·化${String(star.mutagen).replace(/^化/, '')}` : ''}`;

const EMPTY = Object.freeze([]);

/**
 * @param {{ palaces?: object[], focusedIndex?: number|null, gender?: string|null, patterns?: string[] }} props
 *   patterns：程序认出的格局名（按命宫三方四正判的），只在看命宫时算进匹配条件。
 */
export default function ZiweiClassicsPanel({ palaces = [], focusedIndex = null, gender = null, patterns = EMPTY }) {
    // 默认看盘上高亮的宫（没有就命宫）。面板里另选的宫记在 picked 里，并记下当时的高亮；
    // 盘上换了高亮就回到新高亮的宫，不用 effect 重置。
    const [picked, setPicked] = useState({ focusedIndex: null, index: null });
    const ordered = useMemo(
        () => PALACE_ORDER.map((name) => palaces.find((palace) => palace.name === name)).filter(Boolean),
        [palaces],
    );
    const defaultIndex = focusedIndex ?? ordered[0]?.index ?? null;
    const selectedIndex = picked.focusedIndex === focusedIndex && picked.index !== null ? picked.index : defaultIndex;
    const palace = palaces.find((item) => item.index === selectedIndex) ?? null;
    const isMing = palace?.name === '命宫';
    const ctx = useMemo(
        () => ziweiPalaceContextOf(palace, { gender, patterns: isMing ? patterns : EMPTY }),
        [palace, gender, isMing, patterns],
    );
    const stars = palace ? [...(palace.majorStars ?? []), ...(palace.minorStars ?? []), ...(palace.adjectiveStars ?? [])] : [];

    return (
        <div data-testid="ziwei-classics">
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

            <ClassicsPanel ctx={ctx} subject="这个宫的星曜" testId="ziwei-classics-panel" entryTestId="ziwei-classic-entry" className="mt-3 space-y-3" />
        </div>
    );
}
