-- 입출금 거래 테이블
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('deposit', 'withdrawal', 'expense')),
  amount INTEGER NOT NULL,
  depositor_name TEXT,
  account_number TEXT,
  bank_name TEXT,
  transaction_date DATETIME NOT NULL,
  
  -- 매칭 정보
  member_id INTEGER,
  matched_by INTEGER,
  matched_at DATETIME,
  match_confidence REAL, -- 0.0 ~ 1.0
  
  -- 분류 정보
  category TEXT, -- 'member_deposit', 'refund', 'prize_payout', 'expense_office', 'expense_service', etc.
  description TEXT,
  memo TEXT,
  
  -- 결재 정보
  approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by INTEGER,
  approved_at DATETIME,
  rejection_reason TEXT,
  
  -- 메타데이터
  telegram_message_id INTEGER,
  source TEXT DEFAULT 'telegram', -- 'telegram', 'manual', 'import'
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (matched_by) REFERENCES staff(id),
  FOREIGN KEY (approved_by) REFERENCES staff(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

-- 미확인 입금 대기 큐
CREATE TABLE IF NOT EXISTS pending_deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL UNIQUE,
  depositor_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  transaction_date DATETIME NOT NULL,
  
  -- 자동 매칭 제안
  suggested_member_id INTEGER,
  suggestion_reason TEXT,
  match_score REAL,
  
  -- 상태
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'confirmed', 'cancelled')),
  processed_by INTEGER,
  processed_at DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (suggested_member_id) REFERENCES members(id),
  FOREIGN KEY (processed_by) REFERENCES staff(id)
);

-- 경비 항목
CREATE TABLE IF NOT EXISTS expense_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  category TEXT NOT NULL, -- 'office_supplies', 'utilities', 'service_fee', 'maintenance', etc.
  subcategory TEXT,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  
  -- 첨부 파일
  receipt_url TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(approval_status);
CREATE INDEX IF NOT EXISTS idx_transactions_telegram ON transactions(telegram_message_id);

CREATE INDEX IF NOT EXISTS idx_pending_deposits_status ON pending_deposits(status);
CREATE INDEX IF NOT EXISTS idx_pending_deposits_date ON pending_deposits(transaction_date);

CREATE INDEX IF NOT EXISTS idx_expense_items_transaction ON expense_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_category ON expense_items(category);
