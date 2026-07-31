import type { CoachAthleteScoreSummary } from "@/types/coachAthleteScore";
import type { CoachAttentionLevel } from "@/lib/coachAttention";
import type { Client } from "./coachClientsTypes";

export type CoachClientAttentionTone = "good" | "warn" | "bad" | "muted";

/** Attention-mapped status hue for coach list row rail + wash. */
export function coachClientAttentionHue(
  level: CoachAttentionLevel,
): string {
  switch (level) {
    case "on_track":
      return "var(--fc-status-success)";
    case "monitor":
      return "var(--fc-status-warning)";
    case "needs_attention":
      return "var(--fc-status-error)";
    default:
      return "var(--fc-text-subtle)";
  }
}

export function coachClientAttentionTone(
  level: CoachAttentionLevel,
): CoachClientAttentionTone {
  switch (level) {
    case "on_track":
      return "good";
    case "monitor":
      return "warn";
    case "needs_attention":
      return "bad";
    default:
      return "muted";
  }
}

function coachAttentionLevelStatusLabel(level: CoachAttentionLevel): string {
  switch (level) {
    case "needs_attention":
      return "Needs attention";
    case "monitor":
      return "Monitor";
    case "on_track":
    default:
      return "On track";
  }
}

export function coachClientListStatusPresentation(client: Client): {
  cardStatus: "active" | "inactive";
  statusLabel: string;
  statusTone: CoachClientAttentionTone;
  hue: string;
} {
  const attentionLevel = client.attention?.level ?? "on_track";
  if (client.status === "inactive") {
    return {
      cardStatus: "inactive",
      statusLabel: "Inactive",
      statusTone: "muted",
      hue: "var(--fc-text-subtle)",
    };
  }
  if (client.status === "pending") {
    return {
      cardStatus: "active",
      statusLabel: "Pending",
      statusTone: "muted",
      hue: coachClientAttentionHue(attentionLevel),
    };
  }
  if (!client.hasActiveProgram || client.trainingStatus === "no_program") {
    return {
      cardStatus: "active",
      statusLabel: "No program",
      statusTone: "muted",
      // Neutral rail + wash (not success green) — matches roster mockup `.card.non`.
      hue: "rgba(255, 255, 255, 0.18)",
    };
  }
  return {
    cardStatus: "active",
    statusLabel: coachAttentionLevelStatusLabel(attentionLevel),
    statusTone: coachClientAttentionTone(attentionLevel),
    hue: coachClientAttentionHue(attentionLevel),
  };
}

export function computeScoreIsStale(
  athleteScore: CoachAthleteScoreSummary | null | undefined,
  lastActive: string | null | undefined,
): boolean {
  if (!athleteScore?.calculated_at) return false;
  if (!lastActive) return false;
  const scoreDay = athleteScore.calculated_at.slice(0, 10);
  return scoreDay < lastActive;
}

export function formatScoreStaleDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function clientInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
