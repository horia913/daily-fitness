"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  HeartHandshake,
  ImageIcon,
  Target,
  Star,
  MessageSquare,
  Calendar,
  Settings,
  RotateCw,
  Dumbbell,
  Apple,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCoachClient } from "@/contexts/CoachClientContext";
import { useToast } from "@/components/ui/toast-provider";
import { fetchApi } from "@/lib/apiClient";
import {
  computeCoachAdherenceFromPayload,
  type AdherenceData,
} from "@/lib/coachAdherenceCompute";
import ClientDetailHero from "@/components/coach/client-detail/ClientDetailHero";
import ClientHeaderCard from "@/components/coach/client-detail/ClientHeaderCard";
import SubTabs, { type SubTabDef } from "@/components/coach/client-detail/SubTabs";
import MetricRow, { type MetricItem } from "@/components/coach/client-detail/MetricRow";
import WeeklyAdherenceCalendar from "@/components/coach/client-detail/WeeklyAdherenceCalendar";
import sec from "@/components/coach/client-detail/coachClientDetailUi.module.css";
import AdherenceTrendChart from "@/components/coach/AdherenceTrendChart";
import CoachProgressSubPanels, {
  parseProgressSubtab,
  type ProgressHubSectionId,
} from "@/components/coach/client-views/CoachProgressSubPanels";

const PROGRESS_TABS: SubTabDef<ProgressHubSectionId>[] = [
  { id: "body", label: "Body", icon: User },
  { id: "wellness", label: "Wellness", icon: HeartHandshake },
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "goals", label: "Goals", icon: Target },
  { id: "habits", label: "Habits", icon: Star },
];

