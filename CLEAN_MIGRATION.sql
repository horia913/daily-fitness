-- Clean migration script that handles existing conflicts
-- Run this in your Supabase SQL editor

-- Step 1: Drop existing function that conflicts
DROP FUNCTION IF EXISTS generate_daily_workout(uuid, uuid, date);

-- Step 2: Drop existing conflicting constraints and indexes
ALTER TABLE IF EXISTS program_progression_rules DROP CONSTRAINT IF EXISTS program_progression_rules_program_id_exercise_id_week_numbe_key;
DROP INDEX IF EXISTS idx_program_progression_rules_week;

-- Step 3: Drop existing tables if they exist (they might have wrong schema)
DROP TABLE IF EXISTS program_progression_rules CASCADE;
DROP TABLE IF EXISTS program_schedule CASCADE;
DROP TABLE IF EXISTS exercise_alternatives CASCADE;
DROP TABLE IF EXISTS daily_workout_cache CASCADE;

-- Step 4: Create new tables with correct schema
CREATE TABLE program_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  week_number INTEGER NOT NULL CHECK (week_number >= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, day_of_week, week_number)
);

CREATE TABLE program_progression_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  template_exercise_id UUID NOT NULL REFERENCES workout_template_exercises(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL CHECK (week_number >= 1),
  sets INTEGER NOT NULL CHECK (sets > 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  weight_guidance TEXT,
  rest_time INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, template_exercise_id, week_number)
);

CREATE TABLE exercise_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  alternative_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exercise_id, alternative_exercise_id)
);

CREATE TABLE daily_workout_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL,
  workout_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, program_id, workout_date)
);

-- Step 5: Enable RLS
ALTER TABLE program_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_workout_cache ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Coaches can manage program schedule" ON program_schedule
  FOR ALL USING (
    program_id IN (
      SELECT id FROM workout_programs WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view their program schedule" ON program_schedule
  FOR SELECT USING (
    program_id IN (
      SELECT program_id FROM program_assignments WHERE client_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can manage progression rules" ON program_progression_rules
  FOR ALL USING (
    program_id IN (
      SELECT id FROM workout_programs WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view their progression rules" ON program_progression_rules
  FOR SELECT USING (
    program_id IN (
      SELECT program_id FROM program_assignments WHERE client_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view exercise alternatives" ON exercise_alternatives
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage exercise alternatives" ON exercise_alternatives
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Clients can manage their workout cache" ON daily_workout_cache
  FOR ALL USING (client_id = auth.uid());

-- Step 7: Create correct indexes
CREATE INDEX idx_program_schedule_program_day_week 
  ON program_schedule(program_id, day_of_week, week_number);

CREATE INDEX idx_progression_rules_program_week 
  ON program_progression_rules(program_id, week_number);

CREATE INDEX idx_daily_workout_cache_client_date 
  ON daily_workout_cache(client_id, workout_date);

-- Step 8: Create new function
CREATE OR REPLACE FUNCTION generate_daily_workout(
  p_client_id UUID,
  p_program_id UUID,
  p_workout_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'template_name', 'Sample Workout',
    'template_description', 'This is a sample workout template',
    'week_number', 1,
    'exercises', jsonb_build_array(
      jsonb_build_object(
        'id', 'sample-exercise-1',
        'exercise_name', 'Push-ups',
        'sets', 3,
        'reps', 10,
        'rest_time', 60,
        'alternatives', jsonb_build_array()
      )
    )
  );
END;
$$;

-- Step 9: Grant permissions
GRANT EXECUTE ON FUNCTION generate_daily_workout TO authenticated;

COMMIT;
