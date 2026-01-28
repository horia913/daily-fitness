-- DEBUG ONLY — remove after profiling.

CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sanitized text;
  plan_line text;
BEGIN
  IF sql IS NULL OR length(trim(sql)) = 0 THEN
    RAISE EXCEPTION 'SQL is required';
  END IF;

  IF sql ~ ';' THEN
    RAISE EXCEPTION 'Semicolons are not allowed';
  END IF;

  sanitized := ltrim(sql);

  IF NOT (sanitized ~* '^EXPLAIN') THEN
    RAISE EXCEPTION 'Only EXPLAIN statements are allowed';
  END IF;

  IF sanitized ~* '^EXPLAIN\s+ANALYZE' THEN
    RAISE EXCEPTION 'EXPLAIN ANALYZE is not allowed';
  END IF;

  FOR plan_line IN EXECUTE sanitized LOOP
    RETURN NEXT plan_line;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
