# Meal Plan Generator — Evidence-Based Audit Report

**Date:** 2026-03-12  
**Scope:** Full pipeline from user inputs to final generated meal output. No code changes; evidence-only.

---

## A. FILE MAP

| File | Description |
|------|--------------|
| **`src/lib/mealPlanGeneratorService.ts`** | Core generator: config types, macro math, food loading, template filling, scoring, save to DB. No LLM. |
| **`src/app/api/coach/nutrition/generate/route.ts`** | POST API: validates config, calls `generateMealPlanWithClient(supabase, config)`, returns `{ result, foodsBySlot }`. |
| **`src/app/coach/nutrition/generator/page.tsx`** | Generator UI: Step 1 (targets), Step 2 (presets, excluded/required foods), Step 3 (review, swap, adjust, save). Builds `GeneratorConfig`, calls API, then `saveGeneratedPlan()`. |
| **`src/lib/mealPlanService.ts`** | Meal plan CRUD, assignments, meal options, food items; `calculateMealPlanMacros()`. Used for list/detail/edit, not for generation logic. |
| **`src/components/coach/MealCreator.tsx`** | Manual meal/option creation UI. |
| **`src/components/coach/MealOptionEditor.tsx`** | Edit options and food items; displays `food.name`. |
| **`src/app/coach/nutrition/meal-plans/[id]/page.tsx`** | Plan detail: loads plan + meals with options/food items; displays `item.food?.name`. |
| **`migrations/20260304_meal_templates.sql`** | Defines `meal_templates`, `meal_template_slots`. |
| **`migrations/20260304_meal_templates_seed.sql`** | Seeds 36 templates (8 breakfast, 10 lunch, 10 dinner, 8 snack) with slot types. |
| **`migrations/20260304_food_tags_and_slot_types.sql`** | `food_tags`, `food_slot_types`, `restriction_presets`; adds `is_common`, per-100g columns; bulk tags and slot mapping by category/name; **PART 6** sets `is_common` by name ILIKE list. |
| **`migrations/20260304_food_tags_patch.sql`** | Expands `is_common` (category-based + extra keywords); expands protein_egg / fat_avocado slot coverage. |
| **`scripts/import-usda-foods.js`** | Small USDA import: fixed FDC IDs, uses `foodData.description` as `name`, 100g serving. |
| **`scripts/import-extensive-usda-foods.js`** | Bulk USDA search by category/terms; uses API search result `description` as name; can produce long/scientific names. |

---

## B. CURRENT PIPELINE

1. **User inputs (generator page)**  
   Plan name, target kcal, macro mode (auto/manual), meal count (3–6), options per meal (1–3), restriction presets (→ `excludedTags`), excluded foods (→ `excludedFoodIds`), required/pinned foods (→ `requiredFoodIds`).

2. **Config built**  
   `GeneratorConfig` with `planName`, `targetKcal`, optional macro overrides, `mealCount`, `optionsPerMeal`, `excludedTags`, `excludedFoodIds`, `requiredFoodIds`, `tolerance: 0.07`.

3. **API**  
   `POST /api/coach/nutrition/generate` with body = config → `generateMealPlanWithClient(supabase, config)`.

4. **Macro targets**  
   `calculateMacroTargets(config)` → daily targets (kcal, P/C/F/fiber). Default protein 30% kcal, fat 25%, carbs remainder; fiber min 40g, scaled by kcal.

5. **Meal type assignment**  
   `assignMealTypes(mealCount)` → e.g. 4 → `["breakfast","lunch","snack","dinner"]`.

6. **Calorie distribution**  
   `distributeCalories(targets, mealTypes)` → per-meal targets (breakfast 25%, lunch/dinner 30%, snack 15% each).

7. **Data load (parallel)**  
   - **loadFilteredFoods**: (1) exclude by `excludedTags` via `food_tags`; (2) load all active foods with `calories_per_100g > 0` and per-100g macros; (3) exclude by `excludedFoodIds`; (4) raw/cooked deduplication (prefer raw); (5) load all `food_slot_types`; (6) build `foodsBySlot` only for filtered food IDs.  
   - **loadTemplates**: active `meal_templates` + `meal_template_slots` grouped by `meal_type`.

