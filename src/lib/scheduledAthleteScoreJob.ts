import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { calculateAthleteScore } from "@/lib/athleteScoreService";

export type ScheduledAthleteScoreResult = {
  rosterClientsScanned: number;
  activeAssignmentClients: number;
  alreadyScoredToday: number;
  computed: number;
  skippedNoProgram: number;
  skippedPaused: number;
  skippedNoData: number;
  errors: number;
};

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase admin env for scheduled athlete score job");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Daily athlete score compute for active roster clients.
 *
 * Idempotency: if a client already has an athlete_scores row with calculated_at on
 * today's UTC date, skip recompute for that client.
 *
 * Per-client isolation: one failure increments errors and the loop continues.
 */
export async function runScheduledAthleteScoreJob(
  adminClient?: SupabaseClient,
  opts?: { failClientId?: string | null },
): Promise<ScheduledAthleteScoreResult> {
  const admin = adminClient ?? getAdminClient();
  const result: ScheduledAthleteScoreResult = {
    rosterClientsScanned: 0,
    activeAssignmentClients: 0,
    alreadyScoredToday: 0,
    computed: 0,
    skippedNoProgram: 0,
    skippedPaused: 0,
    skippedNoData: 0,
    errors: 0,
  };

  const { data: rosterRows, error: rosterErr } = await admin
    .from("clients")
    .select("client_id")
    .eq("status", "active");

  if (rosterErr) {
    console.error("[scheduledAthleteScore] list roster clients:", rosterErr);
    throw rosterErr;
  }

  const rosterClientIds = [...new Set((rosterRows ?? []).map((r) => r.client_id as string).filter(Boolean))];
  result.rosterClientsScanned = rosterClientIds.length;
  if (rosterClientIds.length === 0) return result;

  const { data: activeAssignments, error: paErr } = await admin
    .from("program_assignments")
    .select("client_id")
    .in("client_id", rosterClientIds)
    .eq("status", "active");

  if (paErr) {
    console.error("[scheduledAthleteScore] list active assignments:", paErr);
    throw paErr;
  }

  const activeClientIds = [...new Set((activeAssignments ?? []).map((r) => r.client_id as string).filter(Boolean))];
  result.activeAssignmentClients = activeClientIds.length;
  if (activeClientIds.length === 0) return result;

  const todayYmd = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(`${todayYmd}T00:00:00.000Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const { data: todayRows, error: todayErr } = await admin
    .from("athlete_scores")
    .select("client_id, calculated_at")
    .in("client_id", activeClientIds)
    .gte("calculated_at", `${todayYmd}T00:00:00.000Z`)
    .lt("calculated_at", tomorrow.toISOString());

  if (todayErr) {
    console.error("[scheduledAthleteScore] read today's scores:", todayErr);
    throw todayErr;
  }

  const alreadyToday = new Set((todayRows ?? []).map((r) => r.client_id as string));
  result.alreadyScoredToday = alreadyToday.size;

  for (const clientId of activeClientIds) {
    try {
      if (opts?.failClientId && opts.failClientId === clientId) {
        throw new Error("Injected failure for isolation test");
      }
      if (alreadyToday.has(clientId)) continue;
      const out = await calculateAthleteScore(clientId, admin);
      if ("skipped" in out && out.skipped) {
        if (out.reason === "no_program") result.skippedNoProgram += 1;
        else if (out.reason === "paused") result.skippedPaused += 1;
        else if (out.reason === "no_data") result.skippedNoData += 1;
        continue;
      }
      result.computed += 1;
    } catch (error) {
      result.errors += 1;
      console.error(`[scheduledAthleteScore] client ${clientId} failed:`, error);
    }
  }

  return result;
}
