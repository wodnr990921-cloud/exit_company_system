# 엑시트 시스템 (EXIT System) v8.7 ✅ 완성

**통합 관리 시스템 - 티켓, 회원, 배팅, 우편실, OCR, 통계, 일일 마감 완비**

## 🌐 접속 정보

- **도메인**: manager-exit.cloud (예정)
- **데모 URL**: https://3000-izz2akoud4rd9s8t7plxq-b32ec7bb.sandbox.novita.ai
- **데모 계정**: admin@prison-books.kr / admin123

## 📋 프로젝트 개요

엑시트 시스템은 티켓 기반 업무 처리, 회원 관리, 도서 재고 관리, 포인트 시스템, **폴더 배팅 시스템** (단폴더/다폴더), 그리고 **AI 기반 우편실 시스템**을 지원하는 통합 관리 플랫폼입니다.

## ✨ 주요 기능

### 🆕 0️⃣ 우편실 시스템 (v8.7) 🎉 **NEW**

**우편물 수령 및 업로드**:
- 다중 이미지 업로드 (JPG, PNG, GIF, WEBP)
- 이미지 미리보기 및 삭제
- 실시간 R2 스토리지 업로드
- 파일 크기 제한: 10MB

**AI 기반 OCR 처리**:
- Cloudflare AI Workers 통합 (@cf/unum/uform-gen2-qwen-500m)
- 한글/영어 자동 텍스트 추출
- 편지 봉투 자동 감지 (키워드 기반)
- 케이스 타입 자동 판단:
  - 📧 **새 케이스**: 봉투 감지됨 (신규 회원 또는 새 문의)
  - 📄 **연속 케이스**: 봉투 없음 (기존 티켓 추가 자료)

**검수 및 배당 워크플로우**:
- OCR 결과 검토 화면
- 실시간 티켓 검색 (번호/회원명)
- **다중 티켓 배당**: 여러 티켓에 동시 배당 가능
- 티켓 선택/제거 UI
- 이미지 및 OCR 결과 통합 표시

**이미지 뷰어**:
- 전체화면 모달 뷰어
- 확대/축소 (±20%)
- 90도 회전
- 초기화 기능

**우편물 상태 관리**:
- received → ocr_processing → ocr_completed → inspection → assigned → completed

**기술 스택**:
- Cloudflare R2: 이미지 스토리지
- Cloudflare AI Workers: OCR 처리
- Cloudflare D1: 우편물 메타데이터

### 1️⃣ 인증 및 직원 관리
**직원 로그인**:
- 이메일/비밀번호 인증
- 관리자/일반 직원 구분
- 세션 관리

**직원 등록** (완성):
- 이름, 이메일, 비밀번호 (필수)
- 권한 설정 (관리자/일반 직원)
- 이메일 형식 검증
- 비밀번호 6자 이상 + 확인

**직원 수정/삭제** (완성):
- 직원 카드 클릭으로 상세 모달 오픈
- 이름, 이메일, 권한 수정
- 비밀번호 변경 (선택)
- 업무 통계 확인 (배정/완료/완료율/출근일수)
- 직원 삭제 (자기 자신 제외)

**출근/퇴근 관리**:
- 출근 기록 (시간 표시)
- 우표 사용량 및 업무 보고
- 퇴근 시간 자동 기록

### 2️⃣ 티켓 관리
**티켓 생성** ✨ NEW:
- 티켓 유형 선택 (5가지) - 우편 검수 제거 ✅ v8.6
- 제목 및 설명 입력
- 회원 선택 (ORDER, POINT_ADJUSTMENT, MEMBER 유형)
- 우선순위 설정 (일반/긴급)
- 담당자 배정
- 포인트 조정 시 상세 설정 (유형, 조정타입, 금액)

**티켓 상세 모달** ✨ NEW (v8.1):
- **티켓 정보 탭**: 기본 정보, 상태 변경, 우선순위, 담당자 재배정
- **댓글 탭**: 
  - 댓글 작성 및 목록 조회
  - **답변 템플릿 시스템** (v8.3): 주문 접수, 처리 중, 발송 완료, 포인트 조정 등 7가지 빠른 답변
  - 실시간 댓글 업데이트
- **배팅 탭**: 경기 선택, 배팅 접수, 배팅 내역

**티켓 유형**:
- 주문 (ORDER)
- 문의 (INQUIRY)
- 발주 (PURCHASE_ORDER)
- 포인트 조정 (POINT_ADJUSTMENT)
- 회원 관리 (MEMBER)

