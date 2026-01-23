# n8n 연동 빠른 시작 가이드

## 5분 안에 설정하기

### 1단계: 백엔드 실행 확인 ✅

```bash
# 터미널에서 실행
cd backend && npm start

# 새 터미널에서 테스트
curl http://localhost:9101/api/restaurants?active_only=true
```

정상 응답이 나오면 OK!

---

### 2단계: n8n에서 노드 추가

#### 노드 1: 요일 계산 (Code)

1. `If(오늘 첫 조회이면)` 노드의 **True** 출력 클릭
2. `+` 버튼 → `Code` 선택
3. 이름: `요일 계산`
4. 코드 복사 붙여넣기:

```javascript
const inputData = $input.first().json;
const today = DateTime.now().setZone('Asia/Seoul');
const dayMapping = {1: '월', 2: '화', 3: '수', 4: '목', 5: '금'};
return {json: {...inputData, korean_day: dayMapping[today.weekday] || '월'}};
```

---

#### 노드 2: 센텀밥집 업로드 (HTTP Request)

1. `요일 계산` 노드 출력 클릭
2. `+` 버튼 → `HTTP Request` 선택
3. 이름: `센텀밥집 업로드`
4. 설정:

| 항목 | 값 |
|------|-----|
| Method | `POST` |
| URL | `http://localhost:9101/api/webhook/upload-from-url` |
| Body Type | `JSON` |
| Timeout | `60000` |

5. JSON Body (아래 전체를 복사):

```
={{ {"image_url": $json.image1 || $json.image2, "restaurant_id": 6, "type": "개별요일", "day_id": $json.korean_day} }}
```

---

#### 노드 3: 기존 노드 재연결

`센텀밥집 업로드` 출력을 다음에 연결:
- `Set Message Text1`
- `Update row(s)1`

---

### 3단계: 테스트

1. n8n에서 **"Execute Workflow"** 버튼 클릭
2. 각 노드 확인:
   - `요일 계산`: `korean_day` 값 확인 (예: "월")
   - `센텀밥집 업로드`: `success: true` 확인

---

### 4단계: 스케줄 확인

`삼촌밥차데이터스케줄러` 노드:
- 크론 표현식: `0 0/1 10-11 * * 1-5`
- 의미: 월~금 10:00-11:00 사이 매 1분마다 실행

---

## 문제 해결

### ❌ "활성화된 날짜 범위가 없습니다"
→ 관리자 패널(http://localhost:9102) → Management 탭 → Date Ranges 추가

### ❌ "Connection refused"
→ 백엔드 실행 확인: `cd backend && npm start`

### ❌ "Timeout"
→ HTTP Request 노드 Options → Timeout을 `60000`으로 증가

### ❌ "식당을 찾을 수 없습니다"
→ `restaurant_id: 6` 확인 (삼촌밥차)

---

## 다음 단계

✅ 완료! 이제 매일 자동으로 메뉴가 업데이트됩니다.

상세 정보는 `N8N_INTEGRATION.md` 참조.
