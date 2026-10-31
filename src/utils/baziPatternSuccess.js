/**
 * 格局成败：按《子平真诠·论用神成败救应》逐条判断格局是「成」「败」「成中有败」还是「败中有成」。
 *
 * 原文只论天干透出之神与月令的刑冲会合，所以这里的「见」「逢」「透」一律看天干（含年月时干，
 * 不含日干），「刑冲」「会合」看月支与其余地支。每条结论都附原文句子与出处，方便对照。
 *
 * 《子平真诠》没有给出的辅助判断（如伤官见官而有印、七杀用刃）注明出自哪一篇，
 * 凡书里没说的一律不判，交给「待详辨」。
 * 原书只分身强、身弱：旺衰打分偏强、极强算身强，偏弱、极弱算身弱，中和的按「五行与旺衰」一节略偏的一边算
 * （任注论庚申 壬午 辛酉 癸巳「午火真神得用」，中和略偏旺而壬癸制杀，七杀格成）。
 */
import { cite } from '../data/classics.js';
import { getGanPairKinds, getZhiPairKinds } from './baziRelations.js';

const REN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
/** 半合、三合所成之局的五行（生地＋帝旺、帝旺＋墓库、生地＋墓库都算到局里）。 */
const SAN_HE_ELEMENT = Object.freeze(Object.fromEntries([
  [['寅', '午', '戌'], '火'], [['申', '子', '辰'], '水'], [['巳', '酉', '丑'], '金'], [['亥', '卯', '未'], '木'],
].flatMap(([group, element]) => [[group[0], group[1]], [group[1], group[2]], [group[0], group[2]]].map((pair) => [pair.sort().join(''), element]))));
const roleOfElement = (element, dayWuxing) => {
  if (element === dayWuxing) return '比劫';
  if (GENERATES[element] === dayWuxing) return '印';
  if (GENERATES[dayWuxing] === element) return '食伤';
  if (CONTROLS[element] === dayWuxing) return '官杀';
  if (CONTROLS[dayWuxing] === element) return '财';
  return null;
};

export const CHENG_BAI_SOURCE = Object.freeze({ classic: 'ziping', section: '论用神成败救应' });

/** 原文（沈孝瞻《子平真诠》卷二「论用神成败救应」），按格局拆开，供界面与提示词引用。 */
export const CHENG_BAI_QUOTES = Object.freeze({
  成: Object.freeze({
    正官格: '官逢财印，又无刑冲破害，官格成也。',
    财格: '财生官旺，或财逢食生而身强带比，或财格透印而位置妥贴，两不相克，财格成也。',
    印格: '印轻逢煞，或官印双全，或身印两旺而用食伤泄气，或印多逢财而财透根轻，印格成也。',
    食神格: '食神生财，或食带煞而无财，弃食就煞而透印，食格成也。',
    七杀格: '身强七煞逢制，煞格成也。',
    伤官格: '伤官生财，或伤官佩印而伤官旺、印有根，或伤官旺、身主弱而透煞印，或伤官带煞而无财，伤官格成也。',
    羊刃格: '阳刃透官煞而露财印，不见伤官，阳刃格成也。',
    建禄月劫: '建禄月劫，透官而逢财印，透财而逢食伤，透煞而遇制伏，建禄月劫之格成也。',
  }),
  败: Object.freeze({
    正官格: '官逢伤克刑冲，官格败也。',
    财格: '财轻比重，财透七煞，财格败也。',
    印格: '印轻逢财，或身强印重而透煞，印格败也。',
    食神格: '食神逢枭，或生财露煞，食神格败也。',
    七杀格: '七煞逢财无制，七煞格败也。',
    伤官格: '伤官非金水而见官，或生财生带煞，或佩印而伤轻身旺，伤官格败也。',
    羊刃格: '阳刃无官煞，刃格败也。',
    建禄月劫: '建禄月劫，无财官，透煞印，建禄月劫之格败也。',
  }),
  成中有败: '如正官逢财，而又逢伤，透官而又逢合；财旺生官，而又逢伤逢合；印透食以泄气，而又遇财露；食神带煞印，而又逢财；七煞逢食制，而又逢印；伤官生财，而财又逢合；阳刃透官，而又被伤；建禄月劫透官，而遇伤；透财而遇煞，是皆谓之成中有败也。',
  败中有成: '如官逢伤而透印以解之，杂煞而合煞以清之，刑冲而会合以解之；财逢劫而透食以化之，生官以制之，逢煞而食神制煞以生财，或存财而合煞；印逢财而劫财以解之，或合财而存印；食逢枭而就煞以成格，或生财以护食；煞逢食制，印来护煞，而逢财以去印存食；伤官生财透煞而煞逢合；阳刃用官煞带伤食，而重印以护之；建禄月劫用官，遇伤而伤被合，用财带煞而煞被合，是谓败中有成也。',
});

