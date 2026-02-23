# 관리자 기능 사용 가이드

## 📌 접근 방법

1. **로그인**: https://exit-company-system-5je.pages.dev
2. **관리자 계정**: admin@manager-exit.cloud
3. **메뉴**: 상단 또는 사이드바의 "관리자" 또는 "Settings" 클릭

---

## 🎯 주요 기능

### 1️⃣ 시스템 설정 (Settings)

**접근**: Settings 버튼 클릭

**기능:**
- ✅ API 키 설정 (OpenAI, Telegram, API-Sport.io)
- ✅ 정산 설정 (수수료율, 최소/최대 정산액, 포인트 환율)
- ✅ 알림 설정 (티켓 생성, 배정, 승인 요청, 배팅 결과)
- ✅ 일반 설정 (자동 마감 시간, 티켓 보관 기간, 세션 타임아웃)

**테스트:**
```bash
# 설정 조회
curl "https://exit-company-system-5je.pages.dev/api/settings"

# 설정 저장
curl -X POST "https://exit-company-system-5je.pages.dev/api/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "commission_rate": 15,
    "min_settlement": 20000,
    "max_settlement": 10000000
  }'
```

---

### 2️⃣ 활동 로그 (Activity Log)

**접근**: 관리자 → Activity Log 탭

**기능:**
- ✅ 직원별 활동 내역 조회
- ✅ 날짜 범위 필터 (기본: 최근 7일)
- ✅ 액션 필터 (로그인, 생성, 수정, 삭제, 승인, 거부)
- ✅ 스태프 필터

**UI 구성:**
- 날짜 선택기 (시작일/종료일)
- 스태프 드롭다운
- 액션 드롭다운
- 조회 버튼
- 로그 목록 (스태프명, 액션, 설명, 시간)

**테스트:**
```bash
# 활동 로그 조회
curl "https://exit-company-system-5je.pages.dev/api/activity-logs?start_date=2026-02-01&end_date=2026-02-25"

# 활동 로그 생성
curl -X POST "https://exit-company-system-5je.pages.dev/api/activity-logs" \
  -H "Content-Type: application/json" \
  -d '{
    "staff_id": 1,
    "action": "login",
    "description": "시스템 로그인"
  }'
```

---

### 3️⃣ 입출금 관리 (Transactions)

**접근**: 관리자 → Transactions 탭

**기능:**
- ✅ 오늘 통계 (총 입금, 총 출금, 미확인 입금, 승인 대기)
- ✅ 미확인 입금 목록 (자동 매칭 실패한 입금)
- ✅ 거래 내역 (필터링: 타입, 상태, 날짜)
- ✅ 승인/거부 처리
- ✅ 텔레그램 자동 파싱

**UI 구성:**

**통계 위젯:**
- 총 입금 (오늘) - 녹색
- 총 출금 (오늘) - 빨간색
- 미확인 입금 - 노란색
- 승인 대기 - 파란색

**미확인 입금 섹션:**
- 입금자명, 금액, 은행, 계좌번호
- 추천 회원 (있는 경우)
- 회원 검색/확인 버튼

**거래 내역 섹션:**
- 타입 필터 (전체/입금/출금/경비)
- 상태 필터 (전체/대기/승인/거부)
- 날짜 범위
- 조회/수동 등록 버튼
- 거래 목록 (승인/거부 버튼)

**테스트:**
```bash
# 텔레그램 입금 파싱
curl -X POST "https://exit-company-system-5je.pages.dev/api/transactions/telegram/process" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "[입금] 500,000원 / 홍길동 / 국민은행 123-456-789012 / 2026.02.23 18:45"
  }'

# 미확인 입금 조회
curl "https://exit-company-system-5je.pages.dev/api/transactions/pending"

# 거래 내역 조회
curl "https://exit-company-system-5je.pages.dev/api/transactions?start_date=2026-02-01&end_date=2026-02-25"

# 입금 승인
curl -X POST "https://exit-company-system-5je.pages.dev/api/transactions/1/approve" \
  -H "Content-Type: application/json" \
  -d '{"memo": "승인 완료"}'
```

---

### 4️⃣ 수정 승인 (Modifications)

**접근**: 관리자 → Modifications 탭

**기능:**
- ✅ 회원 정보 수정 요청 목록
- ✅ 승인/거부 처리
- ✅ 변경 내역 확인

---

### 5️⃣ 정산 시스템 (Closing)

**접근**: 관리자 → Closing 탭

**기능:**
- ✅ 일일 정산 처리
- ✅ 미정산 내역 확인
- ✅ 정산 완료 처리

---

## 🔧 문제 해결

### UI가 안 보일 때

1. **로그인 확인**: 관리자 계정으로 로그인했는지 확인
2. **권한 확인**: 관리자 권한이 있는지 확인
3. **브라우저 콘솔**: F12 → Console 탭에서 에러 확인
4. **캐시 삭제**: Ctrl+Shift+R (하드 리프레시)

### 데이터가 안 나올 때

1. **날짜 범위**: Activity Log는 날짜 선택 필요
2. **필터 확인**: Transactions는 조회 버튼 클릭 필요
3. **테스트 데이터**: 위의 curl 명령어로 테스트 데이터 생성

### API 에러

1. **네트워크 탭**: F12 → Network에서 API 호출 확인
2. **응답 코드**: 401 (인증), 403 (권한), 500 (서버 에러)
3. **에러 메시지**: Response body 확인

---

## 📊 현재 상태

| 기능 | 상태 | API | UI |
|------|------|-----|-----|
| 시스템 설정 | ✅ 작동 | ✅ | ✅ |
| 활동 로그 | ✅ 작동 | ✅ | ✅ |
| 입출금 관리 | ✅ 작동 | ✅ | ✅ |
| 수정 승인 | ✅ 작동 | ✅ | ✅ |
| 정산 시스템 | ✅ 작동 | ✅ | ✅ |

---

## 🎯 다음 단계

1. **로그인**: https://exit-company-system-5je.pages.dev
2. **테스트 데이터 생성**: 위의 curl 명령어 실행
3. **UI 확인**: 각 탭 클릭하여 데이터 표시 확인
4. **기능 테스트**: 승인/거부/저장 버튼 테스트

---

## 📞 지원

- GitHub: https://github.com/wodnr990921-cloud/exit_company_system
- Commit: 4d79e68
- Version: v62.7.1
