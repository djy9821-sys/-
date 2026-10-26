import process from 'node:process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 版本号：构建日期 + Vercel 提供的提交号，显示在首页页脚与「关于」页。
const commit = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7)
const buildDate = new Date().toISOString().slice(0, 10).replaceAll('-', '.')
const appBuild = `v${buildDate}${commit ? `-${commit}` : ''}`

// React 单独成块：只改业务代码时，回访用户不必重新下载。
// 紫微、农历等库交给 Rollup 自动拆分，跟着按需加载的页面走，不进首页。
// CommonJS 辅助函数也放进 vendor-react，否则它可能落进某个按需加载的库块，
// 让首页被迫预加载整个库块。
const VENDOR_CHUNKS = [
  ['vendor-react', /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]|commonjsHelpers/],
]

// 手势八卦的识别模型（MediaPipe Hands）原本从 jsdelivr 加载，国内经常打不开。
// 构建时把 node_modules 里的模型文件复制到 /mediapipe/hands@版本/，与网站同域名提供；
// 运行时先用自己的文件，失败再退回 CDN（见 BaguaBackground/initExperience.js）。
const MEDIAPIPE_HANDS_DIR = fileURLToPath(new URL('./node_modules/@mediapipe/hands/', import.meta.url))
const MEDIAPIPE_ASSET = /\.(js|wasm|data|binarypb|tflite)$/

function selfHostMediaPipeHands() {
  const available = existsSync(`${MEDIAPIPE_HANDS_DIR}package.json`)
  const version = available ? JSON.parse(readFileSync(`${MEDIAPIPE_HANDS_DIR}package.json`, 'utf8')).version : ''
  const base = available ? `/mediapipe/hands@${version}/` : ''
  return {
    name: 'gushupai-self-host-mediapipe-hands',
    config: () => ({
      define: { 'import.meta.env.VITE_MEDIAPIPE_HANDS_BASE': JSON.stringify(base) },
    }),
    generateBundle() {
      if (!available) return
      for (const file of readdirSync(MEDIAPIPE_HANDS_DIR)) {
        if (!MEDIAPIPE_ASSET.test(file)) continue
        this.emitFile({ type: 'asset', fileName: `${base.slice(1)}${file}`, source: readFileSync(`${MEDIAPIPE_HANDS_DIR}${file}`) })
      }
    },
  }
}

// https://vite.dev/config/
// 构建产物使用 Vite 默认的内容哈希文件名：内容不变的文件在部署后仍可命中浏览器缓存，
// index.html 本身不缓存（见 vercel.json），因此用户总能拿到最新版本。
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    selfHostMediaPipeHands(),
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
