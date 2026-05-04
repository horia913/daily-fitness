"use client";

import Link from "next/link";
import { Dumbbell, Flame, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientAvatar, type ClientAvatarSeverity } from "@/components/coach/dashboard/ClientAvatar";
import type { CoachClientVisualTier } from "./coachClientsUtils";
import styles from "./coachClients.module.css";

const tierCard: Record<CoachClientVisualTier, string> = {
  critical: styles.gridCardCritical,
  warning: styles.gridCardWarning,
  new: styles.gridCardNew,
  good: styles.gridCardGood,
};

function gridTagWrap(tier: CoachClientVisualTier): string {
  if (tier === "critical") return styles.sevTagCritical;
  if (tier === "warning") return styles.sevTagWarning;
  if (tier === "new") return styles.sevTagNew;
  return styles.sevTagWarning;
}

export function CoachClientGridCard({
  href,
  name,
  email,
  initialLetter,
  avatarSev,
  tier,
  tagLabel,
  lastActivityLabel,
  lastActivityColor,
  lastCheckinLabel,
  lastCheckinColor,
  programName,
  mealPct,
  workoutsWeek,
  checkinStreak,
  subscriptionExpiringSoon,
  programChipLabel,
}: {
  href: string;
  name: string;
  email: string;
  initialLetter: string;
  avatarSev: ClientAvatarSeverity;
  tier: CoachClientVisualTier;
  tagLabel: string | null;
  lastActivityLabel: string;
  lastActivityColor: string;
  lastCheckinLabel: string;
  lastCheckinColor: string;
  programName: string | null;
  mealPct: number | null;
  workoutsWeek: number;
  checkinStreak: number;
  subscriptionExpiringSoon: boolean;
  programChipLabel: string | null;
}) {
  const hasProgram = Boolean(programChipLabel?.trim());
  return (
    <Link href={href} className={cn(styles.gridCard, tierCard[tier])}>
      {tagLabel ? (
        <span className={cn(styles.gridSevPill, gridTagWrap(tier))}>{tagLabel}</span>
      ) : null}
      <div className={styles.gridHead}>
        <ClientAvatar initial={initialLetter} severity={avatarSev} size={32} />
        <div className="min-w-0 flex-1">
          <div className={styles.gridName}>{name}</div>
          <div className={styles.gridEmail}>{email}</div>
        </div>
      </div>
      <div className={styles.gridBody}>
        <div className={styles.gridStatRow}>
          <span className={styles.gridStatLabel}>Last activity</span>
          <span className={styles.gridStatVal} style={{ color: lastActivityColor }}>
            {lastActivityLabel}
          </span>
        </div>
        <div className={styles.gridStatRow}>
          <span className={styles.gridStatLabel}>Last check-in</span>
          <span className={styles.gridStatVal} style={{ color: lastCheckinColor }}>
            {lastCheckinLabel}
          </span>
        </div>
        {mealPct != null ? (
          <div className={styles.gridStatRow}>
            <span className={styles.gridStatLabel}>Meals 7d</span>
            <span className={styles.gridStatVal}>{mealPct}%</span>
          </div>
        ) : null}
        <div className={styles.gridStatRow}>
          <span className={styles.gridStatLabel}>Workouts wk</span>
          <span className={styles.gridStatVal}>{workoutsWeek}</span>
        </div>
        {checkinStreak > 0 ? (
          <div className={styles.gridStatRow}>
            <span className={styles.gridStatLabel}>Streak</span>
            <span className={styles.gridStatVal} style={{ color: "var(--fc-status-warning)" }}>
              <Flame className="mr-0.5 inline h-2.5 w-2.5" aria-hidden />
              {checkinStreak}
            </span>
          </div>
        ) : null}
        {subscriptionExpiringSoon ? (
          <div className={styles.gridStatRow}>
            <span className={styles.gridStatLabel}>Sub</span>
            <span className={styles.gridStatVal} style={{ color: "var(--fc-status-warning)" }}>
              <CreditCard className="mr-0.5 inline h-2.5 w-2.5" aria-hidden />
              Soon
            </span>
          </div>
        ) : null}
      </div>
      <div className={styles.gridProgramChip}>
        <Dumbbell
          className="h-[9px] w-[9px] shrink-0"
          aria-hidden
          style={{ color: hasProgram ? "var(--fc-text-dim)" : "var(--fc-text-quaternary)" }}
        />
        <span>{hasProgram ? programChipLabel : "No program"}</span>
      </div>
    </Link>
  );
}
