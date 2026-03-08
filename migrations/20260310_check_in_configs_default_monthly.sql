-- Default check-in frequency to monthly (30 days) instead of weekly (7)
ALTER TABLE public.check_in_configs
  ALTER COLUMN frequency_days SET DEFAULT 30;
