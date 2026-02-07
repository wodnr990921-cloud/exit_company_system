-- 알림 테이블 생성
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'ticket_assigned', 'ticket_urgent', 'betting_result', 'point_adjustment', 'general'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- 클릭 시 이동할 URL
  is_read INTEGER DEFAULT 0,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_staff_id ON notifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
