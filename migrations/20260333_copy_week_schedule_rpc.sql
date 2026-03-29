-- copy_week_schedule RPC used by coach program editor.
-- Signature required by app:
--   copy_week_schedule(p_program_id uuid, p_source_week integer, p_total_weeks integer)
-- Behavior:
--   - Keep source week rows unchanged.
--   - Replace all other weeks (1..p_total_weeks) with copies of source week rows.
--   - Delete dependent program_progression_rules for removed schedule rows (FK safety).

CREATE OR REPLACE FUNCTION public.copy_week_schedule(
  p_program_id uuid,
  p_source_week integer,
  p_total_weeks integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rules_deleted integer := 0;
  v_schedule_deleted integer := 0;
  v_inserted integer := 0;
BEGIN
  IF p_total_weeks IS NULL OR p_total_weeks < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_total_weeks');
  END IF;

  IF p_source_week IS NULL OR p_source_week < 1 OR p_source_week > p_total_weeks THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_source_week');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workout_programs wp
    WHERE wp.id = p_program_id
      AND (wp.coach_id = auth.uid() OR public.is_admin())
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  DELETE FROM public.program_progression_rules ppr
  USING public.program_schedule ps
  WHERE ppr.program_schedule_id = ps.id
    AND ps.program_id = p_program_id
    AND ps.week_number BETWEEN 1 AND p_total_weeks
    AND ps.week_number <> p_source_week;

  GET DIAGNOSTICS v_rules_deleted = ROW_COUNT;

  DELETE FROM public.program_schedule ps
  WHERE ps.program_id = p_program_id
    AND ps.week_number BETWEEN 1 AND p_total_weeks
    AND ps.week_number <> p_source_week;

  GET DIAGNOSTICS v_schedule_deleted = ROW_COUNT;

  INSERT INTO public.program_schedule (
    program_id,
    day_number,
    day_of_week,
    week_number,
    template_id,
    training_block_id,
    is_optional,
    updated_at
  )
  SELECT
    ps.program_id,
    COALESCE(ps.day_number, ps.day_of_week + 1),
    ps.day_of_week,
    w.week_number,
    ps.template_id,
    ps.training_block_id,
    COALESCE(ps.is_optional, false),
    now()
  FROM public.program_schedule ps
  JOIN generate_series(1, p_total_weeks) AS w(week_number)
    ON w.week_number <> p_source_week
  WHERE ps.program_id = p_program_id
    AND ps.week_number = p_source_week;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'rules_deleted', v_rules_deleted,
    'schedule_rows_deleted', v_schedule_deleted,
    'entries_inserted', v_inserted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.copy_week_schedule(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.copy_week_schedule(uuid, integer, integer) TO authenticated;

COMMENT ON FUNCTION public.copy_week_schedule(uuid, integer, integer) IS
  'Coach: copies one source week to all other weeks 1..p_total_weeks for a program.';
-- Public alias expected by the app: copy_week_schedule(p_program_id, p_source_week, p_total_weeks [, ...]).
-- p_total_weeks = number of weeks in the training block (same as copy_week_schedule_with_rules.p_block_week_count).
-- Optional p_block_start_week (default 1) and p_training_block_id (default NULL) for multi-block programs.

CREATE OR REPLACE FUNCTION public.copy_week_schedule(
  p_program_id uuid,
  p_source_week integer,
  p_total_weeks integer,
  p_block_start_week integer DEFAULT 1,
  p_training_block_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.copy_week_schedule_with_rules(
    p_program_id,
    p_source_week,
    p_block_start_week,
    p_total_weeks,
    p_training_block_id
  );
$$;

REVOKE ALL ON FUNCTION public.copy_week_schedule(uuid, integer, integer, integer, uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.copy_week_schedule(uuid, integer, integer, integer, uuid)
  TO authenticated;

COMMENT ON FUNCTION public.copy_week_schedule(uuid, integer, integer, integer, uuid) IS
  'Coach: copy one week across other weeks in a block. Minimal call: (program_id, source_week, block_week_count) with defaults block_start=1, training_block_id=NULL.';
