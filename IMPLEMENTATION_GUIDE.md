# EXIT System 상세 구현 가이드
## 📅 작성일: 2026-02-14

---

## 📋 목차
1. [데이터베이스 스키마 상세](#데이터베이스-스키마-상세)
2. [API 엔드포인트 전체 목록](#api-엔드포인트-전체-목록)
3. [프론트엔드 컴포넌트 상세 설계](#프론트엔드-컴포넌트-상세-설계)
4. [타입 정의 전체](#타입-정의-전체)
5. [구현 예시 코드](#구현-예시-코드)
6. [마이그레이션 파일 분석](#마이그레이션-파일-분석)
7. [Git 커밋 히스토리 분석](#git-커밋-히스토리-분석)

---

## 1. 데이터베이스 스키마 상세

### 1.1 staff (직원)
```sql
CREATE TABLE staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'staff', 'viewer')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기본 관리자 계정
INSERT INTO staff (email, password, name, role) VALUES 
  ('admin@manager-exit.cloud', 'admin123', '관리자', 'admin');
```

**역할 권한**:
- `admin`: 모든 권한 (직원 관리, 일일 마감, 데이터 삭제)
- `manager`: 대부분 권한 (직원 관리 제외)
- `staff`: 일반 업무 (티켓, 회원, 배팅 관리)
- `viewer`: 읽기 전용

### 1.2 attendance (출퇴근 기록)
```sql
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  checkin_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  checkout_time DATETIME,
  stamps_used INTEGER DEFAULT 0,
  daily_report TEXT,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE INDEX idx_attendance_staff_id ON attendance(staff_id);
CREATE INDEX idx_attendance_date ON attendance(checkin_time);
```

### 1.3 members (수용자 회원)
```sql
CREATE TABLE members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  institution TEXT NOT NULL,          -- 수용기관
  inmate_number TEXT NOT NULL,        -- 수용번호
  member_number TEXT UNIQUE,          -- 회원번호 (자동 생성)
  po_box_address TEXT,                -- 사서함 주소
  depositor_name TEXT,                -- 예금주명
  points INTEGER DEFAULT 0,           -- 일반 포인트
  betting_points INTEGER DEFAULT 0,   -- 배팅 포인트
  frozen_points INTEGER DEFAULT 0,    -- 동결 포인트 (배팅 대기 중)
  status TEXT DEFAULT 'active',       -- active/inactive
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_members_name ON members(name);
CREATE INDEX idx_members_inmate_number ON members(inmate_number);
CREATE INDEX idx_members_institution ON members(institution);
CREATE UNIQUE INDEX idx_members_member_number ON members(member_number) WHERE member_number IS NOT NULL;
```

**포인트 시스템**:
- `points`: 일반 포인트 (도서 구매, 서비스 이용)
- `betting_points`: 배팅 전용 포인트
- `frozen_points`: 배팅 대기 중 동결된 포인트

### 1.4 tickets (티켓 시스템)
```sql
CREATE TABLE tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT UNIQUE,          -- T20260214001 형식
  title TEXT NOT NULL,
  description TEXT,
  member_id INTEGER,
  ticket_type TEXT NOT NULL,          -- GENERAL/BOOK_ORDER/BETTING/MAILROOM/POINT_REQUEST
  status TEXT DEFAULT 'open',         -- open/assigned/in_progress/completed/closed
  priority TEXT DEFAULT 'normal',     -- urgent/high/normal/low
  assigned_to INTEGER,
  created_by INTEGER,
  mailroom_id INTEGER,                -- 우편물 연결
  image_keys TEXT,                    -- R2 이미지 키 배열 (JSON)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (assigned_to) REFERENCES staff(id),
  FOREIGN KEY (created_by) REFERENCES staff(id),
  FOREIGN KEY (mailroom_id) REFERENCES mailroom_items(id)
);

CREATE INDEX idx_tickets_member_id ON tickets(member_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_ticket_type ON tickets(ticket_type);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
```

**티켓 타입**:
- `GENERAL`: 일반 민원
- `BOOK_ORDER`: 도서 주문
- `BETTING`: 배팅 요청
- `MAILROOM`: 우편물 처리
- `POINT_REQUEST`: 포인트 요청

**티켓 상태 흐름**:
```
open → assigned → in_progress → completed → closed
```

### 1.5 ticket_comments (댓글)
```sql
CREATE TABLE ticket_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
```

### 1.6 ticket_items (티켓 세부 항목)
```sql
CREATE TABLE ticket_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  item_type TEXT NOT NULL,            -- BETTING/BOOK/POINT
  item_data TEXT,                     -- JSON 데이터
  status TEXT DEFAULT 'pending',      -- pending/processed/cancelled
  processed_by INTEGER,
  processed_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (processed_by) REFERENCES staff(id)
);

CREATE INDEX idx_ticket_items_ticket_id ON ticket_items(ticket_id);
CREATE INDEX idx_ticket_items_item_type ON ticket_items(item_type);
CREATE INDEX idx_ticket_items_status ON ticket_items(status);
```

### 1.7 mailroom_items (우편물)
```sql
CREATE TABLE mailroom_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mail_number TEXT UNIQUE,            -- MAIL20260214001 형식
  member_id INTEGER,
  ticket_id INTEGER,
  image_keys TEXT,                    -- R2 이미지 키 배열 (JSON)
  ocr_result TEXT,                    -- OCR 결과 (JSON)
  status TEXT DEFAULT 'received',     -- received/ocr_processing/ocr_completed/assigned/completed
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

CREATE INDEX idx_mailroom_items_member_id ON mailroom_items(member_id);
CREATE INDEX idx_mailroom_items_ticket_id ON mailroom_items(ticket_id);
CREATE INDEX idx_mailroom_items_status ON mailroom_items(status);
CREATE INDEX idx_mailroom_items_created_at ON mailroom_items(created_at);
```

**OCR 결과 구조**:
```json
{
  "recipient": {
    "name": "홍길동",
    "institution": "서울구치소",
    "inmate_number": "2024-1234",
    "po_box_address": "서울특별시 송파구 잠실동 123-45"
  },
  "sender": {
    "name": "김철수",
    "address": "부산광역시 해운대구 우동 67-89"
  },
  "content_summary": "가족 안부 및 생활비 송금 요청",
  "category": "FAMILY",
  "detected_envelopes": 1
}
```

### 1.8 matches (배팅 경기)
```sql
CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_name TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_date DATETIME NOT NULL,
  home_odds REAL,                     -- 홈 승 배당률
  draw_odds REAL,                     -- 무승부 배당률
  away_odds REAL,                     -- 원정 승 배당률
  handicap_line REAL,                 -- 핸디캡 기준점
  over_odds REAL,                     -- 오버 배당률
  under_odds REAL,                    -- 언더 배당률
  status TEXT DEFAULT 'scheduled',    -- scheduled/in_progress/completed/cancelled
  home_score INTEGER,
  away_score INTEGER,
  result TEXT,                        -- home/draw/away
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_match_date ON matches(match_date);
```

### 1.9 bet_folders (배팅 폴더)
```sql
CREATE TABLE bet_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_number TEXT UNIQUE,          -- BET20260214001 형식
  ticket_id INTEGER,
  member_id INTEGER NOT NULL,
  folder_type TEXT NOT NULL,          -- single/multi
  total_bet_amount INTEGER NOT NULL,
  total_odds REAL NOT NULL,
  potential_win INTEGER NOT NULL,     -- 예상 당첨금
  status TEXT DEFAULT 'pending',      -- pending/win/lose/cancelled
  result_status TEXT DEFAULT 'waiting', -- waiting/settled
  settled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE INDEX idx_bet_folders_member_id ON bet_folders(member_id);
CREATE INDEX idx_bet_folders_status ON bet_folders(status);
CREATE INDEX idx_bet_folders_created_at ON bet_folders(created_at);
```

**폴더 타입**:
- `single`: 단폴더 (1개 경기)
- `multi`: 다폴더 (2개 이상 경기)

### 1.10 bets (개별 배팅)
```sql
CREATE TABLE bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  bet_type TEXT NOT NULL,             -- home/draw/away/over/under/handicap_home/handicap_away
  odds REAL NOT NULL,
  status TEXT DEFAULT 'pending',      -- pending/win/lose
  FOREIGN KEY (folder_id) REFERENCES bet_folders(id),
  FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE INDEX idx_bets_folder_id ON bets(folder_id);
CREATE INDEX idx_bets_match_id ON bets(match_id);
```

### 1.11 bet_settlements (배팅 정산)
```sql
CREATE TABLE bet_settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id INTEGER NOT NULL UNIQUE,
  win_amount INTEGER NOT NULL,
  settled_by INTEGER NOT NULL,
  settled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (folder_id) REFERENCES bet_folders(id),
  FOREIGN KEY (settled_by) REFERENCES staff(id)
);

CREATE INDEX idx_bet_settlements_settled_at ON bet_settlements(settled_at);
```

### 1.12 books (도서)
```sql
CREATE TABLE books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  isbn TEXT UNIQUE,
  price INTEGER NOT NULL,
  stock INTEGER DEFAULT 0,
  status TEXT DEFAULT 'available',    -- available/out_of_stock/discontinued
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_status ON books(status);
```

### 1.13 orders (주문)
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE,           -- ORDER20260214001 형식
  member_id INTEGER NOT NULL,
  ticket_id INTEGER,
  total_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',      -- pending/confirmed/shipped/delivered/cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE INDEX idx_orders_member_id ON orders(member_id);
CREATE INDEX idx_orders_status ON orders(status);
```

### 1.14 order_items (주문 항목)
```sql
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

### 1.15 point_transactions (포인트 거래)
```sql
CREATE TABLE point_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,     -- earned/spent/admin_add/admin_subtract/betting_freeze/betting_unfreeze
  point_type TEXT NOT NULL,           -- general/betting
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT,
  related_id INTEGER,                 -- 관련 티켓/주문/배팅 ID
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

CREATE INDEX idx_point_transactions_member_id ON point_transactions(member_id);
CREATE INDEX idx_point_transactions_created_at ON point_transactions(created_at);
```

### 1.16 response_templates (답변 템플릿)
```sql
CREATE TABLE response_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기본 답변 템플릿 (7종)
INSERT INTO response_templates (name, content, sort_order) VALUES 
  ('접수 완료', '귀하의 요청이 정상적으로 접수되었습니다.', 1),
  ('처리 중', '현재 담당자가 귀하의 요청을 처리 중입니다.', 2),
  ('보류', '추가 확인이 필요하여 일시적으로 보류되었습니다.', 3),
  ('승인', '귀하의 요청이 승인되었습니다.', 4),
  ('반려', '죄송합니다. 귀하의 요청이 반려되었습니다.', 5),
  ('완료', '귀하의 요청이 완료되었습니다.', 6),
  ('기타', '', 7);
```

### 1.17 responses (답변 관리)
```sql
CREATE TABLE responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  template_id INTEGER,
  response_type TEXT NOT NULL,        -- quick/manual
  content TEXT NOT NULL,
  recipient_name TEXT,
  recipient_institution TEXT,
  recipient_inmate_number TEXT,
  recipient_po_box TEXT,
  is_printed BOOLEAN DEFAULT 0,
  printed_at DATETIME,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (template_id) REFERENCES response_templates(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

CREATE INDEX idx_responses_ticket_id ON responses(ticket_id);
CREATE INDEX idx_responses_is_printed ON responses(is_printed);
```

### 1.18 response_settings (답변 출력 설정)
```sql
CREATE TABLE response_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  header_notice TEXT DEFAULT '귀하의 요청에 대한 답변입니다.',
  greeting TEXT DEFAULT '안녕하십니까.',
  footer TEXT DEFAULT '항상 건강하시길 바랍니다.',
  show_received_date BOOLEAN DEFAULT 1,
  date_format TEXT DEFAULT 'YYYY-MM-DD',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기본 설정
INSERT INTO response_settings (id) VALUES (1);
```

### 1.19 notifications (알림)
```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  type TEXT NOT NULL,                 -- betting_win/point_grant/system
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  priority TEXT DEFAULT 'normal',     -- high/normal/low
  is_read BOOLEAN DEFAULT 0,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE INDEX idx_notifications_staff_id ON notifications(staff_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### 1.20 modification_requests (수정 요청)
```sql
CREATE TABLE modification_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,          -- member/ticket/bet
  target_id INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',      -- pending/approved/rejected
  requested_by INTEGER NOT NULL,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requested_by) REFERENCES staff(id),
  FOREIGN KEY (reviewed_by) REFERENCES staff(id)
);

CREATE INDEX idx_modification_requests_status ON modification_requests(status);
CREATE INDEX idx_modification_requests_target ON modification_requests(target_type, target_id);
CREATE INDEX idx_modification_requests_requested_by ON modification_requests(requested_by);
```

### 1.21 staff_role_changes (역할 변경 이력)
```sql
CREATE TABLE staff_role_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  reason TEXT,
  changed_by INTEGER NOT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (changed_by) REFERENCES staff(id)
);

CREATE INDEX idx_staff_role_changes_staff_id ON staff_role_changes(staff_id);
CREATE INDEX idx_staff_role_changes_changed_at ON staff_role_changes(changed_at DESC);
```

### 1.22 daily_closings (일일 마감)
```sql
CREATE TABLE daily_closings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  closing_date DATE UNIQUE NOT NULL,
  total_tickets INTEGER DEFAULT 0,
  completed_tickets INTEGER DEFAULT 0,
  pending_tickets INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  total_points_spent INTEGER DEFAULT 0,
  net_points INTEGER DEFAULT 0,
  total_bets INTEGER DEFAULT 0,
  total_bet_amount INTEGER DEFAULT 0,
  total_win_amount INTEGER DEFAULT 0,
  betting_margin INTEGER DEFAULT 0,
  total_book_orders INTEGER DEFAULT 0,
  total_book_sales INTEGER DEFAULT 0,
  shipped_orders INTEGER DEFAULT 0,
  pending_orders INTEGER DEFAULT 0,
  total_revenue INTEGER DEFAULT 0,
  total_margin INTEGER DEFAULT 0,
  notes TEXT,
  is_closed BOOLEAN DEFAULT 0,
  closed_by INTEGER,
  closed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (closed_by) REFERENCES staff(id)
);

CREATE INDEX idx_daily_closings_closing_date ON daily_closings(closing_date DESC);
CREATE INDEX idx_daily_closings_is_closed ON daily_closings(is_closed);
CREATE INDEX idx_daily_closings_closed_by ON daily_closings(closed_by);
```

---

## 2. API 엔드포인트 전체 목록

### 2.1 인증 (auth.ts)
```typescript
POST   /api/auth/login              // 로그인
POST   /api/auth/logout             // 로그아웃
GET    /api/auth/me                 // 현재 사용자 정보
POST   /api/auth/change-password    // 비밀번호 변경
```

### 2.2 출퇴근 (attendance.ts)
```typescript
POST   /api/attendance/checkin      // 출근
POST   /api/attendance/checkout     // 퇴근
GET    /api/attendance/today        // 오늘의 출퇴근 기록
GET    /api/attendance/history      // 출퇴근 이력
```

### 2.3 회원 관리 (members.ts)
```typescript
GET    /api/members                 // 회원 목록 (페이지네이션, 검색)
GET    /api/members/:id             // 회원 상세
POST   /api/members                 // 회원 등록
PATCH  /api/members/:id             // 회원 수정
DELETE /api/members/:id             // 회원 삭제
GET    /api/members/:id/transactions // 포인트 거래 내역
GET    /api/members/:id/tickets     // 티켓 이력
GET    /api/members/:id/bets        // 배팅 이력
GET    /api/members/search          // 회원 검색 (자동완성)
```

### 2.4 티켓 관리 (tickets.ts)
```typescript
GET    /api/tickets                 // 티켓 목록
GET    /api/tickets/:id             // 티켓 상세
POST   /api/tickets                 // 티켓 생성
PATCH  /api/tickets/:id             // 티켓 수정
DELETE /api/tickets/:id             // 티켓 삭제
PATCH  /api/tickets/:id/status      // 상태 변경
PATCH  /api/tickets/:id/assign      // 담당자 배정
POST   /api/tickets/:id/comments    // 댓글 추가
GET    /api/tickets/:id/comments    // 댓글 목록
```

### 2.5 티켓 항목 (ticket-items.ts)
```typescript
GET    /api/ticket-items/:ticketId  // 티켓 항목 목록
POST   /api/ticket-items             // 항목 추가
PATCH  /api/ticket-items/:id        // 항목 수정
DELETE /api/ticket-items/:id        // 항목 삭제
```

### 2.6 우편물 처리 (mailroom.ts)
```typescript
POST   /api/mailroom/upload         // 이미지 업로드 (R2)
POST   /api/mailroom/ocr-simple     // 단일 편지 OCR
POST   /api/mailroom/ocr-detect-multiple // 다중 편지 감지
GET    /api/mailroom/items          // 우편물 목록
GET    /api/mailroom/items/:id      // 우편물 상세
PATCH  /api/mailroom/items/:id      // 우편물 수정
DELETE /api/mailroom/items/:id      // 우편물 삭제
POST   /api/mailroom/items/:id/assign // 담당자 배정 및 티켓 생성
POST   /api/mailroom/items/bulk-assign // 일괄 배정
GET    /api/mailroom/image/:key     // 이미지 조회 (R2)
```

### 2.7 배팅 관리 (betting.ts)
```typescript
// 경기 관리
GET    /api/betting/matches         // 경기 목록
GET    /api/betting/matches/:id     // 경기 상세
POST   /api/betting/matches         // 경기 등록
PATCH  /api/betting/matches/:id     // 경기 수정
DELETE /api/betting/matches/:id     // 경기 삭제
POST   /api/betting/matches/bulk    // 경기 대량 등록 (Excel)

// 배팅 폴더 관리
GET    /api/betting/folders         // 배팅 폴더 목록
GET    /api/betting/folders/:id     // 폴더 상세
POST   /api/betting/folders         // 배팅 생성
DELETE /api/betting/folders/:id     // 배팅 취소

// 정산
POST   /api/betting/settle          // 정산 실행
GET    /api/betting/settlements/pending // 대기 중인 정산
POST   /api/betting/settlements/approve/:id // 정산 승인
GET    /api/betting/settlement-stats // 정산 통계
```

### 2.8 포인트 관리 (points.ts)
```typescript
POST   /api/points/adjust           // 포인트 직접 지급/차감
POST   /api/points/freeze           // 포인트 동결 (배팅)
POST   /api/points/unfreeze         // 포인트 해제
POST   /api/points/approve/:id      // 포인트 요청 승인
GET    /api/points/pending          // 승인 대기 목록
```

### 2.9 도서 관리 (books.ts)
```typescript
GET    /api/books                   // 도서 목록
GET    /api/books/:id               // 도서 상세
POST   /api/books                   // 도서 등록
PATCH  /api/books/:id               // 도서 수정
DELETE /api/books/:id               // 도서 삭제

// 주문 관리
GET    /api/books/orders            // 주문 목록
POST   /api/books/orders            // 주문 생성
PATCH  /api/books/orders/:id        // 주문 상태 변경
```

### 2.10 직원 관리 (staff_management.ts)
```typescript
GET    /api/staff                   // 직원 목록
GET    /api/staff/:id               // 직원 상세
POST   /api/staff                   // 직원 등록
PATCH  /api/staff/:id               // 직원 수정
DELETE /api/staff/:id               // 직원 삭제
PATCH  /api/staff/:id/role          // 역할 변경
GET    /api/staff/:id/role-changes  // 역할 변경 이력
GET    /api/staff/stats             // 직원 통계
```

### 2.11 답변 관리 (responses.ts)
```typescript
GET    /api/responses/pending       // 답변 대상 티켓 목록
POST   /api/responses               // 답변 생성
PATCH  /api/responses/:id           // 답변 수정
DELETE /api/responses/:id           // 답변 삭제
POST   /api/responses/:id/print     // 답변 인쇄 처리

// 답변 템플릿
GET    /api/responses/templates     // 템플릿 목록
POST   /api/responses/templates     // 템플릿 추가
PATCH  /api/responses/templates/:id // 템플릿 수정
DELETE /api/responses/templates/:id // 템플릿 삭제

// 답변 설정
GET    /api/responses/settings      // 설정 조회
PUT    /api/responses/settings      // 설정 업데이트
```

### 2.12 일일 마감 (closing.ts)
```typescript
GET    /api/closing                 // 마감 데이터 조회
POST   /api/closing                 // 마감 실행
GET    /api/closing/history         // 마감 이력
GET    /api/closing/:id             // 특정 마감 데이터
```

### 2.13 알림 (notifications.ts)
```typescript
GET    /api/notifications           // 알림 목록
PATCH  /api/notifications/:id/read  // 읽음 처리
DELETE /api/notifications/:id       // 알림 삭제
POST   /api/notifications/read-all  // 전체 읽음 처리
```

### 2.14 수정 요청 (modifications.ts)
```typescript
GET    /api/modifications           // 수정 요청 목록
POST   /api/modifications           // 수정 요청 생성
POST   /api/modifications/:id/approve // 승인
POST   /api/modifications/:id/reject  // 거부
```

---

## 3. 프론트엔드 컴포넌트 상세 설계

### 3.1 레이아웃 컴포넌트

#### Header.tsx
```typescript
interface HeaderProps {
  user: User
  onLogout: () => void
}

// 기능:
// - 로고 표시
// - 사용자 정보 (이름, 역할)
// - 알림 아이콘 + 배지
// - 로그아웃 버튼
```

#### Sidebar.tsx
```typescript
interface SidebarProps {
  currentView: string
  onNavigate: (view: string) => void
  userRole: string
}

// 메뉴 항목:
// - 대시보드
// - 티켓 관리
// - 회원 관리
// - 도서 관리
// - 우편물 처리
// - 배팅 관리
// - 답변 관리
// - 직원 관리 (admin, manager만)
// - 일일 마감 (admin만)
```

### 3.2 티켓 관리 컴포넌트

#### TicketList.tsx
```typescript
interface TicketListProps {
  filters: {
    status: string
    type: string
    search: string
    assignedTo: number | null
  }
  onFilterChange: (filters: any) => void
}

// 기능:
// - 필터링 (상태, 타입, 담당자)
// - 검색
// - 페이지네이션
// - 정렬
// - 티켓 카드 클릭 → 상세 모달 열기
```

#### TicketDetail.tsx
```typescript
interface TicketDetailProps {
  ticketId: number
  onClose: () => void
  onUpdate: () => void
}

// 탭 구조:
// 1. 기본 정보
// 2. 회원 관리
// 3. 상태 변경
// 4. 댓글
// 5. 이미지 갤러리
// 6. 이력
```

#### CreateTicketModal.tsx
```typescript
interface CreateTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateTicketInput) => Promise<void>
}

// 입력 필드:
// - 제목 (required)
// - 설명
// - 회원 선택 (자동완성)
// - 담당자 선택
// - 우선순위
// - 티켓 타입
// - 이미지 업로드
```

### 3.3 회원 관리 컴포넌트

#### MemberList.tsx
```typescript
interface MemberListProps {
  viewMode: 'card' | 'list'
  onViewModeChange: (mode: 'card' | 'list') => void
}

// 기능:
// - 카드형/리스트형 토글
// - 검색 (이름, 수용번호, 기관)
// - 페이지네이션
// - 회원 클릭 → 상세 모달
```

#### MemberDetail.tsx
```typescript
interface MemberDetailProps {
  memberId: number
  onClose: () => void
  onUpdate: () => void
}

// 탭 구조:
// 1. 기본 정보
// 2. 포인트 내역
// 3. 거래 내역
// 4. 티켓 이력
// 5. 배팅 이력
```

### 3.4 우편물 처리 컴포넌트

#### MailUpload.tsx
```typescript
interface MailUploadProps {
  onUploadComplete: () => void
}

// 기능:
// - 다중 이미지 업로드 (최대 10개)
// - 드래그 앤 드롭
// - 미리보기
// - 업로드 진행률
// - OCR 처리 자동 시작
```

#### WaitingTab.tsx
```typescript
interface WaitingTabProps {
  items: MailroomItem[]
  onRefresh: () => void
}

// 기능:
// - OCR 처리 중인 우편물 목록
// - 실시간 상태 업데이트
// - 자동 새로고침 (5초)
```

#### InspectionTab.tsx
```typescript
interface InspectionTabProps {
  items: MailroomItem[]
  onAssign: (item: MailroomItem) => void
  onBulkAssign: (items: MailroomItem[]) => void
}

// 기능:
// - OCR 결과 확인/수정
// - 회원 자동 매칭
// - 신규 회원 등록
// - 담당자 배정
// - 일괄 처리 (다중 선택)
```

#### ImageViewer.tsx
```typescript
interface ImageViewerProps {
  images: string[]
  currentIndex: number
  onClose: () => void
}

// 기능:
// - 확대/축소 (마우스 휠)
// - 회전 (90도씩)
// - 팬 (드래그)
// - 전체화면
// - 썸네일 네비게이션
// - 이전/다음 버튼
```

### 3.5 배팅 관리 컴포넌트

#### BettingList.tsx
```typescript
interface BettingListProps {
  filters: {
    status: string
    memberId: number | null
    dateRange: [Date, Date]
  }
}

// 표시 정보:
// - 폴더 번호
// - 회원 이름
// - 배팅 타입
// - 총 배팅금액
// - 총 배당률
// - 예상 당첨금
// - 상태
```

#### MatchManagement.tsx
```typescript
interface MatchManagementProps {
  matches: Match[]
  onAdd: (match: Match) => Promise<void>
  onUpdate: (id: number, match: Match) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onBulkUpload: (file: File) => Promise<void>
}

// 기능:
// - 엑셀 형태 테이블
// - 인라인 편집
// - 경기 추가
// - Excel 업로드 (SheetJS)
// - 템플릿 다운로드
```

#### CreateBettingModal.tsx
```typescript
interface CreateBettingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateBettingInput) => Promise<void>
}

