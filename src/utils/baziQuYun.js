/**
 * 格局取运：按《子平真诠》各格的「取运」篇，拿格局所成之局配运。
 *
 * 原书「取运之道，一八字则有一八字之论……如正官取运，即以正官所就之格，分而配之」——先看成败判定里记下的
 * 成格、救应是哪一条，再取对应的取运条文，给运干、运支的十神定喜忌。这只是原书口径的参照，
 * 不改「五行与旺衰」一节按扶抑、调候取的喜忌；两边说法不同时，界面与提示词都并列给出。
 * 原书没写到的十神不下结论（返回 null）；身旺、助身按比劫论，印绶另算。
 */
import { cite } from '../data/classics.js';
import { getGanPairKinds, getZhiPairKinds } from './baziRelations.js';

/** 十神 → 取运条文里的类别 */
export const QU_YUN_ROLE = Object.freeze({ 正官: '正官', 七杀: '七杀', 正财: '财', 偏财: '财', 正印: '印', 偏印: '印', 食神: '食伤', 伤官: '食伤', 比肩: '比劫', 劫财: '比劫' });

const ROLES = ['正官', '七杀', '财', '印', '食伤', '比劫'];

const SECTION_OF = Object.freeze({
  正官格: '论正官取运', 财格: '论财取运', 印格: '论印绶取运', 食神格: '论食神取运', 七杀格: '论偏官取运', 伤官格: '论伤官取运', 羊刃格: '论阳刃取运', 建禄月劫: '论建禄月劫取运',
});

/**
 * 各格的取运条文。ctx：
 * - q(片段)：成败判定里有没有引到这句原文（成格、救应、成中有败、败各条的 quote）
 * - has(类别)／count(类别)：天干透出某类十神的个数；stems：透出的十神名
 * - share：各类十神的分量（百分比）；strong／weak：原书只分身强身弱的口径；xiang：相神
 * 每条返回 { text, favor }，favor 里 good 喜、bad 忌、neutral 不忌，没写到的不设。
 */
