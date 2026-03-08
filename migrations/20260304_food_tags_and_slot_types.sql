-- ============================================================================
-- Migration: Food Tags, Slot Types, and Restriction Presets (Phase N1)
-- Date: 2026-03-04
-- Purpose:
--   1. Create food_tags table — dietary restriction labels per food
--   2. Create food_slot_types table — meal role per food (protein, carb, veg, etc.)
--   3. Create restriction_presets table — predefined dietary restriction profiles
--   4. Add is_common column to foods — flags everyday recognizable foods
--   5. Seed all tables with bulk data from existing USDA foods
--
-- SCHEMA FACTS (confirmed from schema inventory):
--   - foods.category = text (values: 'Protein','Grains','Vegetables','Fruits',
--                           'Dairy','Nuts','Legumes','Oils','Beverages','Condiments','General')
--   - foods.serving_size = numeric, serving_unit defaults to 'g'
--   - Import script sets serving_size=100 for all USDA foods (macros are per 100g basis)
--   - RLS pattern mirrors foods table: role = ANY (ARRAY['coach','admin'])
--   - SELECT policy: auth.role() = 'authenticated'
-- ============================================================================

-- ============================================================================
-- STEP 0 AUDIT QUERIES — Run these FIRST in Supabase SQL Editor to verify
-- current state. Results are already known from schema inventory but
-- running them confirms live data before proceeding.
-- ============================================================================
/*
-- Schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'foods'
ORDER BY ordinal_position;

-- Row count
SELECT COUNT(*) FROM foods;

-- Sample data
SELECT id, name, category, calories_per_serving, protein, carbs, fat, fiber,
       serving_size, serving_unit
FROM foods LIMIT 10;

-- Macro storage check
SELECT
  COUNT(*) as total,
  COUNT(fiber) as has_fiber,
  COUNT(CASE WHEN fiber > 0 THEN 1 END) as has_nonzero_fiber,
  COUNT(category) as has_category,
  COUNT(CASE WHEN calories_per_serving > 0 THEN 1 END) as has_calories,
  AVG(serving_size) as avg_serving_size
FROM foods;

-- Category distribution
SELECT category, COUNT(*) as count
FROM foods
WHERE category IS NOT NULL
GROUP BY category
ORDER BY count DESC;
*/

-- ============================================================================
-- PART 1: CREATE NEW TABLES
-- ============================================================================

-- 1a. food_tags — dietary restriction labels on each food
CREATE TABLE IF NOT EXISTS public.food_tags (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id     UUID        NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  tag         TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(food_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_food_tags_tag     ON public.food_tags(tag);
CREATE INDEX IF NOT EXISTS idx_food_tags_food_id ON public.food_tags(food_id);

-- 1b. food_slot_types — what meal role a food can fill (protein source, carb, veg, etc.)
CREATE TABLE IF NOT EXISTS public.food_slot_types (
  id        UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id   UUID  NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  slot_type TEXT  NOT NULL,
  UNIQUE(food_id, slot_type)
);

CREATE INDEX IF NOT EXISTS idx_food_slot_types_slot    ON public.food_slot_types(slot_type);
CREATE INDEX IF NOT EXISTS idx_food_slot_types_food_id ON public.food_slot_types(food_id);

-- 1c. restriction_presets — predefined dietary restriction profiles
CREATE TABLE IF NOT EXISTS public.restriction_presets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL UNIQUE,
  display_name TEXT        NOT NULL,
  excluded_tags TEXT[]     NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 1d. Add is_common flag to foods (flags everyday recognizable foods the generator prefers)
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS is_common BOOLEAN DEFAULT false;

-- 1e. Per-100g normalized macro columns
-- REQUIRED: audit confirmed serving_size is NOT uniformly 100g
-- (eggs = 50g, greek yogurt = 170g, cottage cheese = 113g, etc.)
-- Generator needs these to correctly scale macros to any target weight.
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS calories_per_100g NUMERIC;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS protein_per_100g  NUMERIC;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS carbs_per_100g    NUMERIC;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS fat_per_100g      NUMERIC;
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS fiber_per_100g    NUMERIC;

-- ============================================================================
-- PART 2: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.food_tags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_slot_types   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restriction_presets ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users can read (needed by generator and client views)
CREATE POLICY "Anyone can read food tags"
  ON public.food_tags FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read food slot types"
  ON public.food_slot_types FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read restriction presets"
  ON public.restriction_presets FOR SELECT
  USING (auth.role() = 'authenticated');

-- WRITE: coaches and admins only (mirrors existing foods table policies exactly)
CREATE POLICY "Coaches can manage food tags"
  ON public.food_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['coach'::text, 'admin'::text])
    )
  );

