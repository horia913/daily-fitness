"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface MetricGaugeProps {
  /** Current value (0-100 for percentage, or raw number) */
  value: number;
  /** Maximum value for calculating percentage. If not provided, value is treated as a percentage (0-100). */
  max?: number;
  /** Text displayed inside the ring */
  displayValue?: string;
  /** Small label below the value */
  label: string;
  /** Size of the gauge in px */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
  /** Color of the filled arc. Can be a CSS variable or hex. */
  color?: string;
  /** Optional gradient: [startColor, endColor] */
  gradient?: [string, string];
  /** Optional suffix for the display value (e.g., "%", "kg") */
  suffix?: string;
  /** Whether to animate on mount */
  animate?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Optional click handler */
  onClick?: () => void;
  className?: string;
}

export function MetricGauge({
  value,
  max,
  displayValue,
  label,
  size = 120,
  strokeWidth = 6,
  color = "var(--fc-accent-cyan)",
  gradient,
  suffix = "",
  animate = true,
  animationDuration = 1200,
  onClick,
  className = "",
}: MetricGaugeProps) {
  const { performanceSettings } = useTheme();
  const [animatedOffset, setAnimatedOffset] = useState<number | null>(null);
  const hasAnimated = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate percentage
  const percentage = max ? Math.min((value / max) * 100, 100) : Math.min(value, 100);

  // SVG dimensions
  const center = size / 2;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (percentage / 100) * circumference;

  // Generate unique ID for gradient
  const gradientId = `gauge-gradient-${label.replace(/\s+/g, '-').toLowerCase()}`;

  // Format display value
  const formattedValue = displayValue ?? (max ? `${Math.round(value)}` : `${Math.round(percentage)}`);

  // Animate on intersection
  useEffect(() => {
    if (!animate || !performanceSettings.smoothAnimations || hasAnimated.current) {
      setAnimatedOffset(targetOffset);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            // Start from full circumference (empty)
            setAnimatedOffset(circumference);
            // Animate to target after a small delay for the CSS transition to kick in
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setAnimatedOffset(targetOffset);
              });
            });
          }
        });
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [animate, circumference, targetOffset, performanceSettings.smoothAnimations]);

  // Update target when value changes after initial animation
  useEffect(() => {
    if (hasAnimated.current) {
      setAnimatedOffset(targetOffset);
    }
  }, [targetOffset]);

  const currentOffset = animatedOffset ?? circumference;

  return (
    <div
      ref={containerRef}
      className={`fc-gauge-container ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      style={{ width: size }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="fc-gauge-ring"
        >
          {/* Gradient definition */}
          {gradient && (
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradient[0]} />
                <stop offset="100%" stopColor={gradient[1]} />
              </linearGradient>
            </defs>
          )}

          {/* Track (background ring) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            className="fc-gauge-track"
            strokeWidth={strokeWidth}
          />

          {/* Filled arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            className="fc-gauge-fill"
            stroke={gradient ? `url(#${gradientId})` : color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={currentOffset}
            style={{
              transition: animate
                ? `stroke-dashoffset ${animationDuration}ms cubic-bezier(0.65, 0, 0.35, 1)`
                : "none",
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="fc-gauge-value" style={{ fontSize: size < 100 ? '20px' : '28px' }}>
            {formattedValue}
            {suffix && <span className="text-[0.5em] font-semibold fc-text-dim">{suffix}</span>}
          </span>
        </div>
      </div>

      {/* Label */}
      <span className="fc-gauge-label">{label}</span>
    </div>
  );
}

export default MetricGauge;
