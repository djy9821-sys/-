/**
 * 八字页的古籍原文：按这张盘的格局、十神、神煞、日干月令、季节、合冲刑害，从古籍库里找出相关条目。
 * 界面在 common/ClassicsPanel.jsx，这里只算上下文。
 */
import React, { useMemo } from 'react';
import { baziContextOf } from '../../data/classics/index.js';
import ClassicsPanel from '../common/ClassicsPanel.jsx';

export default function BaziClassicsPanel({ chart, strength, judge, relations }) {
    const ctx = useMemo(() => (chart ? baziContextOf({ chart, strength, judge, relations }) : null), [chart, strength, judge, relations]);
    return <ClassicsPanel ctx={ctx} subject="这张盘" testId="bazi-classics" entryTestId="bazi-classic-entry" />;
}
