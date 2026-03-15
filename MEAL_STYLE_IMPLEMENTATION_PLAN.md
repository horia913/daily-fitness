# Meal Style + Pre-Validation — Implementation Plan

## Phase 0 — Audit Summary

### A. Files to Modify

| File | Role |
|------|------|
| `src/lib/mealPlanGeneratorService.ts` | Config types, template-style mapping, style filtering in generateMeal, pre-validation export |
| `src/app/coach/nutrition/generator/page.tsx` | UI state for meal styles, config propagation, validation call before generation |
| `src/app/api/coach/nutrition/generate/route.ts` | Pre-validation before generation, return 400 with validation errors |
| **New:** `src/lib/mealPlanValidation.ts` | Pre-validation logic (canPlaceRequiredFoods, validateConfig) — keeps service lean |

### B. Current State Confirmed

- **GeneratorConfig** (`mealPlanGeneratorService.ts` L7-20): planName, targetKcal, macros, mealCount, optionsPerMeal, excludedTags, excludedFoodIds, requiredFoodIds, tolerance
- **UI form state** (`generator/page.tsx` L327-407): planName, targetKcal, macroMode, mealCount, optionsPerMeal, presets, selectedPresets, excludedFoods, requiredFoods
- **API validation** (`generate/route.ts` L29-34): Only checks mealCount and targetKcal
- **Template loading** (`loadTemplates` L439-477): Loads all active templates, groups by meal_type. No style filtering.
- **Must-have handling**: requiredFoodIds in loadFilteredFoods (adds to pool), fillTemplate (placement), unplaced warning at end
- **Excluded handling**: excludedTags, excludedFoodIds in loadFilteredFoods — hard exclusions
- **Recent improvements**: common-only + required union, protein_powder no fallback, requiredFoodIds placement, warningsSet

### C. Data Model Additions

```ts
// GeneratorConfig additions
breakfastStyle?: string | null;
lunchStyle?: string | null;
dinnerStyle?: string | null;
snackStyle?: string | null;
```

**Template-style mapping:** No schema change. Use `template.name` to map to style. Code constant in `mealPlanGeneratorService.ts` or `mealPlanValidation.ts`:

```ts
// Map: template name -> style(s) it belongs to (one template can match multiple styles)
const TEMPLATE_NAME_TO_STYLES: Record<string, string[]> = {
  "Protein Smoothie": ["smoothie"],
  "Greek Yogurt + Granola + Fruit": ["yogurt_bowl"],
  "Cottage Cheese + Fruit + Nuts": ["yogurt_bowl"],
  "Oatmeal + Nut Butter + Berries": ["oats_bowl"],
  "Overnight Oats": ["oats_bowl"],
  "Eggs + Toast + Fruit": ["eggs_breakfast", "toast_sandwich"],
  "Avocado Toast + Eggs": ["eggs_breakfast", "toast_sandwich"],
  "Breakfast Wrap": ["wrap"],
  "Protein + Rice + Vegetables": ["rice_bowl", "plated"],
  "Protein Salad Bowl": ["salad"],
  "Sandwich": ["sandwich"],
  "Grain Bowl": ["rice_bowl"],
  "Wrap + Protein + Salad": ["wrap"],
  "Pasta + Protein + Vegetables": ["pasta"],
  "Protein + Potato + Vegetables": ["plated"],
  "Lentil/Bean + Rice + Vegetables": ["rice_bowl"],
  "Stuffed Sweet Potato": ["plated"],
  "Fish + Rice + Salad": ["rice_bowl", "salad"],
  "Protein + Roasted Potato + Vegetables": ["plated"],
  "Stir-Fry + Rice": ["rice_bowl"],
  "Grilled Protein + Salad + Grain": ["salad", "plated"],
  "Fish + Sweet Potato + Vegetables": ["plated"],
  "Protein Pasta + Vegetables": ["pasta"],
  "Dinner Bowl": ["rice_bowl"],
  "Lean Protein + Mashed Potato + Greens": ["plated"],
  "Salmon + Quinoa + Roasted Vegetables": ["rice_bowl", "plated"],
  "Plant Protein + Grain + Vegetables": ["rice_bowl", "plated"],
  "Simple Protein + Rice + Veggies": ["rice_bowl", "plated"],
  "Greek Yogurt + Fruit": ["yogurt_bowl"],
  "Protein Shake": ["smoothie"],
  "Nuts + Fruit": ["fruit_protein", "quick_snack"],
  "Rice Cakes + Nut Butter": ["quick_snack"],
  "Cottage Cheese + Berries": ["yogurt_bowl", "fruit_protein"],
  "Boiled Eggs + Fruit": ["fruit_protein", "quick_snack"],
  "Hummus + Veggies": ["quick_snack"],
  "Fruit Smoothie": ["smoothie"],
};
```

### D. Flow Changes

1. **Config:** Add breakfastStyle, lunchStyle, dinnerStyle, snackStyle to GeneratorConfig.
2. **UI:** Add Step 2 (or 1.5) meal style selectors with "No preference" option.
3. **API:** Before generation, call `validateGeneratorConfig(sb, config)`. If hard conflicts, return 400 with `{ error, validationErrors: string[] }`.
4. **Generator:** In `generateMeal`, filter templates by style: if `config.breakfastStyle` is set, only templates where `TEMPLATE_NAME_TO_STYLES[t.name]?.includes(config.breakfastStyle)`.
5. **Pre-validation:** `validateGeneratorConfig`:
   - Load templates (same as generator)
   - Load foods (same filter: common + required, exclusions)
   - Build foodIdToSlotTypes
   - For each meal type in assignMealTypes(config.mealCount):
     - Filter templates by meal_type, excludedTags, and style
     - If style set and 0 templates match → BLOCK
   - For each requiredFoodId:
     - Get slot types for this food
     - Check if ANY template (after style filter) has a slot that can accept this food
     - If none → BLOCK with clear message

### E. Hard vs Soft Conflicts

**Hard (block generation):**
- Selected meal style has no viable templates
- Must-have food cannot fit any valid template/slot
- Exclusions make generation impossible (e.g. all templates excluded)

**Soft (this iteration):** Skip. Implement only hard conflicts + existing backend warnings.

### F. Risk Assessment

**Small:** Template-style mapping is code-only, no DB migration. Validation is additive. Style filtering is a simple filter in generateMeal.

**Medium:** Pre-validation requires loading templates + foods server-side before generation. Adds one validation round-trip. API must return structured validation errors.

**Overall:** Small-to-medium. Contained changes, no schema changes.
