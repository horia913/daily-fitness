"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchApi } from "@/lib/apiClient";
import {
  getClientAnalytics,
  resolveStatsTabTimezone,
  type ClientAnalyticsData,
} from "@/lib/clientAnalyticsService";
import ClientPRTimeline from "@/components/coach/client-views/ClientPRTimeline";
import type { ClientPRTimelinePrefetched } from "@/components/coach/client-views/ClientPRTimeline";
import ClientAnalyticsCoachSections from "@/components/coach/client-views/ClientAnalyticsCoachSections";
import CoachExerciseChartsPanel from "@/components/coach/client-views/CoachExerciseChartsPanel";
import type { PRTimelineTimeRange } from "@/components/progress/PRTimelineChart";
import type { CoachExerciseChartRange } from "@/lib/coachExerciseCharts/getCoachExerciseCharts";
import sec from "@/components/coach/client-detail/coachClientDetailUi.module.css";
import {
  addCalendarDaysYmd,
  mondayYmdOfZonedWeekContaining,
  normalizeClientTimezone,
} from "@/lib/clientZonedCalendar";

type PrBundle = ClientPRTimelinePrefetched & { clientId?: string };

const RANGE_OPTIONS: CoachExerciseChartRange[] = ["3M", "6M", "1Y", "ALL"];

/**
 * Deferred Performance block (PR timeline + adherence/progression + volume trend).
 * Loaded after first paint — does not block the daily-glance summary render.
 */
export function CoachClientPerformanceLazy({
  clientId,
  prsThisWeek,
}: {
  clientId: string;
  prsThisWeek?: number;
}) {
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [pr, setPr] = useState<PrBundle | null>(null);
  const [analytics, setAnalytics] = useState<ClientAnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<CoachExerciseChartRange>("1Y");

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      if (cancelled) return;
      setPhase("loading");
      setErr(null);
      try {
        const [{ data: paRow }, { data: profRow }] = await Promise.all([
          supabase
            .from("program_assignments")
            .select("timezone_snapshot")
            .eq("client_id", clientId)
            .eq("status", "active")
            .maybeSingle(),
          supabase.from("profiles").select("timezone").eq("id", clientId).maybeSingle(),
        ]);
        const statsTz = resolveStatsTabTimezone(
          paRow?.timezone_snapshot as string | undefined,
          profRow?.timezone as string | undefined,
        );
        const [prRes, analyticsData] = await Promise.all([
          fetchApi(`/api/coach/clients/${clientId}/pr-timeline`).then(async (r) => {
            const body = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(body?.error ?? `PR timeline (${r.status})`);
            return body as PrBundle;
          }),
          getClientAnalytics(clientId, statsTz),
        ]);
        if (!cancelled) {
          setPr(prRes);
          setAnalytics(analyticsData);
          setPhase("ready");
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load performance data");
          setPr(null);
          setAnalytics(null);
          setPhase("error");
        }
      }
    };

    const schedule = () => {
      if (cancelled || phase !== "idle") return;
      void load();
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(schedule, { timeout: 1500 });
    } else {
      timeoutId = setTimeout(schedule, 0);
    }

    return () => {
      cancelled = true;
      if (idleId != null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per client
  }, [clientId]);

  const chartTz = normalizeClientTimezone(analytics?.clientTimezoneForCharts ?? "UTC");
  const weekStart = useMemo(
    () => mondayYmdOfZonedWeekContaining(new Date(), chartTz),
    [chartTz],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addCalendarDaysYmd(weekStart, i)),
    [weekStart],
  );
  const lastWeekStart = useMemo(() => addCalendarDaysYmd(weekStart, -7), [weekStart]);
  const lastWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addCalendarDaysYmd(lastWeekStart, i)),
    [lastWeekStart],
  );

  if (phase === "idle" || phase === "loading") {
    return (
      <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Loading performance">
        {prsThisWeek != null && prsThisWeek > 0 ? (
          <p className="text-[11px] text-[color:var(--fc-text-subtle)] m-0">
            {prsThisWeek} new PR{prsThisWeek === 1 ? "" : "s"} this week
          </p>
        ) : null}
        <div className="h-48 rounded-[18px] border border-[color:var(--fc-glass-border)] bg-[color:var(--bg-transparent)]" />
        <div className="h-36 rounded-[18px] border border-[color:var(--fc-glass-border)] bg-[color:var(--bg-transparent)]" />
      </div>
    );
  }

  if (phase === "error" || !analytics) {
    return (
      <div className="rounded-[14px] border border-[color:var(--fc-glass-border)] bg-transparent p-4 text-sm text-[color:var(--fc-text-subtle)]">
        {err ?? "Could not load performance data."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {prsThisWeek != null && prsThisWeek > 0 ? (
        <p className="text-[11px] text-[color:var(--fc-text-subtle)] m-0">
          <span className="font-medium text-[color:var(--fc-text-primary)]">Performance: </span>
          {prsThisWeek} new PR{prsThisWeek === 1 ? "" : "s"} this week
        </p>
      ) : null}

      <div className={sec.rangeRow} role="group" aria-label="Performance time range">
        {RANGE_OPTIONS.map((r) => (
          <button
            key={r}
            type="button"
            className={`${sec.rangeTab} ${timeRange === r ? sec.rangeTabActive : ""}`}
            onClick={() => setTimeRange(r)}
          >
            {r === "ALL" ? "All" : r}
          </button>
        ))}
      </div>

      <ClientPRTimeline
        clientId={clientId}
        prefetched={pr}
        timeRange={timeRange as PRTimelineTimeRange}
        onTimeRangeChange={(r) => setTimeRange(r as CoachExerciseChartRange)}
        hideRangeTabs
      />

      <CoachExerciseChartsPanel
        clientId={clientId}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        timeZone={chartTz}
      />

      <ClientAnalyticsCoachSections
        clientId={clientId}
        data={analytics}
        weekDays={weekDays}
        lastWeekDays={lastWeekDays}
        variant="volumeOnly"
      />
    </div>
  );
}
