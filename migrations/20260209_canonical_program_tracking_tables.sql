-- ============================================================================
-- Migration: Canonical Program Tracking Tables
-- Date: 2026-02-09
-- Purpose:
--   1. Rename old program_progress / program_day_completions to _v1
--   2. Create canonical program_progress (PK = program_assignment_id, 1-based)
--   3. Create canonical program_day_completions (keyed by program_schedule_id)
--   4. Add RLS policies for both tables
--   5. Migrate data from _v1 tables where possible
--   6. Verify workout_logs / workout_sessions linkage columns
-- ============================================================================

-- ============================================================================
-- PART 1: RENAME OLD TABLES (safe — IF EXISTS)
-- ============================================================================
DO $$
BEGIN
  -- Drop old indexes that would conflict
  DROP INDEX IF EXISTS idx_program_progress_assignment;
  DROP INDEX IF EXISTS idx_program_day_completions_assignment;

  -- Rename old tables to preserve data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_progress') THEN
    ALTER TABLE public.program_progress RENAME TO program_progress_v1;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_day_completions') THEN
    ALTER TABLE public.program_day_completions RENAME TO program_day_completions_v1;
  END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE CANONICAL program_progress
-- One row per program assignment. PK is program_assignment_id itself.
-- current_week_number and current_day_number are 1-based.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.program_progress (
  program_assignment_id uuid PRIMARY KEY
    REFERENCES public.program_assignments(id) ON DELETE CASCADE,
  current_week_number int NOT NULL DEFAULT 1
    CONSTRAINT chk_progress_week CHECK (current_week_number >= 1),
  current_day_number int NOT NULL DEFAULT 1
    CONSTRAINT chk_progress_day CHECK (current_day_number BETWEEN 1 AND 7),
  is_completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_progress_completed
  ON public.program_progress(is_completed);

COMMENT ON TABLE public.program_progress IS
'Canonical progress pointer for each program assignment. 1-based week/day numbers.
This is a CACHE derived from program_day_completions — the ledger is the source of truth.';

-- ============================================================================
-- PART 3: CREATE CANONICAL program_day_completions (the LEDGER)
-- Keyed by (program_assignment_id, program_schedule_id).
-- This is THE source of truth for what slots have been completed.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.program_day_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_assignment_id uuid NOT NULL
    REFERENCES public.program_assignments(id) ON DELETE CASCADE,
  program_schedule_id uuid NOT NULL
    REFERENCES public.program_schedule(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid NOT NULL REFERENCES public.profiles(id),
  notes text,
  CONSTRAINT uq_pdc_assignment_schedule
    UNIQUE (program_assignment_id, program_schedule_id)
);

CREATE INDEX IF NOT EXISTS idx_pdc_assignment
  ON public.program_day_completions(program_assignment_id);
CREATE INDEX IF NOT EXISTS idx_pdc_schedule
  ON public.program_day_completions(program_schedule_id);
CREATE INDEX IF NOT EXISTS idx_pdc_completed_at
  ON public.program_day_completions(completed_at);

COMMENT ON TABLE public.program_day_completions IS
'Immutable completion ledger. Each row = one program schedule slot completed.
UNIQUE(program_assignment_id, program_schedule_id) prevents double-completion.
This is the SINGLE SOURCE OF TRUTH for program tracking.';

-- ============================================================================
-- PART 4: RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.program_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_day_completions ENABLE ROW LEVEL SECURITY;

-- --- program_progress policies ---

-- Clients can SELECT their own progress
CREATE POLICY "program_progress_select_client" ON public.program_progress
  FOR SELECT TO public
  USING (
    program_assignment_id IN (
      SELECT id FROM public.program_assignments WHERE client_id = auth.uid()
    )
  );

-- Clients can INSERT their own progress
CREATE POLICY "program_progress_insert_client" ON public.program_progress
  FOR INSERT TO public
  WITH CHECK (
    program_assignment_id IN (
      SELECT id FROM public.program_assignments WHERE client_id = auth.uid()
    )
  );

-- Clients can UPDATE their own progress
CREATE POLICY "program_progress_update_client" ON public.program_progress
  FOR UPDATE TO public
  USING (
    program_assignment_id IN (
      SELECT id FROM public.program_assignments WHERE client_id = auth.uid()
    )
  )
  WITH CHECK (
    program_assignment_id IN (
      SELECT id FROM public.program_assignments WHERE client_id = auth.uid()
    )
  );

-- Coaches can do ALL on their clients' progress
CREATE POLICY "program_progress_all_coach" ON public.program_progress
  FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.program_assignments pa
      JOIN public.clients c ON c.client_id = pa.client_id AND c.coach_id = auth.uid()
      WHERE pa.id = program_progress.program_assignment_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.program_assignments pa
      JOIN public.clients c ON c.client_id = pa.client_id AND c.coach_id = auth.uid()
      WHERE pa.id = program_progress.program_assignment_id
    )
  );

