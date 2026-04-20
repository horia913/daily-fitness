-- =============================================================================
-- Phase 1: Program block invariants, data cleanup, RPCs (coach program editor)
-- =============================================================================
-- File    : 20260421_program_block_invariants_and_cleanup.sql
-- Apply   : Review entirely (data mutations in Part A). Horica runs manually
--           against Supabase after review — do not assume this has been applied.
-- Depends : public.workout_programs, training_blocks, program_schedule,
--           program_progression_rules; public.is_admin(); coach_id on programs.
--
-- Implementation notes (launch scope):
-- - Replaces public.copy_week_schedule(uuid, integer, integer): previously
--   returned jsonb; now RETURNS void (app uses supabase.rpc error only).
-- - public.copy_week_schedule(uuid, integer, integer, integer, uuid) and
--   copy_week_schedule_with_rules are NOT modified here. If those paths are
--   still callable, they retain their existing authorization behavior; align
--   in a follow-up if needed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Part A — Data cleanup (runs first)
-- -----------------------------------------------------------------------------

BEGIN;

-- 1. Clean up the test-32 program's orphan rows (22 schedule, 414 rules).
DELETE FROM program_progression_rules
WHERE program_schedule_id IN (
  SELECT ps.id FROM program_schedule ps
  WHERE ps.program_id = '631550b9-2477-42dd-b454-4548a1875556'
    AND ps.week_number > 4
);

DELETE FROM program_schedule
WHERE program_id = '631550b9-2477-42dd-b454-4548a1875556'
  AND week_number > 4;

