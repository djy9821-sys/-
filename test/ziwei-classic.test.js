import test from 'node:test';
import assert from 'node:assert/strict';

import { Lunar, Solar } from 'lunar-javascript';
import { createZiweiHoroscope } from '../src/utils/ziweiBirth.js';

/*
 * 紫微斗数古法对照：按《紫微斗数全书·安星诀》独立推一遍安命身、定五行局、起紫微天府、安十四主星、
 * 辅弼昌曲魁钺禄羊陀火铃空劫马、杂曜、长生博士将前岁前十二神、四化、大限小限，再和排盘库（iztro）逐盘核对。
 * 这里的口诀全部另写一份，不引用排盘库里的表。
 */

const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const zi = (zhi) => ZHI.indexOf(zhi);
const at = (zhi, offset) => ZHI[(((zi(zhi) + offset) % 12) + 12) % 12];
const ganAt = (gan, offset) => GAN[(((GAN.indexOf(gan) + offset) % 10) + 10) % 10];
const isYangGan = (gan) => GAN.indexOf(gan) % 2 === 0;
const triad = (zhi) => (['寅', '午', '戌'].includes(zhi) ? '火' : ['申', '子', '辰'].includes(zhi) ? '水' : ['巳', '酉', '丑'].includes(zhi) ? '金' : '木');

/** 纳音五行：甲乙丙丁一到五、子丑午未一来数、寅卯申酉二上走、辰巳戌亥三为足，干支相加多减五，五行木金水火土。 */
const nayinElement = (gan, zhi) => {
  const g = Math.floor(GAN.indexOf(gan) / 2) + 1;
  const z = [1, 1, 2, 2, 3, 3, 1, 1, 2, 2, 3, 3][zi(zhi)];
  let sum = g + z;
  if (sum > 5) sum -= 5;
  return ['木', '金', '水', '火', '土'][sum - 1];
};
const BUREAU = { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6 };
const BUREAU_NAME = { 水: '水二局', 木: '木三局', 金: '金四局', 土: '土五局', 火: '火六局' };

/**
 * 《全书》安星口诀汇总（时辰 hour 为 0..11，子=0）。
 * @returns {{ stars: Record<string,string>, ... }} 星名 → 地支
 */
