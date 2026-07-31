import { supabase } from "@/lib/supabase";

export interface CoachAssignmentRow {
  id: string;
  client_id: string;
  meal_plan_id: string;
  start_date: string;
  is_active: boolean;
  label: string | null;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  meal_plan: {
    id: string;
    name: string;
  } | null;
  /** Distinct days with meal_completions in the last 30 days. */
  completedDays30d: number;
  compliancePct30d: number | null;
}

export interface CoachAssignmentsData {
  assignments: CoachAssignmentRow[];
  activeCount: number;
  totalCount: number;
}

/** Coach roster assignments — same queries as OptimizedNutritionAssignments, no localStorage fallback. */
export async function fetchCoachAssignments(
  coachId: string,
): Promise<CoachAssignmentsData> {
  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from("meal_plan_assignments")
    .select("*")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });

  if (assignmentsError) throw assignmentsError;

  if (!assignmentsData?.length) {
    return { assignments: [], activeCount: 0, totalCount: 0 };
  }

  const clientIds = [...new Set(assignmentsData.map((a) => a.client_id))];
  const mealPlanIds = [...new Set(assignmentsData.map((a) => a.meal_plan_id))];

  const [{ data: profilesData, error: profilesError }, { data: mealPlansData, error: mealPlansError }] =
    await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name").in("id", clientIds),
      supabase.from("meal_plans").select("id, name").in("id", mealPlanIds),
    ]);

  if (profilesError) throw profilesError;
  if (mealPlansError) throw mealPlansError;

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);

  const { data: mealRows, error: completionsError } =
    clientIds.length > 0
      ? await supabase
          .from("meal_completions")
          .select("client_id, completed_at")
          .in("client_id", clientIds)
          .gte("completed_at", periodStart.toISOString())
      : { data: [], error: null };

  if (completionsError) throw completionsError;

  const daysByClient: Record<string, Set<string>> = {};
  clientIds.forEach((id) => {
    daysByClient[id] = new Set();
  });
  (mealRows || []).forEach((r: { client_id: string; completed_at: string }) => {
    daysByClient[r.client_id]?.add(
      new Date(r.completed_at).toISOString().slice(0, 10),
    );
  });

  const assignments: CoachAssignmentRow[] = assignmentsData.map((assignment) => {
    const client = profilesData?.find((p) => p.id === assignment.client_id) ?? null;
    const mealPlan =
      mealPlansData?.find((mp) => mp.id === assignment.meal_plan_id) ?? null;
    const days = daysByClient[assignment.client_id];
    const completedDays30d = days?.size ?? 0;
    const compliancePct30d =
      assignment.client_id != null
        ? Math.round((completedDays30d / 30) * 100)
        : null;

    return {
      id: assignment.id as string,
      client_id: assignment.client_id as string,
      meal_plan_id: assignment.meal_plan_id as string,
      start_date: assignment.start_date as string,
      is_active: Boolean(assignment.is_active),
      label: (assignment.label as string | null) ?? null,
      client: client
        ? {
            id: client.id,
            first_name: client.first_name ?? null,
            last_name: client.last_name ?? null,
          }
        : null,
      meal_plan: mealPlan
        ? { id: mealPlan.id, name: mealPlan.name }
        : null,
      completedDays30d,
      compliancePct30d,
    };
  });

  const activeCount = assignments.filter((a) => a.is_active).length;

  return {
    assignments,
    activeCount,
    totalCount: assignments.length,
  };
}
