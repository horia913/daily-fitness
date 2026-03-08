-- ============================================================================
-- Seed: 36 Meal Templates
-- Date: 2026-03-04
-- Depends on: 20260304_meal_templates.sql (tables must exist)
--
-- Counts: 8 breakfast, 10 lunch, 10 dinner, 8 snack
--
-- Each template uses CTE pattern:
--   WITH t AS (INSERT INTO meal_templates ... RETURNING id)
--   INSERT INTO meal_template_slots ...
--
-- incompatible_tags: restrictions that make this template IMPOSSIBLE
--   (after filtering, a required slot would have 0 available foods)
-- dietary_tags: restrictions this template IS compatible with
-- ============================================================================

-- ============================================================================
-- BREAKFAST (8)
-- ============================================================================

-- B1: Eggs + Toast + Fruit
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Eggs + Toast + Fruit', 'breakfast',
     'Classic egg breakfast with toast and fresh fruit',
     ARRAY['classic', 'quick'],
     ARRAY[]::text[],
     ARRAY['vegan'],
     350, 650)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Eggs',       'protein_egg',  true,  50, 200, 100, 0),
  ((SELECT id FROM t), 'Toast',      'bread',         true,  30,  80,  60, 1),
  ((SELECT id FROM t), 'Fruit',      'carb_fruit',    true,  80, 200, 120, 2),
  ((SELECT id FROM t), 'Spread/Fat', 'fat_any',       false,  5,  20,  10, 3);

-- B2: Oatmeal + Nut Butter + Berries
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Oatmeal + Nut Butter + Berries', 'breakfast',
     'Hearty oatmeal bowl with nut butter and fresh berries',
     ARRAY['classic', 'fiber_rich'],
     ARRAY['vegan', 'dairy_free'],
     ARRAY[]::text[],
     350, 650)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Oats',         'carb_grain',   true,  40, 100,  60, 0),
  ((SELECT id FROM t), 'Nut Butter',   'fat_nut',      true,  10,  40,  20, 1),
  ((SELECT id FROM t), 'Berries',      'carb_fruit',   true,  80, 200, 120, 2),
  ((SELECT id FROM t), 'Milk/Liquid',  'liquid',       false, 100, 250, 150, 3);

-- B3: Greek Yogurt + Granola + Fruit
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Greek Yogurt + Granola + Fruit', 'breakfast',
     'Creamy yogurt bowl with granola and fresh fruit',
     ARRAY['quick', 'high_protein'],
     ARRAY['vegetarian', 'gluten_free'],
     ARRAY['vegan', 'dairy_free'],
     300, 550)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Greek Yogurt',  'protein_dairy', true,  150, 300, 200, 0),
  ((SELECT id FROM t), 'Granola/Grain', 'carb_grain',    true,   30,  60,  40, 1),
  ((SELECT id FROM t), 'Fruit',         'carb_fruit',    true,   80, 200, 120, 2),
  ((SELECT id FROM t), 'Nuts/Seeds',    'fat_nut',       false,  10,  30,  15, 3);

-- B4: Protein Smoothie
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Protein Smoothie', 'breakfast',
     'Quick blended smoothie with protein powder and fruit',
     ARRAY['quick', 'portable'],
     ARRAY['gluten_free'],
     ARRAY[]::text[],
     300, 550)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Protein Powder',    'protein_powder',    true,  25,  50,  30, 0),
  ((SELECT id FROM t), 'Fruit',             'carb_fruit',        true, 100, 250, 150, 1),
  ((SELECT id FROM t), 'Liquid',            'liquid',            true, 200, 350, 250, 2),
  ((SELECT id FROM t), 'Nut Butter/Seeds',  'fat_nut',           false, 10,  25,  15, 3),
  ((SELECT id FROM t), 'Greens',            'vegetable_leafy',   false, 30,  60,  30, 4);

