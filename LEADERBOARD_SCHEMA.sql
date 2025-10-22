-- =====================================================
-- COMMUNITY LEADERBOARD SYSTEM - COMPREHENSIVE SCHEMA
-- =====================================================
-- This script adds complete leaderboard functionality including:
-- 1. Profile enhancements (sex, bodyweight)
-- 2. Personal records tracking
-- 3. Leaderboard rankings and titles
-- 4. Automated rank calculations
-- 5. RLS policies for security
-- =====================================================

-- =====================================================
-- 1. PROFILE ENHANCEMENTS
-- =====================================================

-- Add sex and bodyweight columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sex VARCHAR(1) CHECK (sex IN ('M', 'F')),
ADD COLUMN IF NOT EXISTS bodyweight DECIMAL(5,2); -- kg

-- Add index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_sex ON profiles(sex) WHERE sex IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_bodyweight ON profiles(bodyweight) WHERE bodyweight IS NOT NULL;

-- Create comment for documentation
COMMENT ON COLUMN profiles.sex IS 'User sex: M (Male) or F (Female) - used for gender-specific leaderboards';
COMMENT ON COLUMN profiles.bodyweight IS 'User current bodyweight in kilograms - used for relative strength calculations';

-- =====================================================
-- 2. PERSONAL RECORDS TABLE
-- =====================================================

-- Create personal_records table if it doesn't exist
CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_name VARCHAR(100) NOT NULL,
  weight DECIMAL(6,2) NOT NULL DEFAULT 0, -- kg
  reps INTEGER NOT NULL DEFAULT 1,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  workout_log_id UUID, -- Optional reference to workout_logs
  notes TEXT,
  video_url TEXT, -- Optional proof video
  verified BOOLEAN DEFAULT FALSE, -- For competitive integrity
  verified_by UUID REFERENCES profiles(id), -- Coach verification
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pr_client_id ON personal_records(client_id);
CREATE INDEX IF NOT EXISTS idx_pr_exercise_name ON personal_records(exercise_name);
CREATE INDEX IF NOT EXISTS idx_pr_achieved_at ON personal_records(achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_pr_verified ON personal_records(verified) WHERE verified = TRUE;

-- Composite index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_pr_exercise_client ON personal_records(exercise_name, client_id, achieved_at DESC);

COMMENT ON TABLE personal_records IS 'Stores personal records for all exercises to power leaderboards and progress tracking';
COMMENT ON COLUMN personal_records.verified IS 'TRUE if coach has verified this PR (prevents cheating in competitions)';

-- =====================================================
-- 3. LEADERBOARD RANKINGS TABLE
-- =====================================================

-- Drop existing table if it exists (to handle schema changes)
DROP TABLE IF EXISTS leaderboard_rankings CASCADE;

-- Materialized view for cached leaderboard rankings
-- This improves query performance by pre-calculating rankings
CREATE TABLE leaderboard_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- e.g., 'bench_absolute', 'total_lifted'
  sex_filter VARCHAR(1) CHECK (sex_filter IN ('M', 'F', NULL)), -- NULL = overall
  time_filter VARCHAR(20) NOT NULL DEFAULT 'all_time' CHECK (time_filter IN ('weekly', 'monthly', 'yearly', 'all_time')),
  score DECIMAL(10,2) NOT NULL,
  rank INTEGER NOT NULL,
  title VARCHAR(50), -- 'Champion', 'Master', 'Expert', etc.
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, category, sex_filter, time_filter)
);

-- Indexes for fast lookups
CREATE INDEX idx_rankings_category ON leaderboard_rankings(category, sex_filter, time_filter, rank);
CREATE INDEX idx_rankings_client ON leaderboard_rankings(client_id);
CREATE INDEX idx_rankings_score ON leaderboard_rankings(category, sex_filter, time_filter, score DESC);
CREATE INDEX idx_rankings_time_filter ON leaderboard_rankings(time_filter);

COMMENT ON TABLE leaderboard_rankings IS 'Cached leaderboard rankings for performance - refreshed periodically';
COMMENT ON COLUMN leaderboard_rankings.sex_filter IS 'NULL for overall, M for men, F for women';

-- =====================================================
-- 4. LEADERBOARD TITLES TABLE
-- =====================================================

