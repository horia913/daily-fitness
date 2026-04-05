"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useRef, useState } from "react";

const Lottie = dynamic(() => import("lottie-react").then((m) => m.default), { ssr: false });

const BEAST_LOTTIE_PATH = "/animations/beast-ring.json";

export type BeastRingMotionKind = "none" | "lottie" | "canvas";

export interface BeastRingMotionLayerProps {
  size: number;
  /** Notified when Lottie or canvas is actively rendering (to tone down CSS duplicate glow). */
  onMotionKindChange?: (kind: BeastRingMotionKind) => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency ?? 4;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return cores <= 2 || Boolean(conn?.saveData);
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 640px)").matches;
}

/**
 * Rising heat particles along the ring when Lottie JSON is missing or invalid.
 */
function BeastHeatCanvas({
  size,
  radius,
  center,
}: {
  size: number;
  radius: number;
  center: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const PRISM_RGBA = [
      [4, 47, 46],
      [21, 94, 117],
      [3, 105, 161],
      [14, 165, 233],
      [6, 182, 212],
      [34, 211, 238],
      [94, 234, 212],
      [190, 242, 100],
      [52, 211, 153],
    ] as const;

    type P = { a: number; pr: number; op: number; rad: number; vy: number; ci: number };
    const n = isMobileViewport() ? 22 : 30;
    const particles: P[] = Array.from({ length: n }, () => ({
      a: Math.random() * Math.PI * 2,
      pr: radius + (Math.random() - 0.5) * 8,
      op: 0.15 + Math.random() * 0.55,
      rad: 2 + Math.random() * 3,
      vy: 0.35 + Math.random() * 0.55,
      ci: Math.floor(Math.random() * PRISM_RGBA.length),
    }));

    let raf = 0;
    let last = 0;
    const frameMs = isMobileViewport() ? 1000 / 30 : 1000 / 45;

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < frameMs) return;
      last = t;

      ctx.clearRect(0, 0, size, size);
      for (const p of particles) {
        p.pr += p.vy * 0.45;
        p.op -= 0.008;
        p.a += 0.012;
        if (p.op <= 0 || p.pr > radius + 36) {
          p.a = Math.random() * Math.PI * 2;
          p.pr = radius - 4 + Math.random() * 6;
          p.op = 0.2 + Math.random() * 0.5;
          p.rad = 2 + Math.random() * 3;
          p.vy = 0.35 + Math.random() * 0.55;
          p.ci = Math.floor(Math.random() * PRISM_RGBA.length);
        }
        const x = center + p.pr * Math.cos(p.a);
        const y = center + p.pr * Math.sin(p.a);
        const [cr, cg, cb] = PRISM_RGBA[p.ci];
        ctx.beginPath();
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${p.op})`;
        ctx.arc(x, y, p.rad, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, radius, center]);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2"
      width={size}
      height={size}
      aria-hidden
    />
  );
}

export function BeastRingMotionLayer({ size, onMotionKindChange }: BeastRingMotionLayerProps) {
  const [lottieData, setLottieData] = useState<object | null>(null);
  const [lottieFailed, setLottieFailed] = useState(false);
  const [skipMotion, setSkipMotion] = useState(false);

  const report = useCallback(
    (k: BeastRingMotionKind) => {
      onMotionKindChange?.(k);
    },
    [onMotionKindChange],
  );

  useEffect(() => {
    if (prefersReducedMotion() || isLowEndDevice()) {
      setSkipMotion(true);
      report("none");
      return;
    }
    let cancelled = false;
    fetch(BEAST_LOTTIE_PATH)
      .then((r) => {
        if (!r.ok) throw new Error("lottie fetch");
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (!json || typeof json !== "object" || !("v" in json)) throw new Error("invalid lottie");
        setLottieData(json);
        report("lottie");
      })
      .catch(() => {
        if (cancelled) return;
        setLottieFailed(true);
        report("canvas");
      });
    return () => {
      cancelled = true;
    };
  }, [report]);

  if (skipMotion) return null;

  if (lottieData) {
    const dim = size * 1.2;
    return (
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 opacity-[0.88]"
        style={{ width: dim, height: dim }}
        aria-hidden
      >
        <Lottie animationData={lottieData} loop className="h-full w-full" />
      </div>
    );
  }

  if (lottieFailed) {
    const strokeW = Math.max(3, Math.round((16 * size) / 200));
    const r = Math.max(4, (size - strokeW * 2) / 2);
    const c = size / 2;
    return <BeastHeatCanvas size={size} radius={r} center={c} />;
  }

  return null;
}
