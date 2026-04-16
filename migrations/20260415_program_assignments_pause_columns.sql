-- ============================================================================
-- B.1 — program_assignments: coach pause / resume (Stage B)
-- Date: 2026-04-15
--
-- Does NOT drop coach_unlocked_week (transitional max() safety net in B.2).
--
-- Offset choice: pause_accumulated_days (integer) instead of total_paused_ms
--   Week unlock and auto-completion use whole client-local calendar days at
--   00:00 (profiles.timezone). Cumulative paused *days* matches that model and
--   avoids millisecond↔day conversion and DST edge cases around midnight.
--   B.2 will treat effective timeline as: start_date + pause_accumulated_days
--   (as a date offset) for calendar week index math, plus live pause when
--   pause_status = 'paused'.
--
-- RLS: This repo has no CREATE POLICY on public.program_assignments in
--   tracked migrations; child tables (program_progress, program_day_completions)
--   reference program_assignments for scope. If your Supabase project enables
--   RLS on program_assignments, confirm coach UPDATE/SELECT policies are not
--   column-lists (they almost never are) — new columns require no policy edit.
-- ============================================================================

-- pause_status: mirrors progression_mode style (text + CHECK), not a new ENUM type
ALTER TABLE public.program_assignments
  ADD COLUMN IF NOT EXISTS pause_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.program_assignments
  ADD COLUMN IF NOT EXISTS paused_at timestamptz NULL;

ALTER TABLE public.program_assignments
  ADD COLUMN IF NOT EXISTS pause_reason text NULL;

ALTER TABLE public.program_assignments
  ADD COLUMN IF NOT EXISTS pause_accumulated_days integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'program_assignments_pause_status_check'
  ) THEN
    ALTER TABLE public.program_assignments
      ADD CONSTRAINT program_assignments_pause_status_check
      CHECK (pause_status IN ('active', 'paused'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'program_assignments_pause_accumulated_days_check'
  ) THEN
    ALTER TABLE public.program_assignments
      ADD CONSTRAINT program_assignments_pause_accumulated_days_check
      CHECK (pause_accumulated_days >= 0);
  END IF;
END $$;

-- When paused, paused_at must be set (coach just hit Pause)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'program_assignments_paused_at_when_paused_check'
  ) THEN
    ALTER TABLE public.program_assignments
      ADD CONSTRAINT program_assignments_paused_at_when_paused_check
      CHECK (pause_status <> 'paused' OR paused_at IS NOT NULL);
  END IF;
END $$;

COMMENT ON COLUMN public.program_assignments.pause_status IS
  'active = program timeline runs; paused = frozen until coach resumes (client cannot self-pause).';

COMMENT ON COLUMN public.program_assignments.paused_at IS
  'Server time when the current pause began; NULL when not paused.';

COMMENT ON COLUMN public.program_assignments.pause_reason IS
  'Optional free-text reason (vacation, injury, etc.).';

COMMENT ON COLUMN public.program_assignments.pause_accumulated_days IS
  'Cumulative whole calendar days added to the effective program start on resume (client-local day boundaries). Used by B.2 calendar week unlock + completion.';

-- Optional: fast filter for coach “who is paused” (harmless if unused)
CREATE INDEX IF NOT EXISTS idx_program_assignments_pause_status
  ON public.program_assignments (pause_status)
  WHERE pause_status = 'paused';

-- RLS sanity: emit notice only (does not fail migration)
DO $$
DECLARE
  pol_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO pol_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'program_assignments';

  RAISE NOTICE 'B.1 check: public.program_assignments RLS policy count = %', pol_count;
END $$;
