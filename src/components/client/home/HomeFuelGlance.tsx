"use client";

import React from "react";
import type { HomeFuelGlanceData } from "./fetchHomeFuelGlance";
import styles from "./homePage.module.css";

const RING_SIZE = 52;
const RING_R = 22;
const RING_STROKE = 5;

export interface HomeFuelGlanceProps {
  data: HomeFuelGlanceData;
}

function formatKcal(n: number): string {
  return n.toLocaleString("en-US");
}

export function HomeFuelGlance({ data }: HomeFuelGlanceProps) {
  const center = RING_SIZE / 2;
  const circ = 2 * Math.PI * RING_R;
  const offset = circ - (data.caloriesPct / 100) * circ;

  return (
    <section className="min-w-0" aria-label="Fuel today">
      <div className={styles.sectionHead}>
        <div className={styles.sectionTitleWrap}>
          <span className={styles.sectionAccentBar} aria-hidden />
          <h2 className={styles.sectionTitle}>Fuel Today</h2>
        </div>
        <button
          type="button"
          className={styles.sectionLink}
          onClick={() => {
            window.location.href = "/client/nutrition";
          }}
        >
          Fuel →
        </button>
      </div>

      <div className={styles.fuelBlock}>
        <div className={styles.fuelRing} aria-hidden>
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="absolute inset-0 -rotate-90"
          >
            <circle
              cx={center}
              cy={center}
              r={RING_R}
              fill="none"
              stroke="var(--fc-track)"
              strokeWidth={RING_STROKE}
            />
            <circle
              cx={center}
              cy={center}
              r={RING_R}
              fill="none"
              stroke="var(--fc-status-success)"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
            />
          </svg>
          <span className={styles.fuelRingValue}>{data.caloriesPct}%</span>
        </div>

        <div className={styles.fuelCols}>
          <div className="min-w-0">
            <div className={styles.fuelStatValue}>
              {formatKcal(data.caloriesConsumed)}
              <span className={styles.fuelStatUnit}> kcal</span>
            </div>
            <div className={styles.fuelStatLabel}>
              of {formatKcal(data.caloriesGoal)}
            </div>
          </div>
          <div className="min-w-0">
            <div className={styles.fuelStatValue}>
              {formatKcal(data.proteinConsumed)}
              <span className={styles.fuelStatUnit}> g</span>
            </div>
            <div className={styles.fuelStatLabel}>Protein</div>
          </div>
        </div>

        <button
          type="button"
          className={styles.fuelLogLink}
          onClick={() => {
            window.location.href = "/client/nutrition";
          }}
        >
          Log →
        </button>
      </div>
    </section>
  );
}
