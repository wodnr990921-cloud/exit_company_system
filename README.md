# EXIT System v8.7.1 ✅ 우편실 시스템 + 포인트 관리 완성

**통합 교도소 도서 관리 시스템 - 티켓, 회원, 배팅, 우편실, 일일 마감**

## 🌐 접속 정보

- **도메인**: manager-exit.cloud (예정)
- **데모 URL**: https://3000-izz2akoud4rd9s8t7plxq-b32ec7bb.sandbox.novita.ai
- **데모 계정**: admin@prison-books.kr / admin123

## 📋 프로젝트 개요

EXIT 시스템은 교도소 수감자를 위한 도서 관리 및 우편물 처리를 위한 통합 플랫폼입니다. 티켓 기반 업무 처리, 회원 관리, 도서 재고, 포인트 시스템, 폴더 배팅 시스템 (단폴더/다폴더), AI 기반 우편실 시스템을 제공합니다.

---

## ✨ 주요 기능 (v8.7)

### 🆕 1️⃣ 우편실 시스템 🎉 **NEW**

**3개 탭 구조**:
- **우편 수령**: 다중 이미지 업로드 및 OCR 처리
- **검수 및 배당**: OCR 결과 확인 및 일괄 배당
- **처리 내역**: 전체 우편물 이력 조회

**우편물 업로드**:
- 다중 이미지 업로드 (JPG, PNG, GIF, WEBP)
- 실시간 Cloudflare R2 스토리지 업로드
- 파일 크기 제한: 10MB per 파일
- 드래그 앤 드롭 미리보기

**OCR 처리** (Cloudflare AI 준비 완료):
- API 엔드포인트: `/api/mailroom/:id/ocr`
- 편지 봉투 자동 감지 (placeholder)
- 신규 케이스 vs 연속 페이지 판단
- 한글/영어 텍스트 추출 (AI Workers 연동 시)

**검수 및 배당**:
- OCR 결과 확인 화면
- 다중 우편물 선택 (체크박스)
- 일괄 배당 기능 (회원 검색)
- 자동 티켓 생성 및 연결

**우편물 상태 워크플로우**:
```
received (수령) 
  → ocr_processing (OCR 처리중)
  → ocr_completed (OCR 완료)
  → inspection (검수중)
  → assigned (배당완료)
  → completed (처리완료)
```

**기술 스택**:
- **R2 Storage**: 이미지 파일 저장
- **AI Workers**: OCR 처리 (준비 완료)
- **D1 Database**: 우편물 메타데이터
- **Hono API**: RESTful 엔드포인트

---

### 2️⃣ 배팅 관리 시스템 (v8.6)

**경기 관리**:
- 경기 일정 등록/수정/삭제
- 배당률 입력 (홈승/무승부/원정승/오버/언더/핸디캡)
- '+' 버튼으로 경기 추가
- 일괄 저장 기능

**폴더 배팅 시스템**:
- 단폴더 배팅: 1개 경기
- 다폴더 배팅: 2개 이상 경기 (복합 배당)
- 자동 배당률 계산
- 예상 적중금 자동 계산

**고객 배팅 목록**:
- 폴더 번호, 회원 정보
- 배팅 금액 (원 단위 포맷)
- 총 배당률 (소수점 2자리)
- 상태별 색상 코딩

**경기 정산**:
- 완료된 경기만 필터링
- 배팅금액 vs 당첨금액 비교
- 정산 대시보드
- 순수익 계산

---

### 3️⃣ 회원 관리

**회원 고유번호 시스템** (v8.6.1):
- 자동 생성: M00001, M00002, M00003...
- 회원 목록 카드에 배지 표시
- 회원 상세 모달에 표시
- 검색 가능

**회원 정보**:
- 이름, 기관(교도소), 수감번호
- 사서함 주소, 입금자명
- 일반 포인트 / 배팅 포인트
- 동결 포인트

**포인트 관리** (v8.7.1):
- **회원 상세 모달에서 직접 조정**: 
  - 포인트 지급/차감 버튼
  - 유형 선택: 일반 포인트 / 배팅 포인트
  - 금액 입력 및 사유 작성
  - **자동 기록**: `point_transactions` 테이블에 자동 저장
  - 담당자 정보 자동 기록
- 적립, 사용, 조정
- 동결/해제 기능
- 거래 내역 추적 (회원 상세 모달)

---

### 4️⃣ 티켓 시스템

**티켓 유형**:
- 주문 (ORDER)
- 문의 (INQUIRY)
- 발주 (PURCHASE_ORDER)
- 포인트 조정 (POINT_ADJUSTMENT)
- 회원 관리 (MEMBER)

