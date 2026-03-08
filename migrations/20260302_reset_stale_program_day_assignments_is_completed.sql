-- =============================================================================
-- Migration: Reset stale is_completed flags on program_day_assignments
-- Date: 2026-03-02
-- =============================================================================
--
-- WHY:
--   program_day_assignments.is_completed was written by legacy code that has
--   since been removed from the completion pipeline. The canonical source of
--   truth for whether a program day has been completed is the
--   program_day_completions ledger (keyed by program_schedule_id +
--   program_assignment_id). See programStateService.ts for the authoritative
--   comment: "Do NOT read from program_day_assignments.is_completed".
--
--   Any rows where is_completed = true are stale: they were set by old code
--   and were causing clients to be blocked from starting workouts they have
--   not yet done, even though program_assignments.status remained 'active'.
--
-- WHAT THIS DOES:
--   Resets all is_completed = true rows to false so they no longer interfere.
--   The completion pipeline no longer writes to this column. Future completion
--   state must be read from program_day_completions only.
--
-- SAFE TO RUN:
--   This is a one-time data correction. It does not drop any column or
--   constraint. The is_completed column is left in place in case of other
--   legacy reads — it is simply cleared.
-- =============================================================================

UPDATE public.program_day_assignments
SET
  is_completed   = false,
  completed_date = NULL,
  updated_at     = now()
WHERE is_completed = true;
