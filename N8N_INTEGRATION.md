# n8n Integration Guide

센텀밥집 시스템에 n8n을 연동하여 메뉴 데이터를 자동으로 업로드하는 방법을 설명합니다.

## 개요

n8n 워크플로우를 통해 특정 시간에 자동으로:
1. 외부 소스(예: 카카오톡 프로필)에서 최신 메뉴 이미지를 가져옴
2. 센텀밥집 백엔드로 이미지 URL 전송
3. 백엔드가 자동으로 이미지 다운로드 → OCR + GPT-4o Vision 분석 → 데이터베이스 저장

## API 엔드포인트

### POST /api/webhook/upload-from-url

**기능**: URL에서 이미지를 다운로드하고, OCR + GPT 분석 후 데이터베이스에 저장

**요청 예시**:
```json
{
  "image_url": "https://mud-kage.kakaocdn.net/dn/example/image.jpg",
  "restaurant_id": 6,
  "type": "개별요일",
  "day_id": "월"
}
```

**파라미터**:
- `image_url` (string, required): 메뉴 이미지 URL
- `restaurant_id` (number, required): 레스토랑 ID
- `type` (string, required): "전체요일" 또는 "개별요일"
- `day_id` (string, optional): "월", "화", "수", "목", "금" (개별요일일 때 필수)

**응답 예시**:
```json
{
  "success": true,
  "message": "메뉴가 성공적으로 업로드되었습니다.",
  "data": {
    "restaurant_id": 6,
    "restaurant_name": "삼촌밥차",
    "date_range": "1.20-1.24",
    "type": "개별요일",
    "day_id": "월",
    "extracted_data": {
      "price": {
        "lunch": "7,500원",
        "dinner": ""
      },
      "menus": {
        "월": {
          "lunch": ["돼지불고기", "김치찌개", "계란말이"],
          "dinner": []
        }
      }
    },
    "saved_image": "삼촌밥차_1.20-1.24_1737599123456.jpg"
  }
}
```

## n8n 워크플로우 구성

> **주의**: n8n JSON import는 복잡하므로, 아래 가이드를 따라 **UI에서 직접 노드를 추가**하는 것을 권장합니다.

### 워크플로우 수정 단계

기존 삼촌밥차 워크플로우의 `If(오늘 첫 조회이면)` 노드 뒤에 두 개의 노드를 추가합니다:

1. **요일 계산** (Code 노드)
2. **센텀밥집 업로드** (HTTP Request 노드)

### 필수 노드

#### 1. Schedule Trigger (스케줄 트리거)
```javascript
// 크론 표현식: 월~금 10:00-11:00 사이 매 1분마다 실행
"0 0/1 10-11 * * 1-5"
```

#### 2. HTTP Request - 외부 소스에서 데이터 가져오기
```javascript
{
  "url": "https://pf.kakao.com/rocket-web/web/profiles/_FxbaQC/posts",
  "method": "GET"
}
```

#### 3. Code (JavaScript) - 오늘 날짜 게시물 확인
```javascript
const inputData = $input.first().json;
const today = DateTime.now().setZone('Asia/Seoul').toFormat('yyyy-MM-dd');

// 오늘 날짜 게시물 찾기
for (let i = 0; i < Math.min(inputData.items.length, 5); i++) {
  const item = inputData.items[i];
  const itemDate = DateTime.fromMillis(item.published_at)
    .setZone('Asia/Seoul')
    .toFormat('yyyy-MM-dd');

  if (itemDate === today) {
    const imageUrls = item.media ? item.media.map(m => m.url) : [];
    return {
      json: {
        todayDate: today,
        image1: imageUrls[0] || null,
        image2: imageUrls[1] || null,
        isToday: true
      }
    };
  }
}

return {
  json: {
    todayDate: today,
    isToday: false,
    message: "오늘 날짜의 식단표가 없습니다."
  }
};
```

#### 4. Code (JavaScript) - 요일 계산
```javascript
const inputData = $input.first().json;
const today = DateTime.now().setZone('Asia/Seoul');
const dayOfWeek = today.weekday; // 1=월, 2=화, ..., 5=금

const dayMapping = {
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금'
};

return {
  json: {
    ...inputData,
    korean_day: dayMapping[dayOfWeek] || '월',
    day_number: dayOfWeek
  }
};
```

#### 5. HTTP Request - 센텀밥집에 업로드
```javascript
{
  "url": "http://localhost:9101/api/webhook/upload-from-url",
  "method": "POST",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": {
    "image_url": "={{ $json.image1 }}",
    "restaurant_id": 6,
    "type": "개별요일",
    "day_id": "={{ $json.korean_day }}"
  },
  "options": {
    "timeout": 60000
  }
}
```

### 노드 추가 방법

#### 1. 요일 계산 노드 추가