// 단계:
// 1. 회원 선택
// 2. 경기 선택 (다중)
// 3. 배팅 타입 선택 (각 경기별)
// 4. 배팅 금액 입력
// 5. 예상 배당률 및 당첨금 계산
// 6. 확인 및 생성
```

#### SettlementPanel.tsx
```typescript
interface SettlementPanelProps {
  completedMatches: Match[]
  onSettle: (matchId: number) => Promise<void>
}

// 기능:
// - 완료된 경기 목록
// - 경기 결과 입력
// - 정산 실행
// - 정산 통계
```

---

## 4. 타입 정의 전체

### 4.1 auth.ts
```typescript
export interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'manager' | 'staff' | 'viewer'
  created_at: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}
```

### 4.2 ticket.ts
```typescript
export type TicketType = 'GENERAL' | 'BOOK_ORDER' | 'BETTING' | 'MAILROOM' | 'POINT_REQUEST'
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'closed'
export type TicketPriority = 'urgent' | 'high' | 'normal' | 'low'

export interface Ticket {
  id: number
  ticket_number: string
  title: string
  description: string | null
  member_id: number | null
  member?: Member
  ticket_type: TicketType
  status: TicketStatus
  priority: TicketPriority
  assigned_to: number | null
  assigned_staff?: User
  created_by: number
  creator?: User
  mailroom_id: number | null
  image_keys: string | null  // JSON array
  created_at: string
  updated_at: string
}

