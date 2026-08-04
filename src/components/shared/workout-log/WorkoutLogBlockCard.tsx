import { useMemo } from "react";
import { ProgramEditSetTypePill } from "@/components/coach/programs/ProgramEditSetTypePill";
import {
  formatGroupedExerciseBadge,
  formatSoloGroupBadge,
} from "@/components/client/workout-execution/groupLetterBadges";
import { groupIndexToHue } from "@/components/client/workout-execution/live-card";
import type { AdherenceBlock, PerSetAdherenceBlock } from "@/lib/workoutLog/adherenceTypes";
import type {
  PrescribedBlockReference,
  PrescribedSetReference,
  PrescribedTimeBlockReference,
  WorkoutLogBlock,
} from "@/types/workoutLog";
import { cn } from "@/lib/utils";
import {
  CompressedSetList,
  buildLinesForRow,
  historySetFootnote,
} from "@/components/client-workout-complete/CompressedSetList";
import type { WorkoutSetLog } from "@/components/client-workout-complete/workoutSetLogTypes";
import { WorkoutLogSetRow, type WorkoutLogViewVariant } from "./WorkoutLogSetRow";
import { WorkoutLogTimeBlockSummary } from "./WorkoutLogTimeBlockSummary";
import styles from "./workoutLogClientV6.module.css";

type Props = {
  block: WorkoutLogBlock;
  prescribedReference?: PrescribedBlockReference | PrescribedTimeBlockReference | null;
  adherenceBlock?: AdherenceBlock | null;
  /** Client history skin (v6). Default preserves coach layout + set-type pills. */
  variant?: WorkoutLogViewVariant;
  /** Zero-based group index for letter badges (block order − 1). */
  groupIndex?: number;
};

const TIME_BLOCK_TYPES = new Set(["amrap", "emom", "tabata", "for_time"]);

const HUE_CLASS = {
  a: styles.hueA,
  b: styles.hueB,
  c: styles.hueC,
  d: styles.hueD,
} as const;

function isPerSetPrescribedBlock(
  ref: PrescribedBlockReference | PrescribedTimeBlockReference | null | undefined,
): ref is PrescribedBlockReference {
  return Boolean(
    ref &&
      "sets" in ref &&
      Array.isArray((ref as PrescribedBlockReference).sets) &&
      ((ref as PrescribedBlockReference).sets?.length ?? 0) > 0,
  );
}

function hasComparablePrescription(ref: PrescribedBlockReference): boolean {
  if (ref.headerSummary?.trim()) return true;
  for (const s of ref.sets ?? []) {
    if (
      s.prescribedParts?.length ||
      s.prescribedReps != null ||
      s.prescribedWeightKg != null ||
      s.prescribedRpe != null ||
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
  rowCount: number,
): PrescribedBlockReference {
  const baseSets = ref.sets ?? [];
  const sets: PrescribedSetReference[] = baseSets.map((s, i) => {
    if (i >= rowCount) return s;
    const o = per.setOutcomes[i];
    if (!o) return s;
    const outcome: PrescribedSetReference["outcome"] = o.applyRowColor ? o.row : "neutral";
    const next: PrescribedSetReference = { ...s, outcome };
    if (o.informationalRowBadge) {
      next.informationalRowBadge = o.informationalRowBadge;
    }
    return next;
  });
  return { ...ref, sets };
}

/** Technique as a mono note — never a set-type chip (matches program-details / complete). */
function techniqueNoteForBlock(block: WorkoutLogBlock): string | null {
  const t = block.setType;
  if (t === "drop_set") {
    const drops =
      block.sets.find((s) => Array.isArray(s.dropset_drops) && s.dropset_drops.length > 0)
        ?.dropset_drops?.length ?? 0;
    if (drops > 0) {
      return `↳ drop set · ${drops} ${drops === 1 ? "drop" : "drops"}`;
    }
    const hasDropFields = block.sets.some(
      (s) => s.dropset_final_weight != null && Number(s.dropset_final_weight) > 0,
    );
    return hasDropFields || t === "drop_set" ? "↳ drop set" : null;
  }
  if (t === "cluster_set") return "↳ cluster set";
  if (t === "rest_pause") return "↳ rest-pause";
  if (t === "pre_exhaustion") return "↳ pre-exhaust";
  return null;
}

export function WorkoutLogBlockCard({
  block,
  prescribedReference,
  adherenceBlock,
  variant = "default",
  groupIndex = 0,
}: Props) {
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

  const setRows = (
    twoColumn: boolean,
  ) =>
    block.sets.map((setLog, index) => (
      <WorkoutLogSetRow
        key={setLog.id}
        set={setLog}
        rowIndex={index}
        setType={block.setType}
        twoColumn={twoColumn}
        prescribed={effectiveRef?.sets?.[index] ?? null}
        variant={variant}
      />
    ));

  if (variant === "client") {
    const hue = groupIndexToHue(groupIndex);
    const tech = techniqueNoteForBlock(block);
    const names =
      block.exerciseNames.length > 0 ? block.exerciseNames : [title];
    const grouped = names.length > 1;
    const asWorkoutSets = block.sets as unknown as WorkoutSetLog[];

    return (
      <div className={cn(styles.shell, "space-y-3", HUE_CLASS[hue])}>
        <div className="space-y-2">
          {names.map((name, i) => {
            const exerciseId = block.exerciseIds[i] ?? block.exerciseIds[0] ?? null;
            const lines = exerciseId
              ? buildLinesForRow(
                  {
                    blockType: block.setType,
                    sets: asWorkoutSets,
                    exerciseId,
                  },
                  [],
                )
              : [];
            const foot = historySetFootnote(lines);
            return (
              <div key={`${block.setEntryId}-${i}`}>
                <div className={styles.exHead}>
                  <span className={styles.badge}>
                    {grouped
                      ? formatGroupedExerciseBadge(groupIndex, i + 1, i)
                      : formatSoloGroupBadge(groupIndex)}
                  </span>
                  <span className={styles.exName}>{name}</span>
                  <span className={styles.exMeta}>
                    {lines.length} {lines.length === 1 ? "set" : "sets"}
                  </span>
                </div>
                {i === 0 && tech ? <p className={styles.techNote}>{tech}</p> : null}
                {i === 0 && headerSummary ? (
                  <p className={styles.headerSummary} title={headerSummary}>
                    {headerSummary}
                  </p>
                ) : null}
                {showTimeLayout && i === 0 ? (
                  <WorkoutLogTimeBlockSummary
                    block={block}
                    prescribed={
                      blockPrescribed &&
                      "setType" in blockPrescribed &&
                      blockPrescribed.setType
                        ? (blockPrescribed as PrescribedTimeBlockReference)
                        : null
                    }
                  />
                ) : !showTimeLayout && exerciseId ? (
                  <CompressedSetList
                    lines={lines}
                    exerciseId={exerciseId}
                    prs={[]}
                    ratingTargetId={null}
                    onTapNa={() => {}}
                    onRate={() => {}}
                    ratingBusy={false}
                    footNotes={foot ? [foot] : []}
                    readOnly
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

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
          {setRows(true)}
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
          {setRows(
            Boolean(
              effectiveRef &&
                hasComparablePrescription(effectiveRef) &&
                (block.setType === "speed_work" || block.setType === "endurance"),
            ),
          )}
        </div>
      )}
    </div>
  );
}
