/**
 * Milestone toasts: 24h dedupe via localStorage, trigger from dashboard (and optionally workout/check-in flows).
 */

const STORAGE_KEY = "progress_milestones_last_shown";
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function getStored(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStored(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    const prev = getStored();
    prev[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
  } catch {}
}

export function shouldShowMilestone(milestoneKey: string): boolean {
  const stored = getStored();
  const last = stored[milestoneKey];
  if (!last) return true;
  const t = new Date(last).getTime();
  return Date.now() - t > TWENTY_FOUR_HOURS_MS;
}

export function markMilestoneShown(milestoneKey: string) {
  setStored(milestoneKey, new Date().toISOString());
}

export interface MilestoneData {
  totalWorkouts: number;
  streak: number;
  lastMonthVolume: number;
  maxVolumeLast24Months: number;
  weightLostKg: number;
}

const WORKOUT_MILESTONES = [10, 25, 50, 75, 100, 150, 200];
const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 180, 365];
const WEIGHT_LOST_MILESTONES = [5, 10, 15, 20];

export function checkMilestoneToasts(
  data: MilestoneData,
  addToast: (opts: { title?: string; description?: string; duration?: number; variant?: string }) => void
) {
  const now = new Date();
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const volumeKey = `volume_month_${lastYear}-${String(lastMonth + 1).padStart(2, "0")}`;

  if (
    data.lastMonthVolume > 0 &&
    data.lastMonthVolume >= data.maxVolumeLast24Months &&
    shouldShowMilestone(volumeKey)
  ) {
    addToast({
      title: "Highest volume month ever!",
      description: `Last month was your highest volume month ever — ${Math.round(data.lastMonthVolume).toLocaleString()} kg!`,
      duration: 4000,
      variant: "success",
    });
    markMilestoneShown(volumeKey);
  }

  for (const n of [...WORKOUT_MILESTONES].reverse()) {
    if (data.totalWorkouts >= n) {
      const key = `workout_count_${n}`;
      if (shouldShowMilestone(key)) {
        addToast({
          title: `Workout #${n}!`,
          description: `That's workout #${n}!`,
          duration: 4000,
          variant: "success",
        });
        markMilestoneShown(key);
        break;
      }
    }
  }

  for (const n of [...STREAK_MILESTONES].reverse()) {
    if (data.streak >= n) {
      const key = `streak_${n}`;
      if (shouldShowMilestone(key)) {
        addToast({
          title: `${n}-day check-in streak!`,
          description: `You're on a ${n}-day check-in streak!`,
          duration: 4000,
          variant: "success",
        });
        markMilestoneShown(key);
        break;
      }
    }
  }

  for (const n of [...WEIGHT_LOST_MILESTONES].reverse()) {
    if (data.weightLostKg >= n) {
      const key = `weight_lost_${n}`;
      if (shouldShowMilestone(key)) {
        addToast({
          title: `${n} kg lost!`,
          description: `You've lost ${n} kg since you started!`,
          duration: 4000,
          variant: "success",
        });
        markMilestoneShown(key);
        break;
      }
    }
  }
}
