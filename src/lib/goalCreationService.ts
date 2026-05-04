import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pillar } from "@/components/goals/pillarTypes";

export type GoalWizardCategory =
  | "body_composition"
  | "performance"
  | "outcome"
  | "nutrition";

export type GoalSourceType =
  | "body_metric"
  | "personal_record"
  | "workout_count"
  | "wellness_field"
  | "meal_plan"
  | "manual";

export type GoalLinkDirection = "increase" | "decrease" | "maintain";

export type ResolvedGoalCreation = {
  clientId: string;
  category: GoalWizardCategory;
  pillar: Pillar;
  title: string;
  target_value: number | null;
  target_unit: string | null;
  target_date: string | null;
  notes: string | null;
  source_type: GoalSourceType;
  source_config: Record<string, unknown>;
  direction: GoalLinkDirection;
};

/** Built by wizard forms; wizard adds clientId + pillar before insert. */
export type GoalCreationPayload = Omit<ResolvedGoalCreation, "clientId" | "pillar">;

export async function fetchClientCoachId(
  supabase: SupabaseClient,
  clientId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("coach_id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[goalCreationService] clients fetch error:", error);
    return null;
  }
  const coachId = data?.coach_id;
  return typeof coachId === "string" ? coachId : null;
}

/** Maps wizard category to goals.pillar for list grouping. */
export function pillarForGoalCategory(category: GoalWizardCategory): Pillar {
  switch (category) {
    case "body_composition":
      return "checkins";
    case "performance":
      return "training";
    case "outcome":
      return "lifestyle";
    case "nutrition":
      return "nutrition";
    default:
      return "general";
  }
}

export type CreateGoalResult =
  | { ok: true; goalId: string }
  | { ok: false; error: Error };

/**
 * Inserts goals then goal_source_links; deletes the goal if the link insert fails.
 */
export async function createGoalWithSourceLink(
  supabase: SupabaseClient,
  input: ResolvedGoalCreation
): Promise<CreateGoalResult> {
  const coachId = await fetchClientCoachId(supabase, input.clientId);

  const startYmd = new Date().toISOString().slice(0, 10);

  const goalPayload = {
    client_id: input.clientId,
    coach_id: coachId,
    title: input.title.trim(),
    description: null as string | null,
    category: input.category,
    pillar: input.pillar,
    target_value: input.target_value,
    target_unit: input.target_unit,
    target_date: input.target_date,
    notes: input.notes?.trim() ? input.notes.trim() : null,
    current_value: 0,
    status: "active" as const,
    priority: "medium" as const,
    start_date: startYmd,
    progress_percentage: 0,
  };

  const { data: goalRow, error: goalError } = await supabase
    .from("goals")
    .insert(goalPayload)
    .select("id")
    .single();

  if (goalError || !goalRow?.id) {
    const err = goalError ?? new Error("Goal insert returned no id");
    console.error("[goalCreationService] goal insert error:", goalError, goalPayload);
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  }

  const goalId = goalRow.id as string;

  const linkPayload = {
    goal_id: goalId,
    source_type: input.source_type,
    source_config: input.source_config,
    direction: input.direction,
  };

  const { error: linkError } = await supabase.from("goal_source_links").insert(linkPayload);

  if (linkError) {
    console.error("[goalCreationService] goal_source_links insert error:", linkError, linkPayload);
    const { error: delError } = await supabase.from("goals").delete().eq("id", goalId);
    if (delError) {
      console.error("[goalCreationService] rollback delete goal failed:", delError);
    }
    return { ok: false, error: linkError };
  }

  return { ok: true, goalId };
}
