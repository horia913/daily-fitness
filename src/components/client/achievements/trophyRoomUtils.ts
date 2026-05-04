import type { AchievementProgress, UserAchievement, AchievementTemplate } from "@/lib/achievementService";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type FilterStatus = "all" | "unlocked" | "progress" | "locked";

export type TrophyRow = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | null;
  rarity: Rarity;
  unlocked: boolean;
  progress?: number;
  requirement?: string;
  unlockedTiers?: string[];
  isMastered?: boolean;
  nearMiss?: boolean;
  lastUnlockedAt: Date | null;
  /** Raw progress from service — single source for ladders / bars */
  raw: AchievementProgress;
};

const RARITY_MAP: Record<string, Rarity> = {
  workout: "common",
  milestone: "common",
  consistency: "uncommon",
  activity: "uncommon",
  wellness: "uncommon",
  performance: "rare",
  challenges: "rare",
  volume: "epic",
  program: "epic",
  transformation: "legendary",
  strength: "legendary",
};

export function mapCategoryToRarity(category: string): Rarity {
  return RARITY_MAP[category] || "common";
}

export function isInvertedRankType(achievementType: string): boolean {
  return achievementType === "leaderboard_rank";
}

/** Progress toward the next tier threshold (0–100). Uses service `progress` for inverted rank types. */
export function progressPercentForBar(p: AchievementProgress): number {
  if (!p.template.is_tiered) {
    const th = p.template.single_threshold || 0;
    if (th <= 0) return 0;
    return Math.min(100, (p.currentValue / th) * 100);
  }
  if (p.status === "unlocked") return 100;
  if (isInvertedRankType(p.template.achievement_type)) {
    return Math.min(100, Math.max(0, p.progress));
  }
  if (!p.nextTier || p.nextTier.threshold <= 0) return 0;
  return Math.min(100, (p.currentValue / p.nextTier.threshold) * 100);
}

export function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const TIER_ORDER = ["bronze", "silver", "gold", "platinum", "mastered"] as const;
export type LadderStage = (typeof TIER_ORDER)[number];

export function tierScoreValue(t: LadderStage | string): number {
  const i = TIER_ORDER.indexOf(t as LadderStage);
  return i >= 0 ? i + 1 : 0;
}

/** Highest tier “score” for comparing achievements (for celebration hero). */
export function highestTierScore(p: AchievementProgress): number {
  if (!p.template.is_tiered) {
    if (p.status === "unlocked" || p.unlockedTiers.includes("single")) return 1;
    return 0;
  }
  if (p.status === "unlocked") return 5;
  let max = 0;
  for (const u of p.unlockedTiers) {
    const s = tierScoreValue(u);
    if (s > max) max = s;
  }
  return max;
}

export function buildLastUnlockByTemplate(unlocked: UserAchievement[]): Map<string, Date> {
  const m = new Map<string, Date>();
  for (const ua of unlocked) {
    const d = new Date(ua.achieved_date);
    const prev = m.get(ua.achievement_template_id);
    if (!prev || d > prev) m.set(ua.achievement_template_id, d);
  }
  return m;
}

