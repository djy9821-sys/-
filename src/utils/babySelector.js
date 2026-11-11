import { createZiweiHoroscope } from './ziweiBirth.js'; // 安星、庙旺、四化、闰月、长生都走主线同一口径（全书）
import { analyzeZiweiPatterns } from './ziweiPatterns.js';

// iztro 的宫名除「命宫」外不带「宫」字（官禄、财帛、迁移、田宅）；两种写法都认，否则三方宫位永远找不到。
const palaceOf = (horoscope, name) => horoscope.palaces.find((p) => p.name === name || `${p.name}宫` === name) ?? null;
// 按本地日期写（UTC 日期在东八区早上 8 点前会差一天）。
const localDateText = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * 《紫微斗数全书》卷一「定富贵贫贱十等论」里与起居注有关的七论（原文与
 * src/data/classics/ziwei/quanshu-ding-fugui-pinjian-shideng-lun.json 逐字一致，测试核对）。
 */
export const SHIDENG_LUN = Object.freeze({
  聪明论: '如文昌文曲天相天府武曲破军三台八座左辅右弼三合拱照，主人极聪明。',
  文职论: '如文昌文曲左辅右弼天魁天钺坐命旺宫，又得三方四正科权禄拱，主为文官。',
  威勇论: '如武曲文昌擎羊七杀坐命宫，得权禄三方，又得紫微天府左右拱照，主人威勇。',
  武职论: '如武曲七杀坐命庙旺宫，又得三台八座加化权禄及天魁天钺并拱，主为武职。',
  富贵论: '如紫微天府天相禄权科太阴太阳文昌文曲左辅右弼天魁天钺守照拱冲，主大富贵。',
  贫贱论: '如擎羊陀罗廉贞七杀武曲破军天空地劫忌星三方四正守照拱冲，诸凶并犯陷地，主贫贱。',
  疾夭论: '如贪狼廉贞擎羊陀罗天空地劫火铃忌星三方守照，主疾夭；或疾厄相貌宫亦然。',
});

/** 各类型看哪几论：前面的加分，贫贱、疾夭两论合的项减分（四类都看）。 */
const LUN_OF_TYPE = Object.freeze({
  leader: ['富贵论', '文职论'],
  iq: ['聪明论', '文职论'],
  sport: ['威勇论', '武职论'],
  wealth: ['富贵论'],
});
/** 某类型加分看的几论（未知类型按帝王类）。 */
export const babyLunNames = (type) => LUN_OF_TYPE[type] ?? LUN_OF_TYPE.leader;
/** 减分看的两论。 */
export const BABY_PENALTY_LUN = Object.freeze(['贫贱论', '疾夭论']);

const AIM_OF_TYPE = Object.freeze({
  leader: '富贵论、文职论所列星曜守照',
  iq: '聪明论、文职论所列星曜守照',
  sport: '威勇论、武职论所列星曜守照',
  wealth: '富贵论所列星曜守照，兼看定富局',
});

const BRIGHT = new Set(['庙', '旺']);
const DIM = new Set(['陷', '不']);
const starsOf = (palace) => [...(palace?.majorStars ?? []), ...(palace?.minorStars ?? []), ...(palace?.adjectiveStars ?? [])];
const palaceText = (palace) => (palace.name === '命宫' ? '命宫' : `${palace.name}宫`);
const starText = (star, palace) => `${star.name}${star.brightness ? `（${star.brightness}）` : ''}在${palaceText(palace)}`;

/**
 * 把一论拆成几项盘面条件，逐项看这张盘合不合。拆法是程序的读法，不是原文逐字的定义：
 * 带「照」「冲」「四正」字样的（三方四正、守照拱冲、三合拱照、拱照、三方守照）取命、迁、财、官四宫；
 * 只说「三方」「并拱」的（威勇论「得权禄三方」、武职论「并拱」）取命、财、官三宫。
 * 「坐命」看命宫；「旺宫」「庙旺宫」看坐命那颗星的庙旺（左辅右弼、魁钺不分庙陷，就看命宫主星）；
 * 「天空」按今本作地空；「诸凶并犯陷地」——羊陀廉杀武破落陷、不得地的才算，空劫与化忌在四宫即算；
 * 「疾厄相貌宫亦然」只看疾厄宫（相貌宫一说是父母宫，不取）。
 * 文职、威勇、武职三论以「坐命」为本：命宫没坐所列之星（或落陷、不得地），这一论整论不计分；吉星落陷、不得地的不算守照。
 * @returns {{ name: string, text: string, hits: string[], need: number, seatOk: boolean|null }} seatOk 只有以坐命为本的三论才有（true/false）
 */
