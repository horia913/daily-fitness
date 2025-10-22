-- =====================================================
-- DEEP 406 ERROR DIAGNOSTIC
-- =====================================================
-- This script performs deep analysis since the secure fix didn't work

-- 1. DETAILED AUTH CONTEXT ANALYSIS
-- =====================================================
SELECT 
    'AUTH CONTEXT ANALYSIS' as section,
    'Analyzing authentication context in detail' as description;

-- Check current authentication context
SELECT 
    'CURRENT AUTH CONTEXT' as check_type,
    auth.uid() as current_auth_uid,
    auth.role() as current_auth_role,
    current_user as current_user,
    session_user as session_user,
    current_setting('request.jwt.claims', true) as jwt_claims;

-- 2. DETAILED RECORD ANALYSIS
-- =====================================================
SELECT 
    'RECORD ANALYSIS' as section,
    'Analyzing the specific record that should be accessible' as description;

-- Check if the record exists and its details
SELECT 
    'RECORD DETAILS' as check_type,
    wa.id,
    wa.client_id,
    wa.template_id,
    wa.status,
    wa.notes,
    wa.created_at,
    wa.updated_at,
    CASE 
        WHEN wa.client_id IS NULL THEN '❌ CLIENT_ID IS NULL'
        WHEN wa.client_id = '' THEN '❌ CLIENT_ID IS EMPTY'
        ELSE '✅ CLIENT_ID EXISTS: ' || wa.client_id
    END as client_id_status
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 3. AUTH.UID() VS CLIENT_ID COMPARISON
-- =====================================================
SELECT 
    'AUTH COMPARISON' as section,
    'Comparing auth.uid() with the record client_id' as description;

-- Test the exact policy condition
SELECT 
    'POLICY CONDITION TEST' as check_type,
    auth.uid() as auth_uid,
    'af9325e2-76e7-4df6-8ed7-9effd9c764d8' as record_client_id,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ AUTH.UID() IS NULL'
        WHEN auth.uid()::text = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8' THEN '✅ AUTH.UID() MATCHES CLIENT_ID'
        ELSE '❌ AUTH.UID() DOES NOT MATCH CLIENT_ID - ACTUAL: ' || auth.uid()::text
    END as auth_comparison;

-- 4. RLS POLICY DETAILED ANALYSIS
-- =====================================================
SELECT 
    'RLS POLICY ANALYSIS' as section,
    'Analyzing RLS policy configuration in detail' as description;

-- Check RLS status
SELECT 
    'RLS STATUS' as check_type,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'workout_assignments';

-- Check all policies on the table
SELECT 
    'ALL POLICIES' as check_type,
    policyname,
    cmd as command,
    qual as condition,
    with_check as with_check_condition,
    permissive,
    roles
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'workout_assignments'
ORDER BY policyname;

-- 5. PERMISSION ANALYSIS
-- =====================================================
SELECT 
    'PERMISSION ANALYSIS' as section,
    'Checking detailed permissions' as description;

-- Check all permissions for authenticated role
SELECT 
    'AUTHENTICATED ROLE PERMISSIONS' as check_type,
    privilege_type,
    is_grantable,
    grantor,
    CASE 
        WHEN privilege_type = 'SELECT' THEN '✅ SELECT PERMISSION EXISTS'
        ELSE privilege_type || ' permission'
    END as permission_detail
FROM information_schema.table_privileges 
WHERE grantee = 'authenticated'
AND table_schema = 'public'
AND table_name = 'workout_assignments'
ORDER BY privilege_type;

-- 6. SIMULATE THE EXACT QUERY WITH POLICY
-- =====================================================
SELECT 
    'QUERY SIMULATION' as section,
    'Simulating the exact query that fails' as description;

-- Try to simulate what the API is doing
SELECT 
    'QUERY SIMULATION RESULT' as check_type,
    wa.id,
    wa.client_id,
    auth.uid() as current_auth_uid,
    CASE 
        WHEN auth.uid() = wa.client_id THEN '✅ POLICY WOULD ALLOW'
        ELSE '❌ POLICY WOULD BLOCK'
    END as policy_result
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c' 
AND wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- 7. CHECK FOR DATA TYPE ISSUES
-- =====================================================
SELECT 
    'DATA TYPE ANALYSIS' as section,
    'Checking for data type mismatches' as description;

-- Check data types
SELECT 
    'COLUMN DATA TYPES' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'workout_assignments'
AND column_name IN ('id', 'client_id')
ORDER BY column_name;

-- 8. TEST WITH EXPLICIT CASTING
-- =====================================================
SELECT 
    'EXPLICIT CASTING TEST' as section,
    'Testing with explicit type casting' as description;

-- Test with explicit UUID casting
SELECT 
    'UUID CASTING TEST' as check_type,
    auth.uid()::text as auth_uid_text,
    'af9325e2-76e7-4df6-8ed7-9effd9c764d8'::uuid as client_id_uuid,
    CASE 
        WHEN auth.uid()::text = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8' THEN '✅ TEXT COMPARISON WORKS'
        ELSE '❌ TEXT COMPARISON FAILS'
    END as text_comparison,
    CASE 
        WHEN auth.uid() = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'::uuid THEN '✅ UUID COMPARISON WORKS'
        ELSE '❌ UUID COMPARISON FAILS'
    END as uuid_comparison;

-- 9. CHECK FOR HIDDEN CHARACTERS OR FORMATTING ISSUES
-- =====================================================
SELECT 
    'FORMAT ANALYSIS' as section,
    'Checking for hidden characters or formatting issues' as description;

-- Check for hidden characters in client_id
SELECT 
    'CLIENT_ID FORMAT CHECK' as check_type,
    wa.client_id,
    length(wa.client_id::text) as client_id_length,
    encode(wa.client_id::text::bytea, 'hex') as client_id_hex,
    CASE 
        WHEN length(wa.client_id::text) = 36 THEN '✅ CORRECT LENGTH (36)'
        ELSE '❌ WRONG LENGTH: ' || length(wa.client_id::text)
    END as length_check
FROM public.workout_assignments wa
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c';

-- Check auth.uid() format
SELECT 
    'AUTH.UID() FORMAT CHECK' as check_type,
    auth.uid() as auth_uid,
    length(auth.uid()::text) as auth_uid_length,
    encode(auth.uid()::text::bytea, 'hex') as auth_uid_hex,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ AUTH.UID() IS NULL'
        WHEN length(auth.uid()::text) = 36 THEN '✅ CORRECT LENGTH (36)'
        ELSE '❌ WRONG LENGTH: ' || length(auth.uid()::text)
    END as auth_length_check;

SELECT 'Deep diagnostic complete! Check all sections for the root cause.' as message;
