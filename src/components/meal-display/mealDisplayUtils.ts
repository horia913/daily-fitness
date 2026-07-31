import type { MealFoodItem, MacroTotals } from "@/lib/mealPlanService";
import type { MealHueIndex } from "./types";

/** Food fields needed for macro math (includes optional per-100g columns). */
export type FoodMacroSource = NonNullable<MealFoodItem["food"]> & {
  calories_per_100g?: number | null;
  protein_per_100g?: number | null;
  carbs_per_100g?: number | null;
  fat_per_100g?: number | null;
  fiber_per_100g?: number | null;
};

export function roundInt(n: number): number {
  return Math.round(n);
}

export function formatKcal(n: number): string {
  return roundInt(n).toLocaleString("en-US");
}

export function mealTypeBadge(mealType: string): { letter: string; hue: MealHueIndex } {
  const t = mealType.toLowerCase();
  if (t === "breakfast") return { letter: "B", hue: 0 };
  if (t === "lunch") return { letter: "L", hue: 1 };
  if (t === "dinner") return { letter: "D", hue: 2 };
  if (t === "snack") return { letter: "S", hue: 3 };
  const letter = t.charAt(0).toUpperCase() || "?";
  return { letter, hue: 3 };
}

export function optionHueIndex(optionIndex: number): MealHueIndex {
  return (optionIndex % 4) as MealHueIndex;
}

export function computeItemMacros(item: MealFoodItem): MacroTotals {
  const food = item.food as FoodMacroSource | undefined;
  if (!food) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }
  if (food.calories_per_100g != null) {
    const ratio = item.quantity / 100;
    return {
      calories: food.calories_per_100g * ratio,
      protein: (food.protein_per_100g || 0) * ratio,
      carbs: (food.carbs_per_100g || 0) * ratio,
      fat: (food.fat_per_100g || 0) * ratio,
      fiber: (food.fiber_per_100g || 0) * ratio,
    };
  }
  const multiplier = item.quantity / (food.serving_size || 1);
  return {
    calories: (food.calories_per_serving || 0) * multiplier,
    protein: (food.protein || 0) * multiplier,
    carbs: (food.carbs || 0) * multiplier,
    fat: (food.fat || 0) * multiplier,
    fiber: (food.fiber || 0) * multiplier,
  };
}

export function sumMacros(items: MacroTotals[]): MacroTotals {
  return items.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      fiber: acc.fiber + m.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

export function formatMacroLine(totals: MacroTotals): string {
  return `${formatKcal(totals.calories)} kcal · P ${roundInt(totals.protein)} · C ${roundInt(totals.carbs)} · F ${roundInt(totals.fat)}`;
}

export function formatFoodMacros(totals: MacroTotals): string {
  return `${formatKcal(totals.calories)} kcal · P ${roundInt(totals.protein)} · C ${roundInt(totals.carbs)} · F ${roundInt(totals.fat)}`;
}

export function formatQty(quantity: number, unit: string): string {
  const q = Number.isInteger(quantity) ? String(quantity) : String(quantity);
  return `${q} ${unit}`.trim();
}

export type DeltaStatus = "on_target" | "under" | "over";

export interface MacroDelta {
  text: string;
  status: DeltaStatus;
  colorClass: "good" | "warn";
}

export function computeKcalDelta(computed: number, target: number | null | undefined): MacroDelta | null {
  if (target == null || target === 0) return null;
  const delta = roundInt(computed - target);
  const pct = Math.abs(delta) / target;
  const signed = delta > 0 ? `+${delta}` : `${delta}`;
  if (pct <= 0.05) {
    return { text: `${signed} · ON TARGET`, status: "on_target", colorClass: "good" };
  }
  if (delta < 0) {
    return { text: `${signed} · UNDER`, status: "under", colorClass: "warn" };
  }
  return { text: `${signed} · OVER`, status: "over", colorClass: "warn" };
}

export function computeGramDelta(
  computed: number,
  target: number | null | undefined,
  label: "G",
): MacroDelta | null {
  if (target == null || target === 0) return null;
  const delta = roundInt(computed - target);
  const signed = delta > 0 ? `+${delta}${label}` : `${delta}${label}`;
  if (Math.abs(delta) <= 8) {
    return { text: `${signed} · ON TARGET`, status: "on_target", colorClass: "good" };
  }
  if (delta < 0) {
    return { text: `${signed} · UNDER`, status: "under", colorClass: "warn" };
  }
  return { text: `${signed} · OVER`, status: "over", colorClass: "warn" };
}

export function hasTarget(value: number | null | undefined): boolean {
  return value != null && value !== 0;
}
