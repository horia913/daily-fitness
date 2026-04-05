"use client";

import React, { useLayoutEffect, useState, useId, useMemo, useCallback } from "react";
import { ATHLETE_TIERS, AthleteScoreTier } from "@/types/athleteScore";
import {
  BeastRingMotionLayer,
  type BeastRingMotionKind,
} from "@/components/client-ui/BeastRingMotionLayer";

const SIZE_PRESET_PX = { sm: 48, md: 200, lg: 240 } as const;
export type AthleteScoreRingSizePreset = keyof typeof SIZE_PRESET_PX;

const TIER_STROKE_BASE: Record<string, number> = {
  benched: 10,
  slipping: 12,
  showing_up: 14,
  locked_in: 16,
  beast_mode: 16,
};

function strokeWidthForTier(tierKey: string, diameter: number): number {
  const base = TIER_STROKE_BASE[tierKey] ?? 10;
  return Math.max(3, Math.round((base * diameter) / 200));
}

function tierWrapClass(tier: string): string {
  if (tier === "beast_mode") return "as-ring-tier-beast";
  if (tier === "locked_in") return "as-ring-tier-locked";
  if (tier === "showing_up") return "as-ring-tier-showing";
  if (tier === "slipping") return "as-ring-tier-slipping";
  return "as-ring-tier-benched";
}

function tipPosition(
  center: number,
  r: number,
  percentage: number,
): { x: number; y: number } {
  const a = -Math.PI / 2 + (2 * Math.PI * percentage) / 100;
  return {
    x: center + r * Math.cos(a),
    y: center + r * Math.sin(a),
  };
}

interface AthleteScoreRingProps {
  score: number | null;
  tier: string | null;
  animated?: boolean;
  size?: number;
  sizePreset?: AthleteScoreRingSizePreset;
  showTierBelow?: boolean;
}