CREATE POLICY "Coaches can manage food slot types"
  ON public.food_slot_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['coach'::text, 'admin'::text])
    )
  );

-- ============================================================================
-- PART 3: SEED RESTRICTION PRESETS
-- ============================================================================

INSERT INTO public.restriction_presets (name, display_name, excluded_tags) VALUES
  ('dairy_free',   'Dairy-Free',   ARRAY['dairy']),
  ('gluten_free',  'Gluten-Free',  ARRAY['gluten']),
  ('vegetarian',   'Vegetarian',   ARRAY['meat', 'poultry', 'fish', 'shellfish']),
  ('vegan',        'Vegan',        ARRAY['meat', 'poultry', 'fish', 'shellfish', 'dairy', 'egg', 'honey']),
  ('no_beef',      'No Beef',      ARRAY['beef']),
  ('no_pork',      'No Pork',      ARRAY['pork']),
  ('no_shellfish', 'No Shellfish', ARRAY['shellfish']),
  ('no_nuts',      'No Nuts',      ARRAY['nut']),
  ('no_eggs',      'No Eggs',      ARRAY['egg']),
  ('no_soy',       'No Soy',       ARRAY['soy']),
  ('lactose_free', 'Lactose-Free', ARRAY['dairy']),
  ('pescatarian',  'Pescatarian',  ARRAY['meat', 'poultry']),
  ('halal',        'Halal',        ARRAY['pork', 'alcohol']),
  ('kosher',       'Kosher',       ARRAY['pork', 'shellfish'])
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PART 4: BULK TAG FOODS BY CATEGORY AND NAME
--
-- All conditions use 'category' (actual column), NOT 'food_group' (spec fiction).
-- Category values from USDA import script:
--   'Protein' | 'Grains' | 'Vegetables' | 'Fruits' | 'Dairy' |
--   'Nuts' | 'Legumes' | 'Oils' | 'Beverages' | 'Condiments' | 'General'
-- ============================================================================

-- DAIRY: entire Dairy category
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'dairy' FROM public.foods
WHERE category = 'Dairy'
ON CONFLICT (food_id, tag) DO NOTHING;

-- EGG: items with 'egg' in name, excluding 'eggplant'
-- (Eggs appear under both 'Dairy' and 'Protein' categories in import)
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'egg' FROM public.foods
WHERE name ILIKE '%egg%'
  AND name NOT ILIKE '%eggplant%'
ON CONFLICT (food_id, tag) DO NOTHING;

-- BEEF: Protein category filtered by beef-related name keywords
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'beef' FROM public.foods
WHERE category = 'Protein'
  AND (
    name ILIKE '%beef%'
    OR name ILIKE '%steak%'
    OR name ILIKE '%brisket%'
    OR name ILIKE '%sirloin%'
    OR name ILIKE '%ribeye%'
    OR name ILIKE '%rib eye%'
    OR name ILIKE '%chuck%'
    OR name ILIKE '%bison%'
    OR name ILIKE '%ground beef%'
    OR name ILIKE '%burger%'
  )
ON CONFLICT (food_id, tag) DO NOTHING;

-- MEAT (beef): same records also get the generic 'meat' tag
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'meat' FROM public.foods
WHERE category = 'Protein'
  AND (
    name ILIKE '%beef%'
    OR name ILIKE '%steak%'
    OR name ILIKE '%brisket%'
    OR name ILIKE '%sirloin%'
    OR name ILIKE '%ribeye%'
    OR name ILIKE '%rib eye%'
    OR name ILIKE '%chuck%'
    OR name ILIKE '%bison%'
    OR name ILIKE '%burger%'
  )
ON CONFLICT (food_id, tag) DO NOTHING;

