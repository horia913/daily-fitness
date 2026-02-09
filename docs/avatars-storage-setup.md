# Avatars bucket (profile pictures)

For client and coach profile picture upload to work, the Supabase Storage **avatars** bucket must allow authenticated users to upload and read their own files.

## Required setup

1. **Bucket:** Ensure the `avatars` bucket exists (Storage → Buckets).

2. **Policies:** In Storage → Policies for the `avatars` bucket, you need at least:
   - **INSERT:** Authenticated users can upload objects. Restrict the path to the user’s id, e.g. `auth.uid()::text || '/*'` or a folder pattern that includes the user id, so users can only upload into their own path.
   - **SELECT (read):** So profile pictures can be displayed (e.g. public read for the bucket, or authenticated read for objects under the user’s path).

If uploads fail with "Load failed" or RLS errors, check that:
- The signed-in user (client or coach) is allowed by the policy to **insert** into the path used by the app (e.g. `{user_id}-{timestamp}.{ext}`).
- The bucket and policies are enabled and not misconfigured.

The app shows a user-friendly message on upload failure and always resets the "Uploading…" state so the user can try again without restarting.
