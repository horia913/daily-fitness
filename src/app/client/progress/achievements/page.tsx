"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { ClientPageShell } from "@/components/client-ui";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { cn } from "@/lib/utils";
import { Award } from "lucide-react";
import { AchievementService } from "@/lib/achievementService";
import type { UserAchievement } from "@/lib/achievementService";
import { progressSuiteV1Styles } from "@/components/client/progress-suite";
import {
  GalleryEntrance,
  TrophyCelebrationHero,
  TrophyStatsHero,
  TrophySectionHeader,
  TrophyWingFilter,
  TrophyShowcaseShelf,
} from "@/components/client/achievements/TrophyRoomBlocks";
import { TrophyAchievementTile } from "@/components/client/achievements/TrophyAchievementTile";
import tr from "@/components/client/achievements/trophyRoomV1.module.css";
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

function AchievementsPageContent() {
  const router = useRouter();
  const { user } = useAuth();

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
  const showShelf = filterStatus === "all" && recently.length > 0;
  /** On All, shelf is the visual; still list cases so details aren't lost */
  const listRecently = recently;

  const anySection =
    recently.length > 0 || almost.length > 0 || inProgLow.length > 0 || lockedSec.length > 0;

  return (
    <ClientPageShell className="relative z-10 max-w-lg lg:max-w-3xl mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
      <div className={cn(progressSuiteV1Styles.psV1, tr.trophyRoom, "space-y-4")}>
        <GalleryEntrance
          onBack={() => router.push("/client/me")}
          unlocked={unlocked}
          total={total}
        />

        {loadError ? (
          <div className="py-8 px-4 text-center">
            <p className="text-sm" style={{ color: "var(--ps-t3)" }}>
              {loadError}
            </p>
            <p className="text-xs mt-1 mb-4" style={{ color: "var(--ps-t4)" }}>
              Try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoadError(null);
                void loadAchievementsData();
              }}
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

            <TrophyWingFilter
              value={filterStatus}
              onChange={setFilterStatus}
              total={total}
              unlocked={unlocked}
              inProgress={inProgress}
              locked={locked}
            />

            {showShelf ? (
              <TrophyShowcaseShelf rows={recently} title="Spotlight shelf" />
            ) : null}

            <div className="space-y-5 pt-1">
              {listRecently.length > 0 ? (
                <section className="space-y-2">
                  <TrophySectionHeader
                    eyebrow={showShelf ? "Display cases" : "Recently unlocked"}
                    accent="action"
                    count={listRecently.length}
                    unlockedFilterLabel={filterStatus === "unlocked"}
                  />
                  <div className="flex flex-col gap-2.5">
                    {listRecently.map((r) => (
                      <TrophyAchievementTile key={r.id} row={r} />
                    ))}
                  </div>
                </section>
              ) : null}

              {almost.length > 0 ? (
                <section className="space-y-2">
                  <TrophySectionHeader eyebrow="Almost there" accent="cyan" count={almost.length} />
                  <div className="flex flex-col gap-2.5">
                    {almost.map((r) => (
                      <TrophyAchievementTile key={r.id} row={r} />
                    ))}
                  </div>
                </section>
              ) : null}

              {inProgLow.length > 0 ? (
                <section className="space-y-2">
                  <TrophySectionHeader eyebrow="In progress" accent="cyan" count={inProgLow.length} />
                  <div className="flex flex-col gap-2.5">
                    {inProgLow.map((r) => (
                      <TrophyAchievementTile key={r.id} row={r} />
                    ))}
                  </div>
                </section>
              ) : null}

              {lockedSec.length > 0 ? (
                <section className="space-y-2">
                  <TrophySectionHeader eyebrow="The vault" accent="muted" count={lockedSec.length} />
                  <div className="flex flex-col gap-2.5">
                    {lockedSec.map((r) => (
                      <TrophyAchievementTile key={r.id} row={r} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            {!anySection && (
              <div className={tr.emptyWing}>
                <Award className={tr.emptyWingIcon} aria-hidden />
                <p className="text-sm mb-1" style={{ color: "var(--ps-t3)" }}>
                  This wing is empty
                </p>
                <p className="text-xs" style={{ color: "var(--ps-t4)" }}>
                  Switch filters or keep training to light more trophies.
                </p>
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={tr.emptyWingBtn}
                >
                  Show all wings
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </ClientPageShell>
  );
}

export default function AchievementsPage() {
  return (
    <ProtectedRoute requiredRole="client">
      <AchievementsPageContent />
    </ProtectedRoute>
  );
}