-- PORK
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'pork' FROM public.foods
WHERE category = 'Protein'
  AND (
    name ILIKE '%pork%'
    OR name ILIKE '%bacon%'
    OR name ILIKE '%ham%'
    OR name ILIKE '%prosciutto%'
    OR name ILIKE '%salami%'
    OR name ILIKE '%sausage%'
    OR name ILIKE '%pepperoni%'
    OR name ILIKE '%chorizo%'
    OR name ILIKE '%pancetta%'
  )
ON CONFLICT (food_id, tag) DO NOTHING;

-- MEAT (pork)
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'meat' FROM public.foods
WHERE category = 'Protein'
  AND (
    name ILIKE '%pork%'
    OR name ILIKE '%bacon%'
    OR name ILIKE '%ham%'
    OR name ILIKE '%sausage%'
  )
ON CONFLICT (food_id, tag) DO NOTHING;

-- POULTRY
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'poultry' FROM public.foods
WHERE category = 'Protein'
  AND (
    name ILIKE '%chicken%'
    OR name ILIKE '%turkey%'
    OR name ILIKE '%duck%'
    OR name ILIKE '%quail%'
    OR name ILIKE '%cornish%'
    OR name ILIKE '%goose%'
    OR name ILIKE '%pheasant%'
  )
ON CONFLICT (food_id, tag) DO NOTHING;

-- MEAT (poultry)
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'meat' FROM public.foods
WHERE category = 'Protein'
  AND (
    name ILIKE '%chicken%'
    OR name ILIKE '%turkey%'
    OR name ILIKE '%duck%'
  )
ON CONFLICT (food_id, tag) DO NOTHING;

-- FISH
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'fish' FROM public.foods
WHERE category = 'Protein'
  AND (
    name ILIKE '%salmon%'
    OR name ILIKE '%tuna%'
    OR name ILIKE '%cod%'
    OR name ILIKE '%tilapia%'
    OR name ILIKE '%trout%'
    OR name ILIKE '%halibut%'
    OR name ILIKE '%bass%'
    OR name ILIKE '%flounder%'
    OR name ILIKE '%sardine%'
    OR name ILIKE '%anchovy%'
    OR name ILIKE '%mackerel%'
    OR name ILIKE '%herring%'
    OR name ILIKE '%snapper%'
    OR name ILIKE '%catfish%'
    OR name ILIKE '%mahi%'
    OR name ILIKE '%swordfish%'
    OR name ILIKE '%perch%'
    OR name ILIKE '%pollock%'
    OR name ILIKE '%haddock%'
    OR name ILIKE '%fish%'
  )
ON CONFLICT (food_id, tag) DO NOTHING;

-- SHELLFISH
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'shellfish' FROM public.foods
WHERE category = 'Protein'
  AND (
    name ILIKE '%shrimp%'
    OR name ILIKE '%crab%'
    OR name ILIKE '%lobster%'
    OR name ILIKE '%clam%'
    OR name ILIKE '%oyster%'
    OR name ILIKE '%mussel%'
    OR name ILIKE '%scallop%'
    OR name ILIKE '%prawn%'
    OR name ILIKE '%crawfish%'
    OR name ILIKE '%crayfish%'
  )
ON CONFLICT (food_id, tag) DO NOTHING;

-- GLUTEN: name-based across all categories
-- (gluten foods span Grains, Condiments, and even Protein categories)
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'gluten' FROM public.foods
WHERE
    name ILIKE '%wheat%'
    OR name ILIKE '%barley%'
    OR name ILIKE '%rye%'
    OR name ILIKE '%bread%'
    OR name ILIKE '%pasta%'
    OR name ILIKE '%flour%'
    OR name ILIKE '%noodle%'
    OR name ILIKE '%cereal%'
    OR name ILIKE '%cracker%'
    OR name ILIKE '%tortilla%'
    OR name ILIKE '%muffin%'
    OR name ILIKE '%cake%'
    OR name ILIKE '%cookie%'
    OR name ILIKE '%pancake%'
    OR name ILIKE '%waffle%'
    OR name ILIKE '%bagel%'
    OR name ILIKE '%croissant%'
    OR name ILIKE '%pretzel%'
    OR name ILIKE '%pita%'
    OR name ILIKE '%couscous%'
    OR name ILIKE '%bulgur%'
    OR name ILIKE '%seitan%'
    OR name ILIKE '%spelt%'
    OR name ILIKE '%farro%'
    OR name ILIKE '%semolina%'
