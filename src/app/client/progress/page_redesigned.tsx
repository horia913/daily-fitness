"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { LeaderboardCard } from "@/components/ui/LeaderboardCard";
import { AchievementCard } from "@/components/ui/AchievementCard";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  TrendingUp,
  Award,
  Target,
  Calendar,
  Flame,
  Dumbbell,
  Scale,
  Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ProgressStats {
  weeklyWorkouts: {
    completed: number;
    goal: number;
  };
  streak: number;
  totalWorkouts: number;
  personalRecords: number;
}

interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string;
  workoutCount: number;
  trend: "up" | "down" | "same";
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  progress?: number;
  total?: number;
  unlockedAt?: string;
}

interface BodyMetric {
  date: string;
  weight: number;
  bodyFat?: number;
}

function ProgressDashboardContent() {
  const { user } = useAuth();
  const { theme, getSemanticColor, performanceSettings } = useTheme();
  const isDark = theme === "dark";

  const [stats, setStats] = useState<ProgressStats>({
    weeklyWorkouts: { completed: 3, goal: 4 },
    streak: 12,
    totalWorkouts: 87,
    personalRecords: 5,
  });

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([
    { id: "1", name: "Sarah Chen", workoutCount: 28, trend: "up" },
    { id: "2", name: "Mike Rodriguez", workoutCount: 26, trend: "same" },
    { id: "3", name: "Emma Thompson", workoutCount: 24, trend: "up" },
    { id: "4", name: "David Kim", workoutCount: 22, trend: "down" },
    { id: "5", name: "Lisa Anderson", workoutCount: 21, trend: "up" },
    { id: "current", name: "You", workoutCount: 20, trend: "up" },
    { id: "7", name: "Tom Wilson", workoutCount: 19, trend: "same" },
    { id: "8", name: "Rachel Green", workoutCount: 18, trend: "down" },
  ]);

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: "1",
      title: "First Steps",
      description: "Complete your first workout",
      rarity: "common",
      unlocked: true,
      unlockedAt: "2024-01-15",
    },
    {
      id: "2",
      title: "Week Warrior",
      description: "Complete 4 workouts in a week",
      rarity: "rare",
      unlocked: true,
      unlockedAt: "2024-01-22",
    },
    {
      id: "3",
      title: "Streak Master",
      description: "Maintain a 30-day workout streak",
      rarity: "epic",
      unlocked: false,
      progress: 12,
      total: 30,
    },
    {
      id: "4",
      title: "Iron Legend",
      description: "Complete 100 strength workouts",
      rarity: "legendary",
      unlocked: false,
      progress: 45,
      total: 100,
    },
    {
      id: "5",
      title: "Early Bird",
      description: "Complete 10 morning workouts",
      rarity: "rare",
      unlocked: false,
      progress: 7,
      total: 10,
    },
    {
      id: "6",
      title: "Consistency King",
      description: "Work out 5 days a week for a month",
      rarity: "epic",
      unlocked: true,
      unlockedAt: "2024-02-01",
    },
  ]);

  const [bodyMetrics, setBodyMetrics] = useState<BodyMetric[]>([
    { date: "2024-01-01", weight: 180 },
    { date: "2024-01-15", weight: 178 },
    { date: "2024-02-01", weight: 175 },
    { date: "2024-02-15", weight: 173 },
  ]);

  useEffect(() => {
    if (user) {
      loadProgressData();
    }
  }, [user]);

  const loadProgressData = async () => {
    // TODO: Load actual data from Supabase
    // For now, using mock data
  };

  const weeklyProgress =
    (stats.weeklyWorkouts.completed / stats.weeklyWorkouts.goal) * 100;
  const currentUserRank =
    leaderboardData.findIndex((u) => u.id === "current") + 1;
  const workoutsToTop10 =
    currentUserRank > 10
      ? (leaderboardData[9]?.workoutCount || 0) -
        (leaderboardData.find((u) => u.id === "current")?.workoutCount || 0) +
        1
      : 0;

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const inProgressAchievements = achievements.filter(
    (a) => !a.unlocked && a.progress !== undefined
  );
  const lockedAchievements = achievements.filter(
    (a) => !a.unlocked && a.progress === undefined
  );

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      {performanceSettings.particles && <FloatingParticles />}

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
                  Progress & Achievements
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
                variant="default"
                size="lg"
                style={{
                  background: getSemanticColor("trust").gradient,
                  boxShadow: `0 4px 12px ${
                    getSemanticColor("trust").primary
                  }30`,
                }}
              >
                <Calendar className="w-5 h-5 mr-2" />
                View History
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* Weekly Progress Hero */}
        <div className="mb-8">
          <GlassCard elevation={2} className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Circular Progress Ring */}
              <div className="relative flex items-center justify-center">
                <svg width="200" height="200" className="transform -rotate-90">
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
                    strokeDasharray={`${(weeklyProgress / 100) * 534} 534`}
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
                    size="4xl"
                    weight="bold"
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

              {/* Stats Grid */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                {/* Streak */}
                <div
                  className="p-4 rounded-lg"
                  style={{
                    background: isDark
                      ? "rgba(255,107,53,0.1)"
                      : "rgba(255,107,53,0.05)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                    style={{
                      background: getSemanticColor("energy").gradient,
                    }}
                  >
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                  <AnimatedNumber
                    value={stats.streak}
                    size="2xl"
                    weight="bold"
                    color={getSemanticColor("energy").primary}
                  />
                  <p
                    className="text-sm font-medium mt-1"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Day Streak
                  </p>
                </div>

                {/* Total Workouts */}
                <div
                  className="p-4 rounded-lg"
                  style={{
                    background: isDark
                      ? "rgba(74,144,226,0.1)"
                      : "rgba(74,144,226,0.05)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                    style={{
                      background: getSemanticColor("trust").gradient,
                    }}
                  >
                    <Dumbbell className="w-5 h-5 text-white" />
                  </div>
                  <AnimatedNumber
                    value={stats.totalWorkouts}
                    size="2xl"
                    weight="bold"
                    color={getSemanticColor("trust").primary}
                  />
                  <p
                    className="text-sm font-medium mt-1"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Total Workouts
                  </p>
                </div>

                {/* Personal Records */}
                <div
                  className="p-4 rounded-lg"
                  style={{
                    background: isDark
                      ? "rgba(124,179,66,0.1)"
                      : "rgba(124,179,66,0.05)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                    style={{
                      background: getSemanticColor("success").gradient,
                    }}
                  >
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <AnimatedNumber
                    value={stats.personalRecords}
                    size="2xl"
                    weight="bold"
                    color={getSemanticColor("success").primary}
                  />
                  <p
                    className="text-sm font-medium mt-1"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Personal Records
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Leaderboard */}
        <div className="mb-8">
          <LeaderboardCard
            leaderboard={leaderboardData}
            currentUserId="current"
          />
        </div>

        {/* Achievements Section */}
        <div className="mb-8">
          <GlassCard elevation={2} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: getSemanticColor("warning").gradient,
                  }}
                >
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Achievements
                  </h2>
                  <p
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    {unlockedAchievements.length} unlocked ·{" "}
                    {inProgressAchievements.length} in progress
                  </p>
                </div>
              </div>
              <Button variant="ghost">View All</Button>
            </div>

            {/* Recent Unlocks */}
            {unlockedAchievements.length > 0 && (
              <div className="mb-6">
                <h3
                  className="text-sm font-semibold mb-3"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)",
                  }}
                >
                  RECENTLY UNLOCKED
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unlockedAchievements.slice(0, 3).map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* In Progress */}
            {inProgressAchievements.length > 0 && (
              <div className="mb-6">
                <h3
                  className="text-sm font-semibold mb-3"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)",
                  }}
                >
                  IN PROGRESS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inProgressAchievements.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Locked Achievements */}
            {lockedAchievements.length > 0 && (
              <div>
                <h3
                  className="text-sm font-semibold mb-3"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)",
                  }}
                >
                  LOCKED
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lockedAchievements.slice(0, 3).map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                    />
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Body Metrics Chart */}
        <div className="mb-8">
          <GlassCard elevation={2} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: getSemanticColor("trust").gradient,
                  }}
                >
                  <Scale className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                  >
                    Body Metrics
                  </h2>
                  <p
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Track your physical progress
                  </p>
                </div>
              </div>
              <Button variant="ghost">
                <Activity className="w-5 h-5 mr-2" />
                Log Check-in
              </Button>
            </div>

            {/* Simple Chart Visualization */}
            <div className="relative h-64">
              <div className="absolute inset-0 flex items-end justify-between gap-2">
                {bodyMetrics.map((metric, index) => {
                  const height = ((180 - metric.weight) / 7) * 100; // Scale from 173-180
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div
                        className="w-full rounded-t-lg transition-all hover:opacity-80"
                        style={{
                          height: `${height}%`,
                          background: getSemanticColor("trust").gradient,
                        }}
                      />
                      <div className="mt-2 text-center">
                        <p
                          className="text-xs font-semibold"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.9)"
                              : "rgba(0,0,0,0.9)",
                          }}
                        >
                          {metric.weight}
                        </p>
                        <p
                          className="text-xs"
                          style={{
                            color: isDark
                              ? "rgba(255,255,255,0.5)"
                              : "rgba(0,0,0,0.5)",
                          }}
                        >
                          {new Date(metric.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trend Summary */}
            <div
              className="mt-6 p-4 rounded-lg flex items-center gap-3"
              style={{
                background: isDark
                  ? "rgba(124,179,66,0.1)"
                  : "rgba(124,179,66,0.05)",
              }}
            >
              <TrendingUp
                className="w-6 h-6"
                style={{ color: getSemanticColor("success").primary }}
              />
              <div>
                <p
                  className="font-semibold"
                  style={{ color: isDark ? "#fff" : "#1A1A1A" }}
                >
                  Great progress! You have lost 7 lbs since you started.
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  Keep up the momentum to reach your goal weight.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default function ProgressDashboard() {
  return (
    <ProtectedRoute>
      <ProgressDashboardContent />
    </ProtectedRoute>
  );
}
