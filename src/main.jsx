import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 离线缓存：页面始终先走网络（见 public/sw.js），断网或网络很慢时用上次的缓存打开。
// 旧版 Workbox 缓存会在新脚本启用时自动清掉。
const registerServiceWorker = () => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('离线缓存未启用:', error);
    });
  });
};

registerServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
