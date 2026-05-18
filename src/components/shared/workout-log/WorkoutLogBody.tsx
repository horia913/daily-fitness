import type { ReactNode } from "react";
import { useMemo } from "react";
import type { WorkoutAdherenceResult } from "@/lib/coachWorkoutAdherence";
import type { AdherenceBlock } from "@/lib/workoutLog/adherenceTypes";
import type { PrescribedWorkoutReference, WorkoutLogFullPayload } from "@/types/workoutLog";
import { WorkoutLogBlockCard } from "./WorkoutLogBlockCard";
import { WorkoutLogPRList } from "./WorkoutLogPRList";
import { WorkoutLogSessionHeader } from "./WorkoutLogSessionHeader";
import { WorkoutLogSessionMeta } from "./WorkoutLogSessionMeta";

type Props = {
  payload: WorkoutLogFullPayload;
  prescribedReference?: PrescribedWorkoutReference | null;
  adherence?: WorkoutAdherenceResult | null;
  derivedDurationMinutes?: number;
  headerActions?: ReactNode;
  onBack?: () => void;
};

export function WorkoutLogBody({
  payload,
  prescribedReference,
  adherence,
  derivedDurationMinutes,
  headerActions,
  onBack,
}: Props) {
  const adherenceByBlock = useMemo(() => {
    const m = new Map<string, AdherenceBlock>();
    if (!adherence?.blocks) return m;
    for (const b of adherence.blocks) {
      m.set(b.setEntryId, b);
    }
    return m;
  }, [adherence]);

  return (
    <div className="space-y-4">
      <WorkoutLogSessionHeader
        session={payload.session}
        previousLog={payload.previousLog}
        onBack={onBack}
        actions={headerActions}
        derivedDurationMinutes={derivedDurationMinutes}
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
      <WorkoutLogPRList records={payload.personalRecords} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-4">
        {payload.blocks.map((block) => (
          <div key={block.setEntryId} className="min-w-0">
            <WorkoutLogBlockCard
              block={block}
              prescribedReference={prescribedReference?.byBlockId?.[block.setEntryId] ?? null}
              adherenceBlock={adherenceByBlock.get(block.setEntryId) ?? null}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
