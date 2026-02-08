-- 티켓 아이템 테이블 생성 (장바구니 시스템)
CREATE TABLE IF NOT EXISTS ticket_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  item_type TEXT NOT NULL, -- 'book_order', 'betting', 'point_request'
  item_data TEXT NOT NULL, -- JSON 형태의 데이터
  status TEXT DEFAULT 'pending', -- pending, processing, completed, cancelled
  processed_by INTEGER,
  processed_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (processed_by) REFERENCES staff(id)
);

-- 티켓 아이템 인덱스
CREATE INDEX IF NOT EXISTS idx_ticket_items_ticket_id ON ticket_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_items_type ON ticket_items(item_type);
CREATE INDEX IF NOT EXISTS idx_ticket_items_status ON ticket_items(status);

-- 배팅 폴더에 티켓 아이템 ID 추가 (선택적)
-- ALTER TABLE betting_folders ADD COLUMN ticket_item_id INTEGER;
-- CREATE INDEX IF NOT EXISTS idx_betting_folders_ticket_item ON betting_folders(ticket_item_id);