8. **Per-meal generation**  
   For each meal type in order: filter templates by `incompatible_tags` and by “all required slots have ≥1 candidate”; order templates (unused first, then shuffle); for each template call `fillTemplate()` until `optionsPerMeal` options are filled.  
   **fillTemplate**: For each slot, `getCandidates(slot.slot_type, foodsBySlot)` (with **fallbacks**, e.g. `protein_powder` → `protein_any`). Score candidates (is_common +2, unused +1, fiber bonus +25 if lagging, raw/dry +3), sort by score, **take top 5, shuffle, pick one**. Initial portion = slot `default_portion_g` clamped to min/max. Then 3 iterations of proportional scaling to hit meal calorie target; top-up/trim passes if still off. Append to `usedFoodIds` / `usedTemplateIds` from option 1.

9. **Result assembly**  
   Daily totals from option 1 of each meal; deviation %; `withinTolerance` (all macros ≤7%); warnings (veg/fiber/meal count).

10. **Save (user clicks Save)**  
    `saveGeneratedPlan(result, coachId)` → insert `meal_plans`, then `meals`, then `meal_options`, then `meal_food_items` (food_id, quantity in g, unit "g"), then update `meal_plans` computed macro columns.

**Output format:** `GeneratorResult` with `meals[]` (each `options[]` with `foods[]`: `foodId`, `foodName` = DB `foods.name`, `slotName`, `slotType`, `portionGrams`, macros). No separate display-name layer; UI shows `foodName` / `food.name` everywhere.

---

## C. FOOD SOURCE ANALYSIS

- **Where USDA enters:**  
  Foods table is populated by scripts (e.g. `import-usda-foods.js`, `import-extensive-usda-foods.js`). USDA API provides `description` (or search result item description), which is stored as `foods.name`. No normalization or “friendly” name.

- **How foods are normalized:**  
  - Per-100g columns (`calories_per_100g`, etc.) are set in migration (from per-serving / serving_size). Generator uses only per-100g for portions.  
  - Raw/cooked deduplication in generator: if both “X, raw” and “X, cooked” exist, only raw is kept in the pool so portions are raw grams.

- **Filtering:**  
  - By tag: foods that have any `excludedTags` are removed.  
  - By ID: `excludedFoodIds` removed.  
  - **No filter for “common only”:** all active foods with `calories_per_100g > 0` are in the pool.  
  - **requiredFoodIds:** passed in config but **never used** in selection or placement.

- **“Common foods” layer:**  
  - `foods.is_common` is set in migrations: first by name ILIKE list (PART 6 in `20260304_food_tags_and_slot_types.sql`), then expanded in patch by category (Vegetables, Fruits, Nuts, Legumes, Oils) and extra keywords.  
  - In generator, `is_common` only affects **scoring** in `fillTemplate`: +2. It does **not** restrict the candidate set. With “top 5 then shuffle”, a non-common food can still be chosen.  
  - So there is **no** “common foods only” layer; there is only a weak preference.

---

## D. GENERATION LOGIC

- **How foods are selected:**  
  For each slot in the template, `getCandidates(slotType, foodsBySlot, 1)` returns either direct slot list or, if too few, **fallback slot types** (e.g. `protein_powder` → `protein_any`). Candidates are scored (is_common +2, not yet used +1, fiber bonus +25 when daily fiber is lagging, raw/dry +3), sorted descending, **top 5 are shuffled and the first is picked** (`shuffleArray(scored.slice(0, 5))[0]`). So selection is **slot-local**: no cross-slot or meal-level coherence.

