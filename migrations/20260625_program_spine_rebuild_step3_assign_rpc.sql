-- =====================================================================
-- PROGRAM SPINE REBUILD — STEP 3: assign_program_instance
-- Run manually in the Supabase SQL editor, AFTER paste #1 and paste #1b.
--
-- Single SECURITY DEFINER function. The whole deep copy runs in the
-- function's implicit transaction: any failure RAISEs and rolls back the
-- entire instance — a partial instance is impossible.
--
-- Nothing in the instance references a mutable master/template row as a key.
-- All master ids are stored only as source_* provenance columns (no FK).
-- The only live reference is the global exercises catalog (exercise_id).
-- =====================================================================

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
  -- -----------------------------------------------------------------
  -- 1) AUTH / OWNERSHIP (failure => RAISE => full rollback)
  -- -----------------------------------------------------------------
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

  -- -----------------------------------------------------------------
  -- 2) DEACTIVATE prior active program (history stays under old ids)
  -- -----------------------------------------------------------------
  UPDATE public.program_assignments
     SET status = 'completed', updated_at = now()
   WHERE client_id = p_client_id AND status = 'active';

  -- -----------------------------------------------------------------
  -- 3) INSTANCE HEAD (program_assignments). duration_weeks left NULL
  --    (derived from instance phases). total_days NOT NULL = schedule rows.
  -- -----------------------------------------------------------------
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

  -- -----------------------------------------------------------------
  -- 4) PHASES: training_blocks -> program_instance_phases
  --    (phase_order = block_order; source_training_block_id = provenance)
  -- -----------------------------------------------------------------
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

  -- -----------------------------------------------------------------
  -- 5) WORKOUTS: distinct program_schedule.template_id
  --    -> workout_templates -> program_instance_workouts
  -- -----------------------------------------------------------------
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

  -- -----------------------------------------------------------------
  -- 5a) SET ENTRIES: workout_set_entries -> program_instance_set_entries
  -- -----------------------------------------------------------------
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

  -- -----------------------------------------------------------------
  -- 5b) SET-ENTRY EXERCISES (full group model). exercise_id -> global catalog.
  -- -----------------------------------------------------------------
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

  -- -----------------------------------------------------------------
  -- 5c) PER-SET PRESCRIPTIONS: workout_set_prescriptions (slot_id ->
  --     master exercise row) -> program_instance_set_prescriptions
  --     (slot_id -> instance exercise row).
  -- -----------------------------------------------------------------
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

  -- -----------------------------------------------------------------
  -- 5d) LEGACY PROTOCOL SATELLITES -> program_instance_set_entry_protocols
  --     (JSONB). Copy only if rows exist; new (group-model) programs won't
  --     have these. protocol_config = the row minus id/set_entry_id.
  -- -----------------------------------------------------------------
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

  -- -----------------------------------------------------------------
  -- 6) SCHEDULE: program_schedule -> program_day_assignments (instance rows).
  --    Phase resolution: prefer the direct training_block_id map; fall back
  --    to week-range derivation (program_schedule.training_block_id is nulled
  --    by migration 20260421, so range is the reliable path).
  --    day_type derived as 'workout' (program_schedule has no day_type, and
  --    only holds scheduled training days; rest = absence of a row).
  --    name NOT NULL -> template name (fallback 'Workout').
  -- -----------------------------------------------------------------
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

  -- -----------------------------------------------------------------
  -- 7) PROGRESSION RULES: program_progression_rules
  --    -> client_program_progression_rules, re-pointed to instance.
  --    Legacy block_* columns kept transitionally (= master values) so
  --    current readers keep working until step 8; the new instance FKs
  --    (program_instance_set_entry_id, program_instance_phase_id) are the
  --    go-forward pointers.
  -- -----------------------------------------------------------------
  WITH phase_ranges AS (
    SELECT
      pip.id AS phase_id,
      COALESCE(SUM(pip.duration_weeks) OVER (ORDER BY pip.phase_order
               ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) + 1 AS start_week,
      SUM(pip.duration_weeks) OVER (ORDER BY pip.phase_order) AS end_week
    FROM public.program_instance_phases pip
    WHERE pip.program_assignment_id = v_assignment_id
  )
  INSERT INTO public.client_program_progression_rules (
    client_id, program_assignment_id, week_number,
    block_id, block_type, block_order, block_name,
    program_instance_set_entry_id, program_instance_phase_id,
    speed_endurance_config, exercise_id, exercise_order, exercise_letter,
    sets, reps, rest_seconds, tempo, rir,
    second_exercise_id, compound_exercise_id,
    first_exercise_reps, second_exercise_reps, isolation_reps, compound_reps,
    rest_between_pairs, exercise_reps, drop_set_reps, weight_reduction_percentage,
    reps_per_cluster, clusters_per_set, intra_cluster_rest, rest_pause_duration, max_rest_pauses,
    rounds, work_seconds, rest_after_exercise, rest_after_set, duration_minutes,
    emom_mode, target_reps, time_cap_minutes, notes, weight_kg, load_percentage,
    override_exercise_id
  )
  SELECT
    p_client_id, v_assignment_id, ppr.week_number,
    ppr.set_entry_id, ppr.set_type, ppr.set_order, ppr.set_name,
    pise.id, COALESCE(pip_direct.id, pr.phase_id),
    ppr.speed_endurance_config, ppr.exercise_id, ppr.exercise_order, ppr.exercise_letter,
    ppr.sets, ppr.reps, ppr.rest_seconds, ppr.tempo, ppr.rir,
    ppr.second_exercise_id, ppr.compound_exercise_id,
    ppr.first_exercise_reps, ppr.second_exercise_reps, ppr.isolation_reps, ppr.compound_reps,
    ppr.rest_between_pairs, ppr.exercise_reps, ppr.drop_set_reps, ppr.weight_reduction_percentage,
    ppr.reps_per_cluster, ppr.clusters_per_set, ppr.intra_cluster_rest, ppr.rest_pause_duration, ppr.max_rest_pauses,
    ppr.rounds, ppr.work_seconds, ppr.rest_after_exercise, ppr.rest_after_set, ppr.duration_minutes,
    ppr.emom_mode, ppr.target_reps, ppr.time_cap_minutes, ppr.notes, ppr.weight_kg, ppr.load_percentage,
    NULL
  FROM public.program_progression_rules ppr
  LEFT JOIN public.program_instance_set_entries pise
    ON pise.source_set_entry_id = ppr.set_entry_id
   AND pise.program_instance_workout_id IN (
     SELECT id FROM public.program_instance_workouts WHERE program_assignment_id = v_assignment_id
   )
  LEFT JOIN public.program_instance_phases pip_direct
    ON pip_direct.program_assignment_id = v_assignment_id
   AND pip_direct.source_training_block_id = ppr.training_block_id
  LEFT JOIN phase_ranges pr
    ON ppr.week_number BETWEEN pr.start_week AND pr.end_week
  WHERE ppr.program_id = p_program_id;

  RETURN v_assignment_id;
END;
$$;

COMMENT ON FUNCTION public.assign_program_instance(uuid, uuid, uuid, date, text, text, text) IS
  'Deep-copies a master workout program into a complete client-owned instance. Phases copy phase_label; goal/profile omitted (DB defaults).';

REVOKE ALL ON FUNCTION public.assign_program_instance(uuid, uuid, uuid, date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_program_instance(uuid, uuid, uuid, date, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_program_instance(uuid, uuid, uuid, date, text, text, text) TO service_role;
