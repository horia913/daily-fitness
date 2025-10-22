-- Client Compliance Dashboard Database Function
-- This function calculates compliance scores for all clients of a specific coach

-- Create the function to get client compliance scores
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
            COUNT(CASE WHEN wa.assigned_at >= seven_days_ago THEN 1 END) as assigned_last_7_days,
            COUNT(CASE WHEN wa.assigned_at >= seven_days_ago AND ws.status = 'completed' THEN 1 END) as completed_last_7_days,
            MAX(CASE WHEN ws.status = 'completed' THEN ws.completed_at::DATE END) as last_workout_date
        FROM workout_sessions ws
        JOIN workout_assignments wa ON wa.id = ws.workout_assignment_id
        WHERE wa.assigned_at >= seven_days_ago
        GROUP BY ws.client_id
    ),
    client_streaks AS (
        -- Calculate current workout streaks for each client (simplified version)
        SELECT 
            ws.client_id,
            COALESCE(
                CASE 
                    WHEN MAX(ws.completed_at::DATE) >= CURRENT_DATE - INTERVAL '2 days' THEN
                        -- Simple streak calculation: count consecutive days with workouts
                        (SELECT COUNT(*)
                         FROM (
                             SELECT DISTINCT ws2.completed_at::DATE as workout_date
                             FROM workout_sessions ws2
                             WHERE ws2.client_id = ws.client_id 
                             AND ws2.status = 'completed'
                             AND ws2.completed_at::DATE >= CURRENT_DATE - INTERVAL '30 days'
                             ORDER BY workout_date DESC
                         ) recent_workouts
                         WHERE workout_date >= CURRENT_DATE - INTERVAL '30 days'
                        ), 0
                    )
                    ELSE 0
                END, 0
            ) as current_streak
        FROM workout_sessions ws
        WHERE ws.status = 'completed'
        AND ws.completed_at >= thirty_days_ago
        GROUP BY ws.client_id
    ),
    client_frequency AS (
        -- Calculate average workout frequency over last 30 days
        SELECT 
            ws.client_id,
            CASE 
                WHEN COUNT(DISTINCT ws.completed_at::DATE) > 0 THEN
                    ROUND(COUNT(DISTINCT ws.completed_at::DATE)::DECIMAL / 30.0, 2)
                ELSE 0
            END as workout_frequency
        FROM workout_sessions ws
        WHERE ws.status = 'completed'
        AND ws.completed_at >= thirty_days_ago
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
            JOIN workout_sessions ws ON ws.workout_assignment_id = wa.id
            WHERE ws.client_id = p.id
            AND wa.assigned_at >= seven_days_ago
        )
        OR 
        -- Include clients who have completed workouts in the last 30 days
        EXISTS (
            SELECT 1 
            FROM workout_sessions ws
            WHERE ws.client_id = p.id
            AND ws.status = 'completed'
            AND ws.completed_at >= thirty_days_ago
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_client_compliance_scores(UUID) TO authenticated;

-- Create a simpler version for testing and fallback
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
            WHEN COUNT(CASE WHEN wa.assigned_at >= seven_days_ago THEN 1 END) > 0 THEN
                ROUND(
                    (COUNT(CASE WHEN wa.assigned_at >= seven_days_ago AND ws.status = 'completed' THEN 1 END)::DECIMAL / 
                     COUNT(CASE WHEN wa.assigned_at >= seven_days_ago THEN 1 END)) * 100, 2
                )
            ELSE 0
        END as compliance_score,
        COUNT(CASE WHEN wa.assigned_at >= seven_days_ago THEN 1 END) as total_assigned,
        COUNT(CASE WHEN wa.assigned_at >= seven_days_ago AND ws.status = 'completed' THEN 1 END) as total_completed,
        MAX(CASE WHEN ws.status = 'completed' THEN ws.completed_at::DATE END) as last_workout_date
    FROM profiles p
    LEFT JOIN workout_sessions ws ON ws.client_id = p.id
    LEFT JOIN workout_assignments wa ON wa.id = ws.workout_assignment_id
    WHERE p.role = 'client'
    AND (
        wa.assigned_at >= seven_days_ago
        OR ws.status = 'completed'
    )
    GROUP BY p.id, p.first_name, p.last_name, p.avatar_url
    ORDER BY 
        CASE 
            WHEN COUNT(CASE WHEN wa.assigned_at >= seven_days_ago THEN 1 END) > 0 THEN
                (COUNT(CASE WHEN wa.assigned_at >= seven_days_ago AND ws.status = 'completed' THEN 1 END)::DECIMAL / 
                 COUNT(CASE WHEN wa.assigned_at >= seven_days_ago THEN 1 END))
            ELSE 0
        END ASC,
        p.first_name ASC,
        p.last_name ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_client_compliance_scores_simple(UUID) TO authenticated;

-- Create an index to optimize the function performance
CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_status_date 
ON workout_sessions(client_id, status, completed_at);

CREATE INDEX IF NOT EXISTS idx_workout_assignments_assigned_date 
ON workout_assignments(assigned_at);

-- Test the function (optional - remove in production)
-- SELECT * FROM get_client_compliance_scores('your-coach-uuid-here');
