# EXIT System 완전 재구축 계획서
## 📅 작성일: 2026-02-14

---

## 🎯 목표

**현재 프로젝트의 근본적인 구조 문제를 해결하고, 유지보수 가능한 현대적인 웹 애플리케이션으로 재구축**

---

## 📊 현재 상태 분석

### 프로젝트 규모
- **총 Git 커밋**: 190개
- **백엔드 코드**: 5,084 라인 (16개 라우트 파일)
- **프론트엔드 코드**: 과거에는 10,000+ 라인 (단일 HTML 템플릿 리터럴)
- **데이터베이스 마이그레이션**: 13개 파일
- **메인 index.tsx**: 56 라인 (HTML 분리 후)

### 주요 구현 기능 (Git 히스토리 분석)

#### 1. 핵심 시스템
- **회원 관리 시스템** (v7.2)
  - 회원 등록, 수정, 삭제
  - 일반/배팅 포인트 관리
  - 동결 포인트 시스템
  - 수용기관, 수용번호 관리
  
- **티켓 시스템** (v7.1)
  - 티켓 생성, 배정, 처리
  - 상태 관리 (open, assigned, in_progress, completed, closed)
  - 우선순위 시스템
  - 회원 연동
  - 이미지 첨부 (R2 Storage)
  
- **인증 시스템**
  - 직원 로그인
  - 역할 기반 권한 (admin, manager, staff, viewer)
  - 세션 관리

#### 2. 배팅 관리 (v9.0-9.1)
- **단폴더/다폴더 배팅**
  - 승무패 배팅
  - 핸디캡 배팅
  - 오버/언더 배팅
- **경기 관리**
  - 경기 등록, 수정, 삭제
  - 배당률 설정
  - 경기 결과 입력
- **정산 시스템**
  - 자동 정산
  - 당첨금 지급
  - 정산 통계 대시보드
- **Excel 업로드** (6e9092b)
  - 경기 일정 대량 등록
  - SheetJS 라이브러리 사용

#### 3. 도서 관리 (v7.3)
- 도서 등록, 수정, 삭제
- 재고 관리
- 판매 상태 관리
- 주문 처리

#### 4. 우편물 처리 시스템 (v10.0+)
- **AI OCR 처리**
  - OpenAI GPT-4o Vision
  - 봉투 자동 인식
  - 수신자 정보 추출 (이름, 수용번호, 수용기관, 사서함 주소)
  - 편지 내용 요약 및 카테고리 자동 분류
- **다중 편지 감지** (fe50fc7)
  - 한 번에 여러 편지 업로드
  - 자동 분할 및 개별 티켓 생성
- **검수 시스템**
  - OCR 결과 확인 및 수정
  - 회원 자동 매칭
  - 담당자 배정
  - 일괄 처리 기능
- **임시 티켓 시스템**
  - 자동 OCR 처리 중 임시 티켓 생성
  - 검수 완료 후 정식 티켓 전환

#### 5. 답변 관리 시스템 (43f766f)
- **빠른 답변 템플릿** (7가지)
- **수동 답변 작성**
- **대량 인쇄 기능**
- **답변 출력 양식 설정** (6e9092b)
  - 헤더 안내문구
  - 인사말
  - 맺음말
  - 수신일 표시 옵션
  - 자동 헤더 (사서함 주소, 수용번호, 이름)

#### 6. 포인트 시스템
- **일반 포인트** (도서 구매 등)
- **배팅 포인트** (배팅 전용)
- **동결 포인트** (배팅 대기 중)
- **거래 내역 추적**
- **관리자 직접 지급/차감**

#### 7. 직원 관리 (v8.0)
- 직원 등록, 수정, 삭제
- 역할 변경 이력
- 권한 관리
- 직원별 통계

#### 8. 일일 마감 시스템 (v8.5)
- **티켓 통계**
  - 총 티켓 수
  - 처리 완료/미처리 건수