**티켓 라이프사이클**:
- 미배정 (open) → 배정됨 (assigned) → 처리중 (in_progress) → 완료 (completed) → 종료 (closed)

**우선순위**: 긴급 / 높음 / 보통 / 낮음

### 3️⃣ 회원 관리 ✨ NEW
**회원 등록** (완성):
- 이름, 교도소, 수감번호 (필수)
- 사서함 주소, 입금자명
- 초기 포인트 설정 (일반/배팅)
- 메모 입력

**회원 상세** (완성):
- 기본 정보 조회 (수감번호, 사서함, 입금자명, 가입일, 상태)
- 포인트 현황 (일반/배팅/동결)
- 포인트 거래 내역 (최근 50건)
- 티켓 이력 (최근 20건)
- 회원 카드 클릭으로 상세 모달 오픈

**이중 포인트 시스템**:
- **일반 포인트**: 도서 주문용
- **배팅 포인트**: 배팅 전용
- **동결 포인트**: 관리자 승인 대기

### 4️⃣ 도서 관리 ✨ NEW
**도서 등록** (완성):
- 제목, 가격 (필수)
- 저자, 출판사, ISBN (선택)
- 초기 재고 설정
- 도서 설명/메모

**도서 수정/삭제** (완성):
- 도서 카드 클릭으로 상세 모달 오픈
- 전체 정보 수정 가능
- 재고 빠른 조정 (+10/+1/-1/-10)
- 상태 변경 (판매가능/품절/단종)
- 도서 삭제 기능

**재고 관리**:
- 실시간 재고 표시
- 재고 0일 때 자동 품절 처리
- 재고 복구 시 판매가능 자동 전환
- 상태 배지 (판매중/품절)

### 5️⃣ 포인트 관리
**포인트 종류**:
- 일반 포인트 (regular): 도서 구매 및 일반 거래
- 배팅 포인트 (betting): 배팅 전용

**거래 유형**:
- 적립 (earn): 입금, 환불 등
- 사용 (use): 도서 구매, 배팅
- 조정 (adjust): 관리자 직접 조정
- 동결 (freeze): 차감 전 승인 요청
- 동결 해제 (unfreeze): 승인 후 차감

**승인 프로세스**:
1. 직원이 포인트 동결 요청
2. 관리자 승인/거부
3. 승인 시 실제 포인트 차감 및 동결 해제

### 6️⃣ 배팅 관리 시스템 (관리자 전용) 🎲 ✨ v8.6 완전 개편

#### 경기 관리 모달 ✨ NEW
**경기 관리 버튼** (기존 '신규 배팅 등록' 버튼 대체):
- 경기 일정 등록/수정/삭제
- 경기별 배당률 입력 (홈승/무승부/원정승)
- '+' 버튼으로 경기 추가
- 한 번에 모든 경기 일괄 저장

**경기 등록 정보**:
- 경기명, 홈팀, 원정팀
- 경기 일시
- 홈 승 배당, 무승부 배당, 원정 승 배당
- 실시간 수정 및 삭제

#### 고객 배팅 목록 ✨ NEW
**상세 정보 표시**:
- 폴더 번호 및 회원 정보
- 폴더 유형 (단폴더/다폴더)
- 배팅 금액 및 총 배당률
- **예상 적중금** 자동 계산 (배팅금액 × 배당률)
- 상태 배지 (대기/당첨/낙첨)
- 경기별 상세 내역

#### 경기 정산 시스템 ✨ NEW
**정산 대시보드**:
- **완료된 경기만 표시** (미완료 경기 자동 제외)
- 경기별 배팅 통계:
  - 총 배팅 금액
  - 총 당첨 금액
  - 순수익 (배팅금액 - 당첨금액)
- 날짜별 그룹핑
- 경기 결과 및 상태

**정산 승인 기능**:
- '경기 정산' 버튼으로 모달 오픈
- 완료된 경기 목록 조회
- 배팅 금액 vs 당첨 금액 한눈에 비교
- 정산 요약 (총 배팅/당첨/수익)

#### 폴더 배팅 시스템
**단폴더 (Single Folder)**:
- 1개의 경기 선택
- 배당률: 개별 경기 배당률
- 적중 조건: 선택한 1경기 적중

**다폴더 (Multi Folder)**:
- 2개 이상의 경기 선택
- 배당률: 모든 경기 배당률 곱셈 (예: 2.0 × 1.5 × 1.8 = 5.4)
- 적중 조건: **모든 경기 적중** (하나라도 실패 시 낙첨)

