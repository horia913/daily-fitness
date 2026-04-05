BEGIN;

-- 1) Delete unsupported set-entry rows first (to avoid constraint issues later)
-- Compare as text: set_type is enum workout_set_type — literals like 'ladder_set' are not
-- valid enum labels if the DB uses 'ladder' instead, which causes 22P02 when used in IN (...).
DELETE FROM public.workout_set_entries
WHERE set_type::text IN ('pyramid_set', 'ladder', 'ladder_set', 'circuit');

-- 2) Delete progression rules that target removed block / set types
-- Production schemas differ: some DBs use block_type, others set_type (enum or text).
-- Use whichever column exists on each table.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'program_progression_rules'
      AND column_name = 'block_type'
  ) THEN
    DELETE FROM public.program_progression_rules
    WHERE block_type IN ('pyramid_set', 'ladder', 'ladder_set', 'circuit');
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'program_progression_rules'
      AND column_name = 'set_type'
  ) THEN
    DELETE FROM public.program_progression_rules
    WHERE set_type::text IN ('pyramid_set', 'ladder', 'ladder_set', 'circuit');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_program_progression_rules'
      AND column_name = 'block_type'
  ) THEN
    DELETE FROM public.client_program_progression_rules
    WHERE block_type IN ('pyramid_set', 'ladder', 'ladder_set', 'circuit');
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_program_progression_rules'
      AND column_name = 'set_type'
  ) THEN
    DELETE FROM public.client_program_progression_rules
    WHERE set_type::text IN ('pyramid_set', 'ladder', 'ladder_set', 'circuit');
  END IF;
END $$;

-- 3) Drop special tables
DROP TABLE IF EXISTS public.workout_pyramid_sets;
DROP TABLE IF EXISTS public.workout_ladder_sets;

-- 4) Rebuild set_type check constraints without removed values
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
      AND connamespace = 'public'::regnamespace
      AND (
        pg_get_constraintdef(oid) ILIKE '%pyramid_set%'
        OR pg_get_constraintdef(oid) ILIKE '%ladder_set%'
        OR pg_get_constraintdef(oid) ILIKE '%circuit%'
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

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
      'hr_sets'
    )
  );

-- 5) Update get_workout_blocks RPC: remove pyramid_sets and ladder_sets JSON
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
            (SELECT jsonb_agg(row_to_json(ex) ORDER BY ex.exercise_order)
             FROM workout_set_entry_exercises ex
             WHERE ex.set_entry_id = wse.id),
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
          'hr_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(hr) ORDER BY hr.exercise_order, hr.id)
             FROM workout_hr_sets hr
             WHERE hr.set_entry_id = wse.id),
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
'Returns workout set entries for a template with nested exercises, drop_sets, cluster_sets, rest_pause_sets, time_protocols, hr_sets.';

-- 6) Update delete_workout_set_entry_children RPC (no pyramid/ladder deletes)
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
  DELETE FROM public.workout_hr_sets WHERE set_entry_id = p_set_entry_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_workout_set_entry_children(uuid) TO authenticated;

COMMIT;
