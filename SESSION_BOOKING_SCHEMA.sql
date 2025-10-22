-- =====================================================
-- SESSION BOOKING SYSTEM SCHEMA
-- =====================================================
-- This schema handles coach availability and client session bookings
-- Tables: coach_time_slots, booked_sessions
-- =====================================================

-- =====================================================
-- 1. COACH TIME SLOTS TABLE
-- =====================================================
-- Stores coach availability time slots

DROP TABLE IF EXISTS coach_time_slots CASCADE;

CREATE TABLE coach_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  recurring_pattern TEXT, -- 'weekly', 'daily', 'custom', null for one-time
  recurring_end_date DATE, -- When recurring pattern ends
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_recurring_end CHECK (
    (recurring_pattern IS NULL AND recurring_end_date IS NULL) OR
    (recurring_pattern IS NOT NULL AND recurring_end_date >= date)
  )
);

-- Indexes for performance
CREATE INDEX idx_coach_time_slots_coach_id ON coach_time_slots(coach_id);
CREATE INDEX idx_coach_time_slots_date ON coach_time_slots(date);
CREATE INDEX idx_coach_time_slots_availability ON coach_time_slots(is_available);
CREATE INDEX idx_coach_time_slots_coach_date ON coach_time_slots(coach_id, date);

-- =====================================================
-- 2. BOOKED SESSIONS TABLE
-- =====================================================
-- Stores actual booked training sessions

DROP TABLE IF EXISTS booked_sessions CASCADE;

CREATE TABLE booked_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_slot_id UUID NOT NULL REFERENCES coach_time_slots(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'personal_training', -- 'personal_training', 'nutrition_consultation', 'check_in', 'assessment'
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
  notes TEXT, -- Client notes when booking
  coach_notes TEXT, -- Coach notes after session
  client_feedback TEXT, -- Client feedback after session
  session_rating INTEGER, -- 1-5 rating
  actual_start_time TIMESTAMPTZ, -- When session actually started
  actual_end_time TIMESTAMPTZ, -- When session actually ended
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_rating CHECK (session_rating IS NULL OR (session_rating >= 1 AND session_rating <= 5)),
  CONSTRAINT valid_status CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  CONSTRAINT valid_session_type CHECK (session_type IN ('personal_training', 'nutrition_consultation', 'check_in', 'assessment'))
);

-- Indexes for performance
CREATE INDEX idx_booked_sessions_time_slot ON booked_sessions(time_slot_id);
CREATE INDEX idx_booked_sessions_coach ON booked_sessions(coach_id);
CREATE INDEX idx_booked_sessions_client ON booked_sessions(client_id);
CREATE INDEX idx_booked_sessions_status ON booked_sessions(status);
CREATE INDEX idx_booked_sessions_created_at ON booked_sessions(created_at DESC);

-- =====================================================
-- 3. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for coach_time_slots
CREATE OR REPLACE FUNCTION update_coach_time_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coach_time_slots_updated_at ON coach_time_slots;
CREATE TRIGGER coach_time_slots_updated_at
  BEFORE UPDATE ON coach_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_coach_time_slots_updated_at();

-- Trigger for booked_sessions
CREATE OR REPLACE FUNCTION update_booked_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booked_sessions_updated_at ON booked_sessions;
CREATE TRIGGER booked_sessions_updated_at
  BEFORE UPDATE ON booked_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_booked_sessions_updated_at();

-- =====================================================
-- 4. TRIGGER TO MARK TIME SLOT AS UNAVAILABLE
-- =====================================================

CREATE OR REPLACE FUNCTION mark_time_slot_unavailable()
RETURNS TRIGGER AS $$
BEGIN
  -- When a session is booked (INSERT), mark the time slot as unavailable
  IF TG_OP = 'INSERT' AND NEW.status = 'scheduled' THEN
    UPDATE coach_time_slots
    SET is_available = false
    WHERE id = NEW.time_slot_id;
  END IF;
  
  -- When a session status is updated
  IF TG_OP = 'UPDATE' THEN
    -- If changed to scheduled, mark unavailable
    IF NEW.status = 'scheduled' AND OLD.status != 'scheduled' THEN
      UPDATE coach_time_slots
      SET is_available = false
      WHERE id = NEW.time_slot_id;
    END IF;
    
    -- If changed from scheduled to cancelled, mark available again
    IF NEW.status = 'cancelled' AND OLD.status = 'scheduled' THEN
      UPDATE coach_time_slots
      SET is_available = true
      WHERE id = NEW.time_slot_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booked_sessions_availability ON booked_sessions;
