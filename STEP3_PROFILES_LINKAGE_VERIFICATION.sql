-- =====================================================
-- STEP 3: VERIFY PROFILES TABLE LINKAGE
-- =====================================================
-- This script verifies that auth.uid() is correctly linked to profiles table

-- 1. CHECK PROFILES TABLE STRUCTURE
-- =====================================================
SELECT 
    'PROFILES_TABLE_STRUCTURE' as section,
    'Checking profiles table structure and constraints' as description;

-- Check profiles table structure
SELECT 
    'PROFILES_COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'id' THEN '✅ PRIMARY KEY - Should match auth.uid()'
        WHEN column_name = 'role' THEN '✅ ROLE COLUMN - Should be "client"'
        WHEN column_name = 'email' THEN '📧 EMAIL COLUMN'
        ELSE '📋 OTHER COLUMN'
    END as column_purpose
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. CHECK IF PROFILES TABLE EXISTS AND HAS DATA
-- =====================================================
SELECT 
    'PROFILES_TABLE_EXISTENCE' as section,
    'Checking if profiles table exists and has data' as description;

-- Check if profiles table exists and get basic info
SELECT 
    'PROFILES_TABLE_INFO' as check_type,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role = 'client' THEN 1 END) as client_profiles,
    COUNT(CASE WHEN role = 'coach' THEN 1 END) as coach_profiles,
    COUNT(CASE WHEN role IS NULL THEN 1 END) as profiles_without_role,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ NO PROFILES FOUND'
        ELSE '✅ PROFILES TABLE HAS DATA'
    END as table_status
FROM public.profiles;

-- 3. CHECK SPECIFIC CLIENT PROFILE
-- =====================================================
SELECT 
    'SPECIFIC_CLIENT_PROFILE' as section,
    'Checking if profile exists for the auth.uid()' as description;

-- Check if there's a profile for the current auth.uid()
SELECT 
    'CLIENT_PROFILE_CHECK' as check_type,
    auth.uid() as current_auth_uid,
    p.id as profile_id,
    p.email as profile_email,
    p.role as profile_role,
    p.first_name,
    p.last_name,
    p.created_at as profile_created_at,
    CASE 
        WHEN p.id IS NULL THEN '❌ NO PROFILE FOUND FOR AUTH.UID()'
        WHEN p.role = 'client' THEN '✅ CLIENT PROFILE EXISTS'
        WHEN p.role = 'coach' THEN '⚠️ COACH PROFILE (should be client)'
        WHEN p.role IS NULL THEN '❌ PROFILE EXISTS BUT NO ROLE'
        ELSE '❓ UNKNOWN ROLE: ' || p.role
    END as profile_status
FROM public.profiles p
WHERE p.id = auth.uid();

-- 4. CHECK WORKOUT_ASSIGNMENTS CLIENT_ID LINKAGE
-- =====================================================
SELECT 
    'WORKOUT_ASSIGNMENTS_LINKAGE' as section,
    'Checking if workout_assignments.client_id links to profiles.id' as description;

-- Check if the client_id in workout_assignments has a corresponding profile
SELECT 
    'ASSIGNMENT_PROFILE_LINKAGE' as check_type,
    wa.id as assignment_id,
    wa.client_id as assignment_client_id,
    p.id as profile_id,
    p.email as profile_email,
    p.role as profile_role,
    CASE 
        WHEN p.id IS NULL THEN '❌ CLIENT_ID HAS NO MATCHING PROFILE'
        WHEN p.role = 'client' THEN '✅ CLIENT_ID LINKS TO CLIENT PROFILE'
        WHEN p.role = 'coach' THEN '⚠️ CLIENT_ID LINKS TO COACH PROFILE'
        WHEN p.role IS NULL THEN '❌ PROFILE EXISTS BUT NO ROLE'
        ELSE '❓ CLIENT_ID LINKS TO UNKNOWN ROLE: ' || p.role
    END as linkage_status
FROM public.workout_assignments wa
LEFT JOIN public.profiles p ON p.id = wa.client_id
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 5. VERIFY AUTH.UID() TO CLIENT_ID CONSISTENCY
-- =====================================================
SELECT 
    'AUTH_UID_TO_CLIENT_ID_CONSISTENCY' as section,
    'Verifying auth.uid() matches the client_id in workout_assignments' as description;

