-- Minimal schema - just create the tables
-- Run this in your Supabase SQL editor

-- Create program_schedule table
CREATE TABLE IF NOT EXISTS program_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create program_progression_rules table
CREATE TABLE IF NOT EXISTS program_progression_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  template_exercise_id UUID NOT NULL REFERENCES workout_template_exercises(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_guidance TEXT,
  rest_time INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create exercise_alternatives table
CREATE TABLE IF NOT EXISTS exercise_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  alternative_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create daily_workout_cache table
CREATE TABLE IF NOT EXISTS daily_workout_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL,
  workout_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE program_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_workout_cache ENABLE ROW LEVEL SECURITY;

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
    'exercises', jsonb_build_array()
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_daily_workout TO authenticated;

COMMIT;
