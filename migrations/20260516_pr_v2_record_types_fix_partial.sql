-- Run this ONLY if 20260516_pr_v2_record_types.sql failed on the UPDATE step.
-- Safe to re-run (idempotent).

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