const RULES = {
  正官格(ctx) {
    const favor = {};
    const texts = ['正官……若官露而不可逢食，不可杂煞，不可重官，与地支刑冲，不问所就何局，皆不利也'];
    favor.食伤 = 'bad'; favor.七杀 = 'bad'; favor.正官 = 'bad';
    if (ctx.has('财') && !ctx.has('印')) {
      texts.push('正官用财，运喜印缓身旺之地，切忌食伤。若身旺而财轻官弱，即仍取财官运可也');
      favor.印 = 'good'; favor.比劫 = 'good';
      if (ctx.strong && ctx.share.财 < 20 && ctx.share.官杀 < 20) { favor.财 = 'good'; favor.正官 = 'good'; }
    } else if (ctx.has('印') && !ctx.has('财')) {
      texts.push('正官佩印，运喜财乡，伤食反吉。若官重身轻而佩印，则身旺为宜，不必财运也');
      if (ctx.weak && ctx.share.官杀 >= 25) { favor.比劫 = 'good'; favor.印 = 'good'; favor.财 = 'neutral'; } else { favor.财 = 'good'; favor.食伤 = 'good'; }
    } else if (ctx.has('财') && ctx.has('印')) {
      texts.push('正官而用财印，身稍轻则取助身，官稍轻则取助官');
      if (ctx.weak) { favor.比劫 = 'good'; favor.印 = 'good'; } else if (ctx.share.官杀 < 20) { favor.财 = 'good'; favor.正官 = 'good'; }
    }
    if (ctx.q('官逢伤而透印以解之')) {
      texts.push('正官带伤食而用印制，运喜官旺印旺之乡，财运功忌，伤食反为不得。若印缓叠出，财运亦无害矣');
      favor.正官 = 'good'; favor.印 = 'good'; favor.食伤 = 'bad'; favor.财 = ctx.count('印') >= 2 ? 'neutral' : 'bad';
    }
    if (ctx.q('杂煞而合煞以清之')) {
      if (ctx.xiang.includes('食伤')) { texts.push('若命伤官合煞，则伤食与财俱可行，而不宜逢印矣'); favor.食伤 = 'good'; favor.财 = 'good'; favor.印 = 'bad'; }
      else { texts.push('正官而带煞，其命中用比合煞，则财运可行，伤食可行，身旺印缓亦可行，只不可复露七煞'); favor.财 = 'good'; favor.食伤 = 'good'; favor.比劫 = 'good'; favor.印 = 'good'; favor.七杀 = 'bad'; }
    }
    return { texts, favor, clashMonth: true };
  },
  财格(ctx) {
    const favor = {};
    const texts = [];
    if (ctx.q('财生官旺')) {
      texts.push('其财旺生官者，运喜身旺印缓，不利七煞伤官');
      favor.比劫 = 'good'; favor.印 = 'good'; favor.七杀 = 'bad'; favor.食伤 = 'bad';
      if (ctx.has('印')) { texts.push('若生官而复透印，伤官之地，不甚有害'); favor.食伤 = 'neutral'; }
      if (ctx.q('财旺生官，而又逢伤')) { texts.push('至于生官而带食破局，则运喜缓印，而逢煞反吉矣'); favor.印 = 'good'; favor.七杀 = 'good'; }
    } else if (ctx.q('财逢食生而身强带比') || ctx.q('食与印而不相碍') || ctx.q('去食护官')) {
      if (ctx.has('印')) {
        texts.push('财用食印，财轻则喜财食，身轻则喜比印。官运亦碍，煞反不忌也');
        if (ctx.share.财 < 20) { favor.财 = 'good'; favor.食伤 = 'good'; }
        if (ctx.weak) { favor.比劫 = 'good'; favor.印 = 'good'; }
        favor.正官 = 'bad'; favor.七杀 = 'neutral';
      } else {
        texts.push('财用食生，财食重而身轻，则喜助身；财食轻而身重，则仍行财食。煞运不忌，官运反晦矣');
        if (ctx.weak || (!ctx.strong && ctx.share.财 + ctx.share.食伤 >= 45)) { favor.比劫 = 'good'; favor.印 = 'good'; } else { favor.财 = 'good'; favor.食伤 = 'good'; }
        favor.七杀 = 'neutral'; favor.正官 = 'bad';
      }
    } else if (ctx.q('财格透印而位置妥贴')) {
      texts.push('财格佩印，运喜官乡，身弱逢之，最喜印旺');
      favor.正官 = 'good';
      if (ctx.weak) favor.印 = 'good';
    }
    if (ctx.stems.includes('伤官') && (ctx.q('财逢劫而透食以化之') || ctx.q('财旺无劫，而透伤'))) {
      texts.push('财带伤官，财运则亨，煞运不利，运行官印，未见其美矣');
      favor.财 = 'good'; favor.七杀 = 'bad'; favor.正官 = 'bad'; favor.印 = 'bad';
    }
    if (ctx.q('财透七煞')) {
      if (ctx.q('财用煞印')) { texts.push('财用煞印，印旺最宜逢财，必忌伤食之方'); favor.财 = 'good'; favor.食伤 = 'bad'; }
      else { texts.push('财带七煞，不论合煞制煞，运喜伤食身旺之方'); favor.食伤 = 'good'; favor.比劫 = 'good'; }
    }
    return { texts, favor };
  },
  印格(ctx) {
    const favor = {};
    const texts = [];
    if (ctx.q('官印双全')) {
      if (ctx.has('食伤')) { texts.push('若用官而兼带伤食，运喜官旺印缓之方，伤食亦美，逢官遇财，皆不吉也'); favor.正官 = 'good'; favor.印 = 'good'; favor.食伤 = 'good'; favor.财 = 'bad'; }
      else { texts.push('其印缓用官者，官露印重，财运反吉，伤食之方，亦为最利'); favor.财 = 'good'; favor.食伤 = 'good'; }
    }
    if (ctx.q('印多逢财')) { texts.push('印多遇财，运喜劫地，官印亦亨，财乡则忌'); favor.比劫 = 'good'; favor.正官 = 'good'; favor.印 = 'good'; favor.财 = 'bad'; }
    if (ctx.has('正官') && ctx.has('七杀')) {
      texts.push('印格而官煞竞透，运喜食神伤官，印旺身旺，行之亦利。若再透官煞，行财运，立见其灾矣');
      favor.食伤 = 'good'; favor.印 = 'good'; favor.比劫 = 'good'; favor.正官 = 'bad'; favor.七杀 = 'bad'; favor.财 = 'bad';
    }
    if (ctx.q('身印两旺而用食伤泄气') && ctx.share.印 < 25) { texts.push('印用食伤，印轻者，亦不利见财也'); favor.财 = 'bad'; }
    return { texts, favor };
  },
  食神格(ctx) {
    const favor = {};
    const texts = [];
    if (ctx.q('食神生财')) {
      texts.push('食神生财，财重食轻，则行财食。财食重则喜帮身，官煞之方，俱为不美');
      if (ctx.weak || ctx.share.财 + ctx.share.食伤 >= 45) favor.比劫 = 'good';
      else if (ctx.share.财 >= ctx.share.食伤) { favor.财 = 'good'; favor.食伤 = 'good'; }
      favor.正官 = 'bad'; favor.七杀 = 'bad';
    }
    if (ctx.q('弃食就煞而透印')) {
      texts.push('食用煞印，运喜印旺，切忌财乡。身旺食伤亦为福运，行官行煞亦不为吉也');
      favor.印 = 'good'; favor.财 = 'bad'; favor.比劫 = 'good'; favor.食伤 = 'good'; favor.正官 = 'bad'; favor.七杀 = 'bad';
    } else if (ctx.q('食带煞而无财')) {
      texts.push('食神带煞，喜印缓。身旺食伤亦为美运，财则最忌。若食太重而煞轻，印运最利，逢财反吉矣');
      favor.印 = 'good'; favor.比劫 = 'good'; favor.食伤 = 'good'; favor.财 = 'bad';
      if (ctx.share.食伤 >= 30 && ctx.share.官杀 < 15) favor.财 = 'good';
    }
    if (ctx.has('印') && !ctx.has('正官') && !ctx.has('七杀') && !ctx.has('财') && ctx.share.食伤 >= 30) {
      texts.push('食神太旺而带印，运最利财，食伤亦吉，印则最忌，官煞皆不吉也');
      favor.财 = 'good'; favor.食伤 = 'good'; favor.印 = 'bad'; favor.正官 = 'bad'; favor.七杀 = 'bad';
    }
    if (ctx.q('生财以护食')) {
      texts.push('若食神带印，而透财以解，运喜财旺，食伤亦吉，印与官煞皆忌矣');
      favor.财 = 'good'; favor.食伤 = 'good'; favor.印 = 'bad'; favor.正官 = 'bad'; favor.七杀 = 'bad';
    }
    return { texts, favor };
  },
  七杀格(ctx) {
    const favor = {};
    const texts = [];
    if (ctx.q('身强七煞逢制')) {
      texts.push('煞用食制，煞重食轻则助食，煞轻食重则助煞，煞食均而日主根轻则助身。忌正官之混杂，畏印缓之夺食');
      if (ctx.share.官杀 > ctx.share.食伤 + 5) favor.食伤 = 'good';
      else if (ctx.share.食伤 > ctx.share.官杀 + 5) favor.七杀 = 'good';
      else if (ctx.share.比劫 < 20) favor.比劫 = 'good';
      favor.正官 = 'bad'; favor.印 = 'bad';
    }
    if (ctx.q('煞用印化') || ctx.q('专而朝印')) {
      texts.push('煞用印缓，不利财乡，伤官为美，印缓身旺，俱有福地');
      favor.财 = 'bad'; favor.食伤 = 'good'; favor.印 = 'good'; favor.比劫 = 'good';
    }
    if (ctx.q('逢财以去印存食')) {
      texts.push('七煞用财，其以财而去印存食者，不利劫财，伤食皆吉，喜怕印透，煞亦顺');
      favor.比劫 = 'bad'; favor.食伤 = 'good'; favor.印 = 'bad'; favor.七杀 = 'good';
    }
    if (ctx.q('财先食后')) {
      texts.push('其以财而助煞不及者，财已足，则喜食印与帮身；财未足，则喜财旺而露煞');
      if (ctx.share.财 >= 20) { favor.食伤 = 'good'; favor.印 = 'good'; favor.比劫 = 'good'; } else { favor.财 = 'good'; favor.七杀 = 'good'; }
    }
    if (ctx.q('官煞混杂（论偏官）')) {
      texts.push('煞带正官，不论去官留煞、去煞留官，身轻则喜助身，食轻则喜助食，莫去取之物，无伤制煞之神');
      if (ctx.weak) favor.比劫 = 'good';
      if (ctx.has('食伤') && ctx.share.食伤 < 15) favor.食伤 = 'good';
      favor.正官 = 'bad';
    }
    if (ctx.q('煞用阳刃')) {
      texts.push('煞无食制而用刀当，煞轻刀重则喜助煞，刀轻煞重则宜制伏。无食可夺，印逢何伤？七煞既纯，杂官不利');
      if (ctx.share.官杀 < ctx.share.比劫) favor.七杀 = 'good'; else favor.食伤 = 'good';
      favor.印 = 'neutral'; favor.正官 = 'bad';
    }
    return { texts, favor };
  },
  伤官格(ctx) {
    const favor = {};
    const texts = [];
    if (ctx.q('伤官生财')) {
      texts.push('伤官用财，财旺身轻则利印比，身强财浅则喜财运，伤官亦宜');
      if (ctx.weak) { favor.印 = 'good'; favor.比劫 = 'good'; } else { favor.财 = 'good'; favor.食伤 = 'good'; }
    }
    if (ctx.q('伤官佩印')) {
      texts.push('伤官佩印，运行官煞为宜，印运亦吉，伤食不碍，财地则凶');
      favor.正官 = 'good'; favor.七杀 = 'good'; favor.印 = 'good'; favor.食伤 = 'neutral'; favor.财 = 'bad';
    }
    if (ctx.q('伤官兼用财印')) {
      texts.push('伤官兼用财印，其财多而带印者，运喜助印；印多而带财者，运喜助财');
      if (ctx.share.财 > ctx.share.印) favor.印 = 'good'; else favor.财 = 'good';
    }
    if (ctx.has('七杀') && ctx.has('印') && ctx.weak) {
      texts.push('伤官而用煞印，印运最利，伤食亦亨，杂官非吉，逢财印危');
      favor.印 = 'good'; favor.食伤 = 'good'; favor.正官 = 'bad'; favor.财 = 'bad';
    } else if (ctx.q('伤官带煞而无财')) {
      texts.push('伤官带煞，喜印忌财。然伤重煞轻，运喜印而财亦吉。惟七煞根重，财运喜伤食，印缓身旺亦吉，而逢财为凶矣');
      favor.印 = 'good'; favor.财 = 'bad';
      if (ctx.share.食伤 > ctx.share.官杀 + 10) favor.财 = 'good';
      else if (ctx.share.官杀 >= 25) { favor.食伤 = 'good'; favor.比劫 = 'good'; }
    }
    if (ctx.q('金水伤官例外')) {
      texts.push('伤官用官，运喜财印，不利伤食。若局中官露，而财印两旺，则比劫伤官未始非吉矣');
      favor.财 = 'good'; favor.印 = 'good'; favor.食伤 = 'bad';
      if (ctx.share.财 >= 20 && ctx.share.印 >= 20) { favor.比劫 = 'good'; favor.食伤 = 'neutral'; }
    }
    return { texts, favor };
  },
  羊刃格(ctx) {
    const favor = {};
    const texts = [];
    if (ctx.has('正官') && ctx.has('七杀')) {
      texts.push('羊刀而官煞并出，不论去官去煞，运喜制伏，身旺亦利，财地官乡，反为不吉也');
      favor.食伤 = 'good'; favor.比劫 = 'good'; favor.财 = 'bad'; favor.正官 = 'bad';
    } else if (ctx.has('正官')) {
      texts.push('羊刀用官，则运喜助官。然命中官根深，则印缓比劫之方，反为美运，但不喜伤食合官耳');
      favor.正官 = 'good'; favor.财 = 'good'; favor.食伤 = 'bad';
      if (ctx.share.官杀 >= 20) { favor.印 = 'good'; favor.比劫 = 'good'; }
    } else if (ctx.has('七杀')) {
      texts.push('羊刀用煞，煞不甚旺，则运喜助煞。煞若太重，则运喜身旺，印缓伤食，亦不为忌');
      if (ctx.share.官杀 < 25) { favor.七杀 = 'good'; favor.财 = 'good'; } else { favor.比劫 = 'good'; favor.印 = 'neutral'; favor.食伤 = 'neutral'; }
    }
    return { texts, favor };
  },
  建禄月劫(ctx) {
    const favor = {};
    const texts = [];
    let mergeGuan = false;
    if (ctx.q('透官而逢财印')) {
      if (ctx.has('印')) {
        texts.push('禄劫用官，印护者喜财，怕官星之逢合，畏七煞之相乘，伤食不能为害，比劫未即为凶');
        favor.财 = 'good'; favor.七杀 = 'bad'; favor.食伤 = 'neutral'; favor.比劫 = 'neutral';
        mergeGuan = true;
      } else {
        texts.push('财生生喜印，宜官星之植根，畏伤食之相侮，逢财愈见其功，杂煞岂能无碍');
        favor.印 = 'good'; favor.正官 = 'good'; favor.食伤 = 'bad'; favor.财 = 'good'; favor.七杀 = 'bad';
      }
    }
    if (ctx.q('透财而逢食伤')) {
      texts.push('禄劫用财而带伤食，财食重则喜印缓，而不忌比肩；财食轻则宜助财，而不喜印比。逢煞无伤，遇官非福');
      if (ctx.share.财 + ctx.share.食伤 >= 45) { favor.印 = 'good'; favor.比劫 = 'neutral'; } else { favor.财 = 'good'; favor.印 = 'bad'; favor.比劫 = 'bad'; }
      favor.七杀 = 'neutral'; favor.正官 = 'bad';
    }
    if (ctx.q('透煞而遇制伏')) {
      texts.push('禄劫用煞，以食制，食重煞轻，则运宜助煞；食轻煞重，则运喜助食');
      if (ctx.share.食伤 > ctx.share.官杀) favor.七杀 = 'good'; else favor.食伤 = 'good';
      if (ctx.q('用财带煞而煞被合')) { texts.push('若用煞而带财，命中合煞存财，则伤食为宜，财运不忌，逢官无虑，身旺亦亨'); favor.食伤 = 'good'; favor.财 = 'neutral'; favor.正官 = 'neutral'; favor.比劫 = 'good'; }
    }
    if (ctx.q('泄其太过')) {
      texts.push('禄劫而用伤食，财运最宜，煞亦不忌，行印非吉，透官不美。若命中伤食太重，则财运固利，而印亦不忌矣');
      favor.财 = 'good'; favor.七杀 = 'neutral'; favor.印 = ctx.share.食伤 >= 35 ? 'neutral' : 'bad'; favor.正官 = 'bad';
    }
    if (ctx.q('合煞留官（论建禄月劫）') || ctx.q('制煞留官（论建禄月劫）')) {
      texts.push('禄劫官煞并出，不论合煞留官，存官制煞，运喜伤食，比劫亦宜，印缓未为良图，财官亦非福运');
      favor.食伤 = 'good'; favor.比劫 = 'good'; favor.印 = 'bad'; favor.财 = 'bad'; favor.正官 = 'bad';
    }
    return { texts, favor, mergeGuan };
  },
};

