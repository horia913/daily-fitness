-- ============================================================================
-- Body metrics: add photos column (storage paths for progress-photos bucket)
-- ============================================================================
-- Progress photos are stored in bucket 'progress-photos' with path:
--   {recordType}/{clientId}/{recordId}/{fileName}
-- e.g. body-metrics/{client_uuid}/{body_metrics_row_id}/photo.jpg
-- Access via signed URLs (private bucket).
-- ============================================================================

ALTER TABLE public.body_metrics ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';

-- ============================================================================
-- Storage policies for progress-photos with path: recordType/clientId/recordId/file
-- (segment [1] = recordType e.g. 'body-metrics', [2] = client_id)
-- Existing 20260217 policies use (storage.foldername(name))[1] = auth.uid() for
-- paths that start with user id. These policies allow recordType/clientId/... when
-- clientId = auth.uid() (client) or client is in coach's clients (coach read).
-- ============================================================================

-- Allow clients to upload to their own client_id segment (path segment [2])
CREATE POLICY "progress_photos_insert_body_metrics_path"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow clients to read their own (path segment [2] = auth.uid())
CREATE POLICY "progress_photos_select_body_metrics_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow coaches to read progress-photos for their clients
CREATE POLICY "progress_photos_select_coach_client"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.coach_id = auth.uid()
    AND clients.client_id::text = (storage.foldername(name))[2]
  )
);

-- Allow clients to delete their own (path segment [2] = auth.uid())
CREATE POLICY "progress_photos_delete_body_metrics_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
