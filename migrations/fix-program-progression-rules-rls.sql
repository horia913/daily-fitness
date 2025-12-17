-- Fix RLS policies for program_progression_rules table
-- This allows coaches to manage progression rules for programs they own

-- Enable RLS on program_progression_rules if not already enabled
ALTER TABLE program_progression_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Coaches can insert progression rules for their programs" ON program_progression_rules;
DROP POLICY IF EXISTS "Coaches can view progression rules for their programs" ON program_progression_rules;
DROP POLICY IF EXISTS "Coaches can update progression rules for their programs" ON program_progression_rules;
DROP POLICY IF EXISTS "Coaches can delete progression rules for their programs" ON program_progression_rules;

-- Policy: Coaches can INSERT progression rules for programs they own
CREATE POLICY "Coaches can insert progression rules for their programs"
ON program_progression_rules
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_progression_rules.program_id
    AND wp.coach_id = auth.uid()
  )
);

-- Policy: Coaches can SELECT progression rules for programs they own
CREATE POLICY "Coaches can view progression rules for their programs"
ON program_progression_rules
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_progression_rules.program_id
    AND wp.coach_id = auth.uid()
  )
);

-- Policy: Coaches can UPDATE progression rules for programs they own
CREATE POLICY "Coaches can update progression rules for their programs"
ON program_progression_rules
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_progression_rules.program_id
    AND wp.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_progression_rules.program_id
    AND wp.coach_id = auth.uid()
  )
);

-- Policy: Coaches can DELETE progression rules for programs they own
CREATE POLICY "Coaches can delete progression rules for their programs"
ON program_progression_rules
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_progression_rules.program_id
    AND wp.coach_id = auth.uid()
  )
);