ON CONFLICT (food_id, tag) DO NOTHING;

-- NUT: Nuts category + name-based fallbacks for nut-named items outside category
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'nut' FROM public.foods
WHERE
    category = 'Nuts'
    OR name ILIKE '%almond%'
    OR name ILIKE '%walnut%'
    OR name ILIKE '%cashew%'
    OR name ILIKE '%peanut%'
    OR name ILIKE '%pecan%'
    OR name ILIKE '%pistachio%'
    OR name ILIKE '%hazelnut%'
    OR name ILIKE '%macadamia%'
    OR name ILIKE '%brazil nut%'
    OR name ILIKE '%pine nut%'
    OR name ILIKE '%chestnut%'
ON CONFLICT (food_id, tag) DO NOTHING;

-- SOY
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'soy' FROM public.foods
WHERE
    name ILIKE '%soy%'
    OR name ILIKE '%tofu%'
    OR name ILIKE '%tempeh%'
    OR name ILIKE '%edamame%'
    OR name ILIKE '%miso%'
ON CONFLICT (food_id, tag) DO NOTHING;

-- HONEY (for vegan filtering)
INSERT INTO public.food_tags (food_id, tag)
SELECT id, 'honey' FROM public.foods
WHERE name ILIKE '%honey%'
ON CONFLICT (food_id, tag) DO NOTHING;

-- ============================================================================
-- PART 5: BULK MAP FOOD SLOT TYPES
--
-- All conditions use 'category' (actual column), NOT 'food_group' (spec fiction).
-- ============================================================================

-- ── PROTEIN SOURCES ────────────────────────────────────────────────────────

-- protein_meat: chicken, turkey, beef, pork, lamb, etc.
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'protein_meat' FROM public.foods
WHERE category = 'Protein'
  AND (
    name ILIKE '%chicken%'
    OR name ILIKE '%turkey%'
    OR name ILIKE '%beef%'
    OR name ILIKE '%pork%'
    OR name ILIKE '%lamb%'
    OR name ILIKE '%veal%'
    OR name ILIKE '%duck%'
    OR name ILIKE '%bison%'
    OR name ILIKE '%venison%'
    OR name ILIKE '%rabbit%'
    OR name ILIKE '%sirloin%'
    OR name ILIKE '%steak%'
    OR name ILIKE '%ground%'
    OR name ILIKE '%tenderloin%'
    OR name ILIKE '%breast%'
    OR name ILIKE '%thigh%'
    OR name ILIKE '%wing%'
    OR name ILIKE '%drumstick%'
    OR name ILIKE '%loin%'
    OR name ILIKE '%ham%'
    OR name ILIKE '%bacon%'
    OR name ILIKE '%sausage%'
    OR name ILIKE '%chorizo%'
    OR name ILIKE '%brisket%'
  )
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- protein_fish: finfish and shellfish as protein slot
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'protein_fish' FROM public.foods
WHERE category = 'Protein'
  AND (
    name ILIKE '%salmon%'
    OR name ILIKE '%tuna%'
    OR name ILIKE '%cod%'
    OR name ILIKE '%shrimp%'
    OR name ILIKE '%tilapia%'
    OR name ILIKE '%fish%'
    OR name ILIKE '%halibut%'
    OR name ILIKE '%trout%'
    OR name ILIKE '%bass%'
    OR name ILIKE '%crab%'
    OR name ILIKE '%lobster%'
    OR name ILIKE '%clam%'
    OR name ILIKE '%oyster%'
    OR name ILIKE '%scallop%'
    OR name ILIKE '%mussel%'
    OR name ILIKE '%sardine%'
    OR name ILIKE '%mackerel%'
    OR name ILIKE '%herring%'
    OR name ILIKE '%anchovy%'
    OR name ILIKE '%snapper%'
    OR name ILIKE '%flounder%'
    OR name ILIKE '%catfish%'
    OR name ILIKE '%mahi%'
    OR name ILIKE '%prawn%'
    OR name ILIKE '%pollock%'
    OR name ILIKE '%haddock%'
  )
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- protein_egg
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'protein_egg' FROM public.foods
WHERE name ILIKE '%egg%'
  AND name NOT ILIKE '%eggplant%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- protein_dairy: high-protein dairy items only (protein > 5g per serving)
