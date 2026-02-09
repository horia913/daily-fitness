"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface AnimatedEntryProps {
  children: React.ReactNode;
  /** Delay in ms before animation starts */
  delay?: number;
  /** Animation type */
  animation?: "fade-up" | "scale-in" | "fade-in";
  /** Duration in ms */
  duration?: number;
  className?: string;
}

export function AnimatedEntry({
  children,
  delay = 0,
  animation = "fade-up",
  duration = 500,
  className = "",
}: AnimatedEntryProps) {
  const { performanceSettings } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!performanceSettings.smoothAnimations) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay, performanceSettings.smoothAnimations]);

  const animationClass = {
    "fade-up": "fc-animate-in",
    "scale-in": "fc-animate-scale",
    "fade-in": "fc-animate-in",
  }[animation];

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? undefined : 0,
        animation: isVisible
          ? undefined
          : "none",
      }}
    >
      <div
        style={{
          animation: isVisible
            ? `${animationClass === "fc-animate-in" ? "fc-fade-up" : "fc-scale-in"} ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) both`
            : "none",
          opacity: isVisible ? undefined : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default AnimatedEntry;