**티켓 워크플로우**:
```
open (미배정)
  → assigned (배정됨)
  → in_progress (처리중)
  → completed (완료)
  → closed (종료)
```

**댓글 시스템**:
- 내부 메모 (직원만)
- 회원 답변 (출력용)
- 빠른 답변 템플릿 7종

---

### 5️⃣ 도서 관리

- 도서 등록/수정
- 재고 관리
- 가격 정보
- ISBN 관리
- 상태 배지 (판매중/품절)

---

### 6️⃣ 일일 마감 시스템 (v8.5)

**데이터 조회**:
- 티켓 통계
- 배팅 통계
- 포인트 거래
- 출근 기록
- 도서 주문
- 회원 활동

**마감 실행**:
- 일일 마감 생성
- 마감 상태 확인
- 인쇄 기능
- 월간 리포트

---

### 7️⃣ 직원 관리 및 출근 시스템

**직원 관리**:
- 관리자 / 일반 직원 구분
- 직원 등록/수정/삭제
- 권한 관리

**출근 관리**:
- 출근/퇴근 기록
- 실시간 근무 현황
- 출근 이력 조회

---

### 8️⃣ 통계 및 대시보드

**관리자 대시보드**:
- 오늘의 티켓 현황
- 미배정/처리중/완료 건수
- 긴급 티켓 알림
- 최근 생성 티켓

**일반 직원 대시보드**:
- 나의 배정 티켓
- 처리 현황
- 출근 정보

---

## 🗂 데이터베이스 구조

### 주요 테이블

**회원 (members)**:
- member_number (고유번호)
- name, institution, inmate_number
- points, betting_points, frozen_points

**티켓 (tickets)**:
- ticket_number, type, status, priority
- member_id, assigned_to, created_by

**우편실 (mailroom_items)** 🆕:
- mail_number (우편물 번호)
- member_id, ticket_id
- image_keys (JSON - R2 키 배열)
- ocr_result (JSON - OCR 결과)
- status (워크플로우 상태)

**경기 (matches)**:
- match_number, match_name, match_date
- home_team, away_team
- 배당률 (home_odds, draw_odds, away_odds, over/under, handicap)

**배팅 폴더 (bet_folders)**:
- folder_number, folder_type (single/multi)
- member_id, ticket_id
- total_bet_amount, total_odds, potential_win
- status (pending/won/lost/cancelled/settled)

**배팅 (bets)**:
- folder_id, match_id
- bet_type, odds
- result (win/lose/cancelled)

**포인트 거래 (point_transactions)**:
- member_id, transaction_type
- point_type (points/betting_points)
- amount, balance
- description

**직원 (staff)**:
- name, email, password_hash
- role (admin/staff)
- status (active/inactive)

**출근 (attendance)**:
- staff_id
- checkin_time, checkout_time

**일일 마감 (daily_closings)**:
- date, closed_by
- 통계 데이터 (ticket/betting/point/attendance 등)
- total_margin, net_points

---

## 🛠 기술 스택

### 백엔드
- **Hono**: 경량 웹 프레임워크
- **Cloudflare Workers**: 서버리스 엣지 컴퓨팅
- **TypeScript**: 타입 안전 개발

### 데이터베이스
- **Cloudflare D1**: SQLite 기반 분산 데이터베이스
- **마이그레이션**: 11개 파일 (0001 ~ 0011)

### 스토리지
- **Cloudflare R2**: S3 호환 객체 스토리지 (이미지)

### AI & OCR
- **Cloudflare AI Workers**: OCR 처리 (준비 완료)

### 프론트엔드
- **Vanilla JavaScript**: 의존성 없는 순수 JS
- **Tailwind CSS**: 유틸리티 CSS (CDN)
- **Font Awesome**: 아이콘 라이브러리 (CDN)
- **Axios**: HTTP 클라이언트 (CDN)

### 배포
- **Cloudflare Pages**: 정적 사이트 호스팅
- **Wrangler**: Cloudflare CLI 도구

---

## 🚀 설치 및 실행

### 1. 로컬 개발

```bash
# 의존성 설치
npm install

# D1 마이그레이션 적용
npm run db:migrate:local

# 빌드
npm run build

# PM2로 서버 시작
pm2 start ecosystem.config.cjs

# PM2 프로세스 확인
pm2 list

# 로그 확인
pm2 logs exit-system --nostream
```

### 2. 배포

```bash
# 빌드 및 배포
npm run build
npm run deploy

# 프로덕션 배포
npm run deploy:prod
```

---

## 📚 API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입

