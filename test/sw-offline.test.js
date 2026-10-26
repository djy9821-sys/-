import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// 在模拟的 Service Worker 环境里运行 public/sw.js，验证离线缓存只把首页 HTML 存成首页。
const ORIGIN = 'https://www.gushupaiapp.online';

const fakeResponse = ({ body = '', status = 200, contentType = 'text/html; charset=utf-8' } = {}) => {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    type: 'basic',
    body,
    headers: new Headers({ 'content-type': contentType }),
  };
  response.clone = () => response;
  return response;
};

const loadWorker = async (network) => {
  const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  const listeners = {};
  const store = new Map();
  const keyOf = (key) => (typeof key === 'string' ? key : new URL(key.url).pathname);
  const cache = {
    put: (key, value) => { store.set(keyOf(key), value); return Promise.resolve(); },
    match: (key) => Promise.resolve(store.get(keyOf(key))),
    keys: () => Promise.resolve([...store.keys()].map((path) => ({ url: ORIGIN + path }))),
    delete: (key) => Promise.resolve(store.delete(keyOf(key))),
    addAll: () => Promise.resolve(),
  };
  const sandbox = {
    addEventListener: (type, handler) => { listeners[type] = handler; },
    caches: { open: () => Promise.resolve(cache), keys: () => Promise.resolve([]), delete: () => Promise.resolve(true) },
    fetch: (request) => network(new URL(request.url).pathname),
    location: { origin: ORIGIN },
    // 网络超时计时器不阻止测试进程结束
    setTimeout: (callback, ms, ...args) => {
      const timer = setTimeout(callback, ms, ...args);
      timer.unref?.();
      return timer;
    },
    URL,
    Promise,
    Set,
  };
  vm.runInNewContext(source, sandbox);

  const navigate = async (path) => {
    let responded = null;
    const pending = [];
    listeners.fetch({
      request: { method: 'GET', mode: 'navigate', url: ORIGIN + path },
      respondWith: (promise) => { responded = promise; },
      waitUntil: (promise) => { pending.push(promise); },
    });
    const response = responded ? await responded.catch(() => null) : null;
    await Promise.all(pending);
    return { intercepted: responded !== null, response };
  };

  return { navigate, shell: () => store.get('/') };
};

test('直接打开 /sitemap.xml 等非首页地址时不拦截，也不会存成首页', async () => {
  const worker = await loadWorker((path) => Promise.resolve(
    path === '/sitemap.xml'
      ? fakeResponse({ body: '<?xml version="1.0"?><urlset/>', contentType: 'application/xml' })
      : fakeResponse({ body: '<!doctype html>首页' }),
  ));

  const sitemap = await worker.navigate('/sitemap.xml');
  assert.equal(sitemap.intercepted, false);
  assert.equal(worker.shell(), undefined);

  await worker.navigate('/');
  assert.equal(worker.shell()?.body, '<!doctype html>首页');

  await worker.navigate('/robots.txt');
  assert.equal(worker.shell()?.body, '<!doctype html>首页');
});

test('首页返回的不是正常 HTML 时不覆盖缓存', async () => {
  let reply = fakeResponse({ body: '<!doctype html>v1' });
  const worker = await loadWorker(() => Promise.resolve(reply));

  await worker.navigate('/');
  assert.equal(worker.shell()?.body, '<!doctype html>v1');

  reply = fakeResponse({ body: 'Server error', status: 500 });
  await worker.navigate('/');
  assert.equal(worker.shell()?.body, '<!doctype html>v1');

  reply = fakeResponse({ body: '{}', contentType: 'application/json' });
  await worker.navigate('/');
  assert.equal(worker.shell()?.body, '<!doctype html>v1');
});

test('断网时打开首页用上次缓存的首页', async () => {
  let online = true;
  const worker = await loadWorker(() => (online
    ? Promise.resolve(fakeResponse({ body: '<!doctype html>上次的首页' }))
    : Promise.reject(new TypeError('Failed to fetch'))));

  await worker.navigate('/');
  online = false;
  const offline = await worker.navigate('/');
  assert.equal(offline.intercepted, true);
  assert.equal(offline.response?.body, '<!doctype html>上次的首页');

  const withQuery = await worker.navigate('/?from=share');
  assert.equal(withQuery.response?.body, '<!doctype html>上次的首页');
});
