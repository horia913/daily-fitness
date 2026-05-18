-- PR v2: link PR rows to the set log that produced them (dedupe / replay UX)
-- and persist weight×reps at achievement for display without joining.

ALTER TABLE public.personal_records
  ADD COLUMN IF NOT EXISTS workout_set_log_id uuid REFERENCES public.workout_set_logs(id) ON DELETE SET NULL;

ALTER TABLE public.personal_records
  ADD COLUMN IF NOT EXISTS weight_at_record numeric NULL;

ALTER TABLE public.personal_records
  ADD COLUMN IF NOT EXISTS reps_at_record integer NULL;

CREATE INDEX IF NOT EXISTS idx_personal_records_workout_set_log_id
  ON public.personal_records(workout_set_log_id)
  WHERE workout_set_log_id IS NOT NULL;

COMMENT ON COLUMN public.personal_records.workout_set_log_id IS
  'workout_set_logs.id for the set that achieved this PR (v2 dedupe reconstruction).';
