-- Belt-and-suspenders: jsonb_populate_record turns absent keys into NULL (not column DEFAULT).
-- Coalesce NOT NULL columns that have DB defaults so a forgotten payload key cannot 23502.
-- Run once against live Supabase (replaces existing save_workout_canvas).

CREATE OR REPLACE FUNCTION public.save_workout_canvas(
  p_workout_id uuid,
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

  DELETE FROM workout_set_prescriptions wsp
  WHERE wsp.slot_id IN (
    SELECT wsee.id
    FROM workout_set_entry_exercises wsee
    INNER JOIN workout_set_entries wse ON wse.id = wsee.set_entry_id
    WHERE wse.template_id = p_workout_id
  );

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
        slot_row.set_entry_id,
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
        rx_row := jsonb_populate_record(null::workout_set_prescriptions, rx);
        rx_row.slot_id := COALESCE(rx_row.slot_id, slot_row.id);

        INSERT INTO workout_set_prescriptions (
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

COMMENT ON FUNCTION public.save_workout_canvas(uuid, jsonb) IS
  'Atomic canvas save: replace all groups/slots/prescriptions for a workout template in one transaction.';

GRANT EXECUTE ON FUNCTION public.save_workout_canvas(uuid, jsonb) TO authenticated;
