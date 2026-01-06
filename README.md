# 센텀 밥집 - 데이터 관리자

식단표 이미지를 GPT-4o Vision API로 분석하여 메뉴 데이터를 추출하는 관리자 도구입니다.

## 프로젝트 구조

```
centumbob_v2/
├── frontend/          # 관리자 페이지 (Vite + React)
│   ├── src/
│   │   ├── components/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── backend/           # Express 서버 (GPT API 프록시)
│   ├── server.js
│   └── package.json
├── viewer/            # 뷰어 페이지 (GitHub Pages 배포용)
│   ├── src/
│   ├── public/data/
│   └── package.json
├── data/              # 백엔드에서 생성하는 JSON 파일
│   └── menu-data.json
├── .env              # 환경 변수 (GPT API 키)
└── README.md
```

## 설치 및 실행

### 1. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
```

### 2. 의존성 설치

```bash
# 프론트엔드
cd frontend
npm install

# 백엔드
cd ../backend
npm install
```

### 3. 서버 실행

**터미널 1 - 백엔드 서버:**
```bash
cd backend
npm start
```

**터미널 2 - 프론트엔드 개발 서버:**
```bash
cd frontend
npm run dev
```

### 4. 접속

브라우저에서 `http://localhost:3000`으로 접속하세요.

## 주요 기능

### 관리자 페이지
- **이미지 업로드**: 식단표 이미지를 업로드 (파일 선택 또는 클립보드 붙여넣기)
- **GPT 이미지 분석**: GPT-4o Vision API를 사용하여 이미지에서 메뉴 정보 추출
- **메뉴 편집**: 추출된 메뉴를 수정하고 편집
- **식당/날짜 관리**: 식당 목록과 날짜 범위 관리
- **JSON 저장**: 데이터를 JSON 파일로 저장하여 뷰어 페이지에서 사용

### 뷰어 페이지
- **식단표 비교**: 요일별 식당 간 식단 비교
- **반응형 디자인**: 모바일 및 데스크톱 지원
- **원본 이미지 보기**: 식단표 원본 이미지 모달 표시

## 기술 스택

- **관리자 페이지**: React, Vite, Tailwind CSS
- **뷰어 페이지**: React, Vite, Tailwind CSS
- **Backend**: Express, OpenAI API, Multer
- **AI**: GPT-4o Vision

## 데이터 동기화 워크플로우

1. **관리자 페이지에서 데이터 입력 및 저장**
   - 식단표 이미지 업로드 및 GPT 분석
   - 메뉴 데이터 편집
   - "데이터 게시" 버튼 클릭 → 백엔드에서 `data/menu-data.json` 생성

2. **JSON 파일 복사**
   ```bash
   # Windows
   copy data\menu-data.json viewer\public\data\menu-data.json
   
   # Linux/Mac
   cp data/menu-data.json viewer/public/data/menu-data.json
   ```

3. **뷰어 페이지 빌드 및 배포**
   ```bash
   cd viewer
   npm run build
   # dist/ 폴더를 GitHub Pages에 배포
   ```

자세한 내용은 [viewer/README.md](viewer/README.md)를 참고하세요.

