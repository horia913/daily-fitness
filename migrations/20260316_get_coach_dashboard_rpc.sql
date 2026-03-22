-- ============================================================================
-- get_coach_dashboard RPC — single fetch for coach dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_coach_dashboard(p_coach_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    WITH client_metrics AS (
      SELECT
        cl.client_id,
        p.first_name,
        p.last_name,
        p.email,
        p.avatar_url,
        cl.status,
        (
          SELECT wl.completed_at
          FROM workout_logs wl
          WHERE wl.client_id = cl.client_id
            AND wl.completed_at IS NOT NULL
          ORDER BY wl.completed_at DESC
          LIMIT 1
        ) AS last_workout_at,
        (
          SELECT dwl.log_date
          FROM daily_wellness_logs dwl
          WHERE dwl.client_id = cl.client_id
          ORDER BY dwl.log_date DESC
          LIMIT 1
        ) AS last_checkin_date,
        (
          SELECT wp.name
          FROM program_assignments pa
          JOIN workout_programs wp ON wp.id = pa.program_id
          WHERE pa.client_id = cl.client_id
            AND pa.status = 'active'
          ORDER BY pa.updated_at DESC NULLS LAST, pa.created_at DESC
          LIMIT 1
        ) AS active_program_name,
        (
          SELECT COUNT(*)::int
          FROM workout_logs wl
          WHERE wl.client_id = cl.client_id
            AND wl.completed_at IS NOT NULL
            AND wl.completed_at >= date_trunc('week', CURRENT_DATE)::timestamptz
        ) AS week_workout_count,
        COALESCE((
          WITH dates AS (
            SELECT (CURRENT_DATE - offs)::date AS d, offs
            FROM generate_series(0, 365) AS offs
          ),
          flags AS (
            SELECT
              d.d,
              d.offs,
              EXISTS (
                SELECT 1
                FROM daily_wellness_logs dwl
                WHERE dwl.client_id = cl.client_id
                  AND dwl.log_date = d.d
              ) AS has_checkin
            FROM dates d
          ),
          first_gap AS (
            SELECT MIN(offs) AS gap_offs
            FROM flags
            WHERE has_checkin = false
          )
          SELECT COUNT(*)::int
          FROM flags
          WHERE has_checkin = true
            AND offs < COALESCE((SELECT gap_offs FROM first_gap), 366)
        ), 0) AS checkin_streak,
        EXISTS (
          SELECT 1
          FROM workout_logs wl
          WHERE wl.client_id = cl.client_id
            AND wl.completed_at IS NOT NULL
            AND wl.completed_at >= CURRENT_DATE::timestamptz
            AND wl.completed_at < (CURRENT_DATE + 1)::timestamptz
        ) AS trained_today,
        EXISTS (
          SELECT 1
          FROM daily_wellness_logs dwl
          WHERE dwl.client_id = cl.client_id
            AND dwl.log_date = CURRENT_DATE
        ) AS checked_in_today,
        EXISTS (
          SELECT 1
          FROM meal_plan_assignments mpa
          WHERE mpa.client_id = cl.client_id
            AND mpa.is_active = true
            AND mpa.start_date <= CURRENT_DATE
            AND (mpa.end_date IS NULL OR mpa.end_date >= CURRENT_DATE)
        ) AS has_active_meal_plan
      FROM clients cl
      JOIN profiles p ON p.id = cl.client_id
      WHERE cl.coach_id = p_coach_id
        AND cl.status = 'active'
    ),
    todays_sessions AS (
      SELECT
        ws.client_id,
        p.first_name,
        p.last_name,
        ws.status,
        ws.started_at,
        wt.name AS template_name
      FROM workout_sessions ws
      JOIN profiles p ON p.id = ws.client_id
      LEFT JOIN workout_assignments wa ON wa.id = ws.assignment_id
      LEFT JOIN workout_templates wt ON wt.id = wa.workout_template_id
      WHERE ws.client_id IN (SELECT client_id FROM client_metrics)
        AND ws.status IN ('in_progress', 'paused')
        AND ws.started_at >= CURRENT_DATE::timestamptz
      ORDER BY ws.started_at DESC
    )
    SELECT jsonb_build_object(
      'clients', COALESCE((
        SELECT jsonb_agg(row_to_json(cm))
        FROM client_metrics cm
      ), '[]'::jsonb),
      'todaysSessions', COALESCE((
        SELECT jsonb_agg(row_to_json(ts))
        FROM todays_sessions ts
      ), '[]'::jsonb),
      'totalClients', (SELECT COUNT(*)::int FROM client_metrics),
      'totalWorkoutsThisWeek', COALESCE((
        SELECT SUM(cm.week_workout_count)::int
        FROM client_metrics cm
      ), 0),
      'alerts', jsonb_build_object(
        'noCheckIn3Days', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'client_id', cm.client_id,
              'first_name', cm.first_name,
              'last_name', cm.last_name,
              'detail', CASE
                WHEN cm.last_checkin_date IS NULL THEN 'No check-in yet'
                ELSE 'No check-in for ' || (CURRENT_DATE - cm.last_checkin_date)::text || ' days'
              END
            )
          )
          FROM client_metrics cm
          WHERE cm.last_checkin_date IS NULL
             OR cm.last_checkin_date <= CURRENT_DATE - 3
        ), '[]'::jsonb),
        'noWorkoutThisWeek', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'client_id', cm.client_id,
              'first_name', cm.first_name,
              'last_name', cm.last_name,
              'detail', 'No completed workout this week'
            )
          )
          FROM client_metrics cm
          WHERE cm.week_workout_count = 0
        ), '[]'::jsonb)
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
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_coach_dashboard(uuid) IS
'Returns coach dashboard data in one call: clients + streak + sessions + totals + alerts.';

GRANT EXECUTE ON FUNCTION public.get_coach_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_dashboard(uuid) TO service_role;
