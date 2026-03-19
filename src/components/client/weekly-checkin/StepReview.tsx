"use client";

import React from "react";
import { ClientGlassCard } from "@/components/client-ui";
import type { WeeklyCheckInBodyData } from "./WeeklyCheckInFlowTypes";
import type { BodyMeasurement } from "@/lib/measurementService";

export interface WellnessSummary {
  sleepAvg: number;
  stressAvg: number;
  sorenessAvg: number;
}

interface StepReviewProps {
  bodyData: WeeklyCheckInBodyData;
  previousMeasurement: BodyMeasurement | null;
  firstMeasurement: BodyMeasurement | null;
  wellnessThisWeek: WellnessSummary | null;
  wellnessLastWeek: WellnessSummary | null;
  notesToCoach: string;
  setNotesToCoach: (v: string) => void;
  notesEnabled: boolean;
  onSubmit: () => void;
  submitting: boolean;
  frequencyDays?: number | null;
}

function formatChange(current: number, previous: number): { text: string; improving: boolean } {
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(1) : "";
  if (diff < 0) return { text: `▼ ${diff.toFixed(1)} (${pct}%)`, improving: true };
  if (diff > 0) return { text: `▲ +${diff.toFixed(1)} (${pct}%)`, improving: false };
  return { text: "—", improving: true };
}

/** For "since start": weight/waist/body fat — decrease is improving. Muscle mass — increase is improving. */
function formatSinceStart(
  current: number,
  start: number,
  unit: string,
  lowerIsBetter: boolean
): { text: string; improving: boolean } {
  const diff = current - start;
  const pct = start !== 0 ? ((diff / start) * 100).toFixed(1) : "";
  const improving = lowerIsBetter ? diff < 0 : diff > 0;
  const arrow = diff < 0 ? "▼" : diff > 0 ? "▲" : "—";
  const delta = diff < 0 ? Math.abs(diff).toFixed(1) : diff > 0 ? `+${diff.toFixed(1)}` : "—";
  const suffix = pct ? ` (${pct}%)` : "";
  return {
    text: diff === 0 ? "—" : `${arrow} ${delta} ${unit}${suffix}`,
    improving,
  };
}

function getFrequencyPlaceholder(days?: number | null): string {
  if (days === 7) return "How did this week go? Energy, adherence, anything to share...";
  if (days === 30) return "How did this month go? Energy, adherence, anything to share...";
  if (days != null) return "How did this period go? Energy, adherence, anything to share...";
  return "How did this period go? Energy, adherence, anything to share...";
}

