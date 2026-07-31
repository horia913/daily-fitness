-- =============================================================================
-- RLS PERFORMANCE PASS — auth.* / is_admin() initplan wrap + policy FK indexes
-- SECURITY-PRESERVING: only evaluation timing changes, not which rows match.
-- Run entire file in Supabase SQL Editor (one paste). No BEGIN/COMMIT wrapper.
--
-- WHAT CHANGES:
--   Part 1: DROP + CREATE each public policy whose USING/WITH CHECK contains
--           bare auth.uid() / auth.role() / auth.jwt() / is_admin() — wrapped
--           as (SELECT …) initplan form. Same names, roles, commands, logic.
--   Part 2: 17 btree indexes on policy-filter FK columns (IF NOT EXISTS).
--
-- OPTIONAL REVIEW FIRST:
--   1. Run lines from "CREATE OR REPLACE FUNCTION public.wrap_rls_policy_expr"
--      through the PREVIEW SELECT (stop before "PART 1 — Apply").
--   2. Inspect ddl column output.
--   3. Then run the rest (Part 1 DO block through NOTIFY).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers: wrap expressions + build CREATE POLICY DDL
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.wrap_rls_policy_expr(expr text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r text;
BEGIN
  IF expr IS NULL THEN
    RETURN NULL;
  END IF;

  r := expr;

  -- Mask already-wrapped initplan forms (idempotent re-run safe)
  r := replace(r, '(SELECT auth.uid())', E'\x01');
  r := replace(r, '(SELECT auth.role())', E'\x02');
  r := replace(r, '(SELECT auth.jwt())', E'\x03');
  r := replace(r, '(SELECT public.is_admin())', E'\x04');
  r := replace(r, '(SELECT is_admin())', E'\x04');
  r := replace(r, '(SELECT public.is_admin((SELECT auth.uid())))', E'\x05');
  r := replace(r, '(SELECT is_admin((SELECT auth.uid())))', E'\x05');

  -- Bare auth.* → initplan (single evaluation per query)
  r := replace(r, 'auth.uid()', '(SELECT auth.uid())');
  r := replace(r, 'auth.role()', '(SELECT auth.role())');
  r := replace(r, 'auth.jwt()', '(SELECT auth.jwt())');

  -- is_admin() no-arg (schema-qualified)
  r := replace(r, 'public.is_admin()', '(SELECT public.is_admin())');

  -- is_admin(auth.uid()) after auth wrap — initplan on the helper call too
  r := replace(
    r,
    'public.is_admin((SELECT auth.uid()))',
    '(SELECT public.is_admin((SELECT auth.uid())))'
  );
  r := replace(
    r,
    'is_admin((SELECT auth.uid()))',
    '(SELECT is_admin((SELECT auth.uid())))'
  );

  -- Legacy bare is_admin() without schema (only unwrapped occurrences)
  IF position('is_admin()' IN r) > 0 AND position('(SELECT is_admin())' IN r) = 0 THEN
    r := replace(r, 'is_admin()', '(SELECT is_admin())');
  ELSIF position('is_admin()' IN r) > 0 THEN
    -- Replace only occurrences not already inside (SELECT is_admin())
    r := regexp_replace(r, '(?<!\(SELECT )is_admin\(\)', '(SELECT is_admin())', 'g');
  END IF;

  -- Restore masks (undo any accidental double-wrap inside already-wrapped forms)
  r := replace(r, E'\x01', '(SELECT auth.uid())');
  r := replace(r, E'\x02', '(SELECT auth.role())');
  r := replace(r, E'\x03', '(SELECT auth.jwt())');
  r := replace(r, E'\x04', '(SELECT public.is_admin())');
  r := replace(r, E'\x05', '(SELECT public.is_admin((SELECT auth.uid())))');

  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.build_rls_policy_ddl(
  p_schema text,
  p_table text,
  p_policy text,
  p_permissive text,
  p_roles name[],
  p_cmd text,
  p_qual text,
  p_with_check text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  ddl text;
  roles_clause text;
  restrictive_clause text;
BEGIN
  roles_clause := array_to_string(p_roles, ', ');
  IF roles_clause IS NULL OR roles_clause = '' THEN
    roles_clause := 'public';
  END IF;

  restrictive_clause := CASE
    WHEN upper(p_permissive) = 'RESTRICTIVE' THEN ' AS RESTRICTIVE'
    ELSE ''
  END;

  ddl := format(
    'CREATE POLICY %I ON %I.%I%s FOR %s TO %s',
    p_policy,
    p_schema,
    p_table,
    restrictive_clause,
    p_cmd,
    roles_clause
  );

  IF p_qual IS NOT NULL THEN
    ddl := ddl || format(E'\n  USING (%s)', p_qual);
  END IF;

  IF p_with_check IS NOT NULL THEN
    ddl := ddl || format(E'\n  WITH CHECK (%s)', p_with_check);
  END IF;

  ddl := ddl || ';';
  RETURN ddl;
END;
$$;

-- -----------------------------------------------------------------------------
-- PREVIEW — explicit DROP/CREATE DDL for every policy that will change
-- (Uncomment and run through here BEFORE Part 1 if you want to review output.)
-- -----------------------------------------------------------------------------
/*
SELECT
  w.tablename,
  w.policyname,
  format(
    E'DROP POLICY IF EXISTS %I ON %I.%I;\n%s',
    w.policyname,
    w.schemaname,
    w.tablename,
    public.build_rls_policy_ddl(
      w.schemaname,
      w.tablename,
      w.policyname,
      w.permissive,
      w.roles,
      w.cmd,
      w.new_qual,
      w.new_with_check
    )
  ) AS ddl
FROM (
  SELECT
    p.schemaname,
    p.tablename,
    p.policyname,
    p.permissive,
    p.roles,
    p.cmd,
    p.qual,
    p.with_check,
    public.wrap_rls_policy_expr(p.qual) AS new_qual,
    public.wrap_rls_policy_expr(p.with_check) AS new_with_check
  FROM pg_policies p
  WHERE p.schemaname = 'public'
) w
WHERE w.qual IS DISTINCT FROM w.new_qual
   OR w.with_check IS DISTINCT FROM w.new_with_check
ORDER BY w.tablename, w.policyname;

-- Count policies that will be rewritten:
SELECT COUNT(*) AS policies_to_rewrite
FROM (
  SELECT
    public.wrap_rls_policy_expr(p.qual) AS new_qual,
    public.wrap_rls_policy_expr(p.with_check) AS new_with_check,
    p.qual,
    p.with_check
  FROM pg_policies p
  WHERE p.schemaname = 'public'
) x
WHERE x.qual IS DISTINCT FROM x.new_qual
   OR x.with_check IS DISTINCT FROM x.new_with_check;
*/

-- -----------------------------------------------------------------------------
-- PART 1 — Apply wraps (reads live pg_policies; DROP + CREATE per changed policy)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  pol record;
  new_qual text;
  new_with_check text;
  ddl text;
  rewritten_count int := 0;
  skipped_count int := 0;
  total_policies int := 0;
BEGIN
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  FOR pol IN
    SELECT
      p.schemaname,
      p.tablename,
      p.policyname,
      p.permissive,
      p.roles,
      p.cmd,
      p.qual,
      p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    ORDER BY p.tablename, p.policyname
  LOOP
    new_qual := public.wrap_rls_policy_expr(pol.qual);
    new_with_check := public.wrap_rls_policy_expr(pol.with_check);

    IF pol.qual IS NOT DISTINCT FROM new_qual
       AND pol.with_check IS NOT DISTINCT FROM new_with_check THEN
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );

    ddl := public.build_rls_policy_ddl(
      pol.schemaname,
      pol.tablename,
      pol.policyname,
      pol.permissive,
      pol.roles,
      pol.cmd,
      new_qual,
      new_with_check
    );

    EXECUTE ddl;
    rewritten_count := rewritten_count + 1;
  END LOOP;

  RAISE NOTICE 'RLS initplan wrap: % total public policies, % rewritten, % already wrapped.',
    total_policies, rewritten_count, skipped_count;
END;
$$;

DROP FUNCTION IF EXISTS public.build_rls_policy_ddl(text, text, text, text, name[], text, text, text);
DROP FUNCTION IF EXISTS public.wrap_rls_policy_expr(text);

-- -----------------------------------------------------------------------------
-- PART 2 — Missing btree indexes on policy-filtered FK columns (audit Query 5)
-- 17 CREATE INDEX statements; IF NOT EXISTS skips existing indexes.
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_workout_logs_program_assignment_id
  ON public.workout_logs (program_assignment_id);

CREATE INDEX IF NOT EXISTS idx_assigned_meal_plans_client_id
  ON public.assigned_meal_plans (client_id);

CREATE INDEX IF NOT EXISTS idx_assigned_meal_plans_coach_id
  ON public.assigned_meal_plans (coach_id);

CREATE INDEX IF NOT EXISTS idx_assigned_workouts_client_id
  ON public.assigned_workouts (client_id);

CREATE INDEX IF NOT EXISTS idx_assigned_workouts_coach_id
  ON public.assigned_workouts (coach_id);

CREATE INDEX IF NOT EXISTS idx_clipcards_client_id
  ON public.clipcards (client_id);

CREATE INDEX IF NOT EXISTS idx_clipcards_coach_id
  ON public.clipcards (coach_id);

CREATE INDEX IF NOT EXISTS idx_body_metrics_coach_id
  ON public.body_metrics (coach_id);

CREATE INDEX IF NOT EXISTS idx_goals_coach_id
  ON public.goals (coach_id);

CREATE INDEX IF NOT EXISTS idx_mobility_metrics_coach_id
  ON public.mobility_metrics (coach_id);

CREATE INDEX IF NOT EXISTS idx_fms_assessments_coach_id
  ON public.fms_assessments (coach_id);

CREATE INDEX IF NOT EXISTS idx_meal_plan_items_coach_id
  ON public.meal_plan_items (coach_id);

CREATE INDEX IF NOT EXISTS idx_workout_assignments_coach_id
  ON public.workout_assignments (coach_id);

CREATE INDEX IF NOT EXISTS idx_habit_logs_client_id
  ON public.habit_logs (client_id);

CREATE INDEX IF NOT EXISTS idx_program_progression_rules_set_entry_id
  ON public.program_progression_rules (set_entry_id);

CREATE INDEX IF NOT EXISTS idx_program_workout_completions_template_id
  ON public.program_workout_completions (template_id);

CREATE INDEX IF NOT EXISTS idx_personal_records_workout_assignment_id
  ON public.personal_records (workout_assignment_id);

NOTIFY pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- POST-RUN VERIFY (run separately)
-- -----------------------------------------------------------------------------
-- Bare auth.uid() remaining (expect 0):
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (
--     (qual IS NOT NULL AND qual ~ 'auth\.uid\(\)' AND qual !~ '\(SELECT\s+auth\.uid\(\)\)')
--     OR (with_check IS NOT NULL AND with_check ~ 'auth\.uid\(\)' AND with_check !~ '\(SELECT\s+auth\.uid\(\)\)')
--   );
--
-- Policy count unchanged (same set of names):
-- SELECT COUNT(*), COUNT(DISTINCT tablename || policyname) FROM pg_policies WHERE schemaname = 'public';
