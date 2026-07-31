-- =====================================================================
-- PROGRAM SPINE — RLS for 7 exposed tables + workout_exercise_assignments fix
-- Run once in Supabase SQL Editor (one paste).
--
-- Mirrors existing ownership paths (do not change access model):
--   program_assignments          → coach ALL (coach_id), client SELECT (client_id)
--   program_day_assignments      → same assignment scope (IN-form in prod; EXISTS here)
--   workout_set_entry_exercises  → coach via template; client via assignment + active program
--   workout_exercise_assignments → workout_set_entry_exercises (workout_block_exercise_id)
--     NOTE: workout_block_assignments was dropped (PHASE0_PURGE); parent FK is dead.
--
-- SECURITY DEFINER RPCs (assign_program_instance, save_workout_canvas,
-- save_instance_workout_canvas) bypass RLS for writes — unaffected.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PART 1 — Supporting indexes for RLS subqueries (idempotent)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_program_assignments_coach_id
  ON public.program_assignments (coach_id);

CREATE INDEX IF NOT EXISTS idx_program_assignments_client_id
  ON public.program_assignments (client_id);

CREATE INDEX IF NOT EXISTS idx_pip_assignment_id
  ON public.program_instance_phases (program_assignment_id);

CREATE INDEX IF NOT EXISTS idx_piw_assignment_id
  ON public.program_instance_workouts (program_assignment_id);

CREATE INDEX IF NOT EXISTS idx_pise_workout_id
  ON public.program_instance_set_entries (program_instance_workout_id);

CREATE INDEX IF NOT EXISTS idx_pisee_set_entry_id
  ON public.program_instance_set_entry_exercises (program_instance_set_entry_id);

CREATE INDEX IF NOT EXISTS idx_pisep_set_entry_id
  ON public.program_instance_set_entry_protocols (program_instance_set_entry_id);

CREATE INDEX IF NOT EXISTS idx_pisp_slot_id
  ON public.program_instance_set_prescriptions (slot_id);

CREATE INDEX IF NOT EXISTS idx_wsp_slot_id
  ON public.workout_set_prescriptions (slot_id);

CREATE INDEX IF NOT EXISTS idx_wse_template_id
  ON public.workout_set_entries (template_id);

CREATE INDEX IF NOT EXISTS idx_wea_block_exercise_id
  ON public.workout_exercise_assignments (workout_block_exercise_id);

-- ---------------------------------------------------------------------
-- PART 2 — program_instance_phases
-- Mirror: program_assignments + program_day_assignments assignment scope
-- ---------------------------------------------------------------------
ALTER TABLE public.program_instance_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage program instance phases" ON public.program_instance_phases;
CREATE POLICY "Coaches manage program instance phases"
  ON public.program_instance_phases
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_assignments pa
      WHERE pa.id = program_instance_phases.program_assignment_id
        AND pa.coach_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.program_assignments pa
      WHERE pa.id = program_instance_phases.program_assignment_id
        AND pa.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Clients can view program instance phases" ON public.program_instance_phases;
CREATE POLICY "Clients can view program instance phases"
  ON public.program_instance_phases
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_assignments pa
      WHERE pa.id = program_instance_phases.program_assignment_id
        AND pa.client_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------
-- PART 3 — program_instance_workouts
-- ---------------------------------------------------------------------
ALTER TABLE public.program_instance_workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage program instance workouts" ON public.program_instance_workouts;
CREATE POLICY "Coaches manage program instance workouts"
  ON public.program_instance_workouts
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_assignments pa
      WHERE pa.id = program_instance_workouts.program_assignment_id
        AND pa.coach_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.program_assignments pa
      WHERE pa.id = program_instance_workouts.program_assignment_id
        AND pa.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Clients can view program instance workouts" ON public.program_instance_workouts;
CREATE POLICY "Clients can view program instance workouts"
  ON public.program_instance_workouts
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_assignments pa
      WHERE pa.id = program_instance_workouts.program_assignment_id
        AND pa.client_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------