-- NOTE: Audit confirmed Greek yogurt and cottage cheese are stored under category='Protein',
-- not category='Dairy'. Do NOT filter by category here — match by name only.
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'protein_dairy' FROM public.foods
WHERE (
    name ILIKE '%yogurt%'
    OR name ILIKE '%cottage cheese%'
    OR name ILIKE '%skyr%'
    OR name ILIKE '%quark%'
    OR name ILIKE '%kefir%'
    OR name ILIKE '%ricotta%'
  )
  AND protein > 5
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- protein_plant: legumes category + tofu/tempeh/seitan by name
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'protein_plant' FROM public.foods
WHERE
    category = 'Legumes'
    OR name ILIKE '%tofu%'
    OR name ILIKE '%tempeh%'
    OR name ILIKE '%lentil%'
    OR name ILIKE '%chickpea%'
    OR name ILIKE '%black bean%'
    OR name ILIKE '%kidney bean%'
    OR name ILIKE '%edamame%'
    OR name ILIKE '%seitan%'
    OR name ILIKE '%navy bean%'
    OR name ILIKE '%pinto bean%'
    OR name ILIKE '%lima bean%'
    OR name ILIKE '%white bean%'
    OR name ILIKE '%fava bean%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- protein_powder
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'protein_powder' FROM public.foods
WHERE
    name ILIKE '%protein powder%'
    OR name ILIKE '%whey%'
    OR name ILIKE '%casein%'
    OR name ILIKE '%protein isolate%'
    OR name ILIKE '%protein shake%'
    OR name ILIKE '%protein supplement%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- protein_any: any food where protein contributes >20% of total calories
-- Guard: calories_per_serving > 0 prevents division by zero
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'protein_any' FROM public.foods
WHERE calories_per_serving > 0
  AND (protein * 4.0 / calories_per_serving) > 0.20
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- ── CARB SOURCES ───────────────────────────────────────────────────────────

-- carb_grain: Grains category + name-based fallbacks
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'carb_grain' FROM public.foods
WHERE
    category = 'Grains'
    OR name ILIKE '%rice%'
    OR name ILIKE '%oat%'
    OR name ILIKE '%quinoa%'
    OR name ILIKE '%pasta%'
    OR name ILIKE '%bread%'
    OR name ILIKE '%couscous%'
    OR name ILIKE '%bulgur%'
    OR name ILIKE '%barley%'
    OR name ILIKE '%farro%'
    OR name ILIKE '%millet%'
    OR name ILIKE '%polenta%'
    OR name ILIKE '%grits%'
    OR name ILIKE '%cornmeal%'
    OR name ILIKE '%amaranth%'
    OR name ILIKE '%teff%'
    OR name ILIKE '%buckwheat%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- carb_potato: potatoes and yams
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'carb_potato' FROM public.foods
WHERE
    name ILIKE '%potato%'
    OR name ILIKE '%yam%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- carb_fruit: Fruits category + name-based fallbacks
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'carb_fruit' FROM public.foods
WHERE
    category = 'Fruits'
    OR name ILIKE '%banana%'
    OR name ILIKE '%apple%'
    OR name ILIKE '%berr%'
    OR name ILIKE '%mango%'
    OR name ILIKE '%orange%'
    OR name ILIKE '%grape%'
    OR name ILIKE '%pineapple%'
    OR name ILIKE '%peach%'
    OR name ILIKE '%pear%'
    OR name ILIKE '%strawberr%'
    OR name ILIKE '%blueberr%'
    OR name ILIKE '%raspberr%'
    OR name ILIKE '%watermelon%'
    OR name ILIKE '%cantaloupe%'
    OR name ILIKE '%kiwi%'
    OR name ILIKE '%plum%'
    OR name ILIKE '%cherry%'
    OR name ILIKE '%apricot%'
    OR name ILIKE '%fig%'
    OR name ILIKE '%date%'
    OR name ILIKE '%pomegranate%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- carb_any: any food where carbs contribute >45% of total calories
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'carb_any' FROM public.foods
WHERE calories_per_serving > 0
  AND (carbs * 4.0 / calories_per_serving) > 0.45
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- ── VEGETABLES ─────────────────────────────────────────────────────────────

