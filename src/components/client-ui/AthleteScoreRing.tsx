"use client";

import React, { useEffect, useState, useRef } from "react";
import { ATHLETE_TIERS, AthleteScoreTier } from "@/types/athleteScore";

interface AthleteScoreRingProps {
  score: number | null; // null means no score yet
  tier: string | null;
  animated?: boolean;
  size?: number;
  strokeWidth?: number;
}

export function AthleteScoreRing({
  score,
  tier,
  animated = true,
  size = 240,
  strokeWidth = 14,
}: AthleteScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const hasAnimated = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get tier info
  const tierInfo: AthleteScoreTier | undefined = tier
    ? ATHLETE_TIERS.find((t) => t.key === tier)
    : undefined;

  // Calculate SVG dimensions
  const center = size / 2;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = score !== null ? Math.min(Math.max(score, 0), 100) : 0;
  const targetOffset = circumference - (percentage / 100) * circumference;

  // Generate unique gradient ID
  const gradientId = `athlete-score-gradient-${tier || "none"}`;

  // Animate score on mount
  useEffect(() => {
    if (!animated || hasAnimated.current || score === null) {
      setAnimatedScore(percentage);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            // Start from 0
            setAnimatedScore(0);
            // Animate to target over ~1 second
            const duration = 1000;
            const startTime = Date.now();
            const startValue = 0;

            const animate = () => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(elapsed / duration, 1);
              // Easing function (ease-out)
              const eased = 1 - Math.pow(1 - progress, 3);
              const currentValue = startValue + (percentage - startValue) * eased;
              setAnimatedScore(currentValue);

              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                setAnimatedScore(percentage);
              }
            };

            requestAnimationFrame(animate);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [animated, percentage, score]);

  // Update when score changes after initial animation
  useEffect(() => {
    if (hasAnimated.current && score !== null) {
      setAnimatedScore(percentage);
    }
  }, [percentage, score]);

  const currentOffset = circumference - (animatedScore / 100) * circumference;
  const hasGlow = tier === "beast_mode" || tier === "locked_in";

  // Empty state (no score)
  if (score === null || !tierInfo) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Track (background ring) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--fc-surface-sunken)"
            strokeWidth={strokeWidth}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
          <p className="text-sm fc-text-dim text-center px-4">
            Complete your first workout to unlock your Athlete Score
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <defs>
          {/* Gradient for the ring */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tierInfo.color} />
            <stop offset="100%" stopColor={tierInfo.colorEnd} />
          </linearGradient>
        </defs>

        {/* Track (background ring) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--fc-surface-sunken)"
          strokeWidth={strokeWidth}
        />

        {/* Filled arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={currentOffset}
          strokeLinecap="round"
          className={hasGlow ? (tier === "beast_mode" ? "athlete-score-glow-ember" : "athlete-score-glow-warm") : ""}
          style={{
            transition: animated && hasAnimated.current
              ? "stroke-dashoffset 0.3s ease-out"
              : "none",
          }}
        />
      </svg>

      {/* Center content */}
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span
          className="font-extrabold fc-text-primary"
          style={{ fontSize: "var(--fc-type-hero)", lineHeight: 1 }}
        >
          {Math.round(animatedScore)}
        </span>
        <span
          className="font-semibold fc-text-dim mt-1"
          style={{ fontSize: "var(--fc-type-body)", lineHeight: 1.2 }}
        >
          {tierInfo.label}
        </span>
        <span className="text-2xl mt-1" style={{ lineHeight: 1 }}>
          {tierInfo.emoji}
        </span>
      </div>

    </div>
  );
}