const classicChart = ({ yearGan, yearZhi, month, day, hour, gender }) => {
  const stars = {};
  const put = (name, zhi) => { stars[name] = zhi; };

  // 安命身：寅起正月顺数至生月，逆数生时为命宫，顺数生时为身宫。
  const soul = at('寅', (month - 1) - hour);
  const body = at('寅', (month - 1) + hour);
  // 定寅首（五虎遁）：甲己丙寅，乙庚戊寅，丙辛庚寅，丁壬壬寅，戊癸甲寅。
  const yinGan = GAN[(((GAN.indexOf(yearGan) % 5) * 2) + 2) % 10];
  const stemOf = (zhi) => ganAt(yinGan, (zi(zhi) - zi('寅') + 12) % 12); // 寅至丑顺排，子丑与寅卯同干
  const soulGan = stemOf(soul);
  const bureauElement = nayinElement(soulGan, soul);
  const bureau = BUREAU[bureauElement];

  // 起紫微：以生日加若干（使能被局数整除）除局数得商，自寅起数商数；所加之数偶则顺数、奇则逆数。
  let add = 0;
  while ((day + add) % bureau !== 0) add += 1;
  const quotient = (day + add) / bureau;
  const ziwei = at('寅', (quotient - 1) + (add % 2 === 0 ? add : -add));
  put('紫微', ziwei);
  // 紫微系逆行：天机、隔一、太阳、武曲、天同、隔二、廉贞。
  put('天机', at(ziwei, -1));
  put('太阳', at(ziwei, -3));
  put('武曲', at(ziwei, -4));
  put('天同', at(ziwei, -5));
  put('廉贞', at(ziwei, -8));
  // 天府与紫微在寅申轴对称；天府系顺行：太阴、贪狼、巨门、天相、天梁、七杀、隔三、破军。
  const tianfu = at('寅', -(zi(ziwei) - zi('寅')));
  put('天府', tianfu);
  put('太阴', at(tianfu, 1));
  put('贪狼', at(tianfu, 2));
  put('巨门', at(tianfu, 3));
  put('天相', at(tianfu, 4));
  put('天梁', at(tianfu, 5));
  put('七杀', at(tianfu, 6));
  put('破军', at(tianfu, 10));

  // 时系：文昌戌起子时逆数，文曲辰起子时顺数；地劫亥起子时顺数，地空逆数；台辅午起、封诰寅起顺数。
  put('文昌', at('戌', -hour));
  put('文曲', at('辰', hour));
  put('地劫', at('亥', hour));
  put('地空', at('亥', -hour));
  put('台辅', at('午', hour));
  put('封诰', at('寅', hour));
  // 月系：左辅辰起正月顺数，右弼戌起逆数；天刑酉起、天姚丑起正月顺数。
  put('左辅', at('辰', month - 1));
  put('右弼', at('戌', -(month - 1)));
  put('天刑', at('酉', month - 1));
  put('天姚', at('丑', month - 1));
  // 天巫：正五九在巳，二六十在申，三七十一在寅，四八十二在亥。
  put('天巫', ['巳', '申', '寅', '亥'][(month - 1) % 4]);
  // 天月：正戌二巳三辰四寅五未六卯七亥八未九寅十午十一戌十二寅。
  put('天月', ['戌', '巳', '辰', '寅', '未', '卯', '亥', '未', '寅', '午', '戌', '寅'][month - 1]);
  // 阴煞：正七寅、二八子、三九戌、四十申、五十一午、六十二辰。
  put('阴煞', ['寅', '子', '戌', '申', '午', '辰'][(month - 1) % 6]);
  // 解神：正二申、三四戌、五六子、七八寅、九十辰、十一十二午。
  put('解神', ['申', '戌', '子', '寅', '辰', '午'][Math.floor((month - 1) / 2)]);
  // 日系：三台由左辅起初一顺数至生日，八座由右弼逆数；恩光由文昌、天贵由文曲起初一顺数至生日再退一步。
  put('三台', at(stars['左辅'], day - 1));
  put('八座', at(stars['右弼'], -(day - 1)));
  put('恩光', at(stars['文昌'], day - 2));
  put('天贵', at(stars['文曲'], day - 2));

  // 年干系：禄存甲寅乙卯丙戊巳丁己午庚申辛酉壬亥癸子，擎羊前一位、陀罗后一位。
  const lucun = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' }[yearGan];
  put('禄存', lucun);
  put('擎羊', at(lucun, 1));
  put('陀罗', at(lucun, -1));
  // 天魁天钺：甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎。
  const kuiYue = { 甲: '丑未', 戊: '丑未', 庚: '丑未', 乙: '子申', 己: '子申', 丙: '亥酉', 丁: '亥酉', 壬: '卯巳', 癸: '卯巳', 辛: '午寅' }[yearGan];
  put('天魁', kuiYue[0]);
  put('天钺', kuiYue[1]);
  // 天官天福天厨（年干）。
  put('天官', { 甲: '未', 乙: '辰', 丙: '巳', 丁: '寅', 戊: '卯', 己: '酉', 庚: '亥', 辛: '酉', 壬: '戌', 癸: '午' }[yearGan]);
  put('天福', { 甲: '酉', 乙: '申', 丙: '子', 丁: '亥', 戊: '卯', 己: '寅', 庚: '午', 辛: '巳', 壬: '午', 癸: '巳' }[yearGan]);
  put('天厨', { 甲: '巳', 乙: '午', 丙: '子', 丁: '巳', 戊: '午', 己: '申', 庚: '寅', 辛: '午', 壬: '酉', 癸: '亥' }[yearGan]);
  // 截路空亡：甲己申酉、乙庚午未、丙辛辰巳、丁壬寅卯、戊癸子丑；两宫皆为截空，前一支（阳支）标截路、后一支标空亡。
  const jie = { 甲: '申酉', 己: '申酉', 乙: '午未', 庚: '午未', 丙: '辰巳', 辛: '辰巳', 丁: '寅卯', 壬: '寅卯', 戊: '子丑', 癸: '子丑' }[yearGan];
  put('截路', jie[0]);
  put('空亡', jie[1]);
  // 旬空：生年干支所在旬的空亡两支，取与年支同阴阳的一支。
  const xunHead = (zi(yearZhi) - GAN.indexOf(yearGan) + 12) % 12;
  const xunKong = [ZHI[(xunHead + 10) % 12], ZHI[(xunHead + 11) % 12]];
  put('旬空', zi(yearZhi) % 2 === 0 ? xunKong[0] : xunKong[1]);

  // 年支系。
  const yearTriad = triad(yearZhi);
  // 火星铃星：申子辰人寅戌扬，寅午戌人丑卯方，巳酉丑人卯戌位，亥卯未人酉戌房；皆自起处顺数至生时。
  const fireBell = { 水: '寅戌', 火: '丑卯', 金: '卯戌', 木: '酉戌' }[yearTriad];
  put('火星', at(fireBell[0], hour));
  put('铃星', at(fireBell[1], hour));
  // 天马：寅午戌人马居申，申子辰人马在寅，巳酉丑人马在亥，亥卯未人马在巳。
  put('天马', { 火: '申', 水: '寅', 金: '亥', 木: '巳' }[yearTriad]);
  // 华盖：寅午戌戌、申子辰辰、巳酉丑丑、亥卯未未；咸池：寅午戌卯、申子辰酉、巳酉丑午、亥卯未子。
  put('华盖', { 火: '戌', 水: '辰', 金: '丑', 木: '未' }[yearTriad]);
  put('咸池', { 火: '卯', 水: '酉', 金: '午', 木: '子' }[yearTriad]);
  // 红鸾卯起子年逆数至生年，天喜在其对宫。
  put('红鸾', at('卯', -zi(yearZhi)));
  put('天喜', at('卯', -zi(yearZhi) + 6));
  // 天哭午起子年逆数，天虚午起顺数；龙池辰起顺数，凤阁戌起逆数。
  put('天哭', at('午', -zi(yearZhi)));
  put('天虚', at('午', zi(yearZhi)));
  put('龙池', at('辰', zi(yearZhi)));
  put('凤阁', at('戌', -zi(yearZhi)));
  // 孤辰寡宿：亥子丑人寅戌、寅卯辰人巳丑、巳午未人申辰、申酉戌人亥未。
  const season = ['亥', '子', '丑'].includes(yearZhi) ? 0 : ['寅', '卯', '辰'].includes(yearZhi) ? 1 : ['巳', '午', '未'].includes(yearZhi) ? 2 : 3;
  put('孤辰', ['寅', '巳', '申', '亥'][season]);
  put('寡宿', ['戌', '丑', '辰', '未'][season]);
  // 天空丑起子年顺数；天德酉起、月德巳起顺数；年解戌起逆数。
  put('天空', at('丑', zi(yearZhi)));
  put('天德', at('酉', zi(yearZhi)));
  put('月德', at('巳', zi(yearZhi)));
  put('年解', at('戌', -zi(yearZhi)));
  // 蜚廉：子申丑酉寅戌卯巳辰午巳未午寅未卯申辰酉亥戌子亥丑。
  put('蜚廉', { 子: '申', 丑: '酉', 寅: '戌', 卯: '巳', 辰: '午', 巳: '未', 午: '寅', 未: '卯', 申: '辰', 酉: '亥', 戌: '子', 亥: '丑' }[yearZhi]);
  // 破碎：子午卯酉年在巳，寅申巳亥年在酉，辰戌丑未年在丑。
  put('破碎', ['子', '午', '卯', '酉'].includes(yearZhi) ? '巳' : ['寅', '申', '巳', '亥'].includes(yearZhi) ? '酉' : '丑');
  // 天才由命宫起子年顺数至生年，天寿由身宫起。
  put('天才', at(soul, zi(yearZhi)));
  put('天寿', at(body, zi(yearZhi)));

  // 十二宫：自命宫逆行兄弟、夫妻、子女、财帛、疾厄、迁移、仆役、官禄、田宅、福德、父母。
  const PALACES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母'];
  const palaceOf = {};
  PALACES.forEach((name, i) => { palaceOf[at(soul, -i)] = name; });
  const branchOfPalace = Object.fromEntries(Object.entries(palaceOf).map(([zhi, name]) => [name, zhi]));
  // 天伤在仆役宫，天使在疾厄宫。
  put('天伤', branchOfPalace['仆役']);
  put('天使', branchOfPalace['疾厄']);

  // 长生十二神：水二局长生在申，木三局在亥，金四局在巳，火六局在寅，土五局在申；阳男阴女顺行，阴男阳女逆行。
  const forward = (isYangGan(yearGan) && gender === 'male') || (!isYangGan(yearGan) && gender === 'female');
  const dir = forward ? 1 : -1;
  const changshengStart = { 水: '申', 木: '亥', 金: '巳', 火: '寅', 土: '申' }[bureauElement];
  const CHANGSHENG = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  const changsheng = {};
  CHANGSHENG.forEach((name, i) => { changsheng[at(changshengStart, dir * i)] = name; });
  // 博士十二神：禄存起博士，阳男阴女顺行、阴男阳女逆行。
  const BOSHI = ['博士', '力士', '青龙', '小耗', '将军', '奏书', '飞廉', '喜神', '病符', '大耗', '伏兵', '官府'];
  const boshi = {};
  BOSHI.forEach((name, i) => { boshi[at(lucun, dir * i)] = name; });
  // 将前十二神：将星寅午戌在午、申子辰在子、巳酉丑在酉、亥卯未在卯，顺行。
  const JIANGQIAN = ['将星', '攀鞍', '岁驿', '息神', '华盖', '劫煞', '灾煞', '天煞', '指背', '咸池', '月煞', '亡神'];
  const jiangqian = {};
  const jiangStart = { 火: '午', 水: '子', 金: '酉', 木: '卯' }[yearTriad];
  JIANGQIAN.forEach((name, i) => { jiangqian[at(jiangStart, i)] = name; });
  // 岁前十二神：岁建在生年支，顺行。
  const SUIQIAN = ['岁建', '晦气', '丧门', '贯索', '官符', '小耗', '大耗', '龙德', '白虎', '天德', '吊客', '病符'];
  const suiqian = {};
  SUIQIAN.forEach((name, i) => { suiqian[at(yearZhi, i)] = name; });

  // 大限：自命宫起，局数为起运岁数，每限十年；阳男阴女顺行，阴男阳女逆行。
  const decadal = {};
  for (let i = 0; i < 12; i += 1) decadal[at(soul, dir * i)] = [bureau + i * 10, bureau + i * 10 + 9];
  // 小限：寅午戌人辰上起，申子辰人自戌宫，巳酉丑人未宫始，亥卯未人起丑宫；男顺女逆，一岁一宫。
  const ageStart = { 火: '辰', 水: '戌', 金: '未', 木: '丑' }[yearTriad];
  const ageDir = gender === 'male' ? 1 : -1;
  const ages = {};
  for (let i = 0; i < 12; i += 1) ages[at(ageStart, ageDir * i)] = [1 + i, 13 + i, 25 + i];

  // 四化：甲廉破武阳，乙机梁紫阴，丙同机昌廉，丁阴同机巨，戊贪阴弼机，己武贪梁曲，庚阳武阴同，辛巨阳曲昌，壬梁紫左武，癸破巨阴贪。
  const MUTAGEN = {
    甲: ['廉贞', '破军', '武曲', '太阳'], 乙: ['天机', '天梁', '紫微', '太阴'], 丙: ['天同', '天机', '文昌', '廉贞'], 丁: ['太阴', '天同', '天机', '巨门'],
    戊: ['贪狼', '太阴', '右弼', '天机'], 己: ['武曲', '贪狼', '天梁', '文曲'], 庚: ['太阳', '武曲', '太阴', '天同'], 辛: ['巨门', '太阳', '文曲', '文昌'],
    壬: ['天梁', '紫微', '左辅', '武曲'], 癸: ['破军', '巨门', '太阴', '贪狼'],
  };
  const mutagen = Object.fromEntries(MUTAGEN[yearGan].map((name, i) => [name, ['禄', '权', '科', '忌'][i]]));

  // 命主：子贪狼、丑亥巨门、寅戌禄存、卯酉文曲、辰申廉贞、巳未武曲、午破军；身主：子午火星、丑未天相、寅申天梁、卯酉天同、辰戌文昌、巳亥天机。
  const soulStar = { 子: '贪狼', 丑: '巨门', 亥: '巨门', 寅: '禄存', 戌: '禄存', 卯: '文曲', 酉: '文曲', 辰: '廉贞', 申: '廉贞', 巳: '武曲', 未: '武曲', 午: '破军' }[soul];
  const bodyStar = { 子: '火星', 午: '火星', 丑: '天相', 未: '天相', 寅: '天梁', 申: '天梁', 卯: '天同', 酉: '天同', 辰: '文昌', 戌: '文昌', 巳: '天机', 亥: '天机' }[yearZhi];

  return { soul, body, soulGan, bureau: BUREAU_NAME[bureauElement], stars, palaceOf, stemOf, changsheng, boshi, jiangqian, suiqian, decadal, ages, mutagen, soulStar, bodyStar };
};

