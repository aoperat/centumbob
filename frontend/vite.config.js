import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 9102,
    host: '0.0.0.0', // 도커 컨테이너에서 접근 가능하도록
    allowedHosts: [
      'front.centum',
      'back.centum',
      'viewer.centum',
      'localhost',
      '.local',
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9101',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

