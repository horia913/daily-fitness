-- =====================================================
-- WORKOUT LOGS SCHEMA
-- =====================================================
-- This schema handles workout logging and personal records tracking
-- =====================================================

-- First, create workout_template_exercises if it doesn't exist (needed for foreign key)
CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  exercise_id UUID,
  order_index INTEGER,
  sets INTEGER,
  target_reps INTEGER,
  target_weight DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create exercises table if it doesn't exist (needed for foreign key)
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint to workout_template_exercises -> exercises
DO $$
BEGIN
  -- Add exercise_id column if it doesn't have the foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'workout_template_exercises_exercise_id_fkey'
    AND table_name = 'workout_template_exercises'
  ) THEN
    -- Drop column if exists without FK
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'workout_template_exercises' 
      AND column_name = 'exercise_id'
    ) THEN
      ALTER TABLE workout_template_exercises DROP COLUMN exercise_id;
    END IF;
    -- Add with proper FK
    ALTER TABLE workout_template_exercises 
    ADD COLUMN exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create workout_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  template_exercise_id UUID,
  exercise_name TEXT NOT NULL, -- Store name directly for when template is deleted
  set_number INTEGER NOT NULL,
  target_reps INTEGER,
  target_weight DECIMAL,
  reps_completed INTEGER,
  weight_used DECIMAL,
  rir INTEGER, -- Reps in reserve
  tempo TEXT, -- e.g., "3-0-1-0"
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_set_number CHECK (set_number > 0),
  CONSTRAINT valid_reps CHECK (reps_completed IS NULL OR reps_completed >= 0),
  CONSTRAINT valid_weight CHECK (weight_used IS NULL OR weight_used >= 0)
);

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_logs' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE workout_logs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Drop NOT NULL constraint on template_exercise_id if it exists
ALTER TABLE workout_logs ALTER COLUMN template_exercise_id DROP NOT NULL;

-- Clean up orphaned workout_logs records before adding foreign key
UPDATE workout_logs 
SET template_exercise_id = NULL 
WHERE template_exercise_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM workout_template_exercises 
  WHERE id = workout_logs.template_exercise_id
);

-- Add the foreign key constraint separately to ensure proper detection
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'workout_logs_template_exercise_id_fkey'
    AND table_name = 'workout_logs'
  ) THEN
    ALTER TABLE workout_logs 
    ADD CONSTRAINT workout_logs_template_exercise_id_fkey 
    FOREIGN KEY (template_exercise_id) 
    REFERENCES workout_template_exercises(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workout_logs_session ON workout_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_template_exercise ON workout_logs(template_exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_created_at ON workout_logs(created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_workout_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workout_logs_updated_at ON workout_logs;
CREATE TRIGGER workout_logs_updated_at
  BEFORE UPDATE ON workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_workout_logs_updated_at();

-- RLS Policies
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own workout logs" ON workout_logs;
CREATE POLICY "Users can view their own workout logs"
  ON workout_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = workout_logs.session_id
      AND ws.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own workout logs" ON workout_logs;
CREATE POLICY "Users can insert their own workout logs"
  ON workout_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = workout_logs.session_id
      AND ws.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own workout logs" ON workout_logs;
CREATE POLICY "Users can update their own workout logs"
  ON workout_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = workout_logs.session_id
      AND ws.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = workout_logs.session_id
      AND ws.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can view their clients workout logs" ON workout_logs;
CREATE POLICY "Coaches can view their clients workout logs"
  ON workout_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'coach'
    )
  );

-- Verification
DO $$
DECLARE
  v_exercises_count INTEGER;
  v_template_exercises_count INTEGER;
  v_workout_logs_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_exercises_count FROM exercises;
  SELECT COUNT(*) INTO v_template_exercises_count FROM workout_template_exercises;
  SELECT COUNT(*) INTO v_workout_logs_count FROM workout_logs;
  
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'WORKOUT LOGS SCHEMA SETUP COMPLETE';
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - exercises (% rows)', v_exercises_count;
  RAISE NOTICE '  - workout_template_exercises (% rows)', v_template_exercises_count;
  RAISE NOTICE '  - workout_logs (% rows)', v_workout_logs_count;
  RAISE NOTICE 'Indexes: 3';
  RAISE NOTICE 'RLS Policies: 4';
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'IMPORTANT: Refresh your browser to clear cache!';
  RAISE NOTICE '=============================================';
END $$;

