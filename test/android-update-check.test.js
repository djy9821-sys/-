import test from 'node:test';
import assert from 'node:assert/strict';

import { CHECK_INTERVAL_MS, channelOf, isDue, latestOf, shouldOffer } from '../scripts/android/update-check.js';

// 与 .github/workflows/android.yml 发布时写的说明同一格式。
const release = (code, versionName = 'v2026.10.28-3348fc7-preview') => ({
  body: `**预览版**\n\n- 版本：${versionName}（versionCode ${code}）\n- 下载：https://example.test/gushupai.apk`,
  assets: [{ name: 'gushupai.apk', browser_download_url: 'https://github.com/djy9821-sys/-/releases/download/android-preview/gushupai.apk' }],
});

test('安卓更新检查：预览版看 android-preview，正式版看 android', () => {
  assert.equal(channelOf('v2026.10.28-3348fc7-preview'), 'android-preview');
  assert.equal(channelOf('v2026.10.28-3348fc7'), 'android');
  assert.equal(channelOf(undefined), 'android');
});

test('安卓更新检查：从 Release 说明读出 versionCode、版本名和下载地址', () => {
  assert.deepEqual(latestOf(release(12)), {
    code: 12,
    version: 'v2026.10.28-3348fc7-preview',
    url: 'https://github.com/djy9821-sys/-/releases/download/android-preview/gushupai.apk',
  });
  assert.equal(latestOf({ body: '- 版本：v1（versionCode 3）', assets: [] }), null);
  assert.equal(latestOf({ body: '没有版本号', assets: release(1).assets }), null);
  assert.equal(latestOf(null), null);
});

test('安卓更新检查：只在更新、且没点过「以后再说」时提示', () => {
  const latest = latestOf(release(12));
  assert.equal(shouldOffer({ installed: '11', latest, dismissed: null }), true);
  assert.equal(shouldOffer({ installed: '12', latest, dismissed: null }), false);
  assert.equal(shouldOffer({ installed: '13', latest, dismissed: null }), false);
  assert.equal(shouldOffer({ installed: '11', latest, dismissed: '12' }), false);
  assert.equal(shouldOffer({ installed: '11', latest: latestOf(release(13)), dismissed: '12' }), true);
  assert.equal(shouldOffer({ installed: '', latest, dismissed: null }), false);
  assert.equal(shouldOffer({ installed: '11', latest: null, dismissed: null }), false);
});

test('安卓更新检查：两次检查至少隔 6 小时', () => {
  const now = 1_800_000_000_000;
  assert.equal(isDue(null, now), true);
  assert.equal(isDue('garbage', now), true);
  assert.equal(isDue(String(now - CHECK_INTERVAL_MS + 1000), now), false);
  assert.equal(isDue(String(now - CHECK_INTERVAL_MS), now), true);
  // 手机时间被往回调过：记录在未来，也重新检查。
  assert.equal(isDue(String(now + 60_000), now), true);
});
