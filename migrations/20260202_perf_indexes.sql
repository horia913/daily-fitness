-- ============================================================================
-- Migration: Performance Indexes
-- Purpose: Add indexes to support optimized RPC queries
-- 
-- IMPORTANT: These indexes should only be added AFTER validating with EXPLAIN
-- ============================================================================

-- ============================================================================
-- VALIDATION INSTRUCTIONS
-- ============================================================================
-- Before running this migration, validate each index by running the EXPLAIN
-- query in Supabase SQL editor. Only add indexes that show:
-- 1. Seq Scan on large tables (bad - needs index)
-- 2. High "Rows Removed by Filter" count (needs index on filter column)
--
-- Example EXPLAIN query:
-- ```sql
-- EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
-- SELECT * FROM workout_logs 
-- WHERE client_id = 'some-uuid' 
--   AND completed_at IS NOT NULL 
-- ORDER BY completed_at DESC;
-- ```
-- ============================================================================

-- ============================================================================
-- INDEX 1: workout_logs (client_id, completed_at)
-- Supports: get_client_workout_summary RPC - weekly stats query
-- ============================================================================
-- EXPLAIN validation query:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT id, completed_at, total_duration_minutes, total_weight_lifted
-- FROM workout_logs
-- WHERE client_id = '<your-client-id>'
--   AND completed_at IS NOT NULL
-- ORDER BY completed_at DESC;
--
-- Expected improvement: Seq Scan → Index Scan
-- Rationale: _TO_BE_FILLED_AFTER_EXPLAIN_

CREATE INDEX IF NOT EXISTS idx_workout_logs_client_completed 
ON workout_logs (client_id, completed_at DESC) 
WHERE completed_at IS NOT NULL;

-- ============================================================================
-- INDEX 2: program_progress (program_assignment_id)
-- Supports: get_client_workout_summary and get_coach_pickup_workout RPCs
-- ============================================================================
-- EXPLAIN validation query:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM program_progress
-- WHERE program_assignment_id = '<your-assignment-id>';
--
-- Expected improvement: Seq Scan → Index Scan (if table grows large)
-- Rationale: _TO_BE_FILLED_AFTER_EXPLAIN_

CREATE INDEX IF NOT EXISTS idx_program_progress_assignment 
ON program_progress (program_assignment_id);

-- ============================================================================
-- INDEX 3: program_schedule (program_id, week_number, day_of_week)
-- Supports: get_client_workout_summary and get_coach_pickup_workout RPCs
-- ============================================================================
-- EXPLAIN validation query:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM program_schedule
-- WHERE program_id = '<your-program-id>'
-- ORDER BY week_number, day_of_week;
--
-- Expected improvement: Seq Scan → Index Scan
-- Rationale: _TO_BE_FILLED_AFTER_EXPLAIN_

CREATE INDEX IF NOT EXISTS idx_program_schedule_program_week_day 
ON program_schedule (program_id, week_number, day_of_week);

-- ============================================================================
-- INDEX 4: program_day_completions (program_assignment_id)
-- Supports: get_client_workout_summary RPC - progress percentage calculation
-- ============================================================================
-- EXPLAIN validation query:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT COUNT(*) FROM program_day_completions
-- WHERE program_assignment_id = '<your-assignment-id>';
--
-- Expected improvement: Seq Scan → Index Scan
-- Rationale: _TO_BE_FILLED_AFTER_EXPLAIN_

CREATE INDEX IF NOT EXISTS idx_program_day_completions_assignment 
ON program_day_completions (program_assignment_id);

-- ============================================================================
-- INDEX 5: workout_assignments (client_id, status)
-- Supports: get_client_workout_summary RPC - active assignments query
-- ============================================================================
-- EXPLAIN validation query:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM workout_assignments
-- WHERE client_id = '<your-client-id>'
--   AND status IN ('assigned', 'active', 'in_progress');
--
-- Expected improvement: Seq Scan → Index Scan
-- Rationale: _TO_BE_FILLED_AFTER_EXPLAIN_

CREATE INDEX IF NOT EXISTS idx_workout_assignments_client_status 
ON workout_assignments (client_id, status);

-- ============================================================================
-- INDEX 6: workout_set_logs (workout_log_id)
-- Supports: loadWeeklyVolume in WorkoutAnalytics.tsx
-- ============================================================================
-- EXPLAIN validation query:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT workout_log_id, weight, reps FROM workout_set_logs
-- WHERE workout_log_id IN ('<id1>', '<id2>', '<id3>');
--
-- Expected improvement: Seq Scan → Index Scan on large tables
-- Rationale: _TO_BE_FILLED_AFTER_EXPLAIN_

CREATE INDEX IF NOT EXISTS idx_workout_set_logs_workout_log 
ON workout_set_logs (workout_log_id);

-- ============================================================================
-- INDEX 7: workout_blocks (template_id)
-- Supports: useWorkoutAssignments hook and pickup RPC
-- ============================================================================
-- EXPLAIN validation query:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM workout_blocks
-- WHERE template_id = '<your-template-id>'
-- ORDER BY block_order;
--
-- Expected improvement: Seq Scan → Index Scan
-- Rationale: _TO_BE_FILLED_AFTER_EXPLAIN_

CREATE INDEX IF NOT EXISTS idx_workout_blocks_template 
ON workout_blocks (template_id, block_order);

-- ============================================================================
-- INDEX 8: workout_block_exercises (block_id)
-- Supports: useWorkoutAssignments hook and workout execution
-- ============================================================================
-- Note: This index may already exist. Use IF NOT EXISTS for safety.
-- 
-- EXPLAIN validation query:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM workout_block_exercises
-- WHERE block_id IN ('<id1>', '<id2>', '<id3>');

CREATE INDEX IF NOT EXISTS idx_workout_block_exercises_block 
ON workout_block_exercises (block_id);

-- ============================================================================
-- AFTER MIGRATION VERIFICATION
-- ============================================================================
-- Run these queries to verify indexes were created:
--
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
--   AND indexname LIKE 'idx_%'
-- ORDER BY indexname;
--
-- Test query performance:
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT ... your query ...
-- 
-- Look for "Index Scan" instead of "Seq Scan"
