"use client";

import type { CSSProperties } from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ribbonBlockColor } from "@/lib/programs/periodizationRibbonColors";
import type { WorkoutSetEntry } from "@/types/workoutSetEntries";
import {
  isFoundationStartable,
  resolveDayFoundationStatus,
  type DaySlot,
  type FoundationProgression,
  type PhaseSection,
  type WeekSection,
} from "./programRoadmapShared";
import type { ProgramWeekWindow, WorkoutStatus } from "@/lib/progression/weekWindows";
import styles from "./ProgramWeekRoadmap.module.css";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const GROUP_HUES = [
  "var(--fc-group-a)",
  "var(--fc-group-c)",
  "var(--fc-group-d)",
  "var(--fc-group-b)",
];

type V6ExerciseRow = {
  key: string;
  badge: string;
  hue: string;
  name: string;
  meta: string;
  rx: string;
  oneRm: string | null;
  tech: string | null;
  notes: string | null;
};

/** Map slots into Mon..Sun columns by program_day (1..7). */
function slotsByProgramDay(days: DaySlot[]): (DaySlot | null)[] {
  const cols: (DaySlot | null)[] = [null, null, null, null, null, null, null];
  for (const d of days) {
    const col = d.dayNumber;
    if (col >= 1 && col <= 7) cols[col - 1] = d;
  }
  return cols;
}

function phaseColorForWeek(
  weekNumber: number,
  phaseSections: PhaseSection[],
): string | null {
  const withPhase = phaseSections.filter((s) => s.phase != null);
  if (withPhase.length === 0) return null;
  const sec = withPhase.find(
    (s) => weekNumber >= s.startWeek && weekNumber <= s.endWeek,
  );
  if (!sec) return null;
  const blockIndex = withPhase.findIndex((s) => s === sec);
  if (blockIndex < 0) return null;
  return ribbonBlockColor(blockIndex, withPhase.length);
}

function formatPrescriptionBadge(block: WorkoutSetEntry, ex: Record<string, unknown>): string {
  const blockType = (block.set_type || "").toLowerCase();
  if (["straight_set", "superset", "giant_set", "pre_exhaustion"].includes(blockType)) {
    const sets = (ex.sets as number | undefined) ?? block.total_sets;
    const reps = (ex.reps as string | number | undefined) ?? block.reps_per_set ?? "";
    if (sets != null && reps) return `${sets} × ${reps}`;
    if (reps) return String(reps);
  } else if (blockType === "drop_set") {
    const sets = (ex.sets as number | undefined) ?? block.total_sets;
    return sets != null ? `${sets} drops` : "Drop set";
  } else if (blockType === "cluster_set") {
    return "Cluster";
  } else if (blockType === "rest_pause") {
    return "Rest-pause";
  } else if (blockType === "amrap") {
    return "AMRAP";
  } else if (blockType === "emom") {
    return "EMOM";
  } else if (blockType === "for_time") {
    return "For time";
  } else if (blockType === "tabata") {
    return "Tabata";
  } else if (blockType === "speed_work") {
    return "Speed work";
  } else if (blockType === "endurance") {
    return "Endurance";
  } else {
    const sets = (ex.sets as number | undefined) ?? block.total_sets;
    const reps = (ex.reps as string | number | undefined) ?? block.reps_per_set ?? "";
    if (sets != null && reps) return `${sets} × ${reps}`;
    if (reps) return String(reps);
  }
  return "—";
}

function setsRepsMeta(block: WorkoutSetEntry, ex: Record<string, unknown>): string {
  const sets = (ex.sets as number | undefined) ?? block.total_sets;
  const reps = (ex.reps as string | number | undefined) ?? block.reps_per_set;
  const parts: string[] = [];
  if (sets != null) parts.push(`${sets} ${sets === 1 ? "set" : "sets"}`);
  if (reps) parts.push(`${reps} reps`);
  return parts.join(" · ");
}

function techniqueNote(block: WorkoutSetEntry): string | null {
  const t = (block.set_type || "").toLowerCase();
  if (t === "drop_set") {
    const drops = block.drop_sets?.length ?? 0;
    return drops > 0 ? `↳ drop set · ${drops} ${drops === 1 ? "drop" : "drops"}` : "↳ drop set";
  }
  if (t === "cluster_set") return "↳ cluster set";
  if (t === "rest_pause") return "↳ rest-pause";
  if (t === "pre_exhaustion") return "↳ pre-exhaust";
  return null;
}

function formatExerciseWeightLine(ex: Record<string, unknown>): string | null {
  const w = ex.weight_kg;
  if (w != null && w !== "") {
    return `@ ${w}kg`;
  }
  const lp = ex.load_percentage;
  if (lp != null && lp !== "") {
    return `@ ${lp}% 1RM`;
  }
  return null;
}

