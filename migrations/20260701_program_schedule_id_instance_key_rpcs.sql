-- =====================================================================
-- PROGRAM SPINE REBUILD — STEP 12 Part 2
-- Migrate history-table RPC reads/writes to program_day_assignment_id.
-- Paste once in Supabase SQL editor (manual run).
--
-- Does NOT drop program_schedule_id columns or legacy indexes yet.
-- Keeps idx_unique_in_progress_session (program_schedule_id) until final pass.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Instance-keyed in-progress session dedup (parallel to legacy index)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_unique_in_progress_session_by_pda
  ON public.workout_sessions (client_id, program_assignment_id, program_day_assignment_id)
  WHERE status = 'in_progress';

COMMENT ON INDEX public.idx_unique_in_progress_session_by_pda IS
  'Step 12 Part 2: one in-progress program session per (client, assignment, instance day). Legacy idx_unique_in_progress_session retained until column drop pass.';

-- ---------------------------------------------------------------------
-- 2) Drop dead RPCs (no TS callers)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.advance_program_progress(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.advance_program_progress(uuid, uuid, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.cleanup_orphan_schedule(uuid, integer);

-- ---------------------------------------------------------------------
-- 3) get_workout_session_data — instance keys on session/log + dayCompletions
-- ---------------------------------------------------------------------
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
        SELECT id, status, started_at, assignment_id, program_assignment_id, program_day_assignment_id
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
        SELECT id, started_at, workout_session_id, program_assignment_id, program_day_assignment_id
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
          id, set_entry_id, exercise_id, set_number, round_number, set_type,
          weight, reps, rpe, completed_at,
          amrap_total_reps, amrap_duration_seconds,
          emom_minute_number, emom_total_reps_this_min,
          fortime_total_reps, fortime_time_taken_sec,
          preexhaust_isolation_exercise_id, preexhaust_isolation_weight, preexhaust_isolation_reps,
          preexhaust_compound_exercise_id, preexhaust_compound_weight, preexhaust_compound_reps,
          actual_time_seconds, actual_distance_meters, actual_hr_avg, actual_speed_kmh
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
      SELECT COALESCE(jsonb_agg(program_day_assignment_id), '[]'::jsonb)
      FROM program_day_completions
      WHERE program_assignment_id = v_prog_assignment_id
        AND program_day_assignment_id IS NOT NULL
    ),
    'coachId', (
      SELECT coach_id FROM clients WHERE client_id = p_client_id LIMIT 1
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_workout_session_data(uuid, uuid) IS
  'Workout start/resume bundle. Session/log keyed by program_day_assignment_id; dayCompletions aggregates instance ids.';

GRANT EXECUTE ON FUNCTION public.get_workout_session_data(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_session_data(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 4) get_train_page_data — instance schedule + instance completions
--    (Week X/N resolver unchanged from step 6)
-- ---------------------------------------------------------------------
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
  v_client_tz text;
  v_effective_start_date date;
  v_total_weeks int;
  v_current_week int;
  v_week_clamped boolean := false;
  v_week_row record;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller IS DISTINCT FROM p_client_id THEN
    SELECT EXISTS (
      SELECT 1 FROM clients
      WHERE client_id = p_client_id AND coach_id = v_caller
    ) INTO v_is_coach;
    IF NOT v_is_coach THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  SELECT pa.id, pa.program_id, pa.client_id, pa.status, pa.duration_weeks, pa.created_at,
         pa.start_date, pa.progression_mode, pa.coach_unlocked_week,
         pa.pause_status, pa.paused_at, pa.pause_accumulated_days,
         pa.timezone_snapshot,
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
            AND wa.program_assignment_id IS NULL
        ) w
      )
    );
  END IF;

  v_client_tz := COALESCE(
    NULLIF(v_program_assignment.timezone_snapshot, ''),
    (SELECT NULLIF(p.timezone, '') FROM public.profiles p WHERE p.id = p_client_id LIMIT 1),
    'UTC'
  );

  v_effective_start_date := COALESCE(
    v_program_assignment.start_date,
    v_program_assignment.created_at::date
  );

  SELECT current_week, total_weeks, clamped
  INTO v_week_row
  FROM public.get_program_instance_week(v_program_assignment.id, NULL);

  v_current_week := COALESCE(v_week_row.current_week, 1);
  v_total_weeks  := COALESCE(v_week_row.total_weeks, 0);
  v_week_clamped := COALESCE(v_week_row.clamped, false);

  SELECT cwr.coach_notes, cwr.reviewed_at
  INTO v_coach_review
  FROM coach_week_reviews cwr
  WHERE cwr.program_assignment_id = v_program_assignment.id
    AND cwr.week_number = v_current_week
  ORDER BY cwr.reviewed_at DESC
  LIMIT 1;

  result := jsonb_build_object(
    'hasProgram', true,
    'programName', v_program_assignment.program_name,
    'programId', v_program_assignment.program_id,
    'assignmentId', v_program_assignment.id,
    'assignmentStartDate', v_effective_start_date,
    'durationWeeks', v_total_weeks,
    'progressionMode', COALESCE(v_program_assignment.progression_mode, 'auto'),
    'coachUnlockedWeek', v_program_assignment.coach_unlocked_week,
    'currentProgramWeek', v_current_week,
    'currentProgramWeekClamped', v_week_clamped,
    'pauseStatus', v_program_assignment.pause_status,
    'pauseAccumulatedDays', COALESCE(v_program_assignment.pause_accumulated_days, 0),
    'pausedAt', v_program_assignment.paused_at,
    'timezoneSnapshot', v_client_tz,
    'coachReviewNotes', v_coach_review.coach_notes,
    'coachReviewDate', v_coach_review.reviewed_at,
    'schedule', (
      SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      FROM (
        SELECT
          pda.id,
          pda.week_number,
          pda.program_day AS day_number,
          GREATEST(0, LEAST(6, pda.program_day - 1)) AS day_of_week,
          COALESCE(pda.workout_template_id, pda.program_instance_workout_id) AS template_id,
          COALESCE(pda.is_optional, false) AS is_optional,
          COALESCE(wt.name, piw.name, pda.name) AS template_name,
          COALESCE(wt.estimated_duration, piw.estimated_duration, 0)::int AS estimated_duration,
          CASE
            WHEN pda.program_instance_workout_id IS NOT NULL THEN (
              SELECT COUNT(*)::int FROM program_instance_set_entry_exercises pisee
              JOIN program_instance_set_entries pise ON pise.id = pisee.program_instance_set_entry_id
              WHERE pise.program_instance_workout_id = pda.program_instance_workout_id
            )
            ELSE (
              SELECT COUNT(*)::int FROM workout_set_entry_exercises wsee
              JOIN workout_set_entries wse ON wse.id = wsee.set_entry_id
              WHERE wse.template_id = pda.workout_template_id
            )
          END AS exercise_count
        FROM program_day_assignments pda
        LEFT JOIN workout_templates wt ON wt.id = pda.workout_template_id
        LEFT JOIN program_instance_workouts piw ON piw.id = pda.program_instance_workout_id
        WHERE pda.program_assignment_id = v_program_assignment.id
        ORDER BY pda.week_number, pda.program_day
      ) s
    ),
    'completions', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM (
        SELECT pdc.program_day_assignment_id, pdc.completed_at
        FROM program_day_completions pdc
        WHERE pdc.program_assignment_id = v_program_assignment.id
          AND pdc.program_day_assignment_id IS NOT NULL
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
          AND wa.program_assignment_id IS NULL
      ) w
    )
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_train_page_data(uuid, integer) IS
  'Train page. schedule from program_day_assignments (id = instance key); completions use program_day_assignment_id. Week X/N via get_program_instance_week.';

