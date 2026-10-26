// 古书派离线缓存（v2）
// - 打开页面：先走网络，保证拿到最新版本；网络超过 4 秒没响应或断网时，用上次缓存的页面。
// - /assets/ 下的文件名带内容哈希，缓存后直接使用，回访几乎不用再下载。
// - 统计、第三方等其他请求不经过缓存。
// 旧版 Workbox 缓存与清理脚本留下的缓存会在启用时一并删除。
const VERSION = 'gushupai-v2';
const SHELL_URL = '/';
const PRECACHE = [SHELL_URL, '/manifest.json', '/pwa-192x192.png', '/pwa-512x512.png'];
const NETWORK_TIMEOUT_MS = 4000;
const MAX_ASSETS = 80;

globalThis.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await globalThis.caches.open(VERSION);
    await cache.addAll(PRECACHE).catch(() => undefined);
    await globalThis.skipWaiting();
  })());
});

globalThis.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await globalThis.caches.keys();
    await Promise.all(names.filter((name) => name !== VERSION).map((name) => globalThis.caches.delete(name)));
    await globalThis.clients.claim();
  })());
});

const trimAssets = async (cache) => {
  const keys = (await cache.keys()).filter((request) => new URL(request.url).pathname.startsWith('/assets/'));
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((request) => cache.delete(request)));
};

const handleNavigation = async (event) => {
  const cache = await globalThis.caches.open(VERSION);
  const network = fetch(event.request).then((response) => {
    if (response.ok && response.type === 'basic') cache.put(SHELL_URL, response.clone());
    return response;
  });
  event.waitUntil(network.catch(() => undefined));

  const timeout = new Promise((resolve) => { setTimeout(resolve, NETWORK_TIMEOUT_MS, null); });
  try {
    const first = await Promise.race([network, timeout]);
    if (first) return first;
  } catch {
    // 断网：用缓存
  }
  const cached = await cache.match(SHELL_URL);
  return cached || network;
};

const handleAsset = async (request) => {
  const cache = await globalThis.caches.open(VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    trimAssets(cache);
  }
  return response;
};

globalThis.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== globalThis.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(handleAsset(request));
  }
});
