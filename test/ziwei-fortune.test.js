import test from 'node:test';
import assert from 'node:assert/strict';

import { Solar } from 'lunar-javascript';
import { createZiweiHoroscope, getZiweiFortune } from '../src/utils/ziweiBirth.js';

/*
 * 紫微运限层古法对照：大限、小限、流年、流月、流日、流时的宫位、干支、四化、流曜（禄羊陀魁钺昌曲马鸾喜、年解）、
 * 运限宫名与流年将前 / 岁前十二神，按《紫微斗数全书》口诀另写一份，再和排盘库（iztro）逐盘核对。
 *
 * 口径（getZiweiFortune，与专业盘时间轴一致）：
 * - 流年干支以立春（按日）为界；流月干支按农历月（所属农历年年干起五虎遁，闰月同本月）；流日、流时干支按公历日与时辰。
 *   排盘库本身把流月干支按节气交接时刻算（八字月建口径），getZiweiFortune 改成农历月，并把原值留在 solarTermStem / solarTermBranch。
 * - 流月宫位按斗君：流年宫起正月逆数至生月，再自该宫起子时顺数至生时为正月宫，之后每月一宫；生月是闰月的一律算下月（全书），
 *   目标日期落在闰月的沿用排盘库口径（十五以后算下月）。
 * - 流日自流月宫起初一顺数；流时自流日宫起子时顺数。
 * - 虚岁 = 目标农历年 − 出生农历年 + 1（不看生日）；大限按五行局起运、阳男阴女顺行；未起运按童限（一命二财三疾厄四夫妻五福德六官禄）。
 */

const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const PALACES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母'];
const zi = (zhi) => ZHI.indexOf(zhi);
const at = (zhi, offset) => ZHI[(((zi(zhi) + offset) % 12) + 12) % 12];
const isYangGan = (gan) => GAN.indexOf(gan) % 2 === 0;
const triad = (zhi) => (['寅', '午', '戌'].includes(zhi) ? '火' : ['申', '子', '辰'].includes(zhi) ? '水' : ['巳', '酉', '丑'].includes(zhi) ? '金' : '木');
/** 排盘库的宫序：寅宫为 0，顺行到丑宫为 11。 */
const palaceIndexOf = (zhi) => (zi(zhi) - zi('寅') + 12) % 12;
const branchOfIndex = (index) => at('寅', index);

const LUCUN = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
const KUI_YUE = { 甲: '丑未', 戊: '丑未', 庚: '丑未', 乙: '子申', 己: '子申', 丙: '亥酉', 丁: '亥酉', 壬: '卯巳', 癸: '卯巳', 辛: '午寅' };
/** 流昌：甲巳乙午丙申丁酉戊申己酉庚亥辛子壬寅癸卯；流曲反之：甲酉乙申丙午丁巳戊午己巳庚卯辛寅壬子癸亥。 */
const LIU_CHANG = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
const LIU_QU = { 甲: '酉', 乙: '申', 丙: '午', 丁: '巳', 戊: '午', 己: '巳', 庚: '卯', 辛: '寅', 壬: '子', 癸: '亥' };
const MA = { 火: '申', 水: '寅', 金: '亥', 木: '巳' };
const MUTAGEN = {
  甲: ['廉贞', '破军', '武曲', '太阳'], 乙: ['天机', '天梁', '紫微', '太阴'], 丙: ['天同', '天机', '文昌', '廉贞'], 丁: ['太阴', '天同', '天机', '巨门'],
  戊: ['贪狼', '太阴', '右弼', '天机'], 己: ['武曲', '贪狼', '天梁', '文曲'], 庚: ['太阳', '武曲', '太阴', '天同'], 辛: ['巨门', '太阳', '文曲', '文昌'],
  壬: ['天梁', '紫微', '天府', '武曲'], 癸: ['破军', '巨门', '太阴', '贪狼'],
};
const BUREAU_START = { 水二局: 2, 木三局: 3, 金四局: 4, 土五局: 5, 火六局: 6 };
const JIANGQIAN = ['将星', '攀鞍', '岁驿', '息神', '华盖', '劫煞', '灾煞', '天煞', '指背', '咸池', '月煞', '亡神'];
const SUIQIAN = ['岁建', '晦气', '丧门', '贯索', '官符', '小耗', '大耗', '龙德', '白虎', '天德', '吊客', '病符'];