- **포인트 통계**
  - 포인트 적립/사용
  - 순 포인트
- **배팅 통계**
  - 배팅 금액/당첨 금액
  - 배팅 마진
- **도서 통계**
  - 주문 건수/판매 금액
  - 발송 완료/미발송
- **인쇄 리포트**

#### 9. 알림 시스템
- 배팅 당첨 알림
- 포인트 지급 알림
- 시스템 알림

#### 10. 수정 요청 시스템
- 회원 정보 수정 요청
- 관리자 승인 프로세스

---

## 🚨 현재 문제점

### 1. 치명적 구조 문제
- **10,000줄 HTML 템플릿 리터럴**
  - 단일 거대 파일에 모든 프론트엔드 코드
  - 356개의 중첩된 템플릿 리터럴
  - Vite 빌드 시 파싱 오류 발생
  - 유지보수 불가능

### 2. JavaScript 오류
- **템플릿 리터럴 중첩 문제**
  - \`...\${...\`...\`}...\` 패턴
  - 이스케이프 백틱 (\\\`)
  - 정규식 충돌
- **브라우저 파싱 오류**
  - `Uncaught SyntaxError: Invalid or unexpected token`
  - 무한 로딩 발생

### 3. 코드 품질 문제
- **프론트엔드/백엔드 혼재**
- **컴포넌트 분리 없음**
- **상태 관리 없음**
- **타입 안정성 부족**

### 4. 배포 문제
- HTML 분리 시도 → Worker 우회 → API 작동 안 함
- 빌드 크기 과다 (682KB → 126KB로 감소 시도했으나 작동 안 함)

---

## 🎨 재구축 아키텍처

### 기술 스택 선택

#### ❌ 기존 (실패)
```
단일 파일 (src/index.tsx)
├── 거대한 HTML 템플릿 리터럴 (10,000줄)
├── 중첩된 JavaScript 코드
└── 템플릿 리터럴 파싱 오류
```

#### ✅ 새로운 구조 (권장)

**옵션 A: React + TypeScript (최고 추천)**
```
프론트엔드 (별도 프로젝트)
├── React 18
├── TypeScript
├── Vite
├── TailwindCSS
├── Axios
├── React Router
└── Zustand (상태관리)

백엔드 (현재 유지)
├── Hono
├── Cloudflare Workers
├── D1 Database
├── R2 Storage
└── AI API
```

**옵션 B: Vue 3 + TypeScript**
```
프론트엔드
├── Vue 3 (Composition API)
├── TypeScript
├── Vite
├── TailwindCSS
├── Pinia (상태관리)
└── Vue Router
```

**옵션 C: 최소 변경 (Vanilla JS 모듈 분리)**
```
프론트엔드 (public/)
├── index.html (최소 뼈대만)
├── js/
│   ├── api.js (API 호출)
│   ├── auth.js (인증)
│   ├── dashboard.js
│   ├── tickets.js
│   ├── members.js
│   ├── betting.js
│   ├── mailroom.js
│   └── utils.js
└── css/
    └── styles.css
```

---

## 📋 상세 재구축 계획

### Phase 1: 환경 설정 (1일)

#### 1.1 새 프로젝트 생성
```bash
# 옵션 A: React
npm create vite@latest exit-frontend -- --template react-ts
cd exit-frontend
npm install axios zustand react-router-dom
npm install -D tailwindcss postcss autoprefixer

# 또는 옵션 B: Vue
npm create vite@latest exit-frontend -- --template vue-ts
cd exit-frontend
npm install axios pinia vue-router

