import { ATHLETE_TIERS } from "@/types/athleteScore";
import type { AthleteScoreTierKey } from "@/types/athleteScore";

export function formatAthleteScoreWindowRange(
  windowStart: string,
  windowEnd: string,
): string {
  const fmt = (ymd: string) => {
    const raw = ymd?.trim().slice(0, 10) ?? "";
    if (raw.length < 10) return raw;
    const d = new Date(`${raw}T12:00:00`);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  return `${fmt(windowStart)} – ${fmt(windowEnd)}`;
}

export function tierLabelForKey(tier: string | null | undefined): string {
  const t = tier ?? "benched";
  return ATHLETE_TIERS.find((x) => x.key === t)?.label ?? "Benched";
}

export function tierColorForKey(tier: string | null | undefined): string {
  const t = (tier ?? "benched") as AthleteScoreTierKey;
  return ATHLETE_TIERS.find((x) => x.key === t)?.color ?? "#374151";
}

export function formatCoachScoreDelta(delta: number | null | undefined): {
  text: string;
  className: string;
} {
  if (delta == null || !Number.isFinite(delta)) {
    return { text: "— same", className: "text-muted-foreground" };
  }
  if (delta === 0) {
    return { text: "— same", className: "text-muted-foreground" };
  }
  if (delta > 0) {
    return {
      text: `▲ +${Math.round(delta)}`,
      className: "text-[color:var(--fc-status-success)]",
    };
  }
  return {
    text: `▼ ${Math.round(delta)}`,
    className: "text-[color:var(--fc-status-error)]",
  };
}

export function formatSteps(n: number): string {
  return Math.round(n).toLocaleString();
}