-- This is the critical check - does auth.uid() match the client_id?
WITH auth_data AS (
    SELECT auth.uid() as current_auth_uid
),
assignment_data AS (
    SELECT client_id as assignment_client_id
    FROM public.workout_assignments 
    WHERE id = '7529d313-d23d-40ca-9927-01739e25824c'
),
profile_data AS (
    SELECT id as profile_id, role as profile_role
    FROM public.profiles 
    WHERE id = auth.uid()
)
SELECT 
    'CONSISTENCY_CHECK' as check_type,
    a.current_auth_uid,
    asgn.assignment_client_id,
    p.profile_id,
    p.profile_role,
    CASE 
        WHEN a.current_auth_uid IS NULL THEN '❌ AUTH.UID() IS NULL'
        WHEN asgn.assignment_client_id IS NULL THEN '❌ ASSIGNMENT CLIENT_ID IS NULL'
        WHEN p.profile_id IS NULL THEN '❌ NO PROFILE FOR AUTH.UID()'
        WHEN a.current_auth_uid = asgn.assignment_client_id THEN '✅ AUTH.UID() MATCHES ASSIGNMENT CLIENT_ID'
        WHEN a.current_auth_uid = p.profile_id THEN '✅ AUTH.UID() MATCHES PROFILE ID'
        ELSE '❌ MISMATCH - AUTH: ' || a.current_auth_uid::text || ', CLIENT_ID: ' || asgn.assignment_client_id::text
    END as consistency_result;

-- 6. CHECK FOR ORPHANED WORKOUT_ASSIGNMENTS
-- =====================================================
SELECT 
    'ORPHANED_ASSIGNMENTS_CHECK' as section,
    'Checking for workout_assignments with no matching profile' as description;

-- Check for workout_assignments that don't have matching profiles
SELECT 
    'ORPHANED_ASSIGNMENTS' as check_type,
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO ORPHANED ASSIGNMENTS'
        ELSE '❌ FOUND ' || COUNT(*) || ' ORPHANED ASSIGNMENTS'
    END as orphan_status
FROM public.workout_assignments wa
LEFT JOIN public.profiles p ON p.id = wa.client_id
WHERE p.id IS NULL;

-- 7. DETAILED PROFILE ANALYSIS FOR TARGET CLIENT
-- =====================================================
SELECT 
    'TARGET_CLIENT_PROFILE_ANALYSIS' as section,
    'Detailed analysis of the target client profile' as description;

-- Get detailed info about the profile that should match the client_id
SELECT 
    'TARGET_PROFILE_DETAILS' as check_type,
    p.id as profile_id,
    p.email,
    p.role,
    p.first_name,
    p.last_name,
    p.created_at,
    p.updated_at,
    'This profile should match the client_id in workout_assignments' as note
FROM public.profiles p
WHERE p.id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- 8. CHECK PROFILE CREATION/AUTHENTICATION FLOW
-- =====================================================
SELECT 
    'PROFILE_CREATION_FLOW_CHECK' as section,
    'Checking if profile creation matches authentication flow' as description;

-- Check if there are any profiles that don't have corresponding auth users
-- This is harder to check directly, but we can look for patterns
SELECT 
    'PROFILE_AUTH_PATTERNS' as check_type,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as profiles_with_email,
    COUNT(CASE WHEN role IS NOT NULL THEN 1 END) as profiles_with_role,
    'All profiles should have email and role for proper authentication' as note
FROM public.profiles;

-- 9. SUMMARY FOR LINKAGE VERIFICATION
-- =====================================================
SELECT 
    'LINKAGE_VERIFICATION_SUMMARY' as section,
    'Summary of linkage verification results' as description;

-- Final summary
WITH auth_data AS (
    SELECT auth.uid() as current_auth_uid
),
assignment_data AS (
    SELECT client_id as assignment_client_id
    FROM public.workout_assignments 
    WHERE id = '7529d313-d23d-40ca-9927-01739e25824c'
),
profile_check AS (
    SELECT COUNT(*) as profile_exists
    FROM public.profiles 
    WHERE id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
)
SELECT 
    'LINKAGE_SUMMARY' as check_type,
    a.current_auth_uid,
    asgn.assignment_client_id,
    pc.profile_exists,
    CASE 
        WHEN a.current_auth_uid IS NULL THEN '❌ AUTH.UID() IS NULL'
        WHEN asgn.assignment_client_id IS NULL THEN '❌ ASSIGNMENT CLIENT_ID IS NULL'
        WHEN pc.profile_exists = 0 THEN '❌ NO PROFILE FOR CLIENT_ID'
        WHEN a.current_auth_uid::text = asgn.assignment_client_id::text THEN '✅ PERFECT MATCH - Linkage is correct'
        ELSE '❌ MISMATCH - Need to fix linkage'
    END as final_linkage_status;

SELECT 'Step 3 profiles linkage verification complete. Check results for linkage issues.' as message;
