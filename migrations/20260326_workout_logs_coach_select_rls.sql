-- Allow coaches to read workout_logs for clients on their roster (RLS).
-- Without this, getClientMetrics() uses the coach JWT and only client-scoped SELECT
-- (auth.uid() = client_id) applies — returning 0 rows for all clients.

CREATE POLICY "Coaches can read their clients workout logs"
  ON public.workout_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.client_id = workout_logs.client_id
        AND c.coach_id = auth.uid()
    )
  );

COMMENT ON POLICY "Coaches can read their clients workout logs" ON public.workout_logs IS
  'Coach dashboard /api/coach/clients metrics: batch read logs for roster clients.';
