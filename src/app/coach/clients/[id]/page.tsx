"use client";

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePageData } from "@/hooks/usePageData";
import CoachClientDailyReview, {
  type LatestCheckInJson,
  type NextScheduledJson,
  type NutritionCardJson,
  type ProgramCardJson,
  type TodayWorkoutJson,
} from "@/components/coach/client-views/CoachClientDailyReview";
import type { AttentionLevel } from "@/lib/coachClientAttention";

type ClientOverviewData = {
  id: string;
  name: string;
  email: string;
  attention: { level: AttentionLevel; reasons: string[] };
  weeklyProgress: { current: number; goal: number };
  trainedToday: boolean;
  todayWorkout: TodayWorkoutJson;
  nextScheduledWorkout: NextScheduledJson;
  latestCheckIn: LatestCheckInJson;
  weekWorkoutDots: boolean[];
  program: ProgramCardJson;
  nutrition: NutritionCardJson;
};

function normalizeDots(raw: unknown): boolean[] {
  if (!Array.isArray(raw) || raw.length !== 7) {
    return [false, false, false, false, false, false, false];
  }
  return raw.map((x) => Boolean(x));
}

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
        weeklyProgress: json.weeklyProgress ?? { current: 0, goal: 0 },
        trainedToday: json.trainedToday === true,
        todayWorkout: json.todayWorkout ?? null,
        nextScheduledWorkout: json.nextScheduledWorkout ?? null,
        latestCheckIn: json.latestCheckIn ?? null,
        weekWorkoutDots: normalizeDots(json.weekWorkoutDots),
        program: json.program ?? null,
        nutrition: json.nutrition
          ? {
              planName: json.nutrition.planName,
              compliance7dPct: json.nutrition.compliance7dPct ?? null,
              mealsLoggedToday: json.nutrition.mealsLoggedToday ?? 0,
            }
          : null,
      };
    },
    [clientId]
  );

  const { data: client, loading } = usePageData(fetchSummary, [
    clientId,
    user?.id,
  ]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-lg fc-page flex flex-col min-w-0 overflow-x-hidden">
        <div className="animate-pulse space-y-4 py-2">
          <div className="h-10 rounded-lg bg-[color:var(--fc-glass-highlight)]" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-[color:var(--fc-glass-highlight)]"
            />
          ))}
        </div>
      </div>
    );
  }

  const c =
    client ??
    ({
      id: clientId,
      name: "Client",
      email: "",
      attention: { level: "good" as AttentionLevel, reasons: [] },
      weeklyProgress: { current: 0, goal: 0 },
      trainedToday: false,
      todayWorkout: null,
      nextScheduledWorkout: null,
      latestCheckIn: null,
      weekWorkoutDots: normalizeDots(null),
      program: null,
      nutrition: null,
    } satisfies ClientOverviewData);

  return (
    <CoachClientDailyReview
      clientId={clientId}
      name={c.name}
      email={c.email}
      attention={c.attention}
      weeklyProgress={c.weeklyProgress}
      trainedToday={c.trainedToday}
      todayWorkout={c.todayWorkout}
      nextScheduledWorkout={c.nextScheduledWorkout}
      latestCheckIn={c.latestCheckIn}
      weekWorkoutDots={c.weekWorkoutDots}
      program={c.program}
      nutrition={c.nutrition}
    />
  );
}
