"use client";

import { cn } from "@/lib/utils";
import type { ClientTrainingStatusKind } from "@/lib/coachClientListTrainingStatus";
import styles from "./coachClients.module.css";

export function CoachClientTrainingStatusBadge({
  status,
  align = "end",
}: {
  status: ClientTrainingStatusKind;
  align?: "start" | "end";
}) {
  if (status === "paused") return null;

  const cfg: Record<
    Exclude<ClientTrainingStatusKind, "paused">,
    { dot: string; label: string; labelClass: string }
  > = {
    on_track: {
      dot: styles.trainingDotOnTrack,
      label: "On track",
      labelClass: styles.trainingLabelOnTrack,
    },
    behind: {
      dot: styles.trainingDotBehind,
      label: "Behind",
      labelClass: styles.trainingLabelBehind,
    },
    missed_week: {
      dot: styles.trainingDotMissed,
      label: "Missed week",
      labelClass: styles.trainingLabelMissed,
    },
    no_program: {
      dot: styles.trainingDotMuted,
      label: "No program",
      labelClass: styles.trainingLabelMuted,
    },
  };

  const row = cfg[status];
  return (
    <div
      className={cn(
        styles.trainingStatusRow,
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      <span className={cn(styles.trainingDot, row.dot)} aria-hidden />
      <span className={cn(styles.trainingLabel, row.labelClass)}>{row.label}</span>
    </div>
  );
}