-- PART 4 — program_instance_set_entries
-- Mirror chain: set_entries → workouts → program_assignments
-- ---------------------------------------------------------------------
ALTER TABLE public.program_instance_set_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage program instance set entries" ON public.program_instance_set_entries;
CREATE POLICY "Coaches manage program instance set entries"
  ON public.program_instance_set_entries
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_instance_workouts piw
      JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
      WHERE piw.id = program_instance_set_entries.program_instance_workout_id
        AND pa.coach_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.program_instance_workouts piw
      JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
      WHERE piw.id = program_instance_set_entries.program_instance_workout_id
        AND pa.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Clients can view program instance set entries" ON public.program_instance_set_entries;
CREATE POLICY "Clients can view program instance set entries"
  ON public.program_instance_set_entries
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_instance_workouts piw
      JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
      WHERE piw.id = program_instance_set_entries.program_instance_workout_id
        AND pa.client_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------
-- PART 5 — program_instance_set_entry_exercises
-- ---------------------------------------------------------------------
ALTER TABLE public.program_instance_set_entry_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage program instance set entry exercises" ON public.program_instance_set_entry_exercises;
CREATE POLICY "Coaches manage program instance set entry exercises"
  ON public.program_instance_set_entry_exercises
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_instance_set_entries pise
      JOIN public.program_instance_workouts piw ON piw.id = pise.program_instance_workout_id
      JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
      WHERE pise.id = program_instance_set_entry_exercises.program_instance_set_entry_id
        AND pa.coach_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.program_instance_set_entries pise
      JOIN public.program_instance_workouts piw ON piw.id = pise.program_instance_workout_id
      JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
      WHERE pise.id = program_instance_set_entry_exercises.program_instance_set_entry_id
        AND pa.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Clients can view program instance set entry exercises" ON public.program_instance_set_entry_exercises;
CREATE POLICY "Clients can view program instance set entry exercises"
  ON public.program_instance_set_entry_exercises
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_instance_set_entries pise
      JOIN public.program_instance_workouts piw ON piw.id = pise.program_instance_workout_id
      JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
      WHERE pise.id = program_instance_set_entry_exercises.program_instance_set_entry_id
        AND pa.client_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------
-- PART 6 — program_instance_set_entry_protocols
-- ---------------------------------------------------------------------
ALTER TABLE public.program_instance_set_entry_protocols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage program instance set entry protocols" ON public.program_instance_set_entry_protocols;
CREATE POLICY "Coaches manage program instance set entry protocols"
  ON public.program_instance_set_entry_protocols
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_instance_set_entries pise
      JOIN public.program_instance_workouts piw ON piw.id = pise.program_instance_workout_id
      JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
      WHERE pise.id = program_instance_set_entry_protocols.program_instance_set_entry_id
        AND pa.coach_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.program_instance_set_entries pise
      JOIN public.program_instance_workouts piw ON piw.id = pise.program_instance_workout_id
      JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
      WHERE pise.id = program_instance_set_entry_protocols.program_instance_set_entry_id
        AND pa.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Clients can view program instance set entry protocols" ON public.program_instance_set_entry_protocols;
CREATE POLICY "Clients can view program instance set entry protocols"
  ON public.program_instance_set_entry_protocols
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_instance_set_entries pise
      JOIN public.program_instance_workouts piw ON piw.id = pise.program_instance_workout_id
      JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
      WHERE pise.id = program_instance_set_entry_protocols.program_instance_set_entry_id
        AND pa.client_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------
