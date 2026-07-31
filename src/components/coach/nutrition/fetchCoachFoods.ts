import { supabase } from "@/lib/supabase";

export interface CoachFoodRow {
  id: string;
  name: string;
  brand: string | null;
  serving_size: number;
  serving_unit: string;
  calories_per_serving: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  category: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CoachFoodsData {
  foods: CoachFoodRow[];
  totalCount: number;
}

/** Active foods — same query as OptimizedFoodDatabase.loadFoods, no localStorage fallback. */
export async function fetchCoachFoods(): Promise<CoachFoodsData> {
  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  const foods: CoachFoodRow[] = (data || []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    brand: (row.brand as string | null) ?? null,
    serving_size: Number(row.serving_size),
    serving_unit: (row.serving_unit as string) || "g",
    calories_per_serving: Number(row.calories_per_serving),
    protein: Number(row.protein ?? 0),
    carbs: Number(row.carbs ?? 0),
    fat: Number(row.fat ?? 0),
    fiber: Number(row.fiber ?? 0),
    category: (row.category as string) || "General",
    created_at: (row.created_at as string | null) ?? null,
    updated_at: (row.updated_at as string | null) ?? null,
  }));

  return { foods, totalCount: foods.length };
}
