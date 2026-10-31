import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiuYaoReading } from '../src/utils/liuyao.js';
import { judgeLiuYao } from '../src/utils/liuyaoJudge.js';
import { HEXAGRAM_MAP } from '../src/utils/hexagramLogic.js';

/**
 * 《增删卜易》人事占例回归（天时占例另见 liuyao-weather-cases.test.js）。
 *
 * - id 即 src/data/cases/liuyao.json 的 liuyao.zengshan.NNN；卦、动爻按原书，日期取 2001–2030 年里月建、日辰与原书相同的一天正午。
 * - 类别、替谁问、病程、问卦人性别按原书所问：占父病为健康疾病、替父母长辈问，「近病」为新病（问句没写、断语点明近病久病的照断语），占仆、占主人分别取妻财、父母。
 * - book 是原书断语的归类（吉、凶、平）。程序只分偏吉、平、偏弱三档，所以：
 *   没标 near 的必须与原书同档；标 near 的程序判平（或原书平而程序有倾向），至少不能断反；
 *   miss 是程序还断反的，写明缘故，等以后补规则。
 * - 不收：原书日期存疑（再占只记日辰、没写月份的）、以应爻或内外卦合局为主、作者自承误断、问药问医与买卖六畜（程序没有这一类）的占例。
 * - 185–253 是卷四、卷五补录各章的占例（PR #67）：终身财福、寿元按「一生运势」，趋避、梦兆按「避险趋吉」，岁考乡会试与问鼎甲按「考试学业」，
 *   父母寿元与「占父何时起用」按「父母长辈」，「占子从师」按「子女」（原书「子动化克」）。原书没有明断吉凶的不收。
 */
