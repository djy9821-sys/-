/**
 * 是否在安卓安装包里运行：scripts/android/native-shell.js 启动时在 <html> 上标 data-native-shell。
 * 安装包里「下载」走的是系统分享面板（保存到文件、相册或发给别人），提示语要跟着改。
 */
export const isNativeShell = () => typeof document !== 'undefined' && Boolean(document.documentElement?.dataset?.nativeShell);
