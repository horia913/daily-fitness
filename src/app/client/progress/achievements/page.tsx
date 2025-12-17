"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { GlassCard } from "@/components/ui/GlassCard";
import { AchievementCard } from "@/components/ui/AchievementCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Filter } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  progress?: number; // 0-100
  requirement?: string;
  unlockedAt?: Date;
}

function AchievementsPageContent() {
  const { user } = useAuth();
  const { isDark, getSemanticColor, performanceSettings } = useTheme();

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: "1",
      name: "First Steps",
      description: "Complete your first workout",
      icon: "🎯",
      rarity: "common",
      unlocked: true,
      unlockedAt: new Date("2024-01-15"),
    },
    {
      id: "2",
      name: "Week Warrior",
      description: "Complete 5 workouts in one week",
      icon: "💪",
      rarity: "rare",
      unlocked: true,
      unlockedAt: new Date("2024-01-22"),
    },
    {
      id: "3",
      name: "Streak Master",
      description: "Maintain a 30-day workout streak",
      icon: "🔥",
      rarity: "epic",
      unlocked: false,
      progress: 40, // 12/30 = 40%
      requirement: "Complete 30 consecutive days of workouts",
    },
    {
      id: "4",
      name: "Iron Will",
      description: "Complete 100 total workouts",
      icon: "🏋️",
      rarity: "epic",
      unlocked: false,
      progress: 87, // 87/100 = 87%
      requirement: "Complete 100 workouts",
    },
    {
      id: "5",
      name: "Early Bird",
      description: "Complete 10 workouts before 7am",
      icon: "🌅",
      rarity: "rare",
      unlocked: false,
      progress: 30, // 3/10 = 30%
      requirement: "Complete 10 morning workouts",
    },
    {
      id: "6",
      name: "Legendary Athlete",
      description: "Reach #1 on the leaderboard",
      icon: "👑",
      rarity: "legendary",
      unlocked: false,
      requirement: "Reach the top of the leaderboard",
    },
    {
      id: "7",
      name: "PR Hunter",
      description: "Set 20 personal records",
      icon: "🎖️",
      rarity: "epic",
      unlocked: false,
      progress: 40, // 8/20 = 40%
      requirement: "Set 20 new personal records",
    },
    {
      id: "8",
      name: "Consistency King",
      description: "Complete your weekly goal for 4 weeks straight",
      icon: "⭐",
      rarity: "rare",
      unlocked: true,
      unlockedAt: new Date("2024-02-10"),
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [filterRarity, setFilterRarity] = useState<
    "all" | "common" | "uncommon" | "rare" | "epic" | "legendary"
  >("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "unlocked" | "progress" | "locked"
  >("all");

  useEffect(() => {
    loadAchievementsData();
  }, [user]);

  const loadAchievementsData = async () => {
    if (!user) return;

    try {
      // TODO: Replace with actual Supabase queries
      // Simulating data fetch
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLoading(false);
    } catch (error) {
      console.error("Error loading achievements data:", error);
      setLoading(false);
    }
  };

  const filteredAchievements = achievements.filter((achievement) => {
    // Filter by rarity
    if (filterRarity !== "all" && achievement.rarity !== filterRarity) {
      return false;
    }

    // Filter by status
    if (filterStatus === "unlocked" && !achievement.unlocked) {
      return false;
    }
    if (
      filterStatus === "progress" &&
      (!achievement.progress || achievement.unlocked)
    ) {
      return false;
    }
    if (
      filterStatus === "locked" &&
      (achievement.unlocked || achievement.progress !== undefined)
    ) {
      return false;
    }

    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const inProgressCount = achievements.filter(
    (a) => !a.unlocked && a.progress !== undefined
  ).length;
  const lockedCount = achievements.filter(
    (a) => !a.unlocked && a.progress === undefined
  ).length;

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
        <div className="mb-8">
          <GlassCard elevation={1} className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
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
                  Achievements
                </h1>
                  <p
                    className="text-sm"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.6)",
                    }}
                  >
                    {unlockedCount} unlocked · {inProgressCount} in progress ·{" "}
                    {lockedCount} locked
                      </p>
                    </div>
                  </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.7)",
                    }}
                  >
                    Status:
                  </span>
                  <Button
                    variant={filterStatus === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterStatus("all")}
                    style={
                      filterStatus === "all"
                        ? {
                            background: getSemanticColor("trust").gradient,
                            boxShadow: `0 4px 12px ${
                              getSemanticColor("trust").primary
                            }30`,
                          }
                        : {}
                    }
                  >
                    All
                  </Button>
                  <Button
                    variant={filterStatus === "unlocked" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterStatus("unlocked")}
                    style={
                      filterStatus === "unlocked"
                        ? {
                            background: getSemanticColor("success").gradient,
                            boxShadow: `0 4px 12px ${
                              getSemanticColor("success").primary
                            }30`,
                          }
                        : {}
                    }
                  >
                    Unlocked
                  </Button>
                  <Button
                    variant={filterStatus === "progress" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterStatus("progress")}
                    style={
                      filterStatus === "progress"
                        ? {
                            background: getSemanticColor("warning").gradient,
                            boxShadow: `0 4px 12px ${
                              getSemanticColor("warning").primary
                            }30`,
                          }
                        : {}
                    }
                  >
                    In Progress
                  </Button>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                    className="text-sm font-medium"
                    style={{
                      color: isDark
                        ? "rgba(255,255,255,0.7)"
                        : "rgba(0,0,0,0.7)",
                    }}
                  >
                    Rarity:
                                </span>
                  <Button
                    variant={filterRarity === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterRarity("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterRarity === "common" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterRarity("common")}
                  >
                    Common
                  </Button>
                  <Button
                    variant={filterRarity === "uncommon" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterRarity("uncommon")}
                  >
                    Uncommon
                  </Button>
                  <Button
                    variant={filterRarity === "rare" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterRarity("rare")}
                  >
                    Rare
                  </Button>
                  <Button
                    variant={filterRarity === "epic" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterRarity("epic")}
                  >
                    Epic
                  </Button>
                  <Button
                    variant={filterRarity === "legendary" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterRarity("legendary")}
                  >
                    Legendary
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAchievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>

        {/* Empty State */}
        {filteredAchievements.length === 0 && (
          <GlassCard elevation={2} className="p-12 text-center">
            <Award
              className="w-16 h-16 mx-auto mb-4"
              style={{
                color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
              }}
            />
            <p
              className="text-lg font-semibold mb-2"
              style={{
                color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
              }}
            >
              No achievements found
            </p>
            <p
              className="text-sm mb-4"
              style={{
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              Try adjusting your filters to see more achievements
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                setFilterRarity("all");
                setFilterStatus("all");
              }}
              style={{
                background: getSemanticColor("trust").gradient,
                boxShadow: `0 4px 12px ${getSemanticColor("trust").primary}30`,
              }}
            >
              Reset Filters
                    </Button>
          </GlassCard>
          )}
        </div>
    </AnimatedBackground>
  );
}

export default function AchievementsPage() {
  return (
    <ProtectedRoute>
      <AchievementsPageContent />
    </ProtectedRoute>
  );
}
