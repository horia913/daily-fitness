"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./SubTabs.module.css";

export type SubTabDef<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
};

type Props<T extends string> = {
  tabs: SubTabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  /** Active pill color — check-ins uses purple, profile uses cyan. */
  activeTone?: "cyan" | "purple";
};

export default function SubTabs<T extends string>({
  tabs,
  active,
  onChange,
  activeTone = "cyan",
}: Props<T>) {
  return (
    <div className={styles.wrap} role="tablist">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        const activeClass =
          activeTone === "purple" ? styles.tabActivePurple : styles.tabActive;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles.tab} ${isActive ? activeClass : ""}`}
            onClick={() => onChange(t.id)}
          >
            <Icon className={styles.icon} aria-hidden strokeWidth={2} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
