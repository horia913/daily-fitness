/**
 * Whole-workout one-page group list.
 * Done / upcoming headers jump via onSelectGroup; current header is static.
 * Pre-start: all groups upcoming/collapsed; no executor, no taps.
 */

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LiveWorkoutSetEntry } from "@/types/workoutSetEntries";
import { groupIndexToHue } from "./live-card";
import { SetUnitRow } from "./ui/set-rows/SetUnitRow";
import setUnitStyles from "./ui/set-rows/setUnitRow.module.css";
import { resolveSetPrescriptionTargets } from "./ui/set-rows/resolveSetPrescriptionTargets";
import {
  formatExecGroupHeaderBadge,
  formatExecGroupName,
  getGroupTickState,
  getGroupTotalSets,
  isGroupedSetType,
} from "./execGroupListHelpers";
import styles from "./execGroupList.module.css";
import liveCardStyles from "./live-card/liveCard.module.css";
import { formatGroupedExerciseBadge } from "./groupLetterBadges";

const HUE_CLASS = {
  a: styles.hueA,
  b: styles.hueB,
  c: styles.hueC,
  d: styles.hueD,
} as const;

function UpcomingSetRows({
  entry,
  groupIndex,
  getExercisePreviousBest,
}: {
  entry: LiveWorkoutSetEntry;
  groupIndex: number;
  getExercisePreviousBest?: (exerciseName: string) => { weight: number; reps: number } | null;
}) {
  const totalSets = getGroupTotalSets(entry);
  return (
    <>
      {Array.from({ length: totalSets }, (_, i) => {
        const setNumber = i + 1;
        const exercises = entry.setEntry.exercises ?? [];
        const setType = (entry.setEntry.set_type ?? "straight_set") as string;

        const repsPerSet = entry.setEntry.reps_per_set;

        const renderSolo = () => {
          const ex = exercises[0];
          const exerciseName = ex?.exercise?.name ?? "";
          const t = resolveSetPrescriptionTargets(ex, setNumber, repsPerSet ?? null);
          const pr = getExercisePreviousBest?.(exerciseName) ?? null;

          if (t.work_seconds != null && t.work_seconds > 0) {
            return (
              <span className="inline-flex items-center gap-2">
                <span className={setUnitStyles.sxMuted}>{t.work_seconds} sec</span>
                {pr ? (
                  <span className={styles.prPill}>
                    PR {pr.weight} × {pr.reps}
                  </span>
                ) : null}
              </span>
            );
          }

          if (t.distance_meters != null && t.distance_meters > 0) {
            return (
              <span className="inline-flex items-center gap-2">
                <span className={setUnitStyles.sxMuted}>{t.distance_meters} m</span>
                {pr ? (
                  <span className={styles.prPill}>
                    PR {pr.weight} × {pr.reps}
                  </span>
                ) : null}
              </span>
            );
          }

          const reps = t.reps?.trim() || "—";
          if (t.weight_kg != null) {
            return (
              <span className="inline-flex items-center gap-2">
                <span className={setUnitStyles.sxMuted}>
                  {reps} × {t.weight_kg} kg
                </span>
                {pr ? (
                  <span className={styles.prPill}>
                    PR {pr.weight} × {pr.reps}
                  </span>
                ) : null}
              </span>
            );
          }

          return (
            <span className="inline-flex items-center gap-2">
              <span className={setUnitStyles.sxMuted}>{reps} reps</span>
              {pr ? (
                <span className={styles.prPill}>
                  PR {pr.weight} × {pr.reps}
                </span>
              ) : null}
            </span>
          );
        };

        const renderGrouped = () => {
          if (!exercises.length) return null;

          return (
            <span className="inline-flex items-center gap-2">
              {exercises.map((ex, exIdx) => {
                const exerciseName = ex?.exercise?.name ?? "";
                const badge = formatGroupedExerciseBadge(groupIndex, ex.exercise_order, exIdx);
                const t = resolveSetPrescriptionTargets(ex, setNumber, repsPerSet ?? null);
                const pr = getExercisePreviousBest?.(exerciseName) ?? null;

                let target = "";
                if (t.work_seconds != null && t.work_seconds > 0) {
                  target = `${badge} ${t.work_seconds}s`;
                } else if (t.distance_meters != null && t.distance_meters > 0) {
                  target = `${badge} ${t.distance_meters}m`;
                } else {
                  const reps = t.reps?.trim() || "—";
                  target =
                    t.weight_kg != null
                      ? `${badge} ${reps}×${t.weight_kg}`
                      : `${badge} ${reps} reps`;
                }

                return (
                  <span key={`${entry.setEntry.id}-set-${setNumber}-ex-${exIdx}`} className="inline-flex items-center gap-2">
                    <span className={setUnitStyles.sxMuted}>{target}</span>
                    {pr ? (
                      <span className={styles.prPill}>
                        PR {pr.weight} × {pr.reps}
                      </span>
                    ) : null}
                    {exIdx < exercises.length - 1 ? (
                      <span className={setUnitStyles.sxMuted}> · </span>
                    ) : null}
                  </span>
                );
              })}
            </span>
          );
        };

        const summaryNode =
          isGroupedSetType(setType) && exercises.length >= 2
            ? renderGrouped()
            : renderSolo();

        return (
          <SetUnitRow
            key={`${entry.setEntry.id}-set-${setNumber}`}
            label={`Set ${setNumber}`}
            summary={
              summaryNode
            }
          />
        );
      })}
    </>
  );
}

