"use client";

import React, { useEffect, useState } from "react";
import { AthleteScoreChip } from "@/components/client/AthleteScoreChip";
import { fetchApi } from "@/lib/apiClient";
import type { AthleteScore } from "@/types/athleteScore";
import type { CoachAthleteScoreBundle } from "@/types/coachAthleteScore";

export function CoachCheckInsScoreChip({ clientId }: { clientId: string }) {
  const [athleteScore, setAthleteScore] = useState<AthleteScore | null>(null);
  const [paused, setPaused] = useState(false);
  const [hasActiveProgram, setHasActiveProgram] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApi(`/api/coach/clients/${clientId}/athlete-score`);
        const body = (await res.json().catch(() => ({}))) as CoachAthleteScoreBundle;
        if (!res.ok || cancelled) return;
        setAthleteScore(body.latest ?? null);
        setPaused(body.paused);
        setHasActiveProgram(body.hasActiveProgram);
      } catch {
        if (!cancelled) {
          setAthleteScore(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!hasActiveProgram && !athleteScore) return null;
  if (!athleteScore) return null;

  return (
    <AthleteScoreChip
      compact
      coachClientId={clientId}
      athleteScore={athleteScore}
      chipState={paused ? "paused" : "default"}
    />
  );
}
