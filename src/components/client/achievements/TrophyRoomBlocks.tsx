"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import tr from "./trophyRoomV1.module.css";
import type { CelebrationPick, FilterStatus, TrophyRow } from "./trophyRoomUtils";
import {
  formatShortDate,
  iconGradientTier,
  isFullyUnlocked,
  progressPercentForBar,
  unitLabelForTemplate,
} from "./trophyRoomUtils";
import { TierPill, RarityTag } from "./TrophyAtoms";
import { TrophyAchievementIcon } from "./trophyRoomIcons";

const RING_R = 36;
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

export function GalleryEntrance({
  onBack,
  unlocked,
  total,
}: {
  onBack: () => void;
  unlocked: number;
  total: number;
}) {
  return (
    <header className={tr.galleryEntrance}>
      <div className={tr.galleryNeonRails} aria-hidden />
      <div className={tr.galleryEntranceScan} aria-hidden />
      <div className={tr.galleryEntranceTop}>
        <button type="button" className={tr.galleryBack} onClick={onBack} aria-label="Back to Me">
          <ChevronLeft size={20} strokeWidth={2.25} />
        </button>
        <div className={tr.gallerySign}>
          <div className={tr.galleryEyebrow}>Neon · Hall of fame</div>
          <h1 className={tr.galleryTitle}>Trophy room</h1>
        </div>
      </div>
      <p className={tr.gallerySub}>
        {unlocked > 0
          ? `${unlocked} of ${total} trophies under the lights. Walk the wings — every unlock gets a pedestal.`
          : "Lights are warming up. Train, check in, and the first trophies will take the stage."}
      </p>
    </header>
  );
}