/** 某一层的流曜：禄羊陀魁钺昌曲按该层天干，马鸾喜按该层地支。 */
const flowStars = (prefix, gan, zhi) => ({
  [`${prefix}禄`]: LUCUN[gan],
  [`${prefix}羊`]: at(LUCUN[gan], 1),
  [`${prefix}陀`]: at(LUCUN[gan], -1),
  [`${prefix}魁`]: KUI_YUE[gan][0],
  [`${prefix}钺`]: KUI_YUE[gan][1],
  [`${prefix}昌`]: LIU_CHANG[gan],
  [`${prefix}曲`]: LIU_QU[gan],
  [`${prefix}马`]: MA[triad(zhi)],
  [`${prefix}鸾`]: at('卯', -zi(zhi)),
  [`${prefix}喜`]: at('卯', -zi(zhi) + 6),
});

/** 运限宫名：该层命宫在 index，兄弟、夫妻……逆行。 */
const palaceNamesFrom = (index) => {
  const names = new Array(12);
  PALACES.forEach((name, i) => { names[(((index - i) % 12) + 12) % 12] = name; });
  return names;
};

/** 时辰序号 → 排盘库用来比节气的时刻（时辰起点）。 */
const hourOfIndex = (timeIndex) => (timeIndex === 0 ? 0 : timeIndex >= 12 ? 23 : timeIndex * 2 - 1);

