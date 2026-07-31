"use client";

import React, { useCallback, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import type { ProgramWeekDayCard } from "@/lib/programWeekStateBuilder";
import { ExerciseGroupDisplay } from "@/components/exercise-display";
import type { ExerciseGroupDisplayProps } from "@/components/exercise-display";
import { supabase } from "@/lib/supabase";
import { loadDayExerciseGroups } from "@/components/client/train/loadDayCanvas";
import styles from "./trainPage.module.css";

export type TrainDayRowStatus = "done" | "today" | "missed" | "rest" | "upcoming";

export function getTrainDayRowStatus(
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
  onStartWorkout,
  isStarting = false,
  startingScheduleId = null,
}: TrainWeekDayListProps) {
  const [openScheduleId, setOpenScheduleId] = useState<string | null>(null);
  const [canvasCache, setCanvasCache] = useState<Map<string, CanvasCacheEntry>>(
    () => new Map(),
  );

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
        const status = getTrainDayRowStatus(day, todayWeekday, todayScheduleId);
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