-- PART 7 — program_instance_set_prescriptions
-- Mirror: workout_set_prescriptions keyed by slot_id → exercise row chain
-- ---------------------------------------------------------------------
ALTER TABLE public.program_instance_set_prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage program instance set prescriptions" ON public.program_instance_set_prescriptions;
CREATE POLICY "Coaches manage program instance set prescriptions"
  ON public.program_instance_set_prescriptions
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_instance_set_entry_exercises pisee
      JOIN public.program_instance_set_entries pise ON pise.id = pisee.program_instance_set_entry_id
      JOIN public.program_instance_workouts piw ON piw.id = pise.program_instance_workout_id
      JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
      WHERE pisee.id = program_instance_set_prescriptions.slot_id
        AND pa.coach_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.program_instance_set_entry_exercises pisee
      JOIN public.program_instance_set_entries pise ON pise.id = pisee.program_instance_set_entry_id
      JOIN public.program_instance_workouts piw ON piw.id = pise.program_instance_workout_id
      JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
      WHERE pisee.id = program_instance_set_prescriptions.slot_id
        AND pa.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Clients can view program instance set prescriptions" ON public.program_instance_set_prescriptions;
CREATE POLICY "Clients can view program instance set prescriptions"
  ON public.program_instance_set_prescriptions
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_instance_set_entry_exercises pisee
      JOIN public.program_instance_set_entries pise ON pise.id = pisee.program_instance_set_entry_id
      JOIN public.program_instance_workouts piw ON piw.id = pise.program_instance_workout_id
      JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
      WHERE pisee.id = program_instance_set_prescriptions.slot_id
        AND pa.client_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------
-- PART 8 — workout_set_prescriptions
-- Mirror workout_set_entry_exercises (parent = slot_id → wsee → wse → wt)
-- ---------------------------------------------------------------------
ALTER TABLE public.workout_set_prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can view prescriptions in their set entries" ON public.workout_set_prescriptions;
CREATE POLICY "Coaches can view prescriptions in their set entries"
  ON public.workout_set_prescriptions
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.workout_templates wt ON wt.id = wse.template_id
      WHERE wsee.id = workout_set_prescriptions.slot_id
        AND wt.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Coaches can insert prescriptions into their set entries" ON public.workout_set_prescriptions;
CREATE POLICY "Coaches can insert prescriptions into their set entries"
  ON public.workout_set_prescriptions
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.workout_templates wt ON wt.id = wse.template_id
      WHERE wsee.id = workout_set_prescriptions.slot_id
        AND wt.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Coaches can update prescriptions in their set entries" ON public.workout_set_prescriptions;
CREATE POLICY "Coaches can update prescriptions in their set entries"
  ON public.workout_set_prescriptions
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.workout_templates wt ON wt.id = wse.template_id
      WHERE wsee.id = workout_set_prescriptions.slot_id
        AND wt.coach_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.workout_templates wt ON wt.id = wse.template_id
      WHERE wsee.id = workout_set_prescriptions.slot_id
        AND wt.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Coaches can delete prescriptions from their set entries" ON public.workout_set_prescriptions;
CREATE POLICY "Coaches can delete prescriptions from their set entries"
  ON public.workout_set_prescriptions
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.workout_templates wt ON wt.id = wse.template_id
      WHERE wsee.id = workout_set_prescriptions.slot_id
        AND wt.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Client path 1: workout_assignments (mirror wsee "Clients can view exercises in assigned workouts")
DROP POLICY IF EXISTS "Clients can view prescriptions in assigned workouts" ON public.workout_set_prescriptions;
CREATE POLICY "Clients can view prescriptions in assigned workouts"
  ON public.workout_set_prescriptions
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.workout_assignments wa ON wa.workout_template_id = wse.template_id
      WHERE wsee.id = workout_set_prescriptions.slot_id
        AND wa.client_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Client path 2: active program schedule (mirror 20260403 wsee policy)