# 또는 옵션 C: Vanilla JS
mkdir exit-frontend
cd exit-frontend
npm init -y
npm install -D vite tailwindcss
```

#### 1.2 백엔드 정리
- 현재 `src/routes/` 파일들은 그대로 유지
- `src/index.tsx`만 간소화 (API 라우트만 등록)
- CORS 설정 추가

#### 1.3 데이터베이스
- D1 데이터베이스 ID 확인: `de6b386e-c93a-417d-a595-24321cc1bf0b`
- 마이그레이션 재적용

---

### Phase 2: 인증 시스템 (1일)

#### 2.1 로그인 화면
**파일**: `src/pages/Login.tsx` (React) 또는 `js/auth.js` (Vanilla)

**기능**:
- 이메일/비밀번호 입력
- API 호출: `POST /api/auth/login`
- JWT 토큰 저장 (localStorage)
- 대시보드로 리다이렉트

**API 엔드포인트** (백엔드 - 이미 존재):
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

#### 2.2 인증 상태 관리
**React**: Zustand store
```typescript
interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}
```

**Vanilla JS**: 
```javascript
// auth.js
const AuthManager = {
  token: localStorage.getItem('token'),
  user: null,
  async login(email, password) { ... },
  logout() { ... }
}
```

---

### Phase 3: 대시보드 (1일)

#### 3.1 레이아웃
**구성요소**:
- 헤더 (로고, 사용자 정보, 로그아웃)
- 사이드바 네비게이션
  - 대시보드
  - 티켓 관리
  - 회원 관리
  - 도서 관리
  - 우편물 처리
  - 배팅 관리
  - 직원 관리 (관리자만)
  - 일일 마감 (관리자만)
- 메인 컨텐츠 영역

#### 3.2 대시보드 통계
**API**: `GET /api/dashboard/stats`

**표시 정보**:
- 오늘의 티켓 수
- 대기 중인 승인
- 배팅 통계
- 우편물 현황
- 차트 (Chart.js)

---

### Phase 4: 티켓 관리 (2일)

#### 4.1 티켓 목록
**기능**:
- 필터링 (상태, 타입)
- 검색
- 페이지네이션
- 정렬

**API**:
- `GET /api/tickets?page=1&limit=20&status=open&type=all`

#### 4.2 티켓 생성 모달
**입력 필드**:
- 제목
- 설명
- 회원 선택 (자동완성)
- 담당자 선택
- 우선순위
- 티켓 타입
- 이미지 업로드

**API**:
- `POST /api/tickets`

#### 4.3 티켓 상세
**탭 구조**:
- 기본 정보
- 회원 관리 (변경, 승인 요청)
- 상태 변경
- 댓글
- 이미지 갤러리 (확대, 회전, 팬/줌)
- 이력

**API**:
- `GET /api/tickets/:id`
- `PATCH /api/tickets/:id`
- `DELETE /api/tickets/:id`

---

### Phase 5: 회원 관리 (2일)

#### 5.1 회원 목록
**표시 방식**:
- 카드형 / 리스트형 토글
- 검색 (이름, 수용번호, 수용기관)
- 필터링

**API**:
- `GET /api/members?search=keyword`

#### 5.2 회원 등록/수정
**입력 필드**:
- 이름
- 수용기관
- 수용번호
- 사서함 주소
- 초기 포인트

**API**:
- `POST /api/members`
- `PATCH /api/members/:id`

#### 5.3 회원 상세
**정보 표시**:
- 기본 정보
- 포인트 내역 (일반/배팅/동결)
- 거래 내역
- 티켓 이력
- 배팅 이력

**관리자 기능**:
- 포인트 직접 지급/차감
- 회원 정보 수정

**API**:
- `GET /api/members/:id`
- `GET /api/members/:id/transactions`
- `GET /api/members/:id/tickets`
- `POST /api/points/adjust`

---

### Phase 6: 우편물 처리 시스템 (3일)

#### 6.1 우편물 업로드
**기능**:
- 다중 이미지 업로드 (최대 10개)
- 드래그 앤 드롭
- 미리보기
- 업로드 진행률

**프로세스**:
1. 이미지 업로드 → R2 Storage
2. OCR 처리 요청 → OpenAI Vision API
3. 임시 티켓 자동 생성
4. 대기 탭으로 이동

**API**:
- `POST /api/mailroom/upload`
- `POST /api/mailroom/ocr-simple`
- `POST /api/mailroom/ocr-detect-multiple` (다중 편지 감지)

#### 6.2 대기 탭
**기능**:
- OCR 처리 중인 우편물 목록
- 실시간 상태 업데이트 (폴링 또는 WebSocket)
- 자동 새로고침 (5초)

#### 6.3 검수 탭
**기능**:
- OCR 결과 확인
- 수신자 정보 수정 (이름, 수용번호, 수용기관, 사서함 주소)
- 편지 내용 확인/수정
- 카테고리 선택
- 회원 자동 매칭 / 신규 회원 등록
- 담당자 배정
- 일괄 처리 (다중 선택)
  - 일괄 배당
  - 일괄 삭제

**API**:
- `GET /api/mailroom/items?status=ocr_completed`
- `PATCH /api/mailroom/items/:id`
- `POST /api/mailroom/items/:id/assign`
- `POST /api/mailroom/items/bulk-assign`
- `DELETE /api/mailroom/items/:id`

#### 6.4 이미지 뷰어
**기능**:
- 확대/축소
- 회전 (90도씩)
- 팬 (드래그)
- 전체화면
- 썸네일 네비게이션

---

### Phase 7: 배팅 관리 (3일)

#### 7.1 배팅 폴더 목록
**표시 정보**:
- 폴더 번호
- 회원 정보
- 배팅 타입 (단폴더/다폴더)
- 총 배팅금액
- 총 배당률
- 예상 당첨금
- 상태 (대기/당첨/미당첨)
- 생성일

**필터링**:
- 상태별
- 회원별
- 날짜별

**API**:
- `GET /api/betting/folders`

#### 7.2 배팅 생성
**단계**:
1. 회원 선택
2. 경기 선택 (다중 선택)
3. 각 경기별 배팅 타입 선택 (승무패/핸디캡/오버언더)
4. 배팅 금액 입력
5. 예상 배당률 및 당첨금 계산
6. 확인 및 생성

**API**:
- `GET /api/betting/matches?status=scheduled`
- `POST /api/betting/folders`

#### 7.3 경기 관리
**표시 방식**:
- 엑셀 형태 테이블
- 인라인 편집

**필드** (11개 컬럼):
- 경기명
- 홈팀
- 원정팀
- 경기일시
- 홈승 배당
- 무승부 배당
- 원정승 배당
- 기준점 (핸디캡)
- 오버 배당
- 언더 배당
- 작업 (수정/삭제)

**기능**:
- 경기 추가 (개별)
- 엑셀 업로드 (대량 등록)
  - SheetJS 라이브러리
  - 템플릿 다운로드
- 경기 결과 입력

**API**:
- `GET /api/betting/matches`
- `POST /api/betting/matches`
- `PATCH /api/betting/matches/:id`
- `DELETE /api/betting/matches/:id`

#### 7.4 정산 시스템
**기능**:
- 완료된 경기 목록
- 경기 결과 입력
- 정산 실행
  - 자동 당첨 계산
  - 포인트 지급
  - 알림 생성
- 정산 통계
  - 총 배팅액
  - 당첨금액
  - 마진
  - 배팅 건수

**API**:
- `GET /api/betting/matches?status=completed`
- `POST /api/betting/settle`
- `GET /api/betting/settlement-stats`

---

### Phase 8: 답변 관리 (2일)

#### 8.1 오늘의 답변 탭
**기능**:
- 답변 대상 티켓 목록
- 빠른 답변 선택 (7가지 템플릿)
- 수동 답변 작성
- 대량 인쇄

**API**:
- `GET /api/responses/pending`
- `POST /api/responses`
- `PATCH /api/responses/:id`

#### 8.2 답변 출력 양식 설정
**설정 항목**:
- 헤더 안내문구
- 인사말
- 맺음말
- 수신일 표시 옵션
- 자동 헤더 (사서함 주소, 수용번호, 이름)

**API**:
- `GET /api/responses/settings`
- `PUT /api/responses/settings`

#### 8.3 인쇄 기능
**기능**:
- 선택한 답변 일괄 인쇄
- 자동 양식 적용
- 프린트 프리뷰

---

### Phase 9: 도서 관리 (1일)

#### 9.1 도서 목록
**기능**:
- 검색 (제목, 저자, ISBN)
- 필터링 (상태, 재고)
- 정렬

**API**:
- `GET /api/books?search=keyword`

#### 9.2 도서 등록/수정
**입력 필드**:
- 제목
- 저자
- 출판사
- ISBN
- 가격
- 재고
- 상태

**API**:
- `POST /api/books`
- `PATCH /api/books/:id`
- `DELETE /api/books/:id`

---

### Phase 10: 직원 관리 (1일)

#### 10.1 직원 목록
**표시 정보**:
- 이름
- 이메일
- 역할
- 등록일

**API**:
- `GET /api/staff`

#### 10.2 직원 등록/수정
**입력 필드**:
- 이름
- 이메일
- 비밀번호
- 역할 (admin, manager, staff, viewer)

**API**:
- `POST /api/staff`
- `PATCH /api/staff/:id`
- `DELETE /api/staff/:id`

#### 10.3 역할 변경 이력
**표시 정보**:
- 변경 전/후 역할
- 변경 사유
- 변경자
- 변경일

**API**:
- `GET /api/staff/:id/role-changes`

---

### Phase 11: 일일 마감 (1일)

#### 11.1 마감 데이터 조회
**통계 항목**:
- **티켓 처리 현황**
  - 총 티켓 수
  - 처리 완료
  - 미처리
- **포인트 현황**
  - 포인트 적립
  - 포인트 사용
  - 순 포인트
- **배팅 현황**
  - 배팅 금액
  - 당첨 금액
  - 배팅 마진
- **도서 판매 현황**
  - 주문 건수
  - 판매 금액
  - 발송 완료
  - 미발송

**API**:
- `GET /api/closing?date=2026-02-14`

#### 11.2 마감 실행
**기능**:
- 마감 실행 (관리자만)
- 마감 메모 입력
- 마감 후 수정 불가

**API**:
- `POST /api/closing`

#### 11.3 인쇄 리포트
**기능**:
- 마감 리포트 인쇄
- PDF 생성

---

### Phase 12: 알림 시스템 (1일)

#### 12.1 알림 목록
**표시 정보**:
- 알림 타입 (배팅 당첨, 포인트 지급, 시스템)
- 제목
- 메시지
- 읽음/안 읽음
- 생성일

**API**:
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `DELETE /api/notifications/:id`

---

### Phase 13: 수정 요청 시스템 (1일)

#### 13.1 수정 요청 목록 (관리자)
**표시 정보**:
- 요청 타입 (회원 정보 수정)
- 요청자
- 변경 전/후 데이터
- 상태 (대기/승인/거부)
- 요청일

**API**:
- `GET /api/modifications`
- `POST /api/modifications/:id/approve`
- `POST /api/modifications/:id/reject`

---

## 🛠️ 기술 세부사항

### 프론트엔드 컴포넌트 구조 (React 예시)

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── Card.tsx
│   │   └── Loading.tsx
│   ├── tickets/
│   │   ├── TicketList.tsx
│   │   ├── TicketCard.tsx
│   │   ├── TicketDetail.tsx
│   │   ├── CreateTicketModal.tsx
│   │   └── ImageGallery.tsx
│   ├── members/
│   │   ├── MemberList.tsx
│   │   ├── MemberCard.tsx
│   │   ├── MemberDetail.tsx
│   │   └── CreateMemberModal.tsx
│   ├── betting/
│   │   ├── BettingList.tsx
│   │   ├── BettingCard.tsx
│   │   ├── CreateBettingModal.tsx
│   │   ├── MatchManagement.tsx
│   │   └── SettlementPanel.tsx
│   ├── mailroom/
│   │   ├── MailUpload.tsx
│   │   ├── WaitingTab.tsx
│   │   ├── InspectionTab.tsx
│   │   └── MailItemCard.tsx
│   └── responses/
│       ├── ResponseList.tsx
│       ├── QuickReplyButtons.tsx
│       ├── ResponseEditor.tsx
│       └── SettingsModal.tsx
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Tickets.tsx
│   ├── Members.tsx
│   ├── Books.tsx
│   ├── Betting.tsx
│   ├── Mailroom.tsx
│   ├── Responses.tsx
│   ├── Staff.tsx
│   └── Closing.tsx
├── stores/
│   ├── authStore.ts
│   ├── ticketStore.ts
│   ├── memberStore.ts
│   └── notificationStore.ts
├── api/
│   ├── client.ts (Axios 인스턴스)
│   ├── auth.ts
│   ├── tickets.ts
│   ├── members.ts
│   ├── betting.ts
│   ├── mailroom.ts
│   └── responses.ts
├── types/
│   ├── auth.ts
│   ├── ticket.ts
│   ├── member.ts
│   ├── betting.ts
│   └── mailroom.ts
├── utils/
│   ├── formatters.ts (날짜, 금액 포맷)
│   ├── validators.ts
│   └── constants.ts
├── App.tsx
└── main.tsx
```

