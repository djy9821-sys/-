/**
 * 八字分享图：把四柱、日主旺衰、格局与当前运限画成一张竖版图片（canvas），
 * 手机上长按即可保存、转发。不依赖第三方绘图库。
 *
 * 分两步：buildShareCardModel 把命盘整理成纯数据（便于测试），
 * drawBaziShareCard 只负责画。
 */

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1500;

const INK = '#07171a';
const INK_SOFT = '#0d2226';
const PAPER = '#fbf7ed';
const PAPER_DIM = 'rgba(251, 247, 237, 0.62)';
const GOLD = '#dcb471';
const GOLD_DIM = 'rgba(220, 180, 113, 0.45)';
const TEAL = '#7bd2c0';
const RED = '#e07a6a';
const WUXING_COLOR = { 木: '#7ccf9a', 火: '#ff8f79', 土: '#e3b765', 金: '#f3e6bb', 水: '#86bdff' };
const SERIF = '"Noto Serif SC", "Songti SC", "STSong", "SimSun", "Source Han Serif SC", serif';
const SANS = '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

const GENDER_LABEL = { male: '乾造', female: '坤造' };

const birthLinesOf = (chart, { timeDescription = '' } = {}) => {
  const { solarInfo, lunarInfo, timeInfo, timeUnknown, input } = chart;
  const lines = [];
  const solarDate = `${solarInfo.year}年${solarInfo.month}月${solarInfo.day}日`;
  if (timeUnknown) {
    lines.push(`公历 ${solarDate} · 时辰不详`);
  } else if (timeInfo?.mode === 'exact') {
    lines.push(`公历 ${solarDate} · 钟表 ${timeInfo.clockTime}${timeInfo.trueSolarApplied ? ` → 真太阳时 ${timeInfo.correctedTime}` : ''}`);
  } else {
    const hour = input?.hourOption?.name ?? timeDescription;
    lines.push(`公历 ${solarDate}${hour ? ` · ${hour}` : ''}`);
  }
  lines.push(`农历 ${lunarInfo.yearChinese}年${lunarInfo.isLeapMonth ? '闰' : ''}${lunarInfo.monthChinese}月${lunarInfo.dayChinese} · 属${lunarInfo.zodiac}`);
  if (timeInfo?.mode === 'exact' && timeInfo.placeName) lines.push(`出生地 ${timeInfo.placeName}${timeInfo.trueSolarApplied ? '（已按真太阳时）' : ''}`);
  return lines;
};

const strengthLineOf = (strength) => {
  if (!strength) return '';
  const favorable = strength.favorable?.map((item) => item.element).join('') || '—';
  const unfavorable = strength.unfavorable?.map((item) => item.element).join('') || '—';
  return `${strength.band} · 喜 ${favorable} · 忌 ${unfavorable}`;
};

/**
 * @param {object} chart buildBaziChart 的结果
 * @param {object} [options]
 * @param {object|null} [options.strength] analyzeStrength 的结果
 * @param {object|null} [options.pattern] judgeBaziPattern 的结果
 * @param {string} [options.personName]
 * @param {object|null} [options.daYun] 当前大运
 * @param {object|null} [options.liuNian] 当前流年
 * @param {string} [options.link] 带生辰参数的链接
 * @param {string} [options.site] 显示在页脚的网址
 */