-- Admin full access
CREATE POLICY "program_progress_all_admin" ON public.program_progress
  FOR ALL TO public
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- --- program_day_completions policies ---

-- Clients can SELECT their own completions
CREATE POLICY "pdc_select_client" ON public.program_day_completions
  FOR SELECT TO public
  USING (
    program_assignment_id IN (
      SELECT id FROM public.program_assignments WHERE client_id = auth.uid()
    )
  );

-- Clients can INSERT their own completions
CREATE POLICY "pdc_insert_client" ON public.program_day_completions
  FOR INSERT TO public
  WITH CHECK (
    program_assignment_id IN (
      SELECT id FROM public.program_assignments WHERE client_id = auth.uid()
    )
  );

-- Coaches can do ALL on their clients' completions
CREATE POLICY "pdc_all_coach" ON public.program_day_completions
  FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.program_assignments pa
      JOIN public.clients c ON c.client_id = pa.client_id AND c.coach_id = auth.uid()
      WHERE pa.id = program_day_completions.program_assignment_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.program_assignments pa
      JOIN public.clients c ON c.client_id = pa.client_id AND c.coach_id = auth.uid()
      WHERE pa.id = program_day_completions.program_assignment_id
    )
  );

-- Admin full access
CREATE POLICY "pdc_all_admin" ON public.program_day_completions
  FOR ALL TO public
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- PART 5: DATA MIGRATION from _v1 tables
-- ============================================================================
DO $$
DECLARE
  v_has_old_completions boolean;
  v_has_old_progress boolean;
  v_migrated_completions int := 0;
  v_migrated_progress int := 0;
