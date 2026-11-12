import { expect, test } from '@playwright/test';
import { captureClipboard, lastCopiedText, skipWelcomeCover } from './helpers.js';

test('九星气学：填生日出神兽与三柱，页签可切换，摘要可复制', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await skipWelcomeCover(page);
  await captureClipboard(page);
  await page.goto('/#/jiuxing');
  await expect(page).toHaveTitle(/九星气学/);

  // 书里的例子：1983-02-07 生，应龙，年亥八白、月寅二黑、日寅九紫
  await page.locator('#jx-birth').fill('1983-02-07');
  await expect(page.locator('#jx-who .beast')).toHaveText('应龙');
  await expect(page.locator('#jx-pillars')).toContainText('八白土星');
  await expect(page.locator('#jx-pillars')).toContainText('九紫火星');
  await expect(page.locator('#jx-z-guard')).toContainText('阿弥陀如来');
  // 往后十年哪条线去、回都通：总览里一年一行
  await expect(page.locator('#jx-z-years .out-row')).toHaveCount(10);

  await page.getByRole('tab', { name: '运势' }).click();
  await expect(page.locator('#jx-shape')).toContainText('应龙这一类的线');
  await expect(page.locator('#jx-scroller svg')).toBeVisible();

  await page.getByRole('tab', { name: '吉方位' }).click();
  await expect(page.locator('#jx-compass .cz')).toHaveCount(9);
  // 十年表：点一个去、回都通的月份，下面的八方就换到那个月，排得出一趟
  await expect(page.locator('#jx-years .year-row')).toHaveCount(10);
  await expect(page.locator('#jx-years .pill.ok').first()).toContainText('去、回都通');
  const monthChip = page.locator('#jx-years .chip.month:not(.past)').last();
  const [, startMonth, startDay] = (await monthChip.innerText()).match(/(\d+)月(\d+)日/);
  await monthChip.click();
  await expect(page.locator('#jx-from')).toHaveValue(new RegExp(`-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}$`));
  await expect(page.locator('#jx-dir-detail .trip').first()).toBeVisible();
  // 书里的一趟：2017-11-10 朝西北去，11-12 朝东南回。格子里和列表里都要说清哪天去、哪天回
  await page.locator('#jx-from').fill('2017-11-08');
  await page.locator('#jx-span').selectOption('30');
  const northwest = page.locator('#jx-compass .cz', { hasText: '西北' });
  await expect(northwest).toContainText('去 11月10日');
  await expect(northwest).toContainText('回 11月12日');
  await northwest.click();
  const firstTrip = page.locator('#jx-dir-detail .trip').first();
  await expect(firstTrip).toContainText('2017 年 11 月 10 日');
  await expect(firstTrip).toContainText('11 月 12 日');
  await expect(firstTrip).toContainText('住 2 晚');
  await page.locator('#jx-day').fill('2017-11-10');
  await expect(page.locator('#jx-dirs .dir-btn.pass')).toHaveText(/西北/);
  await expect(page.locator('#jx-why')).toContainText('回来要朝东南：11 月 12 日');

  await page.getByRole('tab', { name: '相性' }).click();
  await page.locator('#jx-other-birth').fill('1987-06-01');
  await expect(page.locator('#jx-x-pair')).toContainText('亥 与 卯：三合');

  await page.getByRole('tab', { name: '本命' }).click();
  await expect(page.locator('#jx-b-mix')).toContainText('1982 年的戌');

  // 页签不碰地址栏，仍然是 #/jiuxing
  await expect(page).toHaveURL(/#\/jiuxing$/);

  await page.getByRole('tab', { name: '总览' }).click();
  await page.getByRole('button', { name: '复制文字摘要' }).click();
  const copied = await lastCopiedText(page);
  expect(copied).toContain('神兽：应龙');
  expect(copied).toContain('往后几年去、回都通的线');

  // 生日不写进本机
  expect(await page.evaluate(() => Object.keys(window.localStorage).filter((key) => /^jx9-(name|birth|gender|other-)/.test(key)))).toEqual([]);

  await page.getByRole('button', { name: '返回首页' }).click();
  await expect(page.getByRole('button', { name: '进入紫微斗数专业排盘' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('九星气学：首页的工具卡能进，档案里的人可以直接选', async ({ page }) => {
  await skipWelcomeCover(page);
  // 一条编出来的八字档案
  await page.addInitScript(() => {
    window.localStorage.setItem('ziwei_archives_v1', JSON.stringify([
      { id: 'e2e-jiuxing', name: '甲某', gender: 'female', type: 'bazi', calendarType: 'solar', birthDate: '1990-6-15', solarDate: '1990-06-15', createdAt: 1, updatedAt: 1 },
    ]));
  });
  await page.goto('/');
  await page.getByRole('button', { name: /进入九星气学/ }).click();
  await expect(page).toHaveURL(/#\/jiuxing$/);
  await page.locator('#jx-profile').selectOption({ label: '甲某（1990-06-15）' });
  await expect(page.locator('#jx-name')).toHaveValue('甲某');
  await expect(page.locator('#jx-birth')).toHaveValue('1990-06-15');
  await expect(page.locator('#jx-gender')).toHaveValue('女');
  await expect(page.locator('#jx-who .beast')).toHaveText('青龙');
});
