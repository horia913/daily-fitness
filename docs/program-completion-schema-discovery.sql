-- =============================================================================
-- PROGRAM COMPLETION: Schema discovery (run in Supabase SQL Editor)
-- Run each section and share the results so we can align the fix with your DB.
--
-- Progress rule (from product): Client may complete days out of order within
-- a week (e.g. Week 1 Day 3 before Week 1 Day 1), but must not complete
-- Week 2 before Week 1 is finished.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. LIST ALL PROGRAM-RELATED TABLES (do they exist?)
-- -----------------------------------------------------------------------------
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE 'program%'
    OR table_name = 'workout_programs'
  )
ORDER BY table_name;


-- -----------------------------------------------------------------------------
-- 2. COLUMNS FOR KEY TABLES (run only for tables that exist from query 1)
--    Copy the table_name from results and run 2a–2d as needed.
-- -----------------------------------------------------------------------------

-- 2a. program_progress (used by RPC advance_program_progress and getCurrentWorkoutFromProgress)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'program_progress'
ORDER BY ordinal_position;

-- 2b. program_day_completions (used by RPC for idempotent completion records)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'program_day_completions'
ORDER BY ordinal_position;

-- 2c. program_assignment_progress (your schema CSV had this; may be legacy or alternate)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'program_assignment_progress'
ORDER BY ordinal_position;

-- 2d. program_assignments, program_day_assignments, program_schedule (always in schema)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('program_assignments', 'program_day_assignments', 'program_schedule')
ORDER BY table_name, ordinal_position;


-- -----------------------------------------------------------------------------
-- 3. CHECK: Does anything in the DB depend on program_day_assignments.is_completed?
--    (views, triggers, functions that reference this table/column)
-- -----------------------------------------------------------------------------

-- 3a. Views that reference program_day_assignments (standard information_schema)
SELECT view_schema, view_name, table_schema, table_name
FROM information_schema.view_table_usage
WHERE view_schema = 'public' AND table_name = 'program_day_assignments'
ORDER BY view_name;

-- 3b. Triggers on program_day_assignments
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'program_day_assignments';

-- 3c. Functions whose NAME mentions program_day or program_assignment (safe, no body search)
--    (Searching function body with pg_get_functiondef can fail in some environments.)
SELECT n.nspname AS schema, p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    p.proname ILIKE '%program_day%'
    OR p.proname ILIKE '%program_assignment%'
    OR p.proname ILIKE '%advance_program%'
  )
ORDER BY p.proname;


-- -----------------------------------------------------------------------------
-- 4. SAMPLE ROW COUNTS (so we know if tables are in use)
--    Run only the lines for tables that exist (from query 1). Comment out
--    any UNION ALL line for a table you don't have.
-- -----------------------------------------------------------------------------
SELECT 'program_assignments' AS tbl, COUNT(*) AS cnt FROM program_assignments
UNION ALL
SELECT 'program_day_assignments', COUNT(*) FROM program_day_assignments
UNION ALL
SELECT 'program_schedule', COUNT(*) FROM program_schedule
UNION ALL
SELECT 'workout_programs', COUNT(*) FROM workout_programs;
-- Uncomment the next lines if those tables exist:
-- UNION ALL SELECT 'program_progress', COUNT(*) FROM program_progress
-- UNION ALL SELECT 'program_day_completions', COUNT(*) FROM program_day_completions
-- UNION ALL SELECT 'program_assignment_progress', COUNT(*) FROM program_assignment_progress


-- -----------------------------------------------------------------------------
-- 5. OPTIONAL: Compare completions (System A vs B) for one client
--    Replace the client_id and program_assignment_id with real UUIDs from your DB.
--    Run only if program_progress and program_day_completions exist.
-- -----------------------------------------------------------------------------
/*
-- Example: pick one active program assignment
DO $$
DECLARE
  v_pa_id uuid;
  v_client_id uuid;
BEGIN
  SELECT id, client_id INTO v_pa_id, v_client_id
  FROM program_assignments
  WHERE status = 'active'
  LIMIT 1;
  RAISE NOTICE 'program_assignment_id: %', v_pa_id;
  RAISE NOTICE 'client_id: %', v_client_id;
END $$;
*/

-- Completions from program_day_assignments (System B: is_completed = true)
-- SELECT id, program_assignment_id, day_number, program_day, is_completed, completed_date, workout_assignment_id
-- FROM program_day_assignments
-- WHERE program_assignment_id = '<program_assignment_id>'
--   AND day_type = 'workout'
-- ORDER BY day_number;

-- Completions from program_day_completions (System A) – run if table exists
-- SELECT program_assignment_id, week_index, day_index, completed_by, completed_at
-- FROM program_day_completions
-- WHERE program_assignment_id = '<program_assignment_id>'
-- ORDER BY week_index, day_index;

-- Current pointer from program_progress – run if table exists
-- SELECT id, program_assignment_id, current_week_index, current_day_index, is_completed, updated_at
-- FROM program_progress
-- WHERE program_assignment_id = '<program_assignment_id>';


-- -----------------------------------------------------------------------------
-- 6. workout_logs / workout_sessions: do program day columns exist?
-- -----------------------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('workout_logs', 'workout_sessions')
  AND column_name IN ('program_assignment_id', 'program_schedule_id')
ORDER BY table_name, column_name;
