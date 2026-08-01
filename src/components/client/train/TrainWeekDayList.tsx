"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import type { ProgramWeekDayCard } from "@/lib/programWeekStateBuilder";
import { ExerciseGroupDisplay } from "@/components/exercise-display";
import type { ExerciseGroupDisplayProps } from "@/components/exercise-display";
import { supabase } from "@/lib/supabase";
import { loadDayExerciseGroups } from "@/components/client/train/loadDayCanvas";
import { zonedCalendarDateString } from "@/lib/clientZonedCalendar";
import {
  getEffectiveToday,
  getProgramWeekWindows,
  getWorkoutStatus,
  type PauseState,
  type ProgramWeekWindow,
  type WorkoutStatus,
} from "@/lib/progression/weekWindows";
import styles from "./trainPage.module.css";

export type TrainDayRowStatus = "done" | "today" | "missed" | "rest" | "upcoming";

/** Inputs needed to drive weekWindows status for the displayed week. */
export type TrainDayStatusContext = {
  startDate: string;
  totalWeeks: number;
  timeZone: string;
  pauses: PauseState;
  /** Fallback week when a day card omits weekNumber (current Train week). */
  weekNumber: number;
  /** Optional override for tests; defaults to zoned calendar today. */
  actualTodayYmd?: string;
};

function mapFoundationStatusToTrain(status: WorkoutStatus): TrainDayRowStatus {
  switch (status) {
    case "completed":
      return "done";
    case "missed":
      return "missed";
    case "due-today":
      return "today";
    case "upcoming":
      return "upcoming";
    case "out-of-scope":
      // Pre-start: still completable; no Missed pill. Match "upcoming" (no pill).
      // Do not use "rest" — that disables the row.
      return "upcoming";
    default:
      return "upcoming";
  }
}

/**
 * Legacy weekday-relative status (pre-weekWindows). Kept as fallback only when
 * assignment start/tz context is missing.
 */
export function getTrainDayRowStatusLegacy(
  day: ProgramWeekDayCard,
  todayWeekday: number,
  todayScheduleId: string | null,
): TrainDayRowStatus {
  if (!day.templateId) return "rest";
  if (day.isCompleted) return "done";
  if (todayScheduleId && day.scheduleId === todayScheduleId) return "today";
  if (day.dayOfWeek < todayWeekday) return "missed";
  if (day.dayOfWeek === todayWeekday) return "today";
  return "upcoming";
}

/**
 * Day-row status from weekWindows foundation when context is present;
 * otherwise legacy weekday comparison.
 */
export function getTrainDayRowStatus(
  day: ProgramWeekDayCard,
  todayWeekday: number,
  todayScheduleId: string | null,
  progression?: TrainDayStatusContext | null,
  windows?: ProgramWeekWindow[] | null,
  effectiveTodayYmd?: string | null,
): TrainDayRowStatus {
  if (!day.templateId) return "rest";

  if (progression?.startDate && progression.totalWeeks > 0 && progression.timeZone) {
    const weekNumber = day.weekNumber ?? progression.weekNumber;
    const programDay = day.dayNumber;
    const win =
      windows ??
      getProgramWeekWindows(
        progression.startDate,
        progression.totalWeeks,
        progression.timeZone,
        progression.pauses,
      );
    const todayYmd =
      effectiveTodayYmd ??
      getEffectiveToday(
        progression.actualTodayYmd ??
          zonedCalendarDateString(new Date(), progression.timeZone),
        progression.timeZone,
        progression.pauses,
      );
    const foundation = getWorkoutStatus(
      { weekNumber, programDay, isDone: day.isCompleted },
      win,
      progression.startDate,
      todayYmd,
    );
    return mapFoundationStatusToTrain(foundation);
  }

  return getTrainDayRowStatusLegacy(day, todayWeekday, todayScheduleId);
}

const DAY_NUM_CLASS: Record<TrainDayRowStatus, string> = {
  done: styles.dayNumDone,
  today: styles.dayNumToday,
  missed: styles.dayNumMissed,
  rest: styles.dayNumRest,
  upcoming: styles.dayNumUpcoming,
};

