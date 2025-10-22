-- =====================================================
-- FIX CLIENT_ID INCONSISTENCIES
-- =====================================================
-- This script fixes any inconsistencies between auth.uid() and client_id

-- Check for inconsistencies first
SELECT 
    'CHECKING FOR INCONSISTENCIES' as section,
    'Identifying records where client_id does not match profile.id' as description;

-- Find inconsistent records
SELECT 
    'INCONSISTENT RECORDS' as check_type,
    wa.id,
    wa.client_id,
    p.id as profile_id,
    CASE 
        WHEN wa.client_id = p.id THEN '✅ CONSISTENT'
        WHEN p.id IS NULL THEN '❌ PROFILE NOT FOUND'
        ELSE '❌ INCONSISTENT'
    END as status
FROM public.workout_assignments wa
LEFT JOIN public.profiles p ON p.id = wa.client_id
WHERE wa.client_id != p.id OR p.id IS NULL;

-- If inconsistencies are found, fix them
-- WARNING: Only run this if you're sure about the mapping
-- Uncomment the following section if you need to fix inconsistencies:

/*
-- Fix inconsistent client_id values
UPDATE public.workout_assignments 
SET client_id = (
    SELECT p.id 
    FROM public.profiles p 
    WHERE p.id::text = public.workout_assignments.client_id::text
    OR p.email = 'client@example.com' -- Replace with actual email lookup logic
)
WHERE client_id NOT IN (
    SELECT id FROM public.profiles
);
*/

-- Alternative: Create missing profiles if needed
-- WARNING: Only run this if you're sure about creating profiles
/*
INSERT INTO public.profiles (id, email, first_name, last_name, role)
SELECT DISTINCT 
    wa.client_id,
    'client' || wa.client_id || '@example.com', -- Generate email
    'Client', -- Default first name
    'User', -- Default last name
    'client' -- Default role
FROM public.workout_assignments wa
WHERE wa.client_id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
*/

-- Verify the specific record we're working with
SELECT 
    'TARGET RECORD VERIFICATION' as check_type,
    wa.id as assignment_id,
    wa.client_id,
    p.id as profile_id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    CASE 
        WHEN wa.client_id = p.id THEN '✅ TARGET RECORD IS CONSISTENT'
        WHEN p.id IS NULL THEN '❌ TARGET RECORD - PROFILE NOT FOUND'
        ELSE '❌ TARGET RECORD - INCONSISTENT'
    END as target_status
FROM public.workout_assignments wa
LEFT JOIN public.profiles p ON p.id = wa.client_id
WHERE wa.id = '7529d313-d23d-40ca-9927-01739e25824c';

-- Check if we need to create a profile for the target client
SELECT 
    'PROFILE CREATION CHECK' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
        ) THEN '✅ PROFILE EXISTS - No action needed'
        ELSE '❌ PROFILE MISSING - Need to create profile'
    END as profile_status;

-- If profile is missing, create it (uncomment if needed):
/*
INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    role,
    created_at,
    updated_at
) VALUES (
    'af9325e2-76e7-4df6-8ed7-9effd9c764d8',
    'client@example.com', -- Replace with actual email
    'Client', -- Replace with actual first name
    'User', -- Replace with actual last name
    'client',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
*/

SELECT 'Client ID consistency check complete!' as message;
