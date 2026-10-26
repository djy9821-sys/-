import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 版本号：构建日期 + Vercel 提供的提交号，显示在首页页脚与「关于」页。
const commit = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7)
const buildDate = new Date().toISOString().slice(0, 10).replaceAll('-', '.')
const appBuild = `v${buildDate}${commit ? `-${commit}` : ''}`

// 第三方库单独成块：只改业务代码时，回访用户不必重新下载这些库。
const VENDOR_CHUNKS = [
  ['vendor-react', /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/],
  ['vendor-iztro', /[\\/]node_modules[\\/](iztro|lunar-lite|lunar-typescript|dayjs|i18next)[\\/]/],
  ['vendor-lunar', /[\\/]node_modules[\\/]lunar-javascript[\\/]/],
]

// https://vite.dev/config/
// 构建产物使用 Vite 默认的内容哈希文件名：内容不变的文件在部署后仍可命中浏览器缓存，
// index.html 本身不缓存（见 vercel.json），因此用户总能拿到最新版本。
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    'import.meta.env.VITE_APP_BUILD': JSON.stringify(appBuild),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          return VENDOR_CHUNKS.find(([, pattern]) => pattern.test(id))?.[0]
        },
      },
    },
  },
})
