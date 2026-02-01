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
  Calendar,
  Scale,
  Utensils,
  FileText,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { supabase, ensureAuthenticated } from "@/lib/supabase";
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
  // Track which days of the week (Mon=0, Tue=1, ... Sun=6) have completed workouts
  const [workoutDays, setWorkoutDays] = useState<boolean[]>([false, false, false, false, false, false, false]);
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
          // Ensure user is authenticated before querying
          await ensureAuthenticated();
          
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
      // Ensure user is authenticated before querying
      await ensureAuthenticated();

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

      // Track which days of the week (Mon=0 to Sun=6) had completed workouts
      const daysWithWorkouts = [false, false, false, false, false, false, false];
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      if (weeklyLogs && weeklyLogs.length > 0) {
        console.log('[Dashboard] Weekly logs for activity bars:', weeklyLogs.length, 'workouts');
        weeklyLogs.forEach((log) => {
          const logDate = new Date(log.completed_at);
          // Use getUTCDay() to avoid timezone issues - database stores UTC timestamps
          // JavaScript: Sunday=0, Monday=1, ..., Saturday=6
          // We want: Monday=0, Tuesday=1, ..., Sunday=6
          const jsDay = logDate.getUTCDay();
          const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // Convert to Mon=0, Sun=6
          console.log(`[Dashboard] Workout completed_at: ${log.completed_at} -> UTC Day: ${jsDay} -> dayIndex=${dayIndex} (${dayNames[dayIndex]})`);
          daysWithWorkouts[dayIndex] = true;
        });
        console.log('[Dashboard] Days with workouts:', daysWithWorkouts.map((v, i) => v ? dayNames[i] : null).filter(Boolean));
      }
      setWorkoutDays(daysWithWorkouts);

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
      <div className="relative fc-app-bg isolate">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}

          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-6 md:px-8">
            <div className="space-y-6">
              {/* Top Header */}
                <header className="flex justify-between items-center mb-8">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] fc-text-dim mb-2">
                      Daily Overview
                    </p>
                    <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight mb-1 fc-text-primary">
                      {greeting.text.split(" ")[0]}{" "}
                      <span className="fc-text-subtle">
                        {greeting.text.split(" ").slice(1).join(" ")}
                      </span>
                      , {userName}!
                    </h1>
                    <p className="text-sm leading-relaxed fc-text-dim">
                      Ready to crush your goals today?
                    </p>
                  </div>
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full border border-[var(--fc-glass-border)] overflow-hidden fc-glass-soft"
                    >
                      <img
                        src={getAvatarUrl()}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute -top-1 -right-1 fc-status-dot" />
                  </div>
                </header>

                {/* Workout Recommendation Hero */}
                <section className="mb-8">
                  <div className="fc-accent-workouts rounded-2xl">
                    <div
                      className="fc-glass fc-card fc-kinetic-shimmer p-6 flex flex-col md:flex-row md:items-center gap-6 relative"
                    >
                    <div className="flex-1 relative z-10">
                      {loadingWorkout ? (
                        <div className="text-center py-8">
                          <div className="animate-spin w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto"></div>
                        </div>
                      ) : todaysWorkout ? (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className="fc-pill fc-pill-glass fc-text-workouts"
                            >
                              {todaysWorkout.isProgram ? todaysWorkout.positionLabel || 'Program' : 'Next Up'}
                            </span>
                            <span className="text-xs font-mono fc-text-dim">
                              ~{todaysWorkout.estimatedDuration} min
                            </span>
                          </div>
                          <h2 className="text-3xl font-bold mb-2 fc-text-primary">
                            {todaysWorkout.name}
                          </h2>
                          {todaysWorkout.isProgram && todaysWorkout.programName && (
                            <p className="text-sm mb-2 fc-text-subtle">
                              {todaysWorkout.programName}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mb-6 fc-text-dim">
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
                            href={todaysWorkout.isProgram ? "/client/workouts" : `/client/workouts/${todaysWorkout.id}/start`}
                          >
                            <button
                              className="fc-btn fc-btn-primary fc-press w-full md:w-auto h-12 px-8 flex items-center justify-center gap-2"
                            >
                              <Play className="w-5 h-5 fill-current" />
                              Start Workout
                            </button>
                          </Link>
                        </>
                      ) : (
                        <div>
                          <h2 className="text-3xl font-bold mb-2 fc-text-primary">
                            No workout assigned
                          </h2>
                          <p className="text-sm mb-6 fc-text-dim">
                            Your coach will assign today's session soon
                          </p>
                          <Link href="/client/workouts">
                            <button
                              className="fc-btn fc-btn-secondary fc-press h-12 px-6"
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
                            stroke="rgba(255,255,255,0.08)"
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
                              <stop offset="0%" stopColor="#06B6D4" />
                              <stop offset="100%" stopColor="#A855F7" />
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
                            className="transition-all duration-800 ease-in-out fc-rotate-ring"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold fc-text-primary">
                            {Math.round(weeklyProgressPercent)}%
                          </span>
                          <span className="text-[10px] uppercase tracking-widest fc-text-dim">
                            Weekly Goal
                          </span>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                </section>

                {/* Stats Snapshot Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Card 1: Weekly Activity */}
                  <div className="fc-glass fc-card p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] fc-text-dim mb-1">
                          Snapshot
                        </p>
                        <h3 className="text-xl font-semibold leading-tight fc-text-primary">
                          Weekly Activity
                        </h3>
                      </div>
                      {/* Show NEW WEEK badge if no workouts this week, otherwise show streak */}
                      {weeklyProgress.current === 0 ? (
                        <div className="fc-pill fc-pill-glass text-cyan-400 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs font-bold tracking-tighter">
                            NEW WEEK
                          </span>
                        </div>
                      ) : streak > 0 ? (
                        <div
                          className="fc-pill fc-pill-glass fc-text-warning fc-streak-pulse flex items-center gap-1"
                        >
                          <Flame className="w-4 h-4" />
                          <span className="text-xs font-bold tracking-tighter">
                            {streak}-DAY STREAK
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* NEW WEEK state - show motivational message */}
                    {weeklyProgress.current === 0 ? (
                      <div className="text-center py-6">
                        <div className="fc-icon-tile fc-icon-workouts w-16 h-16 mx-auto mb-4">
                          <Dumbbell className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-semibold fc-text-primary mb-2">
                          New week to crush!
                        </h4>
                        <p className="text-sm fc-text-dim mb-4">
                          Start your first workout to track this week's progress
                        </p>
                        {weeklyProgress.goal > 0 && (
                          <p className="text-xs fc-text-subtle">
                            Goal: {weeklyProgress.goal} workout{weeklyProgress.goal !== 1 ? 's' : ''} this week
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Stats grid - only shown when there's activity */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                          <div className="text-center">
                            <div className="text-[11px] uppercase tracking-[0.18em] fc-text-dim mb-1">
                              Workouts
                            </div>
                            <div className="text-xl font-bold font-mono fc-text-primary">
                              {weeklyProgress.current}
                              <span className="text-sm fc-text-subtle">
                                /{weeklyProgress.goal || 0}
                              </span>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[11px] uppercase tracking-[0.18em] fc-text-dim mb-1">
                              Volume
                            </div>
                            <div className="text-xl font-bold font-mono fc-text-primary">
                              {weeklyVolume > 0 ? `${weeklyVolume}k` : "0"}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[11px] uppercase tracking-[0.18em] fc-text-dim mb-1">
                              Time
                            </div>
                            <div className="text-xl font-bold font-mono fc-text-primary">
                              {weeklyTime}m
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[11px] uppercase tracking-[0.18em] fc-text-dim mb-1">
                              PRs
                            </div>
                            <div className="text-xl font-bold font-mono fc-text-success">
                              {prsCount}
                            </div>
                          </div>
                        </div>
                        {/* Weekly Activity Indicator - Shows actual workout days */}
                        <div className="space-y-1">
                          <div className="flex gap-1">
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                              <div key={day} className="flex-1 text-center">
                                <span className="text-[9px] uppercase tracking-wider fc-text-dim">
                                  {day}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1 h-3">
                            {workoutDays.map((hasWorkout, i) => (
                              <div
                                key={i}
                                className={`flex-1 rounded-sm ${
                                  hasWorkout ? "fc-activity-on" : "fc-activity-off"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Card 2: Progress Snapshot */}
                  <div className="fc-glass fc-card p-6">
                    <p className="text-xs uppercase tracking-[0.2em] fc-text-dim mb-1">
                      Metrics
                    </p>
                    <h3 className="text-xl font-semibold leading-tight mb-6 fc-text-primary">
                      Progress Snapshot
                    </h3>
                    <div className="space-y-6">
                      {bodyWeight && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="fc-icon-tile fc-icon-neutral">
                              <TrendingDown className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.18em] fc-text-dim">
                                Body Weight
                              </div>
                              <div className="font-semibold fc-text-primary">
                                {bodyWeight.current.toFixed(1)} kg
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-medium fc-text-success">
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
                            <div className="fc-icon-tile fc-icon-workouts">
                              <Zap className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.18em] fc-text-dim">
                                Max Deadlift
                              </div>
                              <div className="font-semibold fc-text-primary">
                                {maxDeadlift.weight} kg
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-medium fc-text-success">
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
                        <div className="text-sm text-center py-4 fc-text-dim">
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
                      className="fc-glass fc-card fc-hover-rise p-5 h-full cursor-pointer"
                    >
                      <div className="fc-icon-tile fc-icon-neutral mb-3">
                        <Scale className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold mb-1 fc-text-primary">
                        Check Ins
                      </h4>
                      <p className="text-xs fc-text-dim">
                        Log body metrics
                      </p>
                    </div>
                  </Link>

                  {/* Log Meal */}
                  <Link href="/client/nutrition">
                    <div
                      className="fc-glass fc-card fc-hover-rise p-5 h-full cursor-pointer"
                    >
                      <div className="fc-icon-tile fc-icon-meals mb-3">
                        <Utensils className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold mb-1 fc-text-primary">
                        Log Meal
                      </h4>
                      <p className="text-xs fc-text-dim">
                        Track nutrition
                      </p>
                    </div>
                  </Link>

                  {/* Workout Logs */}
                  <Link href="/client/progress/workout-logs">
                    <div
                      className="fc-glass fc-card fc-hover-rise p-5 h-full cursor-pointer"
                    >
                      <div className="fc-icon-tile fc-icon-workouts mb-3">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold mb-1 fc-text-primary">
                        Workout Logs
                      </h4>
                      <p className="text-xs fc-text-dim">
                        View history
                      </p>
                    </div>
                  </Link>

                  {/* Analytics */}
                  <Link href="/client/progress/analytics">
                    <div
                      className="fc-glass fc-card fc-hover-rise p-5 h-full cursor-pointer"
                    >
                      <div className="fc-icon-tile fc-icon-neutral mb-3">
                        <Activity className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold mb-1 fc-text-primary">
                        Analytics
                      </h4>
                      <p className="text-xs fc-text-dim">
                        View insights
                      </p>
                    </div>
                  </Link>

                  {/* Session Scheduling */}
                  <Link href="/client/scheduling">
                    <div
                      className="fc-glass fc-card fc-hover-rise p-5 h-full cursor-pointer"
                    >
                      <div className="fc-icon-tile fc-icon-neutral mb-3">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold mb-1 fc-text-primary">
                        Book Session
                      </h4>
                      <p className="text-xs fc-text-dim">
                        Schedule with coach
                      </p>
                    </div>
                  </Link>
                </section>
            </div>
          </div>
        </AnimatedBackground>
      </div>
    </ProtectedRoute>
  );
}
