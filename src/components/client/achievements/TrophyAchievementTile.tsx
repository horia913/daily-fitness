"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import tr from "./trophyRoomV1.module.css";
import { TrophyAchievementIcon } from "./trophyRoomIcons";
import { TierPill, RarityTag } from "./TrophyAtoms";
import {
  iconGradientTier,
  isFullyUnlocked,
  isInProgressBucket,
  isLockedBucket,
  progressPercentForBar,
  unitLabelForTemplate,
  type TrophyRow,
} from "./trophyRoomUtils";
import { formatShortDate } from "./trophyRoomUtils";

const PIP_ORDER = ["bronze", "silver", "gold", "platinum", "mastered"] as const;

const LINE_FILL: Record<number, string> = {
  0: tr.trophyLadderLineFillBronze,
  1: tr.trophyLadderLineFillSilver,
  2: tr.trophyLadderLineFillGold,
  3: tr.trophyLadderLineFillPlatinum,
};

const PIP_CLS: Record<string, string> = {
  bronze: tr.trophyPipBronze,
  silver: tr.trophyPipSilver,
  gold: tr.trophyPipGold,
  platinum: tr.trophyPipPlatinum,
  mastered: tr.trophyPipMastered,
};

function iconWrapClass(row: TrophyRow): string {
  if (isLockedBucket(row)) return cn(tr.trophyIconTile, tr.trophyIconTileLocked);
  const g = iconGradientTier(row);
  return cn(
    tr.trophyIconTile,
    g === "bronze"
      ? tr.trophyIconBronze
      : g === "silver"
        ? tr.trophyIconSilver
        : g === "gold"
          ? tr.trophyIconGold
          : g === "platinum"
            ? tr.trophyIconPlatinum
            : tr.trophyIconMastered,
  );
}

function pipAchieved(p: TrophyRow["raw"], pipIdx: number): boolean {
  const t = p.template;
  if (!t.is_tiered) return false;
  if (pipIdx < 4) return p.unlockedTiers.includes(PIP_ORDER[pipIdx]!);
  return p.status === "unlocked";
}

function nextPipIndex(p: TrophyRow["raw"]): number {
  const t = p.template;
  if (!t.is_tiered) return -1;
  if (p.status === "unlocked") return -1;
  for (let i = 0; i < 4; i++) {
    if (!p.unlockedTiers.includes(PIP_ORDER[i]!)) return i;
  }
  return 4;
}

function lineFilled(p: TrophyRow["raw"], lineIdx: number): boolean {
  const t = p.template;
  if (!t.is_tiered) return false;
  if (lineIdx === 3) return p.status === "unlocked";
  const markers = ["silver", "gold", "platinum"] as const;
  return p.unlockedTiers.includes(markers[lineIdx]!);
}

