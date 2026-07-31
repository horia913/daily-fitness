"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trophy,
  Search,
  Crown,
  ChevronUp,
  ChevronDown,
  Minus,
} from "lucide-react";
import type {
  LeaderboardEntry,
  LeaderboardVisibility,
  TimeWindow,
} from "@/lib/leaderboardService";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClientPageShell } from "@/components/client-ui";
import { PsHero, PsSegmented } from "@/components/client/progress-suite";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";

/** Flat lift list — no Set A/B chips. */
export const CORE_LIFTS = [
  "Squat",
  "Bench Press",
  "Deadlift",
  "Hip Thrust",
] as const;

export type MetricType = "1rm" | "3rm" | "5rm" | "tonnage";

export interface ChampionChip {
  name?: string;
  category?: string;
  score?: number | string;
}

const VISIBILITY_OPTIONS: {
  value: LeaderboardVisibility;
  label: string;
  hint: string;
}[] = [
  {
    value: "public",
    label: "Public",
    hint: "Your name shows on your coach’s roster ranking.",
  },
  {
    value: "anonymous",
    label: "Anonymous",
    hint: "You still rank; your name is hidden.",
  },
  {
    value: "hidden",
    label: "Hidden",
    hint: "You’re removed from the board entirely.",
  },
];

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
  visibility: LeaderboardVisibility;
  savingVisibility: boolean;
  onVisibilityChange: (next: LeaderboardVisibility) => void;
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

function entryDisplayName(entry: LeaderboardEntry): string {
  if (entry.is_anonymous) return "Anonymous";
  return entry.display_name || "Athlete";
}

