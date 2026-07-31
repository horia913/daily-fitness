"use client";

import React from "react";

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedBackground({
  children,
  className = "",
}: AnimatedBackgroundProps) {
  return (
    <div
      className={`relative min-h-screen w-full min-w-0 ${className}`}
      style={{ background: "var(--fc-bg-deep)" }}
    >
      <div className="relative z-[1] w-full min-w-0">
        {children}
      </div>
    </div>
  );
}

export default AnimatedBackground;
