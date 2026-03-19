-- ============================================================================
-- Migration: Create client_activities table
-- Purpose: Allow clients to log extra training/activities (running, cycling, etc.)
-- Date: 2026-03-18
-- ============================================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS client_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  custom_activity_name text,
  duration_minutes integer NOT NULL,
  distance_km numeric,
  intensity text NOT NULL DEFAULT 'moderate',
  notes text,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT client_activities_type_check CHECK (
    activity_type IN (
      'running', 'jogging', 'cycling', 'swimming', 'hiking',
      'walking', 'yoga', 'stretching', 'sports', 'martial_arts',
      'dance', 'custom'
    )
  ),
  CONSTRAINT client_activities_intensity_check CHECK (
    intensity IN ('light', 'moderate', 'vigorous')
  ),
  CONSTRAINT client_activities_custom_name CHECK (
    (activity_type = 'custom' AND custom_activity_name IS NOT NULL) OR
    (activity_type != 'custom')
  ),
  CONSTRAINT client_activities_duration_positive CHECK (
    duration_minutes > 0
  )
);

-- 2. Index for efficient week lookups (client + date range queries)
CREATE INDEX IF NOT EXISTS idx_client_activities_client_date
  ON client_activities (client_id, activity_date DESC);

-- 3. Auto-update updated_at trigger
CREATE TRIGGER set_client_activities_updated_at
  BEFORE UPDATE ON client_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable RLS
ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Clients can read their own activities
CREATE POLICY client_activities_select_own ON client_activities
  FOR SELECT USING (
    client_id = auth.uid()
  );

-- Clients can insert their own activities
CREATE POLICY client_activities_insert_own ON client_activities
  FOR INSERT WITH CHECK (
    client_id = auth.uid()
  );

-- Clients can update their own activities
CREATE POLICY client_activities_update_own ON client_activities
  FOR UPDATE USING (
    client_id = auth.uid()
  );

-- Clients can delete their own activities
CREATE POLICY client_activities_delete_own ON client_activities
  FOR DELETE USING (
    client_id = auth.uid()
  );

-- Coaches can read activities of their assigned clients
CREATE POLICY client_activities_coach_select ON client_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = client_activities.client_id
        AND c.coach_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY client_activities_admin_all ON client_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );
