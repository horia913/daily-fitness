"use client";

/**
 * CollectionCard — Element 16 (design/mockups/element-16-collection-card.html)
 *
 * Governed roster / collection card for Programs, Plans, Clients list pages.
 * Presentation primitive only — consumers pass data via props and slots.
 */

import React from "react";
import { cn } from "@/lib/utils";
import styles from "./collectionCard.module.css";

/** Item hue — cycle group A–D on roster pages or map per entity type. */
export const COLLECTION_HUES = {
  a: "var(--fc-group-a)",
  b: "var(--fc-group-b)",
  c: "var(--fc-group-c)",
  d: "var(--fc-group-d)",
} as const;

export type CollectionPhaseLevel = "light" | "moderate" | "hard" | "deload";

export interface CollectionCardStructureSegment {
  /** Phase / block name shown under the bar */
  label: string;
  /** Duration label (e.g. "4 weeks") */
  duration: string;
  /** Proportional flex weight for segment width */
  flex: number;
  phase: CollectionPhaseLevel;
}

export type CollectionCardStatusTone = "good" | "warn" | "bad" | "muted" | "default";

export interface CollectionCardProps {
  /** CSS color value for left rail + right glow (e.g. var(--fc-group-a)) */
  hue: string;
  /** Optional leading avatar (clients roster) */
  avatar?: React.ReactNode;
  name: string;
  status: "active" | "inactive";
  /** Override status pill label (default: Active / Inactive) */
  statusLabel?: string;
  /** Status pill color variant (clients training / attention) */
  statusTone?: CollectionCardStatusTone;
  /** Meta line content — use CollectionCardMeta* helpers or custom nodes */
  meta: React.ReactNode;
  /** Optional segmented structure strip (programs / plans with blocks) */
  structure?: CollectionCardStructureSegment[];
  /** Right-side headline metric slot (assigned count, score ring, etc.) */
  rightStat?: React.ReactNode;
  /** Action icon buttons slot */
  actions?: React.ReactNode;
  /** Reduced right-edge glow (clients roster — attention hues) */
  glowVariant?: "default" | "subtle";
  /** Tighter vertical layout (clients roster) */
  density?: "default" | "compact";
  /** Client list roster — compact mockup layout; does not affect programs/nutrition */
  rosterVariant?: "default" | "client";
  className?: string;
  onClick?: () => void;
}

const PHASE_CLASS: Record<CollectionPhaseLevel, string> = {
  light: styles.segLight,
  moderate: styles.segModerate,
  hard: styles.segHard,
  deload: styles.segDeload,
};

export type CollectionStructureStripProps = {
  structure: CollectionCardStructureSegment[];
  className?: string;
  /** Optional selected segment index (gym console / interactive consumers). */
  activeIndex?: number | null;
  /** When set, segments become tappable; omit for presentational dashboard use. */
  onSegmentClick?: (index: number) => void;
};

/**
 * Continuous color-coded phase bar from Element 16 / CollectionCard.
 * Dashboard uses it presentationally; gym console can pass activeIndex + onSegmentClick.
 */
