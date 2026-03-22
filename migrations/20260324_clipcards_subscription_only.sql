-- Subscription-style rows: no clipcard_types required; session columns ignored by app.
ALTER TABLE public.clipcards
  ADD COLUMN IF NOT EXISTS plan_duration_months integer;

ALTER TABLE public.clipcards
  ALTER COLUMN clipcard_type_id DROP NOT NULL;

COMMENT ON COLUMN public.clipcards.plan_duration_months IS 'Plan length in months for subscription UX; session packs legacy may be null.';
