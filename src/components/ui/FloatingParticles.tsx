"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface FloatingParticlesProps {
  count?: number;
  color?: string;
  enabled?: boolean;
}

interface Particle {
  id: number;
  left: string;
  animationDuration: string;
  animationDelay: string;
  size: number;
}

export function FloatingParticles({
  count = 15,
  color,
  enabled = true,
}: FloatingParticlesProps) {
  const { performanceSettings } = useTheme();
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    // Generate particles only once
    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDuration: `${Math.random() * 20 + 20}s`, // 20-40s
        animationDelay: `${Math.random() * 10}s`, // 0-10s stagger
        size: Math.random() * 2 + 2, // 2-4px
      }));
    }
  }, [count]);

  // Don't render if disabled in performance settings or explicitly disabled
  if (!enabled || !performanceSettings.floatingParticles) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {particlesRef.current.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: particle.left,
            bottom: 0,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            borderRadius: "50%",
            background: color || "rgba(255, 255, 255, 0.4)",
            animation: `float ${particle.animationDuration} linear infinite`,
            animationDelay: particle.animationDelay,
          }}
        />
      ))}
    </div>
  );
}

export default FloatingParticles;
