-- =============================================================================
-- 20260804_rir_to_rpe_rename.sql
-- =============================================================================
-- Rename prescribed RIR columns to RPE (column rename only — no value conversion).
--
-- Scope:
--   - Renames prescribed `rir` → `rpe` on prescription / guideline / progression
--     tables listed below.
--   - Recreates canvas / assign / clone RPCs so they reference the new column names.
--   - DO NOT touch workout_set_logs.rpe (logged RPE is already named rpe).
--   - No numeric conversion (stored values stay as-is; only the column name changes).
--
-- DRY-RUN: wrap entire file body in BEGIN; ... ROLLBACK;
-- REAL RUN: BEGIN; ... COMMIT; (or apply via migration tool)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Column renames (prescribed tables only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.workout_set_prescriptions RENAME COLUMN rir TO rpe;
ALTER TABLE public.workout_set_entry_exercises RENAME COLUMN rir TO rpe;
ALTER TABLE public.program_instance_set_prescriptions RENAME COLUMN rir TO rpe;
ALTER TABLE public.program_instance_set_entry_exercises RENAME COLUMN rir TO rpe;
ALTER TABLE public.program_progression_rules RENAME COLUMN rir TO rpe;
ALTER TABLE public.volume_guidelines RENAME COLUMN rir_min TO rpe_min;
ALTER TABLE public.volume_guidelines RENAME COLUMN rir_max TO rpe_max;

-- ---------------------------------------------------------------------------
-- 2) Recreate RPCs (live bodies with rir→rpe identifier renames only)
-- ---------------------------------------------------------------------------

-- --- assign_program_instance ---
CREATE OR REPLACE FUNCTION public.assign_program_instance(p_program_id uuid, p_client_id uuid, p_coach_id uuid, p_start_date date, p_progression_mode text, p_timezone_snapshot text, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    exercise_order, exercise_letter, sets, reps, weight_kg, rpe, tempo,
    rest_seconds, load_percentage, notes,
    measurement, technique, work_seconds, distance_meters, target_time_seconds,
    target_pace_seconds_per_km, target_speed_pct, hr_zone, target_hr_pct,
    drop_percentage, max_drops, reps_per_cluster, clusters_per_set,
    intra_cluster_rest_seconds, rest_pause_seconds, max_rest_pauses, is_optional
  )
  SELECT
    pise.id, wsee.id, wsee.exercise_id,
    wsee.exercise_order, wsee.exercise_letter, wsee.sets, wsee.reps, wsee.weight_kg, wsee.rpe, wsee.tempo,
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
    slot_id, set_number, reps, weight_kg, load_percentage, rpe, tempo,
    work_seconds, distance_meters
  )
  SELECT
    pisee.id, wsp.set_number, wsp.reps, wsp.weight_kg, wsp.load_percentage, wsp.rpe, wsp.tempo,
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
$function$;

