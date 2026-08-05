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
      // IP 定位主接口（避免 localhost CORS）：/ip-api/json → https://ipapi.co/json
      '/ip-api': {
        target: 'https://ipapi.co',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/ip-api/, ''),
      },
      // IP 定位备接口：/ip-who/ → https://ipwho.is/
      '/ip-who': {
        target: 'https://ipwho.is',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/ip-who/, ''),
      },
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
