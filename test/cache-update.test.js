import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = async (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// 旧版 Workbox 预缓存了 index.html，导致自定义域名长时间显示旧版本。
// 现在的离线缓存只在断网或网络很慢时才用旧页面，正常情况下总是先取最新页面。
test('页面导航先走网络，只在生产环境注册离线缓存', async () => {
  const [viteConfig, mainEntry, worker] = await Promise.all([
    readProjectFile('vite.config.js'),
    readProjectFile('src/main.jsx'),
    readProjectFile('public/sw.js'),
  ]);

  assert.doesNotMatch(viteConfig, /VitePWA/);
  assert.match(mainEntry, /import\.meta\.env\.PROD/);
  assert.match(mainEntry, /serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(worker, /request\.mode === 'navigate'/);
  assert.match(worker, /const network = fetch\(event\.request\)/);
  assert.match(worker, /NETWORK_TIMEOUT_MS/);
  assert.doesNotMatch(worker, /precacheAndRoute|importScripts/);
});

test('启用新缓存时删除旧缓存，入口文件与脚本本身不被 CDN 缓存', async () => {
  const [worker, vercelJson] = await Promise.all([
    readProjectFile('public/sw.js'),
    readProjectFile('vercel.json'),
  ]);
  const vercelConfig = JSON.parse(vercelJson);
  const noStore = (source) => vercelConfig.headers
    .find((rule) => rule.source === source)
    ?.headers.find((header) => header.key === 'Cache-Control')?.value ?? '';

  assert.match(worker, /name !== VERSION/);
  assert.match(worker, /caches\.delete/);
  assert.match(noStore('/'), /no-store/);
  assert.match(noStore('/sw.js'), /no-store/);
});
