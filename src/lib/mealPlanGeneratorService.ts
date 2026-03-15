import { supabase } from "@/lib/supabase";

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratorConfig {
  planName: string;
  targetKcal: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  targetFiber?: number;
  mealCount: number;        // 3–6
  optionsPerMeal: number;   // 1–3
  excludedTags: string[];
  excludedFoodIds: string[];
  requiredFoodIds: string[];
  tolerance: number;        // default 0.07
  // Optional meal styles per meal type — filters templates when set
  breakfastStyle?: string | null;
  lunchStyle?: string | null;
  dinnerStyle?: string | null;
  snackStyle?: string | null;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface FoodRecord {
  id: string;
  name: string;
  is_common: boolean;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
}

export interface SlotRecord {
  id: string;
  meal_template_id: string;
  slot_name: string;
  slot_type: string;
  is_required: boolean;
  min_portion_g: number;
  max_portion_g: number;
  default_portion_g: number;
  order_index: number;
}

export interface TemplateRecord {
  id: string;
  name: string;
  meal_type: string;
  description: string | null;
  tags: string[];
  dietary_tags: string[];
  incompatible_tags: string[];
  min_calories: number;
  max_calories: number;
  slots: SlotRecord[];
}

export interface GeneratedFood {
  foodId: string;
  foodName: string;
  slotName: string;
  slotType: string;
  portionGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface GeneratedOption {
  templateId: string;
  templateName: string;
  foods: GeneratedFood[];
  totals: MacroTargets;
}

export interface GeneratedMeal {
  mealType: string;
  mealName: string;
  options: GeneratedOption[];
  perMealTarget: MacroTargets;
}

export interface GeneratorResult {
  meals: GeneratedMeal[];
  dailyTotals: MacroTargets;
  targets: MacroTargets;
  deviation: {
    caloriesPercent: number;
    proteinPercent: number;
    carbsPercent: number;
    fatPercent: number;
    fiberPercent: number;
  };
  withinTolerance: boolean;
  warnings: string[];
  config: GeneratorConfig;
}

export interface GenerateOutput {
  result: GeneratorResult;
  foodsBySlot: Map<string, FoodRecord[]>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Role-defining slots with no fallback — prevents e.g. chicken in "Protein Smoothie"
const NO_FALLBACK_SLOT_TYPES = ["protein_powder"] as const;

const SLOT_TYPE_FALLBACKS: Record<string, string[]> = {
  protein_egg: ["protein_any"],
  protein_fish: ["protein_any"],
  protein_dairy: ["protein_any"],
  protein_plant: ["protein_any"],
  protein_meat: ["protein_any"],
  protein_powder: [], // No fallback — smoothie templates must use actual protein powder
  fat_avocado: ["fat_nut", "fat_any"],
  fat_oil: ["fat_any"],
  fat_nut: ["fat_any"],
  vegetable_leafy: ["vegetable"],
  carb_potato: ["carb_any"],
  carb_grain: ["carb_any"],
  carb_fruit: ["carb_any"],
  bread: ["carb_grain", "carb_any"],
  liquid: [],
  condiment: [],
};

// Template name -> style(s) for meal-style filtering. Used when coach selects a style.
// Semantics: smoothie = drinkable blend only; yogurt_bowl/oats_bowl/sandwich/wrap/salad/plated = genuinely matching.
// One template can match multiple styles (e.g. "Eggs + Toast" matches eggs_breakfast and toast_sandwich).
const TEMPLATE_NAME_TO_STYLES: Record<string, string[]> = {
  // Breakfast — smoothie = drinkable only (no smoothie bowls)
  "Protein Smoothie": ["smoothie"],
  "Greek Yogurt + Granola + Fruit": ["yogurt_bowl"],
  "Cottage Cheese + Fruit + Nuts": ["yogurt_bowl"],
  "Oatmeal + Nut Butter + Berries": ["oats_bowl"],
  "Overnight Oats": ["oats_bowl"],
  "Eggs + Toast + Fruit": ["eggs_breakfast", "toast_sandwich"],
  "Avocado Toast + Eggs": ["eggs_breakfast", "toast_sandwich"],
  "Breakfast Wrap": ["wrap", "eggs_breakfast"],
  // Lunch
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
  // Dinner — no wrap or soup templates
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
  // Snack — smoothie = drinkable; no sandwich templates
  "Greek Yogurt + Fruit": ["yogurt_bowl"],
  "Protein Shake": ["smoothie"],
  "Nuts + Fruit": ["fruit_protein", "quick_snack"],
  "Rice Cakes + Nut Butter": ["quick_snack"],
  "Cottage Cheese + Berries": ["yogurt_bowl", "fruit_protein", "quick_snack"],
  "Boiled Eggs + Fruit": ["fruit_protein", "quick_snack"],
  "Hummus + Veggies": ["quick_snack"],
  "Fruit Smoothie": ["smoothie"],
};

function templateMatchesStyle(templateName: string, style: string): boolean {
  const styles = TEMPLATE_NAME_TO_STYLES[templateName];
  return styles?.includes(style) ?? false;
}

/** Styles that have at least one matching template per meal type (based on current seed). Used for UI filtering. */
export const SUPPORTED_MEAL_STYLES: Record<string, string[]> = {
  breakfast: ["smoothie", "yogurt_bowl", "oats_bowl", "eggs_breakfast", "toast_sandwich", "wrap"],
  lunch: ["rice_bowl", "wrap", "salad", "sandwich", "plated", "pasta"],
  dinner: ["salad", "rice_bowl", "plated", "pasta"],
  snack: ["smoothie", "yogurt_bowl", "fruit_protein", "quick_snack"],
};

// What fraction of the meal's macro target each slot category aims to fill
const SLOT_MACRO_SHARE: Record<string, { macro: keyof MacroTargets; share: number } | null> = {
  protein_meat: { macro: "protein", share: 0.55 },
  protein_fish: { macro: "protein", share: 0.55 },
  protein_egg: { macro: "protein", share: 0.50 },
  protein_dairy: { macro: "protein", share: 0.45 },
  protein_plant: { macro: "protein", share: 0.50 },
  protein_powder: { macro: "protein", share: 0.45 },
  protein_any: { macro: "protein", share: 0.50 },
  carb_grain: { macro: "carbs", share: 0.55 },
  carb_potato: { macro: "carbs", share: 0.55 },
  carb_fruit: { macro: "carbs", share: 0.35 },
  carb_any: { macro: "carbs", share: 0.50 },
  bread: { macro: "carbs", share: 0.30 },
  fat_oil: { macro: "fat", share: 0.35 },
  fat_nut: { macro: "fat", share: 0.40 },
  fat_avocado: { macro: "fat", share: 0.40 },
  fat_any: { macro: "fat", share: 0.40 },
  vegetable: null,
  vegetable_leafy: null,
  condiment: null,
  liquid: null,
};

const MEAL_TYPE_DISPLAY: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

// ============================================================================
// HELPERS
// ============================================================================

function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function macrosAtPortion(food: FoodRecord, portionG: number): MacroTargets {
  const ratio = portionG / 100;
  return {
    calories: Math.round(food.calories_per_100g * ratio * 10) / 10,
    protein: Math.round(food.protein_per_100g * ratio * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * ratio * 10) / 10,
    fat: Math.round(food.fat_per_100g * ratio * 10) / 10,
    fiber: Math.round(food.fiber_per_100g * ratio * 10) / 10,
  };
}

function sumMacros(items: MacroTargets[]): MacroTargets {
  return items.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      fiber: acc.fiber + m.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

// ============================================================================
// RAW / COOKED DEDUPLICATION HELPERS
// ============================================================================

// Keywords that indicate the food was prepared (not raw/dry)
const COOKED_REGEX = /\b(cooked|roasted|baked|broiled|grilled|boiled|braised|steamed|fried|sauteed|poached)\b/i;

// Strip cooking descriptors and everything that follows to get a comparable base name.
// e.g. "Chicken breast, skinless, cooked, roasted" → "chicken breast, skinless"
function cookedBaseKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/,?\s*(cooked|roasted|baked|broiled|grilled|boiled|braised|steamed|fried|sauteed|poached|raw)\b.*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deviationPct(actual: number, target: number): number {
  if (target === 0) return 0;
  return Math.abs((actual - target) / target) * 100;
}

/** Returns true if the food can fill this slot (direct or via fallback). */
function foodMatchesSlot(
  foodId: string,
  slot: SlotRecord,
  foodIdToSlotTypes: Map<string, string[]>
): boolean {
  const foodSlotTypes = foodIdToSlotTypes.get(foodId) ?? [];
  if (foodSlotTypes.includes(slot.slot_type)) return true;
  const fallbacks = SLOT_TYPE_FALLBACKS[slot.slot_type] ?? [];
  return fallbacks.some((fb) => foodSlotTypes.includes(fb));
}

// ============================================================================
// MACRO CALCULATION
// ============================================================================

export function calculateMacroTargets(config: GeneratorConfig): MacroTargets {
  const kcal = config.targetKcal;
  const protein =
    config.targetProtein ?? Math.round((kcal * 0.3) / 4);
  const fat =
    config.targetFat ?? Math.round((kcal * 0.25) / 9);
  const carbs =
    config.targetCarbs ??
    Math.round((kcal - protein * 4 - fat * 9) / 4);
  // Minimum 40g, scaling at 25g/1000kcal (50g at 2000kcal, ~63g at 2500kcal)
  const fiber =
    config.targetFiber ?? Math.max(40, Math.round((kcal / 1000) * 25));

  return {
    calories: kcal,
    protein,
    carbs,
    fat,
    fiber,
  };
}

// Auto-calculated macro preview (for the UI)
export function autoMacros(kcal: number): { protein: number; carbs: number; fat: number; fiber: number } {
  const protein = Math.round((kcal * 0.3) / 4);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  // Minimum 40g, scaling at 25g/1000kcal
  const fiber = Math.max(40, Math.round((kcal / 1000) * 25));
  return { protein, carbs, fat, fiber };
}

// ============================================================================
// MEAL TYPE ASSIGNMENT
// ============================================================================

function assignMealTypes(mealCount: number): string[] {
  switch (mealCount) {
    case 3: return ["breakfast", "lunch", "dinner"];
    case 4: return ["breakfast", "lunch", "snack", "dinner"];
    case 5: return ["breakfast", "snack", "lunch", "snack", "dinner"];
    case 6: return ["breakfast", "snack", "lunch", "snack", "dinner", "snack"];
    default: return ["breakfast", "lunch", "dinner"];
  }
}

function mealDisplayName(mealType: string, index: number, allTypes: string[]): string {
  if (mealType !== "snack") return MEAL_TYPE_DISPLAY[mealType] ?? mealType;
  const snacksBefore = allTypes.slice(0, index).filter((t) => t === "snack").length;
  return snacksBefore === 0 ? "Morning Snack" : snacksBefore === 1 ? "Afternoon Snack" : "Evening Snack";
}

// ============================================================================
// CALORIE DISTRIBUTION
// ============================================================================

function distributeCalories(targets: MacroTargets, mealTypes: string[]): MacroTargets[] {
  const snackCount = mealTypes.filter((t) => t === "snack").length;
  const totalSnackShare = snackCount > 0 ? 0.15 : 0;
  const snackShare = snackCount > 0 ? totalSnackShare / snackCount : 0;

  const shares: Record<string, number> = {
    breakfast: 0.25,
    lunch: snackCount === 0 ? 0.375 : 0.30,
    dinner: snackCount === 0 ? 0.375 : 0.30,
    snack: snackShare,
  };

  return mealTypes.map((type) => {
    const ratio = shares[type] ?? 0.25;
    return {
      calories: Math.round(targets.calories * ratio),
      protein: Math.round(targets.protein * ratio),
      carbs: Math.round(targets.carbs * ratio),
      fat: Math.round(targets.fat * ratio),
      fiber: Math.round(targets.fiber * ratio),
    };
  });
}

// ============================================================================
// DATA LAYER
// ============================================================================

async function loadFilteredFoods(
  sb: { from: (table: string) => ReturnType<typeof supabase.from> },
  excludedTags: string[],
  excludedFoodIds: string[],
  requiredFoodIds: string[] = []
): Promise<{ foodsById: Map<string, FoodRecord>; foodsBySlot: Map<string, FoodRecord[]> }> {
  // Step 1: Get IDs of foods excluded by tag
  const excludedByTagIds = new Set<string>();
  if (excludedTags.length > 0) {
    const { data: tagRows, error: tagErr } = await sb
      .from("food_tags")
      .select("food_id")
      .in("tag", excludedTags);
    if (tagErr) console.error("food_tags query error:", tagErr.message);
    (tagRows ?? []).forEach((r: { food_id: string }) => excludedByTagIds.add(r.food_id));
  }

  // Step 2: Fetch all active foods with per-100g macros
  const { data: foodRows, error: foodErr } = await sb
    .from("foods")
    .select("id, name, is_common, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g")
    .eq("is_active", true)
    .gt("calories_per_100g", 0);

  if (foodErr || !foodRows) {
    throw new Error("Failed to load foods: " + (foodErr?.message ?? "no data returned"));
  }

  // Filter exclusions in JS
  const excluded = new Set(excludedFoodIds);
  const excludeFiltered: FoodRecord[] = (foodRows as FoodRecord[]).filter(
    (f) => !excludedByTagIds.has(f.id) && !excluded.has(f.id)
  );

  // ------------------------------------------------------------------
  // Raw/cooked deduplication — the generator always works with raw
  // ingredient weights. If the DB contains both "X, raw" and "X, cooked"
  // we keep only the raw version so portions are always raw grams.
  //
  // Step A: Build a set of base names that have at least one raw entry.
  // Step B: For each food that has a cooking keyword, exclude it if a
  //         matching raw version exists. Keep it only if no raw version
  //         is available (so the generator still has something to use).
  // ------------------------------------------------------------------
  const rawBaseKeys = new Set<string>();
  excludeFiltered.forEach((f) => {
    if (/\braw\b/i.test(f.name)) rawBaseKeys.add(cookedBaseKey(f.name));
  });

  const filteredFoods = excludeFiltered.filter((f) => {
    if (!COOKED_REGEX.test(f.name)) return true;   // not cooked — keep
    if (/\braw\b/i.test(f.name)) return true;       // name has both (edge case) — keep
    return !rawBaseKeys.has(cookedBaseKey(f.name)); // drop if raw twin exists
  });

  if (filteredFoods.length === 0) {
    return { foodsById: new Map(), foodsBySlot: new Map() };
  }

  // Generation-default pool: common foods + required. Isolated for easy replacement
  // with a stricter generator-specific flag (e.g. is_generator_common) if needed.
  const commonFiltered = filteredFoods.filter((f) => f.is_common);
  const requiredSet = new Set(requiredFoodIds);
  const requiredFromFiltered = filteredFoods.filter((f) => requiredSet.has(f.id));
  const seenIds = new Set<string>();
  const finalPool: FoodRecord[] = [];
  for (const f of [...commonFiltered, ...requiredFromFiltered]) {
    if (seenIds.has(f.id)) continue;
    seenIds.add(f.id);
    finalPool.push(f);
  }

  if (finalPool.length === 0) {
    return { foodsById: new Map(), foodsBySlot: new Map() };
  }

  // Step 3: Fetch ALL slot types (no .in() filter — avoids URL-too-long with large food sets).
  // The table is small (~500 rows). Filter by allowed food IDs in JS.
  const { data: slotRows, error: slotErr } = await sb
    .from("food_slot_types")
    .select("food_id, slot_type");

  if (slotErr) throw new Error("Failed to load slot types: " + slotErr.message);

  // Build maps — only keep slot rows whose food_id is in our final pool
  const foodsById = new Map<string, FoodRecord>(finalPool.map((f) => [f.id, f]));
  const foodsBySlot = new Map<string, FoodRecord[]>();

  (slotRows ?? []).forEach((row: { food_id: string; slot_type: string }) => {
    const food = foodsById.get(row.food_id);
    if (!food) return; // food was excluded — skip
    if (!foodsBySlot.has(row.slot_type)) foodsBySlot.set(row.slot_type, []);
    foodsBySlot.get(row.slot_type)!.push(food);
  });

  console.log(
    `[Generator] Loaded ${finalPool.length} foods across ${foodsBySlot.size} slot types`
  );

  return { foodsById, foodsBySlot };
}

async function loadTemplates(sb: { from: (table: string) => ReturnType<typeof supabase.from> }): Promise<Map<string, TemplateRecord[]>> {
  const { data: templates, error: tErr } = await sb
    .from("meal_templates")
    .select("*")
    .eq("is_active", true);

  if (tErr) throw new Error("Failed to load templates: " + tErr.message);
  if (!templates || templates.length === 0) {
    throw new Error("No meal templates found. This usually means the Supabase session is not yet active. Please try again.");
  }
  console.log(`[Generator] Loaded ${templates.length} meal templates`);

  const templateIds = templates.map((t: { id: string }) => t.id);

  const { data: slots, error: sErr } = await sb
    .from("meal_template_slots")
    .select("*")
    .in("meal_template_id", templateIds)
    .order("order_index");

  if (sErr) throw new Error("Failed to load template slots: " + sErr.message);

  // Group slots by template
  const slotsByTemplate = new Map<string, SlotRecord[]>();
  (slots ?? []).forEach((s: SlotRecord) => {
    if (!slotsByTemplate.has(s.meal_template_id)) slotsByTemplate.set(s.meal_template_id, []);
    slotsByTemplate.get(s.meal_template_id)!.push(s);
  });

  // Group templates by meal_type
  const byMealType = new Map<string, TemplateRecord[]>();
  templates.forEach((t: TemplateRecord) => {
    const full: TemplateRecord = { ...t, slots: slotsByTemplate.get(t.id) ?? [] };
    if (!byMealType.has(t.meal_type)) byMealType.set(t.meal_type, []);
    byMealType.get(t.meal_type)!.push(full);
  });

  return byMealType;
}

// ============================================================================
// CANDIDATE FOODS FOR A SLOT (with fallback chain)
// ============================================================================

function getCandidates(
  slotType: string,
  foodsBySlot: Map<string, FoodRecord[]>,
  minCount = 1
): FoodRecord[] {
  const direct = foodsBySlot.get(slotType) ?? [];
  if (direct.length >= minCount) return direct;

  const fallbacks = SLOT_TYPE_FALLBACKS[slotType] ?? [];
  for (const fb of fallbacks) {
    const alt = foodsBySlot.get(fb) ?? [];
    if (alt.length >= minCount) return alt;
  }

  // Return whatever we have (including empty)
  const combined = [...direct];
  for (const fb of fallbacks) {
    const alt = foodsBySlot.get(fb) ?? [];
    alt.forEach((f) => { if (!combined.find((c) => c.id === f.id)) combined.push(f); });
  }
  return combined;
}

// ============================================================================
// TEMPLATE FILLING
// ============================================================================

function fillTemplate(
  template: TemplateRecord,
  mealTarget: MacroTargets,
  foodsBySlot: Map<string, FoodRecord[]>,
  usedFoodIds: Set<string>,
  fiberSoFar: number,
  totalFiberTarget: number,
  requiredFoodIds: string[],
  placedRequiredIds: Set<string>,
  foodIdToSlotTypes: Map<string, string[]>,
  foodsById: Map<string, FoodRecord>
): GeneratedOption | null {
  // Fiber lagging if we've used less than 60% of the daily fiber target so far —
  // a higher threshold (was 40%) so the bonus kicks in throughout the day
  const fiberLagging = fiberSoFar < totalFiberTarget * 0.6;

  // ------------------------------------------------------------------
  // Phase 1: Select foods and compute initial portions
  // We keep the original FoodRecord alongside each pick so we can
  // recalculate macros precisely after portion adjustments.
  // ------------------------------------------------------------------
  interface Pick {
    food: FoodRecord;
    slot: SlotRecord;
    portionG: number;
  }
  const picks: Pick[] = [];

  for (const slot of template.slots) {
    // Required-food pass: place pinned foods with fewest compatible slots first
    const unplacedRequired = requiredFoodIds.filter((id) => !placedRequiredIds.has(id));
    const compatibleRequired = unplacedRequired.filter((id) =>
      foodMatchesSlot(id, slot, foodIdToSlotTypes)
    );

    if (compatibleRequired.length > 0) {
      // Pick the required food with fewest compatible slots in this template
      const withCount = compatibleRequired.map((id) => ({
        id,
        count: template.slots.filter((s) => foodMatchesSlot(id, s, foodIdToSlotTypes)).length,
      }));
      withCount.sort((a, b) => a.count - b.count);
      const pickedId = withCount[0].id;
      const food = foodsById.get(pickedId);
      if (food) {
        placedRequiredIds.add(pickedId);
        const portionG = roundTo5(clamp(slot.default_portion_g, slot.min_portion_g, slot.max_portion_g));
        picks.push({ food, slot, portionG });
        continue;
      }
    }

    const candidates = getCandidates(slot.slot_type, foodsBySlot, 1);
    if (candidates.length === 0) {
      if (slot.is_required) return null;
      continue;
    }

    // Score candidates
    const scored = candidates.map((f) => {
      let score = 0;
      if (f.is_common) score += 2;
      if (!usedFoodIds.has(f.id)) score += 1;
      // Strong fiber bonus — pulls plan toward high-fiber foods when lagging
      if (fiberLagging && f.fiber_per_100g > 3) score += 25;
      // Prefer raw/dry foods over cooked versions; cooked foods that have no
      // raw twin will still appear here but get no bonus
      if (/\braw\b/i.test(f.name) || /\bdry\b/i.test(f.name)) score += 3;
      return { food: f, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const picked = shuffleArray(scored.slice(0, 5))[0].food;

    // Initial portion: use slot's default_portion_g.
    // We rely entirely on the proportional scaling pass below to hit
    // the calorie target — the defaults just establish reasonable
    // relative proportions between slots (protein:carb:fat:veg).
    const portionG = roundTo5(clamp(slot.default_portion_g, slot.min_portion_g, slot.max_portion_g));
    picks.push({ food: picked, slot, portionG });
  }

  if (picks.length === 0) return null;

  // ------------------------------------------------------------------
  // Phase 2: Iterative proportional scaling to hit calorie target.
  //
  // Each iteration calculates the ratio (target / actual) and applies
  // it to every slot uniformly.  When a slot hits its min/max boundary
  // the clamping absorbs part of the deficit; the next iteration
  // redistributes the remainder across the remaining free slots.
  // Three iterations are enough to converge in practice.
  // ------------------------------------------------------------------
  const calTarget = mealTarget.calories;

  console.log(`[fillTemplate] START "${template.name}" | target=${calTarget}kcal`);

  for (let iter = 0; iter < 3; iter++) {
    const totalCals = picks.reduce((s, p) => s + macrosAtPortion(p.food, p.portionG).calories, 0);
    if (totalCals <= 0) break;
    const deviation = (totalCals - calTarget) / calTarget;
    console.log(`  iter=${iter} total=${Math.round(totalCals)}kcal dev=${(deviation * 100).toFixed(1)}%`);
    if (Math.abs(deviation) <= 0.03) break; // ≤3% — good enough, stop early

    const scale = calTarget / totalCals;
    for (const p of picks) {
      const raw = p.portionG * scale;
      p.portionG = roundTo5(clamp(raw, p.slot.min_portion_g, p.slot.max_portion_g));
    }
  }

  // ------------------------------------------------------------------
  // Phase 3: Top-up pass — if we're still short (slots constrained
  // by min_portion_g or max_portion_g prevented full scaling), boost
  // the calorie-densest slots that still have room to grow.
  // ------------------------------------------------------------------
  {
    let totalCals = picks.reduce((s, p) => s + macrosAtPortion(p.food, p.portionG).calories, 0);
    let deficit = calTarget - totalCals;

    if (deficit > calTarget * 0.03) {
      // Sort by calorie density descending (fat > protein > carb > veg)
      const growable = picks
        .filter((p) => p.portionG < p.slot.max_portion_g - 5)
        .sort((a, b) => b.food.calories_per_100g - a.food.calories_per_100g);

      for (const p of growable) {
        if (deficit <= 10) break;
        const prevCals = macrosAtPortion(p.food, p.portionG).calories;
        const calsPerG = p.food.calories_per_100g / 100;
        if (calsPerG <= 0) continue;
        const extraG = Math.min(p.slot.max_portion_g - p.portionG, deficit / calsPerG);
        p.portionG = roundTo5(Math.min(p.portionG + extraG, p.slot.max_portion_g));
        const gained = macrosAtPortion(p.food, p.portionG).calories - prevCals;
        deficit -= gained;
      }
      totalCals = picks.reduce((s, p) => s + macrosAtPortion(p.food, p.portionG).calories, 0);
      console.log(`  after top-up: total=${Math.round(totalCals)}kcal deficit=${Math.round(deficit)}kcal`);
    }

    // Trim pass — if we overshot (all slots at min, meal is calorie-dense)
    let surplus = totalCals - calTarget;
    if (surplus > calTarget * 0.05) {
      const shrinkable = picks
        .filter((p) => p.portionG > p.slot.min_portion_g + 5)
        .sort((a, b) => b.food.calories_per_100g - a.food.calories_per_100g);

      for (const p of shrinkable) {
        if (surplus <= 0) break;
        const prevCals = macrosAtPortion(p.food, p.portionG).calories;
        const calsPerG = p.food.calories_per_100g / 100;
        if (calsPerG <= 0) continue;
        const cutG = Math.min(p.portionG - p.slot.min_portion_g, surplus / calsPerG);
        p.portionG = roundTo5(Math.max(p.portionG - cutG, p.slot.min_portion_g));
        const saved = prevCals - macrosAtPortion(p.food, p.portionG).calories;
        surplus -= saved;
      }
    }
  }

  // ------------------------------------------------------------------
  // Build final GeneratedFood array
  // ------------------------------------------------------------------
  const foods: GeneratedFood[] = picks.map((p) => {
    const macros = macrosAtPortion(p.food, p.portionG);
    console.log(
      `    [slot=${p.slot.slot_type}] ${p.food.name} | portion=${p.portionG}g | ` +
      `kcal=${Math.round(macros.calories)} | P=${Math.round(macros.protein)}g C=${Math.round(macros.carbs)}g F=${Math.round(macros.fat)}g`
    );
    return {
      foodId: p.food.id,
      foodName: p.food.name,
      slotName: p.slot.slot_name,
      slotType: p.slot.slot_type,
      portionGrams: p.portionG,
      ...macros,
    };
  });

  const finalTotals = sumMacros(foods.map((f) => ({
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    fiber: f.fiber,
  })));

  console.log(
    `[fillTemplate] END "${template.name}" | actual=${Math.round(finalTotals.calories)}kcal | ` +
    `target=${calTarget}kcal | dev=${Math.round(Math.abs(finalTotals.calories - calTarget) / calTarget * 100)}%`
  );

  return {
    templateId: template.id,
    templateName: template.name,
    foods,
    totals: finalTotals,
  };
}

// ============================================================================
// MEAL GENERATION
// ============================================================================

interface DailyState {
  fiberSoFar: number;
  totalFiberTarget: number;
  vegetableServings: number;
  fruitServings: number;
  usedFoodIds: Set<string>;
  usedTemplateIds: Set<string>;
  placedRequiredIds: Set<string>;
}

function generateMeal(
  mealType: string,
  mealTarget: MacroTargets,
  allTemplates: Map<string, TemplateRecord[]>,
  foodsBySlot: Map<string, FoodRecord[]>,
  config: GeneratorConfig,
  dailyState: DailyState,
  optionsPerMeal: number,
  foodIdToSlotTypes: Map<string, string[]>,
  foodsById: Map<string, FoodRecord>,
  warningsSet: Set<string>
): GeneratedMeal | null {
  let mealTemplates = allTemplates.get(mealType) ?? [];

  // Filter by meal style when coach selects one
  const selectedStyle =
    mealType === "breakfast" ? config.breakfastStyle
    : mealType === "lunch" ? config.lunchStyle
    : mealType === "dinner" ? config.dinnerStyle
    : config.snackStyle;
  if (selectedStyle) {
    mealTemplates = mealTemplates.filter((t) => templateMatchesStyle(t.name, selectedStyle));
  }

  // Filter: remove incompatible templates
  const compatible = mealTemplates.filter((t) => {
    if (config.excludedTags.length === 0) return true;
    return !t.incompatible_tags.some((tag) => config.excludedTags.includes(tag));
  });

  // Filter: templates where all required slots have food
  const viable = compatible.filter((t) => {
    return t.slots
      .filter((s) => s.is_required)
      .every((s) => getCandidates(s.slot_type, foodsBySlot, 1).length > 0);
  });

  // Warn about skipped templates due to role-defining slots with no candidates
  for (const t of compatible) {
    if (viable.includes(t)) continue;
    for (const s of t.slots.filter((sl) => sl.is_required)) {
      if (getCandidates(s.slot_type, foodsBySlot, 1).length === 0) {
        if ((NO_FALLBACK_SLOT_TYPES as readonly string[]).includes(s.slot_type)) {
          warningsSet.add(`Skipped template "${t.name}": no ${s.slot_type} foods available`);
        }
        break;
      }
    }
  }

  if (viable.length === 0) return null;

  // Sort by preference: unused templates first, then shuffle for variety
  const unused = viable.filter((t) => !dailyState.usedTemplateIds.has(t.id));
  const used = viable.filter((t) => dailyState.usedTemplateIds.has(t.id));
  const ordered = [...shuffleArray(unused), ...shuffleArray(used)];

  // Fill up to optionsPerMeal
  const options: GeneratedOption[] = [];
  const usedInThisMeal = new Set<string>();

  for (const template of ordered) {
    if (options.length >= optionsPerMeal) break;
    if (usedInThisMeal.has(template.id)) continue;

    const option = fillTemplate(
      template,
      mealTarget,
      foodsBySlot,
      dailyState.usedFoodIds,
      dailyState.fiberSoFar,
      dailyState.totalFiberTarget,
      config.requiredFoodIds,
      dailyState.placedRequiredIds,
      foodIdToSlotTypes,
      foodsById
    );

    if (option) {
      options.push(option);
      usedInThisMeal.add(template.id);
    }
  }

  return { mealType, mealName: "", options, perMealTarget: mealTarget };
}

// ============================================================================
// RESULT ASSEMBLY
// ============================================================================

function buildResult(
  meals: GeneratedMeal[],
  targets: MacroTargets,
  tolerance: number,
  config: GeneratorConfig
): GeneratorResult {
  // Sum option 1 (index 0) totals across all meals for daily totals
  const option1Totals = meals
    .filter((m) => m.options.length > 0)
    .map((m) => m.options[0].totals);

  const dailyTotals = sumMacros(option1Totals);

  const deviation = {
    caloriesPercent: deviationPct(dailyTotals.calories, targets.calories),
    proteinPercent: deviationPct(dailyTotals.protein, targets.protein),
    carbsPercent: deviationPct(dailyTotals.carbs, targets.carbs),
    fatPercent: deviationPct(dailyTotals.fat, targets.fat),
    fiberPercent: deviationPct(dailyTotals.fiber, targets.fiber),
  };

  const tolerancePct = tolerance * 100;
  const withinTolerance =
    deviation.caloriesPercent <= tolerancePct &&
    deviation.proteinPercent <= tolerancePct &&
    deviation.carbsPercent <= tolerancePct &&
    deviation.fatPercent <= tolerancePct;

  return {
    meals,
    dailyTotals,
    targets,
    deviation,
    withinTolerance,
    warnings: [],
    config,
  };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/** Run generation with an explicit Supabase client (use from API route with server client to avoid browser client hang after tab background). */
export async function generateMealPlanWithClient(
  sb: { from: (table: string) => ReturnType<typeof supabase.from> },
  config: GeneratorConfig
): Promise<GenerateOutput> {
  // 1. Calculate macro targets
  const targets = calculateMacroTargets(config);

  // 2. Assign meal types and names
  const mealTypes = assignMealTypes(config.mealCount);

  // 3. Distribute calories across meals
  const mealTargets = distributeCalories(targets, mealTypes);

  // 4. Load foods + templates in parallel (2 queries each = 4 total)
  const [{ foodsById, foodsBySlot }, allTemplates] = await Promise.all([
    loadFilteredFoods(sb, config.excludedTags, config.excludedFoodIds, config.requiredFoodIds),
    loadTemplates(sb),
  ]);

  // Build reverse map: foodId -> slot types it can fill
  const foodIdToSlotTypes = new Map<string, string[]>();
  foodsBySlot.forEach((foods, slotType) => {
    foods.forEach((f) => {
      if (!foodIdToSlotTypes.has(f.id)) foodIdToSlotTypes.set(f.id, []);
      foodIdToSlotTypes.get(f.id)!.push(slotType);
    });
  });

  // 5. Track daily state
  const dailyState: DailyState = {
    fiberSoFar: 0,
    totalFiberTarget: targets.fiber,
    vegetableServings: 0,
    fruitServings: 0,
    usedFoodIds: new Set<string>(),
    usedTemplateIds: new Set<string>(),
    placedRequiredIds: new Set<string>(),
  };

  const warningsSet = new Set<string>();

  // 6. Generate each meal
  const meals: GeneratedMeal[] = [];
  for (let i = 0; i < mealTypes.length; i++) {
    const mealType = mealTypes[i];
    const displayName = mealDisplayName(mealType, i, mealTypes);
    const meal = generateMeal(
      mealType,
      mealTargets[i],
      allTemplates,
      foodsBySlot,
      config,
      dailyState,
      config.optionsPerMeal,
      foodIdToSlotTypes,
      foodsById,
      warningsSet
    );

    if (meal) {
      meal.mealName = displayName;
      meals.push(meal);

      // Update daily state from option 1
      if (meal.options.length > 0) {
        const opt = meal.options[0];
        dailyState.fiberSoFar += opt.totals.fiber;

        // Track used templates and foods
        opt.foods.forEach((f) => {
          dailyState.usedFoodIds.add(f.foodId);
          const vegSlots = ["vegetable", "vegetable_leafy"];
          const fruitSlots = ["carb_fruit"];
          if (vegSlots.includes(f.slotType)) dailyState.vegetableServings++;
          if (fruitSlots.includes(f.slotType)) dailyState.fruitServings++;
        });
        dailyState.usedTemplateIds.add(opt.templateId);
      }
    }
  }

  // 7. Build result
  const result = buildResult(meals, targets, config.tolerance, config);

  // 8. Add warnings (Set first to avoid duplicates, then convert)
  const unplaced = config.requiredFoodIds.filter((id) => !dailyState.placedRequiredIds.has(id));
  if (unplaced.length > 0) {
    const names = unplaced
      .map((id) => foodsById.get(id)?.name ?? id)
      .filter(Boolean)
      .join(", ");
    warningsSet.add(
      `Required food(s) could not be placed: ${names || "unknown"}. No compatible slot in any template.`
    );
  }
  result.warnings.push(...Array.from(warningsSet));

  if (dailyState.vegetableServings < 2) {
    result.warnings.push(`Only ${dailyState.vegetableServings} vegetable serving(s) — recommend at least 3`);
  }
  if (dailyState.fruitServings < 2) {
    result.warnings.push(`Only ${dailyState.fruitServings} fruit serving(s) — recommend at least 2`);
  }
  const fiberTotal = Math.round(dailyState.fiberSoFar);
  if (fiberTotal < 30) {
    result.warnings.push(`⚠ LOW FIBER: ${fiberTotal}g — critically below the 30g minimum. Add more vegetables, legumes, or whole grains.`);
  } else if (fiberTotal < 40) {
    result.warnings.push(`Fiber ${fiberTotal}g is below the 40g daily target — consider swapping refined grains for whole grain options.`);
  }
  if (meals.length < config.mealCount) {
    result.warnings.push(`Only ${meals.length} of ${config.mealCount} meals could be generated — some meal types may have no viable templates after filtering`);
  }

  return { result, foodsBySlot };
}

/** Client-side entry (uses browser Supabase; can hang after tab background — prefer API route + generateMealPlanWithClient). */
export async function generateMealPlan(config: GeneratorConfig): Promise<GenerateOutput> {
  return generateMealPlanWithClient(supabase, config);
}

// ============================================================================
// PRE-GENERATION VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validates config before generation. Blocks impossible setups with clear messages.
 * Uses the SAME loadFilteredFoods as generation: common foods + required union, exclusions applied.
 * Avoids false negatives for must-have placement. */
export async function validateGeneratorConfig(
  sb: { from: (table: string) => ReturnType<typeof supabase.from> },
  config: GeneratorConfig
): Promise<ValidationResult> {
  const errors: string[] = [];

  const [allTemplates, { foodsById, foodsBySlot }] = await Promise.all([
    loadTemplates(sb),
    loadFilteredFoods(sb, config.excludedTags, config.excludedFoodIds, config.requiredFoodIds),
  ]);

  const mealTypes = assignMealTypes(config.mealCount);

  const foodIdToSlotTypes = new Map<string, string[]>();
  foodsBySlot.forEach((foods, slotType) => {
    foods.forEach((f) => {
      if (!foodIdToSlotTypes.has(f.id)) foodIdToSlotTypes.set(f.id, []);
      foodIdToSlotTypes.get(f.id)!.push(slotType);
    });
  });

  // 1. Check each meal type: if style selected and no templates match, block
  for (const mealType of mealTypes) {
    const selectedStyle =
      mealType === "breakfast" ? config.breakfastStyle
      : mealType === "lunch" ? config.lunchStyle
      : mealType === "dinner" ? config.dinnerStyle
      : config.snackStyle;

    if (!selectedStyle) continue;

    const baseTemplates = allTemplates.get(mealType) ?? [];
    const styleFiltered = baseTemplates.filter((t) => templateMatchesStyle(t.name, selectedStyle));
    const compatible = styleFiltered.filter((t) => {
      if (config.excludedTags.length === 0) return true;
      return !t.incompatible_tags.some((tag) => config.excludedTags.includes(tag));
    });

    if (compatible.length === 0) {
      const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);
      errors.push(
        `${mealLabel} style "${selectedStyle}" has no matching templates. Try a different style or "No preference".`
      );
    }
  }

  // 2. Check each required food: can it fit in any valid template/slot?
  for (const foodId of config.requiredFoodIds) {
    const food = foodsById.get(foodId);
    if (!food) {
      errors.push(
        `Must-have food (ID: ${foodId}) is not in the generation pool. It may be excluded by tags or not in the database.`
      );
      continue;
    }

    const foodSlotTypes = foodIdToSlotTypes.get(foodId) ?? [];
    if (foodSlotTypes.length === 0) {
      errors.push(
        `"${food.name}" has no slot types assigned. It cannot be placed in any meal.`
      );
      continue;
    }

    let canPlace = false;
    for (const mealType of mealTypes) {
      const selectedStyle =
        mealType === "breakfast" ? config.breakfastStyle
        : mealType === "lunch" ? config.lunchStyle
        : mealType === "dinner" ? config.dinnerStyle
        : config.snackStyle;

      let templates = allTemplates.get(mealType) ?? [];
      if (selectedStyle) {
        templates = templates.filter((t) => templateMatchesStyle(t.name, selectedStyle));
      }
      templates = templates.filter((t) => {
        if (config.excludedTags.length === 0) return true;
        return !t.incompatible_tags.some((tag) => config.excludedTags.includes(tag));
      });

      for (const t of templates) {
        for (const slot of t.slots) {
          if (foodMatchesSlot(foodId, slot, foodIdToSlotTypes)) {
            const candidates = getCandidates(slot.slot_type, foodsBySlot, 1);
            if (candidates.some((c) => c.id === foodId)) {
              canPlace = true;
              break;
            }
          }
        }
        if (canPlace) break;
      }
      if (canPlace) break;
    }

    if (!canPlace) {
      const styleHint =
        mealTypes.some((mt) => {
          const s = mt === "breakfast" ? config.breakfastStyle : mt === "lunch" ? config.lunchStyle : mt === "dinner" ? config.dinnerStyle : config.snackStyle;
          return !!s;
        })
          ? " Add a lunch/dinner style like plated, rice_bowl, wrap, or salad, or remove this from must-have foods."
          : " Add a lunch or dinner meal, or remove this from must-have foods.";
      errors.push(
        `"${food.name}" cannot be placed with the current setup.${styleHint}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// SWAP HELPERS (used by UI)
// ============================================================================

export function getSwapAlternatives(
  slotType: string,
  currentFoodId: string,
  foodsBySlot: Map<string, FoodRecord[]>,
  limit = 8
): FoodRecord[] {
  const candidates = getCandidates(slotType, foodsBySlot, 1);
  return candidates
    .filter((f) => f.id !== currentFoodId)
    .sort((a, b) => (b.is_common ? 1 : 0) - (a.is_common ? 1 : 0))
    .slice(0, limit);
}

export function recalculateTotals(foods: GeneratedFood[]): MacroTargets {
  return sumMacros(
    foods.map((f) => ({
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      fiber: f.fiber,
    }))
  );
}

export function swapFood(
  option: GeneratedOption,
  foodIdx: number,
  newFood: FoodRecord
): GeneratedOption {
  const old = option.foods[foodIdx];
  const newMacros = macrosAtPortion(newFood, old.portionGrams);
  const newFoods = [...option.foods];
  newFoods[foodIdx] = {
    foodId: newFood.id,
    foodName: newFood.name,
    slotName: old.slotName,
    slotType: old.slotType,
    portionGrams: old.portionGrams,
    ...newMacros,
  };
  return {
    ...option,
    foods: newFoods,
    totals: recalculateTotals(newFoods),
  };
}

export function adjustPortion(
  option: GeneratedOption,
  foodIdx: number,
  deltaG: number
): GeneratedOption {
  const foods = [...option.foods];
  const food = foods[foodIdx];
  const newPortion = Math.max(5, food.portionGrams + deltaG);
  const foodRecord: FoodRecord = {
    id: food.foodId,
    name: food.foodName,
    is_common: false,
    calories_per_100g: (food.calories / food.portionGrams) * 100,
    protein_per_100g: (food.protein / food.portionGrams) * 100,
    carbs_per_100g: (food.carbs / food.portionGrams) * 100,
    fat_per_100g: (food.fat / food.portionGrams) * 100,
    fiber_per_100g: (food.fiber / food.portionGrams) * 100,
  };
  const newMacros = macrosAtPortion(foodRecord, newPortion);
  foods[foodIdx] = { ...food, portionGrams: newPortion, ...newMacros };
  return { ...option, foods, totals: recalculateTotals(foods) };
}

// ============================================================================
// SAVE TO DATABASE
// ============================================================================

export async function saveGeneratedPlan(
  result: GeneratorResult,
  coachId: string
): Promise<string> {
  const targets = result.targets;

  // 1. Create meal_plan
  const { data: planRow, error: planErr } = await supabase
    .from("meal_plans")
    .insert({
      name: result.config.planName,
      coach_id: coachId,
      target_calories: targets.calories,
      target_protein: targets.protein,
      target_carbs: targets.carbs,
      target_fat: targets.fat,
      notes: `Generated: ${targets.calories} kcal | ${targets.protein}g P / ${targets.carbs}g C / ${targets.fat}g F`,
      generated_config: result.config,
      is_active: true,
    })
    .select("id")
    .single();

  if (planErr || !planRow) throw new Error("Failed to create meal plan: " + planErr?.message);
  const planId = planRow.id as string;

  // Compute daily totals from option 1 of each meal (already calculated in result)
  const computedCalories = Math.round(result.dailyTotals.calories);
  const computedProtein  = Math.round(result.dailyTotals.protein * 10) / 10;
  const computedCarbs    = Math.round(result.dailyTotals.carbs   * 10) / 10;
  const computedFat      = Math.round(result.dailyTotals.fat     * 10) / 10;
  const computedFiber    = Math.round(result.dailyTotals.fiber   * 10) / 10;

  // 2. Batch insert all meals
  const mealInserts = result.meals.map((meal, i) => ({
    meal_plan_id: planId,
    name: meal.mealName,
    meal_type: meal.mealType,
    order_index: i,
  }));

  const { data: mealRows, error: mealErr } = await supabase
    .from("meals")
    .insert(mealInserts)
    .select("id, order_index");

  if (mealErr || !mealRows) throw new Error("Failed to create meals: " + mealErr?.message);

  // Sort returned rows by order_index to match our input order
  const sortedMealRows = [...(mealRows as { id: string; order_index: number }[])].sort(
    (a, b) => a.order_index - b.order_index
  );

  // 3. Insert options per meal (sequential per meal to ensure correct ID mapping)
  const allFoodItemInserts: {
    meal_id: string;
    meal_option_id: string;
    food_id: string;
    quantity: number;
    unit: string;
  }[] = [];

  for (let mealIdx = 0; mealIdx < result.meals.length; mealIdx++) {
    const meal = result.meals[mealIdx];
    const mealId = sortedMealRows[mealIdx]?.id;
    if (!mealId || meal.options.length === 0) continue;

    const optionInserts = meal.options.map((opt, j) => ({
      meal_id: mealId,
      name: opt.templateName,
      order_index: j,
    }));

    const { data: optionRows, error: optErr } = await supabase
      .from("meal_options")
      .insert(optionInserts)
      .select("id, order_index");

    if (optErr || !optionRows) throw new Error("Failed to create meal options: " + optErr?.message);

    const sortedOptionRows = [...(optionRows as { id: string; order_index: number }[])].sort(
      (a, b) => a.order_index - b.order_index
    );

    // Collect food items for this meal's options
    meal.options.forEach((opt, optIdx) => {
      const optionId = sortedOptionRows[optIdx]?.id;
      if (!optionId) return;
      opt.foods.forEach((food) => {
        allFoodItemInserts.push({
          meal_id: mealId,
          meal_option_id: optionId,
          food_id: food.foodId,
          quantity: food.portionGrams,
          unit: "g",
        });
      });
    });
  }

  // 4. Batch insert all food items
  if (allFoodItemInserts.length > 0) {
    const { error: fiErr } = await supabase
      .from("meal_food_items")
      .insert(allFoodItemInserts);
    if (fiErr) throw new Error("Failed to save meal food items: " + fiErr.message);
  }

  // 5. Cache computed macro totals on the meal_plan row so card lists can
  //    display them without re-querying food items.
  await supabase
    .from("meal_plans")
    .update({
      computed_calories: computedCalories,
      computed_protein:  computedProtein,
      computed_carbs:    computedCarbs,
      computed_fat:      computedFat,
      computed_fiber:    computedFiber,
    })
    .eq("id", planId);

  return planId;
}
