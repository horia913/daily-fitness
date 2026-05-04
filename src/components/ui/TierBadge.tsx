"use client";

/**
 * TierBadge — v4 Tier badge atomic (Bronze / Silver / Gold / Platinum / Diamond)
 *
 * Spec refs: design-system-v4 §6.18 (Tier badge), §2.7 / §2.8 (rarity & sub-tier
 *             color tokens), §15.2 (component conventions). Class: .tier-badge
 *             with [data-tier] variant (ui-system.css 1.B.8).
 *
 * Used by: Achievements, Personal Records, Coach Profile (subscription tier).
 *
 * Phase 0a: additive only.
 * Phase 1 Screen 1: `"diamond"` variant added (V5 decision — v4→v5 extension)
 *           as a fifth sub-tier above platinum. Backed by:
 *           - `--fc-accent-diamond` token (light + dark) in ui-system.css
 *           - `.tier-badge[data-tier="diamond"]` rule (cyan→silver→ice gradient,
 *             text-clipped — pattern parallels platinum)
 *           Document v4→v5 extension in docs/ui-rollout-notes.md per V5.
 */

import React from "react";
import { cn } from "@/lib/utils";

export type Tier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface TierBadgeProps {
  tier: Tier;
  /** Optional override for the visible label. Defaults to capitalized tier name. */
  label?: React.ReactNode;
  className?: string;
}

const DEFAULT_LABEL: Record<Tier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
};

export function TierBadge({ tier, label, className }: TierBadgeProps) {
  return (
    <span
      className={cn("tier-badge", className)}
      data-tier={tier}
      aria-label={`Tier: ${DEFAULT_LABEL[tier]}`}
    >
      {label ?? DEFAULT_LABEL[tier]}
    </span>
  );
}

export default TierBadge;
