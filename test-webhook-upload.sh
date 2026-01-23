#!/bin/bash

# 센텀밥집 webhook upload API 테스트 스크립트

# 테스트할 이미지 URL (예시)
IMAGE_URL="https://mud-kage.kakaocdn.net/dn/cQp0f0/btsKNNVXaMI/example.jpg"

# API 엔드포인트
API_URL="http://localhost:9101/api/webhook/upload-from-url"

echo "=== 센텀밥집 Webhook Upload API 테스트 ==="
echo ""
echo "요청 데이터:"
echo "  - Image URL: $IMAGE_URL"
echo "  - Restaurant ID: 6 (삼촌밥차)"
echo "  - Type: 개별요일"
echo "  - Day: 월"
echo ""

# API 호출
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"image_url\": \"$IMAGE_URL\",
    \"restaurant_id\": 6,
    \"type\": \"개별요일\",
    \"day_id\": \"월\"
  }" \
  | jq .

echo ""
echo "=== 테스트 완료 ==="
