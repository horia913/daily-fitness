-- Allow 'invited' status for private challenge invites.
ALTER TABLE public.challenge_participants
  DROP CONSTRAINT IF EXISTS challenge_participants_status_check;

ALTER TABLE public.challenge_participants
  ADD CONSTRAINT challenge_participants_status_check
  CHECK (status = ANY (ARRAY['registered'::text, 'active'::text, 'completed'::text, 'withdrawn'::text, 'invited'::text]));
