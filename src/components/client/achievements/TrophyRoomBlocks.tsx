"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import tr from "./trophyRoomV1.module.css";
import type { CelebrationPick } from "./trophyRoomUtils";
import {
  formatShortDate,
  iconGradientTier,
  progressPercentForBar,
  unitLabelForTemplate,
  type TrophyRow,
} from "./trophyRoomUtils";
import { TierPill, RarityTag } from "./TrophyAtoms";
import { TrophyAchievementIcon } from "./trophyRoomIcons";

const RING_R = 32;
const RING_C = 2 * Math.PI * RING_R;

function celebrationIconClass(v: ReturnType<typeof iconGradientTier>): string {
  switch (v) {
    case "bronze":
      return tr.trophyIconBronze;
    case "silver":
      return tr.trophyIconSilver;
    case "gold":
      return tr.trophyIconGold;
    case "platinum":
      return tr.trophyIconPlatinum;
    default:
      return tr.trophyIconMastered;
  }
}

export function TrophyCelebrationHero({ pick }: { pick: CelebrationPick }) {
  if (!pick) return null;

  if (pick.mode === "recent") {
    const v = iconGradientTier(pick.row);
    return (
      <div
        className={tr.trophyCelebration}
        style={
          {
            ["--tr-glow" as string]: "var(--mastered-glow)",
            ["--bl-soft" as string]: "var(--mastered-soft)",
            ["--icon-soft" as string]: "var(--mastered-soft)",
            ["--icon-glow" as string]: "var(--mastered-glow)",
          } as React.CSSProperties
        }
      >
        <div className={tr.trophyCelebrationGlowTr} aria-hidden />
        <div className={tr.trophyCelebrationGlowBl} aria-hidden />
        <div className={cn(tr.trophyCelebrationIcon84, celebrationIconClass(v))}>
          <TrophyAchievementIcon
            template={pick.row.raw.template}
            className={cn(tr.trophyIconHero, tr.trophyIconSvg)}
          />
        </div>
        <div className={tr.trophyCelebrationMeta}>
          <div className={tr.trophyCelebrationEyebrow} style={{ color: "var(--mastered)" }}>
            ✨ Just unlocked
          </div>
          <div className={tr.trophyCelebrationTitle}>{pick.row.name}</div>
          <div className={tr.trophyCelebrationRow}>
            <TierPill row={pick.row} context="celebration" />
            <RarityTag rarity={pick.row.rarity} />
          </div>
          <div className={tr.trophyCelebrationDate}>
            Unlocked {formatShortDate(pick.unlockDate)}
          </div>
        </div>
      </div>
    );
  }

  if (pick.mode === "highest") {
    const v = iconGradientTier(pick.row);
    const d = pick.row.lastUnlockedAt;
    return (
      <div
        className={tr.trophyCelebration}
        style={
          {
            ["--tr-glow" as string]: "var(--mastered-glow)",
            ["--bl-soft" as string]: "var(--mastered-soft)",
            ["--icon-soft" as string]: "var(--mastered-soft)",
            ["--icon-glow" as string]: "var(--mastered-glow)",
          } as React.CSSProperties
        }
      >
        <div className={tr.trophyCelebrationGlowTr} aria-hidden />
        <div className={tr.trophyCelebrationGlowBl} aria-hidden />
        <div className={cn(tr.trophyCelebrationIcon84, celebrationIconClass(v))}>
          <TrophyAchievementIcon
            template={pick.row.raw.template}
            className={cn(tr.trophyIconHero, tr.trophyIconSvg)}
          />
        </div>
        <div className={tr.trophyCelebrationMeta}>
          <div className={tr.trophyCelebrationEyebrow} style={{ color: "var(--mastered)" }}>
            ✨ Highest tier reached
          </div>
          <div className={tr.trophyCelebrationTitle}>{pick.row.name}</div>
          <div className={tr.trophyCelebrationRow}>
            <TierPill row={pick.row} context="celebration" />
            <RarityTag rarity={pick.row.rarity} />
          </div>
          {d ? (
            <div className={tr.trophyCelebrationDate}>Reached {formatShortDate(d)}</div>
          ) : null}
        </div>
      </div>
    );
  }

  /* almost — cyan variant */
  const row = pick.row;
  const p = row.raw;
  const pct = Math.round(progressPercentForBar(p));
  const nextLabel = p.nextTier?.label || "—";
  const goal = p.nextTier?.threshold ?? 0;
  const unit = unitLabelForTemplate(p.template);
  const toGo = goal > p.currentValue ? Math.max(0, goal - p.currentValue) : 0;

  return (
    <div
      className={cn(tr.trophyCelebration, tr.trophyCelebrationCyan)}
      style={
        {
          ["--tr-glow" as string]: "var(--platinum-glow)",
          ["--bl-soft" as string]: "var(--cyan-soft)",
          ["--icon-soft" as string]: "var(--bronze-soft)",
          ["--icon-glow" as string]: "var(--bronze-glow)",
        } as React.CSSProperties
      }
    >
      <div className={tr.trophyCelebrationGlowTr} aria-hidden />
      <div className={tr.trophyCelebrationGlowBl} aria-hidden />
      <div className={cn(tr.trophyCelebrationIcon84, tr.trophyCelebrationIcon74, tr.trophyIconBronze)}>
        <TrophyAchievementIcon
          template={p.template}
          className={cn(tr.trophyIconHero, tr.trophyIconSvg)}
        />
      </div>
      <div className={tr.trophyCelebrationMeta}>
        <div className={tr.trophyCelebrationEyebrow} style={{ color: "var(--ps-cyan)" }}>
          Closest to unlocking
        </div>
        <div className={tr.trophyCelebrationTitle}>
          {row.name} · {nextLabel}
        </div>
        <div className="flex items-center w-full mt-2">
          <div className={tr.trophyAlmostBarTrack}>
            <div className={tr.trophyAlmostBarFill} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <span className={tr.trophyAlmostPct}>{pct}%</span>
        </div>
        <div className={tr.trophyAlmostFoot}>
          <span>
            <b style={{ color: "var(--ps-t2)", fontWeight: 600 }}>
              {p.currentValue} / {goal}
            </b>{" "}
            {unit}
            {toGo > 0 ? ` · ${toGo.toLocaleString()} to go` : ""}
        </span>
        </div>
      </div>
    </div>
  );
}

