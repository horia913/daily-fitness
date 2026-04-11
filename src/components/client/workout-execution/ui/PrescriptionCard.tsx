"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetType } from "@/types/workoutSetEntries";
import { SetTypeBadge } from "./SetTypeBadge";

export type PrescriptionItem = {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
};

export interface PrescriptionCardProps {
  /** Single-exercise: that name. Multi-exercise: compound line e.g. "A + B + 2 more" (no actions on this row). */
  exerciseTitle: string;
  setType: SetType | string;
  /** e.g. "SUPERSET · EXERCISE 1 OF 2" when block has multiple exercises. */
  multiExerciseHint?: string;
  prescriptionItems: PrescriptionItem[];
  /** Applied to the prescription grid (e.g. `sm:grid-cols-3`). */
  prescriptionGridClassName?: string;
  coachNotes?: string;
  formCues?: string;
  logSectionTitle?: string;
  logSectionContent?: React.ReactNode;
  /** Single-exercise blocks: progression + previous session inside the cyan card (below title). */
  topAccessory?: React.ReactNode;
  /** Video + alternatives inline with the title (single-exercise blocks; multi-exercise uses per-section headers). */
  titleActions?: React.ReactNode;
}

export function PrescriptionCard({
  exerciseTitle,
  setType,
  multiExerciseHint,
  prescriptionItems,
  prescriptionGridClassName,
  coachNotes,
  formCues,
  logSectionTitle,
  logSectionContent,
  topAccessory,
  titleActions,
}: PrescriptionCardProps) {
  const hasRx = prescriptionItems.length > 0;
  const hasLog =
    logSectionContent !== undefined &&
    logSectionContent !== null &&
    logSectionContent !== false;
  const hasCoachNotes = Boolean(coachNotes && coachNotes.trim().length > 0);
  const hasFormCues = Boolean(formCues && formCues.trim().length > 0);
  const hasNotesRegion = hasCoachNotes || hasFormCues;
  const hasTitle = Boolean(exerciseTitle?.trim());
  const hasTopAccessory = Boolean(topAccessory);

  if (!hasTitle && !hasRx && !hasLog) return null;

  const hasMiddleContent = hasRx || hasNotesRegion;
  const showDividerBeforeLog = hasLog && hasMiddleContent;

  return (
    <div className="fc-card-shell p-4">
      {hasTitle ? (
        <>
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 break-words text-xl font-bold text-white">
              {exerciseTitle}
            </h2>
            {titleActions ? (
              <div className="flex shrink-0 items-center pt-0.5">
                {titleActions}
              </div>
            ) : null}
          </div>
          <div className="mt-2">
            <SetTypeBadge setType={setType} />
          </div>
          {multiExerciseHint ? (
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              {multiExerciseHint}
            </p>
          ) : null}
          {topAccessory ? (
            <div className="mt-2 min-w-0">{topAccessory}</div>
          ) : null}
          {(hasRx || hasNotesRegion || hasLog || hasTopAccessory) ? (
            <div className="my-3 h-px bg-cyan-500/28" aria-hidden />
          ) : null}
        </>
      ) : null}

      {hasRx ? (
        <>
          <div className="mb-3 text-xs uppercase tracking-wider text-cyan-300">
            YOUR TARGET TODAY
          </div>
          <div
            className={cn(
              "grid grid-cols-2 gap-3",
              prescriptionGridClassName,
            )}
          >
            {prescriptionItems.map((item, index) => {
              const Icon = item.icon;
              const key = `${item.label}-${index}`;
              return (
                <div key={key} className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className="size-[14px] shrink-0 text-cyan-400/95"
                      aria-hidden
                    />
                    <span className="text-xs text-gray-400">{item.label}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-1">
                    <span className="text-xl font-bold text-white">
                      {item.value}
                    </span>
                    {item.unit ? (
                      <span className="text-xs text-gray-400">{item.unit}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {hasNotesRegion ? (
        <div className={cn(hasRx && "mt-4")}>
          <div className="mb-2 text-xs uppercase tracking-wider text-cyan-300">
            COACH NOTES
          </div>
          <div className="rounded-r border-l-2 border-cyan-500/50 bg-cyan-500/10 py-2 pl-3">
            {hasCoachNotes ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">
                {coachNotes}
              </p>
            ) : null}

            {hasCoachNotes && hasFormCues ? (
              <div className="my-2 h-px bg-cyan-500/28" aria-hidden />
            ) : null}

            {hasFormCues ? (
              <>
                {hasCoachNotes ? (
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">
                    FORM CUES
                  </p>
                ) : null}
                <p className="whitespace-pre-line text-xs leading-relaxed text-gray-400">
                  {formCues}
                </p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {showDividerBeforeLog ? (
        <div className="my-4 h-px bg-cyan-500/28" aria-hidden />
      ) : null}

      {hasLog ? (
        <>
          {logSectionTitle ? (
            <div className="mb-3 text-xs uppercase tracking-wider text-cyan-300">
              {logSectionTitle}
            </div>
          ) : null}
          <div className="space-y-3">{logSectionContent}</div>
        </>
      ) : null}
    </div>
  );
}
