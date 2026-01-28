"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Award,
  TrendingUp,
  Flame,
  Dumbbell,
  ChevronRight,
  Users,
  Scale,
  Target,
  FileText,
  Activity,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { getProgressStats, ProgressStats } from "@/lib/progressStatsService";

function ProgressHubContent() {
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const [stats, setStats] = useState<ProgressStats>({
    weeklyWorkouts: { completed: 0, goal: 0 },
    streak: 0,
    totalWorkouts: 0,
    personalRecords: 0,
    leaderboardRank: 0,
    totalAthletes: 0,
    achievementsUnlocked: 0,
    achievementsInProgress: 0,
    currentWeight: null,
    weightChange: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, [user]);

  const loadProgressData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const progressStats = await getProgressStats(user.id);
      setStats(progressStats);
    } catch (error) {
      console.error("Error loading progress data:", error);
    } finally {
      setLoading(false);
    }
  };

  const weeklyProgress =
    stats.weeklyWorkouts.goal > 0
      ? (stats.weeklyWorkouts.completed / stats.weeklyWorkouts.goal) * 100
      : 0;

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
        <div className="space-y-8">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Progress Hub
                </span>
                <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                  Your Progress
                </h1>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Track your journey and celebrate every milestone.
                </p>
              </div>
              <Button variant="outline" className="fc-btn fc-btn-secondary">
                <TrendingUp className="mr-2 h-5 w-5" />
                View Reports
              </Button>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="flex flex-col items-center justify-center gap-4">
                <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                  Weekly Progress
                </h2>
                <div className="relative">
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="85"
                      fill="none"
                      stroke="var(--fc-glass-border)"
                      strokeWidth="12"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="85"
                      fill="none"
                      stroke="url(#weeklyGradient)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${
                        (weeklyProgress / 100) * 534.07
                      } 534.07`}
                      transform="rotate(-90 100 100)"
                      style={{ transition: "stroke-dasharray 1s ease-out" }}
                    />
                    <defs>
                      <linearGradient
                        id="weeklyGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="var(--fc-domain-workouts)" />
                        <stop offset="100%" stopColor="var(--fc-accent-cyan)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <AnimatedNumber
                      value={stats.weeklyWorkouts.completed}
                      className="text-5xl font-bold"
                      color="var(--fc-domain-workouts)"
                    />
                    <p className="text-sm font-medium text-[color:var(--fc-text-dim)]">
                      of {stats.weeklyWorkouts.goal} this week
                    </p>
                  </div>
                </div>
                <p className="text-center text-sm text-[color:var(--fc-text-dim)]">
                  {stats.weeklyWorkouts.completed === stats.weeklyWorkouts.goal
                    ? "🎉 Weekly goal crushed!"
                    : `${
                        stats.weeklyWorkouts.goal - stats.weeklyWorkouts.completed
                      } more to hit your goal!`}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <Flame className="h-6 w-6 text-[color:var(--fc-domain-challenges)]" />
                  <AnimatedNumber
                    value={stats.streak}
                    className="mt-3 text-3xl font-bold"
                    color="var(--fc-domain-challenges)"
                  />
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Day Streak
                  </p>
                </GlassCard>
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <Dumbbell className="h-6 w-6 text-[color:var(--fc-domain-workouts)]" />
                  <AnimatedNumber
                    value={stats.totalWorkouts}
                    className="mt-3 text-3xl font-bold"
                    color="var(--fc-domain-workouts)"
                  />
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Total Workouts
                  </p>
                </GlassCard>
                <GlassCard elevation={1} className="fc-glass fc-card p-4">
                  <Target className="h-6 w-6 text-[color:var(--fc-status-success)]" />
                  <AnimatedNumber
                    value={stats.personalRecords}
                    className="mt-3 text-3xl font-bold"
                    color="var(--fc-status-success)"
                  />
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Personal Records
                  </p>
                </GlassCard>
              </div>
            </div>
          </GlassCard>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <GlassCard elevation={1} className="fc-glass fc-card p-4">
              <div className="flex items-center justify-between">
                <Award className="h-6 w-6 text-[color:var(--fc-accent-purple)]" />
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Achievements
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                {stats.achievementsUnlocked}
              </p>
              <p className="text-sm text-[color:var(--fc-text-dim)]">
                Unlocked · {stats.achievementsInProgress} in progress
              </p>
            </GlassCard>
            <GlassCard elevation={1} className="fc-glass fc-card p-4">
              <div className="flex items-center justify-between">
                <Users className="h-6 w-6 text-[color:var(--fc-accent-cyan)]" />
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Leaderboard
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                #{stats.leaderboardRank}
              </p>
              <p className="text-sm text-[color:var(--fc-text-dim)]">
                of {stats.totalAthletes} athletes
              </p>
            </GlassCard>
            <GlassCard elevation={1} className="fc-glass fc-card p-4">
              <div className="flex items-center justify-between">
                <Scale className="h-6 w-6 text-[color:var(--fc-domain-meals)]" />
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Body Metrics
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                {stats.currentWeight !== null ? `${stats.currentWeight} kg` : "—"}
              </p>
              <p className="text-sm text-[color:var(--fc-text-dim)]">
                {stats.weightChange !== 0 && stats.currentWeight !== null
                  ? `${Math.abs(stats.weightChange).toFixed(1)} kg this month`
                  : stats.currentWeight !== null
                  ? "No change this month"
                  : "No data yet"}
              </p>
            </GlassCard>
            <GlassCard elevation={1} className="fc-glass fc-card p-4">
              <div className="flex items-center justify-between">
                <FileText className="h-6 w-6 text-[color:var(--fc-accent-indigo)]" />
                <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                  Logs
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--fc-text-primary)]">
                {stats.totalWorkouts}
              </p>
              <p className="text-sm text-[color:var(--fc-text-dim)]">
                Completed workouts
              </p>
            </GlassCard>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[color:var(--fc-text-primary)]">
              Explore Your Progress
            </h2>
            <p className="text-sm text-[color:var(--fc-text-dim)]">
              Dive deeper into analytics, tests, and challenges.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Leaderboard Card */}
            <Link href="/client/progress/leaderboard">
              <GlassCard
                elevation={2}
                className="fc-glass fc-card p-6 transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-400 shadow-[0_8px_20px_rgba(255,170,0,0.25)]">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight className="w-6 h-6 text-[color:var(--fc-text-subtle)]" />
                </div>

                <h3 className="text-xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
                  Leaderboard
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[color:var(--fc-text-dim)]" />
                    <p className="text-sm text-[color:var(--fc-text-dim)]">
                      Rank #{stats.leaderboardRank} of {stats.totalAthletes}{" "}
                      athletes
                    </p>
                  </div>

                  {stats.leaderboardRank <= 3 ? (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-br from-yellow-400 to-orange-400 text-white">
                      🏆 Top 3 Athlete
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-[color:var(--fc-domain-challenges)]">
                      {10 - stats.leaderboardRank > 0
                        ? `${10 - stats.leaderboardRank} spots to Top 10!`
                        : "You're in the Top 10! 🎉"}
                    </p>
                  )}
                </div>
              </GlassCard>
            </Link>

            {/* Achievements Card */}
            <Link href="/client/progress/achievements">
              <GlassCard
                elevation={2}
                className="fc-glass fc-card p-6 transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 shadow-[0_8px_20px_rgba(124,58,237,0.3)]">
                    <Award className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight className="w-6 h-6 text-[color:var(--fc-text-subtle)]" />
                </div>

                <h3 className="text-xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
                  Achievements
                </h3>

                <div className="space-y-2">
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    {stats.achievementsUnlocked} unlocked ·{" "}
                    {stats.achievementsInProgress} in progress
                  </p>

                  {stats.achievementsInProgress > 0 && (
                    <p className="text-xs font-medium text-[color:var(--fc-domain-challenges)]">
                      {stats.achievementsInProgress} badges ready to unlock! 🎯
                    </p>
                  )}
                </div>
              </GlassCard>
            </Link>

            {/* Personal Records Card */}
            <Link href="/client/progress/personal-records">
              <GlassCard
                elevation={2}
                className="fc-glass fc-card p-6 transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600 shadow-[0_8px_20px_rgba(249,115,22,0.3)]">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight className="w-6 h-6 text-[color:var(--fc-text-subtle)]" />
                </div>

                <h3 className="text-xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
                  Personal Records
                </h3>

                <div className="space-y-2">
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Best lifts and milestone achievements
                  </p>

                  <p className="text-xs font-medium text-[color:var(--fc-status-warning)]">
                    View your top PRs →
                  </p>
                </div>
              </GlassCard>
            </Link>

            {/* Body Metrics Card */}
            <Link href="/client/progress/body-metrics">
              <GlassCard
                elevation={2}
                className="fc-glass fc-card p-6 transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-green-600 shadow-[0_8px_20px_rgba(16,185,129,0.3)]">
                    <Scale className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight className="w-6 h-6 text-[color:var(--fc-text-subtle)]" />
                </div>

                <h3 className="text-xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
                  Body Metrics
                </h3>

                <div className="space-y-2">
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Weight:{" "}
                    {stats.currentWeight !== null
                      ? `${stats.currentWeight} kg`
                      : "Not recorded"}
                  </p>

                  <div className="flex items-center gap-1">
                    <TrendingUp
                      className={`w-4 h-4 ${
                        stats.weightChange < 0 ? "rotate-180" : ""
                      }`}
                      style={{
                        color:
                          stats.weightChange < 0
                            ? "var(--fc-status-success)"
                            : "var(--fc-status-warning)",
                      }}
                    />
                    {stats.weightChange !== 0 && (
                      <p className="text-xs font-medium text-[color:var(--fc-text-dim)]">
                        {Math.abs(stats.weightChange).toFixed(1)} kg this month
                      </p>
                    )}
                    {stats.weightChange === 0 && stats.currentWeight !== null && (
                      <p className="text-xs font-medium text-[color:var(--fc-text-subtle)]">
                        No change this month
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            </Link>

            {/* Workout Logs Card */}
            <Link href="/client/progress/workout-logs">
              <GlassCard
                elevation={2}
                className="fc-glass fc-card p-6 transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 shadow-[0_8px_20px_rgba(59,130,246,0.3)]">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight className="w-6 h-6 text-[color:var(--fc-text-subtle)]" />
                </div>

                <h3 className="text-xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
                  Workout Logs
                </h3>

                <div className="space-y-2">
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    View your complete workout history
                  </p>

                  <p className="text-xs font-medium text-[color:var(--fc-domain-workouts)]">
                    Track all your completed workouts →
                  </p>
                </div>
              </GlassCard>
            </Link>

            {/* Performance Tests Card */}
            <Link href="/client/progress/performance">
              <GlassCard
                elevation={2}
                className="fc-glass fc-card p-6 transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600 shadow-[0_8px_20px_rgba(249,115,22,0.3)]">
                    <Timer className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight className="w-6 h-6 text-[color:var(--fc-text-subtle)]" />
                </div>

                <h3 className="text-xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
                  Performance Tests
                </h3>

                <div className="space-y-2">
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    1km Run & Step Test assessments
                  </p>

                  <p className="text-xs font-medium text-[color:var(--fc-status-warning)]">
                    Track monthly tests →
                  </p>
                </div>
              </GlassCard>
            </Link>

            {/* Challenges Card */}
            <Link href="/client/challenges">
              <GlassCard
                elevation={2}
                className="fc-glass fc-card p-6 transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-400 shadow-[0_8px_20px_rgba(255,170,0,0.25)]">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight className="w-6 h-6 text-[color:var(--fc-text-subtle)]" />
                </div>

                <h3 className="text-xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
                  Challenges
                </h3>

                <div className="space-y-2">
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Join challenges and compete with others
                  </p>

                  <p className="text-xs font-medium text-[color:var(--fc-domain-challenges)]">
                    Browse active challenges →
                  </p>
                </div>
              </GlassCard>
            </Link>

            {/* Analytics Card */}
            <Link href="/client/progress/analytics">
              <GlassCard
                elevation={2}
                className="fc-glass fc-card p-6 transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_8px_20px_rgba(236,72,153,0.3)]">
                    <Activity className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight className="w-6 h-6 text-[color:var(--fc-text-subtle)]" />
                </div>

                <h3 className="text-xl font-bold mb-2 text-[color:var(--fc-text-primary)]">
                  Analytics
                </h3>

                <div className="space-y-2">
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    Workout frequency, strength & body trends
                  </p>

                  <p className="text-xs font-medium text-[color:var(--fc-domain-workouts)]">
                    View detailed analytics →
                  </p>
                </div>
              </GlassCard>
            </Link>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}

export default function ProgressHub() {
  return (
    <ProtectedRoute>
      <ProgressHubContent />
    </ProtectedRoute>
  );
}
