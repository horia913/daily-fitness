/**
 * Shared types + foundation day status for the client program roadmap.
 */

import {
  getWorkoutStatus,
  type PauseState,
  type ProgramWeekWindow,
  type WorkoutStatus,
} from "@/lib/progression/weekWindows";
import type { InstancePhaseRow } from "@/lib/programInstance/instanceCanvasLoad";

export type FoundationProgression = {
  startDate: string;
  totalWeeks: number;
  timeZone: string;
  pauses: PauseState;
};

export interface TemplatePreview {
  id: string;
  name: string;
  description: string | null;
  estimated_duration: number | null;
  difficulty_level: string | null;
  category: string | null;
}

export interface DaySlot {
  key: string;
  scheduleId: string | null;
  dayNumber: number;
  weekNumber: number;
  templateId: string | null;
  isOptional: boolean;
  scheduleNotes?: string | null;
  template: TemplatePreview | null;
  isRest: boolean;
}

export interface WeekSection {
  weekNumber: number;
  days: DaySlot[];
}

export interface PhaseSection {
  phase: InstancePhaseRow | null;
  displayPhaseOrder: number;
  startWeek: number;
  endWeek: number;
  weeks: WeekSection[];
}

export function resolveDayFoundationStatus(
  day: DaySlot,
  completedIds: Set<string>,
  skippedIds: Set<string>,
  windows: ProgramWeekWindow[] | null,
  progression: FoundationProgression | null,
  effectiveTodayYmd: string | null,
): WorkoutStatus | null {
  if (day.isRest || !day.scheduleId || !windows || !progression || !effectiveTodayYmd) {
    return null;
  }
  const isDone =
    completedIds.has(day.scheduleId) || skippedIds.has(day.scheduleId);
  return getWorkoutStatus(
    {
      weekNumber: day.weekNumber,
      programDay: day.dayNumber,
      isDone,
    },
    windows,
    progression.startDate,
    effectiveTodayYmd,
  );
}

export function isFoundationStartable(status: WorkoutStatus | null): boolean {
  return status === "missed" || status === "due-today";
}

export function flattenWeeks(phaseSections: PhaseSection[]): WeekSection[] {
  const byWeek = new Map<number, WeekSection>();
  for (const sec of phaseSections) {
    for (const w of sec.weeks) {
      byWeek.set(w.weekNumber, w);
    }
  }
  return [...byWeek.values()].sort((a, b) => a.weekNumber - b.weekNumber);
}
