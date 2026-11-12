// 九星气学页面的视图：不依赖 React，直接往 root 里的骨架填内容。JiuxingQixue.jsx 负责挂载。
// 页面上的说明文字都是另写的，不是书里的原话。
import JX from '../../utils/jiuxing/core.js';
import JXP from '../../utils/jiuxing/person.js';
import { CURVES } from '../../utils/jiuxing/data.js';
import { JIUXING_TEMPLATE } from './jiuxingTemplate.js';
import { GLOSS, ADVICE, DIR, GUARDIAN_GLOSS, BRANCH_TRAIT, STAR_TRAIT, CITY_GROUPS, CITIES } from './jiuxingTexts.js';

/**
 * 把页面挂到 root 上。options.hashTabs 为真时页签同步到地址栏的 #（独立成页时用）；嵌在古书派里不传，地址栏归应用的路由管。
 * 返回 { showTab, destroy }。
 */
export function mountJiuxing(root, options = {}) {
  root.innerHTML = JIUXING_TEMPLATE;

  const BR = JX.BRANCHES; const STEMS = JXP.STEMS; const SEASONS = JXP.SEASONS; const ORDINAL = JXP.ORDINAL;
  const SHORT = ['', '一白', '二黑', '三碧', '四绿', '五黄', '六白', '七赤', '八白', '九紫'];
  const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const ORDER = ['西北', '北', '东北', '西', null, '东', '西南', '南', '东南']; // 上北下南
  const TABS = ['zonglan', 'yunshi', 'fangwei', 'xiangxing', 'benming', 'yiju'];
  const PHASE_WORD = { day: '日柱', month: '月柱', year: '年柱' };

  // —— 小工具 ——
  const $ = (id) => root.querySelector('#jx-' + id);
  const svgEl = (tag, attrs, text) => { const node = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v); if (text !== undefined) node.textContent = text; return node; };
  const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };
  // options.remember 为 false 时，姓名、生日、性别不写进本机（古书派的约定：生辰只有主动存档才保存），只记方向和城市
  const PERSONAL = ['name', 'birth', 'gender', 'other-name', 'other-birth', 'other-gender'];
  const keeps = (key) => options.remember !== false || !PERSONAL.includes(key);
  const store = {
    get(key) { if (!keeps(key)) return null; try { return localStorage.getItem('jx9-' + key); } catch { return null; } },
    set(key, value) { if (!keeps(key)) return; try { localStorage.setItem('jx9-' + key, value); } catch { /* 存不了就算了 */ } },
  };
  const option = (text, value) => { const node = el('option', '', text); node.value = value; return node; };
  const mod = (n, m) => ((n % m) + m) % m;
  const pad = (n) => String(n).padStart(2, '0');
  const parseYmd = (text) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || ''); return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null; };
  const parseDn = (text) => { const ymd = parseYmd(text); return ymd ? JX.dayNumber(...ymd) : null; };
  const iso = (dn) => { const [y, m, d] = JX.ymdOf(dn); return `${y}-${pad(m)}-${pad(d)}`; };
  const label = (dn, withYear) => { const [y, m, d] = JX.ymdOf(dn); return `${withYear ? y + ' 年 ' : ''}${m} 月 ${d} 日`; };
  const shortDate = (dn) => { const [, m, d] = JX.ymdOf(dn); return `${m} 月 ${d} 日`; };
  const weekday = (dn) => '周' + WEEK[new Date(dn * 86400000).getUTCDay()];
  const todayDn = () => { const t = new Date(Date.now() + 8 * 3600000); return JX.dayNumber(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
  const ganzhi = (year) => STEMS[mod(year - 4, 10)] + BR[mod(year - 4, 12)];
  const smooth = () => (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  const starList = (stars) => stars.map((s) => SHORT[s]).join('、');

  const state = { tab: 'zonglan', sample: !store.get('birth'), otherSample: !store.get('other-birth'), direction: store.get('dir') || '西', autoDirection: !store.get('dir'), picked: null, showAll: false };
  let ME = null; // 当前这个人：生日算出来的一切
  let scans = null; // 八方的扫描结果，随生日、起始日、天数变

  const readPerson = (ymd, gender, name) => {
    if (!ymd) return null;
    const profile = JXP.profileOf(...ymd); const pillars = JXP.pillarsOf(...ymd);
    if (!profile || !pillars) return null;
    const today = todayDn(); const age = Math.max(0, JXP.ageOn(ymd, today));
    const phase = JXP.phaseOf(age, gender);
    return { ymd, name, gender, profile, pillars, age, today, thisYear: JX.yearMonthInfo(today, 8).kiYear, birthStar: pillars.year.star, phase, used: pillars[phase.key] };
  };
  const phaseWhy = (person) => `${person.age} 岁，看${PHASE_WORD[person.phase.key]}`;

  // —— 名帖 ——
  const renderHead = () => {
    const who = $('who'); const pillars = $('pillars'); const note = $('printed-note');
    who.textContent = ''; pillars.textContent = ''; note.hidden = true;
    $('sample').hidden = !state.sample;
    if (!ME) { who.append(el('p', 'hint', '请填 1900 年 2 月 5 日到 2060 年之间的公历生日。')); return; }
    const p = ME.profile;
    who.append(el('div', 'beast', p.name));
    const basis = el('div', 'basis');
    basis.append(`${ME.name || '你'}是十二神兽里的这一类。日柱 `, el('b', '', p.pillar), '，在 ', el('b', '', JXP.XUN[p.xun] + '旬'), '；', el('b', '', p.yin ? '阴年生' : '阳年生'), `，属${p.element}。每逢${BR[p.spring]}年入春。`);
    who.append(basis, el('p', 'gloss', GLOSS[p.name]));
    for (const [key, title] of [['year', '年柱 · 本命星'], ['month', '月柱'], ['day', '日柱']]) {
      const x = ME.pillars[key]; const chip = el('div', 'pillar' + (ME.phase.key === key ? ' cur' : ''));
      chip.append(el('span', 'k', title), el('span', 'b', x.branch), el('span', 's', JX.STAR_NAMES[x.star]));
      pillars.append(chip);
    }
    const printed = JXP.printedBeastOf(...ME.ymd);
    if (printed && printed !== p.name) { note.hidden = false; note.textContent = `按书末的速查表，这个生日会查成「${printed}」。那张表这个月份印的数与实际日柱对不上，这里按日柱取「${p.name}」。`; }
  };

  // —— 今年 ——
  const flagOfStage = (xun, st) => (st === JXP.peakStageOf(xun) ? '峰' : st === JXP.troughStageOf(xun) ? '谷' : null);
  const nowBlock = () => {
    const p = ME.profile; const stage = JXP.stageOf(p, ME.thisYear); const season = Math.floor(stage / 3); const flag = flagOfStage(p.xun, stage);
    const box = el('div', 'now s' + season);
    box.append(el('span', '', `今年 ${ME.thisYear}（${ganzhi(ME.thisYear)}年）`), el('span', 'stage', JXP.stageName(stage)), el('span', 'pill', `位置${JXP.tierOf(p.xun, stage)} · ${JXP.trendOf(p.xun, stage)}`));
    if (flag) box.append(el('span', 'pill', flag === '峰' ? '这十二年里最高的一年' : '这十二年里最低的一年'));
    box.append(el('p', '', ADVICE[stage]));
    return box;
  };
  const outlookText = () => {
    const p = ME.profile; const stage = JXP.stageOf(p, ME.thisYear); const peak = JXP.peakStageOf(p.xun);
    const yearOfStage = (target) => ME.thisYear + mod(target - stage, 12);
    const first = stage === peak ? '今年就是这一轮里最高的一年。' : `下一次最高的一年是 ${yearOfStage(peak)} 年（${JXP.stageShort(peak)}）。`;
    const second = stage >= 9 ? `${yearOfStage(0)} 年立春入春。` : `${yearOfStage(9)} 年立春入冬。`;
    return first + second;
  };
  const tempoText = () => {
    const starEl = JXP.STAR_ELEMENT[ME.birthStar]; const beastEl = ME.profile.element;
    const lean = (element) => (element === '木' ? 1 : element === '水' ? -1 : 0); // 书里只对最快的木、最慢的水说了早晚
    const a = lean(starEl); const b = lean(beastEl);
    let tail = '照图上的年份看就行。';
    if (a === 1 && b === 1) tail = '两样都属木，快上加快：书里说这样的人，起伏多半比图上来得早一些，差不到一年。';
    else if (a === -1 && b === -1) tail = '两样都属水：照书里的次序，起伏多半比图上来得晚一些，差不到一年。';
    else if (a * b === -1) tail = '一快一慢，书里没有说怎么折算。照图上的年份看，前后留一点余地。';
    else if (a === 1) tail = '书里说本命星属木的人，起伏可能比图上略早，差不到一年。';
    else if (a === -1) tail = '书里说本命星属水的人，起伏可能比图上略晚，差不到一年。';
    else if (b === 1) tail = '书里说神兽属木的人，起伏也偏早一些，差不到一年。';
    else if (b === -1) tail = '照书里的次序，神兽属水的人起伏偏晚一些，差不到一年。';
    return `本命星${SHORT[ME.birthStar]}属${starEl}，节奏${JXP.tempoOf(starEl)}；神兽属${beastEl}，节奏${JXP.tempoOf(beastEl)}。${tail}`;
  };

  // —— 总览 ——
  const summaryText = () => {
    const p = ME.profile; const stage = JXP.stageOf(p, ME.thisYear); const used = ME.used; const partners = JXP.branchPartners(used.branch);
    const lines = [];
    lines.push(`${ME.name ? ME.name + '：' : ''}${ME.ymd[0]} 年 ${ME.ymd[1]} 月 ${ME.ymd[2]} 日生`);
    lines.push(`神兽：${p.name}（日柱${p.pillar}，${JXP.XUN[p.xun]}旬，${p.yin ? '阴' : '阳'}年生，属${p.element}）`);
    lines.push(`三柱：年 ${ME.pillars.year.branch}·${JX.STAR_NAMES[ME.pillars.year.star]}，月 ${ME.pillars.month.branch}·${JX.STAR_NAMES[ME.pillars.month.star]}，日 ${ME.pillars.day.branch}·${JX.STAR_NAMES[ME.pillars.day.star]}`);
    lines.push(`今年 ${ME.thisYear}（${ganzhi(ME.thisYear)}年）：${JXP.stageName(stage)}，位置${JXP.tierOf(p.xun, stage)}、${JXP.trendOf(p.xun, stage)}。${ADVICE[stage]}`);
    lines.push(outlookText());
    const near = nearestDirections();
    lines.push(near.length ? `最近的行程：${near.map((n) => `${n.dir}（${DIR[n.dir].head.replace('·', '、')}）${n.trip ? `${shortDate(n.trip.go)}去、${n.trip.best === n.trip.go ? '当天' : shortDate(n.trip.best)}回` : `${shortDate(n.first)}能去，但回程不吉`}`).join('；')}。` : '从今天起 90 天内，八方都没有三盘全过的日子。');
    lines.push(`合得来：地支与${partners.good.join('、')}三合，与${partners.bad}相冲；九星合${starList(JXP.humanHarmonyOf(used.star))}。`);
    lines.push(`守护本尊：${JXP.guardianOf(ME.pillars.year.branch)}（${ME.pillars.year.branch}年生）。`);
    lines.push('按九星气学《スゴ運。》一书的方法推算，只作参考。');
    return lines.join('\n');
  };
  const maxNightsOf = () => Number($('nights').value) || 7;
  /** 从今天起 90 天内各方的情形：有去有回的排前面（按出发日），只能去的排后面。 */
  const nearestDirections = () => {
    const from = ME.today; const to = Math.min(from + 89, JX.lastDay(8)); const maxNights = maxNightsOf();
    return JX.DIRECTIONS.map((dir) => {
      const info = JXP.tripsOf(ME.birthStar, dir, from, to, maxNights);
      return info.days.length ? { dir, first: info.days[0].dn, count: info.days.length, trip: info.round[0] ?? null } : null;
    }).filter(Boolean).sort((a, b) => (a.trip ? 0 : 1) - (b.trip ? 0 : 1) || (a.trip ? a.trip.go : a.first) - (b.trip ? b.trip.go : b.first));
  };
  const renderZonglan = () => {
    for (const id of ['z-now', 'z-outlook', 'z-dir', 'z-match', 'z-guard']) $(id).textContent = '';
    $('copy-text').hidden = true; $('copy-state').textContent = '';
    if (!ME) return;
    $('z-now').append(nowBlock());
    $('z-outlook').textContent = outlookText();
    const near = nearestDirections();
    if (!near.length) $('z-dir').append(el('p', 'empty', '这 90 天里八方都没有三盘全过的日子。到“吉方位”里把天数放长再看。'));
    for (const n of near.slice(0, 4)) {
      const btn = el('button', 'next-dir' + (n.trip ? '' : ' half')); btn.type = 'button';
      const otherYear = (dn) => JX.ymdOf(dn)[0] !== JX.ymdOf(ME.today)[0];
      const when = n.trip
        ? `${label(n.trip.go, otherYear(n.trip.go))} ${weekday(n.trip.go)}去，${n.trip.best === n.trip.go ? '当天回' : `${label(n.trip.best, otherYear(n.trip.best))} ${weekday(n.trip.best)}回 · 住 ${n.trip.best - n.trip.go} 晚`}`
        : `${label(n.first, otherYear(n.first))} ${weekday(n.first)}能去，但回程不吉`;
      btn.append(el('span', 'd', n.dir), el('span', 'w', when), el('span', 'm', `${DIR[n.dir].themes} · 90 天内 ${n.count} 天能去`));
      btn.addEventListener('click', () => { setDirection(n.dir); go('fangwei'); });
      $('z-dir').append(btn);
    }
    const used = ME.used; const partners = JXP.branchPartners(used.branch); const match = $('z-match');
    const pair = (k, v) => { match.append(el('dt', '', k), el('dd', '', v)); };
    pair('三合', `${partners.good.join('、')}（最合）`); pair('相冲', `${partners.bad}（要留距离）`);
    pair('九星合', starList(JXP.humanHarmonyOf(used.star))); pair('九星不合', starList(JXP.humanClashOf(used.star)));
    pair('依据', `你的${PHASE_WORD[ME.phase.key]}：${used.branch}、${JX.STAR_NAMES[used.star]}`);
    const guardian = JXP.guardianOf(ME.pillars.year.branch);
    $('z-guard').append(el('div', 'big', guardian), el('p', '', `${ME.pillars.year.branch}年生人的本尊。${GUARDIAN_GLOSS[guardian]}`));
  };

  // —— 运势 ——
  const renderYunshi = () => {
    const scroller = $('scroller'); const next = $('next'); const pickedBox = $('picked'); const overview = $('overview'); const yaxis = $('yaxis'); const shape = $('shape'); const rounds = $('rounds');
    for (const node of [$('y-now'), $('y-tempo'), scroller, next, pickedBox, overview, yaxis, shape, rounds]) node.textContent = '';
    if (!ME) return;
    const p = ME.profile; const thisYear = ME.thisYear;
    $('y-now').append(nowBlock()); $('y-tempo').textContent = tempoText();

    // 这一类十二年的形状：各年的平均高度、最高和最低的一年
    const means = JXP.meansOf(p.xun);
    const hi = Math.max(...means); const lo = Math.min(...means);
    const peakStage = means.indexOf(hi);
    const short = JXP.stageShort;
    const flagOf = (st) => flagOfStage(p.xun, st);

    // 一句话概括这条线：最高、次高、中途的回落、最低（都由量出来的数算）
    const seconds = []; const dips = [];
    for (let i = 1; i <= 10; i++) { if (i !== peakStage && Math.abs(i - peakStage) > 1 && means[i] >= means[i - 1] && means[i] > means[i + 1] && means[i] >= hi * 0.6) seconds.push(i); }
    // 回落是局部形状：顺着每年四点的细线找谷底，归到它所在的那一年；比两侧的高处都低 8 以上才算（春一后半到秋三之间）
    const fine = CURVES[p.xun];
    for (let k = 2; k <= 35; k++) {
      if (!(fine[k] <= fine[k - 1] && fine[k] < fine[k + 1])) continue;
      const depth = Math.min(Math.max(...fine.slice(0, k)), Math.max(...fine.slice(k + 1, 40))) - fine[k];
      const st = Math.floor(k / 4);
      if (depth >= 8 && !dips.includes(st)) dips.push(st);
    }
    const lows = means.map((v, i) => [v, i]).filter(([v]) => v <= lo + 3).map(([, i]) => i).sort((a, b) => mod(a + 3, 12) - mod(b + 3, 12));
    // 连着的年份并成一段：够 minSpan 年就写“甲到乙”，不够就用顿号并列
    const spans = (list, key, minSpan) => {
      const out = [];
      for (const st of [...list].sort((a, b) => key(a) - key(b))) { const run = out[out.length - 1]; if (run && key(st) - key(run[run.length - 1]) === 1) run.push(st); else out.push([st]); }
      return out.map((run) => (run.length >= minSpan ? `${short(run[0])}到${short(run[run.length - 1])}` : run.map(short).join('、')));
    };
    const dipSpans = spans(dips, (st) => st, 2); const lowSpans = spans(lows, (st) => mod(st + 3, 12), 3);
    shape.append(el('b', '', `${p.name}这一类的线`), `：最高在${short(peakStage)}${seconds.length ? `，${seconds.map(short).join('、')}还有一个高点` : ''}${dipSpans.length ? `；${dipSpans.join('、')}${dipSpans.length > 1 ? '各' : ''}有一次回落，那一年宜放慢` : ''}；最低在${lowSpans.join('、')}。`);

    // 一生的线（大图）
    const PX = 34; const YEARS = 97; const padL = 6; const padR = 6; const top = 18; const bottom = 178; const H = bottom + 72; const W = padL + YEARS * PX + padR;
    // 纵向按六条线共同的最高点来铺（留一点顶部余量），六类之间的高矮差别保留，只去掉顶上用不到的空白
    const CEIL = Math.max(...CURVES.flat()) * 1.06;
    const xOf = (i) => padL + i * PX; const yOf = (v) => bottom - (v / CEIL) * (bottom - top);
    const g1 = lo + (hi - lo) / 3; const g2 = lo + ((hi - lo) * 2) / 3; // 低、中、高的两条分界
    const stages = Array.from({ length: YEARS }, (_, i) => JXP.stageOf(p, p.birthYear + i));
    const nowIndex = thisYear - p.birthYear;

    const axis = svgEl('svg', { width: 30, height: H, viewBox: `0 0 30 ${H}`, 'aria-hidden': 'true' });
    for (const [text, v] of [['高', (g2 + hi) / 2], ['中', (g1 + g2) / 2], ['低', (lo + g1) / 2]]) axis.append(svgEl('text', { x: 15, y: yOf(v) + 4, 'text-anchor': 'middle', class: 'axis' }, text));
    for (const v of [g1, g2]) axis.append(svgEl('line', { x1: 22, y1: yOf(v), x2: 30, y2: yOf(v), class: 'sep' }));
    yaxis.append(axis);

    const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '从出生到九十六岁的起伏线，每年标有季次、年份、干支和年龄' });
    const defs = svgEl('defs');
    const clips = [0, 1, 2, 3].map((se) => { const clip = svgEl('clipPath', { id: 'jx-clip-s' + se }); defs.append(clip); return clip; });
    svg.append(defs);
    stages.forEach((st, i) => {
      const se = Math.floor(st / 3);
      svg.append(svgEl('rect', { x: xOf(i), y: top - 8, width: PX, height: bottom - top + 8, class: 'b' + se }));
      clips[se].append(svgEl('rect', { x: xOf(i), y: 0, width: PX, height: H }));
    });
    const pickCol = svgEl('rect', { x: 0, y: top - 8, width: PX, height: H - top + 8, class: 'pickcol', visibility: 'hidden' }); svg.append(pickCol);
    const pts = [];
    stages.forEach((st, i) => CURVES[p.xun].slice(st * 4, st * 4 + 4).forEach((v, k) => pts.push([xOf(i) + PX * (k * 0.25 + 0.125), yOf(v)])));
    const f = (n) => n.toFixed(1);
    let line = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let k = 1; k < pts.length - 1; k++) line += `Q${f(pts[k][0])} ${f(pts[k][1])} ${f((pts[k][0] + pts[k + 1][0]) / 2)} ${f((pts[k][1] + pts[k + 1][1]) / 2)}`;
    const last = pts[pts.length - 1]; line += `L${f(last[0])} ${f(last[1])}`;
    const area = `M${xOf(0)} ${bottom}L${xOf(0)} ${f(pts[0][1])}${line.replace(/^M/, 'L')}L${xOf(YEARS)} ${f(last[1])}L${xOf(YEARS)} ${bottom}Z`;
    for (const se of [0, 1, 2, 3]) svg.append(svgEl('path', { d: area, class: 'a' + se, 'clip-path': `url(#jx-clip-s${se})` }));
    for (const v of [g1, g2]) svg.append(svgEl('line', { x1: xOf(0), y1: yOf(v), x2: xOf(YEARS), y2: yOf(v), class: 'guide' }));
    stages.forEach((st, i) => { if (st % 3 === 0 && i > 0) svg.append(svgEl('line', { x1: xOf(i), y1: top - 8, x2: xOf(i), y2: H - 4, class: 'sep' })); });
    svg.append(svgEl('line', { x1: xOf(0), y1: bottom, x2: xOf(YEARS), y2: bottom, class: 'sep' }));
    svg.append(svgEl('path', { d: line, class: 'curve' }));
    if (nowIndex >= 0 && nowIndex < YEARS) {
      // 今年正好是峰或谷时，字并进“今年”的标签里，免得压在竖线上；靠近右边缘时标签改画在竖线左侧
      const x = xOf(nowIndex) + PX / 2; const nowFlag = flagOf(stages[nowIndex]); const nearEnd = nowIndex >= YEARS - 3;
      svg.append(svgEl('line', { x1: x, y1: top - 8, x2: x, y2: bottom, class: 'nowline' }));
      svg.append(svgEl('text', { x: nearEnd ? x - 6 : x + 6, y: top + 2, 'text-anchor': nearEnd ? 'end' : 'start', class: 'nowtext' }, nowFlag ? `今年 · ${nowFlag}` : '今年'));
    }
    stages.forEach((st, i) => {
      const se = Math.floor(st / 3); const cx = xOf(i) + PX / 2; const c = CURVES[p.xun]; const cy = yOf((c[st * 4 + 1] + c[st * 4 + 2]) / 2);
      const flag = flagOf(st); const isNow = i === nowIndex;
      svg.append(svgEl('circle', { cx, cy, r: isNow ? 5.5 : flag ? 4.5 : 2.5, class: 'dot' + (isNow ? ' now' : '') }));
      if (flag && !isNow) svg.append(svgEl('text', { x: cx, y: cy - 10, 'text-anchor': 'middle', class: 'mark' }, flag));
      const year = p.birthYear + i;
      svg.append(svgEl('text', { x: cx, y: bottom + 18, 'text-anchor': 'middle', class: 'lab-stage t' + se }, short(st)));
      svg.append(svgEl('text', { x: cx, y: bottom + 33, 'text-anchor': 'middle', class: 'lab-year' }, String(year)));
      svg.append(svgEl('text', { x: cx, y: bottom + 48, 'text-anchor': 'middle', class: 'lab-gz' }, ganzhi(year)));
      svg.append(svgEl('text', { x: cx, y: bottom + 63, 'text-anchor': 'middle', class: 'lab-age' }, `${i}岁`));
    });
    const showPick = (i) => {
      state.picked = i; const year = p.birthYear + i; const st = stages[i]; const flag = flagOf(st);
      pickCol.setAttribute('x', xOf(i)); pickCol.setAttribute('visibility', 'visible');
      pickedBox.textContent = '';
      pickedBox.append(el('b', '', `${year} 年（${ganzhi(year)}，${i} 岁）`), '：', el('b', 'c' + Math.floor(st / 3), JXP.stageName(st)), `，位置${JXP.tierOf(p.xun, st)}，${JXP.trendOf(p.xun, st)}。${flag === '峰' ? '这十二年里最高的一年。' : flag === '谷' ? '这十二年里最低的一年。' : ''}${ADVICE[st]}`);
    };
    stages.forEach((st, i) => { const hit = svgEl('rect', { x: xOf(i), y: 0, width: PX, height: H, class: 'hit' }); hit.addEventListener('click', () => showPick(i)); svg.append(hit); });
    scroller.append(svg);

    // 一生总览：点哪里，大图就跳到哪里；方框是大图当前露出来的那一段
    const U = 10; const OH = 46;
    const mini = svgEl('svg', { viewBox: `0 0 ${YEARS * U} ${OH}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    let miniLine = '';
    stages.forEach((st, i) => {
      mini.append(svgEl('rect', { x: i * U, y: 0, width: U, height: OH, class: 'b' + Math.floor(st / 3) }));
      CURVES[p.xun].slice(st * 4, st * 4 + 4).forEach((v, k) => { miniLine += `${miniLine ? 'L' : 'M'}${f(i * U + U * (k * 0.25 + 0.125))} ${f(OH - 4 - (v / CEIL) * (OH - 8))}`; });
    });
    mini.append(svgEl('path', { d: miniLine, class: 'ov-line' }));
    if (nowIndex >= 0 && nowIndex < YEARS) mini.append(svgEl('line', { x1: nowIndex * U + U / 2, y1: 0, x2: nowIndex * U + U / 2, y2: OH, class: 'ov-now' }));
    const win = svgEl('rect', { x: 0, y: 1.5, width: U, height: OH - 3, class: 'win' }); mini.append(win);
    overview.append(mini);
    const updateWindow = () => { const total = scroller.scrollWidth || W; win.setAttribute('x', f((scroller.scrollLeft / total) * YEARS * U)); win.setAttribute('width', f(Math.max(U, (scroller.clientWidth / total) * YEARS * U))); };
    const centerOn = (i) => { scroller.scrollLeft = Math.max(0, xOf(i) + PX / 2 - scroller.clientWidth / 2); updateWindow(); };
    scroller.onscroll = updateWindow;
    overview.onclick = (event) => { const box = overview.getBoundingClientRect(); const i = Math.min(YEARS - 1, Math.max(0, Math.floor(((event.clientX - box.left) / box.width) * YEARS))); centerOn(i); showPick(i); };
    overview.onkeydown = (event) => { if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return; event.preventDefault(); scroller.scrollLeft += (event.key === 'ArrowRight' ? 1 : -1) * PX * 12; updateWindow(); };
    const startAt = nowIndex >= 0 && nowIndex < YEARS ? nowIndex : 0;
    showPick(state.picked !== null && state.picked < YEARS ? state.picked : startAt);
    requestAnimationFrame(() => centerOn(startAt));

    // 一行：某一年的年份干支、年龄、季次、位置
    const rowOf = (i, current) => {
      const year = p.birthYear + i; const st = JXP.stageOf(p, year); const se = Math.floor(st / 3); const flag = flagOf(st);
      const item = el('div', 'yr-row' + (current ? ' cur' : ''));
      const level = el('span', 'lv', `位置${JXP.tierOf(p.xun, st)} · ${JXP.trendOf(p.xun, st)}`);
      if (flag) level.append(el('span', 'flag', flag === '峰' ? '这十二年最高' : '这十二年最低'));
      item.append(el('span', 'yr', `${year} ${ganzhi(year)}`), el('span', 'age', `${i} 岁`), el('span', 'st c' + se, short(st)), level);
      return item;
    };
    for (let k = 0; k < 12; k++) next.append(rowOf(nowIndex + k, k === 0));
    const openRound = nowIndex >= 0 && nowIndex < 96 ? Math.floor(nowIndex / 12) : 0;
    for (let r = 0; r < 8; r++) {
      const from = r * 12; const to = from + 11;
      const group = el('details'); group.open = r === openRound;
      const title = el('summary', '', `第 ${r + 1} 个十二年`); title.append(el('span', '', `${from}–${to} 岁 · ${p.birthYear + from}–${p.birthYear + to} 年`));
      const list = el('div', 'list');
      for (let i = from; i <= to; i++) list.append(rowOf(i, i === nowIndex));
      group.append(title, list); rounds.append(group);
    }
  };

  // —— 吉方位 ——
  const LIMIT = 30;
  const rangeOf = () => { const from = parseDn($('from').value); if (from === null || !JX.starsOfDay(from, 8)) return null; return [from, Math.min(from + Number($('span').value) - 1, JX.lastDay(8))]; };
  const whyNone = (scan) => (scan.segments.every((s) => !s.yearOk) ? '年盘不过' : scan.segments.every((s) => !s.yearOk || !s.monthOk) ? '月盘不过' : '日盘都不过');
  const homePoint = () => {
    const value = $('home').value;
    root.querySelectorAll('.custom-home').forEach((node) => { node.hidden = value !== '*'; });
    if (value !== '*') { const city = CITIES.find(([name]) => name === value); return city ? [city[1], city[2]] : null; }
    const lat = Number($('home-lat').value); const lon = Number($('home-lon').value);
    return $('home-lat').value !== '' && $('home-lon').value !== '' && Math.abs(lat) <= 85 && Math.abs(lon) <= 180 ? [lat, lon] : null;
  };
  const destPoint = () => {
    const value = $('dest').value;
    root.querySelectorAll('.custom-dest').forEach((node) => { node.hidden = value !== '*'; });
    if (value !== '*') { const city = CITIES.find(([name]) => name === value); return city ? [city[1], city[2]] : null; }
    const lat = Number($('dest-lat').value); const lon = Number($('dest-lon').value);
    return $('dest-lat').value !== '' && $('dest-lon').value !== '' && Math.abs(lat) <= 85 && Math.abs(lon) <= 180 ? [lat, lon] : null;
  };

  const renderCompass = () => {
    const box = $('compass'); box.textContent = ''; $('compass-note').textContent = ''; scans = null;
    const range = rangeOf();
    if (!ME || !range) { box.append(el('p', 'empty', '先填生日和起始日期。')); return; }
    const maxNights = maxNightsOf(); const md = (dn) => `${JX.ymdOf(dn)[1]}月${JX.ymdOf(dn)[2]}日`;
    scans = Object.fromEntries(JX.DIRECTIONS.map((dir) => [dir, JXP.tripsOf(ME.birthStar, dir, range[0], range[1], maxNights)]));
    for (const dir of ORDER) {
      if (!dir) { const mid = el('div', 'cz mid'); mid.append(el('span', 'head', '本命星'), el('span', 'name', SHORT[ME.birthStar]), el('span', 'head', '调和 ' + starList(JX.harmonyOf(ME.birthStar)))); box.append(mid); continue; }
      const scan = scans[dir]; const n = scan.days.length; const first = scan.round[0];
      const btn = el('button', 'cz' + (first ? ' pass' : n ? ' half' : '')); btn.type = 'button'; btn.setAttribute('aria-pressed', String(dir === state.direction));
      btn.append(el('span', 'name', dir), el('span', 'head', DIR[dir].head), el('span', 'count', n ? `${n} 天能去` : '没有'));
      if (first) {
        // 最近一趟：哪天去、哪天回
        const goLine = el('span', 'next', '去 '); goLine.append(el('b', '', md(first.go)));
        const backLine = el('span', 'next', '回 '); backLine.append(el('b', '', first.best === first.go ? '当天' : md(first.best)));
        btn.append(goLine, backLine);
      } else btn.append(el('span', 'next', !n ? whyNone(scan) : scan.trips.every((trip) => trip.blocked) ? '回程方向不通' : `${maxNights} 晚内回不来`));
      btn.addEventListener('click', () => setDirection(dir));
      box.append(btn);
    }
    const open = JX.DIRECTIONS.filter((dir) => scans[dir].days.length).length; const round = JX.DIRECTIONS.filter((dir) => scans[dir].round.length).length;
    $('compass-note').textContent = !open ? '这段时间里八方都没有三盘全过的日子，把查的天数放长再看。'
      : `这段时间里，八方有 ${open} 方能去${round === open ? `，${maxNights} 晚内都回得来` : `，其中 ${round} 方 ${maxNights} 晚内回得来`}。格子里是最近的一趟；点一格，下面列出每一趟哪天去、哪天回。`;
  };

  const renderDirection = () => {
    const dir = state.direction; const box = $('dir-detail'); const title = $('dir-title'); const meaning = $('dir-meaning');
    box.textContent = ''; title.textContent = ''; meaning.textContent = ''; $('dir-places').textContent = ''; $('places-title').textContent = ''; $('places-note').textContent = '';
    title.append(el('span', 'dir-big', dir), DIR[dir].themes);
    meaning.append(`这一方${DIR[dir].air}。按八尊的传统配法，守这一方的是`, el('b', '', JXP.guardianOfDirection(dir)), `，也就是${JXP.DIRECTION_BRANCHES[dir].split('').join('、')}年生人的本尊。`);
    if (!ME || !scans) return;
    const scan = scans[dir]; const back = JX.OPPOSITE[dir]; const maxNights = maxNightsOf();
    const seg = el('div', 'seg');
    const firstYear = JX.ymdOf(scan.segments[0].from)[0];
    // 年盘不过的那一年不必逐月列，并成一条
    const groups = [];
    for (const s of scan.segments) { const last = groups[groups.length - 1]; if (last && !s.yearOk && !last.yearOk && last.kiYear === s.kiYear) last.to = s.to; else groups.push({ ...s }); }
    for (const g of groups) {
      const since = `${label(g.from, JX.ymdOf(g.from)[0] !== firstYear)}起`;
      const outOk = g.yearOk && g.monthOk; const backOk = g.backYearOk && g.backMonthOk;
      seg.append(el('span', 'pill ' + (outOk && backOk ? 'ok' : outOk ? 'warn' : 'bad'), !g.yearOk ? `${since} ${ganzhi(g.kiYear)}年：年盘不过` : !g.monthOk ? `${since} ${g.monthBranch}月：月盘不过` : backOk ? `${since} ${g.monthBranch}月：去、回都通` : `${since} ${g.monthBranch}月：只通去程`));
    }
    box.append(seg);
    if (!scan.days.length) { box.append(el('p', 'empty', `这段时间里，${dir}方没有三盘都过的日子。把查的天数放长，或者换一个方向。`)); }
    else {
      const otherYear = (dn) => JX.ymdOf(dn)[0] !== firstYear;
      const stay = (trip, day) => (day === trip.go ? '当天' : `${day - trip.go} 晚`);
      const tripRow = (trip) => {
        const row = el('div', 'trip');
        const goLeg = el('div', 'leg');
        const date = el('button', 'date', `${label(trip.go, true)} ${weekday(trip.go)}`); date.type = 'button';
        date.addEventListener('click', () => { $('day').value = iso(trip.go); renderDay(); $('h-day').scrollIntoView({ behavior: smooth(), block: 'start' }); });
        goLeg.append(el('span', 'leg-tag is-go', '去'), date, el('span', 'meta', `朝${dir}，临 年${SHORT[trip.boards[0].star]} · 月${SHORT[trip.boards[1].star]} · 日${SHORT[trip.boards[2].star]}`));
        const backLeg = el('div', 'leg');
        if (trip.best !== null) {
          backLeg.append(el('span', 'leg-tag is-back', '回'), el('b', '', `${label(trip.best, otherYear(trip.best))} ${weekday(trip.best)}`), el('span', 'meta', trip.best === trip.go ? '当天回；书里说至少在那边小睡一会儿' : `住 ${trip.best - trip.go} 晚`));
          const others = trip.returns.filter((day) => day !== trip.best);
          if (others.length) backLeg.append(el('span', 'meta', `也可以 ${others.map((day) => `${shortDate(day)}（${stay(trip, day)}）`).join('、')}回`));
        } else {
          const wait = trip.later !== null ? `最早要到 ${label(trip.later, otherYear(trip.later))} ${weekday(trip.later)}才能回，得住 ${trip.later - trip.go} 晚` : `往后 60 天都没有能朝${back}回的日子`;
          backLeg.append(el('span', 'leg-tag is-none', '回'), el('span', 'meta', trip.blocked ? `这个月朝${back}的${trip.blocked}不过，回程不吉。书里不取这样的日子往返；${wait}。` : `${maxNights} 晚内没有能朝${back}回的日子；${wait}。`));
        }
        row.append(goLeg, backLeg);
        return row;
      };
      const round = scan.round; const oneWay = scan.trips.filter((trip) => trip.best === null);
      box.append(el('p', 'hint', `书里的规矩是去、回两头都要吉：去程看出发那天朝${dir}，回程另看返回那天朝${back}。所以先挑上面标着“去、回都通”的月份，那样的月份里隔两三天就有能回的日子；标着“只通去程”的月份，朝${back}的年盘或月盘不过，书里不拿来往返。点去程的日期看那天的三张盘。`));
      if (round.length) {
        box.append(el('h3', '', `去、回都走得通的行程：${round.length} 个出发日`));
        const list = el('div', 'list');
        for (const trip of state.showAll ? round : round.slice(0, LIMIT)) list.append(tripRow(trip));
        box.append(list);
        if (!state.showAll && round.length > LIMIT) { const more = el('button', 'more', `再看其余 ${round.length - LIMIT} 个出发日`); more.type = 'button'; more.addEventListener('click', () => { state.showAll = true; renderDirection(); }); box.append(more); }
      } else box.append(el('p', 'empty', oneWay.every((trip) => trip.blocked)
        ? `这段时间有 ${scan.days.length} 天能朝${dir}去，但回程要朝${back}，而${back}方这段时间的年盘或月盘不过。书里的规矩是去、回两头都要吉，这样的月份不拿来往返：换一个方向，或者把查的天数放长，找“去、回都通”的月份。`
        : `这段时间有 ${scan.days.length} 天能朝${dir}去，但 ${maxNights} 晚内都没有能朝${back}回的日子。把“最多住几晚”放长，或者看下面每个日子最早能回的一天。`));
      if (oneWay.length) {
        const fold = el('details', 'oneway'); fold.open = !round.length;
        const title = el('summary', '', oneWay.every((trip) => trip.blocked) ? '只通去程的日子（书里不拿来往返）' : `能去、但 ${maxNights} 晚内回不来的日子`); title.append(el('span', '', `${oneWay.length} 天`)); fold.append(title);
        const list = el('div', 'list'); for (const trip of oneWay.slice(0, LIMIT)) list.append(tripRow(trip)); fold.append(list);
        box.append(fold);
      }
    }
    // 从家出发，这个方向上有哪些地方
    const home = homePoint();
    if (!home) return;
    const homeName = $('home').value === '*' ? '你填的位置' : $('home').value;
    $('places-title').textContent = `从${homeName}往${dir}，有哪些地方`;
    const hits = CITIES.map(([name, lat, lon]) => {
      if (Math.abs(lat - home[0]) < 1e-6 && Math.abs(lon - home[1]) < 1e-6) return null;
      const sector = JX.sectorOf(JX.bearing(home[0], home[1], lat, lon));
      return sector.direction === dir ? { name, km: JX.distanceKm(home[0], home[1], lat, lon), edge: sector.toEdge } : null;
    }).filter(Boolean).sort((a, b) => a.km - b.km);
    if (!hits.length) { $('places-note').textContent = '内置的城市里，没有落在这个方向上的。可以在下面“目的地在我家的哪个方向”里自己量。'; return; }
    for (const h of hits.slice(0, 18)) $('dir-places').append(el('span', 'chip' + (h.edge < 5 || h.km < 100 ? ' near' : ''), `${h.name} ${Math.round(h.km)} 公里${h.edge < 5 ? ' · 靠近分界' : ''}${h.km < 100 ? ' · 不足百公里' : ''}`));
    $('places-note').textContent = `${hits.length > 18 ? `由近到远先列 18 处，共 ${hits.length} 处。` : ''}按市中心的约略坐标量。标了“靠近分界”的，离隔壁方向不到 5°，不够稳。`;
  };

  const reasonOf = (board) => (board.affliction ? `${board.layer}盘犯${board.affliction}` : board.harmonious ? null : `${board.layer}盘临${SHORT[board.star]}`);
  const renderDay = () => {
    const dn = parseDn($('day').value);
    const s = dn === null ? null : JX.starsOfDay(dn, 8);
    const boards = $('boards'); const dirs = $('dirs'); const why = $('why'); const line = $('day-line');
    boards.textContent = ''; dirs.textContent = ''; why.textContent = ''; line.textContent = '';
    if (!s || !ME) { line.textContent = s ? '先填生日。' : '这一天超出了可算的范围（1900 年立春至 2060 年底）。'; return; }
    line.append(el('b', '', `${label(dn, true)} ${weekday(dn)}`), ` · 年 ${s.yearBranch} ${SHORT[s.yearStar]} · 月 ${s.monthBranch} ${SHORT[s.monthStar]}${s.isTermDay ? '（今日交节）' : ''} · 日 ${s.dayBranch} ${SHORT[s.dayStar]}（${s.dun}）`);
    const harmony = JX.harmonyOf(ME.birthStar);
    for (const [layer, center] of [['年', s.yearStar], ['月', s.monthStar], ['日', s.dayStar]]) {
      const board = el('div', 'board');
      const title = el('div', 'board-title'); title.append(el('b', '', `${layer}盘`), el('span', '', `${SHORT[center]}入中`)); board.append(title);
      const grid = el('div', 'grid9');
      for (const dir of ORDER) {
        if (!dir) { const c = el('div', 'cell center'); c.append(el('span', 'dir', '中'), el('span', 'num', NUM[center])); grid.append(c); continue; }
        const star = JX.starAt(center, dir); const aff = JX.afflictionAt(center, dir);
        const c = el('div', 'cell ' + (aff ? 'aff' : harmony.includes(star) ? 'ok' : 'dull') + (dir === state.direction ? ' sel' : ''));
        c.title = `${dir}：${SHORT[star]}${aff ? '，' + aff : ''}`;
        c.append(el('span', 'dir', dir), el('span', 'num', NUM[star]));
        if (aff) c.append(el('span', 'aff-mark', aff.slice(0, 2)));
        grid.append(c);
      }
      board.append(grid); boards.append(board);
    }
    for (const dir of JX.DIRECTIONS) {
      const r = JX.judge(dn, dir, ME.birthStar, 8);
      const btn = el('button', 'dir-btn' + (r.pass ? ' pass' : '')); btn.type = 'button'; btn.setAttribute('aria-pressed', String(dir === state.direction));
      btn.append(el('span', 'name', dir), el('span', 'state', r.pass ? '三盘都过' : r.boards.map(reasonOf).filter(Boolean).join('，')));
      btn.addEventListener('click', () => setDirection(dir));
      dirs.append(btn);
    }
    const chosen = JX.judge(dn, state.direction, ME.birthStar, 8);
    for (const b of chosen.boards) {
      const li = el('li');
      li.append(el('b', '', `${b.layer}盘`), `${SHORT[b.center]}入中，${state.direction}方临${SHORT[b.star]}`);
      li.append(el('span', 'pill ' + (b.pass ? 'ok' : 'bad'), b.affliction ? b.affliction : b.harmonious ? '调和' : '不是调和星'));
      why.append(li);
    }
    if (chosen.pass) {
      const back = JX.OPPOSITE[state.direction]; const maxNights = maxNightsOf();
      const returns = JXP.returnsFor(ME.birthStar, state.direction, dn, maxNights);
      const later = returns.length ? null : JXP.nextReturnAfter(ME.birthStar, state.direction, dn, maxNights + 1, 60);
      const li = el('li');
      li.append(el('b', '', '回程'), returns.length
        ? `这天朝${state.direction}去，回来要朝${back}：${returns.map((day) => `${shortDate(day)} ${weekday(day)}（${day === dn ? '当天' : day - dn + ' 晚'}）`).join('、')}能回。`
        : later !== null ? `这天朝${state.direction}去，${maxNights} 晚内没有能朝${back}回的日子；最近是 ${shortDate(later)} ${weekday(later)}，要住 ${later - dn} 晚。` : `这天朝${state.direction}去，往后 60 天都没有能朝${back}回的日子。`);
      why.append(li);
    }
  };

  let measured = null;
  const renderBearing = () => {
    const out = $('bearing-out'); const use = $('bearing-use'); out.textContent = ''; measured = null; use.hidden = true;
    const a = homePoint(); const b = destPoint();
    if (!a || !b) { out.append(el('span', 'hint', '填好家和目的地。')); return; }
    if (Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) { out.append(el('span', 'hint', '两处是同一个地方。')); return; }
    const deg = JX.bearing(a[0], a[1], b[0], b[1]); const sector = JX.sectorOf(deg); const km = JX.distanceKm(a[0], a[1], b[0], b[1]);
    measured = sector.direction;
    out.append('目的地在家的 ', el('b', '', sector.direction), ` 方，${deg.toFixed(1)}°，直线约 ${km < 20 ? km.toFixed(1) : Math.round(km)} 公里。 `);
    out.append(el('span', 'pill ' + (sector.toEdge < 5 ? 'warn' : 'ok'), sector.toEdge < 5 ? `离分界线只有 ${sector.toEdge.toFixed(1)}°，方向可能算到隔壁` : `离分界线 ${sector.toEdge.toFixed(1)}°`));
    use.hidden = false; use.textContent = `按${sector.direction}方查日子`;
  };

  const renderRules = () => {
    const list = $('rules'); list.textContent = '';
    const add = (text) => list.append(el('li', '', text));
    if (ME) {
      const stage = JXP.stageOf(ME.profile, ME.thisYear); const season = Math.floor(stage / 3); const where = JXP.stageShort(stage);
      add(season === 1 || season === 2 ? `你今年在${where}。书里说运势高的时候择方的效果更强，夏、秋适合走远一些。` : season === 3 ? `你今年在${where}。书里说冬天意外多，不宜走太远，近处为主。` : `你今年在${where}。书里说走远路以夏、秋为主，现在先从近处走起。`);
    }
    add('去、回两头都要吉，这是书里的铁则：回程要按返回那天、朝反方向另查。办法是先挑月份，去的方向和回的方向在年盘、月盘上都通，这个月里去和回的日子就都好找；跨过交节或立春，要重新查。');
    add('不得已朝不好的方向走了，书里的补救是事后尽早去一趟吉方位，把它抵掉；远行要提前查，不好就把行程往前或往后挪。');
    add('一个月去一次就够，不必天天看方位。');
    add('先从近处试。要效果明显，得走出平时的生活圈，书里举的尺度是离家一百公里以上；走得越远，作用越强。');
    add('到了要住一晚。实在住不了，在那边小睡一会儿也算。');
    add('尽量往那个方向的正中走，别压着分界线。');
    add('老往一个方向跑的，偶尔往对面走一趟，把方位用匀。');
    add('求财取西，是因为这一派以西主钱财。这里查的只是按这套条件哪天、哪边走得通，查不出开奖号码，也不会改变中奖的概率。');
  };

  const renderFangwei = () => { renderCompass(); renderDirection(); renderDay(); renderBearing(); renderRules(); };
  const setDirection = (dir) => {
    state.direction = dir; state.autoDirection = false; state.showAll = false; store.set('dir', dir);
    if (state.tab !== 'fangwei') { dirty.add('fangwei'); return; }
    root.querySelectorAll('#jx-compass .cz[aria-pressed]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.querySelector('.name').textContent === dir)));
    renderDirection(); renderDay();
  };

  // —— 相性 ——
  const readOther = () => readPerson(parseYmd($('other-birth').value), $('other-gender').value, $('other-name').value.trim());
  const seasonWord = (stage) => `${JXP.stageShort(stage)}`;
  const renderXiangxing = () => {
    const base = $('x-base'); const pairBox = $('x-pair'); base.textContent = ''; pairBox.textContent = ''; $('x-base-note').textContent = '';
    $('other-sample').hidden = !state.otherSample;
    if (!ME) return;
    const used = ME.used; const partners = JXP.branchPartners(used.branch);
    const put = (k, v) => { base.append(el('dt', '', k), el('dd', '', v)); };
    put('三合（最合）', partners.good.join('、')); put('相冲（留距离）', partners.bad);
    put('九星合', starList(JXP.humanHarmonyOf(used.star))); put('九星不合', starList(JXP.humanClashOf(used.star)));
    $('x-base-note').textContent = `看的是你的${PHASE_WORD[ME.phase.key]}（${phaseWhy(ME)}）：${used.branch}、${JX.STAR_NAMES[used.star]}。${ME.phase.unsure ? '18 到 24 岁要分男女：女看年柱，男看月柱；没填性别，先按年柱。' : ''}地支按年看时以立春为界，和春节换的生肖偶尔差一年。同看年支的两个人，差 4 岁、8 岁多半三合，差 6 岁多半相冲。`;

    const other = readOther();
    if (!other) { pairBox.append(el('p', 'empty', '填对方的公历生日（1900 年 2 月 5 日到 2060 年之间）。')); return; }
    const r = JXP.compat({ ymd: ME.ymd, gender: ME.gender }, { ymd: other.ymd, gender: other.gender }, ME.today);
    const meName = ME.name || '你'; const otherName = other.name || '对方';
    const vs = el('div', 'vs');
    for (const [who, person] of [[meName, ME], [otherName, other]]) {
      const side = el('div', 'side');
      side.append(el('span', 't', who), el('span', 'n', person.profile.name), el('span', 'u', `${PHASE_WORD[person.phase.key]}：${person.used.branch} · ${JX.STAR_NAMES[person.used.star]}`), el('span', 't', phaseWhy(person) + (person.phase.unsure ? '（没填性别，先按年柱）' : '')));
      vs.append(side);
    }
    pairBox.append(vs);

    // 总的一句：地支为主，九星其次
    const branchWord = r.branch === '三合' ? '三合' : r.branch === '冲' ? '相冲' : r.branch === '同' ? '同支' : '不合不冲';
    const starWord = r.star.kind === '比和' ? '比和' : r.star.kind === '生' ? '相生' : '相克';
    const verdict = el('p', 'verdict');
    verdict.append(`地支${branchWord}，九星${starWord}。`);
    verdict.append(el('span', 'pill ' + (r.branch === '三合' ? 'ok' : r.branch === '冲' ? 'bad' : r.star.good ? 'ok' : 'warn'), r.branch === '三合' ? '以地支为主：合' : r.branch === '冲' ? '以地支为主：不合，宜留距离' : r.star.good ? '地支上没有特别的说法，看九星：合' : '地支上没有特别的说法，看九星：有相克'));
    pairBox.append(verdict);

    // ① 地支
    const a = r.me.branch; const b = r.them.branch;
    const rule1 = el('div', 'rule'); const h1 = el('h3', '', '地支'); h1.append(el('span', 'weight', '最要紧'), el('span', 'pill ' + (r.branch === '三合' ? 'ok' : r.branch === '冲' ? 'bad' : ''), `${a} 与 ${b}：${branchWord}`)); rule1.append(h1);
    if (r.branch === '三合') {
      const third = JXP.branchPartners(a).good.find((x) => x !== b);
      rule1.append(el('p', '', `${a}与${b}隔四位，是三合，最合的一种。书里说三合的作用强，初见面有时反而会吵一架，之后多半越处越好。再有一位${third}的人，三支凑齐，叫三合会局。`));
    }
    else if (r.branch === '冲') {
      rule1.append(el('p', '', `${a}与${b}正对面，是冲。书里的办法有三条：尊重彼此的意见和自由，不去干涉对方；必要时中间放一个第三人；真到要二选一的时候，听眼下运势高的那一方。`));
      const mine = r.now.me; const theirs = r.now.them; const rank = { 低: 0, 中: 1, 高: 2 };
      rule1.append(el('p', '', rank[mine.tier] === rank[theirs.tier]
        ? `眼下${meName}在${seasonWord(mine.stage)}，${otherName}在${seasonWord(theirs.stage)}，位置都是${mine.tier}，高低相当，这一条用不上。`
        : `眼下${meName}在${seasonWord(mine.stage)}（位置${mine.tier}），${otherName}在${seasonWord(theirs.stage)}（位置${theirs.tier}）。照书里的说法，这时候听${rank[mine.tier] > rank[theirs.tier] ? meName : otherName}的。`));
    } else if (r.branch === '同') rule1.append(el('p', '', `两人同是${a}。书里只把三合算作合、冲算作不合，同支没有归到哪一边。`));
    else rule1.append(el('p', '', `${a}与${b}既不是三合也不是冲。书里只看这两样，这一项没有特别的说法。`));
    pairBox.append(rule1);

    // ② 九星五行
    const s = r.star; const mineStar = JX.STAR_NAMES[r.me.star]; const theirStar = JX.STAR_NAMES[r.them.star];
    const rule2 = el('div', 'rule'); const h2 = el('h3', '', '九星的五行'); h2.append(el('span', 'weight', '其次，看两人是什么关系'), el('span', 'pill ' + (s.good ? 'ok' : 'bad'), `${s.mine} 与 ${s.theirs}：${starWord}`)); rule2.append(h2);
    if (s.kind === '比和') rule2.append(el('p', '', `${meName}是${mineStar}，${otherName}是${theirStar}，同属${s.mine}，叫比和：同一种气凑在一起，势头更足。`));
    else if (s.kind === '生') rule2.append(el('p', '', s.toward === 'me' ? `${otherName}的${s.theirs}（${theirStar}）生${meName}的${s.mine}（${mineStar}）：${otherName}是扶${meName}的人。` : `${meName}的${s.mine}（${mineStar}）生${otherName}的${s.theirs}（${theirStar}）：${meName}成全${otherName}，${otherName}会念这份好。`));
    else {
      rule2.append(el('p', '', s.toward === 'them' ? `${meName}的${s.mine}（${mineStar}）克${otherName}的${s.theirs}（${theirStar}）：${meName}压着${otherName}。` : `${otherName}的${s.theirs}（${theirStar}）克${meName}的${s.mine}（${mineStar}）：${otherName}压着${meName}。`));
      rule2.append(el('p', '', `非相处不可的话，书里的办法是请一位属${s.bridge}的人（${starList(JXP.starsOfElement(s.bridge))}）居中：他与两边都相生，关系会缓下来。`));
    }
    const leadName = r.leader === 'me' ? meName : otherName; const followName = r.leader === 'me' ? otherName : meName;
    rule2.append(el('p', '', r.leader === null ? '两人同在一行，没有上下之分。' : `按木、火、土、金、水的次序，${r.leader === 'me' ? s.mine : s.theirs}在${r.leader === 'me' ? s.theirs : s.mine}之上：不论年纪，是${leadName}更懂${followName}、带着${followName}走。`));
    pairBox.append(rule2);

    // ③ 神兽与对方的地支
    const rule3 = el('div', 'rule'); const h3 = el('h3', '', '神兽与对方的地支'); h3.append(el('span', 'weight', '补充')); rule3.append(h3);
    const beastLine = (ownerName, owner, guestName, branch, stage) => {
      const xun = owner.profile.xun; const flag = flagOfStage(xun, stage);
      const tail = flag === '峰' ? `这是${ownerName}十二年里最高的一年：书里说和这样的人来往，会带来那样旺的势头。` : flag === '谷' ? `这是${ownerName}十二年里最低的一年：书里说和这样的人来往，运势容易冷下来。` : `${guestName}带给${ownerName}的，像${ownerName}${JXP.stageShort(stage)}那一年的光景。`;
      return `${guestName}的${branch}，落在${ownerName}（${owner.profile.name}）的${JXP.stageShort(stage)}，位置${JXP.tierOf(xun, stage)}。${tail}`;
    };
    rule3.append(el('p', '', beastLine(meName, ME, otherName, b, r.beast.theirsInMine)), el('p', '', beastLine(otherName, other, meName, a, r.beast.mineInTheirs)));
    pairBox.append(rule3);
    pairBox.append(el('p', 'hint', '书里没有给相性打分的办法，这里也不打分。三项的轻重照书里的次序：地支最要紧，九星其次，神兽只作补充。'));
  };

  // —— 本命 ——
  const renderBenming = () => {
    const box = $('b-phase'); const mix = $('b-mix'); const guard = $('b-guard'); box.textContent = ''; guard.textContent = ''; mix.hidden = true; $('b-tempo').textContent = '';
    if (!ME) return;
    const monthEnd = ME.gender === '女' ? '18 岁' : ME.gender === '男' ? '25 岁' : '女 18 岁、男 25 岁';
    const rows = [['day', '幼年', '出生到 6 岁'], ['month', '求学到成年', `6 岁到${ME.gender ? ' ' : ''}${monthEnd}`], ['year', '成年以后', `${monthEnd}之后`]];
    for (const [key, title, span] of rows) {
      const x = ME.pillars[key]; const row = el('div', 'phase' + (ME.phase.key === key ? ' cur' : ''));
      const when = el('div', 'when'); when.append(el('b', '', `${PHASE_WORD[key]} · ${title}`), span + (ME.phase.key === key ? `；你现在 ${ME.age} 岁，在这一段` : ''));
      const body = el('div');
      const t1 = el('p', 'trait'); t1.append(el('span', '', `${x.branch}：`), BRANCH_TRAIT[x.branch]);
      const t2 = el('p', 'trait'); t2.append(el('span', '', `${SHORT[x.star]}：`), STAR_TRAIT[x.star]);
      body.append(el('div', 'gz', `${x.branch} · ${JX.STAR_NAMES[x.star]}`), t1, t2);
      row.append(when, body); box.append(row);
    }
    const clash = [];
    if (JXP.branchRelation(ME.pillars.day.branch, ME.pillars.month.branch) === '冲') clash.push(`日支${ME.pillars.day.branch}与月支${ME.pillars.month.branch}正对相冲：书里说这样的人，幼年结束、进入学龄的前后，内心容易起大的波动。`);
    if (JXP.branchRelation(ME.pillars.month.branch, ME.pillars.year.branch) === '冲') clash.push(`月支${ME.pillars.month.branch}与年支${ME.pillars.year.branch}正对相冲：照同样的道理，成年前后那几年转变会比较剧烈。`);
    for (const text of clash) box.append(el('p', 'note', text));
    if (ME.phase.unsure) box.append(el('p', 'hint', '18 到 24 岁要分男女：女看年柱，男看月柱。没填性别，先按年柱。'));
    const other = JXP.neighbourYearOf(...ME.ymd);
    if (other) { mix.hidden = false; mix.textContent = `你生在立春${other.before ? '之前' : '之后'}不久。书里说一到三月出生的人，前后两年的性质会混着来：一月上旬偏前一年约九成，二月上旬各半，三月下旬偏后一年约九成。所以 ${other.kiYear} 年的${other.branch}、${JX.STAR_NAMES[other.star]}也可以一并参考：${BRANCH_TRAIT[other.branch]}${STAR_TRAIT[other.star]}`; }
    const guardian = JXP.guardianOf(ME.pillars.year.branch);
    guard.append(el('div', 'big', guardian), el('p', '', `${ME.pillars.year.branch}年生人的本尊（生年以立春为界）。${GUARDIAN_GLOSS[guardian]}`));
    $('b-tempo').textContent = tempoText();
  };

  // —— 页签 ——
  const RENDER = { zonglan: renderZonglan, yunshi: renderYunshi, fangwei: renderFangwei, xiangxing: renderXiangxing, benming: renderBenming, yiju: () => {} };
  const dirty = new Set(TABS);
  const showTab = (tab, userAction) => {
    state.tab = TABS.includes(tab) ? tab : 'zonglan';
    for (const t of TABS) { $('p-' + t).hidden = t !== state.tab; $('t-' + t).setAttribute('aria-selected', String(t === state.tab)); }
    if (dirty.has(state.tab)) { RENDER[state.tab](); dirty.delete(state.tab); }
    if (userAction) {
      const tabs = $('tabs');
      const stuck = tabs.getBoundingClientRect().top - (root.getBoundingClientRect().top + tabs.offsetTop) > 1; // 页签已经吸顶
      $('t-' + state.tab).scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (stuck) $('p-' + state.tab).scrollIntoView({ block: 'start' }); // 把新的一页顶上来
    }
  };
  // 还没手选过方向时，先落在最近能走的那一方，免得一进来就是空的
  const pickDirection = () => { if (!state.autoDirection || !ME) return; const near = nearestDirections(); state.direction = near.length ? near[0].dir : '西'; };
  const refresh = () => {
    ME = readPerson(parseYmd($('birth').value), $('gender').value, $('name').value.trim());
    pickDirection();
    renderHead();
    for (const t of TABS) dirty.add(t);
    RENDER[state.tab](); dirty.delete(state.tab);
  };

  // —— 名称表 ——
  const table = $('names');
  const head = el('tr'); for (const t of ['日柱所在的旬', '属性', '阳年生（双数年）', '阴年生（单数年）']) head.append(el('th', '', t)); table.append(head);
  JXP.XUN.forEach((xun, i) => { const tr = el('tr'); for (const t of [xun + '旬', JXP.BEAST_ELEMENT[i], JXP.NAMES[i][0], JXP.NAMES[i][1]]) tr.append(el('td', '', t)); table.append(tr); });

  // —— 初始 ——
  const fillCities = (select, saved) => {
    for (const [group, list] of CITY_GROUPS) { const og = document.createElement('optgroup'); og.label = group; for (const [name] of list) og.append(option(name, name)); select.append(og); }
    select.append(option('自己填经纬度', '*'));
    if (saved && [...select.options].some((o) => o.value === saved)) select.value = saved;
  };
  const today = todayDn();
  $('name').value = store.get('name') || '';
  $('birth').value = store.get('birth') || '1990-06-15';
  $('gender').value = store.get('gender') || '';
  $('other-name').value = store.get('other-name') || '';
  $('other-birth').value = store.get('other-birth') || '1992-03-08';
  $('other-gender').value = store.get('other-gender') || '';
  fillCities($('home'), store.get('home') || '北京'); fillCities($('dest'), store.get('dest') || '上海');
  $('day').value = iso(today); $('from').value = iso(today);
  $('day').min = $('from').min = '1900-02-05'; $('day').max = $('from').max = iso(JX.lastDay(8));

  // 档案里的人：options.profiles = [{ label, name, birth: 'YYYY-MM-DD', gender: '男' | '女' | '' }]
  const profiles = Array.isArray(options.profiles) ? options.profiles : [];
  const bindProfiles = (selectId, apply) => {
    if (!profiles.length) return;
    $(selectId + '-wrap').hidden = false;
    profiles.forEach((profile, i) => $(selectId).append(option(profile.label, String(i))));
    $(selectId).addEventListener('change', () => { const profile = profiles[Number($(selectId).value)]; if ($(selectId).value !== '' && profile) apply(profile); });
  };
  bindProfiles('profile', (profile) => {
    $('name').value = profile.name; $('birth').value = profile.birth; $('gender').value = profile.gender || '';
    state.sample = false; state.picked = null; state.showAll = false;
    store.set('name', profile.name); store.set('birth', profile.birth); store.set('gender', profile.gender || '');
    refresh();
  });
  bindProfiles('other-profile', (profile) => {
    $('other-name').value = profile.name; $('other-birth').value = profile.birth; $('other-gender').value = profile.gender || '';
    state.otherSample = false;
    store.set('other-name', profile.name); store.set('other-birth', profile.birth); store.set('other-gender', profile.gender || '');
    renderXiangxing();
  });
  $('name').addEventListener('input', () => { store.set('name', $('name').value.trim()); refresh(); });
  $('birth').addEventListener('input', () => { $('profile').value = ''; if (parseYmd($('birth').value)) { state.sample = false; state.picked = null; state.showAll = false; store.set('birth', $('birth').value); } refresh(); });
  $('gender').addEventListener('change', () => { store.set('gender', $('gender').value); refresh(); });
  $('home').addEventListener('change', () => { store.set('home', $('home').value); homePoint(); if (state.tab === 'fangwei') { renderDirection(); renderBearing(); } else dirty.add('fangwei'); });
  for (const id of ['home-lat', 'home-lon']) $(id).addEventListener('input', () => { if (state.tab === 'fangwei') { renderDirection(); renderBearing(); } else dirty.add('fangwei'); });
  for (const id of ['from', 'span']) $(id).addEventListener('input', () => { state.showAll = false; renderCompass(); renderDirection(); });
  $('nights').addEventListener('change', () => { state.showAll = false; dirty.add('zonglan'); renderCompass(); renderDirection(); renderDay(); });
  $('day').addEventListener('input', renderDay);
  $('day-today').addEventListener('click', () => { $('day').value = iso(todayDn()); renderDay(); });
  $('dest').addEventListener('change', () => { store.set('dest', $('dest').value); renderBearing(); });
  for (const id of ['dest-lat', 'dest-lon']) $(id).addEventListener('input', renderBearing);
  $('bearing-use').addEventListener('click', () => { if (measured) { setDirection(measured); $('dir-title').scrollIntoView({ behavior: smooth(), block: 'start' }); } });
  $('other-name').addEventListener('input', () => { store.set('other-name', $('other-name').value.trim()); renderXiangxing(); });
  $('other-birth').addEventListener('input', () => { $('other-profile').value = ''; if (parseYmd($('other-birth').value)) { state.otherSample = false; store.set('other-birth', $('other-birth').value); } renderXiangxing(); });
  $('other-gender').addEventListener('change', () => { store.set('other-gender', $('other-gender').value); renderXiangxing(); });
  $('copy').addEventListener('click', () => {
    if (!ME) return;
    const text = summaryText(); const box = $('copy-text'); const status = $('copy-state');
    const fallback = () => { box.value = text; box.hidden = false; box.focus(); box.select(); status.textContent = '这里不能直接写剪贴板。文字已经选中，按复制键带走。'; };
    try { navigator.clipboard.writeText(text).then(() => { status.textContent = '已复制。'; }, fallback); } catch { fallback(); }
  });
  // 页签和“看详细”的跳转都带 data-tab。独立成页时同步到地址栏的 #，嵌在别的应用里时不碰地址栏。
  const go = (tab) => { if (options.hashTabs && location.hash !== '#' + tab) location.hash = tab; else showTab(tab, true); };
  const onClick = (event) => { const target = event.target.closest('[data-tab]'); if (target && root.contains(target)) go(target.dataset.tab); };
  const onHash = () => showTab(location.hash.slice(1), true);
  root.addEventListener('click', onClick);
  if (options.hashTabs) window.addEventListener('hashchange', onHash);

  homePoint();
  ME = readPerson(parseYmd($('birth').value), $('gender').value, $('name').value.trim());
  pickDirection();
  renderHead();
  showTab(options.hashTabs && TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'zonglan', false);
  return {
    showTab: (tab) => showTab(tab, false),
    destroy: () => { root.removeEventListener('click', onClick); window.removeEventListener('hashchange', onHash); },
  };
}
