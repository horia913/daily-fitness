-- Add RLS policy to allow clients to view time_protocols for workouts assigned to them
-- This allows clients to see AMRAP, EMOM, For Time, and Tabata exercise data

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Clients can view time protocols in assigned workouts" ON workout_time_protocols;
DROP POLICY IF EXISTS "Clients can view drop sets in assigned workouts" ON workout_drop_sets;
DROP POLICY IF EXISTS "Clients can view cluster sets in assigned workouts" ON workout_cluster_sets;
DROP POLICY IF EXISTS "Clients can view rest pause sets in assigned workouts" ON workout_rest_pause_sets;

-- Policy: Clients can SELECT time protocols from blocks in workouts assigned to them
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

-- Also add policies for other special tables that clients need to view
-- workout_drop_sets
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