function buildV6ExerciseRows(block: WorkoutSetEntry, blockIndex: number): V6ExerciseRow[] {
  const hue = GROUP_HUES[blockIndex % GROUP_HUES.length];
  const letter = String.fromCharCode(65 + blockIndex);
  const tech = techniqueNote(block);
  const exercises = block.exercises;
  if (exercises && exercises.length > 0) {
    const sorted = [...exercises].sort(
      (a, b) => (a.exercise_order ?? 0) - (b.exercise_order ?? 0),
    );
    const grouped = sorted.length > 1;
    return sorted.map((ex, i) => {
      const raw = ex as unknown as Record<string, unknown>;
      const oneRm = formatExerciseWeightLine(raw);
      return {
        key: `${block.id}-${i}`,
        badge: grouped ? `${letter}${i + 1}` : letter,
        hue,
        name:
          (ex.exercise as { name?: string } | undefined)?.name ||
          ex.exercise_letter ||
          "Exercise",
        meta: setsRepsMeta(block, raw),
        rx: formatPrescriptionBadge(block, raw),
        oneRm: oneRm ? oneRm.replace(/^@\s*/, "") : null,
        tech,
        notes: (ex.notes as string | null) ?? null,
      };
    });
  }
  const label = block.set_name || block.set_type || "Set";
  return [
    {
      key: `${block.id}-0`,
      badge: letter,
      hue,
      name: label,
      meta: setsRepsMeta(block, {}),
      rx: formatPrescriptionBadge(block, {}),
      oneRm: null,
      tech,
      notes: null,
    },
  ];
}

function cellClassForStatus(
  status: WorkoutStatus | null,
  isRest: boolean,
): string {
  if (isRest) return styles.cellRest;
  if (!status) return styles.cellDim;
  switch (status) {
    case "completed":
      return styles.cellDone;
    case "missed":
      return styles.cellMissed;
    case "due-today":
      return styles.cellDue;
    case "out-of-scope":
      return styles.cellOut;
    case "upcoming":
    default:
      return styles.cellUpcoming;
  }
}

export type ProgramWeekRoadmapProps = {
  weeks: WeekSection[];
  phaseSections: PhaseSection[];
  currentWeekNumber: number | null;
  completedDayIds: Set<string>;
  skippedDayIds: Set<string>;
  windows: ProgramWeekWindow[] | null;
  progression: FoundationProgression | null;
  effectiveTodayYmd: string | null;
  selectedDayKey: string | null;
  onSelectDay: (day: DaySlot) => void;
  blocksCache: Map<string, WorkoutSetEntry[]>;
  loadingTemplates: Set<string>;
  onStartWorkout: (scheduleId: string) => void;
  isStarting: boolean;
  startingScheduleId: string | null;
};

