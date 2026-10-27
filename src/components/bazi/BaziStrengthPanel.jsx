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

export default function BaziStrengthPanel({ strength, surfaceCounts, dayMaster }) {
    const supportPercent = Math.round(strength.ratio * 100);
    const roleOf = (element) => strength.roles[element];

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
                    表层 8 字计数：{WUXING_ORDER.map((element) => `${element}${surfaceCounts[element] ?? 0}`).join(' ')}
                </p>
            </div>

            <div className="rounded-xl border border-[#cbbfac]/80 bg-[#fffaf0]/65 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#3b342e]">
                        日主 <span className={WUXING_STYLES[dayMaster.wuxing].text}>{dayMaster.gan}{dayMaster.wuxing}</span>
                    </p>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${BAND_STYLES[strength.band]}`}>{strength.band}</span>
                </div>
                <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-[#81776b]">
                        <span>同党（比劫 + 印）{supportPercent}%</span>
                        <span>异党（食伤 + 财 + 官杀）{100 - supportPercent}%</span>
                    </div>
                    <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-[#d9cfbf]">
                        <span className="absolute inset-y-0 left-0 bg-[#a33b30]/70" style={{ width: `${supportPercent}%` }} aria-hidden="true" />
                        <span className="absolute inset-y-0 w-px bg-[#3b342e]/40" style={{ left: '45%' }} aria-hidden="true" />
                        <span className="absolute inset-y-0 w-px bg-[#3b342e]/40" style={{ left: '60%' }} aria-hidden="true" />
                    </div>
                    <p className="mt-1 text-[11px] text-[#9b9185]">刻度：45% 以下偏弱，45%–60% 中和，60% 以上偏强</p>
                </div>
                <ul className="mt-3 space-y-1.5">
                    <Check ok={strength.deLing} label="得令" detail={strength.monthMain ? `月令本气 ${strength.monthMain.gan}（${strength.monthMain.role}）${strength.deLing ? '帮扶日主' : '不帮日主'}` : '—'} />
                    <Check ok={strength.deDi.length > 0} label="得地" detail={strength.deDi.length ? strength.deDi.map((item) => `${item.name}${item.zhi}${item.tongGen ? '（通根）' : '（有印）'}`).join('、') : '地支中没有比劫或印的根气'} />
                    <Check ok={strength.deShi.length > 0} label="得势" detail={strength.deShi.length ? strength.deShi.map((item) => `${item.name}${item.gan}（${item.role}）`).join('、') : '天干没有比劫或印相帮'} />
                    {strength.tiaoHou && <Check mark={strength.tiaoHou.element} label="调候" detail={`${strength.tiaoHou.text}${strength.tiaoHou.season ? `；${strength.tiaoHou.season}` : ''}。出处${strength.tiaoHou.source}`} />}
                </ul>
                {strength.hint && <p className="mt-2 rounded-lg bg-[#b06a1f]/[0.08] px-2.5 py-1.5 text-xs text-[#7f4b12]">{strength.hint}</p>}
            </div>

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
            <p className="rounded-lg bg-[#e9dfcd]/55 px-3 py-2 text-[11px] leading-5 text-[#6f665d] sm:text-xs">
                以上为程序按五行力量估算的参考：天干每字 1 分（日干不计），藏干按本气 1、中气 0.5、余气 0.3 计，月令加倍。从格、化格、专旺等特殊格局需要人工判断。
            </p>
        </div>
    );
}
