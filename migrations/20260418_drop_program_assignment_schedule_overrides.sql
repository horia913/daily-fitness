-- ============================================================================
-- Reverses Stage 1 of Section C.
-- The table was an unnecessary parallel structure — program_day_assignments
-- already serves as the per-client snapshot with is_customized boolean.
-- See Section C course correction.
-- ============================================================================

DROP TABLE IF EXISTS public.program_assignment_schedule_overrides CASCADE;
