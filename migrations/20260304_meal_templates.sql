-- ============================================================================
-- Migration: Meal Templates + Template Slots
-- Date: 2026-03-04
-- Depends on: 20260129_meal_options.sql (must be applied first)
--
-- Creates:
--   1. meal_templates     — predefined meal patterns
--   2. meal_template_slots — what slots each template has
--   3. generated_config JSONB on meal_plans — stores generator config
--
-- RLS mirrors existing foods table pattern:
--   SELECT: auth.role() = 'authenticated'
--   ALL writes: profiles.role = ANY (['coach','admin'])
-- ============================================================================

-- ============================================================================
-- PART 1: MEAL TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.meal_templates (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  meal_type        TEXT        NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description      TEXT,
  tags             TEXT[]      DEFAULT '{}',
  dietary_tags     TEXT[]      DEFAULT '{}',
  incompatible_tags TEXT[]     DEFAULT '{}',
  min_calories     INT         DEFAULT 200,
  max_calories     INT         DEFAULT 800,
  is_active        BOOLEAN     DEFAULT true,
  created_by       UUID        REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_templates_meal_type
  ON public.meal_templates(meal_type);

CREATE INDEX IF NOT EXISTS idx_meal_templates_active
  ON public.meal_templates(is_active)
  WHERE is_active = true;

-- ============================================================================
-- PART 2: MEAL TEMPLATE SLOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.meal_template_slots (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_template_id  UUID        NOT NULL REFERENCES public.meal_templates(id) ON DELETE CASCADE,
  slot_name         TEXT        NOT NULL,
  slot_type         TEXT        NOT NULL,
  is_required       BOOLEAN     DEFAULT true,
  min_portion_g     INT         DEFAULT 30,
  max_portion_g     INT         DEFAULT 400,
  default_portion_g INT         DEFAULT 150,
  order_index       INT         DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_slots_template
  ON public.meal_template_slots(meal_template_id);

-- ============================================================================
-- PART 3: ADD generated_config TO meal_plans
-- ============================================================================

ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS generated_config JSONB;

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.meal_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_template_slots  ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user (generator runs client-side, clients may see templates)
CREATE POLICY "Anyone can read meal templates"
  ON public.meal_templates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read template slots"
  ON public.meal_template_slots FOR SELECT
  USING (auth.role() = 'authenticated');

-- ALL writes: coaches and admins only
CREATE POLICY "Coaches can manage meal templates"
  ON public.meal_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['coach'::text, 'admin'::text])
    )
  );

CREATE POLICY "Coaches can manage template slots"
  ON public.meal_template_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['coach'::text, 'admin'::text])
    )
  );

-- ============================================================================
-- PART 5: VERIFICATION
-- ============================================================================
/*
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('meal_templates', 'meal_template_slots');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'meal_plans' AND column_name = 'generated_config';
*/
