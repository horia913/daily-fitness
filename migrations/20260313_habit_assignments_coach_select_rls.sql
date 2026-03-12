-- ============================================================================
-- Migration: Allow coaches to SELECT habit_assignments for their clients
-- Date: 2026-03-13
-- Purpose: Coach viewing a client's analytics needs to read habit_assignments.
--          Existing policy uses EXISTS(habits WHERE coach_id = auth.uid()) which
--          can cause 500 in some environments. This adds an explicit SELECT
--          via the clients table (same pattern as other coach client views).
-- ============================================================================

-- Policy: Coaches can view habit_assignments for their clients (read-only)
CREATE POLICY "Coaches can view their clients habit assignments"
ON public.habit_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.client_id = habit_assignments.client_id
      AND c.coach_id = auth.uid()
  )
);