const PILL_CLASS: Partial<Record<TrainDayRowStatus, string>> = {
  done: styles.pillDone,
  today: styles.pillToday,
  missed: styles.pillMissed,
  rest: styles.pillRest,
};

const PILL_LABEL: Partial<Record<TrainDayRowStatus, string>> = {
  done: "Done",
  today: "Today",
  missed: "Missed",
  rest: "Rest",
};

export interface TrainWeekDayListProps {
  days: ProgramWeekDayCard[];
  todayWeekday: number;
  todayScheduleId: string | null;
  exerciseCounts: Map<string, number>;
  /** When set, row status uses weekWindows; otherwise legacy weekday logic. */
  progression?: TrainDayStatusContext | null;
  onStartWorkout?: (scheduleId: string) => void;
  isStarting?: boolean;
  startingScheduleId?: string | null;
}

type CanvasCacheEntry =
  | { status: "loading" }
  | { status: "ready"; groups: ExerciseGroupDisplayProps[] }
  | { status: "error" };

export function canStartMissedTrainDay(
  day: ProgramWeekDayCard,
  status: TrainDayRowStatus,
): boolean {
  return (
    status === "missed" &&
    !day.isCompleted &&
    Boolean(day.scheduleId) &&
    Boolean(day.templateId)
  );
}

