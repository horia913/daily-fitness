import type { ReactNode } from "react";
import { Check, Clock, Dumbbell } from "lucide-react";
import type { WorkoutLogFullPayload, WorkoutLogSession } from "@/types/workoutLog";

type Props = {
  session: WorkoutLogSession;
  previousLog?: WorkoutLogFullPayload["previousLog"];
  onBack?: () => void;
  actions?: ReactNode;
  derivedDurationMinutes?: number;
  /** Coach detail: prescribed-set adherence aggregate (aligned with row coloring). */
  adherenceSummary?: { setsOnTarget: number; totalPrescribedSets: number } | null;
};

export function WorkoutLogSessionHeader({
  session,
  previousLog,
  onBack,
  actions,
  derivedDurationMinutes,
  adherenceSummary,
}: Props) {
  const completedDate = session.completedAt ? new Date(session.completedAt) : null;
  const duration = session.totalDurationMinutes && session.totalDurationMinutes > 0 ? session.totalDurationMinutes : derivedDurationMinutes ?? 0;
  const volumeDelta = previousLog ? session.totalWeightLifted - previousLog.totalWeightLifted : null;
  const setsDelta = previousLog ? session.totalSetsCompleted - previousLog.totalSetsCompleted : null;

  return (
    <div className="fc-card-shell p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {onBack ? (
            <button type="button" onClick={onBack} className="fc-btn fc-btn-secondary h-9 px-3 text-xs">Back</button>
          ) : null}
          <div className="fc-icon-tile fc-icon-workouts shrink-0"><Dumbbell className="w-5 h-5" /></div>
          <div>
            <h1 className="text-xl font-bold fc-text-primary">{session.workoutName}</h1>
            <p className="text-xs fc-text-dim mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{completedDate ? completedDate.toLocaleString() : "—"}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] border-[rgba(52,211,153,0.25)] text-[#34D399] bg-[rgba(52,211,153,0.12)]">
        <Check className="h-2.5 w-2.5" /> Completed
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div><dt className="text-[10px] uppercase fc-text-dim">Active time</dt><dd className="font-semibold">{duration ? `${duration} min` : "—"}</dd></div>
        <div><dt className="text-[10px] uppercase fc-text-dim">Sets</dt><dd className="font-semibold">{session.totalSetsCompleted}</dd></div>
        <div><dt className="text-[10px] uppercase fc-text-dim">Volume load</dt><dd className="font-semibold tabular-nums">{Math.round(session.totalWeightLifted).toLocaleString()} kg</dd></div>
        {previousLog ? (
          <div>
            <dt className="text-[10px] uppercase fc-text-dim">vs last</dt>
            <dd className="font-semibold tabular-nums">{volumeDelta != null ? `${volumeDelta > 0 ? "+" : ""}${Math.round(volumeDelta)}` : "—"} / {setsDelta != null ? `${setsDelta > 0 ? "+" : ""}${setsDelta}` : "—"}</dd>
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
