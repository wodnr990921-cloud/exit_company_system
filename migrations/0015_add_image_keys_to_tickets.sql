-- Add image_keys column to tickets table for storing R2 image keys
-- Migration: 0015
-- Date: 2026-02-07

-- Add image_keys column to tickets table
ALTER TABLE tickets ADD COLUMN image_keys TEXT;

-- Comment: image_keys will store JSON array of R2 image keys
-- Example: ["tickets/123/1234567890-abc123-image1.jpg", "tickets/123/1234567891-def456-image2.jpg"]