/** 把程序的格名归到原文的八类。 */
export const chengBaiGroupOf = (pattern) => {
  if (!pattern) return null;
  if (pattern.kind === 'lu' || pattern.kind === 'jie') return '建禄月劫';
  if (pattern.kind === 'ren') return '羊刃格';
  if (pattern.kind !== 'regular') return null;
  const tenGod = pattern.tenGod;
  if (tenGod === '正官') return '正官格';
  if (tenGod === '七杀') return '七杀格';
  if (tenGod === '正财' || tenGod === '偏财') return '财格';
  if (tenGod === '正印' || tenGod === '偏印') return '印格';
  if (tenGod === '食神') return '食神格';
  if (tenGod === '伤官') return '伤官格';
  return null;
};

const stemsText = (stems) => stems.map((stem) => `${stem.name}${stem.gan}`).join('、');

/**
 * @param {object} chart buildBaziChart 的结果
 * @param {object} strength analyzeStrength 的结果
 * @param {object} pattern determinePattern 的结果
 * @param {object} summary baziPattern 的汇总（stems、byKey、roleShare、transparent、transparentRole）
 */
export const judgePatternSuccess = (chart, strength, pattern, summary) => {
  const group = chengBaiGroupOf(pattern);
  if (!group) return null;
  const { byKey, stems, roleShare, transparent, transparentRole } = summary;
  const dayGan = chart.dayMaster.gan;
  const dayWuxing = chart.dayMaster.wuxing;
  // 原书只分身强、身弱：旺衰打到中和的，按「五行与旺衰」一节略偏的那一边算（取用思路里写明「中和略偏旺／弱」）。
  const lean = strength.band === '中和' ? (/^日主中和略偏旺/.test(strength.basis ?? '') ? 'strong' : /^日主中和略偏弱/.test(strength.basis ?? '') ? 'weak' : null) : null;
  const strong = strength.band === '偏强' || strength.band === '极强' || lean === 'strong';
  const weak = strength.band === '偏弱' || strength.band === '极弱' || lean === 'weak';
  const bandText = lean ? `中和略偏${lean === 'strong' ? '旺' : '弱'}` : strength.band;
  const month = byKey.month;

  const has = (shiShen) => transparent(shiShen).length > 0;
  const hasRole = (role) => transparentRole(role).length > 0;
  const where = (shiShen) => stemsText(transparent(shiShen));
  const whereRole = (role) => stemsText(transparentRole(role));

  // 月支被其余地支冲刑，或与其余地支会合。
  const otherZhis = summary.pillars.filter((pillar) => pillar.key !== 'month').map((pillar) => ({ name: pillar.name, zhi: pillar.zhi }));
  const monthClashes = month ? otherZhis.filter(({ zhi }) => getZhiPairKinds(month.zhi, zhi).some((kind) => kind === '冲' || kind === '刑')) : [];
  const monthMerges = month ? otherZhis.filter(({ zhi }) => getZhiPairKinds(month.zhi, zhi).some((kind) => kind === '合' || kind === '半合')) : [];
  const monthClashed = monthClashes.length > 0;
  const monthMerged = monthMerges.length > 0;
  const clashText = monthClashes.map(({ name, zhi }) => `${name}${zhi}`).join('、');
  const mergeText = monthMerges.map(({ name, zhi }) => `${name}${zhi}`).join('、');

  // 某十神（或某类）透出的天干被别的透干合去（不算与日干相合）。年干与时干隔着月干、日干，不作合论：
  // 论伤官「财太重而带印，而丁与壬隔以戊己，两不相碍」（丁酉 己酉 戊子 壬子）；月干与时干隔日干仍合（论印绶「辛亥 庚子 甲辰 乙亥，此合煞留官也」）。
  const canMerge = (a, b) => !((a.key === 'year' && b.key === 'time') || (a.key === 'time' && b.key === 'year'));
  const mergedAway = (list) => list.filter((stem) => stems.some((other) => other.key !== stem.key && canMerge(stem, other) && getGanPairKinds(stem.gan, other.gan).includes('合')));
  const stemMerged = (shiShen) => mergedAway(transparent(shiShen));
  const roleMerged = (role) => mergedAway(transparentRole(role));
  // 两类透干是否紧挨着（年干与月干）：论财「财格透印而位置妥贴，两不相克」，薛相公「壬印戊财，以乙隔之」
  const adjacentPair = (listA, listB) => listA.some((a) => listB.some((b) => (a.key === 'year' && b.key === 'month') || (a.key === 'month' && b.key === 'year')));
  // 地支本气或半合、三合所成之局是哪一类十神（论阳刃「癸水伤寅午之官」、论正官范太傅「巳丑会金伤官」）
  const juRoles = new Set();
  const zhis = summary.pillars.map((pillar) => pillar.zhi);
  zhis.forEach((a, i) => zhis.slice(i + 1).forEach((b) => {
    // 三合局里任两支相会都算（范太傅「支其巳丑会金伤官」，巳丑是生地与墓库相拱）
    const element = a !== b ? SAN_HE_ELEMENT[[a, b].sort().join('')] : null;
    const role = element ? roleOfElement(element, dayWuxing) : null;
    if (role) juRoles.add(role);
  }));
  /** 地支会局成某一类（只看会局） */
  const juHas = (role) => juRoles.has(role);
  const monthHidden = month ? summary.hidden.filter((item) => item.key === 'month').map((item) => item.shiShen) : [];

  const hasRen = Boolean(REN[dayGan]) && summary.pillars.some((pillar) => pillar.key !== 'month' && pillar.zhi === REN[dayGan]);
  // 金日主的伤官必是水，即「金水伤官」；原书许其见官。
  const shangGuanJinShui = dayWuxing === '金';

  const success = [];
  const failure = [];
  const flaw = [];
  const rescue = [];
  const add = (list, text, quote) => list.push({ text, quote });
  const q = CHENG_BAI_QUOTES;

  switch (group) {
    case '正官格': {
      const guard = hasRole('财') || hasRole('印');
      if (guard && !monthClashed && !has('伤官')) add(success, `正官得${hasRole('财') ? `财（${whereRole('财')}）` : ''}${hasRole('财') && hasRole('印') ? '、' : ''}${hasRole('印') ? `印（${whereRole('印')}）` : ''}相随，月令${month.zhi}无刑冲。`, '官逢财印，又无刑冲破害，官格成也');
      if (has('伤官')) {
        add(failure, `伤官透于${where('伤官')}，克正官。`, '官逢伤克');
        if (hasRole('印')) add(rescue, `印星透于${whereRole('印')}，制伤护官。`, '官逢伤而透印以解之');
      } else if (juHas('食伤')) {
        // 范太傅「支其巳丑会金伤官，丙丁解之」：地支会成食伤局也是逢伤，印透则解
        add(failure, '地支会成食伤之局，伤及正官。', '官逢伤克（论正官：巳丑会金伤官）');
        if (hasRole('印')) add(rescue, `印星透于${whereRole('印')}，制伤护官。`, '官逢伤而透印以解之');
      }
      // 杂气正官「壬财丁印，二者相合，仍以孤官无辅，所以不上七品」：辅官的财、印自相合去，官失其辅；
      // 范太傅「丙丁并透，用一而足，以丁合壬而财去」——还剩一个印没被合的，不算孤官
      const yinStems = transparentRole('印');
      const yinMergedWithCai = yinStems.filter((b) => transparentRole('财').some((a) => canMerge(a, b) && getGanPairKinds(a.gan, b.gan).includes('合')));
      if (yinStems.length && yinMergedWithCai.length === yinStems.length) {
        add(flaw, `财与印（${stemsText(yinMergedWithCai)}）两透而自相合去，孤官无辅。`, '财印相合，孤官无辅（论正官）');
      }
      if (monthClashed) {
        add(failure, `月令${month.zhi}被${clashText}冲刑。`, '官逢刑冲');
        if (monthMerged) add(rescue, `月令${month.zhi}又与${mergeText}会合。`, '刑冲而会合以解之');
      }
      if (has('七杀')) {
        add(failure, `七杀透于${where('七杀')}，官杀混杂。`, '杂煞');
        const merged = stemMerged('七杀');
        if (merged.length) add(rescue, `${stemsText(merged)}之杀被合去，官格清。`, '杂煞而合煞以清之');
      }
      const merged = stemMerged('正官');
      if (guard && !failure.length && merged.length) add(flaw, `正官${stemsText(merged)}被合。`, '透官而又逢合');
      break;
    }
    case '财格': {
      if (has('正官')) add(success, `财生正官（${where('正官')}）。`, '财生官旺');
      // 吴榜眼「庚与丙隔一戊而不相克」：戊戊比肩透而食神生财，身虽未强亦以带比论
      if (hasRole('食伤') && (strong || hasRole('比劫'))) add(success, `食伤（${whereRole('食伤')}）生财，${strong ? `日主${bandText}` : `比劫（${whereRole('比劫')}）帮身`}。`, '财逢食生而身强带比');
      // 论财「有财格佩印者，盖孤财不贵，佩印帮身，即以取贵」：财、印不紧挨（年月相邻）才是位置妥贴
      if (hasRole('印') && hasRole('财')) {
        if (adjacentPair(transparentRole('财'), transparentRole('印'))) add(flaw, `财（${whereRole('财')}）与印（${whereRole('印')}）年月相邻，财印相克。`, '财格透印而位置不妥（论财）');
        else add(success, `财透而印（${whereRole('印')}）亦透，两不相邻。`, '财格透印而位置妥贴，两不相克');
      }
      // 论财「壬生午月，癸生巳月，单透财而亦贵，以月令有暗官也」
      if (hasRole('财') && !has('正官') && !has('七杀') && monthHidden.some((name) => name === '正官' || name === '七杀')) add(success, `财透于${whereRole('财')}，月令${month.zhi}藏官。`, '单透财而亦贵，以月令有暗官也（论财）');
      const jieHeavy = hasRole('比劫') && (roleShare['比劫'] ?? 0) > (roleShare['财'] ?? 0);
      if (jieHeavy) {
        add(failure, `比劫透于${whereRole('比劫')}，比劫 ${Math.round(roleShare['比劫'])}% 重于财 ${Math.round(roleShare['财'])}%。`, '财轻比重');
        if (hasRole('食伤')) add(rescue, `食伤透于${whereRole('食伤')}，化比劫生财。`, '财逢劫而透食以化之');
        if (has('正官')) add(rescue, `正官透于${where('正官')}，制比劫护财。`, '生官以制之');
      }
      if (has('七杀')) {
        add(failure, `七杀透于${where('七杀')}，财党杀攻身。`, '财透七煞');
        if (has('食神')) add(rescue, `食神透于${where('食神')}，制杀生财。`, '逢煞而食神制煞以生财');
        const merged = stemMerged('七杀');
        if (merged.length) add(rescue, `${stemsText(merged)}之杀被合去。`, '存财而合煞');
        // 赵侍郎「有财用煞印者，党煞为忌，印以化之，格成富局」
        if (hasRole('印')) add(rescue, `印星透于${whereRole('印')}，化杀生身。`, '财用煞印，印以化之（论财）');
      }
      if (has('正官') && !failure.length) {
        if (has('伤官')) add(flaw, `伤官透于${where('伤官')}，伤及所生之官。`, '财旺生官，而又逢伤');
        const merged = stemMerged('正官');
        if (merged.length) add(flaw, `正官${stemsText(merged)}被合。`, '财旺生官，而又逢合');
      }
      break;
    }
    case '印格': {
      const yinLight = (roleShare['印'] ?? 0) < 20;
      if (yinLight && has('七杀')) add(success, `印星不重，七杀（${where('七杀')}）生印。`, '印轻逢煞');
      if (has('正官')) add(success, `正官透于${where('正官')}，官印双全。`, '官印双全');
      if (strong && hasRole('食伤')) add(success, `身印两旺，食伤（${whereRole('食伤')}）泄秀。`, '身印两旺而用食伤泄气');
      if (strong && (roleShare['印'] ?? 0) >= 30 && hasRole('财') && (roleShare['财'] ?? 0) < 15) add(success, `印多，财（${whereRole('财')}）透而根轻，损印有度。`, '印多逢财而财透根轻');
      if (yinLight && hasRole('财')) {
        add(failure, `印星不重而财透于${whereRole('财')}，财破印。`, '印轻逢财');
        if (hasRole('比劫')) add(rescue, `比劫透于${whereRole('比劫')}，制财护印。`, '印逢财而劫财以解之');
        const merged = roleMerged('财');
        if (merged.length) add(rescue, `财${stemsText(merged)}被合去。`, '合财而存印');
      }
      if (strong && (roleShare['印'] ?? 0) >= 30 && has('七杀')) {
        add(failure, `身强印重，七杀透于${where('七杀')}反生印。`, '身强印重而透煞');
        // 论印绶「辛亥 庚子 甲辰 乙亥，此合煞留官也」
        const merged = stemMerged('七杀');
        if (merged.length) add(rescue, `${stemsText(merged)}之杀被合去${has('正官') ? '，留官' : ''}。`, '合煞留官（论印绶）');
      }
      // 论印绶「更有印透七煞，而劫财以存煞印，亦有贵格」
      if (has('七杀') && hasRole('财') && hasRole('比劫') && !failure.length) add(success, `七杀（${where('七杀')}）透而财（${whereRole('财')}）亦透，劫财（${whereRole('比劫')}）制财以存煞印。`, '印透七煞，而劫财以存煞印（论印绶）');
      if (!failure.length && hasRole('食伤') && hasRole('财')) {
        // 牛监簿「乙合庚而不生丙」、「己未 甲戌 辛未 癸巳，此合财存食之贵也」：食伤或财被合去，便不成财坏印
        const foodMerged = roleMerged('食伤');
        const wealthMerged = roleMerged('财');
        if (foodMerged.length) add(rescue, `食伤${stemsText(foodMerged)}被合而不生财。`, '食被合而不生财（论印绶）');
        else if (wealthMerged.length) add(rescue, `财${stemsText(wealthMerged)}被合去。`, '合财存食（论印绶）');
        else add(flaw, `食伤泄秀而财（${whereRole('财')}）又露，财坏印。`, '印透食以泄气，而又遇财露');
      }
      break;
    }
    case '食神格': {
      if (hasRole('财') && !has('七杀')) add(success, `食神生财（${whereRole('财')}）。`, '食神生财');
      if (has('七杀') && !hasRole('财')) add(success, `食神制杀（${where('七杀')}）而不见财。`, '食带煞而无财');
      if (has('七杀') && hasRole('印')) add(success, `杀印（${where('七杀')}、${whereRole('印')}）并透，弃食就杀。`, '弃食就煞而透印');
      if (has('偏印')) {
        add(failure, `偏印透于${where('偏印')}，枭神夺食。`, '食神逢枭');
        if (has('七杀')) add(rescue, `七杀透于${where('七杀')}，弃食就杀成格。`, '食逢枭而就煞以成格');
        if (hasRole('财')) add(rescue, `财透于${whereRole('财')}，制枭护食。`, '生财以护食');
      }
      if (hasRole('财') && has('七杀')) {
        add(failure, `财（${whereRole('财')}）与七杀（${where('七杀')}）并露，财生杀。`, '生财露煞');
        // 刘提督「食神透煞，本忌见财，而财先煞后，食以间之，而财不能党煞，亦可就贵」
        const foodAtMonth = transparent('食神').some((stem) => stem.key === 'month');
        const apart = transparentRole('财').every((stem) => stem.key === 'year') && transparent('七杀').every((stem) => stem.key === 'time');
        if (foodAtMonth && apart) add(rescue, '财在年、杀在时，食神居中间之，财不能党杀。', '财先煞后，食以间之（论食神）');
      }
      if (!failure.length && has('七杀') && hasRole('印') && hasRole('财')) add(flaw, `杀印并透又见财（${whereRole('财')}）。`, '食神带煞印，而又逢财');
      break;
    }
    case '七杀格': {
      const zhi = has('食神') || has('伤官');
      // 「乙亥 乙酉 乙卯 丁丑，极等之贵也」：日主中和而食神制杀亦成，只要不弱
      const notWeak = strength.band !== '偏弱' && strength.band !== '极弱';
      if (notWeak && zhi) add(success, `身${bandText}，食伤（${whereRole('食伤')}）制杀。`, '身强七煞逢制');
      if (hasRole('印')) add(success, `印星透于${whereRole('印')}，化杀生身。`, '煞用印化（论偏官）');
      if (hasRen) add(success, `日主坐刃（${REN[dayGan]}），刃杀相济。`, '煞用阳刃（论偏官）');
      // 何参政「煞印有情」、刘运使「煞又化印……借财以清格」：有印化煞的，见财不作无制论
      if (hasRole('财') && !zhi && !hasRole('印')) {
        add(failure, `财透于${whereRole('财')}而七杀无食伤制。`, '七煞逢财无制');
      }
      // 岳统制「去官留煞也……月令偏官煞为用，而官非用」：官杀混杂，官被伤克、被合去则清
      if (has('正官')) {
        const guanMerged = stemMerged('正官');
        const guanHurt = has('伤官');
        add(flaw, `正官透于${where('正官')}，官杀混杂。`, '官煞混杂（论偏官）');
        if (guanMerged.length || guanHurt) add(rescue, `${guanMerged.length ? `正官${stemsText(guanMerged)}被合去` : `伤官（${where('伤官')}）克去正官`}，去官留杀。`, '去官留煞（论偏官）');
      }
      if (!failure.length && zhi && hasRole('印')) {
        add(flaw, `食伤制杀而印（${whereRole('印')}）又夺食。`, '七煞逢食制，而又逢印');
        if (hasRole('财')) add(rescue, `财透于${whereRole('财')}，去印存食。`, '逢财以去印存食');
      }
      break;
    }
    case '伤官格': {
      if (hasRole('财') && !has('七杀')) add(success, `伤官生财（${whereRole('财')}）。`, '伤官生财');
      if (hasRole('印') && weak) add(success, `身${bandText}，印（${whereRole('印')}）制伤护身。`, '伤官佩印');
      if (has('七杀') && !hasRole('财')) add(success, `伤官驾杀（${where('七杀')}）而不见财。`, '伤官带煞而无财');
      if (has('正官')) {
        if (shangGuanJinShui) add(success, `金水伤官见官（${where('正官')}），原书所许。`, '伤官非金水而见官（金水伤官例外）');
        else {
          add(failure, `正官透于${where('正官')}，伤官见官。`, '伤官非金水而见官');
          if (hasRole('印')) add(rescue, `印星透于${whereRole('印')}，制伤护官。`, '官逢伤而透印以解之');
        }
      }
      if (hasRole('财') && has('七杀')) {
        add(failure, `伤官生财（${whereRole('财')}）而七杀（${where('七杀')}）又透，财生杀。`, '生财生带煞');
        const merged = stemMerged('七杀');
        if (merged.length) add(rescue, `${stemsText(merged)}之杀被合去。`, '伤官生财透煞而煞逢合');
      }
      if (hasRole('印') && strong && (roleShare['食伤'] ?? 0) < 15) add(failure, `身强伤轻而印（${whereRole('印')}）又制伤。`, '佩印而伤轻身旺');
      if (!failure.length && hasRole('财')) {
        const merged = roleMerged('财');
        if (merged.length) add(flaw, `所生之财${stemsText(merged)}被合。`, '伤官生财，而财又逢合');
      }
      break;
    }
    case '羊刃格': {
      // 穆同知「癸水伤寅午之官」：地支会成官杀之局也算有官杀
      const guanShaStem = has('正官') || has('七杀');
      const guanSha = guanShaStem || juHas('官杀');
      const shiShang = has('伤官') || has('食神');
      if (guanSha && (hasRole('财') || hasRole('印')) && !shiShang) add(success, `官杀（${guanShaStem ? whereRole('官杀') : '地支'}）制刃，财印（${[hasRole('财') ? whereRole('财') : '', hasRole('印') ? whereRole('印') : ''].filter(Boolean).join('、')}）相随，不见伤官。`, '阳刃透官煞而露财印，不见伤官');
      if (!guanSha) add(failure, '天干地支不见官杀，刃无所制。', '阳刃无官煞');
      if (guanSha && shiShang) {
        // 论阳刃「然亦有官煞制刃，带伤食而贵，何也？或是印护，或是煞太重而裁损之，官煞轻而取清之」
        const hurt = transparentRole('食伤');
        const hurtMerged = roleMerged('食伤');
        const shaStems = transparent('七杀');
        if (hasRole('印') && (hurtMerged.length || (roleShare['印'] ?? 0) >= 20)) add(success, `伤食（${stemsText(hurt)}）${hurtMerged.length ? `被${whereRole('印')}合去` : `被重印（${whereRole('印')}）制住`}，官杀得护。`, '官煞制刃带伤食而贵：印护（论阳刃）');
        else if (shaStems.length >= 2) add(success, `七杀两透（${stemsText(shaStems)}），太重，伤食（${stemsText(hurt)}）裁损之。`, '官煞制刃带伤食而贵：煞太重而裁损之（论阳刃）');
        else if (has('正官') && has('七杀') && (stemMerged('正官').length || stemMerged('七杀').length)) add(success, `官杀并透而${stemsText([...stemMerged('正官'), ...stemMerged('七杀')])}被合去，官杀纯而不杂。`, '官煞制刃带伤食而贵：官煞轻而取清之（论阳刃）');
        else add(flaw, `官杀被伤食（${stemsText(hurt)}）克。`, '阳刃透官，而又被伤');
      }
      break;
    }
    case '建禄月劫': {
      if (has('正官') && (hasRole('财') || hasRole('印'))) add(success, `正官透于${where('正官')}，财印相随。`, '透官而逢财印');
      if (hasRole('财') && hasRole('食伤')) add(success, `财（${whereRole('财')}）透而食伤（${whereRole('食伤')}）生之。`, '透财而逢食伤');
      if (has('七杀') && hasRole('食伤')) add(success, `七杀透于${where('七杀')}，食伤制伏。`, '透煞而遇制伏');
      if (!hasRole('财') && !hasRole('官杀')) {
        // 张状元「甲子 丙寅 甲子 丙寅，木火通明」、「癸卯 庚申 庚子 庚辰，金水相涵」：禄劫无财官而用伤食泄其太过，亦为秀气
        if (hasRole('食伤') && !weak) add(success, `无财官而食伤（${whereRole('食伤')}）透，泄其太过。`, '禄劫之格，无财官而用伤食，泄其太过，亦为秀气（论建禄月劫）');
        else add(failure, '天干不见财官，禄劫无所用。', '无财官');
      }
      if (has('七杀') && hasRole('印') && !hasRole('食伤')) add(failure, `七杀（${where('七杀')}）与印（${whereRole('印')}）并透而无制。`, '透煞印');
      // 一平章「辛丑 庚寅 甲辰 乙亥，合煞留官也」、「辛亥 庚寅 甲申 丙寅，制煞留官也」
      if (has('正官') && has('七杀')) {
        add(flaw, `正官（${where('正官')}）与七杀（${where('七杀')}）并透，官杀混杂。`, '官煞混杂');
        const merged = stemMerged('七杀');
        if (merged.length) add(rescue, `七杀${stemsText(merged)}被合去，留官。`, '合煞留官（论建禄月劫）');
        else if (hasRole('食伤')) add(rescue, `食伤（${whereRole('食伤')}）制杀，留官。`, '制煞留官（论建禄月劫）');
      }
      if (has('正官') && has('伤官')) {
        add(flaw, `透官而伤官（${where('伤官')}）克之。`, '建禄月劫透官，而遇伤');
        const merged = stemMerged('伤官');
        if (merged.length) add(rescue, `伤官${stemsText(merged)}被合。`, '用官，遇伤而伤被合');
      }
      if (hasRole('财') && has('七杀')) {
        add(flaw, `透财而七杀（${where('七杀')}）又透。`, '透财而遇煞');
        const merged = stemMerged('七杀');
        if (merged.length) add(rescue, `七杀${stemsText(merged)}被合。`, '用财带煞而煞被合');
      }
      break;
    }
    default:
      return null;
  }

  let verdict;
  // 破格得救再带损的，救过之后仍是成中有败（杂气正官「透干会支，最为贵格，而壬财丁印，二者相合……不上七品」）
  if (failure.length) verdict = rescue.length ? (flaw.length ? '成中有败' : '败中有成') : '败';
  else if (success.length) verdict = flaw.length ? (rescue.length ? '败中有成' : '成中有败') : '成';
  else if (flaw.length) verdict = rescue.length ? '败中有成' : '成中有败';
  else verdict = '待详辨';

  const quoteOf = (list) => list.map((item) => item.quote).join('；');
  const part = (label, list) => (list.length ? `${label}：${list.map((item) => item.text).join('')}（${quoteOf(list)}）` : '');
  const ordered = failure.length
    ? [part('败', failure), part('救应', rescue), part('成', success), part('成中有败', flaw)]
    : [part('成', success), part('成中有败', flaw), part('救应', rescue)];
  const parts = ordered.filter(Boolean);
  const seenText = stems.length ? `天干透出${stems.map((stem) => `${stem.shiShen}（${stem.name}${stem.gan}）`).join('、')}，` : '';
  const summaryText = parts.length ? parts.join('') : `${seenText}未构成原书所列的成格或破格条件，需看地支与全局。`;

  return {
    group,
    verdict,
    success,
    failure,
    flaw,
    rescue,
    summary: summaryText,
    source: cite(CHENG_BAI_SOURCE.classic, CHENG_BAI_SOURCE.section),
    quotes: { 成: q.成[group], 败: q.败[group] },
  };
};
