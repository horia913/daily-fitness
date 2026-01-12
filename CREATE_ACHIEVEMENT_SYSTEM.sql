-- ============================================================================
-- CREATE ACHIEVEMENT SYSTEM
-- Purpose: Create achievement_templates table and modify user_achievements table
-- Cleanest approach: Create new templates table, modify existing user_achievements
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE achievement_templates TABLE
-- Stores predefined achievements (same for everyone)
-- ============================================================================
CREATE TABLE IF NOT EXISTS achievement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL, -- 'activity', 'performance', 'volume', 'strength', etc.
  achievement_type TEXT NOT NULL, -- 'workout_count', 'streak_weeks', 'pr_count', 'program_completion', etc.
  is_tiered BOOLEAN NOT NULL DEFAULT false,
  -- For tiered achievements (separate columns, NO JSON):
  tier_bronze_threshold NUMERIC,
  tier_bronze_label TEXT,
  tier_silver_threshold NUMERIC,
  tier_silver_label TEXT,
  tier_gold_threshold NUMERIC,
  tier_gold_label TEXT,
  tier_platinum_threshold NUMERIC,
  tier_platinum_label TEXT,
  -- For non-tiered achievements:
  single_threshold NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for achievement_templates
CREATE INDEX IF NOT EXISTS idx_achievement_templates_category ON achievement_templates(category);
CREATE INDEX IF NOT EXISTS idx_achievement_templates_type ON achievement_templates(achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievement_templates_active ON achievement_templates(is_active);

-- ============================================================================
-- STEP 2: MODIFY user_achievements TABLE
-- Since table is empty, we can safely modify it
-- ============================================================================

-- 2a. Add new columns (if they don't exist)
ALTER TABLE user_achievements 
  ADD COLUMN IF NOT EXISTS client_id UUID,
  ADD COLUMN IF NOT EXISTS achievement_template_id UUID,
  ADD COLUMN IF NOT EXISTS tier TEXT, -- 'bronze', 'silver', 'gold', 'platinum', NULL for non-tiered
  ADD COLUMN IF NOT EXISTS metric_value NUMERIC, -- The actual value that triggered unlock (e.g., 100 workouts)
  ADD COLUMN IF NOT EXISTS achieved_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

-- 2b. Rename existing columns to match new structure
-- Note: Since table is empty, we can drop and recreate, but safer to check first
-- We'll keep user_id and achievement_id for now, migrate data if any exists later

-- 2c. Add foreign key constraints
ALTER TABLE user_achievements
  DROP CONSTRAINT IF EXISTS user_achievements_client_id_fkey,
  DROP CONSTRAINT IF EXISTS user_achievements_achievement_template_id_fkey;

ALTER TABLE user_achievements
  ADD CONSTRAINT user_achievements_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT user_achievements_achievement_template_id_fkey 
    FOREIGN KEY (achievement_template_id) REFERENCES achievement_templates(id) ON DELETE CASCADE;

-- 2d. Drop old unique constraint if it exists (based on user_id, achievement_id)
ALTER TABLE user_achievements
  DROP CONSTRAINT IF EXISTS user_achievements_user_id_achievement_id_key;

-- 2e. Create new unique constraint (client can only unlock each tier once per template)
ALTER TABLE user_achievements
  ADD CONSTRAINT user_achievements_client_template_tier_unique 
    UNIQUE(client_id, achievement_template_id, tier);

-- 2f. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_client ON user_achievements(client_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_template ON user_achievements(achievement_template_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_date ON user_achievements(achieved_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_client_template ON user_achievements(client_id, achievement_template_id);

-- 2g. Make client_id and achievement_template_id NOT NULL (after adding FKs)
-- Since table is empty, we can do this safely
-- Note: We check if column exists first, then set NOT NULL
DO $$
BEGIN
  -- Set NOT NULL constraints (safe since table is empty)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_achievements' AND column_name = 'client_id') THEN
    ALTER TABLE user_achievements ALTER COLUMN client_id SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_achievements' AND column_name = 'achievement_template_id') THEN
    ALTER TABLE user_achievements ALTER COLUMN achievement_template_id SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_achievements' AND column_name = 'metric_value') THEN
    ALTER TABLE user_achievements ALTER COLUMN metric_value SET NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_achievements' AND column_name = 'achieved_date') THEN
    ALTER TABLE user_achievements ALTER COLUMN achieved_date SET NOT NULL;
  END IF;
END $$;

-- 2h. Migrate data from old columns to new columns (if any data exists)
-- Since table is empty (0 records), we can skip this, but keeping the logic for reference:
-- UPDATE user_achievements SET client_id = user_id WHERE client_id IS NULL;
-- UPDATE user_achievements SET achievement_template_id = achievement_id WHERE achievement_template_id IS NULL;

-- 2i. Optional: Drop old columns after migration (if we're not using them)
-- We'll keep user_id and achievement_id for now in case they're referenced elsewhere
-- Can be dropped later after confirming no code references them
-- ALTER TABLE user_achievements DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE user_achievements DROP COLUMN IF EXISTS achievement_id;
-- ALTER TABLE user_achievements DROP COLUMN IF EXISTS earned_at;

-- ============================================================================
-- STEP 3: ROW LEVEL SECURITY (RLS) POLICIES (if needed)
-- ============================================================================
-- Enable RLS if not already enabled
ALTER TABLE achievement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Achievement templates are viewable by everyone" ON achievement_templates;
DROP POLICY IF EXISTS "Achievement templates can be inserted by authenticated users with admin role" ON achievement_templates;
DROP POLICY IF EXISTS "Achievement templates can be updated by authenticated users with admin role" ON achievement_templates;
DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON user_achievements;

-- Policies for achievement_templates (public read, admin write)
CREATE POLICY "Achievement templates are viewable by everyone"
  ON achievement_templates FOR SELECT
  USING (true);

CREATE POLICY "Achievement templates can be inserted by authenticated users with admin role"
  ON achievement_templates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Achievement templates can be updated by authenticated users with admin role"
  ON achievement_templates FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policies for user_achievements (users can view their own, admins can view all)
CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users can insert their own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- Note: Updates/deletes should be handled by application logic, not directly by users
-- We can add policies if needed, but typically achievements are unlocked by system logic

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the setup)
-- ============================================================================

-- Verify achievement_templates structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'achievement_templates'
ORDER BY ordinal_position;

-- Verify user_achievements structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_achievements'
ORDER BY ordinal_position;

-- Verify foreign keys
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'user_achievements'
ORDER BY kcu.column_name;

-- Verify no JSON columns (critical requirement)
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name = 'achievement_templates' OR table_name = 'user_achievements')
  AND (data_type = 'json' OR data_type = 'jsonb');