- **Why weird combinations are possible:**  
  1. **Slot-type fallbacks:** If a template needs e.g. `protein_powder` and there are few or no `protein_powder` foods (or they’re excluded), `getCandidates("protein_powder")` falls back to `protein_any`. `protein_any` includes any high-protein food (e.g. chicken, beef). So a “Protein Smoothie” template can get **chicken + strawberries + milk** in one meal.  
  2. **No pairing rules:** Each slot is filled independently; there are no rules like “if liquid is milk then don’t use chicken in the same meal” or “breakfast liquid should prefer milk/juice, not cream”.  
  3. **Templates are structural only:** They define slot types (e.g. protein, carb, liquid), not “this meal is a smoothie” in a way that restricts protein to powder/liquid-only. So fallbacks break template intent.  
  4. **Randomness:** Among the top 5 by score, choice is random, so uncommon but high-fiber or unused foods appear often.

---

## E. ROOT CAUSES (RANKED)

| # | Cause | Evidence | Impact |
|---|--------|----------|--------|
| 1 | **Slot-type fallbacks allow wrong semantics** | `mealPlanGeneratorService.ts` L118–134: `protein_powder` → `protein_any`; `getCandidates` L451–469 uses fallbacks when direct slot has &lt; minCount. Smoothie template can get chicken for “protein” slot. | **Highest:** Directly produces “chicken + strawberries + milk” style meals. |
| 2 | **No “common only” filter** | `loadFilteredFoods` L328–333: loads all active foods with `calories_per_100g > 0`. No `.eq('is_common', true)` or similar. | **High:** Niche/USDA-heavy DB still fully used. |
| 3 | **is_common is only a weak score (+2), then random among top 5** | `fillTemplate` L382–393: score then `shuffleArray(scored.slice(0, 5))[0]`. Non-common can out-compete when fiber/unused dominate. | **High:** Common foods not prioritized enough. |
| 4 | **requiredFoodIds never used** | Config has `requiredFoodIds` (generator page L438); no reference in `mealPlanGeneratorService.ts` in selection or placement. | **Medium:** Pinned foods don’t appear; coach expectation broken. |
| 5 | **Food names are raw DB (USDA) names** | Generator sets `foodName: p.food.name` (L621); UI and edit views use `food.name` / `foodName` with no display layer. Import scripts use USDA `description`. | **Medium:** Unfriendly or long names in output. |
| 6 | **No meal-level coherence or pairing** | No logic that considers already-picked foods in the same meal; no whitelist of “allowed pairings” or “forbidden pairings” per meal type. | **Medium:** Any combination that fits slot types is allowed. |
| 7 | **Extensive USDA import adds many odd names** | `import-extensive-usda-foods.js` uses search API; result names can be long/scientific; all get slot types by category/name and can be selected. | **Medium:** Large pool of niche options. |

---

## F. CONSTRAINTS ALREADY PRESENT

- **Meal types:** `breakfast`, `lunch`, `dinner`, `snack` with fixed distribution (breakfast 25%, lunch/dinner 30%, snacks 15% each).  
- **Templates per meal type:** 36 templates, each with fixed slots (e.g. Eggs + Toast + Fruit; Protein + Rice + Vegetables).  
- **Slot types and min/max portions:** Each slot has `min_portion_g`, `max_portion_g`, `default_portion_g`; portions are clamped and scaled.  
- **Incompatible tags:** Templates have `incompatible_tags`; if user’s `excludedTags` include any, template is skipped.  
- **Required vs optional slots:** `is_required` on slots; if a required slot has no candidates (after fallback), template is skipped.  
- **food_tags / restriction_presets:** Used only to exclude foods by tag; no “prefer” or “pair with” use.  
- **is_common:** Exists on `foods` and is used only in scoring (+2).  
- **Raw/cooked deduplication:** Generator keeps only raw when both exist.  
- **Excluded tags and excluded food IDs:** Reduce pool; no similar “required” or “prefer” logic.  
- **Serving sanity:** Portions are in grams, clamped to slot min/max and scaled to hit calorie target; no separate “serving size” display logic.

There is **no** food whitelist/blacklist beyond tag/food-id exclusion, no coach-level “common only” preference, no commonality ranking beyond the single is_common flag, and no pairing constraints.

---

## G. SAFEST FIX STRATEGY

**Goal:** More realistic, coach-friendly default output (common foods, coherent meals), with niche/specific foods still available via manual edit.

