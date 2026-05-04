"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePageData } from "@/hooks/usePageData";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/button";
import CoachClientDailyReview, {
  type LatestCheckInJson,
  type NextScheduledJson,
  type NutritionCardJson,
  type ProgramCardJson,
  type TodayWorkoutJson,
  type WeeklyReviewJson,
} from "@/components/coach/client-views/CoachClientDailyReview";
import type { AttentionLevel } from "@/lib/coachClientAttention";
import { fetchApi } from "@/lib/apiClient";

type ClientOverviewData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  attention: { level: AttentionLevel; reasons: string[] };
  streak: number;
  weeklyProgress: { current: number; goal: number };
  lastCheckinDate: string | null;
  trainedToday: boolean;
  todayWorkout: TodayWorkoutJson;
  nextScheduledWorkout: NextScheduledJson;
  latestCheckIn: LatestCheckInJson;
  program: ProgramCardJson;
  nutrition: NutritionCardJson;
  weeklyReview: WeeklyReviewJson;
};

export default function ClientDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const clientId = params.id as string;

  const fetchSummary = useMemo(
    () => async (): Promise<ClientOverviewData | null> => {
      const res = await fetchApi(`/api/coach/clients/${clientId}/summary`);
      if (res.status === 403 || res.status === 404) {
        return null;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Failed to load client (${res.status})`);
      }
      const json = await res.json();
      const metricsSummary = json.metricsSummary as
        | { lastCheckinDate?: string | null }
        | undefined;
      return {
        id: clientId,
        name: json.name ?? "Client",
        email: json.email ?? "",
        phone: json.phone != null ? String(json.phone) : null,
        attention: json.attention ?? {
          level: "good" as AttentionLevel,
          reasons: [],
        },
        streak: typeof json.streak === "number" ? json.streak : 0,
        weeklyProgress: json.weeklyProgress ?? { current: 0, goal: 0 },
        lastCheckinDate: metricsSummary?.lastCheckinDate ?? null,
        trainedToday: json.trainedToday === true,
        todayWorkout: json.todayWorkout ?? null,
        nextScheduledWorkout: json.nextScheduledWorkout ?? null,
        latestCheckIn: json.latestCheckIn ?? null,
        program: json.program ?? null,
        nutrition: json.nutrition
          ? {
              planName: json.nutrition.planName,
              compliance7dPct: json.nutrition.compliance7dPct ?? null,
              mealsLoggedToday: json.nutrition.mealsLoggedToday ?? 0,
            }
          : null,
        weeklyReview: json.weeklyReview ?? null,
      };
    },
    [clientId],
  );

  const { data: client, loading, error, refetch } = usePageData(fetchSummary, [
    clientId,
    user?.id,
  ]);

  if (loading) {
    return <PageSkeleton variant="list" />;
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-10 text-center">
        <div className="fc-glass-soft max-w-md w-full space-y-3 rounded-xl border border-[color:var(--fc-glass-border)] p-6">
          <p className="text-sm fc-text-dim">{error}</p>
          <Button type="button" className="fc-btn fc-btn-primary" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-10 text-center">
        <div className="fc-glass-soft max-w-md w-full space-y-4 rounded-xl border border-[color:var(--fc-glass-border)] p-6">
          <p className="text-sm font-semibold fc-text-primary">Client not found</p>
          <p className="text-xs fc-text-dim">
            This client may not exist or you may not have access.
          </p>
          <Button asChild className="fc-btn fc-btn-primary w-full">
            <Link href="/coach/clients">Back to clients</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CoachClientDailyReview
      clientId={clientId}
      name={client.name}
      email={client.email}
      phone={client.phone}
      attention={client.attention}
      streak={client.streak}
      weeklyProgress={client.weeklyProgress}
      lastCheckinDate={client.lastCheckinDate}
      trainedToday={client.trainedToday}
      todayWorkout={client.todayWorkout}
      nextScheduledWorkout={client.nextScheduledWorkout}
      latestCheckIn={client.latestCheckIn}
      program={client.program}
      nutrition={client.nutrition}
      weeklyReview={client.weeklyReview}
    />
  );
}
