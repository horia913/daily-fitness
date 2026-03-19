/**
 * Food & Nutrition Icon Mapping Utility
 *
 * Deterministic Lucide icon selection for food items based on available data.
 *
 * TWO ICON DIMENSIONS:
 *
 *   1. FOOD CATEGORY — What kind of food is it?
 *      Based on `foods.category` (text field on the foods table).
 *      Categories: Protein, Grains, Vegetables, Fruits, Dairy, Nuts,
 *                  Beverages, Snacks, Condiments, Desserts, General/Other.
 *
 *   2. DOMINANT MACRO — What is this food's primary macronutrient?
 *      Calculated from the food's macro breakdown (protein_g, carbs_g, fat_g).
 *      Used when you want to visually indicate what a food "contributes most" to.
 *
 * USAGE:
 *   import { getFoodVisuals, getMacroVisuals } from "@/lib/foodIconMap";
 *
 *   // By category (most common — food lists, search results, meal plans)
 *   const { Icon, color } = getFoodVisuals({ category: "Protein" });
 *
 *   // By dominant macro (for macro-focused views — daily breakdown, meal summary)
 *   const { Icon, color, label } = getMacroVisuals({ protein: 30, carbs: 5, fat: 8 });
 */

import {
  Beef,
  Wheat,
  Carrot,
  Apple,
  Milk,
  Nut,
  Droplets,
  Fish,
  Egg,
  Cookie,
  CakeSlice,
  Utensils,
  Drumstick,
  Leaf,
  Citrus,
  type LucideIcon,
} from "lucide-react";

// ─── FOOD CATEGORY → ICON ──────────────────────────────────────────────
// Maps foods.category (text) to a Lucide icon.
// Covers all categories used in coach Food Database + client food create page.

export const FOOD_CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Protein":     Beef,
  "Grains":      Wheat,
  "Vegetables":  Carrot,
  "Fruits":      Apple,
  "Dairy":       Milk,
  "Nuts":        Nut,
  "Beverages":   Droplets,
  "Snacks":      Cookie,
  "Condiments":  Utensils,
  "Desserts":    CakeSlice,
  "General":     Utensils,
  "Other":       Utensils,
};

// ─── FOOD CATEGORY → COLOR ─────────────────────────────────────────────

export const FOOD_CATEGORY_COLORS: Record<string, string> = {
  "Protein":     "#EF4444", // red — meat/protein association
  "Grains":      "#F59E0B", // amber — wheat/grain warmth
  "Vegetables":  "#22C55E", // green — fresh greens
  "Fruits":      "#A855F7", // purple — berry/fruit variety
  "Dairy":       "#06B6D4", // cyan — cool/fresh
  "Nuts":        "#D97706", // warm amber — nutty earth tones
  "Beverages":   "#3B82F6", // blue — water/liquid
  "Snacks":      "#F97316", // orange — energy/fun
  "Condiments":  "#64748B", // slate — neutral/supporting
  "Desserts":    "#EC4899", // pink — sweet
  "General":     "#64748B", // slate
  "Other":       "#64748B", // slate
};

// ─── DOMINANT MACRO → ICON ─────────────────────────────────────────────
// For when you want to show what macro a food primarily contributes to.
// Protein icon = Drumstick (distinct from category Beef)
// Carbs icon = Wheat
// Fat icon = Egg (fats/oils/yolks association)

export const MACRO_ICONS = {
  protein: Drumstick,
  carbs:   Wheat,
  fat:     Egg,
} as const;

export const MACRO_COLORS = {
  protein: "#EF4444", // red
  carbs:   "#F59E0B", // amber
  fat:     "#3B82F6", // blue
} as const;

export const MACRO_LABELS = {
  protein: "Protein",
  carbs:   "Carbs",
  fat:     "Fat",
} as const;

// ─── SPECIAL FOOD TYPE ICONS ───────────────────────────────────────────
// For specific rendering contexts (e.g. "top protein source today").

export const SPECIAL_FOOD_ICONS = {
  proteinSource: Drumstick,  // food with highest protein %
  carbSource:    Wheat,      // food with highest carb %
  fatSource:     Egg,        // food with highest fat %
  vegetable:     Leaf,       // vegetable items
  fruit:         Citrus,     // fruit items
  fish:          Fish,       // fish/seafood items
} as const;

export const SPECIAL_FOOD_COLORS = {
  proteinSource: "#EF4444",
  carbSource:    "#F59E0B",
  fatSource:     "#3B82F6",
  vegetable:     "#22C55E",
  fruit:         "#A855F7",
  fish:          "#06B6D4",
} as const;

// ─── PUBLIC API ────────────────────────────────────────────────────────

interface FoodIconInput {
  category?: string | null;
}

/**
 * Returns the Lucide icon + color for a food item based on its category.
 */
export function getFoodVisuals(input: FoodIconInput): {
  Icon: LucideIcon;
  color: string;
} {
  const cat = input.category ?? "General";
  return {
    Icon: FOOD_CATEGORY_ICONS[cat] ?? Utensils,
    color: FOOD_CATEGORY_COLORS[cat] ?? "#64748B",
  };
}

/**
 * Returns the Lucide icon for a food's category.
 */
export function getFoodIcon(input: FoodIconInput): LucideIcon {
  return FOOD_CATEGORY_ICONS[input.category ?? "General"] ?? Utensils;
}

/**
 * Returns the accent color for a food's category.
 */
export function getFoodColor(input: FoodIconInput): string {
  return FOOD_CATEGORY_COLORS[input.category ?? "General"] ?? "#64748B";
}

interface MacroInput {
  protein: number;
  carbs: number;
  fat: number;
}

type MacroType = "protein" | "carbs" | "fat";

/**
 * Determines the dominant macro and returns icon + color + label.
 * Fat calories are weighted (×9 vs ×4 for protein/carbs) so we compare
 * by gram percentage, not calorie percentage — this gives a more intuitive
 * result (e.g. peanut butter shows as "Fat" source, not "Protein").
 */
export function getMacroVisuals(input: MacroInput): {
  Icon: LucideIcon;
  color: string;
  label: string;
  dominant: MacroType;
} {
  const total = input.protein + input.carbs + input.fat;
  if (total === 0) {
    return {
      Icon: Utensils,
      color: "#64748B",
      label: "General",
      dominant: "carbs",
    };
  }

  let dominant: MacroType = "carbs";
  if (input.protein >= input.carbs && input.protein >= input.fat) {
    dominant = "protein";
  } else if (input.fat >= input.carbs && input.fat >= input.protein) {
    dominant = "fat";
  }

  return {
    Icon: MACRO_ICONS[dominant],
    color: MACRO_COLORS[dominant],
    label: MACRO_LABELS[dominant],
    dominant,
  };
}

/**
 * Returns icon + color for a specific "top source" role.
 */
export function getSpecialFoodVisuals(role: keyof typeof SPECIAL_FOOD_ICONS): {
  Icon: LucideIcon;
  color: string;
} {
  return {
    Icon: SPECIAL_FOOD_ICONS[role],
    color: SPECIAL_FOOD_COLORS[role],
  };
}
