import type { LeaderboardEntry } from "@/lib/leaderboardService";
import type { TimeWindow } from "@/lib/leaderboardService";
import type { MetricType } from "@/components/client/progress/ClientLeaderboardPageBody";
import type { ChampionChip } from "@/components/client/progress/ClientLeaderboardPageBody";

/** Spec mock rows — game-style scores; converted to display scores per metric. */
const MOCK_ROWS = [
  { name: "Maria Ionescu", score: 9450, workouts: 48, streak: 23 },
  { name: "Alexandru Popa", score: 8920, workouts: 45, streak: 19 },
  { name: "Elena Dumitrescu", score: 8100, workouts: 42, streak: 15 },
  { name: "Andrei Stanescu", score: 7600, workouts: 38, streak: 14 },
  { name: "Diana Florescu", score: 7200, workouts: 36, streak: 11 },
  { name: "Mihai Radu", score: 6800, workouts: 34, streak: 10 },
  { name: "Roxana Micu", score: 6200, workouts: 32, streak: 12 },
  { name: "Catalin Nistor", score: 5900, workouts: 30, streak: 8 },
  { name: "Ioana Marinescu", score: 5400, workouts: 27, streak: 7 },
  { name: "Stefan Barbu", score: 4800, workouts: 24, streak: 5 },
  { name: "Ana Dragomir", score: 4200, workouts: 21, streak: 6 },
  { name: "Vlad Constantinescu", score: 3600, workouts: 18, streak: 4 },
  { name: "Adriana Lazar", score: 3100, workouts: 16, streak: 3 },
  { name: "Gabriel Matei", score: 2500, workouts: 13, streak: 2 },
  { name: "Cristina Moldovan", score: 1800, workouts: 9, streak: 1 },
] as const;

function windowMultiplier(w: TimeWindow): number {
  if (w === "this_week") return 0.94;
  if (w === "this_month") return 1;
  return 1.06;
}

function scoreForMetric(baseKg: number, metric: MetricType, rank: number): number {
  if (metric === "tonnage") {
    return Math.round(baseKg * 220 + rank * 800);
  }
  if (metric === "3rm") return Math.round(baseKg * 0.92 * 10) / 10;
  if (metric === "5rm") return Math.round(baseKg * 0.86 * 10) / 10;
  return Math.round(baseKg * 10) / 10;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Builds the same shape the real leaderboard API returns, for test UI only.
 */
export function buildMockLeaderboardEntries(
  timeWindow: TimeWindow,
  metricType: MetricType,
  selfClientId: string,
  sexFilter: "all" | "M" | "F"
): LeaderboardEntry[] {
  const mult = windowMultiplier(timeWindow);

  const rows = MOCK_ROWS.map((r, i) => {
    const adjusted = r.score * mult;
    const baseKg = adjusted / 100;
    const client_id =
      r.name === "Roxana Micu" ? selfClientId : `mock-${i + 1}-${slug(r.name)}`;
    const sex: "M" | "F" = i % 2 === 0 ? "F" : "M";
    return {
      raw: r,
      baseKg,
      client_id,
      sex,
    };
  }).filter((row) => sexFilter === "all" || row.sex === sexFilter);

  rows.sort((a, b) => b.baseKg - a.baseKg);

  const leaderboard_type =
    metricType === "tonnage"
      ? timeWindow === "this_week"
        ? "tonnage_week"
        : timeWindow === "this_month"
          ? "tonnage_month"
          : "tonnage_all_time"
      : `pr_${metricType}`;

  return rows.map((row, index) => {
    const rank = index + 1;
    const score = scoreForMetric(row.baseKg, metricType, rank);
    return {
      id: `test-lb-${row.client_id}-${timeWindow}-${metricType}`,
      client_id: row.client_id,
      leaderboard_type,
      exercise_id: null,
      rank,
      score,
      time_window: metricType === "tonnage" ? timeWindow : "all_time",
      display_name: row.raw.name,
      is_anonymous: false,
      last_updated: new Date().toISOString(),
    };
  });
}

export function mockLeaderboardChampions(): ChampionChip[] {
  return [
    { name: MOCK_ROWS[0].name, category: "Squat", score: "94.5 kg" },
    { name: MOCK_ROWS[1].name, category: "Bench Press", score: "87.2 kg" },
    { name: MOCK_ROWS[2].name, category: "Deadlift", score: "112.0 kg" },
  ];
}
