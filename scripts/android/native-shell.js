/**
 * 古书派安卓版的原生外壳脚本。
 *
 * 只打进安卓安装包（.github/workflows/android.yml 用 esbuild 打包成 dist/native-shell.js，
 * 再由 scripts/android/prepare.py 插进 index.html），网站不加载。
 * 安卓 WebView 和手机浏览器有几处不一样，这里补齐，网页代码不用改：
 * 1. 返回键：有上一页就后退；已经在首页时退到后台（和其他安卓应用一样）。
 * 2. 分享：WebView 没有 navigator.share。换成系统分享面板，图片、档案文件、文字都能发微信或存到手机。
 * 3. 下载：WebView 不理会 <a download>。改为把文件交给系统分享面板，由用户选「保存到手机」或发送。
 * 4. 更新：GitHub 上有更新的安装包时，底部提示一次「下载更新」（见 update-check.js）。
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { RELEASE_API, channelOf, isDue, latestOf, shouldOffer } from './update-check.js';

/** blob: 链接对应的文件。网页常在点下载后立刻释放链接，这里先记下文件本身。 */
const blobsByUrl = new Map();
const RELEASE_DELAY_MS = 60_000;

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result);
    resolve(text.slice(text.indexOf(',') + 1));
  };
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

const safeFileName = (name) => String(name || '文件').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 80) || '文件';

let writeCount = 0;

/** 写进应用缓存目录，返回 file:// 地址（系统分享面板只收文件地址）。 */
const writeToCache = async (blob, name) => {
  writeCount += 1;
  const { uri } = await Filesystem.writeFile({
    path: `share/${Date.now()}-${writeCount}/${safeFileName(name)}`,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  return uri;
};

const nativeShare = async (data = {}) => {
  const files = [];
  for (const file of data.files ?? []) files.push(await writeToCache(file, file.name));
  try {
    await Share.share({
      title: data.title || undefined,
      text: data.text || undefined,
      url: data.url || undefined,
      files: files.length ? files : undefined,
      dialogTitle: data.title || '分享',
    });
  } catch (error) {
    // 用户关掉分享面板：按网页标准抛 AbortError，页面就不会提示「分享失败」。
    if (/cancel/i.test(String(error?.message ?? error))) throw new DOMException('Share canceled', 'AbortError');
    throw error;
  }
};

const canShare = (data) => Boolean(data && (data.files?.length || data.text || data.url || data.title));

/** <a download href="blob:/data:"> 的文件交给分享面板。 */
const saveDownload = (anchor) => {
  const href = anchor.href || '';
  const name = anchor.getAttribute('download') || '文件';
  const known = blobsByUrl.get(href);
  const blob = known ? Promise.resolve(known) : fetch(href).then((response) => response.blob());
  blob
    .then((file) => nativeShare({ files: [new File([file], name, { type: file.type || 'application/octet-stream' })], title: name }))
    .catch((error) => {
      if (error?.name !== 'AbortError') console.warn('保存文件失败：', error);
    });
};

const isFileDownload = (anchor) => anchor.hasAttribute('download') && /^(blob|data):/.test(anchor.href || '');

const CHECKED_KEY = 'gushupai-apk-update-checked-at';
const DISMISSED_KEY = 'gushupai-apk-update-dismissed';

const readStore = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStore = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // 存不了就下次再提示，不影响使用。
  }
};

const showUpdateBanner = (latest) => {
  const bar = document.createElement('div');
  bar.setAttribute('role', 'status');
  bar.style.cssText = [
    'position:fixed', 'left:12px', 'right:12px', 'bottom:12px', 'z-index:2147483000',
    'display:flex', 'align-items:center', 'gap:10px', 'padding:12px 14px', 'border-radius:14px',
    'background:#0f2a26', 'color:#f3e6c8', 'border:1px solid rgba(220,180,113,.4)',
    'box-shadow:0 8px 24px rgba(0,0,0,.45)', 'font:14px/1.45 system-ui,sans-serif',
  ].join(';');
  const text = document.createElement('span');
  text.style.flex = '1';
  text.textContent = `古书派有新版本${latest.version ? ` ${latest.version}` : ''}。覆盖安装即可，命盘档案不会丢。`;
  const button = (label, primary) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    element.style.cssText = `flex:none;padding:8px 12px;border-radius:10px;font:inherit;border:1px solid rgba(220,180,113,.5);${primary ? 'background:#dcb471;color:#1b1406;font-weight:600' : 'background:transparent;color:#f3e6c8'}`;
    return element;
  };
  const later = button('以后再说', false);
  const update = button('下载更新', true);
  later.addEventListener('click', () => {
    writeStore(DISMISSED_KEY, latest.code);
    bar.remove();
  });
  // 外部地址交给系统浏览器打开，浏览器下载完点开即可覆盖安装。
  update.addEventListener('click', () => {
    bar.remove();
    window.location.href = latest.url;
  });
  bar.append(text, later, update);
  document.body.append(bar);
};

const checkForUpdate = async () => {
  if (!isDue(readStore(CHECKED_KEY))) return;
  writeStore(CHECKED_KEY, Date.now());
  const info = await App.getInfo();
  const response = await fetch(`${RELEASE_API}${channelOf(info.version)}`, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) return;
  const latest = latestOf(await response.json());
  if (!shouldOffer({ installed: info.build, latest, dismissed: readStore(DISMISSED_KEY) })) return;
  if (document.body) showUpdateBanner(latest);
  else document.addEventListener('DOMContentLoaded', () => showUpdateBanner(latest), { once: true });
};

const install = () => {
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.minimizeApp();
  });

  Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: nativeShare });
  Object.defineProperty(navigator, 'canShare', { configurable: true, writable: true, value: canShare });

  const createObjectURL = URL.createObjectURL.bind(URL);
  const revokeObjectURL = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (object) => {
    const url = createObjectURL(object);
    if (object instanceof Blob) blobsByUrl.set(url, object);
    return url;
  };
  URL.revokeObjectURL = (url) => {
    window.setTimeout(() => {
      blobsByUrl.delete(url);
      revokeObjectURL(url);
    }, RELEASE_DELAY_MS);
  };

  // 代码里 anchor.click() 触发的下载。
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function clickOrSave() {
    if (!isFileDownload(this)) return click.call(this);
    saveDownload(this);
    return undefined;
  };

  // 用户手指点到的下载链接。
  document.addEventListener('click', (event) => {
    const anchor = event.target instanceof Element ? event.target.closest('a[download]') : null;
    if (!anchor || !isFileDownload(anchor)) return;
    event.preventDefault();
    saveDownload(anchor);
  }, true);

  document.documentElement.dataset.nativeShell = 'android';

  // 连不上 GitHub（没开代理、断网）就静静跳过，几个小时后再打开时再查。
  window.setTimeout(() => {
    checkForUpdate().catch(() => undefined);
  }, 3000);
};

if (Capacitor.isNativePlatform()) install();
