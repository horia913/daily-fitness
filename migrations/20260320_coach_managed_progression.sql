-- ============================================================================
-- Coach-Managed Week Progression
-- Adds progression_mode + coach_unlocked_week to program_assignments,
-- creates coach_week_reviews table for review history.
-- ============================================================================

-- ============================================================================
-- PART 1: Add columns to program_assignments
-- ============================================================================

ALTER TABLE public.program_assignments
  ADD COLUMN IF NOT EXISTS progression_mode text NOT NULL DEFAULT 'auto';

ALTER TABLE public.program_assignments
  ADD COLUMN IF NOT EXISTS coach_unlocked_week integer DEFAULT NULL;

-- CHECK constraint for progression_mode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'program_assignments_progression_mode_check'
  ) THEN
    ALTER TABLE public.program_assignments
      ADD CONSTRAINT program_assignments_progression_mode_check
      CHECK (progression_mode IN ('auto', 'coach_managed'));
  END IF;
END $$;

-- CHECK constraint for coach_unlocked_week (must be >= 1 when set)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'program_assignments_coach_unlocked_week_check'
  ) THEN
    ALTER TABLE public.program_assignments
      ADD CONSTRAINT program_assignments_coach_unlocked_week_check
      CHECK (coach_unlocked_week IS NULL OR coach_unlocked_week >= 1);
  END IF;
END $$;

COMMENT ON COLUMN public.program_assignments.progression_mode IS
  'auto = completion-driven week unlock (default); coach_managed = coach must explicitly advance';

COMMENT ON COLUMN public.program_assignments.coach_unlocked_week IS
  'When progression_mode = coach_managed, the max week the client can access. NULL for auto mode.';

-- ============================================================================
-- PART 2: Create coach_week_reviews table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coach_week_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_assignment_id uuid NOT NULL
    REFERENCES public.program_assignments(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  coach_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL
    CHECK (action IN ('advance', 'repeat', 'adjust_and_advance')),
  coach_notes text,
  performance_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_week_reviews_assignment
  ON public.coach_week_reviews(program_assignment_id);
CREATE INDEX IF NOT EXISTS idx_coach_week_reviews_coach
  ON public.coach_week_reviews(coach_id);

COMMENT ON TABLE public.coach_week_reviews IS
  'Immutable log of coach week reviews. Each row = one review action for a program week.';

-- ============================================================================
-- PART 3: RLS for coach_week_reviews
-- ============================================================================

ALTER TABLE public.coach_week_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_week_reviews_coach_all"
  ON public.coach_week_reviews FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "coach_week_reviews_client_select"
  ON public.coach_week_reviews FOR SELECT
  USING (
    program_assignment_id IN (
      SELECT id FROM public.program_assignments WHERE client_id = auth.uid()
    )
  );
