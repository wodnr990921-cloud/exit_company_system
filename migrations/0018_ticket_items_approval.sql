-- 티켓 아이템 결재 시스템 컬럼 추가

-- 결재 관련 컬럼 추가
ALTER TABLE ticket_items ADD COLUMN requested_by INTEGER;
ALTER TABLE ticket_items ADD COLUMN requested_at DATETIME;
ALTER TABLE ticket_items ADD COLUMN approved_by INTEGER;
ALTER TABLE ticket_items ADD COLUMN approved_at DATETIME;
ALTER TABLE ticket_items ADD COLUMN rejected_by INTEGER;
ALTER TABLE ticket_items ADD COLUMN rejected_at DATETIME;
ALTER TABLE ticket_items ADD COLUMN processing_data TEXT; -- JSON 형태로 처리 데이터 저장

-- 외래키 인덱스
CREATE INDEX IF NOT EXISTS idx_ticket_items_requested_by ON ticket_items(requested_by);
CREATE INDEX IF NOT EXISTS idx_ticket_items_approved_by ON ticket_items(approved_by);
CREATE INDEX IF NOT EXISTS idx_ticket_items_rejected_by ON ticket_items(rejected_by);
