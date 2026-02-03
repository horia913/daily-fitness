-- ============================================================================
-- Migration: RLS performance cleanup (workout_block_exercises + related)
-- Purpose: Reduce redundant SELECT policy branches and normalize is_admin()
--          without loosening security.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) workout_block_exercises — reduce to exactly TWO SELECT policies
-- ----------------------------------------------------------------------------
-- DROP redundant client SELECT (JOIN/EXISTS path). Client access remains via
-- "Clients can read assigned workout block exercises" (block_id IN subquery).
DROP POLICY IF EXISTS "Clients can view exercises in assigned workouts" ON public.workout_block_exercises;

-- ----------------------------------------------------------------------------
-- 2) workout_blocks — remove duplicate client-via-assignments from second policy
-- ----------------------------------------------------------------------------
-- "Clients can read assigned workout blocks" (authenticated) already grants
-- client access via template_id IN (workout_assignments). Drop the policy that
-- ORs (assignments + program_schedule + coach + admin) and recreate with only
-- (program_schedule + coach + admin), and use is_admin().
DROP POLICY IF EXISTS "Clients can view blocks in assigned workouts" ON public.workout_blocks;

CREATE POLICY "Clients can view blocks in assigned workouts"
ON public.workout_blocks
FOR SELECT
TO public
USING (
  (EXISTS (
    SELECT 1
    FROM program_assignments pa
    JOIN program_schedule ps ON (pa.program_id = ps.program_id)
    WHERE ps.template_id = workout_blocks.template_id
      AND pa.client_id = auth.uid()
      AND pa.status = 'active'
  ))
  OR (EXISTS (
    SELECT 1
    FROM workout_templates wt
    WHERE wt.id = workout_blocks.template_id
      AND wt.coach_id = auth.uid()
  ))
  OR public.is_admin()
);

-- ----------------------------------------------------------------------------
-- 3) Indexes — support remaining RLS policy shape (create only if missing)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_workout_assignments_client_template
ON public.workout_assignments (client_id, workout_template_id);

CREATE INDEX IF NOT EXISTS idx_workout_blocks_template_id_id
ON public.workout_blocks (template_id, id);

-- ----------------------------------------------------------------------------
-- 4) Normalize is_admin(auth.uid()) → public.is_admin() across all policies
-- ----------------------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS "profiles_select_own_or_coach" ON public.profiles;
CREATE POLICY "profiles_select_own_or_coach"
ON public.profiles FOR SELECT TO public
USING (
  (id = auth.uid())
  OR (EXISTS (SELECT 1 FROM clients WHERE clients.client_id = profiles.id AND clients.coach_id = auth.uid()))
  OR public.is_admin()
);

-- program_schedule
DROP POLICY IF EXISTS "Clients can view schedule for assigned programs" ON public.program_schedule;
CREATE POLICY "Clients can view schedule for assigned programs"
ON public.program_schedule FOR SELECT TO public
USING (
  (EXISTS (SELECT 1 FROM program_assignments pa WHERE pa.program_id = program_schedule.program_id AND pa.client_id = auth.uid() AND pa.status = 'active'))
  OR (EXISTS (SELECT 1 FROM workout_programs wp WHERE wp.id = program_schedule.program_id AND wp.coach_id = auth.uid()))
  OR public.is_admin()
);

-- workout_cluster_sets
DROP POLICY IF EXISTS "Coaches can view cluster sets in their blocks" ON public.workout_cluster_sets;
CREATE POLICY "Coaches can view cluster sets in their blocks"
ON public.workout_cluster_sets FOR SELECT TO public
USING (
  (EXISTS (
    SELECT 1 FROM workout_blocks wb
    JOIN workout_templates wt ON (wb.template_id = wt.id)
    WHERE wb.id = workout_cluster_sets.block_id AND wt.coach_id = auth.uid()
  ))
  OR public.is_admin()
);

