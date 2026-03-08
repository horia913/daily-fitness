-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: workout_set_entry_exercises RLS timeout (statement timeout / 500 errors)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Problem:
--   Two overlapping SELECT policies exist for clients on workout_set_entry_exercises:
--     1. "Clients can read assigned workout set entry exercises" — uses IN (subquery)
--     2. "Clients can view exercises in assigned workouts"      — uses EXISTS (JOIN)
--   PostgreSQL evaluates BOTH for every row scan. The IN-form policy is slower.
--   Combined with missing indexes on the tables scanned by the RLS subqueries,
--   this causes statement timeouts (500 errors) on every query to this table.
--
-- Fix:
--   1. Drop the slower duplicate IN-form client SELECT policy.
--   2. Keep the EXISTS-form policy (already optimizable by the set_entry_id index).
--   3. Add indexes on the tables the remaining RLS policy scans.
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Drop the duplicate slower client SELECT policy (IN-subquery form)
DROP POLICY IF EXISTS "Clients can read assigned workout set entry exercises"
  ON public.workout_set_entry_exercises;

-- Step 2: Add indexes that the surviving RLS policy (EXISTS JOIN) scans
--   The EXISTS policy joins: workout_set_entry_exercises → workout_set_entries → workout_assignments
--   PostgreSQL needs fast lookups on:
--     a) workout_assignments.client_id  (to filter by auth.uid())
--     b) workout_assignments.workout_template_id  (to join to templates)
--     c) workout_set_entries.template_id  (to join entries back to templates)

CREATE INDEX IF NOT EXISTS idx_workout_assignments_client_id
  ON public.workout_assignments (client_id);

CREATE INDEX IF NOT EXISTS idx_workout_assignments_template_id
  ON public.workout_assignments (workout_template_id);

CREATE INDEX IF NOT EXISTS idx_workout_set_entries_template_id
  ON public.workout_set_entries (template_id);