-- Track title history and achievements
CREATE TABLE IF NOT EXISTS leaderboard_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  sex_filter VARCHAR(1) CHECK (sex_filter IN ('M', 'F', NULL)),
  rank INTEGER NOT NULL,
  title VARCHAR(50) NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lost_at TIMESTAMP WITH TIME ZONE, -- NULL if currently held
  duration_days INTEGER, -- Calculated via trigger instead of GENERATED column
  UNIQUE(client_id, category, sex_filter, earned_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_titles_client ON leaderboard_titles(client_id);
CREATE INDEX IF NOT EXISTS idx_titles_current ON leaderboard_titles(category, sex_filter) WHERE lost_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_titles_history ON leaderboard_titles(earned_at DESC);

COMMENT ON TABLE leaderboard_titles IS 'Historical record of leaderboard titles earned and defended';
COMMENT ON COLUMN leaderboard_titles.lost_at IS 'NULL if title is currently held';

-- =====================================================
-- 5. FUNCTIONS FOR AUTOMATED CALCULATIONS
-- =====================================================

-- Function to calculate 1RM estimate from weight and reps
CREATE OR REPLACE FUNCTION calculate_one_rep_max(weight DECIMAL, reps INTEGER)
RETURNS DECIMAL AS $$
BEGIN
  -- Epley formula: Weight × (1 + Reps/30)
  IF reps = 1 THEN
    RETURN weight;
  ELSE
    RETURN weight * (1 + reps::DECIMAL / 30);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_one_rep_max IS 'Estimates 1-rep max using Epley formula';

-- Drop old function versions if they exist
DROP FUNCTION IF EXISTS get_best_lift(UUID, VARCHAR);
DROP FUNCTION IF EXISTS get_best_reps(UUID, VARCHAR);
DROP FUNCTION IF EXISTS calculate_category_score(UUID, VARCHAR, DECIMAL);

-- Function to get user's best lift for an exercise with time filter
CREATE OR REPLACE FUNCTION get_best_lift(
  p_client_id UUID,
  p_exercise_name VARCHAR,
  p_time_filter VARCHAR DEFAULT 'all_time'
)
RETURNS DECIMAL AS $$
DECLARE
  best_lift DECIMAL;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate cutoff date based on time filter
  cutoff_date := CASE p_time_filter
    WHEN 'weekly' THEN NOW() - INTERVAL '7 days'
    WHEN 'monthly' THEN NOW() - INTERVAL '30 days'
    WHEN 'yearly' THEN NOW() - INTERVAL '365 days'
    ELSE '1900-01-01'::TIMESTAMP WITH TIME ZONE -- all_time
  END;

  SELECT MAX(calculate_one_rep_max(weight, reps))
  INTO best_lift
  FROM personal_records
  WHERE client_id = p_client_id
    AND LOWER(exercise_name) LIKE '%' || LOWER(p_exercise_name) || '%'
    AND (verified = TRUE OR verified IS NULL)
    AND achieved_at >= cutoff_date;
  
  RETURN COALESCE(best_lift, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_best_lift IS 'Returns user best estimated 1RM for a specific exercise';

-- Function to get user's best reps for bodyweight exercises with time filter
CREATE OR REPLACE FUNCTION get_best_reps(
  p_client_id UUID,
  p_exercise_name VARCHAR,
  p_time_filter VARCHAR DEFAULT 'all_time'
)
RETURNS INTEGER AS $$
DECLARE
  best_reps INTEGER;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate cutoff date based on time filter
  cutoff_date := CASE p_time_filter
    WHEN 'weekly' THEN NOW() - INTERVAL '7 days'
    WHEN 'monthly' THEN NOW() - INTERVAL '30 days'
    WHEN 'yearly' THEN NOW() - INTERVAL '365 days'
    ELSE '1900-01-01'::TIMESTAMP WITH TIME ZONE -- all_time
  END;

  SELECT MAX(reps)
  INTO best_reps
  FROM personal_records
  WHERE client_id = p_client_id
    AND LOWER(exercise_name) LIKE '%' || LOWER(p_exercise_name) || '%'
    AND (verified = TRUE OR verified IS NULL)
    AND achieved_at >= cutoff_date;
  
  RETURN COALESCE(best_reps, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate category score with time filter
CREATE OR REPLACE FUNCTION calculate_category_score(
  p_client_id UUID,
  p_category VARCHAR,
  p_bodyweight DECIMAL,
  p_time_filter VARCHAR DEFAULT 'all_time'
)
RETURNS DECIMAL AS $$
DECLARE
  score DECIMAL := 0;
  bench DECIMAL;
  squat DECIMAL;
  deadlift DECIMAL;
  ohp DECIMAL;
  rdl DECIMAL;
  hipthrust DECIMAL;
  pushups INTEGER;
  chinups INTEGER;
BEGIN
  -- Get best lifts with time filter
  bench := get_best_lift(p_client_id, 'bench press', p_time_filter);
  squat := get_best_lift(p_client_id, 'squat', p_time_filter);
  deadlift := get_best_lift(p_client_id, 'deadlift', p_time_filter);
  ohp := get_best_lift(p_client_id, 'overhead press', p_time_filter);
  rdl := get_best_lift(p_client_id, 'rdl', p_time_filter);
  hipthrust := get_best_lift(p_client_id, 'hip thrust', p_time_filter);
  pushups := get_best_reps(p_client_id, 'pushup', p_time_filter);
  chinups := get_best_reps(p_client_id, 'chinup', p_time_filter);

  -- Calculate score based on category
  score := CASE p_category
    -- Absolute Strength
    WHEN 'bench_absolute' THEN bench
    WHEN 'squat_absolute' THEN squat
    WHEN 'deadlift_absolute' THEN deadlift
    WHEN 'ohp_absolute' THEN ohp
    WHEN 'rdl_absolute' THEN rdl
    WHEN 'hipthrust_absolute' THEN hipthrust
    WHEN 'pushups_absolute' THEN pushups
    WHEN 'chinups_absolute' THEN chinups
    
    -- Relative Strength
    WHEN 'bench_relative' THEN bench / NULLIF(p_bodyweight, 0)
    WHEN 'squat_relative' THEN squat / NULLIF(p_bodyweight, 0)
    WHEN 'deadlift_relative' THEN deadlift / NULLIF(p_bodyweight, 0)
    WHEN 'ohp_relative' THEN ohp / NULLIF(p_bodyweight, 0)
    WHEN 'rdl_relative' THEN rdl / NULLIF(p_bodyweight, 0)
    WHEN 'hipthrust_relative' THEN hipthrust / NULLIF(p_bodyweight, 0)
    
    -- Compound Categories
    WHEN 'total_lifted' THEN bench + squat + deadlift + ohp + rdl + hipthrust
    WHEN 'upper_body' THEN bench + ohp + (pushups * 0.5) + (chinups * 2)
    WHEN 'lower_body' THEN squat + deadlift + rdl + hipthrust
    WHEN 'best_presser' THEN squat + ohp + bench + (pushups * 0.5)
    WHEN 'best_puller' THEN (chinups * 2) + deadlift + rdl + hipthrust
    
    -- Specialized Categories
    WHEN 'powerlifting_total' THEN bench + squat + deadlift
    WHEN 'bodyweight_master' THEN (pushups * 0.5) + (chinups * 2)
    WHEN 'strength_endurance' THEN 
      pushups + (chinups * 2) + ((bench + squat + deadlift) / NULLIF(p_bodyweight, 0)) * 10
    
    ELSE 0
  END;

  RETURN score;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_category_score IS 'Calculates user score for any leaderboard category';

-- Function to refresh leaderboard rankings with time filters
CREATE OR REPLACE FUNCTION refresh_leaderboard_rankings()
RETURNS void AS $$
DECLARE
  categories TEXT[] := ARRAY[
    'bench_absolute', 'squat_absolute', 'deadlift_absolute', 'ohp_absolute',
    'rdl_absolute', 'hipthrust_absolute', 'pushups_absolute', 'chinups_absolute',
    'bench_relative', 'squat_relative', 'deadlift_relative', 'ohp_relative',
    'rdl_relative', 'hipthrust_relative',
    'total_lifted', 'upper_body', 'lower_body', 'best_presser', 'best_puller',
    'powerlifting_total', 'bodyweight_master', 'strength_endurance'
  ];
  sex_filters TEXT[] := ARRAY[NULL, 'M', 'F'];
  time_filters TEXT[] := ARRAY['weekly', 'monthly', 'yearly', 'all_time'];
  cat TEXT;
  sex_filt TEXT;
  time_filt TEXT;
BEGIN
  -- Clear old rankings
  DELETE FROM leaderboard_rankings;

  -- Calculate rankings for each category, sex filter, and time filter
  FOREACH cat IN ARRAY categories
  LOOP
    FOREACH sex_filt IN ARRAY sex_filters
    LOOP
      FOREACH time_filt IN ARRAY time_filters
      LOOP
        INSERT INTO leaderboard_rankings (client_id, category, sex_filter, time_filter, score, rank, title)
        SELECT 
          p.id,
          cat,
          sex_filt,
          time_filt,
          calculate_category_score(p.id, cat, p.bodyweight, time_filt),
          ROW_NUMBER() OVER (ORDER BY calculate_category_score(p.id, cat, p.bodyweight, time_filt) DESC),
          CASE 
            WHEN ROW_NUMBER() OVER (ORDER BY calculate_category_score(p.id, cat, p.bodyweight, time_filt) DESC) = 1 THEN 'Champion'
            WHEN ROW_NUMBER() OVER (ORDER BY calculate_category_score(p.id, cat, p.bodyweight, time_filt) DESC) = 2 THEN 'Master'
            WHEN ROW_NUMBER() OVER (ORDER BY calculate_category_score(p.id, cat, p.bodyweight, time_filt) DESC) = 3 THEN 'Expert'
            WHEN ROW_NUMBER() OVER (ORDER BY calculate_category_score(p.id, cat, p.bodyweight, time_filt) DESC) <= 10 THEN 'Elite'
            ELSE 'Competitor'
          END
        FROM profiles p
        WHERE p.role = 'client'
          AND p.bodyweight IS NOT NULL
          AND (sex_filt IS NULL OR p.sex = sex_filt)
          AND calculate_category_score(p.id, cat, p.bodyweight, time_filt) > 0;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_leaderboard_rankings IS 'Recalculates all leaderboard rankings - run after PRs are added';

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Trigger to update rankings when PR is added/updated
CREATE OR REPLACE FUNCTION trigger_refresh_rankings()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule a ranking refresh (in production, you might want to debounce this)
  PERFORM refresh_leaderboard_rankings();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS tr_pr_refresh_rankings ON personal_records;
CREATE TRIGGER tr_pr_refresh_rankings
  AFTER INSERT OR UPDATE OR DELETE ON personal_records
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_rankings();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_pr_updated_at ON personal_records;
CREATE TRIGGER tr_pr_updated_at
  BEFORE UPDATE ON personal_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON profiles;
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to calculate duration_days for leaderboard titles
CREATE OR REPLACE FUNCTION calculate_title_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lost_at IS NULL THEN
    NEW.duration_days := EXTRACT(DAY FROM NOW() - NEW.earned_at)::INTEGER;
  ELSE
    NEW.duration_days := EXTRACT(DAY FROM NEW.lost_at - NEW.earned_at)::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_title_duration ON leaderboard_titles;
CREATE TRIGGER tr_title_duration
  BEFORE INSERT OR UPDATE ON leaderboard_titles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_title_duration();

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_titles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view personal records" ON personal_records;
DROP POLICY IF EXISTS "Clients can insert own PRs" ON personal_records;
DROP POLICY IF EXISTS "Clients can update own PRs" ON personal_records;
DROP POLICY IF EXISTS "Coaches can verify PRs" ON personal_records;
DROP POLICY IF EXISTS "Anyone can view leaderboard rankings" ON leaderboard_rankings;
DROP POLICY IF EXISTS "System can manage rankings" ON leaderboard_rankings;
DROP POLICY IF EXISTS "Anyone can view leaderboard titles" ON leaderboard_titles;

-- Personal Records Policies
-- Clients can view all PRs (for leaderboards)
CREATE POLICY "Anyone can view personal records"
  ON personal_records FOR SELECT
  TO authenticated
  USING (true);

-- Clients can insert their own PRs
CREATE POLICY "Clients can insert own PRs"
  ON personal_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_id);

-- Clients can update their own PRs
CREATE POLICY "Clients can update own PRs"
  ON personal_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Coaches can verify PRs
CREATE POLICY "Coaches can verify PRs"
  ON personal_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- Leaderboard Rankings Policies
-- Everyone can view rankings
CREATE POLICY "Anyone can view leaderboard rankings"
  ON leaderboard_rankings FOR SELECT
  TO authenticated
  USING (true);

-- Only system can insert/update rankings (via functions)
CREATE POLICY "System can manage rankings"
  ON leaderboard_rankings FOR ALL
  TO authenticated
  USING (false) -- No direct access
  WITH CHECK (false);

-- Leaderboard Titles Policies
-- Everyone can view titles
CREATE POLICY "Anyone can view leaderboard titles"
  ON leaderboard_titles FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 8. HELPER VIEWS
-- =====================================================

-- View for current champions (rank 1 titles)
CREATE OR REPLACE VIEW current_champions AS
SELECT 
  lr.category,
  lr.sex_filter,
  p.id as client_id,
  p.first_name || ' ' || p.last_name as name,
  p.sex,
  p.bodyweight,
  lr.score,
  lr.title,
  lr.calculated_at
FROM leaderboard_rankings lr
JOIN profiles p ON p.id = lr.client_id
WHERE lr.rank = 1
ORDER BY lr.category, lr.sex_filter;

COMMENT ON VIEW current_champions IS 'Shows all current #1 ranked athletes';

-- View for user's personal bests
CREATE OR REPLACE VIEW user_personal_bests AS
SELECT 
  client_id,
  exercise_name,
  MAX(calculate_one_rep_max(weight, reps)) as best_estimated_1rm,
  MAX(weight) as best_weight,
  MAX(reps) as best_reps,
  MAX(achieved_at) as last_achieved
FROM personal_records
GROUP BY client_id, exercise_name;

COMMENT ON VIEW user_personal_bests IS 'Aggregated view of each user best performance per exercise';

-- =====================================================
-- 9. INITIAL DATA & RANKING CALCULATION
-- =====================================================

-- Refresh rankings for any existing data
SELECT refresh_leaderboard_rankings();

-- =====================================================
-- 10. USEFUL QUERIES (COMMENTED EXAMPLES)
-- =====================================================

/*
-- Get leaderboard for a specific category
SELECT 
  lr.rank,
  p.first_name || ' ' || p.last_name as name,
  p.sex,
  lr.score,
  lr.title
FROM leaderboard_rankings lr
JOIN profiles p ON p.id = lr.client_id
WHERE lr.category = 'total_lifted'
  AND lr.sex_filter IS NULL -- Overall leaderboard
ORDER BY lr.rank;

-- Get user's rankings across all categories
SELECT 
  category,
  sex_filter,
  rank,
  score,
  title
FROM leaderboard_rankings
WHERE client_id = 'USER_UUID_HERE'
ORDER BY rank;

-- Get all-time champions for a category
SELECT 
  lt.title,
  p.first_name || ' ' || p.last_name as name,
  lt.earned_at,
  lt.lost_at,
  lt.duration_days
FROM leaderboard_titles lt
JOIN profiles p ON p.id = lt.client_id
WHERE lt.category = 'bench_absolute'
  AND lt.rank = 1
ORDER BY lt.duration_days DESC;

-- Add a new personal record
INSERT INTO personal_records (client_id, exercise_name, weight, reps, achieved_at)
VALUES ('USER_UUID', 'Bench Press', 100, 5, NOW());

-- Update user bodyweight
UPDATE profiles SET bodyweight = 75.5 WHERE id = 'USER_UUID';

-- Manually refresh rankings (if trigger is disabled)
SELECT refresh_leaderboard_rankings();
*/

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Grant necessary permissions
GRANT SELECT ON personal_records TO authenticated;
GRANT INSERT, UPDATE ON personal_records TO authenticated;
GRANT SELECT ON leaderboard_rankings TO authenticated;
GRANT SELECT ON leaderboard_titles TO authenticated;
GRANT SELECT ON current_champions TO authenticated;
GRANT SELECT ON user_personal_bests TO authenticated;

-- Success message
DO $$
DECLARE
  champion_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO champion_count FROM current_champions;
  
  RAISE NOTICE '✅ Leaderboard system installed successfully!';
  RAISE NOTICE '📊 Tables created: personal_records, leaderboard_rankings, leaderboard_titles';
  RAISE NOTICE '🔧 Functions: calculate_one_rep_max, get_best_lift, get_best_reps, calculate_category_score, refresh_leaderboard_rankings';
  RAISE NOTICE '🔒 RLS policies enabled for security';
  RAISE NOTICE '👑 % current champions tracked', champion_count;
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '1. Update user profiles with sex (M/F) and bodyweight';
  RAISE NOTICE '2. Add personal records via workout logging';
  RAISE NOTICE '3. Rankings will auto-update after each PR';
END $$;

