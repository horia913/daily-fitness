-- Quick data check to see what exists in your database

-- 1. Check workout assignments count
SELECT 
    'All Workout Assignments' as description,
    COUNT(*) as total_assignments,
    COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count
FROM workout_assignments;

-- 2. Check workout templates count
SELECT 
    'All Workout Templates' as description,
    COUNT(*) as total_templates,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_templates
FROM workout_templates;

-- 3. Show the actual client relationship that exists
SELECT 
    'Existing Client Relationship' as description,
    c.id,
    c.client_id,
    c.coach_id,
    c.status,
    client_profile.email as client_email,
    coach_profile.email as coach_email
FROM clients c
LEFT JOIN profiles client_profile ON c.client_id = client_profile.id
LEFT JOIN profiles coach_profile ON c.coach_id = coach_profile.id;

-- 4. Show any workout assignments that exist
SELECT 
    'Existing Workout Assignments' as description,
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
ORDER BY wa.scheduled_date DESC;

-- 5. Show available workout templates
SELECT 
    'Available Workout Templates' as description,
    id,
    name,
    description,
    estimated_duration,
    difficulty_level,
    is_active
FROM workout_templates 
ORDER BY created_at DESC;
