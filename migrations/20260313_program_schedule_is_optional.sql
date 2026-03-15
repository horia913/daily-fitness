-- Add is_optional to program_schedule for optional training days (e.g. mobility, zone 2 cardio)
-- Optional days do not block week progression and are excluded from adherence calculation
ALTER TABLE program_schedule ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false;
