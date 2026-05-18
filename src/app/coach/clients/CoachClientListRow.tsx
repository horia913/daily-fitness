"use client";

import Link from "next/link";
import { ChevronRight, Dumbbell, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ClientAvatar,
  type ClientAvatarSeverity,
} from "@/components/coach/dashboard/ClientAvatar";
import type { CoachClientVisualTier } from "./coachClientsUtils";
import { CoachClientListScoreChip } from "./CoachClientListScoreChip";
import { CoachClientTrainingStatusBadge } from "./CoachClientTrainingStatusBadge";
import { CoachClientProgramPauseMenu } from "./CoachClientProgramPauseMenu";
import type { Client } from "./coachClientsTypes";
import styles from "./coachClients.module.css";

const tierWrapMod: Record<CoachClientVisualTier, string> = {
  critical: styles.listRowCritical,
  warning: styles.listRowWarning,
  new: styles.listRowNew,
  good: styles.listRowGood,
};

export function CoachClientListRow({
  client,
  href,
  tier,
  avatarSev,
  activityText,
  activityColor,
  checkinText,
  checkinColor,
  weekShort,
  metaNeverOnly,
  onPatch,
}: {
  client: Client;
  href: string;
  tier: CoachClientVisualTier;
  avatarSev: ClientAvatarSeverity;
  activityText: string;
  activityColor: string;
  checkinText: string;
  checkinColor: string;
  weekShort: string | null;
  metaNeverOnly: boolean;
  onPatch: (patch: Partial<Client>) => void;
}) {
  const programName = client.metrics.activeProgramName;
  const hasProgram = Boolean(programName?.trim());
  const paused = client.pauseStatus === "paused";

  return (
    <div className={cn(styles.listRowWrap, tierWrapMod[tier])}>
      {paused ? (
        <div className={styles.listPausedStrip} role="status">
          <Pause className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
          Paused
        </div>
      ) : null}
      <div className={styles.listRowInner}>
        <Link href={href} className={styles.listRowMain}>
          <ClientAvatar
            initial={client.name.charAt(0).toUpperCase()}
            severity={avatarSev}
            size={40}
          />
          <div className={styles.listInfo}>
            <div className={styles.listNameRow}>
              <span className={styles.listName}>{client.name}</span>
            </div>
            <div className={styles.listMeta}>
              {metaNeverOnly ? (
                <>
                  <span style={{ color: activityColor }}>{activityText}</span>
                  <span className={styles.metaSep}>·</span>
                  <span style={{ color: checkinColor }}>{checkinText}</span>
                </>
              ) : (
                <>
                  <span style={{ color: activityColor }}>Activity {activityText}</span>
                  <span className={styles.metaSep}>·</span>
                  <span style={{ color: checkinColor }}>Check-in {checkinText}</span>
                </>
              )}
            </div>
            <div className={styles.listProgram}>
              <Dumbbell
                className={cn("h-2.5 w-2.5 shrink-0", !hasProgram && "opacity-45")}
                aria-hidden
                style={{
                  color: hasProgram ? "var(--fc-accent-cyan)" : "var(--fc-text-quaternary)",
                }}
              />
              {hasProgram ? (
                <>
                  <span className={styles.listProgramName}>{programName}</span>
                  {weekShort ? <span className={styles.weekTag}>{weekShort}</span> : null}
                </>
              ) : (
                <span
                  className={styles.listProgramName}
                  style={{ color: "var(--fc-text-quaternary)" }}
                >
                  No program assigned
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className={styles.listRowTrail}>
          <CoachClientTrainingStatusBadge status={client.trainingStatus} align="end" />
          <div className={styles.listRowTrailActions}>
            <CoachClientListScoreChip clientId={client.id} athleteScore={client.athleteScore} />
            <CoachClientProgramPauseMenu client={client} onPatch={onPatch} />
          </div>
        </div>

        <Link href={href} className={styles.listRowChevronLink} aria-label={`Open ${client.name}`}>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
