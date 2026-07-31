/**
 * tierBackdrop — map an athlete-score tier key to an AtmosphericVariant
 *
 * Spec refs: design-system-v4 §7.1 (tier-driven hero/backdrop), §3 (atmospheric
 *             backdrops), §13.1 (client home recipe). Phase 1 Screen 1 V1
 *             decision: backdrop variant on /client home is tier-driven, not
 *             a static "action-top" — the dashboard reflects user state, not
 *             screen type.
 *
 * Tier → variant mapping:
 *   beast_mode (≥90)  → "achievement"  (gold halo)
 *   locked_in  (≥75)  → "action-top"   (action halo)
 *   showing_up (≥55)  → "info"         (cyan halo)
 *   slipping   (≥35)  → "warning"      (amber halo)
 *   benched    (<35)  → "error"        (red halo)
 *
 * If athleteScore is null/loading: fall back to "info" (calm cyan default).
 *
 * AthleteTierKey is derived from the canonical AthleteScore['tier'] union in
 * src/types/athleteScore.ts. If a sixth tier is ever added there, the
 * exhaustive Record below will fail to compile and surface the drift
 * immediately — keeps the design-system mapping in lockstep with the data
 * schema-of-record.
 *
 * Phase 1 Screen 1 (V1).
 */

import type { AtmosphericVariant } from "@/components/ui/AtmosphericBackdrop";
import type { AthleteScore } from "@/types/athleteScore";

export type AthleteTierKey = AthleteScore["tier"];

const TIER_TO_BACKDROP: Record<AthleteTierKey, AtmosphericVariant> = {
  beast_mode: "achievement",
  locked_in: "action-top",
  showing_up: "info",
  slipping: "warning",
  benched: "error",
};

/**
 * Resolve the AtmosphericBackdrop variant for a given tier key.
 *
 * Accepts `string | null | undefined` to absorb upstream loose typing
 * (RPC payloads, optional rows). Returns `"info"` for nullish or unknown
 * values so the page always has a valid backdrop.
 */
export function tierBackdropVariant(
  tier: string | null | undefined,
): AtmosphericVariant {
  if (!tier) return "info";
  if (tier in TIER_TO_BACKDROP) {
    return TIER_TO_BACKDROP[tier as AthleteTierKey];
  }
  return "info";
}
