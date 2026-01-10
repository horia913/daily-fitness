-- Inspect workout_logs and workout_set_logs schema
-- This query shows all columns, data types, and constraints for both tables
-- to verify they support all block types

-- ============================================================
-- 1. workout_logs table schema
-- ============================================================
SELECT 
    'workout_logs' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_logs'
ORDER BY ordinal_position;

-- ============================================================
-- 2. workout_set_logs table schema
-- ============================================================
SELECT 
    'workout_set_logs' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_set_logs'
ORDER BY ordinal_position;

-- ============================================================
-- 3. List all columns in workout_set_logs (for easy reference)
-- ============================================================
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN is_nullable = 'YES' THEN 'NULLABLE'
        ELSE 'NOT NULL'
    END as nullable_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_set_logs'
ORDER BY ordinal_position;

-- ============================================================
-- 4. Check for block type specific columns
-- ============================================================
-- Expected columns based on block types:
-- straight_set: exercise_id, weight, reps, set_number
-- superset: superset_exercise_a_id, superset_weight_a, superset_reps_a, superset_exercise_b_id, superset_weight_b, superset_reps_b, set_number
-- giant_set: giant_set_exercises (JSONB), round_number
-- dropset: exercise_id, dropset_initial_weight, dropset_initial_reps, dropset_final_weight, dropset_final_reps, dropset_percentage, set_number
-- cluster_set: exercise_id, weight, reps, set_number, cluster_number
-- rest_pause: exercise_id, weight, rest_pause_initial_weight, rest_pause_initial_reps, rest_pause_reps_after, rest_pause_number, set_number
-- preexhaust: preexhaust_isolation_exercise_id, preexhaust_isolation_weight, preexhaust_isolation_reps, preexhaust_compound_exercise_id, preexhaust_compound_weight, preexhaust_compound_reps, set_number
-- amrap: exercise_id, amrap_total_reps, amrap_duration_seconds, amrap_target_reps
-- emom: exercise_id, emom_minute_number, emom_total_reps_this_min, emom_total_duration_sec
-- tabata: exercise_id, tabata_rounds_completed, tabata_total_duration_sec
-- fortime: exercise_id, fortime_total_reps, fortime_time_taken_sec, fortime_time_cap_sec, fortime_target_reps
-- pyramid_set: exercise_id, weight, reps, pyramid_step_number
-- ladder: exercise_id, weight, reps, ladder_rung_number, ladder_round_number

SELECT 
    column_name,
    'EXISTS' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workout_set_logs'
  AND column_name IN (
    -- Common columns
    'id', 'client_id', 'block_id', 'block_type', 'workout_log_id', 'completed_at',
    -- straight_set
    'exercise_id', 'weight', 'reps', 'set_number',
    -- superset
    'superset_exercise_a_id', 'superset_weight_a', 'superset_reps_a', 
    'superset_exercise_b_id', 'superset_weight_b', 'superset_reps_b',
    -- giant_set
    'giant_set_exercises', 'round_number',
    -- dropset
    'dropset_initial_weight', 'dropset_initial_reps', 
    'dropset_final_weight', 'dropset_final_reps', 'dropset_percentage',
    -- cluster_set
    'cluster_number',
    -- rest_pause
    'rest_pause_initial_weight', 'rest_pause_initial_reps', 
    'rest_pause_reps_after', 'rest_pause_number',
    -- preexhaust
    'preexhaust_isolation_exercise_id', 'preexhaust_isolation_weight', 'preexhaust_isolation_reps',
    'preexhaust_compound_exercise_id', 'preexhaust_compound_weight', 'preexhaust_compound_reps',
    -- amrap
    'amrap_total_reps', 'amrap_duration_seconds', 'amrap_target_reps',
    -- emom
    'emom_minute_number', 'emom_total_reps_this_min', 'emom_total_duration_sec',
    -- tabata
    'tabata_rounds_completed', 'tabata_total_duration_sec',
    -- fortime
    'fortime_total_reps', 'fortime_time_taken_sec', 'fortime_time_cap_sec', 'fortime_target_reps',
    -- pyramid_set
    'pyramid_step_number',
    -- ladder
    'ladder_rung_number', 'ladder_round_number'
  )
ORDER BY column_name;

-- ============================================================
-- 5. Check for missing columns (columns expected but not found)
-- ============================================================
WITH expected_columns AS (
    SELECT unnest(ARRAY[
        -- Common
        'id', 'client_id', 'block_id', 'block_type', 'workout_log_id', 'completed_at',
        -- straight_set
        'exercise_id', 'weight', 'reps', 'set_number',
        -- superset
        'superset_exercise_a_id', 'superset_weight_a', 'superset_reps_a', 
        'superset_exercise_b_id', 'superset_weight_b', 'superset_reps_b',
        -- giant_set
        'giant_set_exercises', 'round_number',
        -- dropset
        'dropset_initial_weight', 'dropset_initial_reps', 
        'dropset_final_weight', 'dropset_final_reps', 'dropset_percentage',
        -- cluster_set
        'cluster_number',
        -- rest_pause
        'rest_pause_initial_weight', 'rest_pause_initial_reps', 
        'rest_pause_reps_after', 'rest_pause_number',
        -- preexhaust
        'preexhaust_isolation_exercise_id', 'preexhaust_isolation_weight', 'preexhaust_isolation_reps',
        'preexhaust_compound_exercise_id', 'preexhaust_compound_weight', 'preexhaust_compound_reps',
        -- amrap
        'amrap_total_reps', 'amrap_duration_seconds', 'amrap_target_reps',
        -- emom
        'emom_minute_number', 'emom_total_reps_this_min', 'emom_total_duration_sec',
        -- tabata
        'tabata_rounds_completed', 'tabata_total_duration_sec',
        -- fortime
        'fortime_total_reps', 'fortime_time_taken_sec', 'fortime_time_cap_sec', 'fortime_target_reps',
        -- pyramid_set
        'pyramid_step_number',
        -- ladder
        'ladder_rung_number', 'ladder_round_number'
    ]) AS column_name
),
existing_columns AS (
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workout_set_logs'
)
SELECT 
    ec.column_name,
    'MISSING' as status
FROM expected_columns ec
LEFT JOIN existing_columns ex ON ec.column_name = ex.column_name
WHERE ex.column_name IS NULL
ORDER BY ec.column_name;

-- ============================================================
-- 6. Sample data structure (first 5 rows if any exist)
-- ============================================================
SELECT 
    'Sample workout_set_logs data' as info,
    id,
    block_type,
    exercise_id,
    weight,
    reps,
    set_number,
    created_at
FROM workout_set_logs
ORDER BY created_at DESC
LIMIT 5;
