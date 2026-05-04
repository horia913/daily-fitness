"use client";

import Link from "next/link";
import { ChevronRight, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientAvatar, type ClientAvatarSeverity } from "@/components/coach/dashboard/ClientAvatar";
import type { CoachClientVisualTier } from "./coachClientsUtils";
import styles from "./coachClients.module.css";

const tierRow: Record<CoachClientVisualTier, string> = {
  critical: styles.listRowCritical,
  warning: styles.listRowWarning,
  new: styles.listRowNew,
  good: styles.listRowGood,
};

function tagClass(tier: CoachClientVisualTier): string | undefined {
  if (tier === "critical") return styles.sevTagCritical;
  if (tier === "warning") return styles.sevTagWarning;
  if (tier === "new") return styles.sevTagNew;
  return undefined;
}

export function CoachClientListRow({
  href,
  name,
  initialLetter,
  avatarSev,
  tier,
  tagLabel,
  activityText,
  activityColor,
  checkinText,
  checkinColor,
  programName,
  weekShort,
  /** When both activity and check-in are empty, omit "Activity / Check-in" prefixes. */
  metaNeverOnly,
}: {
  href: string;
  name: string;
  initialLetter: string;
  avatarSev: ClientAvatarSeverity;
  tier: CoachClientVisualTier;
  tagLabel: string | null;
  activityText: string;
  activityColor: string;
  checkinText: string;
  checkinColor: string;
  programName: string | null;
  weekShort: string | null;
  metaNeverOnly: boolean;
}) {
  const hasProgram = Boolean(programName?.trim());
  return (
    <Link href={href} className={cn(styles.listRow, tierRow[tier])}>
      <ClientAvatar initial={initialLetter} severity={avatarSev} size={40} />
      <div className={styles.listInfo}>
        <div className={styles.listNameRow}>
          <span className={styles.listName}>{name}</span>
          {tagLabel ? <span className={cn(styles.sevTag, tagClass(tier))}>{tagLabel}</span> : null}
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
            style={{ color: hasProgram ? "var(--fc-accent-cyan)" : "var(--fc-text-quaternary)" }}
          />
          {hasProgram ? (
            <>
              <span className={styles.listProgramName}>{programName}</span>
              {weekShort ? <span className={styles.weekTag}>{weekShort}</span> : null}
            </>
          ) : (
            <span className={styles.listProgramName} style={{ color: "var(--fc-text-quaternary)" }}>
              No program assigned
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--fc-text-quaternary)]" aria-hidden />
    </Link>
  );
}
