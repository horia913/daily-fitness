-- PHASE 0 PURGE — manual execution script
-- Run in Supabase SQL Editor. Use dry-run pattern per section:
--   BEGIN; → run section → inspect preview/post-check → ROLLBACK;
-- Re-run with COMMIT; when satisfied.
--
-- Verification basis: PHASE0_PURGE_REPORT.md (Step 1, 2026-06-10)

-- =============================================================================
-- Section A — Normalize legacy set_type strings on workout_set_logs
-- Justification: 49 legacy rows (dropset/fortime/preexhaust); code now stores canonical.
-- =============================================================================

-- Preview
SELECT set_type, COUNT(*) AS rows
FROM workout_set_logs
WHERE set_type IN ('dropset', 'fortime', 'preexhaust')
GROUP BY set_type;

-- Destructive
UPDATE workout_set_logs SET set_type = 'drop_set'       WHERE set_type = 'dropset';
UPDATE workout_set_logs SET set_type = 'for_time'       WHERE set_type = 'fortime';
UPDATE workout_set_logs SET set_type = 'pre_exhaustion' WHERE set_type = 'preexhaust';

-- Post-check (expect zero legacy rows)
SELECT set_type, COUNT(*) AS rows
FROM workout_set_logs
WHERE set_type IN ('dropset', 'fortime', 'preexhaust')
GROUP BY set_type;

SELECT set_type, COUNT(*) AS rows
FROM workout_set_logs
GROUP BY set_type
ORDER BY rows DESC;

-- =============================================================================
-- Section B — Delete orphan superset set entries (1 WSEE each)
-- IDs from Step 1.6:
--   24673694-20ef-4547-937f-e907eec88b7d — "Luminita test 1" (9 logs, 0 rules)
--   1eabf7f1-0bae-49a2-8f1c-deb59b4be26b — "test FINAL" (19 logs, 12 rules)
-- =============================================================================

-- Preview dependents
SELECT 'workout_set_logs' AS tbl, COUNT(*) AS rows
FROM workout_set_logs
WHERE set_entry_id IN (
  '24673694-20ef-4547-937f-e907eec88b7d',
  '1eabf7f1-0bae-49a2-8f1c-deb59b4be26b'
)
UNION ALL
SELECT 'program_progression_rules', COUNT(*)
FROM program_progression_rules
WHERE set_entry_id IN (
  '24673694-20ef-4547-937f-e907eec88b7d',
  '1eabf7f1-0bae-49a2-8f1c-deb59b4be26b'
)
UNION ALL
SELECT 'workout_set_entry_exercises', COUNT(*)
FROM workout_set_entry_exercises
WHERE set_entry_id IN (
  '24673694-20ef-4547-937f-e907eec88b7d',
  '1eabf7f1-0bae-49a2-8f1c-deb59b4be26b'
)
UNION ALL
SELECT 'workout_set_entries', COUNT(*)
FROM workout_set_entries
WHERE id IN (
  '24673694-20ef-4547-937f-e907eec88b7d',
  '1eabf7f1-0bae-49a2-8f1c-deb59b4be26b'
);

-- Destructive (child-first)
DELETE FROM program_progression_rules
WHERE set_entry_id IN (
  '24673694-20ef-4547-937f-e907eec88b7d',
  '1eabf7f1-0bae-49a2-8f1c-deb59b4be26b'
);

DELETE FROM workout_set_logs
WHERE set_entry_id IN (
  '24673694-20ef-4547-937f-e907eec88b7d',
  '1eabf7f1-0bae-49a2-8f1c-deb59b4be26b'
);

DELETE FROM workout_set_entry_exercises
WHERE set_entry_id IN (
  '24673694-20ef-4547-937f-e907eec88b7d',
  '1eabf7f1-0bae-49a2-8f1c-deb59b4be26b'
);

DELETE FROM workout_set_entries
WHERE id IN (
  '24673694-20ef-4547-937f-e907eec88b7d',
  '1eabf7f1-0bae-49a2-8f1c-deb59b4be26b'
);

