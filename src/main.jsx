import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { installErrorReporting, track } from './utils/analytics.js'
import { isNativeShell } from './utils/nativeShell.js'

// 页面出错时只上报错误类型与一句信息（见 utils/analytics.js），不带任何生辰资料。
installErrorReporting();

// 离线缓存：页面始终先走网络（见 public/sw.js），断网或网络很慢时用上次的缓存打开。
// 旧版 Workbox 缓存会在新脚本启用时自动清掉。
const registerServiceWorker = () => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    // 安卓安装包里网页文件就在手机上，不需要离线缓存（打包时也去掉了 sw.js，见 scripts/android/prepare.py）。
    if (isNativeShell()) return;
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('离线缓存未启用:', error);
    });
  });
};

registerServiceWorker();

// 八字、档案、紫微命盘等页面是用到时才下载的。网站刚更新（旧页面里记的文件已不存在）
// 或网络抖动时会下载失败：自动刷新一次拿最新版本。10 秒内已经刷新过还失败，
// 或记不住刷新时间时，不再刷新，交给下面的错误提示，避免反复刷新。
const CHUNK_RELOAD_KEY = 'gushupai-chunk-reload-at';
window.addEventListener('vite:preloadError', (event) => {
  try {
    const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY)) || 0;
    if (Date.now() - lastReload < 10_000) {
      track('chunk_load_failed', { retried: true });
      return;
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
  track('chunk_load_failed', { retried: false });
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