-- B5: Avocado Toast + Eggs
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Avocado Toast + Eggs', 'breakfast',
     'Trendy avocado toast topped with eggs',
     ARRAY['classic', 'balanced'],
     ARRAY['vegetarian'],
     ARRAY['vegan'],
     350, 650)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Toast',      'bread',        true,  40,  80,  60, 0),
  ((SELECT id FROM t), 'Avocado',    'fat_avocado',  true,  30,  80,  50, 1),
  ((SELECT id FROM t), 'Eggs',       'protein_egg',  true,  50, 150, 100, 2),
  ((SELECT id FROM t), 'Vegetables', 'vegetable',    false, 30,  80,  50, 3);

-- B6: Cottage Cheese + Fruit + Nuts
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Cottage Cheese + Fruit + Nuts', 'breakfast',
     'High-protein cottage cheese bowl',
     ARRAY['quick', 'high_protein'],
     ARRAY['vegetarian', 'gluten_free'],
     ARRAY['vegan', 'dairy_free'],
     300, 500)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Cottage Cheese', 'protein_dairy', true, 150, 300, 200, 0),
  ((SELECT id FROM t), 'Fruit',          'carb_fruit',    true,  80, 200, 120, 1),
  ((SELECT id FROM t), 'Nuts',           'fat_nut',       true,  15,  40,  20, 2);

-- B7: Breakfast Wrap
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Breakfast Wrap', 'breakfast',
     'Protein-packed breakfast wrap with eggs and vegetables',
     ARRAY['portable', 'balanced'],
     ARRAY['vegetarian'],
     ARRAY['vegan', 'gluten_free'],
     350, 600)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Wrap/Tortilla', 'bread',        true,  40,  80,  60, 0),
  ((SELECT id FROM t), 'Eggs',          'protein_egg',  true,  80, 200, 120, 1),
  ((SELECT id FROM t), 'Vegetables',    'vegetable',    true,  50, 120,  80, 2),
  ((SELECT id FROM t), 'Cheese/Fat',    'fat_any',      false, 10,  30,  20, 3);

-- B8: Overnight Oats
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Overnight Oats', 'breakfast',
     'Prep-ahead oats soaked overnight with toppings',
     ARRAY['meal_prep', 'fiber_rich'],
     ARRAY['vegetarian'],
     ARRAY[]::text[],
     350, 600)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Oats',             'carb_grain',    true,  40,  80,  60, 0),
  ((SELECT id FROM t), 'Milk/Liquid',      'liquid',        true, 150, 300, 200, 1),
  ((SELECT id FROM t), 'Fruit',            'carb_fruit',    true,  80, 150, 100, 2),
  ((SELECT id FROM t), 'Nut Butter/Seeds', 'fat_nut',       true,  10,  30,  15, 3),
  ((SELECT id FROM t), 'Yogurt',           'protein_dairy', false, 50, 100,  75, 4);

-- ============================================================================
-- LUNCH (10)
-- ============================================================================

-- L1: Protein + Rice + Vegetables
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Protein + Rice + Vegetables', 'lunch',
     'Classic balanced meal with protein, rice, and steamed vegetables',
     ARRAY['classic', 'balanced', 'meal_prep'],
     ARRAY['gluten_free', 'dairy_free'],
     ARRAY[]::text[],
     400, 750)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Protein',     'protein_any', true,  100, 250, 150, 0),
  ((SELECT id FROM t), 'Rice',        'carb_grain',  true,   80, 250, 150, 1),
  ((SELECT id FROM t), 'Vegetables',  'vegetable',   true,  100, 250, 150, 2),
  ((SELECT id FROM t), 'Cooking Fat', 'fat_oil',     false,   5,  15,  10, 3);

