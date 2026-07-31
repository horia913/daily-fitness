"use client";

import React from "react";
import styles from "./clientWorkoutCompleteV6.module.css";
import { cn } from "@/lib/utils";

export type TileStat = {
  value: React.ReactNode;
  valueTone?: "warn" | "muted" | "default";
  deltaTier: "up" | "same" | "down" | "none";
  deltaLabel: string;
};

function DeltaLine(props: { tier: TileStat["deltaTier"]; label: string }) {
  if (props.tier === "none") {
    return <div className={`${styles.statD} ${styles.statDFlat}`}>—</div>;
  }
  if (props.tier === "same" || props.label === "same") {
    return (
      <div className={`${styles.statD} ${styles.statDFlat}`}>— same</div>
    );
  }
  if (props.label === "new") {
    return <div className={styles.statD}>new</div>;
  }
  return (
    <div
      className={cn(styles.statD, props.tier === "down" && styles.statDDown)}
    >
      {props.label}
    </div>
  );
}

/** Stats strip: PRs / Sets / Reps — number, label, delta. No icons (intentional vs mockup). */
export function CompleteStatsRow(props: {
  prTile: TileStat;
  setsTile: TileStat;
  repsTile: TileStat;
  prHighlight: boolean;
}) {
  return (
    <div className={styles.stats}>
      <div className={styles.stat}>
        <div
          className={cn(
            styles.statN,
            styles.disp,
            props.prHighlight && styles.statNWarn,
            props.prTile.valueTone === "muted" && styles.statNMuted,
          )}
        >
          {props.prTile.value}
        </div>
        <div className={styles.statL}>PRs</div>
        <DeltaLine
          tier={props.prTile.deltaTier}
          label={props.prTile.deltaLabel}
        />
      </div>
      <div className={styles.stat}>
        <div className={`${styles.statN} ${styles.disp}`}>
          {props.setsTile.value}
        </div>
        <div className={styles.statL}>Sets</div>
        <DeltaLine
          tier={props.setsTile.deltaTier}
          label={props.setsTile.deltaLabel}
        />
      </div>
      <div className={styles.stat}>
        <div className={`${styles.statN} ${styles.disp}`}>
          {props.repsTile.value}
        </div>
        <div className={styles.statL}>Reps</div>
        <DeltaLine
          tier={props.repsTile.deltaTier}
          label={props.repsTile.deltaLabel}
        />
      </div>
    </div>
  );
}