/** 从排盘库结果整理出同样结构，便于逐项比较。 */
const libraryChart = (horoscope) => {
  const stars = {};
  const mutagen = {};
  const palaceOf = {};
  const stemOf = {};
  const changsheng = {};
  const boshi = {};
  const jiangqian = {};
  const suiqian = {};
  const decadal = {};
  const ages = {};
  horoscope.palaces.forEach((palace) => {
    const zhi = palace.earthlyBranch;
    palaceOf[zhi] = palace.name;
    stemOf[zhi] = palace.heavenlyStem;
    [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars].forEach((star) => {
      stars[star.name] = zhi;
      if (star.mutagen) mutagen[star.name] = star.mutagen;
    });
    changsheng[zhi] = palace.changsheng12;
    boshi[zhi] = palace.boshi12;
    jiangqian[zhi] = palace.jiangqian12;
    suiqian[zhi] = palace.suiqian12;
    decadal[zhi] = palace.decadal.range;
    ages[zhi] = palace.ages.slice(0, 3);
  });
  return {
    soul: horoscope.earthlyBranchOfSoulPalace,
    body: horoscope.earthlyBranchOfBodyPalace,
    bureau: horoscope.fiveElementsClass,
    soulStar: horoscope.soul,
    bodyStar: horoscope.body,
    stars,
    mutagen,
    palaceOf,
    stemOf,
    changsheng,
    boshi,
    jiangqian,
    suiqian,
    decadal,
    ages,
  };
};

