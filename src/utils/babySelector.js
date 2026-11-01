import { createZiweiHoroscope } from './ziweiBirth.js'; // 安星、庙旺、四化、闰月、长生都走主线同一口径（全书）

// Helper to check if a star is in a list
const hasStar = (stars, name) => stars.some(s => s.name === name);
const hasBrightness = (stars, name, levels) => stars.some(s => s.name === name && levels.includes(s.brightness));
// iztro 的宫名除「命宫」外不带「宫」字（官禄、财帛、迁移、田宅）；两种写法都认，否则三方宫位永远找不到。
const palaceOf = (horoscope, name) => horoscope.palaces.find((p) => p.name === name || `${p.name}宫` === name) ?? null;
// 按本地日期写（UTC 日期在东八区早上 8 点前会差一天）。
const localDateText = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Scoring Rules for each Type
const SCORING_RULES = {
    'leader': (horoscope) => {
        let score = 0;
        const ming = palaceOf(horoscope, '命宫');
        const guan = palaceOf(horoscope, '官禄宫');
        const cai = palaceOf(horoscope, '财帛宫');
        const qian = palaceOf(horoscope, '迁移宫');

        // 1. Major Stars (Emperor Vibe)
        if (ming && hasStar(ming.majorStars, '紫微')) score += 20;
        if (ming && hasStar(ming.majorStars, '天府')) score += 15;
        if (ming && hasBrightness(ming.majorStars, '太阳', ['庙', '旺'])) score += 15;
        if (ming && hasStar(ming.majorStars, '天相')) score += 10;

        // 2. Si Hua (Power)
        if (ming && ming.majorStars.some(s => s.mutagen === '权')) score += 25;
        if (guan && guan.majorStars.some(s => s.mutagen === '权')) score += 20;

        // 3. Aux Stars (Support)
        const sanFang = [];
        if (ming) sanFang.push(...ming.minorStars);
        if (guan) sanFang.push(...guan.minorStars);
        if (cai) sanFang.push(...cai.minorStars);
        if (qian) sanFang.push(...qian.minorStars);
        if (hasStar(sanFang, '左辅')) score += 10;
        if (hasStar(sanFang, '右弼')) score += 10;
        if (hasStar(sanFang, '天魁')) score += 5;
        if (hasStar(sanFang, '天钺')) score += 5;

        // 4. Avoid Bad Stars in Ming
        if (ming && (hasStar(ming.minorStars, '地空') || hasStar(ming.minorStars, '地劫'))) score -= 15;

        return { score, desc: '紫府坐命/百官朝拱/权禄巡逢' };
    },
    'iq': (horoscope) => {
        let score = 0;
        const ming = palaceOf(horoscope, '命宫');
        const guan = palaceOf(horoscope, '官禄宫');

        // 1. Major Stars (Intelligence)
        if (ming && hasStar(ming.majorStars, '天机')) score += 20;
        if (ming && hasStar(ming.majorStars, '天梁')) score += 15;
        if (ming && hasStar(ming.majorStars, '太阴')) score += 15;
        if (ming && hasStar(ming.majorStars, '巨门')) score += 10;

        // 2. Si Hua (Fame/Exam)
        if (ming && ming.majorStars.some(s => s.mutagen === '科')) score += 25;
        if (guan && guan.majorStars.some(s => s.mutagen === '科')) score += 20;

        // 3. Aux Stars (Literary)
        const sanFang = [];
        if (ming) sanFang.push(...ming.minorStars);
        if (guan) sanFang.push(...guan.minorStars);
        const cai = palaceOf(horoscope, '财帛宫');
        if (cai) sanFang.push(...cai.minorStars);

        if (hasStar(sanFang, '文昌')) score += 15;
        if (hasStar(sanFang, '文曲')) score += 15;
        if (hasStar(sanFang, '天魁')) score += 10; // Nobleman help

        return { score, desc: '机月同梁/阳梁昌禄/科名会照' };
    },
    'sport': (horoscope) => {
        let score = 0;
        const ming = palaceOf(horoscope, '命宫');

        // 1. Major Stars (Action/Power)
        if (ming && hasStar(ming.majorStars, '七杀')) score += 20;
        if (ming && hasStar(ming.majorStars, '破军')) score += 20;
        if (ming && hasStar(ming.majorStars, '贪狼')) score += 20;
        if (ming && hasStar(ming.majorStars, '武曲')) score += 15;

        // 2. Si Hua (Force)
        if (ming && ming.majorStars.some(s => s.mutagen === '权')) score += 20;

        // 3. Special (Explosive Power)
        if (ming && hasStar(ming.minorStars, '火星')) score += 10;
        if (ming && hasStar(ming.minorStars, '铃星')) score += 10;
        if (ming && hasStar(ming.minorStars, '擎羊')) score += 10; // Competitiveness

        return { score, desc: '杀破狼/武贪格/火贪格' };
    },
    'wealth': (horoscope) => {
        let score = 0;
        const ming = palaceOf(horoscope, '命宫');
        const cai = palaceOf(horoscope, '财帛宫');
        const tian = palaceOf(horoscope, '田宅宫');

        // 1. Major Stars (Wealth)
        if (ming && hasStar(ming.majorStars, '武曲')) score += 20;
        if (ming && hasStar(ming.majorStars, '太阴')) score += 15;
        if (ming && hasStar(ming.majorStars, '天府')) score += 15;
        if (ming && hasStar(ming.majorStars, '贪狼')) score += 10;

        // 2. Si Hua (Money Flow)
        if (ming && ming.majorStars.some(s => s.mutagen === '禄')) score += 25;
        if (cai && cai.majorStars.some(s => s.mutagen === '禄')) score += 25;
        if (ming && hasStar(ming.minorStars, '禄存')) score += 20;
        if (cai && hasStar(cai.minorStars, '禄存')) score += 20;
        if (tian && hasStar(tian.minorStars, '禄存')) score += 15;

        // 3. Special (Windfall)
        if (ming && hasStar(ming.majorStars, '贪狼') && (hasStar(ming.minorStars, '火星') || hasStar(ming.minorStars, '铃星'))) score += 30;

        // 4. Avoid Leakage
        if (cai && (hasStar(cai.minorStars, '地空') || hasStar(cai.minorStars, '地劫'))) score -= 50; // Critical hit

        return { score, desc: '武贪格/火贪格/双禄交流/财荫夹印' };
    }
};

