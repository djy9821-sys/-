import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBaziChart } from '../src/utils/baziChart.js';
import { analyzeStrength } from '../src/utils/baziStrength.js';
import { judgeBaziPattern } from '../src/utils/baziPattern.js';
import { buildShareCardModel, drawBaziShareCard, renderBaziShareCard, SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from '../src/utils/baziShareCard.js';

const NOW = new Date('2026-10-27T10:00:00');
const chart = buildBaziChart({ calendarType: 'solar', year: 1990, month: 5, day: 20, gender: 'male', hourIndex: 6 }, NOW);
const strength = analyzeStrength(chart);
const pattern = judgeBaziPattern(chart, strength);

// 记录绘制调用的假 2D 上下文：只关心画了哪些文字。
const fakeContext = () => {
  const texts = [];
  const noop = () => {};
  return {
    texts,
    canvas: null,
    letterSpacing: '0px',
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    createLinearGradient: () => ({ addColorStop: noop }),
    fillRect: noop,
    fillText: (text) => texts.push(text),
    measureText: (text) => ({ width: text.length * 20 }),
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    closePath: noop,
    stroke: noop,
    fill: noop,
    setTransform: noop,
  };
};

test('分享图数据：四柱、日主旺衰、格局与运限', () => {
  const daYun = chart.yun.dayun.find((item) => item.isCurrent);
  const model = buildShareCardModel(chart, { strength, pattern, personName: ' 测试 ', daYun, liuNian: chart.yun.currentLiuNian, link: 'https://example.com/#/bazi?x=1' });
  assert.equal(model.name, '测试');
  assert.equal(model.gender, '乾造');
  assert.equal(model.pillars.map((pillar) => `${pillar.gan}${pillar.zhi}`).join(' '), '庚午 辛巳 乙酉 壬午');
  assert.equal(model.pillars[2].ganLabel, '日主');
  assert.equal(model.pillars[0].ganLabel, '正官');
  assert.deepEqual(model.pillars[1].hidden, ['丙 伤官', '庚 正官', '戊 正财']);
  assert.equal(model.dayMaster, '乙木');
  assert.equal(model.strengthLine, '极弱 · 喜 水木 · 忌 火金土');
  assert.match(model.patternLine, /格/);
  assert.match(model.fortuneLine, /大运 乙酉（\d+–\d+ 虚岁） · 2026 丙午流年 伤官/);
  assert.equal(model.birthLines[0], '公历 1990年5月20日 · 午时');
  assert.equal(model.birthLines[1], '农历 一九九〇年四月廿六 · 属马');
  assert.equal(model.link, 'https://example.com/#/bazi?x=1');
  assert.match(model.footer, /gushupaiapp\.online/);
});

test('时辰不详与精确时间的出生信息', () => {
  const unknown = buildBaziChart({ calendarType: 'solar', year: 1990, month: 5, day: 20, gender: 'female', timeMode: 'unknown' }, NOW);
  const model = buildShareCardModel(unknown, { personName: '' });
  assert.equal(model.name, '命主');
  assert.equal(model.gender, '坤造');
  assert.equal(model.birthLines[0], '公历 1990年5月20日 · 时辰不详');
  assert.equal(model.pillars[3].unknown, true);
  assert.equal(model.strengthLine, '');
  assert.match(model.yunLine, /按正午估算/);

  const exact = buildBaziChart({ calendarType: 'solar', year: 1990, month: 5, day: 20, gender: 'male', timeMode: 'exact', clockHour: 12, clockMinute: 30, longitude: 116.4, timezone: 8, placeName: '北京' }, NOW);
  const exactModel = buildShareCardModel(exact);
  assert.match(exactModel.birthLines[0], /钟表 12:30 → 真太阳时 \d\d:\d\d/);
  assert.match(exactModel.birthLines[2], /出生地 北京（已按真太阳时）/);
});

test('绘制时把关键文字都画出来，并按像素比设置画布尺寸', () => {
  const model = buildShareCardModel(chart, { strength, pattern, personName: '测试', liuNian: chart.yun.currentLiuNian });
  const ctx = fakeContext();
  drawBaziShareCard(ctx, model);
  const drawn = ctx.texts.join('\n');
  ['古书派 · 八字命盘', '测试　乾造', '庚', '午', '辛', '巳', '乙', '酉', '壬', '年柱', '时柱', '日主', '乙木 · 极弱', '格局', '运限', '2026 丙午流年'].forEach((text) => {
    assert.ok(drawn.includes(text), `应画出「${text}」`);
  });
  assert.ok(!drawn.includes('undefined'));

  const canvas = { width: 0, height: 0, getContext: () => fakeContext() };
  const size = renderBaziShareCard(canvas, model, { pixelRatio: 3 });
  assert.deepEqual(size, { width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT });
  // 像素比最多按 2 计，避免手机上生成过大的图片。
  assert.equal(canvas.width, SHARE_CARD_WIDTH * 2);
  assert.equal(canvas.height, SHARE_CARD_HEIGHT * 2);
  assert.throws(() => buildShareCardModel(null), /缺少八字命盘/);
});
