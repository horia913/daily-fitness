-- Add dropset_drops JSONB for multiple drops (2-4) in a single drop set
-- Structure: [{ "weight": 60, "reps": 10 }, { "weight": 50, "reps": 8 }, ...]
-- Legacy columns dropset_initial_* and dropset_final_* remain for backward compat (first/last element)
ALTER TABLE workout_set_logs ADD COLUMN IF NOT EXISTS dropset_drops JSONB;
