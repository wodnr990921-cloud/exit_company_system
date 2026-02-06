-- 우편물 관리 테이블
CREATE TABLE IF NOT EXISTS mailroom_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mail_number TEXT UNIQUE NOT NULL, -- 우편물 고유 번호 (MAIL + timestamp)
  member_id INTEGER, -- 회원 ID (연결 가능한 경우)
  ticket_id INTEGER, -- 티켓 ID (배당 후 연결)
  image_keys TEXT NOT NULL, -- R2 이미지 키 배열 (JSON)
  ocr_result TEXT, -- OCR 결과 (JSON)
  status TEXT DEFAULT 'received', -- received, ocr_processing, ocr_completed, inspection, assigned, completed
  notes TEXT, -- 메모
  created_by INTEGER NOT NULL, -- 작성자 ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_mailroom_member ON mailroom_items(member_id);
CREATE INDEX IF NOT EXISTS idx_mailroom_ticket ON mailroom_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_mailroom_status ON mailroom_items(status);
CREATE INDEX IF NOT EXISTS idx_mailroom_created ON mailroom_items(created_at);
