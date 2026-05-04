"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Loader2,
  Minus,
  Star,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/lib/apiClient";
import type { NextWorkoutResponse, ClientStatus, BlockExercise, WorkoutBlock } from "./gymConsoleTypes";
import styles from "./gymConsole.module.css";
import dv from "./gymConsoleDrawerV1.module.css";
import { CoachSetTypePill } from "@/components/ui/CoachSetTypePill";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function parseWeekDayFromLabel(label: string | undefined | null): { week: number | null; day: number | null } {
  if (!label) return { week: null, day: null };
  const w = label.match(/week\s*(\d+)/i);
  const d = label.match(/day\s*(\d+)/i);
  return {
    week: w ? parseInt(w[1], 10) : null,
    day: d ? parseInt(d[1], 10) : null,
  };
}

/** One prescribed “round” count per block — matches WorkoutTemplateForm hero (block.total_sets from first line). */
function blockTotalSets(block: WorkoutBlock): number {
  const exs = block.exercises || [];
  if (exs.length === 0) return 1;
  const first = exs[0];
  const n = parseInt(String(first?.sets ?? "1"), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function totalPrescribedSetsFromBlocks(blocks: WorkoutBlock[]): number {
  return blocks.reduce((sum, b) => sum + blockTotalSets(b), 0);
}

/** Same denominator as GymConsoleClientCard “X / Y sets logged”. */
function totalSetsTargetForCard(status: ClientStatus | null | undefined, fallbackFromBlocks: number): number {
  const nw = status?.nextWorkout;
  if (nw?.exerciseCount && nw.exerciseCount > 0) return nw.exerciseCount;
  if (nw?.blockCount && nw.blockCount > 0) return nw.blockCount;
  return fallbackFromBlocks > 0 ? fallbackFromBlocks : 1;
}

const CONDITIONING_TYPES = new Set([
  "amrap",
  "emom",
  "emom_reps",
  "for_time",
  "tabata",
  "speed_work",
  "endurance",
]);

function rowIconForBlock(setType: string | undefined) {
  const t = (setType || "").toLowerCase();
  return CONDITIONING_TYPES.has(t) ? Activity : Dumbbell;
}

function blockSetType(block: WorkoutBlock): string {
  return (block.set_type || block.block_type || "straight_set").toLowerCase();
}

export function GymConsoleDetailDrawer({
  clientId,
  clientName,
  canLog,
  onLogExercise,
  onClose,
  layout = "drawer",
  consoleStatus,
  recentPrExerciseId,
  clientAvatarUrl,
}: {
  clientId: string;
  clientName: string;
  canLog: boolean;
  onLogExercise: (sel: { blockId: string; exerciseId: string; exerciseName: string }) => void;
  onClose: () => void;
  layout?: "drawer" | "fullscreen";
  consoleStatus?: ClientStatus | null;
  recentPrExerciseId?: string | null;
  clientAvatarUrl?: string | null;
}) {
  const [data, setData] = useState<NextWorkoutResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchApi(`/api/coach/pickup/next-workout?clientId=${clientId}`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) {
          if (body.error) setError(body.error || "Failed to load");
          else setData(body);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const isFullscreen = layout === "fullscreen";
  const session = consoleStatus?.activeSession ?? null;
  const setsLoggedSession = session?.setsLogged ?? 0;

  const blocks = data?.blocks && Array.isArray(data.blocks) ? data.blocks : [];
  const heroExerciseCount = useMemo(() => {
    let n = 0;
    for (const b of blocks) {
      n += (b.exercises || []).filter((e) => e.exercise_id).length;
    }
    return n;
  }, [blocks]);

  const heroTotalSets = useMemo(() => totalPrescribedSetsFromBlocks(blocks), [blocks]);

  const loggedCompareTotal = useMemo(
    () => totalSetsTargetForCard(consoleStatus ?? null, heroExerciseCount),
    [consoleStatus, heroExerciseCount],
  );

  const loggedStatColorClass = useMemo(() => {
    if (loggedCompareTotal <= 0) return dv.statValWhite;
    if (setsLoggedSession <= 0) return dv.statValWhite;
    if (setsLoggedSession >= loggedCompareTotal) return dv.statValGood;
    return dv.statValWarn;
  }, [loggedCompareTotal, setsLoggedSession]);

  type FlatRow = {
    block: WorkoutBlock;
    ex: BlockExercise;
    setType: string;
    /** Prescribed sets on this exercise line (from template). */
    lineSets: number;
    /** Logs allocated to this row in flat order (matches workout_set_logs count semantics). */
    consumedInRow: number;
  };

  const flatRows: FlatRow[] = useMemo(() => {
    let cumLines = 0;
    const rows: FlatRow[] = [];
    for (const block of blocks) {
      const st = blockSetType(block);
      for (const ex of block.exercises || []) {
        if (!ex.exercise_id) continue;
        const parsed = parseInt(String(ex.sets ?? "1"), 10);
        const lineSets = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
        const consumedInRow = Math.min(lineSets, Math.max(0, setsLoggedSession - cumLines));
        cumLines += lineSets;
        rows.push({ block, ex, setType: st, lineSets, consumedInRow });
      }
    }
    return rows;
  }, [blocks, setsLoggedSession]);

  const programName = consoleStatus?.programName ?? data?.program_name ?? "Program";
  const weekFromStatus = consoleStatus?.currentWeek ?? null;
  const dayFromStatus = consoleStatus?.currentDay ?? null;
  const parsed = parseWeekDayFromLabel(data?.position_label);
  const weekNum = weekFromStatus ?? parsed.week;
  const dayNum = dayFromStatus ?? parsed.day;
  const workoutTitle = data?.workout_name ?? "—";

  const hasActiveWorkoutList =
    data != null && data.status === "active" && blocks.length > 0 && heroExerciseCount > 0;
  const showRestDay =
    data != null &&
    !loading &&
    !error &&
    data.status === "active" &&
    (blocks.length === 0 || heroExerciseCount === 0);

  const header = (
    <>
      {isFullscreen ? <div className={dv.grabHandle} aria-hidden /> : null}
      <div className={dv.drawerHeader}>
        <div className={dv.avatarTile}>
          {clientAvatarUrl ? (
            <img src={clientAvatarUrl} alt="" className={dv.avatarImg} />
          ) : (
            initialsFromName(clientName)
          )}
        </div>
        <div className={dv.headerMeta}>
          <div className={dv.eyebrowClient}>
            <span className={dv.eyebrowDot} aria-hidden />
            Client
          </div>
          <div className={dv.clientTitle}>{clientName}</div>
        </div>
        <button type="button" className={dv.closeBtn} onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </>
  );

  const programStrip =
    !loading && !error && data ? (
      <>
        <div className={dv.sectionEyebrow}>Program</div>
        <div className={dv.programCard}>
          <div className={dv.calTile}>
            <CalendarDays className="h-[17px] w-[17px]" strokeWidth={2} />
          </div>
          <div className={dv.programInfo}>
            <div className={dv.programName}>{programName}</div>
            <div className={dv.programMetaRow}>
              {weekNum != null ? <span className={dv.weekTag}>W{weekNum}</span> : null}
              <span className={dv.programDayLine}>
                {dayNum != null ? (
                  <>
                    <span className={dv.dayStrong}>Day {dayNum}</span>
                    <span> · {workoutTitle}</span>
                  </>
                ) : (
                  <span>{data.position_label ? `${data.position_label} · ` : ""}{workoutTitle}</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </>
    ) : null;

  return (
    <div className={cn(styles.drawerShell, isFullscreen && styles.drawerShellMobile)}>
      <div className={cn(dv.wrap, "flex h-full min-h-0 flex-col")}>
        {header}
        <div className={dv.scrollBody}>
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[color:var(--fc-accent-cyan)]" />
            </div>
          )}
          {error && <p className="text-sm text-[color:var(--fc-status-warning)]">{error}</p>}

          {!loading && !error && programStrip}

          {!loading && !error && showRestDay && (
            <div className={dv.restDay}>
              <div className={dv.restIcon}>
                <Minus className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className={dv.restTitle}>Rest day</div>
              <p className={dv.restBody}>No workout scheduled for this client today.</p>
            </div>
          )}

          {!loading && !error && hasActiveWorkoutList && (
            <>
              <div className={dv.heroEyebrow}>Today&apos;s workout</div>
              <div className={dv.workoutHero}>
                <div className={dv.heroGlow} aria-hidden />
                <div className={dv.heroInner}>
                  <div className={dv.workoutTitle}>{workoutTitle}</div>
                  {canLog ? (
                    <p className={dv.heroHelper}>Tap an exercise to log a set.</p>
                  ) : (
                    <p className={dv.heroHelper}>Preview — start a session from the card to log sets.</p>
                  )}
                  <div className={dv.statStrip}>
                    <div className={dv.statCell}>
                      <div className={cn(dv.statVal, dv.statValLime)}>{heroExerciseCount}</div>
                      <div className={dv.statLbl}>Exercises</div>
                    </div>
                    <div className={dv.statCell}>
                      <div className={cn(dv.statVal, dv.statValCyan)}>{heroTotalSets}</div>
                      <div className={dv.statLbl}>Total sets</div>
                    </div>
                    <div className={dv.statCell}>
                      <div className={cn(dv.statVal, loggedStatColorClass)}>{setsLoggedSession}</div>
                      <div className={dv.statLbl}>Logged</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={dv.listEyebrow}>Exercises · {heroExerciseCount}</div>
              <div className={dv.exList}>
                {flatRows.map(({ block, ex, setType, lineSets, consumedInRow }) => {
                  const Icon = rowIconForBlock(setType);
                  const isRowDone = consumedInRow >= lineSets;
                  const isLogging = !isRowDone && consumedInRow > 0 && consumedInRow < lineSets;
                  const showPr = isRowDone && recentPrExerciseId && recentPrExerciseId === ex.exercise_id;

                  const rowClass = cn(dv.exRow, isLogging && dv.exRowLogging, isRowDone && dv.exRowDone);
                  const iconTileClass = cn(
                    dv.iconTile,
                    isLogging && dv.iconTileLogging,
                    isRowDone && dv.iconTileDone,
                  );

                  const repPart = ex.reps
                    ? ` · ${ex.reps} ${String(ex.reps).trim() === "1" ? "rep" : "reps"}`
                    : "";

                  const rxPending = (
                    <span className={dv.rx}>
                      <strong>{lineSets} sets</strong>
                      {repPart}
                    </span>
                  );

                  const rxLogging = (
                    <span className={dv.rx}>
                      <strong>
                        {consumedInRow}/{lineSets} sets
                      </strong>
                      {repPart}
                    </span>
                  );

                  const rxDone = (
                    <span className={dv.rx}>
                      {lineSets}/{lineSets} sets · last —
                    </span>
                  );

                  const inner = (
                    <>
                      <div className={dv.exTopRow}>
                        <CoachSetTypePill setType={setType} />
                        {isLogging ? (
                          <span className={dv.badgeLogging}>
                            <span className={dv.pulseDot} aria-hidden />
                            Logging
                          </span>
                        ) : null}
                        {isRowDone ? (
                          <span className={dv.badgeDone}>
                            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                            Done
                          </span>
                        ) : null}
                        {showPr ? (
                          <span className={dv.badgePr}>
                            <Star className="h-[9px] w-[9px]" fill="currentColor" strokeWidth={0} aria-hidden />
                            PR
                          </span>
                        ) : null}
                      </div>
                      <div className={dv.exBottomRow}>
                        <div className={iconTileClass}>
                          {isRowDone ? (
                            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                          ) : (
                            <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                          )}
                        </div>
                        <div className={dv.exInfo}>
                          <div className={cn(dv.exName, isRowDone && dv.exNameDone)}>{ex.exercise_name}</div>
                          {isRowDone ? rxDone : isLogging ? rxLogging : rxPending}
                        </div>
                        <ChevronRight className={dv.chev} strokeWidth={2} aria-hidden />
                      </div>
                    </>
                  );

                  if (canLog && ex.exercise_id) {
                    return (
                      <button
                        key={`${block.id}-${ex.id}`}
                        type="button"
                        className={rowClass}
                        onClick={() =>
                          onLogExercise({
                            blockId: block.id,
                            exerciseId: ex.exercise_id,
                            exerciseName: ex.exercise_name,
                          })
                        }
                        aria-label={`Log set for ${ex.exercise_name}`}
                      >
                        {inner}
                      </button>
                    );
                  }

                  return (
                    <div key={`${block.id}-${ex.id}`} className={cn(rowClass, "cursor-default")}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!loading && !error && data?.status === "no_program" && (
            <p className={dv.mutedMsg}>No active program.</p>
          )}
          {!loading && !error && data?.status === "completed" && (
            <p className={dv.mutedMsg} style={{ color: "var(--good)" }}>
              Program completed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
