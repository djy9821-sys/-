import { expect, test } from '@playwright/test';
import { captureClipboard, hashOf, lastCopiedText, skipWelcomeCover } from './helpers.js';

// 1990-05-20 午时 男：庚午 辛巳 乙酉 壬午，日主乙木。
const LINK = '/#/bazi?cal=s&d=1990-5-20&g=m&h=6&n=%E6%B5%8B%E8%AF%95';

test.beforeEach(async ({ page }) => {
  await skipWelcomeCover(page);
  await captureClipboard(page);
});

test('带生辰参数的链接打开即出盘', async ({ page }) => {
  await page.goto(LINK);
  const result = page.getByRole('region', { name: '八字排盘结果' });
  await expect(result).toBeVisible();
  await expect(result).toContainText('测试 · 乾造');
  await expect(result).toContainText('乙木');
  await expect(result).toContainText('1990.5.20');
  // 旺衰按得令、得地、得势打分：此造不得令、地支无根，只有时干壬水（印）帮身，0.5 分极弱；
  // 火（食伤）与金（官杀）地支气数相当，庚辛并透的金为病，取印化杀。
  await expect(result.getByTestId('bazi-strength-score')).toContainText('0.5 分');
  await expect(result.getByTestId('bazi-strength-basis')).toContainText('身弱官杀重，取印化杀生身');
  // 格局与择日两节都在。
  await expect(result.getByRole('heading', { name: /格局与命局组合/ })).toBeVisible();
  await expect(result.getByRole('heading', { name: /择日参考/ })).toBeVisible();
  // 六亲宫星：星照子平列（财为妻星、官杀为子女星），断语按任注推。此造身弱用印，官杀金旺又见财星土——
  // 任注「官杀旺而用印，见财星」；比劫木四柱不见，但身弱喜比劫（「全凭日主之爱憎」）。
  await expect(result.getByRole('heading', { name: /六亲宫星/ })).toBeVisible();
  const liuqin = result.getByTestId('bazi-liuqin');
  await expect(liuqin).toContainText('任注：官杀旺而用印，见财星，古法主妻宫不美、有刑克。');
  await expect(liuqin).toContainText('任注「全凭日主之爱憎」：比劫木是喜用，古法看作兄弟得力。');
  await expect(liuqin).toContainText('《滴天髓·夫妻》：「夫妻因缘宿世来，喜神有意傍天财。」');
  // 古籍原文：正官格命中《子平真诠》成败两段等条目，白话默认，切到原文能看到原句。
  // 支线还在录入，条目排序会变（各书各篇轮流排）：只断言第一页有按正官格命中的，翻完所有页再找原句。
  await expect(result.getByRole('heading', { name: /古籍原文/ })).toBeVisible();
  const classics = result.getByTestId('bazi-classics');
  const firstEntry = classics.getByTestId('bazi-classic-entry').first();
  await expect(classics.getByTestId('bazi-classic-entry').filter({ hasText: '格局·正官格' }).first()).toBeVisible();
  await classics.getByRole('button', { name: '原文' }).click();
  await expect(firstEntry.locator('p.font-serif').first()).toBeVisible();
  const more = classics.getByRole('button', { name: /^再看/ });
  for (let page = 0; page < 10 && await more.isVisible(); page += 1) await more.click();
  await expect(classics).toContainText('官逢财印，又无刑冲破害');
  // 导出给 AI 的提示词附上同一批古籍原文（排序随支线录入的条目变化，只断言有正官格那条）。
  const promptText = result.locator('textarea[aria-label="提示词全文"]');
  await expect(promptText).toHaveValue(/【六亲宫星（程序初判）】\n男命；喜忌按「五行与旺衰」一节扶抑所取。\n- 妻：妻星土/);
  await expect(promptText).toHaveValue(/【古籍原文（与本命相关）】\n- 《[^》\n]+》/);
  await expect(promptText).toHaveValue(/\n- 《[^》\n]+》[^\n]*（匹配：[^\n]*格局·正官格[^\n]*）/);
  await expect(result).toContainText(/已附上与本命相关的古籍原文 \d+ 条/);
  // 术语词典：先列这张盘里出现的术语（日主、十神……），搜索能找到并展开。
  await expect(result.getByRole('heading', { name: /术语词典/ })).toBeVisible();
  const glossary = result.getByTestId('bazi-glossary');
  await expect(glossary.getByTestId('bazi-glossary-summary')).toContainText(/词典共 \d+ 条/);
  await expect(glossary.locator('[data-term="日主"]').first()).toContainText('出生日的天干');
  await glossary.getByRole('searchbox', { name: '搜索术语' }).fill('十神');
  const hit = glossary.locator('[data-term="十神"]').first();
  await expect(hit).toContainText('十种关系');
  if (!(await hit.evaluate((element) => element.open))) await hit.locator('summary').click();
  await expect(hit).toContainText('例：');
  await glossary.getByRole('searchbox', { name: '搜索术语' }).fill('不存在的词');
  await expect(glossary).toContainText('没有找到包含「不存在的词」的术语');
});

