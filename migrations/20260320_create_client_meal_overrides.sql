-- Per-client meal adjustments on top of assigned meal plan (does not mutate master plan rows).

CREATE TABLE IF NOT EXISTS public.client_meal_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.meal_plan_assignments(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  override_type text NOT NULL
    CHECK (override_type IN ('swap_food', 'adjust_portion', 'add_food', 'remove_food')),
  original_food_item_id uuid REFERENCES public.meal_food_items(id) ON DELETE SET NULL,
  replacement_food_id uuid REFERENCES public.foods(id) ON DELETE SET NULL,
  original_quantity numeric,
  new_quantity numeric,
  unit text,
  meal_option_id uuid REFERENCES public.meal_options(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_client_meal_overrides_assignment
  ON public.client_meal_overrides(assignment_id);

ALTER TABLE public.client_meal_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own client meal overrides"
  ON public.client_meal_overrides
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plan_assignments mpa
      WHERE mpa.id = client_meal_overrides.assignment_id
        AND mpa.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_plan_assignments mpa
      WHERE mpa.id = client_meal_overrides.assignment_id
        AND mpa.coach_id = auth.uid()
    )
  );

CREATE POLICY "Clients read own meal overrides"
  ON public.client_meal_overrides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plan_assignments mpa
      WHERE mpa.id = client_meal_overrides.assignment_id
        AND mpa.client_id = auth.uid()
    )
  );

COMMENT ON TABLE public.client_meal_overrides IS
  'Coach-defined per-assignment meal tweaks (swap/adjust/add/remove) without editing the shared meal plan.';
