-- Wave 2B: guard unguarded SECURITY DEFINER functions
-- Source: live pg_get_functiondef (2026-07-10). Apply manually; read-only MCP audit.
-- Signatures frozen. SECURITY DEFINER + search_path preserved per function.

begin;

-- get_workout_blocks: template coach, assigned client, active program, or coach's client
CREATE OR REPLACE FUNCTION public.get_workout_blocks(p_template_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM workout_templates wt WHERE wt.id = p_template_id AND wt.coach_id = v_caller
  ) AND NOT EXISTS (
    SELECT 1 FROM workout_assignments wa
    WHERE wa.workout_template_id = p_template_id AND wa.client_id = v_caller
  ) AND NOT EXISTS (
    SELECT 1
    FROM program_assignments pa
    JOIN program_schedule ps ON ps.program_id = pa.program_id
    WHERE pa.client_id = v_caller
      AND pa.status = 'active'
      AND ps.template_id = p_template_id
  ) AND NOT EXISTS (
    SELECT 1
    FROM workout_templates wt
    JOIN program_schedule ps ON ps.template_id = wt.id
    JOIN program_assignments pa ON pa.program_id = ps.program_id
    JOIN clients c ON c.client_id = pa.client_id AND c.coach_id = v_caller
    WHERE wt.id = p_template_id AND pa.status = 'active'
  ) AND NOT EXISTS (
    SELECT 1
    FROM workout_assignments wa
    JOIN clients c ON c.client_id = wa.client_id AND c.coach_id = v_caller
    WHERE wa.workout_template_id = p_template_id
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN (
    SELECT COALESCE(
      jsonb_agg(block_json ORDER BY (block_json->>'set_order')::int NULLS LAST),
      '[]'::jsonb
    )
    FROM (
      SELECT
        to_jsonb(wse) ||
        jsonb_build_object(
          'exercises', COALESCE(
            (SELECT jsonb_agg(
               row_to_json(wsee)::jsonb || jsonb_build_object('exercise', row_to_json(e))
               ORDER BY wsee.exercise_order
             )
             FROM workout_set_entry_exercises wsee
             JOIN exercises e ON e.id = wsee.exercise_id
             WHERE wsee.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'drop_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(ds) ORDER BY ds.exercise_order, ds.drop_order)
             FROM workout_drop_sets ds
             WHERE ds.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'cluster_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(cs) ORDER BY cs.exercise_order)
             FROM workout_cluster_sets cs
             WHERE cs.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'rest_pause_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(rp) ORDER BY rp.exercise_order)
             FROM workout_rest_pause_sets rp
             WHERE rp.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'time_protocols', COALESCE(
            (SELECT jsonb_agg(row_to_json(tp) ORDER BY tp.exercise_order)
             FROM workout_time_protocols tp
             WHERE tp.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'speed_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(s) ORDER BY s.exercise_order, s.id)
             FROM workout_speed_sets s
             WHERE s.set_entry_id = wse.id),
            '[]'::jsonb
          ),
          'endurance_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(en) ORDER BY en.exercise_order, en.id)
             FROM workout_endurance_sets en
             WHERE en.set_entry_id = wse.id),
            '[]'::jsonb
          )
        ) AS block_json
      FROM workout_set_entries wse
      WHERE wse.template_id = p_template_id
      ORDER BY wse.set_order
    ) sub
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_coach_dashboard(p_coach_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_coach_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

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
               WHEN adh.required = 0 THEN 0
               ELSE ROUND((adh.completed::numeric / adh.required) * 100)::int
             END AS client_pct
             FROM program_assignments pa
             JOIN clients cl ON cl.client_id = pa.client_id
               AND cl.coach_id = p_coach_id AND cl.status = 'active'
             CROSS JOIN LATERAL public.get_program_instance_week(pa.id, NULL) wk
             CROSS JOIN LATERAL public.instance_adherence_for_week(
               pa.id,
               wk.current_week
             ) adh
             WHERE pa.status = 'active'
               AND adh.required > 0
           ) pcts),
          NULL
        )
      )
    )
  );
END;
$function$


