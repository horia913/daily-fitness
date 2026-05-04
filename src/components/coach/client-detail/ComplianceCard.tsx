"use client";

import React from "react";
import { Target } from "lucide-react";
import styles from "./ComplianceCard.module.css";

export type ComplianceCardAccent = "good" | "warn" | "crit";

type Props = {
  pct: number;
  label?: string;
  name?: string;
  accent?: ComplianceCardAccent;
};

function pctTone(pct: number): ComplianceCardAccent {
  if (pct <= 0) return "crit";
  if (pct < 50) return "warn";
  return "good";
}

export default function ComplianceCard({
  pct,
  label = "Compliance",
  name = "Client overview",
  accent,
}: Props) {
  const resolved: ComplianceCardAccent = accent ?? pctTone(pct);
  return (
    <div className={styles.wrap} data-accent={resolved}>
      <div className={styles.iconWrap} aria-hidden>
        <Target className={styles.icon} strokeWidth={2} />
      </div>
      <div className={styles.meta}>
        <div className={styles.kicker}>Nutrition</div>
        <div className={styles.name}>{name}</div>
      </div>
      <div className={styles.pctCol}>
        <div className={styles.pctNum}>{Math.round(pct)}%</div>
        <div className={styles.pctLabel}>{label}</div>
      </div>
    </div>
  );
}