/** 由公历日期得到排盘用的年干支（立春分界，与排盘库一致）、农历月（闰月十五以后算下月）、农历日。 */
const classicInput = (solarDate, hour, gender) => {
  const [year, month, day] = solarDate.split('-').map(Number);
  const lunar = Solar.fromYmdHms(year, month, day, Math.max(hour * 2 - 1, 0), 30, 0).getLunar();
  const isLeap = lunar.getMonth() < 0;
  const lunarMonth = Math.abs(lunar.getMonth()) + (isLeap && lunar.getDay() > 15 ? 1 : 0);
  return {
    yearGan: lunar.getYearGanByLiChun(),
    yearZhi: lunar.getYearZhiByLiChun(),
    month: lunarMonth > 12 ? lunarMonth - 12 : lunarMonth,
    day: lunar.getDay(),
    hour,
    gender,
    lunarText: lunar.toString(),
  };
};

const compare = (label, expected, actual) => {
  const problems = [];
  const text = (value) => (value && typeof value === 'object' && !Array.isArray(value)
    ? JSON.stringify(Object.fromEntries(Object.entries(value).sort()))
    : JSON.stringify(value));
  const check = (what, left, right) => {
    if (text(left) !== text(right)) problems.push(`${what}: 口诀 ${text(left)} ≠ 排盘 ${text(right)}`);
  };
  check('命宫', expected.soul, actual.soul);
  check('身宫', expected.body, actual.body);
  check('五行局', expected.bureau, actual.bureau);
  check('命主', expected.soulStar, actual.soulStar);
  check('身主', expected.bodyStar, actual.bodyStar);
  Object.entries(expected.stars).forEach(([name, zhi]) => check(name, zhi, actual.stars[name]));
  check('四化', expected.mutagen, actual.mutagen);
  ZHI.forEach((zhi) => {
    check(`${zhi}宫名`, expected.palaceOf[zhi], actual.palaceOf[zhi]);
    check(`${zhi}宫干`, expected.stemOf(zhi), actual.stemOf[zhi]);
    check(`${zhi}长生`, expected.changsheng[zhi], actual.changsheng[zhi]);
    check(`${zhi}博士`, expected.boshi[zhi], actual.boshi[zhi]);
    check(`${zhi}将前`, expected.jiangqian[zhi], actual.jiangqian[zhi]);
    check(`${zhi}岁前`, expected.suiqian[zhi], actual.suiqian[zhi]);
    check(`${zhi}大限`, expected.decadal[zhi], actual.decadal[zhi]);
    check(`${zhi}小限`, expected.ages[zhi], actual.ages[zhi]);
  });
  assert.deepEqual(problems, [], `${label}\n${problems.join('\n')}`);
};

