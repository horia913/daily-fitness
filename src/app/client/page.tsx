"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { MetricGauge } from "@/components/ui/MetricGauge";
import { AnimatedEntry } from "@/components/ui/AnimatedEntry";
import {
  Play,
  Dumbbell,
  Flame,
  Layers,
  Calendar,
  Scale,
  Utensils,
  FileText,
  Activity,
  ChevronRight,
  Trophy,
} from "lucide-react";
import Link from "next/link";

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
  workoutDays: number[];
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

function getContextualStatus(data: DashboardData | null): string {
  if (!data) return "";
  const { weeklyProgress, todaysWorkout, streak } = data;

  if (todaysWorkout?.hasWorkout) {
    const name = todaysWorkout.name || "Workout";
    return todaysWorkout.type === "program"
      ? `Week ${todaysWorkout.weekNumber} Day ${todaysWorkout.dayNumber} -- ${name}`
      : name;
  }

  if (weeklyProgress.current >= weeklyProgress.goal && weeklyProgress.goal > 0) {
    return "Weekly goal complete -- Recovery day";
  }

  if (streak > 0) {
    return `${streak}-day streak active`;
  }

  return "Rest day -- Recovery focus";
}

function getContextualActions(data: DashboardData | null) {
  const hour = new Date().getHours();
  const allActions = [
    { href: "/client/progress/body-metrics", label: "Check In", iconClass: "fc-icon-neutral", icon: <Scale className="w-4 h-4" />, priority: 3 },
    { href: "/client/nutrition", label: "Log Meal", iconClass: "fc-icon-meals", icon: <Utensils className="w-4 h-4" />, priority: 4 },
    { href: "/client/progress/workout-logs", label: "Logs", iconClass: "fc-icon-workouts", icon: <FileText className="w-4 h-4" />, priority: 5 },
    { href: "/client/progress/analytics", label: "Analytics", iconClass: "fc-icon-neutral", icon: <Activity className="w-4 h-4" />, priority: 6 },
    { href: "/client/scheduling", label: "Book", iconClass: "fc-icon-neutral", icon: <Calendar className="w-4 h-4" />, priority: 7 },
  ];

  // Time-based prioritization
  // Morning (5-10): Check In first
  if (hour >= 5 && hour < 10) {
    const checkIn = allActions.find(a => a.label === "Check In");
    if (checkIn) checkIn.priority = 1;
  }

  // Mealtimes (11-14, 17-20): Log Meal first
  if ((hour >= 11 && hour < 14) || (hour >= 17 && hour < 20)) {
    const logMeal = allActions.find(a => a.label === "Log Meal");
    if (logMeal) logMeal.priority = 1;
  }

  // Evening (20+): Analytics / Logs first (review time)
  if (hour >= 20) {
    const analytics = allActions.find(a => a.label === "Analytics");
    if (analytics) analytics.priority = 1;
    const logs = allActions.find(a => a.label === "Logs");
    if (logs) logs.priority = 2;
  }

  // State-based: if no workout today, push Book higher
  if (data && !data.todaysWorkout?.hasWorkout) {
    const book = allActions.find(a => a.label === "Book");
    if (book) book.priority = 2;
  }

  return allActions.sort((a, b) => a.priority - b.priority);
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const { isDark, performanceSettings } = useTheme();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Derived values
  const streak = dashboardData?.streak ?? 0;
  const weeklyProgress = dashboardData?.weeklyProgress ?? { current: 0, goal: 0 };
  const weeklyVolume = dashboardData?.weeklyStats?.volume ?? 0;
  const weeklyTime = dashboardData?.weeklyStats?.time ?? 0;
  const prsCount = dashboardData?.weeklyStats?.prsCount ?? 0;
  const bodyWeight = dashboardData?.bodyWeight ?? null;
  const todaysWorkout = dashboardData?.todaysWorkout;
  const totalSets = todaysWorkout?.totalSets ?? 0;
  const avatarUrl = dashboardData?.avatarUrl ?? null;

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
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.first_name}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "User"}`;
  };

  const userName = dashboardData?.firstName || profile?.first_name || "there";

  const workoutDisplay = todaysWorkout?.hasWorkout ? {
    name: todaysWorkout.name || "Workout",
    isProgram: todaysWorkout.type === "program",
    programName: todaysWorkout.type === "program" ? `Week ${todaysWorkout.weekNumber} Day ${todaysWorkout.dayNumber}` : undefined,
    positionLabel: todaysWorkout.type === "program" ? `Week ${todaysWorkout.weekNumber} Day ${todaysWorkout.dayNumber}` : undefined,
    estimatedDuration: todaysWorkout.estimatedDuration || 45,
    exercises: Math.max(1, Math.ceil((todaysWorkout.totalSets || 0) / 3)),
    id: todaysWorkout.assignmentId || todaysWorkout.templateId
  } : null;

  // Streak gauge: max 30 days as "full"
  const streakMax = Math.max(streak, 30);

  return (
    <ProtectedRoute requiredRole="client">
      <div className="relative fc-app-bg isolate">
        <AnimatedBackground>
          {performanceSettings.floatingParticles && <FloatingParticles />}

          <div className="relative z-10 mx-auto w-full max-w-lg fc-page">
            {/* ===== CONTEXTUAL TOP BAR ===== */}
            <AnimatedEntry delay={0} animation="fade-up">
              <header className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-[var(--fc-glass-border)] overflow-hidden flex-shrink-0">
                    <img
                      src={getAvatarUrl()}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold fc-text-primary leading-tight">
                      {userName}
                    </p>
                    <p className="text-[11px] fc-text-dim font-mono">
                      {formatDate()}
                    </p>
                  </div>
                </div>
                {streak > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: "color-mix(in srgb, var(--fc-status-warning) 12%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--fc-status-warning) 25%, transparent)",
                    }}
                  >
                    <Flame className="w-3.5 h-3.5 fc-text-warning" />
                    <span className="text-[11px] font-bold fc-text-warning">{streak}</span>
                  </div>
                )}
              </header>
            </AnimatedEntry>

            {/* ===== CONTEXTUAL STATUS LINE ===== */}
            {!loading && dashboardData && (
              <AnimatedEntry delay={50} animation="fade-up">
                <p className="text-xs fc-text-dim mb-6 pl-[52px]">
                  {getContextualStatus(dashboardData)}
                </p>
              </AnimatedEntry>
            )}

            {/* ===== LOADING STATE ===== */}
            {loading && (
              <div className="space-y-4 mb-8">
                {/* Skeleton gauges */}
                <div className="flex justify-around py-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="fc-skeleton rounded-full" style={{ width: 100, height: 100 }} />
                      <div className="fc-skeleton" style={{ width: 60, height: 10 }} />
                    </div>
                  ))}
                </div>
                {/* Skeleton hero */}
                <div className="fc-skeleton" style={{ height: 180, borderRadius: 'var(--fc-radius-xl)' }} />
                {/* Skeleton stats */}
                <div className="fc-skeleton" style={{ height: 64, borderRadius: 'var(--fc-radius-lg)' }} />
              </div>
            )}

            {/* ===== ERROR STATE ===== */}
            {error && !loading && (
              <div className="fc-surface-elevated rounded-2xl p-6 text-center mb-8">
                <p className="text-sm fc-text-dim mb-4">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchDashboardData()}
                  className="fc-btn fc-btn-secondary fc-press h-10 px-6 text-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ===== METRIC GAUGES ROW (Whoop-style) ===== */}
            {!loading && !error && (
              <>
                <AnimatedEntry delay={100} animation="fade-up">
                  <section className="flex justify-around items-start py-4 mb-6">
                    {/* Weekly Progress Gauge */}
                    <MetricGauge
                      value={weeklyProgressPercent}
                      displayValue={`${weeklyProgress.current}/${weeklyProgress.goal || 0}`}
                      label="Weekly"
                      size={100}
                      strokeWidth={5}
                      gradient={["var(--fc-accent-cyan)", "var(--fc-accent-purple)"]}
                    />

                    {/* Streak Gauge */}
                    <MetricGauge
                      value={streak}
                      max={streakMax}
                      displayValue={`${streak}`}
                      label="Streak"
                      size={100}
                      strokeWidth={5}
                      color="var(--fc-status-warning)"
                      suffix="d"
                    />

                    {/* Volume Gauge */}
                    <MetricGauge
                      value={weeklyVolume > 0 ? Math.min(weeklyVolume, 100) : 0}
                      displayValue={weeklyVolume > 0 ? `${weeklyVolume}k` : "0"}
                      label="Volume"
                      size={100}
                      strokeWidth={5}
                      color="var(--fc-domain-workouts)"
                    />
                  </section>
                </AnimatedEntry>

                {/* ===== TODAY'S WORKOUT HERO ===== */}
                <AnimatedEntry delay={200} animation="fade-up">
                  <section className="mb-6">
                    {workoutDisplay ? (
                      <div className="fc-hero-card" style={{ padding: "var(--fc-card-padding)" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="fc-pill fc-pill-glass fc-text-workouts">
                            {workoutDisplay.isProgram ? workoutDisplay.positionLabel || 'Program' : 'Next Up'}
                          </span>
                          <span className="text-[11px] font-mono fc-text-dim">
                            ~{workoutDisplay.estimatedDuration} min
                          </span>
                        </div>

                        <h2 className="text-2xl font-extrabold mb-1 fc-text-primary leading-tight">
                          {workoutDisplay.name}
                        </h2>

                        {workoutDisplay.isProgram && workoutDisplay.programName && (
                          <p className="text-xs mb-3 fc-text-subtle">
                            {workoutDisplay.programName}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mb-5 fc-text-dim">
                          <div className="flex items-center gap-1.5">
                            <Dumbbell className="w-3.5 h-3.5" />
                            <span className="text-xs">{workoutDisplay.exercises} Exercises</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            <span className="text-xs">{totalSets} Sets</span>
                          </div>
                        </div>

                        <Link
                          href={workoutDisplay.isProgram ? "/client/workouts" : `/client/workouts/${workoutDisplay.id}/start`}
                        >
                          <button className="fc-btn fc-btn-primary fc-press w-full h-12 flex items-center justify-center gap-2 text-sm font-bold">
                            <Play className="w-4 h-4 fill-current" />
                            Start Workout
                          </button>
                        </Link>
                      </div>
                    ) : (
                      <div className="fc-hero-card text-center" style={{ padding: "var(--fc-card-padding)" }}>
                        <div className="fc-icon-tile fc-icon-workouts w-14 h-14 mx-auto mb-4">
                          <Dumbbell className="w-7 h-7" />
                        </div>
                        <h2 className="text-xl font-bold mb-1 fc-text-primary">
                          No workout today
                        </h2>
                        <p className="text-xs fc-text-dim mb-5">
                          Your coach will assign your next session
                        </p>
                        <Link href="/client/workouts">
                          <button className="fc-btn fc-btn-secondary fc-press h-10 px-6 text-sm">
                            Browse Workouts
                          </button>
                        </Link>
                      </div>
                    )}
                  </section>
                </AnimatedEntry>

                {/* ===== QUICK STATS STRIP ===== */}
                <AnimatedEntry delay={300} animation="fade-up">
                  <section className="mb-6">
                    <div className="fc-stats-strip">
                      <div className="fc-stats-strip-item">
                        <span className="fc-stats-strip-value">{weeklyProgress.current}</span>
                        <span className="fc-stats-strip-label">Workouts</span>
                      </div>
                      <div className="fc-stats-strip-item">
                        <span className="fc-stats-strip-value">{weeklyTime}<span className="text-[0.6em] fc-text-dim">m</span></span>
                        <span className="fc-stats-strip-label">Time</span>
                      </div>
                      <div className="fc-stats-strip-item">
                        <span className="fc-stats-strip-value fc-text-success">{prsCount}</span>
                        <span className="fc-stats-strip-label">PRs</span>
                      </div>
                      {bodyWeight && (
                        <div className="fc-stats-strip-item">
                          <span className="fc-stats-strip-value">{bodyWeight.current.toFixed(1)}</span>
                          <span className="fc-stats-strip-label">kg</span>
                        </div>
                      )}
                    </div>
                  </section>
                </AnimatedEntry>

                {/* ===== WEEKLY ACTIVITY BAR ===== */}
                <AnimatedEntry delay={350} animation="fade-up">
                  <section className="mb-6">
                    <div className="fc-surface rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-semibold uppercase tracking-widest fc-text-dim">
                          This Week
                        </span>
                        {weeklyProgress.goal > 0 && (
                          <span className="text-[11px] fc-text-dim">
                            {weeklyProgress.current} of {weeklyProgress.goal}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                            <div
                              className={`w-full fc-activity-bar ${
                                workoutDays[i] ? "fc-activity-bar--active" : "fc-activity-bar--inactive"
                              }`}
                            />
                            <span className="text-[9px] font-medium fc-text-dim">{day}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </AnimatedEntry>

                {/* ===== QUICK ACTIONS (Contextual, Horizontal Chips) ===== */}
                <AnimatedEntry delay={400} animation="fade-up">
                  <section className="mb-8">
                    <div className="fc-action-chips">
                      {getContextualActions(dashboardData).map((action) => (
                        <Link key={action.href} href={action.href} className="fc-action-chip">
                          <div className={`fc-action-chip-icon ${action.iconClass}`}>
                            {action.icon}
                          </div>
                          {action.label}
                        </Link>
                      ))}
                    </div>
                  </section>
                </AnimatedEntry>
              </>
            )}
          </div>
        </AnimatedBackground>
      </div>
    </ProtectedRoute>
  );
}