export function mapProgressToTrophyRow(
  p: AchievementProgress,
  lastByTemplate: Map<string, Date>,
): TrophyRow {
  const { template, currentValue, progress: progressPercent, unlockedTiers, status, nextTier } = p;
  const rarity = mapCategoryToRarity(template.category);
  const icon = template.icon || "🏅";
  const isTiered = template.is_tiered;
  const isFullUnlocked = status === "unlocked" || (!isTiered && unlockedTiers.includes("single"));
  const isUnlocked = isFullUnlocked || status === "partially_unlocked";
  const isMastered = status === "unlocked" && isTiered;

  const description = template.description || "";

  let requirement: string | undefined;
  if (isTiered) {
    if (nextTier) {
      requirement = `${currentValue}/${nextTier.threshold} for ${nextTier.label}`;
    } else if (isMastered) {
      requirement = "All tiers complete!";
    } else {
      const tiers = [
        template.tier_bronze_threshold,
        template.tier_silver_threshold,
        template.tier_gold_threshold,
        template.tier_platinum_threshold,
      ].filter((x) => x != null) as number[];
      requirement = `${currentValue}/${tiers[tiers.length - 1] ?? 0}`;
    }
  } else {
    requirement = `${currentValue}/${template.single_threshold || 0}`;
  }

  let nearMiss = false;
  if (nextTier && nextTier.threshold > 0) {
    const ratio = currentValue / nextTier.threshold;
    nearMiss = ratio >= 0.8 && ratio < 1;
  }

  const resolvedTier: TrophyRow["tier"] = isTiered
    ? unlockedTiers.includes("platinum")
      ? "platinum"
      : unlockedTiers.includes("gold")
        ? "gold"
        : unlockedTiers.includes("silver")
          ? "silver"
          : unlockedTiers.includes("bronze")
            ? "bronze"
            : null
    : null;

  const lastUnlockedAt = lastByTemplate.get(template.id) ?? null;

  return {
    id: template.id,
    name: template.name,
    description,
    icon,
    tier: resolvedTier,
    rarity,
    unlocked: isUnlocked,
    progress: status === "locked" ? undefined : progressPercent,
    requirement,
    unlockedTiers: isTiered ? unlockedTiers : undefined,
    isMastered,
    nearMiss,
    lastUnlockedAt,
    raw: p,
  };
}

export function isFullyUnlocked(row: TrophyRow): boolean {
  const s = row.raw.status;
  if (!row.raw.template.is_tiered) return s === "unlocked";
  return s === "unlocked";
}

export function isInProgressBucket(row: TrophyRow): boolean {
  const s = row.raw.status;
  return s === "in_progress" || s === "partially_unlocked";
}

export function isLockedBucket(row: TrophyRow): boolean {
  return row.raw.status === "locked";
}

export function collectionCounts(rows: TrophyRow[]): {
  total: number;
  unlocked: number;
  inProgress: number;
  locked: number;
} {
  let unlocked = 0;
  let inProgress = 0;
  let locked = 0;
  for (const r of rows) {
    if (isFullyUnlocked(r)) unlocked++;
    else if (isInProgressBucket(r)) inProgress++;
    else locked++;
  }
  return { total: rows.length, unlocked, inProgress, locked };
}

/** Recently unlocked: fully unlocked achievements, most recent first */
export function sectionRecentlyUnlocked(rows: TrophyRow[]): TrophyRow[] {
  const list = rows.filter(isFullyUnlocked);
  return list.sort((a, b) => {
    const da = a.lastUnlockedAt?.getTime() ?? 0;
    const db = b.lastUnlockedAt?.getTime() ?? 0;
    if (db !== da) return db - da;
    return a.name.localeCompare(b.name);
  });
}

export function sectionAlmostThere(rows: TrophyRow[]): TrophyRow[] {
  const list = rows.filter((r) => {
    if (!isInProgressBucket(r)) return false;
    return progressPercentForBar(r.raw) >= 50;
  });
  return list.sort((a, b) => progressPercentForBar(b.raw) - progressPercentForBar(a.raw));
}

export function sectionInProgressLow(rows: TrophyRow[]): TrophyRow[] {
  const list = rows.filter((r) => {
    if (!isInProgressBucket(r)) return false;
    return progressPercentForBar(r.raw) < 50;
  });
  return list.sort((a, b) => progressPercentForBar(b.raw) - progressPercentForBar(a.raw));
}

export function sectionLocked(rows: TrophyRow[]): TrophyRow[] {
  return rows.filter(isLockedBucket).sort((a, b) => a.name.localeCompare(b.name));
}

