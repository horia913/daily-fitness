-- Extend get_coach_client_training: program metadata, Mon–Sun strip, recent completed sessions (coach–client checked once at top).

CREATE OR REPLACE FUNCTION public.get_coach_client_training(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach uuid := auth.uid();
  v_ok int;
  v_pa record;
  v_week int;
  v_required int := 0;
  v_completed int := 0;
  v_program_name text;
  v_duration_weeks int;
  v_week_days jsonb := '[]'::jsonb;
  v_d int;
  v_slot_ids uuid[];
  v_need int;
  v_done int;
  v_recent jsonb;
BEGIN
  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT 1 INTO v_ok
  FROM public.clients c
  WHERE c.coach_id = v_coach AND c.client_id = p_client_id
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT pa.* INTO v_pa
  FROM public.program_assignments pa
  WHERE pa.client_id = p_client_id AND pa.status = 'active'
  ORDER BY pa.updated_at DESC NULLS LAST, pa.created_at DESC
  LIMIT 1;

  IF v_pa.id IS NOT NULL THEN
    SELECT wp.name, wp.duration_weeks
    INTO v_program_name, v_duration_weeks
    FROM public.workout_programs wp
    WHERE wp.id = v_pa.program_id
    LIMIT 1;

    v_week := COALESCE(
      (SELECT pp.current_week_number FROM public.program_progress pp
       WHERE pp.program_assignment_id = v_pa.id LIMIT 1),
      CASE
        WHEN COALESCE(v_pa.progression_mode, 'auto') = 'coach_managed'
          AND v_pa.coach_unlocked_week IS NOT NULL
        THEN v_pa.coach_unlocked_week
        ELSE 1
      END
    );

    SELECT COUNT(*)::int INTO v_required
    FROM public.program_schedule ps
    WHERE ps.program_id = v_pa.program_id
      AND ps.week_number = v_week
      AND COALESCE(ps.is_optional, false) = false;

    SELECT COUNT(*)::int INTO v_completed
    FROM public.program_day_completions pdc
    JOIN public.program_schedule ps ON ps.id = pdc.program_schedule_id
    WHERE pdc.program_assignment_id = v_pa.id
      AND ps.week_number = v_week
      AND COALESCE(ps.is_optional, false) = false
      AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%';

    FOR v_d IN 0..6 LOOP
      SELECT array_agg(ps.id) INTO v_slot_ids
      FROM public.program_schedule ps
      WHERE ps.program_id = v_pa.program_id
        AND ps.week_number = v_week
        AND COALESCE(ps.is_optional, false) = false
        AND ps.day_of_week = v_d;

      IF v_slot_ids IS NULL OR cardinality(v_slot_ids) = 0 THEN
        v_week_days := v_week_days || jsonb_build_array(
          jsonb_build_object('dow', v_d, 'hasSlot', false, 'done', false)
        );
      ELSE
        v_need := cardinality(v_slot_ids);
        SELECT COUNT(DISTINCT pdc.program_schedule_id)::int INTO v_done
        FROM public.program_day_completions pdc
        WHERE pdc.program_assignment_id = v_pa.id
          AND pdc.program_schedule_id = ANY(v_slot_ids)
          AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%';
        v_week_days := v_week_days || jsonb_build_array(
          jsonb_build_object(
            'dow', v_d,
            'hasSlot', true,
            'done', (v_done >= v_need)
          )
        );
      END IF;
    END LOOP;
  END IF;

  SELECT COALESCE(
    jsonb_agg(q.obj ORDER BY q.completed_at DESC),
    '[]'::jsonb
  ) INTO v_recent
  FROM (
    SELECT
      wl.completed_at,
      jsonb_build_object(
        'logId', wl.id,
        'completedAt', wl.completed_at,
        'workoutName', COALESCE(wt.name, 'Workout'),
        'durationMinutes', wl.total_duration_minutes,
        'setsCompleted', wl.total_sets_completed,
        'weightLifted', wl.total_weight_lifted,
        'templateId', wt.id
      ) AS obj
    FROM public.workout_logs wl
    LEFT JOIN public.workout_assignments wa ON wa.id = wl.workout_assignment_id
    LEFT JOIN public.workout_templates wt ON wt.id = wa.workout_template_id
    WHERE wl.client_id = p_client_id
      AND wl.completed_at IS NOT NULL
    ORDER BY wl.completed_at DESC
    LIMIT 5
  ) q;

  RETURN jsonb_build_object(
    'clientId', p_client_id,
    'activeProgram', CASE WHEN v_pa.id IS NULL THEN NULL ELSE jsonb_build_object(
      'assignmentId', v_pa.id,
      'programId', v_pa.program_id,
      'programName', COALESCE(v_program_name, 'Program'),
      'durationWeeks', v_duration_weeks,
      'displayWeek', v_week,
      'progressionMode', COALESCE(v_pa.progression_mode, 'auto'),
      'coachUnlockedWeek', v_pa.coach_unlocked_week,
      'requiredSlotsThisWeek', v_required,
      'completedRequiredThisWeek', v_completed,
      'weekDays', v_week_days
    ) END,
    'recentSessions', COALESCE(v_recent, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_coach_client_training(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coach_client_training(uuid) TO authenticated;
