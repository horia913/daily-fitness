import { MealPlanService } from "@/lib/mealPlanService";

/** Shared with CoachFoodDatabasePanel — same field set and validation. */
export const FOOD_CATEGORIES = [
  "Protein",
  "Grains",
  "Vegetables",
  "Fruits",
  "Dairy",
  "Nuts",
  "Beverages",
  "Snacks",
  "General",
  "Legumes",
  "Oils",
  "Condiments",
] as const;

export type FoodCatalogFormState = {
  name: string;
  brand: string;
  serving_size: string;
  serving_unit: string;
  calories_per_serving: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  category: string;
};

export const EMPTY_FOOD_CATALOG_FORM: FoodCatalogFormState = {
  name: "",
  brand: "",
  serving_size: "100",
  serving_unit: "g",
  calories_per_serving: "",
  protein: "0",
  carbs: "0",
  fat: "0",
  fiber: "0",
  category: "General",
};

export function foodCatalogFormFromName(name: string): FoodCatalogFormState {
  return { ...EMPTY_FOOD_CATALOG_FORM, name };
}

export function validateFoodCatalogForm(form: FoodCatalogFormState): string | null {
  if (!form.name.trim()) return "Name is required.";
  const serving = Number(form.serving_size);
  if (!Number.isFinite(serving) || serving <= 0) {
    return "Serving size must be greater than 0.";
  }
  const calories = Number(form.calories_per_serving);
  if (!Number.isFinite(calories) || calories < 0) {
    return "Calories must be a valid number.";
  }
  for (const [label, value] of [
    ["Protein", form.protein],
    ["Carbs", form.carbs],
    ["Fat", form.fat],
    ["Fiber", form.fiber],
  ] as const) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return `${label} must be a valid number.`;
  }
  if (!form.category.trim()) return "Category is required.";
  return null;
}

export async function createFoodFromCatalogForm(form: FoodCatalogFormState) {
  return MealPlanService.createFood({
    name: form.name.trim(),
    brand: form.brand.trim() || undefined,
    serving_size: Number(form.serving_size),
    serving_unit: form.serving_unit.trim() || "g",
    calories_per_serving: Number(form.calories_per_serving),
    protein: Number(form.protein),
    carbs: Number(form.carbs),
    fat: Number(form.fat),
    fiber: Number(form.fiber),
    sodium: 0,
    category: form.category,
  });
}
