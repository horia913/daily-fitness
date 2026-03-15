"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trophy, Search } from "lucide-react";
import Link from "next/link";
import { getLeaderboard, LeaderboardEntry, LeaderboardType, TimeWindow } from "@/lib/leaderboardService";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

// Lift set configurations
const LIFT_SETS = {
  A: {
    name: "Set A",
    exercises: ["Squat", "Bench Press", "Deadlift"],
  },
  B: {
    name: "Set B",
    exercises: ["Squat", "Hip Thrust", "Deadlift"],
  },
};

type LiftSet = "A" | "B";
type MetricType = "1rm" | "3rm" | "5rm" | "tonnage";

function LeaderboardPageContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("this_month");
  const [liftSet, setLiftSet] = useState<LiftSet>("A");
  const [activeExercise, setActiveExercise] = useState<string>("Squat");
  const [metricType, setMetricType] = useState<MetricType>("1rm");
  const [customExerciseId, setCustomExerciseId] = useState<string | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState<string | null>(null);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [exerciseSearchResults, setExerciseSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLeaderboardData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setLoadingStartedAt(Date.now());
    try {
      let leaderboardType: LeaderboardType;
      
      if (metricType === "tonnage") {
        if (timeWindow === "this_week") {
          leaderboardType = "tonnage_week";
        } else if (timeWindow === "this_month") {
          leaderboardType = "tonnage_month";
        } else {
          leaderboardType = "tonnage_all_time";
        }
      } else {
        leaderboardType = `pr_${metricType}` as LeaderboardType;
      }

      let exerciseId: string | undefined;
      if (customExerciseId) {
        exerciseId = customExerciseId;
      } else {
        const { data: exerciseData } = await supabase
          .from("exercises")
          .select("id")
          .ilike("name", activeExercise)
          .limit(1)
          .maybeSingle();
        
        exerciseId = exerciseData?.id;
      }

      const data = await getLeaderboard(leaderboardType, exerciseId, timeWindow);
      setLeaderboardData(data);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      setLoadError(error instanceof Error ? error.message : "Failed to load leaderboard");
      setLeaderboardData([]);
    } finally {
      setLoading(false);
      setLoadingStartedAt(null);
    }
  }, [timeWindow, activeExercise, metricType, customExerciseId]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setLoadError("Loading took too long. Tap Retry to try again.");
    }, 20_000);
    loadLeaderboardData().finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [loadLeaderboardData, timeWindow, activeExercise, metricType, customExerciseId]);

  const handleExerciseSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setExerciseSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from("exercises")
      .select("id, name, category")
      .ilike("name", `%${query}%`)
      .limit(10);

    setExerciseSearchResults(data || []);
  };

  const selectCustomExercise = (exercise: any) => {
    setCustomExerciseId(exercise.id);
    setCustomExerciseName(exercise.name);
    setShowExerciseSearch(false);
    setSearchQuery("");
    setExerciseSearchResults([]);
  };

  const clearCustomExercise = () => {
    setCustomExerciseId(null);
    setCustomExerciseName(null);
  };

  const getDisplayExerciseName = () => {
    if (customExerciseName) return customExerciseName;
    return activeExercise;
  };

  const formatScore = (score: number, type: MetricType) => {
    if (type === "tonnage") {
      return `${Math.round(score)} kg`;
    }
    return `${score.toFixed(1)} kg`;
  };

  const getRankTrend = (rank: number) => {
    // For now, we don't have previous rank data, so neutral
    return "same";
  };

  const currentUserEntry = leaderboardData.find((entry) => entry.client_id === user?.id);
  const userRank = currentUserEntry?.rank || null;

  function LeaderboardBody() {
    return (
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32 pt-8 sm:px-6 lg:px-10 fc-page space-y-8">
        <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 sm:p-10">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Link href="/client/progress" className="fc-surface w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-glass-border)]">
              <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
            </Link>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-[color:var(--fc-accent)] shrink-0" style={{ backgroundColor: "var(--fc-aurora)", opacity: 0.2 }}>
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                  Global ranks
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                  Comparing with {leaderboardData.length} athletes
                </p>
              </div>
            </div>
          </div>
        </div>

        {currentUserEntry && (
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6 border-l-4 border-l-[color:var(--fc-accent-blue)]">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold fc-text-primary mb-1">
                  You&apos;re #{currentUserEntry.rank} of {leaderboardData.length}
                </h2>
                <p className="text-sm fc-text-dim mb-4">
                  Your score: <span className="font-mono font-bold fc-text-primary">{formatScore(currentUserEntry.score ?? 0, metricType)}</span>
                </p>
              </div>
              <div className="fc-glass-soft px-4 py-3 rounded-xl border border-[color:var(--fc-glass-border)]">
                <p className="text-xs fc-text-subtle">Your rank</p>
                <p className="text-2xl font-bold font-mono fc-text-workouts">#{currentUserEntry.rank}</p>
              </div>
            </div>
          </div>
        )}

        <div className="sticky top-0 z-10 fc-glass-soft py-4 -mx-4 px-4 sm:mx-0 sm:px-0 rounded-xl border-b border-[color:var(--fc-glass-border)] backdrop-blur-xl mb-4" style={{ backgroundColor: "var(--fc-bg-base)", opacity: 0.8 }}>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <div className="flex gap-2 p-1 fc-glass-soft rounded-xl border border-[color:var(--fc-glass-border)] w-full sm:w-auto">
            {["this_month", "this_week", "all_time"].map((window) => (
              <Button
                key={window}
                size="sm"
                onClick={() => setTimeWindow(window as TimeWindow)}
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
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["1rm", "3rm", "5rm", "tonnage"] as MetricType[]).map((metric) => (
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
              {(["A", "B"] as LiftSet[]).map((set) => (
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
              <Button variant="ghost" size="sm" className="fc-btn fc-btn-ghost" onClick={clearCustomExercise}>
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
                <Search className="w-4 h-4 mr-2" />
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
                <div className="rounded-2xl border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-glass-soft)] p-2 max-h-48 overflow-y-auto">
                  {exerciseSearchResults.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => selectCustomExercise(exercise)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[color:var(--fc-glass-highlight)] text-[color:var(--fc-text-primary)]"
                    >
                      {exercise.name}
                      {exercise.category && (
                        <span className="text-xs ml-2 text-[color:var(--fc-text-dim)]">
                          {exercise.category}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center fc-text-warning" style={{ backgroundColor: "var(--fc-status-warning)", opacity: 0.2 }}>
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                {getDisplayExerciseName()} Rankings
              </h2>
              <p className="text-sm text-[color:var(--fc-text-dim)]">
                {metricType === "tonnage" ? "Total Volume" : `${metricType.toUpperCase()} Personal Records`}
              </p>
            </div>
          </div>

          {loadError && !loading ? (
            <div className="text-center py-12">
              <p className="text-[color:var(--fc-text-dim)] mb-4">{loadError}</p>
              <button type="button" onClick={() => { setLoadError(null); loadLeaderboardData(); }} className="fc-btn fc-btn-secondary fc-press h-10 px-6 text-sm">Retry</button>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-[color:var(--fc-accent-cyan)] border-t-transparent rounded-full mx-auto"></div>
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
              {leaderboardData.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "fc-glass-soft fc-card p-4 transition-all",
                    entry.client_id === user?.id
                      ? "border-2 border-[color:var(--fc-accent-cyan)]"
                      : "border border-[color:var(--fc-glass-border)]"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0",
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

                    <div className="flex-1">
                      <p className="font-semibold text-[color:var(--fc-text-primary)]">
                        {entry.is_anonymous ? "Anonymous" : entry.display_name}
                      </p>
                      <p className="text-xs text-[color:var(--fc-text-subtle)]">
                        {entry.time_window && `Updated ${new Date(entry.last_updated).toLocaleDateString()}`}
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

        {/* Motivational Section */}
        {userRank != null && userRank > 3 ? (
          <div className="fc-surface rounded-2xl border border-[color:var(--fc-surface-card-border)] p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)] mb-1">
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
      </div>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings?.floatingParticles && <FloatingParticles />}
      <LeaderboardBody />
    </AnimatedBackground>
  );
}

export default function LeaderboardPage() {
  return (
    <ProtectedRoute>
      <LeaderboardPageContent />
    </ProtectedRoute>
  );
}
