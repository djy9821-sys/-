// e2e 共用小工具：跳过封面、拦截剪贴板与分享面板、读出页面复制的文字。
import { expect } from '@playwright/test';

export const WELCOME_COVER_SESSION_KEY = 'gushupai-welcome-cover-dismissed';

/** 首页封面每次打开网站都会放；大多数测试直接跳过它（当作这个标签页里已经点进去过）。 */
export const skipWelcomeCover = (page) => page.addInitScript((key) => {
  try {
    window.sessionStorage.setItem(key, '1');
  } catch {
    // 无痕模式或空白页下忽略
  }
}, WELCOME_COVER_SESSION_KEY);

/**
 * 把 navigator.clipboard.writeText 换成记录器、去掉 navigator.share，
 * 页面里「复制 / 分享」的文字都落到 window.__copied。
 */
export const captureClipboard = (page) => page.addInitScript(() => {
  window.__copied = [];
  const writeText = (text) => {
    window.__copied.push(String(text));
    return Promise.resolve();
  };
  try {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  } catch {
    // 某些环境不允许改写
  }
  try {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  } catch {
    // 同上
  }
});

export const lastCopiedText = async (page) => {
  await expect.poll(() => page.evaluate(() => window.__copied?.length ?? 0)).toBeGreaterThan(0);
  return page.evaluate(() => window.__copied[window.__copied.length - 1]);
};

/** 带参数链接里的 hash 部分（#/bazi?… 或 #/ziwei?…）。 */
export const hashOf = (url) => url.slice(url.indexOf('#'));
