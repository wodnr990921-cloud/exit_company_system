-- 알림 시스템 테이블 생성
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('ticket_assigned', 'ticket_urgent', 'betting_result', 'point_approved', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  is_read INTEGER DEFAULT 0,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- 인덱스 생성 (빠른 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_notifications_staff_id ON notifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
