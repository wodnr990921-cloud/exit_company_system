-- EXIT SYSTEM 초기 스키마
-- 작성일: 2026-02-06

-- ==========================================
-- 직원 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff', -- 'admin' or 'staff'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 출근 기록 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  checkin_time DATETIME NOT NULL,
  checkout_time DATETIME,
  stamps_used INTEGER DEFAULT 0,
  daily_report TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- ==========================================
-- 회원 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  inmate_number TEXT NOT NULL,
  po_box_address TEXT,
  depositor_name TEXT,
  points INTEGER DEFAULT 0,
  betting_points INTEGER DEFAULT 0,
  frozen_points INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_members_name ON members(name);
CREATE INDEX idx_members_inmate_number ON members(inmate_number);
CREATE INDEX idx_members_institution ON members(institution);

-- ==========================================
-- 티켓 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  member_id INTEGER,
  ticket_type TEXT NOT NULL, -- 'ORDER', 'INQUIRY', 'PURCHASE_ORDER', 'POINT_ADJUSTMENT', 'MEMBER', 'MAIL_INSPECTION'
  status TEXT DEFAULT 'open', -- 'open', 'assigned', 'in_progress', 'completed', 'closed'
  priority TEXT DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'
  assigned_to INTEGER,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (assigned_to) REFERENCES staff(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_type ON tickets(ticket_type);
CREATE INDEX idx_tickets_member ON tickets(member_id);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);

-- ==========================================
-- 티켓 댓글 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS ticket_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  comment TEXT NOT NULL,
  comment_type TEXT DEFAULT 'internal', -- 'internal' or 'response'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE INDEX idx_comments_ticket ON ticket_comments(ticket_id);

-- ==========================================
-- 도서 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  isbn TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER DEFAULT 0,
  status TEXT DEFAULT 'available', -- 'available', 'out_of_stock'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_isbn ON books(isbn);

-- ==========================================
-- 주문 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  ticket_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  total_amount INTEGER NOT NULL DEFAULT 0,
  point_type TEXT NOT NULL, -- 'regular' or 'betting'
  points_used INTEGER DEFAULT 0,
  final_price INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

CREATE INDEX idx_orders_ticket ON orders(ticket_id);
CREATE INDEX idx_orders_member ON orders(member_id);

-- ==========================================
-- 주문 상세 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ==========================================
-- 포인트 거래 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS point_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  ticket_id INTEGER,
  point_type TEXT NOT NULL, -- 'regular' or 'betting'
  transaction_type TEXT NOT NULL, -- 'earn', 'use', 'adjust', 'freeze', 'unfreeze'
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'rejected'
  approved_by INTEGER,
  approved_at DATETIME,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (approved_by) REFERENCES staff(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

CREATE INDEX idx_point_trans_member ON point_transactions(member_id);
CREATE INDEX idx_point_trans_status ON point_transactions(status);

-- ==========================================
-- 답변 템플릿 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS response_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT, -- JSON string
  is_active INTEGER DEFAULT 1,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

-- ==========================================
-- 티켓 답변 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS ticket_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  template_id INTEGER,
  response_text TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (template_id) REFERENCES response_templates(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

CREATE INDEX idx_responses_ticket ON ticket_responses(ticket_id);
CREATE INDEX idx_responses_date ON ticket_responses(created_at);

-- ==========================================
-- 경기 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_number TEXT UNIQUE NOT NULL,
  match_name TEXT NOT NULL,
  match_date DATETIME NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  -- 승무패 배당률
  home_odds REAL DEFAULT 1.0,
  away_odds REAL DEFAULT 1.0,
  draw_odds REAL,
  -- 언오버 배당률
  over_line REAL, -- 기준점 (예: 2.5)
  over_odds REAL,
  under_odds REAL,
  -- 핸디캡 배당률
  handicap_line REAL, -- 핸디캡 (예: -1.5)
  handicap_home_odds REAL,
  handicap_away_odds REAL,
  -- 경기 상태
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  result TEXT, -- 'home_win', 'away_win', 'draw', 'cancelled'
  home_score INTEGER,
  away_score INTEGER,
  total_score REAL, -- 언오버 판정용
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);

-- ==========================================
-- 배팅 폴더 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS bet_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_number TEXT UNIQUE NOT NULL,
  ticket_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  folder_type TEXT NOT NULL, -- 'single' (단폴더) or 'multi' (다폴더)
  total_bet_amount INTEGER NOT NULL,
  total_odds REAL NOT NULL, -- 단폴더는 개별 배당률, 다폴더는 모든 배당률 곱셈
  potential_win INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'win', 'lose', 'cancelled'
  result_status TEXT, -- 'all_win' (다폴더 전체 적중), 'partial_win', 'all_lose'
  settlement_amount INTEGER DEFAULT 0,
  settled_at DATETIME,
  approved_by INTEGER,
  approved_at DATETIME,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (approved_by) REFERENCES staff(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

CREATE INDEX idx_bet_folders_member ON bet_folders(member_id);
CREATE INDEX idx_bet_folders_status ON bet_folders(status);
CREATE INDEX idx_bet_folders_ticket ON bet_folders(ticket_id);

-- ==========================================
-- 배팅 상세 테이블 (폴더 내 개별 배팅)
-- ==========================================
CREATE TABLE IF NOT EXISTS bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  bet_type TEXT NOT NULL, -- 'home_win', 'away_win', 'draw', 'over', 'under', 'handicap_home', 'handicap_away'
  odds REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'win', 'lose', 'cancelled'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (folder_id) REFERENCES bet_folders(id),
  FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE INDEX idx_bets_folder ON bets(folder_id);
CREATE INDEX idx_bets_match ON bets(match_id);

-- ==========================================
-- 배팅 정산 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS bet_settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  settlement_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by INTEGER,
  approved_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (folder_id) REFERENCES bet_folders(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (approved_by) REFERENCES staff(id)
);

CREATE INDEX idx_settlements_status ON bet_settlements(status);
CREATE INDEX idx_settlements_member ON bet_settlements(member_id);

-- ==========================================
-- 초기 관리자 계정 생성
-- ==========================================
INSERT INTO staff (email, password, name, role) VALUES 
('admin@manager-exit.cloud', 'admin123', '관리자', 'admin');
