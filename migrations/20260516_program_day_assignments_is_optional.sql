-- Per-client optional flag on materialized schedule (mirrors master at propagation / backfill).
-- Required so getProgramScheduleSlotsForAssignment can filter is_optional from snapshot, not program_schedule.

ALTER TABLE public.program_day_assignments
  ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.program_day_assignments.is_optional IS
  'Optional training day for this client snapshot (e.g. mobility). Propagated from program_schedule; coach snapshot edits may override.';

-- Backfill from master schedule using same (week_number, day-within-week) mapping as programStateService.
-- NOTE: PostgreSQL does not allow the UPDATE target (pda) inside JOIN ... ON of the FROM list; correlate in WHERE.
UPDATE public.program_day_assignments pda
SET is_optional = COALESCE(ps.is_optional, false)
FROM public.program_assignments pa,
     public.program_schedule ps
WHERE pa.id = pda.program_assignment_id
  AND ps.program_id = pa.program_id
  AND ps.week_number = ((pda.day_number - 1) / 7) + 1
  AND COALESCE(ps.day_number, ps.day_of_week + 1) = ((pda.day_number - 1) % 7) + 1;
