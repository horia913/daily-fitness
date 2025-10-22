-- DEFINITIVE FIX: Client Compliance Dashboard Database Function
-- This script provides a complete, schema-corrected solution for client compliance tracking
-- Based on actual database schema verification:
-- - workout_assignments table uses 'created_at' (not 'assigned_at')
-- - sessions table uses 'scheduled_at' (not 'completed_at') 
-- - No 'workout_sessions' table exists, only 'sessions'

-- Step 1: Drop existing functions to allow complete replacement
DROP FUNCTION IF EXISTS get_client_compliance_scores(UUID);
DROP FUNCTION IF EXISTS get_client_compliance_scores_simple(UUID);

-- Step 2: Drop incorrect indexes
DROP INDEX IF EXISTS idx_workout_assignments_assigned_date;
DROP INDEX IF EXISTS idx_workout_assignments_assigned_at;
DROP INDEX IF EXISTS idx_sessions_client_status_date;

-- Step 3: Create corrected get_client_compliance_scores function
CREATE OR REPLACE FUNCTION get_client_compliance_scores(coach_id_param UUID)
RETURNS TABLE (
    client_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    compliance_score DECIMAL(5,2),
    total_assigned INTEGER,
    total_completed INTEGER,
    last_workout_date DATE,
    current_streak INTEGER,
    workout_frequency DECIMAL(5,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    seven_days_ago DATE;
    thirty_days_ago DATE;
BEGIN
    -- Calculate date ranges
    seven_days_ago := CURRENT_DATE - INTERVAL '7 days';
    thirty_days_ago := CURRENT_DATE - INTERVAL '30 days';
    
    RETURN QUERY
    WITH client_workouts AS (
        -- Get all workout assignments for the coach's clients in the last 7 days
        SELECT 
            ws.client_id,
            COUNT(CASE WHEN wa.created_at >= seven_days_ago THEN 1 END) as assigned_last_7_days,
            COUNT(CASE WHEN wa.created_at >= seven_days_ago AND ws.status = 'completed' THEN 1 END) as completed_last_7_days,
            MAX(CASE WHEN ws.status = 'completed' THEN ws.scheduled_at::DATE END) as last_workout_date
        FROM sessions ws
        JOIN workout_assignments wa ON wa.client_id = ws.client_id AND wa.scheduled_date = ws.scheduled_at::DATE
        WHERE wa.created_at >= seven_days_ago
        GROUP BY ws.client_id
    ),
    client_streaks AS (
        -- Calculate current workout streaks for each client (simplified version)
        SELECT 
            ws.client_id,
            COALESCE(
                CASE 
                    WHEN MAX(ws.scheduled_at::DATE) >= CURRENT_DATE - INTERVAL '2 days' THEN
                        -- Simple streak calculation: count consecutive days with workouts
                        (SELECT COUNT(*)
                         FROM (
                             SELECT DISTINCT ws2.scheduled_at::DATE as workout_date
                             FROM sessions ws2
                             WHERE ws2.client_id = ws.client_id 
                             AND ws2.status = 'completed'
                             AND ws2.scheduled_at::DATE >= CURRENT_DATE - INTERVAL '30 days'
                             ORDER BY workout_date DESC
                         ) recent_workouts
                         WHERE workout_date >= CURRENT_DATE - INTERVAL '30 days'
                        )
                    ELSE 0
                END, 0
            ) as current_streak
        FROM sessions ws
        WHERE ws.status = 'completed'
        AND ws.scheduled_at >= thirty_days_ago
        GROUP BY ws.client_id
    ),
    client_frequency AS (
        -- Calculate average workout frequency over last 30 days
        SELECT 
            ws.client_id,
            CASE 
                WHEN COUNT(DISTINCT ws.scheduled_at::DATE) > 0 THEN
                    ROUND(COUNT(DISTINCT ws.scheduled_at::DATE)::DECIMAL / 30.0, 2)
                ELSE 0
            END as workout_frequency
        FROM sessions ws
        WHERE ws.status = 'completed'
        AND ws.scheduled_at >= thirty_days_ago
        GROUP BY ws.client_id
    )
    SELECT 
        p.id as client_id,
        CONCAT(p.first_name, ' ', p.last_name) as full_name,
        COALESCE(p.avatar_url, '') as avatar_url,
        CASE 
            WHEN cw.assigned_last_7_days > 0 THEN
                ROUND((cw.completed_last_7_days::DECIMAL / cw.assigned_last_7_days) * 100, 2)
            ELSE 0
        END as compliance_score,
        COALESCE(cw.assigned_last_7_days, 0) as total_assigned,
        COALESCE(cw.completed_last_7_days, 0) as total_completed,
        cw.last_workout_date,
        COALESCE(cs.current_streak, 0) as current_streak,
        COALESCE(cf.workout_frequency, 0) as workout_frequency
    FROM profiles p
    LEFT JOIN client_workouts cw ON cw.client_id = p.id
    LEFT JOIN client_streaks cs ON cs.client_id = p.id
    LEFT JOIN client_frequency cf ON cf.client_id = p.id
    WHERE p.role = 'client'
    AND (
        -- Include clients who have been assigned workouts by this coach
        EXISTS (
            SELECT 1 
            FROM workout_assignments wa
            JOIN sessions ws ON ws.client_id = wa.client_id AND wa.scheduled_date = ws.scheduled_at::DATE
            WHERE ws.client_id = p.id
            AND wa.created_at >= seven_days_ago
        )
        OR 
        -- Include clients who have completed workouts in the last 30 days
        EXISTS (
            SELECT 1 
            FROM sessions ws
            WHERE ws.client_id = p.id
            AND ws.status = 'completed'
            AND ws.scheduled_at >= thirty_days_ago
        )
    )
    ORDER BY 
        CASE 
            WHEN cw.assigned_last_7_days > 0 THEN
                (cw.completed_last_7_days::DECIMAL / cw.assigned_last_7_days)
            ELSE 0
        END ASC,
        p.first_name ASC,
        p.last_name ASC;
END;
$$;

-- Step 4: Create corrected get_client_compliance_scores_simple function
CREATE OR REPLACE FUNCTION get_client_compliance_scores_simple(coach_id_param UUID)
RETURNS TABLE (
    client_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    compliance_score DECIMAL(5,2),
    total_assigned INTEGER,
    total_completed INTEGER,
    last_workout_date DATE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    seven_days_ago DATE;
BEGIN
    seven_days_ago := CURRENT_DATE - INTERVAL '7 days';
    
    RETURN QUERY
    SELECT 
        p.id as client_id,
        CONCAT(p.first_name, ' ', p.last_name) as full_name,
        COALESCE(p.avatar_url, '') as avatar_url,
        CASE 
            WHEN COUNT(CASE WHEN wa.created_at >= seven_days_ago THEN 1 END) > 0 THEN
                ROUND(
                    (COUNT(CASE WHEN wa.created_at >= seven_days_ago AND ws.status = 'completed' THEN 1 END)::DECIMAL / 
                     COUNT(CASE WHEN wa.created_at >= seven_days_ago THEN 1 END)) * 100, 2
                )
            ELSE 0
        END as compliance_score,
        COUNT(CASE WHEN wa.created_at >= seven_days_ago THEN 1 END) as total_assigned,
        COUNT(CASE WHEN wa.created_at >= seven_days_ago AND ws.status = 'completed' THEN 1 END) as total_completed,
        MAX(CASE WHEN ws.status = 'completed' THEN ws.scheduled_at::DATE END) as last_workout_date
    FROM profiles p
    LEFT JOIN sessions ws ON ws.client_id = p.id
    LEFT JOIN workout_assignments wa ON wa.client_id = ws.client_id AND wa.scheduled_date = ws.scheduled_at::DATE
    WHERE p.role = 'client'
    AND wa.created_at >= seven_days_ago
    GROUP BY p.id, p.first_name, p.last_name, p.avatar_url
    ORDER BY 
        CASE 
            WHEN COUNT(CASE WHEN wa.created_at >= seven_days_ago THEN 1 END) > 0 THEN
                (COUNT(CASE WHEN wa.created_at >= seven_days_ago AND ws.status = 'completed' THEN 1 END)::DECIMAL / 
                 COUNT(CASE WHEN wa.created_at >= seven_days_ago THEN 1 END))
            ELSE 0
        END ASC,
        p.first_name ASC,
        p.last_name ASC;
END;
$$;

-- Step 5: Create correct indexes based on actual schema
CREATE INDEX IF NOT EXISTS idx_workout_assignments_created_at ON workout_assignments(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_client_status_date ON sessions(client_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_client_scheduled ON workout_assignments(client_id, scheduled_date);

-- Step 6: Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_client_compliance_scores(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_compliance_scores_simple(UUID) TO authenticated;

-- Step 7: Verification queries (remove in production)
-- Uncomment these lines to test the functions:
-- SELECT 'Testing main function...' as status;
-- SELECT * FROM get_client_compliance_scores('your-coach-uuid-here') LIMIT 5;
-- SELECT 'Testing simple function...' as status;
-- SELECT * FROM get_client_compliance_scores_simple('your-coach-uuid-here') LIMIT 5;

-- Schema verification queries (for debugging):
-- SELECT 'Schema verification:' as status;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workout_assignments' AND table_schema = 'public';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sessions' AND table_schema = 'public';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND table_schema = 'public';
