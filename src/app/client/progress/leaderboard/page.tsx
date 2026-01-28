"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trophy, Search } from "lucide-react";
import Link from "next/link";
import { getLeaderboard, LeaderboardEntry, LeaderboardType, TimeWindow } from "@/lib/leaderboardService";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    loadLeaderboardData();
  }, [timeWindow, activeExercise, metricType, customExerciseId]);

  const loadLeaderboardData = async () => {
    setLoading(true);
    try {
      let leaderboardType: LeaderboardType;
      
      // Determine leaderboard type based on metric
      if (metricType === "tonnage") {
        if (timeWindow === "this_week") {
          leaderboardType = "tonnage_week";
        } else if (timeWindow === "this_month") {
          leaderboardType = "tonnage_month";
        } else {
          leaderboardType = "tonnage_all_time";
        }
      } else {
        // PR types
        leaderboardType = `pr_${metricType}` as LeaderboardType;
      }

      // Get exercise ID for the active exercise or custom exercise
      let exerciseId: string | undefined;
      if (customExerciseId) {
        exerciseId = customExerciseId;
      } else {
        // Find exercise by name
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
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
        <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Link href="/client/progress">
                <Button variant="ghost" size="icon" className="fc-btn fc-btn-ghost h-10 w-10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Progress Hub
                </span>
                <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                  Leaderboard
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Compete with {leaderboardData.length} athletes.
                </p>
              </div>
            </div>

            {userRank && (
              <div className="fc-glass-soft fc-card px-4 py-3 text-right">
                <p className="text-xs text-[color:var(--fc-text-subtle)]">Your Rank</p>
                <p className="text-3xl font-bold text-[color:var(--fc-accent-cyan)]">
                  #{userRank}
                </p>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard elevation={2} className="fc-glass fc-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
              Filters
            </h2>
            <p className="text-sm text-[color:var(--fc-text-dim)]">
              Choose a time window, metric, and exercise set.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                variant="fc"
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
        </GlassCard>

        <GlassCard elevation={2} className="fc-glass fc-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_8px_18px_rgba(245,158,11,0.35)]">
              <Trophy className="w-6 h-6 text-white" />
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

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-[color:var(--fc-accent-cyan)] border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-[color:var(--fc-text-subtle)]" />
              <p className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                No data yet for this exercise
              </p>
              <p className="text-sm mt-2 text-[color:var(--fc-text-dim)]">
                Be the first to log a workout.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "fc-glass-soft fc-card p-4 transition-all",
                    entry.client_id === user?.id
                      ? "border border-[color:var(--fc-accent-cyan)]/50 shadow-[0_0_0_1px_rgba(8,145,178,0.25)]"
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
                          ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white"
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
        </GlassCard>

        {/* Motivational Section */}
        {userRank && userRank > 3 && (
          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_8px_18px_rgba(245,158,11,0.35)]">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[color:var(--fc-text-primary)] mb-1">
                  Keep Climbing!
                </h3>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  You're ranked #{userRank}. Push harder to reach the top. 🔥
                </p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
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