### 회원
- `GET /api/members` - 목록 조회
- `GET /api/members/:id` - 상세 조회
- `POST /api/members` - 등록
- `PATCH /api/members/:id` - 수정

### 티켓
- `GET /api/tickets` - 목록 조회
- `GET /api/tickets/:id` - 상세 조회
- `POST /api/tickets` - 생성
- `PATCH /api/tickets/:id` - 수정
- `POST /api/tickets/:id/comments` - 댓글 작성

### 우편실 🆕
- `GET /api/mailroom` - 우편물 목록 조회
- `GET /api/mailroom/:id` - 상세 조회
- `POST /api/mailroom/upload` - 이미지 업로드 (R2)
- `GET /api/mailroom/image/:key` - 이미지 조회 (R2)
- `POST /api/mailroom` - 우편물 등록
- `PATCH /api/mailroom/:id/status` - 상태 업데이트
- `POST /api/mailroom/:id/ocr` - OCR 처리
- `DELETE /api/mailroom/:id` - 삭제

### 배팅
- `GET /api/betting/matches` - 경기 목록
- `POST /api/betting/matches` - 경기 생성
- `POST /api/betting/matches/bulk` - 경기 일괄 저장
- `POST /api/betting/matches/:id/result` - 경기 결과 입력
- `DELETE /api/betting/matches/:id` - 경기 삭제
- `GET /api/betting/folders` - 배팅 폴더 목록
- `POST /api/betting/folders` - 배팅 폴더 생성
- `GET /api/betting/settlements/pending` - 정산 대기 목록
- `POST /api/betting/settlements/:id/approve` - 정산 승인
- `GET /api/betting/settlement-stats` - 정산 통계

### 포인트
- `POST /api/points/adjust` - 포인트 조정
- `POST /api/points/freeze` - 포인트 동결
- `POST /api/points/unfreeze` - 포인트 해제

### 일일 마감
- `GET /api/closing/daily-close` - 일일 데이터 조회
- `POST /api/closing/daily-close` - 마감 실행
- `GET /api/closing/daily-closes` - 마감 이력

---

## 🎯 사용 예시

### 배팅 시스템

**단폴더 배팅**:
```javascript
{
  "folder_type": "single",
  "total_bet_amount": 10000,
  "bets": [
    {
      "match_id": 1,
      "bet_type": "home_win",
      "odds": 1.85
    }
  ]
}
```

**다폴더 배팅**:
```javascript
{
  "folder_type": "multi",
  "total_bet_amount": 10000,
  "bets": [
    { "match_id": 1, "bet_type": "home_win", "odds": 1.85 },
    { "match_id": 2, "bet_type": "over", "odds": 1.92 }
  ]
}
// 총 배당: 1.85 × 1.92 = 3.55
// 예상 적중금: 10000 × 3.55 = 35500원
```

---

## 🔐 시스템 특징

### 보안
- 비밀번호 해시화 (Argon2)
- 세션 기반 인증
- 역할 기반 권한 관리 (admin/staff)

### 자동화
- 배팅 자동 정산
- 경기 취소 시 자동 환불
- 포인트 자동 계산
- 회원 번호 자동 생성

### 감사 추적
- 모든 포인트 거래 기록
- 티켓 댓글 이력
- 직원 출근 기록
- 일일 마감 이력

---

## 📝 향후 개선 계획

### 완료 ✅
- ✅ 회원 고유번호 시스템 (v8.6.1)
- ✅ 우편실 기본 시스템 (v8.7)
- ✅ R2 이미지 스토리지 연동 (v8.7)
- ✅ OCR API 엔드포인트 준비 (v8.7)
- ✅ 검수 및 배당 워크플로우 (v8.7)

### 진행중 🔄
- 🔄 Cloudflare AI Workers OCR 실제 연동 (placeholder 완료)
- 🔄 티켓 상세 모달 이미지 뷰어 강화

### 예정 📅
- 📅 이미지 확대/축소/회전 고급 기능
- 📅 프로덕션 Cloudflare Pages 배포
- 📅 Favicon 추가
- 📅 Tailwind CSS 프로덕션 최적화

---

## 📄 라이선스

MIT

---

## 👥 개발자

EXIT 시스템 개발팀

---

## 📌 버전 정보

- **버전**: v8.7
- **최종 업데이트**: 2026-02-06
- **상태**: ✅ 정상 작동 중 (우편실 시스템 완성)

---

## 🆘 문의

문제가 발생하거나 질문이 있으시면 GitHub Issues를 통해 문의해주세요.

---

**EXIT System - 교도소 도서 관리를 위한 통합 솔루션** 📚✨
