-- 포인트 전환 내역 테이블
CREATE TABLE IF NOT EXISTS point_conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  from_type TEXT NOT NULL CHECK(from_type IN ('regular', 'betting')),
  to_type TEXT NOT NULL CHECK(to_type IN ('regular', 'betting')),
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'cancelled')),
  deduct_item_id INTEGER,  -- 차감 ticket_item ID
  add_item_id INTEGER,     -- 지급 ticket_item ID
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cancelled_by INTEGER,
  cancelled_at DATETIME,
  cancel_reason TEXT,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (deduct_item_id) REFERENCES ticket_items(id),
  FOREIGN KEY (add_item_id) REFERENCES ticket_items(id),
  FOREIGN KEY (created_by) REFERENCES staff(id),
  FOREIGN KEY (cancelled_by) REFERENCES staff(id)
);

-- 인덱스 생성
CREATE INDEX idx_point_conversions_member_id ON point_conversions(member_id);
CREATE INDEX idx_point_conversions_status ON point_conversions(status);
CREATE INDEX idx_point_conversions_created_at ON point_conversions(created_at);
