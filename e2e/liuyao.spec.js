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

  // 术语词典：按需加载后可搜索（词条随支线录入增加，这里只断言结构）。
  const glossary = page.getByTestId('liuyao-glossary');
  await expect(page.getByRole('heading', { name: '术语词典' })).toBeVisible();
  await expect(glossary.getByTestId('liuyao-glossary-summary')).toContainText(/词典共 \d+ 条/);
  await glossary.getByRole('searchbox', { name: '搜索术语' }).fill('不存在的词');
  await expect(glossary).toContainText('没有找到包含「不存在的词」的术语');

  await page.getByRole('button', { name: '存入档案' }).click();
  const panel = page.locator('#liuyao-save-panel');
  await panel.getByPlaceholder('例如：问换工作').fill('端到端卦例');
  await panel.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('status').filter({ hasText: '已存入档案「端到端卦例」' })).toBeVisible();
  await expect(page.getByRole('button', { name: '已在档案' })).toBeVisible();

  await page.goto('/#/archive');
  await expect(page.getByRole('button', { name: '查看卦例「端到端卦例」' })).toBeVisible();
});

test('替家人问病：选替谁问与病程，用神取父母，结果页可改回自己', async ({ page }) => {
  await page.goto('/#/liuyao');
  const setup = page.getByRole('region', { name: '六爻起卦设置' });
  await setup.getByRole('button', { name: '健康疾病' }).click();
  const who = setup.getByRole('group', { name: '替谁问' });
  await who.getByRole('button', { name: '父母长辈' }).click();
  await expect(who.getByRole('button', { name: '父母长辈' })).toHaveAttribute('aria-pressed', 'true');
  await setup.getByRole('group', { name: '病程' }).getByRole('button', { name: '新病' }).click();
  await setup.getByRole('button', { name: /时间起卦/ }).click();
  await setup.getByRole('button', { name: '按此刻时间起卦' }).click();

  // 提示词全文里也有同样的字，所以类别标签按全文匹配、断卦要点只在卡片里找
  await expect(page.getByText('健康疾病（替父母长辈问）（新病）', { exact: true })).toBeVisible();
  const judgeCard = page.locator('section', { has: page.getByRole('heading', { name: '断卦要点' }) });
  await expect(judgeCard.getByText(/健康疾病（替父母长辈问）取父母为用神/)).toBeVisible();
  await judgeCard.getByRole('combobox', { name: '替谁问' }).selectOption('self');
  await expect(judgeCard.getByText(/健康疾病以世爻为用神/)).toBeVisible();
  await expect(page.getByText('健康疾病（新病）', { exact: true })).toBeVisible();
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
