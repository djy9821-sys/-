import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// 构建产物使用 Vite 默认的内容哈希文件名：内容不变的文件在部署后仍可命中浏览器缓存，
// index.html 本身不缓存（见 vercel.json），因此用户总能拿到最新版本。
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