export default function CoachCheckInsShell({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { clientName, email, phone, firstName, lastName } = useCoachClient();

  const coachId = user?.id ?? "";
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [row, setRow] = useState<AdherenceData | null>(null);

  const subtab = useMemo(() => {
    const raw =
      searchParams.get("subtab") ||
      searchParams.get("section") ||
      searchParams.get("tab");
    return parseProgressSubtab(raw);
  }, [searchParams]);

  const setSubtab = useCallback(
    (id: ProgressHubSectionId) => {
      router.push(`/coach/clients/${clientId}/progress?subtab=${id}`, { scroll: false });
    },
    [router, clientId]
  );

  const load = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchApi(`/api/coach/analytics/adherence?period=week`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      const results = computeCoachAdherenceFromPayload(
        data.clients ?? [],
        data.profiles ?? [],
        data.assignments ?? [],
        data.logs ?? [],
        data.wellness ?? [],
        data.nutritionTrackedIds ?? [],
        data.habitTrackedIds ?? [],
        data.historicalAdherence ?? {},
        data.weekAdherence ?? [],
        data.todayStr ?? new Date().toISOString().split("T")[0],
        data.sevenDaysAgoStr ?? ""
      );
      const mine = results.find((c) => c.clientId === clientId) ?? null;
      setRow(mine);
    } catch (e) {
      console.error(e);
      setErr(e instanceof Error ? e.message : "Failed to load");
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [coachId, clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const initials = useMemo(() => {
    const a = (firstName?.[0] || "").toUpperCase();
    const b = (lastName?.[0] || "").toUpperCase();
    return (a + b || clientName?.[0] || "C").toUpperCase();
  }, [firstName, lastName, clientName]);

  const openMessage = () => {
    if (email) window.open(`mailto:${email}`, "_blank");
    else addToast({ title: "No email on file", variant: "destructive" });
  };

  const metrics: MetricItem[] | null = useMemo(() => {
    if (!row) return null;
    return [
      {
        label: "Workouts",
        icon: Dumbbell,
        tone: "cyan",
        valuePct: row.workoutAdherence,
      },
      {
        label: "Nutrition",
        icon: Apple,
        tone: "good",
        valuePct:
          row.nutritionTracked && row.nutritionHasWeeklyPlan ? row.nutritionAdherence : null,
      },
      {
        label: "Habits",
        icon: Zap,
        tone: "warning",
        valuePct: row.habitTracked && row.habitHasWeeklyPlan ? row.habitAdherence : null,
      },
      {
        label: "Check-ins",
        icon: Calendar,
        tone: "purple",
        valuePct: row.sessionAttendance,
      },
    ];
  }, [row]);

  const attentionLevel =
    row?.status === "needs_attention" ? "urgent" : row?.status === "at_risk" ? "warning" : "good";

  const trainedToday = Boolean(
    row?.weeklyData.some((d) => d.date === row.calendarTodayYmd && d.workout)
  );

  const trendSlice = row?.historicalAdherence?.slice(-8) ?? [];

  const trendMeta = useMemo(() => {
    if (!trendSlice.length) return "Last 8 weeks";
    const w = Math.round(
      trendSlice.reduce((s, d) => s + (d.workout ?? 0), 0) / trendSlice.length
    );
    const c = Math.round(
      trendSlice.reduce((s, d) => s + (d.checkins ?? 0), 0) / trendSlice.length
    );
    return `Last 8 weeks Â· workouts ${w}% Â· check-ins ${c}% avg`;
  }, [trendSlice]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-32 rounded-[20px] bg-[color:var(--bg-transparent)] border border-[color:var(--fc-glass-border)]" />
        <div className="h-24 rounded-[18px] bg-[color:var(--bg-transparent)] border border-[color:var(--fc-glass-border)]" />
      </div>
    );
  }

  if (err || !row) {
    return (
      <div className="rounded-[18px] border border-[color:var(--fc-glass-border)] p-4 text-sm text-[color:var(--fc-text-primary)]">
        {err ?? "No adherence data for this client."}
      </div>
    );
  }

  const displayName = firstName?.trim() || clientName || "Client";
  const checkPct = row.sessionAttendance;
  const checkTone =
    checkPct <= 0 ? ("critical" as const) : checkPct < 50 ? ("warning" as const) : ("good" as const);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <ClientDetailHero
          accent="purple"
          eyebrow="Check-ins & assessments"
          title={`${displayName}'s adherence`}
          subtitle="Body, wellness, photos, goals & habits"
          stats={[
            { num: checkPct, numSuffix: "%", label: "Check-ins", tone: checkTone },
            { num: row.streak, numSuffix: "d", label: "Streak", tone: "default" },
            {
              num: row.alerts,
              label: "Alerts",
              tone: row.alerts > 0 ? "critical" : "default",
            },
          ]}
        />
        <button
          type="button"
          className={`self-end sm:self-start ${sec.btnRefreshSm}`}
          onClick={() => void load()}
        >
          <RotateCw className="w-[11px] h-[11px]" aria-hidden />
          Refresh
        </button>
      </div>

      <ClientHeaderCard
        clientId={clientId}
        name={row.clientName}
        email={email || ""}
        initials={initials}
        adherencePct={row.workoutAdherence}
        streakDays={row.streak}
        alertCount={row.alerts}
        trainedToday={trainedToday}
        attentionLevel={attentionLevel}
        attentionDetail={row.alerts > 0 ? `${row.alerts} quiet days this week` : null}
        phone={phone}
        onMessage={openMessage}
      />

      {metrics ? (
        <section className={sec.section}>
          <MetricRow items={metrics} />
        </section>
      ) : null}

      <section className={sec.section}>
        <h2 className={sec.sectionTitle}>Weekly adherence</h2>
        <WeeklyAdherenceCalendar row={row} />
      </section>

      <section className={sec.section}>
        <div className={sec.sectionHead}>
          <div>
            <h2 className={sec.sectionTitle}>Adherence trend</h2>
            <p className={sec.sectionMeta}>{trendMeta}</p>
          </div>
        </div>
        <AdherenceTrendChart
          clientId={clientId}
          clientName={row.clientName}
          trendData={trendSlice}
          variant="coachV6"
        />
      </section>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className={sec.btnOutline}
          style={{ padding: "9px 6px", fontSize: 11 }}
          onClick={openMessage}
        >
          <MessageSquare className="w-3.5 h-3.5 inline mr-1" aria-hidden />
          Message
        </button>
        <button
          type="button"
          className={sec.btnOutline}
          style={{ padding: "9px 6px", fontSize: 11 }}
          onClick={() => router.push(`/coach/clients/${clientId}/check-ins`)}
        >
          <Calendar className="w-3.5 h-3.5 inline mr-1" aria-hidden />
          Schedule check-in
        </button>
        <button
          type="button"
          className={sec.btnCyanFill}
          style={{ padding: "9px 6px", fontSize: 11 }}
          onClick={() => router.push(`/coach/clients/${clientId}/workouts`)}
        >
          <Settings className="w-3.5 h-3.5 inline mr-1" aria-hidden />
          Adjust plan
        </button>
      </div>

      <SubTabs tabs={PROGRESS_TABS} active={subtab} onChange={setSubtab} activeTone="purple" />
      <CoachProgressSubPanels clientId={clientId} active={subtab} />
    </div>
  );
}
