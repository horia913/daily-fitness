"use client";

/**
 * Dashboard Page - Client Home (Phase 1 Screen 1 — Cluster 7 mockup alignment).
 * Visual spec: `docs/mockups/client-screens-v5.html` Phone 1 ("01 Client · Dashboard").
 */

import React, { useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ClientPageShell, Eyebrow, IconButton, SectionHeader } from "@/components/client-ui";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { HeroWorkoutCard } from "@/components/client/HeroWorkoutCard";
import { AthleteScoreChip } from "@/components/client/AthleteScoreChip";
import { DailyCheckInHeroCard } from "@/components/client/DailyCheckInHeroCard";
import {
  Trophy,
  BarChart3,
  AlertTriangle,
  Flame,
  Bell,
  CircleCheck,
} from "lucide-react";
import { tierBackdropVariant } from "@/lib/tierBackdrop";
import { TierBadge, type Tier } from "@/components/ui/TierBadge";
import { usePageData } from "@/hooks/usePageData";
import {
  fetchDashboardPageData,
  type DashboardData,
} from "@/lib/clientDashboardPageData";
import type { DashboardPageData } from "@/lib/clientDashboardPageData";
import { getWorkoutStreakDisplay } from "@/lib/workoutStreakDisplay";

function formatClientDashboardDate(): string {
  const d = new Date();
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  return `${weekday} · ${month} ${day}`;
}

function greetingEyebrowText(
  loading: boolean,
  tw: DashboardData["todaysWorkout"] | undefined,
  weekTotal: number | undefined,
): string | null {
  if (loading) return null;
  if (!tw?.hasWorkout) return "Rest day · Recovery";
  if (
    tw.type === "program" &&
    tw.dayNumber != null &&
    weekTotal != null &&
    weekTotal > 0
  ) {
    return `Up next · Day ${tw.dayNumber} of ${weekTotal}`;
  }
  if (tw.hasWorkout) return "Up next · Today's training";
  return null;
}

