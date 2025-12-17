"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { LeaderboardCard } from "@/components/ui/LeaderboardCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Users, Filter } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string;
  workoutCount: number;
  streak?: number;
  rank?: number;
  previousRank?: number;
  trend: "up" | "down" | "same";
}

function LeaderboardPageContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([
    {
      id: "user1",
      name: "Sarah Johnson",
      workoutCount: 28,
      trend: "up",
    },
    {
      id: "user2",
      name: "Mike Chen",
      workoutCount: 26,
      trend: "same",
    },
    {
      id: "user3",
      name: "Emma Davis",
      workoutCount: 24,
      trend: "up",
    },
    {
      id: "user4",
      name: "Alex Rodriguez",
      workoutCount: 22,
      trend: "down",
    },
    {
      id: "current",
      name: "You",
      workoutCount: 20,
      trend: "up",
    },
    {
      id: "user6",
      name: "Jessica Lee",
      workoutCount: 19,
      trend: "same",
    },
    {
      id: "user7",
      name: "Tom Wilson",
      workoutCount: 18,
      trend: "up",
    },
    {
      id: "user8",
      name: "Nina Patel",
      workoutCount: 17,
      trend: "down",
    },
    {
      id: "user9",
      name: "Chris Brown",
      workoutCount: 16,
      trend: "same",
    },
    {
      id: "user10",
      name: "Lisa Martinez",
      workoutCount: 15,
      trend: "up",
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "all">(
    "week"
  );

  useEffect(() => {
    loadLeaderboardData();
  }, [user, timeFilter]);

  const loadLeaderboardData = async () => {
    if (!user) return;

    try {
      // TODO: Replace with actual Supabase queries
      // Simulating data fetch
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLoading(false);
    } catch (error) {
      console.error("Error loading leaderboard data:", error);
      setLoading(false);
    }
  };

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <GlassCard elevation={1} className="p-6">
            <div className="flex items-center justify-between">
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
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Compete with {leaderboardData.length} athletes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={timeFilter === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeFilter("week")}
                  style={
                    timeFilter === "week"
                      ? {
                          background: getSemanticColor("trust").gradient,
                          boxShadow: `0 4px 12px ${
                            getSemanticColor("trust").primary
                          }30`,
                        }
                      : {}
                  }
                >
                  Week
                </Button>
                <Button
                  variant={timeFilter === "month" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeFilter("month")}
                  style={
                    timeFilter === "month"
                      ? {
                          background: getSemanticColor("trust").gradient,
                          boxShadow: `0 4px 12px ${
                            getSemanticColor("trust").primary
                          }30`,
                        }
                      : {}
                  }
                >
                  Month
                </Button>
                <Button
                  variant={timeFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimeFilter("all")}
                  style={
                    timeFilter === "all"
                      ? {
                          background: getSemanticColor("trust").gradient,
                          boxShadow: `0 4px 12px ${
                            getSemanticColor("trust").primary
                          }30`,
                        }
                      : {}
                  }
                >
                  All Time
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Leaderboard */}
        <LeaderboardCard
          leaderboard={leaderboardData}
          currentUserId="current"
          totalParticipants={leaderboardData.length}
        />

        {/* Motivational Section */}
        <div className="mt-8">
          <GlassCard elevation={2} className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
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
                  Complete 3 more workouts this week to reach the Top 3. You're
                  doing amazing! 🔥
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
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