BEGIN
  -- Check if old tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'program_day_completions_v1'
  ) INTO v_has_old_completions;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'program_progress_v1'
  ) INTO v_has_old_progress;

  -- Migrate old completions if they exist
  -- Old schema: (program_assignment_id, week_index, day_index)
  -- We need to resolve these to program_schedule_id by matching against the schedule
  IF v_has_old_completions THEN
    -- Build a mapping: for each (program_id, week_index, day_index) → program_schedule.id
    -- week_index/day_index are 0-based indices into sorted arrays
    INSERT INTO public.program_day_completions (
      program_assignment_id, program_schedule_id, completed_at, completed_by, notes
    )
    SELECT
      old_c.program_assignment_id,
      ranked_schedule.schedule_id,
      old_c.completed_at,
      old_c.completed_by,
      old_c.notes
    FROM program_day_completions_v1 old_c
    JOIN program_assignments pa ON pa.id = old_c.program_assignment_id
    JOIN (
      -- Rank schedule rows by (week_number, day_of_week) to produce 0-based indices
      SELECT
        ps.id AS schedule_id,
        ps.program_id,
        -- week_index = dense_rank of week_number minus 1 (0-based)
        DENSE_RANK() OVER (PARTITION BY ps.program_id ORDER BY ps.week_number) - 1 AS week_idx,
        -- day_index = row_number within the week minus 1 (0-based)
        ROW_NUMBER() OVER (PARTITION BY ps.program_id, ps.week_number ORDER BY ps.day_of_week) - 1 AS day_idx
      FROM program_schedule ps
    ) ranked_schedule
      ON ranked_schedule.program_id = pa.program_id
      AND ranked_schedule.week_idx = old_c.week_index
      AND ranked_schedule.day_idx = old_c.day_index
    ON CONFLICT (program_assignment_id, program_schedule_id) DO NOTHING;

    GET DIAGNOSTICS v_migrated_completions = ROW_COUNT;
    RAISE NOTICE 'Migrated % completion rows from program_day_completions_v1', v_migrated_completions;
  END IF;

  -- Recompute program_progress from the new ledger for every active assignment
  -- For each active assignment: find the first uncompleted slot → that's the current position
  INSERT INTO public.program_progress (
    program_assignment_id, current_week_number, current_day_number, is_completed, created_at, updated_at
  )
  SELECT
    pa.id,
    COALESCE(next_slot.week_number, last_slot.week_number, 1),
    COALESCE(next_slot.day_number, last_slot.day_number, 1),
    (next_slot.id IS NULL AND EXISTS (
      SELECT 1 FROM program_day_completions pdc WHERE pdc.program_assignment_id = pa.id
    )),
    now(),
    now()
  FROM program_assignments pa
  -- Get the program_schedule rows ordered for this program
  LEFT JOIN LATERAL (
    -- First uncompleted slot
    -- NOTE: day_number column does not exist yet (added by next migration),
    -- so we use (day_of_week + 1) here for the 1-based value.
    SELECT ps.id, ps.week_number,
           (ps.day_of_week + 1) AS day_number
    FROM program_schedule ps
    WHERE ps.program_id = pa.program_id
      AND NOT EXISTS (
        SELECT 1 FROM program_day_completions pdc
        WHERE pdc.program_assignment_id = pa.id
          AND pdc.program_schedule_id = ps.id
      )
    ORDER BY ps.week_number ASC, (ps.day_of_week + 1) ASC
    LIMIT 1
  ) next_slot ON true
  LEFT JOIN LATERAL (
    -- Last slot in program (fallback for completed programs)
    SELECT ps.id, ps.week_number,
           (ps.day_of_week + 1) AS day_number
    FROM program_schedule ps
    WHERE ps.program_id = pa.program_id
    ORDER BY ps.week_number DESC, (ps.day_of_week + 1) DESC
    LIMIT 1
  ) last_slot ON true
  WHERE pa.status = 'active'
  ON CONFLICT (program_assignment_id) DO UPDATE SET
    current_week_number = EXCLUDED.current_week_number,
    current_day_number = EXCLUDED.current_day_number,
    is_completed = EXCLUDED.is_completed,
    updated_at = now();

  GET DIAGNOSTICS v_migrated_progress = ROW_COUNT;
  RAISE NOTICE 'Computed program_progress for % active assignments', v_migrated_progress;

END $$;

-- ============================================================================
-- PART 6: VERIFY workout_logs / workout_sessions linkage columns
-- ============================================================================
DO $$
BEGIN
  -- Verify workout_logs has program_assignment_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workout_logs'
      AND column_name = 'program_assignment_id'
  ) THEN
    RAISE EXCEPTION 'workout_logs.program_assignment_id does not exist. Run migration 20260131_program_day_tracking.sql first.';
  END IF;

  -- Verify workout_logs has program_schedule_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workout_logs'
      AND column_name = 'program_schedule_id'
  ) THEN
    RAISE EXCEPTION 'workout_logs.program_schedule_id does not exist. Run migration 20260131_program_day_tracking.sql first.';
  END IF;

  -- Verify workout_sessions has program_assignment_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workout_sessions'
      AND column_name = 'program_assignment_id'
  ) THEN
    RAISE EXCEPTION 'workout_sessions.program_assignment_id does not exist. Run migration 20260131_program_day_tracking.sql first.';
  END IF;

  -- Verify workout_sessions has program_schedule_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workout_sessions'
      AND column_name = 'program_schedule_id'
  ) THEN
    RAISE EXCEPTION 'workout_sessions.program_schedule_id does not exist. Run migration 20260131_program_day_tracking.sql first.';
  END IF;

  RAISE NOTICE 'All workout_logs/workout_sessions linkage columns verified.';
END $$;

-- ============================================================================
-- PART 7: DEPRECATION NOTE for advance_program_progress RPC
-- ============================================================================
-- COMMENT ON FUNCTION does not support IF EXISTS, so wrap in a DO block
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'advance_program_progress'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    COMMENT ON FUNCTION public.advance_program_progress IS
    'DEPRECATED (2026-02-09): This RPC is no longer called by application code.
    Program completion is now handled by the complete-workout API which writes
    directly to program_day_completions (ledger) and program_progress (cache).
    Kept for backward compatibility; will be dropped in a future migration.';
  END IF;
END $$;
