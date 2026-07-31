-- =====================================================================
-- PROGRAM SPINE REBUILD — STEP 2: canonical "Week X of N" + adherence
-- Run manually in the Supabase SQL editor. Pure additions — no existing
-- function/RPC/reader is changed. These are wired up in step 6.
--
-- Mirrors src/lib/programInstanceResolver.ts exactly:
--   N (total_weeks) = SUM(program_instance_phases.duration_weeks)
--   X (current_week)= compute_program_current_week(...), floored to >=1,
--                     then clamped to N when N > 0.
--   adherence       = required instance slots vs instance-keyed completions
--                     (program_day_assignment_id — NOT program_schedule_id).
--
-- Reuses the existing public.compute_program_current_week(...) for the
-- calendar/pause math — it is NOT reimplemented here.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) program_instance_total_weeks(p_assignment_id) -> integer   (= N)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.program_instance_total_weeks(p_assignment_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(pip.duration_weeks), 0)::integer
  FROM public.program_instance_phases pip
  WHERE pip.program_assignment_id = p_assignment_id;
$$;

COMMENT ON FUNCTION public.program_instance_total_weeks(uuid) IS
  'N = total weeks of a client program instance = SUM(program_instance_phases.duration_weeks). The ONLY definition of N.';

GRANT EXECUTE ON FUNCTION public.program_instance_total_weeks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.program_instance_total_weeks(uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 2) get_program_instance_week(p_assignment_id, p_target_date)
--    -> (current_week int, total_weeks int, clamped boolean)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_program_instance_week(
  p_assignment_id uuid,
  p_target_date date DEFAULT NULL
)
RETURNS TABLE(current_week integer, total_weeks integer, clamped boolean)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_pa       record;
  v_client_tz text;
  v_n        integer;
  v_raw      integer;
  v_floored  integer;
BEGIN
  SELECT pa.start_date,
         pa.pause_accumulated_days,
         pa.pause_status,
         pa.paused_at,
         pa.timezone_snapshot,
         pa.client_id
  INTO v_pa
  FROM public.program_assignments pa
  WHERE pa.id = p_assignment_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;  -- no rows for unknown assignment
  END IF;

  v_n := public.program_instance_total_weeks(p_assignment_id);

  -- tz resolution mirrors the other RPCs: snapshot -> profile -> UTC
  v_client_tz := COALESCE(
    NULLIF(v_pa.timezone_snapshot, ''),
    (SELECT NULLIF(p.timezone, '') FROM public.profiles p WHERE p.id = v_pa.client_id LIMIT 1),
    'UTC'
  );

  v_raw := public.compute_program_current_week(
    v_pa.start_date,
    v_pa.pause_accumulated_days,
    v_pa.pause_status,
    v_pa.paused_at,
    v_client_tz,
    p_target_date
  );

  v_floored := GREATEST(1, v_raw);

  IF v_n > 0 AND v_floored > v_n THEN
    current_week := v_n;
    clamped := true;
  ELSE
    current_week := v_floored;
    clamped := false;
  END IF;
  total_weeks := v_n;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.get_program_instance_week(uuid, date) IS
  'Canonical Week X of N for a client program instance. N = SUM(instance phases). X = compute_program_current_week(...) floored to >=1, clamped to N. Mirrors TS resolveInstanceProgramWeek.';

GRANT EXECUTE ON FUNCTION public.get_program_instance_week(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_program_instance_week(uuid, date) TO service_role;

-- ---------------------------------------------------------------------
-- 3) instance_adherence_for_week(p_assignment_id, p_week)
--    -> (required int, completed int)
-- ---------------------------------------------------------------------
-- required  = instance schedule slots for the week that are NOT optional
-- completed = distinct required slots with an instance-keyed completion
--             (program_day_completions.program_day_assignment_id)
CREATE OR REPLACE FUNCTION public.instance_adherence_for_week(
  p_assignment_id uuid,
  p_week integer
)
RETURNS TABLE(required integer, completed integer)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH req AS (
    SELECT pda.id
    FROM public.program_day_assignments pda
    WHERE pda.program_assignment_id = p_assignment_id
      AND pda.week_number = p_week
      AND COALESCE(pda.is_optional, false) = false
  )
  SELECT
    (SELECT COUNT(*)::int FROM req) AS required,
    (SELECT COUNT(DISTINCT pdc.program_day_assignment_id)::int
       FROM public.program_day_completions pdc
      WHERE pdc.program_assignment_id = p_assignment_id
        AND pdc.program_day_assignment_id IN (SELECT id FROM req)) AS completed;
$$;

COMMENT ON FUNCTION public.instance_adherence_for_week(uuid, integer) IS
  'Instance adherence for a week: required = non-optional instance schedule slots; completed = distinct instance-keyed completions (program_day_assignment_id). Never uses master program_schedule_id.';

GRANT EXECUTE ON FUNCTION public.instance_adherence_for_week(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.instance_adherence_for_week(uuid, integer) TO service_role;

-- =====================================================================
-- Smoke test (optional — replace the uuid with a real assignment after
-- step 3 assign exists; pre-step-3 these return N=0 / empty):
--   SELECT * FROM public.get_program_instance_week('00000000-0000-0000-0000-000000000000'::uuid);
--   SELECT public.program_instance_total_weeks('00000000-0000-0000-0000-000000000000'::uuid);
--   SELECT * FROM public.instance_adherence_for_week('00000000-0000-0000-0000-000000000000'::uuid, 1);
-- =====================================================================
