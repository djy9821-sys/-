/**
 * 首页「八字 · 今日」：按上次排的八字，显示今天的流日、与命局的关系、喜忌与黄历。
 */
import React, { useMemo, useState } from 'react';
import { buildBaziChart } from '../../utils/baziChart';
import { recordToBaziForm } from '../../utils/baziRecord';
import { baziFormToChartInput } from '../../utils/baziInput';
import { buildBaziToday } from '../../utils/baziToday';
import { buildBaziPrompt } from '../../utils/baziPrompt';
import { getLiuNianMarks } from '../../utils/baziYearMarks';
import { track } from '../../utils/analytics';
import PlaceSetting from '../common/PlaceSetting';

const TONE_LABEL = { good: '喜', bad: '忌', neutral: '平' };
const TONE_CLASS = {
    good: 'border-[#2d6b62]/35 bg-[#2d6b62]/[0.08] text-[#245a52]',
    bad: 'border-[#a33b30]/30 bg-[#a33b30]/[0.07] text-[#8f3027]',
    neutral: 'border-[#9a7119]/30 bg-[#9a7119]/[0.08] text-[#6f5313]',
};
const RELATION_CLASS = {
    clash: 'bg-[#a33b30] text-white',
    punish: 'bg-[#b06a1f] text-white',
    harm: 'bg-[#6b4f8a] text-white',
    harmony: 'bg-[#2d6b62] text-white',
    echo: 'bg-[#315f7d] text-white',
};
const RELATION_SHORT = { clash: '冲', punish: '刑', harm: '害', harmony: '合', echo: '伏吟' };
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // 继续用兼容写法
        }
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        return document.execCommand('copy');
    } finally {
        textarea.remove();
    }
};

const ToneChip = ({ label, item }) => (
    <span className={`inline-flex items-baseline gap-1 rounded-md border px-2 py-1 text-xs ${TONE_CLASS[item.tone]}`}>
        <span className="text-[11px] opacity-80">{label}</span>
        <b className="font-serif text-sm">{item.element}</b>
        <span>{TONE_LABEL[item.tone]}（{item.role}）</span>
    </span>
);