export function StepReview({
  bodyData,
  previousMeasurement,
  firstMeasurement,
  wellnessThisWeek,
  wellnessLastWeek,
  notesToCoach,
  setNotesToCoach,
  notesEnabled,
  onSubmit,
  submitting,
  frequencyDays,
}: StepReviewProps) {
  const weightChange =
    bodyData.weight_kg != null && previousMeasurement?.weight_kg != null
      ? formatChange(bodyData.weight_kg, previousMeasurement.weight_kg)
      : null;
  const bfChange =
    bodyData.body_fat_percentage != null && previousMeasurement?.body_fat_percentage != null
      ? formatChange(bodyData.body_fat_percentage, previousMeasurement.body_fat_percentage)
      : null;
  const waistChange =
    bodyData.waist_circumference != null && previousMeasurement?.waist_circumference != null
      ? formatChange(bodyData.waist_circumference, previousMeasurement.waist_circumference)
      : null;

  return (
    <ClientGlassCard className="p-6 sm:p-8">
      <p className="text-sm fc-text-subtle mb-4">Step 3 of 3</p>
      <h2 className="text-xl font-bold fc-text-primary mb-6">Notes & review</h2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full min-w-[280px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[color:var(--fc-glass-border)]">
              <th className="text-left py-2 pr-4 fc-text-subtle font-medium"></th>
              <th className="text-right py-2 px-2 fc-text-subtle">Last check-in</th>
              <th className="text-right py-2 px-2 fc-text-primary font-medium">This check-in</th>
              <th className="text-right py-2 pl-2 fc-text-subtle">Change</th>
            </tr>
          </thead>
          <tbody className="fc-text-primary">
            <tr className="border-b border-[color:var(--fc-glass-border)]/50">
              <td className="py-2 pr-4 font-medium">Weight</td>
              <td className="text-right py-2 px-2 font-mono">{previousMeasurement?.weight_kg?.toFixed(1) ?? "—"} kg</td>
              <td className="text-right py-2 px-2 font-mono">{bodyData.weight_kg?.toFixed(1) ?? "—"} kg</td>
              <td className={`text-right py-2 pl-2 font-mono ${weightChange ? (weightChange.improving ? "fc-text-success" : "fc-text-warning") : ""}`}>
                {weightChange?.text ?? "—"}
              </td>
            </tr>
            {(bodyData.body_fat_percentage != null || previousMeasurement?.body_fat_percentage != null) && (
              <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                <td className="py-2 pr-4 font-medium">Body fat</td>
                <td className="text-right py-2 px-2 font-mono">{previousMeasurement?.body_fat_percentage?.toFixed(1) ?? "—"}%</td>
                <td className="text-right py-2 px-2 font-mono">{bodyData.body_fat_percentage?.toFixed(1) ?? "—"}%</td>
                <td className={`text-right py-2 pl-2 font-mono ${bfChange ? (bfChange.improving ? "fc-text-success" : "fc-text-warning") : ""}`}>
                  {bfChange?.text ?? "—"}
                </td>
              </tr>
            )}
            {(bodyData.waist_circumference != null || previousMeasurement?.waist_circumference != null) && (
              <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                <td className="py-2 pr-4 font-medium">Waist</td>
                <td className="text-right py-2 px-2 font-mono">{previousMeasurement?.waist_circumference?.toFixed(1) ?? "—"} cm</td>
                <td className="text-right py-2 px-2 font-mono">{bodyData.waist_circumference?.toFixed(1) ?? "—"} cm</td>
                <td className={`text-right py-2 pl-2 font-mono ${waistChange ? (waistChange.improving ? "fc-text-success" : "fc-text-warning") : ""}`}>
                  {waistChange?.text ?? "—"}
                </td>
              </tr>
            )}
            {wellnessThisWeek && wellnessLastWeek && (
              <>
                <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                  <td className="py-2 pr-4 font-medium">Sleep avg</td>
                  <td className="text-right py-2 px-2 font-mono">{wellnessLastWeek.sleepAvg.toFixed(1)}h</td>
                  <td className="text-right py-2 px-2 font-mono">{wellnessThisWeek.sleepAvg.toFixed(1)}h</td>
                  <td className="text-right py-2 pl-2 font-mono fc-text-success">
                    {wellnessThisWeek.sleepAvg >= wellnessLastWeek.sleepAvg ? "▲" : "▼"}
                  </td>
                </tr>
                <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                  <td className="py-2 pr-4 font-medium">Stress avg</td>
                  <td className="text-right py-2 px-2 font-mono">{wellnessLastWeek.stressAvg.toFixed(1)}/5</td>
                  <td className="text-right py-2 px-2 font-mono">{wellnessThisWeek.stressAvg.toFixed(1)}/5</td>
                  <td className="text-right py-2 pl-2 font-mono fc-text-success">
                    {wellnessThisWeek.stressAvg <= wellnessLastWeek.stressAvg ? "▼" : "▲"}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Since you started */}
      {firstMeasurement ? (
        <div className="mb-6 p-4 rounded-xl bg-[color:var(--fc-status-success)]/10 border border-[color:var(--fc-status-success)]/30">
          <h3 className="text-base font-semibold fc-text-primary mb-3">Since you started</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[color:var(--fc-glass-border)]">
                  <th className="text-left py-2 pr-4 fc-text-subtle font-medium"></th>
                  <th className="text-right py-2 px-2 fc-text-subtle">Start</th>
                  <th className="text-right py-2 px-2 fc-text-primary font-medium">Now</th>
                  <th className="text-right py-2 pl-2 fc-text-subtle">Change</th>
                </tr>
              </thead>
              <tbody className="fc-text-primary">
                {firstMeasurement.weight_kg != null && bodyData.weight_kg != null && (
                  <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                    <td className="py-2 pr-4 font-medium">Weight</td>
                    <td className="text-right py-2 px-2 font-mono">{firstMeasurement.weight_kg.toFixed(1)} kg</td>
                    <td className="text-right py-2 px-2 font-mono">{bodyData.weight_kg.toFixed(1)} kg</td>
                    <td className={`text-right py-2 pl-2 font-mono ${formatSinceStart(bodyData.weight_kg, firstMeasurement.weight_kg, "kg", true).improving ? "fc-text-success" : "fc-text-warning"}`}>
                      {formatSinceStart(bodyData.weight_kg, firstMeasurement.weight_kg, "kg", true).text}
                    </td>
                  </tr>
                )}
                {firstMeasurement.body_fat_percentage != null && bodyData.body_fat_percentage != null && (
                  <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                    <td className="py-2 pr-4 font-medium">Body fat</td>
                    <td className="text-right py-2 px-2 font-mono">{firstMeasurement.body_fat_percentage.toFixed(1)}%</td>
                    <td className="text-right py-2 px-2 font-mono">{bodyData.body_fat_percentage.toFixed(1)}%</td>
                    <td className={`text-right py-2 pl-2 font-mono ${formatSinceStart(bodyData.body_fat_percentage, firstMeasurement.body_fat_percentage, "%", true).improving ? "fc-text-success" : "fc-text-warning"}`}>
                      {formatSinceStart(bodyData.body_fat_percentage, firstMeasurement.body_fat_percentage, "%", true).text}
                    </td>
                  </tr>
                )}
                {firstMeasurement.waist_circumference != null && bodyData.waist_circumference != null && (
                  <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                    <td className="py-2 pr-4 font-medium">Waist</td>
                    <td className="text-right py-2 px-2 font-mono">{firstMeasurement.waist_circumference.toFixed(1)} cm</td>
                    <td className="text-right py-2 px-2 font-mono">{bodyData.waist_circumference.toFixed(1)} cm</td>
                    <td className={`text-right py-2 pl-2 font-mono ${formatSinceStart(bodyData.waist_circumference, firstMeasurement.waist_circumference, "cm", true).improving ? "fc-text-success" : "fc-text-warning"}`}>
                      {formatSinceStart(bodyData.waist_circumference, firstMeasurement.waist_circumference, "cm", true).text}
                    </td>
                  </tr>
                )}
                {firstMeasurement.muscle_mass_kg != null && bodyData.muscle_mass_kg != null && (
                  <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                    <td className="py-2 pr-4 font-medium">Muscle mass</td>
                    <td className="text-right py-2 px-2 font-mono">{firstMeasurement.muscle_mass_kg.toFixed(1)} kg</td>
                    <td className="text-right py-2 px-2 font-mono">{bodyData.muscle_mass_kg.toFixed(1)} kg</td>
                    <td className={`text-right py-2 pl-2 font-mono ${formatSinceStart(bodyData.muscle_mass_kg, firstMeasurement.muscle_mass_kg, "kg", false).improving ? "fc-text-success" : "fc-text-warning"}`}>
                      {formatSinceStart(bodyData.muscle_mass_kg, firstMeasurement.muscle_mass_kg, "kg", false).text}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
          <p className="text-sm fc-text-primary">This is your starting point! Future check-ins will show your progress from here.</p>
        </div>
      )}

      {notesEnabled && (
        <div className="mb-6">
          <label className="block text-sm font-medium fc-text-primary mb-2">Notes to coach</label>
          <textarea
            value={notesToCoach}
            onChange={(e) => setNotesToCoach(e.target.value)}
            placeholder={getFrequencyPlaceholder(frequencyDays)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--fc-accent-cyan)] resize-none"
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || bodyData.weight_kg == null || bodyData.weight_kg <= 0}
          className="fc-btn fc-btn-primary px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit ✓"
          )}
        </button>
      </div>
    </ClientGlassCard>
  );
}
