-- Remove legacy generic-progression columns from program_progression_rules.
-- Previously written only by the removed EnhancedProgramManager orphan UI.

BEGIN;

-- Pre-flight: confirm columns exist and report row counts
DO $$
DECLARE
  v_field_count int;
  v_change_count int;
  v_amount_count int;
BEGIN
  SELECT COUNT(*) INTO v_field_count FROM program_progression_rules WHERE field IS NOT NULL;
  SELECT COUNT(*) INTO v_change_count FROM program_progression_rules WHERE change_type IS NOT NULL;
  SELECT COUNT(*) INTO v_amount_count FROM program_progression_rules WHERE amount IS NOT NULL;
  RAISE NOTICE 'Rows with field set: %', v_field_count;
  RAISE NOTICE 'Rows with change_type set: %', v_change_count;
  RAISE NOTICE 'Rows with amount set: %', v_amount_count;
END $$;

-- Drop the dead columns
ALTER TABLE program_progression_rules DROP COLUMN IF EXISTS field;
ALTER TABLE program_progression_rules DROP COLUMN IF EXISTS change_type;
ALTER TABLE program_progression_rules DROP COLUMN IF EXISTS amount;

COMMIT;
