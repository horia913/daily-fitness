import { useMemo } from "react";
import { ProgramEditSetTypePill } from "@/components/coach/programs/ProgramEditSetTypePill";
import type { AdherenceBlock, PerSetAdherenceBlock } from "@/lib/workoutLog/adherenceTypes";
import type {
  PrescribedBlockReference,
  PrescribedSetReference,
  PrescribedTimeBlockReference,
  WorkoutLogBlock,
} from "@/types/workoutLog";
import { WorkoutLogSetRow } from "./WorkoutLogSetRow";
import { WorkoutLogTimeBlockSummary } from "./WorkoutLogTimeBlockSummary";

type Props = {
  block: WorkoutLogBlock;
  prescribedReference?: PrescribedBlockReference | PrescribedTimeBlockReference | null;
  adherenceBlock?: AdherenceBlock | null;
};

const TIME_BLOCK_TYPES = new Set(["amrap", "emom", "tabata", "for_time"]);

function isPerSetPrescribedBlock(
  ref: PrescribedBlockReference | PrescribedTimeBlockReference | null | undefined
): ref is PrescribedBlockReference {
  return Boolean(
    ref &&
      "sets" in ref &&
      Array.isArray((ref as PrescribedBlockReference).sets) &&
      ((ref as PrescribedBlockReference).sets?.length ?? 0) > 0
  );
}

function hasComparablePrescription(ref: PrescribedBlockReference): boolean {
  if (ref.headerSummary?.trim()) return true;
  for (const s of ref.sets ?? []) {
    if (
      s.prescribedParts?.length ||
      s.prescribedReps != null ||
      s.prescribedWeightKg != null ||
      s.prescribedRir != null ||
      (s.prescribedLine != null && String(s.prescribedLine).trim() !== "")
    ) {
      return true;
    }
  }
  return false;
}

function mergePerSetWithAdherence(
  ref: PrescribedBlockReference,
  per: PerSetAdherenceBlock,
  rowCount: number
): PrescribedBlockReference {
  const baseSets = ref.sets ?? [];
  const sets: PrescribedSetReference[] = baseSets.map((s, i) => {
    if (i >= rowCount) return s;
    const o = per.setOutcomes[i];
    if (!o) return s;
    const outcome: PrescribedSetReference["outcome"] = o.applyRowColor
      ? o.row
      : "neutral";
    const next: PrescribedSetReference = { ...s, outcome };
    if (o.informationalRowBadge) {
      next.informationalRowBadge = o.informationalRowBadge;
    }
    return next;
  });
  return { ...ref, sets };
}

export function WorkoutLogBlockCard({ block, prescribedReference, adherenceBlock }: Props) {
  const title = block.exerciseNames.join(" + ").trim() || "Exercise";
  const isTimeFromType = TIME_BLOCK_TYPES.has(block.setType);
  const isTimeFromAdherence = adherenceBlock?.kind === "time_block";
  const showTimeLayout = isTimeFromAdherence || isTimeFromType;

  const blockPrescribed = prescribedReference as
    | PrescribedBlockReference
    | PrescribedTimeBlockReference
    | null;
  const headerSummary =
    blockPrescribed && "headerSummary" in blockPrescribed && blockPrescribed.headerSummary
      ? String(blockPrescribed.headerSummary).trim()
      : adherenceBlock?.headerSummary?.trim() ?? null;

  const blockRef = isPerSetPrescribedBlock(blockPrescribed) ? blockPrescribed : null;

  const mergedBlockRef = useMemo(() => {
    if (!blockRef || adherenceBlock?.kind !== "per_set") return blockRef;
    return mergePerSetWithAdherence(blockRef, adherenceBlock, block.sets.length);
  }, [blockRef, adherenceBlock, block.sets.length]);

  const effectiveRef = mergedBlockRef ?? blockRef;

  const showStrengthTwoColumn =
    Boolean(effectiveRef) && !showTimeLayout && hasComparablePrescription(effectiveRef!);

  return (
    <div className="fc-card-shell p-3 space-y-3">
      <div>
        <ProgramEditSetTypePill setType={block.setType} />
        <h4 className="text-base font-semibold fc-text-primary mt-2">{title}</h4>
        {headerSummary ? (
          <p className="text-sm fc-text-dim mt-1 truncate" title={headerSummary}>
            {headerSummary}
          </p>
        ) : null}
      </div>
      {showTimeLayout ? (
        <WorkoutLogTimeBlockSummary
          block={block}
          prescribed={
            blockPrescribed && "setType" in blockPrescribed && blockPrescribed.setType
              ? (blockPrescribed as PrescribedTimeBlockReference)
              : null
          }
        />
      ) : showStrengthTwoColumn ? (
        <div className="space-y-2">
          <div className="grid grid-cols-[2.25rem_1fr_1fr] gap-2 text-xs fc-text-dim px-2 font-medium">
            <span className="text-center">#</span>
            <span>Prescribed</span>
            <span className="text-right">Actual</span>
          </div>
          {block.sets.map((setLog, index) => (
            <WorkoutLogSetRow
              key={setLog.id}
              set={setLog}
              rowIndex={index}
              setType={block.setType}
              twoColumn
              prescribed={effectiveRef?.sets?.[index] ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {effectiveRef &&
          hasComparablePrescription(effectiveRef) &&
          (block.setType === "speed_work" || block.setType === "endurance") ? (
            <div className="grid grid-cols-[2.25rem_1fr_1fr] gap-2 text-xs fc-text-dim px-2 font-medium">
              <span className="text-center">#</span>
              <span>Prescribed</span>
              <span className="text-right">Actual</span>
            </div>
          ) : null}
          {block.sets.map((setLog, index) => (
            <WorkoutLogSetRow
              key={setLog.id}
              set={setLog}
              rowIndex={index}
              setType={block.setType}
              twoColumn={Boolean(
                effectiveRef &&
                  hasComparablePrescription(effectiveRef) &&
                  (block.setType === "speed_work" || block.setType === "endurance")
              )}
              prescribed={effectiveRef?.sets?.[index] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
