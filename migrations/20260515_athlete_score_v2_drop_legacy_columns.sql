-- Athlete Score v2: drop unused / replaced columns.
-- Run after application + get_client_dashboard RPC expect v2 columns only.

ALTER TABLE public.athlete_scores
  DROP COLUMN IF EXISTS goal_progress_score,
  DROP COLUMN IF EXISTS program_adherence_score,
  DROP COLUMN IF EXISTS workout_completion_score,
  DROP COLUMN IF EXISTS checkin_completion_score,
  DROP COLUMN IF EXISTS nutrition_compliance_score;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS athlete_score_visible;
