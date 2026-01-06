# 센텀 밥집 뷰어 페이지

식단표 데이터를 표시하는 뷰어 페이지입니다.

## 프로젝트 구조

```
viewer/
├── src/
│   ├── components/
│   │   ├── Icons.jsx      # 아이콘 컴포넌트
│   │   └── MenuList.jsx   # 메뉴 리스트 컴포넌트
│   ├── App.jsx            # 메인 앱 컴포넌트
│   ├── main.jsx           # 진입점
│   └── index.css          # 스타일
├── public/
│   └── data/
│       └── menu-data.json  # 식단표 데이터 (빌드 시 포함)
└── dist/                  # 빌드 산출물 (GitHub Pages 배포용)
```

## 개발

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 폴더에 생성됩니다.

## GitHub Pages 배포

### 1. 저장소 설정

1. GitHub 저장소의 Settings > Pages로 이동
2. Source를 "Deploy from a branch"로 선택
3. Branch를 "main" (또는 "gh-pages")로 선택
4. Folder를 "/ (root)" 또는 "/docs"로 선택

### 2. base 경로 설정

`vite.config.js`의 `base` 값을 저장소 이름에 맞게 수정:

```js
base: '/repository-name/',  // 저장소 이름에 맞게 수정
```

### 3. 배포 방법

#### 방법 1: 수동 배포
```bash
npm run build
# dist/ 폴더의 내용을 GitHub Pages 브랜치에 푸시
```

#### 방법 2: GitHub Actions (자동 배포)
`.github/workflows/deploy.yml` 파일을 생성하여 자동 배포 설정

## 데이터 동기화 워크플로우

### 1. 관리자 페이지에서 데이터 저장
- 관리자 페이지(`frontend/`)에서 식단표 데이터 입력
- "데이터 게시" 버튼 클릭
- 백엔드 서버가 `data/menu-data.json` 파일 생성

### 2. JSON 파일 복사
생성된 JSON 파일을 뷰어 프로젝트로 복사:

```bash
# Windows
copy data\menu-data.json viewer\public\data\menu-data.json

# Linux/Mac
cp data/menu-data.json viewer/public/data/menu-data.json
```

### 3. 빌드 및 배포
```bash
cd viewer
npm run build
# dist/ 폴더를 GitHub Pages에 배포
```

## 데이터 형식

뷰어 페이지는 다음 형식의 JSON 데이터를 기대합니다:

```json
{
  "식당명": {
    "name": "식당명",
    "type": "text",
    "price": {
      "lunch": "7,000원",
      "dinner": "7,000원"
    },
    "data": {
      "date": "1월 5일 ~ 1월 9일",
      "menus": {
        "월": {
          "점심": ["메뉴1", "메뉴2", ...],
          "저녁": ["메뉴1", "메뉴2", ...]
        },
        ...
      }
    },
    "imageUrls": []
  }
}
```

## 주의사항

- `public/data/menu-data.json` 파일은 빌드 시 `dist/data/`로 복사됩니다.
- GitHub Pages 배포 시 base 경로가 올바르게 설정되어 있는지 확인하세요.
- JSON 파일 경로는 `/data/menu-data.json`로 접근됩니다 (base 경로 포함).