### 백엔드 구조 (현재 유지)

```
src/
├── index.tsx (간소화 - API 라우트만)
├── routes/
│   ├── auth.ts (✅ 유지)
│   ├── attendance.ts (✅ 유지)
│   ├── betting.ts (✅ 유지)
│   ├── books.ts (✅ 유지)
│   ├── closing.ts (✅ 유지)
│   ├── mailroom.ts (✅ 유지)
│   ├── members.ts (✅ 유지)
│   ├── modifications.ts (✅ 유지)
│   ├── notifications.ts (✅ 유지)
│   ├── points.ts (✅ 유지)
│   ├── responses.ts (✅ 유지)
│   ├── staff_management.ts (✅ 유지)
│   ├── ticket-items.ts (✅ 유지)
│   └── tickets.ts (✅ 유지)
├── middleware/
│   └── auth.ts (✅ 유지)
└── types/
    └── (타입 정의)
```

### API 클라이언트 (프론트엔드)

```typescript
// src/api/client.ts
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터 (토큰 추가)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터 (에러 처리)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

---

## 📅 일정 및 우선순위

### 총 예상 기간: 15-20일

#### Week 1 (Phase 1-4)
- **Day 1**: 환경 설정, 프로젝트 생성
- **Day 2**: 인증 시스템
- **Day 3**: 대시보드
- **Day 4-5**: 티켓 관리

#### Week 2 (Phase 5-8)
- **Day 6-7**: 회원 관리
- **Day 8-10**: 우편물 처리 시스템
- **Day 11-13**: 배팅 관리

#### Week 3 (Phase 9-13)
- **Day 14-15**: 답변 관리
- **Day 16**: 도서 관리
- **Day 17**: 직원 관리
- **Day 18**: 일일 마감
- **Day 19**: 알림 시스템
- **Day 20**: 수정 요청 시스템

#### Week 4 (테스트 및 배포)
- **Day 21-22**: 통합 테스트
- **Day 23**: 버그 수정
- **Day 24**: 성능 최적화
- **Day 25**: 프로덕션 배포

---

## 🔒 중요 규칙 (재발 방지)

### ❌ 절대 금지 사항

1. **템플릿 리터럴 중첩**
   ```typescript
   // ❌ 절대 금지
   const html = `<div>${data.map(item => `<span>${item}</span>`)}</div>`
   ```

2. **거대한 단일 파일**
   - 1,000줄 이상 파일 금지
   - 컴포넌트/함수 분리 필수

3. **HTML과 JavaScript 혼재**
   - JSX 또는 별도 템플릿 사용

4. **타입 없는 코드**
   - 모든 함수, 변수에 타입 지정

5. **정규식 남용**
   - 문자열 메서드 우선 사용

### ✅ 필수 사항

1. **컴포넌트 분리**
   - 한 컴포넌트는 한 가지 역할만

2. **타입 안전성**
   - TypeScript strict mode 사용
   - any 타입 금지

3. **에러 처리**
   - 모든 API 호출에 try-catch
   - 사용자 친화적 에러 메시지

4. **코드 리뷰**
   - 커밋 전 코드 검토
   - ESLint/Prettier 사용

5. **테스트**
   - 주요 기능 단위 테스트
   - E2E 테스트

---

## 🚀 배포 전략

### 개발 환경
- **프론트엔드**: Vite Dev Server (localhost:5173)
- **백엔드**: Wrangler Dev Server (localhost:8787)
- **데이터베이스**: D1 Local (--local 플래그)

### 프로덕션 배포

#### 프론트엔드
```bash
# 빌드
npm run build

