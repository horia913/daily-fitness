-- ============================================================================
-- get_coach_dashboard RPC — Single call for coach dashboard
-- Replaces ~26–28 queries (getMorningBriefing + getControlRoomResult) with one RPC.
-- SECURITY DEFINER; restricts to p_coach_id (coach's clients only).
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_coach_dashboard(uuid);

CREATE OR REPLACE FUNCTION public.get_coach_dashboard(p_coach_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'clients', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb) FROM (
        SELECT cl.client_id, p.first_name, p.last_name, p.email, p.avatar_url, cl.status,
          -- Last workout
          (SELECT wl.completed_at FROM workout_logs wl
           WHERE wl.client_id = cl.client_id AND wl.completed_at IS NOT NULL
           ORDER BY wl.completed_at DESC LIMIT 1) AS last_workout_at,
          -- Last check-in
          (SELECT dwl.log_date FROM daily_wellness_logs dwl
           WHERE dwl.client_id = cl.client_id
           ORDER BY dwl.log_date DESC LIMIT 1) AS last_checkin_date,
          -- Active program
          (SELECT wp.name FROM program_assignments pa
           JOIN workout_programs wp ON wp.id = pa.program_id
           WHERE pa.client_id = cl.client_id AND pa.status = 'active'
           ORDER BY pa.updated_at DESC NULLS LAST, pa.created_at DESC LIMIT 1) AS active_program_name,
          -- This week workout count
          (SELECT COUNT(*)::int FROM workout_logs wl
           WHERE wl.client_id = cl.client_id
             AND wl.completed_at >= date_trunc('week', CURRENT_DATE)::timestamptz
             AND wl.completed_at IS NOT NULL) AS week_workout_count,
          -- Check-in count last 7 days
          (SELECT COUNT(DISTINCT dwl.log_date)::int FROM daily_wellness_logs dwl
           WHERE dwl.client_id = cl.client_id
             AND dwl.log_date >= CURRENT_DATE - 7) AS week_checkin_count,
          -- Trained today (has workout_log completed today)
          (SELECT EXISTS (
             SELECT 1 FROM workout_logs wl
             WHERE wl.client_id = cl.client_id AND wl.completed_at IS NOT NULL
               AND wl.completed_at >= (CURRENT_DATE::text || 'T00:00:00')::timestamptz
               AND wl.completed_at < (CURRENT_DATE + 1)::timestamptz
          )) AS trained_today,
          -- Checked in today
          (SELECT EXISTS (
             SELECT 1 FROM daily_wellness_logs dwl
             WHERE dwl.client_id = cl.client_id AND dwl.log_date = CURRENT_DATE
          )) AS checked_in_today,
          -- Has active meal plan
          (SELECT EXISTS (
             SELECT 1 FROM meal_plan_assignments mpa
             WHERE mpa.client_id = cl.client_id AND mpa.is_active = true
               AND mpa.start_date <= CURRENT_DATE
               AND (mpa.end_date IS NULL OR mpa.end_date >= CURRENT_DATE)
          )) AS has_active_meal_plan
        FROM clients cl
        JOIN profiles p ON p.id = cl.client_id
        WHERE cl.coach_id = p_coach_id AND cl.status = 'active'
      ) c
    ),
    'todaysSessions', (
      SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb) FROM (
        SELECT ws.client_id, p.first_name, ws.status, ws.started_at,
               wt.name AS template_name
        FROM workout_sessions ws
        JOIN profiles p ON p.id = ws.client_id
        LEFT JOIN workout_assignments wa ON wa.id = ws.assignment_id
        LEFT JOIN workout_templates wt ON wt.id = wa.workout_template_id
        WHERE ws.started_at >= CURRENT_DATE::timestamptz
          AND ws.client_id IN (
            SELECT client_id FROM clients WHERE coach_id = p_coach_id AND status = 'active'
          )
        ORDER BY ws.started_at DESC
      ) s
    ),
    'totalClients', (
      SELECT COUNT(*)::int FROM clients WHERE coach_id = p_coach_id AND status = 'active'
    ),
    'totalWorkoutsThisWeek', (
      SELECT COUNT(*)::int FROM workout_logs wl
      WHERE wl.client_id IN (
        SELECT client_id FROM clients WHERE coach_id = p_coach_id AND status = 'active'
      )
      AND wl.completed_at >= date_trunc('week', CURRENT_DATE)::timestamptz
      AND wl.completed_at IS NOT NULL
    ),
    'programCompliance', (
      SELECT COALESCE(
        (SELECT ROUND(AVG(client_pct))::int
         FROM (
           SELECT CASE
             WHEN req.total_slots = 0 THEN 0
             ELSE ROUND((req.completed::numeric / req.total_slots) * 100)::int
           END AS client_pct
           FROM (
             SELECT pa.id AS assignment_id,
               COUNT(DISTINCT ps.id) FILTER (WHERE (ps.is_optional IS NOT TRUE OR ps.is_optional IS NULL)) AS total_slots,
               COUNT(DISTINCT pdc.program_schedule_id) FILTER (
                 WHERE (ps.is_optional IS NOT TRUE OR ps.is_optional IS NULL)
               ) AS completed
             FROM program_assignments pa
             JOIN clients cl ON cl.client_id = pa.client_id AND cl.coach_id = p_coach_id AND cl.status = 'active'
             LEFT JOIN program_progress pp ON pp.program_assignment_id = pa.id
             JOIN program_schedule ps ON ps.program_id = pa.program_id
               AND ps.week_number = COALESCE(pp.current_week_number, 1)
             LEFT JOIN program_day_completions pdc ON pdc.program_assignment_id = pa.id
               AND pdc.program_schedule_id = ps.id
             WHERE pa.status = 'active'
             GROUP BY pa.id
           ) req
           WHERE req.total_slots > 0
         ) pcts),
        NULL
      )
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_coach_dashboard(uuid) IS
'Returns coach dashboard data in one call: clients with last workout/checkin, active program, week counts, todaysSessions, totalClients, totalWorkoutsThisWeek, programCompliance. Replaces ~26 queries from getMorningBriefing + getControlRoomResult.';

GRANT EXECUTE ON FUNCTION public.get_coach_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_dashboard(uuid) TO service_role;
