"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCoachClient } from "@/contexts/CoachClientContext";
import ClientDetailHero from "@/components/coach/client-detail/ClientDetailHero";
import ClientPRTimeline from "@/components/coach/client-views/ClientPRTimeline";
import ClientAnalyticsView from "@/components/coach/client-views/ClientAnalyticsView";
import { fetchApi } from "@/lib/apiClient";
import { supabase } from "@/lib/supabase";
import {
  getClientAnalytics,
  resolveStatsTabTimezone,
  type ClientAnalyticsData,
} from "@/lib/clientAnalyticsService";
import type { ClientPRTimelinePrefetched } from "@/components/coach/client-views/ClientPRTimeline";

type PrBundle = ClientPRTimelinePrefetched & { clientId?: string };

export default function ClientCoachStatsTab({ clientId }: { clientId: string }) {
  const { firstName, clientName } = useCoachClient();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pr, setPr] = useState<PrBundle | null>(null);
  const [analytics, setAnalytics] = useState<ClientAnalyticsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
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
          profRow?.timezone as string | undefined
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
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load stats");
          setPr(null);
          setAnalytics(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const displayName = firstName?.trim() || clientName?.split(" ")[0] || "Client";

  const peakVol = useMemo(() => {
    const w = analytics?.workout.weeklyVolume ?? [];
    if (!w.length) return 0;
    return Math.max(...w.map((x) => x.totalVolume));
  }, [analytics]);

  const lifetime = pr?.lifetimePrCount ?? 0;
  const daysActive = analytics?.overview.daysActiveLast30 ?? 0;

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-36 rounded-[20px] bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)]" />
        <div className="h-64 rounded-[18px] bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)]" />
        <div className="h-48 rounded-[18px] bg-[color:var(--fc-glass-soft)] border border-[color:var(--fc-glass-border)]" />
      </div>
    );
  }

  if (err || !analytics) {
    return (
      <div className="rounded-[18px] border border-[color:var(--fc-glass-border)] bg-[color:var(--fc-surface-card)] p-6 text-sm text-[color:var(--fc-text-primary)]">
        {err ?? "Could not load analytics."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ClientDetailHero
        accent="cyan"
        eyebrow="Training analytics"
        title={`${displayName}'s stats`}
        subtitle="PR history & training analytics"
        stats={[
          { num: lifetime, label: "Lifetime PRs", tone: "cyan" },
          {
            num: peakVol >= 1000 ? (peakVol / 1000).toFixed(1) : Math.round(peakVol),
            numSuffix: peakVol >= 1000 ? "t" : " kg",
            label: "Peak vol/wk",
            tone: "lime",
          },
          {
            num: daysActive,
            numSuffix: "/30",
            label: "Days active",
            tone: "default",
          },
        ]}
      />
      <ClientPRTimeline clientId={clientId} prefetched={pr} />
      <ClientAnalyticsView
        key={`${clientId}-coach-stats`}
        clientId={clientId}
        prefetched={analytics}
        coachStatsLayout
      />
    </div>
  );
}
