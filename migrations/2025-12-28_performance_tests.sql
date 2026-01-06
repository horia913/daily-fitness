-- Migration: Performance Tests
-- Date: 2025-12-28
-- Purpose: Track 1km run and step test performance

CREATE TABLE IF NOT EXISTS performance_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tested_at DATE NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('1km_run', 'step_test')),
  
  -- 1km run fields
  time_seconds INT, -- Total time in seconds
  
  -- Step test fields (metronome/box stepping)
  heart_rate_pre INT, -- Resting HR before test
  heart_rate_1min INT, -- HR at 1 min after test
  heart_rate_2min INT, -- HR at 2 min after test
  heart_rate_3min INT, -- HR at 3 min after test
  recovery_score DECIMAL(5,2), -- Calculated from HR recovery
  
  -- Context
  notes TEXT,
  conditions TEXT, -- e.g., "indoor track", "treadmill", "humid day"
  perceived_effort INT CHECK (perceived_effort >= 1 AND perceived_effort <= 10),
  tested_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_performance_tests_client_date ON performance_tests(client_id, tested_at DESC);
CREATE INDEX idx_performance_tests_type ON performance_tests(test_type, tested_at DESC);

ALTER TABLE performance_tests ENABLE ROW LEVEL SECURITY;

-- RLS policies (clients read/write own, coaches read their clients')
CREATE POLICY "performance_tests_select_own" ON performance_tests FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "performance_tests_insert_own" ON performance_tests FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "performance_tests_update_own" ON performance_tests FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "performance_tests_delete_own" ON performance_tests FOR DELETE USING (auth.uid() = client_id);

CREATE POLICY "performance_tests_select_coach" ON performance_tests FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('coach', 'admin', 'super_coach', 'supercoach')
    AND (
      -- Coach has workout assignments for this client
      EXISTS (
        SELECT 1 FROM workout_assignments wa 
        WHERE wa.client_id = performance_tests.client_id 
        AND wa.coach_id = auth.uid()
      )
      OR
      -- Coach has program assignments for this client
      EXISTS (
        SELECT 1 FROM program_assignments pa 
        WHERE pa.client_id = performance_tests.client_id 
        AND pa.coach_id = auth.uid()
      )
    )
  )
);

