-- Backfill client_program_progression_rules.block_* (and speed_endurance_config) from
-- program_progression_rules master rows after master rename (set_*).
-- Rows with no matching master rule stay null (deleted programs / drift — clean up separately).

BEGIN;

-- Ensure client table can store speed/endurance JSON (no-op if column already exists).
ALTER TABLE public.client_program_progression_rules
  ADD COLUMN IF NOT EXISTS speed_endurance_config jsonb;

WITH master_lookup AS (
  SELECT DISTINCT ON (cpr.id)
    cpr.id AS client_rule_id,
    pgr.set_entry_id AS new_block_id,
    pgr.set_type AS new_block_type,
    pgr.set_order AS new_block_order,
    pgr.set_name AS new_block_name,
    pgr.speed_endurance_config AS new_speed_config
  FROM public.client_program_progression_rules cpr
  INNER JOIN public.program_assignments pa ON pa.id = cpr.program_assignment_id
  INNER JOIN public.program_progression_rules pgr
    ON pgr.program_id = pa.program_id
    AND pgr.week_number = cpr.week_number
    AND pgr.exercise_id IS NOT DISTINCT FROM cpr.exercise_id
    AND pgr.exercise_order IS NOT DISTINCT FROM cpr.exercise_order
  WHERE cpr.block_id IS NULL
  ORDER BY cpr.id, pgr.id
)
UPDATE public.client_program_progression_rules cpr
SET
  block_id = ml.new_block_id,
  block_type = ml.new_block_type,
  block_order = ml.new_block_order,
  block_name = ml.new_block_name,
  speed_endurance_config = ml.new_speed_config
FROM master_lookup ml
WHERE cpr.id = ml.client_rule_id;

DO $$
DECLARE
  v_remaining_null int;
  v_total int;
BEGIN
  SELECT COUNT(*) INTO v_remaining_null FROM public.client_program_progression_rules WHERE block_id IS NULL;
  SELECT COUNT(*) INTO v_total FROM public.client_program_progression_rules;
  RAISE NOTICE 'Backfill complete. Total rows: %, still null block_id: %', v_total, v_remaining_null;
END $$;

COMMIT;
