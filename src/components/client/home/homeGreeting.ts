import type { DashboardData } from "@/lib/clientDashboardPageData";

/** Program-position eyebrow — same sources as the legacy Home greeting / Train week context. */
export function buildHomeGreetingEyebrow(
  todaysWorkout: DashboardData["todaysWorkout"] | undefined,
  programProgress: DashboardData["programProgress"] | undefined,
  hasActiveProgram: boolean,
): string | null {
  const tw = todaysWorkout ?? { hasWorkout: false };

  if (!hasActiveProgram) return null;

  if (!tw.hasWorkout) {
    return "● Rest day · Recovery";
  }

  const totalWeeks = programProgress?.totalWeeks;
  if (
    tw.type === "program" &&
    tw.dayNumber != null &&
    totalWeeks != null &&
    totalWeeks > 0
  ) {
    return `● Up next · Day ${tw.dayNumber} of ${totalWeeks}`;
  }

  if (tw.hasWorkout) {
    return "● Up next · Today's training";
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