-- Post-check (expect 0)
SELECT COUNT(*) AS remaining_orphans
FROM workout_set_entries wse
WHERE wse.set_type = 'superset'
  AND (SELECT COUNT(*) FROM workout_set_entry_exercises w WHERE w.set_entry_id = wse.id) < 2;

-- =============================================================================
-- Section C — Drop verified-dead columns
-- Justification Step 1.2: zero src refs AND zero non-null rows (live counts).
-- BLOCKED columns (hr_* on logs, etc.) are intentionally omitted.
-- =============================================================================

-- Preview (all should be 0)
SELECT
  (SELECT COUNT(*) FROM workout_set_logs WHERE pyramid_step_number IS NOT NULL) AS log_pyramid,
  (SELECT COUNT(*) FROM workout_set_logs WHERE ladder_round_number IS NOT NULL) AS log_ladder_round,
  (SELECT COUNT(*) FROM workout_set_logs WHERE ladder_rung_number IS NOT NULL) AS log_ladder_rung,
  (SELECT COUNT(*) FROM workout_set_entries WHERE hr_zone_target IS NOT NULL) AS entry_hr_zone_target,
  (SELECT COUNT(*) FROM workout_set_entries WHERE hr_percentage_min IS NOT NULL) AS entry_hr_pct_min,
  (SELECT COUNT(*) FROM workout_set_entries WHERE hr_percentage_max IS NOT NULL) AS entry_hr_pct_max,
  (SELECT COUNT(*) FROM program_progression_rules WHERE pyramid_order IS NOT NULL) AS pr_pyramid,
  (SELECT COUNT(*) FROM program_progression_rules WHERE ladder_order IS NOT NULL) AS pr_ladder;

-- workout_set_logs (pyramid/ladder legacy)
ALTER TABLE public.workout_set_logs DROP COLUMN IF EXISTS pyramid_step_number;
ALTER TABLE public.workout_set_logs DROP COLUMN IF EXISTS ladder_round_number;
ALTER TABLE public.workout_set_logs DROP COLUMN IF EXISTS ladder_rung_number;

-- workout_set_entries (unused hr_sets parent columns — 0 non-null rows)
ALTER TABLE public.workout_set_entries DROP COLUMN IF EXISTS hr_zone_target;
ALTER TABLE public.workout_set_entries DROP COLUMN IF EXISTS hr_percentage_min;
ALTER TABLE public.workout_set_entries DROP COLUMN IF EXISTS hr_percentage_max;

-- program_progression_rules (pyramid/ladder legacy — 0 non-null rows)
ALTER TABLE public.program_progression_rules DROP COLUMN IF EXISTS pyramid_order;
ALTER TABLE public.program_progression_rules DROP COLUMN IF EXISTS ladder_order;

-- Post-check: columns gone
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('workout_set_logs', 'workout_set_entries', 'program_progression_rules')
  AND column_name IN (
    'pyramid_step_number', 'ladder_round_number', 'ladder_rung_number',
    'hr_zone_target', 'hr_percentage_min', 'hr_percentage_max',
    'pyramid_order', 'ladder_order'
  );

-- =============================================================================
-- Section D — Drop empty legacy tables
-- Justification Step 1.3: 0 rows, zero src/ references.
-- =============================================================================

-- Preview
SELECT 'workout_block_assignments' AS tbl,
       (SELECT COUNT(*) FROM workout_block_assignments) AS rows
UNION ALL
SELECT 'client_workout_blocks',
       (SELECT COUNT(*) FROM client_workout_blocks);

-- Destructive
DROP TABLE IF EXISTS public.workout_block_assignments;
DROP TABLE IF EXISTS public.client_workout_blocks;

-- Post-check
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('workout_block_assignments', 'client_workout_blocks');

-- =============================================================================
-- Section E — RPC fix: remove dropped-table references
-- Justification Step 1.4: get_workout_blocks actively used; workout_hr_sets table
-- dropped (PGRST205). Current live RPC still aggregates hr_sets (migration 20260406).
--
-- ROLLBACK REFERENCE — prior get_workout_blocks body included:
--   'hr_sets', COALESCE((SELECT jsonb_agg(...) FROM workout_hr_sets hr ...), '[]')
-- and delete_workout_set_entry_children included:
--   DELETE FROM public.workout_hr_sets WHERE set_entry_id = p_set_entry_id;
-- =============================================================================

