-- ============================================================================
-- Migration: Food Log Entries (Goal-Based Nutrition Logging)
-- Date: 2026-02-17
-- Purpose: 
--   1. Create food_log_entries table for individual food logging
--   2. Add log_source column to nutrition_logs for tracking data source
--   3. Set up RLS policies for food_log_entries
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE food_log_entries TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.food_log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES public.foods(id) ON DELETE RESTRICT,
  log_date date NOT NULL,
  meal_slot text NOT NULL CHECK (meal_slot IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack')),
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  calories numeric NOT NULL CHECK (calories >= 0),
  protein_g numeric NOT NULL CHECK (protein_g >= 0),
  carbs_g numeric NOT NULL CHECK (carbs_g >= 0),
  fat_g numeric NOT NULL CHECK (fat_g >= 0),
  fiber_g numeric DEFAULT 0 CHECK (fiber_g >= 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_food_log_entries_client_date ON public.food_log_entries(client_id, log_date);
CREATE INDEX IF NOT EXISTS idx_food_log_entries_date ON public.food_log_entries(log_date);
CREATE INDEX IF NOT EXISTS idx_food_log_entries_food_id ON public.food_log_entries(food_id);
CREATE INDEX IF NOT EXISTS idx_food_log_entries_meal_slot ON public.food_log_entries(meal_slot);

-- ============================================================================
-- PART 2: ADD log_source TO nutrition_logs
-- ============================================================================

ALTER TABLE public.nutrition_logs
ADD COLUMN IF NOT EXISTS log_source text DEFAULT 'meal_plan' 
  CHECK (log_source IN ('meal_plan', 'goal_based', 'hybrid'));

-- Update existing rows to have default value
UPDATE public.nutrition_logs
SET log_source = 'meal_plan'
WHERE log_source IS NULL;

-- ============================================================================
-- PART 3: ENABLE RLS ON food_log_entries
-- ============================================================================

ALTER TABLE public.food_log_entries ENABLE ROW LEVEL SECURITY;

-- Client can CRUD their own entries
CREATE POLICY "Clients manage own food logs" ON public.food_log_entries
  FOR ALL 
  USING (auth.uid() = client_id);

-- Coach can view their clients' entries
CREATE POLICY "Coaches view client food logs" ON public.food_log_entries
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE coach_id = auth.uid() 
      AND client_id = food_log_entries.client_id
      AND status = 'active'
    )
  );

-- ============================================================================
-- PART 4: UPDATE TRIGGER FOR updated_at
-- ============================================================================

-- Trigger function (create if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for food_log_entries
DROP TRIGGER IF EXISTS update_food_log_entries_updated_at ON public.food_log_entries;
CREATE TRIGGER update_food_log_entries_updated_at
    BEFORE UPDATE ON public.food_log_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 5: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.food_log_entries IS 'Individual food log entries for goal-based nutrition tracking. Only available when coach has set nutrition goals.';
COMMENT ON COLUMN public.food_log_entries.meal_slot IS 'Meal slot: breakfast, morning_snack, lunch, afternoon_snack, dinner, evening_snack';
COMMENT ON COLUMN public.food_log_entries.quantity IS 'Quantity of food consumed';
COMMENT ON COLUMN public.food_log_entries.unit IS 'Unit for quantity (g, ml, cup, piece, etc.)';
COMMENT ON COLUMN public.food_log_entries.calories IS 'Calculated calories for this entry (quantity-adjusted)';
COMMENT ON COLUMN public.food_log_entries.protein_g IS 'Calculated protein in grams (quantity-adjusted)';
COMMENT ON COLUMN public.food_log_entries.carbs_g IS 'Calculated carbs in grams (quantity-adjusted)';
COMMENT ON COLUMN public.food_log_entries.fat_g IS 'Calculated fat in grams (quantity-adjusted)';
COMMENT ON COLUMN public.food_log_entries.fiber_g IS 'Calculated fiber in grams (quantity-adjusted)';

COMMENT ON COLUMN public.nutrition_logs.log_source IS 'Source of nutrition data: meal_plan (from meal plan assignments), goal_based (from food_log_entries), or hybrid (both combined)';
