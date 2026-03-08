-- ============================================================================
-- Migration: meal_completions DELETE RLS policy (Undo)
-- ============================================================================
-- Allows clients to delete their own meal completions only (for Undo on Fuel).
-- They cannot delete anyone else's.
-- ============================================================================

-- Allow clients to delete their own meal completions (for undo)
CREATE POLICY "Clients can delete their own meal completions"
  ON meal_completions
  FOR DELETE
  USING (client_id = auth.uid());
