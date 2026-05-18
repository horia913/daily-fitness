-- Athlete Score v2: add new component columns + per-client recovery targets.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sleep_target_hours numeric(3,1) NOT NULL DEFAULT 7.0,
  ADD COLUMN IF NOT EXISTS steps_target integer NOT NULL DEFAULT 8000;

ALTER TABLE public.athlete_scores
  ADD COLUMN IF NOT EXISTS training_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS training_completion_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS training_execution_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS recovery_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS recovery_sleep_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS recovery_steps_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS nutrition_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS extras_score numeric(5,2);

COMMENT ON COLUMN public.profiles.sleep_target_hours IS 'Client sleep target (hours/night) for athlete score recovery component. Default 7.';
COMMENT ON COLUMN public.profiles.steps_target IS 'Client steps target (steps/day) for athlete score recovery component. Default 8000.';

COMMENT ON COLUMN public.athlete_scores.training_score IS 'Composite training component (0-100): completion x 0.6 + execution x 0.4.';
COMMENT ON COLUMN public.athlete_scores.training_completion_score IS 'Pct of scheduled non-optional workouts completed this week (0-100).';
COMMENT ON COLUMN public.athlete_scores.training_execution_score IS 'Avg prescription quality across logged sets this week. Null if no straight-set data.';
COMMENT ON COLUMN public.athlete_scores.recovery_score IS 'Composite recovery component (0-100): sleep x 0.7 + steps x 0.3.';
COMMENT ON COLUMN public.athlete_scores.recovery_sleep_score IS 'Avg sleep adherence vs per-client target across logged days.';
COMMENT ON COLUMN public.athlete_scores.recovery_steps_score IS 'Avg steps adherence vs per-client target across logged days.';
COMMENT ON COLUMN public.athlete_scores.nutrition_score IS 'Days with meals logged / 7 x 100. 0 if nutrition disabled.';
COMMENT ON COLUMN public.athlete_scores.extras_score IS 'Weighted extra-activity minutes / 90 x 100, capped at 100.';
