-- ==========================================
-- 일일 마감 시스템 테이블
-- ==========================================

-- 일일 마감 기록 테이블
CREATE TABLE IF NOT EXISTS daily_closings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  closing_date TEXT NOT NULL UNIQUE, -- 마감 날짜 (YYYY-MM-DD)
  
  -- 티켓 통계
  total_tickets INTEGER DEFAULT 0,
  completed_tickets INTEGER DEFAULT 0,
  
  -- 포인트 통계
  earned_points INTEGER DEFAULT 0, -- 포인트 적립
  used_points INTEGER DEFAULT 0,   -- 포인트 사용
  net_points INTEGER DEFAULT 0,    -- 순 포인트 (적립 - 사용)
  
  -- 배팅 통계
  total_bet_amount INTEGER DEFAULT 0,  -- 총 배팅 금액
  total_win_amount INTEGER DEFAULT 0,  -- 총 당첨 금액
  bet_margin INTEGER DEFAULT 0,        -- 배팅 마진 (배팅 - 당첨)
  
  -- 도서 판매 통계
  book_orders INTEGER DEFAULT 0,       -- 도서 주문 건수
  book_sales INTEGER DEFAULT 0,        -- 도서 판매 금액
  
  -- 종합 요약
  total_revenue INTEGER DEFAULT 0,     -- 총 매출 (순 포인트 + 도서 판매)
  total_margin INTEGER DEFAULT 0,      -- 총 마진 (순 포인트 + 배팅 마진)
  
  -- 마감 정보
  closed_by INTEGER NOT NULL,          -- 마감 수행 직원
  closed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,                           -- 마감 메모
  
  FOREIGN KEY (closed_by) REFERENCES staff(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_closings_date ON daily_closings(closing_date);
CREATE INDEX IF NOT EXISTS idx_closings_closed_by ON daily_closings(closed_by);
