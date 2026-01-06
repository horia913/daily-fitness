-- Slice 09: Scheduling/Session Tables Inventory
-- Purpose: Identify all scheduling-related tables and determine canonical model

-- ============================================================================
-- INVENTORY QUERIES (run these to understand current schema)
-- ============================================================================

-- Query 1: List all tables that might be related to scheduling/sessions
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name LIKE '%session%'
   OR table_name LIKE '%schedule%'
   OR table_name LIKE '%booking%'
   OR table_name LIKE '%availability%'
   OR table_name LIKE '%clipcard%'
   OR table_name LIKE '%pack%'
   OR table_name LIKE '%attendance%'
ORDER BY table_name;

-- Query 2: Detailed column inspection for sessions-related tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%session%'
    OR table_name LIKE '%schedule%'
    OR table_name LIKE '%booking%'
    OR table_name LIKE '%availability%'
  )
ORDER BY table_name, ordinal_position;

-- Query 3: Check for clipcard/pack tables
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%clipcard%'
    OR table_name LIKE '%pack%'
    OR table_name LIKE '%credit%'
  )
ORDER BY table_name, ordinal_position;

-- Query 4: Sample data counts
-- (Adjust table names based on Query 1 results)
-- SELECT 'coach_sessions' as table_name, count(*) as row_count FROM coach_sessions
-- UNION ALL
-- SELECT 'session_bookings', count(*) FROM session_bookings
-- UNION ALL
-- SELECT 'coach_availability', count(*) FROM coach_availability
-- UNION ALL
-- SELECT 'clipcards', count(*) FROM clipcards;

-- Query 5: Check for foreign key relationships
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (
    tc.table_name LIKE '%session%'
    OR tc.table_name LIKE '%schedule%'
    OR tc.table_name LIKE '%booking%'
    OR tc.table_name LIKE '%availability%'
    OR tc.table_name LIKE '%clipcard%'
  )
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- DECISION TEMPLATE (fill this out after running queries)
-- ============================================================================

-- Based on inventory results, choose canonical model:

-- SESSIONS MODEL (in-gym sessions)
-- Chosen table(s): _______________________
-- Purpose: Coach schedules gym sessions, clients attend
-- Key fields: coach_id, client_id, session_date, session_time, status, attendance

-- AVAILABILITY MODEL (coach availability)
-- Chosen table(s): _______________________
-- Purpose: Coach defines available time slots
-- Key fields: coach_id, day_of_week, start_time, end_time, is_available

-- CLIPCARDS MODEL (payment tracking)
-- Chosen table(s): _______________________
-- Purpose: Track session packs (in-gym) or monthly credits (online)
-- Key fields: client_id, sessions_total, sessions_used, start_date, end_date

-- DEPRECATED TABLES (if any):
-- Table: _______________________
-- Reason: Duplicate of _______________________
-- Migration plan: Merge data into canonical table

-- ============================================================================
-- NEXT STEPS (for Slice 10)
-- ============================================================================

-- 1. Create/adjust canonical tables based on decisions above
-- 2. Migrate data from deprecated tables
-- 3. Create SchedulingService that uses canonical tables
-- 4. Update RLS policies
-- 5. Update UI pages to use SchedulingService