function rankAccentClass(rank: number): string {
  if (rank === 1) return "text-[color:var(--fc-group-d)]";
  if (rank === 2) return "text-[color:var(--fc-text-dim)]";
  if (rank === 3) return "text-[color:var(--fc-effort-hard)]";
  return "text-[color:var(--fc-text-subtle)]";
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
  visibility,
  savingVisibility,
  onVisibilityChange,
}: ClientLeaderboardPageBodyProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [pendingHiddenConfirm, setPendingHiddenConfirm] = useState(false);

  const getDisplayExerciseName = () => {
    if (customExerciseName) return customExerciseName;
    return activeExercise;
  };

  const currentUserEntry = leaderboardData.find(
    (entry) => entry.client_id === userId,
  );
  const userRank = currentUserEntry?.rank ?? null;

  const requestVisibility = (next: LeaderboardVisibility) => {
    if (next === visibility) return;
    if (next === "hidden") {
      setPendingHiddenConfirm(true);
      return;
    }
    onVisibilityChange(next);
  };

  const flatRow = (
    entry: LeaderboardEntry,
    opts?: { leading?: React.ReactNode; nameOverride?: string; rowKey?: string },
  ) => {
    const isSelf = entry.client_id === userId;
    const name = opts?.nameOverride ?? entryDisplayName(entry);
    return (
      <div
        key={opts?.rowKey ?? `${entry.id}-flat`}
        className={cn(
          "flex min-h-[44px] h-11 shrink-0 items-center gap-2 border-b border-[color:var(--fc-hairline)] px-2.5 text-sm",
          isSelf &&
            "border-l-2 border-l-[color:var(--fc-accent)] bg-[color:color-mix(in_srgb,var(--fc-accent)_8%,transparent)] pl-[8px]",
        )}
      >
        {opts?.leading != null ? (
          <span className="flex w-7 shrink-0 justify-center text-[color:var(--fc-text-dim)]">
            {opts.leading}
          </span>
        ) : (
          <span
            className={cn(
              ps.psFontDisplay,
              "w-9 shrink-0 text-[15px] font-bold tabular-nums",
              rankAccentClass(entry.rank),
            )}
          >
            {entry.rank}
          </span>
        )}
        <span
          className={cn(
            ps.psFontMono,
            "min-w-0 flex-1 truncate text-[12px] font-medium text-[color:var(--fc-text-primary)]",
          )}
        >
          {name}
          {isSelf && !opts?.nameOverride ? (
            <span className="ml-1.5 text-[10px] text-[color:var(--fc-accent)]">
              (You)
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            ps.psFontMono,
            "shrink-0 text-[11px] font-semibold tabular-nums text-[color:var(--fc-text-dim)]",
          )}
        >
          {formatScore(entry.score, metricType)}
        </span>
      </div>
    );
  };

  return (
    <ClientPageShell className="max-w-lg px-4 pb-[var(--fc-bottom-safe-area)] pt-6">
      {cornerBadge ? (
        <div className="fixed right-3 top-3 z-[60] sm:right-6 sm:top-4">
          {cornerBadge}
        </div>
      ) : null}

      <div className={ps.psV1}>
        <PsHero
          glow="cyan"
          onBack={() => {
            window.location.href = backHref;
          }}
          backAriaLabel="Back"
          eyebrow="Progress · roster"
          eyebrowColor="var(--fc-group-c)"
          title="Roster ranking"
          subtitle="Your coach’s athletes — ranked in this roster"
        />

        <section className="mt-4 space-y-3 rounded-[18px] border border-[color:var(--fc-hairline)] bg-transparent p-3.5">
          <div>
            <p
              className={cn(
                ps.psFontMono,
                "text-[10px] uppercase tracking-[0.08em] text-[color:var(--fc-text-subtle)]",
              )}
            >
              Your visibility
            </p>
            <p
              className={cn(
                ps.psFontMono,
                "mt-1 text-[11px] leading-snug fc-text-dim",
              )}
            >
              Controls how you appear on this coach roster board.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {VISIBILITY_OPTIONS.map((opt) => {
              const selected = visibility === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={savingVisibility}
                  onClick={() => requestVisibility(opt.value)}
                  className={cn(
                    "rounded-[12px] border px-3 py-2.5 text-left transition-colors",
                    selected
                      ? "border-[color:var(--fc-accent)] bg-[color:color-mix(in_srgb,var(--fc-accent)_10%,transparent)]"
                      : "border-[color:var(--fc-hairline)] bg-transparent hover:bg-[color:var(--fc-surface-tint)]",
                    savingVisibility && "opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      ps.psFontDisplay,
                      "block text-[13px] font-bold tracking-tight fc-text-primary",
                    )}
                  >
                    {opt.label}
                  </span>
                  <span
                    className={cn(
                      ps.psFontMono,
                      "mt-0.5 block text-[10px] text-[color:var(--fc-text-subtle)]",
                    )}
                  >
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {champions.length > 0 && (
          <section className="mt-4 rounded-[18px] border border-[color:var(--fc-hairline)] bg-transparent p-3.5">
            <div className="mb-2 flex items-center gap-2">
              <Crown className="h-4 w-4 text-[color:var(--fc-group-d)]" />
              <h2
                className={cn(
                  ps.psFontDisplay,
                  "text-sm font-bold tracking-tight fc-text-primary",
                )}
              >
                Current champions
              </h2>
            </div>
            <div>
              {champions.map((ch, i) => (
                <div
                  key={i}
                  className="flex h-10 min-h-[40px] items-center justify-between gap-2 border-b border-[color:var(--fc-hairline)] last:border-0"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={cn(
                        ps.psFontDisplay,
                        "w-5 shrink-0 text-[13px] font-bold tabular-nums",
                        rankAccentClass(i + 1),
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        ps.psFontMono,
                        "truncate text-[12px] font-medium fc-text-primary",
                      )}
                    >
                      {ch.name || "Champion"}
                    </span>
                    <span
                      className={cn(
                        ps.psFontMono,
                        "shrink-0 text-[10px] text-[color:var(--fc-text-subtle)]",
                      )}
                    >
                      {ch.category || "—"}
                    </span>
                  </div>
                  <span
                    className={cn(
                      ps.psFontMono,
                      "shrink-0 text-[11px] font-bold tabular-nums text-[color:var(--fc-text-dim)]",
                    )}
                  >
                    {formatChampionWeightLabel(ch.score)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {currentUserEntry && (
          <section className="mt-4 overflow-hidden rounded-[18px] border border-[color:var(--fc-hairline)] bg-transparent">
            <div className="flex min-h-[44px] items-center border-b border-[color:var(--fc-hairline)] border-l-2 border-l-[color:var(--fc-accent)] bg-[color:color-mix(in_srgb,var(--fc-accent)_8%,transparent)] px-3 text-sm">
              <span
                className={cn(
                  ps.psFontMono,
                  "text-[11px] text-[color:var(--fc-accent)]",
                )}
              >
                Your rank
              </span>
              <span
                className={cn(
                  ps.psFontDisplay,
                  "ml-2 text-[15px] font-bold tabular-nums fc-text-primary",
                )}
              >
                {currentUserEntry.rank}
              </span>
              <span
                className={cn(
                  ps.psFontMono,
                  "ml-1 text-[11px] text-[color:var(--fc-text-subtle)]",
                )}
              >
                of {leaderboardData.length}
              </span>
              <span className="mx-2 text-[color:var(--fc-text-subtle)]">·</span>
              <span
                className={cn(
                  ps.psFontMono,
                  "text-[11px] font-semibold tabular-nums fc-text-primary",
                )}
              >
                {formatScore(currentUserEntry.score ?? 0, metricType)}
              </span>
            </div>
            {(() => {
              const idx = leaderboardData.findIndex(
                (e) => e.client_id === userId,
              );
              if (idx < 0) return null;
              const above = idx > 0 ? leaderboardData[idx - 1] : null;
              const below =
                idx < leaderboardData.length - 1
                  ? leaderboardData[idx + 1]
                  : null;
              if (!above && !below) return null;
              return (
                <div>
                  <p
                    className={cn(
                      ps.psFontMono,
                      "px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-[color:var(--fc-text-subtle)]",
                    )}
                  >
                    Your neighborhood
                  </p>
                  {above &&
                    flatRow(above, {
                      rowKey: `${above.id}-nbr-up`,
                      leading: (
                        <ChevronUp className="h-4 w-4 text-[color:var(--fc-status-success)]" />
                      ),
                    })}
                  {flatRow(currentUserEntry, {
                    rowKey: `${currentUserEntry.id}-nbr-self`,
                    leading: (
                      <Minus className="h-4 w-4 text-[color:var(--fc-accent)]" />
                    ),
                    nameOverride: "You",
                  })}
                  {below &&
                    flatRow(below, {
                      rowKey: `${below.id}-nbr-down`,
                      leading: (
                        <ChevronDown className="h-4 w-4 text-[color:var(--fc-status-error)]" />
                      ),
                    })}
                </div>
              );
            })()}
          </section>
        )}

        <div className="sticky top-0 z-10 -mx-4 mt-4 border-b border-[color:var(--fc-hairline)] bg-[color:var(--fc-bg-deep)] px-4 py-2 sm:mx-0">
          <div className="flex w-full flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <PsSegmented
                  ariaLabel="Time window"
                  options={[
                    { value: "this_month" as const, label: "Month" },
                    { value: "this_week" as const, label: "Week" },
                    { value: "all_time" as const, label: "All" },
                  ]}
                  value={timeWindow}
                  onChange={setTimeWindow}
                />
              </div>
              <button
                type="button"
                onClick={() => setFiltersExpanded((e) => !e)}
                className={cn(
                  ps.psFontMono,
                  "shrink-0 px-2 py-1 text-[11px] text-[color:var(--fc-accent)]",
                )}
              >
                Filters {filtersExpanded ? "▴" : "▾"}
              </button>
            </div>
            {filtersExpanded ? (
              <div className="flex flex-col gap-2 pb-1">
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
                          : "fc-btn-secondary text-[color:var(--fc-text-primary)]",
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
                        "fc-btn h-8 px-2.5 text-xs",
                        metricType === metric
                          ? "fc-btn-primary"
                          : "fc-btn-secondary text-[color:var(--fc-text-primary)]",
                      )}
                    >
                      {metric === "tonnage" ? "Tonnage" : metric.toUpperCase()}
                    </Button>
                  ))}
                </div>
                {customExerciseId ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        ps.psFontMono,
                        "rounded-md border border-[color:var(--fc-hairline)] px-2 py-1 text-[11px] fc-text-primary",
                      )}
                    >
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
                    {CORE_LIFTS.map((exercise) => (
                      <Button
                        key={exercise}
                        size="sm"
                        onClick={() => setActiveExercise(exercise)}
                        className={cn(
                          "fc-btn h-8 px-2.5 text-xs",
                          activeExercise === exercise
                            ? "fc-btn-primary"
                            : "fc-btn-secondary text-[color:var(--fc-text-primary)]",
                        )}
                      >
                        {exercise}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="fc-btn fc-btn-ghost h-8 px-2 text-xs"
                      onClick={() => setShowExerciseSearch(!showExerciseSearch)}
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
                    <div className="max-h-48 overflow-y-auto rounded-[12px] border border-[color:var(--fc-hairline)]">
                      {exerciseSearchResults.map((exercise) => (
                        <button
                          key={exercise.id}
                          type="button"
                          onClick={() => selectCustomExercise(exercise)}
                          className="w-full border-b border-[color:var(--fc-hairline)] px-3 py-2 text-left text-[color:var(--fc-text-primary)] last:border-0 hover:bg-[color:var(--fc-surface-tint)]"
                        >
                          {exercise.name}
                          {exercise.category && (
                            <span
                              className={cn(
                                ps.psFontMono,
                                "ml-2 text-[10px] text-[color:var(--fc-text-dim)]",
                              )}
                            >
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
          </div>
        </div>

        {loadError && !loading ? (
          <div className="mt-4 border-y border-[color:var(--fc-hairline)] py-8 text-center">
            <p className={cn(ps.psFontMono, "mb-4 text-sm fc-text-dim")}>
              {loadError}
            </p>
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
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--fc-group-c)] border-t-transparent" />
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="mt-4 py-8">
            <EmptyState
              icon={Trophy}
              title={
                visibility === "hidden"
                  ? "You’re hidden from the roster board"
                  : "No roster rankings yet"
              }
              description={
                visibility === "hidden"
                  ? "Switch to Public or Anonymous to appear again after your next logged set."
                  : "Complete workouts to see your ranking among your coach’s athletes."
              }
            />
          </div>
        ) : (
          <section className="mt-4 overflow-hidden rounded-[18px] border border-[color:var(--fc-hairline)] bg-transparent">
            <div className="border-b border-[color:var(--fc-hairline)] px-3 py-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 shrink-0 text-[color:var(--fc-group-c)]" />
                <h2
                  className={cn(
                    ps.psFontDisplay,
                    "text-sm font-bold tracking-tight fc-text-primary",
                  )}
                >
                  {getDisplayExerciseName()}
                </h2>
              </div>
              <p
                className={cn(
                  ps.psFontMono,
                  "mt-0.5 pl-6 text-[10px] text-[color:var(--fc-text-subtle)]",
                )}
              >
                {metricType === "tonnage"
                  ? "Total volume · coach roster"
                  : `${metricType.toUpperCase()} · coach roster`}
              </p>
            </div>
            <div>
              {leaderboardData.map((entry) =>
                flatRow(entry, { rowKey: `list-${entry.id}` }),
              )}
            </div>
          </section>
        )}

        {userRank != null && userRank > 3 ? (
          <p
            className={cn(
              ps.psFontMono,
              "px-1 pt-3 text-center text-[11px] text-[color:var(--fc-text-dim)]",
            )}
          >
            You’re #{userRank} on this roster. Push for the top.
          </p>
        ) : null}
      </div>

      <Dialog
        open={pendingHiddenConfirm}
        onOpenChange={(open) => {
          if (!open) setPendingHiddenConfirm(false);
        }}
      >
        <DialogContent className="max-w-sm border-[color:var(--fc-hairline)] bg-[color:var(--fc-bg-deep)]">
          <DialogHeader>
            <DialogTitle
              className={cn(
                ps.psFontDisplay,
                "text-lg font-bold tracking-tight",
              )}
            >
              Hide from roster board?
            </DialogTitle>
            <DialogDescription
              className={cn(
                ps.psFontMono,
                "text-[12px] text-[color:var(--fc-text-dim)]",
              )}
            >
              This removes you from your coach’s leaderboard. You can switch
              back to Public or Anonymous anytime; rankings refresh after your
              next logged set.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              className="fc-btn fc-btn-secondary h-11 rounded-lg"
              disabled={savingVisibility}
              onClick={() => setPendingHiddenConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="fc-btn fc-btn-primary h-11 rounded-lg sm:flex-1"
              disabled={savingVisibility}
              onClick={() => {
                setPendingHiddenConfirm(false);
                onVisibilityChange("hidden");
              }}
            >
              {savingVisibility ? "Hiding…" : "Hide me"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientPageShell>
  );
}
