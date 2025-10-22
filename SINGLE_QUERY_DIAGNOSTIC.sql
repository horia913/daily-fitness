-- =====================================================
-- SINGLE QUERY DIAGNOSTIC - ALL IN ONE
-- =====================================================

SELECT 
    'DIAGNOSTIC RESULTS' as section,
    auth.uid() as auth_uid,
    auth.role() as auth_role,
    (SELECT client_id FROM public.workout_assignments WHERE id = '7529d313-d23d-40ca-9927-01739e25824c') as record_client_id,
    (SELECT COUNT(*) FROM public.profiles WHERE id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8') as profile_exists,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'SELECT') as select_policies_count,
    CASE 
        WHEN auth.uid() IS NULL THEN 'PROBLEM: AUTH.UID() IS NULL'
        WHEN (SELECT client_id FROM public.workout_assignments WHERE id = '7529d313-d23d-40ca-9927-01739e25824c') IS NULL THEN 'PROBLEM: RECORD NOT FOUND'
        WHEN (SELECT COUNT(*) FROM public.profiles WHERE id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8') = 0 THEN 'PROBLEM: NO PROFILE FOR CLIENT_ID'
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_assignments' AND cmd = 'SELECT') = 0 THEN 'PROBLEM: NO SELECT POLICY'
        WHEN auth.uid()::text != (SELECT client_id FROM public.workout_assignments WHERE id = '7529d313-d23d-40ca-9927-01739e25824c')::text THEN 'PROBLEM: AUTH.UID() != CLIENT_ID'
        ELSE 'NO OBVIOUS PROBLEM FOUND'
    END as diagnosis;
