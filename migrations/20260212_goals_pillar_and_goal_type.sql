-- ============================================================================
-- Migration: goals pillar + goal_type
-- Date: 2026-02-12
-- Purpose:
--   1) Add pillar column for pillar-scoped goal display (training, nutrition, lifestyle, checkins, general)
--   2) Add goal_type column for templates/categorization (nullable)
--   3) Add index for pillar-scoped queries
-- ============================================================================

-- Add pillar column (NOT NULL, default for existing rows)
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS pillar text NOT NULL DEFAULT 'general';

-- Add check constraint for pillar values (only if not exists to allow re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_pillar_check'
  ) THEN
    ALTER TABLE public.goals
    ADD CONSTRAINT goals_pillar_check
    CHECK (pillar = ANY (ARRAY['training', 'nutrition', 'lifestyle', 'checkins', 'general']));
  END IF;
END $$;

-- Add goal_type column (nullable, for templates/categorization)
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS goal_type text NULL;

-- Index for pillar-scoped queries (client_id, pillar, status)
CREATE INDEX IF NOT EXISTS idx_goals_client_pillar_status
ON public.goals(client_id, pillar, status);

COMMENT ON COLUMN public.goals.pillar IS 'Pillar scope: training, nutrition, lifestyle, checkins, or general (default for legacy goals)';
COMMENT ON COLUMN public.goals.goal_type IS 'Optional goal type/template identifier for categorization';
