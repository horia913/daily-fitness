-- Diagnostic queries to find what might be causing the week_number error
-- Run these one by one in your Supabase SQL editor to identify the issue

-- 1. Check if there are any existing functions that reference week_number
SELECT 
    routine_name, 
    routine_definition 
FROM information_schema.routines 
WHERE routine_definition ILIKE '%week_number%'
AND routine_schema = 'public';

-- 2. Check if there are any existing triggers that might reference week_number
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement 
FROM information_schema.triggers 
WHERE action_statement ILIKE '%week_number%';

-- 3. Check if there are any existing views that reference week_number
SELECT 
    table_name, 
    view_definition 
FROM information_schema.views 
WHERE view_definition ILIKE '%week_number%'
AND table_schema = 'public';

-- 4. Check if there are any existing tables with week_number columns
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE column_name = 'week_number'
AND table_schema = 'public';

-- 5. Check if there are any existing constraints that reference week_number
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type, 
    cc.check_clause 
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE cc.check_clause ILIKE '%week_number%'
OR tc.constraint_name ILIKE '%week_number%';

-- 6. Check for any existing indexes that might reference week_number
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE indexdef ILIKE '%week_number%'
AND schemaname = 'public';