/** Filled hue square + letter — same CSS as live-card `.badge`. */
function GroupHeaderBadge({ label }: { label: string }) {
  return (
    <span className={cn(liveCardStyles.badge, styles.headerBadge)} aria-hidden>
      {label}
    </span>
  );
}

export function ExecGroupList({
  entries,
  currentIndex,
  currentSlot,
  onSelectGroup,
  preStart = false,
  getExercisePreviousBest,
}: {
  entries: LiveWorkoutSetEntry[];
  currentIndex: number;
  /** Only the current group's executor — rendered once (when not preStart). */
  currentSlot: ReactNode;
  /** Same path as Prev/Next — `handleSetEntryChange(index)`. Ignored when preStart. */
  onSelectGroup?: (index: number) => void;
  /** All groups as upcoming/collapsed; no live card, headers not tappable. */
  preStart?: boolean;
  getExercisePreviousBest?: (exerciseName: string) => { weight: number; reps: number } | null;
}) {
  const currentRef = useRef<HTMLDivElement>(null);
  const didMountScroll = useRef(false);

  useEffect(() => {
    if (preStart) return;
    const el = currentRef.current;
    if (!el) return;
    const behavior: ScrollBehavior = didMountScroll.current ? "smooth" : "auto";
    didMountScroll.current = true;
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ block: "start", behavior });
    });
    return () => window.cancelAnimationFrame(id);
  }, [currentIndex, entries.length, preStart]);

  if (!entries.length) return null;

  if (preStart) {
    return (
      <div className={styles.list}>
        {entries.map((entry, index) => {
          const hue = groupIndexToHue(index);
          const name = formatExecGroupName(entry, index);
          const badge = formatExecGroupHeaderBadge(entry, index);
          const totalSets = getGroupTotalSets(entry);
          return (
            <div
              key={entry.setEntry.id}
              className={cn(styles.grp, styles.grpUpcoming, HUE_CLASS[hue])}
            >
              <div className={styles.ghead}>
                <GroupHeaderBadge label={badge} />
                <span className={styles.gname}>{name}</span>
                <span className={styles.gsets}>
                  {totalSets} {totalSets === 1 ? "set" : "sets"}
                </span>
              </div>
              <UpcomingSetRows
                entry={entry}
                groupIndex={index}
                getExercisePreviousBest={getExercisePreviousBest}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {entries.map((entry, index) => {
        const hue = groupIndexToHue(index);
        const name = formatExecGroupName(entry, index);
        const badge = formatExecGroupHeaderBadge(entry, index);
        const totalSets = getGroupTotalSets(entry);

        if (index < currentIndex) {
          const { completed, total } = getGroupTickState(entry);
          return (
            <div
              key={entry.setEntry.id}
              className={cn(styles.grp, styles.grpDone, HUE_CLASS[hue])}
            >
              <button
                type="button"
                className={cn(styles.ghead, styles.gheadButton)}
                aria-label={`Go to ${name}`}
                onClick={() => onSelectGroup?.(index)}
              >
                <GroupHeaderBadge label={badge} />
                <span className={styles.gname}>{name}</span>
                <span
                  className={styles.gchecks}
                  aria-label={`${completed} of ${total} sets done`}
                >
                  {Array.from({ length: total }, (_, i) => (
                    <span
                      key={i}
                      className={
                        i < completed ? styles.gcheckOn : styles.gcheckOff
                      }
                      aria-hidden
                    >
                      {i < completed ? "✓" : "○"}
                    </span>
                  ))}
                </span>
              </button>
            </div>
          );
        }

        if (index === currentIndex) {
          return (
            <div
              key={entry.setEntry.id}
              ref={currentRef}
              className={cn(styles.grp, styles.grpCurrent, HUE_CLASS[hue])}
            >
              <div className={styles.ghead}>
                <GroupHeaderBadge label={badge} />
                <span className={styles.gname}>{name}</span>
                <span className={styles.gsets}>
                  {totalSets} {totalSets === 1 ? "set" : "sets"}
                </span>
              </div>
              {currentSlot}
            </div>
          );
        }

        return (
          <div
            key={entry.setEntry.id}
            className={cn(styles.grp, styles.grpUpcoming, HUE_CLASS[hue])}
          >
            <button
              type="button"
              className={cn(styles.ghead, styles.gheadButton)}
              aria-label={`Go to ${name}`}
              onClick={() => onSelectGroup?.(index)}
            >
              <GroupHeaderBadge label={badge} />
              <span className={styles.gname}>{name}</span>
              <span className={styles.gsets}>
                {totalSets} {totalSets === 1 ? "set" : "sets"}
              </span>
            </button>
            <UpcomingSetRows entry={entry} groupIndex={index} />
          </div>
        );
      })}
    </div>
  );
}