function capitalizeTier(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function highestUnlockedTierName(p: TrophyRow["raw"]) {
  for (const x of ["platinum", "gold", "silver", "bronze"] as const) {
    if (p.unlockedTiers.includes(x)) return capitalizeTier(x);
  }
  return "Bronze";
}

function TierLadder({ row }: { row: TrophyRow }) {
  const p = row.raw;
  const t = p.template;
  if (!t.is_tiered) return null;

  const nextI = nextPipIndex(p);
  const bronzeGoal = t.tier_bronze_threshold ?? 1;

  const foot = (
    <div className={tr.trophyLadderFoot}>
      {p.status === "unlocked" ? (
        <>
          <span style={{ color: "var(--ps-t2)", fontWeight: 600 }}>
            Bronze · Silver · Gold · Platinum
          </span>
          <span style={{ color: "var(--ps-t2)", fontWeight: 600 }}>Mastered ✓</span>
        </>
      ) : p.unlockedTiers.length === 0 ? (
        <>
          <span style={{ color: "var(--ps-t2)", fontWeight: 600 }}>
            Locked · 0 / {bronzeGoal.toLocaleString()} for {t.tier_bronze_label || "Bronze"}
          </span>
          <span />
        </>
      ) : (
        <>
          <span style={{ color: "var(--ps-t2)", fontWeight: 600 }}>
            {p.nextTier ? (
              <>
                {highestUnlockedTierName(p)} · {p.currentValue.toLocaleString()} /{" "}
                {p.nextTier.threshold.toLocaleString()} {unitLabelForTemplate(t)}
              </>
            ) : (
              highestUnlockedTierName(p)
            )}
          </span>
          <span style={{ color: "var(--ps-cyan)", fontWeight: 600 }}>
            {p.nextTier ? `Next: ${p.nextTier.label}` : ""}
          </span>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className={tr.trophyLadderRow}>
        {PIP_ORDER.map((pipKey, i) => (
          <React.Fragment key={pipKey}>
            {i > 0 ? (
              <div
                className={cn(
                  tr.trophyLadderLine,
                  lineFilled(p, i - 1) ? LINE_FILL[i - 1] : undefined,
                )}
              />
            ) : null}
            <div
              className={cn(
                tr.trophyPip,
                pipAchieved(p, i) ? PIP_CLS[pipKey] : null,
                !pipAchieved(p, i) && i === nextI ? tr.trophyPipNext : null,
              )}
            >
              {!pipAchieved(p, i) && i === nextI ? (
                <span className={tr.trophyPipDot} aria-hidden />
              ) : null}
            </div>
          </React.Fragment>
        ))}
      </div>
      {foot}
    </>
  );
}

function SingleTierFoot({ row }: { row: TrophyRow }) {
  const p = row.raw;
  const t = p.template;
  const goal = t.single_threshold ?? 1;
  const cur = p.currentValue;
  return (
    <div className={tr.trophyLadderFoot}>
      <span style={{ color: "var(--ps-t2)", fontWeight: 600 }}>
        Single tier · {cur}/{goal}
        {p.status === "unlocked" ? " · achieved" : ""}
      </span>
      <span />
    </div>
  );
}

export function TrophyAchievementTile({ row }: { row: TrophyRow }) {
  const p = row.raw;
  const t = p.template;
  const locked = isLockedBucket(row);
  const full = isFullyUnlocked(row);
  const inProg = isInProgressBucket(row);
  const pct = Math.round(progressPercentForBar(p));
  const almost = inProg && pct >= 50;
  const nextTierName = t.is_tiered
    ? p.nextTier?.label ||
      (p.nextTier?.tier
        ? p.nextTier.tier.charAt(0).toUpperCase() + p.nextTier.tier.slice(1)
        : "—")
    : "Goal";
  const goal = p.nextTier?.threshold ?? t.single_threshold ?? 0;
  const unit = unitLabelForTemplate(t);

  let stripeColor: string | null = null;
  if (!locked) {
    stripeColor = full ? "var(--mastered)" : "var(--ps-cyan)";
  }

  return (
    <article
      className={cn(
        tr.trophyTile,
        locked && tr.trophyTileLocked,
        !locked && full && t.is_tiered && p.status === "unlocked" && tr.trophyTileMastered,
        !locked && almost && tr.trophyTileAlmost,
      )}
    >
      {stripeColor ? (
        <span
          className={tr.trophyStripe}
          style={{ background: stripeColor }}
          aria-hidden
        />
      ) : null}

      <div className={iconWrapClass(row)}>
        {locked ? (
          <Lock className={tr.trophyLockSvg} strokeWidth={2} aria-hidden />
        ) : (
          <TrophyAchievementIcon template={t} className={tr.trophyIconSvg} />
        )}
      </div>

      <div className={tr.trophyInfo}>
        <div className={tr.trophyHeadRow}>
          <span className={cn(tr.trophyName, locked && tr.trophyNameLocked)}>{row.name}</span>
          {!locked ? <TierPill row={row} /> : null}
          <RarityTag rarity={row.rarity} />
          {!locked && row.lastUnlockedAt ? (
            <span className={tr.trophyDate}>{formatShortDate(row.lastUnlockedAt)}</span>
          ) : null}
        </div>

        <p className={cn(tr.trophyDesc, locked && tr.trophyDescLocked)}>{row.description}</p>

        {t.is_tiered ? <TierLadder row={row} /> : <SingleTierFoot row={row} />}

        {inProg ? (
          <div className={tr.trophyProgWrap}>
            <div className={tr.trophyProgTrack}>
              <div
                className={tr.trophyProgFill}
                style={{
                  width: `${Math.max(0.5, Math.min(100, pct))}%`,
                }}
              />
            </div>
            <div className={tr.trophyProgFoot}>
              <span>
                <span style={{ color: "var(--ps-cyan)", fontWeight: 600 }}>{pct}%</span> · {p.currentValue}{" "}
                of {goal} {unit}
              </span>
              <span style={{ color: "var(--ps-t3)" }}>
                Next: <b style={{ color: "var(--ps-t1)", fontWeight: 500 }}>{nextTierName}</b>
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
