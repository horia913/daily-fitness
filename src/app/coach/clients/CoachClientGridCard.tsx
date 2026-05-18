"use client";

import Link from "next/link";
import { Dumbbell, Flame, CreditCard, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ClientAvatar,
  type ClientAvatarSeverity,
} from "@/components/coach/dashboard/ClientAvatar";
import {
  coachClientAvatarSeverity,
  coachClientListVisualTierFromTraining,
  type CoachClientVisualTier,
} from "./coachClientsUtils";
import { CoachClientListScoreChip } from "./CoachClientListScoreChip";
import { CoachClientTrainingStatusBadge } from "./CoachClientTrainingStatusBadge";
import { CoachClientProgramPauseMenu } from "./CoachClientProgramPauseMenu";
import type { Client } from "./coachClientsTypes";
import styles from "./coachClients.module.css";

const tierCard: Record<CoachClientVisualTier, string> = {
  critical: styles.gridCardCritical,
  warning: styles.gridCardWarning,
  new: styles.gridCardNew,
  good: styles.gridCardGood,
};

export function CoachClientGridCard({
  client,
  href,
  lastActivityLabel,
  lastActivityColor,
  lastCheckinLabel,
  lastCheckinColor,
  onPatch,
}: {
  client: Client;
  href: string;
  lastActivityLabel: string;
  lastActivityColor: string;
  lastCheckinLabel: string;
  lastCheckinColor: string;
  onPatch: (patch: Partial<Client>) => void;
}) {
  const tier = coachClientListVisualTierFromTraining(client.status, client.trainingStatus);
  const avatarSev: ClientAvatarSeverity = coachClientAvatarSeverity(tier);
  const paused = client.pauseStatus === "paused";

  const weekLabel =
    client.metrics.programCurrentWeek != null && client.metrics.programDurationWeeks != null
      ? `Week ${client.metrics.programCurrentWeek} of ${client.metrics.programDurationWeeks}`
      : null;
  const programChipLabel =
    client.metrics.activeProgramName != null
      ? weekLabel
        ? `${client.metrics.activeProgramName} · ${weekLabel}`
        : client.metrics.activeProgramName
      : null;

  const hasProgram = Boolean(programChipLabel?.trim());

  return (
    <div className={cn(styles.gridCardWrap, tierCard[tier])}>
      {paused ? (
        <div className={styles.listPausedStrip} role="status">
          <Pause className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
          Paused
        </div>
      ) : null}
      <div className={styles.gridCardInner}>
        <div className={styles.gridTopRow}>
          <Link href={href} className={styles.gridTopMain}>
            <ClientAvatar
              initial={client.name.charAt(0).toUpperCase()}
              severity={avatarSev}
              size={32}
            />
            <div className="min-w-0 flex-1">
              <div className={styles.gridName}>{client.name}</div>
              <div className={styles.gridEmail}>{client.email}</div>
            </div>
          </Link>
          <div className={styles.gridTopAside}>
            <CoachClientTrainingStatusBadge status={client.trainingStatus} align="end" />
            <div className={styles.gridAsideActions}>
              <CoachClientListScoreChip clientId={client.id} athleteScore={client.athleteScore} />
              <CoachClientProgramPauseMenu client={client} onPatch={onPatch} />
            </div>
          </div>
        </div>

        <Link href={href} className={styles.gridBodyLink}>
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
            {client.metrics.mealCompliance7dPct != null ? (
              <div className={styles.gridStatRow}>
                <span className={styles.gridStatLabel}>Meals 7d</span>
                <span className={styles.gridStatVal}>{client.metrics.mealCompliance7dPct}%</span>
              </div>
            ) : null}
            <div className={styles.gridStatRow}>
              <span className={styles.gridStatLabel}>Workouts wk</span>
              <span className={styles.gridStatVal}>{client.metrics.workoutsThisWeek}</span>
            </div>
            {client.metrics.checkinStreak > 0 ? (
              <div className={styles.gridStatRow}>
                <span className={styles.gridStatLabel}>Streak</span>
                <span className={styles.gridStatVal} style={{ color: "var(--fc-status-warning)" }}>
                  <Flame className="mr-0.5 inline h-2.5 w-2.5" aria-hidden />
                  {client.metrics.checkinStreak}
                </span>
              </div>
            ) : null}
            {client.metrics.subscriptionExpiringSoon ? (
              <div className={styles.gridStatRow}>
                <span className={styles.gridStatLabel}>Sub</span>
                <span className={styles.gridStatVal} style={{ color: "var(--fc-status-warning)" }}>
                  <CreditCard className="mr-0.5 inline h-2.5 w-2.5" aria-hidden />
                  Soon
                </span>
              </div>
            ) : null}
          </div>
        </Link>

        <Link href={href} className={styles.gridProgramChip}>
          <Dumbbell
            className="h-[9px] w-[9px] shrink-0"
            aria-hidden
            style={{
              color: hasProgram ? "var(--fc-text-dim)" : "var(--fc-text-quaternary)",
            }}
          />
          <span>{hasProgram ? programChipLabel : "No program"}</span>
        </Link>
      </div>
    </div>
  );
}
