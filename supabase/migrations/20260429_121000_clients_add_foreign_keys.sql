-- Adds missing FKs from clients.coach_id and clients.client_id to profiles(id)
-- with ON DELETE CASCADE, completing the cascade chain from auth.users -> profiles -> clients.
-- Without these, deleting an auth user leaves orphaned clients rows.
--
-- IMPORTANT: Run only after confirming no orphans exist. In SQL Editor, run:
--
-- Orphan client_ids
-- SELECT c.id, c.client_id
-- FROM public.clients c
-- LEFT JOIN public.profiles p ON p.id = c.client_id
-- WHERE p.id IS NULL;
--
-- Orphan coach_ids
-- SELECT c.id, c.coach_id
-- FROM public.clients c
-- LEFT JOIN public.profiles p ON p.id = c.coach_id
-- WHERE p.id IS NULL;
--
-- If either query returns rows, fix or delete those rows before applying this migration.

ALTER TABLE public.clients
  ADD CONSTRAINT clients_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
