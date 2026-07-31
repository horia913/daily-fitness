/**
 * Batched counts for /coach/training hub tiles.
 * Fixed query set — not one round-trip per destination.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type TrainingHubStats = {
  programs: { count: number; assigned: number };
  templates: { count: number; lastEditedAt: string | null };
  exercises: { count: number; untagged: number };
  challenges: { running: number; participants: number };
  /** Board size is browser-local; API leaves null — client fills from localStorage. */
  gymConsole: { onBoard: number | null };
  testing: { thisMonth: number; lastAt: string | null };
  workoutCategories: { count: number };
  exerciseCategories: { count: number };
};

function monthStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function monthStartDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export async function buildTrainingHubStats(
  supabase: SupabaseClient,
  coachId: string,
): Promise<TrainingHubStats> {
  const { data: clientRows } = await supabase
    .from("clients")
    .select("client_id")
    .eq("coach_id", coachId);
  const clientIds = (clientRows ?? []).map((r) => r.client_id as string);

  const monthIso = monthStartIso();
  const monthDate = monthStartDate();

  const [
    programsRes,
    programIdsRes,
    templatesRes,
    templatesLastRes,
    exercisesRes,
    untaggedRes,
    challengesRes,
    workoutCatsRes,
    exerciseCatsRes,
  ] = await Promise.all([
    supabase
      .from("workout_programs")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", coachId),
    supabase.from("workout_programs").select("id").eq("coach_id", coachId),
    supabase
      .from("workout_templates")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", coachId),
    supabase
      .from("workout_templates")
      .select("updated_at")
      .eq("coach_id", coachId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("exercises")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", coachId),
    supabase
      .from("exercises")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", coachId)
      .is("primary_muscle_group_id", null),
    supabase
      .from("challenges")
      .select("id")
      .eq("created_by", coachId)
      .eq("status", "active"),
    supabase
      .from("workout_categories")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", coachId),
    supabase
      .from("exercise_categories")
      .select("id", { count: "exact", head: true }),
  ]);

  const coachProgramIds = (programIdsRes.data ?? []).map((r) => r.id as string);
  let assignedProgramIds = new Set<string>();
  if (coachProgramIds.length > 0) {
    const { data: assignRows } = await supabase
      .from("program_assignments")
      .select("program_id")
      .eq("status", "active")
      .in("program_id", coachProgramIds);
    assignedProgramIds = new Set(
      (assignRows ?? []).map((r) => r.program_id as string),
    );
  }
  const runningChallengeIds = (challengesRes.data ?? []).map((c) => c.id as string);

  let participants = 0;
  if (runningChallengeIds.length > 0) {
    const { count } = await supabase
      .from("challenge_participants")
      .select("id", { count: "exact", head: true })
      .in("challenge_id", runningChallengeIds);
    participants = count ?? 0;
  }

  let testingMonth = 0;
  let lastAt: string | null = null;

  if (clientIds.length > 0) {
    const [
      mobilityMonth,
      mobilityLast,
      perfMonth,
      perfLast,
      bodyMonth,
      bodyLast,
      fmsMonth,
      fmsLast,
    ] = await Promise.all([
      supabase
        .from("mobility_assessments")
        .select("id", { count: "exact", head: true })
        .in("client_id", clientIds)
        .gte("assessed_at", monthIso),
      supabase
        .from("mobility_assessments")
        .select("assessed_at")
        .in("client_id", clientIds)
        .order("assessed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("performance_test_results")
        .select("id", { count: "exact", head: true })
        .in("client_id", clientIds)
        .gte("tested_at", monthIso),
      supabase
        .from("performance_test_results")
        .select("tested_at")
        .in("client_id", clientIds)
        .order("tested_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("body_metrics")
        .select("id", { count: "exact", head: true })
        .in("client_id", clientIds)
        .eq("coach_id", coachId)
        .gte("measured_date", monthDate),
      supabase
        .from("body_metrics")
        .select("measured_date")
        .in("client_id", clientIds)
        .eq("coach_id", coachId)
        .order("measured_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("fms_assessments")
        .select("id", { count: "exact", head: true })
        .in("client_id", clientIds)
        .gte("assessed_date", monthDate),
      supabase
        .from("fms_assessments")
        .select("assessed_date")
        .in("client_id", clientIds)
        .order("assessed_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    testingMonth =
      (mobilityMonth.count ?? 0) +
      (perfMonth.count ?? 0) +
      (bodyMonth.count ?? 0) +
      (fmsMonth.count ?? 0);

    const candidates = [
      mobilityLast.data?.assessed_at as string | undefined,
      perfLast.data?.tested_at as string | undefined,
      bodyLast.data?.measured_date
        ? `${bodyLast.data.measured_date as string}T00:00:00.000Z`
        : undefined,
      fmsLast.data?.assessed_date
        ? `${fmsLast.data.assessed_date as string}T00:00:00.000Z`
        : undefined,
    ].filter((x): x is string => !!x);
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.localeCompare(a));
      lastAt = candidates[0] ?? null;
    }
  }

  return {
    programs: {
      count: programsRes.count ?? 0,
      assigned: assignedProgramIds.size,
    },
    templates: {
      count: templatesRes.count ?? 0,
      lastEditedAt: (templatesLastRes.data?.updated_at as string | null) ?? null,
    },
    exercises: {
      count: exercisesRes.count ?? 0,
      untagged: untaggedRes.count ?? 0,
    },
    challenges: {
      running: runningChallengeIds.length,
      participants,
    },
    gymConsole: { onBoard: null },
    testing: {
      thisMonth: testingMonth,
      lastAt,
    },
    workoutCategories: { count: workoutCatsRes.count ?? 0 },
    exerciseCategories: { count: exerciseCatsRes.count ?? 0 },
  };
}