test('疑似从格：格局一节给出按此格论的喜忌，旺衰一节提示另见格局', async ({ page }) => {
  // 1975-02-26 午时：乙卯 戊寅 癸卯 戊午，癸水地支无根、天干无印比，食伤独旺。
  await page.goto('/#/bazi?cal=s&d=1975-2-26&g=m&h=6');
  const result = page.getByRole('region', { name: '八字排盘结果' });
  await expect(result).toBeVisible();
  const special = result.getByTestId('bazi-special-pattern');
  await expect(special).toContainText('疑似从儿格');
  const gods = special.getByTestId('bazi-special-gods');
  await expect(gods).toContainText('若按此格论');
  await expect(gods).toContainText('从儿以财为用');
  await expect(result.getByTestId('bazi-strength-special')).toContainText('格局一节疑似从儿格：若成格，喜火（财）、木（食伤）；忌金（印）、土（官杀）');
  // 大运流年的喜忌按此格论（拿《滴天髓阐微》命造对照，认出特殊格局的造按此格论才与原书相合）。
  await expect(result.getByTestId('bazi-favor-basis')).toContainText('此盘疑似从儿格，大运流年与择日的喜忌按此格论');
});

test('手动录入排盘、存档，再从档案打开', async ({ page }) => {
  await page.goto('/#/bazi');
  await page.locator('.bazi-landing__start').click();

  const form = page.getByRole('region', { name: '八字出生信息输入' });
  await expect(form).toBeVisible();
  await form.getByLabel('命主称呼').fill('端到端');
  await form.getByLabel('出生年份').selectOption('1990');
  await form.getByLabel('出生月份').selectOption('5');
  await form.getByLabel('出生日期').selectOption('20');
  await form.getByRole('button', { name: '只知道时辰' }).click();
  await form.getByLabel('出生时辰').selectOption('6');
  await form.getByRole('button', { name: '男命' }).click();
  await form.getByRole('button', { name: '起命盘' }).click();

  const result = page.getByRole('region', { name: '八字排盘结果' });
  await expect(result).toBeVisible();
  await expect(result).toContainText('端到端 · 乾造');
  await expect(result).toContainText('乙木');

  // 存入档案。
  await page.getByRole('button', { name: '存入档案' }).click();
  await page.locator('#bazi-save-panel').getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('status').filter({ hasText: '已保存「端到端」' })).toBeVisible();

  // 到档案页打开这条记录，回到结果页。
  await page.goto('/#/archive');
  await page.getByRole('button', { name: '打开端到端的八字命盘' }).click();
  await expect(page.getByRole('region', { name: '八字排盘结果' })).toContainText('端到端 · 乾造');
});

test('分享链接复制后，用它打开得到同一张盘', async ({ page, context }) => {
  await page.goto(LINK);
  await page.getByRole('button', { name: '分享链接' }).click();
  const copied = await lastCopiedText(page);
  expect(copied).toContain('#/bazi?');
  expect(copied).toContain('d=1990-5-20');

  const other = await context.newPage();
  await other.goto(hashOf(copied));
  const result = other.getByRole('region', { name: '八字排盘结果' });
  await expect(result).toContainText('测试 · 乾造');
  await expect(result).toContainText('乙木');
});

test('择日参考可切换事务、跳到流日；分享图片生成预览', async ({ page }) => {
  await page.goto(LINK);
  const zeri = page.getByRole('group', { name: '事务类型' });
  await expect(zeri).toBeVisible();
  await zeri.getByRole('button', { name: '搬家入宅' }).click();
  await expect(page.getByRole('status').filter({ hasText: /较宜 \d+ 天/ })).toBeVisible();
  const jump = page.getByRole('button', { name: '看这天' }).first();
  await jump.click();
  // 跳转后流日面板展开到对应日期，专业盘同步。
  await expect(page.getByRole('status').filter({ hasText: '专业盘已更新' })).toBeAttached();

  await page.getByRole('button', { name: '分享图片' }).click();
  const image = page.getByTestId('bazi-share-card-image');
  await expect(image).toBeVisible();
  const src = await image.getAttribute('src');
  expect(src?.startsWith('data:image/png;base64,')).toBeTruthy();
  await page.getByRole('button', { name: '关闭分享图' }).last().click();
  await expect(image).toBeHidden();
});

test('时辰不详也能排盘：三柱、无命宫', async ({ page }) => {
  await page.goto('/#/bazi?cal=s&d=1990-5-20&g=f&h=x');
  const result = page.getByRole('region', { name: '八字排盘结果' });
  await expect(result).toContainText('坤造');
  await expect(result).toContainText('不详 · 按三柱排盘');
  await expect(result).toContainText('需时辰');
});
