"use client";

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePageData } from "@/hooks/usePageData";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import CoachClientDailyReview, {
  type LatestCheckInJson,
  type NextScheduledJson,
  type NutritionCardJson,
  type ProgramCardJson,
  type TodayWorkoutJson,
  type WeeklyReviewJson,
} from "@/components/coach/client-views/CoachClientDailyReview";
import type { AttentionLevel } from "@/lib/coachClientAttention";

type ClientOverviewData = {
  id: string;
  name: string;
  email: string;
  attention: { level: AttentionLevel; reasons: string[] };
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
    () => async (): Promise<ClientOverviewData> => {
      const res = await fetch(`/api/coach/clients/${clientId}/summary`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Failed to load client (${res.status})`);
      }
      const json = await res.json();
      return {
        id: clientId,
        name: json.name ?? "Client",
        email: json.email ?? "",
        attention: json.attention ?? {
          level: "good" as AttentionLevel,
          reasons: [],
        },
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
    [clientId]
  );

  const { data: client, loading } = usePageData(fetchSummary, [
    clientId,
    user?.id,
  ]);

  if (loading) {
    return <PageSkeleton variant="list" />;
  }

  const c =
    client ??
    ({
      id: clientId,
      name: "Client",
      email: "",
      attention: { level: "good" as AttentionLevel, reasons: [] },
      trainedToday: false,
      todayWorkout: null,
      nextScheduledWorkout: null,
      latestCheckIn: null,
      program: null,
      nutrition: null,
      weeklyReview: null,
    } satisfies ClientOverviewData);

  return (
    <CoachClientDailyReview
      clientId={clientId}
      name={c.name}
      email={c.email}
      attention={c.attention}
      trainedToday={c.trainedToday}
      todayWorkout={c.todayWorkout}
      nextScheduledWorkout={c.nextScheduledWorkout}
      latestCheckIn={c.latestCheckIn}
      program={c.program}
      nutrition={c.nutrition}
      weeklyReview={c.weeklyReview}
    />
  );
}
