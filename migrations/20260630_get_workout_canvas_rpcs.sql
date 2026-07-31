-- =====================================================================
-- Consolidate workout canvas LOAD into one SECURITY DEFINER RPC per path.
-- Run once in Supabase SQL Editor (one paste).
--
-- Replaces client-side multi-query load (templates + entries + wsee + rx +
-- exercises) with a single round-trip. Auth checked once at the top; bypasses
-- per-row RLS evaluation on read.
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_workout_canvas — master / library / program_day templates
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_workout_canvas(p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_template jsonb;
  v_groups jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workout_templates wt
    WHERE wt.id = p_template_id AND wt.coach_id = v_caller
  ) AND NOT EXISTS (
    SELECT 1 FROM public.workout_assignments wa
    WHERE wa.workout_template_id = p_template_id AND wa.client_id = v_caller
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.program_assignments pa
    JOIN public.program_schedule ps ON ps.program_id = pa.program_id
    WHERE pa.client_id = v_caller
      AND pa.status = 'active'
      AND ps.template_id = p_template_id
  ) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id', wt.id,
    'name', wt.name,
    'description', wt.description,
    'category', wt.category,
    'difficulty_level', wt.difficulty_level,
    'estimated_duration', wt.estimated_duration,
    'kind', wt.kind,
    'source_workout_id', wt.source_workout_id
  )
  INTO v_template
  FROM public.workout_templates wt
  WHERE wt.id = p_template_id;

  IF v_template IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(group_json ORDER BY (group_json->>'set_order')::int NULLS LAST),
    '[]'::jsonb
  )
  INTO v_groups
  FROM (
    SELECT jsonb_build_object(
      'id', wse.id,
      'set_order', wse.set_order,
      'set_type', wse.set_type,
      'rounds_driver', wse.rounds_driver,
      'total_sets', wse.total_sets,
      'rest_seconds', wse.rest_seconds,
      'duration_seconds', wse.duration_seconds,
      'interval_seconds', wse.interval_seconds,
      'time_cap_seconds', wse.time_cap_seconds,
      'slots', COALESCE(
        (
          SELECT jsonb_agg(slot_json ORDER BY (slot_json->>'exercise_order')::int NULLS LAST)
          FROM (
            SELECT to_jsonb(wsee) || jsonb_build_object(
              'exercise', (
                SELECT jsonb_build_object(
                  'id', e.id,
                  'name', e.name,
                  'description', e.description
                )
                FROM public.exercises e
                WHERE e.id = wsee.exercise_id
              ),
              'prescriptions', COALESCE(
                (
                  SELECT jsonb_agg(to_jsonb(wsp) ORDER BY wsp.set_number)
                  FROM public.workout_set_prescriptions wsp
                  WHERE wsp.slot_id = wsee.id
                ),
                '[]'::jsonb
              )
            ) AS slot_json
            FROM public.workout_set_entry_exercises wsee
            WHERE wsee.set_entry_id = wse.id
          ) slot_sub
        ),
        '[]'::jsonb
      )
    ) AS group_json
    FROM public.workout_set_entries wse
    WHERE wse.template_id = p_template_id
  ) groups_sub;

  RETURN jsonb_build_object(
    'template', v_template,
    'groups', v_groups
  );
END;
$$;

COMMENT ON FUNCTION public.get_workout_canvas(uuid) IS
  'Single-call canvas load for a master template: template metadata + groups/slots/prescriptions/exercise names. Coach, assigned client, or active-program client.';

GRANT EXECUTE ON FUNCTION public.get_workout_canvas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_canvas(uuid) TO service_role;

-- ---------------------------------------------------------------------
-- get_instance_workout_canvas — client program instance workouts
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_instance_workout_canvas(p_program_instance_workout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_template jsonb;
  v_groups jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.program_instance_workouts piw
    JOIN public.program_assignments pa ON pa.id = piw.program_assignment_id
    WHERE piw.id = p_program_instance_workout_id
      AND (pa.coach_id = v_caller OR pa.client_id = v_caller)
  ) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id', piw.id,
    'name', piw.name,
    'description', piw.description,
    'category', piw.category,
    'estimated_duration', piw.estimated_duration,
    'kind', 'program_day',
    'source_template_id', piw.source_template_id
  )
  INTO v_template
  FROM public.program_instance_workouts piw
  WHERE piw.id = p_program_instance_workout_id;

  IF v_template IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(group_json ORDER BY (group_json->>'set_order')::int NULLS LAST),
    '[]'::jsonb
  )
  INTO v_groups
  FROM (
    SELECT jsonb_build_object(
      'id', pise.id,
      'set_order', pise.set_order,
      'set_type', pise.set_type,
      'rounds_driver', pise.rounds_driver,
      'total_sets', pise.total_sets,
      'rest_seconds', pise.rest_seconds,
      'duration_seconds', pise.duration_seconds,
      'interval_seconds', pise.interval_seconds,
      'time_cap_seconds', pise.time_cap_seconds,
      'slots', COALESCE(
        (
          SELECT jsonb_agg(slot_json ORDER BY (slot_json->>'exercise_order')::int NULLS LAST)
          FROM (
            SELECT to_jsonb(pisee) || jsonb_build_object(
              'exercise', (
                SELECT jsonb_build_object(
                  'id', e.id,
                  'name', e.name,
                  'description', e.description
                )
                FROM public.exercises e
                WHERE e.id = pisee.exercise_id
              ),
              'prescriptions', COALESCE(
                (
                  SELECT jsonb_agg(to_jsonb(pisp) ORDER BY pisp.set_number)
                  FROM public.program_instance_set_prescriptions pisp
                  WHERE pisp.slot_id = pisee.id
                ),
                '[]'::jsonb
              )
            ) AS slot_json
            FROM public.program_instance_set_entry_exercises pisee
            WHERE pisee.program_instance_set_entry_id = pise.id
          ) slot_sub
        ),
        '[]'::jsonb
      )
    ) AS group_json
    FROM public.program_instance_set_entries pise
    WHERE pise.program_instance_workout_id = p_program_instance_workout_id
  ) groups_sub;

  RETURN jsonb_build_object(
    'template', v_template,
    'groups', v_groups
  );
END;
$$;

COMMENT ON FUNCTION public.get_instance_workout_canvas(uuid) IS
  'Single-call canvas load for a program instance workout. Coach or owning client on the assignment.';

GRANT EXECUTE ON FUNCTION public.get_instance_workout_canvas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_instance_workout_canvas(uuid) TO service_role;
