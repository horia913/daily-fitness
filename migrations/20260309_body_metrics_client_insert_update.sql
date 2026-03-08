-- ============================================================================
-- body_metrics: Allow clients to INSERT and UPDATE their own rows
-- Existing policy only allows SELECT for clients; coaches have ALL.
-- Clients must be able to create/update their own check-in data (weekly flow).
-- ============================================================================

-- Clients can insert a row when client_id is their own user id
CREATE POLICY "body_metrics_clients_insert_own"
  ON public.body_metrics
  FOR INSERT
  TO public
  WITH CHECK (client_id = auth.uid());

-- Clients can update their own rows (e.g. same-day update from daily + weekly)
CREATE POLICY "body_metrics_clients_update_own"
  ON public.body_metrics
  FOR UPDATE
  TO public
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());
