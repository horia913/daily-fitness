-- ═══════════════════════════════════════════════════════════════════════════
-- BEFORE YOU RUN: In Supabase SQL Editor click "+ New query" (new blank tab).
-- Paste THIS script into that new tab, then Run.
--
-- If the LEFT SIDEBAR tab is named "Top 20 Slowest Statements..." (or similar),
-- that saved query is a heavy pg_stat_statements report — it is NOT this migration.
-- Running that report causes: "Connection terminated due to connection timeout".
-- This migration (CREATE FUNCTION) normally finishes in a few seconds.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Batch-copy the active training block's source week schedule to all other weeks in that block.
-- Replaces N× setProgramSchedule/removeProgramSchedule round-trips from the program editor.
-- Does NOT insert program_progression_rules (progression uses week-1 / template fallbacks elsewhere).
-- Deletes coach progression rules only for program_schedule rows being removed (FK safety).
--
-- Performance: run indexes first if not already applied:
--   migrations/20260331_copy_week_schedule_rpc_indexes.sql

CREATE OR REPLACE FUNCTION public.copy_week_schedule_with_rules(
  p_program_id uuid,
  p_source_week integer,
  p_block_start_week integer,
  p_block_week_count integer,
  p_training_block_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end_week integer;
  v_rules_deleted integer := 0;
  v_sched_deleted integer := 0;
  v_inserted integer := 0;
BEGIN
  IF p_block_week_count IS NULL OR p_block_week_count < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_block_week_count');
  END IF;

  v_end_week := p_block_start_week + p_block_week_count - 1;

  IF p_source_week < p_block_start_week OR p_source_week > v_end_week THEN
    RETURN jsonb_build_object('success', false, 'error', 'source_week_outside_block');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM workout_programs wp
    WHERE wp.id = p_program_id
      AND (wp.coach_id = auth.uid() OR public.is_admin())
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- Allow larger programs to finish without default statement_timeout killing the RPC.
  PERFORM set_config('statement_timeout', '3min', true);

  -- FK: program_progression_rules.program_schedule_id -> program_schedule.id
  -- USING avoids nested-loop IN (subselect) on large tables; pair with idx_ppr_program_schedule_id.
  DELETE FROM program_progression_rules ppr
  USING program_schedule ps
  WHERE ppr.program_schedule_id = ps.id
    AND ps.program_id = p_program_id
    AND ps.week_number >= p_block_start_week
    AND ps.week_number <= v_end_week
    AND ps.week_number <> p_source_week
    AND (ps.training_block_id IS NOT DISTINCT FROM p_training_block_id);

  GET DIAGNOSTICS v_rules_deleted = ROW_COUNT;

  DELETE FROM program_schedule ps
  WHERE ps.program_id = p_program_id
    AND ps.week_number >= p_block_start_week
    AND ps.week_number <= v_end_week
    AND ps.week_number <> p_source_week
    AND (ps.training_block_id IS NOT DISTINCT FROM p_training_block_id);

  GET DIAGNOSTICS v_sched_deleted = ROW_COUNT;

  INSERT INTO program_schedule (
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
    w.target_week::integer,
    ps.template_id,
    ps.training_block_id,
    COALESCE(ps.is_optional, false),
    now()
  FROM program_schedule ps
  CROSS JOIN LATERAL (
    SELECT g AS target_week
    FROM generate_series(p_block_start_week, v_end_week) AS g
  ) w
  WHERE ps.program_id = p_program_id
    AND ps.week_number = p_source_week
    AND (ps.training_block_id IS NOT DISTINCT FROM p_training_block_id)
    AND w.target_week <> p_source_week;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'rules_deleted', v_rules_deleted,
    'schedule_rows_deleted', v_sched_deleted,
    'entries_inserted', v_inserted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.copy_week_schedule_with_rules(uuid, integer, integer, integer, uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.copy_week_schedule_with_rules(uuid, integer, integer, integer, uuid)
  TO authenticated;

COMMENT ON FUNCTION public.copy_week_schedule_with_rules(uuid, integer, integer, integer, uuid) IS
  'Coach: copy one week of program_schedule within a training block to all other weeks in that block. '
  'Does not copy progression rules. p_block_start_week + p_block_week_count-1 = inclusive end week. '
  'Use p_training_block_id NULL for legacy rows with no training_block_id.';
