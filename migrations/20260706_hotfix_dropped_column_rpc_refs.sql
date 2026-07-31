-- =============================================================================
-- Step 12 hotfix — RPCs/triggers still referencing dropped columns
-- Prerequisite: 20260705_step12_final_gated_drop.sql
-- Fixes: program_assignments.duration_weeks, workout_programs.duration_weeks,
--        training_blocks.goal (default-block trigger)
-- =============================================================================

-- ---------------------------------------------------------------------
-- 1) get_train_page_data — remove dropped pa/wp duration_weeks from SELECT
--    (durationWeeks already sourced from get_program_instance_week)
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

  SELECT pa.id, pa.program_id, pa.client_id, pa.status, pa.created_at,
         pa.start_date, pa.progression_mode, pa.coach_unlocked_week,
         pa.pause_status, pa.paused_at, pa.pause_accumulated_days,
         pa.timezone_snapshot,
         wp.name AS program_name
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
  'Train page. durationWeeks from get_program_instance_week (not dropped assignment/program columns).';

-- ---------------------------------------------------------------------
-- 2) copy_week_schedule — derive program duration from training_blocks sum
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.copy_week_schedule(
  p_program_id uuid,
  p_source_week integer,
  p_total_weeks integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_block_id UUID;
  v_block_start_week INTEGER;
  v_block_end_week INTEGER;
  v_running_weeks INTEGER := 0;
  v_block RECORD;
  v_program_duration INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.workout_programs wp
    WHERE wp.id = p_program_id
      AND (wp.coach_id = auth.uid() OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(SUM(tb.duration_weeks), 0)::integer
  INTO v_program_duration
  FROM public.training_blocks tb
  WHERE tb.program_id = p_program_id;

  IF v_program_duration IS NULL OR v_program_duration < 1 THEN
    RAISE EXCEPTION 'invalid program duration';
  END IF;

  IF p_source_week IS NULL OR p_source_week < 1 OR p_source_week > v_program_duration THEN
    RAISE EXCEPTION 'invalid_source_week';
  END IF;

  FOR v_block IN
    SELECT id, duration_weeks
    FROM training_blocks
    WHERE program_id = p_program_id
    ORDER BY block_order, created_at
  LOOP
    IF p_source_week > v_running_weeks AND p_source_week <= v_running_weeks + v_block.duration_weeks THEN
      v_source_block_id := v_block.id;
      v_block_start_week := v_running_weeks + 1;
      v_block_end_week := v_running_weeks + v_block.duration_weeks;
      EXIT;
    END IF;
    v_running_weeks := v_running_weeks + v_block.duration_weeks;
  END LOOP;

  IF v_source_block_id IS NULL THEN
    RAISE EXCEPTION 'Source week % is not covered by any block in program %', p_source_week, p_program_id;
  END IF;

  DELETE FROM program_progression_rules ppr
  USING program_schedule ps
  WHERE ppr.program_schedule_id = ps.id
    AND ps.program_id = p_program_id
    AND ps.week_number BETWEEN v_block_start_week AND v_block_end_week
    AND ps.week_number <> p_source_week;

  DELETE FROM program_schedule
  WHERE program_id = p_program_id
    AND week_number BETWEEN v_block_start_week AND v_block_end_week
    AND week_number <> p_source_week;

  INSERT INTO public.program_schedule (
    program_id,
    day_number,
    day_of_week,
    week_number,
    template_id,
    is_optional,
    created_at,
    updated_at
  )
  SELECT
    ps.program_id,
    COALESCE(ps.day_number, ps.day_of_week + 1),
    ps.day_of_week,
    w.week_number,
    ps.template_id,
    COALESCE(ps.is_optional, false),
    now(),
    now()
  FROM public.program_schedule ps
  CROSS JOIN generate_series(v_block_start_week, v_block_end_week) AS w(week_number)
  WHERE ps.program_id = p_program_id
    AND ps.week_number = p_source_week
    AND w.week_number <> p_source_week;
END;
$$;

COMMENT ON FUNCTION public.copy_week_schedule(uuid, integer, integer) IS
  'Copies schedule within block. Program duration = SUM(training_blocks.duration_weeks).';

-- ---------------------------------------------------------------------
-- 3) ensure_default_block_on_program_insert — no dropped goal / wp.duration_weeks
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_default_block_on_program_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM training_blocks WHERE program_id = NEW.id LIMIT 1
  ) THEN
    INSERT INTO training_blocks (
      program_id, name, phase_label, duration_weeks, block_order, created_at, updated_at
    )
    VALUES (NEW.id, 'Block 1', 'Block 1', 4, 1, now(), now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
