import { expect, test } from '@playwright/test';
import { skipWelcomeCover } from './helpers.js';

// 海外出生的两处换算：历史时区、交节按绝对时刻。例子都是造出来的时刻。

test.beforeEach(async ({ page }) => {
  await skipWelcomeCover(page);
});

const openForm = async (page) => {
  await page.goto('/#/bazi');
  await page.locator('.bazi-landing__start').click();
  const form = page.getByRole('region', { name: '八字出生信息输入' });
  await expect(form).toBeVisible();
  return form;
};

test('吉隆坡 1975 年出生：按当年的 UTC+7:30 换算，改了时区还能改回', async ({ page }) => {
  const form = await openForm(page);
  await form.getByLabel('出生年份').selectOption('1975');
  await form.getByLabel('出生月份').selectOption('6');
  await form.getByLabel('出生日期').selectOption('15');
  await form.getByLabel('出生时间（钟表时间）').fill('08:00');
  await form.getByLabel('出生省份').selectOption('马来西亚');
  await form.getByLabel('出生城市').selectOption('吉隆坡');

  const notice = form.getByTestId('bazi-historical-timezone');
  await expect(notice).toContainText('吉隆坡在 1975 年用 UTC+7:30，现在是 UTC+8。已按当年的时区换算。');
  await expect(form.getByLabel('出生地时区')).toHaveValue('7.5');
  await expect(form).toContainText('时柱 甲辰');

  // 手动选回 UTC+8：时柱变成卯时，提示里给出「改用当年的时区」。
  await form.getByLabel('出生地时区').selectOption('8');
  await expect(form).toContainText('时柱 癸卯');
  await expect(notice).toContainText('现在选的是 UTC+8。');
  await notice.getByRole('button', { name: '改用当年的时区' }).click();
  await expect(form.getByLabel('出生地时区')).toHaveValue('7.5');
  await expect(form).toContainText('时柱 甲辰');

  // 1982 年以后出生：当地已经是 UTC+8，不再提示。
  await form.getByLabel('出生年份').selectOption('1990');
  await expect(notice).toHaveCount(0);
  await expect(form.getByLabel('出生地时区')).toHaveValue('8');
});

test('雅加达立春后十八分钟出生：年柱月柱按出生的绝对时刻排，并写明缘由', async ({ page }) => {
  const form = await openForm(page);
  await form.getByLabel('出生年份').selectOption('2024');
  await form.getByLabel('出生月份').selectOption('2');
  await form.getByLabel('出生日期').selectOption('4');
  await form.getByLabel('出生时间（钟表时间）').fill('15:45');
  await form.getByLabel('出生省份').selectOption('印度尼西亚');
  await form.getByLabel('出生城市').selectOption('雅加达');

  await expect(form.getByLabel('出生地时区')).toHaveValue('7');
  const notice = form.getByTestId('bazi-jie-adjustment');
  await expect(notice).toContainText('北京时间 2024-02-04 16:45');
  await expect(notice).toContainText('年柱 甲辰、月柱 丙寅');
  await expect(notice).toContainText('癸卯 年 乙丑 月');

  await form.getByRole('button', { name: '男命' }).click();
  await form.getByRole('button', { name: '起命盘' }).click();
  const result = page.getByRole('region', { name: '八字排盘结果' });
  await expect(result).toBeVisible();
  await expect(result).toContainText('甲辰');
  await expect(result).toContainText('丙寅');
});