-- L2: Protein Salad Bowl
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Protein Salad Bowl', 'lunch',
     'Fresh salad bowl with protein and mixed vegetables',
     ARRAY['light', 'fresh'],
     ARRAY['gluten_free'],
     ARRAY[]::text[],
     350, 650)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Protein',       'protein_any',      true,  100, 250, 150, 0),
  ((SELECT id FROM t), 'Leafy Greens',  'vegetable_leafy',  true,   60, 150, 100, 1),
  ((SELECT id FROM t), 'Vegetables',    'vegetable',        true,   80, 200, 120, 2),
  ((SELECT id FROM t), 'Dressing/Fat',  'fat_oil',          true,   10,  30,  15, 3),
  ((SELECT id FROM t), 'Grain',         'carb_grain',       false,  50, 150,  80, 4);

-- L3: Sandwich
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Sandwich', 'lunch',
     'Classic sandwich with protein, bread, and vegetables',
     ARRAY['classic', 'portable', 'quick'],
     ARRAY[]::text[],
     ARRAY['gluten_free'],
     400, 700)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Bread',       'bread',        true,  50, 100,  70, 0),
  ((SELECT id FROM t), 'Protein',     'protein_any',  true,  80, 200, 120, 1),
  ((SELECT id FROM t), 'Vegetables',  'vegetable',    true,  50, 120,  80, 2),
  ((SELECT id FROM t), 'Spread/Fat',  'fat_any',      false, 10,  30,  15, 3),
  ((SELECT id FROM t), 'Condiment',   'condiment',    false, 10,  25,  15, 4);

-- L4: Grain Bowl
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Grain Bowl', 'lunch',
     'Hearty grain bowl with protein, vegetables, and dressing',
     ARRAY['balanced', 'trendy'],
     ARRAY[]::text[],
     ARRAY[]::text[],
     400, 750)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Grain Base',   'carb_grain',  true,  80, 200, 130, 0),
  ((SELECT id FROM t), 'Protein',      'protein_any', true, 100, 250, 150, 1),
  ((SELECT id FROM t), 'Vegetables',   'vegetable',   true,  80, 200, 120, 2),
  ((SELECT id FROM t), 'Avocado/Fat',  'fat_any',     true,  20,  60,  40, 3),
  ((SELECT id FROM t), 'Dressing',     'condiment',   false, 10,  30,  15, 4);

-- L5: Wrap + Protein + Salad
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Wrap + Protein + Salad', 'lunch',
     'Protein wrap with fresh salad filling',
     ARRAY['portable', 'quick'],
     ARRAY[]::text[],
     ARRAY['gluten_free'],
     400, 700)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Wrap',         'bread',            true,  40,  80,  60, 0),
  ((SELECT id FROM t), 'Protein',      'protein_any',      true, 100, 200, 130, 1),
  ((SELECT id FROM t), 'Leafy Greens', 'vegetable_leafy',  true,  40, 100,  60, 2),
  ((SELECT id FROM t), 'Vegetables',   'vegetable',        true,  50, 120,  80, 3),
  ((SELECT id FROM t), 'Spread/Fat',   'fat_any',          false, 10,  25,  15, 4);

-- L6: Pasta + Protein + Vegetables
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Pasta + Protein + Vegetables', 'lunch',
     'Pasta dish with protein and mixed vegetables',
     ARRAY['classic', 'filling'],
     ARRAY[]::text[],
     ARRAY['gluten_free'],
     450, 800)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Pasta',           'carb_grain',  true,  60, 150, 100, 0),
  ((SELECT id FROM t), 'Protein',         'protein_any', true, 100, 200, 130, 1),
  ((SELECT id FROM t), 'Vegetables',      'vegetable',   true,  80, 200, 120, 2),
  ((SELECT id FROM t), 'Cooking Fat/Oil', 'fat_oil',     true,   5,  15,  10, 3);

-- L7: Protein + Potato + Vegetables
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Protein + Potato + Vegetables', 'lunch',
     'Protein with roasted or baked potato and vegetables',
     ARRAY['classic', 'filling', 'balanced'],
     ARRAY['gluten_free', 'dairy_free'],
     ARRAY[]::text[],
     400, 750)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Protein',     'protein_any',  true,  100, 250, 150, 0),
  ((SELECT id FROM t), 'Potato',      'carb_potato',  true,  100, 300, 200, 1),
  ((SELECT id FROM t), 'Vegetables',  'vegetable',    true,  100, 250, 150, 2),
  ((SELECT id FROM t), 'Cooking Fat', 'fat_oil',      false,   5,  15,  10, 3);

