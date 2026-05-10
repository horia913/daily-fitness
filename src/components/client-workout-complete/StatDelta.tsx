"use client";

import React from "react";
import { ChevronDown, ChevronUp, Minus } from "lucide-react";
import styles from "./clientWorkoutCompleteV1.module.css";

export type DeltaTier = "up" | "same" | "down";

export function StatDelta(props: { tier: DeltaTier | "none"; label: string }) {
  if (props.tier === "none") {
    return (
      <span className={styles.statDelta} data-tier="same">
        <Minus size={9} aria-hidden />
        none
      </span>
    );
  }
  const tier = props.tier;
  return (
    <span className={styles.statDelta} data-tier={tier === "same" ? "same" : tier}>
      {tier === "up" ? <ChevronUp size={9} aria-hidden /> : null}
      {tier === "down" ? <ChevronDown size={9} aria-hidden /> : null}
      {tier === "same" ? <Minus size={9} aria-hidden /> : null}
      {props.label}
    </span>
  );
}
