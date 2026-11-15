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

test('九星气学：生日可以按农历填，换成公历再算，和直接填公历是同一个结果', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await skipWelcomeCover(page);
  await page.goto('/#/jiuxing');

  // 默认按公历填，下面写出农历是哪天。
  const echo = page.locator('#jx-birth-echo');
  await expect(echo).toHaveText('农历是 1990 年五月廿三。');

  // 切到农历：公历那一格收起，三个下拉框摆在同一天上。
  const switcher = page.getByRole('group', { name: '出生日期按公历还是农历填' });
  await switcher.getByRole('button', { name: '农历' }).click();
  await expect(page.locator('#jx-birth')).toBeHidden();
  await expect(page.locator('#jx-birth-cap')).toHaveText('出生日期（农历）');
  const year = page.getByLabel('农历出生年', { exact: true });
  const month = page.getByLabel('农历出生月', { exact: true });
  const day = page.getByLabel('农历出生日', { exact: true });
  await expect(year).toHaveValue('1990');
  await expect(month).toHaveValue('5');
  await expect(day).toHaveValue('23');

  // 书里的例子按农历填：壬戌年腊月廿五 = 公历 1983-02-07，应龙。
  await year.selectOption('1982');
  await month.selectOption('12');
  await day.selectOption('25');
  await expect(echo).toHaveText('农历 1982 年十二月廿五，按公历 1983 年 2 月 7 日算。');
  await expect(page.locator('#jx-who .beast')).toHaveText('应龙');
  await expect(page.locator('#jx-pillars')).toContainText('八白土星');
  await expect(page.locator('#jx-pillars')).toContainText('九紫火星');

  // 闰月：2020 年有闰四月，闰四月初一是公历 5 月 23 日；换到没有闰四月的年份，退到四月。
  await year.selectOption('2020');
  await expect(month.locator('option')).toHaveCount(13);
  await month.selectOption({ label: '闰四月' });
  await day.selectOption('1');
  await expect(echo).toContainText('农历 2020 年闰四月初一，按公历 2020 年 5 月 23 日算。');
  await year.selectOption('2021');
  await expect(month.locator('option')).toHaveCount(12);
  await expect(month).toHaveValue('4');

  // 切回公历：那一格里就是换算出来的日子。
  await switcher.getByRole('button', { name: '公历' }).click();
  await expect(page.locator('#jx-birth')).toBeVisible();
  await expect(page.locator('#jx-birth')).toHaveValue('2021-05-12');
  await expect(echo).toHaveText('农历是 2021 年四月初一。');

  // 换出来的公历超出能算的范围：说明原因，不出结果。
  await switcher.getByRole('button', { name: '农历' }).click();
  await year.selectOption('1900');
  await month.selectOption('1');
  await day.selectOption('1');
  await expect(echo).toContainText('不在 1900 年 2 月 5 日到 2060 年之间');
  await expect(page.locator('#jx-who')).toContainText('公历、农历都可以');

  // 公历那一格没有能用的日子时切到农历：下拉框摆在 1990 年正月初一上，页面就按这一天算，两边说的是同一天。
  await switcher.getByRole('button', { name: '公历' }).click();
  await expect(page.locator('#jx-birth')).toHaveValue('');
  await expect(echo).toBeHidden();
  await page.locator('#jx-birth').fill('1900-01-20'); // 早于能算的范围：不写农历是哪天
  await expect(echo).toBeHidden();
  await switcher.getByRole('button', { name: '农历' }).click();
  await expect(year).toHaveValue('1990');
  await expect(month).toHaveValue('1');
  await expect(day).toHaveValue('1');
  await expect(echo).toHaveText('农历 1990 年正月初一，按公历 1990 年 1 月 27 日算。');
  await expect(page.locator('#jx-who .beast')).toBeVisible();

  // 对方的生日同样可以按农历填。
  await year.selectOption('1982');
  await month.selectOption('12');
  await day.selectOption('25');
  await page.getByRole('tab', { name: '相性' }).click();
  await page.getByRole('group', { name: '对方的出生日期按公历还是农历填' }).getByRole('button', { name: '农历' }).click();
  await page.getByLabel('对方的农历出生年').selectOption('1987');
  await page.getByLabel('对方的农历出生月').selectOption('5');
  await page.getByLabel('对方的农历出生日').selectOption('6');
  await expect(page.locator('#jx-other-birth-echo')).toHaveText('对方农历 1987 年五月初六，按公历 1987 年 6 月 1 日算。');
  await expect(page.locator('#jx-x-pair')).toContainText('亥 与 卯：三合');

  // 只记住「用农历填」这个习惯，生日本身不写进本机。
  expect(await page.evaluate(() => window.localStorage.getItem('jx9-cal'))).toBe('lunar');
  expect(await page.evaluate(() => Object.keys(window.localStorage).filter((key) => /^jx9-(name|birth|gender|other-)/.test(key)))).toEqual([]);
  expect(errors).toEqual([]);
});

test('九星气学：手机上农历的下拉框不出框，换算出来的那一行紧跟在生日下面', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await skipWelcomeCover(page);
  await page.goto('/#/jiuxing');
  const echo = page.locator('#jx-birth-echo');
  await expect(echo).toHaveText('农历是 1990 年五月廿三。');
  await page.getByRole('group', { name: '出生日期按公历还是农历填' }).getByRole('button', { name: '农历' }).click();
  await page.getByLabel('农历出生年', { exact: true }).selectOption('2020');
  await page.getByLabel('农历出生月', { exact: true }).selectOption({ label: '闰四月' });
  await expect(echo).toContainText('农历 2020 年闰四月');

  const rect = async (selector) => page.locator(selector).boundingBox();
  const card = await rect('#jx-birth-box');
  const [yearBox, monthBox, dayBox] = [await rect('#jx-birth-ly'), await rect('#jx-birth-lm'), await rect('#jx-birth-ld')];
  // 年单占一行（带干支和生肖，字多），月、日并排在下一行，都在卡片里面。
  expect(Math.abs(yearBox.width - card.width)).toBeLessThanOrEqual(1);
  expect(monthBox.y).toBeGreaterThanOrEqual(yearBox.y + yearBox.height);
  expect(Math.abs(monthBox.y - dayBox.y)).toBeLessThanOrEqual(1);
  expect(dayBox.x).toBeGreaterThanOrEqual(monthBox.x + monthBox.width);
  expect(dayBox.x + dayBox.width).toBeLessThanOrEqual(card.x + card.width + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // 换算出来的那一行在生日和性别之间，不隔着别的格子。
  const [line, gender] = [await rect('#jx-birth-echo'), await rect('#jx-gender')];
  expect(line.y).toBeGreaterThanOrEqual(card.y + card.height);
  expect(line.y + line.height).toBeLessThanOrEqual(gender.y);
});
