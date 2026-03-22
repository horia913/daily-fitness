-- Client-specific exercise swap: use override exercise when set (workout execution / blocks resolve via application code).
ALTER TABLE client_program_progression_rules
  ADD COLUMN IF NOT EXISTS override_exercise_id uuid REFERENCES exercises(id);

COMMENT ON COLUMN client_program_progression_rules.override_exercise_id IS
  'When set, the client sees this exercise instead of exercise_id for this progression row.';