export function TrophyStatsHero({
  total,
  unlocked,
  inProgress,
  locked,
}: {
  total: number;
  unlocked: number;
  inProgress: number;
  locked: number;
}) {
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  const dashOffset = RING_C - (RING_C * pct) / 100;
  const uPct = total > 0 ? (unlocked / total) * 100 : 0;
  const iPct = total > 0 ? (inProgress / total) * 100 : 0;
  const lPct = total > 0 ? (locked / total) * 100 : 0;

  return (
    <div className={tr.trophyStats}>
      <div className={tr.trophyStatsGlow} aria-hidden />
      <div className={tr.trophyStatsTop}>
        <div className={tr.trophyRingWrap}>
          <svg className={tr.trophyRingSvg} width={78} height={78} viewBox="0 0 78 78" aria-hidden>
            <defs>
              <linearGradient id="trophyProgressGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#C5FF4A" />
                <stop offset="100%" stopColor="#4FE3E8" />
              </linearGradient>
            </defs>
            <g transform="translate(39 39) rotate(-90)">
              <circle r={RING_R} fill="none" stroke="var(--ps-line)" strokeWidth={6} />
              <circle
                r={RING_R}
                fill="none"
                stroke="url(#trophyProgressGrad)"
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={dashOffset}
              />
            </g>
          </svg>
          <div className={tr.trophyRingCenter}>
            <span className={tr.trophyRingPct}>{pct}</span>
            <span className={tr.trophyRingLbl}>percent</span>
          </div>
        </div>
        <div className={tr.trophyStatsCol}>
          <span className={tr.trophyStatsEyebrow}>Collection</span>
          <span className={tr.trophyStatsHeadline}>
            {unlocked} of {total} unlocked
          </span>
          <span className={tr.trophyStatsSub}>
            {inProgress} in progress · {locked} still locked
          </span>
        </div>
      </div>
      <div className={tr.trophyStackBar}>
        <div
          className={tr.trophyStackSeg}
          style={{
            width: `${uPct}%`,
            background: "linear-gradient(90deg, var(--mastered), var(--lime-2))",
          }}
        />
        <div
          className={tr.trophyStackSeg}
          style={{
            width: `${iPct}%`,
            background: "linear-gradient(90deg, var(--ps-cyan), var(--ps-cyan-bar-end))",
          }}
        />
        <div
          className={tr.trophyStackSeg}
          style={{ width: `${lPct}%`, background: "rgba(255,255,255,0.04)" }}
        />
      </div>
      <div className={tr.trophyLegendGrid}>
        <div className={tr.trophyLegendTile}>
          <span className={tr.trophyLegendNum} style={{ color: "var(--ps-lime)" }}>
            {unlocked}
          </span>
          <span className={tr.trophyLegendLbl}>Unlocked</span>
        </div>
        <div className={tr.trophyLegendTile}>
          <span className={tr.trophyLegendNum} style={{ color: "var(--ps-cyan)" }}>
            {inProgress}
          </span>
          <span className={tr.trophyLegendLbl}>In progress</span>
        </div>
        <div className={tr.trophyLegendTile}>
          <span className={tr.trophyLegendNum} style={{ color: "var(--ps-t3)" }}>
            {locked}
          </span>
          <span className={tr.trophyLegendLbl}>Locked</span>
        </div>
      </div>
    </div>
  );
}

export function TrophySectionHeader({
  eyebrow,
  accent,
  count,
  unlockedFilterLabel,
}: {
  eyebrow: string;
  accent: "lime" | "cyan" | "muted";
  count: number;
  /** When filter is "unlocked", first section reads "All unlocked" */
  unlockedFilterLabel?: boolean;
}) {
  const accentCls =
    accent === "lime"
      ? tr.trophyEyebrowLime
      : accent === "cyan"
        ? tr.trophyEyebrowCyan
        : tr.trophyEyebrowMuted;
  const label =
    unlockedFilterLabel && eyebrow === "Recently unlocked" ? "All unlocked" : eyebrow;
  return (
    <div className={tr.trophySectionHead}>
      <span className={cn(tr.trophySectionEyebrow, accentCls)}>{label}</span>
      <span className={tr.trophySectionLine} />
      <span className={tr.trophySectionCount}>{count}</span>
    </div>
  );
}