export function TrainWeekDayList({
  days,
  todayWeekday,
  todayScheduleId,
  exerciseCounts,
  progression = null,
  onStartWorkout,
  isStarting = false,
  startingScheduleId = null,
}: TrainWeekDayListProps) {
  const [openScheduleId, setOpenScheduleId] = useState<string | null>(null);
  const [canvasCache, setCanvasCache] = useState<Map<string, CanvasCacheEntry>>(
    () => new Map(),
  );

  const { windows, effectiveTodayYmd } = useMemo(() => {
    if (!progression?.startDate || progression.totalWeeks <= 0 || !progression.timeZone) {
      return { windows: null as ProgramWeekWindow[] | null, effectiveTodayYmd: null as string | null };
    }
    const win = getProgramWeekWindows(
      progression.startDate,
      progression.totalWeeks,
      progression.timeZone,
      progression.pauses,
    );
    const todayYmd =
      progression.actualTodayYmd ??
      zonedCalendarDateString(new Date(), progression.timeZone);
    return {
      windows: win,
      effectiveTodayYmd: getEffectiveToday(todayYmd, progression.timeZone, progression.pauses),
    };
  }, [progression]);

  const loadCanvas = useCallback(async (day: ProgramWeekDayCard) => {
    const key = day.scheduleId ?? day.templateId;
    if (!key || !day.templateId) return;

    setCanvasCache((prev) => {
      const next = new Map(prev);
      if (next.get(key)?.status === "ready") return prev;
      next.set(key, { status: "loading" });
      return next;
    });

    try {
      const groups = await loadDayExerciseGroups(supabase, {
        templateId: day.templateId,
        instanceWorkoutId: day.instanceWorkoutId,
      });
      setCanvasCache((prev) => {
        const next = new Map(prev);
        next.set(key, { status: "ready", groups });
        return next;
      });
    } catch {
      setCanvasCache((prev) => {
        const next = new Map(prev);
        next.set(key, { status: "error" });
        return next;
      });
    }
  }, []);

  const handleRowToggle = (day: ProgramWeekDayCard) => {
    if (!day.templateId || !day.scheduleId) return;
    const key = day.scheduleId;
    if (openScheduleId === key) {
      setOpenScheduleId(null);
      return;
    }
    setOpenScheduleId(key);
    const cached = canvasCache.get(key);
    if (!cached || cached.status === "error") {
      void loadCanvas(day);
    }
  };

  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber);

  return (
    <div className={styles.dayList} role="list" aria-label="This week workouts">
      {sortedDays.map((day) => {
        const status = getTrainDayRowStatus(
          day,
          todayWeekday,
          todayScheduleId,
          progression,
          windows,
          effectiveTodayYmd,
        );
        const isRest = status === "rest";
        const isOpen = !isRest && openScheduleId === day.scheduleId;
        const cacheKey = day.scheduleId ?? day.templateId;
        const cacheEntry = cacheKey ? canvasCache.get(cacheKey) : undefined;
        const exerciseCount = day.templateId
          ? exerciseCounts.get(day.templateId) ?? 0
          : 0;
        const minutes = day.estimatedDuration || 45;
        const canStartMissed = canStartMissedTrainDay(day, status);
        const isStartingThis =
          isStarting && startingScheduleId === day.scheduleId;

        return (
          <div key={day.scheduleId ?? `day-${day.dayNumber}`} className={styles.dayRow} role="listitem">
            <div className={styles.dayRowHeader}>
              <button
                type="button"
                className={`${styles.dayRowBtn} ${isRest ? styles.dayRowBtnRest : ""}`}
                onClick={() => !isRest && handleRowToggle(day)}
                aria-expanded={isRest ? undefined : isOpen}
                disabled={isRest}
              >
                <span className={`${styles.dayNum} ${DAY_NUM_CLASS[status]}`}>
                  {String(day.dayNumber).padStart(2, "0")}
                </span>
                <div className={styles.dayMain}>
                  <p
                    className={`${styles.dayTitle} ${isRest ? styles.dayTitleRest : ""}`}
                  >
                    {isRest ? "Rest day" : day.workoutName}
                  </p>
                  {!isRest ? (
                    <p className={styles.daySub}>
                      {minutes} MIN · {exerciseCount > 0 ? exerciseCount : "—"} EXERCISES
                    </p>
                  ) : null}
                </div>
                <div className={styles.dayMeta}>
                  {PILL_LABEL[status] ? (
                    <span className={`${styles.statusPill} ${PILL_CLASS[status] ?? ""}`}>
                      <span className={styles.pillDot} aria-hidden />
                      {PILL_LABEL[status]}
                    </span>
                  ) : null}
                  {!isRest ? (
                    <ChevronRight
                      className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                      size={16}
                      aria-hidden
                    />
                  ) : null}
                </div>
              </button>
              {canStartMissed && onStartWorkout && day.scheduleId ? (
                <button
                  type="button"
                  className={styles.rowStartLink}
                  onClick={() => onStartWorkout(day.scheduleId!)}
                  disabled={isStartingThis}
                  aria-busy={isStartingThis}
                >
                  {isStartingThis ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : null}
                  Start →
                </button>
              ) : null}
            </div>

            {isOpen ? (
              <div className={styles.dayExpand}>
                {cacheEntry?.status === "loading" || !cacheEntry ? (
                  <div className={styles.dayExpandSkeleton} aria-hidden>
                    <div className={styles.dayExpandSkeletonBar} />
                    <div className={styles.dayExpandSkeletonBar} />
                  </div>
                ) : cacheEntry.status === "error" ? (
                  <p className={styles.daySub}>Could not load exercises.</p>
                ) : cacheEntry.groups.length === 0 ? (
                  <p className={styles.daySub}>No exercises in this workout.</p>
                ) : (
                  <div className={styles.dayExpandGroups}>
                    {cacheEntry.groups.map((group) => (
                      <ExerciseGroupDisplay
                        key={`${group.groupIndex}-${group.letter}`}
                        {...group}
                        size="list"
                      />
                    ))}
                  </div>
                )}
                <div className={styles.dayExpandActions}>
                  {canStartMissed && onStartWorkout && day.scheduleId ? (
                    <button
                      type="button"
                      className={styles.rowStartLink}
                      onClick={() => onStartWorkout(day.scheduleId!)}
                      disabled={isStartingThis}
                      aria-busy={isStartingThis}
                    >
                      {isStartingThis ? (
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      ) : null}
                      Start →
                    </button>
                  ) : null}
                  {day.templateId ? (
                    <button
                      type="button"
                      className={styles.openWorkoutLink}
                      onClick={() => {
                        window.location.href = `/client/workouts/${day.templateId}/start`;
                      }}
                    >
                      Open workout →
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
