import { expect, test } from '@playwright/test';
import { skipWelcomeCover } from './helpers.js';

// 排过的盘自动记进档案：再排下一个人，前面的人不会找不到。例子都是编出来的人和生辰。

test.beforeEach(async ({ page }) => {
  await skipWelcomeCover(page);
});

const openBaziForm = async (page) => {
  await page.goto('/#/bazi');
  await page.locator('.bazi-landing__start').click();
  const form = page.getByRole('region', { name: '八字出生信息输入' });
  await expect(form).toBeVisible();
  return form;
};

// 在录入页填一个人并起盘；已经在结果页时先点「重新排盘」回到录入页。
const castBazi = async (page, { name, year, month, day, hour = '6' }) => {
  const result = page.getByRole('region', { name: '八字排盘结果' });
  if (await result.isVisible()) await page.getByRole('button', { name: '重新排盘' }).click();
  const form = page.getByRole('region', { name: '八字出生信息输入' });
  await expect(form).toBeVisible();
  await form.getByLabel('命主称呼').fill(name);
  await form.getByLabel('出生年份').selectOption(String(year));
  await form.getByLabel('出生月份').selectOption(String(month));
  await form.getByLabel('出生日期').selectOption(String(day));
  await form.getByRole('button', { name: '只知道时辰' }).click();
  await form.getByLabel('出生时辰').selectOption(hour);
  await form.getByRole('button', { name: '起命盘' }).click();
  await expect(result).toBeVisible();
  if (name) await expect(result).toContainText(name);
};

const autoSection = (page) => page.locator('section', { has: page.getByRole('heading', { name: '自动记录' }) });