-- --- clone_template_to_instance_workout ---
CREATE OR REPLACE FUNCTION public.clone_template_to_instance_workout(p_assignment_id uuid, p_source_template_id uuid, p_instance_workout_id uuid DEFAULT gen_random_uuid())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid := COALESCE(p_instance_workout_id, gen_random_uuid());
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM program_assignments pa
    WHERE pa.id = p_assignment_id
      AND pa.coach_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'clone_template_to_instance_workout: unauthorized assignment'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM workout_templates wt
    WHERE wt.id = p_source_template_id
      AND wt.coach_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'clone_template_to_instance_workout: template not found'
      USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('statement_timeout', '3min', true);

  -- Idempotent retry: clear prior copy when re-using the same instance workout id.
  DELETE FROM program_instance_set_entry_protocols pip
  USING program_instance_set_entries pise
  WHERE pip.program_instance_set_entry_id = pise.id
    AND pise.program_instance_workout_id = v_id;

  DELETE FROM program_instance_set_prescriptions pisp
  USING program_instance_set_entry_exercises pisee
  INNER JOIN program_instance_set_entries pise ON pise.id = pisee.program_instance_set_entry_id
  WHERE pisp.slot_id = pisee.id
    AND pise.program_instance_workout_id = v_id;

  DELETE FROM program_instance_set_entry_exercises pisee
  USING program_instance_set_entries pise
  WHERE pisee.program_instance_set_entry_id = pise.id
    AND pise.program_instance_workout_id = v_id;

  DELETE FROM program_instance_set_entries
  WHERE program_instance_workout_id = v_id;

  INSERT INTO program_instance_workouts (
    id, program_assignment_id, source_template_id, name, description, estimated_duration, category
  )
  SELECT
    v_id, p_assignment_id, wt.id, wt.name, wt.description, wt.estimated_duration, wt.category
  FROM workout_templates wt
  WHERE wt.id = p_source_template_id
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    estimated_duration = EXCLUDED.estimated_duration,
    category = EXCLUDED.category,
    source_template_id = EXCLUDED.source_template_id,
    updated_at = now();

  INSERT INTO program_instance_set_entries (
    program_instance_workout_id, source_set_entry_id, set_order, set_name, set_notes,
    set_type, total_sets, reps_per_set, duration_seconds, rest_seconds,
    rounds_driver, interval_seconds, time_cap_seconds, is_optional
  )
  SELECT
    v_id, wse.id, wse.set_order, wse.set_name, wse.set_notes,
    wse.set_type::text, wse.total_sets, wse.reps_per_set, wse.duration_seconds, wse.rest_seconds,
    COALESCE(wse.rounds_driver, 'fixed'), wse.interval_seconds, wse.time_cap_seconds,
    COALESCE(wse.is_optional, false)
  FROM workout_set_entries wse
  WHERE wse.template_id = p_source_template_id;

  INSERT INTO program_instance_set_entry_exercises (
    program_instance_set_entry_id, source_set_entry_exercise_id, exercise_id,
    exercise_order, exercise_letter, sets, reps, weight_kg, rpe, tempo,
    rest_seconds, load_percentage, notes,
    measurement, technique, work_seconds, distance_meters, target_time_seconds,
    target_pace_seconds_per_km, target_speed_pct, hr_zone, target_hr_pct,
    drop_percentage, max_drops, reps_per_cluster, clusters_per_set,
    intra_cluster_rest_seconds, rest_pause_seconds, max_rest_pauses, is_optional
  )
  SELECT
    pise.id, wsee.id, wsee.exercise_id,
    wsee.exercise_order, wsee.exercise_letter, wsee.sets, wsee.reps, wsee.weight_kg, wsee.rpe, wsee.tempo,
    wsee.rest_seconds, wsee.load_percentage, wsee.notes,
    COALESCE(wsee.measurement, 'reps'), COALESCE(wsee.technique, 'none'),
    wsee.work_seconds, wsee.distance_meters, wsee.target_time_seconds,
    wsee.target_pace_seconds_per_km, wsee.target_speed_pct, wsee.hr_zone, wsee.target_hr_pct,
    wsee.drop_percentage, wsee.max_drops, wsee.reps_per_cluster, wsee.clusters_per_set,
    wsee.intra_cluster_rest_seconds, wsee.rest_pause_seconds, wsee.max_rest_pauses,
    COALESCE(wsee.is_optional, false)
  FROM program_instance_set_entries pise
  JOIN workout_set_entry_exercises wsee ON wsee.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id = v_id;

  INSERT INTO program_instance_set_prescriptions (
    slot_id, set_number, reps, weight_kg, load_percentage, rpe, tempo, work_seconds, distance_meters
  )
  SELECT
    pisee.id, wsp.set_number, wsp.reps, wsp.weight_kg, wsp.load_percentage, wsp.rpe, wsp.tempo,
    wsp.work_seconds, wsp.distance_meters
  FROM program_instance_set_entry_exercises pisee
  JOIN program_instance_set_entries pise ON pise.id = pisee.program_instance_set_entry_id
  JOIN workout_set_prescriptions wsp ON wsp.slot_id = pisee.source_set_entry_exercise_id
  WHERE pise.program_instance_workout_id = v_id;

  INSERT INTO program_instance_set_entry_protocols (program_instance_set_entry_id, protocol_type, protocol_config)
  SELECT pise.id, 'drop_set', to_jsonb(ds) - 'id' - 'set_entry_id'
  FROM program_instance_set_entries pise
  JOIN workout_drop_sets ds ON ds.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id = v_id;

  INSERT INTO program_instance_set_entry_protocols (program_instance_set_entry_id, protocol_type, protocol_config)
  SELECT pise.id, 'cluster_set', to_jsonb(cs) - 'id' - 'set_entry_id'
  FROM program_instance_set_entries pise
  JOIN workout_cluster_sets cs ON cs.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id = v_id;

  INSERT INTO program_instance_set_entry_protocols (program_instance_set_entry_id, protocol_type, protocol_config)
  SELECT pise.id, 'rest_pause', to_jsonb(rp) - 'id' - 'set_entry_id'
  FROM program_instance_set_entries pise
  JOIN workout_rest_pause_sets rp ON rp.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id = v_id;

  INSERT INTO program_instance_set_entry_protocols (program_instance_set_entry_id, protocol_type, protocol_config)
  SELECT pise.id, COALESCE(tp.protocol_type, 'timed'), to_jsonb(tp) - 'id' - 'set_entry_id'
  FROM program_instance_set_entries pise
  JOIN workout_time_protocols tp ON tp.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id = v_id;

  INSERT INTO program_instance_set_entry_protocols (program_instance_set_entry_id, protocol_type, protocol_config)
  SELECT pise.id, 'speed_work', to_jsonb(sp) - 'id' - 'set_entry_id'
  FROM program_instance_set_entries pise
  JOIN workout_speed_sets sp ON sp.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id = v_id;

  INSERT INTO program_instance_set_entry_protocols (program_instance_set_entry_id, protocol_type, protocol_config)
  SELECT pise.id, 'endurance', to_jsonb(en) - 'id' - 'set_entry_id'
  FROM program_instance_set_entries pise
  JOIN workout_endurance_sets en ON en.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id = v_id;

  RETURN v_id;
