-- =====================================================
-- STEP 1: RE-VERIFY AUTH.UID() AND CLIENT_ID IN REAL-TIME
-- =====================================================
-- This script captures the exact authentication context and data

-- 1. CAPTURE CURRENT AUTHENTICATION CONTEXT
-- =====================================================
SELECT 
    'AUTHENTICATION CONTEXT CAPTURE' as section,
    'Capturing real-time authentication details' as description;

-- Get the current authenticated user's details
SELECT 
    'CURRENT_AUTH_CONTEXT' as check_type,
    auth.uid() as auth_uid,
    auth.role() as auth_role,
    current_user as current_user,
    session_user as session_user,
    current_setting('request.jwt.claims', true) as jwt_claims_raw,
    current_setting('request.jwt.claims->>sub', true) as jwt_sub_claim;

-- 2. GET THE SPECIFIC CLIENT_ID FROM THE FAILING RECORD
-- =====================================================
SELECT 
    'FAILING_RECORD_ANALYSIS' as section,
    'Getting client_id from the specific record causing 406 error' as description;

-- Get the exact client_id from the workout_assignment that's failing
SELECT 
    'TARGET_RECORD_CLIENT_ID' as check_type,
    id as assignment_id,
    client_id as record_client_id,
    template_id,
    status,
    notes,
    created_at,
    updated_at,
    'This is the client_id from the failing record' as note
FROM public.workout_assignments 
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c';

-- 3. EXPLICIT COMPARISON BETWEEN AUTH.UID() AND CLIENT_ID
-- =====================================================
SELECT 
    'EXPLICIT_COMPARISON' as section,
    'Comparing auth.uid() with the record client_id' as description;

-- Perform explicit comparison
WITH auth_data AS (
    SELECT auth.uid() as current_auth_uid
),
record_data AS (
    SELECT client_id as record_client_id
    FROM public.workout_assignments 
    WHERE id = '7529d313-d23d-40ca-9927-01739e25824c'
)
SELECT 
    'AUTH_VS_CLIENT_ID_COMPARISON' as check_type,
    a.current_auth_uid,
    r.record_client_id,
    CASE 
        WHEN a.current_auth_uid IS NULL THEN '❌ AUTH.UID() IS NULL'
        WHEN r.record_client_id IS NULL THEN '❌ CLIENT_ID IS NULL'
        WHEN a.current_auth_uid::text = r.record_client_id::text THEN '✅ EXACT MATCH (TEXT)'
        WHEN a.current_auth_uid = r.record_client_id THEN '✅ EXACT MATCH (UUID)'
        ELSE '❌ NO MATCH - AUTH: ' || a.current_auth_uid::text || ' vs CLIENT_ID: ' || r.record_client_id::text
    END as comparison_result,
    CASE 
        WHEN a.current_auth_uid IS NOT NULL AND r.record_client_id IS NOT NULL THEN
            'AUTH_LENGTH: ' || length(a.current_auth_uid::text) || 
            ', CLIENT_ID_LENGTH: ' || length(r.record_client_id::text)
        ELSE 'Cannot compare lengths - one or both are NULL'
    END as length_comparison
FROM auth_data a, record_data r;

-- 4. DETAILED DATA TYPE AND FORMAT ANALYSIS
-- =====================================================
SELECT 
    'DATA_TYPE_ANALYSIS' as section,
    'Analyzing data types and formats' as description;

-- Analyze data types and formats
WITH auth_data AS (
    SELECT 
        auth.uid() as auth_uid,
        pg_typeof(auth.uid()) as auth_type,
        encode(auth.uid()::text::bytea, 'hex') as auth_hex
),
record_data AS (
    SELECT 
        client_id as record_client_id,
        pg_typeof(client_id) as client_id_type,
        encode(client_id::text::bytea, 'hex') as client_id_hex
    FROM public.workout_assignments 
    WHERE id = '7529d313-d23d-40ca-9927-01739e25824c'
)
SELECT 
    'DATA_TYPE_DETAILS' as check_type,
    a.auth_uid,
    a.auth_type,
    a.auth_hex,
    r.record_client_id,
    r.client_id_type,
    r.client_id_hex,
    CASE 
        WHEN a.auth_type = r.client_id_type THEN '✅ SAME DATA TYPE'
        ELSE '❌ DIFFERENT DATA TYPES: ' || a.auth_type || ' vs ' || r.client_id_type
    END as type_comparison
FROM auth_data a, record_data r;

-- 5. TEST THE EXACT RLS POLICY CONDITION
-- =====================================================
SELECT 
    'RLS_POLICY_CONDITION_TEST' as section,
    'Testing the exact RLS policy condition' as description;

-- Test the exact condition used in the RLS policy
WITH auth_data AS (
    SELECT auth.uid() as current_auth_uid
),
record_data AS (
    SELECT client_id as record_client_id
    FROM public.workout_assignments 
    WHERE id = '7529d313-d23d-40ca-9927-01739e25824c'
)
SELECT 
    'POLICY_CONDITION_RESULT' as check_type,
    a.current_auth_uid,
    r.record_client_id,
    (a.current_auth_uid = r.record_client_id) as policy_condition_result,
    CASE 
        WHEN (a.current_auth_uid = r.record_client_id) THEN '✅ RLS POLICY WOULD ALLOW ACCESS'
        ELSE '❌ RLS POLICY WOULD BLOCK ACCESS'
    END as policy_prediction
FROM auth_data a, record_data r;

-- 6. SUMMARY FOR FRONTEND VERIFICATION
-- =====================================================
SELECT 
    'FRONTEND_VERIFICATION_SUMMARY' as section,
    'Summary for frontend verification' as description;

SELECT 
    'VERIFICATION_SUMMARY' as check_type,
    auth.uid()::text as auth_uid_for_frontend,
    (SELECT client_id::text FROM public.workout_assignments WHERE id = '7529d313-d23d-40ca-9927-01739e25824c') as client_id_for_frontend,
    'Compare these values with supabase.auth.getUser().data.user.id in your frontend' as instruction;

SELECT 'Step 1 verification complete. Check results above for auth.uid() vs client_id comparison.' as message;