1. **Default to common foods in generation**  
   In `loadFilteredFoods`, when not explicitly “include all” (e.g. future flag), restrict the post-dedup pool to `is_common === true` (or a new “generator_common” flag). Keep full pool for swap/alternatives in UI so coaches can still pick niche foods after generation.

2. **Restrict or remove slot fallbacks for “role-specific” slots**  
   For slots that define meal character (e.g. `protein_powder`, `liquid` in a smoothie), do **not** fall back to `protein_any` or broad types when the intent is “powder only” or “beverage only”. Options: (a) no fallback for those slot types (skip template if no candidates), or (b) narrow fallbacks (e.g. protein_powder → no fallback; liquid → only beverage-like slot types). This prevents chicken in a smoothie.

3. **Use requiredFoodIds**  
   When placing foods, prefer or force placement of `requiredFoodIds` into appropriate slots (e.g. match by existing slot_type or category) so “pinned” foods actually appear in the plan.

4. **Optional: display names**  
   Add a `display_name` (or use a small mapping) for generator output so UI can show “Chicken breast” instead of “Chicken, broiler, breast, skinless, raw” without changing DB name. Lower priority; coach edit can fix names.

5. **Keep manual edit as primary way to get niche foods**  
   No need to expand generator with every specialty item; keep “common by default, swap/add in editor” as the workflow.

---

## H. IMPLEMENTATION IMPACT

| Change | Files | Effort |
|--------|--------|--------|
| Filter to common-only in generator (with full pool for swap) | `mealPlanGeneratorService.ts` (`loadFilteredFoods`), possibly generator page if we add “Include all foods” toggle | **Small** |
| Restrict fallbacks for protein_powder / liquid / similar | `mealPlanGeneratorService.ts` (`SLOT_TYPE_FALLBACKS`, `getCandidates`) | **Small** |
| Implement requiredFoodIds (prefer or place pinned foods) | `mealPlanGeneratorService.ts` (new logic in `fillTemplate` or before it, e.g. assign required foods to slots first) | **Medium** |
| Display names (mapping or column) | DB migration (optional column or table), generator output, MealOptionEditor / plan detail UI | **Medium** |
| Pairing / meal-coherence rules | `mealPlanGeneratorService.ts` (e.g. pass “already chosen in this meal” into scoring or candidate filter) | **Medium–Large** |

**Overall:** Small-to-medium refactor for “common by default + no absurd fallbacks + requiredFoodIds”. No need to rewrite the whole feature.

---

## RECOMMENDATIONS (SUMMARY)

1. **Single best architecture**  
   **Rules-first, common-by-default generator:**  
   - Load only common foods (or strongly prefer them) for the initial build.  
   - Do not use broad slot fallbacks for role-specific slots (e.g. protein_powder, liquid in smoothie).  
   - Respect requiredFoodIds by placing or strongly preferring them in matching slots.  
   - Keep templates and per-slot min/max as-is.  
   - Let coaches add/swap to niche foods in the editor.

2. **Minimal viable version**  
   - In `loadFilteredFoods`, filter to `is_common === true` (and keep one place that still loads full list for swap UI).  
   - In `getCandidates` (or fallback map), do not fall back for `protein_powder` (and optionally other “character” slots); if direct slot has no candidates, return empty so template is skipped.  
   - In `fillTemplate`, before or during slot fill, consider `requiredFoodIds`: assign each to a matching slot where possible so pinned foods appear.

3. **Fastest low-risk improvement**  
   - **Remove or narrow fallback for `protein_powder`** in `mealPlanGeneratorService.ts`: set `protein_powder: []` in `SLOT_TYPE_FALLBACKS`.  
   - Then “Protein Smoothie” will only use actual protein-powder foods; if there are none (or they’re excluded), that template is skipped and another breakfast template is used. No new APIs, no DB change, one-line (or few-line) change.  
   - Optionally do the same for other “character” slots (e.g. liquid in smoothie-only templates) after a quick audit of which templates are affected.

---

*End of audit. No code was modified; all conclusions are from traced code and migrations.*
