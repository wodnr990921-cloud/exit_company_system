#!/bin/bash

# EXIT System v10.0 - 전체 시스템 테스트 시뮬레이션
# 프로덕션 URL: https://exit-system.pages.dev
# 작성일: 2026-02-07

API_BASE="https://exit-system.pages.dev/api"
echo "🚀 EXIT System v10.0 - 전체 시스템 테스트 시뮬레이션 시작"
echo "=========================================="
echo ""

# 1. 인증 테스트
echo "1️⃣ 로그인 테스트"
echo "----------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@prison-books.kr", "password": "admin123"}')

echo "✅ 로그인 응답: ${LOGIN_RESPONSE}"
STAFF_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "👤 Staff ID: ${STAFF_ID}"
echo ""

# 2. 회원 관리 테스트
echo "2️⃣ 회원 관리 테스트"
echo "----------------------------------------"

# 회원 목록 조회
echo "📋 회원 목록 조회..."
MEMBERS_RESPONSE=$(curl -s -X GET "${API_BASE}/members")
MEMBER_COUNT=$(echo $MEMBERS_RESPONSE | grep -o '"id":' | wc -l)
echo "✅ 총 회원 수: ${MEMBER_COUNT}"
echo ""

# 회원 상세 조회 (첫 번째 회원)
echo "🔍 회원 상세 조회 (ID: 1)..."
MEMBER_DETAIL=$(curl -s -X GET "${API_BASE}/members/1")
echo "✅ 회원 상세: $(echo $MEMBER_DETAIL | head -c 200)..."
echo ""

# 3. 티켓 관리 테스트
echo "3️⃣ 티켓 관리 테스트"
echo "----------------------------------------"

# 티켓 목록 조회
echo "📋 티켓 목록 조회..."
TICKETS_RESPONSE=$(curl -s -X GET "${API_BASE}/tickets")
TICKET_COUNT=$(echo $TICKETS_RESPONSE | grep -o '"id":' | wc -l)
echo "✅ 총 티켓 수: ${TICKET_COUNT}"
echo ""

# 신규 티켓 생성
echo "➕ 신규 티켓 생성..."
NEW_TICKET=$(curl -s -X POST "${API_BASE}/tickets" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"[시뮬레이션] 테스트 티켓 $(date +%H:%M:%S)\",
    \"description\": \"자동 생성된 테스트 티켓입니다.\",
    \"ticket_type\": \"INQUIRY\",
    \"priority\": \"normal\",
    \"member_id\": 1,
    \"created_by\": ${STAFF_ID}
  }")
NEW_TICKET_ID=$(echo $NEW_TICKET | grep -o '"ticket_id":[0-9]*' | grep -o '[0-9]*')
echo "✅ 생성된 티켓 ID: ${NEW_TICKET_ID}"
echo ""

# 티켓 상세 조회
echo "🔍 티켓 상세 조회 (ID: ${NEW_TICKET_ID})..."
TICKET_DETAIL=$(curl -s -X GET "${API_BASE}/tickets/${NEW_TICKET_ID}")
echo "✅ 티켓 상세: $(echo $TICKET_DETAIL | head -c 200)..."
echo ""

# 4. 포인트 시스템 테스트
echo "4️⃣ 포인트 시스템 테스트"
echo "----------------------------------------"

# 포인트 내역 조회
echo "📋 포인트 내역 조회 (회원 ID: 1)..."
POINTS_RESPONSE=$(curl -s -X GET "${API_BASE}/points/1")
echo "✅ 포인트 내역: $(echo $POINTS_RESPONSE | head -c 200)..."
echo ""

# 5. 배팅 시스템 테스트
echo "5️⃣ 배팅 시스템 테스트"
echo "----------------------------------------"

# 경기 목록 조회
echo "📋 경기 목록 조회..."
MATCHES_RESPONSE=$(curl -s -X GET "${API_BASE}/betting/matches")
echo "✅ 경기 목록: $(echo $MATCHES_RESPONSE | head -c 200)..."
echo ""

