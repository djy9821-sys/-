import { expect, test } from '@playwright/test';
import { captureClipboard, skipWelcomeCover } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await skipWelcomeCover(page);
  await captureClipboard(page);
});

test('时间起卦得到装卦结果，并能存入档案', async ({ page }) => {
  await page.goto('/#/liuyao');
  const setup = page.getByRole('region', { name: '六爻起卦设置' });
  await expect(setup).toBeVisible();
  await setup.getByPlaceholder('例如：这个月换工作是否顺利？').fill('端到端测试问事');
  await setup.getByRole('button', { name: /时间起卦/ }).click();
  await setup.getByRole('button', { name: '按此刻时间起卦' }).click();

  await expect(page.getByRole('table', { name: '装卦表' })).toBeVisible();
  await expect(page.getByText('端到端测试问事').first()).toBeVisible();

  await page.getByRole('button', { name: '存入档案' }).click();
  const panel = page.locator('#liuyao-save-panel');
  await panel.getByPlaceholder('例如：问换工作').fill('端到端卦例');
  await panel.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('status').filter({ hasText: '已存入档案「端到端卦例」' })).toBeVisible();
  await expect(page.getByRole('button', { name: '已在档案' })).toBeVisible();

  await page.goto('/#/archive');
  await expect(page.getByRole('button', { name: '查看卦例「端到端卦例」' })).toBeVisible();
});

test('报数起卦：两个数决定上下卦', async ({ page }) => {
  await page.goto('/#/liuyao');
  const setup = page.getByRole('region', { name: '六爻起卦设置' });
  await setup.getByRole('button', { name: /报数起卦/ }).click();
  const numbers = setup.getByRole('group', { name: '报数' });
  await numbers.getByLabel('第一个数（上卦）').fill('37');
  await numbers.getByLabel('第二个数（下卦）').fill('52');
  await setup.getByRole('button', { name: '按报数起卦' }).click();
  await expect(page.getByRole('table', { name: '装卦表' })).toBeVisible();
});