**배팅 유형**:
- **승무패**: home_win / away_win / draw
- **언오버**: over / under (기준점 대비)
- **핸디캡**: handicap_home / handicap_away (핸디캡 라인 적용)

#### 자동 정산 시스템
1. 관리자가 경기 결과 입력 (홈 스코어, 원정 스코어, 결과)
2. 시스템이 모든 관련 배팅 자동 판정:
   - 승무패: 경기 결과와 비교
   - 언오버: 총점과 기준점 비교
   - 핸디캡: 핸디캡 적용 후 비교
3. 폴더 상태 자동 업데이트:
   - 단폴더: 1경기 적중 → 당첨
   - 다폴더: 모든 경기 적중 → 당첨 / 하나라도 실패 → 낙첨
4. 당첨 시 정산 승인 대기 목록 생성
5. 관리자 2차 승인 → 배팅 포인트 지급

#### 경기 취소 처리
- 경기가 취소되면 배팅 금액 자동 환불
- 다폴더에서 하나라도 취소 → 전체 폴더 취소 및 환불

#### 배팅 통계 대시보드 ✨ NEW
**전체 통계 요약**:
- 총 배팅 금액
- 총 당첨 금액
- 순수익 (마진)
- 총 배팅 건수

**회원별 통계 (상위 10명)**:
- 배팅 건수
- 배팅 금액
- 당첨률

**경기별 통계 (상위 10개)**:
- 배팅 건수
- 배팅 금액

**일별 추이**:
- 일별 배팅액
- 일별 당첨액
- 추세 분석

**기간 필터**:
- 오늘, 1주일, 1개월
- 커스텀 기간 설정

### 7️⃣ 대시보드
**일반 직원**:
- 내 배정 티켓 수
- 미배정 티켓 수
- 긴급 티켓 수
- 오늘 완료 티켓 수
- 출근/퇴근 관리

**관리자 추가**:
- 포인트 동결 승인 대기
- 배팅 정산 승인 대기
- 배팅 관리 메뉴
- 직원 관리 메뉴

### 8️⃣ 일일 마감 시스템 ✨ NEW (v8.5)
**마감 데이터 조회**:
- 날짜별 조회
- 티켓 처리 현황 (총/완료/미처리)
- 포인트 현황 (적립/사용/순포인트)
- 배팅 현황 (배팅금액/당첨금액/마진)
- 도서 판매 현황 (주문/판매액/발송)
- 종합 요약 (총 매출/총 마진)

**마감 실행**:
- 마감 확정 (수정 불가)
- 마감 상태 표시
- 마감 담당자 기록
- 마감 일시 기록

**인쇄 기능**:
- 일일 마감 리포트 출력
- 모든 통계 포함
- 인쇄 최적화 레이아웃
- 생성 일시 및 담당자 표시

**월간 리포트**:
- 월별 마감 기록 조회
- 월간 합계 (매출/마진/티켓)
- 일별 상세 기록

## 🗄️ 데이터베이스 구조

### 주요 테이블
- `staff`: 직원 정보 (email, password, role)
- `attendance`: 출근 기록
- `members`: 회원 정보 (points, betting_points, frozen_points)
- `tickets`: 티켓 정보
- `ticket_comments`: 티켓 댓글/답변
- `books`: 도서 정보
- `orders`: 주문 내역
- `order_items`: 주문 상세
- `point_transactions`: 포인트 거래 내역
- `matches`: 경기 정보 (승무패/언오버/핸디캡 배당률)
- `bet_folders`: 배팅 폴더 (단폴더/다폴더)
- `bets`: 배팅 상세 (폴더 내 개별 경기 배팅)
- `bet_settlements`: 배팅 정산 내역
- `response_templates`: 답변 템플릿
- `daily_closings`: 일일 마감 기록

### 포인트 시스템 구조
```
member
  ├─ points (일반 포인트)
  ├─ betting_points (배팅 포인트)
  └─ frozen_points (동결 포인트)

point_transactions
  ├─ point_type: 'regular' | 'betting'
  ├─ transaction_type: 'earn' | 'use' | 'adjust' | 'freeze' | 'unfreeze'
  ├─ status: 'pending' | 'completed' | 'rejected'
  └─ amount, balance_after, description
```