CREATE OR REPLACE FUNCTION public.get_completed_programs(p_client_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_client_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (
       SELECT 1
       FROM public.clients c
       WHERE c.client_id = p_client_id
         AND c.coach_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(
    jsonb_agg(row_to_json(t) ORDER BY t.completed_date DESC NULLS LAST),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT
      pa.id,
      pa.client_id,
      pa.program_id,
      pa.id AS assignment_id,
      COALESCE(pa.name, wp.name, 'Program') AS program_name,
      COALESCE(pa.description, wp.description) AS program_description,
      COALESCE(wk.total_weeks, public.program_instance_total_weeks(pa.id), 0) AS total_weeks,
      COALESCE(wp.difficulty_level, 'intermediate') AS difficulty_level,
      COALESCE(NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''), 'Coach') AS coach_name,
      pa.start_date AS started_date,
      COALESCE(pa.updated_at, pa.created_at) AS completed_date,
      (
        SELECT COUNT(DISTINCT pdc.program_day_assignment_id)::int
        FROM program_day_completions pdc
        WHERE pdc.program_assignment_id = pa.id
          AND pdc.program_day_assignment_id IS NOT NULL
          AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%'
      ) AS total_workouts_completed,
      LEAST(
        100,
        ROUND(
          CASE
            WHEN COALESCE(wk.total_weeks, public.program_instance_total_weeks(pa.id), 0) > 0 THEN
              (
                SELECT COUNT(DISTINCT pdc.program_day_assignment_id)::numeric
                FROM program_day_completions pdc
                WHERE pdc.program_assignment_id = pa.id
                  AND pdc.program_day_assignment_id IS NOT NULL
                  AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%'
              )
              / NULLIF(
                (
                  SELECT COUNT(*)::numeric
                  FROM program_day_assignments pda
                  WHERE pda.program_assignment_id = pa.id
                    AND COALESCE(pda.is_optional, false) = false
                ),
                0
              )
              * 100
            ELSE 0
          END,
          1
        )
      ) AS completion_percentage,
      pa.created_at,
      pa.updated_at
    FROM program_assignments pa
    LEFT JOIN workout_programs wp ON wp.id = pa.program_id
    LEFT JOIN profiles p ON p.id = pa.coach_id
    LEFT JOIN LATERAL public.get_program_instance_week(pa.id, NULL) wk ON true
    WHERE pa.client_id = p_client_id
      AND pa.status = 'completed'
  ) t;

  RETURN v_result;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_client_compliance_scores(coach_id_param uuid)
 RETURNS TABLE(client_id uuid, full_name text, avatar_url text, compliance_score numeric, total_assigned integer, total_completed integer, last_workout_date date, current_streak integer, workout_frequency numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    seven_days_ago DATE;
    thirty_days_ago DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF coach_id_param IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

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
$function$


CREATE OR REPLACE FUNCTION public.get_client_compliance_scores_simple(coach_id_param uuid)
 RETURNS TABLE(client_id uuid, full_name text, avatar_url text, compliance_score numeric, total_assigned integer, total_completed integer, last_workout_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    seven_days_ago DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF coach_id_param IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

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
$function$


CREATE OR REPLACE FUNCTION public.complete_workout(p_assignment_progress_id uuid, p_week_number integer, p_program_day integer, p_template_id uuid, p_duration_minutes integer DEFAULT NULL::integer, p_notes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_progress RECORD;
  v_schedule RECORD;
  v_total_workouts_this_week INT;
  v_new_days_completed INT;
  v_week_complete BOOLEAN;
BEGIN
  -- Get assignment progress
  SELECT * INTO v_progress
  FROM program_assignment_progress
  WHERE id = p_assignment_progress_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Program assignment not found');
  END IF;

  -- Verify week matches current week
  IF p_week_number != v_progress.current_week THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot complete workout from week ' || p_week_number || 
               '. You are currently on week ' || v_progress.current_week
    );
  END IF;

  -- Verify schedule slot exists
  SELECT * INTO v_schedule
  FROM program_schedule
  WHERE program_id = v_progress.program_id
    AND week_number = p_week_number
    AND day_of_week = p_program_day
    AND template_id = p_template_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Workout not found in program schedule'
    );
  END IF;

  -- Insert completion (will fail if duplicate due to UNIQUE constraint)
  BEGIN
    INSERT INTO program_workout_completions (
      assignment_progress_id,
      client_id,
      program_id,
      week_number,
      program_day,
      template_id,
      workout_date,
      completed_at,
      duration_minutes,
      notes
    ) VALUES (
      p_assignment_progress_id,
      v_progress.client_id,
      v_progress.program_id,
      p_week_number,
      p_program_day,
      p_template_id,
      CURRENT_DATE,
      NOW(),
      p_duration_minutes,
      p_notes
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This workout has already been completed'
    );
  END;

  -- Increment days_completed_this_week
  UPDATE program_assignment_progress
  SET days_completed_this_week = days_completed_this_week + 1,
      last_workout_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE id = p_assignment_progress_id
  RETURNING days_completed_this_week INTO v_new_days_completed;

  -- Count total workouts in this week
  SELECT COUNT(*) INTO v_total_workouts_this_week
  FROM program_schedule
  WHERE program_id = v_progress.program_id
    AND week_number = v_progress.current_week;

  -- Check if week is now complete
  v_week_complete := (v_new_days_completed >= v_total_workouts_this_week);

  -- If week complete, advance to next week
  IF v_week_complete THEN
    UPDATE program_assignment_progress
    SET current_week = current_week + 1,
        current_day = 1,
        days_completed_this_week = 0,
        total_weeks_completed = total_weeks_completed + 1,
        cycle_start_date = cycle_start_date + INTERVAL '7 days',
        updated_at = NOW()
    WHERE id = p_assignment_progress_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'days_completed', v_new_days_completed,
    'total_workouts_this_week', v_total_workouts_this_week,
    'week_complete', v_week_complete,
    'current_week', v_progress.current_week,
    'next_week', CASE WHEN v_week_complete THEN v_progress.current_week + 1 ELSE NULL END
  );
END;
$function$


CREATE OR REPLACE FUNCTION public.deactivate_previous_program(p_client_id uuid, p_new_assignment_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_previous_assignment RECORD;
  v_program_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.client_id = p_client_id AND c.coach_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Find active program assignment (excluding the new one)
  SELECT pa.*, wp.name INTO v_previous_assignment
  FROM program_assignments pa
  JOIN workout_programs wp ON pa.program_id = wp.id
  WHERE pa.client_id = p_client_id
    AND pa.status = 'active'
    AND pa.id != p_new_assignment_id
  ORDER BY pa.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', true,
      'had_previous', false,
      'message', 'No previous active program found'
    );
  END IF;

  -- Check if previous program is incomplete
  SELECT EXISTS (
    SELECT 1
    FROM program_assignment_progress pap
    WHERE pap.assignment_id = v_previous_assignment.id
      AND pap.is_program_completed = false
  ) INTO v_previous_assignment.is_incomplete;

  -- Deactivate previous program (keep all data)
  UPDATE program_assignments
  SET status = 'inactive',
      updated_at = NOW()
  WHERE id = v_previous_assignment.id;

  RETURN json_build_object(
    'success', true,
    'had_previous', true,
    'previous_assignment_id', v_previous_assignment.id,
    'previous_program_id', v_previous_assignment.program_id,
    'previous_program_name', v_previous_assignment.name,
    'is_incomplete', v_previous_assignment.is_incomplete,
    'message', 'Previous program deactivated'
  );
END;
$function$


CREATE OR REPLACE FUNCTION public.get_next_incomplete_program_slot(p_assignment_id uuid)
 RETURNS TABLE(schedule_id uuid, template_id uuid, week_number integer, program_day integer, template_name text, template_description text, estimated_duration integer, total_sets bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.program_assignments pa
    WHERE pa.id = p_assignment_id
      AND (
        pa.client_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.clients c
          WHERE c.client_id = pa.client_id
            AND c.coach_id = auth.uid()
        )
      )
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    pda.id AS schedule_id,
    COALESCE(pda.workout_template_id, pda.program_instance_workout_id) AS template_id,
    pda.week_number,
    pda.program_day,
    COALESCE(wt.name, piw.name, pda.name) AS template_name,
    COALESCE(wt.description, piw.description, '') AS template_description,
    COALESCE(wt.estimated_duration, piw.estimated_duration)::integer AS estimated_duration,
    CASE
      WHEN pda.program_instance_workout_id IS NOT NULL THEN (
        SELECT COUNT(*)
        FROM program_instance_set_entries pise
        WHERE pise.program_instance_workout_id = pda.program_instance_workout_id
      )
      ELSE (
        SELECT COUNT(*)
        FROM workout_set_entries wse
        WHERE wse.template_id = pda.workout_template_id
      )
    END AS total_sets
  FROM program_day_assignments pda
  LEFT JOIN workout_templates wt ON wt.id = pda.workout_template_id
  LEFT JOIN program_instance_workouts piw ON piw.id = pda.program_instance_workout_id
  WHERE p_assignment_id IS NOT NULL
    AND pda.program_assignment_id = p_assignment_id
    AND NOT EXISTS (
      SELECT 1
      FROM program_day_completions pdc
      WHERE pdc.program_day_assignment_id = pda.id
        AND pdc.program_assignment_id = p_assignment_id
        AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%'
    )
  ORDER BY pda.week_number ASC, pda.program_day ASC
  LIMIT 1;
END;
$function$;


CREATE OR REPLACE FUNCTION public.check_and_complete_program(p_program_assignment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment record;
  v_total_weeks int;
  v_current_week int;
  v_has_slots boolean;
  v_next_schedule_id uuid;
  v_is_completed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.program_assignments pa
    WHERE pa.id = p_program_assignment_id
      AND (
        pa.client_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.clients c
          WHERE c.client_id = pa.client_id
            AND c.coach_id = auth.uid()
        )
      )
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT pa.id, pa.client_id, pa.program_id, pa.status, pa.start_date, pa.created_at, pa.updated_at
  INTO v_assignment
  FROM program_assignments pa
  WHERE pa.id = p_program_assignment_id;

  IF v_assignment.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'assignment_not_found');
  END IF;

  IF v_assignment.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;

  SELECT w.current_week, w.total_weeks
  INTO v_current_week, v_total_weeks
  FROM public.get_program_instance_week(p_program_assignment_id, NULL) w;

  v_current_week := COALESCE(v_current_week, 1);
  v_total_weeks := COALESCE(v_total_weeks, public.program_instance_total_weeks(p_program_assignment_id), 0);

  SELECT EXISTS (
    SELECT 1 FROM program_day_assignments pda
    WHERE pda.program_assignment_id = p_program_assignment_id
  ) INTO v_has_slots;

  SELECT s.schedule_id
  INTO v_next_schedule_id
  FROM public.get_next_incomplete_program_slot(p_program_assignment_id) s
  LIMIT 1;

  v_is_completed := v_has_slots AND v_next_schedule_id IS NULL;

  IF v_is_completed OR (v_total_weeks > 0 AND v_current_week >= v_total_weeks AND v_next_schedule_id IS NULL) THEN
    UPDATE program_assignments
    SET status = 'completed', updated_at = now()
    WHERE id = p_program_assignment_id
      AND status <> 'completed';

    RETURN jsonb_build_object(
      'success', true,
      'completed', true,
      'current_week', v_current_week,
      'total_weeks', v_total_weeks
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'completed', false,
    'current_week', v_current_week,
    'total_weeks', v_total_weeks
  );
