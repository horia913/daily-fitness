"use client";

import React, { useState, useEffect, useRef } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { AchievementCard } from "@/components/ui/AchievementCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Award, Filter } from "lucide-react";
import { AchievementService } from "@/lib/achievementService";
import type { AchievementProgress } from "@/lib/achievementService";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  progress?: number;
  requirement?: string;
  unlockedAt?: Date;
  unlockedTiers?: string[];
  isMastered?: boolean;
  nearMiss?: boolean;
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setLoading(false);
      setLoadError("Loading took too long. Tap Retry to try again.");
    }, 20_000);
    loadAchievementsData().finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    });
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
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
        
        const rarityMap: Record<string, "common" | "uncommon" | "rare" | "epic" | "legendary"> = {
          'workout': 'common',
          'milestone': 'common',
          'consistency': 'uncommon',
          'activity': 'uncommon',
          'wellness': 'uncommon',
          'performance': 'rare',
          'challenges': 'rare',
          'volume': 'epic',
          'program': 'epic',
          'transformation': 'legendary',
          'strength': 'legendary',
        };
        const rarity = rarityMap[template.category] || 'common';
        const icon = template.icon || '🏅';
        const isUnlocked = status === 'unlocked' || status === 'partially_unlocked';
        const isMastered = status === 'unlocked' && template.is_tiered;
        
        let description = template.description || '';
        if (template.is_tiered && nextTier) {
          description += ` (Next: ${nextTier.label} at ${nextTier.threshold})`;
        } else if (!template.is_tiered && template.single_threshold) {
          description += ` (Target: ${template.single_threshold})`;
        }
        
        let requirement: string | undefined;
        if (template.is_tiered) {
          if (nextTier) {
            requirement = `${currentValue}/${nextTier.threshold} for ${nextTier.label}`;
          } else if (isMastered) {
            requirement = `All tiers complete!`;
          } else {
            const tiers = [
              { threshold: template.tier_bronze_threshold },
              { threshold: template.tier_silver_threshold },
              { threshold: template.tier_gold_threshold },
              { threshold: template.tier_platinum_threshold }
            ].filter(t => t.threshold !== null && t.threshold !== undefined);
            requirement = `${currentValue}/${tiers[tiers.length - 1]?.threshold || 0}`;
          }
        } else {
          requirement = `${currentValue}/${template.single_threshold || 0}`;
        }

        // Near-miss: within 20% of next tier threshold
        let nearMiss = false;
        if (nextTier && nextTier.threshold > 0) {
          const ratio = currentValue / nextTier.threshold;
          nearMiss = ratio >= 0.8 && ratio < 1;
        }
        
        return {
          id: template.id,
          name: template.name,
          description,
          icon,
          rarity,
          unlocked: isUnlocked,
          progress: status === 'locked' ? undefined : progressPercent,
          requirement,
          unlockedAt: undefined,
          unlockedTiers: template.is_tiered ? unlockedTiers : undefined,
          isMastered,
          nearMiss,
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

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-32 pt-10 sm:px-6 lg:px-10">
        <div className="space-y-8">
          <div className="fc-card-shell backdrop-blur-[8px] p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => { window.location.href = "/client/progress"; }}
                  className="fc-surface w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border border-[color:var(--fc-glass-border)]"
                >
                  <ArrowLeft className="w-5 h-5 text-[color:var(--fc-text-primary)]" />
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--fc-aurora)]/20 text-[color:var(--fc-accent)] shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[color:var(--fc-text-primary)]">
                      Achievements
                    </h1>
                    <p className="text-sm text-[color:var(--fc-text-dim)] mt-1">
                      {unlockedCount} unlocked · {inProgressCount} in progress ·{" "}
                      {lockedCount} locked
                    </p>
                  </div>
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
          </div>

          <div className="my-3">
            <div className="mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-[color:var(--fc-text-dim)]" />
              <h2 className="text-sm font-semibold text-[color:var(--fc-text-primary)]">
                Filters
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--fc-text-subtle)]">
                  Status
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
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
                <div className="mt-2 flex flex-wrap gap-2">
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
          </div>

          {loadError ? (
            <div className="fc-card-shell backdrop-blur-[8px] p-12 text-center">
              <p className="text-[color:var(--fc-text-dim)] mb-4">{loadError}</p>
              <button type="button" onClick={() => window.location.reload()} className="fc-btn fc-btn-secondary fc-press h-10 px-6 text-sm">Retry</button>
            </div>
          ) : loading ? (
            <div className="fc-card-shell backdrop-blur-[8px] p-12 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[color:var(--fc-accent-purple)]" />
              <p className="mt-4 text-sm text-[color:var(--fc-text-dim)]">
                Loading achievements...
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col border-y border-white/5">
                {filteredAchievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    dense
                  />
                ))}
              </div>

              {filteredAchievements.length === 0 && (
                <div className="fc-card-shell backdrop-blur-[8px] p-12 text-center">
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
                </div>
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
