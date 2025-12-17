-- Program Progression Rules Schema
-- This table stores workout data copied from templates for program-specific modifications
-- Single source of truth for program workouts - never modify workout_templates

-- Option 1: If you have NO important data, uncomment the line below to drop and recreate:
-- DROP TABLE IF EXISTS program_progression_rules CASCADE;

-- Option 2: If you have existing data, the table will be altered below
-- First, check if table exists and add missing columns
DO $$
BEGIN
  -- Drop table if it exists with old schema (only if you want a fresh start)
  -- Uncomment the next line if you want to start fresh:
  -- DROP TABLE IF EXISTS program_progression_rules CASCADE;
  
  -- Create table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'program_progression_rules') THEN
    CREATE TABLE program_progression_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
      program_schedule_id UUID REFERENCES program_schedule(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL DEFAULT 1,
      
      -- Block information
      block_id TEXT,
      block_type TEXT NOT NULL,
      block_order INTEGER NOT NULL,
      block_name TEXT,
      
      -- Exercise information
      exercise_id UUID NOT NULL REFERENCES exercises(id),
      exercise_order INTEGER NOT NULL DEFAULT 1,
      exercise_letter TEXT,
      
      -- Common fields (all exercise types)
      sets INTEGER,
      reps TEXT,
      rest_seconds INTEGER,
      tempo TEXT,
      rir INTEGER,
      weight_kg NUMERIC(10, 2),
      notes TEXT,
      
      -- SUPERSET specific
      first_exercise_reps TEXT,
      second_exercise_reps TEXT,
      rest_between_pairs INTEGER,
      
      -- DROP SET specific
      exercise_reps TEXT,
      drop_set_reps TEXT,
      weight_reduction_percentage INTEGER,
      
      -- CLUSTER SET specific
      reps_per_cluster INTEGER,
      clusters_per_set INTEGER,
      intra_cluster_rest INTEGER,
      
      -- REST PAUSE specific
      rest_pause_duration INTEGER,
      max_rest_pauses INTEGER,
      
      -- PRE-EXHAUSTION specific
      isolation_reps TEXT,
      compound_reps TEXT,
      compound_exercise_id UUID REFERENCES exercises(id),
      
      -- TIME-BASED protocols
      duration_minutes INTEGER,
      emom_mode TEXT,
      target_reps INTEGER,
      work_seconds INTEGER,
      rounds INTEGER,
      rest_after_set INTEGER,
      time_cap_minutes INTEGER,
      rest_after_exercise INTEGER,
      pyramid_order INTEGER,
      ladder_order INTEGER,
      
      -- Metadata
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    -- Table exists, add missing columns
    ALTER TABLE program_progression_rules
      ADD COLUMN IF NOT EXISTS block_id TEXT,
      ADD COLUMN IF NOT EXISTS block_type TEXT,
      ADD COLUMN IF NOT EXISTS block_order INTEGER,
      ADD COLUMN IF NOT EXISTS block_name TEXT,
      ADD COLUMN IF NOT EXISTS exercise_order INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS exercise_letter TEXT,
      ADD COLUMN IF NOT EXISTS sets INTEGER,
      ADD COLUMN IF NOT EXISTS reps TEXT,
      ADD COLUMN IF NOT EXISTS rest_seconds INTEGER,
      ADD COLUMN IF NOT EXISTS tempo TEXT,
      ADD COLUMN IF NOT EXISTS rir INTEGER,
      ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS first_exercise_reps TEXT,
      ADD COLUMN IF NOT EXISTS second_exercise_reps TEXT,
      ADD COLUMN IF NOT EXISTS rest_between_pairs INTEGER,
      ADD COLUMN IF NOT EXISTS exercise_reps TEXT,
      ADD COLUMN IF NOT EXISTS drop_set_reps TEXT,
      ADD COLUMN IF NOT EXISTS weight_reduction_percentage INTEGER,
      ADD COLUMN IF NOT EXISTS reps_per_cluster INTEGER,
      ADD COLUMN IF NOT EXISTS clusters_per_set INTEGER,
      ADD COLUMN IF NOT EXISTS intra_cluster_rest INTEGER,
      ADD COLUMN IF NOT EXISTS rest_pause_duration INTEGER,
      ADD COLUMN IF NOT EXISTS max_rest_pauses INTEGER,
      ADD COLUMN IF NOT EXISTS isolation_reps TEXT,
      ADD COLUMN IF NOT EXISTS compound_reps TEXT,
      ADD COLUMN IF NOT EXISTS compound_exercise_id UUID REFERENCES exercises(id),
      ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
      ADD COLUMN IF NOT EXISTS emom_mode TEXT,
      ADD COLUMN IF NOT EXISTS target_reps INTEGER,
      ADD COLUMN IF NOT EXISTS work_seconds INTEGER,
      ADD COLUMN IF NOT EXISTS rounds INTEGER,
      ADD COLUMN IF NOT EXISTS rest_after_set INTEGER,
      ADD COLUMN IF NOT EXISTS time_cap_minutes INTEGER,
      ADD COLUMN IF NOT EXISTS rest_after_exercise INTEGER,
      ADD COLUMN IF NOT EXISTS pyramid_order INTEGER,
      ADD COLUMN IF NOT EXISTS ladder_order INTEGER;
    
    -- Make block_type and block_order NOT NULL if they're null
    UPDATE program_progression_rules SET block_type = 'straight_set' WHERE block_type IS NULL;
    UPDATE program_progression_rules SET block_order = 1 WHERE block_order IS NULL;
    
    ALTER TABLE program_progression_rules
      ALTER COLUMN block_type SET NOT NULL,
      ALTER COLUMN block_order SET NOT NULL;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_program_progression_rules_program_id ON program_progression_rules(program_id);
CREATE INDEX IF NOT EXISTS idx_program_progression_rules_schedule_id ON program_progression_rules(program_schedule_id);
CREATE INDEX IF NOT EXISTS idx_program_progression_rules_week ON program_progression_rules(program_id, week_number);
CREATE INDEX IF NOT EXISTS idx_program_progression_rules_block ON program_progression_rules(program_id, week_number, block_order);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_program_progression_rules_updated_at ON program_progression_rules;
CREATE TRIGGER update_program_progression_rules_updated_at
  BEFORE UPDATE ON program_progression_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE program_progression_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Coaches can insert progression rules for their programs" ON program_progression_rules;
DROP POLICY IF EXISTS "Coaches can view progression rules for their programs" ON program_progression_rules;
DROP POLICY IF EXISTS "Coaches can update progression rules for their programs" ON program_progression_rules;
DROP POLICY IF EXISTS "Coaches can delete progression rules for their programs" ON program_progression_rules;

CREATE POLICY "Coaches can insert progression rules for their programs"
ON program_progression_rules
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_progression_rules.program_id
    AND wp.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can view progression rules for their programs"
ON program_progression_rules
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_progression_rules.program_id
    AND wp.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can update progression rules for their programs"
ON program_progression_rules
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_progression_rules.program_id
    AND wp.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_progression_rules.program_id
    AND wp.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can delete progression rules for their programs"
ON program_progression_rules
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = program_progression_rules.program_id
    AND wp.coach_id = auth.uid()
  )
);

-- Add comment for documentation
COMMENT ON TABLE program_progression_rules IS 'Stores program-specific workout data copied from templates. This is the single source of truth for program workouts. Never stores JSON in notes field - only plain text comments.';
