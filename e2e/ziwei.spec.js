import { expect, test } from '@playwright/test';
import { captureClipboard, hashOf, lastCopiedText, skipWelcomeCover } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await skipWelcomeCover(page);
  await captureClipboard(page);
});

const fillBirthForm = async (page) => {
  const form = page.locator('form.birth-form');
  await expect(form).toBeVisible();
  await form.getByLabel('出生年份').selectOption('1990');
  await form.getByLabel('出生月份').selectOption('05');
  await form.getByLabel('出生日期').selectOption('20');
  await form.getByLabel('出生时辰').selectOption('6');
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

test('精确到分钟的紫微链接按真太阳时换算时辰', async ({ page }) => {
  await page.goto('/#/ziwei?cal=s&d=1988-07-15&g=f&c=09%3A05&lon=114.51&prov=%E6%B2%B3%E5%8C%97&city=%E7%9F%B3%E5%AE%B6%E5%BA%84&n=%E7%9F%B3%E5%AE%B6%E5%BA%84');
  await expect(page.getByTestId('ziwei-chart-title')).toBeVisible({ timeout: 30_000 });
  const summary = page.getByTestId('ziwei-center-summary');
  await expect(summary).toContainText('石家庄');
  await expect(summary).toContainText('1988');
  await expect(summary.locator('p', { hasText: '真太阳时' })).not.toContainText('未');
});
