-- 답변 관리 시스템

-- 답변 테이블
CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('ticket_response', 'auto_notification')),
  content TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_number TEXT NOT NULL,
  recipient_institution TEXT,
  po_box_address TEXT,
  print_status TEXT NOT NULL DEFAULT 'pending' CHECK (print_status IN ('pending', 'printed', 'error')),
  printed_at DATETIME,
  printed_by INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (printed_by) REFERENCES staff(id)
);

-- 답변 출력 양식 설정 테이블
CREATE TABLE IF NOT EXISTS response_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES staff(id)
);

-- 기본 양식 설정 삽입
INSERT OR IGNORE INTO response_settings (setting_key, setting_value, description) VALUES
  ('header_notice', '중요 공지사항이 여기에 표시됩니다.', '상단 공지사항'),
  ('greeting', '안녕하세요.\n항상 저희 서비스를 이용해 주셔서 감사합니다.', '인사말'),
  ('footer', '감사합니다.\n문의사항이 있으시면 언제든 연락주세요.', '맺음말'),
  ('show_received_date', 'true', '편지 받은 날짜 표시 여부'),
  ('date_format', 'YYYY년 MM월 DD일', '날짜 형식');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_responses_ticket_id ON responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_responses_member_id ON responses(member_id);
CREATE INDEX IF NOT EXISTS idx_responses_print_status ON responses(print_status);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