/**
 * 按成败判定取这张盘的取运条文。
 * @param {object} chengBai judgePatternSuccess 的结果（group、verdict、success……）
 * @param {{ stems: string[], share: Record<string, number>, strong: boolean, weak: boolean }} context 透出的十神名、各类分量、身强身弱
 * @returns {{ section: string, source: string, texts: string[], favor: Record<string, 'good'|'bad'|'neutral'>, clashMonth: boolean, mergeGuan: boolean }|null}
 */
export const quYunOf = (chengBai, context) => {
  const rule = chengBai?.group ? RULES[chengBai.group] : null;
  if (!rule || chengBai.verdict === '待详辨') return null;
  const quotes = [...(chengBai.success ?? []), ...(chengBai.rescue ?? []), ...(chengBai.flaw ?? []), ...(chengBai.failure ?? [])].map((item) => item.quote ?? '');
  const stems = context.stems ?? [];
  const counts = Object.fromEntries(ROLES.map((role) => [role, stems.filter((name) => QU_YUN_ROLE[name] === role).length]));
  const share = { 财: 0, 印: 0, 食伤: 0, 比劫: 0, 官杀: 0, ...(context.share ?? {}) };
  const ctx = {
    q: (part) => quotes.some((quote) => quote.includes(part)),
    has: (role) => counts[role] > 0,
    count: (role) => counts[role],
    stems,
    share,
    strong: Boolean(context.strong),
    weak: Boolean(context.weak),
    xiang: chengBai.xiangShen ?? [],
  };
  const { texts, favor, clashMonth = false, mergeGuan = false } = rule(ctx);
  if (!texts.length) return null;
  const section = SECTION_OF[chengBai.group];
  return { section, source: cite('ziping', section), texts, favor, clashMonth, mergeGuan };
};