test('连着排三个人：档案里三条都在，卷首页能翻到更早排过的', async ({ page }) => {
  await openBaziForm(page);
  await castBazi(page, { name: '甲某', year: 1990, month: 5, day: 20 });
  await expect(page.getByRole('status').filter({ hasText: '这张盘已自动记在档案的「自动记录」里' })).toBeVisible();
  await castBazi(page, { name: '乙某', year: 1985, month: 3, day: 9 });
  await castBazi(page, { name: '丙某', year: 2001, month: 11, day: 2 });

  // 档案页：三个人都在「自动记录」里，新的在前。
  await page.goto('/#/archive');
  await expect(page.getByRole('heading', { name: '共 3 条命盘' })).toBeVisible();
  const section = autoSection(page);
  await expect(section.getByRole('button', { name: /^打开.+的八字命盘$/ })).toHaveCount(3);
  const opened = await section.getByRole('button', { name: /^打开.+的八字命盘$/ }).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
  expect(opened).toEqual(['打开丙某的八字命盘', '打开乙某的八字命盘', '打开甲某的八字命盘']);

  // 八字卷首页：上次的命盘是丙某，「更早排过的」里有乙某、甲某，点一下直接打开。
  await page.goto('/#/bazi');
  await expect(page.locator('.bazi-landing__resume-open')).toContainText('丙某');
  const toggle = page.getByRole('button', { name: '更早排过的 · 2 条' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  const earlier = page.locator('#bazi-earlier-list');
  await expect(earlier.locator('li')).toHaveText([/^乙某 · 1985年3月9日/, /^甲某 · 1990年5月20日/]);
  await earlier.getByRole('button', { name: /^乙某/ }).click();
  await expect(page.getByRole('region', { name: '八字排盘结果' })).toContainText('乙某 · 乾造');

  // 从档案页点开最早排的那个人，还是他那张盘。
  await page.goto('/#/archive');
  await autoSection(page).getByRole('button', { name: '打开甲某的八字命盘' }).click();
  await expect(page.getByRole('region', { name: '八字排盘结果' })).toContainText('甲某 · 乾造');
});

test('同一张盘再排不重复记；手动存入档案后归到分组，还是只有一条', async ({ page }) => {
  await openBaziForm(page);
  await castBazi(page, { name: '', year: 1992, month: 8, day: 17 });
  // 没写名字先排了一次，再补上名字排同一张盘：改名，不多记一条。
  await castBazi(page, { name: '丁某', year: 1992, month: 8, day: 17 });
  await castBazi(page, { name: '丁某', year: 1992, month: 8, day: 17 });

  await page.getByRole('button', { name: '存入档案' }).click();
  const panel = page.locator('#bazi-save-panel');
  await panel.getByRole('button', { name: '客户' }).click();
  await panel.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('status').filter({ hasText: '已保存「丁某」的八字命盘' })).toBeVisible();

  await page.goto('/#/archive');
  await expect(page.getByRole('heading', { name: '共 1 条命盘' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '自动记录' })).toHaveCount(0);
  await expect(page.locator('section', { has: page.getByRole('heading', { name: '客户' }) }).getByRole('button', { name: '打开丁某的八字命盘' })).toBeVisible();
});

test('清除上次的命盘连自动记录一并删掉，可撤销；关掉自动记录后不再记；能一键清空', async ({ page }) => {
  await openBaziForm(page);
  await castBazi(page, { name: '戊某', year: 1978, month: 2, day: 14 });

  // 卷首页清除上次的命盘：档案里那条自动记录也没了；撤销后回来。
  const archivedCount = () => page.evaluate(() => JSON.parse(window.localStorage.getItem('ziwei_archives_v1') || '[]').length);
  await page.getByRole('button', { name: '返回八字输入' }).click();
  await page.getByRole('button', { name: '返回八字卷首' }).click();
  expect(await archivedCount()).toBe(1);
  await page.getByRole('button', { name: '清除上次的命盘记录' }).click();
  await expect(page.getByText('已清除上次的命盘')).toBeVisible();
  expect(await archivedCount()).toBe(0);
  await page.getByRole('button', { name: '撤销' }).click();
  await expect(page.locator('.bazi-landing__resume-open')).toContainText('戊某');
  expect(await archivedCount()).toBe(1);
  await page.goto('/#/archive');
  await expect(autoSection(page).getByRole('button', { name: '打开戊某的八字命盘' })).toBeVisible();

  // 关掉自动记录：再排一个人，档案里不多出来。
  await page.getByLabel('起盘后自动记到档案').uncheck();
  await expect(page.getByRole('status').filter({ hasText: '已关闭：以后起盘不再自动记录' })).toBeVisible();
  await openBaziForm(page);
  await castBazi(page, { name: '己某', year: 1969, month: 9, day: 30 });
  await expect(page.getByRole('status').filter({ hasText: '已自动记在档案' })).toHaveCount(0);
  await page.goto('/#/archive');
  await expect(page.getByRole('heading', { name: '共 1 条命盘' })).toBeVisible();
  await expect(page.getByLabel('起盘后自动记到档案')).not.toBeChecked();

  // 清空自动记录：要再点一次确认。
  await page.getByRole('button', { name: '清空自动记录' }).click();
  await page.getByRole('group', { name: '确认清空自动记录' }).getByRole('button', { name: '确认清空' }).click();
  await expect(page.getByRole('status').filter({ hasText: '已清空 1 条自动记录' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '档案里还没有命盘' })).toBeVisible();
});

test('紫微命盘同样自动记进档案；手动保存后归到分组，不重复', async ({ page }) => {
  // 第一次看紫微盘会弹出箭头图解，这里当作已经看过，免得挡住按钮。
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('gushupai:ziwei-arrow-guide-v1', 'seen');
    } catch {
      // 无痕模式下忽略
    }
  });
  await page.goto('/#/ziwei');
  const form = page.locator('form.birth-form');
  await expect(form).toBeVisible();
  await form.locator('select[autocomplete="bday-year"]').selectOption('1988');
  await form.locator('select[autocomplete="bday-month"]').selectOption('07');
  await form.locator('select[autocomplete="bday-day"]').selectOption('15');
  await form.locator('#birth-time').selectOption('5');
  await form.locator('#birth-name').fill('庚某');
  await form.getByRole('button', { name: '生成紫微命盘' }).click();
  await expect(page.getByTestId('ziwei-chart-title')).toBeVisible({ timeout: 30_000 });

  await page.goto('/#/archive');
  await expect(page.getByRole('heading', { name: '共 1 条命盘' })).toBeVisible();
  await expect(autoSection(page).getByRole('button', { name: '打开庚某的紫微斗数命盘' })).toBeVisible();

  // 首页不会因为自动记下了别人的紫微盘就换成那个人的每日简报。
  await page.goto('/#/');
  await expect(page.locator('.home-overview--empty')).toHaveCount(1);
  await expect(page.getByText('现有紫微档案缺少')).toHaveCount(0);

  // 从档案打开这条自动记录，点保存归到「母亲」：还是那一条，不多存一份。
  await page.goto('/#/archive');
  await autoSection(page).getByRole('button', { name: '打开庚某的紫微斗数命盘' }).click();
  await expect(page.getByTestId('ziwei-chart-title')).toBeVisible({ timeout: 30_000 });
  // 保存按钮在「设置」里。
  await page.getByRole('button', { name: /^设置/ }).click();
  await page.getByRole('region', { name: '命盘设置' }).getByRole('button', { name: '保存档案' }).click();
  const dialog = page.getByRole('dialog', { name: '保存到档案' });
  await dialog.getByRole('button', { name: '母亲' }).click();
  await dialog.getByRole('button', { name: '确认保存' }).click();
  await expect(page.locator('.archive-notice')).toContainText('已保存「庚某」的紫微命盘');

  await page.goto('/#/archive');
  await expect(page.getByRole('heading', { name: '共 1 条命盘' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '自动记录' })).toHaveCount(0);
  await expect(page.locator('section', { has: page.getByRole('heading', { name: '母亲' }) }).getByRole('button', { name: '打开庚某的紫微斗数命盘' })).toBeVisible();
});

