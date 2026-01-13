-- ============================================================================
-- Delete All Workouts, Programs, Logs, and Exercises
-- Purpose: Complete database cleanup - remove everything to start fresh
-- WARNING: This will delete ALL workout templates, programs, logs, and exercises
-- ============================================================================
-- 
-- This script deletes in the correct order to avoid foreign key violations:
-- 1. Workout execution/logs data (most dependent)
-- 2. Workout assignments
-- 3. Workout block special tables (exercise-level data)
-- 4. Workout blocks
-- 5. Workout templates
-- 6. Program assignments and progression rules
-- 7. Programs
-- 8. Exercise alternatives
-- 9. Exercises (cascades to muscle_groups, equipment, instructions, tips)
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Delete Workout Execution/Logs Data (most dependent data first)
-- ============================================================================

-- Delete workout set details (from workout execution)
DELETE FROM workout_set_details;

-- Delete workout giant set exercise logs
DELETE FROM workout_giant_set_exercise_logs;

-- Delete workout exercise logs
DELETE FROM workout_exercise_logs;

-- Delete workout logs (completed workouts)
DELETE FROM workout_logs;

-- Delete workout sessions
DELETE FROM workout_sessions;

-- Delete workout block assignments (client-specific workout data)
DELETE FROM workout_block_assignments;

-- Delete workout assignments (if exists)
DELETE FROM workout_assignments;

-- ============================================================================
-- Step 2: Delete Workout Block Special Tables (exercise-level data)
-- ============================================================================

-- Delete time protocol exercises (amrap, emom, for_time, tabata, circuit)
DELETE FROM workout_time_protocols;

-- Delete ladder set exercises
DELETE FROM workout_ladder_sets;

-- Delete pyramid set exercises
DELETE FROM workout_pyramid_sets;

-- Delete rest pause set exercises
DELETE FROM workout_rest_pause_sets;

-- Delete cluster set exercises
DELETE FROM workout_cluster_sets;

-- Delete drop set exercises
DELETE FROM workout_drop_sets;

-- Delete block exercises (straight_set, superset, giant_set, pre_exhaustion)
DELETE FROM workout_block_exercises;

-- ============================================================================
-- Step 3: Delete Workout Blocks (block-level data)
-- ============================================================================

DELETE FROM workout_blocks;

-- ============================================================================
-- Step 4: Delete Workout Templates
-- ============================================================================

DELETE FROM workout_templates;

-- ============================================================================
-- Step 5: Delete Program Data
-- ============================================================================

-- Delete program day assignments
DELETE FROM program_day_assignments;

-- Delete program days
DELETE FROM program_days;

-- Delete program assignments (client-program relationships)
DELETE FROM program_assignments;

-- Delete program progression rules
DELETE FROM program_progression_rules;

-- Delete program schedule
DELETE FROM program_schedule;

-- Delete workout programs
DELETE FROM workout_programs;

-- ============================================================================
-- Step 6: Delete Exercise Alternatives
-- ============================================================================

DELETE FROM exercise_alternatives;

-- ============================================================================
-- Step 7: Delete All Exercises
-- ============================================================================
-- This will CASCADE delete:
-- - exercise_muscle_groups (ON DELETE CASCADE)
-- - exercise_equipment (ON DELETE CASCADE)
-- - exercise_instructions (ON DELETE CASCADE)
-- - exercise_tips (ON DELETE CASCADE)

DELETE FROM exercises;

-- ============================================================================
-- Step 8: Clean Up Any Orphaned Records (safety check)
-- ============================================================================

-- These should already be deleted by CASCADE, but cleaning up just in case
DELETE FROM exercise_muscle_groups
WHERE exercise_id NOT IN (SELECT id FROM exercises);

DELETE FROM exercise_equipment
WHERE exercise_id NOT IN (SELECT id FROM exercises);

DELETE FROM exercise_instructions
WHERE exercise_id NOT IN (SELECT id FROM exercises);

DELETE FROM exercise_tips
WHERE exercise_id NOT IN (SELECT id FROM exercises);

COMMIT;

-- ============================================================================
-- Verification Queries (run after deletion to verify)
-- ============================================================================

SELECT COUNT(*) as remaining_templates FROM workout_templates;
-- Should return 0

SELECT COUNT(*) as remaining_programs FROM workout_programs;
-- Should return 0

SELECT COUNT(*) as remaining_exercises FROM exercises;
-- Should return 0

SELECT COUNT(*) as remaining_workout_logs FROM workout_logs;
-- Should return 0
