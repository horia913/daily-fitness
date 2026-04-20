"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { AchievementCard } from "@/components/ui/AchievementCard";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { cn } from "@/lib/utils";
import { ArrowLeft, Award } from "lucide-react";
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
  const router = useRouter();
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

  const tabChipBase =
    "px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.1em] border shrink-0 transition-colors";
  const tabChipActive =
    "bg-[color-mix(in_srgb,var(--fc-accent)_20%,transparent)] text-[color:var(--fc-accent)] border-[color-mix(in_srgb,var(--fc-accent)_30%,transparent)]";
  const tabChipInactive =
    "fc-glass-soft fc-text-dim border-[color:var(--fc-glass-border)] hover:fc-text-primary";

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <ClientPageShell className="relative z-10 max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
        <div className="space-y-6">
          {/* Flat header */}
          <div className="flex items-start gap-3 mb-4">
            <button
              type="button"
              onClick={() => router.push("/client/progress")}
              className="w-10 h-10 shrink-0 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft flex items-center justify-center fc-text-dim hover:fc-text-primary transition-colors"
              aria-label="Back to Progress"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1 pt-0.5">
              <h1 className="text-xl font-bold fc-text-primary tracking-tight">Achievements</h1>
              <p className="text-xs fc-text-dim mt-1 leading-relaxed">
                Milestones and progress across your training.
              </p>
            </div>
          </div>

          {/* Stat strip */}
          <div className="rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft p-3 flex items-stretch">
            <div className="flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 py-1">
              <span className="text-base font-semibold tabular-nums fc-text-primary">{unlockedCount}</span>
              <span className="text-[10px] uppercase tracking-wider fc-text-dim text-center leading-tight">
                Unlocked
              </span>
            </div>
            <div className="w-px self-stretch min-h-8 bg-[color:var(--fc-glass-border)]" />
            <div className="flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 py-1">
              <span className="text-base font-semibold tabular-nums fc-text-primary">{inProgressCount}</span>
              <span className="text-[10px] uppercase tracking-wider fc-text-dim text-center leading-tight">
                In progress
              </span>
            </div>
            <div className="w-px self-stretch min-h-8 bg-[color:var(--fc-glass-border)]" />
            <div className="flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 py-1">
              <span className="text-base font-semibold tabular-nums fc-text-primary">{lockedCount}</span>
              <span className="text-[10px] uppercase tracking-wider fc-text-dim text-center leading-tight">
                Locked
              </span>
            </div>
          </div>

          {/* Filters — reference chips, stacked sections (no lg: grid) */}
          <div className="space-y-4">
            <p id="achievements-status-label" className="text-[10px] font-bold uppercase tracking-wider fc-text-dim">Status</p>
            <div className="-mx-4 px-4 mb-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex flex-wrap gap-2 min-w-min" role="tablist" aria-labelledby="achievements-status-label">
                {(
                  [
                    ["all", "All"],
                    ["unlocked", "Unlocked"],
                    ["progress", "In progress"],
                    ["locked", "Locked"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={filterStatus === key}
                    onClick={() => setFilterStatus(key)}
                    className={cn(
                      tabChipBase,
                      filterStatus === key ? tabChipActive : tabChipInactive
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p id="achievements-rarity-label" className="text-[10px] font-bold uppercase tracking-wider fc-text-dim">Rarity</p>
            <div className="-mx-4 px-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex flex-wrap gap-2 min-w-min" role="tablist" aria-labelledby="achievements-rarity-label">
                {(
                  [
                    "all",
                    "common",
                    "uncommon",
                    "rare",
                    "epic",
                    "legendary",
                  ] as const
                ).map((rarity) => (
                  <button
                    key={rarity}
                    type="button"
                    role="tab"
                    aria-selected={filterRarity === rarity}
                    onClick={() => setFilterRarity(rarity)}
                    className={cn(
                      tabChipBase,
                      filterRarity === rarity ? tabChipActive : tabChipInactive
                    )}
                  >
                    {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loadError ? (
            <div className="py-8 px-4 text-center">
              <p className="text-sm fc-text-dim mb-1">{loadError}</p>
              <p className="text-xs fc-text-subtle mb-4">Refresh the page or try again in a moment.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[color:var(--fc-glass-border)] fc-glass-soft px-6 text-sm font-medium fc-text-dim hover:fc-text-primary transition-colors"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <PageSkeleton variant="list" />
          ) : (
            <>
              {/* Single column at all widths — avoids tight 2-col at ~375px; AchievementCard unchanged */}
              <div className="flex flex-col border-y border-[color:var(--fc-glass-border)]">
                {filteredAchievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} dense />
                ))}
              </div>

              {filteredAchievements.length === 0 && (
                <div className="py-8 px-4 text-center">
                  <Award className="mx-auto mb-3 h-12 w-12 fc-text-subtle" aria-hidden />
                  <p className="text-sm fc-text-dim mb-1">No achievements match these filters</p>
                  <p className="text-xs fc-text-subtle mb-4">Try widening status or rarity.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterRarity("all");
                      setFilterStatus("all");
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--fc-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--fc-accent)_10%,transparent)] px-5 text-sm font-semibold text-[color:var(--fc-accent)]"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </ClientPageShell>
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
