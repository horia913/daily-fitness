"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertTriangle,
  ArrowLeft,
  Trophy,
  Activity,
  Scale,
  Accessibility,
  HeartPulse,
  LineChart,
  Footprints,
  ChevronRight,
} from "lucide-react";
import { ClientPageShell } from "@/components/client-ui";
import { withTimeout } from "@/lib/withTimeout";
import { cn } from "@/lib/utils";
import ps from "@/components/client/progress-suite/progressSuiteV1.module.css";
import hub from "@/components/client/progress/clientProgressHub.module.css";
import { TrainingVolumeSection } from "@/components/client-progress-analytics/TrainingVolumeSection";
import { WorkoutLogCard } from "@/components/client/WorkoutLogCard";
import {
  fetchClientProgressPageData,
  fetchHubRangeSlice,
  hubRangeToVolumeWeeks,
  type HubPageRange,
} from "@/lib/clientProgressPageData";

const RANGE_OPTS: { value: HubPageRange; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "4w", label: "4 weeks" },
  { value: "3m", label: "3 months" },
];

function formatHubDuration(totalMin: number): string {
  if (!totalMin || totalMin <= 0) return "0m";
  if (totalMin < 60) return `${Math.round(totalMin)}m`;
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatVolCompact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return `${Math.round(v)}`;
}

function pctClass(pct: number): string {
  if (Math.abs(pct) < 0.05) return hub.pcFlat;
  return pct > 0 ? hub.pcUp : hub.pcDn;
}