const checkLun = (name, horoscope) => {
  const ming = palaceOf(horoscope, '命宫');
  const siZheng = ['命宫', '迁移', '财帛', '官禄'].map((palaceName) => palaceOf(horoscope, palaceName)).filter(Boolean);
  const sanFang = siZheng.filter((palace) => palace.name !== '迁移');
  const starIn = (palaces, starName, pick = () => true) => {
    for (const palace of palaces) {
      const star = starsOf(palace).find((item) => item.name === starName && pick(item));
      if (star) return starText(star, palace);
    }
    return null;
  };
  const mutagenIn = (palaces, mutagen) => {
    for (const palace of palaces) {
      const star = starsOf(palace).find((item) => item.mutagen === mutagen);
      if (star) return `化${mutagen}（${star.name}在${palaceText(palace)}）`;
    }
    return null;
  };
  const anyIn = (palaces, names, pick) => names.map((starName) => starIn(palaces, starName, pick)).find(Boolean) ?? null;
  const seat = (names) => starsOf(ming).filter((star) => names.includes(star.name));
  const seatBright = (seated) => seated.some((star) => BRIGHT.has(star.brightness))
    || (seated.length > 0 && seated.every((star) => !star.brightness) && (ming?.majorStars ?? []).some((star) => BRIGHT.has(star.brightness)));
  const items = [];
  const add = (label, hit) => items.push(hit ? (typeof hit === 'string' ? hit : label) : null);
  // 吉星落陷、不得地的不算守照（贫贱论「诸凶并犯陷地」反过来说，吉星也要得地）
  const lit = (star) => !DIM.has(star.brightness);
  let seatOk = null;
  if (name === '聪明论') {
    ['文昌', '文曲', '天相', '天府', '武曲', '破军', '三台', '八座', '左辅', '右弼'].forEach((starName) => add(starName, starIn(siZheng, starName, lit)));
  } else if (name === '文职论') {
    const seated = seat(['文昌', '文曲', '左辅', '右弼', '天魁', '天钺']).filter(lit);
    seatOk = seated.length > 0;
    add('昌曲辅弼魁钺坐命', seatOk ? seated.map((star) => starText(star, ming)).join('、') : null);
    add('坐命旺宫', seatBright(seated) ? '坐命旺宫' : null);
    ['科', '权', '禄'].forEach((mutagen) => add(`化${mutagen}`, mutagenIn(siZheng, mutagen)));
  } else if (name === '威勇论') {
    const seated = seat(['武曲', '文昌', '擎羊', '七杀']).filter(lit);
    seatOk = seated.length > 0;
    add('武曲文昌擎羊七杀坐命', seatOk ? seated.map((star) => starText(star, ming)).join('、') : null);
    ['权', '禄'].forEach((mutagen) => add(`化${mutagen}`, mutagenIn(sanFang, mutagen)));
    add('紫微天府拱照', anyIn(siZheng, ['紫微', '天府'], lit));
    add('左右拱照', anyIn(siZheng, ['左辅', '右弼']));
  } else if (name === '武职论') {
    const seated = seat(['武曲', '七杀']).filter(lit);
    seatOk = seated.length > 0;
    add('武曲七杀坐命', seatOk ? seated.map((star) => starText(star, ming)).join('、') : null);
    add('庙旺', seated.some((star) => BRIGHT.has(star.brightness)) ? '坐命庙旺' : null);
    add('三台八座', anyIn(sanFang, ['三台', '八座']));
    ['权', '禄'].forEach((mutagen) => add(`化${mutagen}`, mutagenIn(sanFang, mutagen)));
    add('魁钺并拱', anyIn(sanFang, ['天魁', '天钺']));
  } else if (name === '富贵论') {
    ['紫微', '天府', '天相', '太阴', '太阳', '文昌', '文曲', '左辅', '右弼', '天魁', '天钺'].forEach((starName) => add(starName, starIn(siZheng, starName, lit)));
    ['禄', '权', '科'].forEach((mutagen) => add(`化${mutagen}`, mutagenIn(siZheng, mutagen)));
  } else if (name === '贫贱论') {
    ['擎羊', '陀罗', '廉贞', '七杀', '武曲', '破军'].forEach((starName) => add(starName, starIn(siZheng, starName, (star) => DIM.has(star.brightness))));
    ['地空', '地劫'].forEach((starName) => add(starName, starIn(siZheng, starName)));
    add('化忌', mutagenIn(siZheng, '忌'));
  } else if (name === '疾夭论') {
    const jie = palaceOf(horoscope, '疾厄');
    const inTriadOrJie = (starName) => starIn(siZheng, starName)
      ?? (starsOf(jie).some((star) => star.name === starName) ? `${starName}在疾厄宫` : null);
    ['贪狼', '廉贞', '擎羊', '陀罗', '地空', '地劫', '火星', '铃星'].forEach((starName) => add(starName, inTriadOrJie(starName)));
    const jieJi = starsOf(jie).find((star) => star.mutagen === '忌');
    add('化忌', mutagenIn(siZheng, '忌') ?? (jieJi ? `化忌（${jieJi.name}在疾厄宫）` : null));
  }
  return { name, text: SHIDENG_LUN[name], hits: items.filter(Boolean), need: items.length, seatOk };
};