/** 按口诀算某一时刻的运限。birth 取自排盘结果（排盘用的农历生日与生时）。 */
const classicFortune = (astrolabe, gender, targetDate, timeIndex) => {
  const birth = astrolabe.rawDates.lunarDate;
  const birthYearGan = astrolabe.rawDates.chineseDate.yearly[0];
  const birthYearZhi = astrolabe.rawDates.chineseDate.yearly[1];
  const birthHour = zi(astrolabe.rawDates.chineseDate.hourly[1]);
  const soul = astrolabe.earthlyBranchOfSoulPalace;
  const bureau = BUREAU_START[astrolabe.fiveElementsClass];

  const solar = Solar.fromYmdHms(targetDate.getFullYear(), targetDate.getMonth() + 1, targetDate.getDate(), hourOfIndex(timeIndex), 0, 0);
  const lunar = solar.getLunar();
  const yearGanZhi = lunar.getYearInGanZhiByLiChun();
  // 流月干支按农历月：所属农历年（正月初一分界）的年干起五虎遁，正月寅、腊月丑，闰月同本月。
  const lunarYearGan = lunar.getYearInGanZhi()[0];
  const monthGanZhi = GAN[((GAN.indexOf(lunarYearGan) % 5) * 2 + 2 + (Math.abs(lunar.getMonth()) - 1)) % 10] + at('寅', Math.abs(lunar.getMonth()) - 1);
  const dayGanZhi = lunar.getDayInGanZhi();
  const hourGanZhi = lunar.getTimeInGanZhi();
  const yearZhi = yearGanZhi[1];
  const dateMonth = Math.abs(lunar.getMonth());
  const dateLeap = lunar.getMonth() < 0;
  const dateDay = lunar.getDay();

  // 虚岁、大限、小限。
  const nominalAge = lunar.getYear() - birth.lunarYear + 1;
  const forward = (isYangGan(birthYearGan) && gender === 'male') || (!isYangGan(birthYearGan) && gender === 'female');
  let decadalBranch;
  let decadalName = '大限';
  if (nominalAge < bureau) {
    decadalName = '童限';
    const childhood = ['命宫', '财帛', '疾厄', '夫妻', '福德', '官禄'][nominalAge - 1];
    decadalBranch = at(soul, -PALACES.indexOf(childhood));
  } else {
    decadalBranch = at(soul, (forward ? 1 : -1) * Math.floor((nominalAge - bureau) / 10));
  }
  const ageStart = { 火: '辰', 水: '戌', 金: '未', 木: '丑' }[triad(birthYearZhi)];
  const ageBranch = at(ageStart, (gender === 'male' ? 1 : -1) * (nominalAge - 1));

  // 斗君与流月、流日、流时宫位。
  const birthMonth = birth.lunarMonth + (birth.isLeap && birth.lunarMonth < 12 ? 1 : 0);
  const month = dateMonth + (dateLeap && dateDay > 15 ? 1 : 0);
  const yearlyIndex = palaceIndexOf(yearZhi);
  const monthlyIndex = (((yearlyIndex - birthMonth + birthHour + month) % 12) + 12) % 12;
  const dailyIndex = (monthlyIndex + dateDay - 1) % 12;
  const hourlyIndex = (dailyIndex + zi(hourGanZhi[1])) % 12;

  const layer = (index, ganZhi, prefix, name) => ({
    index,
    name,
    heavenlyStem: ganZhi[0],
    earthlyBranch: ganZhi[1],
    mutagen: MUTAGEN[ganZhi[0]],
    palaceNames: palaceNamesFrom(index),
    stars: prefix ? flowStars(prefix, ganZhi[0], ganZhi[1]) : undefined,
  });
  const decadalStem = astrolabe.palaces[palaceIndexOf(decadalBranch)].heavenlyStem;
  const ageStem = astrolabe.palaces[palaceIndexOf(ageBranch)].heavenlyStem;
  const yearly = layer(yearlyIndex, yearGanZhi, '流', '流年');
  yearly.stars['年解'] = at('戌', -zi(yearZhi));
  const jiangStart = { 火: '午', 水: '子', 金: '酉', 木: '卯' }[triad(yearZhi)];
  yearly.jiangqian12 = new Array(12);
  yearly.suiqian12 = new Array(12);
  JIANGQIAN.forEach((star, i) => { yearly.jiangqian12[palaceIndexOf(at(jiangStart, i))] = star; });
  SUIQIAN.forEach((star, i) => { yearly.suiqian12[palaceIndexOf(at(yearZhi, i))] = star; });
  return {
    nominalAge,
    decadal: layer(palaceIndexOf(decadalBranch), decadalStem + decadalBranch, '运', decadalName),
    age: layer(palaceIndexOf(ageBranch), ageStem + ageBranch, null, '小限'),
    yearly,
    monthly: layer(monthlyIndex, monthGanZhi, '月', '流月'),
    daily: layer(dailyIndex, dayGanZhi, '日', '流日'),
    hourly: layer(hourlyIndex, hourGanZhi, '时', '流时'),
  };
};

/** 排盘库的运限整理成同样结构。 */
const libraryFortune = (fortune) => {
  const layer = (item) => {
    const stars = item.stars
      ? Object.fromEntries(item.stars.flatMap((list, index) => list.map((star) => [star.name, branchOfIndex(index)])))
      : undefined;
    return {
      index: item.index,
      name: item.name,
      heavenlyStem: item.heavenlyStem,
      earthlyBranch: item.earthlyBranch,
      mutagen: item.mutagen,
      palaceNames: item.palaceNames,
      stars,
    };
  };
  const yearly = layer(fortune.yearly);
  yearly.jiangqian12 = fortune.yearly.yearlyDecStar.jiangqian12;
  yearly.suiqian12 = fortune.yearly.yearlyDecStar.suiqian12;
  return {
    nominalAge: fortune.age.nominalAge,
    decadal: layer(fortune.decadal),
    age: layer(fortune.age),
    yearly,
    monthly: layer(fortune.monthly),
    daily: layer(fortune.daily),
    hourly: layer(fortune.hourly),
  };
};

