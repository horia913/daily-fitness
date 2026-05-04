"use client";

import React from "react";
import { Dumbbell, Utensils, Star, Calendar, Check, X } from "lucide-react";
import type { AdherenceData } from "@/lib/coachAdherenceCompute";
import styles from "./WeeklyAdherenceCalendar.module.css";

type CellKind = "met" | "miss" | "na";

function cellForWorkout(
  day: AdherenceData["weeklyData"][0],
  todayYmd: string
): CellKind {
  if (day.date > todayYmd) return "na";
  return day.workout ? "met" : "miss";
}

function cellForNutrition(
  day: AdherenceData["weeklyData"][0],
  row: AdherenceData,
  todayYmd: string
): CellKind {
  if (!row.nutritionTracked) return "na";
  if (day.date > todayYmd) return "na";
  const nd = day.nutritionDay;
  if (!nd || !nd.has_slot) return "na";
  return nd.done ? "met" : "miss";
}

function cellForHabits(day: AdherenceData["weeklyData"][0], row: AdherenceData, todayYmd: string): CellKind {
  if (!row.habitTracked) return "na";
  if (day.date > todayYmd) return "na";
  const hd = day.habitDay;
  if (!hd || !hd.has_slot) return "na";
  return hd.done ? "met" : "miss";
}

function cellForCheckin(day: AdherenceData["weeklyData"][0], todayYmd: string): CellKind {
  if (day.date > todayYmd) return "na";
  return day.session ? "met" : "miss";
}

export default function WeeklyAdherenceCalendar({ row }: { row: AdherenceData }) {
  const { weeklyData, calendarTodayYmd: todayYmd } = row;

  const rows: {
    key: string;
    label: string;
    Icon: typeof Dumbbell;
    get: (d: (typeof weeklyData)[0]) => CellKind;
    metIcon: "dumbbell" | "check";
  }[] = [
    { key: "w", label: "Workout", Icon: Dumbbell, get: (d) => cellForWorkout(d, todayYmd), metIcon: "dumbbell" },
    { key: "n", label: "Nutrition", Icon: Utensils, get: (d) => cellForNutrition(d, row, todayYmd), metIcon: "check" },
    { key: "h", label: "Habits", Icon: Star, get: (d) => cellForHabits(d, row, todayYmd), metIcon: "check" },
    { key: "c", label: "Check-in", Icon: Calendar, get: (d) => cellForCheckin(d, todayYmd), metIcon: "check" },
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        <div />
        {weeklyData.map((day) => {
          const isToday = day.date === todayYmd;
          return (
            <div key={day.date} className={`${styles.dayHead} ${isToday ? styles.dayHeadToday : ""}`}>
              {new Date(day.date + "T12:00:00").toLocaleDateString("en", { weekday: "short" })}
            </div>
          );
        })}

        {rows.map((r) => (
          <React.Fragment key={r.key}>
            <div className={styles.rowLabel}>
              <r.Icon className={styles.rowIcon} strokeWidth={2} aria-hidden />
              {r.label}
            </div>
            {weeklyData.map((day) => {
              const kind = r.get(day);
              const isToday = day.date === todayYmd;
              return (
                <div
                  key={`${r.key}-${day.date}`}
                  className={`${styles.cell} ${kind === "met" ? styles.cellMet : kind === "miss" ? styles.cellMiss : styles.cellNa} ${
                    isToday ? styles.cellTodayCol : ""
                  }`}
                >
                  {kind === "met" ? (
                    r.metIcon === "dumbbell" ? (
                      <Dumbbell className={styles.cellIcon} strokeWidth={2.5} />
                    ) : (
                      <Check className={styles.cellIcon} strokeWidth={2.5} />
                    )
                  ) : kind === "miss" ? (
                    <span className={styles.missX}>×</span>
                  ) : (
                    <span className={styles.naText}>{day.date > todayYmd ? "·" : "n/a"}</span>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
