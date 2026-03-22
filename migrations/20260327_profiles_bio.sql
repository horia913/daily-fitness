-- Optional coach/client profile bio (schema-safe field for ClientProfileView)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;

COMMENT ON COLUMN public.profiles.bio IS 'Short bio; coach-editable on client profile when permitted by RLS.';
