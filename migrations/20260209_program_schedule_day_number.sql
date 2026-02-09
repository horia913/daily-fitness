-- ============================================================================
-- Migration: Add day_number column to program_schedule
-- Date: 2026-02-09
-- Purpose:
--   Normalize program_schedule to use 1-based day_number instead of 0-based
--   day_of_week. The day_of_week column is kept for backward compatibility.
-- ============================================================================

-- Add the column (nullable initially for backfill)
ALTER TABLE public.program_schedule
  ADD COLUMN IF NOT EXISTS day_number int;

-- Backfill: day_of_week 0..6 => day_number 1..7
UPDATE public.program_schedule
  SET day_number = day_of_week + 1
  WHERE day_number IS NULL;

-- Now enforce NOT NULL
ALTER TABLE public.program_schedule
  ALTER COLUMN day_number SET NOT NULL;

-- Add CHECK constraint
ALTER TABLE public.program_schedule
  DROP CONSTRAINT IF EXISTS chk_day_number;
ALTER TABLE public.program_schedule
  ADD CONSTRAINT chk_day_number CHECK (day_number BETWEEN 1 AND 7);

-- Create unique index for (program_id, week_number, day_number)
-- This replaces the old uniqueness concept
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_program_week_day
  ON public.program_schedule(program_id, week_number, day_number);

COMMENT ON COLUMN public.program_schedule.day_number IS
'1-based day number within the week. 1=Day1 .. 7=Day7. Canonical column — use this instead of day_of_week.';

COMMENT ON COLUMN public.program_schedule.day_of_week IS
'DEPRECATED: 0-based day index. Kept for backward compatibility. Use day_number instead.';
