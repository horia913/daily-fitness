"use client";

/**
 * HeroActionCard — v4 Hero (Action) card atomic
 *
 * Spec refs: design-system-v4 §6.4 (Hero card), §3 (action-top backdrop pairing),
 *             §15.2 (component conventions). Class: .fc-hero-action (ui-system.css 1.B.1).
 *
 * Used by: Action-Dominant client screens (Today, Workout Detail, etc.) where one
 * primary CTA must dominate the screen.
 *
 * Phase 0a: additive only. Not yet wired into any screen.
 */

import React from "react";
import { cn } from "@/lib/utils";

export interface HeroActionCardProps {
  /** Small uppercase label above the title (e.g. "TODAY'S WORKOUT"). */
  eyebrow?: React.ReactNode;
  /** Optional system/status pill rendered next to the eyebrow (e.g. tag-system, tag-status). */
  pill?: React.ReactNode;
  /** Large display-font title. */
  title: React.ReactNode;
  /** Secondary descriptor row (duration, count, target, etc.). */
  meta?: React.ReactNode;
  /** The primary action button (use .btn-action). */
  cta: React.ReactNode;
  /** Optional info slot rendered below meta and above the CTA (e.g. coach quote, deadline). */
  infoSlot?: React.ReactNode;
  className?: string;
}

export function HeroActionCard({
  eyebrow,
  pill,
  title,
  meta,
  cta,
  infoSlot,
  className,
}: HeroActionCardProps) {
  return (
    <section className={cn("fc-hero-action", className)}>
      {(eyebrow || pill) && (
        <div className="flex items-center justify-between gap-2 mb-2">
          {eyebrow ? (
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[var(--fc-text-subtle)]">
              {eyebrow}
            </span>
          ) : (
            <span />
          )}
          {pill ? <div className="shrink-0">{pill}</div> : null}
        </div>
      )}

      <h2
        className="font-bold leading-[1.05] text-[var(--fc-text-primary)]"
        style={{
          fontFamily:
            "var(--font-display, var(--font-number, var(--font-mono, ui-monospace, monospace)))",
          fontSize: "clamp(28px, 6vw, 36px)",
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h2>

      {meta ? (
        <div className="mt-2 text-[13px] text-[var(--fc-text-dim)]">
          {meta}
        </div>
      ) : null}

      {infoSlot ? <div className="mt-3">{infoSlot}</div> : null}

      <div className="mt-4">{cta}</div>
    </section>
  );
}

export default HeroActionCard;