export function CollectionStructureStrip({
  structure,
  className,
  activeIndex = null,
  onSegmentClick,
}: CollectionStructureStripProps) {
  if (structure.length === 0) return null;

  const interactive = typeof onSegmentClick === "function";

  return (
    <div className={cn(styles.struct, className)}>
      <div className={styles.segs} role={interactive ? "tablist" : undefined} aria-label={interactive ? "Training blocks" : undefined}>
        {structure.map((seg, i) => {
          const active = activeIndex === i;
          const segClass = cn(
            styles.seg,
            PHASE_CLASS[seg.phase],
            active && styles.segActive,
            interactive && styles.segInteractive,
          );
          if (interactive) {
            return (
              <button
                key={`${seg.label}-${i}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`${seg.label}, ${seg.duration}`}
                className={segClass}
                style={{ flex: seg.flex }}
                onClick={() => onSegmentClick(i)}
              />
            );
          }
          return (
            <div
              key={`${seg.label}-${i}`}
              className={segClass}
              style={{ flex: seg.flex }}
            />
          );
        })}
      </div>
      <div className={styles.seglabels}>
        {structure.map((seg, i) => {
          const active = activeIndex === i;
          const slabInner = (
            <>
              <div className={styles.slabName}>{seg.label}</div>
              <div className={styles.slabDuration}>{seg.duration}</div>
            </>
          );
          if (interactive) {
            return (
              <button
                key={`${seg.label}-lbl-${i}`}
                type="button"
                className={cn(styles.slab, styles.slabButton, active && styles.slabActive)}
                style={{ flex: seg.flex }}
                onClick={() => onSegmentClick(i)}
              >
                {slabInner}
              </button>
            );
          }
          return (
            <div
              key={`${seg.label}-lbl-${i}`}
              className={cn(styles.slab, active && styles.slabActive)}
              style={{ flex: seg.flex }}
            >
              {slabInner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_TONE_CLASS: Record<CollectionCardStatusTone, string> = {
  good: styles.statusToneGood,
  warn: styles.statusToneWarn,
  bad: styles.statusToneBad,
  muted: styles.statusToneMuted,
  default: styles.statusActive,
};

export function CollectionCard({
  hue,
  avatar,
  name,
  status,
  statusLabel,
  statusTone = "default",
  meta,
  structure,
  rightStat,
  actions,
  glowVariant = "default",
  density = "default",
  rosterVariant = "default",
  className,
  onClick,
}: CollectionCardProps) {
  const isActive = status === "active";
  const label = statusLabel ?? (isActive ? "Active" : "Inactive");
  const isClientRoster = rosterVariant === "client";
  const statusClass =
    isActive && statusTone !== "default"
      ? STATUS_TONE_CLASS[statusTone]
      : isActive
        ? styles.statusActive
        : styles.statusInactive;

  const cardStyle = {
    "--collection-hue": isActive ? hue : undefined,
  } as React.CSSProperties;

  const Root = onClick ? "button" : "div";

  return (
    <Root
      type={onClick ? "button" : undefined}
      className={cn(
        styles.card,
        !isActive && styles.inactive,
        isClientRoster && styles.cardClientRoster,
        glowVariant === "subtle" && styles.glowSubtle,
        density === "compact" && !isClientRoster && styles.cardCompact,
        onClick && styles.clickable,
        className,
      )}
      style={cardStyle}
      onClick={onClick}
    >
      <div className={styles.body}>
        <div className={styles.toprow}>
          {avatar ? <span className={styles.leadAvatar}>{avatar}</span> : null}
          <span className={styles.name}>{name}</span>
          <span className={cn(styles.status, statusClass)}>
            <span className={styles.statusDot} />
            {label}
          </span>
        </div>
        <div className={cn(styles.meta, avatar && styles.metaIndented)}>{meta}</div>
        {structure && structure.length > 0 ? (
          <CollectionStructureStrip structure={structure} />
        ) : null}
      </div>
      {(rightStat || actions) && (
        <div
          className={cn(
            styles.side,
            density === "compact" && !isClientRoster && styles.sideCompact,
          )}
        >
          {rightStat}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      )}
    </Root>
  );
}

/** Vertical stack wrapper matching element-16 `.stack` (12px gap). */
export function CollectionCardStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(styles.stack, className)}>{children}</div>;
}

export function CollectionCardMetaChip({ children }: { children: React.ReactNode }) {
  return <span className={styles.metaChip}>{children}</span>;
}

export function CollectionCardMetaSep() {
  return <span className={styles.metaSep}>·</span>;
}

export function CollectionCardMetaValue({ children }: { children: React.ReactNode }) {
  return <span className={styles.metaValue}>{children}</span>;
}

export function CollectionCardMetaText({ children }: { children: React.ReactNode }) {
  return <span>{children}</span>;
}

export interface CollectionCardAssignedStatProps {
  count: number;
  label?: string;
  avatars?: { initials: string; background: string }[];
}

/** Programs-style right stat: assigned count + optional avatar stack. */
export function CollectionCardAssignedStat({
  count,
  label = "clients",
  avatars,
}: CollectionCardAssignedStatProps) {
  const isZero = count === 0;
  const showAvatars = !isZero && avatars && avatars.length > 0;

  return (
    <div className={styles.assigned}>
      {showAvatars ? (
        <div className={styles.avatars}>
          {avatars.map((av, i) => (
            <span
              key={`${av.initials}-${i}`}
              className={styles.avatar}
              style={{ background: av.background }}
            >
              {av.initials}
            </span>
          ))}
        </div>
      ) : null}
      <div className={cn(styles.acount, isZero && styles.acountZero)}>
        <span className={styles.acountN}>{count}</span>
        <span className={styles.acountL}>{label}</span>
      </div>
    </div>
  );
}

export interface CollectionCardIconActionProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: "default" | "danger";
}

export function CollectionCardIconAction({
  icon,
  label,
  onClick,
  variant = "default",
}: CollectionCardIconActionProps) {
  return (
    <button
      type="button"
      className={cn(styles.iconBtn, variant === "danger" && styles.iconBtnDanger)}
      onClick={onClick}
      aria-label={label}
    >
      <span className={styles.icon}>{icon}</span>
    </button>
  );
}
