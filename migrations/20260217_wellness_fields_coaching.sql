-- Add coaching-relevant fields to daily_wellness_logs
-- Replaces generic energy/mood/motivation with sleep and steps

ALTER TABLE public.daily_wellness_logs
ADD COLUMN IF NOT EXISTS sleep_hours numeric,
ADD COLUMN IF NOT EXISTS sleep_quality integer CHECK (sleep_quality BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS steps integer;

-- Note: energy_level, mood_rating, motivation_level columns remain in the table
-- but are no longer used in the UI. They are kept for backward compatibility.

-- stress_level and soreness_level continue to be used (1-10 scale in DB, 1-5 in UI)
