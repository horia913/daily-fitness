import type { ReactNode } from "react";
import type { PrescribedWorkoutReference, WorkoutLogFullPayload } from "@/types/workoutLog";
import { WorkoutLogBlockCard } from "./WorkoutLogBlockCard";
import { WorkoutLogPRList } from "./WorkoutLogPRList";
import { WorkoutLogSessionHeader } from "./WorkoutLogSessionHeader";
import { WorkoutLogSessionMeta } from "./WorkoutLogSessionMeta";

type Props = {
  payload: WorkoutLogFullPayload;
  prescribedReference?: PrescribedWorkoutReference | null;
  derivedDurationMinutes?: number;
  headerActions?: ReactNode;
  onBack?: () => void;
};

export function WorkoutLogBody({ payload, prescribedReference, derivedDurationMinutes, headerActions, onBack }: Props) {
  return (
    <div className="space-y-4">
      <WorkoutLogSessionHeader
        session={payload.session}
        previousLog={payload.previousLog}
        onBack={onBack}
        actions={headerActions}
        derivedDurationMinutes={derivedDurationMinutes}
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
            />
          </div>
        ))}
      </div>
    </div>
  );
}
