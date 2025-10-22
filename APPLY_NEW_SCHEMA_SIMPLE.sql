-- Simple schema application to avoid conflicts
-- Run this in your Supabase SQL editor

-- First, let's check what tables exist and create only what we need

-- Create program_schedule table (if it doesn't exist)
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

-- Create program_progression_rules table (if it doesn't exist)
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

-- Create exercise_alternatives table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS exercise_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  alternative_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exercise_id, alternative_exercise_id)
);

-- Create daily_workout_cache table (if it doesn't exist)
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

-- Enable RLS
ALTER TABLE program_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_workout_cache ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
DO $$ 
BEGIN
    -- Program Schedule Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'program_schedule' AND policyname = 'Coaches can manage program schedule') THEN
        CREATE POLICY "Coaches can manage program schedule" ON program_schedule
          FOR ALL USING (
            program_id IN (
              SELECT id FROM workout_programs WHERE coach_id = auth.uid()
            )
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'program_schedule' AND policyname = 'Clients can view their program schedule') THEN
        CREATE POLICY "Clients can view their program schedule" ON program_schedule
          FOR SELECT USING (
            program_id IN (
              SELECT program_id FROM program_assignments WHERE client_id = auth.uid()
            )
          );
    END IF;

    -- Program Progression Rules Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'program_progression_rules' AND policyname = 'Coaches can manage progression rules') THEN
        CREATE POLICY "Coaches can manage progression rules" ON program_progression_rules
          FOR ALL USING (
            program_id IN (
              SELECT id FROM workout_programs WHERE coach_id = auth.uid()
            )
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'program_progression_rules' AND policyname = 'Clients can view their progression rules') THEN
        CREATE POLICY "Clients can view their progression rules" ON program_progression_rules
          FOR SELECT USING (
            program_id IN (
              SELECT program_id FROM program_assignments WHERE client_id = auth.uid()
            )
          );
    END IF;

    -- Exercise Alternatives Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_alternatives' AND policyname = 'Everyone can view exercise alternatives') THEN
        CREATE POLICY "Everyone can view exercise alternatives" ON exercise_alternatives
          FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exercise_alternatives' AND policyname = 'Authenticated users can manage exercise alternatives') THEN
        CREATE POLICY "Authenticated users can manage exercise alternatives" ON exercise_alternatives
          FOR ALL USING (auth.uid() IS NOT NULL);
    END IF;

    -- Daily Workout Cache Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_workout_cache' AND policyname = 'Clients can manage their workout cache') THEN
        CREATE POLICY "Clients can manage their workout cache" ON daily_workout_cache
          FOR ALL USING (client_id = auth.uid());
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_program_schedule_program_day_week 
  ON program_schedule(program_id, day_of_week, week_number);

CREATE INDEX IF NOT EXISTS idx_progression_rules_program_week 
  ON program_progression_rules(program_id, week_number);

CREATE INDEX IF NOT EXISTS idx_daily_workout_cache_client_date 
  ON daily_workout_cache(client_id, workout_date);

-- Create simple function
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_daily_workout TO authenticated;

COMMIT;