const verify = (solarDate, hour, gender) => {
  const input = classicInput(solarDate, hour, gender);
  const expected = classicChart(input);
  const horoscope = createZiweiHoroscope({ calendarType: 'solar', birthDate: solarDate, timeIndex: hour, gender });
  compare(`${solarDate} ${ZHI[hour]}时 ${gender}（${input.lunarText}，${input.yearGan}${input.yearZhi}年）`, expected, libraryChart(horoscope));
  return { input, expected, horoscope };
};

test('《紫微斗数全书》例盘：庚辰年七月十七寅时女命，命午身戌木三局，紫微在命宫', () => {
  const { expected, horoscope } = verify('2000-08-16', 2, 'female');
  assert.equal(expected.soul, '午');
  assert.equal(expected.body, '戌');
  assert.equal(expected.bureau, '木三局');
  assert.equal(expected.stars['紫微'], '午');
  assert.equal(expected.stars['天府'], '戌');
  assert.deepEqual([expected.soulStar, expected.bodyStar], ['破军', '文昌']);
  assert.equal(horoscope.chineseDate, '庚辰 甲申 丙午 庚寅');
  assert.deepEqual(expected.mutagen, { 太阳: '禄', 武曲: '权', 太阴: '科', 天同: '忌' });
});

test('安星诀逐盘核对：1900–2050 年三百余盘随机生辰，男女各半', () => {
  let seed = 20261027;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  let count = 0;
  while (count < 320) {
    const year = 1900 + Math.floor(random() * 151);
    const month = 1 + Math.floor(random() * 12);
    const day = 1 + Math.floor(random() * 28);
    const hour = Math.floor(random() * 12);
    const gender = random() < 0.5 ? 'male' : 'female';
    verify(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, hour, gender);
    count += 1;
  }
});

