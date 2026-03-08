-- ============================================================================
-- Migration: Unique partial index for in-progress workout sessions
-- Date: 2026-03-03
-- ============================================================================
--
-- WHY:
--   workout_sessions had no uniqueness constraint preventing multiple rows
--   with status = 'in_progress' for the same (client, program_assignment,
--   program_schedule) triple. Race conditions (two devices, quick double-tap)
--   could create duplicates. start-from-progress uses maybeSingle() on that
--   triple, which would fail with PGRST116 if duplicates exist.
--
-- WHAT THIS DOES:
--   1. Closes all but the newest in-progress session per
--      (client_id, program_assignment_id, program_schedule_id), setting older
--      duplicates to status='completed' with completed_at=started_at (abandoned).
--      Does NOT write to program_day_completions — abandoned duplicates are not
--      real completions.
--   2. Adds a UNIQUE partial index so the database enforces this at write time.
--
-- SAFE TO RUN:
--   Step 1 is idempotent — if no duplicates exist it touches 0 rows.
--   Step 2 uses CREATE UNIQUE INDEX IF NOT EXISTS.
-- ============================================================================

-- ============================================================================
-- STEP 1: Close duplicate in-progress sessions (keep most recent per triple)
-- Only applies to sessions that have ALL three keys set (program sessions).
-- Standalone workout sessions (NULL program keys) are left untouched.
-- ============================================================================
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, program_assignment_id, program_schedule_id
      ORDER BY started_at DESC
    ) AS rn
  FROM public.workout_sessions
  WHERE status = 'in_progress'
    AND program_assignment_id IS NOT NULL
    AND program_schedule_id IS NOT NULL
)
UPDATE public.workout_sessions
SET
  status       = 'completed',
  completed_at = COALESCE(completed_at, started_at)
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ============================================================================
-- STEP 2: Unique partial index — prevents future duplicates at DB level
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_in_progress_session
  ON public.workout_sessions (client_id, program_assignment_id, program_schedule_id)
  WHERE status = 'in_progress';

COMMENT ON INDEX public.idx_unique_in_progress_session IS
'Prevents multiple in-progress sessions for the same program day slot.
Applied only to sessions with all three program keys set (status=in_progress,
program_assignment_id NOT NULL, program_schedule_id NOT NULL).
Created by migration 20260303_unique_in_progress_session.sql.';
