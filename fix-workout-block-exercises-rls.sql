-- Fix RLS policies for workout_block_exercises table
-- This allows coaches to manage exercises within blocks they own

-- Enable RLS on workout_block_exercises if not already enabled
ALTER TABLE workout_block_exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can INSERT exercises into blocks they own
-- Checks that the block belongs to a template owned by the coach
CREATE POLICY "Coaches can insert exercises into their blocks"
ON workout_block_exercises
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_block_exercises.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can SELECT exercises from blocks they own
CREATE POLICY "Coaches can view exercises in their blocks"
ON workout_block_exercises
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_block_exercises.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can UPDATE exercises in blocks they own
CREATE POLICY "Coaches can update exercises in their blocks"
ON workout_block_exercises
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_block_exercises.block_id
    AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_block_exercises.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can DELETE exercises from blocks they own
CREATE POLICY "Coaches can delete exercises from their blocks"
ON workout_block_exercises
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_blocks wb
    JOIN workout_templates wt ON wb.template_id = wt.id
    WHERE wb.id = workout_block_exercises.block_id
    AND wt.coach_id = auth.uid()
  )
);

-- Also ensure workout_blocks has proper RLS policies
ALTER TABLE workout_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can INSERT blocks into their templates
CREATE POLICY "Coaches can insert blocks into their templates"
ON workout_blocks
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_templates wt
    WHERE wt.id = workout_blocks.template_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can SELECT blocks from their templates
CREATE POLICY "Coaches can view blocks in their templates"
ON workout_blocks
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_templates wt
    WHERE wt.id = workout_blocks.template_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can UPDATE blocks in their templates
CREATE POLICY "Coaches can update blocks in their templates"
ON workout_blocks
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_templates wt
    WHERE wt.id = workout_blocks.template_id
    AND wt.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_templates wt
    WHERE wt.id = workout_blocks.template_id
    AND wt.coach_id = auth.uid()
  )
);

-- Policy: Coaches can DELETE blocks from their templates
CREATE POLICY "Coaches can delete blocks from their templates"
ON workout_blocks
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_templates wt
    WHERE wt.id = workout_blocks.template_id
    AND wt.coach_id = auth.uid()
  )
);

