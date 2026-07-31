-- =============================================================================
-- Migration: 20260531_get_train_page_data_exclude_program_execution_extra_workouts.sql
--
-- PR 2 / A4 — Reader update for the program_assignment_id discriminator.
--
-- Purpose:
--   The Train page "Extra Training" list is built from the `extraWorkouts`
--   subqueries of get_train_page_data(). Those subqueries currently return ALL
--   workout_assignments for the client at status assigned/in_progress, which
--   includes program-execution rows (program_assignment_id IS NOT NULL) created
--   by client Start / coach pickup. Those rows are NOT genuine standalone extras
--   and should not appear as "Extra Training".
--
--   This migration CREATE OR REPLACEs get_train_page_data with the SAME body as
--   the live definition (migration 20260420_calendar_based_program_week_unlock),
--   adding exactly one predicate to EACH of the two extraWorkouts subqueries:
--
--       AND wa.program_assignment_id IS NULL
--
--   (1) no-program branch  (hasProgram = false)
--   (2) has-program branch (hasProgram = true)
--
--   NOTHING ELSE in the returned payload changes. schedule, completions, and all
--   program/pause/week fields are byte-identical to 20260420. workout_assignments
--   is read ONLY in these two extraWorkouts subqueries within this function.
--
-- Base version confirmed:
--   20260420_calendar_based_program_week_unlock.sql holds the latest
--   CREATE OR REPLACE of get_train_page_data; no later migration redefines it.
--
-- Idempotent: CREATE OR REPLACE; safe to re-run. Existing privileges are
--   preserved by REPLACE; GRANTs/COMMENT re-stated for completeness.
-- =============================================================================

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
  v_current_week_raw int;
  v_current_week int;
  v_week_clamped boolean := false;
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

  v_total_weeks := COALESCE(
    v_program_assignment.duration_weeks,
    v_program_assignment.wp_duration_weeks,
    4
  );

  v_current_week_raw := public.compute_program_current_week(
    v_effective_start_date,
    v_program_assignment.pause_accumulated_days,
    v_program_assignment.pause_status,
    v_program_assignment.paused_at,
    v_client_tz,
    NULL
  );

  v_current_week := GREATEST(1, v_current_week_raw);
  IF v_total_weeks IS NOT NULL AND v_current_week > v_total_weeks THEN
    v_current_week := v_total_weeks;
    v_week_clamped := true;
  END IF;

  -- Coach review notes for the calendar-derived current week
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
          AND wa.program_assignment_id IS NULL
      ) w
    )
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_train_page_data(uuid, integer) IS
  'Returns Train page data. assignmentStartDate uses pa.start_date (fallback created_at::date). currentProgramWeek is calendar-derived via compute_program_current_week and is authoritative for week unlock. coachUnlockedWeek retained in payload for legacy callers but not authoritative. extraWorkouts excludes program-execution rows (program_assignment_id IS NOT NULL) so only genuine standalone coach extras appear.';

GRANT EXECUTE ON FUNCTION public.get_train_page_data(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_train_page_data(uuid, integer) TO service_role;

-- =============================================================================
-- End of migration 20260531_get_train_page_data_exclude_program_execution_extra_workouts.sql
-- =============================================================================
