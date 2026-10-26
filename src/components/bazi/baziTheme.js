/**
 * 八字页面共用的配色与样式常量。
 */

export const WUXING_STYLES = {
    '木': { text: 'text-[#247055]', solid: 'bg-[#247055]' },
    '火': { text: 'text-[#ad3f32]', solid: 'bg-[#ad3f32]' },
    '土': { text: 'text-[#86603b]', solid: 'bg-[#86603b]' },
    '金': { text: 'text-[#9a7119]', solid: 'bg-[#b48a2e]' },
    '水': { text: 'text-[#315f7d]', solid: 'bg-[#315f7d]' },
};

export const WUXING_ORDER = ['木', '火', '土', '金', '水'];

export const wuxingText = (wuxing) => WUXING_STYLES[wuxing]?.text ?? 'text-[#302a25]';

export const GAN_WUXING = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

export const ZHI_WUXING = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
    '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

// 专业对照表各列的底色与表头配色。
export const COLUMN_TONES = {
    'liu-shi': { cell: 'bg-[#6b4f8a]/[0.045]', head: 'bg-[#6b4f8a]/10 text-[#56406f]' },
    'liu-ri': { cell: 'bg-[#9a7119]/[0.055]', head: 'bg-[#9a7119]/10 text-[#7d5c14]' },
    'liu-yue': { cell: 'bg-[#315f7d]/[0.05]', head: 'bg-[#315f7d]/10 text-[#2a5470]' },
    'liu-nian': { cell: 'bg-[#a33b30]/[0.055]', head: 'bg-[#a33b30]/10 text-[#96372e]' },
    'da-yun': { cell: 'bg-[#2d6b62]/[0.06]', head: 'bg-[#2d6b62]/10 text-[#2d6b62]' },
    day: { cell: 'bg-[#a33b30]/[0.035]', head: 'bg-[#a33b30]/[0.07] text-[#96372e]' },
};

// 神煞标签：吉神 / 中性 / 需留意。
export const SHENSHA_TONE_CLASS = {
    good: 'border-[#2d6b62]/30 bg-[#2d6b62]/[0.07] text-[#245a52]',
    neutral: 'border-[#9a7119]/30 bg-[#9a7119]/[0.08] text-[#6f5313]',
    caution: 'border-[#a33b30]/30 bg-[#a33b30]/[0.07] text-[#8f3027]',
};

// 输入页沿用卷首页的墨绿、金、朱砂配色。
export const INPUT_LABEL_CLASS = 'flex items-center gap-1 text-xs font-bold tracking-widest text-[#dcb471]';
export const INPUT_FIELD_CLASS = 'min-h-11 appearance-none rounded-xl border border-[#dcb471]/20 bg-[#04191a] px-3 text-[#fbf7ed] outline-none transition-colors focus:border-[#dcb471]/60 focus-visible:ring-2 focus-visible:ring-[#55bba8]/50';
export const INPUT_HINT_CLASS = 'text-[11px] leading-5 text-[#fbf7ed]/55';
export const SEGMENT_CLASS = 'flex rounded-xl border border-[#dcb471]/20 bg-[#04191a] p-1';
export const segmentButtonClass = (active) => `min-h-11 flex-1 rounded-lg px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55bba8] ${active ? 'border border-[#dcb471]/50 bg-[#dcb471]/15 text-[#f0ce91]' : 'text-[#fbf7ed]/55 hover:text-[#fbf7ed]/80'}`;

export const formatSignedMinutes = (value) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)} 分`;
