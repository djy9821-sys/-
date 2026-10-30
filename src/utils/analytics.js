/**
 * 使用统计与错误上报。
 *
 * 只把事件名和少量不含个人资料的参数交给页面里已有的 Google Analytics（index.html 的 gtag）：
 * 排了什么类型的盘、起了卦、存了档、导出给 AI、页面出错……用来判断哪些功能有人用、真机上有没有崩。
 * 姓名、生辰、卦问、档案内容一律不上报；没有 gtag（本地开发、被拦截）时静默。
 */

/** GA4 对事件参数值的长度限制。 */
const PARAM_MAX_LENGTH = 100;

const clip = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, PARAM_MAX_LENGTH);

/** 当前页面（hash 路由）名，如 home、liuyao、ziwei/chart；不带查询参数。 */
export const currentRoute = () => {
  try {
    const hash = globalThis.location?.hash ?? '';
    return clip(hash.replace(/^#\/?/, '').split('?')[0] || 'home');
  } catch {
    return '';
  }
};

const appBuild = () => {
  try {
    // Vite 构建时替换成版本号；Node 测试里 import.meta.env 不存在，走 catch。
    return clip(import.meta.env.VITE_APP_BUILD || 'dev');
  } catch {
    return 'dev';
  }
};

/**
 * 发一个事件。参数只允许字符串、数字、布尔值，会被截短；其余类型丢弃。
 * @returns {boolean} 是否真的发出去了（没有 gtag 时为 false）
 */
export const track = (name, params = {}) => {
  try {
    const gtag = globalThis.gtag;
    if (typeof gtag !== 'function' || typeof name !== 'string' || !name) return false;
    const payload = { app_route: currentRoute(), app_build: appBuild() };
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'number' || typeof value === 'boolean') payload[key] = value;
      else if (typeof value === 'string') payload[key] = clip(value);
    });
    gtag('event', clip(name).slice(0, 40), payload);
    return true;
  } catch {
    return false;
  }
};

/** 错误只取类型与第一行信息，不带堆栈，更不带用户资料。 */
export const describeError = (error) => {
  if (error instanceof Error) return clip(`${error.name}: ${error.message}`);
  if (typeof error === 'string') return clip(error);
  if (error && typeof error === 'object' && typeof error.message === 'string') return clip(error.message);
  return clip(error === undefined ? 'unknown' : String(error));
};

/**
 * 上报一次错误。
 * @param error Error、字符串或其他值
 * @param {{ source?: string }} [options] source：window / promise / boundary / chunk 等
 */
export const reportError = (error, { source = 'window', ...extra } = {}) => (
  track('app_error', { ...extra, error_source: source, error_message: describeError(error) })
);

let installed = false;

/** 接管全局未捕获错误与未处理的 Promise 拒绝；重复调用无效。 */
export const installErrorReporting = (target = globalThis) => {
  if (installed || typeof target?.addEventListener !== 'function') return false;
  installed = true;
  target.addEventListener('error', (event) => {
    // 图片、脚本加载失败也会触发 error 事件，但没有 error / message；按需加载的脚本失败另有 vite:preloadError。
    if (!event?.error && !event?.message) return;
    reportError(event.error ?? event.message, { source: 'window' });
  });
  target.addEventListener('unhandledrejection', (event) => {
    reportError(event?.reason, { source: 'promise' });
  });
  return true;
};

/** 仅供测试：重置「已安装」标记。 */
export const resetErrorReportingForTests = () => {
  installed = false;
};