GRANT EXECUTE ON FUNCTION public.get_train_page_data(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_train_page_data(uuid, integer) TO service_role;

-- ---------------------------------------------------------------------
-- 5) get_coach_dashboard — programCompliance via instance_adherence_for_week
--    (Full function from 20260316; only programCompliance block changed)
-- ---------------------------------------------------------------------
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
$$;

COMMENT ON FUNCTION public.get_coach_dashboard(uuid) IS
  'Coach dashboard. programCompliance uses instance_adherence_for_week (program_day_assignments + program_day_assignment_id).';

GRANT EXECUTE ON FUNCTION public.get_coach_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coach_dashboard(uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 5b) get_next_incomplete_program_slot — shared "today's workout" resolver
--     First incomplete PDA row (global order, coach-skip excluded).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_next_incomplete_program_slot(p_assignment_id uuid)
RETURNS TABLE (
  schedule_id uuid,
  template_id uuid,
  week_number integer,
  program_day integer,
  template_name text,
  template_description text,
  estimated_duration integer,
  total_sets bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_next_incomplete_program_slot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_incomplete_program_slot(uuid) TO service_role;
COMMENT ON FUNCTION public.get_next_incomplete_program_slot(uuid) IS
  'Next due program slot: first program_day_assignments row with no non-coach-skip completion, ordered by week_number, program_day.';

-- ---------------------------------------------------------------------
-- 6) get_client_dashboard — streak + todaysWorkout instance-keyed
--    (Base: step-6 body; streak filter + todaysWorkout from program_day_assignments)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_client_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_result JSONB;
  v_avatar_url TEXT;
  v_first_name TEXT;
  v_client_type TEXT;
  v_monday DATE;
  v_sunday DATE;
  v_monday_ts TIMESTAMPTZ;
  v_sunday_ts TIMESTAMPTZ;
  v_streak INT := 0;
  v_weekly_current INT := 0;
  v_weekly_goal INT := 0;
  v_weekly_volume NUMERIC := 0;
  v_weekly_time INT := 0;
  v_prs_count INT := 0;
  v_body_weight_current NUMERIC;
  v_body_weight_change NUMERIC;
  v_next_session JSONB;
  v_todays_workout JSONB;
  v_workout_days JSONB;
  v_today_wellness JSONB;
  v_checkin_streak INT := 0;
  v_prs_this_month INT := 0;
  v_latest_achievement JSONB;
  v_best_leaderboard JSONB;
  v_athlete_score JSONB;
  v_score_history JSONB;
  v_first_day DATE;
  v_last_day DATE;
  v_prog_total_slots INT;
  v_prog_completed_count INT;
  v_program_progress JSONB;
  v_active_pa_id UUID;
  v_active_prog_id UUID;
  v_resolver_week INT;
  v_resolver_total INT;
  v_adh RECORD;
