"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Users, Filter, Search, Play, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import { getLeaderboard, LeaderboardEntry, LeaderboardType, TimeWindow } from "@/lib/leaderboardService";
import { supabase } from "@/lib/supabase";

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
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

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

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <GlassCard elevation={1} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Link href="/client/progress">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div>
                  <h1
                    className="text-3xl font-bold mb-1"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Leaderboard
                  </h1>
                  <p
                    className="text-sm"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Compete with {leaderboardData.length} athletes
                  </p>
                </div>
              </div>

              {userRank && (
                <div className="text-right">
                  <p
                    className="text-sm"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Your Rank
                  </p>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: getSemanticColor("energy").primary }}
                  >
                    #{userRank}
                  </p>
                </div>
              )}
            </div>

            {/* Time Window Selector */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant={timeWindow === "this_month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeWindow("this_month")}
                style={
                  timeWindow === "this_month"
                    ? {
                        background: getSemanticColor("trust").gradient,
                        boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
                      }
                    : {}
                }
              >
                This Month
              </Button>
              <Button
                variant={timeWindow === "this_week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeWindow("this_week")}
                style={
                  timeWindow === "this_week"
                    ? {
                        background: getSemanticColor("trust").gradient,
                        boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
                      }
                    : {}
                }
              >
                This Week
              </Button>
              <Button
                variant={timeWindow === "all_time" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeWindow("all_time")}
                style={
                  timeWindow === "all_time"
                    ? {
                        background: getSemanticColor("trust").gradient,
                        boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
                      }
                    : {}
                }
              >
                All Time
              </Button>
            </div>

            {/* Metric Type Selector */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant={metricType === "1rm" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMetricType("1rm")}
                style={
                  metricType === "1rm"
                    ? {
                        background: getSemanticColor("energy").gradient,
                        boxShadow: `0 4px 12px ${getSemanticColor("energy").primary}30`,
                      }
                    : {}
                }
              >
                1RM
              </Button>
              <Button
                variant={metricType === "3rm" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMetricType("3rm")}
                style={
                  metricType === "3rm"
                    ? {
                        background: getSemanticColor("energy").gradient,
                        boxShadow: `0 4px 12px ${getSemanticColor("energy").primary}30`,
                      }
                    : {}
                }
              >
                3RM
              </Button>
              <Button
                variant={metricType === "5rm" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMetricType("5rm")}
                style={
                  metricType === "5rm"
                    ? {
                        background: getSemanticColor("energy").gradient,
                        boxShadow: `0 4px 12px ${getSemanticColor("energy").primary}30`,
                      }
                    : {}
                }
              >
                5RM
              </Button>
              <Button
                variant={metricType === "tonnage" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMetricType("tonnage")}
                style={
                  metricType === "tonnage"
                    ? {
                        background: getSemanticColor("energy").gradient,
                        boxShadow: `0 4px 12px ${getSemanticColor("energy").primary}30`,
                      }
                    : {}
                }
              >
                Tonnage
              </Button>
            </div>

            {/* Lift Set Selector */}
            {!customExerciseId && (
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant={liftSet === "A" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLiftSet("A")}
                  style={
                    liftSet === "A"
                      ? {
                          background: getSemanticColor("success").gradient,
                          boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
                        }
                      : {}
                  }
                >
                  {LIFT_SETS.A.name}
                </Button>
                <Button
                  variant={liftSet === "B" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLiftSet("B")}
                  style={
                    liftSet === "B"
                      ? {
                          background: getSemanticColor("success").gradient,
                          boxShadow: `0 4px 12px ${getSemanticColor("success").primary}30`,
                        }
                      : {}
                  }
                >
                  {LIFT_SETS.B.name}
                </Button>
              </div>
            )}

            {/* Exercise Tabs or Custom Exercise */}
            {customExerciseId ? (
              <div className="flex items-center gap-2">
                <Badge
                  className="px-4 py-2"
                  style={{
                    background: getSemanticColor("warning").gradient,
                    color: "#fff",
                  }}
                >
                  {customExerciseName}
                </Badge>
                <Button variant="ghost" size="sm" onClick={clearCustomExercise}>
                  Clear
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {LIFT_SETS[liftSet].exercises.map((exercise) => (
                  <Button
                    key={exercise}
                    variant={activeExercise === exercise ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveExercise(exercise)}
                    style={
                      activeExercise === exercise
                        ? {
                            background: getSemanticColor("warning").gradient,
                            boxShadow: `0 4px 12px ${getSemanticColor("warning").primary}30`,
                          }
                        : {}
                    }
                  >
                    {exercise}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExerciseSearch(!showExerciseSearch)}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Choose Exercise
                </Button>
              </div>
            )}

            {/* Exercise Search */}
            {showExerciseSearch && (
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Search for an exercise..."
                  value={searchQuery}
                  onChange={(e) => handleExerciseSearch(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    color: isDark ? "#fff" : "#1A1A1A",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}`,
                  }}
                />
                {exerciseSearchResults.length > 0 && (
                  <div
                    className="mt-2 rounded-lg p-2 max-h-48 overflow-y-auto"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                    }}
                  >
                    {exerciseSearchResults.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => selectCustomExercise(exercise)}
                        className="w-full text-left px-3 py-2 rounded hover:bg-opacity-10 hover:bg-white"
                        style={{
                          color: isDark ? "#fff" : "#1A1A1A",
                        }}
                      >
                        {exercise.name}
                        {exercise.category && (
                          <span
                            className="text-xs ml-2"
                            style={{
                              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                            }}
                          >
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
        </div>

        {/* Leaderboard */}
        <GlassCard elevation={2} className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                boxShadow: "0 4px 12px rgba(255, 215, 0, 0.3)",
              }}
            >
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                {getDisplayExerciseName()} Rankings
              </h2>
              <p
                className="text-sm"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                {metricType === "tonnage" ? "Total Volume" : `${metricType.toUpperCase()} Personal Records`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center py-12">
              <Trophy
                className="w-16 h-16 mx-auto mb-4"
                style={{
                  color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                }}
              />
              <p
                className="text-lg font-semibold"
                style={{
                  color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                }}
              >
                No data yet for this exercise
              </p>
              <p
                className="text-sm mt-2"
                style={{
                  color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                }}
              >
                Be the first to log a workout!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-lg transition-all ${
                    entry.client_id === user?.id ? "ring-2" : ""
                  }`}
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                    ...(entry.client_id === user?.id && {
                      border: `2px solid ${getSemanticColor("energy").primary}`,
                      boxShadow: `0 0 0 2px ${getSemanticColor("energy").primary}40`,
                    }),
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                      style={{
                        background:
                          entry.rank === 1
                            ? "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)"
                            : entry.rank === 2
                            ? "linear-gradient(135deg, #C0C0C0 0%, #808080 100%)"
                            : entry.rank === 3
                            ? "linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)"
                            : isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.05)",
                        color: entry.rank <= 3 ? "#fff" : isDark ? "#fff" : "#1A1A1A",
                      }}
                    >
                      {entry.rank}
                    </div>

                    {/* Name */}
                    <div className="flex-1">
                      <p
                        className="font-semibold"
                        style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                      >
                        {entry.is_anonymous ? "Anonymous" : entry.display_name}
                      </p>
                      <p
                        className="text-xs"
                        style={{
                          color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                        }}
                      >
                        {entry.time_window && `Updated ${new Date(entry.last_updated).toLocaleDateString()}`}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p
                        className="text-2xl font-bold"
                        style={{ color: getSemanticColor("energy").primary }}
                      >
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
          <div className="mt-8">
            <GlassCard elevation={2} className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                    boxShadow: "0 4px 12px rgba(255, 215, 0, 0.3)",
                  }}
                >
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3
                    className="text-lg font-bold mb-1"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Keep Climbing!
                  </h3>
                  <p
                    className="text-sm"
                    style={{
                      color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                    }}
                  >
                    You're ranked #{userRank}. Push harder to reach the top! 🔥
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
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
