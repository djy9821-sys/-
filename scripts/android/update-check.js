/**
 * 安卓安装包的「有新版本」检查（只在安装包里用，见 native-shell.js）。
 *
 * 读 GitHub Release 的公开信息（.github/workflows/android.yml 发布时写进说明里的 versionCode），
 * 比手机上装的版本新就提示下载。不上传任何资料；连不上 GitHub（如没开代理）就安静地跳过。
 */
export const RELEASE_API = 'https://api.github.com/repos/djy9821-sys/-/releases/tags/';
export const APK_ASSET = 'gushupai.apk';
/** 两次检查至少隔 6 小时，避免频繁请求。 */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** 预览版的 versionName 以 -preview 结尾（见 android.yml），据此决定看哪个 Release。 */
export const channelOf = (versionName) => (/-preview$/.test(String(versionName ?? '')) ? 'android-preview' : 'android');

/** 从 Release 信息里取出最新安装包：{ code, version, url }；信息不全时返回 null。 */
export const latestOf = (release) => {
  const body = String(release?.body ?? '');
  const code = Number(/versionCode (\d+)/.exec(body)?.[1]);
  const asset = (Array.isArray(release?.assets) ? release.assets : []).find((item) => item?.name === APK_ASSET);
  if (!Number.isInteger(code) || code <= 0 || !asset?.browser_download_url) return null;
  return { code, version: /版本：(v[\w.-]+)/.exec(body)?.[1] ?? '', url: asset.browser_download_url };
};

/** 比装着的新、且用户没对这一版点过「以后再说」，才提示。 */
export const shouldOffer = ({ installed, latest, dismissed }) => Boolean(
  latest && Number(installed) > 0 && latest.code > Number(installed) && latest.code !== Number(dismissed),
);

/** 距上次检查是否已过间隔；记录缺失或读不出来时视为该查了。 */
export const isDue = (lastCheckedAt, now = Date.now()) => {
  const last = Number(lastCheckedAt);
  return !Number.isFinite(last) || last <= 0 || now - last >= CHECK_INTERVAL_MS || now < last;
};
