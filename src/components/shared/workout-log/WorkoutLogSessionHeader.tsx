import type { ReactNode } from "react";
import { Check, Clock, Dumbbell } from "lucide-react";
import type { WorkoutLogFullPayload, WorkoutLogSession } from "@/types/workoutLog";
import { cn } from "@/lib/utils";
import { isCoachStrengthTestSession } from "@/lib/coachStrengthTest";
import type { WorkoutLogViewVariant } from "./WorkoutLogSetRow";
import styles from "./workoutLogClientV6.module.css";

type Props = {
  session: WorkoutLogSession;
  previousLog?: WorkoutLogFullPayload["previousLog"];
  onBack?: () => void;
  actions?: ReactNode;
  derivedDurationMinutes?: number;
  /** Coach detail: prescribed-set adherence aggregate (aligned with row coloring). */
  adherenceSummary?: { setsOnTarget: number; totalPrescribedSets: number } | null;
  variant?: WorkoutLogViewVariant;
};

export function WorkoutLogSessionHeader({
  session,
  previousLog,
  onBack,
  actions,
  derivedDurationMinutes,
  adherenceSummary,
  variant = "default",
}: Props) {
  const completedDate = session.completedAt ? new Date(session.completedAt) : null;
  const duration =
    derivedDurationMinutes != null && derivedDurationMinutes > 0
      ? derivedDurationMinutes
      : session.totalDurationMinutes && session.totalDurationMinutes > 0
        ? session.totalDurationMinutes
        : 0;
  const volumeDelta = previousLog
    ? session.totalWeightLifted - previousLog.totalWeightLifted
    : null;
  const setsDelta = previousLog
    ? session.totalSetsCompleted - previousLog.totalSetsCompleted
    : null;
  const coachTest = isCoachStrengthTestSession({
    notes: session.notes,
    name: session.workoutName,
  });

  if (variant === "client") {
    return (
      <div className={cn(styles.shell, styles.shellPad, "space-y-3")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="fc-btn fc-btn-secondary h-9 shrink-0 px-3 text-xs"
              >
                Back
              </button>
            ) : null}
            <div className="fc-icon-tile fc-icon-workouts shrink-0">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className={styles.titleDisplay}>{session.workoutName}</h1>
              {coachTest ? (
                <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[color:var(--fc-accent)]">
                  Coach strength test
                </p>
              ) : null}
              <p
                className={`${styles.metaMono} mt-1 flex items-center gap-1 text-xs text-[color:var(--fc-text-dim)]`}
              >
                <Clock className="h-3 w-3" />
                {completedDate ? completedDate.toLocaleString() : "—"}
              </p>
            </div>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <div className={styles.completedChip}>
          <Check className="h-2.5 w-2.5" /> Completed
        </div>
        <div className={styles.statStrip}>
          <div className={styles.statCell}>
            <div className={styles.statCellV}>
              {duration ? (
                <>
                  {duration}
                  <span className={styles.statCellU}>m</span>
                </>
              ) : (
                "—"
              )}
            </div>
            <div className={styles.statCellK}>Duration</div>
          </div>
          <div className={styles.statCell}>
            <div className={styles.statCellV}>{session.totalSetsCompleted}</div>
            <div className={styles.statCellK}>Sets</div>
          </div>
          <div className={styles.statCell}>
            <div className={styles.statCellV}>
              {Math.round(session.totalWeightLifted).toLocaleString()}
              <span className={styles.statCellU}> kg</span>
            </div>
            <div className={styles.statCellK}>Volume</div>
          </div>
        </div>
        {adherenceSummary && adherenceSummary.totalPrescribedSets > 0 ? (
          <div className="rounded-lg border border-[color:var(--fc-hairline)] bg-[color:var(--fc-surface-tint)] px-3 py-2 text-sm">
            <span className="fc-text-dim">Sets on target </span>
            <span className={`${styles.metaMono} font-semibold fc-text-primary`}>
              {adherenceSummary.setsOnTarget}/{adherenceSummary.totalPrescribedSets}
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="fc-card-shell space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="fc-btn fc-btn-secondary h-9 px-3 text-xs"
            >
              Back
            </button>
          ) : null}
          <div className="fc-icon-tile fc-icon-workouts shrink-0">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold fc-text-primary">{session.workoutName}</h1>
            {coachTest ? (
              <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[color:var(--fc-accent)]">
                Coach strength test
              </p>
            ) : null}
            <p className="mt-1 flex items-center gap-1 text-xs fc-text-dim">
              <Clock className="h-3 w-3" />
              {completedDate ? completedDate.toLocaleString() : "—"}
            </p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="inline-flex items-center gap-1 rounded-[5px] border border-[rgba(52,211,153,0.25)] bg-[rgba(52,211,153,0.12)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#34D399]">
        <Check className="h-2.5 w-2.5" /> Completed
      </div>
      <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div>
          <dt className="text-[10px] uppercase fc-text-dim">Active time</dt>
          <dd className="font-semibold">{duration ? `${duration} min` : "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase fc-text-dim">Sets</dt>
          <dd className="font-semibold">{session.totalSetsCompleted}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase fc-text-dim">Volume load</dt>
          <dd className="font-semibold tabular-nums">
            {Math.round(session.totalWeightLifted).toLocaleString()} kg
          </dd>
        </div>
        {previousLog ? (
          <div>
            <dt className="text-[10px] uppercase fc-text-dim">vs last</dt>
            <dd className="font-semibold tabular-nums">
              {volumeDelta != null
                ? `${volumeDelta > 0 ? "+" : ""}${Math.round(volumeDelta)}`
                : "—"}{" "}
              /{" "}
              {setsDelta != null
                ? `${setsDelta > 0 ? "+" : ""}${setsDelta}`
                : "—"}
            </dd>
          </div>
        ) : null}
      </dl>
      {adherenceSummary && adherenceSummary.totalPrescribedSets > 0 ? (
        <div className="rounded-lg border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-border)]/10 px-3 py-2 text-sm">
          <span className="fc-text-dim">Sets on target </span>
          <span className="font-semibold tabular-nums fc-text-primary">
            {adherenceSummary.setsOnTarget}/{adherenceSummary.totalPrescribedSets}
          </span>
        </div>
      ) : null}
    </div>
  );
}
