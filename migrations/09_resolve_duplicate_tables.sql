-- ============================================================================
-- Duplicate Table Resolution
-- Purpose: Resolve duplicate or overlapping table definitions
-- NOTE: Run 02_duplicate_table_investigation.sql first to analyze duplicates
-- ============================================================================

-- This migration will be created AFTER running investigation queries
-- and determining which tables are actually used

-- Step 1: Analysis queries (run these first to make decisions)
-- ============================================================================

-- Compare sessions vs booked_sessions usage
SELECT 
  'sessions' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT coach_id) as unique_coaches,
  COUNT(DISTINCT client_id) as unique_clients,
  COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
FROM sessions
UNION ALL
SELECT 
  'booked_sessions',
  COUNT(*),
  COUNT(DISTINCT coach_id),
  COUNT(DISTINCT client_id),
  COUNT(CASE WHEN status = 'scheduled' THEN 1 END),
  COUNT(CASE WHEN status = 'completed' THEN 1 END)
FROM booked_sessions;

-- Compare clip_cards vs clipcards usage
SELECT 
  'clip_cards' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT client_id) as unique_clients,
  COUNT(DISTINCT coach_id) as unique_coaches,
  SUM(sessions_total) as total_sessions,
  SUM(sessions_used) as total_used
FROM clip_cards
UNION ALL
SELECT 
  'clipcards',
  COUNT(*),
  COUNT(DISTINCT client_id),
  COUNT(DISTINCT coach_id),
  SUM(sessions_total),
  SUM(sessions_used)
FROM clipcards;

-- Step 2: Decision based on investigation results
-- ============================================================================

-- Investigation Results:
--
-- 1. sessions vs booked_sessions:
--    - Both tables exist but have 0 rows each
--    - booked_sessions has more fields (time_slot_id, ratings, feedback, etc.)
--    - booked_sessions links to coach_time_slots table
--    - sessions is simpler (title, description, scheduled_at, duration_minutes)
--    Decision: Keep both - they serve different purposes
--    - sessions: Simple session scheduling
--    - booked_sessions: Advanced booking with time slots and ratings
--
-- 2. clip_cards vs clipcards:
--    - clip_cards: bigint id, simpler structure, 0 rows (unused)
--    - clipcards: uuid id, more fields (clipcard_type_id, start_date, end_date, etc.), 16 rows (active)
--    Decision: clipcards is the canonical version, clip_cards is legacy/unused
--    Action: Mark clip_cards as deprecated, consider dropping in future
--
-- 3. coach_availability vs coach_time_slots:
--    - coach_availability: Weekly recurring availability (day_of_week, start_time, end_time)
--    - coach_time_slots: Specific date/time slots (date, start_time, end_time, recurring_pattern)
--    Decision: Keep both - they serve different purposes
--    - coach_availability: Template for weekly availability
--    - coach_time_slots: Specific time slots (can be generated from availability)

-- Based on investigation results:
-- 1. Determine which table is the canonical version
-- 2. Create migration to merge data if needed
-- 3. Update foreign key references
-- 4. Deprecate or drop unused table

-- Example migration structure (uncomment and modify based on analysis):

/*
-- If sessions is canonical and booked_sessions should be merged:
-- Step 1: Migrate data from booked_sessions to sessions
INSERT INTO sessions (
  coach_id, client_id, title, description, scheduled_at, 
  duration_minutes, status, notes, created_at, updated_at
)
SELECT 
  coach_id, client_id, 
  COALESCE(session_type, 'personal_training') as title,
  notes as description,
  (time_slot_date || ' ' || start_time)::TIMESTAMPTZ as scheduled_at,
  EXTRACT(EPOCH FROM (end_time - start_time))/60 as duration_minutes,
  status,
  COALESCE(notes, coach_notes) as notes,
  created_at,
  updated_at
FROM booked_sessions
WHERE NOT EXISTS (
  SELECT 1 FROM sessions s 
  WHERE s.coach_id = booked_sessions.coach_id
    AND s.client_id = booked_sessions.client_id
    AND s.scheduled_at = (booked_sessions.time_slot_date || ' ' || booked_sessions.start_time)::TIMESTAMPTZ
);

-- Step 2: Update foreign key references (if any)
-- Step 3: Drop or rename booked_sessions table
-- DROP TABLE IF EXISTS booked_sessions CASCADE;
*/

-- Step 3: Add deprecation comments for unused tables
-- ============================================================================

-- Mark clip_cards as deprecated (clipcards is the active table)
COMMENT ON TABLE clip_cards IS 
  'DEPRECATED: Use clipcards table instead. This table is legacy and unused (0 rows). Will be removed in a future migration.';

-- Note: sessions and booked_sessions both kept - they serve different purposes
-- Note: coach_availability and coach_time_slots both kept - they serve different purposes

-- Step 4: Verification after migration
-- ============================================================================

-- Verify no orphaned references
-- Verify data integrity
-- Verify all foreign keys updated

-- NOTE: This migration should be customized based on the results of
-- 02_duplicate_table_investigation.sql analysis

