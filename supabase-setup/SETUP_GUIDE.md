# Supabase 설정 가이드 (센텀밥 인증 시스템)

## ⚠️ 중요: 테이블 명명 규칙

모든 센텀밥 관련 테이블은 **`centumbob_`** 접두어를 사용해야 합니다.

**현재 상태:**
- ✅ `centumbob_users` (새로 생성 예정)
- ❌ `complaints` → 추후 `centumbob_complaints`로 마이그레이션 권장
- ❌ `page_views` → 추후 `centumbob_page_views`로 마이그레이션 권장

## 단계별 설정

### 1단계: Supabase 대시보드에서 테이블 생성

**중요:** MCP 도구가 read-only 모드이므로 대시보드에서 직접 실행해야 합니다.

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택: `vaqfjjkwpzrolebvbnbl`
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. 아래 SQL을 복사하여 실행:

```sql
-- Create centumbob_users table for authentication
CREATE TABLE IF NOT EXISTS public.centumbob_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  email TEXT UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
  CONSTRAINT nickname_length CHECK (char_length(nickname) >= 2 AND char_length(nickname) <= 30)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_centumbob_users_username ON public.centumbob_users(username);
CREATE INDEX IF NOT EXISTS idx_centumbob_users_email ON public.centumbob_users(email) WHERE email IS NOT NULL;

-- Enable RLS
ALTER TABLE public.centumbob_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.centumbob_users;
CREATE POLICY "Users can view own profile"
  ON public.centumbob_users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.centumbob_users;
CREATE POLICY "Users can update own profile"
  ON public.centumbob_users FOR UPDATE
  USING (auth.uid() = id);

-- Allow service role to insert during signup (Edge Function uses service role)
DROP POLICY IF EXISTS "Service role can insert users" ON public.centumbob_users;
CREATE POLICY "Service role can insert users"
  ON public.centumbob_users FOR INSERT
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.centumbob_users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.centumbob_users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Verify creation
SELECT 'centumbob_users 테이블이 성공적으로 생성되었습니다!' AS status;
```

5. **Run** 버튼 클릭
6. "centumbob_users 테이블이 성공적으로 생성되었습니다!" 메시지 확인

### 2단계: Edge Function 배포

#### 방법 A: Supabase CLI (권장)

```bash
# 1. Supabase CLI 설치
npm install -g supabase

# 2. 로그인
supabase login

# 3. 프로젝트 링크
supabase link --project-ref vaqfjjkwpzrolebvbnbl

# 4. Edge Function 폴더 구조 생성 및 파일 복사
mkdir -p supabase/functions/centumbob-auth
copy supabase-setup\edge-function\index.ts supabase\functions\centumbob-auth\index.ts
copy supabase-setup\edge-function\deno.json supabase\functions\centumbob-auth\deno.json

# 5. 배포
supabase functions deploy centumbob-auth

# 6. 배포 확인
curl "https://vaqfjjkwpzrolebvbnbl.supabase.co/functions/v1/centumbob-auth/check-username?username=testuser"
# 예상 응답: {"available":true}
```

#### 방법 B: Supabase Dashboard

1. Dashboard에서 **Edge Functions** 클릭
2. **Create a new function** 클릭
3. Function name: `centumbob-auth`
4. `supabase-setup/edge-function/index.ts` 파일 내용 복사하여 붙여넣기
5. **Deploy function** 클릭

### 3단계: 배포 검증

터미널에서 테스트:

```bash
# Username 중복 체크 테스트
curl "https://vaqfjjkwpzrolebvbnbl.supabase.co/functions/v1/centumbob-auth/check-username?username=testuser"

# 예상 응답
{"available":true}
```

## 로컬 테스트

```bash
cd viewer
npm run dev
```

브라우저에서 http://localhost:9103 접속 후:
1. "로그인" 버튼 클릭
2. "회원가입" 탭 선택
3. 테스트 계정 생성
4. 자동 로그인 확인

## Edge Function API 엔드포인트

배포 후 사용 가능한 엔드포인트:

```
BASE_URL: https://vaqfjjkwpzrolebvbnbl.supabase.co/functions/v1/centumbob-auth

POST   /signup              - 회원가입
POST   /login               - 로그인
POST   /logout              - 로그아웃
GET    /profile             - 프로필 조회
PUT    /profile             - 프로필 수정
GET    /check-username      - Username 중복 체크
GET    /check-email         - Email 중복 체크
POST   /verify-email        - 이메일 인증 (추후 구현)
```

## 문제 해결

### 테이블 생성 오류

**증상:** "permission denied" 또는 "relation already exists"

**해결:**
1. SQL Editor에서 테이블 존재 확인:
   ```sql
   SELECT * FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'centumbob_users';
   ```
2. 이미 존재하면 DROP 후 재생성 또는 ALTER로 수정

### Edge Function 배포 실패

**증상:** CLI에서 배포 오류

**해결:**
1. Supabase CLI 버전 확인: `supabase --version`
2. 최신 버전으로 업데이트: `npm install -g supabase@latest`
3. 다시 로그인: `supabase login`
4. 프로젝트 재링크: `supabase link --project-ref vaqfjjkwpzrolebvbnbl`

### CORS 오류

**증상:** 브라우저에서 "CORS policy" 오류

**해결:**
1. Edge Function에 CORS 헤더가 포함되어 있는지 확인
2. Supabase Dashboard > Edge Functions > Logs 확인
3. Edge Function 재배포

## 다음 단계

배포 완료 후:
1. `AUTHENTICATION_SETUP.md`의 테스트 시나리오 수행
2. 프로덕션 URL을 Supabase Auth 설정에 추가
3. GitHub Pages 배포

## 추가 정보

- Supabase 프로젝트 URL: https://supabase.com/dashboard/project/vaqfjjkwpzrolebvbnbl
- Edge Function URL: https://vaqfjjkwpzrolebvbnbl.supabase.co/functions/v1/centumbob-auth
- 환경 변수는 자동으로 주입됨 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY)