-- L8: Lentil/Bean + Rice + Vegetables (plant-based)
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Lentil/Bean + Rice + Vegetables', 'lunch',
     'Plant-based protein bowl with rice and vegetables',
     ARRAY['plant_based', 'fiber_rich', 'balanced'],
     ARRAY['vegan', 'vegetarian', 'gluten_free', 'dairy_free'],
     ARRAY[]::text[],
     400, 700)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Legumes',     'protein_plant', true,  100, 250, 150, 0),
  ((SELECT id FROM t), 'Rice',        'carb_grain',    true,   80, 200, 130, 1),
  ((SELECT id FROM t), 'Vegetables',  'vegetable',     true,  100, 200, 150, 2),
  ((SELECT id FROM t), 'Cooking Fat', 'fat_oil',       false,   5,  15,  10, 3);

-- L9: Stuffed Sweet Potato
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Stuffed Sweet Potato', 'lunch',
     'Baked sweet potato with protein and vegetable toppings',
     ARRAY['balanced', 'fiber_rich'],
     ARRAY['gluten_free'],
     ARRAY[]::text[],
     400, 700)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Sweet Potato', 'carb_potato', true,  150, 350, 250, 0),
  ((SELECT id FROM t), 'Protein',      'protein_any', true,   80, 200, 130, 1),
  ((SELECT id FROM t), 'Vegetables',   'vegetable',   true,   60, 150, 100, 2),
  ((SELECT id FROM t), 'Fat/Topping',  'fat_any',     false,  15,  40,  25, 3);

-- L10: Fish + Rice + Salad
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Fish + Rice + Salad', 'lunch',
     'Light fish dish with rice and fresh salad',
     ARRAY['light', 'omega3'],
     ARRAY['gluten_free', 'dairy_free'],
     ARRAY['vegetarian', 'vegan'],
     400, 700)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Fish',          'protein_fish',     true,  100, 250, 150, 0),
  ((SELECT id FROM t), 'Rice',          'carb_grain',       true,   80, 200, 130, 1),
  ((SELECT id FROM t), 'Salad/Greens',  'vegetable_leafy',  true,   60, 150, 100, 2),
  ((SELECT id FROM t), 'Cooking Oil',   'fat_oil',          false,   5,  15,  10, 3);

-- ============================================================================
-- DINNER (10)
-- ============================================================================

-- D1: Protein + Roasted Potato + Vegetables
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Protein + Roasted Potato + Vegetables', 'dinner',
     'Classic dinner plate with protein, potato, and roasted vegetables',
     ARRAY['classic', 'balanced', 'hearty'],
     ARRAY['gluten_free', 'dairy_free'],
     ARRAY[]::text[],
     450, 800)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Protein',     'protein_any',  true,  120, 300, 180, 0),
  ((SELECT id FROM t), 'Potato',      'carb_potato',  true,  120, 350, 220, 1),
  ((SELECT id FROM t), 'Vegetables',  'vegetable',    true,  100, 250, 150, 2),
  ((SELECT id FROM t), 'Cooking Fat', 'fat_oil',      false,   5,  15,  10, 3);

-- D2: Stir-Fry + Rice
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Stir-Fry + Rice', 'dinner',
     'Quick stir-fry with protein, vegetables, and rice',
     ARRAY['quick', 'balanced'],
     ARRAY['gluten_free', 'dairy_free'],
     ARRAY[]::text[],
     450, 800)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Protein',     'protein_any', true,  120, 250, 160, 0),
  ((SELECT id FROM t), 'Rice',        'carb_grain',  true,  100, 250, 150, 1),
  ((SELECT id FROM t), 'Vegetables',  'vegetable',   true,  120, 300, 180, 2),
  ((SELECT id FROM t), 'Cooking Oil', 'fat_oil',     true,    5,  15,  10, 3),
  ((SELECT id FROM t), 'Sauce',       'condiment',   false,  10,  30,  15, 4);

