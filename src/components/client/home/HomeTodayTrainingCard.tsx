"use client";

import React, { useMemo } from "react";
import type { DashboardData } from "@/lib/clientDashboardPageData";
import styles from "./homePage.module.css";

export interface HomeTodayTrainingCardProps {
  todaysWorkout: DashboardData["todaysWorkout"] | undefined;
  programProgress: DashboardData["programProgress"] | undefined;
  activeProgramPauseStatus: string | null | undefined;
}

function isPaused(pauseStatus: string | null | undefined): boolean {
  return (pauseStatus ?? "").toLowerCase() === "paused";
}

export function HomeTodayTrainingCard({
  todaysWorkout,
  programProgress,
  activeProgramPauseStatus,
}: HomeTodayTrainingCardProps) {
  const tw = todaysWorkout ?? { hasWorkout: false };
  const hasProgram = programProgress != null;
  const paused = isPaused(activeProgramPauseStatus);
  const phaseLabel = programProgress?.currentPhaseLabel?.trim() || null;

  const view = useMemo(() => {
    if (tw.hasWorkout) {
      const minutes = tw.estimatedDuration ?? 45;
      const exerciseCount =
        typeof tw.totalSets === "number" && tw.totalSets > 0
          ? tw.totalSets
          : 0;
      const subParts = [
        exerciseCount > 0
          ? `${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`
          : null,
        phaseLabel,
      ].filter(Boolean);
      return {
        minutes,
        minutesLabel: "min",
        eyebrow: tw.type === "program" ? "Program workout" : "Assigned workout",
        name: tw.name ?? "Workout",
        sub: subParts.length ? subParts.join(" · ") : "Today's session",
        isRest: false,
      };
    }

    if (hasProgram && paused) {
      return {
        minutes: "—",
        minutesLabel: "",
        eyebrow: "Program paused",
        name: "Talk to your coach",
        sub: phaseLabel ?? "Training on hold",
        isRest: false,
      };
    }

    if (hasProgram) {
      return {
        minutes: "Rest",
        minutesLabel: "",
        eyebrow: "Recovery",
        name: "Rest day",
        sub: phaseLabel ? `Next sessions on Train · ${phaseLabel}` : "See your week on Train",
        isRest: true,
      };
    }

    return {
      minutes: "—",
      minutesLabel: "",
      eyebrow: "No program",
      name: "No training scheduled",
      sub: "Your coach will assign a program soon",
      isRest: false,
    };
  }, [tw, hasProgram, paused, phaseLabel]);

  return (
    <section className="min-w-0" aria-label="Today's training">
      <div className={styles.sectionHead}>
        <div className={styles.sectionTitleWrap}>
          <span className={styles.sectionAccentBar} aria-hidden />
          <h2 className={styles.sectionTitle}>Today&apos;s Training</h2>
        </div>
        <button
          type="button"
          className={styles.sectionLink}
          onClick={() => {
            window.location.href = "/client/train";
          }}
        >
          Go to Train →
        </button>
      </div>

      <button
        type="button"
        className={styles.todayCard}
        onClick={() => {
          window.location.href = "/client/train";
        }}
      >
        <div className={styles.todayMinutes}>
          <div
            className={styles.todayMinutesValue}
            style={view.isRest ? { fontSize: "22px" } : undefined}
          >
            {view.minutes}
          </div>
          {view.minutesLabel ? (
            <div className={styles.todayMinutesUnit}>{view.minutesLabel}</div>
          ) : null}
        </div>
        <div className={styles.todayDivider} aria-hidden />
        <div className={styles.todayBody}>
          <p className={styles.todayEyebrow}>{view.eyebrow}</p>
          <p className={styles.todayName}>{view.name}</p>
          <p className={styles.todaySub}>{view.sub}</p>
        </div>
        <span className={styles.todayChevron} aria-hidden>
          ›
        </span>
      </button>
    </section>
  );
}