-- Inspect current definition (run before/after)
SELECT proname, pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname IN ('get_workout_blocks', 'delete_workout_set_entry_children')
  AND pronamespace = 'public'::regnamespace;

CREATE OR REPLACE FUNCTION public.get_workout_blocks(p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      jsonb_agg(block_json ORDER BY (block_json->>'set_order')::int NULLS LAST),
      '[]'::jsonb
    )
    FROM (
      SELECT
        to_jsonb(wse) ||
        jsonb_build_object(
          'exercises', COALESCE(
            (SELECT jsonb_agg(
               row_to_json(wsee)::jsonb || jsonb_build_object('exercise', row_to_json(e))
               ORDER BY wsee.exercise_order
             )
             FROM workout_set_entry_exercises wsee
             JOIN exercises e ON e.id = wsee.exercise_id
             WHERE wsee.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'drop_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(ds) ORDER BY ds.exercise_order, ds.drop_order)
             FROM workout_drop_sets ds
             WHERE ds.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'cluster_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(cs) ORDER BY cs.exercise_order)
             FROM workout_cluster_sets cs
             WHERE cs.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'rest_pause_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(rp) ORDER BY rp.exercise_order)
             FROM workout_rest_pause_sets rp
             WHERE rp.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'time_protocols', COALESCE(
            (SELECT jsonb_agg(row_to_json(tp) ORDER BY tp.exercise_order)
             FROM workout_time_protocols tp
             WHERE tp.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'speed_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(s) ORDER BY s.exercise_order, s.id)
             FROM workout_speed_sets s
             WHERE s.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'endurance_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(en) ORDER BY en.exercise_order, en.id)
             FROM workout_endurance_sets en
             WHERE en.set_entry_id = wse.id),
            '[]'::jsonb
          )
        ) AS block_json
      FROM workout_set_entries wse
      WHERE wse.template_id = p_template_id
      ORDER BY wse.set_order
    ) sub
  );
END;
$$;

COMMENT ON FUNCTION public.get_workout_blocks(uuid) IS
'Returns workout set entries for a template with nested exercises, drop_sets, cluster_sets, rest_pause_sets, time_protocols, speed_sets, endurance_sets.';

GRANT EXECUTE ON FUNCTION public.get_workout_blocks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_blocks(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_workout_set_entry_children(p_set_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.workout_set_entry_exercises WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_drop_sets WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_cluster_sets WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_rest_pause_sets WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_time_protocols WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_speed_sets WHERE set_entry_id = p_set_entry_id;
  DELETE FROM public.workout_endurance_sets WHERE set_entry_id = p_set_entry_id;
END;
$$;

COMMENT ON FUNCTION public.delete_workout_set_entry_children(uuid) IS
'Deletes all child rows for one workout_set_entries row (speed_sets, endurance_sets; hr_sets removed Phase 0).';

GRANT EXECUTE ON FUNCTION public.delete_workout_set_entry_children(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_workout_set_entry_children(uuid) TO service_role;

-- =============================================================================
-- Section F — Interim CHECK constraint (14 canonical SetType values)
-- Run Step 1.7 first to record live constraint:
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.workout_set_entries'::regclass AND contype = 'c';
-- Live templates contain speed_work/endurance (repo migration file omitted them).
-- =============================================================================

ALTER TABLE public.workout_set_entries
  DROP CONSTRAINT IF EXISTS workout_set_entries_set_type_check;

ALTER TABLE public.workout_set_entries
  ADD CONSTRAINT workout_set_entries_set_type_check
  CHECK (
    set_type IN (
      'straight_set',
      'superset',
      'giant_set',
      'drop_set',
      'cluster_set',
      'rest_pause',
      'pre_exhaustion',
      'amrap',
      'emom',
      'tabata',
      'for_time',
      'speed_work',
      'endurance',
      'timed_set'
    )
  );

-- Post-check
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.workout_set_entries'::regclass
  AND contype = 'c'
  AND conname = 'workout_set_entries_set_type_check';
