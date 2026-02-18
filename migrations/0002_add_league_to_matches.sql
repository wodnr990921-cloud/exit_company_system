-- Add league field to matches table
ALTER TABLE matches ADD COLUMN league TEXT DEFAULT 'ETC';

-- Create index for league queries
CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league);