export function ProgramWeekRoadmap({
  weeks,
  phaseSections,
  currentWeekNumber,
  completedDayIds,
  skippedDayIds,
  windows,
  progression,
  effectiveTodayYmd,
  selectedDayKey,
  onSelectDay,
  blocksCache,
  loadingTemplates,
  onStartWorkout,
  isStarting,
  startingScheduleId,
}: ProgramWeekRoadmapProps) {
  const selectedDay =
    selectedDayKey != null
      ? weeks.flatMap((w) => w.days).find((d) => d.key === selectedDayKey) ?? null
      : null;

  const selectedStatus = selectedDay
    ? resolveDayFoundationStatus(
        selectedDay,
        completedDayIds,
        skippedDayIds,
        windows,
        progression,
        effectiveTodayYmd,
      )
    : null;

  const canStart =
    selectedDay &&
    isFoundationStartable(selectedStatus) &&
    Boolean(selectedDay.scheduleId) &&
    Boolean(selectedDay.templateId);

  const selectedLoadKey = selectedDay ? String(selectedDay.key) : null;
  const cachedBlocks =
    selectedLoadKey != null ? blocksCache.get(selectedLoadKey) : undefined;
  const isLoadingBlocks =
    selectedLoadKey != null &&
    Boolean(selectedDay?.templateId) &&
    loadingTemplates.has(selectedLoadKey);

  return (
    <div className={styles.wrap}>
      <p className={styles.eyebrow}>Roadmap</p>

      <div className={styles.headerRow} aria-hidden>
        <span className={styles.weekLblSpacer} />
        <div className={styles.cells}>
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className={styles.dayHead}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.list}>
        {weeks.map(({ weekNumber, days }) => {
          const isCurrent = weekNumber === currentWeekNumber;
          const isPast =
            currentWeekNumber != null && weekNumber < currentWeekNumber;
          const isFuture =
            currentWeekNumber != null && weekNumber > currentWeekNumber;
          const phaseColor = phaseColorForWeek(weekNumber, phaseSections);
          const cols = slotsByProgramDay(days);

          return (
            <div
              key={`w-${weekNumber}`}
              id={`roadmap-week-${weekNumber}`}
              data-week={weekNumber}
              className={cn(
                styles.row,
                isCurrent && styles.rowCurrent,
                isFuture && styles.rowFuture,
                isPast && styles.rowPast,
              )}
              style={
                phaseColor
                  ? ({ ["--phase-color"]: phaseColor } as CSSProperties)
                  : undefined
              }
            >
              <span
                className={cn(
                  styles.weekLbl,
                  phaseColor && styles.weekLblPhase,
                  isCurrent && styles.weekLblCurrent,
                )}
              >
                W{weekNumber}
              </span>
              <div className={styles.cells} role="list">
                {cols.map((day, colIdx) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${weekNumber}-${colIdx + 1}`}
                        className={cn(styles.cell, styles.cellEmpty)}
                        aria-hidden
                      />
                    );
                  }

                  const status = resolveDayFoundationStatus(
                    day,
                    completedDayIds,
                    skippedDayIds,
                    windows,
                    progression,
                    effectiveTodayYmd,
                  );
                  const selected = day.key === selectedDayKey;
                  const label = String(day.dayNumber);

                  if (day.isRest) {
                    return (
                      <div
                        key={day.key}
                        role="listitem"
                        aria-label={`Week ${weekNumber} ${WEEKDAY_LABELS[colIdx]}, rest`}
                        className={cn(styles.cell, styles.cellRest)}
                      >
                        <span className={styles.cellMark}>·</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={day.key}
                      type="button"
                      role="listitem"
                      aria-pressed={selected}
                      aria-label={`Week ${weekNumber} ${WEEKDAY_LABELS[colIdx]}, day ${day.dayNumber}, ${status ?? "workout"}`}
                      className={cn(
                        styles.cell,
                        cellClassForStatus(status, false),
                        selected && styles.cellSelected,
                      )}
                      onClick={() => onSelectDay(day)}
                    >
                      {status === "completed" ? (
                        <Check className={styles.cellIcon} strokeWidth={2.5} />
                      ) : status === "missed" ? (
                        <X className={styles.cellIcon} strokeWidth={2.5} />
                      ) : (
                        <span className={styles.cellMark}>{label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDay && !selectedDay.isRest ? (
        <div className={styles.detail} aria-live="polite">
          <div className={styles.detailHead}>
            <div className={styles.detailMain}>
              <p className={styles.detailWeek}>
                Week {selectedDay.weekNumber} · Day {selectedDay.dayNumber}
              </p>
              <h2 className={styles.detailTitle}>
                {selectedDay.template?.name ?? "Workout"}
              </h2>
              {selectedDay.template?.estimated_duration != null &&
              selectedDay.template.estimated_duration > 0 ? (
                <p className={styles.detailDur}>
                  {selectedDay.template.estimated_duration} min
                </p>
              ) : null}
            </div>
            {canStart && selectedDay.scheduleId ? (
              <button
                type="button"
                className={styles.startBtn}
                disabled={
                  isStarting && startingScheduleId === selectedDay.scheduleId
                }
                aria-busy={
                  isStarting && startingScheduleId === selectedDay.scheduleId
                }
                onClick={() => onStartWorkout(selectedDay.scheduleId!)}
              >
                {isStarting && startingScheduleId === selectedDay.scheduleId ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Starting…
                  </>
                ) : selectedStatus === "missed" ? (
                  "Start missed"
                ) : (
                  "Start"
                )}
              </button>
            ) : null}
          </div>

          <div className={styles.exWrap}>
            {!selectedDay.templateId ? (
              <p className={styles.exEmpty}>No workout configured</p>
            ) : isLoadingBlocks || cachedBlocks === undefined ? (
              <div role="status" aria-label="Loading exercises">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={cn(styles.skRow, "animate-pulse")}>
                    <div className={styles.skBadge} />
                    <div className={styles.skCol}>
                      <div className={styles.skLine} style={{ width: "55%" }} />
                      <div className={styles.skLine} style={{ width: "35%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : cachedBlocks.length === 0 ? (
              <p className={styles.exEmpty}>
                No exercises configured for this workout
              </p>
            ) : (
              [...cachedBlocks]
                .sort((a, b) => (a.set_order ?? 0) - (b.set_order ?? 0))
                .flatMap((blk, bi) => buildV6ExerciseRows(blk, bi))
                .map((row) => (
                  <div key={row.key} className={styles.ex}>
                    <span
                      className={styles.badge}
                      style={{ ["--hue" as string]: row.hue }}
                    >
                      {row.badge}
                    </span>
                    <div className={styles.exMain}>
                      <div className={styles.exName}>{row.name}</div>
                      {row.meta ? (
                        <div className={styles.exMeta}>{row.meta}</div>
                      ) : null}
                      {row.tech ? (
                        <div className={styles.tech}>{row.tech}</div>
                      ) : null}
                      {row.notes ? (
                        <div className={styles.exNote}>{row.notes}</div>
                      ) : null}
                    </div>
                    <div className={styles.exRight}>
                      <div className={styles.exRx}>{row.rx}</div>
                      {row.oneRm ? (
                        <div className={styles.ex1rm}>{row.oneRm}</div>
                      ) : null}
                    </div>
                  </div>
                ))
            )}
          </div>
          <p className={styles.detailHint}>
            <ChevronDown className="h-3 w-3 inline" aria-hidden /> Tap another
            cell to switch workouts
          </p>
        </div>
      ) : null}
    </div>
  );
}
