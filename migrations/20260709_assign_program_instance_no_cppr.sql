-- =============================================================================
-- cppr step 5 hotfix — assign_program_instance without client_program_progression_rules
-- Run this if step 6 (DROP TABLE) was applied before this function was updated.
-- Error fixed: 42P01 relation "public.client_program_progression_rules" does not exist
-- ONE-PASTE for Supabase SQL editor.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.assign_program_instance(
  p_program_id        uuid,
  p_client_id         uuid,
  p_coach_id          uuid,
  p_start_date        date,
  p_progression_mode  text,
  p_timezone_snapshot text,
  p_notes             text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_coach_id THEN
    RAISE EXCEPTION 'forbidden: caller % is not the coach %', auth.uid(), p_coach_id;
  END IF;

  PERFORM 1 FROM public.workout_programs
   WHERE id = p_program_id AND coach_id = p_coach_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden: program % not owned by coach %', p_program_id, p_coach_id;
  END IF;

  PERFORM 1 FROM public.clients
   WHERE coach_id = p_coach_id AND client_id = p_client_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden: client % not linked to coach %', p_client_id, p_coach_id;
  END IF;

  UPDATE public.program_assignments
     SET status = 'completed', updated_at = now()
   WHERE client_id = p_client_id AND status = 'active';

  INSERT INTO public.program_assignments (
    client_id, program_id, coach_id, start_date, status,
    progression_mode, timezone_snapshot, name, description, total_days, notes
  )
  SELECT
    p_client_id, p_program_id, p_coach_id, p_start_date, 'active',
    COALESCE(NULLIF(p_progression_mode, ''), 'auto'),
    COALESCE(NULLIF(p_timezone_snapshot, ''), 'UTC'),
    wp.name, wp.description,
    (SELECT COUNT(*) FROM public.program_schedule ps WHERE ps.program_id = p_program_id),
    p_notes
  FROM public.workout_programs wp
  WHERE wp.id = p_program_id
  RETURNING id INTO v_assignment_id;

  INSERT INTO public.program_instance_phases (
    program_assignment_id, source_training_block_id, name, phase_label,
    duration_weeks, phase_order, notes
  )
  SELECT
    v_assignment_id, tb.id, tb.name, tb.phase_label,
    GREATEST(1, COALESCE(tb.duration_weeks, 1)),
    tb.block_order, tb.notes
  FROM public.training_blocks tb
  WHERE tb.program_id = p_program_id;

  INSERT INTO public.program_instance_workouts (
    program_assignment_id, source_template_id, name, description,
    estimated_duration, category
  )
  SELECT
    v_assignment_id, wt.id, wt.name, wt.description, wt.estimated_duration, wt.category
  FROM public.workout_templates wt
  WHERE wt.id IN (
    SELECT DISTINCT ps.template_id
    FROM public.program_schedule ps
    WHERE ps.program_id = p_program_id AND ps.template_id IS NOT NULL
  );

  INSERT INTO public.program_instance_set_entries (
    program_instance_workout_id, source_set_entry_id, set_order, set_name,
    set_notes, set_type, total_sets, reps_per_set, duration_seconds,
    rest_seconds, rounds_driver, interval_seconds, time_cap_seconds, is_optional
  )
  SELECT
    piw.id, wse.id, wse.set_order, wse.set_name,
    wse.set_notes, wse.set_type::text, wse.total_sets, wse.reps_per_set, wse.duration_seconds,
    wse.rest_seconds, COALESCE(wse.rounds_driver, 'fixed'), wse.interval_seconds,
    wse.time_cap_seconds, COALESCE(wse.is_optional, false)
  FROM public.program_instance_workouts piw
  JOIN public.workout_set_entries wse ON wse.template_id = piw.source_template_id
  WHERE piw.program_assignment_id = v_assignment_id;

  INSERT INTO public.program_instance_set_entry_exercises (
    program_instance_set_entry_id, source_set_entry_exercise_id, exercise_id,
    exercise_order, exercise_letter, sets, reps, weight_kg, rir, tempo,
    rest_seconds, load_percentage, notes,
    measurement, technique, work_seconds, distance_meters, target_time_seconds,
    target_pace_seconds_per_km, target_speed_pct, hr_zone, target_hr_pct,
    drop_percentage, max_drops, reps_per_cluster, clusters_per_set,
    intra_cluster_rest_seconds, rest_pause_seconds, max_rest_pauses, is_optional
  )
  SELECT
    pise.id, wsee.id, wsee.exercise_id,
    wsee.exercise_order, wsee.exercise_letter, wsee.sets, wsee.reps, wsee.weight_kg, wsee.rir, wsee.tempo,
    wsee.rest_seconds, wsee.load_percentage, wsee.notes,
    COALESCE(wsee.measurement, 'reps'), COALESCE(wsee.technique, 'none'),
    wsee.work_seconds, wsee.distance_meters, wsee.target_time_seconds,
    wsee.target_pace_seconds_per_km, wsee.target_speed_pct, wsee.hr_zone, wsee.target_hr_pct,
    wsee.drop_percentage, wsee.max_drops, wsee.reps_per_cluster, wsee.clusters_per_set,
    wsee.intra_cluster_rest_seconds, wsee.rest_pause_seconds, wsee.max_rest_pauses,
    COALESCE(wsee.is_optional, false)
  FROM public.program_instance_set_entries pise
  JOIN public.workout_set_entry_exercises wsee ON wsee.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id IN (
    SELECT id FROM public.program_instance_workouts WHERE program_assignment_id = v_assignment_id
  );

  INSERT INTO public.program_instance_set_prescriptions (
    slot_id, set_number, reps, weight_kg, load_percentage, rir, tempo,
    work_seconds, distance_meters
  )
  SELECT
    pisee.id, wsp.set_number, wsp.reps, wsp.weight_kg, wsp.load_percentage, wsp.rir, wsp.tempo,
    wsp.work_seconds, wsp.distance_meters
  FROM public.program_instance_set_entry_exercises pisee
  JOIN public.workout_set_prescriptions wsp ON wsp.slot_id = pisee.source_set_entry_exercise_id
  WHERE pisee.program_instance_set_entry_id IN (
    SELECT pise.id FROM public.program_instance_set_entries pise
    WHERE pise.program_instance_workout_id IN (
      SELECT id FROM public.program_instance_workouts WHERE program_assignment_id = v_assignment_id
    )
  );

  INSERT INTO public.program_instance_set_entry_protocols (program_instance_set_entry_id, protocol_type, protocol_config)
  SELECT pise.id, 'drop_set', to_jsonb(ds) - 'id' - 'set_entry_id'
  FROM public.program_instance_set_entries pise
  JOIN public.workout_drop_sets ds ON ds.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id IN (
    SELECT id FROM public.program_instance_workouts WHERE program_assignment_id = v_assignment_id
  );

  INSERT INTO public.program_instance_set_entry_protocols (program_instance_set_entry_id, protocol_type, protocol_config)
  SELECT pise.id, 'cluster_set', to_jsonb(cs) - 'id' - 'set_entry_id'
  FROM public.program_instance_set_entries pise
  JOIN public.workout_cluster_sets cs ON cs.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id IN (
    SELECT id FROM public.program_instance_workouts WHERE program_assignment_id = v_assignment_id
  );

  INSERT INTO public.program_instance_set_entry_protocols (program_instance_set_entry_id, protocol_type, protocol_config)
  SELECT pise.id, 'rest_pause', to_jsonb(rp) - 'id' - 'set_entry_id'
  FROM public.program_instance_set_entries pise
  JOIN public.workout_rest_pause_sets rp ON rp.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id IN (
    SELECT id FROM public.program_instance_workouts WHERE program_assignment_id = v_assignment_id
  );

  INSERT INTO public.program_instance_set_entry_protocols (program_instance_set_entry_id, protocol_type, protocol_config)
  SELECT pise.id, COALESCE(tp.protocol_type, 'timed'), to_jsonb(tp) - 'id' - 'set_entry_id'
  FROM public.program_instance_set_entries pise
  JOIN public.workout_time_protocols tp ON tp.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id IN (
    SELECT id FROM public.program_instance_workouts WHERE program_assignment_id = v_assignment_id
  );

  INSERT INTO public.program_instance_set_entry_protocols (program_instance_set_entry_id, protocol_type, protocol_config)
  SELECT pise.id, 'speed_work', to_jsonb(sp) - 'id' - 'set_entry_id'
  FROM public.program_instance_set_entries pise
  JOIN public.workout_speed_sets sp ON sp.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id IN (
    SELECT id FROM public.program_instance_workouts WHERE program_assignment_id = v_assignment_id
  );

  INSERT INTO public.program_instance_set_entry_protocols (program_instance_set_entry_id, protocol_type, protocol_config)
  SELECT pise.id, 'endurance', to_jsonb(en) - 'id' - 'set_entry_id'
  FROM public.program_instance_set_entries pise
  JOIN public.workout_endurance_sets en ON en.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id IN (
    SELECT id FROM public.program_instance_workouts WHERE program_assignment_id = v_assignment_id
  );

  WITH phase_ranges AS (
    SELECT
      pip.id AS phase_id,
      COALESCE(SUM(pip.duration_weeks) OVER (ORDER BY pip.phase_order
               ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) + 1 AS start_week,
      SUM(pip.duration_weeks) OVER (ORDER BY pip.phase_order) AS end_week
    FROM public.program_instance_phases pip
    WHERE pip.program_assignment_id = v_assignment_id
  )
  INSERT INTO public.program_day_assignments (
    program_assignment_id, day_number, week_number, program_day,
    program_instance_phase_id, program_instance_workout_id,
    day_type, name, estimated_duration, is_optional
  )
  SELECT
    v_assignment_id,
    (ps.week_number - 1) * 7 + ps.day_number,
    ps.week_number,
    ps.day_number,
    COALESCE(pip_direct.id, pr.phase_id),
    piw.id,
    'workout',
    COALESCE(wt.name, 'Workout'),
    wt.estimated_duration,
    COALESCE(ps.is_optional, false)
  FROM public.program_schedule ps
  LEFT JOIN public.workout_templates wt ON wt.id = ps.template_id
  LEFT JOIN public.program_instance_workouts piw
    ON piw.program_assignment_id = v_assignment_id AND piw.source_template_id = ps.template_id
  LEFT JOIN public.program_instance_phases pip_direct
    ON pip_direct.program_assignment_id = v_assignment_id
   AND pip_direct.source_training_block_id = ps.training_block_id
  LEFT JOIN phase_ranges pr
    ON ps.week_number BETWEEN pr.start_week AND pr.end_week
  WHERE ps.program_id = p_program_id;

  RETURN v_assignment_id;
END;
$$;

COMMENT ON FUNCTION public.assign_program_instance(uuid, uuid, uuid, date, text, text, text) IS
  'Deep-copies master program to client instance. Phases copy phase_label. No client_program_progression_rules (cppr retired).';

GRANT EXECUTE ON FUNCTION public.assign_program_instance(uuid, uuid, uuid, date, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_program_instance(uuid, uuid, uuid, date, text, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