const CASES = [
  { id: '002', name: '占父近病', date: '2001-4-15', hex: '乾为天', lines: [4], topic: 'health', subject: 'parents', illness: 'recent', book: '吉' },
  { id: '004', name: '占自身病', date: '2001-6-1', hex: '泽风大过', lines: [5, 6], topic: 'health', subject: 'self', book: '凶' },
  { id: '008', name: '占求财', date: '2001-2-16', hex: '火天大有', lines: [], topic: 'wealth', book: '吉' },
  { id: '009', name: '占谒贵', date: '2006-10-4', hex: '山风蛊', lines: [3], topic: 'career', book: '吉' },
  { id: '010', name: '占官之升迁', date: '2007-3-3', hex: '艮为山', lines: [1, 3], topic: 'career', book: '吉' },
  { id: '011', name: '占弟被讼', date: '2001-6-13', hex: '泽水困', lines: [3, 5], topic: 'lawsuit', subject: 'siblings', book: '凶' },
  { id: '012', name: '占开铺', date: '2001-2-27', hex: '艮为山', lines: [1, 6], topic: 'wealth', book: '凶' },
  { id: '013', name: '占妹临产', date: '2001-7-4', hex: '火地晋', lines: [], topic: 'maternity', subject: 'siblings', book: '吉' },
  { id: '014', name: '占病', date: '2001-8-23', hex: '天山遁', lines: [2], topic: 'health', subject: 'self', book: '凶' },
  { id: '015', name: '占仆何日回', date: '2001-5-24', hex: '泽天夬', lines: [3, 6], topic: 'travel', subject: 'staff', book: '凶' },
  { id: '016', name: '占出行', date: '2002-9-5', hex: '地火明夷', lines: [1, 4], topic: 'travel', subject: 'self', book: '凶' },
  { id: '017', name: '占悔婚可成', date: '2004-8-6', hex: '离为火', lines: [1], topic: 'love', gender: 'male', book: '吉' },
  { id: '018', name: '占风水', date: '2005-3-31', hex: '泽水困', lines: [1, 4], topic: 'gravesite', book: '吉' },
  { id: '020', name: '占财', date: '2001-6-4', hex: '风雷益', lines: [], topic: 'wealth', book: '吉' },
  { id: '021', name: '占出外贸易', date: '2001-6-22', hex: '雷风恒', lines: [2, 3], topic: 'wealth', book: '吉' },
  { id: '022', name: '占子久出不归', date: '2001-9-29', hex: '坤为地', lines: [], topic: 'travel', subject: 'children', book: '吉' },
  { id: '024', name: '占父子蒙拿问', date: '2001-8-20', hex: '巽为风', lines: [2, 3, 5, 6], topic: 'lawsuit', subject: 'self', book: '凶' },
  { id: '026', name: '占女痘', date: '2001-2-25', hex: '坤为地', lines: [2], topic: 'health', subject: 'children', book: '吉', near: true },
  { id: '027', name: '代卜长辈功名', date: '2001-3-19', hex: '巽为风', lines: [1, 4], topic: 'career', book: '凶' },
  { id: '028', name: '占主病', date: '2001-7-2', hex: '离为火', lines: [1, 2, 3, 4, 5, 6], topic: 'health', subject: 'parents', book: '凶' },
  { id: '029', name: '占长子病', date: '2003-3-1', hex: '震为雷', lines: [2, 5], topic: 'health', subject: 'children', book: '凶' },
  { id: '030', name: '占随官上任', date: '2001-3-10', hex: '水地比', lines: [2, 3], topic: 'career', book: '凶' },
  { id: '032', name: '占父外任平安', date: '2005-9-6', hex: '天风姤', lines: [5, 6], topic: 'parents', book: '平' },
  { id: '034', name: '占求财（再占）', date: '2001-4-22', hex: '火泽睽', lines: [4], topic: 'wealth', book: '凶' },
  { id: '036', name: '占远行求财（再占）', date: '2001-12-14', hex: '地火明夷', lines: [1, 4], topic: 'travel', subject: 'self', book: '吉', near: true },
  { id: '037', name: '占妻病', date: '2003-7-5', hex: '震为雷', lines: [3], topic: 'health', subject: 'spouse', gender: 'male', illness: 'recent', book: '吉' },
  { id: '041', name: '占将来有官否（再占）', date: '2001-11-22', hex: '水地比', lines: [], topic: 'career', book: '吉' },
  { id: '042', name: '占父何日回', date: '2005-5-4', hex: '乾为天', lines: [6], topic: 'travel', subject: 'parents', book: '吉' },
  { id: '043', name: '占后遇功名', date: '2001-6-9', hex: '艮为山', lines: [3, 5], topic: 'career', book: '平' },
  { id: '044', name: '占复起功名（再占）', date: '2001-2-22', hex: '地泽临', lines: [], topic: 'career', book: '平' },
  { id: '047', name: '占候文书何日得领', date: '2001-3-30', hex: '山火贲', lines: [], topic: 'study', book: '吉' },
  { id: '048', name: '占子病', date: '2004-10-4', hex: '地风升', lines: [], topic: 'health', subject: 'children', book: '吉', near: true },
  { id: '054', name: '占官', date: '2003-1-5', hex: '泽水困', lines: [1], topic: 'career', book: '吉' },
  { id: '055', name: '占子存亡', date: '2002-9-5', hex: '风地观', lines: [4, 6], topic: 'children', book: '吉' },
  { id: '056', name: '占乡试', date: '2001-8-8', hex: '雷风恒', lines: [5], topic: 'study', book: '吉' },
  { id: '057', name: '占求婚', date: '2007-4-1', hex: '火雷噬嗑', lines: [1, 4, 5, 6], topic: 'love', gender: 'male', book: '吉', near: true },
  { id: '058', name: '占自陈', date: '2001-10-8', hex: '地水师', lines: [1, 2, 3], topic: 'career', book: '凶' },
  { id: '059', name: '占迎父能否相遇', date: '2001-1-23', hex: '水山蹇', lines: [4, 5, 6], topic: 'travel', subject: 'parents', book: '吉' },
  { id: '060', name: '占冬令得关差', date: '2005-11-5', hex: '水泽节', lines: [3], topic: 'career', book: '吉' },
  { id: '061', name: '占终得出仕', date: '2006-8-6', hex: '天火同人', lines: [6], topic: 'career', book: '吉', miss: '问终身能否出仕：原书以子孙化退不克官、辰年冲去戌土而许之，远期之事不论眼下用神休囚旬空；程序仍按眼下旺衰断' },
  { id: '062', name: '占病', date: '2005-9-4', hex: '泽天夬', lines: [5], topic: 'health', subject: 'self', book: '吉' },
  { id: '063', name: '占妻病服药', date: '2003-1-30', hex: '地泽临', lines: [3], topic: 'health', subject: 'spouse', gender: 'male', book: '凶', near: true },
  { id: '064', name: '占久病', date: '2003-11-6', hex: '乾为天', lines: [6], topic: 'health', subject: 'self', illness: 'chronic', book: '凶' },
  { id: '065', name: '占母血崩', date: '2002-11-7', hex: '天火同人', lines: [1, 2, 3, 5, 6], topic: 'health', subject: 'parents', book: '凶' },
  { id: '066', name: '占父近病', date: '2001-3-11', hex: '泽地萃', lines: [6], topic: 'health', subject: 'parents', illness: 'recent', book: '吉' },
  { id: '067', name: '占流年', date: '2001-4-20', hex: '泽水困', lines: [5], topic: 'year', subject: 'self', book: '凶' },
  { id: '068', name: '占妻母病', date: '2001-5-2', hex: '泽雷随', lines: [1, 6], topic: 'health', subject: 'parents', book: '凶' },
  { id: '069', name: '占出行', date: '2001-8-20', hex: '水雷屯', lines: [2], topic: 'travel', subject: 'self', book: '平', near: true },
  { id: '070', name: '占兄何日归来', date: '2001-4-26', hex: '天泽履', lines: [6], topic: 'travel', subject: 'siblings', book: '平', near: true },
  { id: '072', name: '祖占孙病得火天大有（再占）', date: '2007-5-1', hex: '火天大有', lines: [3], topic: 'health', subject: 'children', book: '凶' },
  { id: '073', name: '占官府升迁', date: '2001-4-3', hex: '雷水解', lines: [5], topic: 'career', book: '吉' },
  { id: '074', name: '占考试中否', date: '2005-10-8', hex: '兑为泽', lines: [1, 6], topic: 'study', book: '吉' },
  { id: '075', name: '占母何时来', date: '2001-7-13', hex: '火天大有', lines: [1, 4, 5, 6], topic: 'travel', subject: 'parents', book: '凶', near: true },
  { id: '076', name: '占开金银器皿铺', date: '2001-7-7', hex: '火雷噬嗑', lines: [4, 5, 6], topic: 'wealth', book: '吉' },
  { id: '078', name: '占夫病', date: '2001-9-2', hex: '天火同人', lines: [5], topic: 'health', subject: 'spouse', gender: 'female', book: '吉' },
  { id: '079', name: '占会试能联捷否', date: '2001-10-18', hex: '雷山小过', lines: [4, 6], topic: 'study', book: '吉' },
  { id: '080', name: '占病', date: '2004-9-7', hex: '雷风恒', lines: [], topic: 'health', subject: 'self', book: '吉' },
  { id: '081', name: '占已定重罪可蒙赦否', date: '2006-8-7', hex: '山风蛊', lines: [1, 3], topic: 'lawsuit', subject: 'self', book: '吉' },
  { id: '086', name: '占开煤窑', date: '2006-5-5', hex: '风火家人', lines: [3], topic: 'wealth', book: '平', near: true },
  { id: '089', name: '占求财', date: '2001-8-5', hex: '风天小畜', lines: [], topic: 'wealth', book: '吉' },
  { id: '090', name: '占升迁', date: '2001-7-30', hex: '地水师', lines: [5, 6], topic: 'career', book: '吉' },
  { id: '091', name: '占子何时脱厄', date: '2002-12-4', hex: '雷地豫', lines: [1, 2], topic: 'general', subject: 'children', book: '吉' },
  { id: '092', name: '占流年', date: '2005-8-7', hex: '艮为山', lines: [], topic: 'career', book: '吉' },
  { id: '130', name: '占子嗣多少', date: '2001-3-1', hex: '坤为地', lines: [3, 6], topic: 'children', book: '凶' },
  { id: '131', name: '占子嗣', date: '2005-9-4', hex: '地雷复', lines: [], topic: 'children', book: '吉' },
  { id: '132', name: '占子孙有无', date: '2001-12-3', hex: '水雷屯', lines: [2], topic: 'children', book: '凶', miss: '子孙化子孙，老年无子者主抚他人之子（子嗣章其九）；程序不知问卦人年纪' },
  { id: '133', name: '占子易养否', date: '2004-12-3', hex: '天风姤', lines: [2, 5], topic: 'children', book: '凶' },
  { id: '134', name: '占官缺得否', date: '2002-9-4', hex: '水风井', lines: [1, 3], topic: 'career', book: '凶' },
  { id: '135', name: '占得差否', date: '2002-9-7', hex: '泽天夬', lines: [], topic: 'career', book: '凶' },
  { id: '137', name: '占何月补官', date: '2001-10-25', hex: '水山蹇', lines: [1, 2], topic: 'career', book: '吉', near: true },
  { id: '138', name: '占任职地方', date: '2007-8-3', hex: '雷泽归妹', lines: [1], topic: 'career', book: '吉' },
  { id: '139', name: '占在任平安否', date: '2004-3-4', hex: '山雷颐', lines: [4], topic: 'year', subject: 'self', book: '平' },
  { id: '141', name: '占借贷', date: '2006-8-6', hex: '火地晋', lines: [], topic: 'wealth', book: '吉' },
  { id: '142', name: '占求财', date: '2005-6-2', hex: '水火既济', lines: [1, 2, 3, 6], topic: 'wealth', book: '吉' },
  { id: '143', name: '占本人婚姻', date: '2002-1-5', hex: '雷风恒', lines: [6], topic: 'love', gender: 'male', book: '吉' },
  { id: '144', name: '占女家婚事', date: '2001-2-12', hex: '地泽临', lines: [2, 3, 5], topic: 'love', gender: 'female', book: '凶', near: true },
  { id: '145', name: '占夫妇将来和好否', date: '2001-6-5', hex: '水天需', lines: [1, 4], topic: 'love', gender: 'female', book: '凶', near: true, note: '女占夫妇和好：原书看子孙持世克夫、应爻化合于他人；程序把申子辰水局生官鬼算作吉，只是子孙动克夫扣了分，判平' },
  { id: '148', name: '占孕男女', date: '2001-5-5', hex: '雷山小过', lines: [3], topic: 'children', book: '吉', miss: '兼问孕之男女与产母平安：原书以「兄爻虽动，不克变出之财爻」断产母无虞、以阳动变阴断生女，没有看子孙；程序按子女孕育以子孙为用神，子孙伏而空破被克，断偏弱。野鹤自言两事宜分占' },
  { id: '149', name: '占妻孕平安否', date: '2003-1-2', hex: '雷火丰', lines: [1], topic: 'maternity', subject: 'spouse', book: '凶' },
  { id: '150', name: '占防流兵', date: '2007-6-3', hex: '地泽临', lines: [4, 6], topic: 'refuge', subject: 'self', book: '吉' },
  { id: '151', name: '占通乡避乱', date: '2001-5-23', hex: '乾为天', lines: [5], topic: 'refuge', subject: 'self', book: '平', near: true },
  { id: '152', name: '占母在外何时来', date: '2002-10-7', hex: '火山旅', lines: [4], topic: 'travel', subject: 'parents', book: '凶' },
  { id: '153', name: '占仆人何日回', date: '2005-12-6', hex: '泽火革', lines: [2], topic: 'travel', subject: 'staff', book: '吉' },
  { id: '154', name: '占伯何日来', date: '2001-8-3', hex: '水雷屯', lines: [4], topic: 'travel', subject: 'parents', book: '吉' },
  { id: '155', name: '占父远去何日回', date: '2001-1-7', hex: '天泽履', lines: [], topic: 'travel', subject: 'parents', book: '吉' },
  { id: '156', name: '占主人何日回', date: '2001-3-1', hex: '山天大畜', lines: [5], topic: 'travel', subject: 'parents', book: '吉' },
  { id: '157', name: '占夫还往他省去否', date: '2005-12-6', hex: '雷天大壮', lines: [1, 5], topic: 'travel', subject: 'spouse', gender: 'female', book: '吉' },
  { id: '158', name: '占一路平安否', date: '2004-11-3', hex: '山风蛊', lines: [5], topic: 'travel', subject: 'self', book: '平', near: true },
  { id: '159', name: '占子近病', date: '2005-9-3', hex: '雷风恒', lines: [3], topic: 'health', subject: 'children', illness: 'recent', book: '平', near: true, note: '原书「幸得子孙值旬空，近病即愈，恐其难过午年」：所问的近病是愈，远期凶；程序答所问，判偏吉' },
  { id: '160', name: '占子病', date: '2001-8-17', hex: '天山遁', lines: [], topic: 'health', subject: 'children', book: '吉' },
  { id: '167', name: '占父病吃人参好否', date: '2001-3-5', hex: '泽地萃', lines: [6], topic: 'health', subject: 'parents', book: '凶', near: true },
  { id: '172', name: '占家内井有碍否', date: '2001-9-12', hex: '地水师', lines: [1], topic: 'home', book: '吉', near: true },
  { id: '175', name: '占旧宅庙宇冲射', date: '2003-6-5', hex: '火天大有', lines: [5], topic: 'general', subject: 'self', book: '平', near: true },
  { id: '177', name: '占衙署后沟', date: '2006-11-6', hex: '火风鼎', lines: [], topic: 'home', book: '凶', miss: '虎鬼持世，地下有尸骸白骨；程序的房屋类还不看六神' },
  { id: '179', name: '占墓地', date: '2001-2-24', hex: '山雷颐', lines: [4, 5], topic: 'gravesite', book: '吉' },
  { id: '180', name: '占墓地', date: '2001-3-26', hex: '巽为风', lines: [5, 6], topic: 'gravesite', book: '凶' },
  { id: '182', name: '占何时得墓地', date: '2001-4-22', hex: '地雷复', lines: [5], topic: 'gravesite', book: '平' },
  { id: '183', name: '占墓穴', date: '2002-8-5', hex: '雷天大壮', lines: [], topic: 'gravesite', book: '吉', miss: '此占只问穴在何处（「世在四爻，穴在中段」），地之吉凶早经法眼与久占许吉；程序按寻地章「六冲卦……必无气脉」断偏弱' },
  { id: '184', name: '占以父柩附葬祖茔', date: '2007-1-2', hex: '地雷复', lines: [1], topic: 'gravesite', book: '凶' },
  { id: '186', name: '占终身财福', date: '2001-10-15', hex: '水地比', lines: [6], topic: 'life', subject: 'self', book: '吉' },
  { id: '187', name: '占终身财福', date: '2007-10-4', hex: '山雷颐', lines: [], topic: 'life', subject: 'self', book: '凶' },
  { id: '188', name: '占终身财福', date: '2004-7-6', hex: '水泽节', lines: [], topic: 'life', subject: 'self', book: '吉' },
  { id: '190', name: '占终身财福', date: '2001-8-17', hex: '地天泰', lines: [3], topic: 'life', subject: 'self', book: '凶' },
  { id: '192', name: '占终身除功名外何事可为', date: '2004-6-3', hex: '天风姤', lines: [2], topic: 'life', subject: 'self', book: '吉' },
  { id: '193', name: '占财福', date: '2002-7-7', hex: '地火明夷', lines: [4], topic: 'life', subject: 'self', book: '凶', near: true },
  { id: '195', name: '再占功名', date: '2001-9-26', hex: '火雷噬嗑', lines: [1, 5], topic: 'career', book: '吉' },
  { id: '196', name: '占终身财福', date: '2001-5-26', hex: '雷泽归妹', lines: [4], topic: 'life', subject: 'self', book: '吉' },
  { id: '197', name: '占终身财福', date: '2007-1-1', hex: '兑为泽', lines: [], topic: 'life', subject: 'self', book: '凶', near: true },
  { id: '198', name: '占终身财福', date: '2001-3-21', hex: '泽火革', lines: [4, 6], topic: 'life', subject: 'self', book: '凶' },
  { id: '199', name: '占终身功名有无', date: '2007-5-1', hex: '地火明夷', lines: [4], topic: 'career', book: '吉' },
  { id: '200', name: '占终身功名有无', date: '2001-11-1', hex: '山风蛊', lines: [], topic: 'career', book: '吉' },
  { id: '201', name: '占终身功名有无', date: '2001-10-31', hex: '水天需', lines: [], topic: 'career', book: '凶' },
  { id: '202', name: '占终身功名', date: '2004-6-5', hex: '火山旅', lines: [], topic: 'career', book: '凶' },
  { id: '203', name: '占寿', date: '2001-4-12', hex: '风泽中孚', lines: [], topic: 'life', subject: 'self', book: '吉' },
  { id: '205', name: '占寿', date: '2001-4-22', hex: '风泽中孚', lines: [4, 5], topic: 'life', subject: 'self', book: '凶', near: true },
  { id: '206', name: '占寿', date: '2001-2-15', hex: '山地剥', lines: [1, 4, 5], topic: 'life', subject: 'self', book: '凶', near: true },
  { id: '207', name: '占索债', date: '2007-4-2', hex: '风雷益', lines: [2], topic: 'wealth', book: '凶' },
  { id: '208', name: '占梦兆', date: '2001-1-25', hex: '风雷益', lines: [2], topic: 'refuge', subject: 'self', book: '凶', near: true },
  { id: '209', name: '占梦前夫叫去', date: '2004-7-7', hex: '水火既济', lines: [2, 3, 5], topic: 'refuge', subject: 'self', gender: 'female', book: '凶' },
  { id: '210', name: '占梦亡母叫去', date: '2001-10-12', hex: '风山渐', lines: [], topic: 'refuge', subject: 'self', book: '吉' },
  { id: '214', name: '占流年', date: '2001-3-5', hex: '火雷噬嗑', lines: [2], topic: 'year', subject: 'self', book: '凶' },
  { id: '215', name: '占仆人为祸否', date: '2001-7-12', hex: '雷水解', lines: [1, 2], topic: 'refuge', subject: 'self', book: '凶' },
  { id: '216', name: '占定何罪', date: '2005-8-7', hex: '风泽中孚', lines: [5, 6], topic: 'lawsuit', subject: 'self', book: '吉', near: true },
  { id: '217', name: '占父寿', date: '2002-2-1', hex: '天风姤', lines: [], topic: 'parents', book: '吉' },
  { id: '218', name: '占母寿', date: '2002-2-1', hex: '雷天大壮', lines: [1, 4], topic: 'parents', book: '凶' },
  { id: '219', name: '占父寿', date: '2001-5-22', hex: '巽为风', lines: [1, 4], topic: 'parents', book: '凶' },
  { id: '220', name: '占祖母寿', date: '2007-4-2', hex: '风泽中孚', lines: [], topic: 'parents', book: '吉' },
  { id: '221', name: '再占祖母寿', date: '2002-2-1', hex: '雷泽归妹', lines: [2], topic: 'parents', book: '吉', near: true },
  { id: '222', name: '占弟兄和好得济否', date: '2001-8-21', hex: '火天大有', lines: [5], topic: 'friends', book: '吉' },
  { id: '224', name: '占夫妇将来和好否', date: '2001-9-15', hex: '地天泰', lines: [], topic: 'love', book: '凶', miss: '妻财亥水被巳日冲起暗动，又临驿马，原书断「心去难留，生离之象」；程序的感情类还不论用神临马暗动主离去' },
  { id: '225', name: '占夫妻偕老否', date: '2003-6-3', hex: '天雷无妄', lines: [1, 4], topic: 'love', book: '吉' },
  { id: '226', name: '占本经能发否', date: '2001-9-10', hex: '风雷益', lines: [1], topic: 'study', book: '凶', miss: '原书以旺官克世、初爻子水文章化未土回头克，断此经不宜；程序依日辰章「用神临日辰，化回头之克亦不为殃」判偏吉' },
  { id: '228', name: '占习书经', date: '2001-9-10', hex: '雷火丰', lines: [6], topic: 'study', book: '吉' },
  { id: '229', name: '占子从师', date: '2001-2-24', hex: '火山旅', lines: [1], topic: 'children', book: '凶' },
  { id: '230', name: '占道考', date: '2001-11-19', hex: '雷火丰', lines: [5], topic: 'study', book: '吉' },
  { id: '231', name: '占岁考', date: '2001-8-10', hex: '泽风大过', lines: [5, 6], topic: 'study', book: '吉' },
  { id: '233', name: '占会试', date: '2001-3-22', hex: '艮为山', lines: [1, 3, 5], topic: 'study', book: '吉' },
  { id: '235', name: '占乡试再占', date: '2001-6-22', hex: '地泽临', lines: [1], topic: 'study', book: '吉' },
  { id: '236', name: '占乡试', date: '2001-3-6', hex: '离为火', lines: [4, 5, 6], topic: 'study', book: '凶' },
  { id: '237', name: '占援例', date: '2005-1-31', hex: '雷地豫', lines: [5, 6], topic: 'career', book: '凶', near: true },
  { id: '238', name: '占上书', date: '2001-9-2', hex: '风泽中孚', lines: [5], topic: 'career', book: '平', near: true },
  { id: '239', name: '占具文伸枉保全功名', date: '2005-2-1', hex: '雷天大壮', lines: [5], topic: 'career', book: '凶' },
  { id: '240', name: '占迟悮军粮被参劾', date: '2002-8-8', hex: '雷火丰', lines: [1, 6], topic: 'career', book: '吉', near: true },
  { id: '241', name: '占官至方伯否', date: '2004-6-5', hex: '雷山小过', lines: [], topic: 'career', book: '吉' },
  { id: '242', name: '占能登鼎甲否', date: '2001-3-22', hex: '水泽节', lines: [1, 2, 3], topic: 'study', book: '吉' },
  { id: '243', name: '占父何时起用', date: '2001-3-30', hex: '风水涣', lines: [1, 3, 4, 6], topic: 'parents', book: '吉' },
  { id: '244', name: '占出行见贵', date: '2001-9-1', hex: '天火同人', lines: [], topic: 'wealth', book: '吉' },
  { id: '245', name: '占收货', date: '2001-2-5', hex: '山雷颐', lines: [], topic: 'wealth', book: '凶' },
  { id: '246', name: '占何时得价', date: '2005-1-5', hex: '雷泽归妹', lines: [5], topic: 'wealth', book: '吉', near: true },
  { id: '247', name: '占脱货何时得价', date: '2001-2-15', hex: '山火贲', lines: [], topic: 'wealth', book: '吉' },
  { id: '248', name: '占往楚买盐', date: '2005-7-3', hex: '地泽临', lines: [], topic: 'wealth', book: '吉' },
  { id: '249', name: '占往粤东带何货归得利', date: '2002-8-8', hex: '火山旅', lines: [], topic: 'wealth', book: '吉' },
  { id: '250', name: '占借贷', date: '2006-8-6', hex: '兑为泽', lines: [2, 5], topic: 'wealth', book: '吉', near: true },
  { id: '252', name: '占斗鹌鹑', date: '2003-6-4', hex: '风山渐', lines: [2], topic: 'wealth', book: '凶', near: true },
  { id: '253', name: '占何命之妾有子', date: '2002-9-6', hex: '泽火革', lines: [2], topic: 'children', book: '凶' },
];

