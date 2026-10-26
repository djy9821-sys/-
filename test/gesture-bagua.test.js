import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { fetchQuantumUtils } from '../src/utils/quantumRandom.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('起卦随机数不再请求外部接口，立即返回', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('不应该发起网络请求'); };
  try {
    const started = Date.now();
    const coins = await fetchQuantumUtils(3);
    assert.equal(coins.length, 3);
    assert.ok(coins.every((value) => typeof value === 'boolean'));
    assert.ok(Date.now() - started < 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('生爻后手势引擎不重建，离开页面时完整释放', async () => {
  const [component, init, scene, app] = await Promise.all([
    read('src/components/BaguaBackground/FullBaguaExperience.jsx'),
    read('src/components/BaguaBackground/initExperience.js'),
    read('src/components/BaguaBackground/scene.js'),
    read('src/App.jsx'),
  ]);

  // 引擎只初始化一次；握拳回调通过 ref 取最新值
  assert.match(component, /onFist: \(\) => onFistRef\.current\?\.\(\)/);
  assert.match(component, /return \(\) => cleanup\?\.\(\);\n {2}\}, \[\]\);/);

  // 所有监听挂在同一个 AbortController 上，卸载时移除；摄像头、声音、渲染循环一起停
  assert.match(init, /const listeners = new AbortController\(\);/);
  assert.match(init, /\{ passive: false, signal \}/);
  assert.match(init, /listeners\.abort\(\);[\s\S]*experience\.dispose\(\);/);
  assert.match(scene, /cancelAnimationFrame\(frameId\);/);
  assert.match(scene, /renderer\.dispose\(\);/);

  // 起卦页全屏，不再叠加网站顶栏
  assert.match(app, /usesOwnHeader = \[[^\]]*'bagua'[^\]]*\]/);
});