### 배팅 시스템 구조
```
match (경기)
  ├─ 승무패: home_odds, away_odds, draw_odds
  ├─ 언오버: over_line, over_odds, under_odds
  ├─ 핸디캡: handicap_line, handicap_home_odds, handicap_away_odds
  └─ result, home_score, away_score, total_score

bet_folder (배팅 폴더)
  ├─ folder_type: 'single' (단폴더) | 'multi' (다폴더)
  ├─ total_bet_amount (배팅 금액)
  ├─ total_odds (총 배당률)
  ├─ potential_win (예상 당첨금)
  ├─ status: 'pending' | 'win' | 'lose' | 'cancelled'
  └─ result_status: 'all_win' | 'partial_win' | 'all_lose'

bet (개별 배팅)
  ├─ folder_id
  ├─ match_id
  ├─ bet_type: 'home_win' | 'away_win' | 'draw' | 'over' | 'under' | 'handicap_home' | 'handicap_away'
  ├─ odds (배당률)
  └─ status: 'pending' | 'win' | 'lose' | 'cancelled'

bet_settlement (정산)
  ├─ folder_id
  ├─ settlement_amount (정산금액)
  ├─ status: 'pending' | 'approved' | 'rejected'
  └─ approved_by, approved_at
```

## 🛠️ 기술 스택

- **백엔드**: Hono + Cloudflare Workers
- **데이터베이스**: Cloudflare D1 (SQLite)
- **프론트엔드**: Vanilla JavaScript + Tailwind CSS + Font Awesome
- **배포**: Cloudflare Pages

## 📦 설치 및 실행

### 로컬 개발 환경

```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npm run db:migrate:local

# 빌드
npm run build

# 개발 서버 시작 (PM2)
pm2 start ecosystem.config.cjs

# 서버 상태 확인
pm2 list

# 로그 확인
pm2 logs exit-system --nostream
```

### 배포 (Cloudflare Pages)

```bash
# 빌드
npm run build

# 배포
npm run deploy
```

## 📝 API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/change-password` - 비밀번호 변경

### 출근 관리
- `POST /api/attendance/checkin` - 출근
- `POST /api/attendance/checkout` - 퇴근
- `GET /api/attendance/status/:staff_id` - 출근 상태
- `GET /api/attendance/history/:staff_id` - 출근 기록

### 회원 관리
- `GET /api/members` - 회원 목록
- `GET /api/members/:id` - 회원 상세
- `POST /api/members` - 회원 등록
- `PATCH /api/members/:id` - 회원 수정
- `DELETE /api/members/:id` - 회원 삭제

### 티켓 관리
- `GET /api/tickets` - 티켓 목록
- `GET /api/tickets/:id` - 티켓 상세
- `POST /api/tickets` - 티켓 생성
- `PATCH /api/tickets/:id` - 티켓 수정
- `POST /api/tickets/:id/comments` - 댓글 추가
- `GET /api/tickets/stats/dashboard` - 대시보드 통계

### 도서 관리
- `GET /api/books` - 도서 목록
- `POST /api/books` - 도서 등록
- `PATCH /api/books/:id` - 도서 수정
- `DELETE /api/books/:id` - 도서 삭제

### 포인트 관리
- `POST /api/points/freeze` - 포인트 동결 요청
- `GET /api/points/pending` - 승인 대기 목록
- `POST /api/points/approve/:id` - 포인트 승인/거부
- `POST /api/points/adjust` - 포인트 직접 조정

### 배팅 관리 ✨ v8.6 업데이트
**경기**:
- `GET /api/betting/matches` - 경기 목록 (status 필터 지원)
- `POST /api/betting/matches` - 경기 등록
- `POST /api/betting/matches/bulk` - 경기 일괄 저장 ✨ NEW
- `DELETE /api/betting/matches/:id` - 경기 삭제 ✨ NEW
- `POST /api/betting/matches/:id/result` - 경기 결과 입력

**배팅 폴더**:
- `POST /api/betting/folders` - 배팅 폴더 생성 (단폴더/다폴더)
- `GET /api/betting/folders` - 배팅 폴더 목록

**정산**:
- `GET /api/betting/settlements/pending` - 정산 승인 대기
- `GET /api/betting/settlement-stats` - 정산 통계 ✨ NEW
- `POST /api/betting/settlements/:id/approve` - 정산 승인
- `POST /api/betting/settlements/:id/reject` - 정산 거부

### 직원 관리
- `GET /api/staff` - 직원 목록
- `GET /api/staff/:id` - 직원 상세
- `POST /api/staff` - 직원 등록
- `PATCH /api/staff/:id` - 직원 수정
- `DELETE /api/staff/:id` - 직원 삭제
- `GET /api/staff/:id/stats` - 직원 업무 통계

