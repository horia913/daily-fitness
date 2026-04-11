"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getBiggestWinForWeek, type BiggestWin } from "@/lib/biggestWinService";
import "./BiggestWinCard.css";

const PR_HREF = "/client/progress/personal-records";

function cn(...parts: (string | undefined | false)[]): string {
  return parts.filter(Boolean).join(" ");
}

export interface BiggestWinCardProps {
  clientId?: string | null;
  mockWin?: BiggestWin | null;
  mockLoading?: boolean;
  className?: string;
}

export function BiggestWinCard({
  clientId = null,
  mockWin,
  mockLoading = false,
  className,
}: BiggestWinCardProps) {
  const isMock = mockWin !== undefined || mockLoading;

  const [loading, setLoading] = useState(!isMock);
  const [win, setWin] = useState<BiggestWin | null>(null);

  useEffect(() => {
    if (isMock) return;
    if (!clientId) {
      setLoading(false);
      setWin(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getBiggestWinForWeek(clientId, supabase);
        if (!cancelled) setWin(data);
      } catch {
        if (!cancelled) setWin(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, isMock]);

  const wrapClass = cn(
    "mt-4 mb-4 w-full min-w-0 max-w-sm mx-auto",
    className,
  );

  if (!isMock && !clientId) return null;

  const showLoading = isMock ? mockLoading : loading;
  const resolvedWin: BiggestWin | null | undefined = isMock ? mockWin ?? null : win;

  if (showLoading) {
    return (
      <div
        className={cn(
          wrapClass,
          "rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 min-h-[5.5rem]",
        )}
        aria-hidden
      />
    );
  }

  if (resolvedWin === null) {
    return (
      <div className={wrapClass}>
        <div
          className="rounded-xl border border-solid border-white/10 px-4 py-4 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
            boxShadow: "0 0 16px rgba(0,0,0,0.2)",
          }}
        >
          <div className="flex items-start gap-2 text-left">
            <span className="mt-0.5 text-xl shrink-0 leading-none" aria-hidden>
              🎯
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Your first win awaits
              </p>
              <p className="mt-2 text-sm text-zinc-400 leading-snug">
                Train today to log your first improvement of the week
              </p>
              <button
                type="button"
                className="mt-4 w-full rounded-lg bg-cyan-600/90 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
                onClick={() => {
                  window.location.href = "/client/train";
                }}
              >
                Start Training
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const w = resolvedWin;

  if (w.hasImprovement) {
    const pct =
      w.improvementPercent != null &&
      Number.isFinite(w.improvementPercent) &&
      w.improvementPercent > 0
        ? w.improvementPercent
        : null;

    return (
      <div className={wrapClass}>
        <button
          type="button"
          onClick={() => {
            window.location.href = PR_HREF;
          }}
          className={cn(
            "bwiBreatheAmber w-full rounded-xl border border-solid px-4 py-4 text-left",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
          )}
          style={{
            borderColor: "rgba(245,158,11,0.2)",
          }}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-xl shrink-0 leading-none" aria-hidden>
              🏆
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Biggest win this week
              </p>
              <p className="mt-2 text-lg font-semibold text-white break-words hyphens-auto">
                {w.exerciseName}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums break-words leading-snug">
                <span className="text-amber-300">{w.improvementValue}</span>
                {pct != null && (
                  <>
                    <span className="text-amber-300/50 font-bold">{"  ·  "}</span>
                    <span className="text-emerald-400">+{pct.toFixed(1)}%</span>
                  </>
                )}
              </p>
              {w.previousBest && w.previousBest !== "—" ? (
                <p className="mt-2 text-sm text-gray-400 break-words">
                  {w.previousBest} → {w.currentBest}
                </p>
              ) : (
                <p className="mt-2 text-sm text-gray-400 break-words">{w.currentBest}</p>
              )}
            </div>
          </div>
        </button>
      </div>
    );
  }

  const consistencyHeading = w.consistencyLabel ?? "Heaviest set this week";

  return (
    <div className={wrapClass}>
      <button
        type="button"
        onClick={() => {
          window.location.href = PR_HREF;
        }}
        className={cn(
          "bwiBreatheCyan w-full rounded-xl border border-solid px-4 py-4 text-left",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
        )}
        style={{
          borderColor: "rgba(6,182,212,0.22)",
        }}
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-xl shrink-0 leading-none" aria-hidden>
            💪
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400/90">
              {consistencyHeading}
            </p>
            <p className="mt-2 text-lg font-semibold text-white break-words hyphens-auto">
              {w.exerciseName}
            </p>
            <p className="mt-1 text-2xl font-bold text-cyan-300 tabular-nums break-words">
              {w.consistencySummary || w.currentBest}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
