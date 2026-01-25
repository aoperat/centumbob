/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px', // 추가 브레이크포인트: 모바일 랜드스케이프 및 작은 태블릿
      },
    },
  },
  plugins: [],
}

