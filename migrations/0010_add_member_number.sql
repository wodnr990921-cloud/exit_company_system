-- 회원 고유번호 필드 추가 (UNIQUE 제약 없이)
ALTER TABLE members ADD COLUMN member_number TEXT;

-- 인덱스 생성 (UNIQUE 인덱스로 추가)
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_member_number_unique ON members(member_number) WHERE member_number IS NOT NULL;
