-- ============================================================================
-- get_client_nutrition_page RPC — Fuel page single-call data
-- Returns assignment(s), daily selection, meals with food items/options/completions, and nutrition goals.
-- Replaces 20+ queries with one RPC. SECURITY DEFINER; restricts to p_client_id.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_client_nutrition_page(uuid, date);

CREATE OR REPLACE FUNCTION public.get_client_nutrition_page(
  p_client_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_assignment record;
  v_plan_id uuid;
  v_effective_assignment_id uuid;
  v_today_selection_id uuid;
BEGIN
  -- Get today's plan selection (which assignment the client chose for this date)
  SELECT meal_plan_assignment_id INTO v_today_selection_id
  FROM client_daily_plan_selection
  WHERE client_id = p_client_id AND date = p_date
  LIMIT 1;

  -- Get active assignment(s): is_active, start_date <= p_date, end_date is null or >= p_date
  SELECT id, meal_plan_id, start_date, end_date, label, created_at
  INTO v_assignment
  FROM meal_plan_assignments
  WHERE client_id = p_client_id
    AND is_active = true
    AND start_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_assignment IS NULL THEN
    RETURN jsonb_build_object(
      'hasAssignment', false,
      'activeAssignments', '[]'::jsonb,
      'dailySelection', null,
      'meals', '[]'::jsonb,
      'nutritionGoals', '[]'::jsonb
    );
  END IF;

  v_plan_id := v_assignment.meal_plan_id;

  -- Effective assignment: today's selection if it belongs to active set, else first active
  SELECT id INTO v_effective_assignment_id
  FROM meal_plan_assignments
  WHERE client_id = p_client_id
    AND is_active = true
    AND start_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
    AND (v_today_selection_id IS NULL OR id = v_today_selection_id)
  ORDER BY CASE WHEN id = v_today_selection_id THEN 0 ELSE 1 END,
           created_at DESC
  LIMIT 1;

  IF v_effective_assignment_id IS NOT NULL THEN
    SELECT id, meal_plan_id INTO v_assignment
    FROM meal_plan_assignments WHERE id = v_effective_assignment_id;
    v_plan_id := v_assignment.meal_plan_id;
  END IF;

  result := jsonb_build_object(
    'hasAssignment', true,
    'assignmentId', v_assignment.id,
    'mealPlanId', v_plan_id,
    'activeAssignments', (
      SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb)
      FROM (
        SELECT mpa.id, mpa.meal_plan_id, mpa.start_date, mpa.end_date, mpa.label,
               row_to_json(mp) AS meal_plans
        FROM meal_plan_assignments mpa
        LEFT JOIN meal_plans mp ON mp.id = mpa.meal_plan_id
        WHERE mpa.client_id = p_client_id
          AND mpa.is_active = true
          AND mpa.start_date <= p_date
          AND (mpa.end_date IS NULL OR mpa.end_date >= p_date)
        ORDER BY mpa.created_at ASC
      ) a
    ),
    'dailySelection', (
      SELECT row_to_json(s)
      FROM (
        SELECT meal_plan_assignment_id
        FROM client_daily_plan_selection
        WHERE client_id = p_client_id AND date = p_date
        LIMIT 1
      ) s
    ),
    'meals', (
      SELECT COALESCE(jsonb_agg(meal_obj ORDER BY ord NULLS LAST), '[]'::jsonb)
      FROM (
        SELECT
          jsonb_build_object(
            'id', m.id,
            'meal_plan_id', m.meal_plan_id,
            'name', m.name,
            'meal_type', m.meal_type,
            'order_index', COALESCE(m.order_index, 0),
            'notes', m.notes,
            'food_items', (
              SELECT COALESCE(jsonb_agg(row_to_json(fi)), '[]'::jsonb)
              FROM (SELECT mfi.id, mfi.meal_id, mfi.food_id, mfi.quantity, mfi.unit, mfi.meal_option_id, row_to_json(f) AS food
                    FROM meal_food_items mfi JOIN foods f ON f.id = mfi.food_id WHERE mfi.meal_id = m.id) fi
            ),
            'options', (
              SELECT COALESCE(jsonb_agg(row_to_json(mo)), '[]'::jsonb)
              FROM (SELECT id, meal_id, name, order_index FROM meal_options WHERE meal_id = m.id ORDER BY order_index) mo
            ),
            'completion', (
              SELECT row_to_json(mc) FROM meal_completions mc
              WHERE mc.meal_id = m.id AND mc.client_id = p_client_id AND mc.date = p_date LIMIT 1
            )
          ) AS meal_obj,
          COALESCE(m.order_index, 0) AS ord
        FROM meals m
        WHERE m.meal_plan_id = v_plan_id
      ) sub
    ),
    'nutritionGoals', (
      SELECT COALESCE(jsonb_agg(row_to_json(g)), '[]'::jsonb)
      FROM (
        SELECT id, title, target_value, target_unit, current_value, progress_percentage
        FROM goals
        WHERE client_id = p_client_id
          AND pillar = 'nutrition'
          AND status = 'active'
      ) g
    )
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_client_nutrition_page(uuid, date) IS
'Returns all data for the client Fuel/nutrition page: active assignment, daily selection, meals with food items and options and completions for the date, and nutrition goals. One RPC replaces 20+ queries.';

GRANT EXECUTE ON FUNCTION public.get_client_nutrition_page(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_nutrition_page(uuid, date) TO service_role;
