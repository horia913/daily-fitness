-- Migration: 20260306_multi_plan_assignment.sql
-- Phase N4: Multi-plan assignment + daily selection.
-- 1. client_daily_plan_selection table (which plan the client chose per day)
-- 2. RLS for client_daily_plan_selection (clients own; coaches read via clients)
-- 3. meal_plan_assignments.label for coach-provided context (e.g. "Training Day", "Rest Day")

-- =============================================================================
-- 1. Daily plan selection table
-- =============================================================================
CREATE TABLE IF NOT EXISTS client_daily_plan_selection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_plan_assignment_id UUID NOT NULL REFERENCES meal_plan_assignments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_plan_selection_client_date
  ON client_daily_plan_selection(client_id, date);

-- =============================================================================
-- 2. RLS for client_daily_plan_selection
-- =============================================================================
ALTER TABLE client_daily_plan_selection ENABLE ROW LEVEL SECURITY;

-- Clients can read own plan selections
CREATE POLICY "Clients can read own plan selections"
  ON client_daily_plan_selection FOR SELECT
  USING (client_id = auth.uid());

-- Clients can insert own plan selections
CREATE POLICY "Clients can insert own plan selections"
  ON client_daily_plan_selection FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Clients can update own plan selections
CREATE POLICY "Clients can update own plan selections"
  ON client_daily_plan_selection FOR UPDATE
  USING (client_id = auth.uid());

-- Coaches can read client plan selections (via clients table: client_id in coach's clients, status active)
CREATE POLICY "Coaches can read client plan selections"
  ON client_daily_plan_selection FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = client_daily_plan_selection.client_id
        AND c.coach_id = auth.uid()
        AND c.status = 'active'
    )
  );

-- =============================================================================
-- 3. Add label to meal_plan_assignments
-- =============================================================================
ALTER TABLE meal_plan_assignments
  ADD COLUMN IF NOT EXISTS label TEXT;

COMMENT ON COLUMN meal_plan_assignments.label IS 'Coach-provided context e.g. Training Day, Rest Day, Low Carb Day';
