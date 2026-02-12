-- ============================================================================
-- Migration: program_week_time_override + timezone support
-- Date: 2026-02-10
-- Purpose:
--   1) Add per-week time adherence override for coach grace (travel/illness/deload).
--   2) Add profiles.timezone (IANA, default UTC) and program_assignments.timezone_snapshot
--      for compliance week boundaries without manual user setup; snapshot avoids travel shifting scoring.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Timezone columns (no manual user setup; client detects and we store)
-- ----------------------------------------------------------------------------

-- profiles.timezone: IANA string (e.g. 'Europe/Bucharest', 'UTC'); default UTC.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

COMMENT ON COLUMN public.profiles.timezone IS
'IANA timezone (e.g. UTC, Europe/Bucharest). Set automatically from client on login/boot via Intl. Used for compliance week boundaries when assignment has no timezone_snapshot.';

-- program_assignments.timezone_snapshot: set at assignment creation from client profile; used for compliance so travel does not shift scoring.
ALTER TABLE public.program_assignments
  ADD COLUMN IF NOT EXISTS timezone_snapshot text;

COMMENT ON COLUMN public.program_assignments.timezone_snapshot IS
'IANA timezone at assignment creation (from client profile). Used for week_start in compliance; avoids travel shifting scoring mid-program. NULL = use profiles.timezone or UTC.';

-- ----------------------------------------------------------------------------
-- 2) program_week_time_override table
-- ----------------------------------------------------------------------------

-- Table: one row per (program_assignment, week_number). Coach can waive time penalty.
CREATE TABLE IF NOT EXISTS public.program_week_time_override (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_assignment_id uuid NOT NULL
    REFERENCES public.program_assignments(id) ON DELETE CASCADE,
  week_number int NOT NULL
    CONSTRAINT chk_pwto_week CHECK (week_number >= 1),
  override_time_score int NOT NULL DEFAULT 100
    CONSTRAINT chk_pwto_score CHECK (override_time_score BETWEEN 0 AND 100),
  reason text,
  set_by uuid NOT NULL REFERENCES public.profiles(id),
  set_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_pwto_assignment_week UNIQUE (program_assignment_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_pwto_assignment
  ON public.program_week_time_override(program_assignment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pwto_assignment_week
  ON public.program_week_time_override(program_assignment_id, week_number);

COMMENT ON TABLE public.program_week_time_override IS
'Per-week time adherence override. Coach sets to waive late penalty (e.g. travel/illness).
Override sets time_adherence to override_time_score (default 100); structural compliance unchanged.';

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.program_week_time_override ENABLE ROW LEVEL SECURITY;

-- Clients: read-only for their own assignment (so they see override state if needed)
CREATE POLICY "pwto_select_client" ON public.program_week_time_override
  FOR SELECT TO public
  USING (
    program_assignment_id IN (
      SELECT id FROM public.program_assignments WHERE client_id = auth.uid()
    )
  );

-- Coaches: full access for their clients' assignments (mirror program_day_completions pattern)
CREATE POLICY "pwto_all_coach" ON public.program_week_time_override
  FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.program_assignments pa
      JOIN public.clients c ON c.client_id = pa.client_id AND c.coach_id = auth.uid()
      WHERE pa.id = program_week_time_override.program_assignment_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.program_assignments pa
      JOIN public.clients c ON c.client_id = pa.client_id AND c.coach_id = auth.uid()
      WHERE pa.id = program_week_time_override.program_assignment_id
    )
  );

-- Admin: full access
CREATE POLICY "pwto_all_admin" ON public.program_week_time_override
  FOR ALL TO public
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
