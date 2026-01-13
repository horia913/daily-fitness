-- ============================================================================
-- Cleanup Script: Remove Test Workouts, Programs, and Duplicate Exercises
-- Purpose: Clean database before client testing phase
-- WARNING: This will delete ALL workout templates, programs, and related data
-- ============================================================================

-- IMPORTANT: Review this script carefully before running
-- This deletes data in the correct order to avoid foreign key violations

BEGIN;

-- ============================================================================
-- Step 1: Delete Workout Execution Data (most dependent data first)
-- ============================================================================

-- Delete logged sets (from workout execution)
DELETE FROM workout_logs;

-- Delete workout sessions (completed workouts)
DELETE FROM workout_sessions;

-- Delete workout block assignments (client-specific workout data)
DELETE FROM workout_block_assignments;

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

-- Delete program assignments (client-program relationships)
DELETE FROM program_assignments;

-- Delete program progression rules
DELETE FROM program_progression_rules;

-- Delete programs
DELETE FROM programs;

-- ============================================================================
-- Step 6: Clean Up Duplicate Exercises (Optional)
-- ============================================================================

-- Find and delete duplicate exercises (keeping the oldest one)
-- This finds exercises with the same name and coach_id, keeping the first created
WITH duplicates AS (
  SELECT 
    id,
    name,
    coach_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY name, coach_id 
      ORDER BY created_at ASC
    ) as row_num
  FROM exercises
)
DELETE FROM exercises
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- ============================================================================
-- Step 7: Clean Up Exercise Relational Data (for deleted exercises)
-- ============================================================================

-- Note: These should cascade delete, but cleaning up orphaned records just in case
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
-- Verification Queries (run after cleanup to verify)
-- ============================================================================

-- Check remaining workout templates
SELECT COUNT(*) as remaining_templates FROM workout_templates;

-- Check remaining programs
SELECT COUNT(*) as remaining_programs FROM programs;

-- Check remaining exercises
SELECT COUNT(*) as remaining_exercises FROM exercises;

-- Check for duplicate exercises (should be 0)
SELECT name, coach_id, COUNT(*) as count
FROM exercises
GROUP BY name, coach_id
HAVING COUNT(*) > 1;
