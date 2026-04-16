"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Trophy,
  Search,
  Crown,
  ChevronUp,
  ChevronDown,
  Minus,
} from "lucide-react";
import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/leaderboardService";
import type { TimeWindow } from "@/lib/leaderboardService";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

export const LIFT_SETS = {
  A: {
    name: "Set A",
    exercises: ["Squat", "Bench Press", "Deadlift"],
  },
  B: {
    name: "Set B",
    exercises: ["Squat", "Hip Thrust", "Deadlift"],
  },
} as const;

export type LiftSet = keyof typeof LIFT_SETS;
export type MetricType = "1rm" | "3rm" | "5rm" | "tonnage";

export interface ChampionChip {
  name?: string;
  category?: string;
  score?: number | string;
}

export interface ClientLeaderboardPageBodyProps {
  userId: string | undefined;
  leaderboardData: LeaderboardEntry[];
  champions: ChampionChip[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  timeWindow: TimeWindow;
  setTimeWindow: (w: TimeWindow) => void;
  sexFilter: "all" | "M" | "F";
  setSexFilter: (v: "all" | "M" | "F") => void;
  metricType: MetricType;
  setMetricType: (m: MetricType) => void;
  liftSet: LiftSet;
  setLiftSet: (s: LiftSet) => void;
  activeExercise: string;
  setActiveExercise: (e: string) => void;
  customExerciseId: string | null;
  customExerciseName: string | null;
  clearCustomExercise: () => void;
  showExerciseSearch: boolean;
  setShowExerciseSearch: (v: boolean) => void;
  exerciseSearchResults: Array<{ id: string; name: string; category?: string }>;
  searchQuery: string;
  handleExerciseSearch: (q: string) => void;
  selectCustomExercise: (exercise: {
    id: string;
    name: string;
    category?: string;
  }) => void;
  backHref?: string;
  cornerBadge?: React.ReactNode;
  /** Compact, low-chrome layout for test / mobile-focused views */
  denseLayout?: boolean;
}

function formatScore(score: number, type: MetricType) {
  if (type === "tonnage") {
    return `${Math.round(score)} kg`;
  }
  return `${score.toFixed(1)} kg`;
}

function formatChampionWeightLabel(score: ChampionChip["score"]): string {
  if (score == null) return "—";
  if (typeof score === "number") return `${score.toFixed(1)} kg`;
  return String(score);
}

export function ClientLeaderboardPageBody({
  userId,
  leaderboardData,
  champions,
  loading,
  loadError,
  onRetry,
  timeWindow,
  setTimeWindow,
  sexFilter,
  setSexFilter,
  metricType,
  setMetricType,
  liftSet,
  setLiftSet,
  activeExercise,
  setActiveExercise,
  customExerciseId,
  customExerciseName,
  clearCustomExercise,
  showExerciseSearch,
  setShowExerciseSearch,
  exerciseSearchResults,
  searchQuery,
  handleExerciseSearch,
  selectCustomExercise,
  backHref = "/client/progress",
  cornerBadge,
  denseLayout = false,
}: ClientLeaderboardPageBodyProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const getDisplayExerciseName = () => {
    if (customExerciseName) return customExerciseName;
    return activeExercise;
  };

  const currentUserEntry = leaderboardData.find(
    (entry) => entry.client_id === userId
  );
  const userRank = currentUserEntry?.rank ?? null;

  const flatRow = (
    entry: LeaderboardEntry,
    opts?: { leading?: React.ReactNode; nameOverride?: string; rowKey?: string }
  ) => {
    const isSelf = entry.client_id === userId;
    return (
      <div
        key={opts?.rowKey ?? `${entry.id}-flat`}
        className={cn(
          "flex min-h-[44px] h-11 shrink-0 items-center gap-2 border-b border-white/5 px-2 text-sm",
          isSelf && "bg-cyan-500/5 border-l-2 border-l-cyan-500 pl-[6px]"
        )}
      >
        {opts?.leading != null ? (
          <span className="flex w-7 shrink-0 justify-center text-[color:var(--fc-text-dim)]">
            {opts.leading}
          </span>
        ) : (
          <span className="w-9 shrink-0 font-mono text-xs font-bold tabular-nums text-[color:var(--fc-text-dim)]">
            #{entry.rank}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-[color:var(--fc-text-primary)]">
          {opts?.nameOverride ??
            (entry.is_anonymous ? "Anonymous" : entry.display_name)}
          {isSelf && !opts?.nameOverride ? (
            <span className="ml-1.5 text-xs text-cyan-500">(You)</span>
          ) : null}
        </span>
        <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-[color:var(--fc-accent-cyan)]">
          {formatScore(entry.score, metricType)}
        </span>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "relative z-10 mx-auto w-full fc-page px-4 pb-32 pt-8",
        denseLayout ? "max-w-lg space-y-4" : "max-w-6xl sm:px-6 lg:px-10 space-y-8"
      )}
    >
      {cornerBadge ? (
        <div className="fixed right-3 top-3 z-[60] sm:right-6 sm:top-4">
          {cornerBadge}
        </div>
      ) : null}

      <div
        className={cn(
          denseLayout
            ? "border-b border-white/5 pb-4"
            : "fc-card-shell p-6 sm:p-10"
        )}
      >
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {denseLayout ? (
            <button
              type="button"
              onClick={() => {
                window.location.href = backHref;
              }}
              className="flex w-10 h-10 items-center justify-center shrink-0 border border-[color:var(--fc-glass-border)] rounded-lg bg-white/[0.03]"
            >
              <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
            </button>
          ) : (
            <Link
              href={backHref}
              className="flex w-10 h-10 items-center justify-center shrink-0 border border-[color:var(--fc-glass-border)] fc-surface rounded-xl"
            >
              <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
            </Link>
          )}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-2xl text-[color:var(--fc-accent)]",
                denseLayout ? "h-10 w-10" : "h-12 w-12"
              )}
              style={{ backgroundColor: "var(--fc-aurora)", opacity: 0.2 }}
            >
              <Trophy className={denseLayout ? "w-5 h-5" : "w-6 h-6"} />
            </div>
            <div>
              <h1
                className={cn(
                  "font-bold tracking-tight text-[color:var(--fc-text-primary)]",
                  denseLayout ? "text-lg" : "text-2xl"
                )}
              >
                Global ranks
              </h1>
              <p
                className={cn(
                  "text-[color:var(--fc-text-dim)]",
                  denseLayout ? "text-xs mt-0.5" : "text-sm mt-1"
                )}
              >
                Comparing with {leaderboardData.length} athletes
              </p>
            </div>
          </div>
        </div>
      </div>

      {champions.length > 0 && (
        <div
          className={cn(
            denseLayout
              ? "border-b border-white/5 pb-4"
              : "fc-card-shell p-6"
          )}
        >
          <div className={cn("flex items-center gap-2", denseLayout ? "mb-2" : "mb-4")}>
            <Crown className={cn("text-amber-500", denseLayout ? "w-4 h-4" : "w-5 h-5")} />
            <h2
              className={cn(
                "font-bold fc-text-primary",
                denseLayout ? "text-sm" : "text-lg"
              )}
            >
              Current Champions
            </h2>
          </div>
          {denseLayout ? (
            <div>
              {champions.map((ch, i) => (
                <div
                  key={i}
                  className="flex min-h-[40px] h-10 items-center justify-between gap-2 border-b border-white/5 py-2"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="shrink-0" aria-hidden>
                      🏆
                    </span>
                    <span className="truncate font-medium text-[color:var(--fc-text-primary)]">
                      {ch.name || "Champion"}
                    </span>
                    <span className="shrink-0 text-sm text-gray-400">
                      {ch.category || "—"}
                    </span>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums text-cyan-400">
                    {formatChampionWeightLabel(ch.score)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:flex lg:overflow-x-auto lg:pb-1 lg:gap-3">
              {champions.map((ch, i) => (
                <div
                  key={i}
                  className="min-w-0 fc-glass-soft rounded-xl border border-amber-500/20 px-2 py-2.5 text-center sm:p-3 lg:min-w-[140px] lg:flex-shrink-0 lg:px-3"
                >
                  <p className="mb-0.5 text-base leading-none sm:mb-1 sm:text-lg">
                    🏆
                  </p>
                  <p className="text-[11px] font-bold fc-text-primary line-clamp-2 break-words sm:text-xs">
                    {ch.name || "Champion"}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[9px] fc-text-dim sm:text-[10px]">
                    {ch.category || "—"}
                  </p>
                  {ch.score != null && (
                    <p className="mt-1 truncate text-[10px] font-mono font-bold text-amber-500 sm:text-xs">
                      {ch.score}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentUserEntry &&
        (denseLayout ? (
          <div>
            <div className="flex min-h-[44px] items-center border-b border-white/5 bg-cyan-500/[0.07] px-2 text-sm text-[color:var(--fc-text-primary)]">
              <span className="font-medium text-cyan-400/90">Your rank:</span>
              <span className="ml-1.5 font-mono tabular-nums">
                #{currentUserEntry.rank} of {leaderboardData.length}
              </span>
              <span className="mx-2 text-[color:var(--fc-text-dim)]">·</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatScore(currentUserEntry.score ?? 0, metricType)}
              </span>
            </div>
            {(() => {
              const idx = leaderboardData.findIndex(
                (e) => e.client_id === userId
              );
              if (idx < 0) return null;
              const above = idx > 0 ? leaderboardData[idx - 1] : null;
              const below =
                idx < leaderboardData.length - 1
                  ? leaderboardData[idx + 1]
                  : null;
              if (!above && !below) return null;
              return (
                <div className="mt-1">
                  <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--fc-text-dim)]">
                    Your neighborhood
                  </p>
                  <div className="rounded-none border border-white/5 overflow-hidden">
                    {above &&
                      flatRow(above, {
                        rowKey: `${above.id}-nbr-up`,
                        leading: (
                          <ChevronUp className="h-4 w-4 text-green-500" />
                        ),
                      })}
                    {flatRow(currentUserEntry, {
                      rowKey: `${currentUserEntry.id}-nbr-self`,
                      leading: <Minus className="h-4 w-4 text-cyan-500" />,
                      nameOverride: "You",
                    })}
                    {below &&
                      flatRow(below, {
                        rowKey: `${below.id}-nbr-down`,
                        leading: (
                          <ChevronDown className="h-4 w-4 text-red-400" />
                        ),
                      })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="fc-card-shell p-6 border-l-4 border-l-[color:var(--fc-accent-blue)]">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold fc-text-primary mb-1">
                  You&apos;re #{currentUserEntry.rank} of{" "}
                  {leaderboardData.length}
                </h2>
                <p className="text-sm fc-text-dim mb-4">
                  Your score:{" "}
                  <span className="font-mono font-bold fc-text-primary">
                    {formatScore(currentUserEntry.score ?? 0, metricType)}
                  </span>
                </p>
              </div>
              <div className="fc-glass-soft px-4 py-3 rounded-xl border border-[color:var(--fc-glass-border)]">
                <p className="text-xs fc-text-subtle">Your rank</p>
                <p className="text-2xl font-bold font-mono fc-text-workouts">
                  #{currentUserEntry.rank}
                </p>
              </div>
            </div>

            {(() => {
              const idx = leaderboardData.findIndex(
                (e) => e.client_id === userId
              );
              if (idx < 0) return null;
              const above = idx > 0 ? leaderboardData[idx - 1] : null;
              const below =
                idx < leaderboardData.length - 1
                  ? leaderboardData[idx + 1]
                  : null;
              if (!above && !below) return null;
              return (
                <div className="mt-4 pt-4 border-t border-[color:var(--fc-glass-border)]">
                  <p className="text-xs font-bold fc-text-dim uppercase tracking-wider mb-2">
                    Your neighborhood
                  </p>
                  <div className="space-y-1.5">
                    {above && (
                      <div className="flex items-center gap-3 text-sm">
                        <ChevronUp className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="font-mono font-bold fc-text-dim w-8">
                          #{above.rank}
                        </span>
                        <span className="fc-text-primary flex-1 truncate">
                          {above.is_anonymous ? "Anonymous" : above.display_name}
                        </span>
                        <span className="font-mono text-xs fc-text-dim">
                          {formatScore(above.score, metricType)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm bg-cyan-500/10 rounded-lg px-2 py-1 border border-cyan-500/20">
                      <Minus className="w-4 h-4 text-cyan-500 shrink-0" />
                      <span className="font-mono font-bold text-cyan-500 w-8">
                        #{currentUserEntry.rank}
                      </span>
                      <span className="fc-text-primary font-semibold flex-1 truncate">
                        You
                      </span>
                      <span className="font-mono text-xs font-bold text-cyan-500">
                        {formatScore(currentUserEntry.score, metricType)}
                      </span>
                    </div>
                    {below && (
                      <div className="flex items-center gap-3 text-sm">
                        <ChevronDown className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="font-mono font-bold fc-text-dim w-8">
                          #{below.rank}
                        </span>
                        <span className="fc-text-primary flex-1 truncate">
                          {below.is_anonymous
                            ? "Anonymous"
                            : below.display_name}
                        </span>
                        <span className="font-mono text-xs fc-text-dim">
                          {formatScore(below.score, metricType)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ))}

      <div
        className={cn(
          "sticky top-0 z-10 -mx-4 px-4 sm:mx-0 sm:px-0",
          denseLayout
            ? "my-3"
            : "mb-4 fc-glass-soft rounded-xl border-b border-[color:var(--fc-glass-border)] py-4 backdrop-blur-xl"
        )}
        style={
          denseLayout
            ? undefined
            : { backgroundColor: "var(--fc-bg-base)", opacity: 0.8 }
        }
      >
        <div
          className={cn(
            denseLayout
              ? "flex w-full flex-col gap-2"
              : "flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4"
          )}
        >
          {denseLayout ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  {(["this_month", "this_week", "all_time"] as const).map(
                    (window) => (
                      <Button
                        key={window}
                        size="sm"
                        onClick={() => setTimeWindow(window)}
                        className={cn(
                          "fc-btn h-8 px-2.5 text-xs",
                          timeWindow === window
                            ? "fc-btn-primary"
                            : "fc-btn-secondary text-[color:var(--fc-text-primary)]"
                        )}
                      >
                        {window === "this_month"
                          ? "This Month"
                          : window === "this_week"
                            ? "This Week"
                            : "All Time"}
                      </Button>
                    )
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersExpanded((e) => !e)}
                  className="shrink-0 px-2 py-1 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Filters {filtersExpanded ? "▴" : "▾"}
                </button>
              </div>
              {filtersExpanded ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        ["all", "All"],
                        ["M", "Men"],
                        ["F", "Women"],
                      ] as const
                    ).map(([value, label]) => (
                      <Button
                        key={value}
                        size="sm"
                        onClick={() => setSexFilter(value)}
                        className={cn(
                          "fc-btn h-8 px-2.5 text-xs",
                          sexFilter === value
                            ? "fc-btn-primary"
                            : "fc-btn-secondary text-[color:var(--fc-text-primary)]"
                        )}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(["1rm", "3rm", "5rm", "tonnage"] as const).map(
                      (metric) => (
                        <Button
                          key={metric}
                          size="sm"
                          onClick={() => setMetricType(metric)}
                          className={cn(
                            "fc-btn h-8 px-2.5 text-xs",
                            metricType === metric
                              ? "fc-btn-primary"
                              : "fc-btn-secondary text-[color:var(--fc-text-primary)]"
                          )}
                        >
                          {metric === "tonnage"
                            ? "Tonnage"
                            : metric.toUpperCase()}
                        </Button>
                      )
                    )}
                  </div>
                  {!customExerciseId && (
                    <div className="flex flex-wrap items-center gap-2">
                      {(["A", "B"] as const).map((set) => (
                        <Button
                          key={set}
                          size="sm"
                          onClick={() => setLiftSet(set)}
                          className={cn(
                            "fc-btn h-8 px-2.5 text-xs",
                            liftSet === set
                              ? "fc-btn-primary"
                              : "fc-btn-secondary text-[color:var(--fc-text-primary)]"
                          )}
                        >
                          {LIFT_SETS[set].name}
                        </Button>
                      ))}
                    </div>
                  )}
                  {customExerciseId ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                        {customExerciseName}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="fc-btn fc-btn-ghost h-8 text-xs"
                        onClick={clearCustomExercise}
                      >
                        Clear
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {LIFT_SETS[liftSet].exercises.map((exercise) => (
                        <Button
                          key={exercise}
                          size="sm"
                          onClick={() => setActiveExercise(exercise)}
                          className={cn(
                            "fc-btn h-8 px-2.5 text-xs",
                            activeExercise === exercise
                              ? "fc-btn-primary"
                              : "fc-btn-secondary text-[color:var(--fc-text-primary)]"
                          )}
                        >
                          {exercise}
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="fc-btn fc-btn-ghost h-8 px-2 text-xs"
                        onClick={() =>
                          setShowExerciseSearch(!showExerciseSearch)
                        }
                      >
                        <Search className="mr-1 h-4 w-4" />
                        Choose Exercise
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <Input
                      type="text"
                      placeholder="Search for an exercise..."
                      value={searchQuery}
                      onChange={(e) => handleExerciseSearch(e.target.value)}
                    />
                    {showExerciseSearch && exerciseSearchResults.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto border-y border-white/10">
                        {exerciseSearchResults.map((exercise) => (
                          <button
                            key={exercise.id}
                            type="button"
                            onClick={() => selectCustomExercise(exercise)}
                            className="w-full rounded-lg px-3 py-2 text-left text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-glass-highlight)]"
                          >
                            {exercise.name}
                            {exercise.category && (
                              <span className="ml-2 text-xs text-[color:var(--fc-text-dim)]">
                                {exercise.category}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="my-3 flex w-full flex-wrap gap-2 sm:w-auto">
                {(["this_month", "this_week", "all_time"] as const).map(
                  (window) => (
                    <Button
                      key={window}
                      size="sm"
                      onClick={() => setTimeWindow(window)}
                      className={cn(
                        "fc-btn",
                        timeWindow === window
                          ? "fc-btn-primary"
                          : "fc-btn-secondary text-[color:var(--fc-text-primary)]"
                      )}
                    >
                      {window === "this_month"
                        ? "This Month"
                        : window === "this_week"
                          ? "This Week"
                          : "All Time"}
                    </Button>
                  )
                )}
              </div>
              <div className="mb-3 flex w-full flex-wrap gap-2 sm:w-auto">
                {(
                  [
                    ["all", "All"],
                    ["M", "Men"],
                    ["F", "Women"],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    size="sm"
                    onClick={() => setSexFilter(value)}
                    className={cn(
                      "fc-btn",
                      sexFilter === value
                        ? "fc-btn-primary"
                        : "fc-btn-secondary text-[color:var(--fc-text-primary)]"
                    )}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["1rm", "3rm", "5rm", "tonnage"] as const).map((metric) => (
                  <Button
                    key={metric}
                    size="sm"
                    onClick={() => setMetricType(metric)}
                    className={cn(
                      "fc-btn",
                      metricType === metric
                        ? "fc-btn-primary"
                        : "fc-btn-secondary text-[color:var(--fc-text-primary)]"
                    )}
                  >
                    {metric === "tonnage" ? "Tonnage" : metric.toUpperCase()}
                  </Button>
                ))}
              </div>

              {!customExerciseId && (
                <div className="flex flex-wrap items-center gap-2">
                  {(["A", "B"] as const).map((set) => (
                    <Button
                      key={set}
                      size="sm"
                      onClick={() => setLiftSet(set)}
                      className={cn(
                        "fc-btn",
                        liftSet === set
                          ? "fc-btn-primary"
                          : "fc-btn-secondary text-[color:var(--fc-text-primary)]"
                      )}
                    >
                      {LIFT_SETS[set].name}
                    </Button>
                  ))}
                </div>
              )}

              {customExerciseId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    {customExerciseName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="fc-btn fc-btn-ghost"
                    onClick={clearCustomExercise}
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {LIFT_SETS[liftSet].exercises.map((exercise) => (
                    <Button
                      key={exercise}
                      size="sm"
                      onClick={() => setActiveExercise(exercise)}
                      className={cn(
                        "fc-btn",
                        activeExercise === exercise
                          ? "fc-btn-primary"
                          : "fc-btn-secondary text-[color:var(--fc-text-primary)]"
                      )}
                    >
                      {exercise}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="fc-btn fc-btn-ghost"
                    onClick={() => setShowExerciseSearch(!showExerciseSearch)}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Choose Exercise
                  </Button>
                </div>
              )}

              {showExerciseSearch && (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Search for an exercise..."
                    value={searchQuery}
                    onChange={(e) => handleExerciseSearch(e.target.value)}
                  />
                  {exerciseSearchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-2xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] p-2">
                      {exerciseSearchResults.map((exercise) => (
                        <button
                          key={exercise.id}
                          type="button"
                          onClick={() => selectCustomExercise(exercise)}
                          className="w-full rounded-lg px-3 py-2 text-left text-[color:var(--fc-text-primary)] hover:bg-[color:var(--fc-glass-highlight)]"
                        >
                          {exercise.name}
                          {exercise.category && (
                            <span className="ml-2 text-xs text-[color:var(--fc-text-dim)]">
                              {exercise.category}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {denseLayout ? (
        <>
          {loadError && !loading ? (
            <div className="border-b border-white/5 py-8 text-center">
              <p className="mb-4 text-[color:var(--fc-text-dim)]">{loadError}</p>
              <button
                type="button"
                onClick={onRetry}
                className="fc-btn fc-btn-secondary fc-press h-10 px-6 text-sm"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--fc-accent-cyan)] border-t-transparent" />
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={Trophy}
                title="No leaderboard data yet"
                description="Complete workouts to see your ranking"
              />
            </div>
          ) : (
            <>
              <div className="fc-card-shell p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full fc-text-warning"
                    style={{
                      backgroundColor: "var(--fc-status-warning)",
                      opacity: 0.2,
                    }}
                  >
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                      {getDisplayExerciseName()} Rankings
                    </h2>
                    <p className="text-xs text-[color:var(--fc-text-dim)]">
                      {metricType === "tonnage"
                        ? "Total Volume"
                        : `${metricType.toUpperCase()} Personal Records`}
                    </p>
                  </div>
                </div>

                {leaderboardData.length >= 2 && (
                  <div className="flex items-end justify-center gap-3 py-3">
                    {[1, 0, 2].map((podiumIdx) => {
                      const entry = leaderboardData[podiumIdx];
                      if (!entry) return null;
                      const heights = ["h-24", "h-20", "h-16"];
                      const badges = ["🥇", "🥈", "🥉"];
                      const borders = [
                        "border-amber-400 bg-gradient-to-t from-amber-500/20 to-transparent",
                        "border-gray-400 bg-gradient-to-t from-gray-400/20 to-transparent",
                        "border-amber-700 bg-gradient-to-t from-amber-700/20 to-transparent",
                      ];
                      const idx = podiumIdx;
                      return (
                        <div
                          key={entry.id}
                          className="flex max-w-[120px] flex-1 flex-col items-center gap-1"
                        >
                          <span className="text-2xl">{badges[idx]}</span>
                          <p className="w-full truncate text-center text-xs font-semibold fc-text-primary">
                            {entry.is_anonymous ? "Anonymous" : entry.display_name}
                            {entry.client_id === userId && (
                              <span className="ml-1 text-[10px] text-cyan-500">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="text-xs font-mono font-bold text-[color:var(--fc-accent-cyan)]">
                            {formatScore(entry.score, metricType)}
                          </p>
                          <div
                            className={cn(
                              "w-full rounded-t-xl border-t-2",
                              heights[idx],
                              borders[idx]
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-1 overflow-hidden rounded-lg border border-white/5">
                {leaderboardData.map((entry) =>
                  flatRow(entry, { rowKey: `list-${entry.id}` })
                )}
              </div>
            </>
          )}

          {userRank != null && userRank > 3 ? (
            <p className="px-1 pt-2 text-center text-xs text-[color:var(--fc-text-dim)]">
              You&apos;re #{userRank}. Push harder to reach the top.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="fc-card-shell p-6">
            <div className="mb-6 flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full fc-text-warning"
                style={{
                  backgroundColor: "var(--fc-status-warning)",
                  opacity: 0.2,
                }}
              >
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                  {getDisplayExerciseName()} Rankings
                </h2>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  {metricType === "tonnage"
                    ? "Total Volume"
                    : `${metricType.toUpperCase()} Personal Records`}
                </p>
              </div>
            </div>

            {loadError && !loading ? (
              <div className="py-12 text-center">
                <p className="mb-4 text-[color:var(--fc-text-dim)]">{loadError}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="fc-btn fc-btn-secondary fc-press h-10 px-6 text-sm"
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--fc-accent-cyan)] border-t-transparent" />
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={Trophy}
                  title="No leaderboard data yet"
                  description="Complete workouts to see your ranking"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboardData.length >= 2 && (
                  <div className="mb-6 flex items-end justify-center gap-3 py-4">
                    {[1, 0, 2].map((podiumIdx) => {
                      const entry = leaderboardData[podiumIdx];
                      if (!entry) return null;
                      const heights = ["h-24", "h-20", "h-16"];
                      const badges = ["🥇", "🥈", "🥉"];
                      const borders = [
                        "border-amber-400 bg-gradient-to-t from-amber-500/20 to-transparent",
                        "border-gray-400 bg-gradient-to-t from-gray-400/20 to-transparent",
                        "border-amber-700 bg-gradient-to-t from-amber-700/20 to-transparent",
                      ];
                      const idx = podiumIdx;
                      return (
                        <div
                          key={entry.id}
                          className="flex max-w-[120px] flex-1 flex-col items-center gap-1"
                        >
                          <span className="text-2xl">{badges[idx]}</span>
                          <p className="w-full truncate text-center text-xs font-semibold fc-text-primary">
                            {entry.is_anonymous ? "Anonymous" : entry.display_name}
                            {entry.client_id === userId && (
                              <span className="ml-1 text-[10px] text-cyan-500">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="text-xs font-mono font-bold text-[color:var(--fc-accent-cyan)]">
                            {formatScore(entry.score, metricType)}
                          </p>
                          <div
                            className={cn(
                              "w-full rounded-t-xl border-t-2",
                              heights[idx],
                              borders[idx]
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {leaderboardData.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "fc-glass-soft fc-card p-4 transition-all",
                      entry.client_id === userId
                        ? "border-2 border-[color:var(--fc-accent-cyan)]"
                        : "border border-[color:var(--fc-glass-border)]"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold",
                          entry.rank === 1
                            ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                            : entry.rank === 2
                              ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white"
                              : entry.rank === 3
                                ? "bg-gradient-to-br from-amber-700 to-orange-900 text-white"
                                : "bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-text-primary)]"
                        )}
                      >
                        {entry.rank}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[color:var(--fc-text-primary)]">
                          {entry.is_anonymous ? "Anonymous" : entry.display_name}
                          {entry.client_id === userId && (
                            <span className="ml-2 text-xs text-cyan-500">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-[color:var(--fc-text-subtle)]">
                          {entry.time_window &&
                            `Updated ${new Date(entry.last_updated).toLocaleDateString()}`}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-[color:var(--fc-accent-cyan)]">
                          {formatScore(entry.score, metricType)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!denseLayout && userRank != null && userRank > 3 ? (
            <div className="fc-card-shell p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 text-lg font-semibold text-[color:var(--fc-text-primary)]">
                    Keep Climbing!
                  </h3>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    {"You're ranked #"}
                    {userRank}
                    {". Push harder to reach the top."}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
