import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoachAthleteScoreSummary } from "@/types/coachAthleteScore";

/**
 * Latest athlete_scores row per client + paused flag from active program_assignments.
 * Two batched queries (no N+1).
 */
export async function fetchCoachAthleteScoreSummariesByClientIds(
  supabase: SupabaseClient,
  clientIds: string[],
): Promise<Map<string, CoachAthleteScoreSummary | null>> {
  const result = new Map<string, CoachAthleteScoreSummary | null>();
  if (clientIds.length === 0) return result;

  const [{ data: scoreRows, error: scoresError }, { data: assignments, error: paError }] =
    await Promise.all([
      supabase
        .from("athlete_scores")
        .select("client_id, score, tier, calculated_at")
        .in("client_id", clientIds)
        .order("calculated_at", { ascending: false }),
      supabase
        .from("program_assignments")
        .select("client_id, pause_status")
        .in("client_id", clientIds)
        .eq("status", "active"),
    ]);

  if (scoresError) {
    console.error("[coachAthleteScoreSummaries] athlete_scores:", scoresError);
  }
  if (paError) {
    console.error("[coachAthleteScoreSummaries] program_assignments:", paError);
  }

  const latestByClient = new Map<string, { score: number; tier: string }>();
  for (const row of scoreRows ?? []) {
    if (!latestByClient.has(row.client_id)) {
      latestByClient.set(row.client_id, { score: row.score, tier: row.tier });
    }
  }

  const pausedClients = new Set<string>();
  for (const a of assignments ?? []) {
    if (a.pause_status === "paused") {
      pausedClients.add(a.client_id);
    }
  }

  for (const clientId of clientIds) {
    const entry = latestByClient.get(clientId);
    if (!entry) {
      result.set(clientId, null);
      continue;
    }
    result.set(clientId, {
      score: entry.score,
      tier: entry.tier,
      paused: pausedClients.has(clientId),
    });
  }

  return result;
}