-- D3: Grilled Protein + Salad + Grain
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Grilled Protein + Salad + Grain', 'dinner',
     'Grilled protein with grain and large mixed salad',
     ARRAY['light', 'balanced'],
     ARRAY[]::text[],
     ARRAY[]::text[],
     400, 750)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Protein',      'protein_any',     true,  120, 250, 160, 0),
  ((SELECT id FROM t), 'Grain',        'carb_grain',      true,   80, 200, 120, 1),
  ((SELECT id FROM t), 'Salad Greens', 'vegetable_leafy', true,   60, 150, 100, 2),
  ((SELECT id FROM t), 'Vegetables',   'vegetable',       true,   60, 150, 100, 3),
  ((SELECT id FROM t), 'Dressing',     'fat_oil',         true,   10,  25,  15, 4);

-- D4: Fish + Sweet Potato + Vegetables
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Fish + Sweet Potato + Vegetables', 'dinner',
     'Baked fish with sweet potato and steamed vegetables',
     ARRAY['healthy', 'omega3'],
     ARRAY['gluten_free', 'dairy_free'],
     ARRAY['vegetarian', 'vegan'],
     400, 750)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Fish',         'protein_fish', true,  120, 250, 160, 0),
  ((SELECT id FROM t), 'Sweet Potato', 'carb_potato',  true,  120, 350, 220, 1),
  ((SELECT id FROM t), 'Vegetables',   'vegetable',    true,  100, 250, 150, 2),
  ((SELECT id FROM t), 'Cooking Oil',  'fat_oil',      false,   5,  15,  10, 3);

-- D5: Protein Pasta + Vegetables
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Protein Pasta + Vegetables', 'dinner',
     'Pasta dinner with protein and mixed vegetables',
     ARRAY['classic', 'filling'],
     ARRAY[]::text[],
     ARRAY['gluten_free'],
     450, 850)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Pasta',       'carb_grain',  true,   70, 150, 100, 0),
  ((SELECT id FROM t), 'Protein',     'protein_any', true,  100, 250, 150, 1),
  ((SELECT id FROM t), 'Vegetables',  'vegetable',   true,   80, 200, 120, 2),
  ((SELECT id FROM t), 'Cooking Oil', 'fat_oil',     true,    5,  15,  10, 3);

-- D6: Dinner Bowl
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Dinner Bowl', 'dinner',
     'Customizable bowl with grain base, protein, and toppings',
     ARRAY['balanced', 'trendy'],
     ARRAY[]::text[],
     ARRAY[]::text[],
     450, 800)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Grain Base',       'carb_grain',  true,   80, 200, 130, 0),
  ((SELECT id FROM t), 'Protein',          'protein_any', true,  120, 250, 160, 1),
  ((SELECT id FROM t), 'Vegetables',       'vegetable',   true,   80, 200, 130, 2),
  ((SELECT id FROM t), 'Fat/Topping',      'fat_any',     true,   20,  60,  40, 3),
  ((SELECT id FROM t), 'Sauce/Dressing',   'condiment',   false,  10,  30,  15, 4);

-- D7: Lean Protein + Mashed Potato + Greens
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Lean Protein + Mashed Potato + Greens', 'dinner',
     'Comfort dinner with lean protein and creamy mashed potato',
     ARRAY['comfort', 'hearty'],
     ARRAY['gluten_free'],
     ARRAY[]::text[],
     450, 800)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Lean Protein',  'protein_meat',     true,  120, 280, 180, 0),
  ((SELECT id FROM t), 'Mashed Potato', 'carb_potato',      true,  150, 350, 250, 1),
  ((SELECT id FROM t), 'Greens',        'vegetable_leafy',  true,   60, 150, 100, 2),
  ((SELECT id FROM t), 'Fat/Butter',    'fat_any',          false,   5,  20,  10, 3);

