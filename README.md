# 엑시트 시스템 (EXIT System) v8.0 ✅ 완성

**통합 관리 시스템 - 모든 핵심 기능 완성**

## 🌐 접속 정보

- **도메인**: manager-exit.cloud (예정)
- **데모 URL**: https://3000-izz2akoud4rd9s8t7plxq-b32ec7bb.sandbox.novita.ai
- **데모 계정**: admin@prison-books.kr / admin123

## 📋 프로젝트 개요

엑시트 시스템은 티켓 기반 업무 처리, 회원 관리, 도서 재고 관리, 포인트 시스템, 그리고 **폴더 배팅 시스템** (단폴더/다폴더)을 지원하는 통합 관리 플랫폼입니다.

## ✨ 주요 기능

### 1️⃣ 인증 및 직원 관리 ✨ NEW
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
- 티켓 유형 선택 (6가지)
- 제목 및 설명 입력
- 회원 선택 (ORDER, POINT_ADJUSTMENT, MEMBER 유형)
- 우선순위 설정 (일반/긴급)
- 담당자 배정
- 포인트 조정 시 상세 설정 (유형, 조정타입, 금액)

**티켓 유형**:
- 주문 (ORDER)
- 문의 (INQUIRY)
- 발주 (PURCHASE_ORDER)
- 포인트 조정 (POINT_ADJUSTMENT)
- 회원 관리 (MEMBER)
- 우편 검수 (MAIL_INSPECTION)

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

### 6️⃣ 배팅 관리 시스템 (관리자 전용) 🎲

#### 경기 등록
- 경기명, 일시, 홈/원정팀
- **승무패 배당률**: 홈 승, 원정 승, 무승부
- **언오버 배당률**: Over/Under + 기준점 (예: 2.5)
- **핸디캡 배당률**: 핸디캡 라인 + 홈/원정 배당률

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

### 배팅 관리
**경기**:
- `GET /api/betting/matches` - 경기 목록
- `POST /api/betting/matches` - 경기 등록
- `POST /api/betting/matches/:id/result` - 경기 결과 입력

**배팅 폴더**:
- `POST /api/betting/folders` - 배팅 폴더 생성 (단폴더/다폴더)
- `GET /api/betting/folders` - 배팅 폴더 목록

**정산**:
- `GET /api/betting/settlements/pending` - 정산 승인 대기
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

### 감사 추적
- 모든 포인트 거래 기록
- 티켓 처리 이력
- 배팅 및 정산 내역

## 🔜 향후 개선 계획

- [ ] 실시간 알림 시스템 (WebSocket)
- [ ] Cloudflare AI OCR 연동
- [ ] R2 Storage 이미지 저장
- [ ] 드래그앤드롭 칸반 보드
- [ ] 고급 검색 및 필터링
- [ ] 모바일 앱 대응
- [ ] 엑셀 내보내기 기능
- [ ] 답변 템플릿 시스템 확장
- [ ] 배팅 통계 및 분석

## 📄 라이센스

MIT License

## 👥 개발자

EXIT 시스템 개발팀

---

**버전**: 1.0.0  
**최종 업데이트**: 2026-02-06  
**상태**: ✅ 정상 작동 중
