-- Apply the new enhanced workout template and progression system
-- Run this in your Supabase SQL editor

-- First, backup existing data (optional but recommended)
-- You can export your current workout_templates and program_weeks tables

-- Drop existing tables that will be replaced
DROP TABLE IF EXISTS program_week_workouts CASCADE;
DROP TABLE IF EXISTS program_weeks CASCADE;

-- Create new enhanced tables
CREATE TABLE IF NOT EXISTS program_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  week_number INTEGER NOT NULL CHECK (week_number >= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, day_of_week, week_number)
);

CREATE TABLE IF NOT EXISTS program_progression_rules (
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

CREATE TABLE IF NOT EXISTS exercise_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  alternative_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exercise_id, alternative_exercise_id)
);

CREATE TABLE IF NOT EXISTS daily_workout_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL,
  workout_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, program_id, workout_date)
);

-- Update workout_template_exercises to remove sets/reps/weight
ALTER TABLE workout_template_exercises 
DROP COLUMN IF EXISTS sets,
DROP COLUMN IF EXISTS reps,
DROP COLUMN IF EXISTS rest_seconds;

-- Add RLS policies
ALTER TABLE program_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_workout_cache ENABLE ROW LEVEL SECURITY;

-- Program Schedule Policies
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

-- Program Progression Rules Policies
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

-- Exercise Alternatives Policies
CREATE POLICY "Everyone can view exercise alternatives" ON exercise_alternatives
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage exercise alternatives" ON exercise_alternatives
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Daily Workout Cache Policies
CREATE POLICY "Clients can manage their workout cache" ON daily_workout_cache
  FOR ALL USING (client_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_program_schedule_program_day_week 
  ON program_schedule(program_id, day_of_week, week_number);

CREATE INDEX IF NOT EXISTS idx_progression_rules_program_week 
  ON program_progression_rules(program_id, week_number);

CREATE INDEX IF NOT EXISTS idx_daily_workout_cache_client_date 
  ON daily_workout_cache(client_id, workout_date);

CREATE INDEX IF NOT EXISTS idx_daily_workout_cache_expires 
  ON daily_workout_cache(expires_at);

-- Create function to generate daily workout
-- This function must be created after all tables exist
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
  -- Simple function that returns a basic workout structure
  -- This will be enhanced once the basic tables are working
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_daily_workout TO authenticated;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_program_schedule_updated_at 
  BEFORE UPDATE ON program_schedule 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_progression_rules_updated_at 
  BEFORE UPDATE ON program_progression_rules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- You can remove this section if you don't want sample data

-- Sample exercise alternatives
INSERT INTO exercise_alternatives (exercise_id, alternative_exercise_id, reason)
SELECT 
  e1.id,
  e2.id,
  'Equipment substitution'
FROM exercises e1
JOIN exercises e2 ON e2.name ILIKE '%dumbbell%' AND e1.name ILIKE '%barbell%'
WHERE e1.name ILIKE '%bench press%' AND e2.name ILIKE '%bench press%'
LIMIT 1
ON CONFLICT DO NOTHING;

COMMIT;