-- D8: Salmon + Quinoa + Roasted Vegetables
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Salmon + Quinoa + Roasted Vegetables', 'dinner',
     'Omega-3 rich salmon with quinoa and roasted vegetables',
     ARRAY['healthy', 'omega3', 'fiber_rich'],
     ARRAY['gluten_free', 'dairy_free'],
     ARRAY['vegetarian', 'vegan'],
     450, 800)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Salmon/Fish',        'protein_fish', true,  120, 250, 160, 0),
  ((SELECT id FROM t), 'Quinoa/Grain',        'carb_grain',  true,   80, 200, 130, 1),
  ((SELECT id FROM t), 'Roasted Vegetables',  'vegetable',   true,  120, 300, 180, 2),
  ((SELECT id FROM t), 'Cooking Oil',         'fat_oil',     false,   5,  15,  10, 3);

-- D9: Plant Protein + Grain + Vegetables
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Plant Protein + Grain + Vegetables', 'dinner',
     'Vegan-friendly dinner with plant protein and grain',
     ARRAY['plant_based', 'fiber_rich'],
     ARRAY['vegan', 'vegetarian', 'gluten_free', 'dairy_free'],
     ARRAY[]::text[],
     400, 750)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Plant Protein', 'protein_plant', true,  100, 250, 150, 0),
  ((SELECT id FROM t), 'Grain',         'carb_grain',    true,   80, 200, 130, 1),
  ((SELECT id FROM t), 'Vegetables',    'vegetable',     true,  100, 250, 150, 2),
  ((SELECT id FROM t), 'Cooking Oil',   'fat_oil',       false,   5,  15,  10, 3);

-- D10: Simple Protein + Rice + Veggies
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Simple Protein + Rice + Veggies', 'dinner',
     'No-fuss dinner plate: protein, rice, vegetables',
     ARRAY['simple', 'meal_prep', 'classic'],
     ARRAY['gluten_free', 'dairy_free'],
     ARRAY[]::text[],
     400, 800)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Protein',     'protein_any', true,  120, 280, 180, 0),
  ((SELECT id FROM t), 'Rice',        'carb_grain',  true,  100, 250, 150, 1),
  ((SELECT id FROM t), 'Vegetables',  'vegetable',   true,  100, 250, 150, 2),
  ((SELECT id FROM t), 'Cooking Oil', 'fat_oil',     false,   5,  15,  10, 3);

-- ============================================================================
-- SNACK (8)
-- ============================================================================

-- S1: Greek Yogurt + Fruit
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Greek Yogurt + Fruit', 'snack',
     'Quick high-protein yogurt snack with fresh fruit',
     ARRAY['quick', 'high_protein'],
     ARRAY['vegetarian', 'gluten_free'],
     ARRAY['vegan', 'dairy_free'],
     150, 350)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Greek Yogurt', 'protein_dairy', true, 100, 250, 170, 0),
  ((SELECT id FROM t), 'Fruit',        'carb_fruit',    true,  60, 150, 100, 1);

-- S2: Protein Shake
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Protein Shake', 'snack',
     'Quick protein shake with liquid and optional fruit',
     ARRAY['quick', 'portable', 'high_protein'],
     ARRAY['gluten_free'],
     ARRAY[]::text[],
     150, 350)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Protein Powder', 'protein_powder', true,  25,  50,  30, 0),
  ((SELECT id FROM t), 'Liquid',         'liquid',         true, 200, 400, 300, 1),
  ((SELECT id FROM t), 'Fruit',          'carb_fruit',     false, 50, 150,  80, 2);

-- S3: Nuts + Fruit
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Nuts + Fruit', 'snack',
     'Simple snack of mixed nuts and fresh fruit',
     ARRAY['quick', 'portable'],
     ARRAY['vegan', 'gluten_free', 'dairy_free'],
     ARRAY[]::text[],
     150, 350)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Nuts',  'fat_nut',    true,  20,  50,  30, 0),
  ((SELECT id FROM t), 'Fruit', 'carb_fruit', true,  80, 200, 120, 1);