function formatPct(pct: number): string {
  if (Math.abs(pct) < 0.05) return "— 0%";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${Math.round(pct)}%`;
}

function ProgressPageContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [pageRange, setPageRange] = useState<HubPageRange>("week");

  const mainQuery = useQuery({
    queryKey: ["client-progress", user?.id],
    queryFn: () =>
      withTimeout(
        fetchClientProgressPageData(user!.id),
        28000,
        "progress-page",
      ),
    enabled: !!user?.id,
  });

  const data = mainQuery.data ?? null;
  const clientTimezone = data?.clientTimezone;

  const rangeSliceQuery = useQuery({
    queryKey: ["client-progress-range", user?.id, pageRange, clientTimezone],
    queryFn: () =>
      fetchHubRangeSlice(user!.id, clientTimezone!, pageRange),
    enabled: !!user?.id && !!clientTimezone && pageRange !== "week",
  });

  const { volumeStats, topProgressions } = useMemo(() => {
    if (pageRange === "week") {
      return {
        volumeStats: data?.volumeStats ?? null,
        topProgressions: data?.topProgressions ?? [],
      };
    }
    return {
      volumeStats: rangeSliceQuery.data?.volumeStats ?? null,
      topProgressions: rangeSliceQuery.data?.topProgressions ?? [],
    };
  }, [pageRange, data?.volumeStats, data?.topProgressions, rangeSliceQuery.data]);

  const loading = mainQuery.isLoading;
  const loadError = mainQuery.isError
    ? mainQuery.error instanceof Error
      ? mainQuery.error.message
      : "Failed to load progress"
    : null;
  const rangeBusy = pageRange !== "week" && rangeSliceQuery.isFetching;

  const dash = data?.dashboard;
  const weekHub = dash?.weekSnapshot.data;
  const monthHub = dash?.monthSnapshot.data;
  const adherence = data?.programAdherence;
  const explore = data?.explore;

  const volumeWeeks = hubRangeToVolumeWeeks(pageRange);

  const rhythmFromVolume = (() => {
    if (!volumeStats?.weeklyData?.length || pageRange === "week") return null;
    const wd = volumeStats.weeklyData;
    const workouts = wd.reduce((s, w) => s + w.workoutCount, 0);
    const volumeKg = wd.reduce((s, w) => s + w.totalVolume, 0);
    return {
      workouts,
      volumeKg,
      bars: wd.map((w) => w.workoutCount),
      labels: wd.map((w) => {
        const d = new Date(w.weekStart + "T12:00:00");
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }),
    };
  })();

  const recapWorkouts =
    pageRange === "week"
      ? (weekHub?.workouts ?? 0)
      : (rhythmFromVolume?.workouts ?? monthHub?.workouts ?? 0);
  const recapDuration =
    pageRange === "week"
      ? (weekHub?.totalDurationMinutes ?? 0)
      : (monthHub?.totalDurationMinutes ?? 0);
  const recapVol =
    pageRange === "week"
      ? (weekHub?.volumeKg ?? 0)
      : (rhythmFromVolume?.volumeKg ?? monthHub?.volumeKg ?? 0);
  const streakDays =
    pageRange === "week"
      ? (weekHub?.checkinStreak ?? 0)
      : (monthHub?.streakDays ?? weekHub?.checkinStreak ?? 0);

  const periodLabel =
    pageRange === "week"
      ? (weekHub?.weekRangeLabel ?? "")
      : pageRange === "4w"
        ? "Last 4 weeks"
        : "Last 3 months";

  const barCounts =
    pageRange === "week"
      ? (weekHub?.dailyWorkoutCounts ?? [0, 0, 0, 0, 0, 0, 0])
      : (rhythmFromVolume?.bars ?? monthHub?.weeklyBarsW1toW5 ?? [0, 0, 0, 0, 0]);
  const barLabels =
    pageRange === "week"
      ? ["M", "T", "W", "T", "F", "S", "S"]
      : (rhythmFromVolume?.labels ??
        barCounts.map((_, i) => `W${i + 1}`));
  const maxBar = Math.max(...barCounts, 1);

  const exploreTiles = [
    {
      href: "/client/progress/personal-records",
      hue: "var(--hub-gold)",
      icon: Trophy,
      name: "Personal records",
      sub: "Full list & timeline",
      value: loading ? "—" : String(explore?.personalRecords ?? 0),
    },
    {
      href: "/client/progress/performance",
      hue: "var(--hub-aqua)",
      icon: Activity,
      name: "Performance",
      sub: "Jumps, sprints, cardio",
      value: loading ? "—" : String(explore?.performanceTests ?? 0),
    },
    {
      href: "/client/progress/body-metrics",
      hue: "var(--hub-good)",
      icon: Scale,
      name: "Body",
      sub: "Weight & measurements",
      value:
        loading || explore?.bodyWeightKg == null
          ? "—"
          : `${explore.bodyWeightKg}`,
      valueSuffix: explore?.bodyWeightKg != null ? " kg" : undefined,
    },
    {
      href: "/client/progress/mobility",
      hue: "var(--hub-purple)",
      icon: Accessibility,
      name: "Mobility",
      sub: "Coach assessments",
      value: loading ? "—" : String(explore?.mobilityAssessments ?? 0),
    },
    {
      href: "/client/progress/recovery",
      hue: "var(--hub-hot)",
      icon: HeartPulse,
      name: "Recovery",
      sub: "Load, sleep, soreness",
      value: loading ? "—" : (explore?.recoveryStatus ?? "—"),
    },
    {
      href: "/client/progress/analytics",
      hue: "var(--hub-accent)",
      icon: LineChart,
      name: "Full analytics",
      sub: "All charts & trends",
      value: "→",
    },
    {
      href: "/client/activity?tab=trends",
      hue: "var(--hub-warn)",
      icon: Footprints,
      name: "Activities",
      sub: "Cardio, walks & other",
      value: loading ? "—" : String(explore?.activityCount30d ?? 0),
    },
  ];

  if (loadError) {
    return (
      <ClientPageShell className={cn("mx-auto px-4 pb-[var(--fc-bottom-safe-area)] pt-6", hub.shell)}>
        <div className="py-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-7 w-7 fc-text-dim" />
          <p className="mb-4 text-sm fc-text-dim">{loadError}</p>
          <button
            type="button"
            onClick={() => void mainQuery.refetch()}
            className="fc-btn fc-btn-primary fc-press h-11 px-5 text-sm"
          >
            Retry
          </button>
        </div>
      </ClientPageShell>
    );
  }

  return (
    <ClientPageShell
      className={cn(
        "mx-auto max-w-lg px-4 pb-[var(--fc-bottom-safe-area)] pt-6 overflow-x-hidden",
        hub.shell,
        hub.hub,
      )}
    >
      <div className={ps.psV1}>
        <header className="mb-4 flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/client/me")}
            className="fc-surface mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--fc-glass-border)]"
            aria-label="Back to Me"
          >
            <ArrowLeft className="h-4 w-4 fc-text-primary" />
          </button>
          <div className="min-w-0">
            <h1
              className={cn(ps.psFontDisplay, "text-[26px] font-extrabold fc-text-primary")}
              style={{ letterSpacing: "-0.025em" }}
            >
              Progress
            </h1>
            <p className={cn(ps.psFontBody, "mt-1 text-[12px]")} style={{ color: "var(--hub-dim)" }}>
              How am I progressing?
            </p>
          </div>
        </header>

        <div
          className={hub.range}
          role="tablist"
          aria-label="Progress time range"
        >
          {RANGE_OPTS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={pageRange === opt.value}
              className={cn(hub.rangeBtn, pageRange === opt.value && hub.rangeBtnOn)}
              onClick={() => setPageRange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={hub.cols}>
          <div className={hub.colLeft}>
            {/* Rhythm */}
            <section className={cn(hub.card, hub.cardRail)} style={{ ["--h" as string]: "var(--hub-accent)" }}>
              <div className={hub.rhythmBig}>
                <span className={hub.rhythmN}>{loading ? "—" : recapWorkouts}</span>
                <span className={hub.rhythmL}>workouts</span>
                {periodLabel ? <span className={hub.rhythmDt}>{periodLabel}</span> : null}
              </div>
              <div className={hub.tiles}>
                <div className={hub.tile}>
                  <div className={hub.tileV}>
                    {loading ? "—" : formatHubDuration(recapDuration)}
                  </div>
                  <div className={hub.tileK}>Duration</div>
                </div>
                <div className={hub.tile}>
                  <div className={hub.tileV}>
                    {loading ? "—" : formatVolCompact(recapVol)}
                  </div>
                  <div className={hub.tileK}>Volume kg</div>
                </div>
                <div className={hub.tile}>
                  <div className={hub.tileV} style={{ color: "var(--hub-gold)" }}>
                    {loading ? "—" : streakDays}
                  </div>
                  <div className={hub.tileK}>Streak</div>
                </div>
                <div className={hub.tile}>
                  <div className={hub.tileV} style={{ color: "var(--hub-good)" }}>
                    {loading
                      ? "—"
                      : adherence?.adherencePct != null
                        ? `${adherence.adherencePct}%`
                        : "—"}
                  </div>
                  <div className={hub.tileK}>Adherence</div>
                </div>
              </div>
              {adherence && adherence.scheduledThisWeek > 0 ? (
                <p className={hub.prog}>
                  Program ·{" "}
                  <b>
                    {adherence.completedThisWeek} of {adherence.scheduledThisWeek}
                  </b>{" "}
                  required workouts this week
                </p>
              ) : null}
              <div
                className={cn(
                  hub.days,
                  pageRange !== "week" && barCounts.length === 4 && hub.daysFour,
                  pageRange !== "week" && barCounts.length === 5 && hub.daysFive,
                )}
              >
                {barCounts.map((count, i) => {
                  const hPct = loading ? 0 : Math.round((count / maxBar) * 100);
                  return (
                    <div key={`${pageRange}-${i}`} className={hub.day}>
                      <div className={hub.dayBar}>
                        {hPct > 0 ? (
                          <i className={hub.dayFill} style={{ height: `${Math.max(18, hPct)}%` }} />
                        ) : null}
                      </div>
                      <div className={hub.dayLbl}>{barLabels[i] ?? ""}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Recent */}
            <div className={hub.eyebrow}>Recent sessions</div>
            <section>
              {loading ? (
                <p className="px-1 py-3 text-center text-sm fc-text-dim">Loading…</p>
              ) : data?.historyItems && data.historyItems.length > 0 ? (
                <ul className="space-y-0">
                  {data.historyItems.map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      {item.kind === "workout" ? (
                        <WorkoutLogCard log={item.log} />
                      ) : (
                        <Link
                          href="/client/activity?tab=trends"
                          className={ps.psLogRow}
                        >
                          <span className={ps.psLogStripe} aria-hidden />
                          <div className={ps.psLogInfo}>
                            <p className="truncate text-[13px] font-semibold fc-text-primary">
                              {item.title}
                            </p>
                            <p className="mt-1 text-[11px] fc-text-dim">{item.meta}</p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 self-center fc-text-dim" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-1 py-3 text-center text-[13px] fc-text-dim">
                  No sessions yet
                </p>
              )}
              <Link href="/client/progress/workout-logs" className={hub.linkOut}>
                View full history →
              </Link>
            </section>

            {/* Volume */}
            <div className={hub.eyebrow}>Training volume</div>
            <TrainingVolumeSection
              stats={volumeStats}
              volumeWeeks={volumeWeeks}
              hideRangeTabs
              busy={loading || rangeBusy}
            />
          </div>

          <div className={hub.colRight}>
            {/* Strength summary */}
            <div className={hub.eyebrow}>Strength</div>
            <section className={hub.card}>
              {!loading && topProgressions.length === 0 ? (
                <p className="text-[12px] fc-text-dim">
                  Log loaded resistance work to see est. 1RM gains.
                </p>
              ) : (
                topProgressions.map((p) => {
                  const sessions =
                    data?.trainedExercises.find((e) => e.id === p.exerciseId)
                      ?.sessionCount ?? p.dataPoints.length;
                  return (
                    <div key={p.exerciseId} className={hub.sg}>
                      <span className={hub.sgNm}>
                        <div className={hub.sgE}>{p.exerciseName}</div>
                        <div className={hub.sgS}>
                          est 1RM · {sessions} sessions
                        </div>
                      </span>
                      <span className={hub.sgRm}>
                        <div className={hub.sgV}>
                          {Math.round(p.currentOneRM * 10) / 10}
                          <span className={hub.sgU}> kg</span>
                        </div>
                      </span>
                      <span className={cn(hub.sgPc, pctClass(p.progressPercent))}>
                        {formatPct(p.progressPercent)}
                      </span>
                    </div>
                  );
                })
              )}
              <Link
                href="/client/progress/strength"
                className={hub.linkOut}
                style={{ marginTop: 12 }}
              >
                All lifts & charts →
              </Link>
            </section>

            {/* Explore */}
            <div className={hub.eyebrow}>Explore</div>
            <div className={hub.explore}>
              {exploreTiles.map((t) => {
                const Icon = t.icon;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={hub.exploreTile}
                    style={{ ["--h" as string]: t.hue }}
                  >
                    <span className={hub.exploreIc}>
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden />
                    </span>
                    <div className={hub.exploreN}>{t.name}</div>
                    <div className={hub.exploreS}>{t.sub}</div>
                    <div className={hub.exploreV}>
                      {t.value}
                      {t.valueSuffix ? (
                        <span style={{ fontSize: 10 }}>{t.valueSuffix}</span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ClientPageShell>
  );
}

export default function ProgressHub() {
  return (
    <ProtectedRoute requiredRole="client">
      <ProgressPageContent />
    </ProtectedRoute>
  );
}