export const buildShareCardModel = (chart, {
  strength = null, pattern = null, personName = '', daYun = null, liuNian = null, link = '', site = 'www.gushupaiapp.online',
} = {}) => {
  if (!chart?.pillars) throw new Error('缺少八字命盘');
  const name = personName.trim() || '命主';
  const gender = GENDER_LABEL[chart.input?.gender] ?? '';
  const pillars = chart.pillars.map((pillar) => ({
    key: pillar.key,
    name: pillar.name,
    unknown: Boolean(pillar.unknown) || !pillar.gan,
    gan: pillar.gan,
    zhi: pillar.zhi,
    ganWuxing: pillar.ganWuxing,
    zhiWuxing: pillar.zhiWuxing,
    ganLabel: pillar.key === 'day' ? '日主' : pillar.ganShiShen,
    hidden: (pillar.hiddenGanDetails ?? []).map((detail) => `${detail.gan}${detail.shiShen ? ` ${detail.shiShen}` : ''}`),
    naYin: pillar.naYin ?? '',
    diShi: pillar.diShi ?? '',
    shensha: (pillar.shensha ?? []).slice(0, 3),
  }));
  const fortune = [];
  if (daYun?.ganZhi) fortune.push(`${daYun.name ?? '大运'} ${daYun.ganZhi}${daYun.startAge ? `（${daYun.startAge}–${daYun.endAge} 虚岁）` : ''}`);
  if (liuNian?.ganZhi) fortune.push(`${liuNian.year} ${liuNian.ganZhi}流年 ${liuNian.ganShiShen ?? ''}`.trim());
  const patternLine = pattern?.pattern?.name
    ? `${pattern.pattern.name}${pattern.special?.name ? ` · ${pattern.special.name}` : ''}${pattern.traits?.length ? ` · ${pattern.traits.slice(0, 3).map((trait) => trait.name).join('、')}` : ''}`
    : '';
  return {
    title: '古书派 · 八字命盘',
    name,
    gender,
    birthLines: birthLinesOf(chart),
    pillars,
    dayMaster: `${chart.dayMaster.gan}${chart.dayMaster.wuxing}`,
    strengthLine: strengthLineOf(strength),
    patternLine,
    fortuneLine: fortune.join(' · '),
    yunLine: chart.yun?.startYear ? `${chart.yun.startYear}年起运${chart.yun.estimated ? '（时辰不详，按正午估算）' : ''}` : '',
    footer: `${site} · 打开链接即可查看完整命盘`,
    link,
    disclaimer: `旺衰、喜用与格局均为程序估算，仅供参考${chart.timeUnknown ? '；时辰不详，时柱、命宫未计' : ''}。`,
  };
};

const fitText = (ctx, text, maxWidth) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1);
  return `${result}…`;
};

