-- Workout Blocks Architecture Schema
-- This implements the flexible "Workout Block" system for advanced training protocols

-- Workout Block Types
CREATE TYPE workout_block_type AS ENUM (
  'straight_set',      -- Traditional sets with rest
  'superset',          -- Two exercises back-to-back
  'giant_set',         -- Three or more exercises back-to-back
  'drop_set',          -- Reduce weight and continue
  'cluster_set',       -- Short rests between clusters
  'rest_pause',        -- Brief rest-pause between efforts
  'pyramid_set',       -- Progressive weight/rep schemes
  'pre_exhaustion',    -- Isolation then compound
  'amrap',            -- As Many Rounds As Possible
  'emom',             -- Every Minute On the Minute
  'tabata',           -- 20s work / 10s rest protocol
  'for_time',         -- Complete as fast as possible
  'ladder'            -- Ascending/descending rep schemes
);

-- Main workout blocks table
CREATE TABLE workout_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  block_type workout_block_type NOT NULL,
  block_order INTEGER NOT NULL,
  block_name VARCHAR(255),
  block_notes TEXT,
  
  -- Time-based parameters
  duration_seconds INTEGER,           -- For AMRAP, EMOM, Tabata
  rest_seconds INTEGER,               -- Main rest between sets/blocks
  
  -- Set/Rep parameters
  total_sets INTEGER,                 -- Total sets for the block
  reps_per_set VARCHAR(50),           -- Reps for each set (can be ranges like "10-12")
  
  -- Special parameters (JSON for flexibility)
  block_parameters JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Block exercises (multiple exercises per block for supersets, giant sets, etc.)
CREATE TABLE workout_block_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES workout_blocks(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  exercise_order INTEGER NOT NULL,    -- Order within the block (1A, 1B, 1C, etc.)
  exercise_letter VARCHAR(5),         -- A, B, C, etc. for supersets
  
  -- Exercise-specific parameters
  sets INTEGER,
  reps VARCHAR(50),
  weight_kg DECIMAL(8,2),
  rir INTEGER,                        -- Reps in reserve
  tempo VARCHAR(20),                  -- Tempo notation
  rest_seconds INTEGER,               -- Exercise-specific rest
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop set configurations
CREATE TABLE workout_drop_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_exercise_id UUID NOT NULL REFERENCES workout_block_exercises(id) ON DELETE CASCADE,
  drop_order INTEGER NOT NULL,        -- 1st drop, 2nd drop, etc.
  weight_kg DECIMAL(8,2),
  reps VARCHAR(50),
  rest_seconds INTEGER DEFAULT 0,    -- Usually 0 for drop sets
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cluster set configurations
CREATE TABLE workout_cluster_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_exercise_id UUID NOT NULL REFERENCES workout_block_exercises(id) ON DELETE CASCADE,
  reps_per_cluster INTEGER NOT NULL,
  clusters_per_set INTEGER NOT NULL,
  intra_cluster_rest INTEGER DEFAULT 15,  -- Rest between clusters (seconds)
  inter_set_rest INTEGER DEFAULT 120,     -- Rest after full set (seconds)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pyramid set configurations
CREATE TABLE workout_pyramid_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_exercise_id UUID NOT NULL REFERENCES workout_block_exercises(id) ON DELETE CASCADE,
  pyramid_order INTEGER NOT NULL,     -- Order in the pyramid
  weight_kg DECIMAL(8,2),
  reps VARCHAR(50),
  rest_seconds INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rest-pause configurations
CREATE TABLE workout_rest_pause_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_exercise_id UUID NOT NULL REFERENCES workout_block_exercises(id) ON DELETE CASCADE,
  initial_weight_kg DECIMAL(8,2),
  initial_reps INTEGER,
  rest_pause_duration INTEGER DEFAULT 15,  -- Seconds between efforts
  max_rest_pauses INTEGER DEFAULT 3,       -- Max number of rest-pause attempts
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AMRAP/EMOM/For Time configurations
CREATE TABLE workout_time_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES workout_blocks(id) ON DELETE CASCADE,
  protocol_type VARCHAR(20) NOT NULL, -- 'amrap', 'emom', 'for_time', 'ladder'
  total_duration_minutes INTEGER,     -- For AMRAP, EMOM
  work_seconds INTEGER,               -- For Tabata, EMOM work periods
  rest_seconds INTEGER,               -- For Tabata, EMOM rest periods
  rounds INTEGER,                     -- For Tabata (usually 8)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ladder configurations
CREATE TABLE workout_ladder_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_exercise_id UUID NOT NULL REFERENCES workout_block_exercises(id) ON DELETE CASCADE,
  ladder_order INTEGER NOT NULL,      -- Order in the ladder
  weight_kg DECIMAL(8,2),
  reps INTEGER,
  rest_seconds INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_workout_blocks_template_id ON workout_blocks(template_id);
CREATE INDEX idx_workout_blocks_order ON workout_blocks(template_id, block_order);
CREATE INDEX idx_workout_block_exercises_block_id ON workout_block_exercises(block_id);
CREATE INDEX idx_workout_block_exercises_order ON workout_block_exercises(block_id, exercise_order);

-- Row Level Security
ALTER TABLE workout_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_block_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_drop_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_cluster_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_pyramid_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_rest_pause_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_time_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_ladder_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can manage workout blocks" ON workout_blocks
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage block exercises" ON workout_block_exercises
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage drop sets" ON workout_drop_sets
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage cluster sets" ON workout_cluster_sets
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage pyramid sets" ON workout_pyramid_sets
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage rest pause sets" ON workout_rest_pause_sets
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage time protocols" ON workout_time_protocols
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage ladder sets" ON workout_ladder_sets
  FOR ALL USING (auth.role() = 'authenticated');

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workout_blocks_updated_at BEFORE UPDATE ON workout_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_block_exercises_updated_at BEFORE UPDATE ON workout_block_exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON workout_blocks TO authenticated;
GRANT ALL ON workout_block_exercises TO authenticated;
GRANT ALL ON workout_drop_sets TO authenticated;
GRANT ALL ON workout_cluster_sets TO authenticated;
GRANT ALL ON workout_pyramid_sets TO authenticated;
GRANT ALL ON workout_rest_pause_sets TO authenticated;
GRANT ALL ON workout_time_protocols TO authenticated;
GRANT ALL ON workout_ladder_sets TO authenticated;

-- Comments for documentation
COMMENT ON TABLE workout_blocks IS 'Main workout blocks that define different training protocols';
COMMENT ON TABLE workout_block_exercises IS 'Exercises within each workout block';
COMMENT ON TABLE workout_drop_sets IS 'Drop set configurations for progressive weight reduction';
COMMENT ON TABLE workout_cluster_sets IS 'Cluster set configurations with short intra-set rests';
COMMENT ON TABLE workout_pyramid_sets IS 'Pyramid set configurations with progressive loading';
COMMENT ON TABLE workout_rest_pause_sets IS 'Rest-pause set configurations with brief rest periods';
COMMENT ON TABLE workout_time_protocols IS 'Time-based protocol configurations (AMRAP, EMOM, Tabata)';
COMMENT ON TABLE workout_ladder_sets IS 'Ladder set configurations with ascending/descending reps';
