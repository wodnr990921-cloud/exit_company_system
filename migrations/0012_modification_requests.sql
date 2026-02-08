-- 수정 요청 테이블
CREATE TABLE IF NOT EXISTS modification_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL, -- 'member', 'book', 'ticket', 'match' 등
  target_id INTEGER NOT NULL, -- 수정할 대상의 ID
  field_name TEXT NOT NULL, -- 수정할 필드명
  old_value TEXT, -- 이전 값
  new_value TEXT NOT NULL, -- 새로운 값
  reason TEXT, -- 수정 사유
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  requested_by INTEGER NOT NULL, -- 요청한 직원 ID
  reviewed_by INTEGER, -- 승인/거부한 관리자 ID
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requested_by) REFERENCES staff(id),
  FOREIGN KEY (reviewed_by) REFERENCES staff(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_modification_requests_status ON modification_requests(status);
CREATE INDEX IF NOT EXISTS idx_modification_requests_target ON modification_requests(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_modification_requests_requested_by ON modification_requests(requested_by);