DROP POLICY IF EXISTS "Clients can view prescriptions via active program" ON public.workout_set_prescriptions;
CREATE POLICY "Clients can view prescriptions via active program"
  ON public.workout_set_prescriptions
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.program_assignments pa
        ON pa.client_id = auth.uid()
       AND pa.status = 'active'
      JOIN public.program_schedule ps
        ON ps.program_id = pa.program_id
       AND ps.template_id = wse.template_id
      WHERE wsee.id = workout_set_prescriptions.slot_id
    )
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------
-- PART 9 — workout_exercise_assignments (deny-all fix)
-- Legacy table (0 rows in prod); parent workout_block_assignments was DROPPED.
-- Scope via workout_block_exercise_id → workout_set_entry_exercises (same
-- ownership paths as workout_set_entry_exercises policies).
-- ---------------------------------------------------------------------
ALTER TABLE public.workout_exercise_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workout_exercise_assignments_select ON public.workout_exercise_assignments;
DROP POLICY IF EXISTS workout_exercise_assignments_insert ON public.workout_exercise_assignments;
DROP POLICY IF EXISTS workout_exercise_assignments_update ON public.workout_exercise_assignments;
DROP POLICY IF EXISTS workout_exercise_assignments_delete ON public.workout_exercise_assignments;

CREATE POLICY workout_exercise_assignments_select
  ON public.workout_exercise_assignments
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.workout_templates wt ON wt.id = wse.template_id
      WHERE wsee.id = workout_exercise_assignments.workout_block_exercise_id
        AND wt.coach_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.workout_assignments wa ON wa.workout_template_id = wse.template_id
      WHERE wsee.id = workout_exercise_assignments.workout_block_exercise_id
        AND wa.client_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.program_assignments pa
        ON pa.client_id = auth.uid()
       AND pa.status = 'active'
      JOIN public.program_schedule ps
        ON ps.program_id = pa.program_id
       AND ps.template_id = wse.template_id
      WHERE wsee.id = workout_exercise_assignments.workout_block_exercise_id
    )
    OR public.is_admin()
  );

CREATE POLICY workout_exercise_assignments_insert
  ON public.workout_exercise_assignments
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.workout_templates wt ON wt.id = wse.template_id
      WHERE wsee.id = workout_exercise_assignments.workout_block_exercise_id
        AND wt.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY workout_exercise_assignments_update
  ON public.workout_exercise_assignments
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.workout_templates wt ON wt.id = wse.template_id
      WHERE wsee.id = workout_exercise_assignments.workout_block_exercise_id
        AND wt.coach_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.workout_templates wt ON wt.id = wse.template_id
      WHERE wsee.id = workout_exercise_assignments.workout_block_exercise_id
        AND wt.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY workout_exercise_assignments_delete
  ON public.workout_exercise_assignments
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_set_entry_exercises wsee
      JOIN public.workout_set_entries wse ON wse.id = wsee.set_entry_id
      JOIN public.workout_templates wt ON wt.id = wse.template_id
      WHERE wsee.id = workout_exercise_assignments.workout_block_exercise_id
        AND wt.coach_id = auth.uid()
    )
    OR public.is_admin()
  );

COMMIT;

-- =====================================================================
-- POST-RUN RE-AUDIT (read-only — run separately)
-- =====================================================================
-- SELECT
--   c.relname AS table_name,
--   c.relrowsecurity AS rls_enabled,
--   COUNT(p.policyname) AS policy_count,
--   CASE
--     WHEN NOT c.relrowsecurity THEN 'EXPOSED (no RLS)'
--     WHEN c.relrowsecurity AND COUNT(p.policyname) = 0 THEN 'DENY-ALL'
--     ELSE 'RLS + policies'
--   END AS status
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- LEFT JOIN pg_policies p ON p.tablename = c.relname AND p.schemaname = n.nspname
-- WHERE n.nspname = 'public'
--   AND c.relkind = 'r'
--   AND c.relname IN (
--     'program_instance_phases',
--     'program_instance_workouts',
--     'program_instance_set_entries',
--     'program_instance_set_entry_exercises',
--     'program_instance_set_entry_protocols',
--     'program_instance_set_prescriptions',
--     'workout_set_prescriptions',
--     'workout_exercise_assignments'
--   )
-- GROUP BY c.relname, c.relrowsecurity
-- ORDER BY c.relname;
-- Expected: all rows → status = 'RLS + policies', policy_count >= 2.
