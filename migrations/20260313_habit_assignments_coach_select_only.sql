-- ============================================================================
-- Migration: Fix habit_assignments 500 by avoiding habits subquery on SELECT
-- Date: 2026-03-13
-- Purpose: "Coaches can manage assignments for their habits" (ALL) forces
--          evaluation of EXISTS(habits...) on every SELECT, which can 500.
--          Replace with INSERT/UPDATE/DELETE-only policies. Coach SELECT
--          is covered by "Coaches can view their clients habit assignments".
-- ============================================================================

DROP POLICY IF EXISTS "Coaches can manage assignments for their habits"
ON public.habit_assignments;

CREATE POLICY "Coaches can insert assignments for their habits"
ON public.habit_assignments
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.habits h
    WHERE h.id = habit_assignments.habit_id
      AND h.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can update assignments for their habits"
ON public.habit_assignments
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.habits h
    WHERE h.id = habit_assignments.habit_id
      AND h.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.habits h
    WHERE h.id = habit_assignments.habit_id
      AND h.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches can delete assignments for their habits"
ON public.habit_assignments
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.habits h
    WHERE h.id = habit_assignments.habit_id
      AND h.coach_id = auth.uid()
  )
);
