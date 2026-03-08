-- ============================================================================
-- Patch: Food Tags Phase N1 — Post-Verification Fixes
-- Date: 2026-03-04
-- Depends on: 20260304_food_tags_and_slot_types.sql (must run first)
--
-- Fixes identified from verification results (208 foods total):
--
--   ISSUE 1 — is_common = 97 (target: 150–300)
--     Expansion: mark all Vegetables (64), Fruits (14), Nuts (9),
--     Legumes (5), and Oils (3) as common — these entire categories
--     contain everyday foods. Adds ~95 more, expected total: 150–170.
--
--   ISSUE 2 — protein_egg = 3 foods (minimum: 5)
--     Database contains only 3 egg-named items. Cannot exceed that with
--     keyword matching. Expand query to include egg-adjacent preparations
--     and explicitly include any remaining egg entries.
--     If still < 5 after expansion, this is a database size constraint.
--     Documented below with recommendation for Phase N2 fallback.
--
--   ISSUE 3 — fat_avocado = 2 foods (minimum: 5)
--     Database contains only 2 avocado items. This is a hard data
--     constraint with 208 total foods. Handled by adding these 2 foods
--     to the broader fat_any slot for generator fallback coverage.
--     See PHASE N2 NOTE at bottom of file.
-- ============================================================================

-- ============================================================================
-- FIX 1: EXPAND is_common — CATEGORY-BASED APPROACH
--
-- Mark entire categories where every item is a typical everyday food.
-- Vegetables (64) + Fruits (14) + Nuts (9) + Legumes (5) + Oils (3) = 95 more.
-- Combined with the 97 already flagged → expected total: ~150–170 unique foods.
-- ============================================================================

UPDATE public.foods SET is_common = true
WHERE category IN ('Vegetables', 'Fruits', 'Nuts', 'Legumes', 'Oils');

-- Also expand keyword matching for Protein and Grains that were missed
UPDATE public.foods SET is_common = true
WHERE is_common = false
  AND name ILIKE ANY(ARRAY[
    -- Broader protein terms (covers variations not caught by first pass)
    '%chicken%',
    '%turkey%',
    '%salmon%',
    '%tuna%',
    '%shrimp%',
    '%egg%',
    '%beef%',
    '%pork%',
    '%lamb%',
    '%cod%',
    '%tilapia%',
    '%yogurt%',
    '%cottage%',
    -- Broader grain terms
    '%rice%',
    '%oat%',
    '%bread%',
    '%pasta%',
    '%quinoa%',
    '%wrap%',
    '%bagel%',
    '%pita%',
    '%tortilla%',
    -- Dairy basics
    '%milk%',
    '%butter%',
    '%cheese%',
    -- Condiments / basics
    '%olive oil%',
    '%coconut oil%',
    '%honey%',
    '%mustard%',
    '%hummus%'
  ]);

-- Verification: run this after to confirm count
-- SELECT COUNT(*) AS common_foods FROM foods WHERE is_common = true;
-- Target: 150–300

-- ============================================================================
-- FIX 2: EXPAND protein_egg SLOT TYPE
--
-- Audit result: only 3 egg items exist in the database.
-- Current query already uses broad name matching (ILIKE '%egg%').
-- Expanding to include egg-adjacent terms to capture any missed entries.
-- If still < 5, this is a data volume constraint — see PHASE N2 NOTE below.
-- ============================================================================

-- Include any egg-adjacent items not previously captured
INSERT INTO public.food_slot_types (food_id, slot_type)
SELECT id, 'protein_egg' FROM public.foods
WHERE (
    name ILIKE '%egg%'
    OR name ILIKE '%egg white%'
    OR name ILIKE '%egg yolk%'
    OR name ILIKE '%egg beater%'
    OR name ILIKE '%liquid egg%'
    OR name ILIKE '%whole egg%'
    OR name ILIKE '%hard boil%'
    OR name ILIKE '%scrambled%'
    OR name ILIKE '%omelette%'
    OR name ILIKE '%frittata%'
  )
  AND name NOT ILIKE '%eggplant%'
  AND name NOT ILIKE '%eggnog%'
ON CONFLICT (food_id, slot_type) DO NOTHING;

-- Verification: SELECT slot_type, COUNT(*) FROM food_slot_types
-- WHERE slot_type = 'protein_egg' GROUP BY slot_type;

-- ============================================================================
-- FIX 3: fat_avocado DOCUMENTATION
--
-- Audit result: only 2 avocado items exist in the database.
-- This is a hard data constraint — keyword matching cannot find more
-- items than exist in the foods table.
--
-- ACTION: No SQL fix possible for the underlying data.
-- The 2 existing fat_avocado foods are already included in fat_any
-- (avocados are >40% fat calories), so generator fallback works.
--
-- PHASE N2 INSTRUCTION: When building the meal template slot resolver,
-- implement this fallback hierarchy:
--   fat_avocado → fat_nut → fat_any    (for avocado slots)
--   protein_egg → protein_any          (for egg slots)
--
-- This means the generator will never fail even if a specific slot type
-- has fewer than 5 foods — it falls back to the broader slot.
-- ============================================================================

-- Confirm fat_avocado foods are also in fat_any (they should be via ratio check)
-- SELECT f.name, fst.slot_type
-- FROM food_slot_types fst
-- JOIN foods f ON f.id = fst.food_id
-- WHERE f.name ILIKE '%avocado%'
-- ORDER BY f.name, fst.slot_type;

-- ============================================================================
-- FINAL VERIFICATION — run all of these after applying this patch
-- ============================================================================
/*
-- 1. Updated common foods count (target: 150–300)
SELECT COUNT(*) AS common_foods FROM foods WHERE is_common = true;

-- 2. Updated slot type counts
SELECT slot_type, COUNT(*) AS food_count
FROM food_slot_types
GROUP BY slot_type
ORDER BY food_count DESC;

-- 3. Any slot type still below 5? (only fat_avocado/protein_egg expected)
SELECT slot_type, COUNT(*) AS cnt
FROM food_slot_types
GROUP BY slot_type
HAVING COUNT(*) < 5
ORDER BY cnt;

-- 4. Restriction exclusion coverage (fixed ambiguous column alias)
SELECT
  rp.display_name,
  COUNT(DISTINCT ft.food_id) AS excluded_foods
FROM restriction_presets rp
CROSS JOIN LATERAL unnest(rp.excluded_tags) AS excluded_tag
JOIN food_tags ft ON ft.tag = excluded_tag
GROUP BY rp.display_name
ORDER BY excluded_foods DESC;

-- 5. Full tag coverage summary
SELECT tag, COUNT(*) AS food_count
FROM food_tags
GROUP BY tag
ORDER BY food_count DESC;
*/
