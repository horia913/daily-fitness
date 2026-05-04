CREATE OR REPLACE FUNCTION public.consume_invite_code(
  p_code text,
  p_coach_id uuid
)
RETURNS public.invite_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.invite_codes;
BEGIN
  UPDATE public.invite_codes
  SET used_count = used_count + 1,
      last_used_at = NOW()
  WHERE code = p_code
    AND coach_id = p_coach_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR used_count < max_uses)
  RETURNING * INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'invite_invalid';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_invite_code(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.rollback_invite_code(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invite_codes
  SET used_count = GREATEST(used_count - 1, 0)
  WHERE code = p_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rollback_invite_code(text) TO service_role;
