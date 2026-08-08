import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 注意：IP 定位已统一走后端同源 /api/location/ip，
      // 不再需要对 ipapi.co / ipwho.is 的特殊代理。
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-vue': ['vue', 'vue-router'],
          'vendor-primevue': ['primevue', '@primevue/themes'],
          'vendor-astro': ['astronomy-engine'],
        },
      },
    },
  },
})