END;
$function$


CREATE OR REPLACE FUNCTION public.calculate_adherence(p_program_assignment_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment record;
  v_duration_weeks numeric;
  v_actual_weeks_taken numeric;
  v_start date;
  v_end date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.program_assignments pa
    WHERE pa.id = p_program_assignment_id
      AND (
        pa.client_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.clients c
          WHERE c.client_id = pa.client_id
            AND c.coach_id = auth.uid()
        )
      )
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT pa.id, pa.start_date, pa.created_at, pa.updated_at, pa.status
  INTO v_assignment
  FROM program_assignments pa
  WHERE pa.id = p_program_assignment_id;

  IF v_assignment.id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(w.total_weeks, public.program_instance_total_weeks(p_program_assignment_id), 0)::numeric
  INTO v_duration_weeks
  FROM public.get_program_instance_week(p_program_assignment_id, NULL) w;

  v_start := COALESCE(v_assignment.start_date, v_assignment.created_at::date);
  v_end := CASE
    WHEN v_assignment.status = 'completed' THEN COALESCE(v_assignment.updated_at::date, CURRENT_DATE)
    ELSE CURRENT_DATE
  END;

  v_actual_weeks_taken := GREATEST(1::numeric, ceil(((v_end - v_start) + 1)::numeric / 7.0));

  IF v_duration_weeks <= 0 OR v_actual_weeks_taken <= 0 THEN
    RETURN 0;
  END IF;

  RETURN LEAST(100, ROUND((v_duration_weeks / v_actual_weeks_taken) * 100, 1));
