-- 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'string', -- string, number, boolean, json
  category TEXT DEFAULT 'general', -- general, api, settlement, notification
  description TEXT,
  is_encrypted BOOLEAN DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES staff(id)
);

-- 기본 설정값 삽입
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
-- API 설정
('openai_api_key', '', 'string', 'api', 'OpenAI API Key'),
('telegram_bot_token', '', 'string', 'api', '텔레그램 봇 토큰'),
('telegram_chat_id', '', 'string', 'api', '텔레그램 Chat ID'),
('api_sport_key', '', 'string', 'api', 'API-Sport.io API Key'),

-- 정산 설정
('betting_commission_rate', '10', 'number', 'settlement', '배팅 수수료율 (%)'),
('book_order_commission', '500', 'number', 'settlement', '도서 발주 수수료 (P)'),
('point_conversion_rate', '1', 'number', 'settlement', '포인트 환전 비율 (1P = 1원)'),
('urgent_processing_fee', '1000', 'number', 'settlement', '긴급 처리 수수료 (P)'),

-- 알림 설정
('notification_enabled', 'true', 'boolean', 'notification', '알림 활성화'),
('notification_ticket_created', 'true', 'boolean', 'notification', '티켓 생성 알림'),
('notification_ticket_assigned', 'true', 'boolean', 'notification', '티켓 배정 알림'),
('notification_approval_request', 'true', 'boolean', 'notification', '승인 요청 알림'),
('notification_betting_result', 'true', 'boolean', 'notification', '배팅 결과 알림'),

-- 일반 설정
('system_name', 'EXIT COMPANY', 'string', 'general', '시스템 이름'),
('service_start_time', '09:00', 'string', 'general', '영업 시작 시간'),
('service_end_time', '18:00', 'string', 'general', '영업 종료 시간'),
('max_ticket_per_day', '100', 'number', 'general', '일일 최대 티켓 수');

CREATE INDEX IF NOT EXISTS idx_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(setting_key);
