-- Diagnostic queries to identify the cause of 400 errors
-- Run these in Supabase SQL Editor to understand what's wrong

-- 1. Check if workout_assignments table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'workout_assignments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check what status values actually exist in workout_assignments
SELECT DISTINCT status, COUNT(*) as count
FROM workout_assignments 
GROUP BY status;

-- 3. Check RLS policies on workout_assignments
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'workout_assignments';

-- 4. Check if RLS is enabled on workout_assignments
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'workout_assignments';

-- 5. Test a basic query to see what columns exist
-- Replace 'af9325e2-76e7-4df6-8ed7-9effd9c764d8' with an actual user ID from your auth.users table
SELECT *
FROM workout_assignments 
WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
LIMIT 1;

-- 6. Check what status values are valid (if there's a CHECK constraint)
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'workout_assignments'::regclass 
AND contype = 'c';

-- 7. Check if there are any workout_assignments for this user with different status
SELECT *
FROM workout_assignments 
WHERE client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8';

-- 8. Check the profiles table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. Check if client_relationships table exists
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'client_relationships' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 10. Check RLS policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';