export interface CreateTicketInput {
  title: string
  description?: string
  member_id?: number
  ticket_type: TicketType
  priority?: TicketPriority
  assigned_to?: number
  image_keys?: string[]
}

export interface UpdateTicketInput {
  title?: string
  description?: string
  member_id?: number
  status?: TicketStatus
  priority?: TicketPriority
  assigned_to?: number
}

export interface TicketComment {
  id: number
  ticket_id: number
  staff_id: number
  staff?: User
  comment: string
  created_at: string
}
```

### 4.3 member.ts
```typescript
export interface Member {
  id: number
  name: string
  institution: string
  inmate_number: string
  member_number: string | null
  po_box_address: string | null
  depositor_name: string | null
  points: number
  betting_points: number
  frozen_points: number
  status: 'active' | 'inactive'
  notes: string | null
  created_at: string
}

export interface CreateMemberInput {
  name: string
  institution: string
  inmate_number: string
  po_box_address?: string
  depositor_name?: string
  points?: number
  betting_points?: number
}

export interface UpdateMemberInput {
  name?: string
  institution?: string
  inmate_number?: string
  po_box_address?: string
  depositor_name?: string
  status?: 'active' | 'inactive'
  notes?: string
}

export interface PointTransaction {
  id: number
  member_id: number
  transaction_type: 'earned' | 'spent' | 'admin_add' | 'admin_subtract' | 'betting_freeze' | 'betting_unfreeze'
  point_type: 'general' | 'betting'
  amount: number
  balance_after: number
  reason: string | null
  related_id: number | null
  created_by: number | null
  created_at: string
}
```

### 4.4 betting.ts
```typescript
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type BetType = 'home' | 'draw' | 'away' | 'over' | 'under' | 'handicap_home' | 'handicap_away'
export type FolderType = 'single' | 'multi'
export type FolderStatus = 'pending' | 'win' | 'lose' | 'cancelled'
export type ResultStatus = 'waiting' | 'settled'

