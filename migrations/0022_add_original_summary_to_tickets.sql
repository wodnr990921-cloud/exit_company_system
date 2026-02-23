-- Add original and summary fields to tickets table
-- 2025-02-23

ALTER TABLE tickets ADD COLUMN original TEXT;
ALTER TABLE tickets ADD COLUMN summary TEXT;
