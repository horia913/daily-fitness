"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchApi } from "@/lib/apiClient";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import type {
  CoachInsightsBundle,
  CoachInsightsRow,
  InsightsPeriod,
  StatDelta,
} from "@/lib/coachInsightsBundle";
import { cn } from "@/lib/utils";
import styles from "@/components/coach-analytics/coachInsights.module.css";

type SortKey =
  | "name"
  | "adherence"
  | "execution"
  | "progress"
  | "prs"
  | "volume";

const PERIODS: { id: InsightsPeriod; label: string }[] = [
  { id: "4wk", label: "4 wk" },
  { id: "12wk", label: "12 wk" },
  { id: "6mo", label: "6 mo" },
];

const AVATAR_COLORS = [
  "var(--purple)",
  "var(--fc-group-c)",
  "var(--fc-accent-gold)",
  "var(--fc-accent)",
  "var(--warning)",
  "#FF7A2F",
];

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 17) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h]!;
}

function formatVolume(kg: number): React.ReactNode {
  if (!Number.isFinite(kg) || kg <= 0) return <span className={styles.none}>—</span>;
  if (kg >= 1000) {
    return (
      <span className={styles.cell}>
        <b>{(kg / 1000).toFixed(1)}k</b> kg
      </span>
    );
  }
  return (
    <span className={styles.cell}>
      <b>{Math.round(kg).toLocaleString()}</b> kg
    </span>
  );
}

function toneForPct(pct: number | null): "good" | "warn" | "bad" | null {
  if (pct == null) return null;
  if (pct >= 80) return "good";
  if (pct >= 50) return "warn";
  return "bad";
}

function sortRows(
  rows: CoachInsightsRow[],
  key: SortKey,
  dir: "asc" | "desc",
): CoachInsightsRow[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (key) {
      case "name":
        return mul * a.name.localeCompare(b.name);
      case "adherence": {
        const av = a.hasActiveProgram ? (a.adherencePct ?? -1) : -2;
        const bv = b.hasActiveProgram ? (b.adherencePct ?? -1) : -2;
        return mul * (av - bv);
      }
      case "execution": {
        const av = a.executionPct ?? -1;
        const bv = b.executionPct ?? -1;
        return mul * (av - bv);
      }
      case "progress": {
        const av = a.progressPct ?? -1;
        const bv = b.progressPct ?? -1;
        return mul * (av - bv);
      }
      case "prs":
        return mul * (a.prsThisWeek - b.prsThisWeek);
      case "volume":
        return mul * (a.volumeKg - b.volumeKg);
      default:
        return 0;
    }
  });
}

function MetricCell({ pct }: { pct: number | null }) {
  const tone = toneForPct(pct);
  if (pct == null || tone == null) {
    return <span className={styles.none}>—</span>;
  }
  return (
    <span
      className={cn(
        styles.metric,
        tone === "good" && styles.toneGood,
        tone === "warn" && styles.toneWarn,
        tone === "bad" && styles.toneBad,
      )}
    >
      <span className={styles.val}>{pct}%</span>
      <span className={styles.bar}>
        <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </span>
    </span>
  );
}

function DeltaLine({ delta }: { delta?: StatDelta }) {
  if (!delta) return null;
  return (
    <div
      className={cn(
        styles.statDelta,
        delta.tone === "up" && styles.statDeltaUp,
        delta.tone === "down" && styles.statDeltaDown,
      )}
    >
      {delta.label}
    </div>
  );
}

async function fetchCoachInsightsBundle(
  period: InsightsPeriod,
  signal?: AbortSignal | null,
): Promise<CoachInsightsBundle> {
  const res = await fetchApi(`/api/coach/insights/roster?period=${period}`, {
    signal: signal ?? null,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string })?.error ?? `HTTP ${res.status}`,
    );
  }
  return (await res.json()) as CoachInsightsBundle;
}

