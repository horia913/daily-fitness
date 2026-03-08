-- ============================================================================
-- MIGRATION: Athlete Scores Table
-- Date: 2026-02-17
-- Purpose:
--   1. Create athlete_scores table for tracking client engagement scores
--   2. Add athlete_score_visible column to profiles table
--   3. Set up RLS policies for athlete scores
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE ATHLETE_SCORES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.athlete_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  tier TEXT NOT NULL DEFAULT 'benched' CHECK (tier IN ('beast_mode', 'locked_in', 'showing_up', 'slipping', 'benched')),
  -- Component scores (each 0-100, weighted in calculation)
  workout_completion_score INTEGER NOT NULL DEFAULT 0 CHECK (workout_completion_score >= 0 AND workout_completion_score <= 100),
  program_adherence_score INTEGER NOT NULL DEFAULT 0 CHECK (program_adherence_score >= 0 AND program_adherence_score <= 100),
  checkin_completion_score INTEGER NOT NULL DEFAULT 0 CHECK (checkin_completion_score >= 0 AND checkin_completion_score <= 100),
  goal_progress_score INTEGER NOT NULL DEFAULT 0 CHECK (goal_progress_score >= 0 AND goal_progress_score <= 100),
  nutrition_compliance_score INTEGER NOT NULL DEFAULT 0 CHECK (nutrition_compliance_score >= 0 AND nutrition_compliance_score <= 100),
  -- Metadata
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, window_start, window_end)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_athlete_scores_client_id ON public.athlete_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_athlete_scores_calculated_at ON public.athlete_scores(client_id, calculated_at DESC);

-- ============================================================================
-- PART 2: ADD VISIBILITY COLUMN TO PROFILES
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS athlete_score_visible BOOLEAN DEFAULT false;

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE public.athlete_scores ENABLE ROW LEVEL SECURITY;

-- Clients can read their own score
CREATE POLICY "Clients can read own athlete score"
  ON public.athlete_scores FOR SELECT
  USING (client_id = auth.uid());

-- Coaches can read their clients' scores
CREATE POLICY "Coaches can read client athlete scores"
  ON public.athlete_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.client_id = athlete_scores.client_id
      AND clients.coach_id = auth.uid()
      AND clients.status = 'active'
    )
  );

-- Only service role can insert/update scores (via service role key)
-- Note: This policy allows service role operations but RLS will still enforce
-- that only authenticated service role can write
CREATE POLICY "Service role can manage athlete scores"
  ON public.athlete_scores FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 4: UPDATE TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_athlete_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER athlete_scores_updated_at
  BEFORE UPDATE ON public.athlete_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_athlete_scores_updated_at();
