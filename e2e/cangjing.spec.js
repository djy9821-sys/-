import { expect, test } from '@playwright/test';
import { skipWelcomeCover } from './helpers.js';

test('从封面进藏经阁：书架、目录、展卷，返回键一层层退出来', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/');
  await page.locator('.welcome-cover').getByRole('button', { name: /^藏经阁/ }).click();
  await expect(page).toHaveURL(/#\/cangjing$/);
  await expect(page).toHaveTitle(/藏经阁/);

  // 书架：不用等全文，目录先到。支线还在录入，书只会多不会少。
  const shelf = page.locator('[data-panel="shelf"]');
  for (const key of ['ditian', 'ziping', 'qiongtong', 'ziwei', 'zengshan']) {
    await expect(shelf.locator(`button.cjg-book[data-book="${key}"]`)).toBeVisible();
  }
  await expect(shelf.locator('.cjg-lede').first()).toContainText(/\d+ 部古籍、\d+ 篇、[\d,]+ 条/);

  // 请出《滴天髓》：题名、底本、目录
  await shelf.locator('button.cjg-book[data-book="ditian"]').click();
  await expect(page).toHaveURL(/#\/cangjing\?b=ditian$/);
  const book = page.locator('[data-panel="book"]');
  await expect(book.locator('.cjg-book-title')).toHaveText('滴天髓');
  await expect(book.locator('.cjg-edition')).toContainText('底本');

  // 展卷：原文与白话对照
  await book.locator('.cjg-toc button', { hasText: '天道' }).first().click();
  await expect(page).toHaveURL(/#\/cangjing\?b=ditian&c=0$/);
  const read = page.locator('[data-panel="read"]');
  await expect(read.locator('.cjg-juan h3')).toHaveText('天道');
  await expect(read.locator('.cjg-yuan').first()).toContainText('欲识三元万法宗');
  await expect(read.locator('.cjg-bai').first()).toBeVisible();
  await read.getByRole('button', { name: '只看原文' }).click();
  await expect(read.locator('.cjg-bai').first()).toBeHidden();
  await read.getByRole('button', { name: '对照' }).click();

  // 竖排：点一条，下面出白话
  await read.getByRole('button', { name: '竖排' }).click();
  await expect(read.locator('[data-ref="gloss-title"]')).toHaveText('白话 · 天道·其一');
  await read.getByRole('button', { name: '横排' }).click();

  // 钤印收藏，只存在本机
  await read.getByRole('button', { name: '钤印收藏' }).first().click();
  await expect(read.locator('.cjg-stamp')).toHaveCount(1);

  // 下一篇不新记历史；返回键：展卷 → 目录 → 书架 → 首页
  await read.locator('[data-ref="next"]').click();
  await expect(read.locator('.cjg-juan h3')).toHaveText('地道');
  await expect(page).toHaveURL(/#\/cangjing\?b=ditian&c=1$/);
  await page.goBack();
  await expect(book.locator('.cjg-book-title')).toBeVisible();
  await expect(page).toHaveURL(/#\/cangjing\?b=ditian$/);
  await page.goBack();
  await expect(shelf).toBeVisible();
  await expect(shelf).toContainText('钤过印的');
  await page.goBack();
  await expect(page.getByRole('button', { name: '进入紫微斗数专业排盘' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('带目的地的链接翻到那一条；能搜书名、篇名和原文里的字句', async ({ page }) => {
  await skipWelcomeCover(page);
  // 分享出去的链接：直接翻到《穷通宝鉴》论甲木的那一条，那一条亮一下
  await page.goto('/#/cangjing?e=qiongtong.jia.002');
  const read = page.locator('[data-panel="read"]');
  await expect(read.locator('.cjg-tiao.is-flash')).toBeVisible();
  await expect(read.locator('.cjg-juan h3')).toContainText('甲木');
  await expect(page).toHaveURL(/#\/cangjing\?b=qiongtong&c=\d+$/);

  // 直接打开的页面，「目录」「书架」是原地换页
  await read.locator('[data-up="book"]').click();
  const book = page.locator('[data-panel="book"]');
  await expect(book.locator('.cjg-book-title')).toHaveText('穷通宝鉴');
  await book.locator('[data-up="shelf"]').click();
  const shelf = page.locator('[data-panel="shelf"]');
  await expect(shelf).toBeVisible();
  await expect(page).toHaveURL(/#\/cangjing$/);

  // 篇名立刻能搜到；原文里的字句要先把书取来
  const search = shelf.getByRole('searchbox', { name: '搜索藏经阁' });
  await search.fill('用神章');
  await expect(shelf.locator('.cjg-hit', { hasText: '《增删卜易》· 用神章' })).toBeVisible();
  await search.fill('欲识三元万法宗');
  await shelf.getByRole('button', { name: /在全部原文和白话里找/ }).click();
  await shelf.locator('.cjg-hit', { hasText: '欲识三元万法宗' }).first().click();
  await expect(read.locator('.cjg-tiao.is-flash .cjg-yuan')).toContainText('欲识三元万法宗');

  // 打不开的地址回到书架
  await page.goto('about:blank');
  await page.goto('/#/cangjing?b=nope&c=9');
  await expect(shelf).toBeVisible();

  await page.getByRole('button', { name: '返回首页' }).click();
  await expect(page.getByRole('button', { name: '进入紫微斗数专业排盘' })).toBeVisible();
});

test('首页有藏经阁的入口，手机「更多」里也有', async ({ page, isMobile }) => {
  await skipWelcomeCover(page);
  await page.goto('/');
  if (isMobile) {
    await page.getByRole('button', { name: '更多' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /藏经阁/ }).click();
  } else {
    await page.getByRole('button', { name: /翻开原典/ }).click();
  }
  await expect(page).toHaveURL(/#\/cangjing$/);
  await expect(page.locator('[data-panel="shelf"] button.cjg-book').first()).toBeVisible();
});

test('书架：题签上的书名一字一行、居中、不被切；手机上点过待入藏的书不歪', async ({ page, isMobile }) => {
  await skipWelcomeCover(page);
  await page.goto('/#/cangjing');
  const slips = page.locator('.cjg-slip');
  await expect(slips.first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  // 每张题签：不用竖排的 writing-mode（iOS 上会把字挪出题签），字一行一个，整列在题签正中，四边都在题签里面。
  const measured = await slips.evaluateAll((nodes) => nodes.map((slip) => {
    const box = slip.getBoundingClientRect();
    const text = slip.querySelector('.cjg-slip-text');
    const range = document.createRange();
    range.selectNodeContents(text);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    return {
      title: text.textContent,
      writingMode: getComputedStyle(slip).writingMode,
      lines: new Set(rects.map((r) => Math.round(r.top))).size,
      inside: left >= box.left && right <= box.right && Math.min(...rects.map((r) => r.top)) >= box.top && Math.max(...rects.map((r) => r.bottom)) <= box.bottom,
      offCenter: Math.abs((left + right) / 2 - (box.left + box.right) / 2),
    };
  }));
  expect(measured.length).toBeGreaterThan(5);
  for (const slip of measured) {
    expect(slip.writingMode, slip.title).toBe('horizontal-tb');
    expect(slip.lines, slip.title).toBe([...slip.title].length);
    expect(slip.inside, slip.title).toBe(true);
    expect(slip.offCenter, slip.title).toBeLessThanOrEqual(1);
  }

  // 待入藏的书不能点：划过、点过都不侧过来。有鼠标时，能请出来的书悬停才侧一点。
  const waiting = page.locator('.cjg-book.is-waiting').first();
  await waiting.scrollIntoViewIfNeeded();
  if (isMobile) await waiting.tap(); else await waiting.hover();
  await expect(waiting.locator('.cjg-cover')).toHaveCSS('transform', 'none');
  if (!isMobile) {
    const book = page.locator('button.cjg-book').first();
    await book.hover();
    await expect(book.locator('.cjg-cover')).not.toHaveCSS('transform', 'none');
  }

  // 书页上的大书名同样一字一行。
  await page.locator('button.cjg-book[data-book="ditian"]').click();
  const title = page.locator('.cjg-book-title');
  await expect(title).toHaveText('滴天髓');
  const titleLines = await title.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return { writingMode: getComputedStyle(node).writingMode, lines: new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size };
  });
  expect(titleLines).toEqual({ writingMode: 'horizontal-tb', lines: 3 });
});