BEGIN
  v_client_id := auth.uid();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_monday := date_trunc('week', CURRENT_DATE)::DATE;
  v_sunday := v_monday + INTERVAL '6 days';
  v_monday_ts := v_monday::TIMESTAMPTZ;
  v_sunday_ts := (v_sunday + INTERVAL '1 day')::TIMESTAMPTZ;
  v_first_day := date_trunc('month', CURRENT_DATE)::DATE;
  v_last_day := v_first_day + INTERVAL '1 month' - INTERVAL '1 day';

  SELECT avatar_url, first_name INTO v_avatar_url, v_first_name
  FROM profiles WHERE id = v_client_id;

  v_client_type := 'online';

  SELECT pa.id, pa.program_id
  INTO v_active_pa_id, v_active_prog_id
  FROM program_assignments pa
  WHERE pa.client_id = v_client_id AND pa.status = 'active'
  ORDER BY pa.created_at DESC LIMIT 1;

  IF v_active_pa_id IS NOT NULL THEN
    SELECT current_week, total_weeks
    INTO v_resolver_week, v_resolver_total
    FROM public.get_program_instance_week(v_active_pa_id, NULL);
    v_resolver_week := COALESCE(v_resolver_week, 1);
    v_resolver_total := COALESCE(v_resolver_total, 0);
  END IF;

  IF v_client_type = 'in_gym' THEN
    SELECT jsonb_build_object(
      'id', s.id, 'scheduled_at', s.scheduled_at, 'duration_minutes', s.duration_minutes,
      'title', s.title, 'coach_name', TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
    ) INTO v_next_session
    FROM sessions s
    LEFT JOIN profiles p ON p.id = s.coach_id
    WHERE s.client_id = v_client_id AND s.status = 'scheduled' AND s.scheduled_at > NOW()
    ORDER BY s.scheduled_at ASC LIMIT 1;
  END IF;

  IF v_active_pa_id IS NULL THEN
    v_streak := 0;
    v_weekly_current := 0;
    v_weekly_goal := 0;
  ELSE
    SELECT required, completed INTO v_adh
    FROM public.instance_adherence_for_week(v_active_pa_id, v_resolver_week);
    v_weekly_goal := COALESCE(v_adh.required, 0);
    v_weekly_current := COALESCE(v_adh.completed, 0);

    WITH workout_dates AS (
      SELECT DISTINCT DATE(ws.completed_at) AS workout_date
      FROM workout_sessions ws
      WHERE ws.client_id = v_client_id
        AND ws.status = 'completed'
        AND ws.completed_at IS NOT NULL
        AND ws.program_assignment_id = v_active_pa_id
        AND ws.program_day_assignment_id IS NOT NULL
    ),
    streak_calc AS (
      SELECT workout_date,
             workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::INT AS grp
      FROM workout_dates
      WHERE workout_date >= CURRENT_DATE - INTERVAL '365 days'
    )
    SELECT COUNT(*) INTO v_streak
    FROM streak_calc
    WHERE grp = (SELECT grp FROM streak_calc WHERE workout_date = CURRENT_DATE OR workout_date = CURRENT_DATE - 1 LIMIT 1);
    v_streak := COALESCE(v_streak, 0);
  END IF;

  WITH weekly_logs AS (
    SELECT id, total_duration_minutes FROM workout_logs
    WHERE client_id = v_client_id
      AND completed_at >= v_monday_ts AND completed_at < v_sunday_ts
      AND completed_at IS NOT NULL
  )
  SELECT
    COALESCE(SUM(total_duration_minutes), 0),
    (SELECT COALESCE(SUM((wsl.weight * wsl.reps)::NUMERIC), 0)
     FROM workout_set_logs wsl
     WHERE wsl.client_id = v_client_id AND wsl.workout_log_id IN (SELECT id FROM weekly_logs)
       AND wsl.weight IS NOT NULL AND wsl.reps IS NOT NULL)
  INTO v_weekly_time, v_weekly_volume FROM weekly_logs;
  v_weekly_volume := ROUND(v_weekly_volume / 1000, 1);

  WITH weekly_workout_days AS (
    SELECT DISTINCT
      CASE EXTRACT(DOW FROM completed_at) WHEN 0 THEN 6 ELSE EXTRACT(DOW FROM completed_at)::INT - 1 END AS day_index
    FROM workout_logs
    WHERE client_id = v_client_id
      AND completed_at >= v_monday_ts AND completed_at < v_sunday_ts
      AND completed_at IS NOT NULL
  )
  SELECT jsonb_agg(day_index ORDER BY day_index) INTO v_workout_days FROM weekly_workout_days;
  v_workout_days := COALESCE(v_workout_days, '[]'::jsonb);

  SELECT COUNT(DISTINCT exercise_id) INTO v_prs_count
  FROM user_exercise_metrics
  WHERE user_id = v_client_id AND (best_weight IS NOT NULL OR best_volume IS NOT NULL);
  v_prs_count := COALESCE(v_prs_count, 0);

  WITH recent_weights AS (
    SELECT weight_kg, measured_date FROM body_metrics
    WHERE client_id = v_client_id AND weight_kg IS NOT NULL
    ORDER BY measured_date DESC LIMIT 2
  )
  SELECT
    (SELECT weight_kg FROM recent_weights ORDER BY measured_date DESC LIMIT 1),
    (SELECT weight_kg FROM recent_weights ORDER BY measured_date DESC LIMIT 1) -
    COALESCE((SELECT weight_kg FROM recent_weights ORDER BY measured_date DESC OFFSET 1 LIMIT 1),
             (SELECT weight_kg FROM recent_weights ORDER BY measured_date DESC LIMIT 1))
  INTO v_body_weight_current, v_body_weight_change;

  SELECT row_to_json(dwl) INTO v_today_wellness
  FROM daily_wellness_logs dwl
  WHERE dwl.client_id = v_client_id AND dwl.log_date = CURRENT_DATE
  LIMIT 1;

  WITH wellness_dates AS (
    SELECT log_date
    FROM daily_wellness_logs
    WHERE client_id = v_client_id
      AND log_date <= CURRENT_DATE
      AND sleep_hours IS NOT NULL AND sleep_quality IS NOT NULL
      AND stress_level IS NOT NULL AND soreness_level IS NOT NULL
    ORDER BY log_date DESC
    LIMIT 365
  ),
  streak_grp AS (
    SELECT log_date,
           log_date - (ROW_NUMBER() OVER (ORDER BY log_date DESC))::INT AS grp
    FROM wellness_dates
  ),
  current_grp AS (
    SELECT grp FROM streak_grp WHERE log_date >= CURRENT_DATE - 1 LIMIT 1
  )
  SELECT COUNT(*)::INT INTO v_checkin_streak
  FROM streak_grp
  WHERE grp = (SELECT grp FROM current_grp);
  v_checkin_streak := COALESCE(v_checkin_streak, 0);

  SELECT COUNT(*)::INT INTO v_prs_this_month
  FROM personal_records
  WHERE client_id = v_client_id
    AND achieved_date >= v_first_day AND achieved_date <= v_last_day;

  SELECT jsonb_build_object(
    'name', COALESCE(at.name, 'Achievement'),
    'icon', at.icon,
    'tier', ua.tier
  ) INTO v_latest_achievement
  FROM user_achievements ua
  LEFT JOIN achievement_templates at ON at.id = ua.achievement_template_id
  WHERE ua.client_id = v_client_id
  ORDER BY ua.achieved_date DESC, ua.earned_at DESC NULLS LAST
  LIMIT 1;

  SELECT jsonb_build_object(
    'rank', le.rank,
    'exerciseName', e.name
  ) INTO v_best_leaderboard
  FROM (
    SELECT rank, exercise_id
    FROM leaderboard_entries
    WHERE client_id = v_client_id AND rank <= 10
    ORDER BY rank ASC
    LIMIT 1
  ) le
  LEFT JOIN exercises e ON e.id = le.exercise_id;

  SELECT jsonb_build_object(
    'id', s.id,
    'score', s.score,
    'tier', s.tier,
    'trainingScore', s.training_score,
    'trainingCompletionScore', s.training_completion_score,
    'trainingExecutionScore', s.training_execution_score,
    'recoveryScore', s.recovery_score,
    'recoverySleepScore', s.recovery_sleep_score,
    'recoveryStepsScore', s.recovery_steps_score,
    'nutritionScore', s.nutrition_score,
    'extrasScore', s.extras_score,
    'windowStart', s.window_start::text,
    'windowEnd', s.window_end::text,
    'calculatedAt', s.calculated_at::text
  ) INTO v_athlete_score
  FROM (
    SELECT id, score, tier, training_score, training_completion_score, training_execution_score,
           recovery_score, recovery_sleep_score, recovery_steps_score,
           nutrition_score, extras_score, window_start, window_end, calculated_at
    FROM athlete_scores
    WHERE client_id = v_client_id
    ORDER BY calculated_at DESC
    LIMIT 1
  ) s;

  SELECT COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('date', (t.calculated_at::date)::text, 'score', t.score) ORDER BY t.calculated_at ASC)
     FROM (
       SELECT calculated_at, score
       FROM (
         SELECT calculated_at, score
         FROM athlete_scores
         WHERE client_id = v_client_id
         ORDER BY window_start DESC NULLS LAST, calculated_at DESC
         LIMIT 4
       ) sub
       ORDER BY calculated_at ASC
     ) t),
    '[]'::jsonb
  ) INTO v_score_history;

  -- todaysWorkout: global next incomplete instance slot (no program_progress pointer).
  DECLARE
    v_program_assignment RECORD;
    v_schedule_row RECORD;
  BEGIN
    SELECT pa.id, pa.program_id, pa.name AS program_name INTO v_program_assignment
    FROM program_assignments pa
    WHERE pa.client_id = v_client_id AND pa.status = 'active'
    ORDER BY pa.created_at DESC LIMIT 1;

    IF v_program_assignment.id IS NOT NULL THEN
      SELECT
        slot.schedule_id,
        slot.template_id,
        slot.week_number,
        slot.program_day AS day_number,
        slot.template_name,
        slot.estimated_duration,
        slot.total_sets
      INTO v_schedule_row
      FROM public.get_next_incomplete_program_slot(v_program_assignment.id) slot;

      IF v_schedule_row.schedule_id IS NOT NULL THEN
        v_todays_workout := jsonb_build_object(
          'hasWorkout', true, 'type', 'program',
          'templateId', v_schedule_row.template_id, 'scheduleId', v_schedule_row.schedule_id,
          'name', COALESCE(v_schedule_row.template_name, v_program_assignment.program_name),
          'weekNumber', v_schedule_row.week_number, 'dayNumber', v_schedule_row.day_number,
          'totalSets', COALESCE(v_schedule_row.total_sets, 0),
          'estimatedDuration', COALESCE(v_schedule_row.estimated_duration, 45)
        );
      END IF;
    END IF;

    IF v_todays_workout IS NULL THEN
      SELECT jsonb_build_object(
        'hasWorkout', true, 'type', 'assignment', 'assignmentId', wa.id,
        'templateId', wa.workout_template_id, 'name', COALESCE(wa.name, wt.name, 'Workout'),
        'totalSets', (SELECT COUNT(*) FROM workout_set_entries WHERE template_id = wa.workout_template_id),
        'estimatedDuration', COALESCE(wt.estimated_duration, 45)
      ) INTO v_todays_workout
      FROM workout_assignments wa
      LEFT JOIN workout_templates wt ON wt.id = wa.workout_template_id
      WHERE wa.client_id = v_client_id AND wa.status IN ('assigned', 'active')
      ORDER BY wa.scheduled_date DESC NULLS LAST, wa.created_at DESC LIMIT 1;
    END IF;

    IF v_todays_workout IS NULL THEN
      v_todays_workout := jsonb_build_object('hasWorkout', false, 'message', 'No workout assigned');
    END IF;
  END;

  IF v_active_pa_id IS NOT NULL AND v_active_prog_id IS NOT NULL THEN
    SELECT COUNT(*)::INT INTO v_prog_total_slots
    FROM program_day_assignments
    WHERE program_assignment_id = v_active_pa_id
      AND COALESCE(is_optional, false) = false;
    SELECT COUNT(DISTINCT pdc.program_day_assignment_id)::INT INTO v_prog_completed_count
    FROM program_day_completions pdc
    WHERE pdc.program_assignment_id = v_active_pa_id
      AND pdc.program_day_assignment_id IS NOT NULL
      AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%';
    v_prog_total_slots := COALESCE(v_prog_total_slots, 0);
    v_prog_completed_count := COALESCE(v_prog_completed_count, 0);
    v_program_progress := jsonb_build_object(
      'currentWeek', COALESCE(v_resolver_week, 1),
      'totalWeeks', COALESCE(v_resolver_total, 0),
      'completedCount', v_prog_completed_count,
      'totalSlots', v_prog_total_slots,
      'percent', CASE WHEN v_prog_total_slots > 0 THEN ROUND((v_prog_completed_count::NUMERIC / v_prog_total_slots) * 100)::INT ELSE 0 END
    );
  ELSE
    v_program_progress := NULL;
  END IF;

  v_result := jsonb_build_object(
    'avatarUrl', v_avatar_url, 'firstName', v_first_name, 'clientType', v_client_type,
    'nextSession', v_next_session, 'streak', v_streak,
    'weeklyProgress', jsonb_build_object('current', v_weekly_current, 'goal', v_weekly_goal),
    'weeklyStats', jsonb_build_object('volume', v_weekly_volume, 'time', v_weekly_time, 'prsCount', v_prs_count),
    'workoutDays', v_workout_days,
    'bodyWeight', CASE WHEN v_body_weight_current IS NOT NULL THEN
      jsonb_build_object('current', v_body_weight_current, 'change', COALESCE(v_body_weight_change, 0)) ELSE NULL END,
    'todaysWorkout', v_todays_workout,
    'todayWellnessLog', v_today_wellness,
    'checkinStreak', v_checkin_streak,
    'highlights', jsonb_build_object(
      'prsThisMonth', COALESCE(v_prs_this_month, 0),
      'latestAchievement', v_latest_achievement,
      'bestLeaderboardRank', v_best_leaderboard
    ),
    'athleteScore', v_athlete_score,
    'scoreHistory', v_score_history,
    'programProgress', v_program_progress
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_dashboard() TO authenticated;
COMMENT ON FUNCTION public.get_client_dashboard() IS
  'Client dashboard. weeklyProgress + programProgress from get_program_instance_week and instance_adherence_for_week. todaysWorkout = get_next_incomplete_program_slot (ledger-derived).';

-- ---------------------------------------------------------------------
-- 6b) get_client_workout_summary — todaysWorkout from instance schedule
--     (Base: step-6 body; only todaysWorkout slot migrated off program_schedule)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_client_workout_summary();

