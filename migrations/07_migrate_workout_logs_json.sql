-- ============================================================================
-- Migration: Workout Logs JSON to Relational Tables
-- Purpose: Convert workout_exercise_logs.completed_sets and 
--          workout_set_logs.giant_set_exercises to relational tables
-- ============================================================================

-- Step 1: Create new relational tables
-- ============================================================================

-- Workout Set Details Table (for completed_sets)
CREATE TABLE IF NOT EXISTS workout_set_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_log_id UUID NOT NULL REFERENCES workout_exercise_logs(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight_kg NUMERIC(8,2),
  reps_completed INTEGER,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  rest_seconds INTEGER,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_set_log_set_number UNIQUE(workout_exercise_log_id, set_number)
);

CREATE INDEX IF NOT EXISTS idx_workout_set_details_exercise_log 
  ON workout_set_details(workout_exercise_log_id);

CREATE INDEX IF NOT EXISTS idx_workout_set_details_set_number 
  ON workout_set_details(workout_exercise_log_id, set_number);

-- Workout Giant Set Exercise Logs Table
CREATE TABLE IF NOT EXISTS workout_giant_set_exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_set_log_id UUID NOT NULL REFERENCES workout_set_logs(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  exercise_order INTEGER NOT NULL,
  weight_kg NUMERIC(8,2),
  reps_completed INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_giant_set_exercise_log UNIQUE(workout_set_log_id, exercise_id, exercise_order)
);

CREATE INDEX IF NOT EXISTS idx_giant_set_exercise_logs_set_log 
  ON workout_giant_set_exercise_logs(workout_set_log_id);

CREATE INDEX IF NOT EXISTS idx_giant_set_exercise_logs_exercise 
  ON workout_giant_set_exercise_logs(exercise_id);

-- Step 2: Migrate completed_sets data
-- ============================================================================

-- Migrate completed_sets JSON array to workout_set_details
-- Assumes completed_sets is an array of objects with: weight, reps, rpe, rest_seconds, notes, completed_at
INSERT INTO workout_set_details (
  workout_exercise_log_id,
  set_number,
  weight_kg,
  reps_completed,
  rpe,
  rest_seconds,
  notes,
  completed_at,
  created_at
)
SELECT 
  wel.id as workout_exercise_log_id,
  (row_number() OVER (PARTITION BY wel.id ORDER BY ordinality))::INTEGER as set_number,
  (set_data->>'weight')::NUMERIC(8,2) as weight_kg,
  (set_data->>'reps')::INTEGER as reps_completed,
  (set_data->>'rpe')::INTEGER as rpe,
  (set_data->>'rest_seconds')::INTEGER as rest_seconds,
  set_data->>'notes' as notes,
  (set_data->>'completed_at')::TIMESTAMPTZ as completed_at,
  wel.created_at
FROM workout_exercise_logs wel,
  jsonb_array_elements(wel.completed_sets) WITH ORDINALITY AS set_data
WHERE wel.completed_sets IS NOT NULL
  AND jsonb_typeof(wel.completed_sets) = 'array'
  AND jsonb_array_length(wel.completed_sets) > 0
ON CONFLICT (workout_exercise_log_id, set_number) DO NOTHING;

-- Alternative migration if completed_sets is array of numbers (simpler structure)
-- This handles cases where completed_sets might just be [weight1, weight2, ...] or [{reps: 10}, {reps: 12}]
INSERT INTO workout_set_details (
  workout_exercise_log_id,
  set_number,
  weight_kg,
  reps_completed,
  created_at
)
SELECT 
  wel.id as workout_exercise_log_id,
  (row_number() OVER (PARTITION BY wel.id ORDER BY set_value.ordinality))::INTEGER as set_number,
  CASE 
    WHEN jsonb_typeof(set_value.value) = 'number' THEN set_value.value::NUMERIC(8,2)
    WHEN jsonb_typeof(set_value.value) = 'object' THEN (set_value.value->>'weight')::NUMERIC(8,2)
    ELSE NULL
  END as weight_kg,
  CASE 
    WHEN jsonb_typeof(set_value.value) = 'object' THEN (set_value.value->>'reps')::INTEGER
    ELSE NULL
  END as reps_completed,
  wel.created_at
FROM workout_exercise_logs wel,
  jsonb_array_elements(wel.completed_sets) WITH ORDINALITY AS set_value
WHERE wel.completed_sets IS NOT NULL
  AND jsonb_typeof(wel.completed_sets) = 'array'
  AND jsonb_array_length(wel.completed_sets) > 0
  AND NOT EXISTS (
    SELECT 1 FROM workout_set_details wsd 
    WHERE wsd.workout_exercise_log_id = wel.id
  )
ON CONFLICT (workout_exercise_log_id, set_number) DO NOTHING;

-- Step 3: Migrate giant_set_exercises data
-- ============================================================================

