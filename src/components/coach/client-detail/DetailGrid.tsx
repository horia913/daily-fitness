"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./DetailGrid.module.css";

export type DetailGridIconTone =
  | "cyan"
  | "lime"
  | "good"
  | "purple"
  | "warn"
  | "critical";

export type DetailGridRow = {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  iconTone?: DetailGridIconTone;
  /** When true, main value uses muted placeholder styling if value is empty */
  mutedWhenEmpty?: boolean;
};

function iconClass(tone: DetailGridIconTone | undefined): string {
  switch (tone) {
    case "lime":
      return styles.iconLime;
    case "good":
      return styles.iconGood;
    case "purple":
      return styles.iconPurple;
    case "warn":
      return styles.iconWarn;
    case "critical":
      return styles.iconCrit;
    default:
      return styles.iconCyan;
  }
}

function isEmptyValue(v: React.ReactNode): boolean {
  if (v == null) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  return false;
}

export default function DetailGrid({ rows }: { rows: DetailGridRow[] }) {
  return (
    <div className={styles.wrap}>
      {rows.map((r) => {
        const Icon = r.icon;
        const empty = r.mutedWhenEmpty && isEmptyValue(r.value);
        const display = empty ? "—" : r.value;
        return (
          <div key={r.label} className={styles.row}>
            <div className={`${styles.icon} ${iconClass(r.iconTone)}`}>
              <Icon className="h-[14px] w-[14px]" strokeWidth={2} aria-hidden />
            </div>
            <div className={styles.meta}>
              <div className={styles.label}>{r.label}</div>
              <div className={`${styles.value} ${empty ? styles.valueMuted : ""}`.trim()}>
                {display}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
