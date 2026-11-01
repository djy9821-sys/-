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
import { quYunOf } from './baziQuYun.js';

const REN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };
/** 十神 → 相神归类（官、杀分开，财、印、食伤、比劫按类） */
const ROLE_LABEL = { 正官: '正官', 七杀: '七杀', 正财: '财', 偏财: '财', 正印: '印', 偏印: '印', 食神: '食伤', 伤官: '食伤', 比肩: '比劫', 劫财: '比劫' };
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
  // 月支本身与它支会成的局（论伤官「化伤为财」：申子会水、亥未会木；论建禄月劫「丑与巳会，即以劫财之火，化为金局之财」）
  const monthJuRoles = new Set();
  if (month) zhis.filter((zhi) => zhi !== month.zhi).forEach((zhi) => {
    const element = SAN_HE_ELEMENT[[month.zhi, zhi].sort().join('')];
    const role = element ? roleOfElement(element, dayWuxing) : null;
    if (role) monthJuRoles.add(role);
  });
  const monthJuHas = (role) => monthJuRoles.has(role);
  /** 月支以外的地支本气是某一类（论建禄月劫「有用官而财助者」李知府：壬官透而酉中辛财助之） */
  const benQiRoles = new Set(summary.hidden.filter((item) => item.rank === 0 && item.key !== 'month').map((item) => ROLE_LABEL[item.shiShen]).filter(Boolean));
  const benQiHas = (role) => benQiRoles.has(role);
  const monthHidden = month ? summary.hidden.filter((item) => item.key === 'month').map((item) => item.shiShen) : [];

  const hasRen = Boolean(REN[dayGan]) && summary.pillars.some((pillar) => pillar.key !== 'month' && pillar.zhi === REN[dayGan]);
  // 金日主的伤官必是水，即「金水伤官」；原书许其见官。
  const shangGuanJinShui = dayWuxing === '金';

  const success = [];
  const failure = [];
  const flaw = [];
  const rescue = [];
  /** @param xiang 这一条里辅成此格的相神（论相神紧要「如官逢财生，则官为用，财为相」），十神或十神类别 */
  const add = (list, text, quote, xiang = []) => list.push({ text, quote, xiang });
  // 合去某干的那一干就是相神（论相神紧要「合伤存官以成格者，全赖于壬之相」）
  const partnersOf = (list) => [...new Set(list.flatMap((stem) => stems.filter((other) => other.key !== stem.key && canMerge(stem, other) && getGanPairKinds(stem.gan, other.gan).includes('合')).map((other) => ROLE_LABEL[other.shiShen]).filter(Boolean)))];
  const q = CHENG_BAI_QUOTES;

  switch (group) {
    case '正官格': {
      const guard = hasRole('财') || hasRole('印');
      // 刑冲另算一条败（下面），财印相随的成格条件照记：薛相公「壬印戊财，以乙隔之」，寅申冲、巳申合而仍大贵
      if (guard && !has('伤官')) add(success, `正官得${hasRole('财') ? `财（${whereRole('财')}）` : ''}${hasRole('财') && hasRole('印') ? '、' : ''}${hasRole('印') ? `印（${whereRole('印')}）` : ''}相随${monthClashed ? '' : `，月令${month.zhi}无刑冲`}。`, '官逢财印，又无刑冲破害，官格成也', [hasRole('财') ? '财' : null, hasRole('印') ? '印' : null].filter(Boolean));
      if (has('伤官')) {
        add(failure, `伤官透于${where('伤官')}，克正官。`, '官逢伤克');
        if (hasRole('印')) add(rescue, `印星透于${whereRole('印')}，制伤护官。`, '官逢伤而透印以解之', ['印']);
      } else if (juHas('食伤')) {
        // 范太傅「支其巳丑会金伤官，丙丁解之」：地支会成食伤局也是逢伤，印透则解
        add(failure, '地支会成食伤之局，伤及正官。', '官逢伤克（论正官：巳丑会金伤官）');
        if (hasRole('印')) add(rescue, `印星透于${whereRole('印')}，制伤护官。`, '官逢伤而透印以解之', ['印']);
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
        if (merged.length) add(rescue, `${stemsText(merged)}之杀被合去，官格清。`, '杂煞而合煞以清之', partnersOf(merged));
      }
      const merged = stemMerged('正官');
      if (guard && !failure.length && merged.length) add(flaw, `正官${stemsText(merged)}被合。`, '透官而又逢合');
      break;
    }
    case '财格': {
      const caiShare = roleShare['财'] ?? 0;
      if (has('正官')) add(success, `财生正官（${where('正官')}）。`, '财生官旺', ['正官']);
      // 吴榜眼「庚与丙隔一戊而不相克」：戊戊比肩透而食神生财，身虽未强亦以带比论
      if (hasRole('食伤') && (strong || hasRole('比劫'))) add(success, `食伤（${whereRole('食伤')}）生财，${strong ? `日主${bandText}` : `比劫（${whereRole('比劫')}）帮身`}。`, '财逢食生而身强带比', ['食伤']);
      // 论财「有财用食生者，身强而不露官……透官身弱则格坏矣」：官与食伤年月紧挨才相战；隔着财的（章丞相 甲子 壬申 己亥 辛未「作财旺生官」）
      // 与官食相合的（丙日戊癸之类）都不算，后者归「透官而又逢合」
      const guanFoodMerged = transparent('正官').some((guan) => transparentRole('食伤').some((food) => canMerge(guan, food) && getGanPairKinds(guan.gan, food.gan).includes('合')));
      if (hasRole('食伤') && has('正官') && weak && adjacentPair(transparent('正官'), transparentRole('食伤')) && !guanFoodMerged) add(failure, `食伤（${whereRole('食伤')}）与官（${where('正官')}）年月相邻而相战，日主${bandText}，身不能任。`, '财用食生者，身强而不露官……透官身弱则格坏矣（论财）');
      // 论财「有用食而兼用印者，食与印而不相碍，或有暗官而去食护官，皆贵格也……反是则减福矣」：
      // 吴榜眼庚戌 戊子 戊子 丙辰「庚与丙隔一戊而不相克」，平江伯壬辰 乙巳 癸巳 辛酉「存巳中戊官，是去食护官也」
      if (hasRole('食伤') && hasRole('印')) {
        if (!adjacentPair(transparentRole('食伤'), transparentRole('印'))) add(success, `食伤（${whereRole('食伤')}）与印（${whereRole('印')}）不相邻，两不相碍。`, '用食而兼用印者，食与印而不相碍，皆贵格（论财）', ['食伤', '印']);
        else if (monthHidden.some((name) => name === '正官' || name === '七杀')) add(success, `印（${whereRole('印')}）克食伤（${whereRole('食伤')}），去食以护月令${month.zhi}中暗官。`, '有暗官而去食护官，皆贵格（论财）', ['印']);
        else add(flaw, `食伤（${whereRole('食伤')}）与印（${whereRole('印')}）年月相邻，食印相碍。`, '食与印相碍则减福（论财）');
      }
      // 论财「若财旺无劫，而透伤，反为不利……徒使财遇伤而死，生官之具，安望富贵乎」
      if (has('伤官') && !hasRole('比劫') && (roleShare['比劫'] ?? 0) < 20 && caiShare >= 20) add(flaw, `财旺（${Math.round(caiShare)}%）无劫而伤官（${where('伤官')}）透，伤非美物，徒伤生官之具。`, '财旺无劫，而透伤，反为不利（论财）');
      // 论财「有财格佩印者，盖孤财不贵，佩印帮身，即以取贵」：财、印不紧挨（年月相邻）才是位置妥贴
      if (hasRole('印') && hasRole('财')) {
        if (adjacentPair(transparentRole('财'), transparentRole('印'))) add(flaw, `财（${whereRole('财')}）与印（${whereRole('印')}）年月相邻，财印相克。`, '财格透印而位置不妥（论财）');
        else add(success, `财透而印（${whereRole('印')}）亦透，两不相邻。`, '财格透印而位置妥贴，两不相克', ['印']);
      }
      // 论财「壬生午月，癸生巳月，单透财而亦贵，以月令有暗官也」
      if (hasRole('财') && !has('正官') && !has('七杀') && monthHidden.some((name) => name === '正官' || name === '七杀')) add(success, `财透于${whereRole('财')}，月令${month.zhi}藏官。`, '单透财而亦贵，以月令有暗官也（论财）', [monthHidden.includes('正官') ? '正官' : '七杀']);
      const jieHeavy = hasRole('比劫') && (roleShare['比劫'] ?? 0) > (roleShare['财'] ?? 0);
      if (jieHeavy) {
        add(failure, `比劫透于${whereRole('比劫')}，比劫 ${Math.round(roleShare['比劫'])}% 重于财 ${Math.round(roleShare['财'])}%。`, '财轻比重');
        if (hasRole('食伤')) add(rescue, `食伤透于${whereRole('食伤')}，化比劫生财。`, '财逢劫而透食以化之', ['食伤']);
        if (has('正官')) add(rescue, `正官透于${where('正官')}，制比劫护财。`, '生官以制之', ['正官']);
      }
      if (has('七杀')) {
        add(failure, `七杀透于${where('七杀')}，财党杀攻身。`, '财透七煞');
        if (has('食神')) add(rescue, `食神透于${where('食神')}，制杀生财。`, '逢煞而食神制煞以生财', ['食伤']);
        const merged = stemMerged('七杀');
        if (merged.length) add(rescue, `${stemsText(merged)}之杀被合去。`, '存财而合煞', partnersOf(merged));
        // 赵侍郎「有财用煞印者，党煞为忌，印以化之，格成富局……又不露财以杂其印，所以贵也。若财用煞印，而财煞并透，非独不贵，亦不富矣」
        if (hasRole('印') && !hasRole('财')) add(rescue, `印星透于${whereRole('印')}，化杀生身，财不透干而不杂印。`, '财用煞印，印以化之（论财）', ['七杀', '印']);
      }
      if (has('正官') && !failure.length) {
        if (has('伤官')) add(flaw, `伤官透于${where('伤官')}，伤及所生之官。`, '财旺生官，而又逢伤');
        const merged = stemMerged('正官');
        if (merged.length) add(flaw, `正官${stemsText(merged)}被合。`, '财旺生官，而又逢合');
      }
      break;
    }
    case '印格': {
      const yinShare = roleShare['印'] ?? 0;
      const caiShare = roleShare['财'] ?? 0;
      const shiShare = roleShare['食伤'] ?? 0;
      const yinLight = yinShare < 20;
      const yinHeavy = yinShare >= 30;
      // 论印绶的「身重」「身轻」看日主自家的比劫根气，不把印生身算进去：茅状元 己巳 癸酉 癸未 庚申，印 43%、比劫 14%，书曰「身轻印重」
      const bodyHeavy = strong && (roleShare['比劫'] ?? 0) >= 20;
      const sha = has('七杀');
      const shiShang = hasRole('食伤');
      // 「若身印重而七其煞，非孤则贫矣」——但「用煞而兼带伤食者……不论身旺印重，皆为贵格」
      const shaHeavyFail = sha && !shiShang && bodyHeavy && yinHeavy;
      if (sha && shiShang) add(success, `七杀（${where('七杀')}）生印，食伤（${whereRole('食伤')}）又制杀泄身，用煞有制，生身有泄。`, '用煞而兼带伤食者，则用煞而有制，生身而有泄，不论身旺印重，皆为贵格（论印绶）', ['七杀', '食伤']);
      else if (sha && yinLight) add(success, `印星不重，七杀（${where('七杀')}）生印。`, '印轻逢煞', ['七杀']);
      else if (sha && !shaHeavyFail && !hasRole('财')) add(success, `${bodyHeavy ? '身重印轻' : '身轻印重'}，七杀（${where('七杀')}）生印，有所不足，始为有情。`, '用偏官者……必身重印轻，或身轻印重，有所不足，始为有情（论印绶）', ['七杀']);
      if (has('正官')) {
        // 朱尚书「壬为戊伤，壬不伤官也」、临淮侯「己为乙制，己不碍官也」：印透干则伤食被制，不碍官
        const guarded = shiShang && hasRole('印');
        add(success, `正官透于${where('正官')}，官印双全${guarded ? `，伤食（${whereRole('食伤')}）被透干之印（${whereRole('印')}）制住，不碍官` : ''}。`, guarded ? '官印双全；带伤食而贵者，壬为戊伤，己为乙制，不碍官也（论印绶）' : '官印双全', ['正官']);
        if (shiShang && !hasRole('印') && !sha) add(flaw, `伤食（${whereRole('食伤')}）透而印不透干，伤食碍官。`, '印而透官者……只要官星清（论印绶）');
        if (sha) {
          const merged = stemMerged('七杀');
          if (merged.length && !shaHeavyFail) add(success, `七杀${stemsText(merged)}被合去，留官。`, '印而透兼官煞者，或合煞……皆为贵格（论印绶）', ['正官', ...partnersOf(merged)]);
          else if (shiShang) add(success, `官杀并透而食伤（${whereRole('食伤')}）制杀，官星得清。`, '印而透兼官煞者……或有制，皆为贵格（论印绶）', ['正官', '食伤']);
          else if (!merged.length) add(flaw, `正官与七杀（${where('七杀')}）并透，官杀混杂。`, '印而透兼官煞者，或合煞，或有制，皆为贵格（论印绶）');
        }
      }
      if (strong && shiShang) add(success, `身印两旺，食伤（${whereRole('食伤')}）泄秀。`, '身印两旺而用食伤泄气', ['食伤']);
      // 论印绶「若印浅身轻，而用层层伤食，则寒贫之局矣」：层层是两位以上伤食透干；透煞的归「用煞兼带伤食」一条
      if (weak && shiShang && !sha && yinShare < 25 && shiShare > yinShare && transparentRole('食伤').length >= 2) add(failure, `身${bandText}而印浅（${Math.round(yinShare)}%），伤食（${whereRole('食伤')}）层层（${Math.round(shiShare)}%），泄身太过。`, '印浅身轻，而用层层伤食，则寒贫之局（论印绶）');
      // 汪侍郎「印重身强，透财以抑太过，权而用之，不要根深」
      if (strong && yinHeavy && hasRole('财') && caiShare < 20 && caiShare < yinShare) add(success, `印多（${Math.round(yinShare)}%），财（${whereRole('财')}）透而根轻，损印有度。`, '印多逢财而财透根轻', ['财']);
      // 「若印轻财重，又无劫财以救，则为贪财破印，贫贱之局矣」：印轻看绝对分量，也看与财相较（财比印重十个点以上）
      if ((yinLight || caiShare >= yinShare + 10) && hasRole('财')) {
        add(failure, `${yinLight ? '印星不重' : `印轻（${Math.round(yinShare)}%）财重（${Math.round(caiShare)}%）`}而财透于${whereRole('财')}，贪财破印。`, yinLight ? '印轻逢财' : '印轻财重，又无劫财以救，则为贪财破印（论印绶）');
        if (hasRole('比劫')) add(rescue, `比劫透于${whereRole('比劫')}，制财护印。`, '印逢财而劫财以解之', ['比劫']);
        const merged = roleMerged('财');
        if (merged.length) add(rescue, `财${stemsText(merged)}被合去。`, '合财而存印', partnersOf(merged));
      }
      if (shaHeavyFail) {
        add(failure, `身强印重（印 ${Math.round(yinShare)}%），七杀透于${where('七杀')}反生印。`, '身强印重而透煞');
        // 论印绶「辛亥 庚子 甲辰 乙亥，此合煞留官也」
        const merged = stemMerged('七杀');
        if (merged.length) add(rescue, `${stemsText(merged)}之杀被合去${has('正官') ? '，留官' : ''}。`, '合煞留官（论印绶）', has('正官') ? ['正官'] : partnersOf(merged));
      }
      // 论印绶「更有印透七煞，而劫财以存煞印，亦有贵格」
      if (has('七杀') && hasRole('财') && hasRole('比劫') && !failure.length) add(success, `七杀（${where('七杀')}）透而财（${whereRole('财')}）亦透，劫财（${whereRole('比劫')}）制财以存煞印。`, '印透七煞，而劫财以存煞印（论印绶）', ['七杀', '比劫']);
      if (!failure.length && hasRole('食伤') && hasRole('财')) {
        // 牛监簿「乙合庚而不生丙」、「己未 甲戌 辛未 癸巳，此合财存食之贵也」：食伤或财被合去，便不成财坏印
        const foodMerged = roleMerged('食伤');
        const wealthMerged = roleMerged('财');
        if (foodMerged.length) add(rescue, `食伤${stemsText(foodMerged)}被合而不生财。`, '食被合而不生财（论印绶）', partnersOf(foodMerged));
        else if (wealthMerged.length) add(rescue, `财${stemsText(wealthMerged)}被合去。`, '合财存食（论印绶）', ['食伤']);
        else add(flaw, `食伤泄秀而财（${whereRole('财')}）又露，财坏印。`, '印透食以泄气，而又遇财露');
      }
      break;
    }
    case '食神格': {
      // 论食神「偏正叠出，富贵不巨」（龚知县 甲午 丁卯 癸丑 丙辰）
      if (hasRole('财') && !has('七杀')) add(success, `食神生财（${whereRole('财')}）${has('正财') && has('偏财') ? '，财偏正叠出，富贵不巨' : ''}。`, '食神生财', ['财']);
      if (has('七杀') && !hasRole('财')) add(success, `食神制杀（${where('七杀')}）而不见财。`, '食带煞而无财', ['七杀']);
      if (has('七杀') && hasRole('印')) add(success, `杀印（${where('七杀')}、${whereRole('印')}）并透，弃食就杀。`, '弃食就煞而透印', ['七杀', '印']);
      // 论食神「至若单用食神，作食神有气，有财运则富，无财运则贫」；钱参政 丙午 癸巳 甲子 丙寅「夏火太炎，而木焦透印不碍」
      if (hasRole('食伤') && !hasRole('财') && !hasRole('官杀') && !has('偏印')) {
        if (!has('正印')) add(success, `单用食神（${whereRole('食伤')}），食神当令有气，不见财官。`, '单用食神，作食神有气（论食神）', ['食伤']);
        else if (dayWuxing === '木' && ['巳', '午'].includes(month.zhi)) add(success, `夏木食神太炎，正印（${where('正印')}）透而不碍。`, '夏火太炎，而木焦透印不碍（论食神）', ['食伤', '印']);
      }
      // 论食神「食神忌官，金水不忌」；「食神而官煞竞出，亦可成格，但不甚贵耳」
      if (has('正官') && !has('七杀') && !shangGuanJinShui) add(flaw, `正官透于${where('正官')}，食神忌官。`, '食神忌官，金水不忌（论食神）');
      if (has('偏印')) {
        add(failure, `偏印透于${where('偏印')}，枭神夺食。`, '食神逢枭');
        if (has('七杀')) add(rescue, `七杀透于${where('七杀')}，弃食就杀成格。`, '食逢枭而就煞以成格', ['七杀']);
        if (hasRole('财')) add(rescue, `财透于${whereRole('财')}，制枭护食。`, '生财以护食', ['财']);
      }
      if (hasRole('财') && has('七杀')) {
        add(failure, `财（${whereRole('财')}）与七杀（${where('七杀')}）并露，财生杀。`, '生财露煞');
        // 刘提督「食神透煞，本忌见财，而财先煞后，食以间之，而财不能党煞，亦可就贵」
        const foodAtMonth = transparent('食神').some((stem) => stem.key === 'month');
        const apart = transparentRole('财').every((stem) => stem.key === 'year') && transparent('七杀').every((stem) => stem.key === 'time');
        if (foodAtMonth && apart) add(rescue, '财在年、杀在时，食神居中间之，财不能党杀。', '财先煞后，食以间之（论食神）', ['七杀']);
        // 论食神「更有食神合煞存财，最为贵格」
        const merged = stemMerged('七杀');
        if (merged.length) add(rescue, `七杀${stemsText(merged)}被合去，存财。`, '食神合煞存财，最为贵格（论食神）', partnersOf(merged));
      }
      if (!failure.length && has('七杀') && hasRole('印') && hasRole('财')) add(flaw, `杀印并透又见财（${whereRole('财')}）。`, '食神带煞印，而又逢财');
      break;
    }
    case '七杀格': {
      const zhi = has('食神') || has('伤官');
      // 「乙亥 乙酉 乙卯 丁丑，极等之贵也」：日主中和而食神制杀亦成，只要不弱
      const notWeak = strength.band !== '偏弱' && strength.band !== '极弱';
      const shaShare = roleShare['官杀'] ?? 0;
      const shiShare = roleShare['食伤'] ?? 0;
      if (notWeak && zhi) add(success, `身${bandText}，食伤（${whereRole('食伤')}）制杀。`, '身强七煞逢制', ['食伤']);
      // 论偏官「煞用食制，不宜露财透印，以财能夺食生煞……然而财先食后，财生用而食以制之，格成大贵」（脱脱丞相 壬辰 甲辰 丙戌 戊戌：财在年，食在时）
      if (notWeak && zhi && hasRole('财') && !hasRole('印')) {
        const caiFirst = transparentRole('财').every((stem) => stem.key === 'year') && transparentRole('食伤').every((stem) => stem.key !== 'year');
        if (caiFirst) add(success, `财（${whereRole('财')}）在年、食伤（${whereRole('食伤')}）在后，财生煞而食以制之。`, '财先食后，财生用而食以制之，格成大贵（论偏官）', ['财', '食伤']);
        else add(flaw, `食伤制杀而又露财（${whereRole('财')}），财能夺食生煞。`, '煞用食制，不宜露财（论偏官）');
      }
      if (hasRole('印')) {
        // 何参政「煞印有情」；刘运使「身重煞轻，煞又化印，用神不清而借财以清格」
        if (!zhi) add(success, `印星透于${whereRole('印')}，化杀生身${strong && hasRole('财') ? `，身重煞轻，借财（${whereRole('财')}）以清格` : ''}。`, '煞用印化（论偏官）', strong && hasRole('财') ? ['印', '财'] : ['印']);
        // 周丞相「食被印制，不能伏煞，而财以去印存食，便为贵格」：成败篇归在「煞逢食制，印来护煞，而逢财以去印存食」的败中有成
        else if (hasRole('财')) {
          if (notWeak && shaShare >= 25 && shiShare < 15) add(failure, `煞强（${Math.round(shaShare)}%）食浅（${Math.round(shiShare)}%）而印（${whereRole('印')}）露，印去食护煞。`, '煞强食浅而露印，则破局矣（论偏官）');
          else add(flaw, `食伤制杀而印（${whereRole('印')}）又夺食。`, '七煞逢食制，而又逢印');
          add(rescue, `财透于${whereRole('财')}，去印存食。`, '逢财以去印存食', ['财']);
        }
        // 「亦有煞重身轻，用食则身不能当，不若专而朝印……格亦许贵，但不大耳」
        else if (!notWeak) add(success, `煞重身${bandText}，食伤不能当，专而朝印（${whereRole('印')}）。`, '煞重身轻，用食则身不能当，不若专而朝印（论偏官）', ['印']);
        // 脱脱丞相「食太重而透甲，印以损太过，岂非贵格」
        else if (shiShare >= 25) add(success, `食伤太重（${Math.round(shiShare)}%），印（${whereRole('印')}）透以损其太过。`, '食太重而透印，印以损太过（论偏官）', ['食伤', '印']);
        // 「若煞强食浅而露印，则破局矣」
        else if (shaShare >= 25 && shiShare < 15) add(failure, `煞强（${Math.round(shaShare)}%）食浅（${Math.round(shiShare)}%）而印（${whereRole('印')}）露，印去食护煞。`, '煞强食浅而露印，则破局矣（论偏官）');
        else add(flaw, `食伤制杀而印（${whereRole('印')}）又夺食。`, '七煞逢食制，而又逢印');
      }
      if (hasRen) add(success, `日主坐刃（${REN[dayGan]}），刃杀相济。`, '煞用阳刃（论偏官）', ['比劫']);
      // 何参政「煞印有情」、刘运使「煞又化印……借财以清格」：有印化煞的，见财不作无制论
      if (hasRole('财') && !zhi && !hasRole('印')) {
        add(failure, `财透于${whereRole('财')}而七杀无食伤制。`, '七煞逢财无制');
      }
      // 岳统制「去官留煞也……月令偏官煞为用，而官非用」：官杀混杂，官被伤克、被合去则清
      if (has('正官')) {
        const guanMerged = stemMerged('正官');
        const guanHurt = has('伤官');
        add(flaw, `正官透于${where('正官')}，官杀混杂。`, '官煞混杂（论偏官）');
        if (guanMerged.length || guanHurt) add(rescue, `${guanMerged.length ? `正官${stemsText(guanMerged)}被合去` : `伤官（${where('伤官')}）克去正官`}，去官留杀。`, '去官留煞（论偏官）', guanMerged.length ? partnersOf(guanMerged) : ['食伤']);
      }
      break;
    }
    case '伤官格': {
      // 罗状元 甲子 乙亥 辛未 戊子「会未成局，化水为木，化之生财，尤为有情」
      const huaCai = monthJuHas('财');
      if (hasRole('财') && !has('七杀')) add(success, `伤官生财（${whereRole('财')}）${huaCai ? `，月令${month.zhi}会局化伤为财，尤为有情` : ''}。`, huaCai ? '伤官生财；化伤为财，大为秀气（论伤官）' : '伤官生财', ['财']);
      if (hasRole('印') && weak) {
        add(success, `身${bandText}，印（${whereRole('印')}）制伤护身。`, '伤官佩印', ['印']);
        // 论伤官「然印要根深，不必多见，偏正叠出，凡为不秀」
        if (has('正印') && has('偏印')) add(flaw, `印偏正叠出（${whereRole('印')}）。`, '印要根深，不必多见，偏正叠出，凡为不秀（论伤官）');
      }
      if (has('七杀') && !hasRole('财')) add(success, `伤官驾杀（${where('七杀')}）而不见财。`, '伤官带煞而无财', ['七杀']);
      // 论伤官「有伤官兼用财印者，财印相克，本不并用，只要干头两清而不相碍……反是则财印不并用而不秀矣」；
      // 透官的归「伤官用官」一条（戊申 甲子 庚午 丁丑「戊甲为辅」，财印相邻不以相碍论）
      if (hasRole('财') && hasRole('印') && !has('正官')) {
        if (adjacentPair(transparentRole('财'), transparentRole('印'))) add(flaw, `财（${whereRole('财')}）与印（${whereRole('印')}）年月相邻，财印相克而不并用。`, '财印相克，本不并用……反是则财印不并用而不秀矣（论伤官）');
        else add(success, `财（${whereRole('财')}）与印（${whereRole('印')}）干头两清，不相碍。`, '伤官兼用财印……只要干头两清而不相碍（论伤官）', ['财', '印']);
      }
      if (has('正官')) {
        const guanMerged = stemMerged('正官');
        const shaMerged = has('七杀') ? stemMerged('七杀') : [];
        if (shangGuanJinShui) {
          add(success, `金水伤官见官（${where('正官')}），原书所许。`, '伤官非金水而见官（金水伤官例外）', ['正官']);
          // 论伤官「有伤官用官者，他格不用，金水独宜。然要财印为辅，不可伤官并透……若孤官无辅，或官伤并透，则发福不大矣」
          if (!guanMerged.length && !hasRole('财') && !hasRole('印')) add(flaw, `正官（${where('正官')}）无财印相辅，孤官无辅。`, '伤官用官……然要财印为辅；孤官无辅，则发福不大（论伤官）');
          if (!guanMerged.length && has('伤官')) add(flaw, `伤官（${where('伤官')}）与正官并透。`, '不可伤官并透……官伤并透，则发福不大（论伤官）');
        } else {
          add(failure, `正官透于${where('正官')}，伤官见官。`, '伤官非金水而见官');
          if (hasRole('印')) add(rescue, `印星透于${whereRole('印')}，制伤护官。`, '官逢伤而透印以解之', ['印']);
          // 章丞相 甲子 壬申 己亥 辛未「化伤为财，伤非其伤，作财旺生官，而不作伤官见官」
          if (hasRole('财') && huaCai) add(rescue, `月令${month.zhi}会局化伤为财，财（${whereRole('财')}）旺生官。`, '化伤为财，伤非其伤，作财旺生官，而不作伤官见官（论伤官）', ['财']);
          // 论伤官「伤官而官煞并透，只要干头取清」：官被合去，伤官无官可见
          if (has('七杀') && guanMerged.length) add(rescue, `官煞并透而正官${stemsText(guanMerged)}被合去，干头取清。`, '伤官而官煞并透，只要干头取清（论伤官）', partnersOf(guanMerged));
        }
        if (has('七杀') && !guanMerged.length && !shaMerged.length) add(flaw, `正官与七杀（${where('七杀')}）并透而干头不清。`, '伤官而官煞并透，只要干头取清……不然则空结构而已（论伤官）');
      }
      if (hasRole('财') && has('七杀')) {
        add(failure, `伤官生财（${whereRole('财')}）而七杀（${where('七杀')}）又透，财生杀。`, '生财生带煞');
        const merged = stemMerged('七杀');
        if (merged.length) add(rescue, `${stemsText(merged)}之杀被合去。`, '伤官生财透煞而煞逢合', partnersOf(merged));
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
      if (guanSha && (hasRole('财') || hasRole('印')) && !shiShang) add(success, `官杀（${guanShaStem ? whereRole('官杀') : '地支'}）制刃，财印（${[hasRole('财') ? whereRole('财') : '', hasRole('印') ? whereRole('印') : ''].filter(Boolean).join('、')}）相随，不见伤官。`, '阳刃透官煞而露财印，不见伤官', [has('七杀') ? '七杀' : has('正官') ? '正官' : '官杀']);
      if (!guanSha) {
        add(failure, '天干地支不见官杀，刃无所制。', '阳刃无官煞');
        // 论阳刃「羊刃用财，格所不喜。然财根深，而用伤食任专，刃生财……亦可就富。不然，则刃与财相搏，不成局矣」
        if (hasRole('财') && hasRole('食伤') && (roleShare['财'] ?? 0) >= 20) add(rescue, `财（${whereRole('财')}）根深，伤食（${whereRole('食伤')}）化刃生财。`, '财根深，而用伤食任专，刃生财……亦可就富（论阳刃）', ['食伤', '财']);
      }
      // 论阳刃「羊刃露煞，透刃无成……丁与壬合，则七煞有贪合忘克之意，如何制刃？故无功也」
      if (has('七杀') && !has('正官')) {
        const shaMergedByJie = transparent('七杀').filter((stem) => stems.some((other) => other.key !== stem.key && canMerge(stem, other) && ROLE_LABEL[other.shiShen] === '比劫' && getGanPairKinds(stem.gan, other.gan).includes('合')));
        if (shaMergedByJie.length) add(failure, `七杀${stemsText(shaMergedByJie)}被透干之劫财合住，贪合忘克，不能制刃。`, '羊刃露煞，透刃无成（论阳刃）');
      }
      if (guanSha && shiShang) {
        // 论阳刃「然亦有官煞制刃，带伤食而贵，何也？或是印护，或是煞太重而裁损之，官煞轻而取清之」
        const hurt = transparentRole('食伤');
        const hurtMerged = roleMerged('食伤');
        const shaStems = transparent('七杀');
        if (hasRole('印') && (hurtMerged.length || (roleShare['印'] ?? 0) >= 20)) add(success, `伤食（${stemsText(hurt)}）${hurtMerged.length ? `被${whereRole('印')}合去` : `被重印（${whereRole('印')}）制住`}，官杀得护。`, '官煞制刃带伤食而贵：印护（论阳刃）', [has('七杀') ? '七杀' : has('正官') ? '正官' : '官杀', '印']);
        else if (shaStems.length >= 2) add(success, `七杀两透（${stemsText(shaStems)}），太重，伤食（${stemsText(hurt)}）裁损之。`, '官煞制刃带伤食而贵：煞太重而裁损之（论阳刃）', ['七杀', '食伤']);
        else if (has('正官') && has('七杀') && (stemMerged('正官').length || stemMerged('七杀').length)) add(success, `官杀并透而${stemsText([...stemMerged('正官'), ...stemMerged('七杀')])}被合去，官杀纯而不杂。`, '官煞制刃带伤食而贵：官煞轻而取清之（论阳刃）', [stemMerged('正官').length ? '七杀' : '正官']);
        else add(flaw, `官杀被伤食（${stemsText(hurt)}）克。`, '阳刃透官，而又被伤');
      }
      break;
    }
    case '建禄月劫': {
      const caiShare = roleShare['财'] ?? 0;
      // 李知府「有用官而财助者」（丁酉 丙午 丁巳 壬寅）：酉中辛财在地支助官也算
      if (has('正官')) {
        if (hasRole('财') || hasRole('印') || benQiHas('财')) {
          add(success, `正官透于${where('正官')}，财印相随。`, '透官而逢财印', ['正官']);
          // 王少师 庚午 戊子 癸卯 丁巳「只要以官隔之，使财印两不相伤，其格便大」
          if (hasRole('财') && hasRole('印') && adjacentPair(transparentRole('财'), transparentRole('印'))) add(flaw, `财（${whereRole('财')}）与印（${whereRole('印')}）年月相邻，未以官隔之，两相伤。`, '用官而兼带财印者……只要以官隔之，使财印两不相伤（论建禄月劫）');
        } else add(flaw, `正官透于${where('正官')}而无财印相辅，孤官无辅。`, '用官而孤官无辅，格局便小，难于取贵（论建禄月劫）');
        // 「倘若两官竞出，亦须制伏，所谓争正官，不可无伤也」
        if (transparent('正官').length >= 2) {
          if (has('伤官')) add(success, `两官竞出（${where('正官')}），伤官（${where('伤官')}）制之。`, '两官竞出，亦须制伏，所谓争正官，不可无伤也（论建禄月劫）', ['正官', '食伤']);
          else add(flaw, `两官竞出（${where('正官')}）而无伤官制伏。`, '两官竞出，亦须制伏，所谓争正官，不可无伤也（论建禄月劫）');
        }
      }
      // 高尚书「即以劫财之金，化为生财之水」：申子会水局是食伤；娄参政「卯未会局以制伏」
      if (hasRole('财') && (hasRole('食伤') || juHas('食伤'))) add(success, `财（${whereRole('财')}）透而食伤（${hasRole('食伤') ? whereRole('食伤') : '地支会局'}）生之。`, '透财而逢食伤', ['财', '食伤']);
      // 「丑与巳会，即以劫财之火，化为金局之财，安得不为大贵？所谓化劫为财也」（己未 己巳 丁未 辛丑）
      if (hasRole('财') && monthJuHas('财')) add(success, `月令${month.zhi}与它支会成财局，劫化为财。`, '化劫为财，与化劫为生，尤为秀气（论建禄月劫）', ['财']);
      // 「禄劫用财，须带伤食……用财而不透伤食，难于发福。然干头透一位，而不杂，地支根多，亦可取富，但不贵耳」
      if (hasRole('财') && !hasRole('食伤') && !juHas('食伤') && !monthJuHas('财') && !has('正官') && !has('七杀')) {
        add(failure, `财（${whereRole('财')}）透而不透伤食，月令劫财与财相克，无以化之。`, '禄劫用财，须带伤食……用财而不透伤食，难于发福（论建禄月劫）');
        const caiStems = transparentRole('财');
        const pure = caiStems.length === 1 && stems.every((stem) => ['财', '比劫'].includes(ROLE_LABEL[stem.shiShen]));
        if (pure && caiShare >= 20) add(rescue, `干头只透一位财（${stemsText(caiStems)}）而不杂，财根（${Math.round(caiShare)}%）在地支。`, '干头透一位，而不杂，地支根多，亦可取富，但不贵耳（论建禄月劫）', ['财']);
      }
      if (has('七杀') && (hasRole('食伤') || juHas('食伤'))) add(success, `七杀透于${where('七杀')}，食伤${hasRole('食伤') ? '' : '会局'}制伏。`, '透煞而遇制伏', ['七杀', '食伤']);
      // 「禄劫用煞，必须制伏」「用官煞重而无制伏，运行制伏，亦可发财，但不可官煞太重，致令身危也」
      if (has('七杀') && !hasRole('食伤') && !juHas('食伤') && !hasRole('印')) add(flaw, `七杀透于${where('七杀')}而无食伤制伏。`, '禄劫用煞，必须制伏（论建禄月劫）');
      if (!hasRole('财') && !hasRole('官杀')) {
        // 张状元「甲子 丙寅 甲子 丙寅，木火通明」、「癸卯 庚申 庚子 庚辰，金水相涵」：禄劫无财官而用伤食泄其太过，亦为秀气
        if (hasRole('食伤') && !weak) add(success, `无财官而食伤（${whereRole('食伤')}）透，泄其太过。`, '禄劫之格，无财官而用伤食，泄其太过，亦为秀气（论建禄月劫）', ['食伤']);
        else add(failure, '天干不见财官，禄劫无所用。', '无财官');
      }
      if (has('七杀') && hasRole('印') && !hasRole('食伤') && !juHas('食伤')) add(failure, `七杀（${where('七杀')}）与印（${whereRole('印')}）并透而无制。`, '透煞印');
      // 一平章「辛丑 庚寅 甲辰 乙亥，合煞留官也」、「辛亥 庚寅 甲申 丙寅，制煞留官也」
      if (has('正官') && has('七杀')) {
        add(flaw, `正官（${where('正官')}）与七杀（${where('七杀')}）并透，官杀混杂。`, '官煞混杂');
        const merged = stemMerged('七杀');
        if (merged.length) add(rescue, `七杀${stemsText(merged)}被合去，留官。`, '合煞留官（论建禄月劫）', ['正官']);
        else if (hasRole('食伤')) add(rescue, `食伤（${whereRole('食伤')}）制杀，留官。`, '制煞留官（论建禄月劫）', ['正官']);
      }
      // 「若透伤食，便为破格。然亦有官伤并透而贵者……庚合乙，而去伤存官」（王总兵 己酉 乙亥 壬戌 庚子）：合住伤食的得是官以外的干
      if (has('正官') && hasRole('食伤')) {
        add(flaw, `透官而伤食（${whereRole('食伤')}）克之。`, '建禄月劫透官，而遇伤');
        const merged = transparentRole('食伤').filter((stem) => stems.some((other) => other.key !== stem.key && other.shiShen !== '正官' && canMerge(stem, other) && getGanPairKinds(stem.gan, other.gan).includes('合')));
        if (merged.length) add(rescue, `伤食${stemsText(merged)}被合，去伤存官。`, '用官，遇伤而伤被合', ['正官', ...partnersOf(merged)]);
      }
      if (hasRole('财') && has('七杀')) {
        add(flaw, `透财而七杀（${where('七杀')}）又透。`, '透财而遇煞');
        const merged = stemMerged('七杀');
        if (merged.length) add(rescue, `七杀${stemsText(merged)}被合。`, '用财带煞而煞被合', ['财', ...partnersOf(merged)]);
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
  // 相神（论相神紧要「月令既得用神，则别位亦必有相……辅我用神者是也」）：成格、救应各条里辅成此格的那一位
  const xiangShen = verdict === '败' ? [] : [...new Set([...success, ...rescue].flatMap((item) => item.xiang ?? []))];
  const summaryText = (parts.length ? parts.join('') : `${seenText}未构成原书所列的成格或破格条件，需看地支与全局。`) + (xiangShen.length ? `相神：${xiangShen.join('、')}。` : '');

  const result = {
    group,
    verdict,
    success,
    failure,
    flaw,
    rescue,
    xiangShen,
    summary: summaryText,
    source: cite(CHENG_BAI_SOURCE.classic, CHENG_BAI_SOURCE.section),
    quotes: { 成: q.成[group], 败: q.败[group] },
  };
  // 格局取运（各格「取运」篇）：按成格、救应的那一条配运，给大运流年的十神定喜忌
  result.quYun = quYunOf(result, { stems: stems.map((stem) => stem.shiShen), share: roleShare, strong, weak });
  return result;
};
