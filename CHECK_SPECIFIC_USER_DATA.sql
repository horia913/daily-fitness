-- Check specific user data using actual user IDs from your database

-- User IDs from your database:
-- a4538d29-4e83-4f99-a8c5-cb94a804c55a (coach@test.com - client role)
-- b6014e58-f696-4606-bc63-d7707a21d5f1 (horia.popescu98@gmail.com - coach role)  
-- af9325e2-76e7-4df6-8ed7-9effd9c764d8 (client@test.com - client role)

-- 1. Check workout assignments for the client users
SELECT 
    'Workout Assignments for af9325e2-76e7-4df6-8ed7-9effd9c764d8 (client@test.com)' as description,
    wa.id,
    wa.template_id,
    wa.scheduled_date,
    wa.status,
    wa.created_at,
    wt.name as workout_name
FROM workout_assignments wa
LEFT JOIN workout_templates wt ON wa.template_id = wt.id
WHERE wa.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
ORDER BY wa.scheduled_date DESC;

-- 2. Check workout assignments for the other client
SELECT 
    'Workout Assignments for a4538d29-4e83-4f99-a8c5-cb94a804c55a (coach@test.com - client role)' as description,
    wa.id,
    wa.template_id,
    wa.scheduled_date,
    wa.status,
    wa.created_at,
    wt.name as workout_name
FROM workout_assignments wa
LEFT JOIN workout_templates wt ON wa.template_id = wt.id
WHERE wa.client_id = 'a4538d29-4e83-4f99-a8c5-cb94a804c55a'
ORDER BY wa.scheduled_date DESC;

-- 3. Check client relationships for the coach
SELECT 
    'Client Relationships for b6014e58-f696-4606-bc63-d7707a21d5f1 (coach)' as description,
    c.id,
    c.client_id,
    c.coach_id,
    c.status,
    p.email as client_email,
    p.role as client_role
FROM clients c
LEFT JOIN profiles p ON c.client_id = p.id
WHERE c.coach_id = 'b6014e58-f696-4606-bc63-d7707a21d5f1'
ORDER BY c.created_at DESC;

-- 4. Check client relationships for the clients
SELECT 
    'Client Relationships for af9325e2-76e7-4df6-8ed7-9effd9c764d8 (client@test.com)' as description,
    c.id,
    c.client_id,
    c.coach_id,
    c.status,
    p.email as coach_email,
    p.role as coach_role
FROM clients c
LEFT JOIN profiles p ON c.coach_id = p.id
WHERE c.client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
ORDER BY c.created_at DESC;

SELECT 
    'Client Relationships for a4538d29-4e83-4f99-a8c5-cb94a804c55a (coach@test.com - client role)' as description,
    c.id,
    c.client_id,
    c.coach_id,
    c.status,
    p.email as coach_email,
    p.role as coach_role
FROM clients c
LEFT JOIN profiles p ON c.coach_id = p.id
WHERE c.client_id = 'a4538d29-4e83-4f99-a8c5-cb94a804c55a'
ORDER BY c.created_at DESC;

-- 5. Check today's workout assignments specifically
SELECT 
    'Today''s Workout Assignments' as description,
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

-- 6. Check all workout templates (to see what's available)
SELECT 
    'Available Workout Templates' as description,
    id,
    name,
    description,
    estimated_duration,
    difficulty_level,
    is_active,
    created_at
FROM workout_templates 
WHERE is_active = true
ORDER BY created_at DESC;

-- 7. Check if there are ANY workout assignments at all
SELECT 
    'All Workout Assignments' as description,
    COUNT(*) as total_assignments,
    COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count
FROM workout_assignments;

-- 8. Check if there are ANY client relationships at all
SELECT 
    'All Client Relationships' as description,
    COUNT(*) as total_relationships,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_count
FROM clients;
