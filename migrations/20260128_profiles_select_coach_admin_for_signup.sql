-- RLS: Allow listing coach and admin profiles for signup/create-user coach dropdown.
-- The dropdown runs as anon or authenticated; no existing policy allowed SELECT
-- for "all rows where role IN ('coach','admin')".
-- Role values are limited by profiles_role_check to: admin, coach, client.

CREATE POLICY "Anyone can list coach and admin profiles for signup"
ON public.profiles
FOR SELECT
TO public
USING (role IN ('coach', 'admin'));