export function AthleteScoreRing({
  score,
  tier,
  animated = true,
  size: sizeProp,
  sizePreset = "md",
  showTierBelow = false,
}: AthleteScoreRingProps) {
  const uid = useId().replace(/:/g, "");
  const size = sizeProp ?? SIZE_PRESET_PX[sizePreset];

  const tierInfo: AthleteScoreTier | undefined = useMemo(
    () => (tier ? ATHLETE_TIERS.find((t) => t.key === tier) : undefined),
    [tier],
  );

  const [fillActive, setFillActive] = useState(!animated);
  const [beastMotionKind, setBeastMotionKind] = useState<BeastRingMotionKind>("none");
  const onBeastMotionKind = useCallback((k: BeastRingMotionKind) => setBeastMotionKind(k), []);

  useLayoutEffect(() => {
    if (!animated) {
      setFillActive(true);
      return;
    }
    const id = requestAnimationFrame(() => setFillActive(true));
    return () => cancelAnimationFrame(id);
  }, [animated, score, tier]);

  useLayoutEffect(() => {
    if (tier !== "beast_mode" || !animated) setBeastMotionKind("none");
  }, [tier, animated]);

  const percentage = score !== null ? Math.min(100, Math.max(0, score)) : 0;
  const tierKey = tier ?? "benched";
  const strokeW = strokeWidthForTier(tierKey, size);
  const center = size / 2;
  const radius = Math.max(4, (size - strokeW * 2) / 2);
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (percentage / 100) * circumference;
  const dashOffset = fillActive ? targetOffset : circumference;
  const scaleU = size / 200;

  const gid = `asg-${uid}`;
  const gid2 = `asg2-${uid}`;
  const gid3 = `asg3-${uid}`;
  const gidBeast = `asg-beast-${uid}`;
  const gidLockedHot = `asg-lk-hot-${uid}`;
  const gidBeastTip = `asg-b-tip-${uid}`;
  const gidShowFlow = `asg-flow-${uid}`;
  const gidBeastAura = `asg-beast-aura-${uid}`;

  if (score === null || !tierInfo) {
    return (
      <div
        className="as-ring-root relative flex flex-col items-center justify-center mx-auto max-w-full"
        style={{ width: size, height: size, minWidth: 0 }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="as-ring-gpu transform -rotate-90"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--fc-surface-sunken)"
            strokeWidth={strokeWidthForTier("benched", size)}
          />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center"
          style={{ width: size, height: size }}
        >
          <p className="text-xs sm:text-sm fc-text-dim leading-snug">
            Complete your first workout to unlock your Athlete Score
          </p>
        </div>
      </div>
    );
  }

  const wrapClass = tierWrapClass(tierKey);
  const trackStroke =
    tierKey === "benched"
      ? "#374151"
      : tierKey === "slipping"
        ? "rgba(245, 158, 11, 0.25)"
        : "var(--fc-surface-sunken)";

  const scoreTextClass =
    tierKey === "benched"
      ? "text-gray-500"
      : tierKey === "slipping"
        ? "text-amber-600 dark:text-amber-400"
        : tierKey === "showing_up"
          ? "text-sky-800 dark:text-white"
          : tierKey === "locked_in"
            ? "text-orange-950 dark:text-white"
            : "text-white font-bold";

  const labelClass =
    tierKey === "benched"
      ? "text-gray-500"
      : tierKey === "slipping"
        ? "text-amber-700 dark:text-amber-400"
        : tierKey === "beast_mode"
          ? "bg-gradient-to-r from-sky-400 via-cyan-200 to-lime-300 bg-clip-text font-semibold text-transparent"
          : tierKey === "locked_in"
            ? "text-orange-900/90 dark:text-orange-100"
            : "fc-text-dim";

  const lockedOuterR = radius + strokeW / 2 + 3 + 2;
  const lockedHotDash = circumference * 0.1;
  const lockedHotGap = circumference - lockedHotDash;

  const beastInnerR = Math.max(2, radius - strokeW / 2 - 3 - 1.5);
  const beastOuterR = radius + strokeW / 2 + 3 + 1.5;
  const beastEnergyDash = `${15 * scaleU} ${3 * scaleU} ${8 * scaleU} ${3 * scaleU}`;
  const beastAuraR = radius + strokeW + size * 0.14;

  const tip = tipPosition(center, radius, percentage);

  const progressClass = `as-ring-progress-arc as-ring-gpu ${animated ? "as-ring-fill-transition" : ""}`;

  return (
    <div
      className={`as-ring-root relative flex flex-col items-center mx-auto max-w-full ${wrapClass} ${
        tierKey === "beast_mode" ? "overflow-visible" : ""
      } ${
        tierKey === "beast_mode" && beastMotionKind !== "none"
          ? "as-ring-beast--with-motion-bg"
          : ""
      }`}
      style={{ width: size, height: size, minWidth: 0 }}
    >
      {tierKey === "showing_up" && <div className="as-ring-halo" aria-hidden />}
      {tierKey === "locked_in" && <div className="as-ring-halo" aria-hidden />}
      {tierKey === "beast_mode" && animated && (
        <BeastRingMotionLayer size={size} onMotionKindChange={onBeastMotionKind} />
      )}

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        overflow="visible"
        className={`as-ring-gpu relative z-[2] transform -rotate-90 overflow-visible`}
      >
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tierInfo.color} />
            <stop offset="100%" stopColor={tierInfo.colorEnd} />
          </linearGradient>
          <linearGradient id={gid2} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>
          <linearGradient id={gid3} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id={gidBeast} x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#042F2E" />
            <stop offset="13%" stopColor="#155E75" />
            <stop offset="27%" stopColor="#0369A1" />
            <stop offset="41%" stopColor="#06B6D4" />
            <stop offset="54%" stopColor="#5EEAD4" />
            <stop offset="66%" stopColor="#CCFBF1" />
            <stop offset="76%" stopColor="#FFFFFF" />
            <stop offset="86%" stopColor="#BEF264" />
            <stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>
          <linearGradient id={gidLockedHot} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FDBA74" />
            <stop offset="100%" stopColor="#FEF3C7" />
          </linearGradient>
          <radialGradient id={gidBeastTip} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="28%" stopColor="#E0F2FE" stopOpacity="0.98" />
            <stop offset="52%" stopColor="#38BDF8" stopOpacity="0.9" />
            <stop offset="72%" stopColor="#34D399" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0369A1" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={gidShowFlow} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.2" />
          </linearGradient>
          <radialGradient
            id={gidBeastAura}
            cx={center}
            cy={center}
            r={beastAuraR}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(4, 47, 46, 0.28)" />
            <stop offset="32%" stopColor="rgba(3, 105, 161, 0.16)" />
            <stop offset="58%" stopColor="rgba(34, 211, 238, 0.11)" />
            <stop offset="82%" stopColor="rgba(190, 242, 100, 0.1)" />
            <stop offset="100%" stopColor="rgba(224, 242, 254, 0)" />
          </radialGradient>
        </defs>

        {tierKey === "beast_mode" && (
          <circle
            cx={center}
            cy={center}
            r={beastAuraR}
            fill={`url(#${gidBeastAura})`}
            className="as-ring-beast-aura"
            aria-hidden
          />
        )}

        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackStroke}
          strokeWidth={strokeW}
        />

        {tierKey === "showing_up" && (
          <g className="as-ring-showing-flow" aria-hidden>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={`url(#${gidShowFlow})`}
              strokeWidth={Math.max(2, Math.round(2.5 * scaleU))}
              strokeLinecap="round"
              strokeDasharray={`${10 * scaleU} ${14 * scaleU}`}
            />
          </g>
        )}

        {tierKey === "locked_in" && (
          <>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={`url(#${gid3})`}
              strokeWidth={strokeW}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className={`${progressClass} as-ring-locked-flicker-ring`}
            />
            <g className="as-ring-locked-hotspot" aria-hidden>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={`url(#${gidLockedHot})`}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeDasharray={`${lockedHotDash} ${lockedHotGap}`}
              />
            </g>
            <g className="as-ring-locked-outer-orbit" aria-hidden>
              <circle
                cx={center}
                cy={center}
                r={lockedOuterR}
                fill="none"
                stroke={`url(#${gid3})`}
                strokeWidth={Math.max(2, Math.round(4 * scaleU))}
                strokeOpacity={0.8}
              />
            </g>
            <g transform={`translate(${tip.x}, ${tip.y})`}>
              <circle
                r={Math.max(3, 5 * scaleU)}
                fill="#FBBF24"
                className="as-ring-locked-ember"
              />
            </g>
          </>
        )}

        {tierKey === "beast_mode" && (
          <>
            <g className="as-ring-beast-inner-orbit" aria-hidden>
              <g className="as-ring-beast-heat-pulse as-ring-beast-heat-pulse--inner">
                <circle
                  cx={center}
                  cy={center}
                  r={beastInnerR}
                  fill="none"
                  stroke={`url(#${gidBeast})`}
                  strokeWidth={Math.max(2, Math.round(3 * scaleU))}
                  strokeOpacity={0.75}
                />
              </g>
            </g>
            <g className="as-ring-beast-fire-echo" aria-hidden>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={`url(#${gidBeast})`}
                strokeWidth={strokeW + Math.round(8 * scaleU)}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                strokeOpacity={0.38}
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={`url(#${gidBeast})`}
                strokeWidth={strokeW + Math.round(4 * scaleU)}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                strokeOpacity={0.52}
              />
            </g>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={`url(#${gidBeast})`}
              strokeWidth={strokeW}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className={progressClass}
            />
            <g className="as-ring-beast-energy" aria-hidden>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={`url(#${gidBeast})`}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeDasharray={beastEnergyDash}
              />
            </g>
            <g className="as-ring-beast-outer-orbit" aria-hidden>
              <g className="as-ring-beast-heat-pulse as-ring-beast-heat-pulse--outer">
                <circle
                  cx={center}
                  cy={center}
                  r={beastOuterR}
                  fill="none"
                  stroke={`url(#${gidBeast})`}
                  strokeWidth={Math.max(2, Math.round(3 * scaleU))}
                  strokeOpacity={0.55}
                />
              </g>
            </g>
            <g transform={`translate(${tip.x}, ${tip.y})`}>
              <circle
                r={Math.max(4, 7 * scaleU)}
                fill={`url(#${gidBeastTip})`}
                className="as-ring-beast-tip"
              />
            </g>
          </>
        )}

        {tierKey !== "locked_in" && tierKey !== "beast_mode" && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={
              tierKey === "benched"
                ? "#374151"
                : tierKey === "slipping"
                  ? `url(#${gid})`
                  : tierKey === "showing_up"
                    ? `url(#${gid2})`
                    : `url(#${gid})`
            }
            strokeWidth={strokeW}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap={tierKey === "benched" ? "butt" : "round"}
            className={progressClass}
          />
        )}
      </svg>

      <div
        className="absolute inset-0 z-[3] flex flex-col items-center justify-center pointer-events-none"
        style={{ width: size, height: size }}
      >
        <div className="flex flex-col items-center justify-center">
          <span
            className={`tabular-nums leading-none ${
              tierKey === "beast_mode"
                ? "as-ring-beast-score text-3xl sm:text-5xl font-bold text-white"
                : `font-extrabold ${scoreTextClass}`
            }`}
            style={{
              fontSize:
                tierKey === "beast_mode"
                  ? undefined
                  : tierKey === "locked_in"
                    ? "clamp(1.35rem, 10vw, 2.25rem)"
                    : size < 80
                      ? "0.75rem"
                      : "clamp(1.25rem, 8vw, 2.5rem)",
            }}
          >
            {Math.round(percentage)}
          </span>
          {!showTierBelow && (
            <>
              <span
                className={`mt-0.5 font-semibold leading-tight ${labelClass}`}
                style={{ fontSize: size < 80 ? "0.45rem" : "clamp(0.65rem, 2.8vw, 0.95rem)" }}
              >
                {tierInfo.label}
              </span>
              <span
                className={`leading-none ${tierKey === "beast_mode" ? "text-lg" : ""}`}
                style={{
                  fontSize:
                    tierKey === "beast_mode"
                      ? undefined
                      : size < 80
                        ? "0.55rem"
                        : "clamp(0.85rem, 3.5vw, 1.5rem)",
                }}
              >
                {tierInfo.emoji}
              </span>
            </>
          )}
          {showTierBelow && (
            <span style={{ fontSize: size < 80 ? "0.5rem" : "1rem" }}>{tierInfo.emoji}</span>
          )}
        </div>
      </div>

      {showTierBelow && (
        <p className="mt-2 text-sm font-semibold fc-text-dim text-center">{tierInfo.label}</p>
      )}
    </div>
  );
}
