import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// در حالت توسعه، درخواست‌های /api و /uploads به بک‌اند هدایت می‌شوند
// تا کوکی احراز هویت روی یک origin باقی بماند.
const target = 'http://localhost:4000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target, changeOrigin: false },
      '/uploads': { target, changeOrigin: false },
    },
  },
})
