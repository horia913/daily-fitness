-- Fix RLS policies for program_schedule table
-- This allows coaches to manage schedules for programs they own

-- Enable RLS on program_schedule if not already enabled
ALTER TABLE program_schedule ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Coaches can insert schedules for their programs" ON program_schedule;
DROP POLICY IF EXISTS "Coaches can view schedules for their programs" ON program_schedule;
DROP POLICY IF EXISTS "Coaches can update schedules for their programs" ON program_schedule;
DROP POLICY IF EXISTS "Coaches can delete schedules for their programs" ON program_schedule;

-- Policy: Coaches can INSERT schedules for programs they own
CREATE POLICY "Coaches can insert schedules for their programs"
ON program_schedule
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_schedule.program_id
    AND wp.coach_id = auth.uid()
  )
);

-- Policy: Coaches can SELECT schedules for programs they own
CREATE POLICY "Coaches can view schedules for their programs"
ON program_schedule
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_schedule.program_id
    AND wp.coach_id = auth.uid()
  )
);

-- Policy: Coaches can UPDATE schedules for programs they own
CREATE POLICY "Coaches can update schedules for their programs"
ON program_schedule
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_schedule.program_id
    AND wp.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_schedule.program_id
    AND wp.coach_id = auth.uid()
  )
);

-- Policy: Coaches can DELETE schedules for programs they own
CREATE POLICY "Coaches can delete schedules for their programs"
ON program_schedule
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_schedule.program_id
    AND wp.coach_id = auth.uid()
  )
);

