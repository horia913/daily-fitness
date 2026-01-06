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
import { supabase } from "@/lib/supabase";

interface ProgressStats {
  weeklyWorkouts: {
    completed: number;
    goal: number;
  };
  streak: number;
  totalWorkouts: number;
  personalRecords: number;
  leaderboardRank: number;
  totalAthletes: number;
  achievementsUnlocked: number;
  achievementsInProgress: number;
  currentWeight: number;
  weightChange: number; // negative = lost, positive = gained
}

function ProgressHubContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [stats, setStats] = useState<ProgressStats>({
    weeklyWorkouts: { completed: 3, goal: 4 },
    streak: 12,
    totalWorkouts: 87,
    personalRecords: 8,
    leaderboardRank: 5,
    totalAthletes: 24,
    achievementsUnlocked: 12,
    achievementsInProgress: 3,
    currentWeight: 79.5,
    weightChange: -2.5,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, [user]);

  const loadProgressData = async () => {
    if (!user) return;

    try {
      // TODO: Replace with actual Supabase queries
      // Simulating data fetch
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLoading(false);
    } catch (error) {
      console.error("Error loading progress data:", error);
      setLoading(false);
    }
  };

  const weeklyProgress =
    (stats.weeklyWorkouts.completed / stats.weeklyWorkouts.goal) * 100;

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <GlassCard elevation={1} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1
                  className="text-3xl font-bold mb-1"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Your Progress
                </h1>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  Track your journey to greatness
                </p>
              </div>
              <Button
                variant="ghost"
                style={{
                  background: getSemanticColor("trust").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("trust").primary
                  }30`,
                }}
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                View Reports
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* Hero: Weekly Progress Ring */}
        <div className="mb-8">
          <GlassCard elevation={2} className="p-8">
            <div className="flex flex-col items-center">
              <h2
                className="text-xl font-bold mb-6"
                style={{ color: isDark ? "#fff" : "#1A1A1A" }}
              >
                Weekly Progress
              </h2>

              {/* Progress Ring */}
              <div className="relative mb-6">
                <svg width="200" height="200" viewBox="0 0 200 200">
                  {/* Background circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="85"
                    fill="none"
                    stroke={
                      isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                    }
                    strokeWidth="12"
                  />
                  {/* Progress circle */}
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
                    style={{
                      transition: "stroke-dasharray 1s ease-out",
                    }}
                  />
                  <defs>
                    <linearGradient
                      id="weeklyGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        stopColor={getSemanticColor("trust").primary}
                      />
                      <stop
                        offset="100%"
                        stopColor={getSemanticColor("success").primary}
                      />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <AnimatedNumber
                    value={stats.weeklyWorkouts.completed}
                    className="text-5xl font-bold"
                    color={getSemanticColor("trust").primary}
                  />
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    of {stats.weeklyWorkouts.goal} this week
                  </p>
                </div>
              </div>

              <p
                className="text-center text-sm"
                style={{
                  color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                }}
              >
                {stats.weeklyWorkouts.completed === stats.weeklyWorkouts.goal
                  ? "🎉 Weekly goal crushed!"
                  : `${
                      stats.weeklyWorkouts.goal - stats.weeklyWorkouts.completed
                    } more to hit your goal!`}
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {/* Streak */}
          <GlassCard elevation={2} className="p-6">
            <div
              className="p-4 rounded-lg"
              style={{
                background: isDark
                  ? "rgba(255,107,53,0.1)"
                  : "rgba(255,107,53,0.05)",
              }}
            >
              <Flame
                className="w-8 h-8 mb-3"
                style={{ color: getSemanticColor("energy").primary }}
              />
              <AnimatedNumber
                value={stats.streak}
                className="text-4xl font-bold mb-1"
                color={getSemanticColor("energy").primary}
              />
              <p
                className="text-sm font-medium mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Day Streak
              </p>
            </div>
          </GlassCard>

          {/* Total Workouts */}
          <GlassCard elevation={2} className="p-6">
            <div
              className="p-4 rounded-lg"
              style={{
                background: isDark
                  ? "rgba(74,144,226,0.1)"
                  : "rgba(74,144,226,0.05)",
              }}
            >
              <Dumbbell
                className="w-8 h-8 mb-3"
                style={{ color: getSemanticColor("trust").primary }}
              />
              <AnimatedNumber
                value={stats.totalWorkouts}
                className="text-4xl font-bold mb-1"
                color={getSemanticColor("trust").primary}
              />
              <p
                className="text-sm font-medium mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Total Workouts
              </p>
            </div>
          </GlassCard>

          {/* Personal Records */}
          <GlassCard elevation={2} className="p-6">
            <div
              className="p-4 rounded-lg"
              style={{
                background: isDark
                  ? "rgba(124,179,66,0.1)"
                  : "rgba(124,179,66,0.05)",
              }}
            >
              <Target
                className="w-8 h-8 mb-3"
                style={{ color: getSemanticColor("success").primary }}
              />
              <AnimatedNumber
                value={stats.personalRecords}
                className="text-4xl font-bold mb-1"
                color={getSemanticColor("success").primary}
              />
              <p
                className="text-sm font-medium mt-1"
                style={{
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                }}
              >
                Personal Records
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Navigation Cards */}
        <div className="mb-8">
          <h2
            className="text-2xl font-bold mb-6"
            style={{ color: isDark ? "#fff" : "#1A1A1A" }}
          >
            Explore Your Progress
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Leaderboard Card */}
            <Link href="/client/progress/leaderboard">
              <GlassCard
                elevation={2}
                className="p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                      boxShadow: "0 4px 12px rgba(255, 215, 0, 0.3)",
                    }}
                  >
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight
                    className="w-6 h-6"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(0,0,0,0.4)",
                    }}
                  />
                </div>

                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Leaderboard
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users
                      className="w-4 h-4"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    />
                    <p
                      className="text-sm"
                      style={{
                        color: isDark
                          ? "rgba(255,255,255,0.6)"
                          : "rgba(0,0,0,0.6)",
                      }}
                    >
                      Rank #{stats.leaderboardRank} of {stats.totalAthletes}{" "}
                      athletes
                    </p>
                  </div>

                  {stats.leaderboardRank <= 3 ? (
                    <div
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background:
                          "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                        color: "#fff",
                      }}
                    >
                      🏆 Top 3 Athlete
                    </div>
                  ) : (
                    <p
                      className="text-xs font-medium"
                      style={{ color: getSemanticColor("energy").primary }}
                    >
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
                className="p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                      boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
                    }}
                  >
                    <Award className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight
                    className="w-6 h-6"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(0,0,0,0.4)",
                    }}
                  />
                </div>

                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Achievements
                </h3>

                <div className="space-y-2">
                  <p
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    {stats.achievementsUnlocked} unlocked ·{" "}
                    {stats.achievementsInProgress} in progress
                  </p>

                  {stats.achievementsInProgress > 0 && (
                    <p
                      className="text-xs font-medium"
                      style={{ color: getSemanticColor("energy").primary }}
                    >
                      {stats.achievementsInProgress} badges ready to unlock! 🎯
                    </p>
                  )}
                </div>
              </GlassCard>
            </Link>

            {/* Body Metrics Card */}
            <Link href="/client/progress/body-metrics">
              <GlassCard
                elevation={2}
                className="p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <Scale className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight
                    className="w-6 h-6"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(0,0,0,0.4)",
                    }}
                  />
                </div>

                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Body Metrics
                </h3>

                <div className="space-y-2">
                  <p
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Weight: {stats.currentWeight} kg
                  </p>

                  <div className="flex items-center gap-1">
                    <TrendingUp
                      className={`w-4 h-4 ${
                        stats.weightChange < 0 ? "rotate-180" : ""
                      }`}
                      style={{
                        color:
                          stats.weightChange < 0
                            ? getSemanticColor("success").primary
                            : getSemanticColor("warning").primary,
                      }}
                    />
                    <p
                      className="text-xs font-medium"
                      style={{
                        color:
                          stats.weightChange < 0
                            ? getSemanticColor("success").primary
                            : getSemanticColor("warning").primary,
                      }}
                    >
                      {Math.abs(stats.weightChange).toFixed(1)} kg this month
                    </p>
                  </div>
                </div>
              </GlassCard>
            </Link>

            {/* Workout Logs Card */}
            <Link href="/client/progress/workout-logs">
              <GlassCard
                elevation={2}
                className="p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)",
                      boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight
                    className="w-6 h-6"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(0,0,0,0.4)",
                    }}
                  />
                </div>

                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Workout Logs
                </h3>

                <div className="space-y-2">
                  <p
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    View your complete workout history
                  </p>

                  <p
                    className="text-xs font-medium"
                    style={{ color: getSemanticColor("trust").primary }}
                  >
                    Track all your completed workouts →
                  </p>
                </div>
              </GlassCard>
            </Link>

            {/* Performance Tests Card */}
            <Link href="/client/progress/performance">
              <GlassCard
                elevation={2}
                className="p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
                      boxShadow: "0 4px 12px rgba(249, 115, 22, 0.3)",
                    }}
                  >
                    <Timer className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight
                    className="w-6 h-6"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(0,0,0,0.4)",
                    }}
                  />
                </div>

                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Performance Tests
                </h3>

                <div className="space-y-2">
                  <p
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    1km Run & Step Test assessments
                  </p>

                  <p
                    className="text-xs font-medium"
                    style={{ color: getSemanticColor("warning").primary }}
                  >
                    Track monthly tests →
                  </p>
                </div>
              </GlassCard>
            </Link>

            {/* Challenges Card */}
            <Link href="/client/challenges">
              <GlassCard
                elevation={2}
                className="p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                      boxShadow: "0 4px 12px rgba(255, 215, 0, 0.3)",
                    }}
                  >
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight
                    className="w-6 h-6"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(0,0,0,0.4)",
                    }}
                  />
                </div>

                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Challenges
                </h3>

                <div className="space-y-2">
                  <p
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Join challenges and compete with others
                  </p>

                  <p
                    className="text-xs font-medium"
                    style={{ color: getSemanticColor("energy").primary }}
                  >
                    Browse active challenges →
                  </p>
                </div>
              </GlassCard>
            </Link>

            {/* Analytics Card */}
            <Link href="/client/progress/analytics">
              <GlassCard
                elevation={2}
                className="p-6 transition-all hover:scale-105 hover:shadow-2xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #EC4899 0%, #BE185D 100%)",
                      boxShadow: "0 4px 12px rgba(236, 72, 153, 0.3)",
                    }}
                  >
                    <Activity className="w-7 h-7 text-white" />
                  </div>
                  <ChevronRight
                    className="w-6 h-6"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(0,0,0,0.4)",
                    }}
                  />
                </div>

                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Analytics
                </h3>

                <div className="space-y-2">
                  <p
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Workout frequency, strength & body trends
                  </p>

                  <p
                    className="text-xs font-medium"
                    style={{ color: getSemanticColor("trust").primary }}
                  >
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
