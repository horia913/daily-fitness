"use client";

import { GymConsolePhaseBar } from "@/components/coach/gym-console-v2/GymConsolePhaseBar";
import { clientPhaseChipLabel } from "@/lib/clientInstancePhaseContext";
import type { CompletionMath } from "@/lib/progression/weekWindows";
import type { PhaseSection } from "./programRoadmapShared";
import styles from "./ProgramRoadmapSummary.module.css";

export type ProgramRoadmapSummaryProps = {
  programName: string;
  weekCount: number;
  workoutsPerWeek: number;
  totalWorkouts: number;
  completion: CompletionMath;
  missedCount: number;
  phaseSections: PhaseSection[];
  currentWeekNumber: number | null;
  onSelectPhase: (phaseId: string) => void;
};

export function ProgramRoadmapSummary({
  programName,
  weekCount,
  workoutsPerWeek,
  totalWorkouts,
  completion,
  missedCount,
  phaseSections,
  currentWeekNumber,
  onSelectPhase,
}: ProgramRoadmapSummaryProps) {
  const { inScopeTotal, inScopeDone, completionPct } = completion;
  const donePct =
    inScopeTotal > 0 ? Math.round((inScopeDone / inScopeTotal) * 100) : 0;
  const missedPct =
    inScopeTotal > 0 ? Math.round((missedCount / inScopeTotal) * 100) : 0;

  const ribbonBlocks = phaseSections
    .filter((s) => s.phase != null)
    .map((s) => ({
      id: s.phase!.id,
      name: s.phase!.name,
      phase_label: s.phase!.phase_label,
      duration_weeks: s.phase!.duration_weeks,
      block_order: s.phase!.phase_order,
    }));

  const currentPhase =
    currentWeekNumber != null
      ? phaseSections.find(
          (s) =>
            currentWeekNumber >= s.startWeek &&
            currentWeekNumber <= s.endWeek,
        )
      : null;
  const activeBlockId =
    currentPhase?.phase?.id ??
    (ribbonBlocks[0]?.id ?? null);

  const meta = `${weekCount} ${weekCount === 1 ? "week" : "weeks"} · ${workoutsPerWeek}/wk · ${totalWorkouts} workouts`;

  return (
    <section className={styles.card} aria-label="Program summary">
      <h1 className={styles.title}>{programName}</h1>
      <p className={styles.meta}>{meta}</p>

      <div className={styles.pctRow}>
        <span className={styles.pctNum}>{completionPct}%</span>
        <span className={styles.pctLbl}>complete</span>
      </div>

      <div
        className={styles.barTrack}
        role="img"
        aria-label={`${inScopeDone} of ${inScopeTotal} in-scope done, ${missedCount} missed`}
      >
        <span
          className={styles.barDone}
          style={{ width: `${Math.min(100, donePct)}%` }}
        />
        <span
          className={styles.barMissed}
          style={{ width: `${Math.min(100 - donePct, missedPct)}%` }}
        />
      </div>
      <div className={styles.barLabels}>
        <span>
          {inScopeDone}/{inScopeTotal} in-scope done
        </span>
        <span>{missedCount} missed</span>
      </div>

      {ribbonBlocks.length > 0 ? (
        <>
          <div className={styles.divider} />
          <p className={styles.eyebrow}>Periodization</p>
          {currentPhase?.phase ? (
            <p className={styles.hereLine}>
              You are here ·{" "}
              {clientPhaseChipLabel(currentPhase.phase) ??
                `Phase ${currentPhase.displayPhaseOrder}`}
            </p>
          ) : null}
          <GymConsolePhaseBar
            trainingBlocks={ribbonBlocks}
            activeBlockId={activeBlockId}
            onSelectBlock={onSelectPhase}
            className={styles.ribbon}
          />
        </>
      ) : null}
    </section>
  );
}
