import { expect, test } from '@playwright/test';
import { captureClipboard, hashOf, lastCopiedText, skipWelcomeCover } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await skipWelcomeCover(page);
  await captureClipboard(page);
});

const fillBirthForm = async (page) => {
  const form = page.locator('form.birth-form');
  await expect(form).toBeVisible();
  // 年月日三个下拉的可见标签是 sr-only 文字加「年 / 月 / 日」，按 autocomplete 定位最稳。
  await form.locator('select[autocomplete="bday-year"]').selectOption('1990');
  await form.locator('select[autocomplete="bday-month"]').selectOption('05');
  await form.locator('select[autocomplete="bday-day"]').selectOption('20');
  await form.locator('#birth-time').selectOption('6');
  await form.locator('#birth-name').fill('紫微端到端');
  await form.getByRole('button', { name: '生成紫微命盘' }).click();
};

test('录入生辰生成紫微命盘，常用功能里复制分享链接，链接打开即出盘', async ({ page, context }) => {
  await page.goto('/#/ziwei');
  await fillBirthForm(page);

  await expect(page.getByTestId('ziwei-chart-title')).toBeVisible({ timeout: 30_000 });
  const summary = page.getByTestId('ziwei-center-summary');
  await expect(summary).toContainText('紫微端到端');
  await expect(summary).toContainText('1990');

  await page.getByRole('button', { name: '常用功能' }).click();
  await page.getByTestId('ziwei-common-menu').getByRole('button', { name: '分享链接' }).click();
  const copied = await lastCopiedText(page);
  expect(copied).toContain('#/ziwei?');
  expect(copied).toContain('d=1990-05-20');
  expect(copied).toContain('h=6');
  await expect(page.locator('.archive-notice')).toContainText('命盘链接已复制');

  // 对方打开链接：不用填表，直接看到同一张盘。
  const other = await context.newPage();
  await other.goto(hashOf(copied));
  await expect(other.getByTestId('ziwei-chart-title')).toBeVisible({ timeout: 30_000 });
  const otherSummary = other.getByTestId('ziwei-center-summary');
  await expect(otherSummary).toContainText('紫微端到端');
  await expect(otherSummary).toContainText('1990');
  await expect(other).toHaveURL(/#\/ziwei\/chart$/);
});

test('常用功能里的古籍原文：默认看命宫，列出宫中星曜与古籍条目，可换宫', async ({ page }) => {
  await page.goto('/#/ziwei');
  await fillBirthForm(page);
  await expect(page.getByTestId('ziwei-chart-title')).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: '常用功能' }).click();
  await page.getByTestId('ziwei-common-menu').getByRole('button', { name: '古籍原文' }).click();
  const modal = page.getByTestId('ziwei-classics-modal');
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { name: /古籍原文/ })).toBeVisible();

  // 1990-05-20 午时：命宫在亥，紫微旺、七杀平同宫，身宫同在命宫。
  const palacePicker = modal.getByRole('group', { name: '选择宫位' });
  await expect(palacePicker.getByRole('button', { name: /^命宫/ })).toHaveAttribute('aria-pressed', 'true');
  const stars = modal.getByTestId('ziwei-classics-stars');
  await expect(stars).toContainText('命宫（身宫）·亥宫');
  await expect(stars).toContainText('紫微旺');
  await expect(stars).toContainText('七杀平');

  // 条目随支线录入增加、按相关度排序：只断言有条目、出自《紫微斗数全书》，翻完所有页能找到按紫微命中的那条。
  await expect(modal.getByTestId('ziwei-classics-panel-summary')).toContainText(/相关的原文 \d+ 条/, { timeout: 15_000 });
  const entries = modal.getByTestId('ziwei-classic-entry');
  await expect(entries.first()).toContainText('《紫微斗数全书》');
  const more = modal.getByRole('button', { name: /^再看/ });
  for (let page = 0; page < 10 && await more.isVisible(); page += 1) await more.click();
  await expect(entries.filter({ hasText: '星曜·紫微' }).first()).toBeVisible();

  // 可切到当前大限：说明大限命宫在本命盘哪一宫，再切回本命盘。
  const layer = modal.getByRole('group', { name: '看哪一层' });
  await layer.getByRole('button', { name: '当前大限' }).click();
  await expect(modal.getByTestId('ziwei-classics-limit')).toContainText(/当前大限（.+限 · 虚岁\d+-\d+/);
  await layer.getByRole('button', { name: '本命盘' }).click();
  await expect(palacePicker.getByRole('button', { name: /^命宫/ })).toBeVisible();

  // 换到迁移宫：天府得，条目随之变化（库里暂无天府条目时显示「暂时没有」提示）。
  await palacePicker.getByRole('button', { name: /^迁移/ }).click();
  await expect(stars).toContainText('迁移·巳宫');
  await expect(stars).toContainText('天府得');
  await expect(modal.getByTestId('ziwei-classics-panel-summary')).toContainText('库内共');

  await modal.getByRole('button', { name: '关闭' }).click();
  await expect(modal).toBeHidden();

  // 术语词典弹层：先列命宫里的术语，可搜索。
  await page.getByRole('button', { name: '常用功能' }).click();
  await page.getByTestId('ziwei-common-menu').getByRole('button', { name: '术语词典' }).click();
  const glossaryModal = page.getByTestId('ziwei-glossary-modal');
  await expect(glossaryModal).toBeVisible();
  await expect(glossaryModal.getByTestId('ziwei-glossary-summary')).toContainText(/词典共 \d+ 条/);
  await glossaryModal.getByRole('searchbox', { name: '搜索术语' }).fill('不存在的词');
  await expect(glossaryModal).toContainText('没有找到包含「不存在的词」的术语');
  await glossaryModal.getByRole('button', { name: '关闭' }).click();
  await expect(glossaryModal).toBeHidden();

  // AI 话术末尾附上命宫、身宫星曜的古籍原文（库已加载过，直接复制）。
  await page.getByRole('button', { name: '常用功能' }).click();
  await page.getByTestId('ziwei-common-menu').getByRole('button', { name: 'AI 分析' }).click();
  await page.getByRole('button', { name: /一键鉴渣话术/ }).click();
  const prompt = await lastCopiedText(page);
  expect(prompt).toContain('【古籍原文（命宫、身宫星曜）】');
  // 条目随支线录入增加：只断言附上了按紫微命中的条目（可能同时按宫位命中）。
  expect(prompt).toMatch(/- 《紫微斗数全书》[^\n]*（匹配：[^\n]*星曜·紫微[^\n]*）：/);
});

test('精确到分钟的紫微链接按真太阳时换算时辰', async ({ page }) => {
  await page.goto('/#/ziwei?cal=s&d=1988-07-15&g=f&c=09%3A05&lon=114.51&prov=%E6%B2%B3%E5%8C%97&city=%E7%9F%B3%E5%AE%B6%E5%BA%84&n=%E7%9F%B3%E5%AE%B6%E5%BA%84');
  await expect(page.getByTestId('ziwei-chart-title')).toBeVisible({ timeout: 30_000 });
  const summary = page.getByTestId('ziwei-center-summary');
  await expect(summary).toContainText('石家庄');
  await expect(summary).toContainText('1988');
  await expect(summary.locator('p', { hasText: '真太阳时' })).not.toContainText('未');
});
