# 뷰어 페이지 인증 시스템 설정 가이드

## 구현 완료 항목

✅ Phase 1: Supabase 데이터베이스 설정 파일 생성
✅ Phase 2: 프론트엔드 의존성 설치 및 환경 변수 설정
✅ Phase 3: Supabase 클라이언트 및 인증 API 유틸리티 생성
✅ Phase 4: UI 컴포넌트 생성 (AuthModal, UserMenu, ProfileModal)
✅ Phase 5: App.jsx 및 main.jsx에 인증 통합

## 다음 단계: Supabase 설정

### 1단계: 데이터베이스 테이블 생성

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. `supabase-setup/01_create_centumbob_users.sql` 파일 내용을 복사
5. SQL Editor에 붙여넣고 **Run** 클릭
6. "centumbob_users table created successfully!" 메시지 확인

### 2단계: Edge Function 배포

#### 방법 A: Supabase CLI (권장)

```bash
# 1. Supabase CLI 설치 (아직 설치하지 않았다면)
npm install -g supabase

# 2. Supabase 로그인
supabase login

# 3. 프로젝트 링크 (프로젝트 ref는 대시보드 URL에서 확인)
supabase link --project-ref vaqfjjkwpzrolebvbnbl

# 4. Edge Function 폴더 구조 생성
mkdir -p supabase/functions/centumbob-auth

# 5. 파일 복사
copy supabase-setup\edge-function\index.ts supabase\functions\centumbob-auth\index.ts
copy supabase-setup\edge-function\deno.json supabase\functions\centumbob-auth\deno.json

# 6. Edge Function 배포
supabase functions deploy centumbob-auth

# 7. 배포 확인
# Edge Function URL: https://vaqfjjkwpzrolebvbnbl.supabase.co/functions/v1/centumbob-auth
```

#### 방법 B: Supabase Dashboard

1. Supabase Dashboard에서 **Edge Functions** 메뉴 클릭
2. **Create a new function** 클릭
3. 함수 이름: `centumbob-auth`
4. `supabase-setup/edge-function/index.ts` 파일 내용을 복사하여 에디터에 붙여넣기
5. **Deploy function** 클릭

### 3단계: 배포 확인

터미널에서 다음 명령어로 Edge Function이 정상 작동하는지 확인:

```bash
# Username 중복 체크 테스트
curl "https://vaqfjjkwpzrolebvbnbl.supabase.co/functions/v1/centumbob-auth/check-username?username=testuser"

# 예상 응답: {"available":true}
```

## 로컬 개발 환경 실행

### 뷰어 실행

```bash
cd viewer
npm run dev
```

브라우저에서 http://localhost:9103 접속

## 테스트 시나리오

### 1. 회원가입 테스트

1. 뷰어 페이지 접속
2. 헤더의 "로그인" 버튼 클릭
3. "회원가입" 탭 선택
4. 테스트 정보 입력:
   - 아이디: `testuser123`
   - 닉네임: `테스트유저`
   - 비밀번호: `test1234`
   - 이메일: (선택사항)
5. "회원가입" 버튼 클릭
6. ✅ 자동 로그인 확인
7. ✅ 헤더에 닉네임과 사용자 메뉴 표시 확인

### 2. 로그아웃 및 재로그인 테스트

1. 헤더의 사용자 메뉴 클릭
2. "로그아웃" 선택
3. ✅ "로그인" 버튼으로 변경 확인
4. "로그인" 버튼 클릭
5. 로그인 정보 입력:
   - 아이디: `testuser123`
   - 비밀번호: `test1234`
6. ✅ 로그인 성공 확인

### 3. 프로필 수정 테스트

1. 사용자 메뉴에서 "프로필 설정" 선택
2. 닉네임 변경: `테스트유저2`
3. 이메일 추가: `test@example.com`
4. "저장" 버튼 클릭
5. ✅ 프로필 업데이트 성공 확인
6. ✅ 헤더에 새 닉네임 표시 확인

### 4. 세션 지속성 테스트

1. 로그인 상태에서 페이지 새로고침 (F5)
2. ✅ 로그인 상태 유지 확인
3. 브라우저 탭 닫고 다시 열기
4. ✅ 로그인 상태 유지 확인

### 5. Username 중복 체크 테스트

1. "회원가입" 탭에서 기존 아이디 입력: `testuser123`
2. ✅ "이미 사용 중인 아이디입니다" 메시지 확인
3. 새로운 아이디 입력: `testuser456`
4. ✅ "사용 가능한 아이디입니다" 메시지 확인

## 구현된 기능

### 인증 기능

