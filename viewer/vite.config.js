import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 배포를 위한 base 경로
// 레포지토리 이름에 맞게 자동으로 설정됩니다 (GitHub Actions에서)
// 수동 빌드 시에는 아래 주석을 해제하고 레포지토리 이름을 입력하세요
// const REPO_NAME = 'your-repository-name'; // 레포지토리 이름으로 변경

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 개발 환경에서는 '/' 사용, 프로덕션에서는 base 경로 사용
  // GitHub Actions에서 자동으로 레포지토리 이름으로 설정됨
  base: process.env.NODE_ENV === 'production' 
    ? (process.env.VITE_BASE_PATH || '/centumbob_v2/') 
    : '/',
  build: {
    outDir: 'dist',
  },
})