-- 2. Delete the test-32 program entirely (it's test fixture, no user data on it).
DELETE FROM workout_programs
WHERE id = '631550b9-2477-42dd-b454-4548a1875556';

-- 3. Find and clean all other programs with orphan schedule rows (week > duration).
-- First, progression_rules tied to orphan schedule rows:
DELETE FROM program_progression_rules
WHERE program_schedule_id IN (
  SELECT ps.id
  FROM program_schedule ps
  JOIN workout_programs wp ON wp.id = ps.program_id
  WHERE ps.week_number > wp.duration_weeks
);

-- Then the orphan schedule rows themselves:
DELETE FROM program_schedule
WHERE id IN (
  SELECT ps.id
  FROM program_schedule ps
  JOIN workout_programs wp ON wp.id = ps.program_id
  WHERE ps.week_number > wp.duration_weeks
);

-- 4. Fix programs where sum(block durations) > program duration.
-- Strategy: for each such program, truncate blocks from the end until the sum matches.
DO $$
DECLARE
  r RECORD;
  block_row RECORD;
  remaining_overrun INTEGER;
BEGIN
  FOR r IN
    SELECT wp.id AS program_id, wp.duration_weeks AS target_weeks,
           COALESCE(SUM(tb.duration_weeks), 0) AS current_block_sum
    FROM workout_programs wp
    LEFT JOIN training_blocks tb ON tb.program_id = wp.id
    GROUP BY wp.id, wp.duration_weeks
    HAVING COALESCE(SUM(tb.duration_weeks), 0) > wp.duration_weeks
  LOOP
    remaining_overrun := r.current_block_sum - r.target_weeks;

    FOR block_row IN
      SELECT id, duration_weeks, block_order
      FROM training_blocks
      WHERE program_id = r.program_id
      ORDER BY block_order DESC, created_at DESC
    LOOP
      EXIT WHEN remaining_overrun <= 0;

      IF block_row.duration_weeks <= remaining_overrun THEN
        DELETE FROM training_blocks WHERE id = block_row.id;
        remaining_overrun := remaining_overrun - block_row.duration_weeks;
      ELSE
        UPDATE training_blocks
        SET duration_weeks = duration_weeks - remaining_overrun,
            updated_at = now()
        WHERE id = block_row.id;
        remaining_overrun := 0;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 5. Fix programs where sum(block durations) < program duration.
-- Strategy: grow the last block by the difference.
DO $$
DECLARE
  r RECORD;
  last_block_id UUID;
  shortfall INTEGER;
BEGIN
  FOR r IN
    SELECT wp.id AS program_id, wp.duration_weeks AS target_weeks,
           COALESCE(SUM(tb.duration_weeks), 0) AS current_block_sum
    FROM workout_programs wp
    LEFT JOIN training_blocks tb ON tb.program_id = wp.id
    GROUP BY wp.id, wp.duration_weeks
    HAVING COALESCE(SUM(tb.duration_weeks), 0) < wp.duration_weeks
  LOOP
    shortfall := r.target_weeks - r.current_block_sum;

    SELECT id INTO last_block_id
    FROM training_blocks
    WHERE program_id = r.program_id
    ORDER BY block_order DESC, created_at DESC
    LIMIT 1;

    IF last_block_id IS NOT NULL THEN
      UPDATE training_blocks
      SET duration_weeks = duration_weeks + shortfall,
          updated_at = now()
      WHERE id = last_block_id;
    ELSE
      INSERT INTO training_blocks (program_id, name, goal, duration_weeks, block_order, created_at, updated_at)
      VALUES (r.program_id, 'Block 1', 'custom', r.target_weeks, 1, now(), now());
    END IF;
  END LOOP;
END $$;

-- 6. Dedupe duplicate rows for the same (program_id, block_order).
-- Keep the earliest-created row (lowest created_at); delete the others.
DELETE FROM training_blocks t
WHERE EXISTS (
  SELECT 1
  FROM training_blocks earlier
  WHERE earlier.program_id = t.program_id
    AND earlier.block_order = t.block_order
    AND earlier.id <> t.id
    AND earlier.created_at < t.created_at
);

-- After dedupe, rerun the sum-vs-duration reconciliation (rare edge case where
-- dedupe creates a shortfall because the duplicate had non-zero duration).
DO $$
DECLARE
  r RECORD;
  last_block_id UUID;
  shortfall INTEGER;
BEGIN
  FOR r IN
    SELECT wp.id AS program_id, wp.duration_weeks AS target_weeks,
           COALESCE(SUM(tb.duration_weeks), 0) AS current_block_sum
    FROM workout_programs wp
    LEFT JOIN training_blocks tb ON tb.program_id = wp.id
    GROUP BY wp.id, wp.duration_weeks
    HAVING COALESCE(SUM(tb.duration_weeks), 0) < wp.duration_weeks
  LOOP
    shortfall := r.target_weeks - r.current_block_sum;

    SELECT id INTO last_block_id
    FROM training_blocks
    WHERE program_id = r.program_id
    ORDER BY block_order DESC, created_at DESC
    LIMIT 1;

    IF last_block_id IS NOT NULL THEN
      UPDATE training_blocks
      SET duration_weeks = duration_weeks + shortfall, updated_at = now()
      WHERE id = last_block_id;
    END IF;
  END LOOP;
END $$;

-- 7. Null out training_block_id on program_schedule (computed from week ranges in app).
-- Column retained for rollout; drop in a follow-up migration after Phase 3.
UPDATE program_schedule SET training_block_id = NULL;

COMMIT;

-- -----------------------------------------------------------------------------
-- Part B — Schema-level invariants (after data is clean)
-- -----------------------------------------------------------------------------

BEGIN;

CREATE OR REPLACE FUNCTION public.ensure_default_block_on_program_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM training_blocks WHERE program_id = NEW.id LIMIT 1
  ) THEN
    INSERT INTO training_blocks (program_id, name, goal, duration_weeks, block_order, created_at, updated_at)
    VALUES (NEW.id, 'Block 1', 'custom', COALESCE(NEW.duration_weeks, 4), 1, now(), now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_default_block_on_program_insert ON workout_programs;
CREATE TRIGGER trg_default_block_on_program_insert
AFTER INSERT ON workout_programs
FOR EACH ROW
EXECUTE FUNCTION ensure_default_block_on_program_insert();

CREATE OR REPLACE FUNCTION public.prevent_last_block_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM workout_programs WHERE id = OLD.program_id) THEN
    IF (SELECT COUNT(*) FROM training_blocks WHERE program_id = OLD.program_id) <= 1 THEN
      RAISE EXCEPTION 'Cannot delete the last block of a program. Delete the program instead, or add another block first.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_last_block_deletion ON training_blocks;
