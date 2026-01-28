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
import { AchievementService } from "@/lib/achievementService";
import type { AchievementProgress } from "@/lib/achievementService";

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
  const { performanceSettings } = useTheme();

  const [achievements, setAchievements] = useState<Achievement[]>([]);

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
    if (!user) {
      setAchievements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get achievement progress (templates with progress)
      const achievementProgress = await AchievementService.getAchievementProgress(user.id);
      
      // Map to UI format
      const mappedAchievements: Achievement[] = achievementProgress.map((progress: AchievementProgress) => {
        const { template, currentValue, progress: progressPercent, unlockedTiers, status, nextTier } = progress;
        
        // Map category to rarity
        const rarityMap: Record<string, "common" | "uncommon" | "rare" | "epic" | "legendary"> = {
          'milestone': 'common',
          'activity': 'uncommon',
          'performance': 'rare',
          'volume': 'epic',
          'strength': 'legendary'
        };
        const rarity = rarityMap[template.category] || 'common';
        
        // Get icon from template or use default
        const icon = template.icon || '🏆';
        
        // Determine if unlocked (all tiers unlocked for tiered, or single threshold met for non-tiered)
        const unlocked = status === 'unlocked';
        
        // Build description with progress info
        let description = template.description || '';
        if (template.is_tiered && nextTier) {
          description += ` (Next: ${nextTier.label} at ${nextTier.threshold})`;
        } else if (!template.is_tiered && template.single_threshold) {
          description += ` (Target: ${template.single_threshold})`;
        }
        
        // Build requirement text
        let requirement: string | undefined;
        if (template.is_tiered) {
          const tiers = [
            { name: 'bronze', threshold: template.tier_bronze_threshold, label: template.tier_bronze_label },
            { name: 'silver', threshold: template.tier_silver_threshold, label: template.tier_silver_label },
            { name: 'gold', threshold: template.tier_gold_threshold, label: template.tier_gold_label },
            { name: 'platinum', threshold: template.tier_platinum_threshold, label: template.tier_platinum_label }
          ].filter(t => t.threshold !== null && t.threshold !== undefined);
          
          if (unlockedTiers.length > 0) {
            requirement = `Unlocked: ${unlockedTiers.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}`;
          } else if (nextTier) {
            requirement = `${currentValue}/${nextTier.threshold} for ${nextTier.label}`;
          } else {
            requirement = `${currentValue}/${tiers[tiers.length - 1]?.threshold || 0}`;
          }
        } else {
          requirement = `${currentValue}/${template.single_threshold || 0}`;
        }
        
        return {
          id: template.id,
          name: template.name,
          description: description,
          icon: icon,
          rarity: rarity,
          unlocked: unlocked,
          progress: status === 'locked' ? undefined : progressPercent, // Locked achievements have undefined progress
          requirement: requirement,
          unlockedAt: undefined // We don't track unlock date per template, only per tier
        };
      });
      
      setAchievements(mappedAchievements);
    } catch (error) {
      console.error("Error loading achievements data:", error);
      setAchievements([]); // Return empty array on error, no fallback data
    } finally {
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

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
        <div className="space-y-8">
          <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <Link href="/client/progress">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="fc-btn fc-btn-ghost h-10 w-10"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <span className="fc-badge fc-glass-soft text-[color:var(--fc-text-primary)]">
                    Progress Hub
                  </span>
                  <h1 className="mt-3 text-3xl font-bold text-[color:var(--fc-text-primary)] sm:text-4xl">
                    Achievements
                  </h1>
                  <p className="text-sm text-[color:var(--fc-text-dim)]">
                    {unlockedCount} unlocked · {inProgressCount} in progress ·{" "}
                    {lockedCount} locked
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="fc-glass-soft fc-card p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    Unlocked
                  </p>
                  <p className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                    {unlockedCount}
                  </p>
                </div>
                <div className="fc-glass-soft fc-card p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    In Progress
                  </p>
                  <p className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                    {inProgressCount}
                  </p>
                </div>
                <div className="fc-glass-soft fc-card p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                    Locked
                  </p>
                  <p className="text-xl font-semibold text-[color:var(--fc-text-primary)]">
                    {lockedCount}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard elevation={1} className="fc-glass fc-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--fc-glass-soft)]">
                <Filter className="h-5 w-5 text-[color:var(--fc-text-dim)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--fc-text-primary)]">
                  Filters
                </h2>
                <p className="text-sm text-[color:var(--fc-text-dim)]">
                  Narrow by status or rarity tier.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                  Status
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterStatus("all")}
                    className={`fc-btn ${
                      filterStatus === "all" ? "fc-btn-primary" : "fc-btn-ghost"
                    }`}
                  >
                    All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterStatus("unlocked")}
                    className={`fc-btn ${
                      filterStatus === "unlocked"
                        ? "fc-btn-primary"
                        : "fc-btn-ghost"
                    }`}
                  >
                    Unlocked
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterStatus("progress")}
                    className={`fc-btn ${
                      filterStatus === "progress"
                        ? "fc-btn-primary"
                        : "fc-btn-ghost"
                    }`}
                  >
                    In Progress
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterStatus("locked")}
                    className={`fc-btn ${
                      filterStatus === "locked"
                        ? "fc-btn-primary"
                        : "fc-btn-ghost"
                    }`}
                  >
                    Locked
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                  Rarity
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "all",
                    "common",
                    "uncommon",
                    "rare",
                    "epic",
                    "legendary",
                  ].map((rarity) => (
                    <Button
                      key={rarity}
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFilterRarity(
                          rarity as
                            | "all"
                            | "common"
                            | "uncommon"
                            | "rare"
                            | "epic"
                            | "legendary"
                        )
                      }
                      className={`fc-btn ${
                        filterRarity === rarity
                          ? "fc-btn-primary"
                          : "fc-btn-ghost"
                      }`}
                    >
                      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {loading ? (
            <GlassCard elevation={2} className="fc-glass fc-card p-12 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[color:var(--fc-accent-purple)]" />
              <p className="mt-4 text-sm text-[color:var(--fc-text-dim)]">
                Loading achievements...
              </p>
            </GlassCard>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAchievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>

              {filteredAchievements.length === 0 && (
                <GlassCard
                  elevation={2}
                  className="fc-glass fc-card p-12 text-center"
                >
                  <Award className="mx-auto mb-4 h-16 w-16 text-[color:var(--fc-text-subtle)]" />
                  <p className="mb-2 text-lg font-semibold text-[color:var(--fc-text-primary)]">
                    No achievements found
                  </p>
                  <p className="mb-4 text-sm text-[color:var(--fc-text-dim)]">
                    Try adjusting your filters to see more achievements.
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFilterRarity("all");
                      setFilterStatus("all");
                    }}
                    className="fc-btn fc-btn-secondary"
                  >
                    Reset Filters
                  </Button>
                </GlassCard>
              )}
            </>
          )}
        </div>
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
