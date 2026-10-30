/**
 * 五行与旺衰：计入藏干的五行力量、日主强弱、喜用参考（程序估算）。
 */
import React from 'react';
import { WUXING_ORDER, WUXING_STYLES } from './baziTheme';

const BAND_STYLES = {
    极弱: 'bg-[#315f7d] text-white',
    偏弱: 'bg-[#315f7d]/85 text-white',
    中和: 'bg-[#2d6b62] text-white',
    偏强: 'bg-[#ad3f32]/85 text-white',
    极强: 'bg-[#ad3f32] text-white',
};

const ElementChip = ({ item, tone }) => (
    <span className={`inline-flex items-baseline gap-1 rounded-md border px-2 py-1 text-sm ${tone === 'good' ? 'border-[#2d6b62]/35 bg-[#2d6b62]/[0.07]' : 'border-[#a33b30]/30 bg-[#a33b30]/[0.06]'}`}>
        <b className={`font-serif ${WUXING_STYLES[item.element].text}`}>{item.element}</b>
        <span className="text-[11px] text-[#6f665d]">{item.role}{item.tiaoHou ? '·调候' : ''}</span>
    </span>
);

// mark 用于"需要什么"的提示（如调候宜见火），显示五行字而不是对勾，避免看成"已满足"。
const Check = ({ ok, label, detail, mark = null }) => (
    <li className="flex items-start gap-2 text-xs leading-5 text-[#514941]">
        <span className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${mark ? 'bg-[#b06a1f]' : ok ? 'bg-[#2d6b62]' : 'bg-[#9b9185]'}`} aria-hidden="true">{mark ?? (ok ? '✓' : '–')}</span>
        <span><b>{label}</b>：{detail}</span>
    </li>
);

// 旺衰打分的刻度：0–5 分，2 分及以下偏弱、2.5 分及以上偏强。
const SCALE_MAX = 5;
const scalePercent = (value) => `${(Math.min(Math.max(value, 0), SCALE_MAX) / SCALE_MAX) * 100}%`;
const points = (value) => `${Math.round(value * 100) / 100} 分`;
const branchLabel = (name = '') => name.replace('柱', '支');
const stemLabel = (name = '') => name.replace('柱', '干');

/** 得地的根按地支归在一起：日支午（比劫、印）0.75 分。 */
const rootGroupsOf = (roots = []) => {
    const groups = new Map();
    roots.forEach((root) => {
        const group = groups.get(root.key) ?? { key: root.key, label: `${branchLabel(root.name)}${root.zhi}${root.chong ? `（逢${root.chong}冲，打六折）` : ''}`, roles: [], points: 0 };
        if (!group.roles.includes(root.role)) group.roles.push(root.role);
        group.points += root.points;
        groups.set(root.key, group);
    });
    return [...groups.values()];
};

export default function BaziStrengthPanel({ strength, surfaceCounts, dayMaster, special = null }) {
    const supportPercent = Math.round(strength.ratio * 100);
    const roleOf = (element) => strength.roles[element];
    const { score } = strength;
    const rootGroups = rootGroupsOf(score.roots);

    return (
        <div className="mt-4 space-y-4">
            <div>
                <p className="text-xs font-bold text-[#514941]">五行力量（计入藏干，月令加倍）</p>
                <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-[#d9cfbf] ring-1 ring-[#c5b9a6]" role="img" aria-label={WUXING_ORDER.map((element) => `${element}${strength.percents[element]}%`).join('，')}>
                    {WUXING_ORDER.map((element) => (strength.scores[element] > 0
                        ? <span key={element} className={WUXING_STYLES[element].solid} style={{ width: `${strength.percents[element]}%` }} aria-hidden="true" />
                        : null))}
                </div>
                <div className="mt-2.5 grid grid-cols-5 gap-1.5 sm:gap-3">
                    {WUXING_ORDER.map((element) => (
                        <div key={element} className={`rounded-lg border px-1 py-2 text-center sm:px-3 ${element === dayMaster.wuxing ? 'border-[#a33b30]/45 bg-[#a33b30]/[0.05]' : 'border-[#cbbfac]/80 bg-[#fffaf0]/70'}`}>
                            <span className={`block text-sm font-bold sm:text-base ${WUXING_STYLES[element].text}`}>{element}</span>
                            <span className="block text-base font-semibold tabular-nums text-[#38312b] sm:text-lg">{strength.percents[element]}%</span>
                            <span className="block text-[11px] text-[#81776b]">{roleOf(element)}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[#81776b]">
                    表层 8 字计数：{WUXING_ORDER.map((element) => `${element}${surfaceCounts[element] ?? 0}`).join(' ')}；帮身的比劫与印合占 {supportPercent}%
                </p>
            </div>

            <div className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#3b342e]">
                        日主 <span className={WUXING_STYLES[dayMaster.wuxing].text}>{dayMaster.gan}{dayMaster.wuxing}</span>
                    </p>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${BAND_STYLES[strength.band]}`}>{strength.band}</span>
                </div>
                <div className="mt-3" data-testid="bazi-strength-score">
                    <div className="flex items-baseline justify-between gap-2 text-[11px] text-[#81776b]">
                        <span>旺衰打分（得令 + 得地 + 得势）</span>
                        <b className="text-sm tabular-nums text-[#3b342e]">{points(score.total)}</b>
                    </div>
                    <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-[#d9cfbf]" role="img" aria-label={`旺衰打分 ${points(score.total)}，满刻度 ${SCALE_MAX} 分`}>
                        <span className="absolute inset-y-0 left-0 bg-[#a33b30]/70" style={{ width: scalePercent(score.total) }} aria-hidden="true" />
                        <span className="absolute inset-y-0 w-px bg-[#3b342e]/40" style={{ left: scalePercent(2) }} aria-hidden="true" />
                        <span className="absolute inset-y-0 w-px bg-[#3b342e]/40" style={{ left: scalePercent(2.5) }} aria-hidden="true" />
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-[#9b9185]">刻度：2 分及以下偏弱，2.5 分及以上偏强，其间中和；0.5 分及以下极弱，4 分及以上极强</p>
                </div>
                <ul className="mt-3 space-y-1.5">
                    <Check ok={score.ling + (score.xiuQiu?.points ?? 0) > 0} label="得令" detail={strength.monthMain ? `月令本气 ${strength.monthMain.gan}（${strength.monthMain.role}）${score.lingYuqi ? `不帮日主，但${score.lingYuqi.zhi}中藏${score.lingYuqi.gan}（比劫余气），${points(score.ling)}` : score.ling > 0 ? `帮扶日主，${points(score.ling)}` : '不帮日主，0 分'}${score.xiuQiu ? `；月令是${score.xiuQiu.role}，日主${score.xiuQiu.state}（旺相休囚死），${points(score.xiuQiu.points)}` : ''}` : '—'} />
                    <Check ok={score.di > 0} label="得地" detail={rootGroups.length ? `${rootGroups.map((group) => `${group.label}（${group.roles.join('、')}）`).join('、')}，共 ${points(score.di)}` : '年、日、时支没有比劫或印的根气（月支算在得令里）'} />
                    <Check ok={score.shi > 0} label="得势" detail={score.stems.length ? `${score.stems.map((item) => `${stemLabel(item.name)}${item.gan}（${item.role}）`).join('、')}，共 ${points(score.shi)}` : '年、月、时干没有比劫或印相帮'} />
                    {score.hourEstimate > 0 && <Check mark="≈" label="时辰不详" detail={`时柱按平均 ${points(score.hourEstimate)}估`} />}
                    {strength.tiaoHou && <Check mark={strength.tiaoHou.element} label="调候" detail={`${strength.tiaoHou.text}${strength.tiaoHou.season ? `；${strength.tiaoHou.season}` : ''}。${strength.tiaoHou.presenceText ? `${strength.tiaoHou.presenceText}。` : ''}出处${strength.tiaoHou.source}`} />}
                </ul>
                {strength.hint && <p className="mt-2 rounded-lg bg-[#b06a1f]/[0.08] px-2.5 py-1.5 text-xs text-[#7f4b12]">{strength.hint}</p>}
            </div>

            {strength.basis && <p className="text-xs leading-5 text-[#514941]" data-testid="bazi-strength-basis"><b>取用思路</b>：{strength.basis}{strength.tiaoHouNote ? `；${strength.tiaoHouNote}` : ''}。</p>}
            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <p className="text-xs font-bold text-[#245a52]">喜用参考</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {strength.favorable.length
                            ? strength.favorable.map((item) => <ElementChip key={item.element} item={item} tone="good" />)
                            : <span className="text-xs text-[#81776b]">日主中和，喜忌需结合调候与格局判断</span>}
                    </div>
                </div>
                <div>
                    <p className="text-xs font-bold text-[#8f3027]">忌神参考</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {strength.unfavorable.length
                            ? strength.unfavorable.map((item) => <ElementChip key={item.element} item={item} tone="bad" />)
                            : <span className="text-xs text-[#81776b]">—</span>}
                    </div>
                </div>
            </div>
            {special?.godsText && (
                <p className="rounded-lg border border-[#b06a1f]/35 bg-[#b06a1f]/[0.07] px-3 py-2 text-xs leading-5 text-[#7f4b12]" data-testid="bazi-strength-special">
                    格局一节{special.name}：若成格，{special.godsText}，与上面按扶抑取的喜忌不同，以人工确认为准。
                </p>
            )}
            <p className="rounded-lg bg-[#e9dfcd]/55 px-3 py-2 text-[11px] leading-5 text-[#6f665d] sm:text-xs">
                以上为程序估算的参考：五行力量按天干每字 1 分（日干不计）、藏干本气 1 / 中气 0.5 / 余气 0.3、月令加倍计；旺衰按得令、得地、得势三项打分（月令是财、官杀的减分，根被紧贴的一支冲克的打折），权重按《滴天髓阐微》任铁樵命造校准；先按扶抑取定用神（有力的排前，中和按略偏的一边取），再论喜忌：用神与生用神者为喜，克用神者、用神所克者为忌；调候附在后面。从格、化格、专旺等特殊格局需要人工判断。
            </p>
        </div>
    );
}