END;
$function$


CREATE OR REPLACE FUNCTION public.get_weekly_breakdown(p_program_assignment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment record;
  v_total_weeks int;
  v_week int;
  v_weeks jsonb := '[]'::jsonb;
  v_adh record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.program_assignments pa
    WHERE pa.id = p_program_assignment_id
      AND (
        pa.client_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.clients c
          WHERE c.client_id = pa.client_id
            AND c.coach_id = auth.uid()
        )
      )
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT pa.id, pa.client_id, pa.program_id, pa.status
  INTO v_assignment
  FROM program_assignments pa
  WHERE pa.id = p_program_assignment_id;

  IF v_assignment.id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(w.total_weeks, public.program_instance_total_weeks(p_program_assignment_id), 0)
  INTO v_total_weeks
  FROM public.get_program_instance_week(p_program_assignment_id, NULL) w;

  IF v_total_weeks < 1 THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR v_week IN 1..v_total_weeks LOOP
    SELECT required, completed
    INTO v_adh
    FROM public.instance_adherence_for_week(p_program_assignment_id, v_week);

    v_weeks := v_weeks || jsonb_build_array(
      jsonb_build_object(
        'week_number', v_week,
        'required', COALESCE(v_adh.required, 0),
        'completed', COALESCE(v_adh.completed, 0),
        'adherence_pct', CASE
          WHEN COALESCE(v_adh.required, 0) > 0 THEN
            ROUND((COALESCE(v_adh.completed, 0)::numeric / v_adh.required::numeric) * 100, 1)
          ELSE 0
        END
      )
    );
  END LOOP;

  RETURN v_weeks;