export interface Match {
  id: number
  match_name: string
  home_team: string
  away_team: string
  match_date: string
  home_odds: number | null
  draw_odds: number | null
  away_odds: number | null
  handicap_line: number | null
  over_odds: number | null
  under_odds: number | null
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  result: 'home' | 'draw' | 'away' | null
  created_at: string
  updated_at: string
}

export interface Bet {
  id: number
  folder_id: number
  match_id: number
  match?: Match
  bet_type: BetType
  odds: number
  status: 'pending' | 'win' | 'lose'
}

export interface BetFolder {
  id: number
  folder_number: string
  ticket_id: number | null
  member_id: number
  member?: Member
  folder_type: FolderType
  total_bet_amount: number
  total_odds: number
  potential_win: number
  status: FolderStatus
  result_status: ResultStatus
  settled_at: string | null
  created_at: string
  bets?: Bet[]
}

export interface CreateBettingInput {
  member_id: number
  ticket_id?: number
  folder_type: FolderType
  total_bet_amount: number
  bets: {
    match_id: number
    bet_type: BetType
    odds: number
  }[]
}
```

### 4.5 mailroom.ts
```typescript
export type MailroomStatus = 'received' | 'ocr_processing' | 'ocr_completed' | 'assigned' | 'completed'

export interface OCRRecipient {
  name: string
  institution: string
  inmate_number: string
  po_box_address: string
}