END;
$function$;

-- --- save_instance_workout_canvas ---
CREATE OR REPLACE FUNCTION public.save_instance_workout_canvas(p_instance_workout_id uuid, p_groups jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  g jsonb;
  s jsonb;
  rx jsonb;
  entry_row program_instance_set_entries;
  slot_row program_instance_set_entry_exercises;
  rx_row program_instance_set_prescriptions;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM program_instance_workouts piw
    INNER JOIN program_assignments pa ON pa.id = piw.program_assignment_id
    WHERE piw.id = p_instance_workout_id
      AND pa.coach_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'save_instance_workout_canvas: unauthorized or missing instance workout'
      USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('statement_timeout', '3min', true);

  DELETE FROM program_instance_set_entry_protocols pip
  USING program_instance_set_entries pise
  WHERE pip.program_instance_set_entry_id = pise.id
    AND pise.program_instance_workout_id = p_instance_workout_id;

  DELETE FROM program_instance_set_prescriptions pisp
  USING program_instance_set_entry_exercises pisee
  INNER JOIN program_instance_set_entries pise ON pise.id = pisee.program_instance_set_entry_id
  WHERE pisp.slot_id = pisee.id
    AND pise.program_instance_workout_id = p_instance_workout_id;

  DELETE FROM program_instance_set_entry_exercises pisee
  USING program_instance_set_entries pise
  WHERE pisee.program_instance_set_entry_id = pise.id
    AND pise.program_instance_workout_id = p_instance_workout_id;

  DELETE FROM program_instance_set_entries
  WHERE program_instance_workout_id = p_instance_workout_id;

  FOR g IN SELECT value FROM jsonb_array_elements(COALESCE(p_groups, '[]'::jsonb))
  LOOP
    entry_row := jsonb_populate_record(null::program_instance_set_entries, g - 'slots');
    entry_row.program_instance_workout_id := p_instance_workout_id;
    entry_row.is_optional := COALESCE(entry_row.is_optional, false);
    entry_row.set_type := COALESCE(entry_row.set_type, 'straight_set');
    entry_row.rounds_driver := COALESCE(entry_row.rounds_driver, 'fixed');

    INSERT INTO program_instance_set_entries (
      id,
      program_instance_workout_id,
      set_order,
      set_type,
      set_name,
      set_notes,
      duration_seconds,
      rest_seconds,
      total_sets,
      reps_per_set,
      rounds_driver,
      interval_seconds,
      time_cap_seconds,
      is_optional
    )
    VALUES (
      entry_row.id,
      entry_row.program_instance_workout_id,
      entry_row.set_order,
      entry_row.set_type,
      entry_row.set_name,
      entry_row.set_notes,
      entry_row.duration_seconds,
      entry_row.rest_seconds,
      entry_row.total_sets,
      entry_row.reps_per_set,
      entry_row.rounds_driver,
      entry_row.interval_seconds,
      entry_row.time_cap_seconds,
      entry_row.is_optional
    );

    FOR s IN SELECT value FROM jsonb_array_elements(COALESCE(g->'slots', '[]'::jsonb))
    LOOP
      slot_row := jsonb_populate_record(null::program_instance_set_entry_exercises, s - 'prescriptions');
      slot_row.program_instance_set_entry_id := COALESCE(
        slot_row.program_instance_set_entry_id,
        NULLIF(s->>'set_entry_id', '')::uuid,
        entry_row.id
      );
      slot_row.is_optional := COALESCE(slot_row.is_optional, false);
      slot_row.measurement := COALESCE(slot_row.measurement, 'reps');
      slot_row.technique := COALESCE(slot_row.technique, 'none');

      INSERT INTO program_instance_set_entry_exercises (
        id,
        program_instance_set_entry_id,
        exercise_id,
        exercise_order,
        exercise_letter,
        sets,
        reps,
        weight_kg,
        load_percentage,
        rpe,
        tempo,
        rest_seconds,
        notes,
        work_seconds,
        distance_meters,
        target_time_seconds,
        target_pace_seconds_per_km,
        target_speed_pct,
        hr_zone,
        target_hr_pct,
        drop_percentage,
        max_drops,
        reps_per_cluster,
        clusters_per_set,
        intra_cluster_rest_seconds,
        rest_pause_seconds,
        max_rest_pauses,
        measurement,
        technique,
        is_optional
      )
      VALUES (
        slot_row.id,
        slot_row.program_instance_set_entry_id,
        slot_row.exercise_id,
        slot_row.exercise_order,
        slot_row.exercise_letter,
        slot_row.sets,
        slot_row.reps,
        slot_row.weight_kg,
        slot_row.load_percentage,
        slot_row.rpe,
        slot_row.tempo,
        slot_row.rest_seconds,
        slot_row.notes,
        slot_row.work_seconds,
        slot_row.distance_meters,
        slot_row.target_time_seconds,
        slot_row.target_pace_seconds_per_km,
        slot_row.target_speed_pct,
        slot_row.hr_zone,
        slot_row.target_hr_pct,
        slot_row.drop_percentage,
        slot_row.max_drops,
        slot_row.reps_per_cluster,
        slot_row.clusters_per_set,
        slot_row.intra_cluster_rest_seconds,
        slot_row.rest_pause_seconds,
        slot_row.max_rest_pauses,
        slot_row.measurement,
        slot_row.technique,
        slot_row.is_optional
      );

      FOR rx IN SELECT value FROM jsonb_array_elements(COALESCE(s->'prescriptions', '[]'::jsonb))
      LOOP
        rx_row := jsonb_populate_record(null::program_instance_set_prescriptions, rx);
        rx_row.slot_id := COALESCE(rx_row.slot_id, slot_row.id);

        INSERT INTO program_instance_set_prescriptions (
          id,
          slot_id,
          set_number,
          reps,
          weight_kg,
          load_percentage,
          rpe,
          tempo,
          work_seconds,
          distance_meters
        )
        VALUES (
          rx_row.id,
          rx_row.slot_id,
          rx_row.set_number,
          rx_row.reps,
          rx_row.weight_kg,
          rx_row.load_percentage,
          rx_row.rpe,
          rx_row.tempo,
          rx_row.work_seconds,
          rx_row.distance_meters
        );
      END LOOP;
    END LOOP;
  END LOOP;
END;
$function$;

-- --- save_workout_canvas ---
CREATE OR REPLACE FUNCTION public.save_workout_canvas(p_workout_id uuid, p_groups jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  g jsonb;
  s jsonb;
  rx jsonb;
  entry_row workout_set_entries;
  slot_row workout_set_entry_exercises;
  rx_row workout_set_prescriptions;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM workout_templates wt
    WHERE wt.id = p_workout_id
      AND wt.coach_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'save_workout_canvas: unauthorized or missing template'
      USING ERRCODE = '42501';
  END IF;

  -- Match copy_week_schedule_with_rules: avoid default statement_timeout killing large saves.
  PERFORM set_config('statement_timeout', '3min', true);

  -- Legacy protocol tables (pre-prescription model) — explicit delete avoids slow CASCADE.
  DELETE FROM workout_drop_sets ds
  USING workout_set_entries wse
  WHERE ds.set_entry_id = wse.id
    AND wse.template_id = p_workout_id;

  DELETE FROM workout_cluster_sets cs
  USING workout_set_entries wse
  WHERE cs.set_entry_id = wse.id
    AND wse.template_id = p_workout_id;

  DELETE FROM workout_rest_pause_sets rp
  USING workout_set_entries wse
  WHERE rp.set_entry_id = wse.id
    AND wse.template_id = p_workout_id;

  DELETE FROM workout_time_protocols tp
  USING workout_set_entries wse
  WHERE tp.set_entry_id = wse.id
    AND wse.template_id = p_workout_id;

  DELETE FROM workout_speed_sets sp
  USING workout_set_entries wse
  WHERE sp.set_entry_id = wse.id
    AND wse.template_id = p_workout_id;

  DELETE FROM workout_endurance_sets en
  USING workout_set_entries wse
  WHERE en.set_entry_id = wse.id
    AND wse.template_id = p_workout_id;

  -- USING + idx_wsp_slot_id: faster than IN (subselect) on large prescription tables.
  DELETE FROM workout_set_prescriptions wsp
  USING workout_set_entry_exercises wsee
  INNER JOIN workout_set_entries wse ON wse.id = wsee.set_entry_id
  WHERE wsp.slot_id = wsee.id
    AND wse.template_id = p_workout_id;

  DELETE FROM workout_set_entry_exercises wsee
  USING workout_set_entries wse
  WHERE wsee.set_entry_id = wse.id
    AND wse.template_id = p_workout_id;

  DELETE FROM workout_set_entries
  WHERE template_id = p_workout_id;

  FOR g IN SELECT value FROM jsonb_array_elements(COALESCE(p_groups, '[]'::jsonb))
  LOOP
    entry_row := jsonb_populate_record(null::workout_set_entries, g - 'slots');
    entry_row.template_id := p_workout_id;
    entry_row.is_optional := COALESCE(entry_row.is_optional, false);
    entry_row.set_type := COALESCE(entry_row.set_type, 'straight_set'::workout_set_type);
    entry_row.rounds_driver := COALESCE(entry_row.rounds_driver, 'fixed');

    INSERT INTO workout_set_entries (
      id,
      template_id,
      set_order,
      set_type,
      set_name,
      set_notes,
      duration_seconds,
      rest_seconds,
      total_sets,
      reps_per_set,
      rounds_driver,
      interval_seconds,
      time_cap_seconds,
      is_optional
    )
    VALUES (
      entry_row.id,
      entry_row.template_id,
      entry_row.set_order,
      entry_row.set_type,
      entry_row.set_name,
      entry_row.set_notes,
      entry_row.duration_seconds,
      entry_row.rest_seconds,
      entry_row.total_sets,
      entry_row.reps_per_set,
      entry_row.rounds_driver,
      entry_row.interval_seconds,
      entry_row.time_cap_seconds,
      entry_row.is_optional
    );

    FOR s IN SELECT value FROM jsonb_array_elements(COALESCE(g->'slots', '[]'::jsonb))
    LOOP
      slot_row := jsonb_populate_record(null::workout_set_entry_exercises, s - 'prescriptions');
      slot_row.set_entry_id := COALESCE(slot_row.set_entry_id, entry_row.id);
      slot_row.is_optional := COALESCE(slot_row.is_optional, false);
      slot_row.measurement := COALESCE(slot_row.measurement, 'reps');
      slot_row.technique := COALESCE(slot_row.technique, 'none');

      INSERT INTO workout_set_entry_exercises (
        id,
        set_entry_id,
        exercise_id,
        exercise_order,
        exercise_letter,
        sets,
        reps,
        weight_kg,
        load_percentage,
        rpe,
        tempo,
        rest_seconds,
        notes,
        work_seconds,
        distance_meters,
        target_time_seconds,
        target_pace_seconds_per_km,
        target_speed_pct,
        hr_zone,
        target_hr_pct,
        drop_percentage,
        max_drops,
        reps_per_cluster,
        clusters_per_set,
        intra_cluster_rest_seconds,
        rest_pause_seconds,
        max_rest_pauses,
        measurement,
        technique,
        is_optional
      )
      VALUES (
        slot_row.id,
        slot_row.set_entry_id,
        slot_row.exercise_id,
        slot_row.exercise_order,
        slot_row.exercise_letter,
        slot_row.sets,
        slot_row.reps,
        slot_row.weight_kg,
        slot_row.load_percentage,
        slot_row.rpe,
        slot_row.tempo,
        slot_row.rest_seconds,
        slot_row.notes,
        slot_row.work_seconds,
        slot_row.distance_meters,
        slot_row.target_time_seconds,
        slot_row.target_pace_seconds_per_km,
        slot_row.target_speed_pct,
        slot_row.hr_zone,
        slot_row.target_hr_pct,
        slot_row.drop_percentage,
        slot_row.max_drops,
        slot_row.reps_per_cluster,
        slot_row.clusters_per_set,
        slot_row.intra_cluster_rest_seconds,
        slot_row.rest_pause_seconds,
        slot_row.max_rest_pauses,
        slot_row.measurement,
        slot_row.technique,
        slot_row.is_optional
      );

      FOR rx IN SELECT value FROM jsonb_array_elements(COALESCE(s->'prescriptions', '[]'::jsonb))
      LOOP
        rx_row := jsonb_populate_record(null::workout_set_prescriptions, rx);
        rx_row.slot_id := COALESCE(rx_row.slot_id, slot_row.id);

        INSERT INTO workout_set_prescriptions (
          id,
          slot_id,
          set_number,
          reps,
          weight_kg,
          load_percentage,
          rpe,
          tempo,
          work_seconds,
          distance_meters
        )
        VALUES (
          rx_row.id,
          rx_row.slot_id,
          rx_row.set_number,
          rx_row.reps,
          rx_row.weight_kg,
          rx_row.load_percentage,
          rx_row.rpe,
          rx_row.tempo,
          rx_row.work_seconds,
          rx_row.distance_meters
        );
      END LOOP;
    END LOOP;
  END LOOP;
END;
$function$;

-- ---------------------------------------------------------------------------
-- VERIFY (run after apply / in dry-run before ROLLBACK):
-- ---------------------------------------------------------------------------
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE table_schema='public' AND table_name IN (
--   'workout_set_prescriptions',
--   'workout_set_entry_exercises',
--   'program_instance_set_prescriptions',
--   'program_instance_set_entry_exercises',
--   'program_progression_rules',
--   'volume_guidelines',
--   'workout_set_logs'
-- ) AND (column_name ILIKE '%rir%' OR column_name ILIKE '%rpe%') ORDER BY 1,2;
-- Expect: prescribed *.rpe, volume rpe_min/rpe_max, workout_set_logs.rpe; NO prescribed *.rir

-- SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='public' AND p.prokind='f' AND pg_get_functiondef(p.oid) ~* '\mrir\M';
-- Expect: 0 rows

-- SELECT count(*) FILTER (WHERE rpe IS NOT NULL) FROM workout_set_prescriptions;
-- Expect: same as pre-rename nonnull rir count (~1791)
