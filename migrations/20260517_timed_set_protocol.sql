-- timed_set protocol: prescription on workout_set_entries (duration_seconds = work time),
-- logging via workout_set_logs.actual_duration_seconds.

BEGIN;

ALTER TABLE public.workout_set_logs
  ADD COLUMN IF NOT EXISTS actual_duration_seconds integer;

COMMENT ON COLUMN public.workout_set_logs.actual_duration_seconds IS
  'Actual seconds completed for timed_set protocol. Null for non-timed protocols.';

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

COMMIT;