export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const ACHIEVEMENT_TIER_MAP: Record<string, Tier> = {
    bronze: "bronze",
    silver: "silver",
    gold: "gold",
    platinum: "platinum",
    diamond: "diamond",
  };

  const achievementTier = (raw: string | null | undefined): Tier | null => {
    if (!raw) return null;
    const key = raw.toLowerCase();
    return ACHIEVEMENT_TIER_MAP[key] ?? null;
  };

  const fetchFn = useCallback(async (): Promise<DashboardPageData> => {
    if (!user?.id) {
      return {
        dashboard: null,
        athleteScore: null,
        hasCheckInToday: null,
        todayWellnessLog: null,
        checkinStreak: 0,
        hasScheduledCheckInThisPeriod: false,
        scoreError: null,
      };
    }
    return fetchDashboardPageData(user.id);
  }, [user?.id]);

  const { data: pageData, loading, error } = usePageData(fetchFn, [user?.id]);

  const dashboardData = pageData?.dashboard ?? null;
  const athleteScore = pageData?.athleteScore ?? null;
  const hasCheckInToday = pageData?.hasCheckInToday ?? null;
  const hasScheduledCheckInThisPeriod = pageData?.hasScheduledCheckInThisPeriod ?? false;
  const scoreError = pageData?.scoreError ?? null;
  const dailyDoneToday = hasCheckInToday === true;
  const monthlyDoneThisCycle = hasScheduledCheckInThisPeriod;
  const monthlyDue = !monthlyDoneThisCycle;

  const userName = dashboardData?.firstName || profile?.first_name || "there";
  const streak = dashboardData?.streak ?? 0;
  const weeklyProgress = dashboardData?.weeklyProgress ?? { current: 0, goal: 0 };
  const todaysWorkout = dashboardData?.todaysWorkout;
  const programProgressData = dashboardData?.programProgress;
  const weekTotal = programProgressData?.totalWeeks;
  const eyebrowText = greetingEyebrowText(loading, todaysWorkout, weekTotal);

  /** TODO(product): wire to real unread state when notifications backend exists. */
  const hasUnreadNotifications = false;
  /** TODO(product): `/client/notifications` route — navigate home until page exists. */
  const notificationsHref = "/client";

  const getAvatarUrl = () => {
    if (dashboardData?.avatarUrl) return dashboardData.avatarUrl;
    if (profile?.first_name) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.first_name}`;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "User"}`;
  };

  const streakDisp =
    getWorkoutStreakDisplay(streak) ?? {
      tierKey: "starting" as const,
      label: "Starting",
      flames: "🔥",
      flameClass: "text-amber-500/60 text-sm",
      accentClass: "text-amber-500/80",
      cardBorderClass: "border-l-amber-500/45",
      cardBgClass: "bg-amber-500/5 dark:bg-amber-950/20",
      pulseClass: "",
    };
  const streakSub =
    streak === 0 ? "Starting today" : streakDisp.label;

  const programPercent =
    programProgressData && programProgressData.totalSlots > 0
      ? programProgressData.percent
      : 0;
  const programWeekSub =
    programProgressData && programProgressData.totalWeeks > 0
      ? `Week ${programProgressData.currentWeek} of ${programProgressData.totalWeeks}`
      : "Week —";

  if (error) {
    return (
      <ProtectedRoute requiredRole="client">
        <AnimatedBackground>
          <ClientPageShell backdrop="info">
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
              <AlertTriangle
                className="w-10 h-10 text-[var(--fc-status-error)] mb-3"
                aria-hidden
              />
              <h2 className="text-lg font-semibold fc-text-primary mb-2">
                Couldn&apos;t load this page
              </h2>
              <p className="text-sm fc-text-dim mb-4">
                Something went wrong. Please try again.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-action"
              >
                Retry
              </button>
            </div>
          </ClientPageShell>
        </AnimatedBackground>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        <ClientPageShell
          className="max-w-lg px-0 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-visible"
          backdrop={tierBackdropVariant(athleteScore?.tier)}
        >
          {loading ? (
            <>
              <header className="mb-6 flex items-center justify-between px-5">
                <Skeleton variant="circular" className="h-[38px] w-[38px] shrink-0" />
                <div className="flex gap-2.5">
                  <Skeleton variant="circular" className="h-[38px] w-[38px]" />
                  <Skeleton variant="circular" className="h-[38px] w-[38px]" />
                </div>
              </header>
              <div className="mb-5 space-y-2 px-5">
                <Skeleton variant="text" className="h-4 w-40" />
                <Skeleton variant="text" className="h-8 w-56" />
                <Skeleton variant="text" className="h-4 w-48" />
              </div>
              <div className="mb-5 flex justify-end px-5">
                <Skeleton variant="circular" className="h-[60px] w-[60px]" />
              </div>
              <div className="mx-4 mb-5">
                <SkeletonCard />
              </div>
              <div className="mx-5 mb-5">
                <SkeletonCard />
              </div>
              <div className="mx-5 mb-5 grid grid-cols-3 gap-2">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </>
          ) : (
            <>
              {/* Topbar — mockup lines 163–167, 1263–1272 */}
              <header className="mb-0 flex items-center justify-between px-5 pt-0">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/client/me";
                  }}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--fc-glass-border)] p-0 hover:opacity-90 transition-opacity"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--fc-surface-elevated), var(--fc-surface-card))",
                  }}
                  aria-label="Open profile"
                >
                  <img
                    src={getAvatarUrl()}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
                <div className="flex items-center gap-2.5">
                  <IconButton
                    size="md"
                    variant="ghost"
                    className="btn-ghost-icon shrink-0 border-transparent"
                    aria-label="Daily check-in"
                    onClick={() => {
                      window.location.href = "/client/check-ins";
                    }}
                  >
                    <CircleCheck className="h-5 w-5 fc-text-dim" strokeWidth={1.6} />
                  </IconButton>
                  <IconButton
                    size="md"
                    variant="ghost"
                    className="btn-ghost-icon shrink-0 border-transparent"
                    aria-label="Notifications"
                    showDot={hasUnreadNotifications}
                    onClick={() => {
                      window.location.href = notificationsHref;
                    }}
                  >
                    <Bell className="h-5 w-5 fc-text-dim" strokeWidth={1.5} />
                  </IconButton>
                </div>
              </header>

              {/* Greeting — mockup .greeting lines 198–242, 1275–1279 */}
              <div className="px-5 pb-5 pt-5">
                {eyebrowText ? (
                  <Eyebrow
                    tone="lime"
                    dashboardEyebrow
                    className="mb-2.5"
                  >
                    {eyebrowText}
                  </Eyebrow>
                ) : null}
                <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1 max-[360px]:basis-full">
                    <h1
                      className="mb-2 font-semibold leading-[1.05] tracking-[-0.025em] fc-text-primary"
                      style={{
                        fontFamily: "var(--f-headline, var(--font-body))",
                        fontSize: "30px",
                      }}
                    >
                      Hey, <em className="fc-greeting-name">{userName}</em>.
                    </h1>
                    <p
                      className="fc-text-dim"
                      style={{ fontSize: "13px", marginTop: "8px" }}
                    >
                      {formatClientDashboardDate()}
                    </p>
                  </div>
                  <div className="max-[360px]:ml-auto">
                    <AthleteScoreChip athleteScore={scoreError ? null : athleteScore} />
                  </div>
                </div>
              </div>

              <HeroWorkoutCard
                todaysWorkout={todaysWorkout}
                programProgress={dashboardData?.programProgress ?? null}
                activeProgramPauseStatus={dashboardData?.activeProgramPauseStatus ?? null}
              />

              <DailyCheckInHeroCard
                dailyDoneToday={dailyDoneToday}
                monthlyDue={monthlyDue}
                monthlyDoneThisCycle={monthlyDoneThisCycle}
              />

              {/* Stat strip — mockup .strip / .strip-card lines 376–417, 1302–1322 */}
              {dashboardData ? (
                <section
                  className="mb-[22px] grid grid-cols-3 gap-2 px-5"
                  aria-label="Workout streak and program summary"
                >
                  <div
                    role="group"
                    aria-label={`${streak} day workout streak`}
                    className="rounded-[14px] border border-[var(--fc-glass-border)] bg-[var(--fc-surface-card)] p-3 text-left"
                  >
                    <Eyebrow tone="subtle" density="statStrip">
                      Streak
                    </Eyebrow>
                    <div
                      className={`flex items-center gap-1.5 font-bold tabular-nums leading-[0.9] tracking-[-0.02em] fc-text-primary ${streakDisp.pulseClass}`}
                      style={{
                        fontFamily:
                          "var(--f-display, var(--font-display, var(--font-number)))",
                        fontSize: "28px",
                      }}
                    >
                      <Flame
                        className="h-[18px] w-[18px] shrink-0 text-[var(--fc-status-warning)]"
                        aria-hidden
                      />
                      {streak}
                    </div>
                    <p className="mt-1 text-[10.5px] fc-text-subtle">{streakSub}</p>
                  </div>
                  <div className="rounded-[14px] border border-[var(--fc-glass-border)] bg-[var(--fc-surface-card)] p-3 text-left">
                    <Eyebrow tone="subtle" density="statStrip">
                      This week
                    </Eyebrow>
                    <div
                      className="flex items-baseline gap-0.5 font-bold tabular-nums leading-[0.9] tracking-[-0.02em] fc-text-primary"
                      style={{
                        fontFamily:
                          "var(--f-display, var(--font-display, var(--font-number)))",
                        fontSize: "28px",
                      }}
                    >
                      {weeklyProgress.current}
                      <span
                        className="text-lg font-medium fc-text-subtle"
                        style={{ fontSize: "18px" }}
                      >
                        /{weeklyProgress.goal || 0}
                      </span>
                    </div>
                    <p className="mt-1 text-[10.5px] fc-text-subtle">workouts done</p>
                  </div>
                  <div className="rounded-[14px] border border-[var(--fc-glass-border)] bg-[var(--fc-surface-card)] p-3 text-left">
                    <Eyebrow tone="subtle" density="statStrip">
                      Program
                    </Eyebrow>
                    <div
                      className="flex items-baseline gap-0.5 font-bold tabular-nums leading-[0.9] tracking-[-0.02em] fc-text-primary"
                      style={{
                        fontFamily:
                          "var(--f-display, var(--font-display, var(--font-number)))",
                        fontSize: "28px",
                      }}
                    >
                      {programPercent}
                      <span
                        className="text-lg font-medium fc-text-subtle"
                        style={{ fontSize: "18px" }}
                      >
                        %
                      </span>
                    </div>
                    <p className="mt-1 text-[10.5px] fc-text-subtle">{programWeekSub}</p>
                  </div>
                </section>
              ) : null}

              {/* Recent wins — mockup .section-head + .achievements lines 244–504, 1342–1367 */}
              {dashboardData?.highlights &&
                (dashboardData.highlights.prsThisMonth > 0 ||
                  dashboardData.highlights.latestAchievement != null ||
                  dashboardData.highlights.bestLeaderboardRank != null) && (
                  <section className="mb-6 px-5">
                    <SectionHeader
                      className="px-0"
                      title="Recent wins"
                      titleTone="display"
                      titleStyle={{
                        fontFamily: "var(--f-headline, var(--font-body))",
                        letterSpacing: "-0.01em",
                      }}
                      action={
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = "/client/progress";
                          }}
                          className="cursor-pointer border-0 bg-transparent p-0 text-xs font-medium fc-text-subtle transition-colors hover:fc-text-primary"
                          style={{ fontSize: "12px" }}
                        >
                          All →
                        </button>
                      }
                    />
                    <div className="flex flex-col gap-2">
                      {dashboardData.highlights.latestAchievement != null ? (
                        (() => {
                          const ach = dashboardData.highlights.latestAchievement!;
                          const rawTier = ach.tier;
                          const mappedTier = achievementTier(rawTier);
                          if (
                            process.env.NODE_ENV !== "production" &&
                            rawTier &&
                            mappedTier == null
                          ) {
                            console.warn(
                              "[client] Unrecognized achievement tier in highlights:",
                              rawTier,
                            );
                          }
                          const prs = dashboardData.highlights.prsThisMonth;
                          return (
                            <div
                              key="achievement"
                              className="flex items-center gap-3 rounded-[14px] border border-[var(--fc-glass-border)] bg-[var(--fc-surface-card)] px-3.5 py-3"
                            >
                              <div
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]"
                                style={{
                                  background: "var(--fc-accent-gold-soft)",
                                  color: "var(--fc-accent-gold)",
                                }}
                              >
                                <Trophy className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13.5px] font-semibold leading-tight fc-text-primary">
                                  <span
                                    style={{
                                      fontFamily: "var(--f-headline, var(--font-body))",
                                    }}
                                  >
                                    {ach.name}
                                  </span>
                                  {mappedTier ? (
                                    <>
                                      <span className="fc-text-subtle">·</span>
                                      <TierBadge tier={mappedTier} />
                                    </>
                                  ) : rawTier ? (
                                    <span className="fc-text-subtle">· {rawTier}</span>
                                  ) : null}
                                </div>
                                <p className="mt-0.5 text-[11px] fc-text-subtle">
                                  Latest medal earned
                                </p>
                              </div>
                              {prs > 0 ? (
                                <span
                                  className="shrink-0 font-bold tabular-nums"
                                  style={{
                                    fontFamily:
                                      "var(--f-display, var(--font-display, var(--font-number)))",
                                    fontSize: "22px",
                                    color: "var(--fc-accent-gold)",
                                  }}
                                >
                                  {prs}
                                </span>
                              ) : null}
                            </div>
                          );
                        })()
                      ) : dashboardData.highlights.prsThisMonth > 0 ? (
                        <div className="flex items-center gap-3 rounded-[14px] border border-[var(--fc-glass-border)] bg-[var(--fc-surface-card)] px-3.5 py-3">
                          <div
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]"
                            style={{
                              background: "var(--fc-accent-gold-soft)",
                              color: "var(--fc-accent-gold)",
                            }}
                          >
                            <Trophy className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-[13.5px] font-semibold leading-tight fc-text-primary"
                              style={{
                                fontFamily: "var(--f-headline, var(--font-body))",
                              }}
                            >
                              {dashboardData.highlights.prsThisMonth} PR
                              {dashboardData.highlights.prsThisMonth === 1
                                ? ""
                                : "s"}{" "}
                              this month
                            </p>
                            <p className="mt-0.5 text-[11px] fc-text-subtle">
                              Personal records
                            </p>
                          </div>
                          <span
                            className="shrink-0 font-bold tabular-nums"
                            style={{
                              fontFamily:
                                "var(--f-display, var(--font-display, var(--font-number)))",
                              fontSize: "22px",
                              color: "var(--fc-accent-gold)",
                            }}
                          >
                            {dashboardData.highlights.prsThisMonth}
                          </span>
                        </div>
                      ) : null}

                      {dashboardData.highlights.bestLeaderboardRank != null ? (
                        <div className="flex items-center gap-3 rounded-[14px] border border-[var(--fc-glass-border)] bg-[var(--fc-surface-card)] px-3.5 py-3">
                          <div
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]"
                            style={{
                              background: "var(--fc-accent-gold-soft)",
                              color: "var(--fc-accent-gold)",
                            }}
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-[13.5px] font-semibold leading-tight fc-text-primary"
                              style={{
                                fontFamily: "var(--f-headline, var(--font-body))",
                              }}
                            >
                              #{dashboardData.highlights.bestLeaderboardRank.rank}{" "}
                              ·{" "}
                              {dashboardData.highlights.bestLeaderboardRank
                                .exerciseName ?? "Leaderboard"}
                              {" "}leaderboard
                            </p>
                            <p className="mt-0.5 text-[11px] fc-text-subtle">
                              Top of your cohort
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </section>
                )}

            </>
          )}
        </ClientPageShell>
      </AnimatedBackground>
    </ProtectedRoute>
  );
}
