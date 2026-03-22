-- Subscription-only usage of public.clipcards (no clipcard_types required for new rows).
-- Run after 20260321_coach_client_subscription_and_training_rpc.sql and 20260324 if present.

ALTER TABLE public.clipcards
  ADD COLUMN IF NOT EXISTS plan_duration_months integer;

ALTER TABLE public.clipcards
  ALTER COLUMN clipcard_type_id DROP NOT NULL;

ALTER TABLE public.clipcards
  ALTER COLUMN sessions_total SET DEFAULT 0;

COMMENT ON COLUMN public.clipcards.plan_duration_months IS 'Plan length in months; subscription UX. Session-pack legacy rows may be null.';
COMMENT ON COLUMN public.clipcards.end_date IS 'Subscription end date (start + plan months).';