const verify = (birth, targetDate, timeIndex) => {
  const astrolabe = createZiweiHoroscope(birth);
  const expected = classicFortune(astrolabe, birth.gender, targetDate, timeIndex);
  const actual = libraryFortune(getZiweiFortune(astrolabe, targetDate, timeIndex));
  const label = `${birth.birthDate} ${ZHI[birth.timeIndex]}时 ${birth.gender} → ${targetDate.toISOString().slice(0, 10)} ${ZHI[timeIndex % 12]}时`;
  assert.deepEqual(actual, expected, label);
  return { astrolabe, expected, actual };
};

test('例：1990-05-20 午时男命，2026-10-27 巳时：大限戊寅、流年丙午、斗君流月在巳、流日戌、流时卯', () => {
  const { expected } = verify({ calendarType: 'solar', birthDate: '1990-05-20', timeIndex: 6, gender: 'male' }, new Date(2026, 9, 27, 10, 0), 5);
  assert.equal(expected.nominalAge, 37);
  assert.deepEqual([expected.decadal.heavenlyStem, expected.decadal.earthlyBranch, expected.decadal.index], ['戊', '寅', 0]);
  assert.deepEqual([expected.yearly.heavenlyStem, expected.yearly.earthlyBranch, expected.yearly.index], ['丙', '午', 4]);
  assert.equal(branchOfIndex(expected.monthly.index), '巳');
  assert.equal(branchOfIndex(expected.daily.index), '戌');
  assert.equal(branchOfIndex(expected.hourly.index), '卯');
  assert.deepEqual(expected.yearly.mutagen, ['天同', '天机', '文昌', '廉贞']);
  assert.equal(expected.yearly.stars['流禄'], '巳');
  assert.equal(expected.yearly.stars['年解'], '辰');
  assert.equal(expected.age.index, palaceIndexOf('辰'));
});

test('运限逐盘核对：随机生辰 × 随机目标时刻两百余组，男女各半，含童限与闰月', () => {
  let seed = 20261028;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let count = 0; count < 240; count += 1) {
    const birthYear = 1920 + Math.floor(random() * 101);
    const birth = {
      calendarType: 'solar',
      birthDate: `${birthYear}-${String(1 + Math.floor(random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(random() * 28)).padStart(2, '0')}`,
      timeIndex: Math.floor(random() * 12),
      gender: random() < 0.5 ? 'male' : 'female',
    };
    // 目标时刻：出生当年到之后一百年内；Date 的钟点与时辰序号保持一致（排盘库把序号 0 当作未传，会改用钟点）。
    const targetYear = birthYear + Math.floor(random() * 100);
    const timeIndex = Math.floor(random() * 12);
    const target = targetYear === birthYear
      ? new Date(new Date(`${birth.birthDate}T12:00:00`).getTime() + Math.floor(random() * 160) * 86400000)
      : new Date(targetYear, Math.floor(random() * 12), 1 + Math.floor(random() * 28));
    target.setHours(hourOfIndex(timeIndex), 30, 0, 0);
    verify(birth, target, timeIndex);
  }
});

