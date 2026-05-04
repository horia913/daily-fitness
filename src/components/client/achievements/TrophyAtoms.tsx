"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import tr from "./trophyRoomV1.module.css";
import type { Rarity, TrophyRow } from "./trophyRoomUtils";
import { isFullyUnlocked } from "./trophyRoomUtils";

const TIER_ORDER = ["bronze", "silver", "gold", "platinum"] as const;

export function TierPill({
  row,
  context = "tile",
}: {
  row: TrophyRow;
  context?: "tile" | "celebration";
}) {
  const p = row.raw;
  if (!p.template.is_tiered) return null;

  if (p.status === "unlocked") {
    return (
      <span className={cn(tr.tierPill, tr.tierPillMastered)}>
        <span aria-hidden>★</span> Mastered
      </span>
    );
  }

  if (context === "tile" && !isFullyUnlocked(row)) return null;

  for (const t of [...TIER_ORDER].reverse()) {
    if (p.unlockedTiers.includes(t)) {
      const cls =
        t === "bronze"
          ? tr.tierPillBronze
          : t === "silver"
            ? tr.tierPillSilver
            : t === "gold"
              ? tr.tierPillGold
              : tr.tierPillPlatinum;
      const label = t.charAt(0).toUpperCase() + t.slice(1);
      return <span className={cn(tr.tierPill, cls)}>{label}</span>;
    }
  }

  if (context === "celebration" && p.nextTier) {
    const nt = p.nextTier.tier;
    const cls =
      nt === "bronze"
        ? tr.tierPillBronze
        : nt === "silver"
          ? tr.tierPillSilver
          : nt === "gold"
            ? tr.tierPillGold
            : tr.tierPillPlatinum;
    const label = p.nextTier.label || nt;
    return <span className={cn(tr.tierPill, cls)}>{label}</span>;
  }

  return null;
}

export function RarityTag({ rarity }: { rarity: Rarity }) {
  const cls =
    rarity === "rare"
      ? tr.rarityRare
      : rarity === "epic"
        ? tr.rarityEpic
        : rarity === "legendary"
          ? tr.rarityLegendary
          : tr.rarityCommon;
  const label = rarity;
  return (
    <span className={cn(tr.rarityTag, cls)}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
}
