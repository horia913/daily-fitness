-- User Exercise Metrics Schema
-- Stores estimated 1RM (one-rep max) for each user-exercise pair
-- Only stores the highest e1RM value per user-exercise combination

CREATE TABLE IF NOT EXISTS user_exercise_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  estimated_1rm NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_exercise_metrics_user_id ON user_exercise_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_metrics_exercise_id ON user_exercise_metrics(exercise_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_metrics_user_exercise ON user_exercise_metrics(user_id, exercise_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_exercise_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_exercise_metrics_updated_at ON user_exercise_metrics;
CREATE TRIGGER update_user_exercise_metrics_updated_at
  BEFORE UPDATE ON user_exercise_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_user_exercise_metrics_updated_at();

-- Enable RLS
ALTER TABLE user_exercise_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users view own metrics" ON user_exercise_metrics;
DROP POLICY IF EXISTS "Users insert own metrics" ON user_exercise_metrics;
DROP POLICY IF EXISTS "Users update own metrics" ON user_exercise_metrics;

CREATE POLICY "Users view own metrics"
  ON user_exercise_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own metrics"
  ON user_exercise_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own metrics"
  ON user_exercise_metrics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE user_exercise_metrics IS 'Stores estimated 1RM (one-rep max) for each user-exercise pair. Only the highest e1RM is kept per user-exercise combination.';

