-- Exit Company System Database Schema

-- 미확인 입금 관리 테이블
CREATE TABLE IF NOT EXISTS pending_deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  depositor_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  transaction_date DATETIME NOT NULL,
  suggested_member_id INTEGER,
  suggestion_reason TEXT,
  match_score REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  processed_by INTEGER,
  processed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (suggested_member_id) REFERENCES members(id),
  FOREIGN KEY (processed_by) REFERENCES staff(id)
);

-- 거래 (입출금/경비) 테이블
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'expense'
  amount INTEGER NOT NULL,
  depositor_name TEXT,
  account_number TEXT,
  bank_name TEXT,
  transaction_date DATETIME NOT NULL,
  member_id INTEGER,
  match_confidence REAL DEFAULT 0,
  telegram_message_id INTEGER,
  source TEXT DEFAULT 'manual', -- 'telegram', 'manual'
  approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by INTEGER,
  approved_at DATETIME,
  rejection_reason TEXT,
  matched_by INTEGER,
  matched_at DATETIME,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (approved_by) REFERENCES staff(id),
  FOREIGN KEY (matched_by) REFERENCES staff(id)
);

-- 거래 통계 인덱스
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(approval_status);
CREATE INDEX IF NOT EXISTS idx_pending_deposits_status ON pending_deposits(status);

-- 활동 로그 테이블
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER,
  action TEXT NOT NULL,
  action_description TEXT,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_staff ON activity_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(created_at);