test('闰月：十五（含）以前按本月安命，十六以后按下月安命', () => {
  // 2023 年闰二月：闰二月初十 = 2023-03-31，闰二月二十 = 2023-04-10。
  const early = verify('2023-03-31', 6, 'male');
  const late = verify('2023-04-10', 6, 'male');
  assert.equal(early.input.month, 2);
  assert.equal(late.input.month, 3);
  assert.equal(early.horoscope.earthlyBranchOfSoulPalace, at('寅', 1 - 6));
  assert.equal(late.horoscope.earthlyBranchOfSoulPalace, at('寅', 2 - 6));
  // 农历录入也走同一条规则。
  const byLunar = createZiweiHoroscope({ calendarType: 'lunar', birthDate: '2023-02-20', timeIndex: 6, gender: 'male', isLeapMonth: true });
  assert.equal(byLunar.solarDate, '2023-4-10');
  assert.equal(byLunar.earthlyBranchOfSoulPalace, late.horoscope.earthlyBranchOfSoulPalace);
});

test('年柱以立春为界：立春后、正月初一前出生，年干支已换，农历月仍是腊月', () => {
  // 2026-02-10：立春（2 月 4 日）之后、正月初一（2 月 17 日）之前。
  const { input, horoscope } = verify('2026-02-10', 4, 'female');
  assert.deepEqual([input.yearGan, input.yearZhi, input.month], ['丙', '午', 12]);
  assert.match(horoscope.chineseDate, /^丙午 庚寅/);
  assert.match(horoscope.lunarDate, /二〇二五年腊月/);
  // 立春前一天仍是乙巳年。
  const before = verify('2026-02-03', 4, 'female');
  assert.deepEqual([before.input.yearGan, before.input.yearZhi], ['乙', '巳']);
});

