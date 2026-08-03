import type { DashboardData } from "@/lib/clientDashboardPageData";

/** Home greeting eyebrow — rest / up-next only (week position lives on Train). */
export function buildHomeGreetingEyebrow(
  todaysWorkout: DashboardData["todaysWorkout"] | undefined,
  _programProgress: DashboardData["programProgress"] | undefined,
  hasActiveProgram: boolean,
): string | null {
  const tw = todaysWorkout ?? { hasWorkout: false };

  if (!hasActiveProgram) return null;

  if (!tw.hasWorkout) {
    return "● Rest day · Recovery";
  }

  return null;
}

export function formatHomeDateLine(): string {
  const d = new Date();
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  return `${weekday} · ${month} ${day}`;
}
