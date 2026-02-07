-- EXIT System 간단한 테스트 데이터
-- 회원, 티켓, 도서만 삽입

-- 회원 3명
INSERT INTO members (member_number, name, institution, inmate_number, po_box_address, depositor_name, points, betting_points, frozen_points, status, notes, created_at)
VALUES
('M00001', '김철수', '서울구치소', '2024-001', 'P.O. Box 100, Seoul', '김영희', 50000, 30000, 0, 'active', '테스트 회원 1', '2026-01-15 10:00:00'),
('M00002', '이영희', '대전교도소', '2024-002', 'P.O. Box 200, Daejeon', '이철수', 75000, 50000, 0, 'active', '테스트 회원 2', '2026-01-16 11:00:00'),
('M00003', '박민수', '부산교도소', '2024-003', 'P.O. Box 300, Busan', '박순자', 30000, 10000, 5000, 'active', '테스트 회원 3', '2026-01-17 12:00:00');

-- 도서 5권
INSERT INTO books (title, author, isbn, publisher, price, stock, status)
VALUES
('데미안', '헤르만 헤세', '978-89-3746-123-4', '민음사', 12000, 50, 'available'),
('1984', '조지 오웰', '978-89-3746-124-1', '민음사', 15000, 30, 'available'),
('사피엔스', '유발 하라리', '978-89-3746-127-2', '김영사', 22000, 40, 'available'),
('채식주의자', '한강', '978-89-3746-130-2', '창비', 13000, 45, 'available'),
('82년생 김지영', '조남주', '978-89-3746-132-6', '민음사', 13800, 50, 'available');

-- 티켓 5개
INSERT INTO tickets (ticket_number, title, description, member_id, ticket_type, status, priority, assigned_to, created_by, created_at, updated_at)
VALUES
('T-2024-0001', '데미안 주문', '데미안 1권 주문 요청', 1, 'ORDER', 'completed', 'normal', 2, 2, '2026-02-01 09:00:00', '2026-02-01 15:00:00'),
('T-2024-0002', '포인트 충전 요청', '50,000원 충전', 2, 'POINT_ADJUSTMENT', 'completed', 'normal', 2, 2, '2026-02-01 10:00:00', '2026-02-01 16:00:00'),
('T-2024-0003', '배송 문의', '배송 지연 문의', 3, 'INQUIRY', 'in_progress', 'high', 2, 2, '2026-02-02 11:00:00', '2026-02-02 11:00:00'),
('T-2024-0004', '사피엔스 주문', '사피엔스 1권 주문', 1, 'ORDER', 'open', 'normal', NULL, 2, '2026-02-02 12:00:00', '2026-02-02 12:00:00'),
('T-2024-0005', '회원정보 수정', '주소 변경 요청', 2, 'MEMBER', 'assigned', 'normal', 2, 2, '2026-02-03 09:30:00', '2026-02-03 09:30:00');
