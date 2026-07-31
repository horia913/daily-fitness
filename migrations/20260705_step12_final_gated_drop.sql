-- =============================================================================
-- Step 12 — PART B: final gated drop (irreversible)
-- Prerequisite: Part A re-check PASSED; 20260704 get_coach_pickup_workout migrated.
-- Run once in Supabase SQL editor. No ROLLBACK. IF EXISTS throughout.
-- =============================================================================

-- constraint (may not exist under this name — IF EXISTS no-op)
ALTER TABLE public.program_day_completions DROP CONSTRAINT IF EXISTS uq_pdc_assignment_schedule;

-- legacy indexes (replacement idx_unique_in_progress_session_by_pda confirmed present)
DROP INDEX IF EXISTS public.idx_unique_in_progress_session;
DROP INDEX IF EXISTS public.idx_pdc_schedule;

-- program_schedule_id on the 3 history tables (dropping the column drops its FK automatically)
ALTER TABLE public.program_day_completions DROP COLUMN IF EXISTS program_schedule_id;
ALTER TABLE public.workout_logs            DROP COLUMN IF EXISTS program_schedule_id;
ALTER TABLE public.workout_sessions        DROP COLUMN IF EXISTS program_schedule_id;

-- program-level duration_weeks + legacy category (KEEP training_blocks.duration_weeks + program_instance_phases.duration_weeks)
ALTER TABLE public.workout_programs   DROP COLUMN IF EXISTS duration_weeks;
ALTER TABLE public.workout_programs   DROP COLUMN IF EXISTS category;
ALTER TABLE public.program_assignments DROP COLUMN IF EXISTS duration_weeks;

-- retired goal/profile columns (KEEP phase_label)
ALTER TABLE public.training_blocks
  DROP COLUMN IF EXISTS goal,
  DROP COLUMN IF EXISTS custom_goal_label,
  DROP COLUMN IF EXISTS progression_profile;
ALTER TABLE public.program_instance_phases
  DROP COLUMN IF EXISTS goal,
  DROP COLUMN IF EXISTS custom_goal_label,
  DROP COLUMN IF EXISTS progression_profile;

-- vestigial flag
ALTER TABLE public.program_day_assignments DROP COLUMN IF EXISTS is_customized;

-- the program_progress cache table (no live readers/writers; trigger drops with it)
DROP TABLE IF EXISTS public.program_progress;

-- reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
