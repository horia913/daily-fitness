-- ============================================================================
-- Check-In Configs Table
-- Coach-configurable check-in requirements per client (client_id NULL = coach default)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.check_in_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  frequency_days integer NOT NULL DEFAULT 7,
  weight_required boolean NOT NULL DEFAULT true,
  body_fat_enabled boolean NOT NULL DEFAULT true,
  photos_enabled boolean NOT NULL DEFAULT true,
  circumferences_enabled text[] NOT NULL DEFAULT '{}',
  notes_to_coach_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- One default config per coach (client_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_check_in_configs_coach_default
  ON public.check_in_configs (coach_id) WHERE client_id IS NULL;

-- One config per coach-client pair when client_id is set
CREATE UNIQUE INDEX IF NOT EXISTS idx_check_in_configs_coach_client
  ON public.check_in_configs (coach_id, client_id) WHERE client_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.check_in_configs ENABLE ROW LEVEL SECURITY;

-- Coaches can do everything on their own configs
CREATE POLICY "check_in_configs_coach_all" ON public.check_in_configs
  FOR ALL USING (coach_id = auth.uid());

-- Clients can read their own config (where client_id = auth.uid())
CREATE POLICY "check_in_configs_client_select" ON public.check_in_configs
  FOR SELECT USING (client_id = auth.uid());
