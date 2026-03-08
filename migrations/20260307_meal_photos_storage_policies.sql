-- ============================================================================
-- Meal Photos Storage Bucket Policies
-- ============================================================================
-- PREREQUISITE: Bucket "meal-photos" must exist (Storage → Buckets).
-- Keep the bucket PRIVATE. Access is via signed URLs only.
--
-- Path pattern: {client_id}/{meal_id}/{timestamp}_{filename}
-- So (storage.foldername(name))[1] = client_id (as text).
-- ============================================================================

-- Policy 1: Authenticated users (clients) can upload to their own folder
CREATE POLICY "Authenticated can upload meal photos to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meal-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Authenticated users can read their own meal photos (needed for signed URLs / display)
CREATE POLICY "Authenticated can read own meal photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'meal-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Coaches can read meal photos of their clients
CREATE POLICY "Coaches can read client meal photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'meal-photos'
  AND EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.coach_id = auth.uid()
    AND clients.client_id::text = (storage.foldername(name))[1]
  )
);