END;
$function$


CREATE OR REPLACE FUNCTION public.book_session(p_time_slot_id uuid, p_client_id uuid, p_session_type text DEFAULT 'personal_training'::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_coach_id UUID;
  v_session_id UUID;
  v_is_available BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_client_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Check if time slot exists and is available
  SELECT coach_id, is_available
  INTO v_coach_id, v_is_available
  FROM coach_time_slots
  WHERE id = p_time_slot_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time slot not found';
  END IF;
  
  IF NOT v_is_available THEN
    RAISE EXCEPTION 'Time slot is not available';
  END IF;
  
  -- Create the booked session
  INSERT INTO booked_sessions (
    time_slot_id,
    coach_id,
    client_id,
    session_type,
    status,
    notes
  ) VALUES (
    p_time_slot_id,
    v_coach_id,
    p_client_id,
    p_session_type,
    'scheduled',
    p_notes
  )
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$function$


CREATE OR REPLACE FUNCTION public.cancel_session(p_session_id uuid, p_cancelled_by uuid, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_current_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_cancelled_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM booked_sessions bs
    WHERE bs.id = p_session_id
      AND (bs.client_id = auth.uid() OR bs.coach_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Get current status
  SELECT status INTO v_current_status
  FROM booked_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  IF v_current_status != 'scheduled' THEN
    RAISE EXCEPTION 'Can only cancel scheduled sessions';
  END IF;
  
  -- Update session
  UPDATE booked_sessions
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = p_cancelled_by,
    cancellation_reason = p_reason
  WHERE id = p_session_id;
  
  RETURN TRUE;
END;
$function$


CREATE OR REPLACE FUNCTION public.complete_session(p_session_id uuid, p_coach_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM booked_sessions bs
    WHERE bs.id = p_session_id AND bs.coach_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE booked_sessions
  SET 
    status = 'completed',
    actual_end_time = NOW(),
    coach_notes = COALESCE(p_coach_notes, coach_notes)
  WHERE id = p_session_id
    AND status = 'scheduled';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or already completed';
  END IF;
  
  RETURN TRUE;
END;
$function$


CREATE OR REPLACE FUNCTION public.add_session_feedback(p_session_id uuid, p_client_id uuid, p_rating integer, p_feedback text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_client_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE booked_sessions
  SET 
    session_rating = p_rating,
    client_feedback = p_feedback
  WHERE id = p_session_id
    AND client_id = p_client_id
    AND status = 'completed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or not completed';
  END IF;
  
  RETURN TRUE;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_daily_workout(p_client_id uuid, p_workout_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_assignment_id UUID;
    v_cached_workout JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_client_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (
       SELECT 1
       FROM public.clients c
       WHERE c.client_id = p_client_id
         AND c.coach_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

    -- Get active program assignment
    SELECT id INTO v_assignment_id
    FROM public.program_assignments
    WHERE client_id = p_client_id 
    AND status = 'active'
    AND start_date <= p_workout_date
    AND (end_date IS NULL OR end_date >= p_workout_date)
    ORDER BY start_date DESC
    LIMIT 1;
    
    IF v_assignment_id IS NULL THEN
        RETURN jsonb_build_object(
            'hasWorkout', false,
            'message', 'No active program assigned'
        );
    END IF;
    
    -- Check cache first
    SELECT workout_data INTO v_cached_workout
    FROM public.daily_workout_cache
    WHERE client_id = p_client_id 
    AND program_assignment_id = v_assignment_id
    AND workout_date = p_workout_date
    AND expires_at > NOW();
    
    IF v_cached_workout IS NOT NULL THEN
        RETURN v_cached_workout;
    END IF;
    
    -- Generate new workout
    RETURN generate_daily_workout(p_client_id, v_assignment_id, p_workout_date);
END;
$function$


CREATE OR REPLACE FUNCTION public.generate_daily_workout(p_client_id uuid, p_program_id uuid, p_workout_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_client_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (
       SELECT 1
       FROM public.clients c
       WHERE c.client_id = p_client_id
         AND c.coach_id = auth.uid()
     ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN jsonb_build_object(
    'template_name', 'Sample Workout',
    'template_description', 'This is a sample workout template',
    'week_number', 1,
    'exercises', jsonb_build_array(
      jsonb_build_object(
        'id', 'sample-exercise-1',
        'exercise_name', 'Push-ups',
        'sets', 3,
        'reps', 10,
        'rest_time', 60,
        'alternatives', jsonb_build_array()
      )
    )
  );
END;
$function$


CREATE OR REPLACE FUNCTION public.get_available_time_slots(p_coach_id uuid, p_date date)
 RETURNS TABLE(id uuid, start_time time without time zone, end_time time without time zone, notes text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    cts.id,
    cts.start_time,
    cts.end_time,
    cts.notes
  FROM coach_time_slots cts
  WHERE cts.coach_id = p_coach_id
    AND cts.date = p_date
    AND cts.is_available = true
    AND NOT EXISTS (
      SELECT 1 FROM booked_sessions bs
      WHERE bs.time_slot_id = cts.id
        AND bs.status = 'scheduled'
    )
  ORDER BY cts.start_time;
END;
$function$


CREATE OR REPLACE FUNCTION public.extend_clipcard_validity(p_clipcard_id uuid, p_coach_id uuid, p_extension_days integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_coach_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

    UPDATE clipcards
    SET end_date = end_date + INTERVAL '1 day' * p_extension_days
    WHERE id = p_clipcard_id AND coach_id = p_coach_id;
    
    RETURN TRUE;
END;
$function$


CREATE OR REPLACE FUNCTION public.rollback_invite_code(p_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role' THEN
    NULL;
  ELSIF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'not authorized';
  ELSE
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.invite_codes
  SET used_count = GREATEST(used_count - 1, 0)
  WHERE code = p_code;
END;
$function$


CREATE OR REPLACE FUNCTION public.cleanup_workout_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF auth.role() = 'service_role' THEN
    NULL;
  ELSIF auth.uid() IS NOT NULL AND public.is_admin(auth.uid()) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'not authorized';
  END IF;

    DELETE FROM public.daily_workout_cache
    WHERE expires_at <= NOW();
END;
$function$


CREATE OR REPLACE FUNCTION public.create_user_profile(user_id uuid, user_email text, user_full_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (user_id, user_email, user_full_name, 'client');
END;
$function$


REVOKE EXECUTE ON FUNCTION public.create_user_profile(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_user_profile(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rollback_invite_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rollback_invite_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rollback_invite_code(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_workout_cache() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_workout_cache() FROM anon;

commit;

-- verification (user pastes this output back):
select p.proname as function,
       (pg_get_functiondef(p.oid) ilike '%auth.uid()%') as has_guard
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_workout_blocks',
    'get_coach_dashboard',
    'complete_workout',
    'create_user_profile',
    'get_completed_programs',
    'get_client_compliance_scores',
    'get_client_compliance_scores_simple',
    'deactivate_previous_program',
    'get_next_incomplete_program_slot',
    'check_and_complete_program',
    'book_session',
    'cancel_session',
    'complete_session',
    'add_session_feedback',
    'get_daily_workout',
    'generate_daily_workout',
    'get_available_time_slots',
    'calculate_adherence',
    'get_weekly_breakdown',
    'extend_clipcard_validity',
    'rollback_invite_code',
    'cleanup_workout_cache'
  )
order by 1;
