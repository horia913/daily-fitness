BEGIN;

-- ============================================================================
-- Phase 3a: Habits ownership pivot (coach-assigned -> client-owned)
-- Approved approach:
-- - Clean wipe of test data
-- - Drop habit_assignments entirely
-- - Recreate habit_logs keyed by habit_id
-- - Remove habits.coach_id
-- - Add habits.client_id NOT NULL
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Wipe existing data (expected current state: habit_logs=0, assignments=0, habits=1)
-- ----------------------------------------------------------------------------
DELETE FROM public.habit_logs;
DELETE FROM public.habit_assignments;
DELETE FROM public.habits;

-- ----------------------------------------------------------------------------
-- 2) Drop legacy assignment-based tables
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.habit_logs CASCADE;
DROP TABLE IF EXISTS public.habit_assignments CASCADE;

-- ----------------------------------------------------------------------------
-- 3) Drop legacy habits policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Coaches can manage their own habits" ON public.habits;
DROP POLICY IF EXISTS "habits_delete" ON public.habits;
DROP POLICY IF EXISTS "habits_insert" ON public.habits;
DROP POLICY IF EXISTS "habits_select" ON public.habits;
DROP POLICY IF EXISTS "habits_update" ON public.habits;

-- ----------------------------------------------------------------------------
-- 4) Remove legacy coach ownership column
-- ----------------------------------------------------------------------------
ALTER TABLE public.habits
  DROP CONSTRAINT IF EXISTS habits_coach_id_fkey;

ALTER TABLE public.habits
  DROP COLUMN IF EXISTS coach_id;

-- ----------------------------------------------------------------------------
-- 5) Add direct client ownership to habits (NOT NULL by design after wipe)
-- ----------------------------------------------------------------------------
ALTER TABLE public.habits
  ADD COLUMN client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 6) Ensure habits.updated_at exists (trigger pattern: update_updated_at_column())
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'habits'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.habits
      ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_habits_updated_at ON public.habits;
CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 7) Recreate habit_logs with direct habit ownership model
-- ----------------------------------------------------------------------------
CREATE TABLE public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT habit_logs_habit_id_log_date_key UNIQUE (habit_id, log_date)
);

-- ----------------------------------------------------------------------------
-- 8) Enable RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 9) RLS: habits
-- ----------------------------------------------------------------------------
CREATE POLICY "Clients can view their own habits"
ON public.habits
FOR SELECT
TO public
USING (client_id = auth.uid());

CREATE POLICY "Clients can insert their own habits"
ON public.habits
FOR INSERT
TO public
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update their own habits"
ON public.habits
FOR UPDATE
TO public
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can delete their own habits"
ON public.habits
FOR DELETE
TO public
USING (client_id = auth.uid());

CREATE POLICY "Coaches can view client habits"
ON public.habits
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.clients
    WHERE clients.client_id = habits.client_id
      AND clients.coach_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- 10) RLS: habit_logs
-- ----------------------------------------------------------------------------
CREATE POLICY "Clients can view their own habit logs"
ON public.habit_logs
FOR SELECT
TO public
USING (client_id = auth.uid());

CREATE POLICY "Clients can insert their own habit logs"
ON public.habit_logs
FOR INSERT
TO public
WITH CHECK (
  client_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.habits h
    WHERE h.id = habit_logs.habit_id
      AND h.client_id = auth.uid()
  )
);

CREATE POLICY "Clients can update their own habit logs"
ON public.habit_logs
FOR UPDATE
TO public
USING (
  client_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.habits h
    WHERE h.id = habit_logs.habit_id
      AND h.client_id = auth.uid()
  )
)
WITH CHECK (
  client_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.habits h
    WHERE h.id = habit_logs.habit_id
      AND h.client_id = auth.uid()
  )
);

CREATE POLICY "Clients can delete their own habit logs"
ON public.habit_logs
FOR DELETE
TO public
USING (client_id = auth.uid());

CREATE POLICY "Coaches can view client habit logs"
ON public.habit_logs
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.habits h
    JOIN public.clients c
      ON c.client_id = h.client_id
    WHERE h.id = habit_logs.habit_id
      AND h.client_id = habit_logs.client_id
      AND c.coach_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- 11) Post-migration row-count notice (expected: 0 habits, 0 habit_logs)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_habits_count integer;
  v_habit_logs_count integer;
BEGIN
  SELECT COUNT(*) INTO v_habits_count FROM public.habits;
  SELECT COUNT(*) INTO v_habit_logs_count FROM public.habit_logs;
  RAISE NOTICE '[habits_phase3a] habits row count: %', v_habits_count;
  RAISE NOTICE '[habits_phase3a] habit_logs row count: %', v_habit_logs_count;
END $$;

COMMIT;