export interface OCRSender {
  name: string
  address: string
}

export interface OCRResult {
  recipient: OCRRecipient
  sender: OCRSender
  content_summary: string
  category: string
  detected_envelopes: number
}

export interface MailroomItem {
  id: number
  mail_number: string
  member_id: number | null
  member?: Member
  ticket_id: number | null
  ticket?: Ticket
  image_keys: string | null  // JSON array
  ocr_result: string | null  // JSON OCRResult
  status: MailroomStatus
  notes: string | null
  created_by: number
  creator?: User
  created_at: string
  updated_at: string
}

export interface UploadMailInput {
  image_files: File[]
}

export interface AssignMailInput {
  member_id: number
  assigned_to: number
  ticket_title: string
  ticket_description: string
  ticket_priority: TicketPriority
}
```

### 4.6 book.ts
```typescript
export interface Book {
  id: number
  title: string
  author: string | null
  publisher: string | null
  isbn: string | null
  price: number
  stock: number
  status: 'available' | 'out_of_stock' | 'discontinued'
  created_at: string
}

export interface Order {
  id: number
  order_number: string
  member_id: number
  member?: Member
  ticket_id: number | null
  total_amount: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: number
  order_id: number
  book_id: number
  book?: Book
  quantity: number
  unit_price: number
}
```

### 4.7 response.ts
```typescript
export interface ResponseTemplate {
  id: number
  name: string
  content: string
  sort_order: number
  created_at: string
}

