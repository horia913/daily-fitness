-- Migration: Leaderboard Privacy Controls
-- Date: 2025-12-28
-- Purpose: Allow clients to control their leaderboard visibility

-- ============================================================================
-- Add leaderboard_visibility to profiles
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leaderboard_visibility') THEN
    CREATE TYPE leaderboard_visibility AS ENUM ('public', 'anonymous', 'hidden');
  END IF;
END $$;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS leaderboard_visibility leaderboard_visibility NOT NULL DEFAULT 'public';

CREATE INDEX IF NOT EXISTS idx_profiles_leaderboard_visibility
ON profiles(leaderboard_visibility);

COMMENT ON COLUMN profiles.leaderboard_visibility IS 
'public: show name/identity on leaderboards; anonymous: rank but hide identity; hidden: exclude entirely';

-- ============================================================================
-- Create leaderboard_entries table for computed rankings
-- ============================================================================

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leaderboard_type TEXT NOT NULL, -- 'pr_1rm', 'pr_3rm', 'pr_5rm', 'bw_multiple', 'tonnage_week', 'tonnage_month'
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE, -- NULL for overall rankings
  
  -- Ranking data
  rank INT NOT NULL,
  score DECIMAL(10,2) NOT NULL, -- PR weight, BW multiple, or tonnage
  time_window TEXT, -- 'this_week', 'this_month', 'all_time'
  
  -- Display (respects privacy)
  display_name TEXT, -- Real name if public, 'Anonymous User' if anonymous, NULL if hidden
  is_anonymous BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_entries_type ON leaderboard_entries(leaderboard_type, rank);
CREATE INDEX idx_leaderboard_entries_client ON leaderboard_entries(client_id);
CREATE INDEX idx_leaderboard_entries_exercise ON leaderboard_entries(exercise_id);

ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Public can view leaderboard entries (display_name already respects privacy)
CREATE POLICY "leaderboard_entries_select_all" ON leaderboard_entries FOR SELECT USING (true);

-- Only system/coaches can insert/update (via backend job)
CREATE POLICY "leaderboard_entries_manage_coach" ON leaderboard_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin', 'super_coach', 'supercoach'))
);

COMMENT ON TABLE leaderboard_entries IS 'Pre-computed leaderboard rankings that respect user privacy settings';

