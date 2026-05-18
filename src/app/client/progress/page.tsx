"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { FloatingParticles } from "@/components/ui/FloatingParticles";
import {
  ChevronRight,
  Dumbbell,
  Star,
  Trophy,
  Award,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  LineChart,
} from "lucide-react";
import { ClientPageShell } from "@/components/client-ui";
import { withTimeout } from "@/lib/withTimeout";
import { cn } from "@/lib/utils";
import { PsSegmented, PsSectionEyebrow } from "@/components/client/progress-suite";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";
import { ClientScoreInsightsSection } from "@/components/client/ClientScoreInsightsSection";
import { usePageData } from "@/hooks/usePageData";
import {
  fetchDashboardPageData,
  type DashboardPageData,
} from "@/lib/clientDashboardPageData";
import {
  getProgressDashboard,
  type ProgressDashboardPayload,
} from "@/lib/progressHubCardsService";
import type { ProgressMonthHubSnapshot, ProgressWeekHubSnapshot } from "@/lib/progressStatsService";

const CYAN = "#4FE3E8";
const CYAN_BAR_END = "#34A8AD";

function formatHubDuration(totalMin: number): string {
  if (!totalMin || totalMin <= 0) return "0m";
  if (totalMin < 60) return `${Math.round(totalMin)}m`;
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function formatRecentWorkoutMeta(row: {
  dateLabel: string;
  volumeKg: number | null;
  durationMin: number | null;
}): string {
  const vol =
    row.volumeKg != null && row.volumeKg > 0
      ? `${Math.round(row.volumeKg).toLocaleString()} kg`
      : "—";
  const dur =
    row.durationMin != null && row.durationMin > 0
      ? `${Math.round(row.durationMin)} min`
      : "—";
  return `${row.dateLabel} · ${vol} · ${dur}`;
}

function MiniSparkline80({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  if (values.length < 2) return null;
  const w = 80;
  const h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0"
      aria-hidden
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgressHubContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { performanceSettings } = useTheme();

  const [recapMode, setRecapMode] = useState<"week" | "month">("month");
  const [dash, setDash] = useState<ProgressDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    return withTimeout(fetchDashboardPageData(user.id), 25000, "dashboard");
  }, [user?.id]);

  const { data: pageData } = usePageData(fetchFn, [user?.id]);

  const loadDashboard = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setLoadError(null);
      const d = await withTimeout(
        getProgressDashboard(user.id),
        26000,
        "progress-dashboard",
      );
      setDash(d);
    } catch (e: unknown) {
      console.error(e);
      setLoadError(
        e instanceof Error ? e.message : "Failed to load progress dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const monthHub = dash?.monthSnapshot.data;
  const weekHub = dash?.weekSnapshot.data;

  const recap = recapMode === "week" ? weekHub : monthHub;
  const recapWorkouts = recap?.workouts ?? 0;
  const recapDuration =
    recapMode === "week"
      ? (weekHub?.totalDurationMinutes ?? 0)
      : (monthHub?.totalDurationMinutes ?? 0);
  const recapVol =
    recapMode === "week"
      ? (weekHub?.volumeKg ?? 0)
      : (monthHub?.volumeKg ?? 0);
  const recapPrs =
    recapMode === "week"
      ? (weekHub?.newPRs ?? 0)
      : (monthHub?.newPRs ?? 0);

  const periodLabelUpper = useMemo(() => {
    if (recapMode === "month" && monthHub?.monthYearLabel) {
      return monthHub.monthYearLabel.toUpperCase();
    }
    if (recapMode === "week" && weekHub?.weekRangeLabel) {
      const parts = weekHub.weekRangeLabel.split("–");
      if (parts.length === 2) {
        return `${parts[0].trim().toUpperCase()} – ${parts[1].trim().toUpperCase()}`;
      }
      return weekHub.weekRangeLabel.toUpperCase();
    }
    return "";
  }, [recapMode, monthHub, weekHub]);

  const barCounts = useMemo(() => {
    if (recapMode === "month" && monthHub) {
      return monthHub.weeklyBarsW1toW5 ?? [0, 0, 0, 0, 0];
    }
    if (recapMode === "week" && weekHub) {
      return weekHub.dailyWorkoutCounts ?? [0, 0, 0, 0, 0, 0, 0];
    }
    return recapMode === "month" ? [0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0];
  }, [recapMode, monthHub, weekHub]);

  const maxBar = Math.max(...barCounts, 1);
  const barMaxPx = 56;
  const todayIdx =
    recapMode === "week" && weekHub
      ? weekHub.todayWeekdayIndex
      : -1;

  const goalsData = dash?.goals.data;
  const goalPct = useMemo(() => {
    if (!goalsData || goalsData.total <= 0) return 0;
    return Math.round((goalsData.completed / goalsData.total) * 100);
  }, [goalsData]);

  const ach = dash?.achievements.data;
  const achTotalDenom = (ach?.unlockedCount ?? 0) + (ach?.inProgressCount ?? 0);
  const achBarPct =
    achTotalDenom > 0
      ? Math.round(((ach?.unlockedCount ?? 0) / achTotalDenom) * 100)
      : 0;

  if (loadError) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
          <div className="py-6 px-4 text-center">
            <AlertTriangle
              className="w-7 h-7 mx-auto mb-3 fc-text-dim"
              strokeWidth={1.5}
              aria-hidden
            />
            <p className="text-sm fc-text-dim mb-4">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="fc-btn fc-btn-primary fc-press h-11 px-5 text-sm"
            >
              Retry
            </button>
          </div>
        </ClientPageShell>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}

      <ClientPageShell className="max-w-lg mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden">
        <div className={ps.psV1}>
          <div className="mb-4 min-w-0">
            <ClientScoreInsightsSection
              userId={user?.id ?? null}
              athleteScore={pageData?.athleteScore ?? null}
              scoreError={pageData?.scoreError ?? null}
            />
          </div>

          <section className="mb-5">
            <div className={ps.psMonthHero}>
              <div className="relative z-[1] mb-3 flex flex-wrap items-start justify-between gap-2">
                <p
                  className={cn(ps.psFontMono, "text-[9px] uppercase")}
                  style={{ color: "var(--ps-t3)", letterSpacing: "0.16em" }}
                >
                  {recapMode === "month" ? "THIS MONTH" : "THIS WEEK"}
                </p>
                <div className="flex flex-wrap items-center justify-end">
                  <PsSegmented
                    ariaLabel="Recap period"
                    options={[
                      { value: "week" as const, label: "Week" },
                      { value: "month" as const, label: "Month" },
                    ]}
                    value={recapMode}
                    onChange={setRecapMode}
                  />
                </div>
              </div>

              <div className="relative z-[1] flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <span
                    className={cn(ps.psFontDisplay, "text-4xl font-bold tabular-nums leading-none")}
                    style={{ color: CYAN }}
                  >
                    {loading ? "—" : recapWorkouts}
                  </span>
                  <p
                    className={cn(ps.psFontBody, "mt-1 text-[12px]")}
                    style={{ color: "var(--ps-t3)" }}
                  >
                    workouts
                  </p>
                </div>
                {periodLabelUpper ? (
                  <p
                    className={cn(ps.psFontMono, "max-w-[55%] text-right text-[9px] uppercase leading-snug")}
                    style={{ color: "var(--ps-t3)", letterSpacing: "0.1em" }}
                  >
                    {periodLabelUpper}
                  </p>
                ) : null}
              </div>

              <div className="relative z-[1] mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className={ps.psQuickTile}>
                  <span
                    className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")}
                    style={{ color: CYAN }}
                  >
                    {loading ? "—" : recapWorkouts}
                  </span>
                  <span
                    className={cn(ps.psFontMono, "text-[8.5px] uppercase")}
                    style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}
                  >
                    Workouts
                  </span>
                </div>
                <div className={ps.psQuickTile}>
                  <span
                    className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")}
                    style={{ color: "var(--ps-lime)" }}
                  >
                    {loading ? "—" : formatHubDuration(recapDuration)}
                  </span>
                  <span
                    className={cn(ps.psFontMono, "text-[8.5px] uppercase")}
                    style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}
                  >
                    Hours
                  </span>
                </div>
                <div className={ps.psQuickTile}>
                  <span
                    className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")}
                    style={{ color: "var(--ps-t1)" }}
                  >
                    {loading ? "—" : Math.round(recapVol).toLocaleString()}
                  </span>
                  <span
                    className={cn(ps.psFontMono, "text-[8.5px] uppercase")}
                    style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}
                  >
                    Vol kg
                  </span>
                </div>
                <div className={ps.psQuickTile}>
                  <span
                    className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")}
                    style={{ color: "var(--ps-warning)" }}
                  >
                    {loading ? "—" : recapPrs}
                  </span>
                  <span
                    className={cn(ps.psFontMono, "text-[8.5px] uppercase")}
                    style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}
                  >
                    New PRs
                  </span>
                </div>
              </div>

              <div
                className="relative z-[1] border-t pt-2 mt-3"
                style={{ borderColor: "var(--ps-line-2)", paddingTop: 8 }}
              >
                <p
                  className={cn(ps.psFontMono, "mb-2 text-[9px] uppercase")}
                  style={{ color: "var(--ps-t3)", letterSpacing: "0.16em" }}
                >
                  {recapMode === "month"
                    ? "Workouts per week (W1–W5)"
                    : "Workouts per day"}
                </p>
                <div
                  className={cn(
                    "flex justify-between gap-1.5",
                    recapMode === "month" ? "" : "",
                  )}
                >
                  {barCounts.map((count, i) => {
                    const hPx =
                      loading
                        ? 4
                        : Math.max(4, (count / maxBar) * barMaxPx);
                    const label =
                      recapMode === "month"
                        ? `W${i + 1}`
                        : ["M", "T", "W", "T", "F", "S", "S"][i] ?? "";
                    const highlight =
                      recapMode === "week" && i === todayIdx;
                    return (
                      <div
                        key={`${recapMode}-${i}`}
                        className="flex min-w-0 flex-1 flex-col items-center"
                      >
                        <span
                          className={cn(
                            ps.psFontDisplay,
                            "mb-1 text-sm font-bold tabular-nums",
                          )}
                          style={{
                            color:
                              count === 0 ? "var(--ps-t4)" : "var(--ps-t1)",
                          }}
                        >
                          {loading ? "—" : count}
                        </span>
                        <div className="flex h-[72px] w-full flex-col justify-end">
                          <div
                            className="w-full rounded-t-[6px] transition-opacity"
                            style={{
                              height: `${hPx}px`,
                              minHeight: 4,
                              opacity: count > 0 ? 0.9 : 0.35,
                              boxShadow: highlight
                                ? `0 0 0 2px ${CYAN}, 0 0 12px rgba(79,227,232,0.35)`
                                : undefined,
                              background: `linear-gradient(180deg, ${CYAN} 0%, ${CYAN_BAR_END} 100%)`,
                            }}
                          />
                        </div>
                        <span
                          className={cn(ps.psFontMono, "mt-1 text-[9px]")}
                          style={{ color: "var(--ps-t3)" }}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {!loading && recapWorkouts === 0 ? (
                  <p
                    className={cn(ps.psFontBody, "mt-3 text-center text-[11px] leading-snug")}
                    style={{ color: "var(--ps-t3)" }}
                  >
                    No workouts logged this{" "}
                    {recapMode === "month" ? "month" : "week"} yet — start
                    training to see your numbers
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <div
            role="button"
            tabIndex={0}
            className="fc-card-shell backdrop-blur-[8px] mb-5 w-full cursor-pointer p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ps-purple)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--fc-bg-base)]"
            style={{ borderLeft: "3px solid var(--ps-purple)" }}
            onClick={() => router.push("/client/progress/analytics")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push("/client/progress/analytics");
              }
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl leading-none"
                style={{
                  background: "color-mix(in srgb, var(--ps-purple) 18%, transparent)",
                  color: "var(--ps-purple)",
                }}
                aria-hidden
              >
                <LineChart className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(ps.psFontMono, "text-[9px] uppercase")}
                  style={{ color: "var(--ps-t3)", letterSpacing: "0.16em" }}
                >
                  Full analytics
                </p>
                <p
                  className={cn(ps.psFontBody, "mt-2 text-[13px] leading-snug")}
                  style={{ color: "var(--ps-t2)" }}
                >
                  Charts, strength, volume & wellness trends
                </p>
                <button
                  type="button"
                  className="mt-4 w-full rounded-lg bg-cyan-600/90 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push("/client/progress/analytics");
                  }}
                >
                  View analytics
                </button>
              </div>
            </div>
          </div>

          <PsSectionEyebrow accent="cyan" className="mb-2 mt-1">
            Recent workouts
          </PsSectionEyebrow>
          <section className="mb-5">
            <div className="fc-glass-soft rounded-[13px] border border-[color:var(--fc-glass-border)] overflow-hidden">
              {dash?.recentWorkouts.hasData &&
              dash.recentWorkouts.data &&
              dash.recentWorkouts.data.length > 0 ? (
                <ul>
                  {dash.recentWorkouts.data.map((row, idx) => (
                    <li
                      key={row.completedAt + row.name}
                      className={cn(
                        "px-3 py-2.5",
                        idx > 0 && "border-t border-[color:var(--fc-glass-border)]",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            ps.psIconTile,
                            ps.psIconTileCyan,
                            "mt-0.5 h-9 w-9 shrink-0",
                          )}
                        >
                          <Dumbbell className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                ps.psFontBody,
                                "min-w-0 truncate text-[13px] font-medium",
                              )}
                              style={{ color: "var(--ps-t1)" }}
                            >
                              {truncate(row.name, 24)}
                            </p>
                            <ChevronRight
                              className="h-4 w-4 shrink-0"
                              style={{ color: "var(--ps-t3)" }}
                              aria-hidden
                            />
                          </div>
                          <p
                            className={cn(
                              ps.psFontBody,
                              "mt-1 min-w-0 truncate text-[11px] leading-snug fc-text-dim",
                            )}
                          >
                            {formatRecentWorkoutMeta(row)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-4 text-center">
                  <p
                    className={cn(ps.psFontBody, "text-[13px]")}
                    style={{ color: "var(--ps-t2)" }}
                  >
                    No workouts logged yet
                  </p>
                  <Link
                    href="/client/train"
                    className={cn(
                      ps.psFontBody,
                      "mt-2 inline-block text-[12px] font-semibold",
                    )}
                    style={{ color: "var(--ps-cyan)" }}
                  >
                    Start your first workout →
                  </Link>
                </div>
              )}
              <div className="border-t border-[color:var(--fc-glass-border)] px-3 py-2">
                <button
                  type="button"
                  onClick={() => router.push("/client/progress/workout-logs")}
                  className={cn(
                    ps.psFontBody,
                    "text-[12px] font-medium",
                  )}
                  style={{ color: "var(--ps-cyan)" }}
                >
                  View history →
                </button>
              </div>
            </div>
          </section>

          <PsSectionEyebrow accent="good" className="mb-2">
            Body
          </PsSectionEyebrow>
          <section className="mb-5">
            <div
              role="button"
              tabIndex={0}
              className="fc-card-shell backdrop-blur-[8px] w-full cursor-pointer p-4 text-left"
              onClick={() => router.push("/client/progress/body-metrics")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push("/client/progress/body-metrics");
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      ps.psFontDisplay,
                      "text-2xl font-bold tabular-nums leading-tight",
                    )}
                    style={{ color: "var(--ps-t1)" }}
                  >
                    {dash?.body.data?.currentWeightKg != null
                      ? `${dash.body.data.currentWeightKg} kg`
                      : "—"}
                  </p>
                  <p
                    className={cn(ps.psFontBody, "mt-1 text-[11px]")}
                    style={{ color: "var(--ps-t3)" }}
                  >
                    Body metrics &amp; measurements
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {dash?.body.data?.delta30dKg != null ? (
                    <span
                      className={cn(
                        ps.psFontMono,
                        "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px]",
                      )}
                      style={{
                        borderColor: "var(--ps-line)",
                        color: "var(--ps-t2)",
                      }}
                    >
                      {dash.body.data.delta30dKg < 0 ? (
                        <TrendingDown
                          className="h-3.5 w-3.5 text-emerald-400"
                          aria-hidden
                        />
                      ) : dash.body.data.delta30dKg > 0 ? (
                        <TrendingUp
                          className="h-3.5 w-3.5 text-amber-400"
                          aria-hidden
                        />
                      ) : null}
                      {dash.body.data.delta30dKg > 0 ? "+" : ""}
                      {dash.body.data.delta30dKg} kg in 30d
                    </span>
                  ) : null}
                  {dash?.body.data?.sparkline90d &&
                  dash.body.data.sparkline90d.length >= 2 ? (
                    <MiniSparkline80
                      values={dash.body.data.sparkline90d}
                      color="var(--ps-good)"
                    />
                  ) : null}
                  <ChevronRight
                    className="h-4 w-4 shrink-0"
                    style={{ color: "var(--ps-t3)" }}
                    aria-hidden
                  />
                </div>
              </div>
              <Link
                href="/client/progress/body-metrics?tab=photos"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  ps.psFontBody,
                  "mt-2 inline-block text-[11px]",
                )}
                style={{ color: "var(--ps-cyan)" }}
              >
                View photos →
              </Link>
              {!dash?.body.hasData ? (
                <p
                  className={cn(ps.psFontBody, "mt-2 text-[11px]")}
                  style={{ color: "var(--ps-t3)" }}
                >
                  No weight logged yet — log your weight to track changes
                </p>
              ) : null}
            </div>
          </section>

          <PsSectionEyebrow accent="lime" className="mb-2">
            Goals
          </PsSectionEyebrow>
          <section className="mb-5">
            <button
              type="button"
              onClick={() => router.push("/client/goals")}
              className="fc-card-shell backdrop-blur-[8px] w-full text-left p-4"
            >
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="var(--fc-glass-border)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="var(--fc-accent-cyan)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${(goalPct / 100) * 163.4} 999`}
                    />
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums"
                    style={{ color: "var(--ps-t1)" }}
                  >
                    {goalPct}%
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  {goalsData && goalsData.total > 0 ? (
                    <>
                      <p
                        className={cn(ps.psFontBody, "text-[14px] font-semibold leading-tight")}
                        style={{ color: "var(--ps-t1)" }}
                      >
                        {truncate(goalsData.nextDueGoalName ?? "Goals", 28)}
                      </p>
                      <p
                        className={cn(ps.psFontMono, "mt-1 text-[10px]")}
                        style={{ color: "var(--ps-t3)" }}
                      >
                        {goalPct >= 100
                          ? "All goals complete!"
                          : goalsData.nextDueDateLabel
                            ? `Next due: ${goalsData.nextDueDateLabel}`
                            : "Next due: —"}
                      </p>
                    </>
                  ) : (
                    <p
                      className={cn(ps.psFontBody, "text-[14px] font-semibold")}
                      style={{ color: "var(--ps-t1)" }}
                    >
                      Set a goal to track momentum
                    </p>
                  )}
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--ps-t3)" }}
                  aria-hidden
                />
              </div>
            </button>
          </section>

          <PsSectionEyebrow accent="purple" className="mb-2">
            Strength &amp; rank
          </PsSectionEyebrow>
          <section className="mb-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => router.push("/client/progress/personal-records")}
              className={ps.psQuickTile}
            >
              <Star
                className="mx-auto mb-1 h-4 w-4 text-amber-400"
                aria-hidden
              />
              <span
                className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")}
                style={{ color: "var(--ps-t1)" }}
              >
                {loading ? "—" : dash?.strengthRank.data?.totalPRs ?? 0}
              </span>
              <span
                className={cn(ps.psFontMono, "text-[8.5px] uppercase")}
                style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}
              >
                PRs
              </span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/client/progress/leaderboard")}
              className={ps.psQuickTile}
            >
              <Trophy
                className="mx-auto mb-1 h-4 w-4 text-rose-400"
                aria-hidden
              />
              <span
                className={cn(ps.psFontDisplay, "text-lg font-bold tabular-nums")}
                style={{ color: "var(--ps-t1)" }}
              >
                {loading
                  ? "—"
                  : dash?.strengthRank.data?.bestRank != null
                    ? `#${dash.strengthRank.data.bestRank}`
                    : "—"}
              </span>
              <span
                className={cn(ps.psFontMono, "text-[8.5px] uppercase")}
                style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}
              >
                Best rank
              </span>
            </button>
          </section>

          <PsSectionEyebrow accent="warning" className="mb-2">
            Achievements
          </PsSectionEyebrow>
          <section className="mb-5">
            <button
              type="button"
              onClick={() => router.push("/client/progress/achievements")}
              className="fc-card-shell backdrop-blur-[8px] w-full text-left p-4"
            >
              <div className="flex items-start gap-3">
                <div className={cn(ps.psIconTile, ps.psIconTileWarning, "shrink-0")}>
                  <Award className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(ps.psFontBody, "truncate text-[13px] font-semibold")}
                      style={{ color: "var(--ps-t1)" }}
                    >
                      Latest:{" "}
                      {ach?.latestName
                        ? truncate(ach.latestName, 22)
                        : "—"}
                    </p>
                    <ChevronRight
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--ps-t3)" }}
                      aria-hidden
                    />
                  </div>
                  <p
                    className={cn(ps.psFontMono, "mt-1 text-[10px]")}
                    style={{ color: "var(--ps-t3)" }}
                  >
                    {ach?.unlockedCount ?? 0} unlocked ·{" "}
                    {ach?.inProgressCount ?? 0} in progress
                  </p>
                  <div
                    className="relative mt-3 h-2 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--fc-surface-sunken)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, achBarPct))}%`,
                        background: "var(--fc-domain-habits)",
                      }}
                    />
                  </div>
                  {!dash?.achievements.hasData ? (
                    <p
                      className={cn(ps.psFontBody, "mt-2 text-[11px]")}
                      style={{ color: "var(--ps-t3)" }}
                    >
                      Complete workouts and check-ins to unlock your first
                      achievement
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          </section>

          {dash?.recovery.hasData && dash.recovery.data ? (
            <>
              <PsSectionEyebrow accent="purple" className="mb-2">
                Recovery
              </PsSectionEyebrow>
              <section className="mb-5">
                <button
                  type="button"
                  onClick={() => router.push("/client/progress/recovery")}
                  className="fc-card-shell backdrop-blur-[8px] w-full text-left p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(ps.psFontBody, "text-[14px] font-semibold leading-snug")}
                        style={{ color: "var(--ps-t1)" }}
                      >
                        {dash.recovery.data.insightText}
                      </p>
                      <p
                        className={cn(ps.psFontMono, "mt-2 text-[10px]")}
                        style={{ color: "var(--ps-t3)" }}
                      >
                        Soreness{" "}
                        {dash.recovery.data.sorenessAvg != null
                          ? `${dash.recovery.data.sorenessAvg}/5`
                          : "—"}{" "}
                        · Sleep{" "}
                        {dash.recovery.data.sleepAvgHrs != null
                          ? `${dash.recovery.data.sleepAvgHrs}h`
                          : "—"}{" "}
                        this week
                      </p>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--ps-t3)" }}
                      aria-hidden
                    />
                  </div>
                </button>
              </section>
            </>
          ) : null}

          {dash?.activities.hasData && dash.activities.data ? (
            <>
              <PsSectionEyebrow accent="cyan" className="mb-2">
                Extra activities
              </PsSectionEyebrow>
              <section className="mb-5">
                <button
                  type="button"
                  onClick={() => router.push("/client/progress/activities")}
                  className="fc-card-shell backdrop-blur-[8px] w-full text-left p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(ps.psFontDisplay, "text-2xl font-bold tabular-nums")}
                        style={{ color: CYAN }}
                      >
                        {dash.activities.data.weeklyMinutes}
                      </p>
                      <p
                        className={cn(ps.psFontMono, "text-[9px] uppercase")}
                        style={{ color: "var(--ps-t3)", letterSpacing: "0.08em" }}
                      >
                        min (last 7 days)
                      </p>
                      <p
                        className={cn(ps.psFontBody, "mt-2 text-[12px]")}
                        style={{ color: "var(--ps-t2)" }}
                      >
                        Top: {dash.activities.data.topActivityType ?? "—"} ·{" "}
                        {dash.activities.data.topActivityMinutes} min
                      </p>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--ps-t3)" }}
                      aria-hidden
                    />
                  </div>
                </button>
              </section>
            </>
          ) : null}
        </div>
      </ClientPageShell>
    </AnimatedBackground>
  );
}

export default function ProgressHub() {
  return (
    <ProtectedRoute requiredRole="client">
      <ProgressHubContent />
    </ProtectedRoute>
  );
}
