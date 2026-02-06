-- ==========================================
-- Phase 15: 관리자 설정 페이지 - 권한 변경 로그
-- 작성일: 2026-02-06
-- ==========================================

-- 직원 역할 변경 이력 테이블
CREATE TABLE IF NOT EXISTS staff_role_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  changed_by INTEGER NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (changed_by) REFERENCES staff(id)
);

CREATE INDEX idx_role_changes_staff ON staff_role_changes(staff_id);
CREATE INDEX idx_role_changes_date ON staff_role_changes(created_at);