-- vegetable: Vegetables category + name-based fallbacks
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'vegetable' FROM public.foods
WHERE
    category = 'Vegetables'
    OR name ILIKE '%broccoli%'
    OR name ILIKE '%spinach%'
    OR name ILIKE '%pepper%'
    OR name ILIKE '%tomato%'
    OR name ILIKE '%cucumber%'
    OR name ILIKE '%carrot%'
    OR name ILIKE '%zucchini%'
    OR name ILIKE '%asparagus%'
    OR name ILIKE '%green bean%'
    OR name ILIKE '%cauliflower%'
    OR name ILIKE '%onion%'
    OR name ILIKE '%mushroom%'
    OR name ILIKE '%cabbage%'
    OR name ILIKE '%celery%'
    OR name ILIKE '%eggplant%'
    OR name ILIKE '%brussels%'
    OR name ILIKE '%artichoke%'
    OR name ILIKE '%beet%'
    OR name ILIKE '%radish%'
    OR name ILIKE '%turnip%'
    OR name ILIKE '%leek%'
    OR name ILIKE '%fennel%'
    OR name ILIKE '%pumpkin%'
    OR name ILIKE '%squash%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- vegetable_leafy: dark leafy greens
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'vegetable_leafy' FROM public.foods
WHERE
    name ILIKE '%spinach%'
    OR name ILIKE '%kale%'
    OR name ILIKE '%lettuce%'
    OR name ILIKE '%arugula%'
    OR name ILIKE '%chard%'
    OR name ILIKE '%collard%'
    OR name ILIKE '%romaine%'
    OR name ILIKE '%mixed greens%'
    OR name ILIKE '%watercress%'
    OR name ILIKE '%endive%'
    OR name ILIKE '%radicchio%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- ── FAT SOURCES ────────────────────────────────────────────────────────────

-- fat_oil: Oils category + cooking fat items
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'fat_oil' FROM public.foods
WHERE
    category = 'Oils'
    OR name ILIKE '%olive oil%'
    OR name ILIKE '%coconut oil%'
    OR name ILIKE '%avocado oil%'
    OR name ILIKE '%canola oil%'
    OR name ILIKE '%sesame oil%'
    OR name ILIKE '%butter%'
    OR name ILIKE '%ghee%'
    OR name ILIKE '%mayonnaise%'
    OR name ILIKE '%lard%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- fat_nut: Nuts category + nut/seed butter items
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'fat_nut' FROM public.foods
WHERE
    category = 'Nuts'
    OR name ILIKE '%almond%'
    OR name ILIKE '%peanut butter%'
    OR name ILIKE '%almond butter%'
    OR name ILIKE '%walnut%'
    OR name ILIKE '%cashew%'
    OR name ILIKE '%chia%'
    OR name ILIKE '%flax%'
    OR name ILIKE '%sunflower seed%'
    OR name ILIKE '%pumpkin seed%'
    OR name ILIKE '%hemp seed%'
    OR name ILIKE '%sesame%'
    OR name ILIKE '%tahini%'
    OR name ILIKE '%pecan%'
    OR name ILIKE '%pistachio%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- fat_avocado
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'fat_avocado' FROM public.foods
WHERE name ILIKE '%avocado%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- fat_any: any food where fat contributes >40% of total calories
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'fat_any' FROM public.foods
WHERE calories_per_serving > 0
  AND (fat * 9.0 / calories_per_serving) > 0.40
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- ── BREAD (sandwich/toast template slot) ───────────────────────────────────

INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'bread' FROM public.foods
WHERE
    name ILIKE '%bread%'
    OR name ILIKE '%tortilla%'
    OR name ILIKE '%wrap%'
    OR name ILIKE '%pita%'
    OR name ILIKE '%bagel%'
    OR name ILIKE '%roll%'
    OR name ILIKE '%bun%'
    OR name ILIKE '%english muffin%'
    OR name ILIKE '%naan%'
    OR name ILIKE '%lavash%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- ── LIQUID (smoothie/oatmeal base slot) ────────────────────────────────────

INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'liquid' FROM public.foods
WHERE
    category = 'Beverages'
    OR name ILIKE '%milk%'
    OR name ILIKE '%almond milk%'
    OR name ILIKE '%oat milk%'
    OR name ILIKE '%soy milk%'
    OR name ILIKE '%coconut milk%'
    OR name ILIKE '%rice milk%'
    OR name ILIKE '%juice%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- ── CONDIMENT ──────────────────────────────────────────────────────────────

INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'condiment' FROM public.foods
WHERE
    category = 'Condiments'
    OR name ILIKE '%honey%'
    OR name ILIKE '%mustard%'
    OR name ILIKE '%ketchup%'
    OR name ILIKE '%hot sauce%'
    OR name ILIKE '%soy sauce%'
    OR name ILIKE '%salsa%'
    OR name ILIKE '%vinaigrette%'
    OR name ILIKE '%hummus%'
    OR name ILIKE '%maple syrup%'
    OR name ILIKE '%agave%'
    OR name ILIKE '%tahini%'
    OR name ILIKE '%sriracha%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- ============================================================================
-- PART 6: FLAG COMMON FOODS (is_common = true)
--
-- Marks well-known, everyday foods the generator should prefer over
-- obscure USDA scientific descriptions.
-- Target: 150–300 foods flagged.
-- ============================================================================

UPDATE public.foods SET is_common = true
WHERE name ILIKE ANY(ARRAY[
  -- Animal proteins
  '%chicken breast%',
  '%ground turkey%',
  '%ground beef%',
  '%ground chicken%',
  '%turkey breast%',
  '%pork tenderloin%',
  '%sirloin%',
  '%salmon%',
  '%tuna%',
  '%cod%',
  '%tilapia%',
  '%shrimp%',
  '%canned tuna%',
  -- Eggs
  '%whole egg%',
  '%egg white%',
  '%scrambled egg%',
  '%boiled egg%',
  -- Dairy protein
  '%greek yogurt%',
  '%cottage cheese%',
  '%skyr%',
  -- Plant protein
  '%tofu%',
  '%tempeh%',
  '%lentil%',
  '%chickpea%',
  '%black bean%',
  '%kidney bean%',
  '%edamame%',
  -- Protein supplements
  '%whey protein%',
  '%protein powder%',
  -- Grains / carbs
  '%white rice%',
  '%brown rice%',
  '%jasmine rice%',
  '%basmati rice%',
  '%rolled oat%',
  '%oatmeal%',
  '%sweet potato%',
  '%potato%',
  '%quinoa%',
  '%whole wheat bread%',
  '%sourdough%',
  '%pasta%',
  '%couscous%',
  -- Fruits
  '%banana%',
  '%apple%',
  '%blueberr%',
  '%strawberr%',
  '%raspberr%',
  '%mango%',
  '%orange%',
  '%grape%',
  '%pineapple%',
  '%peach%',
  '%pear%',
  '%watermelon%',
  '%kiwi%',
  -- Vegetables
  '%broccoli%',
  '%spinach%',
  '%asparagus%',
  '%green bean%',
  '%bell pepper%',
  '%tomato%',
  '%cucumber%',
  '%carrot%',
  '%zucchini%',
  '%cauliflower%',
  '%kale%',
  '%romaine%',
  '%onion%',
  '%mushroom%',
  '%peas%',
  '%brussels sprout%',
  -- Fats
  '%olive oil%',
  '%almond%',
  '%peanut butter%',
  '%almond butter%',
  '%avocado%',
  '%walnut%',
  '%chia seed%',
  '%flaxseed%',
  '%coconut oil%',
  '%sunflower seed%',
  -- Dairy / liquids
  '%whole milk%',
  '%skim milk%',
  '%almond milk%',
  '%oat milk%',
  '%soy milk%',
  -- Bread
  '%tortilla%',
  '%pita%',
  '%english muffin%',
  -- Condiments
  '%honey%',
  '%mustard%',
  '%hummus%'
]);

-- ============================================================================
-- PART 7: POPULATE PER-100G MACRO COLUMNS
--
-- Audit confirmed serving sizes are NOT uniform (50g for eggs, 100g for most
-- meats, 113g for cottage cheese, 170g for Greek yogurt, etc.).
-- Formula: (macro_per_serving / serving_size) * 100
-- Guard: serving_size > 0 prevents division by zero.
-- ============================================================================