## 🎯 배팅 시스템 예시

### 단폴더 배팅
```
경기: 맨체스터 vs 리버풀
배팅: 홈 승 (배당률 2.0)
배팅 금액: 10,000원
예상 당첨금: 20,000원

결과: 맨체스터 승리
→ 당첨! 20,000원 지급
```

### 다폴더 배팅
```
경기 1: 맨체스터 vs 리버풀 - 홈 승 (배당률 2.0)
경기 2: 첼시 vs 아스널 - 원정 승 (배당률 1.5)
경기 3: 토트넘 vs 뉴캐슬 - 오버 2.5 (배당률 1.8)

배팅 금액: 10,000원
총 배당률: 2.0 × 1.5 × 1.8 = 5.4
예상 당첨금: 54,000원

결과: 
- 경기 1: 맨체스터 승리 ✅
- 경기 2: 아스널 승리 ❌
- 경기 3: 총점 3 (오버) ✅

→ 낙첨! (1경기 실패)
```

## 📊 시스템 특징

### 보안
- 직원 인증 시스템
- 권한 기반 접근 제어 (관리자/일반 직원)
- 포인트 거래 승인 프로세스

### 자동화
- 배팅 자동 판정 및 정산
- 재고 자동 업데이트
- 포인트 거래 내역 자동 기록
- 일일 마감 통계 자동 집계

### 감사 추적
- 모든 포인트 거래 기록
- 티켓 처리 이력
- 배팅 및 정산 내역
- 일일 마감 기록 및 담당자

## 🆕 v8.6 업데이트 내역 (2026-02-06)

### 배팅 관리 시스템 완전 개편
1. **경기 관리 모달**:
   - '신규 배팅 등록' 버튼 제거
   - '경기 관리' 버튼 추가
   - 경기 등록/수정/삭제 통합 관리
   - 배당률 실시간 입력
   - '+' 버튼으로 경기 추가
   - 한 번에 모든 경기 저장

2. **고객 배팅 목록 개선**:
   - 상세 정보 표시 (금액, 배당률, 예상 적중금)
   - 상태별 색상 구분
   - 경기별 상세 내역
   - 폴더 유형 명확히 표시

3. **경기 정산 시스템**:
   - 완료된 경기만 필터링
   - 배팅금액 vs 당첨금액 비교
   - 순수익 자동 계산
   - 경기별 통계 제공
   - 정산 요약 대시보드

4. **백엔드 API 추가**:
   - `POST /api/betting/matches/bulk` - 경기 일괄 저장
   - `DELETE /api/betting/matches/:id` - 경기 삭제
   - `GET /api/betting/settlement-stats` - 정산 통계
   - `GET /api/betting/matches?status=completed` - 완료 경기 통계

5. **UI/UX 개선**:
   - 티켓 유형에서 '우편 검수' 제거
   - 배팅 목록 레이아웃 개선
   - 경기 정산 모달 추가
   - 색상 코딩으로 가독성 향상

## 🔜 향후 개선 계획

- [x] ~~일일 마감 기능~~ ✅ v8.5 완료
- [x] ~~배팅 관리 시스템 개편~~ ✅ v8.6 완료
- [ ] 엑셀 내보내기 (회원, 티켓, 통계)
- [ ] Cloudflare Pages 프로덕션 배포
- [ ] 실시간 알림 시스템 (SSE 또는 Polling)
- [ ] 고급 검색 및 필터링
- [ ] 모바일 반응형 최적화
- [ ] Cloudflare AI OCR 통합 (우편 자동 인식)
- [ ] R2 Storage 연동 (파일 관리)

## 📄 라이센스

MIT License

## 👥 개발자

EXIT 시스템 개발팀

---

**버전**: 8.7 (Mailroom System)  
**최종 업데이트**: 2026-02-06  
**상태**: ✅ 정상 작동 중  
**최신 백업**: https://www.genspark.ai/api/files/s/vdEUbw7r (1.35 MB - Phase 1-7 완료)  
**주요 변경사항**:
- ✅ Cloudflare R2 Storage 통합
- ✅ Cloudflare AI Workers OCR (Multilingual)
- ✅ 케이스 타입 자동 판단 (새 케이스/연속 케이스)
- ✅ 다중 티켓 배당 시스템
- ✅ 고급 이미지 뷰어 (확대/축소/회전)
