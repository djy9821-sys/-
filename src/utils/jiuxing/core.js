// 九星历与择方：年、月、日三星，九宫飞星，五黄杀、暗剑杀、水火杀，某天某个方向走不走得通。
// 判法取自近代日本九星气学（唱田士始矢《スゴ運。》的取舍：凶方只看三种）。
// 已与该书所附 1939–2021 年逐日表（29,951 天）按日本时间逐日比对：日星、年星全同，月星只差 1964-09-07 一天（白露离午夜不到一分钟）。
import { TERMS } from './data.js';

const JX = (() => {
  const DAY_MS = 86400000;
  const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
  const STAR_NAMES = ['', '一白水星', '二黑土星', '三碧木星', '四绿木星', '五黄土星', '六白金星', '七赤金星', '八白土星', '九紫火星'];
  const DIRECTIONS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const OPPOSITE = { 北: '南', 东北: '西南', 东: '西', 东南: '西北', 南: '北', 西南: '东北', 西: '东', 西北: '东南' };
  const OFFSET = { 北: -4, 东北: 3, 东: -2, 东南: -1, 南: 4, 西南: -3, 西: 2, 西北: 1 };
  const ELEMENT = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };
  const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const mod = (n, m) => ((n % m) + m) % m;
  const wrap9 = (n) => mod(n - 1, 9) + 1;
  const dayNumber = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
  const ymdOf = (dn) => { const t = new Date(dn * DAY_MS); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };

  // —— 节 ——
  let termMinutes = [];
  const loadTerms = (terms) => { let acc = terms.base; termMinutes = terms.deltas.map((delta) => (acc += delta)); };
  const termDayAt = (k, tzHours) => Math.floor((termMinutes[k] * 60000 + tzHours * 3600000) / DAY_MS);
  const firstDay = (tzHours) => termDayAt(1, tzHours); // 1900 年立春
  const lastDay = (tzHours) => termDayAt(termMinutes.length - 1, tzHours) - 1;
  /** 年、月的支与九星：立春当天起换年，交节当天起换月。超出节气表范围返回 null。 */
  const yearMonthInfo = (dn, tzHours = 8) => {
    if (dn < firstDay(tzHours) || dn > lastDay(tzHours)) return null;
    let lo = 0; let hi = termMinutes.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (termDayAt(mid, tzHours) <= dn) lo = mid; else hi = mid - 1; }
    const k = lo;
    const monthIndex = (11 + k) % 12; // 0=寅月 … 11=丑月
    const kiYear = 1900 + Math.floor((k - 1) / 12);
    const yearStar = wrap9(11 - kiYear);
    const first = [1, 4, 7].includes(yearStar) ? 8 : [2, 5, 8].includes(yearStar) ? 2 : 5; // 寅月之星
    return { kiYear, yearStar, yearBranch: BRANCHES[mod(kiYear - 4, 12)], monthIndex, monthBranch: BRANCHES[mod(monthIndex + 2, 12)], monthStar: wrap9(first - monthIndex), isTermDay: termDayAt(k, tzHours) === dn, nextTermDay: k + 1 < termMinutes.length ? termDayAt(k + 1, tzHours) : null };
  };

  // —— 日 ——
  const JIAZI_REF = dayNumber(2021, 1, 16); // 甲子日
  const sexagenaryIndex = (dn) => mod(dn - JIAZI_REF, 60);
  const dayBranch = (dn) => BRANCHES[sexagenaryIndex(dn) % 12];
  // 阳遁顺、阴遁逆。平常在甲子日换，一段 180 天；每 4200 天（七十个甲子）置一次闰：首尾两段各 210 天，改在甲午日换，
  // 冬至的甲午起七赤顺行，夏至的甲午起三碧逆行。锚点：2020-06-20 甲午，阴遁起三碧。
  const LEAP_ANCHOR = dayNumber(2020, 6, 20);
  const dayStarInfo = (dn) => {
    const cycle = Math.floor((dn - LEAP_ANCHOR) / 4200);
    const r = mod(dn - LEAP_ANCHOR, 4200);
    let period; let offset; let atWu = false;
    if (r < 210) { period = 0; offset = r; atWu = true; } else if (r < 3990) { period = 1 + Math.floor((r - 210) / 180); offset = (r - 210) % 180; } else { period = 22; offset = r - 3990; }
    const yin = mod(cycle + period, 2) === 0;
    const base = atWu ? (yin ? 3 : 7) : (yin ? 9 : 1);
    return { star: wrap9(yin ? base - offset : base + offset), dun: yin ? '阴遁' : '阳遁', start: dn - offset };
  };
  const starsOfDay = (dn, tzHours = 8) => { const ym = yearMonthInfo(dn, tzHours); if (!ym) return null; const day = dayStarInfo(dn); return { ...ym, dayBranch: dayBranch(dn), dayStar: day.star, dun: day.dun }; };

  // —— 盘与择方 ——
  const starAt = (center, direction) => wrap9(center + OFFSET[direction]);
  const afflictionAt = (center, direction) => {
    const star = starAt(center, direction);
    if (star === 5) return '五黄杀';
    if (starAt(center, OPPOSITE[direction]) === 5) return '暗剑杀';
    if ((direction === '北' && star === 9) || (direction === '南' && star === 1)) return '水火杀';
    return null;
  };
  const related = (a, b) => ELEMENT[a] === ELEMENT[b] || GENERATES[ELEMENT[a]] === ELEMENT[b] || GENERATES[ELEMENT[b]] === ELEMENT[a];
  /** 调和星：与本命星五行相生或比和，不含本命星自身，不含五黄。 */
  const harmonyOf = (birthStar) => [1, 2, 3, 4, 6, 7, 8, 9].filter((star) => star !== birthStar && related(star, birthStar));
  const judge = (dn, direction, birthStar, tzHours = 8) => {
    const s = starsOfDay(dn, tzHours);
    if (!s) return null;
    const harmony = harmonyOf(birthStar);
    const boards = [['年', s.yearStar], ['月', s.monthStar], ['日', s.dayStar]].map(([layer, center]) => {
      const star = starAt(center, direction); const affliction = afflictionAt(center, direction); const harmonious = harmony.includes(star);
      return { layer, center, star, harmonious, affliction, pass: harmonious && !affliction };
    });
    return { direction, boards, pass: boards.every((b) => b.pass), stars: s };
  };
  const passingBoards = (direction, birthStar) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((center) => harmonyOf(birthStar).includes(starAt(center, direction)) && !afflictionAt(center, direction));
  const birthStarOf = (y, m, d, tzHours = 8) => { const info = yearMonthInfo(dayNumber(y, m, d), tzHours); return info ? info.yearStar : null; };

  // —— 方位：墨卡托图上的直线方向（等角航线），正北为 0°，顺时针 ——
  const rad = (deg) => (deg * Math.PI) / 180;
  const bearing = (lat1, lon1, lat2, lon2) => {
    const stretch = (lat) => Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2));
    let dLon = rad(lon2 - lon1);
    if (dLon > Math.PI) dLon -= 2 * Math.PI; else if (dLon < -Math.PI) dLon += 2 * Math.PI;
    return mod((Math.atan2(dLon, stretch(lat2) - stretch(lat1)) * 180) / Math.PI, 360);
  };
  // 四正各 30°，四隅各 60°。
  const SECTORS = [['北', 345, 15], ['东北', 15, 75], ['东', 75, 105], ['东南', 105, 165], ['南', 165, 195], ['西南', 195, 255], ['西', 255, 285], ['西北', 285, 345]];
  const sectorOf = (deg) => {
    const angle = mod(deg, 360);
    const hit = SECTORS.find(([, from, to]) => (from > to ? angle >= from || angle < to : angle >= from && angle < to));
    const [name, from, to] = hit;
    const edge = Math.min(mod(angle - from, 360), mod(to - angle, 360));
    return { direction: name, toEdge: edge };
  };
  const distanceKm = (lat1, lon1, lat2, lon2) => {
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  return { BRANCHES, STAR_NAMES, DIRECTIONS, OPPOSITE, loadTerms, dayNumber, ymdOf, yearMonthInfo, dayStarInfo, dayBranch, starsOfDay, starAt, afflictionAt, harmonyOf, judge, passingBoards, birthStarOf, bearing, sectorOf, distanceKm, firstDay, lastDay };
})();
JX.loadTerms(TERMS);

export default JX;
