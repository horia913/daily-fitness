"use client";

import React, { useEffect, useState } from "react";
import { AthleteScoreRing } from "@/components/client-ui";
import {
  ScoreBreakdown,
  type ScoreBreakdownComponent,
} from "@/components/client-ui/ScoreBreakdown";
import ResponsiveModal from "@/components/ui/ResponsiveModal";
import { AthleteScoreExplainerModal } from "@/components/coach/AthleteScoreExplainerModal";
import type { AthleteScore } from "@/types/athleteScore";
import { ATHLETE_TIERS } from "@/types/athleteScore";
import type { AthleteScoreChipState } from "@/lib/clientDashboardPageData";
import { tierForAthleteScoreRow } from "@/lib/clientDashboardPageData";
import {
  buildAthleteScoreBreakdownComponents,
  fetchAthleteScoreWeekTrends,
  type AthleteScoreWeekTrends,
} from "@/lib/athleteScoreBreakdown";
import { formatAthleteScoreWindowRange } from "@/lib/coachAthleteScoreUi";

const DEFAULT_INLINE_RING_SIZE = 90;
const MODAL_RING_SIZE = 160;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export interface TrainAthleteScoreRingProps {
  userId: string | null;
  athleteScore: AthleteScore | null;
  scoreError: string | null;
  chipState?: AthleteScoreChipState;
  /** Header ring diameter (default 90; Train page uses 56). */
  size?: number;
}

export function TrainAthleteScoreRing({
  userId,
  athleteScore,
  scoreError,
  chipState = "default",
  size = DEFAULT_INLINE_RING_SIZE,
}: TrainAthleteScoreRingProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [trends, setTrends] = useState<AthleteScoreWeekTrends | undefined>(undefined);
  const reducedMotion = usePrefersReducedMotion();

  const hasScore = athleteScore != null && !scoreError;
  const paused = chipState === "paused";

  useEffect(() => {
    if (!userId || !hasScore) {
      setTrends(undefined);
      return;
    }
    let cancelled = false;
    fetchAthleteScoreWeekTrends(userId).then((t) => {
      if (!cancelled) setTrends(t);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, hasScore, athleteScore?.calculated_at]);

  const tierKey = hasScore ? tierForAthleteScoreRow(athleteScore) : null;
  const tierInfo = tierKey ? ATHLETE_TIERS.find((t) => t.key === tierKey) : null;
  const scoreValue = hasScore ? Math.round(athleteScore.score) : null;

  const breakdown: ScoreBreakdownComponent[] = hasScore
    ? buildAthleteScoreBreakdownComponents(athleteScore, trends)
    : [];

  const windowLabel =
    hasScore && athleteScore.window_start && athleteScore.window_end
      ? formatAthleteScoreWindowRange(athleteScore.window_start, athleteScore.window_end)
      : null;

  if (!hasScore) {
    return (
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
        aria-label={
          scoreError
            ? "Athlete score unavailable"
            : "Athlete score will appear once you start a program"
        }
      >
        <AthleteScoreRing
          placeholder
          score={null}
          tier={null}
          animated={false}
          size={size}
          scoreOnly={size <= 56}
        />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex shrink-0 items-center justify-center self-center border-0 bg-transparent p-0 leading-none rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-accent)]"
        style={{ width: size, height: size }}
        aria-label={`Athlete score ${scoreValue}, ${tierInfo?.label ?? "tier"}. Open breakdown.`}
      >
        <AthleteScoreRing
          score={athleteScore.score}
          tier={tierKey}
          paused={paused}
          animated={!reducedMotion}
          size={size}
          scoreOnly={size <= 56}
        />
      </button>

      <ResponsiveModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Athlete score"
        subtitle={windowLabel ?? "Rolling 14 days"}
        maxWidth="md"
        maxHeight="min(90vh, calc(100vh - 1.5rem))"
      >
        <div className="flex flex-col items-center">
          <AthleteScoreRing
            score={athleteScore.score}
            tier={tierKey}
            paused={paused}
            animated={!reducedMotion}
            size={MODAL_RING_SIZE}
          />
          <p
            className="mt-4 text-center text-2xl font-bold tabular-nums fc-text-primary"
            style={{ fontFamily: "var(--font-bricolage-grotesque, var(--font-body))" }}
          >
            {scoreValue}
            <span className="mx-2 font-normal fc-text-dim">·</span>
            <span style={{ color: tierInfo?.color }}>{tierInfo?.label}</span>
          </p>
          {paused ? (
            <p className="mt-1 text-xs text-amber-400/90">Program paused — score frozen</p>
          ) : null}
          {athleteScore.training_completion_score != null ? (
            <p className="mt-2 text-center text-xs fc-text-dim">
              Adherence {Math.round(athleteScore.training_completion_score)}
              {athleteScore.training_execution_score != null
                ? ` × execution quality (${Math.round(athleteScore.training_execution_score)}%)`
                : " · execution pending"}
            </p>
          ) : null}
          <div className="mt-6 w-full min-w-0">
            <ScoreBreakdown components={breakdown} alwaysVisible />
          </div>
          <button
            type="button"
            onClick={() => setExplainerOpen(true)}
            className="mt-5 rounded text-sm font-medium text-[var(--fc-accent)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-accent)]"
          >
            How is this calculated?
          </button>
        </div>
      </ResponsiveModal>

      <AthleteScoreExplainerModal open={explainerOpen} onOpenChange={setExplainerOpen} />
    </>
  );
}
