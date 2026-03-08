-- Add coaching-relevant fields to daily_wellness_logs
-- This migration MUST be run before the check-in form will work
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql

ALTER TABLE public.daily_wellness_logs
ADD COLUMN IF NOT EXISTS sleep_hours numeric,
ADD COLUMN IF NOT EXISTS sleep_quality integer CHECK (sleep_quality BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS steps integer;

-- Verify columns were added:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'daily_wellness_logs' 
-- AND column_name IN ('sleep_hours', 'sleep_quality', 'steps');
