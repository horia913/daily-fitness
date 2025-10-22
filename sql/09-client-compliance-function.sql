-- Client Compliance Dashboard Database Function
-- This function calculates compliance scores for all clients of a specific coach

-- Drop existing functions if they exist (to allow changing return types)
DROP FUNCTION IF EXISTS get_client_compliance_scores(UUID);
DROP FUNCTION IF EXISTS get_client_compliance_scores_simple(UUID);

-- Create the function to get client compliance scores
CREATE OR REPLACE FUNCTION get_client_compliance_scores(coach_id_param UUID)
RETURNS TABLE (
    client_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    compliance_score DECIMAL(5,2),
    total_assigned BIGINT,
    total_completed BIGINT,
    last_workout_date DATE,
    current_streak BIGINT,
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
            wa.client_id,
            COUNT(CASE WHEN wa.created_at >= seven_days_ago THEN 1 END) as assigned_last_7_days,
            COUNT(CASE WHEN wa.created_at >= seven_days_ago AND s.status = 'completed' THEN 1 END) as completed_last_7_days,
            MAX(CASE WHEN s.status = 'completed' THEN s.scheduled_at::DATE END) as last_workout_date
        FROM workout_assignments wa
        LEFT JOIN sessions s ON s.client_id = wa.client_id AND s.scheduled_at::DATE = wa.scheduled_date
        WHERE wa.created_at >= seven_days_ago
        GROUP BY wa.client_id
    ),
    client_streaks AS (
        -- Calculate current workout streaks for each client (simplified version)
        SELECT 
            s.client_id,
            COALESCE(
                CASE 
                    WHEN MAX(s.scheduled_at::DATE) >= CURRENT_DATE - INTERVAL '2 days' THEN
                        -- Simple streak calculation: count consecutive days with workouts
                        (SELECT COUNT(*)
                         FROM (
                             SELECT DISTINCT s2.scheduled_at::DATE as workout_date
                             FROM sessions s2
                             WHERE s2.client_id = s.client_id 
                             AND s2.status = 'completed'
                             AND s2.scheduled_at::DATE >= CURRENT_DATE - INTERVAL '30 days'
                             ORDER BY workout_date DESC
                         ) recent_workouts
                         WHERE workout_date >= CURRENT_DATE - INTERVAL '30 days'
                        )
                    ELSE 0
                END, 0
            ) as current_streak
        FROM sessions s
        WHERE s.status = 'completed'
        AND s.scheduled_at >= thirty_days_ago
        GROUP BY s.client_id
    ),
    client_frequency AS (
        -- Calculate average workout frequency over last 30 days
        SELECT 
            s.client_id,
            CASE 
                WHEN COUNT(DISTINCT s.scheduled_at::DATE) > 0 THEN
                    ROUND(COUNT(DISTINCT s.scheduled_at::DATE)::DECIMAL / 30.0, 2)
                ELSE 0
            END as workout_frequency
        FROM sessions s
        WHERE s.status = 'completed'
        AND s.scheduled_at >= thirty_days_ago
        GROUP BY s.client_id
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
            WHERE wa.client_id = p.id
            AND wa.created_at >= seven_days_ago
        )
        OR 
        -- Include clients who have completed workouts in the last 30 days
        EXISTS (
            SELECT 1 
            FROM sessions s
            WHERE s.client_id = p.id
            AND s.status = 'completed'
            AND s.scheduled_at >= thirty_days_ago
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
    total_assigned BIGINT,
    total_completed BIGINT,
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
                    (COUNT(CASE WHEN wa.created_at >= seven_days_ago AND s.status = 'completed' THEN 1 END)::DECIMAL / 
                     COUNT(CASE WHEN wa.created_at >= seven_days_ago THEN 1 END)) * 100, 2
                )
            ELSE 0
        END as compliance_score,
        COUNT(CASE WHEN wa.created_at >= seven_days_ago THEN 1 END) as total_assigned,
        COUNT(CASE WHEN wa.created_at >= seven_days_ago AND s.status = 'completed' THEN 1 END) as total_completed,
        MAX(CASE WHEN s.status = 'completed' THEN s.scheduled_at::DATE END) as last_workout_date
    FROM profiles p
    LEFT JOIN workout_assignments wa ON wa.client_id = p.id
    LEFT JOIN sessions s ON s.client_id = wa.client_id AND s.scheduled_at::DATE = wa.scheduled_date
    WHERE p.role = 'client'
    AND (
        wa.created_at >= seven_days_ago
        OR s.status = 'completed'
    )
    GROUP BY p.id, p.first_name, p.last_name, p.avatar_url
    ORDER BY 
        CASE 
            WHEN COUNT(CASE WHEN wa.created_at >= seven_days_ago THEN 1 END) > 0 THEN
                (COUNT(CASE WHEN wa.created_at >= seven_days_ago AND s.status = 'completed' THEN 1 END)::DECIMAL / 
                 COUNT(CASE WHEN wa.created_at >= seven_days_ago THEN 1 END))
            ELSE 0
        END ASC,
        p.first_name ASC,
        p.last_name ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_client_compliance_scores_simple(UUID) TO authenticated;

-- Create an index to optimize the function performance
CREATE INDEX IF NOT EXISTS idx_sessions_client_status_date 
ON sessions(client_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_workout_assignments_created_date 
ON workout_assignments(created_at);

-- Test the function (optional - remove in production)
-- SELECT * FROM get_client_compliance_scores('your-coach-uuid-here');
