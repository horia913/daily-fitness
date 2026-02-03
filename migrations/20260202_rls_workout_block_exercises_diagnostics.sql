-- ============================================================================
-- RLS + INDEX DIAGNOSTICS: workout_block_exercises (failing request)
-- Run in Supabase SQL Editor. No changes — inspection only.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) CURRENT RLS POLICIES (from schema export)
-- ----------------------------------------------------------------------------

-- workout_block_exercises
-- Policy: "Clients can read assigned workout block exercises" (role: authenticated)
--   qual: block_id IN ( SELECT workout_blocks.id FROM workout_blocks WHERE workout_blocks.template_id IN ( SELECT workout_assignments.workout_template_id FROM workout_assignments WHERE workout_assignments.client_id = auth.uid()))

-- Policy: "Clients can view exercises in assigned workouts" (role: public)
--   qual: EXISTS ( SELECT 1 FROM ((workout_blocks wb JOIN workout_templates wt ON ((wb.template_id = wt.id))) JOIN workout_assignments wa ON ((wt.id = wa.workout_template_id))) WHERE ((wb.id = workout_block_exercises.block_id) AND (wa.client_id = auth.uid())))

-- Policy: "Coaches can delete exercises from their blocks" (role: public)
--   qual: EXISTS ( SELECT 1 FROM (workout_blocks wb JOIN workout_templates wt ON ((wb.template_id = wt.id))) WHERE ((wb.id = workout_block_exercises.block_id) AND (wt.coach_id = auth.uid())))

-- Policy: "Coaches can insert exercises into their blocks" (role: public)
--   with_check: EXISTS ( SELECT 1 FROM (workout_blocks wb JOIN workout_templates wt ON ((wb.template_id = wt.id))) WHERE ((wb.id = workout_block_exercises.block_id) AND (wt.coach_id = auth.uid())))

-- Policy: "Coaches can update exercises in their blocks" (role: public)
--   qual + with_check: same EXISTS as above

-- Policy: "Coaches can view exercises in their blocks" (role: public)
--   qual: EXISTS ( SELECT 1 FROM (workout_blocks wb JOIN workout_templates wt ON ((wb.template_id = wt.id))) WHERE ((wb.id = workout_block_exercises.block_id) AND (wt.coach_id = auth.uid())))

-- workout_blocks
-- Policy: "Coaches can view blocks in their templates" (role: public)
--   qual: EXISTS ( SELECT 1 FROM workout_templates wt WHERE ((wt.id = workout_blocks.template_id) AND (wt.coach_id = auth.uid())))

-- Policy: "Coaches can manage workout blocks" (role: public)
--   qual: template_id IN ( SELECT workout_templates.id FROM workout_templates WHERE workout_templates.coach_id = auth.uid())

-- (Other workout_blocks policies: client-side, delete, insert, update — same join path wt.id = template_id, wt.coach_id = auth.uid())

-- workout_templates
-- Policy: "Coaches can manage workout templates" (role: public)
--   qual: coach_id = auth.uid()

-- Policy: "Clients can view assigned workout templates" (role: public) — more complex, not the failing path.

-- ----------------------------------------------------------------------------
-- 2) EXACT INDEX DEFINITIONS (run this in SQL Editor)
-- ----------------------------------------------------------------------------
SELECT
  c.relname AS tablename,
  i.relname AS indexname,
  pg_get_indexdef(i.oid) AS indexdef
FROM pg_class c
JOIN pg_index ix ON ix.indrelid = c.oid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('workout_block_exercises', 'workout_blocks', 'workout_templates')
ORDER BY c.relname, i.relname;

-- ----------------------------------------------------------------------------
-- 3) EXPLAIN (ANALYZE, BUFFERS) — equivalent to failing request
-- Use real block_ids from your DB (e.g. from workout_blocks for one template).
-- In SQL Editor you run as postgres so RLS may be bypassed; to see RLS cost,
-- run the same SELECT from the app (as coach) and capture EXPLAIN from logs,
-- or use pg_stat_statements to see which query is slow.
-- ----------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, block_id
FROM workout_block_exercises
WHERE block_id IN (
  '77382cbf-4ad1-455d-b299-f0f2c011f4c3'::uuid,
  '97cb7c4d-1cda-4385-80b7-795289304c71'::uuid,
  'bce3c154-2a82-46af-a1bb-5dbccaa6ce4a'::uuid,
  '54f79f09-5379-47d9-ab1b-adcb8c76bad9'::uuid,
  'a053752b-df7f-454b-8eee-96d889779861'::uuid
);

-- ----------------------------------------------------------------------------
-- 4) INTERPRETATION
-- ----------------------------------------------------------------------------
-- In the EXPLAIN output, check:
-- - "Seq Scan on workout_block_exercises" → need index on block_id (you have it).
-- - "SubPlan" or "Nested Loop" with high cost on workout_blocks / workout_templates
--   → time is in RLS EXISTS; add indexes for the join path:
--     workout_blocks(template_id), workout_templates(coach_id).
-- - "Buffers: shared hit" vs "read" → cache vs disk.
-- If RLS subquery dominates, apply migration 20260202_rls_workout_template_indexes.sql.
