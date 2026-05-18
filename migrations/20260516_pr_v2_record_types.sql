-- PR v2: replace legacy record_type values with max_strength / strength_endurance.
-- IMPORTANT: Drop the CHECK before UPDATE — Postgres validates new values against
-- the existing constraint, so UPDATE weight -> max_strength fails if the old
-- constraint (weight/reps/...) is still in place.

ALTER TABLE public.personal_records
  DROP CONSTRAINT IF EXISTS personal_records_record_type_check;

DELETE FROM public.personal_records
WHERE record_type = 'reps';

DELETE FROM public.personal_records
WHERE record_type IN ('distance', 'time', 'score');

UPDATE public.personal_records
SET record_type = 'max_strength'
WHERE record_type = 'weight';

ALTER TABLE public.personal_records
  ADD CONSTRAINT personal_records_record_type_check
  CHECK (record_type IN ('max_strength', 'strength_endurance'));

COMMENT ON COLUMN public.personal_records.record_type IS
  'PR category: max_strength (heaviest weight ever) or strength_endurance (highest single-set volume = weight x reps).';

COMMENT ON COLUMN public.personal_records.record_value IS
  'For max_strength: weight in kg. For strength_endurance: volume (weight * reps).';

COMMENT ON COLUMN public.personal_records.record_unit IS
  'For max_strength: kg. For strength_endurance: kg·reps.';
