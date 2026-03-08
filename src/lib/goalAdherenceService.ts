/**
 * Goal adherence calculation — single source for overall and per-pillar adherence.
 * Used by: goals hub, Fuel page, Train page, Check-ins page.
 */

export interface GoalForAdherence {
  id: string;
  status: string;
  progress_percentage?: number | null;
  pillar?: string | null;
}

export function calculateGoalAdherence(goals: GoalForAdherence[]): number {
  if (goals.length === 0) return 0;

  const activeGoals = goals.filter((g) => g.status === "active");
  if (activeGoals.length === 0) return 0;

  const totalProgress = activeGoals.reduce(
    (sum, g) => sum + (g.progress_percentage ?? 0),
    0
  );
  return Math.round(totalProgress / activeGoals.length);
}

export function calculatePillarAdherence(
  goals: GoalForAdherence[],
  pillar: string
): number {
  const pillarGoals = goals.filter((g) => (g.pillar ?? "") === pillar);
  return calculateGoalAdherence(pillarGoals);
}

export interface PillarStats {
  pillar: string;
  count: number;
  adherence: number;
}

export function getGoalStats(goals: GoalForAdherence[]): {
  total: number;
  active: number;
  completed: number;
  overallAdherence: number;
  byPillar: PillarStats[];
} {
  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");

  const pillars = ["training", "nutrition", "checkins", "lifestyle", "general"];
  const byPillar: PillarStats[] = pillars
    .map((p) => ({
      pillar: p,
      count: active.filter((g) => (g.pillar ?? "") === p).length,
      adherence: calculatePillarAdherence(active, p),
    }))
    .filter((p) => p.count > 0);

  return {
    total: goals.length,
    active: active.length,
    completed: completed.length,
    overallAdherence: calculateGoalAdherence(active),
    byPillar,
  };
}
