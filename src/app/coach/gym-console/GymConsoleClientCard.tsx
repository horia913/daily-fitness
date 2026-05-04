"use client";

import React, { useEffect, useState } from "react";
import {
  Dumbbell,
  CheckCircle,
  Loader2,
  Eye,
  SkipForward,
  Play,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientStatus } from "./gymConsoleTypes";
import {
  formatNameFirstLastInitial,
  formatShortRelative,
  isLiftingStalled,
  minutesSinceIso,
} from "./gymConsoleUtils";
import styles from "./gymConsole.module.css";

export type GymCardSection = "lifting" | "pending" | "done" | "noprog";

function idlePillLabel(lastSetIso: string | null | undefined, nowMs: number): string {
  const mins = minutesSinceIso(lastSetIso ?? null, nowMs);
  if (mins == null) return "Idle";
  if (mins < 1) return `Idle ${Math.max(1, Math.round(mins * 60))}s`;
  if (mins < 60) return `Idle ${Math.floor(mins)}m`;
  const h = Math.floor(mins / 60);
  return `Idle ${h}h+`;
}

export function GymConsoleClientCard({
  section,
  status,
  note,
  onNoteChange,
  onView,
  onSkipDay,
  onMarkComplete,
  onStartWorkout,
  onLogSet,
  onAssignProgram,
  skipLoading,
  markLoading,
  startLoading,
  now,
}: {
  section: GymCardSection;
  status: ClientStatus;
  note: string;
  onNoteChange: (value: string) => void;
  onView: () => void;
  onSkipDay: () => void;
  onMarkComplete: () => void;
  onStartWorkout: () => void;
  onLogSet: () => void;
  /** No-program card: navigate to assign program */
  onAssignProgram?: () => void;
  skipLoading: boolean;
  markLoading: boolean;
  startLoading: boolean;
  /** Bump every ~30s so relative timers refresh */
  now: number;
}) {
  const [noteDraft, setNoteDraft] = useState(note);
  useEffect(() => {
    setNoteDraft(note);
  }, [note]);

  const hasSession = status.status === "active_session" || status.status === "idle_session";
  const hasNextWorkout =
    status.nextWorkout && status.status !== "program_completed" && status.status !== "no_program";
  const canSkipDay = Boolean(
    hasNextWorkout && status.nextWorkout?.programAssignmentId && status.nextWorkout?.scheduleId
  );

  const stalled =
    section === "lifting" &&
    isLiftingStalled(
      status.status,
      status.activeSession?.lastSetLoggedAt,
      status.activeSession?.isIdle,
      now
    );

  const weekDay =
    status.currentWeek != null && status.currentDay != null
      ? `W${status.currentWeek} · D${status.currentDay}`
      : null;

  const workoutTitle = status.activeSession
    ? status.activeSession.templateName ?? status.nextWorkout?.workoutName ?? "—"
    : status.nextWorkout?.workoutName ??
      (status.status === "program_completed" ? "Program complete" : status.status === "no_program" ? "No program" : "—");

  const totalSetsTarget =
    status.nextWorkout?.exerciseCount && status.nextWorkout.exerciseCount > 0
      ? status.nextWorkout.exerciseCount
      : status.nextWorkout?.blockCount && status.nextWorkout.blockCount > 0
        ? status.nextWorkout.blockCount
        : "—";

  const isMinimal = section === "done" || section === "noprog";

  const stripeClass =
    stalled ? styles.cardStripeStalled
    : section === "lifting" ? styles.cardStripeLifting
    : section === "pending" ? styles.cardStripePending
    : section === "done" ? styles.cardStripeDone
    : styles.cardStripeNoprog;

  const overlayClass =
    stalled ? styles.cardOverlayStalled
    : section === "lifting" ? styles.cardOverlayLifting
    : "";

  const pill = (() => {
    if (section === "lifting") {
      const base =
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em]";
      if (stalled) {
        return (
          <span
            className={cn(
              base,
              "border-[color:var(--fc-state-stalled-border)] bg-[color:var(--fc-state-stalled-soft)] text-[color:var(--fc-state-stalled)]"
            )}
          >
            <span className={styles.pillDot} style={{ background: "var(--fc-state-stalled)" }} aria-hidden />
            {idlePillLabel(status.activeSession?.lastSetLoggedAt, now)}
          </span>
        );
      }
      return (
        <span
          className={cn(
            base,
            "border-[color:var(--fc-state-lifting-border)] bg-[color:var(--fc-state-lifting-soft)] text-[color:var(--fc-state-lifting)]"
          )}
        >
          <span className={styles.pillDot} style={{ background: "var(--fc-state-lifting)" }} aria-hidden />
          Lifting
        </span>
      );
    }
    if (section === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--fc-state-pending-border)] bg-[color:var(--fc-state-pending-soft)] px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[color:var(--fc-state-pending)]">
          Pending
        </span>
      );
    }
    if (section === "done") {
      return (
        <span className="inline-flex items-center rounded-full border border-[color:var(--fc-state-done-border)] bg-[color:var(--fc-state-done-soft)] px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[color:var(--fc-state-done)]">
          Done
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full border border-[color:var(--fc-state-noprog-border)] bg-[color:var(--fc-state-noprog-soft)] px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[color:var(--fc-state-noprog)]">
        No prog
      </span>
    );
  })();

  const showProgress = section === "lifting" && hasSession && status.activeSession;

  return (
    <div
      className={cn(styles.card, stripeClass, overlayClass, isMinimal && styles.cardMinimal)}
    >
      <div className={styles.cardInner}>
        <div
          className={cn(
            "mb-2.5 flex justify-between gap-2.5",
            isMinimal ? "mb-0 items-center" : "items-start"
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "font-bold leading-none text-[color:var(--fc-text-primary)]",
                  isMinimal ? "text-sm" : "text-base"
                )}
                style={{ fontFamily: "var(--f-headline, var(--font-sans, ui-sans-serif))" }}
              >
                {formatNameFirstLastInitial(status.clientName)}
              </p>
              {weekDay ? (
                <span
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--fc-text-dim)]"
                  style={{
                    fontFamily: "var(--font-mono, ui-monospace, monospace)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  {weekDay}
                </span>
              ) : null}
            </div>
            {section === "done" ? (
              <p className="text-[11.5px] text-[color:var(--fc-text-dim)]">
                Program complete
                {status.activeSession != null ? ` · ${status.activeSession.setsLogged} sets logged` : ""}
              </p>
            ) : section === "noprog" ? (
              <p className="text-[11.5px] text-[color:var(--fc-text-dim)]">No program · Free session</p>
            ) : (
              <p className="text-sm font-medium leading-snug text-[color:var(--fc-text-subtle)]">
                <span className="text-[color:var(--fc-text-subtle)]">{status.programName ?? "Program"}</span>
                <span className="text-[color:var(--fc-text-dim)]">
                  {weekDay ? ` — ${weekDay}` : ""}
                  {workoutTitle ? `: ${workoutTitle}` : ""}
                </span>
              </p>
            )}
          </div>
          <div className="shrink-0">{pill}</div>
        </div>

        {showProgress && status.activeSession ? (
          <div className={styles.progressMini}>
            <div className="min-w-0 shrink">
              <div className="flex items-baseline gap-0.5">
                <span
                  className="text-lg font-bold tabular-nums text-[color:var(--fc-text-primary)]"
                  style={{ fontFamily: "var(--f-display, var(--font-display, ui-sans-serif))" }}
                >
                  {status.activeSession.setsLogged}
                </span>
                <span
                  className="text-xs font-semibold text-[color:var(--fc-text-quaternary)]"
                  style={{ fontFamily: "var(--f-display, var(--font-display, ui-sans-serif))" }}
                >
                  /{totalSetsTarget}
                </span>
              </div>
              <div className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-[color:var(--fc-text-dim)]">
                Sets logged
              </div>
            </div>
            <div className={styles.progressDivider} aria-hidden />
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-lg font-bold text-[color:var(--fc-text-primary)]"
                style={{ fontFamily: "var(--f-display, var(--font-display, ui-sans-serif))" }}
              >
                {status.activeSession.currentExercise || "—"}
              </p>
              <div className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-[color:var(--fc-text-dim)]">
                Current
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  "text-xs font-semibold tabular-nums text-[color:var(--fc-text-primary)]",
                  stalled && "text-[color:var(--fc-state-stalled)]!"
                )}
                style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
              >
                {formatShortRelative(status.activeSession.lastSetLoggedAt, now)}
              </p>
              <div className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-[color:var(--fc-text-dim)]">
                Last set
              </div>
            </div>
          </div>
        ) : null}

        {section === "lifting" && hasSession && status.activeSession?.workoutLogId ? (
          <button type="button" className={styles.logSetLime} onClick={onLogSet}>
            <Dumbbell className="h-3.5 w-3.5" aria-hidden />
            Log Set
          </button>
        ) : null}

        {section === "lifting" && hasSession && !status.activeSession?.workoutLogId ? (
          <button
            type="button"
            className={styles.logSetLime}
            onClick={onMarkComplete}
            disabled={markLoading}
          >
            {markLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Mark Complete
          </button>
        ) : null}

        {section === "pending" && hasNextWorkout ? (
          <button
            type="button"
            className={styles.startCyan}
            onClick={onStartWorkout}
            disabled={startLoading}
          >
            {startLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
            )}
            Start Workout
          </button>
        ) : null}

        {!isMinimal ? (
          <input
            type="text"
            className={styles.noteInput}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => onNoteChange(noteDraft.trim())}
            placeholder="Add note..."
            aria-label="Coach note"
          />
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {isMinimal && section === "done" ? (
            <button type="button" className={styles.ghostSm} onClick={onView}>
              <Eye className="h-2.5 w-2.5" aria-hidden />
              View summary
            </button>
          ) : isMinimal && section === "noprog" ? (
            <>
              <button
                type="button"
                className={cn(styles.ghostSm, "border-[color:color-mix(in_srgb,var(--fc-accent-cyan)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--fc-accent-cyan)_10%,transparent)] text-[color:var(--fc-accent-cyan)]")}
                onClick={onAssignProgram ?? onView}
              >
                <Plus className="h-2.5 w-2.5" aria-hidden />
                Assign program
              </button>
              <button type="button" className={styles.ghostSm} onClick={onView}>
                <Eye className="h-2.5 w-2.5" aria-hidden />
                View
              </button>
            </>
          ) : (
            <>
              <button type="button" className={styles.ghostSm} onClick={onView}>
                <Eye className="h-2.5 w-2.5" aria-hidden />
                View
              </button>
              {canSkipDay ? (
                <button type="button" className={styles.ghostSm} onClick={onSkipDay} disabled={skipLoading}>
                  {skipLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <SkipForward className="h-2.5 w-2.5" />}
                  Skip Day
                </button>
              ) : null}
              {section === "lifting" && hasSession && status.activeSession?.workoutLogId ? (
                <button
                  type="button"
                  className={cn(styles.ghostSm, styles.ghostLime)}
                  onClick={onMarkComplete}
                  disabled={markLoading}
                >
                  {markLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <CheckCircle className="h-2.5 w-2.5" />}
                  Complete
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