export interface Response {
  id: number
  ticket_id: number
  ticket?: Ticket
  template_id: number | null
  template?: ResponseTemplate
  response_type: 'quick' | 'manual'
  content: string
  recipient_name: string | null
  recipient_institution: string | null
  recipient_inmate_number: string | null
  recipient_po_box: string | null
  is_printed: boolean
  printed_at: string | null
  created_by: number
  creator?: User
  created_at: string
}

export interface ResponseSettings {
  id: number
  header_notice: string
  greeting: string
  footer: string
  show_received_date: boolean
  date_format: string
  updated_at: string
}

export interface CreateResponseInput {
  ticket_id: number
  template_id?: number
  response_type: 'quick' | 'manual'
  content: string
  recipient_name: string
  recipient_institution: string
  recipient_inmate_number: string
  recipient_po_box: string
}
```

### 4.8 notification.ts
```typescript
export type NotificationType = 'betting_win' | 'point_grant' | 'system'
export type NotificationPriority = 'high' | 'normal' | 'low'

export interface Notification {
  id: number
  staff_id: number
  type: NotificationType
  title: string
  message: string
  link: string | null
  priority: NotificationPriority
  is_read: boolean
  read_at: string | null
  created_at: string
}
```

### 4.9 closing.ts
```typescript
export interface DailyClosing {
  id: number
  closing_date: string
  total_tickets: number
  completed_tickets: number
  pending_tickets: number
  total_points_earned: number
  total_points_spent: number
  net_points: number
  total_bets: number
  total_bet_amount: number
  total_win_amount: number
  betting_margin: number
  total_book_orders: number
  total_book_sales: number
  shipped_orders: number
  pending_orders: number
  total_revenue: number
  total_margin: number
  notes: string | null
  is_closed: boolean
  closed_by: number | null
  closer?: User
  closed_at: string | null
  created_at: string
}
```

---

## 5. 구현 예시 코드

### 5.1 API 클라이언트 (React)

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

```typescript
// src/api/auth.ts
import { apiClient } from './client'
import type { LoginInput, LoginResponse, User } from '@/types/auth'

