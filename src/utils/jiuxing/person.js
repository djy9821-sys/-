// 九星气学里按人算的部分：十二神兽与四季、年月日三柱、相性、守护本尊、某个方向哪些天走得通。
// 十二神兽与十二年四季出自唱田士始矢《スゴ運。》；类型按出生日的日柱所在旬与公历年单双定，不用书末的速查表。
import JX from './core.js';
import { CURVES as CURVE_DATA, PRINTED_DIFF } from './data.js';

const JXP = (() => {
  const mod = (n, m) => ((n % m) + m) % m;
  const BR = JX.BRANCHES;
  const STEMS = '甲乙丙丁戊己庚辛壬癸';
  const JIAZI = JX.dayNumber(2021, 1, 16); // 甲子日
  const XUN = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];
  const XUN_HEAD = [0, 10, 8, 6, 4, 2]; // 旬首地支：子戌申午辰寅
  const VOID = ['戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑']; // 旬空
  const NAMES = [['黄龙', '应龙'], ['白虎', '麒麟'], ['朱雀', '凤凰'], ['狮子', '天马'], ['青龙', '苍龙'], ['玄武', '灵龟']]; // 每旬 [阳年生, 阴年生]
  const BEAST_ELEMENT = ['土', '金', '火', '天', '木', '水'];
  const STAR_ELEMENT = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };
  const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const RANK = ['木', '火', '土', '金', '水']; // 上下次序，也是性子快慢的次序
  const SEASONS = ['春', '夏', '秋', '冬'];
  const ORDINAL = ['一', '二', '三'];

  let CURVES = [];
  let PRINTED = {};
  const loadCurves = (curves) => { CURVES = curves; };
  const loadPrinted = (printed) => { PRINTED = printed; };

  // —— 神兽与四季 ——
  const beastOfIndex = (index, year) => { const xun = Math.floor((index - 1) / 10); return NAMES[xun][year % 2 === 1 ? 1 : 0]; };
  /** 生日 → 类型。日柱序数 1–60（甲子为 1）；旬 0–5；公历年单双定阴阳（立春前出生也照公历年）。 */
  const profileOf = (y, m, d) => {
    const dn = JX.dayNumber(y, m, d);
    const info = JX.yearMonthInfo(dn, 8);
    if (!info) return null;
    const index = mod(dn - JIAZI, 60) + 1;
    const xun = Math.floor((index - 1) / 10);
    const yin = y % 2 === 1;
    return { index, pillar: STEMS[(index - 1) % 10] + BR[(index - 1) % 12], xun, yin, name: NAMES[xun][yin ? 1 : 0], element: BEAST_ELEMENT[xun], spring: mod(XUN_HEAD[xun] + (yin ? 1 : 0), 12), birthYear: info.kiYear };
  };
  /** 书末速查表查出来的名字；这个月份表上印的数与实际日柱相符（或超出表的年份）时返回 null。 */
  const printedBeastOf = (y, m, d) => {
    const printed = PRINTED[`${y}-${String(m).padStart(2, '0')}`];
    if (printed === undefined) return null;
    const sum = printed + d;
    return beastOfIndex(sum > 60 ? sum - 60 : sum, y);
  };
  /** 某个气学年在这一类里是第几段：0–11，依次为春一…冬三。 */
  const stageOf = (profile, kiYear) => mod(mod(kiYear - 4, 12) - profile.spring, 12);
  /** 某个地支落在这一类的第几段。 */
  const stageOfBranch = (profile, branch) => mod(BR.indexOf(branch) - profile.spring, 12);
  const stageName = (stage) => `${SEASONS[Math.floor(stage / 3)]}季第${ORDINAL[stage % 3]}年`;
  const stageShort = (stage) => SEASONS[Math.floor(stage / 3)] + ORDINAL[stage % 3];
  const yearMean = (xun, stage) => { const c = CURVES[xun].slice(stage * 4, stage * 4 + 4); return c.reduce((a, b) => a + b, 0) / 4; };
  const meansOf = (xun) => Array.from({ length: 12 }, (_, i) => yearMean(xun, i));
  const tierOf = (xun, stage) => { const means = meansOf(xun); const lo = Math.min(...means); const hi = Math.max(...means); const t = (means[stage] - lo) / (hi - lo); return t < 1 / 3 ? '低' : t < 2 / 3 ? '中' : '高'; };
  const trendOf = (xun, stage) => { const c = CURVES[xun]; const a = c[stage * 4]; const b = c[stage * 4 + 3]; return b - a > 6 ? '上行' : a - b > 6 ? '下行' : '平'; };
  const peakStageOf = (xun) => { const means = meansOf(xun); return means.indexOf(Math.max(...means)); };
  const troughStageOf = (xun) => { const means = meansOf(xun); return means.indexOf(Math.min(...means)); };

  // —— 年、月、日三柱 ——
  const pillarsOf = (y, m, d) => {
    const s = JX.starsOfDay(JX.dayNumber(y, m, d), 8);
    if (!s) return null;
    return { year: { branch: s.yearBranch, star: s.yearStar }, month: { branch: s.monthBranch, star: s.monthStar }, day: { branch: s.dayBranch, star: s.dayStar }, kiYear: s.kiYear };
  };
  /** 满岁。 */
  const ageOn = (ymd, onDn) => { const [y, m, d] = JX.ymdOf(onDn); return y - ymd[0] - (m < ymd[1] || (m === ymd[1] && d < ymd[2]) ? 1 : 0); };
  /** 看哪一柱：未满 6 岁看日；女未满 18、男未满 25 看月；之后看年。18–24 岁没填性别时先按年，并标出待定。 */
  const phaseOf = (age, gender) => {
    if (age < 6) return { key: 'day', unsure: false };
    if (age < 18) return { key: 'month', unsure: false };
    if (age < 25) return gender === '男' ? { key: 'month', unsure: false } : { key: 'year', unsure: gender !== '女' };
    return { key: 'year', unsure: false };
  };
  /** 生在立春前后（1–3 月）的人，前后两年的性质会混着来：返回另一年的支与星，其余月份返回 null。 */
  const neighbourYearOf = (y, m, d) => {
    if (m > 3) return null;
    const info = JX.yearMonthInfo(JX.dayNumber(y, m, d), 8);
    if (!info) return null;
    const other = info.kiYear === y ? y - 1 : y; // 立春后生的混上一年，立春前生的混当年
    return { kiYear: other, branch: BR[mod(other - 4, 12)], star: mod(11 - other - 1, 9) + 1, before: info.kiYear !== y };
  };

  // —— 相性 ——
  /** 三合：隔四位；冲：正对面。 */
  const branchRelation = (a, b) => { const gap = mod(BR.indexOf(b) - BR.indexOf(a), 12); return gap === 0 ? '同' : gap === 4 || gap === 8 ? '三合' : gap === 6 ? '冲' : null; };
  const branchPartners = (branch) => { const i = BR.indexOf(branch); return { good: [BR[mod(i + 4, 12)], BR[mod(i + 8, 12)]], bad: BR[mod(i + 6, 12)] }; };
  /** 从“我”看过去的五行关系。 */
  const starRelation = (mine, theirs) => {
    const a = STAR_ELEMENT[mine]; const b = STAR_ELEMENT[theirs];
    if (a === b) return { kind: '比和', good: true, mine: a, theirs: b };
    if (GENERATES[b] === a) return { kind: '生', toward: 'me', good: true, mine: a, theirs: b };
    if (GENERATES[a] === b) return { kind: '生', toward: 'them', good: true, mine: a, theirs: b };
    if (GENERATES[GENERATES[a]] === b) return { kind: '克', toward: 'them', good: false, mine: a, theirs: b, bridge: GENERATES[a] };
    return { kind: '克', toward: 'me', good: false, mine: a, theirs: b, bridge: GENERATES[b] };
  };
  /** 与人相处时合得来的星：五行相生或相同，不含自己（五黄算在内，这一点与择方不同）。 */
  const humanHarmonyOf = (star) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((s) => s !== star && starRelation(star, s).good);
  const humanClashOf = (star) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((s) => !starRelation(star, s).good);
  const starsOfElement = (element) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((s) => STAR_ELEMENT[s] === element);
  /** 木火土金水的上下次序：在上的理解并带着在下的。返回 'me'、'them' 或 null（同一行）。 */
  const leaderOf = (mine, theirs) => { const a = RANK.indexOf(STAR_ELEMENT[mine]); const b = RANK.indexOf(STAR_ELEMENT[theirs]); return a === b ? null : a < b ? 'me' : 'them'; };
  /** 节奏快慢：木最快，水最慢；神兽的“天”与土同。 */
  const tempoOf = (element) => ({ 木: '偏快', 火: '略快', 土: '不快不慢', 天: '不快不慢', 金: '略慢', 水: '偏慢' })[element];

  const sideOf = (person, onDn) => {
    const [y, m, d] = person.ymd;
    const pillars = pillarsOf(y, m, d); const profile = profileOf(y, m, d);
    if (!pillars || !profile) return null;
    const age = ageOn(person.ymd, onDn); const phase = phaseOf(Math.max(age, 0), person.gender);
    const used = pillars[phase.key];
    return { age, phase, pillars, profile, branch: used.branch, star: used.star };
  };
  /** 两个人：先看地支（最要紧），再看九星五行，最后看各自的神兽与对方地支。 */
  const compat = (me, them, onDn) => {
    const a = sideOf(me, onDn); const b = sideOf(them, onDn);
    if (!a || !b) return null;
    const year = JX.yearMonthInfo(onDn, 8).kiYear;
    const now = (side) => { const stage = stageOf(side.profile, year); return { stage, tier: tierOf(side.profile.xun, stage) }; };
    return {
      me: a, them: b,
      branch: branchRelation(a.branch, b.branch),
      star: starRelation(a.star, b.star),
      leader: leaderOf(a.star, b.star),
      beast: { theirsInMine: stageOfBranch(a.profile, b.branch), mineInTheirs: stageOfBranch(b.profile, a.branch) },
      now: { me: now(a), them: now(b) },
    };
  };

  // —— 守护本尊（按生年地支）与八方 ——
  const GUARDIANS = ['千手观音菩萨', '虚空藏菩萨', '虚空藏菩萨', '文殊菩萨', '普贤菩萨', '普贤菩萨', '大势至菩萨', '大日如来', '大日如来', '不动明王', '阿弥陀如来', '阿弥陀如来'];
  const guardianOf = (branch) => GUARDIANS[BR.indexOf(branch)];
  const DIRECTION_BRANCHES = { 北: '子', 东北: '丑寅', 东: '卯', 东南: '辰巳', 南: '午', 西南: '未申', 西: '酉', 西北: '戌亥' };
  const guardianOfDirection = (direction) => guardianOf(DIRECTION_BRANCHES[direction][0]);

  // —— 某个方向哪些天走得通 ——
  /**
   * from…to 之间按交节切成几段，每段给出年盘、月盘过不过；年、月都过的段里再逐日看日盘。
   * backYearOk、backMonthOk 是回程方向（正对面）在这一段的年盘、月盘：书里的办法是先挑去、回两头年月都通的月份，往返才好排。
   */
  const scanDirection = (birthStar, direction, from, to) => {
    const harmony = JX.harmonyOf(birthStar);
    const okAt = (center, dir) => harmony.includes(JX.starAt(center, dir)) && !JX.afflictionAt(center, dir);
    const okOn = (center) => okAt(center, direction);
    const back = JX.OPPOSITE[direction];
    const segments = []; const days = [];
    let dn = from;
    while (dn <= to) {
      const s = JX.starsOfDay(dn, 8);
      if (!s) break;
      const end = Math.min((s.nextTermDay ?? to + 1) - 1, to);
      const yearOk = okOn(s.yearStar); const monthOk = okOn(s.monthStar);
      segments.push({ from: dn, to: end, monthBranch: s.monthBranch, kiYear: s.kiYear, yearOk, monthOk, backYearOk: okAt(s.yearStar, back), backMonthOk: okAt(s.monthStar, back) });
      if (yearOk && monthOk) for (let day = dn; day <= end; day++) { const r = JX.judge(day, direction, birthStar, 8); if (r.pass) days.push({ dn: day, boards: r.boards }); }
      dn = end + 1;
    }
    return { segments, days };
  };
  /** 回程：返回那天朝反方向另判。nights 从 0（当天回）到 maxNights。 */
  const returnsFor = (birthStar, direction, goDn, maxNights) => {
    const back = JX.OPPOSITE[direction]; const out = [];
    for (let n = 0; n <= maxNights; n++) { const r = JX.judge(goDn + n, back, birthStar, 8); if (r && r.pass) out.push(goDn + n); }
    return out;
  };

  /** 超出住的晚数以后，最近一个能回的日子（最多再往后找到第 horizon 晚）；找不到返回 null。 */
  const nextReturnAfter = (birthStar, direction, goDn, fromNights, horizon) => {
    const back = JX.OPPOSITE[direction];
    for (let n = fromNights; n <= horizon; n++) { const r = JX.judge(goDn + n, back, birthStar, 8); if (!r) return null; if (r.pass) return goDn + n; }
    return null;
  };
  /**
   * 某个方向在一段日子里的行程：每个能去的日子，配上 maxNights 晚以内能回的日子。
   * best 是首选的回程日（优先过夜的，最早的那天；只有当天能回时才取当天），没有就是 null，这时 later 给出期限之后最近能回的一天。
   * round 是去、回都走得通的那些。
   * blocked 说明出发那个月回程方向卡在哪一盘（'年盘'、'月盘'），不卡就是 null：卡住的月份，书里不拿来往返。
   */
  const tripsOf = (birthStar, direction, from, to, maxNights) => {
    const scan = scanDirection(birthStar, direction, from, to);
    const trips = scan.days.map((day) => {
      const returns = returnsFor(birthStar, direction, day.dn, maxNights);
      const overnight = returns.filter((r) => r > day.dn);
      const best = overnight.length ? overnight[0] : returns.length ? returns[0] : null;
      const segment = scan.segments.find((seg) => seg.from <= day.dn && day.dn <= seg.to);
      const blocked = !segment.backYearOk ? '年盘' : !segment.backMonthOk ? '月盘' : null;
      return { go: day.dn, boards: day.boards, returns, best, blocked, later: best === null ? nextReturnAfter(birthStar, direction, day.dn, maxNights + 1, 60) : null };
    });
    return { segments: scan.segments, days: scan.days, trips, round: trips.filter((trip) => trip.best !== null) };
  };

  return {
    XUN, VOID, NAMES, BEAST_ELEMENT, STAR_ELEMENT, SEASONS, ORDINAL, STEMS, RANK, GENERATES,
    loadCurves, loadPrinted, profileOf, printedBeastOf, beastOfIndex, stageOf, stageOfBranch, stageName, stageShort, yearMean, meansOf, tierOf, trendOf, peakStageOf, troughStageOf,
    pillarsOf, ageOn, phaseOf, neighbourYearOf, branchRelation, branchPartners, starRelation, humanHarmonyOf, humanClashOf, starsOfElement, leaderOf, tempoOf, sideOf, compat,
    guardianOf, guardianOfDirection, DIRECTION_BRANCHES, scanDirection, returnsFor, nextReturnAfter, tripsOf,
  };
})();
JXP.loadCurves(CURVE_DATA);
JXP.loadPrinted(PRINTED_DIFF);

export default JXP;
