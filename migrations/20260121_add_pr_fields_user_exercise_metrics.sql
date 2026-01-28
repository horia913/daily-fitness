ALTER TABLE public.user_exercise_metrics
  ADD COLUMN IF NOT EXISTS best_weight numeric,
  ADD COLUMN IF NOT EXISTS best_reps integer,
  ADD COLUMN IF NOT EXISTS best_volume numeric,
  ADD COLUMN IF NOT EXISTS best_volume_weight numeric,
  ADD COLUMN IF NOT EXISTS best_volume_reps integer;
