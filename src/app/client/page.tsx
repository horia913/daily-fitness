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

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", emoji: "🌅" };
  if (hour < 17) return { text: "Good afternoon", emoji: "🌞" };
  return { text: "Good evening", emoji: "🌙" };
}

// Type for the dashboard API response
interface DashboardData {
  avatarUrl: string | null;
  firstName: string | null;
  clientType: "online" | "in_gym";
  nextSession: {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    title: string;
    coach_name: string;
  } | null;
  streak: number;
  weeklyProgress: {
    current: number;
    goal: number;
  };
  weeklyStats: {
    volume: number;
    time: number;
    prsCount: number;
  };
  workoutDays: number[]; // Array of day indices (0-6) that have workouts
  bodyWeight: {
    current: number;
    change: number;
  } | null;
  todaysWorkout: {
    hasWorkout: boolean;
    type?: "program" | "assignment";
    templateId?: string;
    scheduleId?: string;
    assignmentId?: string;
    name?: string;
    weekNumber?: number;
    dayNumber?: number;
    totalSets?: number;
    estimatedDuration?: number;
    message?: string;
  };
}

export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const greeting = getTimeBasedGreeting();

  // Single API call to fetch all dashboard data
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/client/dashboard', {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle RPC not found - fall back gracefully
        if (errorData.code === 'RPC_NOT_FOUND') {
          console.warn('[Dashboard] RPC not found, migration needed');
          setError('Dashboard optimization pending. Please run database migrations.');
          return;
        }
        
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Derived values from dashboardData
  const streak = dashboardData?.streak ?? 0;
  const weeklyProgress = dashboardData?.weeklyProgress ?? { current: 0, goal: 0 };
  const weeklyVolume = dashboardData?.weeklyStats?.volume ?? 0;
  const weeklyTime = dashboardData?.weeklyStats?.time ?? 0;
  const prsCount = dashboardData?.weeklyStats?.prsCount ?? 0;
  const bodyWeight = dashboardData?.bodyWeight ?? null;
  const todaysWorkout = dashboardData?.todaysWorkout;
  const totalSets = todaysWorkout?.totalSets ?? 0;
  const clientType = dashboardData?.clientType ?? null;
  const nextSession = dashboardData?.nextSession ?? null;
  const avatarUrl = dashboardData?.avatarUrl ?? null;

  // Convert workoutDays array of indices to boolean array
  const workoutDays = [false, false, false, false, false, false, false];
  if (dashboardData?.workoutDays) {
    dashboardData.workoutDays.forEach((dayIndex) => {
      if (dayIndex >= 0 && dayIndex <= 6) {
        workoutDays[dayIndex] = true;
      }
    });
  }

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

  const userName = dashboardData?.firstName || profile?.first_name || "there";

  // Build workout display data from todaysWorkout
  const workoutDisplay = todaysWorkout?.hasWorkout ? {
    name: todaysWorkout.name || "Workout",
    isProgram: todaysWorkout.type === "program",
    programName: todaysWorkout.type === "program" ? `Week ${todaysWorkout.weekNumber} Day ${todaysWorkout.dayNumber}` : undefined,
    positionLabel: todaysWorkout.type === "program" ? `Week ${todaysWorkout.weekNumber} Day ${todaysWorkout.dayNumber}` : undefined,
    estimatedDuration: todaysWorkout.estimatedDuration || 45,
    exercises: Math.max(1, Math.ceil((todaysWorkout.totalSets || 0) / 3)), // Estimate exercises
    id: todaysWorkout.assignmentId || todaysWorkout.templateId
  } : null;

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
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto"></div>
                        </div>
                      ) : error ? (
                        <div className="text-center py-8">
                          <p className="text-sm fc-text-dim">{error}</p>
                        </div>
                      ) : workoutDisplay ? (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className="fc-pill fc-pill-glass fc-text-workouts"
                            >
                              {workoutDisplay.isProgram ? workoutDisplay.positionLabel || 'Program' : 'Next Up'}
                            </span>
                            <span className="text-xs font-mono fc-text-dim">
                              ~{workoutDisplay.estimatedDuration} min
                            </span>
                          </div>
                          <h2 className="text-3xl font-bold mb-2 fc-text-primary">
                            {workoutDisplay.name}
                          </h2>
                          {workoutDisplay.isProgram && workoutDisplay.programName && (
                            <p className="text-sm mb-2 fc-text-subtle">
                              {workoutDisplay.programName}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mb-6 fc-text-dim">
                            <div className="flex items-center gap-1.5">
                              <Dumbbell className="w-4 h-4" />
                              <span className="text-sm">
                                {workoutDisplay.exercises} Exercises
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
                            href={workoutDisplay.isProgram ? "/client/workouts" : `/client/workouts/${workoutDisplay.id}/start`}
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
                    {!loading && weeklyProgress.goal > 0 && (
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
                      {!bodyWeight && (
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