export const authAPI = {
  async login(data: LoginInput): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/login', data)
    return response.data
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get('/auth/me')
    return response.data
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', { oldPassword, newPassword })
  },
}
```

```typescript
// src/api/tickets.ts
import { apiClient } from './client'
import type { Ticket, CreateTicketInput, UpdateTicketInput, TicketComment } from '@/types/ticket'

export const ticketAPI = {
  async getTickets(params?: {
    page?: number
    limit?: number
    status?: string
    type?: string
    search?: string
  }): Promise<{ tickets: Ticket[]; total: number; page: number; totalPages: number }> {
    const response = await apiClient.get('/tickets', { params })
    return response.data
  },

  async getTicket(id: number): Promise<Ticket> {
    const response = await apiClient.get(`/tickets/${id}`)
    return response.data
  },

  async createTicket(data: CreateTicketInput): Promise<Ticket> {
    const response = await apiClient.post('/tickets', data)
    return response.data
  },

  async updateTicket(id: number, data: UpdateTicketInput): Promise<Ticket> {
    const response = await apiClient.patch(`/tickets/${id}`, data)
    return response.data
  },

  async deleteTicket(id: number): Promise<void> {
    await apiClient.delete(`/tickets/${id}`)
  },

  async updateStatus(id: number, status: string): Promise<Ticket> {
    const response = await apiClient.patch(`/tickets/${id}/status`, { status })
    return response.data
  },

  async assignTicket(id: number, assignedTo: number): Promise<Ticket> {
    const response = await apiClient.patch(`/tickets/${id}/assign`, { assigned_to: assignedTo })
    return response.data
  },

  async getComments(id: number): Promise<TicketComment[]> {
    const response = await apiClient.get(`/tickets/${id}/comments`)
    return response.data
  },

  async addComment(id: number, comment: string): Promise<TicketComment> {
    const response = await apiClient.post(`/tickets/${id}/comments`, { comment })
    return response.data
  },
}
```

### 5.2 상태 관리 (Zustand)

```typescript
// src/stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI } from '@/api/auth'
import type { User, LoginInput } from '@/types/auth'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  login: (data: LoginInput) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (data: LoginInput) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authAPI.login(data)
          localStorage.setItem('token', response.token)
          set({ user: response.user, token: response.token, isLoading: false })
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      logout: () => {
        authAPI.logout().catch(console.error)
        localStorage.removeItem('token')
        set({ user: null, token: null })
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token')
        if (!token) {
          set({ user: null, token: null })
          return
        }

        try {
          const user = await authAPI.getMe()
          set({ user, token })
        } catch {
          localStorage.removeItem('token')
          set({ user: null, token: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
)
```

```typescript
// src/stores/ticketStore.ts
import { create } from 'zustand'
import { ticketAPI } from '@/api/tickets'
import type { Ticket, CreateTicketInput, UpdateTicketInput } from '@/types/ticket'

interface TicketState {
  tickets: Ticket[]
  currentTicket: Ticket | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: {
    status: string
    type: string
    search: string
  }
  fetchTickets: () => Promise<void>
  fetchTicket: (id: number) => Promise<void>
  createTicket: (data: CreateTicketInput) => Promise<void>
  updateTicket: (id: number, data: UpdateTicketInput) => Promise<void>
  deleteTicket: (id: number) => Promise<void>
  setFilters: (filters: Partial<TicketState['filters']>) => void
  setPage: (page: number) => void
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  currentTicket: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {
    status: 'all',
    type: 'all',
    search: '',
  },

  fetchTickets: async () => {
    set({ isLoading: true, error: null })
    try {
      const { filters, pagination } = get()
      const response = await ticketAPI.getTickets({
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status !== 'all' ? filters.status : undefined,
        type: filters.type !== 'all' ? filters.type : undefined,
        search: filters.search || undefined,
      })
      set({
        tickets: response.tickets,
        pagination: {
          page: response.page,
          limit: pagination.limit,
          total: response.total,
          totalPages: response.totalPages,
        },
        isLoading: false,
      })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchTicket: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      const ticket = await ticketAPI.getTicket(id)
      set({ currentTicket: ticket, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  createTicket: async (data: CreateTicketInput) => {
    set({ isLoading: true, error: null })
    try {
      await ticketAPI.createTicket(data)
      await get().fetchTickets()
      set({ isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  updateTicket: async (id: number, data: UpdateTicketInput) => {
    set({ isLoading: true, error: null })
    try {
      await ticketAPI.updateTicket(id, data)
      await get().fetchTickets()
      if (get().currentTicket?.id === id) {
        await get().fetchTicket(id)
      }
      set({ isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  deleteTicket: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      await ticketAPI.deleteTicket(id)
      await get().fetchTickets()
      set({ isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  setFilters: (filters: Partial<TicketState['filters']>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, page: 1 },
    }))
    get().fetchTickets()
  },

  setPage: (page: number) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }))
    get().fetchTickets()
  },
}))
```

### 5.3 컴포넌트 예시 (React)

```tsx
// src/pages/Login.tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      navigate('/dashboard')
    } catch {
      // Error is already in store
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">EXIT System</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

```tsx
// src/components/tickets/TicketList.tsx
import React, { useEffect } from 'react'
import { useTicketStore } from '@/stores/ticketStore'
import TicketCard from './TicketCard'
import Pagination from '../common/Pagination'

export default function TicketList() {
  const { tickets, isLoading, pagination, filters, fetchTickets, setFilters, setPage } = useTicketStore()

  useEffect(() => {
    fetchTickets()
  }, [])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상태
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">전체</option>
              <option value="open">미배정</option>
              <option value="assigned">배정됨</option>
              <option value="in_progress">처리중</option>
              <option value="completed">완료</option>
              <option value="closed">종료</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              타입
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">전체</option>
              <option value="GENERAL">일반</option>
              <option value="BOOK_ORDER">도서주문</option>
              <option value="BETTING">배팅</option>
              <option value="MAILROOM">우편물</option>
              <option value="POINT_REQUEST">포인트</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              placeholder="티켓 번호, 제목, 회원명"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Ticket List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          티켓이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
```

---

이 파일이 저장되었습니다. 다음 부분을 계속 작성하시겠습니까?

**남은 섹션**:
- 6. 마이그레이션 파일 분석
- 7. Git 커밋 히스토리 분석
- 8. 단계별 구현 체크리스트
- 9. 성능 최적화 가이드
- 10. 배포 자동화 스크립트

계속 작성할까요?