/** 按类型给一张命盘打分（测试也用）。 */
export const scoreBabyChart = (type, horoscope) => (SCORING_RULES[type] || SCORING_RULES.leader)(horoscope);

export const findBestConceptionDates = async (type, limit = 3, today = new Date()) => {
    const results = [];
    // Scan next 180 days for Conception
    // Conception Date + 280 days = Birth Date

    // Optimization: Don't scan every single day if it's too slow. 
    // But for 180 days it's ~2000 checks. JS is fast enough.

    const scanDays = 14; // Scan 2 weeks window (User requested "today or recent few days")

    for (let i = 0; i < scanDays; i += 2) { // Step by 2 days to save time
        const conceptionDate = new Date(today);
        conceptionDate.setDate(today.getDate() + i);

        const birthDate = new Date(conceptionDate);
        birthDate.setDate(conceptionDate.getDate() + 280);

        const dateStr = localDateText(birthDate);

        // Check 12 hours (0, 2, 4 ... 22)
        for (let h = 0; h < 24; h += 2) {
            try {
                const horoscope = createZiweiHoroscope({ calendarType: 'solar', birthDate: dateStr, timeIndex: h / 2, gender: 'male' }); // Assume Male for pattern check (patterns are mostly gender neutral for these archetypes)

                const { score, desc } = scoreBabyChart(type, horoscope);

                // Calculate Rating (1-5 Stars) based on raw score
                // Raw score typically 20-60 for good charts.
                let rating = 1;
                if (score >= 50) rating = 5;
                else if (score >= 40) rating = 4;
                else if (score >= 30) rating = 3;
                else if (score >= 20) rating = 2;

                const stars = "⭐".repeat(rating);

                // Always push, then sort later.
                if (score > 0) {
                    results.push({
                        date: localDateText(conceptionDate),
                        timeIndex: h / 2, // 0-11
                        timeRange: TIME_RANGES[h / 2],
                        score,
                        rating,
                        stars,
                        desc,
                        birthDate: dateStr
                    });
                }

            } catch (e) {
                console.error(e);
            }
        }
        // 每排一张紫微盘要几十毫秒，七天八十多张一口气算完会让页面卡住好几秒；每算完一天让出一次，「正在遍历」的转圈才转得动。
        await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Sort by Score DESC
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
};

const TIME_RANGES = [
    "23:00-01:00", "01:00-03:00", "03:00-05:00", "05:00-07:00",
    "07:00-09:00", "09:00-11:00", "11:00-13:00", "13:00-15:00",
    "15:00-17:00", "17:00-19:00", "19:00-21:00", "21:00-23:00"
];
