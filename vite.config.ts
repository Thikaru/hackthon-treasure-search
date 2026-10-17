import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages のサブパスでも動くよう相対パスで出力（ルーティングはハッシュ方式）
export default defineConfig({
  base: './',
  plugins: [react()],
})