export function TrophyCelebrationHero({ pick }: { pick: CelebrationPick }) {
  if (!pick) return null;

  if (pick.mode === "recent" || pick.mode === "highest") {
    const v = iconGradientTier(pick.row);
    const isRecent = pick.mode === "recent";
    const date = isRecent ? pick.unlockDate : pick.row.lastUnlockedAt;
    return (
      <div
        className={tr.pedestal}
        style={
          {
            ["--icon-soft" as string]: "var(--gold-soft)",
            ["--icon-glow" as string]: "var(--gold-glow)",
          } as React.CSSProperties
        }
      >
        <div className={tr.pedestalBeam} aria-hidden />
        <div className={cn(tr.pedestalPlinth, celebrationIconClass(v))}>
          <TrophyAchievementIcon
            template={pick.row.raw.template}
            className={cn(tr.trophyIconHero, tr.trophyIconSvg)}
          />
        </div>
        <div className={tr.pedestalBase} aria-hidden />
        <div className={tr.pedestalMeta}>
          <div className={tr.pedestalEyebrow} style={{ color: "var(--gold)" }}>
            {isRecent ? "On the pedestal" : "Highest tier lit"}
          </div>
          <div className={tr.pedestalTitle}>{pick.row.name}</div>
          <div className={tr.pedestalRow}>
            <TierPill row={pick.row} context="celebration" />
            <RarityTag rarity={pick.row.rarity} />
          </div>
          {date ? (
            <div className={tr.pedestalDate}>
              {isRecent ? "Unlocked" : "Reached"} {formatShortDate(date)}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const row = pick.row;
  const p = row.raw;
  const pct = Math.round(progressPercentForBar(p));
  const nextLabel = p.nextTier?.label || "—";
  const goal = p.nextTier?.threshold ?? 0;
  const unit = unitLabelForTemplate(p.template);
  const toGo = goal > p.currentValue ? Math.max(0, goal - p.currentValue) : 0;

  return (
    <div
      className={cn(tr.pedestal, tr.pedestalCyan)}
      style={
        {
          ["--icon-soft" as string]: "var(--bronze-soft)",
          ["--icon-glow" as string]: "var(--bronze-glow)",
        } as React.CSSProperties
      }
    >
      <div className={tr.pedestalBeam} aria-hidden />
      <div className={cn(tr.pedestalPlinth, tr.pedestalPlinthSm, tr.trophyIconBronze)}>
        <TrophyAchievementIcon
          template={p.template}
          className={cn(tr.trophyIconHero, tr.trophyIconSvg)}
        />
      </div>
      <div className={tr.pedestalBase} aria-hidden />
      <div className={tr.pedestalMeta}>
        <div className={tr.pedestalEyebrow} style={{ color: "var(--fc-group-c)" }}>
          Warming under the beam
        </div>
        <div className={tr.pedestalTitle}>
          {row.name} · {nextLabel}
        </div>
        <div className={tr.pedestalProgress}>
          <div className={tr.pedestalBarTrack}>
            <div className={tr.pedestalBarFill} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className={tr.pedestalBarMeta}>
            <span>
              {p.currentValue} / {goal} {unit}
              {toGo > 0 ? ` · ${toGo.toLocaleString()} to go` : ""}
            </span>
            <span className={tr.pedestalPct}>{pct}%</span>
          </div>
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
    <div className={tr.collection}>
      <div className={tr.collectionGlowGold} aria-hidden />
      <div className={tr.collectionGlowCyan} aria-hidden />
      <div className={tr.collectionTop}>
        <div className={tr.ringWrap}>
          <svg className={tr.ringSvg} width={88} height={88} viewBox="0 0 88 88" aria-hidden>
            <defs>
              <linearGradient id="trophyProgressGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--gold)" />
                <stop offset="100%" stopColor="var(--fc-group-c)" />
              </linearGradient>
            </defs>
            <g transform="translate(44 44) rotate(-90)">
              <circle
                r={RING_R}
                fill="none"
                stroke="color-mix(in srgb, var(--gold) 18%, var(--ps-line))"
                strokeWidth={7}
              />
              <circle
                r={RING_R}
                fill="none"
                stroke="url(#trophyProgressGrad)"
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={dashOffset}
              />
            </g>
          </svg>
          <div className={tr.ringCenter}>
            <span className={tr.ringPct}>{pct}</span>
            <span className={tr.ringLbl}>lit</span>
          </div>
        </div>
        <div className={tr.collectionCopy}>
          <span className={tr.collectionEyebrow}>Collection power</span>
          <span className={tr.collectionHeadline}>
            {unlocked} of {total} under glass
          </span>
          <span className={tr.collectionSub}>
            {inProgress} warming up · {locked} still in the vault
          </span>
        </div>
      </div>
      <div className={tr.stackBar}>
        <div
          className={tr.stackSeg}
          style={{
            width: `${uPct}%`,
            background: "linear-gradient(90deg, var(--gold), var(--fc-group-c))",
            boxShadow: "0 0 10px color-mix(in srgb, var(--gold) 45%, transparent)",
          }}
        />
        <div
          className={tr.stackSeg}
          style={{
            width: `${iPct}%`,
            background: "linear-gradient(90deg, var(--fc-accent), var(--fc-group-c))",
            boxShadow: "0 0 8px color-mix(in srgb, var(--fc-group-c) 50%, transparent)",
          }}
        />
        <div
          className={tr.stackSeg}
          style={{ width: `${lPct}%`, background: "rgba(255,255,255,0.04)" }}
        />
      </div>
      <div className={tr.legendGrid}>
        <div className={cn(tr.legendTile, tr.legendUnlocked)}>
          <span className={tr.legendNum} style={{ color: "var(--gold)" }}>
            {unlocked}
          </span>
          <span className={tr.legendLbl}>Lit</span>
        </div>
        <div className={cn(tr.legendTile, tr.legendProgress)}>
          <span className={tr.legendNum} style={{ color: "var(--fc-group-c)" }}>
            {inProgress}
          </span>
          <span className={tr.legendLbl}>Warming</span>
        </div>
        <div className={cn(tr.legendTile, tr.legendLocked)}>
          <span className={tr.legendNum} style={{ color: "var(--ps-t3)" }}>
            {locked}
          </span>
          <span className={tr.legendLbl}>Vault</span>
        </div>
      </div>
    </div>
  );
}

export function TrophyWingFilter({
  value,
  onChange,
  total,
  unlocked,
  inProgress,
  locked,
}: {
  value: FilterStatus;
  onChange: (v: FilterStatus) => void;
  total: number;
  unlocked: number;
  inProgress: number;
  locked: number;
}) {
  const wings: {
    id: FilterStatus;
    label: string;
    count: number;
    activeCls?: string;
  }[] = [
    { id: "all", label: "All", count: total, activeCls: tr.wingBtnActive },
    { id: "unlocked", label: "Lit", count: unlocked, activeCls: tr.wingBtnActiveLime },
    { id: "progress", label: "Warm", count: inProgress, activeCls: tr.wingBtnActiveCyan },
    { id: "locked", label: "Vault", count: locked, activeCls: tr.wingBtnActive },
  ];

  return (
    <div className={tr.wings} role="tablist" aria-label="Filter trophy wings">
      {wings.map((w) => {
        const active = value === w.id;
        return (
          <button
            key={w.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(tr.wingBtn, active && w.activeCls)}
            onClick={() => onChange(w.id)}
          >
            <span className={tr.wingCount}>{w.count}</span>
            <span className={tr.wingLabel}>{w.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TrophyShowcaseShelf({
  rows,
  title = "Spotlight shelf",
}: {
  rows: TrophyRow[];
  title?: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div className={tr.shelf}>
      <div className={tr.shelfHead}>
        <span className={tr.shelfEyebrow}>{title}</span>
        <span className={tr.shelfLine} />
        <span className={tr.shelfCount}>{rows.length}</span>
      </div>
      <div className={tr.shelfFloor}>
        <div className={tr.shelfTrack}>
          {rows.slice(0, 12).map((row) => {
            const mastered = isFullyUnlocked(row) && row.raw.template.is_tiered;
            const v = iconGradientTier(row);
            const iconCls = celebrationIconClass(v);
            return (
              <div
                key={row.id}
                className={cn(tr.shelfCard, mastered && tr.shelfCardMastered)}
              >
                <div className={cn(tr.shelfIcon, iconCls)}>
                  <TrophyAchievementIcon
                    template={row.raw.template}
                    className={tr.trophyIconSvg}
                  />
                </div>
                <div className={tr.shelfName}>{row.name}</div>
                {row.lastUnlockedAt ? (
                  <div className={tr.shelfDate}>{formatShortDate(row.lastUnlockedAt)}</div>
                ) : null}
              </div>
            );
          })}
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
  accent: "action" | "cyan" | "muted" | "gold";
  count: number;
  unlockedFilterLabel?: boolean;
}) {
  const accentCls =
    accent === "action"
      ? tr.eyebrowLime
      : accent === "cyan"
        ? tr.eyebrowCyan
        : accent === "gold"
          ? tr.eyebrowGold
          : tr.eyebrowMuted;
  const label =
    unlockedFilterLabel && eyebrow === "Recently unlocked" ? "All unlocked" : eyebrow;
  return (
    <div className={tr.sectionHead}>
      <span className={cn(tr.sectionEyebrow, accentCls)}>{label}</span>
      <span className={tr.sectionLine} />
      <span className={tr.sectionCount}>{count}</span>
    </div>
  );
}