CREATE TRIGGER booked_sessions_availability
  AFTER INSERT OR UPDATE OF status ON booked_sessions
  FOR EACH ROW
  EXECUTE FUNCTION mark_time_slot_unavailable();

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE coach_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE booked_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view available time slots" ON coach_time_slots;
DROP POLICY IF EXISTS "Coaches can manage their own time slots" ON coach_time_slots;
DROP POLICY IF EXISTS "Clients can view booked sessions" ON booked_sessions;
DROP POLICY IF EXISTS "Coaches can view their sessions" ON booked_sessions;
DROP POLICY IF EXISTS "Clients can book sessions" ON booked_sessions;
DROP POLICY IF EXISTS "Clients can cancel their own sessions" ON booked_sessions;
DROP POLICY IF EXISTS "Coaches can update session details" ON booked_sessions;

-- COACH TIME SLOTS POLICIES
CREATE POLICY "Anyone can view available time slots"
  ON coach_time_slots
  FOR SELECT
  USING (true);

CREATE POLICY "Coaches can manage their own time slots"
  ON coach_time_slots
  FOR ALL
  USING (
    auth.uid() = coach_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  )
  WITH CHECK (
    auth.uid() = coach_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- BOOKED SESSIONS POLICIES
CREATE POLICY "Clients can view their own booked sessions"
  ON booked_sessions
  FOR SELECT
  USING (
    auth.uid() = client_id OR
    auth.uid() = coach_id
  );

CREATE POLICY "Coaches can view their sessions"
  ON booked_sessions
  FOR SELECT
  USING (
    auth.uid() = coach_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

CREATE POLICY "Clients can book sessions"
  ON booked_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() = client_id AND
    EXISTS (
      SELECT 1 FROM coach_time_slots
      WHERE id = time_slot_id AND is_available = true
    )
  );

CREATE POLICY "Clients can cancel their own sessions"
  ON booked_sessions
  FOR UPDATE
  USING (
    auth.uid() = client_id AND
    status = 'scheduled'
  )
  WITH CHECK (
    auth.uid() = client_id AND
    status IN ('cancelled', 'scheduled')
  );

CREATE POLICY "Coaches can update session details"
  ON booked_sessions
  FOR UPDATE
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get available time slots for a coach on a specific date
CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_coach_id UUID,
  p_date DATE
)
RETURNS TABLE (
  id UUID,
  start_time TIME,
  end_time TIME,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cts.id,
    cts.start_time,
    cts.end_time,
    cts.notes
  FROM coach_time_slots cts
  WHERE cts.coach_id = p_coach_id
    AND cts.date = p_date
    AND cts.is_available = true
    AND NOT EXISTS (
      SELECT 1 FROM booked_sessions bs
      WHERE bs.time_slot_id = cts.id
        AND bs.status = 'scheduled'
    )
  ORDER BY cts.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to book a session
CREATE OR REPLACE FUNCTION book_session(
  p_time_slot_id UUID,
  p_client_id UUID,
  p_session_type TEXT DEFAULT 'personal_training',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_coach_id UUID;
  v_session_id UUID;
  v_is_available BOOLEAN;
BEGIN
  -- Check if time slot exists and is available
  SELECT coach_id, is_available
  INTO v_coach_id, v_is_available
  FROM coach_time_slots
  WHERE id = p_time_slot_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time slot not found';
  END IF;
  
  IF NOT v_is_available THEN
    RAISE EXCEPTION 'Time slot is not available';
  END IF;
  
  -- Create the booked session
  INSERT INTO booked_sessions (
    time_slot_id,
    coach_id,
    client_id,
    session_type,
    status,
    notes
  ) VALUES (
    p_time_slot_id,
    v_coach_id,
    p_client_id,
    p_session_type,
    'scheduled',
    p_notes
  )
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel a session
CREATE OR REPLACE FUNCTION cancel_session(
  p_session_id UUID,
  p_cancelled_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM booked_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  IF v_current_status != 'scheduled' THEN
    RAISE EXCEPTION 'Can only cancel scheduled sessions';
  END IF;
  
  -- Update session
  UPDATE booked_sessions
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = p_cancelled_by,
    cancellation_reason = p_reason
  WHERE id = p_session_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a session
CREATE OR REPLACE FUNCTION complete_session(
  p_session_id UUID,
  p_coach_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE booked_sessions
  SET 
    status = 'completed',
    actual_end_time = NOW(),
    coach_notes = COALESCE(p_coach_notes, coach_notes)
  WHERE id = p_session_id
    AND status = 'scheduled';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or already completed';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add client feedback
CREATE OR REPLACE FUNCTION add_session_feedback(
  p_session_id UUID,
  p_client_id UUID,
  p_rating INTEGER,
  p_feedback TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE booked_sessions
  SET 
    session_rating = p_rating,
    client_feedback = p_feedback
  WHERE id = p_session_id
    AND client_id = p_client_id
    AND status = 'completed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or not completed';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =====================================================

-- Note: This section is commented out. Uncomment to insert sample data for testing.

/*
-- Get a coach ID (replace with actual coach ID from your database)
DO $$
DECLARE
  v_coach_id UUID;
  v_client_id UUID;
BEGIN
  -- Get first coach
  SELECT id INTO v_coach_id
  FROM profiles
  WHERE role = 'coach'
  LIMIT 1;
  
  -- Get first client
  SELECT id INTO v_client_id
  FROM profiles
  WHERE role = 'client'
  LIMIT 1;
  
  IF v_coach_id IS NOT NULL THEN
    -- Insert some time slots for next 7 days
    FOR i IN 0..6 LOOP
      -- Morning slots (9 AM - 12 PM)
      INSERT INTO coach_time_slots (coach_id, date, start_time, end_time, is_available)
      VALUES 
        (v_coach_id, CURRENT_DATE + i, '09:00', '10:00', true),
        (v_coach_id, CURRENT_DATE + i, '10:00', '11:00', true),
        (v_coach_id, CURRENT_DATE + i, '11:00', '12:00', true);
      
      -- Afternoon slots (2 PM - 6 PM)
      INSERT INTO coach_time_slots (coach_id, date, start_time, end_time, is_available)
      VALUES 
        (v_coach_id, CURRENT_DATE + i, '14:00', '15:00', true),
        (v_coach_id, CURRENT_DATE + i, '15:00', '16:00', true),
        (v_coach_id, CURRENT_DATE + i, '16:00', '17:00', true),
        (v_coach_id, CURRENT_DATE + i, '17:00', '18:00', true);
    END LOOP;
    
    RAISE NOTICE 'Sample time slots created for coach: %', v_coach_id;
  END IF;
END $$;
*/

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

DO $$
DECLARE
  v_time_slots_count INTEGER;
  v_sessions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_time_slots_count FROM coach_time_slots;
  SELECT COUNT(*) INTO v_sessions_count FROM booked_sessions;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'SESSION BOOKING SCHEMA SETUP COMPLETE';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Coach time slots: %', v_time_slots_count;
  RAISE NOTICE 'Booked sessions: %', v_sessions_count;
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - coach_time_slots (with indexes and triggers)';
  RAISE NOTICE '  - booked_sessions (with indexes and triggers)';
  RAISE NOTICE 'Helper functions created:';
  RAISE NOTICE '  - get_available_time_slots()';
  RAISE NOTICE '  - book_session()';
  RAISE NOTICE '  - cancel_session()';
  RAISE NOTICE '  - complete_session()';
  RAISE NOTICE '  - add_session_feedback()';
  RAISE NOTICE 'RLS policies enabled and configured';
  RAISE NOTICE '==============================================';
END $$;

