"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdherenceCalendar } from "@/components/client/adherence-calendar";
import {
  getWorkoutAdherenceHistory,
  toWorkoutCalendarDays,
} from "@/lib/workoutAdherenceHistoryService";
import {
  getNutritionAdherenceHistory,
  toCalendarDays as toNutritionCalendarDays,
} from "@/lib/nutritionAdherenceHistoryService";
import { toLocalDateString } from "@/lib/clientActivityService";
import styles from "./homePage.module.css";

type CalendarDays = { date: string; value: number | null }[];

function filterToCurrentMonth(days: CalendarDays): CalendarDays {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return days.filter((d) => d.date.startsWith(prefix));
}

function emptyMonthDays(): CalendarDays {
  const now = new Date();
  const year = now.getFullYear();
  const mon = now.getMonth();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const out: CalendarDays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    out.push({
      date: toLocalDateString(new Date(year, mon, day)),
      value: null,
    });
  }
  return out;
}

/**
 * B2 home strip — two compact month calendars (Train | Nutrition).
 * Whole card navigates; individual days are not tap targets.
 */
export function HomeAdherenceCalendars({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [trainDays, setTrainDays] = useState<CalendarDays>(() => emptyMonthDays());
  const [nutritionDays, setNutritionDays] = useState<CalendarDays>(() =>
    emptyMonthDays()
  );

  const monthLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        month: "long",
      }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [trainRes, nutriRes] = await Promise.allSettled([
        getWorkoutAdherenceHistory(clientId),
        getNutritionAdherenceHistory(clientId),
      ]);
      if (cancelled) return;

      if (trainRes.status === "fulfilled") {
        setTrainDays(
          filterToCurrentMonth(toWorkoutCalendarDays(trainRes.value.days))
        );
      } else {
        console.error("Home train adherence failed:", trainRes.reason);
        setTrainDays(emptyMonthDays());
      }

      if (nutriRes.status === "fulfilled") {
        setNutritionDays(
          filterToCurrentMonth(toNutritionCalendarDays(nutriRes.value.days))
        );
      } else {
        console.error("Home nutrition adherence failed:", nutriRes.reason);
        setNutritionDays(emptyMonthDays());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <section className={styles.adherenceSection} aria-label="Month adherence">
      <p className={styles.adherenceSecLabel}>{monthLabel}</p>
      <div className={styles.adherencePair}>
        <button
          type="button"
          className={styles.adherenceCard}
          onClick={() => router.push("/client/progress/workout-logs")}
          aria-label="Open workout history calendar"
        >
          <span className={styles.adherenceCardLabel}>Train</span>
          <AdherenceCalendar
            variant="compact"
            days={trainDays}
            aria-label="Train adherence this month"
          />
        </button>
        <button
          type="button"
          className={styles.adherenceCard}
          onClick={() => router.push("/client/nutrition/progress")}
          aria-label="Open nutrition progress calendar"
        >
          <span className={styles.adherenceCardLabel}>Nutrition</span>
          <AdherenceCalendar
            variant="compact"
            days={nutritionDays}
            aria-label="Nutrition adherence this month"
          />
        </button>
      </div>
    </section>
  );
}