- ✅ 회원가입 (아이디, 닉네임, 비밀번호 필수 / 이메일 선택)
- ✅ 로그인 (아이디 + 비밀번호)
- ✅ 로그아웃
- ✅ 세션 자동 복원 (localStorage)
- ✅ 토큰 자동 갱신
- ✅ Username 실시간 중복 체크 (debounce 300ms)

### 프로필 관리

- ✅ 닉네임 수정
- ✅ 이메일 추가/수정
- ✅ 이메일 중복 체크
- ⏳ 이메일 인증 (추후 구현 예정)
- ⏳ 비밀번호 변경 (추후 구현 예정)

### UI 컴포넌트

- ✅ AuthModal: 로그인/회원가입 탭 모달
- ✅ UserMenu: 사용자 메뉴 드롭다운
- ✅ ProfileModal: 프로필 설정 모달
- ✅ EmailVerificationModal: 이메일 인증 안내 (플레이스홀더)

### 보안

- ✅ Supabase RLS 정책으로 데이터 보호
- ✅ JWT 토큰 기반 인증
- ✅ 비밀번호 자동 해싱 (Supabase)
- ✅ 임시 이메일을 통한 이메일 선택 구현
- ✅ 중복 이메일 방지

## 파일 구조

```
viewer/
├── src/
│   ├── components/
│   │   ├── AuthModal.jsx              # 로그인/회원가입 모달
│   │   ├── UserMenu.jsx                # 사용자 메뉴
│   │   ├── ProfileModal.jsx            # 프로필 설정
│   │   └── EmailVerificationModal.jsx  # 이메일 인증 (플레이스홀더)
│   ├── contexts/
│   │   └── AuthContext.jsx             # 인증 상태 관리
│   ├── hooks/
│   │   └── useAuth.js                  # 인증 훅
│   ├── utils/
│   │   ├── supabaseClient.js           # Supabase 클라이언트
│   │   └── authApi.js                  # 인증 API 함수
│   ├── App.jsx                         # 메인 앱 (인증 UI 통합)
│   └── main.jsx                        # AuthProvider 래핑
├── .env                                # 환경 변수 (Supabase URL, Key)
└── package.json

supabase-setup/
├── 01_create_centumbob_users.sql       # 데이터베이스 마이그레이션
├── edge-function/
│   ├── index.ts                        # Edge Function 코드
│   └── deno.json                       # Deno 설정
└── README.md                           # Supabase 설정 가이드
```

## 환경 변수 확인

`viewer/.env` 파일이 올바르게 설정되었는지 확인:

```env
VITE_SUPABASE_URL=https://vaqfjjkwpzrolebvbnbl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 문제 해결

### Edge Function 호출 오류

**증상**: "Network error" 또는 CORS 오류

**해결방법**:
1. Edge Function이 제대로 배포되었는지 확인
2. Supabase Dashboard > Edge Functions > centumbob-auth > Logs 확인
3. 브라우저 콘솔에서 요청 URL 확인

### 로그인 실패

**증상**: "Invalid username or password" 메시지

**해결방법**:
1. Supabase Dashboard > SQL Editor에서 사용자 확인:
   ```sql
   SELECT * FROM public.centumbob_users WHERE username = 'testuser123';
   ```
2. Edge Function 로그 확인
3. 아이디/비밀번호 대소문자 확인

### 세션 복원 안 됨

**증상**: 새로고침 후 로그인 상태 해제

**해결방법**:
1. 브라우저 콘솔 확인 (에러 메시지)
2. localStorage에 Supabase 세션 확인 (개발자 도구 > Application > Local Storage)
3. Edge Function의 `/profile` 엔드포인트가 정상 작동하는지 확인

## 배포 (GitHub Pages)

프로덕션 배포 시 추가 설정 필요:

1. Supabase Auth > URL Configuration에 프로덕션 URL 추가:
   - `https://YOUR_GITHUB_USERNAME.github.io/centumbob_v2/**`

2. `.github/workflows/deploy-viewer.yml` 확인:
   - 환경 변수가 자동으로 주입됩니다 (이미 설정됨)

3. 배포 후 테스트:
   ```bash
   cd viewer
   npm run build
   # 로컬에서 프로덕션 빌드 테스트
   npm run preview
   ```

## 추후 구현 예정 기능

- [ ] 이메일 인증 기능 완성
- [ ] 비밀번호 재설정
- [ ] 소셜 로그인 (Google, Kakao)
- [ ] 프로필 사진 업로드
- [ ] 사용자별 즐겨찾기 식당
- [ ] 로그인 시 민원 제출 폼에 자동 정보 입력

## 지원

문제가 발생하면:
1. 브라우저 콘솔 로그 확인
2. Supabase Dashboard > Edge Functions > Logs 확인
3. `supabase-setup/README.md` 참고
4. GitHub Issues에 문의
