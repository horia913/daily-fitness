-- ============================================================================
-- Migration: Allow coaches to INSERT goals for their clients
-- Date: 2026-03-12
-- Purpose: Coach creating a goal for a client sets coach_id = auth.uid() and
--          client_id = target client; RLS must allow this insert.
-- ============================================================================

-- Policy: Coaches can insert goals for their clients (WITH CHECK coach_id = auth.uid())
CREATE POLICY "Coaches can insert goals for clients"
ON public.goals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = coach_id
);