const TONE_TEXT = { good: '喜', bad: '忌', neutral: '不忌' };

/**
 * 一步运（或一年）按取运条文的喜忌：运干看十神，运支看本气十神。
 * @param {{ gan: string, zhi: string, ganShiShen: string, hiddenShiShens?: string[] }} item 大运或流年
 * @param {object|null} quYun quYunOf 的结果
 * @param {{ monthZhi?: string, guanGans?: string[] }} [chart] 月支（正官格「与地支刑冲」皆不利）、透出的正官天干（禄劫用官「怕官星之逢合」）
 * @returns {{ gan: { shiShen: string, role: string, tone: string|null }, zhi: { shiShen: string, role: string, tone: string|null, note?: string }, text: string }|null}
 */
export const describeQuYun = (item, quYun, { monthZhi = null, guanGans = [] } = {}) => {
  if (!item?.gan || !quYun) return null;
  const roleOf = (shiShen) => QU_YUN_ROLE[shiShen] ?? null;
  const ganRole = roleOf(item.ganShiShen);
  const zhiShiShen = item.hiddenShiShens?.[0] ?? '';
  const zhiRole = roleOf(zhiShiShen);
  const gan = { shiShen: item.ganShiShen, role: ganRole, tone: ganRole ? quYun.favor[ganRole] ?? null : null };
  const zhi = { shiShen: zhiShiShen, role: zhiRole, tone: zhiRole ? quYun.favor[zhiRole] ?? null : null };
  if (quYun.clashMonth && monthZhi && getZhiPairKinds(item.zhi, monthZhi).some((kind) => kind === '冲' || kind === '刑')) {
    zhi.tone = 'bad';
    zhi.note = `运支${item.zhi}刑冲月令${monthZhi}，「不问所就何局，皆不利」`;
  }
  if (quYun.mergeGuan && guanGans.some((guanGan) => getGanPairKinds(item.gan, guanGan).includes('合'))) {
    gan.tone = 'bad';
    gan.note = `运干${item.gan}合住官星，「怕官星之逢合」`;
  }
  const toneText = (tone) => (tone ? TONE_TEXT[tone] : '原书未言');
  const text = `天干${item.gan}${item.ganShiShen}${toneText(gan.tone)}${gan.note ? `（${gan.note}）` : ''} · 地支${item.zhi}${zhiShiShen ? `本气${zhiShiShen}` : ''}${toneText(zhi.tone)}${zhi.note ? `（${zhi.note}）` : ''}`;
  return { gan, zhi, text };
};

/** 取运条文一句话：「《子平真诠·论财取运》：其财旺生官者，运喜身旺印缓，不利七煞伤官」。 */
export const quYunQuoteText = (quYun) => (quYun ? `${quYun.source}：${quYun.texts.join('；')}` : '');
