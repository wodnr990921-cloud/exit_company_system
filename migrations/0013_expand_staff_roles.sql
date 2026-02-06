-- ==========================================
-- Phase 14: 사용자 권한 관리 시스템 (RBAC)
-- 작성일: 2026-02-06
-- ==========================================

-- staff.role 필드에 'viewer' 역할 추가
-- 기존: 'admin', 'staff'
-- 추가: 'viewer' (읽기 전용)

-- CHECK 제약조건 추가 (Cloudflare D1은 CHECK를 지원하지 않으므로 주석 처리)
-- ALTER TABLE staff ADD CONSTRAINT chk_staff_role CHECK (role IN ('admin', 'staff', 'viewer'));

-- 권한 설명:
-- admin: 모든 권한 (회원 관리, 직원 관리, 시스템 설정, 마감 처리)
-- staff: 일반 업무 권한 (티켓 처리, 우편물 관리, 배팅 관리, 포인트 조정)
-- viewer: 읽기 전용 권한 (조회만 가능, 생성/수정/삭제 불가)

-- 기존 staff 레코드는 그대로 유지 (role이 이미 'admin' 또는 'staff')
-- 새로운 viewer 계정은 수동으로 생성 필요
