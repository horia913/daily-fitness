-- Migration: Link workout_sessions, workout_logs, and workout_set_logs
-- Date: 2025-12-28
-- Purpose: Enforce canonical linkage between workout containers

-- ============================================================================
-- PART 1: Add linking column to workout_logs
-- ============================================================================

-- Step 1: Add workout_session_id to workout_logs (nullable for now)
ALTER TABLE workout_logs 
ADD COLUMN IF NOT EXISTS workout_session_id UUID;

-- Step 2: Add foreign key constraint (initially without enforcement for backfill)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workout_logs_workout_session_id_fkey'
  ) THEN
    ALTER TABLE workout_logs
    ADD CONSTRAINT workout_logs_workout_session_id_fkey
    FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_workout_logs_workout_session_id 
ON workout_logs(workout_session_id);

-- Step 4: Add comment for documentation
COMMENT ON COLUMN workout_logs.workout_session_id IS 'Links to workout_sessions (lifecycle container)';

-- ============================================================================
-- PART 2: Verify/ensure workout_set_logs.workout_log_id exists and is indexed
-- ============================================================================

-- This column should already exist, but verify and add index if needed
CREATE INDEX IF NOT EXISTS idx_workout_set_logs_workout_log_id 
ON workout_set_logs(workout_log_id);

-- Add comment
COMMENT ON COLUMN workout_set_logs.workout_log_id IS 'Links to workout_logs (summary container)';

-- ============================================================================
-- PART 3: Backfill workout_logs.workout_session_id
-- ============================================================================

-- Strategy: Match logs to sessions by assignment_id + time window
-- This is best-effort; some logs may not have sessions (legacy data)

UPDATE workout_logs wl
SET workout_session_id = ws.id
FROM workout_sessions ws
WHERE wl.workout_assignment_id = ws.assignment_id
  AND wl.client_id = ws.client_id
  AND wl.workout_session_id IS NULL  -- Only update unlinked logs
  AND ws.started_at IS NOT NULL
  AND wl.started_at IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (wl.started_at - ws.started_at))) < 300  -- Within 5 minutes
  AND ws.id = (
    -- Take the closest matching session
    SELECT id FROM workout_sessions ws2
    WHERE ws2.assignment_id = wl.workout_assignment_id
      AND ws2.client_id = wl.client_id
      AND ws2.started_at IS NOT NULL
    ORDER BY ABS(EXTRACT(EPOCH FROM (wl.started_at - ws2.started_at))) ASC
    LIMIT 1
  );

-- ============================================================================
-- PART 4: Add partial unique constraint to prevent multiple active logs
-- ============================================================================

-- Only one active workout_log per assignment (where completed_at IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_logs_one_active_per_assignment
ON workout_logs(workout_assignment_id, client_id)
WHERE completed_at IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================================================

-- Query 1: Any set logs without a workout_log_id? (should be 0)
-- SELECT count(*) FROM workout_set_logs WHERE workout_log_id IS NULL;

-- Query 2: Any completed workout_log with zero set logs? (should be near 0)
-- SELECT count(*) FROM workout_logs wl 
-- WHERE wl.completed_at IS NOT NULL 
-- AND NOT EXISTS (
--   SELECT 1 FROM workout_set_logs sl WHERE sl.workout_log_id = wl.id
-- );

-- Query 3: Any assignment with multiple active workout_logs? (should be 0)
-- SELECT workout_assignment_id, count(*) 
-- FROM workout_logs 
-- WHERE completed_at IS NULL 
-- GROUP BY workout_assignment_id 
-- HAVING count(*) > 1;

-- Query 4: Backfill success rate
-- SELECT 
--   COUNT(*) as total_logs,
--   COUNT(workout_session_id) as linked_logs,
--   ROUND(100.0 * COUNT(workout_session_id) / NULLIF(COUNT(*), 0), 2) as link_percentage
-- FROM workout_logs;

-- Query 5: Any logs with invalid workout_session_id? (should be 0)
-- SELECT count(*) FROM workout_logs wl
-- WHERE workout_session_id IS NOT NULL
-- AND NOT EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.id = wl.workout_session_id);

