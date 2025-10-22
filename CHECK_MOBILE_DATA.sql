-- Check Mobile Data Issues - Run these queries to verify data exists

-- 1. Check if profiles exist
SELECT 
    id, 
    email, 
    role, 
    first_name, 
    last_name,
    created_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check if workout_assignments exist
SELECT 
    id,
    client_id,
    template_id,
    scheduled_date,
    status,
    created_at
FROM workout_assignments 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check if workout_templates exist
SELECT 
    id,
    name,
    description,
    estimated_duration,
    is_active,
    created_at
FROM workout_templates 
WHERE is_active = true
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check if clients table has relationships
SELECT 
    id,
    coach_id,
    client_id,
    status,
    created_at
FROM clients 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Check if there are any workout assignments for today
SELECT 
    wa.id,
    wa.client_id,
    wa.template_id,
    wa.scheduled_date,
    wa.status,
    wt.name as workout_name,
    p.email as client_email
FROM workout_assignments wa
LEFT JOIN workout_templates wt ON wa.template_id = wt.id
LEFT JOIN profiles p ON wa.client_id = p.id
WHERE wa.scheduled_date = CURRENT_DATE
ORDER BY wa.created_at DESC;

-- 6. Check RLS policies on key tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'workout_assignments', 'workout_templates', 'clients')
ORDER BY tablename, policyname;

-- 7. Check if RLS is enabled on key tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'workout_assignments', 'workout_templates', 'clients')
ORDER BY tablename;

-- 8. Check user permissions
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name IN ('profiles', 'workout_assignments', 'workout_templates', 'clients')
AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- 9. Check data for all users (shows which users have data)
SELECT 
    'Profile' as table_name,
    p.id::text,
    p.email::text,
    p.role::text,
    'Profile exists' as status
FROM profiles p

UNION ALL

SELECT 
    'Workout Assignment' as table_name,
    wa.id::text,
    wa.client_id::text,
    wa.status::text,
    'Has workout assignments' as status
FROM workout_assignments wa

UNION ALL

SELECT 
    'Client Relationship' as table_name,
    c.id::text,
    c.client_id::text,
    c.status::text,
    'Has client relationship' as status
FROM clients c

ORDER BY table_name, id;

-- 10. Get actual user IDs from profiles table to use in queries above
SELECT 
    'Available User IDs' as info,
    id,
    email,
    role,
    created_at
FROM profiles 
ORDER BY created_at DESC;