CREATE OR REPLACE FUNCTION public.get_client_workout_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_result JSONB;
  v_avatar_url TEXT;
  v_todays_workout JSONB;
  v_current_program JSONB;
  v_weekly_progress JSONB;
  v_weekly_stats JSONB;
  v_all_time_volume NUMERIC;
  v_workout_history JSONB;
  v_all_assigned_workouts JSONB;
  v_this_week_assignments JSONB;
  v_completed_programs JSONB;
  v_assignment_id_by_template JSONB;
  v_schedule_id_by_template JSONB;
  v_monday DATE;
  v_sunday DATE;
  v_active_program_assignment RECORD;
  v_current_schedule_row RECORD;
  v_resolver_week INT;
  v_resolver_total INT;
  v_adh RECORD;
BEGIN
  v_client_id := auth.uid();
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_monday := date_trunc('week', CURRENT_DATE)::DATE;
  v_sunday := v_monday + INTERVAL '6 days';

  SELECT avatar_url INTO v_avatar_url FROM profiles WHERE id = v_client_id;

  SELECT
    pa.id, pa.program_id, pa.coach_id, pa.name, pa.description, pa.status,
    pa.start_date,
    wp.name AS program_name, wp.description AS program_description,
    wp.difficulty_level
  INTO v_active_program_assignment
  FROM program_assignments pa
  LEFT JOIN workout_programs wp ON wp.id = pa.program_id
  WHERE pa.client_id = v_client_id AND pa.status = 'active'
  ORDER BY pa.created_at DESC
  LIMIT 1;

  IF v_active_program_assignment.id IS NOT NULL THEN
    SELECT current_week, total_weeks
    INTO v_resolver_week, v_resolver_total
    FROM public.get_program_instance_week(v_active_program_assignment.id, NULL);
    v_resolver_week := COALESCE(v_resolver_week, 1);
    v_resolver_total := COALESCE(v_resolver_total, 0);

    SELECT
      slot.schedule_id,
      slot.template_id,
      slot.week_number,
      slot.program_day AS day_of_week,
      (slot.program_day - 1) AS day_index,
      slot.template_name,
      slot.template_description,
      slot.estimated_duration
    INTO v_current_schedule_row
    FROM public.get_next_incomplete_program_slot(v_active_program_assignment.id) slot;
  END IF;

  IF v_current_schedule_row.schedule_id IS NOT NULL THEN
    v_todays_workout := jsonb_build_object(
      'hasWorkout', true,
      'templateId', v_current_schedule_row.template_id,
      'scheduleId', v_current_schedule_row.schedule_id,
      'templateName', COALESCE(v_active_program_assignment.program_name, 'Program'),
      'templateDescription', '',
      'weekNumber', v_current_schedule_row.week_number,
      'programDay', v_current_schedule_row.day_of_week,
      'estimatedDuration', COALESCE(v_current_schedule_row.estimated_duration, 45),
      'message', 'Week ' || v_current_schedule_row.week_number || ' • Day ' || v_current_schedule_row.day_of_week || ' ready!',
      'weekLabel', 'Week ' || v_current_schedule_row.week_number,
      'dayLabel', 'Day ' || v_current_schedule_row.day_of_week,
      'currentWeekIndex', GREATEST(0, v_current_schedule_row.week_number - 1),
      'currentDayIndex', GREATEST(0, v_current_schedule_row.day_of_week - 1)
    );
  ELSE
    SELECT jsonb_build_object(
      'hasWorkout', true,
      'templateId', wa.workout_template_id,
      'templateName', COALESCE(wa.name, 'Workout'),
      'templateDescription', COALESCE(wa.description, ''),
      'weekNumber', 1,
      'programDay', 1,
      'message', 'Workout ready!'
    ) INTO v_todays_workout
    FROM workout_assignments wa
    WHERE wa.client_id = v_client_id AND wa.status IN ('assigned', 'active')
    ORDER BY wa.scheduled_date DESC NULLS LAST, wa.created_at DESC
    LIMIT 1;

    IF v_todays_workout IS NULL THEN
      v_todays_workout := jsonb_build_object(
        'hasWorkout', false,
        'message', 'No active workout assigned. Contact your coach to get started!'
      );
    END IF;
  END IF;

  IF v_active_program_assignment.id IS NOT NULL THEN
    DECLARE
      v_total_days INT;
      v_completed_days INT;
      v_progress_pct NUMERIC;
      v_coach_name TEXT;
    BEGIN
      SELECT COUNT(*) INTO v_total_days
      FROM program_day_assignments
      WHERE program_assignment_id = v_active_program_assignment.id
        AND COALESCE(is_optional, false) = false;

      SELECT COUNT(DISTINCT pdc.program_day_assignment_id) INTO v_completed_days
      FROM program_day_completions pdc
      WHERE pdc.program_assignment_id = v_active_program_assignment.id
        AND pdc.program_day_assignment_id IS NOT NULL
        AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%';

      IF v_total_days > 0 THEN
        v_progress_pct := ROUND((v_completed_days::NUMERIC / v_total_days) * 100, 1);
      ELSE
        v_progress_pct := 0;
      END IF;

      SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
      INTO v_coach_name FROM profiles WHERE id = v_active_program_assignment.coach_id;

      v_current_program := jsonb_build_object(
        'id', v_active_program_assignment.program_id,
        'name', COALESCE(v_active_program_assignment.program_name, 'Program'),
        'description', v_active_program_assignment.program_description,
        'current_week', v_resolver_week,
        'total_weeks', v_resolver_total,
        'progress_percentage', v_progress_pct,
        'difficulty_level', v_active_program_assignment.difficulty_level,
        'coach_name', COALESCE(NULLIF(v_coach_name, ''), 'Your Coach')
      );
    END;
  ELSE
    v_current_program := NULL;
  END IF;

  DECLARE
    v_weekly_goal INT := 0;
    v_weekly_completed INT := 0;
    v_weekly_volume NUMERIC := 0;
    v_weekly_time INT := 0;
  BEGIN
    SELECT
      COALESCE(SUM(wl.total_duration_minutes) FILTER (WHERE wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day'), 0)::INT,
      COALESCE(SUM(wl.total_weight_lifted) FILTER (WHERE wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day'), 0)::NUMERIC
    INTO v_weekly_time, v_weekly_volume
    FROM workout_logs wl
    WHERE wl.client_id = v_client_id AND wl.completed_at IS NOT NULL;

    IF v_active_program_assignment.id IS NOT NULL THEN
      SELECT required, completed INTO v_adh
      FROM public.instance_adherence_for_week(v_active_program_assignment.id, v_resolver_week);
      v_weekly_goal := COALESCE(v_adh.required, 0);
      v_weekly_completed := COALESCE(v_adh.completed, 0);
    END IF;

    IF v_weekly_goal = 0 AND v_active_program_assignment.id IS NULL THEN
      SELECT COUNT(*) INTO v_weekly_goal
      FROM workout_assignments
      WHERE client_id = v_client_id
        AND scheduled_date >= v_monday AND scheduled_date <= v_sunday;
      SELECT COUNT(*) INTO v_weekly_completed
      FROM workout_logs wl
      WHERE wl.client_id = v_client_id AND wl.completed_at IS NOT NULL
        AND wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day';
    END IF;

    v_weekly_progress := jsonb_build_object('current', v_weekly_completed, 'goal', v_weekly_goal);
    v_weekly_stats := jsonb_build_object('totalVolume', ROUND(v_weekly_volume), 'activeTime', v_weekly_time);
  END;

  SELECT COALESCE(SUM(total_weight_lifted), 0)::NUMERIC
  INTO v_all_time_volume
  FROM workout_logs
  WHERE client_id = v_client_id AND completed_at IS NOT NULL;

  SELECT COALESCE(jsonb_agg(history_row ORDER BY completed_at DESC), '[]'::jsonb)
  INTO v_workout_history
  FROM (
    SELECT jsonb_build_object(
      'hasWorkout', true,
      'templateId', wa.workout_template_id,
      'templateName', COALESCE(wa.name, 'Completed Workout'),
      'templateDescription', '',
      'weekNumber', 0,
      'programDay', 0,
      'estimatedDuration', wl.total_duration_minutes,
      'difficultyLevel', 'intermediate',
      'exercises', '[]'::jsonb,
      'generatedAt', wl.completed_at,
      'message', 'Workout completed',
      'completed', true,
      'completedAt', wl.completed_at
    ) AS history_row,
    wl.completed_at
    FROM workout_logs wl
    LEFT JOIN workout_assignments wa ON wa.id = wl.workout_assignment_id
    WHERE wl.client_id = v_client_id AND wl.completed_at IS NOT NULL
    ORDER BY wl.completed_at DESC
    LIMIT 7
  ) sub;

  WITH workout_assignments_enriched AS (
    SELECT wa.id, wa.workout_template_id, wa.scheduled_date, wa.assigned_date, wa.status,
      wa.name, wa.description, wa.coach_id, wa.created_at, 'workout' AS type,
      jsonb_build_object('id', wa.workout_template_id, 'name', COALESCE(wa.name, 'Workout'), 'description', wa.description) AS workout_templates,
      jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name, 'avatar_url', p.avatar_url) AS profiles
    FROM workout_assignments wa
    LEFT JOIN profiles p ON p.id = wa.coach_id
    WHERE wa.client_id = v_client_id AND wa.status IN ('assigned', 'active', 'in_progress')
  ),
  program_assignments_enriched AS (
    SELECT pa.id, pa.program_id AS workout_template_id, pa.start_date AS scheduled_date,
      pa.start_date AS assigned_date, pa.status, COALESCE(pa.name, wp.name) AS name,
      COALESCE(pa.description, wp.description) AS description, pa.coach_id, pa.created_at, 'program' AS type,
      jsonb_build_object('id', pa.program_id, 'name', COALESCE(pa.name, wp.name, 'Program'),
        'description', COALESCE(pa.description, wp.description),
        'duration_weeks', COALESCE(wk.total_weeks, 0)) AS workout_templates,
      jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name, 'avatar_url', p.avatar_url) AS profiles
    FROM program_assignments pa
    LEFT JOIN workout_programs wp ON wp.id = pa.program_id
    LEFT JOIN profiles p ON p.id = pa.coach_id
    CROSS JOIN LATERAL public.get_program_instance_week(pa.id, NULL) wk
    WHERE pa.client_id = v_client_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', id, 'workout_template_id', workout_template_id, 'scheduled_date', scheduled_date,
      'assigned_date', assigned_date, 'status', status, 'name', name, 'description', description,
      'coach_id', coach_id, 'created_at', created_at, 'type', type,
      'workout_templates', workout_templates, 'profiles', profiles) ORDER BY created_at DESC
  ), '[]'::jsonb)
  INTO v_all_assigned_workouts
  FROM (SELECT * FROM workout_assignments_enriched UNION ALL SELECT * FROM program_assignments_enriched) combined;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', wa.id, 'workout_template_id', wa.workout_template_id, 'scheduled_date', wa.scheduled_date,
      'status', wa.status, 'name', wa.name, 'completed', wl.id IS NOT NULL,
      'completed_at', wl.completed_at, 'duration_minutes', wl.total_duration_minutes)
  ), '[]'::jsonb)
  INTO v_this_week_assignments
  FROM workout_assignments wa
  LEFT JOIN workout_logs wl ON wl.workout_assignment_id = wa.id
    AND wl.completed_at IS NOT NULL AND wl.completed_at >= v_monday AND wl.completed_at <= v_sunday + INTERVAL '1 day'
  WHERE wa.client_id = v_client_id AND wa.scheduled_date >= v_monday AND wa.scheduled_date <= v_sunday;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', pa.id, 'program_id', pa.program_id, 'name', COALESCE(pa.name, wp.name), 'completed_at', pa.updated_at)
  ), '[]'::jsonb)
  INTO v_completed_programs
  FROM program_assignments pa
  LEFT JOIN workout_programs wp ON wp.id = pa.program_id
  WHERE pa.client_id = v_client_id AND pa.status = 'completed';

  SELECT COALESCE(jsonb_object_agg(workout_template_id, id), '{}'::jsonb)
  INTO v_assignment_id_by_template
  FROM workout_assignments
  WHERE client_id = v_client_id AND status IN ('assigned', 'active', 'in_progress');

  IF v_current_schedule_row.schedule_id IS NOT NULL THEN
    v_schedule_id_by_template := jsonb_build_object(
      v_current_schedule_row.template_id::TEXT, v_current_schedule_row.schedule_id
    );
  ELSE
    v_schedule_id_by_template := '{}'::jsonb;
  END IF;

  v_result := jsonb_build_object(
    'avatarUrl', v_avatar_url,
    'todaysWorkout', v_todays_workout,
    'currentProgram', v_current_program,
    'workoutHistory', v_workout_history,
    'completedPrograms', v_completed_programs,
    'upcomingWorkouts', '[]'::jsonb,
    'allAssignedWorkouts', v_all_assigned_workouts,
    'weeklyProgress', v_weekly_progress,
    'weeklyStats', v_weekly_stats,
    'allTimeVolume', ROUND(v_all_time_volume),
    'thisWeekAssignments', v_this_week_assignments,
    'assignmentIdByTemplate', v_assignment_id_by_template,
    'scheduleIdByTemplate', v_schedule_id_by_template
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_workout_summary() TO authenticated;
COMMENT ON FUNCTION public.get_client_workout_summary() IS
  'Client workout summary. todaysWorkout = get_next_incomplete_program_slot. currentProgram/weeklyProgress instance-keyed via resolver.';

-- ---------------------------------------------------------------------
-- 7) get_next_due_workout — instance-keyed next slot (optional RPC)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_next_due_workout(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pa record;
  v_slot record;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_caller IS DISTINCT FROM p_client_id THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT pa.id, pa.program_id, wp.name AS program_name
  INTO v_pa
  FROM program_assignments pa
  JOIN workout_programs wp ON wp.id = pa.program_id
  WHERE pa.client_id = p_client_id AND pa.status = 'active'
  ORDER BY pa.created_at DESC
  LIMIT 1;

  IF v_pa.id IS NULL THEN
    RETURN jsonb_build_object('hasWorkout', false, 'message', 'No active program assigned.');
  END IF;

  SELECT pda.id AS schedule_id,
         COALESCE(pda.workout_template_id, pda.program_instance_workout_id) AS template_id,
         pda.week_number,
         pda.program_day AS day_number,
         COALESCE(wt.name, piw.name, pda.name, 'Workout') AS template_name
  INTO v_slot
  FROM program_day_assignments pda
  LEFT JOIN workout_templates wt ON wt.id = pda.workout_template_id
  LEFT JOIN program_instance_workouts piw ON piw.id = pda.program_instance_workout_id
  WHERE pda.program_assignment_id = v_pa.id
    AND NOT EXISTS (
      SELECT 1 FROM program_day_completions pdc
      WHERE pdc.program_day_assignment_id = pda.id
        AND pdc.program_assignment_id = v_pa.id
        AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%'
    )
  ORDER BY pda.week_number, pda.program_day
  LIMIT 1;

  IF v_slot.schedule_id IS NULL THEN
    RETURN jsonb_build_object('hasWorkout', false, 'weekCompleted', true, 'message', 'Program completed.');
  END IF;

  RETURN jsonb_build_object(
    'hasWorkout', true,
    'scheduleId', v_slot.schedule_id,
    'templateId', v_slot.template_id,
    'weekNumber', v_slot.week_number,
    'dayNumber', v_slot.day_number,
    'templateName', v_slot.template_name,
    'programName', v_pa.program_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_due_workout(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_due_workout(uuid) TO service_role;
