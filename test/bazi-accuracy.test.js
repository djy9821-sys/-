/**
 * 八字准确性对照：用与排盘库无关的独立依据核对结果。
 *   1. 日柱：儒略日公式（1949-10-01 甲子日为锚）逐日核对 1900–2100；
 *   2. 节气：香港天文台公布的 2015、2016 年二十四节气时刻（香港时间 = 北京时间）；
 *      年柱以立春、月柱以十二节为界，交节前后一分钟必须换柱；
 *   3. 经典命例：公开文献记载的四柱；
 *   4. 起运方向：阳年男顺女逆、阴年男逆女顺；
 *   5. 均时差与真太阳时跨日。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { Lunar, Solar } from 'lunar-javascript';
import { buildBaziChart } from '../src/utils/baziChart.js';
import { getEquationOfTimeMinutes, toTrueSolarTime } from '../src/utils/trueSolarTime.js';

const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const NOW = new Date('2026-10-27T10:00:00');

// 公历 → 儒略日数（Fliegel & Van Flandern），再按 (JDN + 49) mod 60 得日柱序号：
// 2451545（2000-01-01）→ 戊午，2433191（1949-10-01）→ 甲子。
const julianDayNumber = (year, month, day) => {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
};
const dayGanZhiByJdn = (year, month, day) => {
  const index = (((julianDayNumber(year, month, day) + 49) % 60) + 60) % 60;
  return `${GAN[index % 10]}${ZHI[index % 12]}`;
};

const chartOf = (input) => buildBaziChart(input, NOW);
const ganZhiOf = (chart) => chart.pillars.map((pillar) => pillar.ganZhi).join(' ');
const exactAt = (year, month, day, hour, minute) => chartOf({
  calendarType: 'solar', year, month, day, gender: 'male', timeMode: 'exact', clockHour: hour, clockMinute: minute, longitude: null, applyTrueSolar: false,
});

test('日柱：儒略日公式逐日核对 1900–2100', () => {
  assert.equal(dayGanZhiByJdn(1949, 10, 1), '甲子');
  assert.equal(dayGanZhiByJdn(2000, 1, 1), '戊午');
  let checked = 0;
  for (let year = 1900; year <= 2100; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const days = new Date(year, month, 0).getDate();
      for (let day = 1; day <= days; day += 1) {
        const lib = Solar.fromYmd(year, month, day).getLunar().getDayInGanZhi();
        if (lib !== dayGanZhiByJdn(year, month, day)) {
          assert.fail(`${year}-${month}-${day} 日柱 ${lib} ≠ ${dayGanZhiByJdn(year, month, day)}`);
        }
        checked += 1;
      }
    }
  }
  assert.ok(checked > 73000);
  // 排盘出口也走同一条路。
  assert.equal(chartOf({ calendarType: 'solar', year: 1949, month: 10, day: 1, gender: 'male', hourIndex: 6 }).pillars[2].ganZhi, '甲子');
});

// 香港天文台「二十四節氣的日期及時間資料」（香港时间 = UTC+8）。
const HKO_SOLAR_TERMS = {
  2015: {
    小寒: '1-6 00:21', 大寒: '1-20 17:43', 立春: '2-4 11:58', 雨水: '2-19 07:50', 惊蛰: '3-6 05:56', 春分: '3-21 06:45',
    清明: '4-5 10:39', 谷雨: '4-20 17:42', 立夏: '5-6 03:53', 小满: '5-21 16:45', 芒种: '6-6 07:58', 夏至: '6-22 00:38',
    小暑: '7-7 18:12', 大暑: '7-23 11:30', 立秋: '8-8 04:01', 处暑: '8-23 18:37', 白露: '9-8 07:00', 秋分: '9-23 16:21',
    寒露: '10-8 22:43', 霜降: '10-24 01:47', 立冬: '11-8 01:59', 小雪: '11-22 23:25', 大雪: '12-7 18:53', 冬至: '12-22 12:48',
  },
  2016: {
    小寒: '1-6 06:08', 大寒: '1-20 23:27', 立春: '2-4 17:46', 雨水: '2-19 13:34', 惊蛰: '3-5 11:44', 春分: '3-20 12:30',
    清明: '4-4 16:28', 谷雨: '4-19 23:29', 立夏: '5-5 09:42', 小满: '5-20 22:36', 芒种: '6-5 13:49', 夏至: '6-21 06:34',
    小暑: '7-7 00:03', 大暑: '7-22 17:30', 立秋: '8-7 09:53', 处暑: '8-23 00:38', 白露: '9-7 12:51', 秋分: '9-22 22:21',
    寒露: '10-8 04:33', 霜降: '10-23 07:46', 立冬: '11-7 07:48', 小雪: '11-22 05:22', 大雪: '12-7 00:41', 冬至: '12-21 18:44',
  },
};
const parseTerm = (year, text) => {
  const [md, hm] = text.split(' ');
  const [month, day] = md.split('-').map(Number);
  const [hour, minute] = hm.split(':').map(Number);
  return { year, month, day, hour, minute };
};

test('节气时刻与香港天文台公布值相差不超过 2 分钟', () => {
  Object.entries(HKO_SOLAR_TERMS).forEach(([yearText, terms]) => {
    const year = Number(yearText);
    const table = Lunar.fromYmd(year, 6, 1).getJieQiTable();
    Object.entries(terms).forEach(([name, text]) => {
      // 表里的「冬至」是上一年的，本年冬至在 DONG_ZHI。
      const solar = table[name === '冬至' ? 'DONG_ZHI' : name];
      const expected = parseTerm(year, text);
      const actual = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute(), solar.getSecond());
      const diffMinutes = Math.abs(actual - new Date(expected.year, expected.month - 1, expected.day, expected.hour, expected.minute)) / 60000;
      assert.ok(diffMinutes <= 2, `${year} ${name} 库 ${solar.toYmdHms()} vs 天文台 ${text}（差 ${diffMinutes.toFixed(1)} 分）`);
    });
  });
});

test('年柱以立春为界、月柱以十二节为界：交节前后一分钟换柱', () => {
  const MONTH_ZHI_AFTER = { 立春: '寅', 惊蛰: '卯', 清明: '辰', 立夏: '巳', 芒种: '午', 小暑: '未', 立秋: '申', 白露: '酉', 寒露: '戌', 立冬: '亥', 大雪: '子', 小寒: '丑' };
  Object.entries(HKO_SOLAR_TERMS).forEach(([yearText, terms]) => {
    const year = Number(yearText);
    Object.entries(MONTH_ZHI_AFTER).forEach(([name, zhiAfter]) => {
      const moment = parseTerm(year, terms[name]);
      // 天文台时刻四舍五入到分钟，库里有秒：前后各留两分钟（可跨小时、跨日）。
      const shift = (minutes) => {
        const date = new Date(moment.year, moment.month - 1, moment.day, moment.hour, moment.minute + minutes);
        return exactAt(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes());
      };
      const before = shift(-2);
      const after = shift(2);
      const zhiBefore = ZHI[(ZHI.indexOf(zhiAfter) + 11) % 12];
      assert.equal(before.pillars[1].zhi, zhiBefore, `${year} ${name} 前：月支应为 ${zhiBefore}`);
      assert.equal(after.pillars[1].zhi, zhiAfter, `${year} ${name} 后：月支应为 ${zhiAfter}`);
      if (name === '立春') {
        assert.notEqual(before.pillars[0].ganZhi, after.pillars[0].ganZhi, `${year} 立春前后年柱应不同`);
      } else {
        assert.equal(before.pillars[0].ganZhi, after.pillars[0].ganZhi, `${year} ${name} 前后年柱应相同`);
      }
    });
  });
  // 具体值：2016 立春 17:46 前是乙未年、己丑月，后是丙申年、庚寅月。
  assert.equal(ganZhiOf(exactAt(2016, 2, 4, 17, 40)).slice(0, 5), '乙未 己丑');
  assert.equal(ganZhiOf(exactAt(2016, 2, 4, 17, 52)).slice(0, 5), '丙申 庚寅');
  // 元旦到立春之间仍属上一年：2016-01-20 是乙未年己丑月。
  assert.equal(ganZhiOf(exactAt(2016, 1, 20, 12, 0)).slice(0, 5), '乙未 己丑');
});

test('经典命例：公开文献记载的四柱', () => {
  const cases = [
    // 乾隆：康熙五十年八月十三日子时（1711-09-25），辛卯 丁酉 庚午 丙子。
    [{ calendarType: 'solar', year: 1711, month: 9, day: 25, gender: 'male', hourIndex: 0 }, '辛卯 丁酉 庚午 丙子'],
    [{ calendarType: 'lunar', year: 1711, month: 8, day: 13, gender: 'male', hourIndex: 0 }, '辛卯 丁酉 庚午 丙子'],
    // 孙中山：1866-11-12 寅时，丙寅 己亥 辛卯 庚寅。
    [{ calendarType: 'solar', year: 1866, month: 11, day: 12, gender: 'male', hourIndex: 2 }, '丙寅 己亥 辛卯 庚寅'],
    // 蒋介石：1887-10-31 午时，丁亥 庚戌 己巳 庚午。
    [{ calendarType: 'solar', year: 1887, month: 10, day: 31, gender: 'male', hourIndex: 6 }, '丁亥 庚戌 己巳 庚午'],
    // 毛泽东：1893-12-26 辰时（光绪十九年十一月十九日），癸巳 甲子 丁酉 甲辰。
    [{ calendarType: 'solar', year: 1893, month: 12, day: 26, gender: 'male', hourIndex: 4 }, '癸巳 甲子 丁酉 甲辰'],
    [{ calendarType: 'lunar', year: 1893, month: 11, day: 19, gender: 'male', hourIndex: 4 }, '癸巳 甲子 丁酉 甲辰'],
  ];
  cases.forEach(([input, expected]) => {
    assert.equal(ganZhiOf(chartOf(input)), expected, JSON.stringify(input));
  });
});

test('起运方向：阳年干男顺女逆，阴年干男逆女顺；起运岁数按三日一年折算', () => {
  // 1990 庚午年（阳干）
  const yangMale = chartOf({ calendarType: 'solar', year: 1990, month: 5, day: 20, gender: 'male', hourIndex: 6 });
  const yangFemale = chartOf({ calendarType: 'solar', year: 1990, month: 5, day: 20, gender: 'female', hourIndex: 6 });
  assert.equal(yangMale.yun.forward, true);
  assert.equal(yangFemale.yun.forward, false);
  // 1991 辛未年（阴干）
  const yinMale = chartOf({ calendarType: 'solar', year: 1991, month: 5, day: 20, gender: 'male', hourIndex: 6 });
  const yinFemale = chartOf({ calendarType: 'solar', year: 1991, month: 5, day: 20, gender: 'female', hourIndex: 6 });
  assert.equal(yinMale.yun.forward, false);
  assert.equal(yinFemale.yun.forward, true);

  // 顺行数到下一个节（芒种 1990-06-06 05:46）：1990-05-20 11:00 起约 16.8 天 → 5 年 7 个月左右。
  const daysToJie = (new Date(1990, 5, 6, 5, 46) - new Date(1990, 4, 20, 11, 0)) / 86400000;
  const expectedYears = daysToJie / 3;
  const actualYears = yangMale.yun.startYear + yangMale.yun.startMonth / 12 + yangMale.yun.startDay / 360;
  assert.ok(Math.abs(actualYears - expectedYears) < 0.1, `起运 ${actualYears.toFixed(2)} 年 vs 估算 ${expectedYears.toFixed(2)} 年`);
  // 大运干支：阳男从月柱辛巳顺行第一步为壬午。
  assert.equal(yangMale.yun.dayun[0].ganZhi, '壬午');
  assert.equal(yangFemale.yun.dayun[0].ganZhi, '庚辰');
});

test('均时差与真太阳时跨日', () => {
  // 均时差一年里的四个极值 / 零点（误差允许 0.8 分钟）。
  const eot = (month, day) => getEquationOfTimeMinutes({ year: 2026, month, day, hour: 12, minute: 0 }, 8);
  assert.ok(Math.abs(eot(2, 11) - -14.2) < 0.8, `2 月 11 日 ${eot(2, 11).toFixed(2)}`);
  assert.ok(Math.abs(eot(11, 3) - 16.4) < 0.8, `11 月 3 日 ${eot(11, 3).toFixed(2)}`);
  assert.ok(Math.abs(eot(4, 15)) < 0.8, `4 月 15 日 ${eot(4, 15).toFixed(2)}`);
  assert.ok(Math.abs(eot(9, 1)) < 0.8, `9 月 1 日 ${eot(9, 1).toFixed(2)}`);
  assert.ok(Math.abs(eot(6, 13)) < 0.8, `6 月 13 日 ${eot(6, 13).toFixed(2)}`);
  assert.ok(Math.abs(eot(12, 25)) < 0.8, `12 月 25 日 ${eot(12, 25).toFixed(2)}`);

  // 乌鲁木齐（东经 87.6°）按北京时间 00:40 出生：经度时差约 −130 分钟，真太阳时落到前一天亥时。
  const corrected = toTrueSolarTime({ year: 2026, month: 3, day: 10, hour: 0, minute: 40 }, { longitude: 87.6, timezone: 8 });
  assert.equal(corrected.day, 9);
  assert.ok(corrected.hour === 22, `真太阳时 ${corrected.hour}:${corrected.minute}`);
  const chart = chartOf({ calendarType: 'solar', year: 2026, month: 3, day: 10, gender: 'male', timeMode: 'exact', clockHour: 0, clockMinute: 40, longitude: 87.6, timezone: 8 });
  assert.equal(chart.timeInfo.correctedDate, '2026-03-09');
  assert.equal(chart.input.hourOption.name, '亥时');
  assert.equal(chart.pillars[2].ganZhi, Solar.fromYmd(2026, 3, 9).getLunar().getDayInGanZhi());
  // 不校正时仍是 3 月 10 日早子时。
  const plain = chartOf({ calendarType: 'solar', year: 2026, month: 3, day: 10, gender: 'male', timeMode: 'exact', clockHour: 0, clockMinute: 40, longitude: 87.6, timezone: 8, applyTrueSolar: false });
  assert.equal(plain.timeInfo.correctedDate, '2026-03-10');
  assert.equal(plain.input.hourOption.name, '早子时');
});

test('纳音、十二长生、旬空：六十甲子逐一核对', async () => {
  const { describeGanZhi } = await import('../src/utils/baziChart.js');
  const NA_YIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
  const XUN_KONG = { 甲子: '戌亥', 甲戌: '申酉', 甲申: '午未', 甲午: '辰巳', 甲辰: '寅卯', 甲寅: '子丑' };
  const STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  // 阳干顺行、阴干逆行；火土同宫：甲亥、乙午、丙戊寅、丁己酉、庚巳、辛子、壬申、癸卯起长生。
  const CHANG_SHENG_START = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' };
  const stageOf = (gan, zhi) => {
    const start = ZHI.indexOf(CHANG_SHENG_START[gan]);
    const step = GAN.indexOf(gan) % 2 === 0 ? 1 : -1;
    const offset = (((ZHI.indexOf(zhi) - start) * step) % 12 + 12) % 12;
    return STAGES[offset];
  };
  for (let index = 0; index < 60; index += 1) {
    const ganZhi = `${GAN[index % 10]}${ZHI[index % 12]}`;
    const described = describeGanZhi(ganZhi, '甲');
    assert.equal(described.naYin, NA_YIN[Math.floor(index / 2)], `纳音：${ganZhi}`);
    const xunStart = `甲${ZHI[(index - (index % 10) + 120) % 12]}`;
    assert.equal(described.xunKong, XUN_KONG[xunStart], `旬空：${ganZhi}（${xunStart}旬）`);
    assert.equal(described.ziZuo, stageOf(described.gan, described.zhi), `自坐长生：${ganZhi}`);
  }
  for (const dayGan of GAN) {
    for (const zhi of ZHI) {
      assert.equal(describeGanZhi(`甲${zhi}`, dayGan).diShi, stageOf(dayGan, zhi), `${dayGan}日主临${zhi}`);
    }
  }
});

test('藏干与十神：按《渊海子平》口诀与生克阴阳独立推算', async () => {
  const { describeGanZhi } = await import('../src/utils/baziChart.js');
  // 子癸，丑己癸辛，寅甲丙戊，卯乙，辰戊乙癸，巳丙庚戊，午丁己，未己丁乙，申庚壬戊，酉辛，戌戊辛丁，亥壬甲（本气、中气、余气）。
  const HIDDEN = { 子: '癸', 丑: '己癸辛', 寅: '甲丙戊', 卯: '乙', 辰: '戊乙癸', 巳: '丙庚戊', 午: '丁己', 未: '己丁乙', 申: '庚壬戊', 酉: '辛', 戌: '戊辛丁', 亥: '壬甲' };
  const ELEMENT = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const tenGod = (dayGan, gan) => {
    const same = GAN.indexOf(dayGan) % 2 === GAN.indexOf(gan) % 2;
    const d = ELEMENT[dayGan];
    const g = ELEMENT[gan];
    if (d === g) return same ? '比肩' : '劫财';
    if (GENERATES[d] === g) return same ? '食神' : '伤官';
    if (GENERATES[g] === d) return same ? '偏印' : '正印';
    if (GENERATES[GENERATES[d]] === g) return same ? '偏财' : '正财';
    return same ? '七杀' : '正官';
  };
  for (const dayGan of GAN) {
    for (const zhi of ZHI) {
      const described = describeGanZhi(`甲${zhi}`, dayGan);
      assert.equal(described.hiddenGans.join(''), HIDDEN[zhi], `${zhi}藏干`);
      described.hiddenGanDetails.forEach((detail) => {
        assert.equal(detail.shiShen, tenGod(dayGan, detail.gan), `${dayGan}日主见藏干${detail.gan}`);
      });
    }
    for (const gan of GAN) {
      assert.equal(describeGanZhi(`${gan}子`, dayGan).ganShiShen, tenGod(dayGan, gan), `${dayGan}日主见${gan}`);
    }
  }
});
