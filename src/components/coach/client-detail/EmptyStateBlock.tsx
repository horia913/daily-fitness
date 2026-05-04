"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./EmptyStateBlock.module.css";

type Action = {
  label: string;
  onClick: () => void;
  variant: "primary" | "outline";
};

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: Action[];
  /** Inline row (e.g. stats nutrition CTA) — no big icon stack */
  compact?: boolean;
};

export default function EmptyStateBlock({
  icon: Icon,
  title,
  description,
  actions,
  compact,
}: Props) {
  return (
    <div className={compact ? styles.wrapCompact : styles.wrap}>
      {!compact && (
        <div className={styles.iconBox} aria-hidden>
          <Icon className={styles.icon} strokeWidth={1.75} />
        </div>
      )}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.desc}>{description}</p>
      {actions && actions.length > 0 ? (
        <div className={styles.actions}>
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={a.variant === "primary" ? styles.btnPrimary : styles.btnOutline}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
