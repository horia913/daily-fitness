-- ============================================================================
-- Migration: Enforce one active program per client
-- Date: 2026-02-09
-- Purpose:
--   1. Archive duplicate active assignments (keep most recent, pause others)
--   2. Create partial unique index to prevent future duplicates
-- ============================================================================

-- STEP 1: Safe data migration — pause all but the most recent active assignment per client
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id ORDER BY created_at DESC
    ) AS rn
  FROM public.program_assignments
  WHERE status = 'active'
)
UPDATE public.program_assignments
  SET status = 'paused'
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- STEP 2: Create partial unique index (enforced at DB level)
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_program_per_client
  ON public.program_assignments(client_id)
  WHERE status = 'active';

COMMENT ON INDEX uq_one_active_program_per_client IS
'Enforces at most one active program per client. Any INSERT/UPDATE that would create
a second active assignment for the same client will fail with a unique violation.';