UPDATE public.foods SET
  calories_per_100g = CASE WHEN serving_size > 0 THEN ROUND((calories_per_serving / serving_size) * 100, 2) ELSE NULL END,
  protein_per_100g  = CASE WHEN serving_size > 0 THEN ROUND((protein              / serving_size) * 100, 2) ELSE NULL END,
  carbs_per_100g    = CASE WHEN serving_size > 0 THEN ROUND((carbs                / serving_size) * 100, 2) ELSE NULL END,
  fat_per_100g      = CASE WHEN serving_size > 0 THEN ROUND((fat                  / serving_size) * 100, 2) ELSE NULL END,
  fiber_per_100g    = CASE WHEN serving_size > 0 THEN ROUND((COALESCE(fiber, 0)   / serving_size) * 100, 2) ELSE NULL END
WHERE serving_size > 0;

-- ============================================================================
-- PART 8: VERIFICATION QUERIES
-- Run these in Supabase SQL Editor after executing this migration.
-- ============================================================================
/*
-- 1. Tag counts — each tag should have reasonable coverage
SELECT tag, COUNT(*) AS food_count
FROM food_tags
GROUP BY tag
ORDER BY food_count DESC;

-- Expected minimums:
--   dairy: 50+, gluten: 100+, nut: 50+, meat: 50+, fish: 20+, shellfish: 10+

-- 2. Slot type counts — must have 5+ per slot or generator will fail
SELECT slot_type, COUNT(*) AS food_count
FROM food_slot_types
GROUP BY slot_type
ORDER BY food_count DESC;

-- Expected minimums:
--   protein_meat: 50+, protein_fish: 20+, protein_egg: 5+
--   protein_dairy: 10+, protein_plant: 15+, carb_grain: 30+
--   carb_potato: 5+, carb_fruit: 30+, vegetable: 40+
--   fat_nut: 20+, bread: 10+, liquid: 10+

-- 3. Any slot type critically under-represented?
SELECT slot_type, COUNT(*) AS cnt
FROM food_slot_types
GROUP BY slot_type
HAVING COUNT(*) < 5
ORDER BY cnt;

-- 4. Common foods count
SELECT COUNT(*) AS common_foods FROM foods WHERE is_common = true;
-- Target: 150–300

-- 5. Tagging coverage
SELECT
  (SELECT COUNT(DISTINCT food_id) FROM food_tags)      AS foods_with_tags,
  (SELECT COUNT(DISTINCT food_id) FROM food_slot_types) AS foods_with_slots,
  (SELECT COUNT(*) FROM foods)                          AS total_foods;

-- 6. Restriction exclusion coverage — how many foods excluded per restriction
SELECT
  rp.display_name,
  COUNT(DISTINCT ft.food_id) AS excluded_foods
FROM restriction_presets rp
CROSS JOIN LATERAL unnest(rp.excluded_tags) AS excluded_tag
JOIN food_tags ft ON ft.tag = excluded_tag
GROUP BY rp.display_name
ORDER BY excluded_foods DESC;

-- 7. Per-100g column population check
SELECT
  COUNT(*)                          AS total,
  COUNT(calories_per_100g)          AS has_cal_100g,
  COUNT(protein_per_100g)           AS has_protein_100g,
  MIN(calories_per_100g)            AS min_cal_100g,
  MAX(calories_per_100g)            AS max_cal_100g,
  AVG(serving_size)                 AS avg_serving_size
FROM foods;

-- 8. Foods with missing critical macros (unusable by generator)
SELECT COUNT(*) AS unusable_foods
FROM foods
WHERE calories_per_serving IS NULL
   OR calories_per_serving <= 0
   OR protein IS NULL
   OR carbs IS NULL
   OR fat IS NULL;

-- 9. Fiber data coverage
SELECT
  COUNT(CASE WHEN fiber IS NOT NULL AND fiber > 0 THEN 1 END) AS has_nonzero_fiber,
  COUNT(*) - COUNT(CASE WHEN fiber IS NOT NULL AND fiber > 0 THEN 1 END) AS missing_fiber,
  COUNT(*) AS total
FROM foods;
*/