# Cloudflare Pages에 배포
npx wrangler pages deploy dist --project-name exit-frontend
```

#### 백엔드 (변경 없음)
```bash
# 빌드
npm run build

# Cloudflare Pages에 배포
npx wrangler pages deploy dist --project-name exit-company
```

### 환경 변수
```env
# 프론트엔드 (.env)
VITE_API_BASE=https://exit-company-system.pages.dev/api

# 백엔드 (wrangler.jsonc)
D1_DATABASE_ID=de6b386e-c93a-417d-a595-24321cc1bf0b
```

---

## 📊 성공 지표

### 기술 지표
- ✅ 빌드 시간 < 10초
- ✅ Worker 크기 < 200KB
- ✅ 첫 페이지 로드 < 2초
- ✅ API 응답 시간 < 500ms
- ✅ 0개의 TypeScript 에러
- ✅ 0개의 ESLint 경고

### 기능 지표
- ✅ 모든 기존 기능 작동
- ✅ 새 기능 추가 가능
- ✅ 코드 가독성 향상
- ✅ 유지보수 시간 50% 감소

---

## 🎓 학습 자료

### React + TypeScript
- [React 공식 문서](https://react.dev)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [Vite 가이드](https://vitejs.dev/guide/)

### Hono
- [Hono 공식 문서](https://hono.dev)
- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)

### 상태 관리
- [Zustand](https://github.com/pmndrs/zustand)
- [Pinia](https://pinia.vuejs.org/) (Vue)

---

## 📝 체크리스트

### 시작 전
- [ ] 기술 스택 최종 결정 (React/Vue/Vanilla)
- [ ] 팀 구성 및 역할 분담
- [ ] 개발 환경 설정
- [ ] Git 브랜치 전략 수립

### 개발 중
- [ ] 컴포넌트 설계 문서 작성
- [ ] API 인터페이스 정의
- [ ] 타입 정의 완료
- [ ] 코드 리뷰 프로세스 수립

### 완료 후
- [ ] 전체 기능 테스트
- [ ] 성능 측정
- [ ] 보안 점검
- [ ] 문서화 완료
- [ ] 배포 및 모니터링

---

## 🎯 결론

**현재 프로젝트는 구조적 문제로 인해 유지보수가 불가능한 상태입니다.**

**완전히 새로 시작하는 것이 가장 빠르고 확실한 해결책입니다.**

이 계획서를 따라 진행하면:
- ✅ 모든 기존 기능 유지
- ✅ 확장 가능한 구조
- ✅ 유지보수 용이
- ✅ 성능 향상
- ✅ 개발 속도 향상

**예상 기간: 15-20일**

**투자 대비 효과: 매우 높음**

---

## 📞 다음 단계

1. **이 계획서 검토 및 승인**
2. **기술 스택 최종 결정**
3. **Phase 1 시작: 환경 설정**

**시작할 준비가 되셨나요?**
