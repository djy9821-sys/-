/**
 * 神煞口诀对照：期望值直接从古籍口诀（《三命通会》《渊海子平》《星平会海》通行版本）
 * 另行编码，逐一与 utils/baziShensha.js 的查法比对，不复用实现里的表。
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildShenshaContext, getShensha, SHENSHA_ORDER } from '../src/utils/baziShensha.js';

const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const pillar = (key, ganZhi) => ({ key, gan: ganZhi[0], zhi: ganZhi[1] });
// 只以日干查：年柱、月柱给一个不会产生干扰的组合由各用例自行控制。
const contextOf = ({ year = '甲子', month = '丙寅', day = '甲子' }) => buildShenshaContext([pillar('year', year), pillar('month', month), pillar('day', day)]);
const has = (names, name) => names.includes(name);

test('天乙贵人：甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎', () => {
  const rhyme = { 甲: '丑未', 戊: '丑未', 庚: '丑未', 乙: '子申', 己: '子申', 丙: '亥酉', 丁: '亥酉', 壬: '卯巳', 癸: '卯巳', 辛: '午寅' };
  for (const gan of GAN) {
    for (const zhi of ZHI) {
      // 年干与日干都为 gan，排除年干带来的其他匹配。
      const names = getShensha(pillar('x', `甲${zhi}`), contextOf({ year: `${gan}子`, day: `${gan}子` }));
      assert.equal(has(names, '天乙贵人'), rhyme[gan].includes(zhi), `${gan}日见${zhi}`);
    }
  }
});

test('太极、文昌、天厨、国印：按日干查地支', () => {
  const rhymes = {
    // 甲乙生人子午中，丙丁卯酉定亨通，戊己辰戌丑未是，庚辛寅亥禄丰隆，壬癸巳申偏喜美。
    太极贵人: { 甲: '子午', 乙: '子午', 丙: '卯酉', 丁: '卯酉', 戊: '辰戌丑未', 己: '辰戌丑未', 庚: '寅亥', 辛: '寅亥', 壬: '巳申', 癸: '巳申' },
    // 甲乙巳午报君知，丙戊申宫丁己鸡，庚猪辛鼠壬逢虎，癸人见卯入云梯。
    文昌贵人: { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' },
    // 甲丙见巳乙丁午，戊申己酉庚亥是，辛子壬寅癸卯方。
    天厨贵人: { 甲: '巳', 乙: '午', 丙: '巳', 丁: '午', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' },
    // 甲戌乙亥丙戊丑，丁己寅宫庚辰上，辛巳壬未癸申。
    国印贵人: { 甲: '戌', 乙: '亥', 丙: '丑', 丁: '寅', 戊: '丑', 己: '寅', 庚: '辰', 辛: '巳', 壬: '未', 癸: '申' },
  };
  Object.entries(rhymes).forEach(([name, table]) => {
    for (const gan of GAN) {
      for (const zhi of ZHI) {
        const names = getShensha(pillar('x', `甲${zhi}`), contextOf({ year: `${gan}子`, day: `${gan}子` }));
        assert.equal(has(names, name), table[gan].includes(zhi), `${name}：${gan}日见${zhi}`);
      }
    }
  });
});

test('禄神、羊刃、红艳、金舆：只以日干查', () => {
  const rhymes = {
    禄神: { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' },
    // 阳刃：甲卯丙午戊午庚酉壬子；阴干不取（与问真、文墨天机一致）。
    羊刃: { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' },
    // 甲乙午申庚见戌，戊己怕辰壬怕子，丙寅丁未癸见申，辛见酉。
    红艳: { 甲: '午', 乙: '申', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申' },
    // 甲辰乙巳丙戊未，丁己申宫庚戌藏，辛亥壬丑癸见寅。
    金舆: { 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' },
  };
  Object.entries(rhymes).forEach(([name, table]) => {
    for (const gan of GAN) {
      for (const zhi of ZHI) {
        // 年干取与日干不同且不干扰的干：用壬（天乙等以年干查不影响这些只看日干的神煞）。
        const names = getShensha(pillar('x', `甲${zhi}`), contextOf({ year: '壬子', day: `${gan}子` }));
        assert.equal(has(names, name), (table[gan] ?? '') === zhi, `${name}：${gan}日见${zhi}`);
      }
    }
  });
});

test('三合局神煞：桃花、驿马、华盖、将星、劫煞、灾煞、亡神（年支、日支皆查）', () => {
  const groupOf = (zhi) => ('申子辰'.includes(zhi) ? '水' : '寅午戌'.includes(zhi) ? '火' : '巳酉丑'.includes(zhi) ? '金' : '木');
  // 申子辰在酉 / 寅 / 辰 / 子 / 巳 / 午 / 亥；寅午戌在卯 / 申 / 戌 / 午 / 亥 / 子 / 巳；
  // 巳酉丑在午 / 亥 / 丑 / 酉 / 寅 / 卯 / 申；亥卯未在子 / 巳 / 未 / 卯 / 申 / 酉 / 寅。
  const rhymes = {
    桃花: { 水: '酉', 火: '卯', 金: '午', 木: '子' },
    驿马: { 水: '寅', 火: '申', 金: '亥', 木: '巳' },
    华盖: { 水: '辰', 火: '戌', 金: '丑', 木: '未' },
    将星: { 水: '子', 火: '午', 金: '酉', 木: '卯' },
    劫煞: { 水: '巳', 火: '亥', 金: '寅', 木: '申' },
    灾煞: { 水: '午', 火: '子', 金: '卯', 木: '酉' },
    亡神: { 水: '亥', 火: '巳', 金: '申', 木: '寅' },
  };
  for (const yearZhi of ZHI) {
    for (const dayZhi of ZHI) {
      for (const zhi of ZHI) {
        const names = getShensha(pillar('x', `甲${zhi}`), contextOf({ year: `甲${yearZhi}`, day: `甲${dayZhi}` }));
        Object.entries(rhymes).forEach(([name, table]) => {
          const expected = table[groupOf(yearZhi)] === zhi || table[groupOf(dayZhi)] === zhi;
          assert.equal(has(names, name), expected, `${name}：年支${yearZhi} 日支${dayZhi} 见${zhi}`);
        });
      }
    }
  }
});

test('年支神煞：红鸾天喜逆行，孤辰寡宿按三会方', () => {
  // 红鸾：子年卯、丑年寅、寅年丑、卯年子、辰年亥、巳年戌、午年酉、未年申、申年未、酉年午、戌年巳、亥年辰；天喜对冲。
  const hongLuan = { 子: '卯', 丑: '寅', 寅: '丑', 卯: '子', 辰: '亥', 巳: '戌', 午: '酉', 未: '申', 申: '未', 酉: '午', 戌: '巳', 亥: '辰' };
  const opposite = (zhi) => ZHI[(ZHI.indexOf(zhi) + 6) % 12];
  // 亥子丑年孤辰寅寡宿戌，寅卯辰年巳 / 丑，巳午未年申 / 辰，申酉戌年亥 / 未。
  const guGua = (yearZhi) => ('亥子丑'.includes(yearZhi) ? ['寅', '戌'] : '寅卯辰'.includes(yearZhi) ? ['巳', '丑'] : '巳午未'.includes(yearZhi) ? ['申', '辰'] : ['亥', '未']);
  for (const yearZhi of ZHI) {
    for (const zhi of ZHI) {
      const names = getShensha(pillar('x', `甲${zhi}`), contextOf({ year: `甲${yearZhi}`, day: '甲子' }));
      assert.equal(has(names, '红鸾'), hongLuan[yearZhi] === zhi, `红鸾：${yearZhi}年见${zhi}`);
      assert.equal(has(names, '天喜'), opposite(hongLuan[yearZhi]) === zhi, `天喜：${yearZhi}年见${zhi}`);
      assert.equal(has(names, '孤辰'), guGua(yearZhi)[0] === zhi, `孤辰：${yearZhi}年见${zhi}`);
      assert.equal(has(names, '寡宿'), guGua(yearZhi)[1] === zhi, `寡宿：${yearZhi}年见${zhi}`);
    }
  }
});

test('月支神煞：天德、月德及其合、德秀、天医', () => {
  // 正丁二坤宫，三壬四辛同，五乾六甲上，七癸八艮同，九丙十居乙，子巽丑庚中（坤申、乾亥、艮寅、巽巳）。
  const tianDe = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' };
  // 寅午戌月在丙，申子辰月在壬，亥卯未月在甲，巳酉丑月在庚。
  const yueDe = (monthZhi) => ('寅午戌'.includes(monthZhi) ? '丙' : '申子辰'.includes(monthZhi) ? '壬' : '亥卯未'.includes(monthZhi) ? '甲' : '庚');
  const ganHe = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
  const zhiHe = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
  // 德秀：寅午戌月丙丁为德戊癸为秀；申子辰月壬癸戊己为德丙辛甲己为秀；巳酉丑月庚辛为德乙庚为秀；亥卯未月甲乙为德丁壬为秀。
  const deXiu = (monthZhi) => ('寅午戌'.includes(monthZhi) ? '丙丁戊癸' : '申子辰'.includes(monthZhi) ? '壬癸戊己丙辛甲' : '巳酉丑'.includes(monthZhi) ? '庚辛乙' : '甲乙丁壬');
  for (const monthZhi of ZHI) {
    for (const gan of GAN) {
      for (const zhi of ZHI) {
        const names = getShensha(pillar('x', `${gan}${zhi}`), contextOf({ year: '壬子', month: `甲${monthZhi}`, day: '壬子' }));
        const de = tianDe[monthZhi];
        const deIsZhi = ZHI.includes(de);
        assert.equal(has(names, '天德贵人'), deIsZhi ? zhi === de : gan === de, `天德：${monthZhi}月见${gan}${zhi}`);
        assert.equal(has(names, '天德合'), deIsZhi ? zhi === zhiHe[de] : gan === ganHe[de], `天德合：${monthZhi}月见${gan}${zhi}`);
        assert.equal(has(names, '月德贵人'), gan === yueDe(monthZhi), `月德：${monthZhi}月见${gan}`);
        assert.equal(has(names, '月德合'), gan === ganHe[yueDe(monthZhi)], `月德合：${monthZhi}月见${gan}`);
        assert.equal(has(names, '德秀贵人'), deXiu(monthZhi).includes(gan), `德秀：${monthZhi}月见${gan}`);
        // 天医：正月在丑，二月在寅……即月支的前一位。
        assert.equal(has(names, '天医'), ZHI[(ZHI.indexOf(monthZhi) + 11) % 12] === zhi, `天医：${monthZhi}月见${zhi}`);
      }
    }
  }
});

test('只看日柱：魁罡、阴差阳错、十恶大败', () => {
  const kuiGang = ['壬辰', '庚戌', '庚辰', '戊戌'];
  const yinChaYangCuo = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
  // 甲辰乙巳与壬申，丙申丁亥及庚辰，戊戌癸亥加辛巳，己丑都来十位神。
  const shiEDaBai = ['甲辰', '乙巳', '壬申', '丙申', '丁亥', '庚辰', '戊戌', '癸亥', '辛巳', '己丑'];
  for (let index = 0; index < 60; index += 1) {
    const ganZhi = `${GAN[index % 10]}${ZHI[index % 12]}`;
    const context = contextOf({ year: '壬子', month: '甲寅', day: ganZhi });
    const dayNames = getShensha(pillar('day', ganZhi), context);
    const otherNames = getShensha(pillar('liu-nian', ganZhi), context);
    assert.equal(has(dayNames, '魁罡'), kuiGang.includes(ganZhi), `魁罡：${ganZhi}`);
    assert.equal(has(dayNames, '阴差阳错'), yinChaYangCuo.includes(ganZhi), `阴差阳错：${ganZhi}`);
    assert.equal(has(dayNames, '十恶大败'), shiEDaBai.includes(ganZhi), `十恶大败：${ganZhi}`);
    ['魁罡', '阴差阳错', '十恶大败'].forEach((name) => assert.ok(!has(otherNames, name), `${name} 不该出现在运限柱 ${ganZhi}`));
  }
  assert.equal(SHENSHA_ORDER.length, 29);
});