test('童限与闰月：未起运按一命二财三疾厄四夫妻五福德六官禄；生在闰月一律按下月（全书），流月在闰月沿用排盘库十五之界', () => {
  // 2020-03-10 庚子年生男命；虚岁 2、4、6 还没起运（最早的水二局也要 2 岁起，火六局 6 岁起）。
  const child = { calendarType: 'solar', birthDate: '2020-03-10', timeIndex: 4, gender: 'male' };
  const astrolabe = createZiweiHoroscope(child);
  const bureau = BUREAU_START[astrolabe.fiveElementsClass];
  const age2 = verify(child, new Date(2021, 5, 1, 9, 30), 5).expected;
  assert.equal(age2.nominalAge, 2);
  if (bureau > 2) {
    assert.equal(age2.decadal.name, '童限');
    assert.equal(age2.decadal.palaceNames[age2.decadal.index], '命宫');
    assert.equal(astrolabe.palaces[age2.decadal.index].name, '财帛', '二岁看财帛宫');
  }
  const age4 = verify(child, new Date(2023, 5, 1, 9, 30), 5).expected;
  if (bureau > 4) assert.equal(astrolabe.palaces[age4.decadal.index].name, '夫妻', '四岁看夫妻宫');
  // 2023 年闰二月：闰二月初四（4 月 25 日前）按二月，闰二月二十按三月。
  const leapEarly = verify(child, new Date(2023, 2, 25, 9, 30), 5).expected;
  const leapLate = verify(child, new Date(2023, 3, 10, 9, 30), 5).expected;
  const march = verify(child, new Date(2023, 3, 22, 9, 30), 5).expected;
  assert.equal(leapLate.monthly.index, march.monthly.index, '闰二月二十与三月初三同宫');
  assert.equal((leapEarly.monthly.index + 1) % 12, march.monthly.index, '闰二月初四按二月，比三月退一宫');
  // 生在闰月：不论十五前后，安命与斗君都按下月（全书「凡有闰月具要依此为例」）。
  const bornLeap = { calendarType: 'solar', birthDate: '2023-04-15', timeIndex: 8, gender: 'female' };
  verify(bornLeap, new Date(2040, 7, 8, 9, 30), 5);
  verify(bornLeap, new Date(2041, 0, 3, 23, 0), 11);
  const bornLeapEarly = { calendarType: 'solar', birthDate: '2023-03-25', timeIndex: 8, gender: 'female' };
  const earlyFortune = verify(bornLeapEarly, new Date(2040, 7, 8, 9, 30), 5);
  const lateFortune = verify(bornLeap, new Date(2040, 7, 8, 9, 30), 5);
  assert.equal(earlyFortune.expected.monthly.index, lateFortune.expected.monthly.index, '闰二月初四与闰二月廿五生人同一个斗君');
});

test('流年以立春（按日）为界，流月按农历月（排盘库原本按节气），虚岁按农历年', () => {
  const birth = { calendarType: 'solar', birthDate: '1990-05-20', timeIndex: 6, gender: 'male' };
  const astrolabe = createZiweiHoroscope(birth);
  // 2026 年立春 2 月 4 日 04:02，正月初一 2 月 17 日。
  const beforeLichun = verify(birth, new Date(2026, 1, 3, 12), 6).expected;
  const lichunDay = verify(birth, new Date(2026, 1, 4, 2), 1).expected;
  const afterLichun = verify(birth, new Date(2026, 1, 5, 12), 6);
  const afterNewYear = verify(birth, new Date(2026, 1, 20, 12), 6).expected;
  assert.equal(`${beforeLichun.yearly.heavenlyStem}${beforeLichun.yearly.earthlyBranch}`, '乙巳');
  assert.equal(`${lichunDay.yearly.heavenlyStem}${lichunDay.yearly.earthlyBranch}`, '丙午', '立春当天凌晨也按新年');
  assert.equal(`${lichunDay.monthly.heavenlyStem}${lichunDay.monthly.earthlyBranch}`, '己丑');
  assert.equal(lichunDay.nominalAge, 36, '虚岁按农历年：正月初一之前仍是 36');
  assert.equal(afterNewYear.nominalAge, 37);
  // 立春后、正月初一前：仍是乙巳年腊月，流月干支己丑；排盘库按节气已算庚寅，留在 solarTermStem 里。
  assert.equal(`${afterLichun.actual.monthly.heavenlyStem}${afterLichun.actual.monthly.earthlyBranch}`, '己丑');
  const rawAfterLichun = astrolabe.horoscope(new Date(2026, 1, 5, 12), 6);
  assert.equal(`${rawAfterLichun.monthly.heavenlyStem}${rawAfterLichun.monthly.earthlyBranch}`, '庚寅');
  const fixed = getZiweiFortune(astrolabe, new Date(2026, 1, 5, 12), 6);
  assert.deepEqual([fixed.monthly.solarTermStem, fixed.monthly.solarTermBranch], ['庚', '寅']);
  assert.deepEqual(fixed.monthly.mutagen, ['武曲', '贪狼', '天梁', '文曲'], '流月四化按己干');
  assert.equal(fixed.monthly.index, rawAfterLichun.monthly.index, '宫位沿用斗君');
  // 2026 年寒露 10 月 8 日 14:29，农历八月廿八：按农历月前后都是丁酉；排盘库按节气在申时起换成戊戌。
  const beforeHanlu = verify(birth, new Date(2026, 9, 8, 14), 7).actual;
  const afterHanlu = verify(birth, new Date(2026, 9, 8, 16), 8).actual;
  assert.equal(`${beforeHanlu.monthly.heavenlyStem}${beforeHanlu.monthly.earthlyBranch}`, '丁酉');
  assert.equal(`${afterHanlu.monthly.heavenlyStem}${afterHanlu.monthly.earthlyBranch}`, '丁酉');
  assert.equal(`${astrolabe.horoscope(new Date(2026, 9, 8, 16), 8).monthly.heavenlyStem}`, '戊');
  assert.equal(beforeHanlu.monthly.index, afterHanlu.monthly.index);
  // 同月内不换月，getZiweiFortune 原样返回排盘库对象（不额外标 solarTermStem）。
  assert.equal(getZiweiFortune(astrolabe, new Date(2026, 9, 27, 10), 5).monthly.solarTermStem, undefined);
});

