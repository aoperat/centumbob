# Docker 실행 가이드

백엔드, 프론트엔드, 뷰어를 Docker로 실행하는 방법입니다.

## 사전 준비

1. Docker와 Docker Compose가 설치되어 있어야 합니다.
2. 프로젝트 루트에 `.env` 파일을 생성하고 필요한 환경 변수를 설정하세요:

```env
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
PORT=9101
```

## 실행 방법

### 방법 1: 스크립트 사용 (권장)

#### Linux/Mac

```bash
# 실행 권한 부여 (최초 1회만)
chmod +x docker-run.sh

# 개발 모드 실행 (기본)
./docker-run.sh

# 또는 프로덕션 모드
./docker-run.sh prod
```

#### Windows

```cmd
# 개발 모드 실행 (기본)
docker-run.bat

# 또는 프로덕션 모드
docker-run.bat prod
```

### 방법 2: 직접 명령어 사용

#### 1. 프로덕션 모드 실행

```bash
# 모든 서비스 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그만 확인
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f viewer
```

#### 2. 개발 모드 실행 (Hot Reload 지원)

```bash
# 개발 모드로 실행
docker-compose -f docker-compose.dev.yml up -d

# 로그 확인
docker-compose -f docker-compose.dev.yml logs -f
```

### 3. 개별 서비스만 실행

```bash
# 백엔드만 실행
docker-compose up -d backend

# 프론트엔드만 실행
docker-compose up -d frontend

# 뷰어만 실행
docker-compose up -d viewer
```

## 접속 주소

- **백엔드 API**: http://localhost:9101
- **프론트엔드**: http://localhost:9102
- **뷰어**: http://localhost:9103

## 주요 명령어

### 서비스 중지

```bash
# 모든 서비스 중지
docker-compose down

# 개발 모드 중지
docker-compose -f docker-compose.dev.yml down
```

### 서비스 재시작

```bash
# 모든 서비스 재시작
docker-compose restart

# 특정 서비스만 재시작
docker-compose restart backend
```

### 이미지 재빌드

```bash
# 모든 서비스 재빌드
docker-compose build --no-cache

# 특정 서비스만 재빌드
docker-compose build --no-cache backend

# 재빌드 후 실행
docker-compose up -d --build
```

### 볼륨 및 네트워크 확인

```bash
# 볼륨 목록 확인
docker volume ls

# 네트워크 확인
docker network ls

# 컨테이너 상태 확인
docker-compose ps
```

## 데이터 영구 저장

다음 디렉토리는 호스트와 볼륨 마운트되어 데이터가 영구 저장됩니다:

- `./backend/db` - SQLite 데이터베이스 파일
- `./backend/uploads` - 업로드된 이미지 파일
- `./data` - 메뉴 데이터 JSON 파일
- `./_posts` - 생성된 블로그 포스트

## 문제 해결

### 포트가 이미 사용 중인 경우

```bash
# 포트 사용 중인 프로세스 확인 (Linux/Mac)
lsof -i :9101
lsof -i :9102
lsof -i :9103

# 포트 사용 중인 프로세스 확인 (Windows)
netstat -ano | findstr :9101
netstat -ano | findstr :9102
netstat -ano | findstr :9103
```

### 컨테이너 로그 확인

```bash
# 모든 컨테이너 로그
docker-compose logs

# 특정 컨테이너 로그
docker-compose logs backend

# 실시간 로그
docker-compose logs -f backend
```

### 컨테이너 내부 접속

```bash
# 백엔드 컨테이너 접속
docker exec -it centumbob_backend sh

# 프론트엔드 컨테이너 접속
docker exec -it centumbob_frontend sh

# 뷰어 컨테이너 접속
docker exec -it centumbob_viewer sh
```

### 완전히 초기화하고 다시 시작

```bash
# 컨테이너 중지 및 삭제
docker-compose down

# 볼륨까지 삭제 (데이터 삭제됨)
docker-compose down -v

# 이미지 삭제
docker-compose down --rmi all

# 다시 빌드 및 실행
docker-compose build --no-cache
docker-compose up -d
```

## 개발 팁

### Hot Reload 활성화

개발 모드(`docker-compose.dev.yml`)를 사용하면 소스 코드 변경 시 자동으로 반영됩니다.

### 환경 변수 변경

`.env` 파일을 수정한 후 서비스를 재시작하세요:

```bash
docker-compose restart
```

### 빌드 캐시 비우기

의존성 설치 문제가 있을 때:

```bash
docker-compose build --no-cache
docker-compose up -d
```

