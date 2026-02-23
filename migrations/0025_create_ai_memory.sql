-- AI 챗봇 메모리 테이블
CREATE TABLE IF NOT EXISTS ai_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_key TEXT NOT NULL UNIQUE,
  memory_value TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 초기 가격표 데이터 삽입
INSERT OR REPLACE INTO ai_memory (memory_key, memory_value, category) VALUES
('가격표_도서발주', '실비 + 수수료 500P', 'pricing'),
('가격표_포인트충전', '수수료 없음 (1:1)', 'pricing'),
('가격표_배팅수수료', '당첨금에서 10% 수수료', 'pricing'),
('가격표_문의답변', '무료', 'pricing'),
('가격표_긴급처리', '추가 1000P', 'pricing'),
('배당률_축구', '승무패 평균 1.5~3.5배', 'odds'),
('배당률_야구', '승패 평균 1.8~2.2배', 'odds'),
('배당률_농구', '핸디캡 평균 1.9배', 'odds'),
('배당률_배구', '승패 평균 1.7~2.5배', 'odds');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ai_memory_category ON ai_memory(category);
CREATE INDEX IF NOT EXISTS idx_ai_memory_key ON ai_memory(memory_key);
