import { expect, test } from '@playwright/test';
import { captureClipboard, skipWelcomeCover } from './helpers.js';

test('首次访问显示封面，进入后首页可通往三个工具', async ({ page }) => {
  await captureClipboard(page);
  await page.goto('/');
  await expect(page).toHaveTitle(/古书派/);
  // 封面只有两扇门：问命（进首页）与藏经阁。
  const cover = page.locator('.welcome-cover');
  await expect(cover.getByRole('button')).toHaveCount(2);
  await cover.getByRole('button', { name: /^问命/ }).click();
  await expect(page.getByRole('button', { name: '进入紫微斗数专业排盘' })).toBeVisible();

  await page.getByRole('button', { name: /八字排盘/ }).first().click();
  await expect(page).toHaveURL(/#\/bazi$/);
  await expect(page.locator('.bazi-landing__start')).toBeVisible();

  // 再次访问不再出现封面。
  await page.goto('/');
  await expect(page.locator('.welcome-cover')).toBeHidden();
  await expect(page.getByRole('button', { name: '进入紫微斗数专业排盘' })).toBeVisible();
});

test('浅链接直达各功能且不显示封面', async ({ page }) => {
  await skipWelcomeCover(page);
  for (const [hash, pattern] of [
    ['#/liuyao', '六爻起卦设置'],
    ['#/archive', /共 \d+ 条命盘|档案里还没有命盘/],
    ['#/about', /关于|隐私/],
  ]) {
    await page.goto(`/${hash}`);
    await expect(page.locator('.welcome-cover')).toBeHidden();
    await expect(typeof pattern === 'string' ? page.getByRole('region', { name: pattern }) : page.getByRole('heading', { name: pattern }).first()).toBeVisible();
  }
});

test('首页最上面一排是全部工具：九星气学不用往下翻、不用点「更多」就能进', async ({ page }) => {
  await skipWelcomeCover(page);
  await page.goto('/');
  const tools = page.getByRole('navigation', { name: '全部工具' });
  await expect(tools.getByRole('button')).toHaveText([/紫微斗数$/, /八字排盘$/, /六爻起卦$/, /九星气学$/, /藏经阁$/]);

  // 这一排在第一屏里，不用滚动。
  const jiuxing = tools.getByRole('button', { name: '九星气学' });
  const box = await jiuxing.boundingBox();
  expect(box.y + box.height).toBeLessThan(page.viewportSize().height);

  await jiuxing.click();
  await expect(page).toHaveURL(/#\/jiuxing$/);
  await expect(page.locator('#jx-birth')).toBeVisible();

  // 六爻、藏经阁同样一点就到。
  await page.goto('/');
  await tools.getByRole('button', { name: '六爻起卦' }).click();
  await expect(page).toHaveURL(/#\/liuyao$/);
  await page.goto('/');
  await tools.getByRole('button', { name: '藏经阁' }).click();
  await expect(page).toHaveURL(/#\/cangjing/);
});
