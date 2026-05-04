"use client";

import type { ReactNode } from "react";
import { ChevronDown, Medal } from "lucide-react";
import { SetTypeBadge } from "@/components/client/workout-execution/ui/SetTypeBadge";
import { SectionHeader } from "@/components/client-ui";
import type {
  ClientExerciseDisplay,
  StructuredBlock,
} from "./workoutDetailsTypes";
import styles from "./WorkoutDetailsPage.module.css";
import { cn } from "@/lib/utils";

export type StatRow = { label: string; value: string };

export type DropSubRow = { key: string; label: string; parts: ReactNode };

export interface WorkoutDetailsBlockSectionProps {
  blocks: StructuredBlock[];
  expandedIds: Set<string>;
  onToggleBlock: (blockId: string) => void;
  getBlockHeadTitle: (block: StructuredBlock) => string;
  formatBlockTypeLabel: (
    blockType: string | null,
    exerciseLetter: string | null,
  ) => string;
  needsBlockConfigPanel: (block: StructuredBlock) => boolean;
  getBlockParameters: (block: StructuredBlock) => StatRow[];
  getExercisePrescriptionRows: (
    block: StructuredBlock,
    exercise: ClientExerciseDisplay,
  ) => StatRow[];
  getDropSubrows: (exercise: ClientExerciseDisplay) => DropSubRow[];
  getPreviousBest: (
    exerciseName: string,
  ) => { weight: number; reps: number; record: string } | null;
}

function CoachNotesCallout({ text }: { text: string }) {
  return (
    <div className={styles.coachNotes}>
      <div className={styles.coachNotesLabel}>Coach notes</div>
      <p className={styles.coachNotesBody}>{text}</p>
    </div>
  );
}

function PrescriptionGrid({
  rows,
}: {
  rows: StatRow[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className={styles.prescriptionGrid}>
      {rows.map((row, i) => {
        const isTempo = row.label === "Tempo";
        const isEffort = row.label === "Effort";
        return (
          <div key={`${row.label}-${i}`} className={styles.prescriptionStat}>
            <span className={styles.prescriptionLab}>{row.label}</span>
            <span
              className={cn(
                styles.prescriptionVal,
                isEffort && styles.prescriptionValEffort,
                isTempo && styles.prescriptionValTempo,
              )}
            >
              {row.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function WorkoutDetailsBlockSection({
  blocks,
  expandedIds,
  onToggleBlock,
  getBlockHeadTitle,
  formatBlockTypeLabel,
  needsBlockConfigPanel,
  getBlockParameters,
  getExercisePrescriptionRows,
  getDropSubrows,
  getPreviousBest,
}: WorkoutDetailsBlockSectionProps) {
  return (
    <section style={{ marginBottom: "var(--fc-page-pb)" }}>
      <SectionHeader
        title="Workout Content"
        titleClassName="!tracking-[0.18em] !text-[9.5px]"
        className="!mb-3 px-0"
      />
      <div className={styles.blocksWrap}>
        {blocks.map((block, blockIndex) => {
          const isExpanded = expandedIds.has(block.id);
          const multi = needsBlockConfigPanel(block);
          const blockParams = getBlockParameters(block);
          const setType = block.blockType || "straight_set";

          return (
            <article key={block.id} className={styles.blockCard}>
              <button
                type="button"
                className={styles.blockHead}
                onClick={() => onToggleBlock(block.id)}
                aria-expanded={isExpanded}
              >
                <span
                  className={cn(
                    styles.numBadge,
                    isExpanded && styles.numBadgeExpanded,
                  )}
                >
                  {String(blockIndex + 1).padStart(2, "0")}
                </span>
                <span className={styles.blockHeadInfo}>
                  <span className={styles.badgeRow}>
                    <SetTypeBadge setType={setType} />
                  </span>
                  <p className={styles.blockExerciseTitle}>
                    {getBlockHeadTitle(block)}
                  </p>
                </span>
                <ChevronDown
                  className={cn(styles.chevron, isExpanded && styles.chevronExpanded)}
                  aria-hidden
                />
              </button>

              {isExpanded && (
                <div className={styles.blockBody}>
                  <div className={styles.blockBodyStack}>
                    {block.notes ? (
                      <CoachNotesCallout text={block.notes} />
                    ) : null}

                    {multi && blockParams.length > 0 ? (
                      <div className={styles.blockConfig}>
                        <div className={styles.blockConfigLabel}>
                          Exercise configuration
                        </div>
                        <PrescriptionGrid rows={blockParams} />
                      </div>
                    ) : null}

                    {block.exercises.map((exercise, exerciseIndex) => {
                      const prev = getPreviousBest(exercise.name);
                      const rows = getExercisePrescriptionRows(block, exercise);
                      const drops = getDropSubrows(exercise);

                      return (
                        <div
                          key={exercise.id}
                          className={styles.exerciseRow}
                        >
                          <div className={styles.exerciseHead}>
                            <span className={styles.exerciseIdx}>
                              {exercise.exerciseLetter ||
                                String(exerciseIndex + 1).padStart(2, "0")}
                            </span>
                            <span className={styles.exerciseName}>
                              {exercise.name}
                            </span>
                            {prev && prev.weight > 0 ? (
                              <span className={styles.prPill}>
                                <Medal className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                                PR {prev.weight} × {prev.reps}
                              </span>
                            ) : null}
                          </div>

                          {exercise.exerciseLetter &&
                          (block.blockType === "superset" ||
                            block.blockType === "giant_set") ? (
                            <div className="mb-1 inline-flex rounded-full border border-[color:var(--fc-glass-border)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--fc-text-dim)]">
                              {formatBlockTypeLabel(
                                block.blockType,
                                exercise.exerciseLetter,
                              )}
                            </div>
                          ) : null}

                          {exercise.notes ? (
                            <p className="text-xs fc-text-dim m-0 leading-relaxed">
                              {exercise.notes}
                            </p>
                          ) : null}

                          <PrescriptionGrid rows={rows} />

                          {drops.length > 0 ? (
                            <div className={styles.dropsList}>
                              {drops.map((d) => (
                                <div key={d.key} className={styles.dropRow}>
                                  <span className={styles.dropLab}>{d.label}</span>
                                  <div className={styles.dropVals}>{d.parts}</div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