-- workout_templates
DROP POLICY IF EXISTS "Clients can view assigned workout templates" ON public.workout_templates;
CREATE POLICY "Clients can view assigned workout templates"
ON public.workout_templates FOR SELECT TO public
USING (
  (EXISTS (SELECT 1 FROM workout_assignments wa WHERE wa.workout_template_id = workout_templates.id AND wa.client_id = auth.uid()))
  OR (EXISTS (
    SELECT 1 FROM program_assignments pa
    JOIN program_schedule ps ON (pa.program_id = ps.program_id)
    WHERE ps.template_id = workout_templates.id AND pa.client_id = auth.uid() AND pa.status = 'active'
  ))
  OR (coach_id = auth.uid())
  OR public.is_admin()
);

-- workout_time_protocols
DROP POLICY IF EXISTS "Coaches can view time protocols in their blocks" ON public.workout_time_protocols;
CREATE POLICY "Coaches can view time protocols in their blocks"
ON public.workout_time_protocols FOR SELECT TO public
USING (
  (EXISTS (
    SELECT 1 FROM workout_blocks wb
    JOIN workout_templates wt ON (wb.template_id = wt.id)
    WHERE wb.id = workout_time_protocols.block_id AND wt.coach_id = auth.uid()
  ))
  OR public.is_admin()
);

-- workout_programs
DROP POLICY IF EXISTS "Clients can view assigned workout programs" ON public.workout_programs;
CREATE POLICY "Clients can view assigned workout programs"
ON public.workout_programs FOR SELECT TO public
USING (
  (EXISTS (SELECT 1 FROM program_assignments pa WHERE pa.program_id = workout_programs.id AND pa.client_id = auth.uid() AND pa.status = 'active'))
  OR (coach_id = auth.uid())
  OR public.is_admin()
);

-- workout_rest_pause_sets
DROP POLICY IF EXISTS "Coaches can view rest pause sets in their blocks" ON public.workout_rest_pause_sets;
CREATE POLICY "Coaches can view rest pause sets in their blocks"
ON public.workout_rest_pause_sets FOR SELECT TO public
USING (
  (EXISTS (
    SELECT 1 FROM workout_blocks wb
    JOIN workout_templates wt ON (wb.template_id = wt.id)
    WHERE wb.id = workout_rest_pause_sets.block_id AND wt.coach_id = auth.uid()
  ))
  OR public.is_admin()
);

-- workout_hr_sets (ALL: qual and with_check)
DROP POLICY IF EXISTS "Coaches can manage HR sets for their templates" ON public.workout_hr_sets;
CREATE POLICY "Coaches can manage HR sets for their templates"
ON public.workout_hr_sets FOR ALL TO public
USING (
  (EXISTS (
    SELECT 1 FROM workout_blocks wb
    JOIN workout_templates wt ON (wb.template_id = wt.id)
    WHERE wb.id = workout_hr_sets.block_id AND wt.coach_id = auth.uid()
  ))
  OR public.is_admin()
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM workout_blocks wb
    JOIN workout_templates wt ON (wb.template_id = wt.id)
    WHERE wb.id = workout_hr_sets.block_id AND wt.coach_id = auth.uid()
  ))
  OR public.is_admin()
);

-- client_program_progression_rules
DROP POLICY IF EXISTS "Clients can view their own progression rules" ON public.client_program_progression_rules;
CREATE POLICY "Clients can view their own progression rules"
ON public.client_program_progression_rules FOR SELECT TO public
USING (
  (client_id = auth.uid())
  OR (EXISTS (SELECT 1 FROM clients c WHERE c.client_id = client_program_progression_rules.client_id AND c.coach_id = auth.uid()))
  OR public.is_admin()
);

-- workout_drop_sets
DROP POLICY IF EXISTS "Coaches can view drop sets in their blocks" ON public.workout_drop_sets;
CREATE POLICY "Coaches can view drop sets in their blocks"
ON public.workout_drop_sets FOR SELECT TO public
USING (
  (EXISTS (
    SELECT 1 FROM workout_blocks wb
    JOIN workout_templates wt ON (wb.template_id = wt.id)
    WHERE wb.id = workout_drop_sets.block_id AND wt.coach_id = auth.uid()
  ))
  OR public.is_admin()
);

-- ============================================================================
-- After migration: retest template edit as coach; confirm no 500s, no regression.
-- ============================================================================
