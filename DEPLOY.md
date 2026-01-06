# GitHub Pages 배포 가이드

## 자동 배포 설정

### 1. GitHub 저장소 생성 및 초기 설정

1. GitHub에서 새 저장소 생성 (예: `centumbob_v2`)
2. 로컬 프로젝트를 GitHub에 푸시:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/사용자명/저장소이름.git
   git push -u origin main
   ```

### 2. GitHub Pages 설정

1. GitHub 저장소의 **Settings** > **Pages**로 이동
2. **Source**를 "GitHub Actions"로 선택
3. 저장소 이름 확인 (자동으로 base 경로에 사용됨)

### 3. base 경로 자동 설정

**자동 설정됨**: GitHub Actions가 레포지토리 이름을 자동으로 감지하여 base 경로를 설정합니다.

수동 빌드 시에만 `viewer/vite.config.js`에서 레포지토리 이름을 확인하세요.

### 4. 자동 배포 트리거

다음 경우에 자동으로 배포됩니다:

- `viewer/` 디렉토리의 파일이 변경될 때
- `data/menu-data.json` 파일이 업데이트될 때
- GitHub Actions에서 수동으로 실행할 때

### 5. 배포 확인

1. GitHub 저장소의 **Actions** 탭에서 배포 상태 확인
2. 배포 완료 후 `https://사용자명.github.io/저장소이름/` 접속

## 배포 방식 설명

### 자동 배포 (권장)

GitHub Actions가 자동으로 다음을 수행합니다:

1. **소스 코드 체크아웃**: 전체 프로젝트를 가져옴
2. **의존성 설치**: `viewer/` 디렉토리에서 `npm ci` 실행
3. **데이터 복사**: `data/menu-data.json`을 `viewer/public/data/`로 복사
4. **빌드**: `npm run build`로 `viewer/dist/` 생성
5. **배포**: `viewer/dist/` 폴더만 GitHub Pages에 업로드

**결론**: dist 폴더만 배포되지만, GitHub Actions가 자동으로 빌드하고 배포합니다.

### 수동 배포 (선택사항)

자동 배포가 작동하지 않는 경우에만 사용:

```bash
# 1. 데이터 파일 복사
cp data/menu-data.json viewer/public/data/menu-data.json

# 2. 빌드
cd viewer
npm run build

# 3. dist 폴더 내용을 GitHub Pages에 배포
# (GitHub Actions를 사용하지 않는 경우)
```

## 주의사항

- `viewer/dist/` 폴더는 GitHub Actions에서 자동 생성되므로 `.gitignore`에 포함되어 있습니다
- **레포지토리 이름은 자동으로 감지되므로 수동 수정이 필요 없습니다**
- GitHub Pages는 무료 플랜에서도 사용 가능합니다
