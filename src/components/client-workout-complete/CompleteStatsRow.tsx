"use client";

import React from "react";
import { Activity, Grid3x3, Star } from "lucide-react";
import styles from "./clientWorkoutCompleteV1.module.css";
import { StatDelta, type DeltaTier } from "./StatDelta";
import { cn } from "@/lib/utils";

export type TileStat = {
  value: React.ReactNode;
  valueTone?: "lime" | "muted" | "default";
  deltaTier: DeltaTier | "none";
  deltaLabel: string;
};

export function CompleteStatsRow(props: {
  prTile: TileStat;
  setsTile: TileStat;
  repsTile: TileStat;
  prHighlight: boolean;
}) {
  return (
    <div className={styles.statsRow}>
      <div
        className={
          props.prHighlight ? `${styles.statTile} ${styles.statTilePr}` : styles.statTile
        }
      >
        <div className={styles.statHead}>
          <Star size={10} aria-hidden />
          PRs
        </div>
        <div>
          <span
            className={cn(
              styles.statNum,
              props.prTile.valueTone === "lime" && styles.statNumLime,
              props.prTile.valueTone === "muted" && styles.statNumMuted
            )}
          >
            {props.prTile.value}
          </span>
        </div>
        <StatDelta tier={props.prTile.deltaTier} label={props.prTile.deltaLabel} />
      </div>
      <div className={styles.statTile}>
        <div className={styles.statHead}>
          <Grid3x3 size={10} aria-hidden />
          Sets
        </div>
        <div>
          <span className={styles.statNum}>{props.setsTile.value}</span>
        </div>
        <StatDelta tier={props.setsTile.deltaTier} label={props.setsTile.deltaLabel} />
      </div>
      <div className={styles.statTile}>
        <div className={styles.statHead}>
          <Activity size={10} aria-hidden />
          Reps
        </div>
        <div>
          <span className={styles.statNum}>{props.repsTile.value}</span>
        </div>
        <StatDelta tier={props.repsTile.deltaTier} label={props.repsTile.deltaLabel} />
      </div>
    </div>
  );
}
