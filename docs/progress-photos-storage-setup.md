# Progress Photos Storage Bucket Setup

## Step 1: Create the Storage Bucket (Dashboard)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **"New bucket"**
4. Configure:
   - **Name:** `progress-photos`
   - **Public bucket:** ❌ **UNCHECKED** (private bucket for security)
   - **File size limit:** 10 MB (recommended)
   - **Allowed MIME types:** 
     ```
     image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif
     ```
     *(These are the common formats from mobile cameras. All images are compressed to JPEG before storage.)*
5. Click **"Create bucket"**

## Step 2: Set Up Storage Policies (SQL)

Run the following SQL in your Supabase SQL Editor to create the storage policies:

```sql
-- ============================================================================
-- Progress Photos Storage Policies
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

-- Policy 6: Public read access (since bucket is public)
-- This allows photos to be displayed via public URLs
CREATE POLICY "Public can read progress photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'progress-photos');
```

## Step 3: Verify Setup

After running the SQL, verify the policies:

1. Go to **Storage** → **Policies** → Select `progress-photos` bucket
2. You should see 5 policies:
   - Clients can upload own photos (INSERT)
   - Clients can update own photos (UPDATE)
   - Clients can delete own photos (DELETE)
   - Clients can read own photos (SELECT)
   - Coaches can read client photos (SELECT)

**Note:** No public policy needed - bucket is private and uses signed URLs.

## Storage Path Structure

The app stores photos in this structure:
```
progress-photos/
  └── {client_id}/
      └── {YYYYMMDD}/
          ├── front.jpg
          ├── side.jpg
          └── back.jpg
```

Example:
```
progress-photos/
  └── 123e4567-e89b-12d3-a456-426614174000/
      └── 20260217/
          ├── front.jpg
          ├── side.jpg
          └── back.jpg
```

## Troubleshooting

### Error: "new row violates row-level security policy"
- Check that the storage policies are created correctly
- Verify the bucket name is exactly `progress-photos`
- Ensure the client is authenticated (`auth.uid()` is not null)

### Error: "Bucket not found"
- Verify the bucket exists in Storage → Buckets
- Check the bucket name matches exactly: `progress-photos`

### Photos not displaying
- **For private buckets:** Signed URLs are generated on-demand with 1-hour expiry
- If photos don't load, the signed URL may have expired - refresh the page to regenerate
- Check browser console for any CORS or authentication errors
- Verify the storage policies allow SELECT for authenticated users

### Coaches can't see client photos
- Verify the coach-client relationship exists in the `clients` table
- Check that the "Coaches can read client photos" policy is active
- Ensure the coach is authenticated
