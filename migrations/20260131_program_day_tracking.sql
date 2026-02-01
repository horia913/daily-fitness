-- ============================================================================
-- Migration: Program Day Tracking for Idempotent Workout Start
-- Date: 2026-01-31
-- 
-- Purpose:
-- Add program_assignment_id and program_schedule_id to workout_sessions and
-- workout_logs to enable idempotent start-from-progress keyed by PROGRAM DAY
-- (not template_id).
--
-- Why:
-- Templates can repeat across weeks/days. Using template_id for reuse checks
-- can incorrectly reuse an old in-progress workout from a different day.
-- Program day identity = (program_assignment_id, program_schedule_id)
-- ============================================================================

-- ============================================================================
-- PART A: Add columns to workout_sessions
-- ============================================================================

-- Add program_assignment_id to workout_sessions
ALTER TABLE public.workout_sessions
ADD COLUMN IF NOT EXISTS program_assignment_id uuid NULL
REFERENCES public.program_assignments(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workout_sessions.program_assignment_id IS 
'Links session to a specific program assignment. NULL for standalone workouts.';

-- Add program_schedule_id to workout_sessions
ALTER TABLE public.workout_sessions
ADD COLUMN IF NOT EXISTS program_schedule_id uuid NULL
REFERENCES public.program_schedule(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workout_sessions.program_schedule_id IS 
'Links session to a specific program schedule row (week/day). NULL for standalone workouts.';

-- ============================================================================
-- PART B: Add columns to workout_logs
-- ============================================================================

-- Add program_assignment_id to workout_logs
ALTER TABLE public.workout_logs
ADD COLUMN IF NOT EXISTS program_assignment_id uuid NULL
REFERENCES public.program_assignments(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workout_logs.program_assignment_id IS 
'Links log to a specific program assignment. NULL for standalone workouts.';

-- Add program_schedule_id to workout_logs
ALTER TABLE public.workout_logs
ADD COLUMN IF NOT EXISTS program_schedule_id uuid NULL
REFERENCES public.program_schedule(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workout_logs.program_schedule_id IS 
'Links log to a specific program schedule row (week/day). NULL for standalone workouts.';

-- ============================================================================
-- PART C: Create partial indexes for fast reuse lookups
-- ============================================================================

-- Index for finding in-progress sessions by program day
-- Used by start-from-progress to check for existing in-progress workout
CREATE INDEX IF NOT EXISTS idx_ws_program_day_in_progress
ON public.workout_sessions (client_id, program_assignment_id, program_schedule_id)
WHERE status = 'in_progress';

COMMENT ON INDEX public.idx_ws_program_day_in_progress IS 
'Fast lookup for in-progress sessions by program day. Used for idempotent start.';

-- Index for finding incomplete logs by program day
-- Used by start-from-progress to check for existing incomplete workout
CREATE INDEX IF NOT EXISTS idx_wl_program_day_incomplete
ON public.workout_logs (client_id, program_assignment_id, program_schedule_id)
WHERE completed_at IS NULL;

COMMENT ON INDEX public.idx_wl_program_day_incomplete IS 
'Fast lookup for incomplete workout logs by program day. Used for idempotent start.';

-- ============================================================================
-- PART D: RLS Verification
-- ============================================================================
-- Existing RLS policies on workout_sessions and workout_logs are based on 
-- client_id = auth.uid(), which covers all columns including the new ones.
--
-- workout_sessions: "Clients can manage their sessions" - (auth.uid() = client_id)
-- workout_logs: "Clients can insert/read/update their own workout logs" - (auth.uid() = client_id)
--
-- No new policies needed. The new columns are nullable and used for filtering,
-- not for access control. Access is still controlled by client_id.
-- ============================================================================

-- Verify columns were added (for debugging)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workout_sessions' 
    AND column_name = 'program_assignment_id'
  ) THEN
    RAISE EXCEPTION 'workout_sessions.program_assignment_id was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workout_sessions' 
    AND column_name = 'program_schedule_id'
  ) THEN
    RAISE EXCEPTION 'workout_sessions.program_schedule_id was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workout_logs' 
    AND column_name = 'program_assignment_id'
  ) THEN
    RAISE EXCEPTION 'workout_logs.program_assignment_id was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workout_logs' 
    AND column_name = 'program_schedule_id'
  ) THEN
    RAISE EXCEPTION 'workout_logs.program_schedule_id was not created';
  END IF;
  
  RAISE NOTICE 'All program day tracking columns created successfully';
END $$;

-- ============================================================================
-- PHASE 4: VERIFICATION QUERIES (run these after testing)
-- ============================================================================

-- Query 1: Check in-progress sessions with program day tagging
-- SELECT id, client_id, program_assignment_id, program_schedule_id, status, started_at
-- FROM workout_sessions
-- WHERE status = 'in_progress'
-- ORDER BY started_at DESC
-- LIMIT 10;

-- Query 2: Check incomplete logs with program day tagging
-- SELECT id, client_id, program_assignment_id, program_schedule_id, completed_at, started_at
-- FROM workout_logs
-- WHERE completed_at IS NULL
-- ORDER BY started_at DESC
-- LIMIT 10;

-- Query 3: Verify idempotency - should show same session/log when starting same day twice
-- SELECT 
--   ws.id as session_id,
--   ws.assignment_id,
--   ws.program_assignment_id,
--   ws.program_schedule_id,
--   ws.status,
--   ws.started_at,
--   ps.week_number,
--   ps.day_of_week,
--   wt.name as template_name
-- FROM workout_sessions ws
-- JOIN program_schedule ps ON ws.program_schedule_id = ps.id
-- JOIN workout_templates wt ON ps.template_id = wt.id
-- WHERE ws.status = 'in_progress'
-- ORDER BY ws.started_at DESC
-- LIMIT 10;

-- Query 4: Completed workouts with program day info (for audit)
-- SELECT 
--   wl.id as log_id,
--   wl.client_id,
--   wl.program_assignment_id,
--   wl.program_schedule_id,
--   wl.started_at,
--   wl.completed_at,
--   ps.week_number,
--   ps.day_of_week
-- FROM workout_logs wl
-- LEFT JOIN program_schedule ps ON wl.program_schedule_id = ps.id
-- WHERE wl.completed_at IS NOT NULL
-- ORDER BY wl.completed_at DESC
-- LIMIT 10;
