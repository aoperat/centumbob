#!/bin/bash

# Docker 실행 스크립트

echo "=== 센텀밥집 Docker 실행 ==="
echo ""

# 환경 변수 파일 확인
if [ ! -f .env ]; then
    echo "⚠️  .env 파일이 없습니다."
    echo "프로젝트 루트에 .env 파일을 생성하고 필요한 환경 변수를 설정하세요."
    echo ""
    echo "예시:"
    echo "OPENAI_API_KEY=your_key"
    echo "SUPABASE_URL=https://your-project.supabase.co"
    echo "SUPABASE_SERVICE_ROLE_KEY=your_key"
    echo "SUPABASE_ANON_KEY=your_key"
    echo ""
    exit 1
fi

# 실행 모드 선택
MODE=${1:-dev}

if [ "$MODE" = "prod" ]; then
    echo "프로덕션 모드로 실행합니다..."
    docker-compose up -d --build
elif [ "$MODE" = "dev" ]; then
    echo "개발 모드로 실행합니다..."
    docker-compose -f docker-compose.dev.yml up -d --build
else
    echo "사용법: ./docker-run.sh [dev|prod]"
    echo "  dev  - 개발 모드 (기본값, Hot Reload 지원)"
    echo "  prod - 프로덕션 모드"
    exit 1
fi

echo ""
echo "✅ 서비스가 시작되었습니다!"
echo ""
echo "접속 주소:"
echo "  - 백엔드 API: http://localhost:9101"
echo "  - 프론트엔드: http://localhost:9102"
echo "  - 뷰어: http://localhost:9103"
echo ""
echo "로그 확인: docker-compose logs -f"
echo "서비스 중지: docker-compose down"