const LEVEL = Object.freeze({ 吉: 'good', 凶: 'bad', 平: 'mixed' });
const BITS = Object.fromEntries(Object.entries(HEXAGRAM_MAP).map(([key, hexagram]) => [hexagram.name, [...key].reverse().map(Number)]));

const judgeCase = (item) => {
  const [y, m, d] = item.date.split('-').map(Number);
  const values = BITS[item.hex].map((bit, i) => (item.lines.includes(i + 1) ? (bit ? 9 : 6) : (bit ? 7 : 8)));
  const reading = buildLiuYaoReading(values, new Date(y, m - 1, d, 12, 0), { topic: item.topic, subject: item.subject, illness: item.illness, gender: item.gender ?? 'male' });
  return judgeLiuYao(reading);
};
const opposite = (level, book) => (book === 'good' && level === 'bad') || (book === 'bad' && level === 'good');

CASES.filter((item) => !item.miss).forEach((item) => {
  test(`人事占例 ${item.id} ${item.name}：原书${item.book}`, () => {
    const judge = judgeCase(item);
    const book = LEVEL[item.book];
    if (item.near) assert.ok(!opposite(judge.verdict.level, book), `程序判${judge.verdict.title}（${judge.score}），与原书${item.book}相反`);
    else assert.equal(judge.verdict.level, book, `程序判${judge.verdict.title}（${judge.score}），原书${item.book}`);
  });
});

test('人事占例：同档的不少于 117 例，断反的只有列明缘故的几例', () => {
  const results = CASES.map((item) => ({ item, level: judgeCase(item).verdict.level }));
  const exact = results.filter(({ item, level }) => level === LEVEL[item.book]).length;
  const reversed = results.filter(({ item, level }) => opposite(level, LEVEL[item.book])).map(({ item }) => item.id);
  assert.ok(exact >= 117, `同档 ${exact} 例`);
  assert.deepEqual(reversed.sort(), CASES.filter((item) => item.miss).map((item) => item.id).sort());
});