-- Migrate giant_set_exercises JSON array to workout_giant_set_exercise_logs
-- Actual data structure: array of objects with: exercise_id, order, weight, reps
-- Note: Field is "order" not "exercise_order", "weight" not "weight_kg"
INSERT INTO workout_giant_set_exercise_logs (
  workout_set_log_id,
  exercise_id,
  exercise_order,
  weight_kg,
  reps_completed,
  created_at
)
SELECT 
  wsl.id as workout_set_log_id,
  (exercise_data->>'exercise_id')::UUID as exercise_id,
  COALESCE(
    (exercise_data->>'exercise_order')::INTEGER,
    (exercise_data->>'order')::INTEGER
  ) as exercise_order,
  COALESCE(
    (exercise_data->>'weight_kg')::NUMERIC(8,2),
    (exercise_data->>'weight')::NUMERIC(8,2)
  ) as weight_kg,
  (exercise_data->>'reps')::INTEGER as reps_completed,
  wsl.created_at
FROM workout_set_logs wsl,
  jsonb_array_elements(wsl.giant_set_exercises) AS exercise_data
WHERE wsl.giant_set_exercises IS NOT NULL
  AND jsonb_typeof(wsl.giant_set_exercises) = 'array'
  AND jsonb_array_length(wsl.giant_set_exercises) > 0
ON CONFLICT (workout_set_log_id, exercise_id, exercise_order) DO NOTHING;

-- NOTE: Investigation shows 3 rows with giant_set_exercises data (20 rows are NULL)

-- Step 4: Add RLS policies
-- ============================================================================

ALTER TABLE workout_set_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_giant_set_exercise_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own workout set details
CREATE POLICY "Users can read their own workout set details"
  ON workout_set_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_exercise_logs wel
      JOIN workout_logs wl ON wel.workout_log_id = wl.id
      WHERE wel.id = workout_set_details.workout_exercise_log_id
        AND wl.client_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert their own workout set details
CREATE POLICY "Users can insert their own workout set details"
  ON workout_set_details FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_exercise_logs wel
      JOIN workout_logs wl ON wel.workout_log_id = wl.id
      WHERE wel.id = workout_set_details.workout_exercise_log_id
        AND wl.client_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own workout set details
CREATE POLICY "Users can update their own workout set details"
  ON workout_set_details FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_exercise_logs wel
      JOIN workout_logs wl ON wel.workout_log_id = wl.id
      WHERE wel.id = workout_set_details.workout_exercise_log_id
        AND wl.client_id = auth.uid()
    )
  );

-- RLS Policy: Users can read their own giant set exercise logs
CREATE POLICY "Users can read their own giant set exercise logs"
  ON workout_giant_set_exercise_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_set_logs wsl
      JOIN workout_logs wl ON wsl.workout_log_id = wl.id
      WHERE wsl.id = workout_giant_set_exercise_logs.workout_set_log_id
        AND wl.client_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert their own giant set exercise logs
CREATE POLICY "Users can insert their own giant set exercise logs"
  ON workout_giant_set_exercise_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_set_logs wsl
      JOIN workout_logs wl ON wsl.workout_log_id = wl.id
      WHERE wsl.id = workout_giant_set_exercise_logs.workout_set_log_id
        AND wl.client_id = auth.uid()
    )
  );

-- Step 5: Verification queries
-- ============================================================================

-- Verify migration counts
SELECT 
  'completed_sets JSON rows' as source,
  COUNT(*) as count
FROM workout_exercise_logs
WHERE completed_sets IS NOT NULL
  AND jsonb_typeof(completed_sets) = 'array'
  AND jsonb_array_length(completed_sets) > 0
UNION ALL
SELECT 
  'workout_set_details migrated rows',
  COUNT(*)
FROM workout_set_details
UNION ALL
SELECT 
  'giant_set_exercises JSON rows',
  COUNT(*)
FROM workout_set_logs
WHERE giant_set_exercises IS NOT NULL
  AND jsonb_typeof(giant_set_exercises) = 'array'
  AND jsonb_array_length(giant_set_exercises) > 0
UNION ALL
SELECT 
  'workout_giant_set_exercise_logs migrated rows',
  COUNT(*)
FROM workout_giant_set_exercise_logs;

-- Step 6: Add comments
-- ============================================================================

COMMENT ON TABLE workout_set_details IS 
  'Relational table for workout set details (migrated from workout_exercise_logs.completed_sets JSONB)';

COMMENT ON TABLE workout_giant_set_exercise_logs IS 
  'Relational table for giant set exercise logs (migrated from workout_set_logs.giant_set_exercises JSONB)';

COMMENT ON COLUMN workout_exercise_logs.completed_sets IS 
  'DEPRECATED: Use workout_set_details table linked via workout_exercise_log_id';

COMMENT ON COLUMN workout_set_logs.giant_set_exercises IS 
  'DEPRECATED: Use workout_giant_set_exercise_logs table linked via workout_set_log_id';