test('晚子时换次日：廿九、三十的晚子时整体按次日初一排盘，录入日期保留给显示，运限按次日算', () => {
  // 2000-08-28 = 庚辰年七月廿九；晚子时按次日 2000-08-29（八月初一）子时排。
  const late = createZiweiHoroscope({ calendarType: 'solar', birthDate: '2000-08-28', timeIndex: 12, gender: 'female' });
  const nextDay = createZiweiHoroscope({ calendarType: 'solar', birthDate: '2000-08-29', timeIndex: 0, gender: 'female' });
  assert.equal(late.earthlyBranchOfSoulPalace, '酉');
  assert.equal(late.earthlyBranchOfSoulPalace, nextDay.earthlyBranchOfSoulPalace);
  assert.equal(late.chineseDate, '庚辰 甲申 己未 甲子');
  assert.deepEqual([late.solarDate, late.lunarDate, late.time, late.timeRange], ['2000-08-28', '二〇〇〇年七月廿九', '晚子时', '23:00~00:00']);
  assert.deepEqual([late.lateZi.mode, late.lateZi.chartSolarDate, late.lateZi.chartLunarDate], ['next', '2000-08-29', '二〇〇〇年八月初一']);
  compare('晚子时换次日', classicChart(classicInput('2000-08-29', 0, 'female')), libraryChart(late));
  // 运限用次日的生辰：流月、虚岁与次日早子时的盘一致。
  ['2026-10-27', '2031-03-05', '2060-12-31'].forEach((target) => {
    const a = late.horoscope(target, 6);
    const b = nextDay.horoscope(target, 6);
    assert.deepEqual([a.age.nominalAge, a.decadal.index, a.yearly.index, a.monthly.index, a.daily.index], [b.age.nominalAge, b.decadal.index, b.yearly.index, b.monthly.index, b.daily.index], target);
  });
  assert.equal(late.solarDate, '2000-08-28');
  // 农历录入同样处理。
  const byLunar = createZiweiHoroscope({ calendarType: 'lunar', birthDate: '2000-07-29', timeIndex: 12, gender: 'female' });
  assert.equal(byLunar.earthlyBranchOfSoulPalace, '酉');
  assert.equal(byLunar.solarDate, '2000-8-28'); // 农历录入时排盘库回显的是它自己换算的公历写法
  // 月中的晚子时：与排盘库原本的结果一致（库只在跨月时出错）。
  const mid = createZiweiHoroscope({ calendarType: 'solar', birthDate: '2000-08-16', timeIndex: 12, gender: 'female' });
  compare('月中晚子时', classicChart(classicInput('2000-08-17', 0, 'female')), libraryChart(mid));
});

test('晚子时不换日：按当天子时安星，日柱仍为当天，时柱用次日之子', () => {
  const same = createZiweiHoroscope({ calendarType: 'solar', birthDate: '2000-08-28', timeIndex: 12, gender: 'female', lateZiMode: 'same' });
  const early = createZiweiHoroscope({ calendarType: 'solar', birthDate: '2000-08-28', timeIndex: 0, gender: 'female' });
  assert.equal(same.earthlyBranchOfSoulPalace, '申');
  assert.equal(same.earthlyBranchOfSoulPalace, early.earthlyBranchOfSoulPalace);
  compare('晚子时不换日', classicChart(classicInput('2000-08-28', 0, 'female')), libraryChart(same));
  // 戊午日：当天子时为壬子，次日己未之子为甲子；不换日取日柱戊午、时柱甲子，与八字模块「晚子不换日」同。
  assert.equal(same.chineseDate, '庚辰 甲申 戊午 甲子');
  assert.deepEqual(same.rawDates.chineseDate.daily, ['戊', '午']);
  assert.deepEqual(same.rawDates.chineseDate.hourly, ['甲', '子']);
  assert.deepEqual([same.time, same.timeRange, same.lateZi.mode], ['晚子时', '23:00~00:00', 'same']);
  assert.deepEqual([same.solarDate, same.lunarDate], ['2000-08-28', '二〇〇〇年七月廿九']);
});
