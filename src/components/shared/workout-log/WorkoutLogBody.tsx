import type { ReactNode } from "react";
import { useMemo } from "react";
import type { WorkoutAdherenceResult } from "@/lib/coachWorkoutAdherence";
import type { AdherenceBlock } from "@/lib/workoutLog/adherenceTypes";
import { resolveWorkoutDisplayDurationMinutes } from "@/lib/workoutLogDuration";
import type { PrescribedWorkoutReference, WorkoutLogFullPayload } from "@/types/workoutLog";
import { WorkoutLogBlockCard } from "./WorkoutLogBlockCard";
import { WorkoutLogPRList } from "./WorkoutLogPRList";
import { WorkoutLogSessionHeader } from "./WorkoutLogSessionHeader";
import { WorkoutLogSessionMeta } from "./WorkoutLogSessionMeta";
import type { WorkoutLogViewVariant } from "./WorkoutLogSetRow";

type Props = {
  payload: WorkoutLogFullPayload;
  prescribedReference?: PrescribedWorkoutReference | null;
  adherence?: WorkoutAdherenceResult | null;
  derivedDurationMinutes?: number;
  headerActions?: ReactNode;
  onBack?: () => void;
  /** Client history skin (v6). Coach callers omit / leave default. */
  variant?: WorkoutLogViewVariant;
};

export function WorkoutLogBody({
  payload,
  prescribedReference,
  adherence,
  derivedDurationMinutes,
  headerActions,
  onBack,
  variant = "default",
}: Props) {
  const adherenceByBlock = useMemo(() => {
    const m = new Map<string, AdherenceBlock>();
    if (!adherence?.blocks) return m;
    for (const b of adherence.blocks) {
      m.set(b.setEntryId, b);
    }
    return m;
  }, [adherence]);

  const resolvedDuration = useMemo(() => {
    if (derivedDurationMinutes != null && derivedDurationMinutes > 0) {
      return derivedDurationMinutes;
    }
    const setAts = payload.blocks.flatMap((b) =>
      b.sets.map((s) => s.completed_at),
    );
    return resolveWorkoutDisplayDurationMinutes({
      storedMinutes: payload.session.totalDurationMinutes,
      startedAt: payload.session.startedAt,
      completedAt: payload.session.completedAt,
      setCompletedAts: setAts,
    });
  }, [derivedDurationMinutes, payload]);

  return (
    <div className="space-y-4">
      <WorkoutLogSessionHeader
        session={payload.session}
        previousLog={payload.previousLog}
        onBack={onBack}
        actions={headerActions}
        derivedDurationMinutes={resolvedDuration ?? undefined}
        variant={variant}
        adherenceSummary={
          adherence && adherence.totalPrescribedSets > 0
            ? {
                setsOnTarget: adherence.setsOnTarget,
                totalPrescribedSets: adherence.totalPrescribedSets,
              }
            : null
        }
      />
      <WorkoutLogSessionMeta
        notes={payload.session.notes}
        overallDifficultyRating={payload.session.overallDifficultyRating}
        perceivedEffort={payload.session.perceivedEffort}
        energyLevel={payload.session.energyLevel}
        muscleFatigueLevel={payload.session.muscleFatigueLevel}
      />
      <WorkoutLogPRList records={payload.personalRecords} variant={variant} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-4">
        {payload.blocks.map((block, index) => (
          <div key={block.setEntryId} className="min-w-0">
            <WorkoutLogBlockCard
              block={block}
              prescribedReference={
                prescribedReference?.byBlockId?.[block.setEntryId] ?? null
              }
              adherenceBlock={adherenceByBlock.get(block.setEntryId) ?? null}
              variant={variant}
              groupIndex={Math.max(0, (block.blockOrder ?? index + 1) - 1)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
