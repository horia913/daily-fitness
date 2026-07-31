"use client";

import { useEffect, useMemo, useState } from "react";
import { loadInstancePhases } from "@/lib/programInstance/instanceCanvasLoad";
import { supabase } from "@/lib/supabase";
import {
  buildPhaseWeekRanges,
  clientPhaseChipLabel,
  resolvePhaseForAbsoluteWeek,
} from "@/lib/clientInstancePhaseContext";

export interface TrainPhaseContext {
  phaseChipLabel: string | null;
  eyebrowLine: string;
}

export function useTrainPhaseContext(
  programAssignmentId: string | null | undefined,
  absoluteWeek: number,
  totalWeeks: number,
  paused: boolean,
): TrainPhaseContext {
  const [phaseChipLabel, setPhaseChipLabel] = useState<string | null>(null);

  useEffect(() => {
    if (paused || !programAssignmentId) {
      setPhaseChipLabel(null);
      return;
    }
    let cancelled = false;
    loadInstancePhases(supabase, programAssignmentId).then((phases) => {
      if (cancelled) return;
      const ranges = buildPhaseWeekRanges(phases);
      const pos = resolvePhaseForAbsoluteWeek(absoluteWeek, ranges);
      if (pos) {
        setPhaseChipLabel(clientPhaseChipLabel(pos.range.phase));
      } else {
        setPhaseChipLabel(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [programAssignmentId, paused, absoluteWeek]);

  const eyebrowLine = useMemo(() => {
    const overall =
      totalWeeks > 0
        ? `Week ${absoluteWeek} of ${totalWeeks}`
        : `Week ${absoluteWeek}`;
    if (phaseChipLabel) return `${overall} · ${phaseChipLabel}`;
    return overall;
  }, [absoluteWeek, totalWeeks, phaseChipLabel]);

  return { phaseChipLabel, eyebrowLine };
}
