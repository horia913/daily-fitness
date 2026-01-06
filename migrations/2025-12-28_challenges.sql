-- Migration: Coach Challenges & Recomp Challenges
-- Date: 2025-12-28
-- Purpose: Program-based challenges with flexible scoring and recomp tracks

-- ============================================================================
-- PART 1: Challenges table
-- ============================================================================

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('coach_challenge', 'recomp_challenge')),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Program-based (for coach challenges)
  program_id UUID REFERENCES workout_programs(id) ON DELETE SET NULL,
  
  -- Recomp track (for recomp challenges)
  recomp_track TEXT CHECK (recomp_track IN ('fat_loss', 'muscle_gain', 'both')),
  
  -- Rewards
  reward_description TEXT,
  reward_value TEXT, -- e.g., "1 month free coaching", "Badge: Champion"
  
  -- Settings
  requires_video_proof BOOLEAN DEFAULT FALSE,
  max_participants INT,
  is_public BOOLEAN DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_challenges_type_status ON challenges(challenge_type, status);
CREATE INDEX idx_challenges_dates ON challenges(start_date, end_date);

-- ============================================================================
-- PART 2: Challenge Participants
-- ============================================================================

CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Track selection (for recomp challenges)
  selected_track TEXT CHECK (selected_track IN ('fat_loss', 'muscle_gain')),
  
  -- Participation status
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'completed', 'withdrawn')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Scoring
  total_score DECIMAL(10,2) DEFAULT 0,
  final_rank INT,
  
  -- Awards
  is_winner BOOLEAN DEFAULT FALSE,
  award_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(challenge_id, client_id)
);

CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(challenge_id, total_score DESC);
CREATE INDEX idx_challenge_participants_client ON challenge_participants(client_id);

-- ============================================================================
-- PART 3: Challenge Scoring Categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS challenge_scoring_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL, -- e.g., "Bench Press", "Squat", "Glute Focus"
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  scoring_method TEXT NOT NULL CHECK (scoring_method IN (
    'pr_improvement', -- 1RM/3RM/5RM delta
    'bw_multiple', -- Bodyweight multiple
    'tonnage', -- Total volume
    'waist_delta', -- For recomp fat-loss
    'muscle_gain_bw_multiple', -- For recomp muscle-gain (3RM BW multiple + waist guardrail)
    'adherence_percentage' -- Workout completion rate
  )),
  weight_percentage DECIMAL(5,2) DEFAULT 100.00, -- How much this category contributes to total score
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scoring_categories_challenge ON challenge_scoring_categories(challenge_id);

-- ============================================================================
-- PART 4: Challenge Video Submissions (for proof)
-- ============================================================================

CREATE TABLE IF NOT EXISTS challenge_video_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES challenge_participants(id) ON DELETE CASCADE,
  scoring_category_id UUID NOT NULL REFERENCES challenge_scoring_categories(id) ON DELETE CASCADE,
  
  video_url TEXT NOT NULL, -- Supabase storage URL
  video_path TEXT NOT NULL, -- For deletion
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Approval
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- Performance claim
  claimed_weight DECIMAL(7,2),
  claimed_reps INT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_video_submissions_participant ON challenge_video_submissions(participant_id);
CREATE INDEX idx_video_submissions_status ON challenge_video_submissions(status);

-- ============================================================================
-- PART 5: RLS Policies
-- ============================================================================

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_scoring_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_video_submissions ENABLE ROW LEVEL SECURITY;

-- Challenges: Public can view active, coaches can manage
CREATE POLICY "challenges_select_public" ON challenges FOR SELECT USING (is_public = true AND status = 'active');
CREATE POLICY "challenges_manage_coach" ON challenges FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin', 'super_coach', 'supercoach'))
);

-- Participants: Clients can view/register, coaches can manage
CREATE POLICY "participants_select_own" ON challenge_participants FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "participants_insert_own" ON challenge_participants FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "participants_select_coach" ON challenge_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin', 'super_coach', 'supercoach'))
);

-- Scoring categories: Public can view
CREATE POLICY "scoring_categories_select_all" ON challenge_scoring_categories FOR SELECT USING (true);

-- Video submissions: Participants can submit, coaches can review
CREATE POLICY "video_submissions_select_own" ON challenge_video_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM challenge_participants WHERE id = challenge_video_submissions.participant_id AND client_id = auth.uid())
);
CREATE POLICY "video_submissions_insert_own" ON challenge_video_submissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM challenge_participants WHERE id = participant_id AND client_id = auth.uid())
);
CREATE POLICY "video_submissions_manage_coach" ON challenge_video_submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'admin', 'super_coach', 'supercoach'))
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE challenges IS 'Coach-created challenges (program-based or recomp)';
COMMENT ON TABLE challenge_participants IS 'Clients enrolled in challenges with scoring and rankings';
COMMENT ON TABLE challenge_scoring_categories IS 'Flexible scoring categories per challenge (e.g., bench, squat, glute focus)';
COMMENT ON TABLE challenge_video_submissions IS 'Video proof submissions for performance claims, reviewed by coach';

COMMENT ON COLUMN challenges.program_id IS 'If set, challenge is program-based (only workouts from this program count)';
COMMENT ON COLUMN challenges.recomp_track IS 'For recomp challenges: fat_loss (waist delta), muscle_gain (3RM BW + waist guardrail), or both';
COMMENT ON COLUMN challenge_scoring_categories.scoring_method IS 'How this category is scored: PR improvement, BW multiple, tonnage, waist delta, etc.';
COMMENT ON COLUMN challenge_video_submissions.status IS 'pending → coach reviews → approved/rejected';

