-- COMPLETE FIX: Add RLS policies for clients to view workout data through workout_assignments
-- This fixes the issue where time_protocols (and other special tables) can't be viewed by clients
-- because the RLS policies check workout_blocks/workout_templates which clients can't see

-- ============================================================
-- STEP 1: Allow clients to view workout_blocks through workout_assignments
-- ============================================================

-- Drop existing client policies if they exist
DROP POLICY IF EXISTS "Clients can view blocks in assigned workouts" ON workout_blocks;

-- Policy: Clients can SELECT blocks from templates assigned to them
CREATE POLICY "Clients can view blocks in assigned workouts"
ON workout_blocks
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_assignments wa
    JOIN workout_templates wt ON wa.workout_template_id = wt.id
    WHERE wt.id = workout_blocks.template_id
    AND wa.client_id = auth.uid()
  )
);

-- ============================================================
-- STEP 2: Allow clients to view workout_templates through workout_assignments
-- ============================================================

-- Drop existing client policies if they exist
DROP POLICY IF EXISTS "Clients can view assigned workout templates" ON workout_templates;

-- Policy: Clients can SELECT templates assigned to them
CREATE POLICY "Clients can view assigned workout templates"
ON workout_templates
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_assignments wa
    WHERE wa.workout_template_id = workout_templates.id
    AND wa.client_id = auth.uid()
  )
);

-- ============================================================
-- STEP 3: Fix time_protocols RLS policy (now workout_blocks is accessible)
-- ============================================================

DROP POLICY IF EXISTS "Clients can view time protocols in assigned workouts" ON workout_time_protocols;

CREATE POLICY "Clients can view time protocols in assigned workouts"
ON workout_time_protocols
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    JOIN workout_assignments wa ON wt.id = wa.workout_template_id
    WHERE wb.id = workout_time_protocols.block_id
    AND wa.client_id = auth.uid()
  )
);

-- ============================================================
-- STEP 4: Fix other special tables RLS policies
-- ============================================================

-- workout_drop_sets
DROP POLICY IF EXISTS "Clients can view drop sets in assigned workouts" ON workout_drop_sets;
CREATE POLICY "Clients can view drop sets in assigned workouts"
ON workout_drop_sets
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    JOIN workout_assignments wa ON wt.id = wa.workout_template_id
    WHERE wb.id = workout_drop_sets.block_id
    AND wa.client_id = auth.uid()
  )
);

-- workout_cluster_sets
DROP POLICY IF EXISTS "Clients can view cluster sets in assigned workouts" ON workout_cluster_sets;
CREATE POLICY "Clients can view cluster sets in assigned workouts"
ON workout_cluster_sets
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    JOIN workout_assignments wa ON wt.id = wa.workout_template_id
    WHERE wb.id = workout_cluster_sets.block_id
    AND wa.client_id = auth.uid()
  )
);

-- workout_rest_pause_sets
DROP POLICY IF EXISTS "Clients can view rest pause sets in assigned workouts" ON workout_rest_pause_sets;
CREATE POLICY "Clients can view rest pause sets in assigned workouts"
ON workout_rest_pause_sets
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    JOIN workout_assignments wa ON wt.id = wa.workout_template_id
    WHERE wb.id = workout_rest_pause_sets.block_id
    AND wa.client_id = auth.uid()
  )
);

-- workout_block_exercises (if clients need to view these too)
DROP POLICY IF EXISTS "Clients can view exercises in assigned workouts" ON workout_block_exercises;
CREATE POLICY "Clients can view exercises in assigned workouts"
ON workout_block_exercises
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    JOIN workout_assignments wa ON wt.id = wa.workout_template_id
    WHERE wb.id = workout_block_exercises.block_id
    AND wa.client_id = auth.uid()
  )
);
