-- ============================================================================
-- SECURITY: auth.uid() enforcement on SECURITY DEFINER RPCs (IDOR hardening)
-- Prevents authenticated users from passing arbitrary client_id / coach_id /
-- template_id to read other users' data.
--
-- Applied to latest definitions from:
--   get_train_page_data          → 20260320_get_train_page_data_coach_managed.sql
--   get_client_nutrition_page    → 20260316_update_nutrition_rpc.sql
--   get_coach_dashboard          → 20260316_get_coach_dashboard_rpc.sql
--   get_workout_blocks           → 20260406_get_workout_blocks_speed_endurance_sets.sql
--   get_workout_set_logs_for_resume / get_workout_session_data → 20260408_*.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) get_train_page_data — caller must be client OR active coach for client
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_train_page_data(p_client_id uuid, p_today_weekday integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_program_assignment record;
  v_coach_review record;
  v_caller uuid := auth.uid();
  v_is_coach boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller IS DISTINCT FROM p_client_id THEN
    SELECT EXISTS (
      SELECT 1
      FROM clients
      WHERE client_id = p_client_id
        AND coach_id = v_caller
    ) INTO v_is_coach;
    IF NOT v_is_coach THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  SELECT pa.id, pa.program_id, pa.client_id, pa.status, pa.duration_weeks, pa.created_at,
         pa.progression_mode, pa.coach_unlocked_week,
         wp.name AS program_name, wp.duration_weeks AS wp_duration_weeks
  INTO v_program_assignment
  FROM program_assignments pa
  JOIN workout_programs wp ON wp.id = pa.program_id
  WHERE pa.client_id = p_client_id AND pa.status = 'active'
  ORDER BY pa.created_at DESC
  LIMIT 1;

  IF v_program_assignment IS NULL THEN
    RETURN jsonb_build_object(
      'hasProgram', false,
      'extraWorkouts', (
        SELECT COALESCE(jsonb_agg(row_to_json(w)), '[]'::jsonb)
        FROM (
          SELECT wa.id, wa.workout_template_id AS template_id, wa.status, wt.name AS template_name,
                 COALESCE(wa.estimated_duration, wt.estimated_duration, 60)::int AS estimated_duration,
                 (SELECT COUNT(*)::int FROM workout_set_entry_exercises wsee
                  JOIN workout_set_entries wse ON wse.id = wsee.set_entry_id
                  WHERE wse.template_id = wa.workout_template_id) AS exercise_count
          FROM workout_assignments wa
          LEFT JOIN workout_templates wt ON wt.id = wa.workout_template_id
          WHERE wa.client_id = p_client_id
            AND wa.status IN ('assigned', 'in_progress')
        ) w
      )
    );
  END IF;

  SELECT cwr.coach_notes, cwr.reviewed_at
  INTO v_coach_review
  FROM coach_week_reviews cwr
  WHERE cwr.program_assignment_id = v_program_assignment.id
    AND cwr.week_number = COALESCE(v_program_assignment.coach_unlocked_week, 1)
  ORDER BY cwr.reviewed_at DESC
  LIMIT 1;

  result := jsonb_build_object(
    'hasProgram', true,
    'programName', v_program_assignment.program_name,
    'programId', v_program_assignment.program_id,
    'assignmentId', v_program_assignment.id,
    'assignmentStartDate', v_program_assignment.created_at,
    'durationWeeks', COALESCE(v_program_assignment.duration_weeks, v_program_assignment.wp_duration_weeks, 4),
    'progressionMode', COALESCE(v_program_assignment.progression_mode, 'auto'),
    'coachUnlockedWeek', v_program_assignment.coach_unlocked_week,
    'coachReviewNotes', v_coach_review.coach_notes,
    'coachReviewDate', v_coach_review.reviewed_at,
    'schedule', (
      SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      FROM (
        SELECT ps.id, ps.week_number, ps.day_number, ps.day_of_week,
               ps.template_id, COALESCE(ps.is_optional, false) AS is_optional,
               wt.name AS template_name,
               COALESCE(wt.estimated_duration, 0)::int AS estimated_duration,
               (SELECT COUNT(*)::int FROM workout_set_entry_exercises wsee
                JOIN workout_set_entries wse ON wse.id = wsee.set_entry_id
                WHERE wse.template_id = ps.template_id) AS exercise_count
        FROM program_schedule ps
        LEFT JOIN workout_templates wt ON wt.id = ps.template_id
        WHERE ps.program_id = v_program_assignment.program_id
        ORDER BY ps.week_number, ps.day_number
      ) s
    ),
    'completions', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM (
        SELECT pdc.program_schedule_id, pdc.completed_at
        FROM program_day_completions pdc
        WHERE pdc.program_assignment_id = v_program_assignment.id
      ) c
    ),
    'extraWorkouts', (
      SELECT COALESCE(jsonb_agg(row_to_json(w)), '[]'::jsonb)
      FROM (
        SELECT wa.id, wa.workout_template_id AS template_id, wa.status, wt.name AS template_name,
               COALESCE(wa.estimated_duration, wt.estimated_duration, 60)::int AS estimated_duration,
               (SELECT COUNT(*)::int FROM workout_set_entry_exercises wsee
                JOIN workout_set_entries wse ON wse.id = wsee.set_entry_id
                WHERE wse.template_id = wa.workout_template_id) AS exercise_count
        FROM workout_assignments wa
        LEFT JOIN workout_templates wt ON wt.id = wa.workout_template_id
        WHERE wa.client_id = p_client_id
          AND wa.status IN ('assigned', 'in_progress')
      ) w
    )
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_train_page_data(uuid, integer) IS
'Returns all data for the client Train page. Includes progressionMode, coachUnlockedWeek, and latest coach review notes. Restricted to client or their coach.';

GRANT EXECUTE ON FUNCTION public.get_train_page_data(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_train_page_data(uuid, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 2) get_client_nutrition_page — caller must be client OR active coach for client
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_client_nutrition_page(
  p_client_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_assignment record;
  v_plan_id uuid;
  v_effective_assignment_id uuid;
  v_today_selection_id uuid;
  v_week_start date;
  v_caller uuid := auth.uid();
  v_is_coach boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller IS DISTINCT FROM p_client_id THEN
    SELECT EXISTS (
      SELECT 1
      FROM clients
      WHERE client_id = p_client_id
        AND coach_id = v_caller
    ) INTO v_is_coach;
    IF NOT v_is_coach THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  v_week_start := date_trunc('week', p_date)::date;

  SELECT meal_plan_assignment_id INTO v_today_selection_id
  FROM client_daily_plan_selection
  WHERE client_id = p_client_id
    AND date = p_date
  LIMIT 1;

  SELECT id, meal_plan_id, start_date, end_date, label, created_at
  INTO v_assignment
  FROM meal_plan_assignments
  WHERE client_id = p_client_id
    AND is_active = true
    AND start_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_assignment IS NULL THEN
    RETURN jsonb_build_object(
      'hasAssignment', false,
      'activeAssignments', '[]'::jsonb,
      'dailySelection', null,
      'meals', '[]'::jsonb,
      'nutritionGoals', '[]'::jsonb,
      'weeklyCompliance', '[]'::jsonb,
      'allFoods', (
        SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::jsonb)
        FROM (
          SELECT id, name, serving_size, serving_unit, calories_per_serving, protein, carbs, fat
          FROM foods
          WHERE is_active IS NOT DISTINCT FROM true
          ORDER BY name
        ) f
      )
    );
  END IF;

  v_plan_id := v_assignment.meal_plan_id;

  SELECT id INTO v_effective_assignment_id
  FROM meal_plan_assignments
  WHERE client_id = p_client_id
    AND is_active = true
    AND start_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
    AND (v_today_selection_id IS NULL OR id = v_today_selection_id)
  ORDER BY CASE WHEN id = v_today_selection_id THEN 0 ELSE 1 END, created_at DESC
  LIMIT 1;

  IF v_effective_assignment_id IS NOT NULL THEN
    SELECT id, meal_plan_id INTO v_assignment
    FROM meal_plan_assignments
    WHERE id = v_effective_assignment_id;
    v_plan_id := v_assignment.meal_plan_id;
  END IF;

  result := jsonb_build_object(
    'hasAssignment', true,
    'assignmentId', v_assignment.id,
    'mealPlanId', v_plan_id,
    'activeAssignments', (
      SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb)
      FROM (
        SELECT
          mpa.id,
          mpa.meal_plan_id,
          mpa.start_date,
          mpa.end_date,
          mpa.label,
          row_to_json(mp) AS meal_plans
        FROM meal_plan_assignments mpa
        LEFT JOIN meal_plans mp ON mp.id = mpa.meal_plan_id
        WHERE mpa.client_id = p_client_id
          AND mpa.is_active = true
          AND mpa.start_date <= p_date
          AND (mpa.end_date IS NULL OR mpa.end_date >= p_date)
        ORDER BY mpa.created_at ASC
      ) a
    ),
    'dailySelection', (
      SELECT row_to_json(s)
      FROM (
        SELECT meal_plan_assignment_id
        FROM client_daily_plan_selection
        WHERE client_id = p_client_id AND date = p_date
        LIMIT 1
      ) s
    ),
    'meals', (
      SELECT COALESCE(jsonb_agg(meal_obj ORDER BY ord NULLS LAST), '[]'::jsonb)
      FROM (
        SELECT
          jsonb_build_object(
            'id', m.id,
            'meal_plan_id', m.meal_plan_id,
            'name', m.name,
            'meal_type', m.meal_type,
            'order_index', COALESCE(m.order_index, 0),
            'notes', m.notes,
            'food_items', (
              SELECT COALESCE(jsonb_agg(row_to_json(fi)), '[]'::jsonb)
              FROM (
                SELECT mfi.id, mfi.meal_id, mfi.food_id, mfi.quantity, mfi.unit, mfi.meal_option_id, row_to_json(f) AS food
                FROM meal_food_items mfi
                JOIN foods f ON f.id = mfi.food_id
                WHERE mfi.meal_id = m.id
              ) fi
            ),
            'options', (
              SELECT COALESCE(jsonb_agg(row_to_json(mo)), '[]'::jsonb)
              FROM (
                SELECT id, meal_id, name, order_index
                FROM meal_options
                WHERE meal_id = m.id
                ORDER BY order_index
              ) mo
            ),
            'completion', (
              SELECT row_to_json(mc)
              FROM meal_completions mc
              WHERE mc.meal_id = m.id
                AND mc.client_id = p_client_id
                AND mc.date = p_date
              LIMIT 1
            )
          ) AS meal_obj,
          COALESCE(m.order_index, 0) AS ord
        FROM meals m
        WHERE m.meal_plan_id = v_plan_id
      ) sub
    ),
    'nutritionGoals', (
      SELECT COALESCE(jsonb_agg(row_to_json(g)), '[]'::jsonb)
      FROM (
        SELECT id, title, target_value, target_unit, current_value, progress_percentage
        FROM goals
        WHERE client_id = p_client_id
          AND pillar = 'nutrition'
          AND status = 'active'
      ) g
    ),
    'weeklyCompliance', (
      SELECT COALESCE(jsonb_agg(row_to_json(d) ORDER BY d.date), '[]'::jsonb)
      FROM (
        SELECT mc.date, COUNT(*)::int AS meals_completed
        FROM meal_completions mc
        WHERE mc.client_id = p_client_id
          AND mc.date >= v_week_start
          AND mc.date <= p_date
        GROUP BY mc.date
        ORDER BY mc.date
      ) d
    ),
    'allFoods', (
      SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::jsonb)
      FROM (
        SELECT id, name, serving_size, serving_unit, calories_per_serving, protein, carbs, fat
        FROM foods
        WHERE is_active IS NOT DISTINCT FROM true
        ORDER BY name
      ) f
    )
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_client_nutrition_page(uuid, date) IS
'Fuel page RPC: active assignment, meals/options/completions, nutrition goals, weekly compliance, foods list. Restricted to client or their coach.';

GRANT EXECUTE ON FUNCTION public.get_client_nutrition_page(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_nutrition_page(uuid, date) TO service_role;

-- ---------------------------------------------------------------------------
-- 3) get_coach_dashboard — coach_id is always auth.uid(); parameter ignored
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_coach_dashboard(p_coach_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id uuid := auth.uid();
BEGIN
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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
      WHERE cl.coach_id = v_coach_id
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
               JOIN clients cl ON cl.client_id = pa.client_id AND cl.coach_id = v_coach_id AND cl.status = 'active'
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
'Returns coach dashboard data in one call. Coach scope is always auth.uid(); p_coach_id parameter is ignored.';

GRANT EXECUTE ON FUNCTION public.get_coach_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_dashboard(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 4) get_workout_blocks — template owner, assigned workout, or active program schedule
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_workout_blocks(p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
          'hr_sets', COALESCE(
            (SELECT jsonb_agg(row_to_json(hr) ORDER BY hr.exercise_order, hr.id)
             FROM workout_hr_sets hr
             WHERE hr.set_entry_id = wse.id),
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
$$;

COMMENT ON FUNCTION public.get_workout_blocks(uuid) IS
'Returns workout set entries for a template with nested exercises and child tables. Restricted to template coach, client with assignment, or client with template on active program schedule.';

GRANT EXECUTE ON FUNCTION public.get_workout_blocks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_blocks(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 5) get_workout_set_logs_for_resume — caller must be the client
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_workout_set_logs_for_resume(
  p_client_id uuid,
  p_workout_log_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller IS DISTINCT FROM p_client_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM workout_logs wl
    WHERE wl.id = p_workout_log_id
      AND wl.client_id = p_client_id
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN (
    SELECT COALESCE(
      jsonb_agg(row_to_json(sl) ORDER BY sl.completed_at NULLS LAST),
      '[]'::jsonb
    )
    FROM (
      SELECT
        id,
        set_entry_id,
        exercise_id,
        set_number,
        round_number,
        set_type,
        weight,
        reps,
        rpe,
        completed_at,
        amrap_total_reps,
        amrap_duration_seconds,
        emom_minute_number,
        emom_total_reps_this_min,
        fortime_total_reps,
        fortime_time_taken_sec,
        preexhaust_isolation_exercise_id,
        preexhaust_isolation_weight,
        preexhaust_isolation_reps,
        preexhaust_compound_exercise_id,
        preexhaust_compound_weight,
        preexhaust_compound_reps,
        actual_time_seconds,
        actual_distance_meters,
        actual_hr_avg,
        actual_speed_kmh
      FROM workout_set_logs
      WHERE workout_log_id = p_workout_log_id
        AND client_id = p_client_id
    ) sl
  );
END;
$$;

COMMENT ON FUNCTION public.get_workout_set_logs_for_resume(uuid, uuid) IS
'Returns workout_set_logs rows for resume. Restricted to the owning client (auth.uid() = p_client_id).';

GRANT EXECUTE ON FUNCTION public.get_workout_set_logs_for_resume(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_set_logs_for_resume(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 6) get_workout_session_data — caller must be the client
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_workout_session_data(
  p_client_id uuid,
  p_assignment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_prog_assignment_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller IS DISTINCT FROM p_client_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id, program_assignment_id
  INTO v_log_id, v_prog_assignment_id
  FROM workout_logs
  WHERE client_id = p_client_id
    AND workout_assignment_id = p_assignment_id
    AND completed_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'session', (
      SELECT row_to_json(s)
      FROM (
        SELECT id, status, started_at, assignment_id, program_assignment_id, program_schedule_id
        FROM workout_sessions
        WHERE client_id = p_client_id
          AND assignment_id = p_assignment_id
          AND status = 'in_progress'
        ORDER BY started_at DESC
        LIMIT 1
      ) s
    ),
    'activeLog', (
      SELECT row_to_json(l)
      FROM (
        SELECT id, started_at, workout_session_id, program_assignment_id, program_schedule_id
        FROM workout_logs
        WHERE client_id = p_client_id
          AND workout_assignment_id = p_assignment_id
          AND completed_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1
      ) l
    ),
    'setLogs', (
      SELECT COALESCE(
        jsonb_agg(row_to_json(sl) ORDER BY (sl).completed_at NULLS LAST),
        '[]'::jsonb
      )
      FROM (
        SELECT
          id,
          set_entry_id,
          exercise_id,
          set_number,
          round_number,
          set_type,
          weight,
          reps,
          rpe,
          completed_at,
          amrap_total_reps,
          amrap_duration_seconds,
          emom_minute_number,
          emom_total_reps_this_min,
          fortime_total_reps,
          fortime_time_taken_sec,
          preexhaust_isolation_exercise_id,
          preexhaust_isolation_weight,
          preexhaust_isolation_reps,
          preexhaust_compound_exercise_id,
          preexhaust_compound_weight,
          preexhaust_compound_reps,
          actual_time_seconds,
          actual_distance_meters,
          actual_hr_avg,
          actual_speed_kmh
        FROM workout_set_logs
        WHERE workout_log_id = v_log_id
          AND client_id = p_client_id
      ) sl
    ),
    'blockCompletions', (
      SELECT COALESCE(jsonb_agg(row_to_json(bc)), '[]'::jsonb)
      FROM (
        SELECT workout_log_id, workout_set_entry_id, completed_at, completion_type
        FROM workout_set_entry_completions
        WHERE workout_log_id = v_log_id
      ) bc
    ),
    'dayCompletions', (
      SELECT COALESCE(jsonb_agg(program_schedule_id), '[]'::jsonb)
      FROM program_day_completions
      WHERE program_assignment_id = v_prog_assignment_id
    ),
    'coachId', (
      SELECT coach_id FROM clients WHERE client_id = p_client_id LIMIT 1
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_workout_session_data(uuid, uuid) IS
'Returns session/log/progress for workout start. Restricted to the owning client (auth.uid() = p_client_id).';

GRANT EXECUTE ON FUNCTION public.get_workout_session_data(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_session_data(uuid, uuid) TO service_role;
