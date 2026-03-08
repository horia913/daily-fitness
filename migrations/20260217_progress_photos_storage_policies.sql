-- ============================================================================
-- Progress Photos Storage Bucket Policies
-- ============================================================================
-- 
-- PREREQUISITE: Create the 'progress-photos' bucket in Supabase Dashboard first
-- Storage → Buckets → New bucket → Name: "progress-photos" → Public: OFF (PRIVATE)
-- 
-- RECOMMENDED ALLOWED MIME TYPES (in bucket settings):
-- image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif
--
-- Then run this SQL to set up the storage policies
-- ============================================================================

-- Policy 1: Clients can upload photos to their own folder
CREATE POLICY "Clients can upload own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Clients can update their own photos (for retakes)
CREATE POLICY "Clients can update own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Clients can delete their own photos
CREATE POLICY "Clients can delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Clients can read their own photos
CREATE POLICY "Clients can read own photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 5: Coaches can read photos of their clients
CREATE POLICY "Coaches can read client photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.coach_id = auth.uid()
    AND clients.client_id::text = (storage.foldername(name))[1]
  )
);

-- Note: No public policy needed - bucket is private
-- Photos are accessed via authenticated URLs or signed URLs
