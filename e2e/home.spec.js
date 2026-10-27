import { expect, test } from '@playwright/test';
import { captureClipboard, skipWelcomeCover } from './helpers.js';

test('首次访问显示封面，进入后首页可通往三个工具', async ({ page }) => {
  await captureClipboard(page);
  await page.goto('/');
  await expect(page).toHaveTitle(/古书派/);
  await page.getByRole('button', { name: '入门问道' }).click();
  await expect(page.getByRole('button', { name: '进入紫微斗数专业排盘' })).toBeVisible();

  await page.getByRole('button', { name: /八字排盘/ }).first().click();
  await expect(page).toHaveURL(/#\/bazi$/);
  await expect(page.locator('.bazi-landing__start')).toBeVisible();

  // 再次访问不再出现封面。
  await page.goto('/');
  await expect(page.getByRole('button', { name: '入门问道' })).toBeHidden();
  await expect(page.getByRole('button', { name: '进入紫微斗数专业排盘' })).toBeVisible();
});

test('浅链接直达各功能且不显示封面', async ({ page }) => {
  await skipWelcomeCover(page);
  for (const [hash, pattern] of [
    ['#/liuyao', '六爻起卦设置'],
    ['#/archive', /共 \d+ 条命盘|还没有保存命盘/],
    ['#/about', /关于|隐私/],
  ]) {
    await page.goto(`/${hash}`);
    await expect(page.getByRole('button', { name: '入门问道' })).toBeHidden();
    await expect(typeof pattern === 'string' ? page.getByRole('region', { name: pattern }) : page.getByRole('heading', { name: pattern }).first()).toBeVisible();
  }
});
