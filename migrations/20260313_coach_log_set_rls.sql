-- Migration: Coach INSERT policy on workout_set_logs (defense in depth)
-- Coaches can log sets for their active clients.
-- API uses service role (bypasses RLS) but validates coach-client via clients table.
-- This policy adds defense in depth if ever using anon/authenticated client.

CREATE POLICY "Coaches can log sets for their clients"
  ON public.workout_set_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = workout_set_logs.client_id
        AND c.coach_id = auth.uid()
        AND c.status = 'active'
    )
  );

COMMENT ON POLICY "Coaches can log sets for their clients" ON public.workout_set_logs IS
'Defense in depth: allows coach to insert set logs for their active clients.';
