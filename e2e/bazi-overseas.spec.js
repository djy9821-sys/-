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

test('出生地下拉框：带箭头，海外排在最前，没选国家或省份时城市框写明先选哪个', async ({ page }) => {
  const form = await openForm(page);
  const province = form.getByLabel('出生省份');
  const city = form.getByLabel('出生城市');

  // 第一组是海外，马来西亚、印度尼西亚在最前面；中国各省在后。
  const groups = await province.locator('optgroup').evaluateAll((nodes) => nodes.map((node) => ({ label: node.label, first: node.querySelector('option')?.value })));
  expect(groups).toEqual([{ label: '海外', first: '马来西亚' }, { label: '中国', first: '北京' }]);
  await expect(province.locator('optgroup[label="海外"] option')).toHaveText(['马来西亚', '印度尼西亚', '海外（亚洲）']);

  // 下拉框右侧有箭头，不会被当成文本框。
  expect(await province.evaluate((node) => getComputedStyle(node).backgroundImage)).toContain('svg');

  // 没选国家或省份：城市不可点，并写明先选国家／省份；选了以后才能选城市。
  await expect(city).toBeDisabled();
  await expect(city.locator('option').first()).toHaveText('先选国家／省份');
  await province.selectOption('印度尼西亚');
  await expect(city).toBeEnabled();
  await expect(city.locator('option').first()).toHaveText('选择城市');
  await city.selectOption('泗水');
  await expect(form.getByLabel('出生地经度')).not.toHaveValue('');
});

test('窄屏（320 宽）：出生地两个框上下排，下拉框都不伸出所在的格子，页面不横向滚动', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const form = await openForm(page);
  await form.getByLabel('出生省份').selectOption('印度尼西亚');
  await form.getByLabel('出生城市').selectOption('北干巴鲁');

  // 国家／省份在上，城市在下，左边对齐、各占一整行。
  const provinceBox = await form.getByLabel('出生省份').boundingBox();
  const cityBox = await form.getByLabel('出生城市').boundingBox();
  expect(cityBox.y).toBeGreaterThanOrEqual(provinceBox.y + provinceBox.height);
  expect(Math.abs(cityBox.x - provinceBox.x)).toBeLessThan(1);
  expect(Math.abs(cityBox.width - provinceBox.width)).toBeLessThan(1);

  // 时区框以前比所在的格子宽，窄屏上会伸到面板外面：每个下拉框都不许超出父元素。
  const overflowing = await form.evaluate((node) => [...node.querySelectorAll('select')]
    .filter((select) => select.getBoundingClientRect().right > select.parentElement.getBoundingClientRect().right + 0.5)
    .map((select) => select.getAttribute('aria-label') || select.id));
  expect(overflowing).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