/** 一论合了几成就得几成分：加分的几论合计满分 80（两论各 40，只看一论的满合 80），贫贱、疾夭两论满合各减 30 分。 */
const lunPoints = ({ hits, need, seatOk }, weight) => (need && seatOk !== false ? Math.round((weight * hits.length) / need) : 0);

/**
 * 按类型给一张命盘打分（测试也用）：类型对应的几论合的项加分，贫贱、疾夭合的项减分；陶朱类另按定富局，每格加 10 分。
 * 权重是程序自定的；各论的条件与合了哪些项随结果给出，起居注指令里照列。
 */
export const scoreBabyChart = (type, horoscope, patterns = null) => {
  const kind = LUN_OF_TYPE[type] ? type : 'leader';
  const good = LUN_OF_TYPE[kind].map((name) => checkLun(name, horoscope));
  const bad = BABY_PENALTY_LUN.map((name) => checkLun(name, horoscope));
  const fuJu = kind === 'wealth' ? (patterns ?? []).filter((pattern) => pattern.group === '定富局') : [];
  const score = good.reduce((sum, lun) => sum + lunPoints(lun, 80 / good.length), 0)
    - bad.reduce((sum, lun) => sum + lunPoints(lun, 30), 0)
    + fuJu.length * 10;
  return { score, aim: AIM_OF_TYPE[kind], lun: [...good, ...bad] };
};

/**
 * 星级只是分数的分档：40、30、20、10 分以上为五、四、三、两星。
 * 2027 年隔三天取一天、十二时辰共 1464 张盘抽样：四类合计五星约 1%，四星以上约 5%，三星以上约 15%，两星以上约 30%；
 * 各类高低不同（武曲类最高 37 分，到不了五星；陶朱类五星只有千分之一）——合得少就照实给低星，不按类别抬分。
 */
const ratingOf = (score) => (score >= 40 ? 5 : score >= 30 ? 4 : score >= 20 ? 3 : score >= 10 ? 2 : 1);

export const findBestConceptionDates = async (type, limit = 3, today = new Date()) => {
    const results = [];
    // 从今天起两周内、隔一天取一个受孕日（共七天），预产期按受孕日加 280 天排盘，每天看十二个时辰。
    const scanDays = 14;

    for (let i = 0; i < scanDays; i += 2) {
        const conceptionDate = new Date(today);
        conceptionDate.setDate(today.getDate() + i);

        const birthDate = new Date(conceptionDate);
        birthDate.setDate(conceptionDate.getDate() + 280);

        const dateStr = localDateText(birthDate);

        for (let h = 0; h < 24; h += 2) {
            try {
                // 性别未知，按男命排（十等论与格局的条件不分男女）
                const horoscope = createZiweiHoroscope({ calendarType: 'solar', birthDate: dateStr, timeIndex: h / 2, gender: 'male' });

                // 这张盘按《紫微斗数全书》原文核对出的格局（定富局、定贵局、定贫贱局）
                const patterns = analyzeZiweiPatterns(horoscope).map(({ name, group }) => ({ name, group }));
                const { score, aim, lun } = scoreBabyChart(type, horoscope, patterns);
                const rating = ratingOf(score);

                if (score > 0) {
                    results.push({
                        date: localDateText(conceptionDate),
                        timeIndex: h / 2, // 0-11
                        timeRange: TIME_RANGES[h / 2],
                        score,
                        rating,
                        stars: '⭐'.repeat(rating),
                        aim,
                        mingStars: (palaceOf(horoscope, '命宫')?.majorStars ?? []).map((star) => `${star.name}${star.brightness ? `（${star.brightness}）` : ''}${star.mutagen ? `化${star.mutagen}` : ''}`),
                        patterns,
                        lun: lun.map(({ name, hits, need, seatOk }) => ({ name, hits, need, seatOk })),
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

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
};

const TIME_RANGES = [
    "23:00-01:00", "01:00-03:00", "03:00-05:00", "05:00-07:00",
    "07:00-09:00", "09:00-11:00", "11:00-13:00", "13:00-15:00",
    "15:00-17:00", "17:00-19:00", "19:00-21:00", "21:00-23:00"
];
