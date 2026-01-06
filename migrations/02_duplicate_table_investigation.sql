-- ============================================================================
-- Duplicate Table Investigation
-- Purpose: Identify duplicate or overlapping table definitions
-- ============================================================================

-- Query 1: Check for duplicate table definitions (should not happen, but verify)
SELECT 
  table_name, 
  COUNT(*) as definition_count,
  STRING_AGG(table_type::text, ', ') as table_types
FROM information_schema.tables
WHERE table_schema = 'public'
GROUP BY table_name
HAVING COUNT(*) > 1
ORDER BY table_name;

-- Query 2: Compare sessions vs booked_sessions
-- Check row counts
SELECT 
  'sessions' as table_name, 
  COUNT(*) as row_count,
  COUNT(DISTINCT coach_id) as unique_coaches,
  COUNT(DISTINCT client_id) as unique_clients,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM sessions


UNION
SELECT 
  'booked_sessions' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT coach_id) as unique_coaches,
  COUNT(DISTINCT client_id) as unique_clients,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM booked_sessions;

-- Query 3: Compare column structures of sessions vs booked_sessions
SELECT 
  'sessions' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sessions'
ORDER BY ordinal_position
UNION ALL
SELECT 
  'booked_sessions' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'booked_sessions'
ORDER BY ordinal_position;

-- Query 4: Compare clip_cards vs clipcards
-- Check if both tables exist and their row counts
SELECT 
  'clip_cards' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT client_id) as unique_clients,
  COUNT(DISTINCT coach_id) as unique_coaches,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM clip_cards
UNION ALL
SELECT 
  'clipcards' as table_name,
  COUNT(*) as row_count,
  COUNT(DISTINCT client_id) as unique_clients,
  COUNT(DISTINCT coach_id) as unique_coaches,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM clipcards;

-- Query 5: Compare column structures of clip_cards vs clipcards
SELECT 
  'clip_cards' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clip_cards'
ORDER BY ordinal_position
UNION ALL
SELECT 
  'clipcards' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clipcards'
ORDER BY ordinal_position;

-- Query 6: Check coach_availability table structure (check if defined multiple times)
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'coach_availability'
ORDER BY ordinal_position;

-- Query 7: Check coach_time_slots table structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'coach_time_slots'
ORDER BY ordinal_position;

-- Query 8: Check for tables with similar names that might be duplicates
SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%session%'
    OR table_name LIKE '%clipcard%'
    OR table_name LIKE '%availability%'
    OR table_name LIKE '%time_slot%'
  )
GROUP BY table_name
ORDER BY table_name;

-- Query 9: Check foreign key relationships for potential duplicate tables
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
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
    tc.table_name IN ('sessions', 'booked_sessions', 'clip_cards', 'clipcards', 'coach_availability', 'coach_time_slots')
    OR ccu.table_name IN ('sessions', 'booked_sessions', 'clip_cards', 'clipcards', 'coach_availability', 'coach_time_slots')
  )
ORDER BY tc.table_name, kcu.column_name;

