-- ============================================================================
-- Client RLS: allow reading template child rows via active program (schedule)
-- ============================================================================
-- Problem:
--   workout_set_entries SELECT for clients includes:
--     - workout_assignments OR
--     - program_assignments (active) + program_schedule (matching template_id)
--   Child tables (workout_set_entry_exercises, workout_drop_sets, …) only had
--   the workout_assignments path. Templates that appear only on the client's
--   program week (never started as a standalone assignment) then returned
--   set entries but 0 child rows → UI showed set types with no exercise names.
-- Fix:
--   Add a second SELECT policy per table: same program_schedule path as set
--   entries, keyed by set_entry_id → workout_set_entries.template_id.
-- ============================================================================

CREATE POLICY "Clients can view set entry exercises via active program"
ON public.workout_set_entry_exercises FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_set_entries wb
    INNER JOIN program_assignments pa
      ON pa.client_id = auth.uid() AND pa.status = 'active'::text
    INNER JOIN program_schedule ps
      ON ps.program_id = pa.program_id AND ps.template_id = wb.template_id
    WHERE wb.id = workout_set_entry_exercises.set_entry_id
  )
);

CREATE POLICY "Clients can view drop sets via active program"
ON public.workout_drop_sets FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_set_entries wb
    INNER JOIN program_assignments pa
      ON pa.client_id = auth.uid() AND pa.status = 'active'::text
    INNER JOIN program_schedule ps
      ON ps.program_id = pa.program_id AND ps.template_id = wb.template_id
    WHERE wb.id = workout_drop_sets.set_entry_id
  )
);

CREATE POLICY "Clients can view cluster sets via active program"
ON public.workout_cluster_sets FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_set_entries wb
    INNER JOIN program_assignments pa
      ON pa.client_id = auth.uid() AND pa.status = 'active'::text
    INNER JOIN program_schedule ps
      ON ps.program_id = pa.program_id AND ps.template_id = wb.template_id
    WHERE wb.id = workout_cluster_sets.set_entry_id
  )
);

CREATE POLICY "Clients can view time protocols via active program"
ON public.workout_time_protocols FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_set_entries wb
    INNER JOIN program_assignments pa
      ON pa.client_id = auth.uid() AND pa.status = 'active'::text
    INNER JOIN program_schedule ps
      ON ps.program_id = pa.program_id AND ps.template_id = wb.template_id
    WHERE wb.id = workout_time_protocols.set_entry_id
  )
);

CREATE POLICY "Clients can view rest pause sets via active program"
ON public.workout_rest_pause_sets FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_set_entries wb
    INNER JOIN program_assignments pa
      ON pa.client_id = auth.uid() AND pa.status = 'active'::text
    INNER JOIN program_schedule ps
      ON ps.program_id = pa.program_id AND ps.template_id = wb.template_id
    WHERE wb.id = workout_rest_pause_sets.set_entry_id
  )
);

CREATE POLICY "Clients can view HR sets via active program"
ON public.workout_hr_sets FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_set_entries wb
    INNER JOIN program_assignments pa
      ON pa.client_id = auth.uid() AND pa.status = 'active'::text
    INNER JOIN program_schedule ps
      ON ps.program_id = pa.program_id AND ps.template_id = wb.template_id
    WHERE wb.id = workout_hr_sets.set_entry_id
  )
);