1. `If(오늘 첫 조회이면)` 노드의 **True** 출력을 클릭
2. `+` 버튼 클릭 → `Code` 노드 선택
3. **Node Name**: `요일 계산`
4. 아래 코드를 복사해서 붙여넣기:

```javascript
const inputData = $input.first().json;
const today = DateTime.now().setZone('Asia/Seoul');
const dayMapping = {1: '월', 2: '화', 3: '수', 4: '목', 5: '금'};
return {json: {...inputData, korean_day: dayMapping[today.weekday] || '월'}};
```

#### 2. 센텀밥집 업로드 노드 추가

1. `요일 계산` 노드의 출력을 클릭
2. `+` 버튼 클릭 → `HTTP Request` 노드 선택
3. **Node Name**: `센텀밥집 업로드`
4. 다음과 같이 설정:

**기본 설정**:
- Method: `POST`
- URL: `http://localhost:9101/api/webhook/upload-from-url`

**Body 섹션**:
- Body Content Type: `JSON`
- Specify Body: `Using JSON`
- JSON 내용:
```
={{ {"image_url": $json.image1 || $json.image2, "restaurant_id": 6, "type": "개별요일", "day_id": $json.korean_day} }}
```

**Options 섹션**:
- Timeout: `60000`

#### 3. 기존 노드 재연결

`센텀밥집 업로드` 노드의 출력을 다음 노드들에 연결:
- `Set Message Text1`
- `Update row(s)1`

### 워크플로우 흐름도

```
[Schedule Trigger: 월~금 10-11시 매분]
          ↓
[HTTP Request: 카카오톡 프로필 데이터 가져오기]
          ↓
[Code: 오늘 날짜 게시물 확인]
          ↓
[Data Table: 이전 조회 날짜 확인]
          ↓
[Merge: 데이터 병합]
          ↓
[IF: 오늘 첫 조회인가?]
          ↓ (True)
          ↓
[Code: 요일 계산] ← 새로 추가
          ↓
[HTTP Request: 센텀밥집 업로드] ← 새로 추가
          ↓
    ┌─────┴─────┐
    ↓           ↓
[Update:    [Telegram:
 DB상태]     알림전송]
```

## 레스토랑 ID 확인

데이터베이스에서 레스토랑 ID 확인:

```bash
cd backend
node -e "import('./database.js').then(db => {
  const restaurants = db.getAllRestaurants();
  console.log(JSON.stringify(restaurants, null, 2));
})"
```

**주요 레스토랑 ID**:
- 1: STX f&c (부산영상산업센터)
- 2: 다와푸드 (에이스하이테크21)
- 3: 만나 (벽산E센텀)
- 4: 파티박스 (동서대)
- 5: 다와푸드 (큐비E센텀)
- **6: 삼촌밥차 (스카이비즈)** ← n8n 연동 예시
- 7: 슈마우스 (스카이비즈)

## 테스트

### curl로 테스트:
```bash
curl -X POST "http://localhost:9101/api/webhook/upload-from-url" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://mud-kage.kakaocdn.net/dn/example/image.jpg",
    "restaurant_id": 6,
    "type": "개별요일",
    "day_id": "월"
  }'
```

### 스크립트 사용:
```bash
chmod +x test-webhook-upload.sh
./test-webhook-upload.sh
```

## 주의사항

1. **타임아웃**: 이미지 다운로드 및 GPT 분석에 시간이 걸릴 수 있으므로 n8n의 HTTP Request timeout을 60초 이상으로 설정
2. **요일 검증**: `day_id`는 반드시 "월", "화", "수", "목", "금" 중 하나여야 함
3. **이미지 크기**: 최대 10MB까지 지원
4. **OpenAI API 키**: 백엔드 `.env` 파일에 `OPENAI_API_KEY` 설정 필수
5. **활성 날짜 범위**: 관리자 패널에서 활성화된 날짜 범위가 있어야 함

## 트러블슈팅

### 에러: "활성화된 날짜 범위가 없습니다"
→ 관리자 패널(http://localhost:9102)에서 Management 탭 → Date Ranges에서 새 주차 추가 및 활성화

### 에러: "식당을 찾을 수 없습니다"
→ `restaurant_id`가 올바른지 확인 (위 "레스토랑 ID 확인" 참조)

### 에러: "이미지 다운로드 시간 초과"
→ n8n HTTP Request 노드의 timeout 설정을 60000ms 이상으로 증가

### 에러: "GPT 응답을 파싱할 수 없습니다"
→ 백엔드 로그 확인 (`console.error`에 GPT 응답 출력됨), 이미지 품질이 너무 낮을 수 있음

## 참고 파일

- `backend/server.js:2465` - `/api/webhook/upload-from-url` 엔드포인트 구현
- `test-webhook-upload.sh` - API 테스트 스크립트
- `N8N_INTEGRATION.md` - 이 문서 (전체 가이드)