export default function CoachInsightsHub() {
  const router = useRouter();
  const { user } = useAuth();
  const [period, setPeriod] = useState<InsightsPeriod>("12wk");
  const [sortKey, setSortKey] = useState<SortKey>("adherence");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const insightsQuery = useQuery({
    queryKey: ["coach-insights", period],
    queryFn: ({ signal }) => fetchCoachInsightsBundle(period, signal),
    enabled: !!user,
  });

  const data = insightsQuery.data ?? null;
  const loading = insightsQuery.isLoading;
  const error = insightsQuery.isError
    ? insightsQuery.error instanceof Error
      ? insightsQuery.error.message
      : "Failed to load insights"
    : null;

  const sortedRows = useMemo(
    () => (data ? sortRows(data.rows, sortKey, sortDir) : []),
    [data, sortKey, sortDir],
  );

  const toggleSort = (key: SortKey) => {
    if (key === "name") {
      setSortKey(key);
      setSortDir((d) => (sortKey === key && d === "asc" ? "desc" : "asc"));
      return;
    }
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (loading && !data) {
    return <PageSkeleton variant="dashboard" />;
  }

  const summary = data?.summary;
  const dist = data?.distribution;
  const trend = data?.weeklyTrend ?? [];
  const periodMeta =
    period === "4wk" ? "4 weeks" : period === "12wk" ? "12 weeks" : "26 weeks";

  const avgColor =
    (summary?.avgAdherencePct ?? 0) >= 80
      ? "var(--good)"
      : (summary?.avgAdherencePct ?? 0) >= 50
        ? "var(--warning)"
        : "var(--critical)";

  return (
    <div>
      <div className={styles.head}>
        <div>
          <div className={styles.eyebrow}>● Roster analysis</div>
          <h1 className={styles.title}>Insights</h1>
          <p className={styles.subtitle}>
            How the whole roster is trending — compare clients, spot patterns
          </p>
        </div>
        <div className={styles.range} role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={cn(styles.rangeBtn, period === p.id && styles.rangeBtnOn)}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div
          className="mb-4 rounded-[14px] border p-4 text-sm"
          style={{ borderColor: "var(--critical)", color: "var(--critical)" }}
        >
          {error}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => void insightsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {summary ? (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Avg adherence</div>
            <div className={styles.statValue} style={{ color: avgColor }}>
              {summary.avgAdherencePct}
              <span className={styles.statUnit}>%</span>
            </div>
            <DeltaLine delta={summary.deltas?.avgAdherence} />
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Sessions logged</div>
            <div className={styles.statValue}>{summary.sessionsLogged ?? 0}</div>
            <DeltaLine delta={summary.deltas?.sessionsLogged} />
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>On track</div>
            <div className={styles.statValue} style={{ color: "var(--good)" }}>
              {(summary.onTrackOfTotal ?? `${summary.onTrackCount}`).split("/")[0]}
              <span className={styles.statUnit}>
                /{(summary.onTrackOfTotal ?? "/0").split("/")[1] ?? "0"}
              </span>
            </div>
            <DeltaLine delta={summary.deltas?.onTrack} />
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>PRs this period</div>
            <div className={styles.statValue} style={{ color: "var(--fc-accent-gold)" }}>
              {summary.prsThisWeek}
            </div>
            <DeltaLine delta={summary.deltas?.prs} />
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Active clients</div>
            <div className={styles.statValue} style={{ color: "var(--fc-accent)" }}>
              {summary.activeClientCount}
            </div>
            <DeltaLine delta={summary.deltas?.active} />
          </div>
        </div>
      ) : null}

      <div className={styles.row2}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Roster adherence · weekly</span>
            <span className={styles.cardMeta}>
              {periodMeta} · % of scheduled sessions completed
            </span>
          </div>
          <div className={styles.trend}>
            {trend.length === 0 ? (
              <p className={styles.none}>No scheduled sessions in this window</p>
            ) : (
              trend.map((bar) => (
                <div key={bar.weekStart} className={styles.trendCol}>
                  <div className={styles.trendBarSlot}>
                    <div
                      className={cn(styles.trendBar, bar.isCurrent && styles.trendBarNow)}
                      style={{ height: `${Math.max(4, Math.min(100, bar.pct))}%` }}
                    />
                  </div>
                  <span className={styles.trendPct}>{bar.pct}</span>
                  <span className={styles.trendWk}>{bar.label}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Distribution</span>
            <span className={styles.cardMeta}>{dist?.total ?? 0} clients</span>
          </div>
          <div className={styles.dist}>
            {[
              {
                key: "hi",
                name: "On track · 80%+",
                count: dist?.onTrack ?? 0,
                color: "var(--good)",
              },
              {
                key: "md",
                name: "Slipping · 50–79%",
                count: dist?.slipping ?? 0,
                color: "var(--warning)",
              },
              {
                key: "lo",
                name: "Behind · under 50%",
                count: dist?.behind ?? 0,
                color: "var(--critical)",
              },
              {
                key: "no",
                name: "No programme",
                count: dist?.noProgram ?? 0,
                color: "rgba(255,255,255,.16)",
                countColor: "var(--t4)",
              },
            ].map((row) => {
              const total = Math.max(1, dist?.total ?? 1);
              const width = Math.round((row.count / total) * 100);
              return (
                <div key={row.key}>
                  <div className={styles.distRowTop}>
                    <span className={styles.distName}>{row.name}</span>
                    <span
                      className={styles.distCount}
                      style={{ color: row.countColor ?? row.color }}
                    >
                      {row.count}
                    </span>
                  </div>
                  <div className={styles.distTrack}>
                    <i
                      className={styles.distFill}
                      style={{
                        width: `${width}%`,
                        background: row.color,
                        boxShadow:
                          row.key === "no"
                            ? undefined
                            : `0 0 12px -3px ${row.color}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.tblWrap}>
        <div className={styles.tblScroll}>
          <div className={styles.tbl}>
            <div className={styles.th}>
              {(
                [
                  ["name", "Client"],
                  ["adherence", "Adherence"],
                  ["execution", "Execution"],
                  ["progress", "Progress"],
                  ["prs", "PRs"],
                  ["volume", "Volume"],
                ] as const
              ).map(([key, label]) => (
                <span key={key} className={sortKey === key ? styles.sortOn : undefined}>
                  <button
                    type="button"
                    className={cn(styles.sortBtn, sortKey === key && styles.sortOn)}
                    onClick={() => toggleSort(key)}
                  >
                    {label}
                    {sortKey === key ? (
                      <ChevronDown
                        className="size-2.5"
                        style={{
                          transform: sortDir === "asc" ? "rotate(180deg)" : undefined,
                        }}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </span>
              ))}
              <span />
            </div>

            {sortedRows.map((row) => (
              <div
                key={row.clientId}
                className={styles.tr}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/coach/clients/${row.clientId}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/coach/clients/${row.clientId}`);
                  }
                }}
              >
                <span className={styles.clientCell}>
                  <span
                    className={styles.avatar}
                    style={{ background: avatarColor(row.name) }}
                  >
                    {initials(row.name)}
                  </span>
                  <span className={styles.clientName}>{row.name}</span>
                </span>

                {!row.hasActiveProgram ? (
                  <span className={styles.none}>— no programme</span>
                ) : (
                  <MetricCell pct={row.adherencePct} />
                )}

                {!row.hasActiveProgram ? (
                  <span className={styles.none}>—</span>
                ) : (
                  <MetricCell pct={row.executionPct} />
                )}

                {!row.hasActiveProgram ? (
                  <span className={styles.none}>—</span>
                ) : row.progressWeek != null && row.progressTotalWeeks != null ? (
                  <span className={styles.cell}>
                    W{row.progressWeek}
                    <b style={{ fontSize: 11 }}> / {row.progressTotalWeeks}</b>
                  </span>
                ) : (
                  <span className={styles.none}>—</span>
                )}

                {!row.hasActiveProgram ? (
                  <span className={styles.none}>—</span>
                ) : (
                  <span className={styles.cell}>
                    <b>{row.prsThisWeek}</b>
                  </span>
                )}

                {!row.hasActiveProgram ? (
                  <span className={styles.none}>—</span>
                ) : (
                  formatVolume(row.volumeKg)
                )}

                <span className={styles.chev}>
                  <ChevronRight className="size-3.5 inline" aria-hidden />
                </span>
              </div>
            ))}

            {sortedRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: "var(--t3)" }}>
                No clients yet
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <p className={styles.foot}>
        Looking for who needs action today?{" "}
        <Link href="/coach">Open Briefing →</Link>
      </p>
    </div>
  );
}