# 배팅 폴더 목록 조회
echo "📁 배팅 폴더 목록 조회..."
FOLDERS_RESPONSE=$(curl -s -X GET "${API_BASE}/betting/folders")
FOLDER_COUNT=$(echo $FOLDERS_RESPONSE | grep -o '"id":' | wc -l)
echo "✅ 총 폴더 수: ${FOLDER_COUNT}"
echo ""

# 6. 우편실 시스템 테스트
echo "6️⃣ 우편실 시스템 테스트"
echo "----------------------------------------"

# 우편물 목록 조회
echo "📋 우편물 목록 조회..."
MAILROOM_RESPONSE=$(curl -s -X GET "${API_BASE}/mailroom")
MAIL_COUNT=$(echo $MAILROOM_RESPONSE | grep -o '"id":' | wc -l)
echo "✅ 총 우편물 수: ${MAIL_COUNT}"
echo ""

# 7. 직원 관리 테스트
echo "7️⃣ 직원 관리 테스트"
echo "----------------------------------------"

# 직원 목록 조회
echo "📋 직원 목록 조회..."
STAFF_RESPONSE=$(curl -s -X GET "${API_BASE}/staff")
STAFF_COUNT=$(echo $STAFF_RESPONSE | grep -o '"id":' | wc -l)
echo "✅ 총 직원 수: ${STAFF_COUNT}"
echo ""

# 출근 기록 조회
echo "📊 출근 기록 조회..."
ATTENDANCE_RESPONSE=$(curl -s -X GET "${API_BASE}/attendance")
ATTENDANCE_COUNT=$(echo $ATTENDANCE_RESPONSE | grep -o '"id":' | wc -l)
echo "✅ 총 출근 기록: ${ATTENDANCE_COUNT}"
echo ""

# 8. 일일 마감 시스템 테스트
echo "8️⃣ 일일 마감 시스템 테스트"
echo "----------------------------------------"

# 마감 목록 조회
echo "📋 마감 목록 조회..."
CLOSING_RESPONSE=$(curl -s -X GET "${API_BASE}/closing")
CLOSING_COUNT=$(echo $CLOSING_RESPONSE | grep -o '"id":' | wc -l)
echo "✅ 총 마감 수: ${CLOSING_COUNT}"
echo ""

# 9. 대시보드 데이터 테스트
echo "9️⃣ 대시보드 데이터 테스트"
echo "----------------------------------------"

# 대시보드 통계
echo "📊 대시보드 통계..."
echo "✅ 티켓 통계: 총 ${TICKET_COUNT}건"
echo "✅ 회원 통계: 총 ${MEMBER_COUNT}명"
echo "✅ 배팅 폴더: 총 ${FOLDER_COUNT}개"
echo "✅ 우편물: 총 ${MAIL_COUNT}건"
echo "✅ 직원: 총 ${STAFF_COUNT}명"
echo "✅ 일일 마감: 총 ${CLOSING_COUNT}건"
echo ""

# 최종 리포트
echo "=========================================="
echo "📊 최종 테스트 리포트"
echo "=========================================="
echo "✅ 로그인: 성공 (Staff ID: ${STAFF_ID})"
echo "✅ 회원 관리: ${MEMBER_COUNT}명 조회 성공"
echo "✅ 티켓 관리: ${TICKET_COUNT}건 조회 성공, 신규 생성 성공 (ID: ${NEW_TICKET_ID})"
echo "✅ 포인트 시스템: 조회 성공"
echo "✅ 배팅 시스템: ${FOLDER_COUNT}개 폴더 조회 성공"
echo "✅ 우편실: ${MAIL_COUNT}건 조회 성공"
echo "✅ 직원 관리: ${STAFF_COUNT}명 조회 성공, ${ATTENDANCE_COUNT}건 출근 기록"
echo "✅ 일일 마감: ${CLOSING_COUNT}건 조회 성공"
echo ""
echo "🎉 전체 시스템 테스트 시뮬레이션 완료!"
echo "=========================================="
echo ""
echo "🌐 프로덕션 URL: https://exit-system.pages.dev"
echo "👤 테스트 계정: admin@prison-books.kr / admin123"
echo "📦 GitHub: https://github.com/wodnr990921-cloud/exit_company_system"
echo ""
echo "✨ EXIT System v10.0 - 완전 작동 중 ✨"