export function unitLabelForTemplate(template: AchievementTemplate): string {
  const t = template.achievement_type;
  switch (t) {
    case "workout_count":
      return "workouts";
    case "program_completion":
      return "programs";
    case "streak_weeks":
    case "streak":
      return "weeks";
    case "pr_count":
    case "personal_record":
      return "PRs";
    case "total_volume":
    case "volume":
      return "kg";
    case "leaderboard_rank":
      return "rank";
    case "challenges_completed":
    case "challenge_completed":
      return "challenges";
    case "challenges_won":
    case "challenge_won":
      return "wins";
    case "challenges_top3":
    case "challenge_top3":
      return "podiums";
    case "checkin_streak":
      return "days";
    case "weight_goal":
      return "kg lost";
    default:
      return "";
  }
}

export type CelebrationPick =
  | { mode: "recent"; row: TrophyRow; unlockDate: Date }
  | { mode: "highest"; row: TrophyRow }
  | { mode: "almost"; row: TrophyRow }
  | null;

export function pickCelebrationHero(
  rows: TrophyRow[],
  unlockedRows: UserAchievement[],
): CelebrationPick {
  if (rows.length === 0) return null;

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  let bestRecent: { row: TrophyRow; date: Date; t: number } | null = null;
  for (const ua of unlockedRows) {
    const d = new Date(ua.achieved_date);
    const t = d.getTime();
    if (now - t > thirtyDays) continue;
    const row = rows.find((r) => r.id === ua.achievement_template_id);
    if (!row) continue;
    if (!bestRecent || t > bestRecent.t) bestRecent = { row, date: d, t };
  }
  if (bestRecent) return { mode: "recent", row: bestRecent.row, unlockDate: bestRecent.date };

  const hasAnyProgress = rows.filter(
    (r) => r.lastUnlockedAt != null || isInProgressBucket(r) || isFullyUnlocked(r),
  );
  if (hasAnyProgress.length > 0) {
    let best = hasAnyProgress[0]!;
    let bestScore = highestTierScore(best.raw);
    for (const r of hasAnyProgress) {
      const sc = highestTierScore(r.raw);
      if (sc > bestScore || (sc === bestScore && r.name.localeCompare(best.name) < 0)) {
        best = r;
        bestScore = sc;
      }
    }
    if (bestScore > 0) return { mode: "highest", row: best };
  }

  const inProg = rows.filter(isInProgressBucket);
  if (inProg.length > 0) {
    let best = inProg[0]!;
    let pct = progressPercentForBar(best.raw);
    for (const r of inProg) {
      const p = progressPercentForBar(r.raw);
      if (p > pct || (p === pct && r.name.localeCompare(best.name) < 0)) {
        best = r;
        pct = p;
      }
    }
    return { mode: "almost", row: best };
  }

  const lockedOnly = rows.filter(isLockedBucket).sort((a, b) => a.name.localeCompare(b.name));
  if (lockedOnly.length > 0) return { mode: "almost", row: lockedOnly[0]! };

  return null;
}

/** Icon tile gradient tier for non-locked achievements */
export function iconGradientTier(row: TrophyRow): "mastered" | "platinum" | "gold" | "silver" | "bronze" {
  const p = row.raw;
  if (!p.template.is_tiered) return "mastered";
  if (p.status === "unlocked") return "mastered";
  if (p.unlockedTiers.includes("platinum")) return "platinum";
  if (p.unlockedTiers.includes("gold")) return "gold";
  if (p.unlockedTiers.includes("silver")) return "silver";
  if (p.unlockedTiers.includes("bronze")) return "bronze";
  return "bronze";
}

export function filterRowsForSegment(rows: TrophyRow[], filter: FilterStatus): TrophyRow[] {
  if (filter === "all") return rows;
  if (filter === "unlocked") return rows.filter(isFullyUnlocked);
  if (filter === "progress") return rows.filter(isInProgressBucket);
  return rows.filter(isLockedBucket);
}