test('晚子时的运限：默认换次日（流日、流时的宫位与干支一并按次日），「晚子不换日」则流日按当天、流时用次日之子', () => {
  const birth = { calendarType: 'solar', birthDate: '1990-05-20', timeIndex: 6, gender: 'male' };
  const astrolabe = createZiweiHoroscope(birth);
  const lateZi = new Date(2026, 9, 27, 23, 30);
  const nextDay = astrolabe.horoscope(new Date(2026, 9, 28, 0, 30), 0);

  const next = getZiweiFortune(astrolabe, lateZi, 12);
  assert.equal(next.lunarDate, nextDay.lunarDate, '农历日期换到次日');
  assert.equal(next.daily.index, nextDay.daily.index);
  assert.equal(`${next.daily.heavenlyStem}${next.daily.earthlyBranch}`, '乙亥');
  assert.equal(next.hourly.index, next.daily.index, '流时从流日宫起子时');
  assert.equal(`${next.hourly.heavenlyStem}${next.hourly.earthlyBranch}`, '丙子');
  assert.equal(next.lateZi.mode, 'next');
  // 不传时辰序号时按时刻判断：23 点也是晚子时。
  assert.equal(getZiweiFortune(astrolabe, lateZi).daily.index, nextDay.daily.index);
  // 不是晚子时就原样返回排盘库的结果。
  assert.equal(getZiweiFortune(astrolabe, new Date(2026, 9, 27, 10, 0), 5).lateZi, undefined);

  // 「晚子不换日」的命盘（本人也生于晚子时，按当天安星）。
  const astroSame = createZiweiHoroscope({ ...birth, timeIndex: 12, lateZiMode: 'same' });
  const sameDayOfSame = astroSame.horoscope(new Date(2026, 9, 27, 22, 0), 11);
  const same = getZiweiFortune(astroSame, lateZi, 12);
  assert.equal(same.lunarDate, sameDayOfSame.lunarDate, '农历日期仍是当天');
  assert.equal(same.daily.index, sameDayOfSame.daily.index);
  assert.equal(`${same.daily.heavenlyStem}${same.daily.earthlyBranch}`, '甲戌', '日柱当天');
  assert.deepEqual(same.daily.mutagen, sameDayOfSame.daily.mutagen);
  assert.equal(same.hourly.index, same.daily.index);
  assert.equal(`${same.hourly.heavenlyStem}${same.hourly.earthlyBranch}`, '丙子', '时柱用次日之子');
  assert.equal(same.lateZi.mode, 'same');
});
