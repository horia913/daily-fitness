-- =====================================================================
-- PROGRAM SPINE REBUILD — STEP 8: per-client instance editor RPCs
-- Run once in Supabase SQL Editor (new blank tab → paste → Run).
--
-- Adds:
--   save_instance_workout_canvas  — atomic replace of instance groups/slots/prescriptions
--   clone_template_to_instance_workout — copy a coach library template into a new instance workout
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_pisp_slot_id
  ON public.program_instance_set_prescriptions (slot_id);

CREATE INDEX IF NOT EXISTS idx_pise_workout_id
  ON public.program_instance_set_entries (program_instance_workout_id);

CREATE INDEX IF NOT EXISTS idx_pisee_entry_id
  ON public.program_instance_set_entry_exercises (program_instance_set_entry_id);

-- ---------------------------------------------------------------------
-- save_instance_workout_canvas — mirror of save_workout_canvas for instances
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_instance_workout_canvas(
  p_instance_workout_id uuid,
  p_groups jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        rir,
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
        slot_row.rir,
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
          rir,
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
          rx_row.rir,
          rx_row.tempo,
          rx_row.work_seconds,
          rx_row.distance_meters
        );
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.save_instance_workout_canvas(uuid, jsonb) IS
  'Atomic instance canvas save: replace all groups/slots/prescriptions for one program_instance_workouts row.';

GRANT EXECUTE ON FUNCTION public.save_instance_workout_canvas(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------
-- clone_template_to_instance_workout — library/master template → new instance copy
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clone_template_to_instance_workout(
  p_assignment_id uuid,
  p_source_template_id uuid,
  p_instance_workout_id uuid DEFAULT gen_random_uuid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM program_instance_set_entries pise
  JOIN workout_set_entry_exercises wsee ON wsee.set_entry_id = pise.source_set_entry_id
  WHERE pise.program_instance_workout_id = v_id;

  INSERT INTO program_instance_set_prescriptions (
    slot_id, set_number, reps, weight_kg, load_percentage, rir, tempo, work_seconds, distance_meters
  )
  SELECT
    pisee.id, wsp.set_number, wsp.reps, wsp.weight_kg, wsp.load_percentage, wsp.rir, wsp.tempo,
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
$$;

COMMENT ON FUNCTION public.clone_template_to_instance_workout(uuid, uuid, uuid) IS
  'Deep-copy a coach-owned library template into a new program_instance_workouts row for one assignment.';

GRANT EXECUTE ON FUNCTION public.clone_template_to_instance_workout(uuid, uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- Read-only spot-checks (Step 8 verification)
-- ---------------------------------------------------------------------
-- Instance schedule uses program_instance_workout_id (not master template):
-- SELECT pda.id, pda.week_number, pda.program_day, pda.program_instance_workout_id, piw.name
-- FROM program_day_assignments pda
-- LEFT JOIN program_instance_workouts piw ON piw.id = pda.program_instance_workout_id
-- WHERE pda.program_assignment_id = :assignment_id
-- ORDER BY pda.day_number;

-- After instance edit, master must be unchanged:
-- SELECT wt.updated_at FROM workout_templates wt
-- WHERE wt.id IN (SELECT DISTINCT source_template_id FROM program_instance_workouts WHERE program_assignment_id = :assignment_id);
