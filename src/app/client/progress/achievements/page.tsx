"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { cn } from "@/lib/utils";
import { Award } from "lucide-react";
import { AchievementService } from "@/lib/achievementService";
import type { UserAchievement } from "@/lib/achievementService";
import { PsHero, PsSegmented, progressSuiteV1Styles } from "@/components/client/progress-suite";
import {
  TrophyCelebrationHero,
  TrophyStatsHero,
  TrophySectionHeader,
} from "@/components/client/achievements/TrophyRoomBlocks";
import { TrophyAchievementTile } from "@/components/client/achievements/TrophyAchievementTile";
import {
  buildLastUnlockByTemplate,
  collectionCounts,
  filterRowsForSegment,
  mapProgressToTrophyRow,
  pickCelebrationHero,
  sectionAlmostThere,
  sectionInProgressLow,
  sectionLocked,
  sectionRecentlyUnlocked,
  type FilterStatus,
  type TrophyRow,
} from "@/components/client/achievements/trophyRoomUtils";

const CYAN = "#4FE3E8";

function AchievementsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const [rows, setRows] = useState<TrophyRow[]>([]);
  const [unlockedSnapshot, setUnlockedSnapshot] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
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
      setRows([]);
      setUnlockedSnapshot([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const [achievementProgress, unlockedRows] = await Promise.all([
        AchievementService.getAchievementProgress(user.id),
        AchievementService.getUnlockedAchievements(user.id),
      ]);
      const lastByTemplate = buildLastUnlockByTemplate(unlockedRows);
      const mapped = achievementProgress.map((p) => mapProgressToTrophyRow(p, lastByTemplate));
      setUnlockedSnapshot(unlockedRows);
      setRows(mapped);
    } catch (error) {
      console.error("Error loading achievements data:", error);
      setRows([]);
      setUnlockedSnapshot([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filterRowsForSegment(rows, filterStatus);
  const { total, unlocked, inProgress, locked } = collectionCounts(rows);

  const recently = sectionRecentlyUnlocked(filtered);
  const almost = sectionAlmostThere(filtered);
  const inProgLow = sectionInProgressLow(filtered);
  const lockedSec = sectionLocked(filtered);

  const celebration = pickCelebrationHero(rows, unlockedSnapshot);

  const showCelebration = celebration != null && filterStatus === "all";

  const anySection =
    recently.length > 0 || almost.length > 0 || inProgLow.length > 0 || lockedSec.length > 0;

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <ClientPageShell className="relative z-10 max-w-lg mx-auto px-4 pb-32 pt-6 overflow-x-hidden">
        <div className={cn(progressSuiteV1Styles.psV1, "space-y-4")}>
          <PsHero
            glow="cyan"
            onBack={() => router.push("/client/progress")}
            backAriaLabel="Back to Progress"
            eyebrow="Progress · achievements"
            eyebrowColor={CYAN}
            title="Trophy room"
            subtitle="Milestones and progress across your training"
          />

          {loadError ? (
            <div className="py-8 px-4 text-center">
              <p className="text-sm" style={{ color: "var(--ps-t3)" }}>
                {loadError}
              </p>
              <p className="text-xs mt-1 mb-4" style={{ color: "var(--ps-t4)" }}>
                Refresh the page or try again in a moment.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex h-10 items-center justify-center rounded-lg border px-6 text-sm font-medium transition-colors"
                style={{
                  borderColor: "var(--ps-line)",
                  background: "var(--ps-card-2)",
                  color: "var(--ps-t2)",
                }}
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <PageSkeleton variant="list" />
          ) : (
            <>
              {showCelebration && celebration ? (
                <TrophyCelebrationHero pick={celebration} />
              ) : null}

              <TrophyStatsHero
                total={total}
                unlocked={unlocked}
                inProgress={inProgress}
                locked={locked}
              />

              <PsSegmented<FilterStatus>
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { value: "all", label: "All", count: total },
                  { value: "unlocked", label: "Unlocked", count: unlocked },
                  { value: "progress", label: "In progress", count: inProgress },
                  { value: "locked", label: "Locked", count: locked },
                ]}
                ariaLabel="Filter achievements by status"
              />

              <div className="space-y-5 pt-1">
                {recently.length > 0 ? (
                  <section className="space-y-2">
                    <TrophySectionHeader
                      eyebrow="Recently unlocked"
                      accent="lime"
                      count={recently.length}
                      unlockedFilterLabel={filterStatus === "unlocked"}
                    />
                    <div className="flex flex-col gap-2">
                      {recently.map((r) => (
                        <TrophyAchievementTile key={r.id} row={r} />
                      ))}
                    </div>
                  </section>
                ) : null}

                {almost.length > 0 ? (
                  <section className="space-y-2">
                    <TrophySectionHeader eyebrow="Almost there" accent="cyan" count={almost.length} />
                    <div className="flex flex-col gap-2">
                      {almost.map((r) => (
                        <TrophyAchievementTile key={r.id} row={r} />
                      ))}
                    </div>
                  </section>
                ) : null}

                {inProgLow.length > 0 ? (
                  <section className="space-y-2">
                    <TrophySectionHeader eyebrow="In progress" accent="cyan" count={inProgLow.length} />
                    <div className="flex flex-col gap-2">
                      {inProgLow.map((r) => (
                        <TrophyAchievementTile key={r.id} row={r} />
                      ))}
                    </div>
                  </section>
                ) : null}

                {lockedSec.length > 0 ? (
                  <section className="space-y-2">
                    <TrophySectionHeader eyebrow="Locked" accent="muted" count={lockedSec.length} />
                    <div className="flex flex-col gap-2">
                      {lockedSec.map((r) => (
                        <TrophyAchievementTile key={r.id} row={r} />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>

              {!anySection && (
                <div className="py-8 px-4 text-center">
                  <Award
                    className="mx-auto mb-3 h-12 w-12"
                    style={{ color: "var(--ps-t4)" }}
                    aria-hidden
                  />
                  <p className="text-sm mb-1" style={{ color: "var(--ps-t3)" }}>
                    No achievements match this filter
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("all")}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border px-5 text-sm font-semibold transition-colors"
                    style={{
                      borderColor: "var(--ps-cyan-dim)",
                      background: "var(--ps-cyan-soft)",
                      color: "var(--ps-cyan)",
                    }}
                  >
                    Show all
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
    <ProtectedRoute requiredRole="client">
      <AchievementsPageContent />
    </ProtectedRoute>
  );
}
