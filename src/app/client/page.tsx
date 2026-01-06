"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  Play,
  Dumbbell,
  Flame,
  TrendingDown,
  Zap,
  Layers,
  Award,
  LayoutGrid,
  Calendar,
  BarChart2,
  Plus,
  Scale,
  Utensils,
  FileText,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  getDashboardStats,
  getClientType,
  getNextSession,
} from "@/lib/clientDashboardService";
import { fetchPersonalRecords } from "@/lib/personalRecords";

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", emoji: "🌅" };
  if (hour < 17) return { text: "Good afternoon", emoji: "🌞" };
  return { text: "Good evening", emoji: "🌙" };
}

export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [todaysWorkout, setTodaysWorkout] = useState<any>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(true);
  const [streak, setStreak] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState({ current: 0, goal: 0 });
  const [weeklyVolume, setWeeklyVolume] = useState(0); // in kg
  const [weeklyTime, setWeeklyTime] = useState(0); // in minutes
  const [prsCount, setPrsCount] = useState(0);
  const [bodyWeight, setBodyWeight] = useState<{
    current: number;
    change: number;
  } | null>(null);
  const [maxDeadlift, setMaxDeadlift] = useState<{
    weight: number;
    change: number;
  } | null>(null);
  const [totalSets, setTotalSets] = useState(0);
  const [clientType, setClientType] = useState<"online" | "in_gym" | null>(
    null
  );
  const [nextSession, setNextSession] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const greeting = getTimeBasedGreeting();

  // Fetch avatar URL
  useEffect(() => {
    if (user?.id) {
      (async () => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .single();
          if (data?.avatar_url) {
            setAvatarUrl(data.avatar_url);
          }
        } catch {
          // Silently fail - avatar is optional
        }
      })();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoadingWorkout(true);
      const today = new Date().toISOString().split("T")[0];

      // Fetch dashboard stats (streak, weekly progress)
      const stats = await getDashboardStats(user.id);
      setStreak(stats.streak);
      setWeeklyProgress(stats.weeklyProgress);

      // Fetch client type
      const type = await getClientType(user.id);
      setClientType(type);

      // Fetch next session if in_gym client
      if (type === "in_gym") {
        const session = await getNextSession(user.id);
        setNextSession(session);
      }

      // Fetch today's workout assignment using service (includes total sets)
      const { getTodaysWorkout } = await import("@/lib/clientDashboardService");
      const workout = await getTodaysWorkout(user.id);
      if (workout) {
        setTodaysWorkout(workout);
        setTotalSets(workout.totalSets || 0);
      }

      // Fetch weekly volume and time
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const { data: weeklyLogs } = await supabase
        .from("workout_logs")
        .select("id, completed_at, total_duration_minutes")
        .eq("client_id", user.id)
        .not("completed_at", "is", null)
        .gte("completed_at", monday.toISOString())
        .lte("completed_at", sunday.toISOString());

      const activeTime =
        weeklyLogs?.reduce(
          (sum, log) => sum + (log.total_duration_minutes || 0),
          0
        ) || 0;
      setWeeklyTime(activeTime);

      // Calculate weekly volume from workout_set_logs
      if (weeklyLogs && weeklyLogs.length > 0) {
        const logIds = weeklyLogs.map((log) => log.id);
        const { data: setLogs } = await supabase
          .from("workout_set_logs")
          .select("weight, reps")
          .in("workout_log_id", logIds)
          .eq("client_id", user.id);

        const totalVolume =
          setLogs?.reduce(
            (sum, set) => sum + (set.weight || 0) * (set.reps || 0),
            0
          ) || 0;
        setWeeklyVolume(Math.round((totalVolume / 1000) * 10) / 10); // Convert to tons (kg*1000) and round to 1 decimal for display as "k"
      }

      // Fetch PRs count
      try {
        const prs = await fetchPersonalRecords(user.id);
        setPrsCount(prs.length);
      } catch (error) {
        console.error("Error fetching PRs:", error);
      }

      // Fetch body weight
      try {
        const { data: metrics } = await supabase
          .from("body_metrics")
          .select("weight_kg, measured_date")
          .eq("client_id", user.id)
          .not("weight_kg", "is", null)
          .order("measured_date", { ascending: false })
          .limit(2);

        if (metrics && metrics.length > 0) {
          const current = metrics[0].weight_kg;
          const previous = metrics.length > 1 ? metrics[1].weight_kg : current;
          const change = current - previous;
          setBodyWeight({ current, change });
        }
      } catch (error) {
        console.error("Error fetching body weight:", error);
      }

      // Fetch max deadlift from PRs
      try {
        const prs = await fetchPersonalRecords(user.id);
        const deadliftPRs = prs.filter((pr) =>
          pr.exerciseName.toLowerCase().includes("deadlift")
        );

        if (deadliftPRs.length > 0) {
          // Get the max weight deadlift PR
          const maxDeadliftPR = deadliftPRs.reduce((max, pr) =>
            pr.weight > max.weight ? pr : max
          );

          // Try to find previous max for comparison (simplified - just use first PR as baseline)
          const previousMax =
            deadliftPRs.length > 1
              ? deadliftPRs[1].weight
              : maxDeadliftPR.weight;

          setMaxDeadlift({
            weight: maxDeadliftPR.weight,
            change: maxDeadliftPR.weight - previousMax,
          });
        }
      } catch (error) {
        console.error("Error fetching max deadlift:", error);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoadingWorkout(false);
    }
  };

  const weeklyProgressPercent =
    weeklyProgress.goal > 0
      ? Math.min((weeklyProgress.current / weeklyProgress.goal) * 100, 100)
      : 0;

  // Crystalline kinetic card style
  const crystalCardStyle: React.CSSProperties = {
    background: isDark
      ? "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)"
      : "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
    borderRadius: "24px",
    position: "relative" as const,
    overflow: "hidden" as const,
  };

  const getAvatarUrl = () => {
    if (avatarUrl) return avatarUrl;
    if (profile?.first_name) {
      const firstName = profile.first_name;
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${
      user?.id || "User"
    }`;
  };

  const userName = profile?.first_name || "there";

  return (
    <ProtectedRoute requiredRole="client">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shine {
          0% { transform: translate(-30%, -30%); }
          100% { transform: translate(30%, 30%); }
        }
        @keyframes pulse-fire {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.05); filter: brightness(1.2); }
        }
        .kinetic-shimmer::after {
          content: '';
          position: absolute;
          top: -100%;
          left: -100%;
          width: 300%;
          height: 300%;
          background: linear-gradient(45deg, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%);
          animation: shine 6s infinite linear;
        }
        .streak-badge {
          animation: pulse-fire 2s infinite ease-in-out;
        }
      `,
        }}
      />
      <div className="relative" style={{ isolation: "isolate" }}>
        <AnimatedBackground>
          {/* Gray overlay for dark mode - covers AnimatedBackground's purple gradient with gray */}
          {isDark && (
            <div
              className="fixed inset-0 pointer-events-none"
              style={{
                background: performanceSettings.animatedBackground
                  ? "linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 50%, #0F0F0F 100%)"
                  : "linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 100%)",
                backgroundSize: performanceSettings.animatedBackground
                  ? "100% 200%"
                  : undefined,
                backgroundPosition: performanceSettings.animatedBackground
                  ? "0% 50%"
                  : undefined,
                animation: performanceSettings.animatedBackground
                  ? "gradientShift 10s ease-in-out infinite"
                  : undefined,
                zIndex: 1,
              }}
            />
          )}

          <div style={{ position: "relative", zIndex: 2 }}>
            <FloatingParticles enabled count={15} />

            <div className="min-h-screen pb-32 pt-6 px-4 md:px-8">
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Top Header */}
                <header className="flex justify-between items-center mb-8">
                  <div>
                    <h1
                      className="text-[30px] font-bold leading-tight tracking-tight mb-1"
                      style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                    >
                      {greeting.text}, {userName}!
                    </h1>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Ready to crush your goals today?
                    </p>
                  </div>
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full border-2 overflow-hidden"
                      style={{
                        borderColor: isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.1)",
                        ...crystalCardStyle,
                      }}
                    >
                      <img
                        src={getAvatarUrl()}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2"
                      style={{
                        background: getSemanticColor("success").primary,
                        borderColor: isDark ? "#0A0A0A" : "#FFFFFF",
                      }}
                    />
                  </div>
                </header>

                {/* Workout Recommendation Hero */}
                <section className="mb-8">
                  <div
                    className="p-6 flex flex-col md:flex-row md:items-center gap-6 relative kinetic-shimmer"
                    style={crystalCardStyle}
                  >
                    <div className="flex-1 relative z-10">
                      {loadingWorkout ? (
                        <div className="text-center py-8">
                          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                        </div>
                      ) : todaysWorkout ? (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className="px-3 py-1 rounded-full text-xs font-medium border tracking-wide uppercase"
                              style={{
                                background: isDark
                                  ? "rgba(59, 130, 246, 0.2)"
                                  : "rgba(59, 130, 246, 0.1)",
                                color: "#3B82F6",
                                borderColor: isDark
                                  ? "rgba(59, 130, 246, 0.3)"
                                  : "rgba(59, 130, 246, 0.2)",
                              }}
                            >
                              Today's Protocol
                            </span>
                            <span
                              className="text-xs font-mono"
                              style={{
                                color: isDark
                                  ? "rgba(255,255,255,0.6)"
                                  : "rgba(0,0,0,0.6)",
                              }}
                            >
                              ~{todaysWorkout.estimatedDuration} min
                            </span>
                          </div>
                          <h2
                            className="text-3xl font-bold mb-2"
                            style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                          >
                            {todaysWorkout.name}
                          </h2>
                          <div
                            className="flex items-center gap-4 mb-6"
                            style={{
                              color: isDark
                                ? "rgba(255,255,255,0.7)"
                                : "rgba(0,0,0,0.7)",
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <Dumbbell className="w-4 h-4" />
                              <span className="text-sm">
                                {todaysWorkout.exercises} Exercises
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Layers className="w-4 h-4" />
                              <span className="text-sm">
                                {totalSets} Sets total
                              </span>
                            </div>
                          </div>
                          <Link
                            href={`/client/workouts/${todaysWorkout.id}/start`}
                          >
                            <button
                              className="w-full md:w-auto px-8 h-12 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all active:scale-95 hover:-translate-y-0.5"
                              style={{
                                background:
                                  "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
                                boxShadow: "0 4px 16px rgba(239, 68, 68, 0.3)",
                                color: "#FFFFFF",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow =
                                  "0 6px 20px rgba(239, 68, 68, 0.4)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow =
                                  "0 4px 16px rgba(239, 68, 68, 0.3)";
                              }}
                            >
                              <Play className="w-5 h-5 fill-current" />
                              Start Workout
                            </button>
                          </Link>
                        </>
                      ) : (
                        <div>
                          <h2
                            className="text-3xl font-bold mb-2"
                            style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                          >
                            No workout assigned
                          </h2>
                          <p
                            className="text-sm mb-6"
                            style={{
                              color: isDark
                                ? "rgba(255,255,255,0.6)"
                                : "rgba(0,0,0,0.6)",
                            }}
                          >
                            Your coach will assign today's session soon
                          </p>
                          <Link href="/client/workouts">
                            <button
                              className="px-6 h-12 rounded-xl font-semibold border transition-all hover:-translate-y-0.5"
                              style={{
                                background: isDark
                                  ? "rgba(59, 130, 246, 0.1)"
                                  : "rgba(59, 130, 246, 0.05)",
                                borderColor: isDark
                                  ? "rgba(59, 130, 246, 0.4)"
                                  : "rgba(59, 130, 246, 0.3)",
                                color: "#3B82F6",
                              }}
                            >
                              Browse Workouts
                            </button>
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Weekly Progress Ring - Hidden on mobile, shown on desktop */}
                    {!loadingWorkout && weeklyProgress.goal > 0 && (
                      <div className="hidden md:block w-48 h-48 relative flex-shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke={
                              isDark
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.05)"
                            }
                            strokeWidth="8"
                          />
                          <defs>
                            <linearGradient
                              id="weeklyGradient"
                              x1="0%"
                              y1="0%"
                              x2="100%"
                              y2="100%"
                            >
                              <stop offset="0%" stopColor="#EF4444" />
                              <stop offset="100%" stopColor="#3B82F6" />
                            </linearGradient>
                          </defs>
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="url(#weeklyGradient)"
                            strokeWidth="8"
                            strokeDasharray="283"
                            strokeDashoffset={
                              283 - (weeklyProgressPercent / 100) * 283
                            }
                            strokeLinecap="round"
                            className="transition-all duration-800 ease-in-out"
                            style={{
                              transform: "rotate(-90deg)",
                              transformOrigin: "50% 50%",
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span
                            className="text-2xl font-bold"
                            style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                          >
                            {Math.round(weeklyProgressPercent)}%
                          </span>
                          <span
                            className="text-[10px] uppercase tracking-widest"
                            style={{
                              color: isDark
                                ? "rgba(255,255,255,0.6)"
                                : "rgba(0,0,0,0.6)",
                            }}
                          >
                            Weekly Goal
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Stats Snapshot Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Card 1: Weekly Activity */}
                  <div className="p-6" style={crystalCardStyle}>
                    <div className="flex justify-between items-start mb-6">
                      <h3
                        className="text-xl font-semibold leading-tight"
                        style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                      >
                        Weekly Activity
                      </h3>
                      {streak > 0 && (
                        <div
                          className="flex items-center gap-1 px-3 py-1 rounded-full streak-badge"
                          style={{
                            background:
                              "linear-gradient(45deg, #F59E0B, #EF4444)",
                          }}
                        >
                          <Flame className="w-4 h-4 text-white" />
                          <span className="text-xs font-bold tracking-tighter text-white">
                            {streak}-DAY STREAK
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <div
                          className="text-xs mb-1"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.6)",
                          }}
                        >
                          Workouts
                        </div>
                        <div
                          className="text-xl font-bold font-mono"
                          style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                        >
                          {weeklyProgress.current}
                          <span
                            style={{
                              color: isDark
                                ? "rgba(255,255,255,0.5)"
                                : "rgba(0,0,0,0.5)",
                              fontSize: "14px",
                            }}
                          >
                            /{weeklyProgress.goal || 0}
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div
                          className="text-xs mb-1"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.6)",
                          }}
                        >
                          Volume
                        </div>
                        <div
                          className="text-xl font-bold font-mono"
                          style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                        >
                          {weeklyVolume > 0 ? `${weeklyVolume}k` : "0"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div
                          className="text-xs mb-1"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.6)",
                          }}
                        >
                          Time
                        </div>
                        <div
                          className="text-xl font-bold font-mono"
                          style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                        >
                          {weeklyTime}m
                        </div>
                      </div>
                      <div className="text-center">
                        <div
                          className="text-xs mb-1"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.6)",
                          }}
                        >
                          PRs
                        </div>
                        <div
                          className="text-xl font-bold font-mono"
                          style={{ color: getSemanticColor("success").primary }}
                        >
                          {prsCount}
                        </div>
                      </div>
                    </div>
                    {/* Simple Activity Indicator */}
                    <div className="flex gap-1 h-3">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const dayProgress =
                          i <
                          Math.floor(
                            (weeklyProgress.current /
                              (weeklyProgress.goal || 1)) *
                              7
                          )
                            ? weeklyProgress.goal > 0
                              ? 1
                              : 0
                            : 0;
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-sm"
                            style={{
                              background:
                                dayProgress > 0
                                  ? getSemanticColor("success").primary
                                  : isDark
                                  ? "rgba(255,255,255,0.1)"
                                  : "rgba(0,0,0,0.05)",
                              opacity: dayProgress > 0 ? 1 : 0.2,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 2: Progress Snapshot */}
                  <div className="p-6" style={crystalCardStyle}>
                    <h3
                      className="text-xl font-semibold leading-tight mb-6"
                      style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                    >
                      Progress Snapshot
                    </h3>
                    <div className="space-y-6">
                      {bodyWeight && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{
                                background: isDark
                                  ? "rgba(59, 130, 246, 0.1)"
                                  : "rgba(59, 130, 246, 0.05)",
                              }}
                            >
                              <TrendingDown
                                className="w-5 h-5"
                                style={{ color: "#3B82F6" }}
                              />
                            </div>
                            <div>
                              <div
                                className="text-xs"
                                style={{
                                  color: isDark
                                    ? "rgba(255,255,255,0.6)"
                                    : "rgba(0,0,0,0.6)",
                                }}
                              >
                                Body Weight
                              </div>
                              <div
                                className="font-semibold"
                                style={{
                                  color: isDark ? "#FFFFFF" : "#1A1A1A",
                                }}
                              >
                                {bodyWeight.current.toFixed(1)} kg
                              </div>
                            </div>
                          </div>
                          <div
                            className="text-sm font-medium"
                            style={{
                              color: getSemanticColor("success").primary,
                            }}
                          >
                            {bodyWeight.change !== 0 ? (
                              <>
                                {bodyWeight.change > 0 ? "+" : ""}
                                {bodyWeight.change.toFixed(1)}kg this month{" "}
                                {bodyWeight.change < 0 ? "↓" : "↑"}
                              </>
                            ) : (
                              "No change"
                            )}
                          </div>
                        </div>
                      )}
                      {maxDeadlift && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{
                                background: isDark
                                  ? "rgba(239, 68, 68, 0.1)"
                                  : "rgba(239, 68, 68, 0.05)",
                              }}
                            >
                              <Zap
                                className="w-5 h-5"
                                style={{ color: "#EF4444" }}
                              />
                            </div>
                            <div>
                              <div
                                className="text-xs"
                                style={{
                                  color: isDark
                                    ? "rgba(255,255,255,0.6)"
                                    : "rgba(0,0,0,0.6)",
                                }}
                              >
                                Max Deadlift
                              </div>
                              <div
                                className="font-semibold"
                                style={{
                                  color: isDark ? "#FFFFFF" : "#1A1A1A",
                                }}
                              >
                                {maxDeadlift.weight} kg
                              </div>
                            </div>
                          </div>
                          <div
                            className="text-sm font-medium"
                            style={{
                              color: getSemanticColor("success").primary,
                            }}
                          >
                            {maxDeadlift.change !== 0 ? (
                              <>
                                {maxDeadlift.change > 0 ? "+" : ""}
                                {maxDeadlift.change}kg{" "}
                                {maxDeadlift.change > 0 ? "↑" : "↓"}
                              </>
                            ) : (
                              "No change"
                            )}
                          </div>
                        </div>
                      )}
                      {!bodyWeight && !maxDeadlift && (
                        <div
                          className="text-sm text-center py-4"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(0,0,0,0.6)",
                          }}
                        >
                          No progress data available yet
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Quick Actions Grid */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {/* Check Ins */}
                  <Link href="/client/progress/body-metrics">
                    <div
                      className="p-5 h-full transition-all cursor-pointer hover:scale-[1.02]"
                      style={crystalCardStyle}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                        style={{
                          background:
                            "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                          boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                        }}
                      >
                        <Scale className="w-6 h-6 text-white" />
                      </div>
                      <h4
                        className="text-base font-bold mb-1"
                        style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                      >
                        Check Ins
                      </h4>
                      <p
                        className="text-xs"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(0,0,0,0.6)",
                        }}
                      >
                        Log body metrics
                      </p>
                    </div>
                  </Link>

                  {/* Log Meal */}
                  <Link href="/client/nutrition">
                    <div
                      className="p-5 h-full transition-all cursor-pointer hover:scale-[1.02]"
                      style={crystalCardStyle}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                        style={{
                          background:
                            "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        <Utensils className="w-6 h-6 text-white" />
                      </div>
                      <h4
                        className="text-base font-bold mb-1"
                        style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                      >
                        Log Meal
                      </h4>
                      <p
                        className="text-xs"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(0,0,0,0.6)",
                        }}
                      >
                        Track nutrition
                      </p>
                    </div>
                  </Link>

                  {/* Workout Logs */}
                  <Link href="/client/progress/workout-logs">
                    <div
                      className="p-5 h-full transition-all cursor-pointer hover:scale-[1.02]"
                      style={crystalCardStyle}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                        style={{
                          background:
                            "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                          boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
                        }}
                      >
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <h4
                        className="text-base font-bold mb-1"
                        style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                      >
                        Workout Logs
                      </h4>
                      <p
                        className="text-xs"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(0,0,0,0.6)",
                        }}
                      >
                        View history
                      </p>
                    </div>
                  </Link>

                  {/* Analytics */}
                  <Link href="/client/progress/analytics">
                    <div
                      className="p-5 h-full transition-all cursor-pointer hover:scale-[1.02]"
                      style={crystalCardStyle}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                        style={{
                          background:
                            "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                          boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                        }}
                      >
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                      <h4
                        className="text-base font-bold mb-1"
                        style={{ color: isDark ? "#FFFFFF" : "#1A1A1A" }}
                      >
                        Analytics
                      </h4>
                      <p
                        className="text-xs"
                        style={{
                          color: isDark
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(0,0,0,0.6)",
                        }}
                      >
                        View insights
                      </p>
                    </div>
                  </Link>
                </section>
              </div>
            </div>

            {/* Bottom Navigation */}
            <nav
              className="fixed bottom-0 left-0 right-0 p-4 z-50"
              style={{
                background: isDark
                  ? "rgba(10, 10, 10, 0.8)"
                  : "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                borderTop: `1px solid ${
                  isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                }`,
              }}
            >
              <div className="max-w-screen-xl mx-auto flex items-center gap-4">
                {/* Nav Items */}
                <div className="flex flex-1 justify-around md:justify-start md:gap-12">
                  <Link
                    href="/client"
                    className="flex flex-col items-center gap-1"
                  >
                    <LayoutGrid
                      className="w-6 h-6"
                      style={{ color: "#EF4444" }}
                    />
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "#EF4444" }}
                    >
                      Dash
                    </span>
                  </Link>
                  <Link
                    href="/client/workouts"
                    className="flex flex-col items-center gap-1"
                  >
                    <Calendar
                      className="w-6 h-6"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.5)",
                      }}
                    />
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.5)",
                      }}
                    >
                      Plan
                    </span>
                  </Link>
                  <Link
                    href="/client/progress"
                    className="flex flex-col items-center gap-1"
                  >
                    <BarChart2
                      className="w-6 h-6"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.5)",
                      }}
                    />
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.5)",
                      }}
                    >
                      Stats
                    </span>
                  </Link>
                </div>

                {/* Central Floating CTA */}
                <button
                  onClick={() => {
                    // Quick log action - could open a modal or navigate to a quick log page
                    if (todaysWorkout) {
                      window.location.href = `/client/workouts/${todaysWorkout.id}/start`;
                    } else {
                      window.location.href = "/client/workouts";
                    }
                  }}
                  className="flex-none w-14 h-14 md:w-auto md:px-6 rounded-2xl flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-95 hover:-translate-y-0.5"
                  style={{
                    background:
                      "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
                    boxShadow: "0 4px 16px rgba(239, 68, 68, 0.3)",
                    color: "#FFFFFF",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 6px 20px rgba(239, 68, 68, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 4px 16px rgba(239, 68, 68, 0.3)";
                  }}
                >
                  <Plus className="w-6 h-6" />
                  <span className="hidden md:block font-bold">Quick Log</span>
                </button>
              </div>
            </nav>
          </div>
        </AnimatedBackground>
      </div>
    </ProtectedRoute>
  );
}
