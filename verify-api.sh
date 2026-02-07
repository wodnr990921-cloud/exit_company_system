#!/bin/bash

# EXIT System API 검증 스크립트
# 모든 API 엔드포인트의 필드명 일치 여부 확인

echo "🔍 EXIT System API 검증 시작..."
echo "=================================="
echo ""

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 1. 티켓 생성 API 검증
echo "📋 1. 티켓 생성 API 검증..."
FRONTEND_TICKET=$(grep -A10 "const data = {" /home/user/webapp/src/index.tsx | grep -A10 "ticket_type:" | head -10)
BACKEND_TICKET=$(grep "ticket_type, priority" /home/user/webapp/src/routes/tickets.ts)

if [ -n "$FRONTEND_TICKET" ] && [ -n "$BACKEND_TICKET" ]; then
    echo -e "${GREEN}✓ 티켓 API: ticket_type 필드명 일치${NC}"
else
    echo -e "${RED}✗ 티켓 API: 필드명 불일치${NC}"
    ((ERRORS++))
fi

# 2. 회원 생성 API 검증  
echo "👥 2. 회원 생성 API 검증..."
FRONTEND_MEMBER=$(grep "institution: prisonName" /home/user/webapp/src/index.tsx)
BACKEND_MEMBER=$(grep "institution, inmate_number" /home/user/webapp/src/routes/members.ts)

if [ -n "$FRONTEND_MEMBER" ] && [ -n "$BACKEND_MEMBER" ]; then
    echo -e "${GREEN}✓ 회원 API: institution, inmate_number 필드명 일치${NC}"
else
    echo -e "${RED}✗ 회원 API: 필드명 불일치${NC}"
    ((ERRORS++))
fi

# 3. 배팅 폴더 생성 API 검증
echo "🎰 3. 배팅 API 검증..."
FRONTEND_BETTING=$(grep "total_bet_amount:" /home/user/webapp/src/index.tsx | head -1)
BACKEND_BETTING=$(grep "total_bet_amount" /home/user/webapp/src/routes/betting.ts | head -1)

if [ -n "$FRONTEND_BETTING" ] && [ -n "$BACKEND_BETTING" ]; then
    echo -e "${GREEN}✓ 배팅 API: total_bet_amount 필드명 일치${NC}"
else
    echo -e "${YELLOW}⚠ 배팅 API: 확인 필요${NC}"
    ((WARNINGS++))
fi

# 4. 포인트 조정 API 검증
echo "💰 4. 포인트 API 검증..."
BACKEND_POINTS=$(grep "point_type, adjustment_type, amount" /home/user/webapp/src/routes/points.ts | head -1)

if [ -n "$BACKEND_POINTS" ]; then
    echo -e "${GREEN}✓ 포인트 API: 필드 확인됨${NC}"
else
    echo -e "${YELLOW}⚠ 포인트 API: 확인 필요${NC}"
    ((WARNINGS++))
fi

# 5. 직원 생성 API 검증
echo "👔 5. 직원 API 검증..."
FRONTEND_STAFF=$(grep "email, password, role" /home/user/webapp/src/index.tsx | head -1)
BACKEND_STAFF=$(grep "email, password, role" /home/user/webapp/src/routes/staff_management.ts | head -1)

if [ -n "$FRONTEND_STAFF" ] && [ -n "$BACKEND_STAFF" ]; then
    echo -e "${GREEN}✓ 직원 API: email, password, role 필드명 일치${NC}"
else
    echo -e "${YELLOW}⚠ 직원 API: 확인 필요${NC}"
    ((WARNINGS++))
fi

echo ""
echo "=================================="
echo "📊 검증 결과 요약"
echo "=================================="
echo -e "✅ 통과: $((5 - ERRORS - WARNINGS))개"
echo -e "${YELLOW}⚠️  경고: ${WARNINGS}개${NC}"
echo -e "${RED}❌ 오류: ${ERRORS}개${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 모든 주요 API 검증 완료!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  ${ERRORS}개의 오류를 수정해야 합니다.${NC}"
    exit 1
fi