const drawText = (ctx, text, x, y, { font, color = PAPER, align = 'left', maxWidth = null, letterSpacing = 0 } = {}) => {
  if (!text) return;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  ctx.fillText(maxWidth ? fitText(ctx, text, maxWidth) : text, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
};

const roundRect = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

/** 把 model 画到 2D 上下文（逻辑尺寸 1080 × 1500，调用方负责缩放）。 */
export const drawBaziShareCard = (ctx, model, { width = SHARE_CARD_WIDTH, height = SHARE_CARD_HEIGHT } = {}) => {
  // 底色
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, INK_SOFT);
  background.addColorStop(1, INK);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 2;
  roundRect(ctx, 36, 36, width - 72, height - 72, 28);
  ctx.stroke();

  // 抬头
  drawText(ctx, model.title, width / 2, 118, { font: `600 30px ${SANS}`, color: GOLD, align: 'center', letterSpacing: 8 });
  drawText(ctx, `${model.name}${model.gender ? `\u3000${model.gender}` : ''}`, width / 2, 206, { font: `700 72px ${SERIF}`, align: 'center', maxWidth: width - 160 });
  let y = 262;
  model.birthLines.forEach((line) => {
    drawText(ctx, line, width / 2, y, { font: `400 30px ${SANS}`, color: PAPER_DIM, align: 'center', maxWidth: width - 140 });
    y += 44;
  });

  // 四柱
  const columns = model.pillars.length;
  const gridX = 70;
  const gridWidth = width - gridX * 2;
  const columnWidth = gridWidth / columns;
  const gridTop = y + 24;
  ctx.fillStyle = 'rgba(251, 247, 237, 0.04)';
  roundRect(ctx, gridX, gridTop, gridWidth, 660, 24);
  ctx.fill();
  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 1.5;
  roundRect(ctx, gridX, gridTop, gridWidth, 660, 24);
  ctx.stroke();
  model.pillars.forEach((pillar, index) => {
    const centerX = gridX + columnWidth * index + columnWidth / 2;
    if (index > 0) {
      ctx.strokeStyle = 'rgba(220, 180, 113, 0.22)';
      ctx.beginPath();
      ctx.moveTo(gridX + columnWidth * index, gridTop + 24);
      ctx.lineTo(gridX + columnWidth * index, gridTop + 660 - 24);
      ctx.stroke();
    }
    drawText(ctx, pillar.name, centerX, gridTop + 62, { font: `600 34px ${SERIF}`, color: GOLD, align: 'center', letterSpacing: 4 });
    if (pillar.unknown) {
      drawText(ctx, '时辰', centerX, gridTop + 260, { font: `500 60px ${SERIF}`, color: 'rgba(251, 247, 237, 0.28)', align: 'center' });
      drawText(ctx, '不详', centerX, gridTop + 400, { font: `500 60px ${SERIF}`, color: 'rgba(251, 247, 237, 0.28)', align: 'center' });
      return;
    }
    drawText(ctx, pillar.ganLabel, centerX, gridTop + 112, { font: `500 28px ${SANS}`, color: pillar.key === 'day' ? RED : TEAL, align: 'center' });
    drawText(ctx, pillar.gan, centerX, gridTop + 258, { font: `700 148px ${SERIF}`, color: WUXING_COLOR[pillar.ganWuxing] ?? PAPER, align: 'center' });
    drawText(ctx, pillar.zhi, centerX, gridTop + 420, { font: `700 148px ${SERIF}`, color: WUXING_COLOR[pillar.zhiWuxing] ?? PAPER, align: 'center' });
    let hiddenY = gridTop + 478;
    pillar.hidden.forEach((line) => {
      drawText(ctx, line, centerX, hiddenY, { font: `400 26px ${SANS}`, color: PAPER_DIM, align: 'center', maxWidth: columnWidth - 20 });
      hiddenY += 34;
    });
    drawText(ctx, pillar.naYin, centerX, gridTop + 594, { font: `400 24px ${SANS}`, color: 'rgba(251, 247, 237, 0.5)', align: 'center', maxWidth: columnWidth - 16 });
    drawText(ctx, pillar.diShi ? `星运 ${pillar.diShi}` : '', centerX, gridTop + 630, { font: `400 24px ${SANS}`, color: 'rgba(251, 247, 237, 0.5)', align: 'center' });
  });

  // 日主、格局、运限
  y = gridTop + 660 + 70;
  const infoRows = [
    ['日主', `${model.dayMaster}${model.strengthLine ? ` · ${model.strengthLine}` : ''}`],
    ['格局', model.patternLine || '—'],
    ['运限', model.fortuneLine || model.yunLine || '—'],
  ];
  infoRows.forEach(([label, value]) => {
    ctx.fillStyle = 'rgba(220, 180, 113, 0.14)';
    roundRect(ctx, gridX, y - 36, 84, 50, 10);
    ctx.fill();
    drawText(ctx, label, gridX + 42, y, { font: `600 28px ${SERIF}`, color: GOLD, align: 'center' });
    drawText(ctx, value, gridX + 108, y, { font: `400 30px ${SANS}`, maxWidth: gridWidth - 110 });
    y += 72;
  });

  // 页脚
  ctx.strokeStyle = GOLD_DIM;
  ctx.beginPath();
  ctx.moveTo(gridX, height - 190);
  ctx.lineTo(width - gridX, height - 190);
  ctx.stroke();
  drawText(ctx, model.footer, width / 2, height - 140, { font: `500 26px ${SANS}`, color: GOLD, align: 'center', maxWidth: gridWidth });
  drawText(ctx, model.disclaimer, width / 2, height - 98, { font: `400 22px ${SANS}`, color: 'rgba(251, 247, 237, 0.45)', align: 'center', maxWidth: gridWidth });
  if (model.link) drawText(ctx, model.link, width / 2, height - 62, { font: `400 20px ${SANS}`, color: 'rgba(251, 247, 237, 0.35)', align: 'center', maxWidth: gridWidth });
};

/** 在给定 canvas 上按设备像素比画出分享图，返回逻辑尺寸。 */
export const renderBaziShareCard = (canvas, model, { pixelRatio = 1 } = {}) => {
  const ratio = Math.min(Math.max(pixelRatio, 1), 2);
  canvas.width = Math.round(SHARE_CARD_WIDTH * ratio);
  canvas.height = Math.round(SHARE_CARD_HEIGHT * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持 canvas');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawBaziShareCard(ctx, model);
  return { width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT };
};
