-- ============================================================================
-- Migration: workout_block_completions
-- Date: 2026-01-31
--
-- Purpose:
-- Persist block completion for blocks with no set logs (e.g. Tabata/EMOM
-- "Complete Block") so restore after reload shows them as completed.
-- Ownership: via workout_logs.client_id (RLS).
-- ============================================================================

-- Table: one row per (workout_log, block) completion
CREATE TABLE IF NOT EXISTS public.workout_block_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id uuid NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  workout_block_id uuid NOT NULL REFERENCES public.workout_blocks(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completion_type text,
  meta jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workout_log_id, workout_block_id)
);

-- Index for restore: fetch by workout_log_id
CREATE INDEX IF NOT EXISTS idx_workout_block_completions_workout_log_id
ON public.workout_block_completions (workout_log_id);

-- RLS
ALTER TABLE public.workout_block_completions ENABLE ROW LEVEL SECURITY;

-- Clients can only see/insert/update/delete their own (via workout_logs.client_id)
CREATE POLICY "Clients select own block completions"
ON public.workout_block_completions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workout_logs wl
    WHERE wl.id = workout_block_completions.workout_log_id
    AND wl.client_id = auth.uid()
  )
);

CREATE POLICY "Clients insert own block completions"
ON public.workout_block_completions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workout_logs wl
    WHERE wl.id = workout_block_completions.workout_log_id
    AND wl.client_id = auth.uid()
  )
);

CREATE POLICY "Clients update own block completions"
ON public.workout_block_completions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workout_logs wl
    WHERE wl.id = workout_block_completions.workout_log_id
    AND wl.client_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workout_logs wl
    WHERE wl.id = workout_block_completions.workout_log_id
    AND wl.client_id = auth.uid()
  )
);

CREATE POLICY "Clients delete own block completions"
ON public.workout_block_completions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workout_logs wl
    WHERE wl.id = workout_block_completions.workout_log_id
    AND wl.client_id = auth.uid()
  )
);

COMMENT ON TABLE public.workout_block_completions IS 'Block completion records for blocks with no set logs (e.g. timer-only Tabata/EMOM). Used for restore.';
