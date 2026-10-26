import test from 'node:test';
import assert from 'node:assert/strict';

import { describeError, installErrorReporting, reportError, resetErrorReportingForTests, track } from '../src/utils/analytics.js';

const withGtag = (fn) => {
  const calls = [];
  globalThis.gtag = (...args) => calls.push(args);
  try {
    fn(calls);
  } finally {
    delete globalThis.gtag;
  }
};

test('没有 gtag 时静默', () => {
  delete globalThis.gtag;
  assert.equal(track('tool_view', { tool: 'home' }), false);
  assert.equal(reportError(new Error('x')), false);
});

test('事件只带允许的参数类型，字符串截短到 100 字', () => {
  withGtag((calls) => {
    const long = 'a'.repeat(200);
    assert.equal(track('ziwei_chart', { time_mode: 'exact', count: 2, ok: true, nested: { a: 1 }, list: [1], text: long }), true);
    assert.equal(calls.length, 1);
    const [command, name, payload] = calls[0];
    assert.equal(command, 'event');
    assert.equal(name, 'ziwei_chart');
    assert.equal(payload.time_mode, 'exact');
    assert.equal(payload.count, 2);
    assert.equal(payload.ok, true);
    assert.equal(payload.nested, undefined);
    assert.equal(payload.list, undefined);
    assert.equal(payload.text.length, 100);
    assert.equal(typeof payload.app_build, 'string');
    assert.equal(typeof payload.app_route, 'string');
  });
});

test('错误只取类型与一句信息', () => {
  assert.equal(describeError(new TypeError('boom')), 'TypeError: boom');
  assert.equal(describeError('plain text'), 'plain text');
  assert.equal(describeError({ message: 'obj' }), 'obj');
  assert.equal(describeError(undefined), 'unknown');
  assert.equal(describeError(42), '42');
  withGtag((calls) => {
    reportError(new RangeError('bad'), { source: 'boundary' });
    const [, name, payload] = calls[0];
    assert.equal(name, 'app_error');
    assert.equal(payload.error_source, 'boundary');
    assert.equal(payload.error_message, 'RangeError: bad');
    assert.equal(payload.stack, undefined);
  });
});

test('全局错误监听只装一次，资源加载错误不上报', () => {
  resetErrorReportingForTests();
  const listeners = {};
  const target = { addEventListener: (type, handler) => { listeners[type] = handler; } };
  assert.equal(installErrorReporting(target), true);
  assert.equal(installErrorReporting(target), false);
  withGtag((calls) => {
    listeners.error({ error: new Error('script'), message: 'script' });
    listeners.error({ target: {} }); // 图片加载失败之类
    listeners.unhandledrejection({ reason: 'promise failed' });
    assert.deepEqual(calls.map(([, name, payload]) => [name, payload.error_source, payload.error_message]), [
      ['app_error', 'window', 'Error: script'],
      ['app_error', 'promise', 'promise failed'],
    ]);
  });
  resetErrorReportingForTests();
});
