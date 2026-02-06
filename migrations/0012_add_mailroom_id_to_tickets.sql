-- Migration: Add mailroom_id to tickets table
-- Purpose: Link tickets to mailroom items for image viewer

-- Add mailroom_id column to tickets table
ALTER TABLE tickets ADD COLUMN mailroom_id INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_mailroom_id ON tickets(mailroom_id);

-- Add comment
-- This allows tickets to reference mailroom items and display associated images
