-- Seed/Sync: Populate coaches_public from profiles
-- Purpose: Manual sync of coach data from profiles table
-- Run this AFTER running 20260128_create_coaches_public.sql
--
-- Run this in PRODUCTION Supabase SQL Editor (the one used by Vercel)

-- ============================================
-- STEP 1: Populate coaches_public from profiles
-- ============================================
-- Uses ON CONFLICT to safely re-run (idempotent)
INSERT INTO public.coaches_public (coach_id, first_name, last_name, is_active, sort_order, updated_at)
SELECT 
  id as coach_id,
  COALESCE(first_name, 'Coach') as first_name,
  COALESCE(last_name, '') as last_name,
  true as is_active,
  CASE 
    WHEN role = 'admin' THEN 0  -- Admins appear first
    WHEN role = 'super_coach' THEN 1
    WHEN role = 'supercoach' THEN 1
    ELSE 2  -- Regular coaches
  END as sort_order,
  now() as updated_at
FROM profiles
WHERE role IN ('coach', 'admin', 'super_coach', 'supercoach')
ON CONFLICT (coach_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = now();

-- ============================================
-- STEP 2: Verify data was inserted
-- ============================================
SELECT 
  'Coaches synced' as status,
  COUNT(*) as total_coaches,
  COUNT(*) FILTER (WHERE is_active = true) as active_coaches
FROM public.coaches_public;

-- ============================================
-- STEP 3: Show the data (for verification)
-- ============================================
SELECT 
  coach_id,
  first_name,
  last_name,
  is_active,
  sort_order
FROM public.coaches_public
WHERE is_active = true
ORDER BY sort_order, last_name;

-- ============================================
-- STEP 4: Test as anonymous user (simulation)
-- ============================================
-- Uncomment and run to test:
/*
SET ROLE anon;
SELECT coach_id, first_name, last_name 
FROM public.coaches_public 
WHERE is_active = true 
ORDER BY sort_order, last_name;
RESET ROLE;
*/

-- Expected: Should return all active coaches without errors

-- ============================================
-- NOTE: Manual Re-sync
-- ============================================
-- Run this script again whenever you add/edit coaches in profiles.
-- Later, we can add a trigger to auto-sync if desired.