-- S4: Rice Cakes + Nut Butter
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Rice Cakes + Nut Butter', 'snack',
     'Light and crunchy rice cakes with nut butter',
     ARRAY['quick', 'portable'],
     ARRAY['vegan', 'gluten_free', 'dairy_free'],
     ARRAY[]::text[],
     150, 300)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Rice Cakes', 'carb_grain', true, 20,  50,  30, 0),
  ((SELECT id FROM t), 'Nut Butter', 'fat_nut',    true, 15,  40,  25, 1);

-- S5: Cottage Cheese + Berries
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Cottage Cheese + Berries', 'snack',
     'High-protein cottage cheese with mixed berries',
     ARRAY['quick', 'high_protein'],
     ARRAY['vegetarian', 'gluten_free'],
     ARRAY['vegan', 'dairy_free'],
     150, 350)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Cottage Cheese', 'protein_dairy', true, 100, 250, 170, 0),
  ((SELECT id FROM t), 'Berries',        'carb_fruit',    true,  60, 150, 100, 1);

-- S6: Boiled Eggs + Fruit
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Boiled Eggs + Fruit', 'snack',
     'Simple protein snack with boiled eggs and fruit',
     ARRAY['quick', 'portable', 'high_protein'],
     ARRAY['dairy_free', 'gluten_free'],
     ARRAY['vegan'],
     150, 350)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Eggs',  'protein_egg', true,  50, 150, 100, 0),
  ((SELECT id FROM t), 'Fruit', 'carb_fruit',  true,  80, 200, 120, 1);

-- S7: Hummus + Veggies
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Hummus + Veggies', 'snack',
     'Plant-based snack with hummus and cut vegetables',
     ARRAY['plant_based', 'fiber_rich'],
     ARRAY['vegan', 'gluten_free', 'dairy_free'],
     ARRAY[]::text[],
     100, 300)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Hummus',          'protein_plant', true,  40, 100,  60, 0),
  ((SELECT id FROM t), 'Vegetables',      'vegetable',     true,  80, 200, 120, 1),
  ((SELECT id FROM t), 'Crackers/Grain',  'carb_grain',    false, 20,  40,  25, 2);

-- S8: Fruit Smoothie
WITH t AS (
  INSERT INTO public.meal_templates
    (name, meal_type, description, tags, dietary_tags, incompatible_tags, min_calories, max_calories)
  VALUES
    ('Fruit Smoothie', 'snack',
     'Refreshing smoothie with protein and fruit',
     ARRAY['quick', 'refreshing'],
     ARRAY['gluten_free'],
     ARRAY[]::text[],
     150, 350)
  RETURNING id
)
INSERT INTO public.meal_template_slots
  (meal_template_id, slot_name, slot_type, is_required, min_portion_g, max_portion_g, default_portion_g, order_index)
VALUES
  ((SELECT id FROM t), 'Protein Powder', 'protein_powder',   true,  20,  40,  25, 0),
  ((SELECT id FROM t), 'Fruit',          'carb_fruit',       true, 100, 250, 150, 1),
  ((SELECT id FROM t), 'Liquid',         'liquid',           true, 150, 350, 250, 2),
  ((SELECT id FROM t), 'Greens',         'vegetable_leafy',  false, 20,  50,  30, 3);

-- ============================================================================
-- VERIFY
-- ============================================================================
/*
SELECT meal_type, COUNT(*) AS template_count
FROM meal_templates
GROUP BY meal_type
ORDER BY meal_type;
-- Expected: breakfast=8, dinner=10, lunch=10, snack=8

SELECT mt.name, mt.meal_type, COUNT(mts.id) AS slot_count
FROM meal_templates mt
JOIN meal_template_slots mts ON mts.meal_template_id = mt.id
GROUP BY mt.id, mt.name, mt.meal_type
ORDER BY mt.meal_type, mt.name;
*/
