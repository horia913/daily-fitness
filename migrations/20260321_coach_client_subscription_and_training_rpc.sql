-- Subscription fields on clipcards (membership UX; session columns remain for legacy data)
ALTER TABLE public.clipcards
  ADD COLUMN IF NOT EXISTS subscription_plan_label text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric,
  ADD COLUMN IF NOT EXISTS subscription_notes text,
  ADD COLUMN IF NOT EXISTS subscription_status text;

COMMENT ON COLUMN public.clipcards.subscription_plan_label IS 'Coach-facing label e.g. 1m, 3m, 6m, custom';
COMMENT ON COLUMN public.clipcards.amount_paid IS 'Optional amount paid for the membership period';
COMMENT ON COLUMN public.clipcards.subscription_notes IS 'Coach notes (renewal, payment method, etc.)';
COMMENT ON COLUMN public.clipcards.subscription_status IS 'Optional override: active | expired | cancelled; else derive from dates + is_active';

-- Batched training read for coach UI (RLS still applies on underlying tables for non-definer paths)
CREATE OR REPLACE FUNCTION public.get_coach_client_training(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach uuid := auth.uid();
  v_row record;
  v_pa record;
  v_week int;
  v_required int := 0;
  v_completed int := 0;
BEGIN
  IF v_coach IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT 1 INTO v_row
  FROM public.clients c
  WHERE c.coach_id = v_coach AND c.client_id = p_client_id
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT pa.* INTO v_pa
  FROM public.program_assignments pa
  WHERE pa.client_id = p_client_id AND pa.status = 'active'
  ORDER BY pa.updated_at DESC NULLS LAST, pa.created_at DESC
  LIMIT 1;

  IF v_pa.id IS NOT NULL THEN
    v_week := COALESCE(
      (SELECT pp.current_week_number FROM public.program_progress pp
       WHERE pp.program_assignment_id = v_pa.id LIMIT 1),
      CASE
        WHEN COALESCE(v_pa.progression_mode, 'auto') = 'coach_managed'
          AND v_pa.coach_unlocked_week IS NOT NULL
        THEN v_pa.coach_unlocked_week
        ELSE 1
      END
    );

    SELECT COUNT(*)::int INTO v_required
    FROM public.program_schedule ps
    WHERE ps.program_id = v_pa.program_id
      AND ps.week_number = v_week
      AND COALESCE(ps.is_optional, false) = false;

    SELECT COUNT(*)::int INTO v_completed
    FROM public.program_day_completions pdc
    JOIN public.program_schedule ps ON ps.id = pdc.program_schedule_id
    WHERE pdc.program_assignment_id = v_pa.id
      AND ps.week_number = v_week
      AND COALESCE(ps.is_optional, false) = false
      AND COALESCE(pdc.notes, '') NOT LIKE 'Skipped by coach%';
  END IF;

  RETURN jsonb_build_object(
    'clientId', p_client_id,
    'activeProgram', CASE WHEN v_pa.id IS NULL THEN NULL ELSE jsonb_build_object(
      'assignmentId', v_pa.id,
      'programId', v_pa.program_id,
      'displayWeek', v_week,
      'progressionMode', COALESCE(v_pa.progression_mode, 'auto'),
      'coachUnlockedWeek', v_pa.coach_unlocked_week,
      'requiredSlotsThisWeek', v_required,
      'completedRequiredThisWeek', v_completed
    ) END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_coach_client_training(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coach_client_training(uuid) TO authenticated;
