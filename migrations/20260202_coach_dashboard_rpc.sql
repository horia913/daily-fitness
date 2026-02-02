-- ============================================================================
-- Migration: Coach Dashboard RPC
-- Purpose: Replace 6+ queries with a single optimized RPC call
-- Target: /coach page (Coach Dashboard)
-- Security: Uses auth.uid() internally - validates coach role
-- ============================================================================

-- Drop existing function if it exists (for idempotent migration)
DROP FUNCTION IF EXISTS public.get_coach_dashboard();

-- Create the dashboard RPC
CREATE OR REPLACE FUNCTION public.get_coach_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id UUID;
  v_role TEXT;
  v_result JSONB;
  
  -- Stats
  v_total_clients INT := 0;
  v_active_clients INT := 0;
  v_total_workouts INT := 0;
  v_total_meal_plans INT := 0;
  
  -- Sessions
  v_today_sessions JSONB;
  
  -- Recent clients
  v_recent_clients JSONB;
BEGIN
  -- ========================================
  -- SECURITY: Get coach ID from auth context and validate role
  -- ========================================
  v_coach_id := auth.uid();
  
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user is coach or admin
  SELECT role INTO v_role
  FROM profiles
  WHERE id = v_coach_id;
  
  IF v_role NOT IN ('coach', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized - must be coach or admin';
  END IF;
  
  -- ========================================
  -- 1. Get client counts (total and active)
  -- ========================================
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'active')
  INTO v_total_clients, v_active_clients
  FROM clients
  WHERE coach_id = v_coach_id;
  
  -- ========================================
  -- 2. Get workout templates count
  -- ========================================
  SELECT COUNT(*)
  INTO v_total_workouts
  FROM workout_templates
  WHERE coach_id = v_coach_id
    AND is_active = true;
  
  -- ========================================
  -- 3. Get meal plans count (if table exists)
  -- ========================================
  BEGIN
    SELECT COUNT(*)
    INTO v_total_meal_plans
    FROM meal_plans
    WHERE coach_id = v_coach_id
      AND is_active = true;
  EXCEPTION WHEN undefined_table THEN
    v_total_meal_plans := 0;
  END;
  
  -- ========================================
  -- 4. Get today's sessions with client info
  -- ========================================
  WITH today_sessions AS (
    SELECT 
      s.id,
      s.scheduled_at,
      s.duration_minutes,
      s.status,
      s.client_id,
      TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS client_name,
      p.avatar_url AS client_avatar
    FROM sessions s
    LEFT JOIN profiles p ON p.id = s.client_id
    WHERE s.coach_id = v_coach_id
      AND DATE(s.scheduled_at) = CURRENT_DATE
      AND s.status IN ('scheduled', 'confirmed')
    ORDER BY s.scheduled_at ASC
    LIMIT 10
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ts.id,
    'scheduledAt', ts.scheduled_at,
    'durationMinutes', ts.duration_minutes,
    'status', ts.status,
    'clientId', ts.client_id,
    'clientName', ts.client_name,
    'clientAvatar', ts.client_avatar
  )), '[]'::jsonb)
  INTO v_today_sessions
  FROM today_sessions ts;
  
  -- ========================================
  -- 5. Get recent clients with profiles
  -- ========================================
  WITH recent_clients AS (
    SELECT 
      c.client_id,
      c.status,
      c.created_at,
      p.first_name,
      p.last_name,
      p.avatar_url
    FROM clients c
    LEFT JOIN profiles p ON p.id = c.client_id
    WHERE c.coach_id = v_coach_id
    ORDER BY c.created_at DESC
    LIMIT 5
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', rc.client_id,
    'firstName', rc.first_name,
    'lastName', rc.last_name,
    'avatarUrl', rc.avatar_url,
    'status', rc.status
  )), '[]'::jsonb)
  INTO v_recent_clients
  FROM recent_clients rc;
  
  -- ========================================
  -- Build final result
  -- ========================================
  v_result := jsonb_build_object(
    'stats', jsonb_build_object(
      'totalClients', COALESCE(v_total_clients, 0),
      'activeClients', COALESCE(v_active_clients, 0),
      'totalWorkouts', COALESCE(v_total_workouts, 0),
      'totalMealPlans', COALESCE(v_total_meal_plans, 0)
    ),
    'todaySessions', v_today_sessions,
    'recentClients', v_recent_clients
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_coach_dashboard() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_coach_dashboard() IS 
'Returns comprehensive dashboard data for the authenticated coach.
Uses auth.uid() internally - no parameters accepted.
Validates coach/admin role before returning data.
Replaces 6+ individual queries with a single optimized call.
Returns: stats (totalClients, activeClients, totalWorkouts, totalMealPlans), todaySessions, recentClients';