test('更新前排的最后一张盘：第一次打开八字页就补记进档案，再排别人也不会被盖掉', async ({ page }) => {
  // 更新前的浏览器里只有「上次的命盘」这一格，档案是空的。
  await page.addInitScript(() => {
    if (window.localStorage.getItem('bazi-last-chart')) return;
    window.localStorage.setItem('bazi-last-chart', JSON.stringify({
      name: '辛某', gender: 'male', type: 'bazi', calendarType: 'solar', birthDate: '1975-4-8', solarDate: '1975-04-08',
      timeHour: 3, isLeapMonth: false, group: 'self', note: '',
      data: { daySect: 2, yearBoundary: 'lichun', timeMode: 'shichen', clockTime: '', placeProvince: '', placeCity: '', longitude: null, timezone: 8, applyTrueSolar: false, applyDst: false },
    }));
  });
  await page.goto('/#/bazi');
  await expect(page.locator('.bazi-landing__resume-open')).toContainText('辛某');

  await page.locator('.bazi-landing__start').click();
  await castBazi(page, { name: '壬某', year: 1999, month: 1, day: 23 });

  await page.goto('/#/archive');
  const records = autoSection(page).getByRole('button', { name: /^打开.+的八字命盘$/ });
  await expect(records).toHaveCount(2);
  const opened = await records.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
  expect(opened).toEqual(['打开壬某的八字命盘', '打开辛某的八字命盘']);
});

test('开着两个标签页：一页排盘，另一页的档案列表跟着更新，两页排的都留着', async ({ page, context }) => {
  await page.goto('/#/archive');
  await expect(page.getByRole('heading', { name: '档案里还没有命盘' })).toBeVisible();

  const other = await context.newPage();
  await skipWelcomeCover(other);
  await other.goto('/#/bazi');
  await other.locator('.bazi-landing__start').click();
  await castBazi(other, { name: '癸某', year: 1982, month: 6, day: 6 });

  // 第一页没有刷新，列表里已经出现另一页排的那个人。
  await expect(autoSection(page).getByRole('button', { name: '打开癸某的八字命盘' })).toBeVisible();

  // 第一页接着排一个人：不会把另一页记的那条盖掉。
  await openBaziForm(page);
  await castBazi(page, { name: '子某', year: 1971, month: 10, day: 18 });
  await other.goto('/#/archive');
  await expect(other.getByRole('heading', { name: '共 2 条命盘' })).toBeVisible();
  const records = autoSection(other).getByRole('button', { name: /^打开.+的八字命盘$/ });
  await expect(records).toHaveCount(2);
});