export default function HomeBaziToday({ record, source = null, candidates = [], onSelect, now, deviceNow = now, onOpenChart, onOpenZiwei }) {
    const [notice, setNotice] = useState(null);

    const state = useMemo(() => {
        const form = recordToBaziForm(record);
        if (!form) return null;
        try {
            const chart = buildBaziChart(baziFormToChartInput(form), now);
            return { form, chart, today: buildBaziToday(chart, now) };
        } catch (error) {
            console.warn('无法生成八字今日:', error);
            return null;
        }
    }, [record, now]);

    if (!state) return null;
    const { form, chart, today } = state;
    const { liuRi, liuShi, liuYue, liuNian, daYun, relations, dayTone, strength } = today;
    const almanac = liuRi.almanac;
    const name = form.personName?.trim() || '命主';
    const topRelations = relations.slice(0, 4);
    // 今年是否犯太岁、岁运并临：只列标注，不列喜忌（流日已有）。
    const yearLabels = liuNian ? getLiuNianMarks(liuNian, { chart, daYun, strength }).labels : [];

    const copyForAi = async () => {
        track('ai_export', { kind: 'bazi_today', scope: 'day', channel: 'copy' });
        const prompt = buildBaziPrompt({ chart, scope: 'day', personName: form.personName, selections: today, now });
        const ok = await copyText(prompt).catch(() => false);
        setNotice(ok
            ? { type: 'success', text: '已复制今天的八字提示词，可直接粘贴给 ChatGPT、Claude 等 AI。' }
            : { type: 'error', text: '复制失败，请在八字页的「导出给 AI」里手动复制。' });
    };

    return (
        <section className="relative overflow-hidden rounded-[23px_23px_23px_7px] border border-[#e5c783]/45 bg-[#f4ecdf] p-4 text-[#3b342e] shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:p-5" aria-labelledby="home-bazi-today-title">
            <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-[0.18em] text-[#a33b30]">八字 · 今日</p>
                    <h3 id="home-bazi-today-title" className="mt-1 font-serif text-lg font-bold leading-snug text-[#28231f] sm:text-xl">
                        {name}的今天
                    </h3>
                    <p className="mt-0.5 text-xs text-[#81776b]">
                        {liuRi.month}月{liuRi.day}日 周{WEEKDAYS[liuRi.weekday]} · 农历{liuRi.lunarMonthChinese}月{liuRi.lunarDayChinese}{liuRi.jieQi ? ` · ${liuRi.jieQi}` : ''}
                    </p>
                </div>
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#a33b30]/40 bg-[#a33b30]/[0.06] font-serif text-lg font-bold text-[#96372e]" aria-hidden="true">八</span>
            </header>

            {candidates.length > 1 && onSelect && (
                <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="选择显示谁的八字">
                    {candidates.slice(0, 6).map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            aria-pressed={item.key === source?.key}
                            onClick={() => onSelect(item.key)}
                            className={`inline-flex min-h-8 items-center rounded-full border px-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62] ${item.key === source?.key ? 'border-[#2d6b62] bg-[#2d6b62] text-white' : 'border-[#cbbfac] bg-[#fffaf0]/80 text-[#5f574f] hover:border-[#2d6b62]'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-baseline gap-1.5 rounded-lg border border-[#a33b30]/35 bg-[#fffaf0] px-3 py-1.5">
                    <b className="font-serif text-2xl leading-none text-[#96372e]">{liuRi.ganZhi}</b>
                    <span className="text-xs font-bold text-[#2d6b62]">日 · {liuRi.ganShiShen}</span>
                </span>
                <ToneChip label="天干" item={dayTone.gan} />
                <ToneChip label="地支" item={dayTone.zhi} />
            </div>

            <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#5f574f]">
                {liuShi && <span>此刻 <b className="font-serif text-[#3b342e]">{liuShi.hourName} {liuShi.ganZhi}</b></span>}
                <span>流月 <b className="font-serif text-[#3b342e]">{liuYue.ganZhi}</b></span>
                {liuNian && (
                    <span>
                        流年 <b className="font-serif text-[#3b342e]">{liuNian.ganZhi}</b>
                        {yearLabels.length > 0 && <span className="ml-1 rounded bg-[#b06a1f]/[0.12] px-1 text-[11px] font-bold text-[#7f4b12]">{yearLabels.join('·')}</span>}
                    </span>
                )}
                {daYun && <span>{daYun.name === '小运' ? '小运' : '大运'} <b className="font-serif text-[#3b342e]">{daYun.ganZhi}</b></span>}
            </p>
            <PlaceSetting tone="paper" now={deviceNow} className="mt-1.5 text-[11px]" />

            <div className="mt-3">
                <p className="text-xs font-bold text-[#514941]">今天与命局</p>
                {topRelations.length ? (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {topRelations.map((relation) => (
                            <li key={relation.id ?? relation.title} className="inline-flex items-center gap-1.5 rounded-md border border-[#d5c9b8] bg-[#fffaf0]/80 py-1 pl-1 pr-2 text-xs">
                                <span className={`rounded px-1.5 text-[11px] font-bold leading-5 ${RELATION_CLASS[relation.tone] ?? 'bg-[#8a8074] text-white'}`}>{RELATION_SHORT[relation.tone] ?? '关'}</span>
                                <b className="text-[#3b342e]">{relation.title}</b>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-1 text-xs text-[#81776b]">今天的干支与命局、运限之间没有明显的合冲刑害。</p>
                )}
            </div>

            {almanac && (
                <div className="mt-3 space-y-1 rounded-lg border border-[#ddd2c1] bg-[#f8f2e8] px-2.5 py-2 text-xs leading-5 text-[#514941]">
                    <p className="line-clamp-2"><b className="mr-1 text-[#245a52]">宜</b>{almanac.yi.slice(0, 8).join(' · ') || '—'}</p>
                    <p className="line-clamp-2"><b className="mr-1 text-[#8f3027]">忌</b>{almanac.ji.slice(0, 8).join(' · ') || '—'}</p>
                </div>
            )}

            <div className="mt-3.5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onOpenChart(record)} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2d6b62] px-3 text-sm font-bold text-white hover:bg-[#245a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75b4aa]">
                    看今日详情 →
                </button>
                <button type="button" onClick={copyForAi} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#2d6b62]/45 bg-[#fffaf0] px-3 text-sm font-bold text-[#245a52] hover:bg-[#2d6b62]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d6b62]">
                    复制今日给 AI
                </button>
            </div>
            {notice && (
                <p className={`mt-2 text-xs ${notice.type === 'error' ? 'text-[#96372e]' : 'text-[#245a52]'}`} role={notice.type === 'error' ? 'alert' : 'status'}>
                    {notice.text}
                </p>
            )}
            <p className="mt-2.5 text-[11px] leading-5 text-[#9b9185]">
                {source && !source.isLast
                    ? (source.fromZiwei ? `按紫微档案「${source.record?.name || name}」的生辰计算` : `按档案「${source.label}」计算`)
                    : '按八字页上次排的盘计算'}，喜忌为程序估算，仅供参考。
                {onOpenZiwei && (
                    <button type="button" onClick={onOpenZiwei} className="ml-1 font-bold text-[#2d6b62] underline-offset-2 hover:underline">
                        也看紫微运势 →
                    </button>
                )}
            </p>
        </section>
    );
}