CREATE TRIGGER trg_prevent_last_block_deletion
BEFORE DELETE ON training_blocks
FOR EACH ROW
EXECUTE FUNCTION prevent_last_block_deletion();

COMMIT;

-- -----------------------------------------------------------------------------
-- Part C — RPCs (SECURITY DEFINER; coach / admin gate on each)
-- -----------------------------------------------------------------------------

-- Must DROP before CREATE: return type changes from jsonb to void.
DROP FUNCTION IF EXISTS public.copy_week_schedule(uuid, integer, integer);

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
  -- Return type was jsonb before 20260421; external SQL callers must not expect a payload.

  IF NOT EXISTS (
    SELECT 1
    FROM public.workout_programs wp
    WHERE wp.id = p_program_id
      AND (wp.coach_id = auth.uid() OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT wp.duration_weeks INTO v_program_duration
  FROM public.workout_programs wp
  WHERE wp.id = p_program_id;

  IF v_program_duration IS NULL OR v_program_duration < 1 THEN
    RAISE EXCEPTION 'invalid program duration';
  END IF;

  IF p_source_week IS NULL OR p_source_week < 1 OR p_source_week > v_program_duration THEN
    RAISE EXCEPTION 'invalid_source_week';
  END IF;

  -- p_total_weeks kept for API compatibility with the app; logic uses block ranges + program duration.

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
  'Copies the schedule pattern from p_source_week to all other weeks within the same block. Scope is block-bound, not program-wide. RETURNS void as of 20260421 (formerly jsonb).';

REVOKE ALL ON FUNCTION public.copy_week_schedule(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.copy_week_schedule(uuid, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_orphan_schedule(
  p_program_id uuid,
  p_max_week integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.workout_programs wp
    WHERE wp.id = p_program_id
      AND (wp.coach_id = auth.uid() OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  DELETE FROM program_progression_rules
  WHERE program_schedule_id IN (
    SELECT id FROM program_schedule
    WHERE program_id = p_program_id AND week_number > p_max_week
  );

  DELETE FROM program_schedule
  WHERE program_id = p_program_id AND week_number > p_max_week;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_orphan_schedule(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_orphan_schedule(uuid, integer) TO authenticated;

-- -----------------------------------------------------------------------------
-- Part D — Post-migration verification (run manually after apply)
-- -----------------------------------------------------------------------------

-- V1. No program has block sum != duration_weeks.
-- SELECT wp.id, wp.name, wp.duration_weeks,
--        COALESCE(SUM(tb.duration_weeks), 0) AS block_sum
-- FROM workout_programs wp
-- LEFT JOIN training_blocks tb ON tb.program_id = wp.id
-- GROUP BY wp.id, wp.name, wp.duration_weeks
-- HAVING COALESCE(SUM(tb.duration_weeks), 0) <> wp.duration_weeks;
-- Expected: 0 rows.

-- V2. No orphan schedule rows.
-- SELECT ps.program_id, COUNT(*)
-- FROM program_schedule ps
-- JOIN workout_programs wp ON wp.id = ps.program_id
-- WHERE ps.week_number > wp.duration_weeks
-- GROUP BY ps.program_id;
-- Expected: 0 rows.

-- V3. Every program has at least one block.
-- SELECT wp.id, wp.name
-- FROM workout_programs wp
-- LEFT JOIN training_blocks tb ON tb.program_id = wp.id
-- WHERE tb.id IS NULL;
-- Expected: 0 rows.

-- V4. No duplicate (program_id, block_order) pairs.
-- SELECT program_id, block_order, COUNT(*)
-- FROM training_blocks
-- GROUP BY program_id, block_order
-- HAVING COUNT(*) > 1;
-- Expected: 0 rows.

-- V5. test-32 is gone.
-- SELECT COUNT(*) FROM workout_programs WHERE id = '631550b9-2477-42dd-b454-4548a1875556';
-- Expected: 0.
