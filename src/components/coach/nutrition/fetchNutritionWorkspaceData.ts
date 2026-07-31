import { supabase } from "@/lib/supabase";
import { MealPlanService } from "@/lib/mealPlanService";
import { clientInitialsFromProfile } from "@/lib/programs/programListDisplayUtils";

export interface NutritionWorkspaceMeta {
  mealPlanCount: number;
  activeAssignmentCount: number;
  foodCount: number;
}

/** Header counts — same tables/services as list pages, count-only queries where possible. */
export async function fetchNutritionWorkspaceMeta(
  coachId: string,
): Promise<NutritionWorkspaceMeta> {
  const [plans, assignmentsRes, foodsRes] = await Promise.all([
    MealPlanService.getMealPlans(coachId),
    supabase
      .from("meal_plan_assignments")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", coachId)
      .eq("is_active", true),
    supabase
      .from("foods")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  return {
    mealPlanCount: plans.length,
    activeAssignmentCount: assignmentsRes.count ?? 0,
    foodCount: foodsRes.count ?? 0,
  };
}

export interface MealPlanAssignedPreview {
  count: number;
  initials: string[];
}

export type MealPlanWithStats = import("@/lib/mealPlanService").MealPlan & {
  meal_count: number;
  usage_count: number;
  assignedPreview: MealPlanAssignedPreview;
};

export async function fetchCoachMealPlansWithStats(coachId: string): Promise<{
  mealPlans: MealPlanWithStats[];
}> {
  const mealPlansData = await MealPlanService.getMealPlans(coachId);
  if (!mealPlansData.length) return { mealPlans: [] };

  const planIds = mealPlansData.map((p) => p.id);

  const [{ data: mealsData }, { data: assignmentsData }] = await Promise.all([
    supabase.from("meals").select("meal_plan_id").in("meal_plan_id", planIds),
    supabase
      .from("meal_plan_assignments")
      .select("meal_plan_id, client_id")
      .in("meal_plan_id", planIds),
  ]);

  const mealCountByPlan: Record<string, number> = {};
  planIds.forEach((id) => {
    mealCountByPlan[id] = 0;
  });
  (mealsData || []).forEach((row: { meal_plan_id: string }) => {
    if (mealCountByPlan[row.meal_plan_id] != null) {
      mealCountByPlan[row.meal_plan_id] += 1;
    }
  });

  const assignCountByPlan: Record<string, number> = {};
  const previewClientIdsByPlan = new Map<string, string[]>();
  planIds.forEach((id) => {
    assignCountByPlan[id] = 0;
  });
  (assignmentsData || []).forEach(
    (row: { meal_plan_id: string; client_id?: string | null }) => {
      if (assignCountByPlan[row.meal_plan_id] != null) {
        assignCountByPlan[row.meal_plan_id] += 1;
      }
      const clientId = row.client_id;
      if (clientId) {
        const existing = previewClientIdsByPlan.get(row.meal_plan_id) ?? [];
        if (existing.length < 3 && !existing.includes(clientId)) {
          previewClientIdsByPlan.set(row.meal_plan_id, [...existing, clientId]);
        }
      }
    },
  );

  const allPreviewClientIds = [
    ...new Set([...previewClientIdsByPlan.values()].flat()),
  ];

  const profileById = new Map<
    string,
    {
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
    }
  >();

  if (allPreviewClientIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", allPreviewClientIds);

    for (const profile of profilesData ?? []) {
      profileById.set(profile.id, profile);
    }
  }

  const mealPlans = mealPlansData.map((plan) => {
    const count = assignCountByPlan[plan.id] ?? 0;
    const previewIds = previewClientIdsByPlan.get(plan.id) ?? [];
    return {
      ...plan,
      meal_count: mealCountByPlan[plan.id] ?? 0,
      usage_count: count,
      assignedPreview: {
        count,
        initials: previewIds.map((clientId) =>
          clientInitialsFromProfile(profileById.get(clientId)),
        ),
      },
    };
  });

  return { mealPlans };
}
