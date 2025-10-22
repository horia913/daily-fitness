-- Populate sample data for mobile testing
-- This will create workout assignments for the existing users

-- First, let's create workout assignments for the client users using existing templates

-- 1. Create workout assignment for client@test.com (af9325e2-76e7-4df6-8ed7-9effd9c764d8)
INSERT INTO workout_assignments (
    id,
    coach_id,
    client_id,
    template_id,
    assigned_date,
    scheduled_date,
    status,
    notes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'b6014e58-f696-4606-bc63-d7707a21d5f1', -- coach ID
    'af9325e2-76e7-4df6-8ed7-9effd9c764d8', -- client@test.com
    '7529d313-d23d-40ca-9927-01739e25824c', -- Workout 1 template
    CURRENT_DATE,
    CURRENT_DATE, -- Today's workout
    'assigned',
    'Sample workout assignment for testing',
    NOW(),
    NOW()
);

-- 2. Create another workout assignment for tomorrow
INSERT INTO workout_assignments (
    id,
    coach_id,
    client_id,
    template_id,
    assigned_date,
    scheduled_date,
    status,
    notes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'b6014e58-f696-4606-bc63-d7707a21d5f1', -- coach ID
    'af9325e2-76e7-4df6-8ed7-9effd9c764d8', -- client@test.com
    '53988ee2-5889-4f89-8ff8-f6191a9a7878', -- Test Workout template
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 day', -- Tomorrow's workout
    'assigned',
    'Tomorrow''s workout assignment',
    NOW(),
    NOW()
);

-- 3. Create workout assignment for the other client (coach@test.com but client role)
INSERT INTO workout_assignments (
    id,
    coach_id,
    client_id,
    template_id,
    assigned_date,
    scheduled_date,
    status,
    notes,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'b6014e58-f696-4606-bc63-d7707a21d5f1', -- coach ID
    'a4538d29-4e83-4f99-a8c5-cb94a804c55a', -- coach@test.com (client role)
    'c25aed11-b289-4544-896c-905cff2f5239', -- test 3 template
    CURRENT_DATE,
    CURRENT_DATE, -- Today's workout
    'assigned',
    'Sample workout for second client',
    NOW(),
    NOW()
);

-- 4. Verify the data was inserted
SELECT 
    'New Workout Assignments Created' as description,
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
WHERE wa.created_at >= NOW() - INTERVAL '1 minute'
ORDER BY wa.created_at DESC;

-- 5. Check today's workout assignments specifically
SELECT 
    'Today''s Workout Assignments (After Insert)' as description,
    wa.id,
    wa.client_id,
    wa.scheduled_date,
    wa.status,
    wt.name as workout_name,
    p.email as client_email
FROM workout_assignments wa
LEFT JOIN workout_templates wt ON wa.template_id = wt.id
LEFT JOIN profiles p ON wa.client_id = p.id
WHERE wa.scheduled_date = CURRENT_DATE
ORDER BY wa.created_at DESC;
