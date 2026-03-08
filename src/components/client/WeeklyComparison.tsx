"use client";

import React from "react";
import Link from "next/link";
import { ClientGlassCard } from "@/components/client-ui";
import type { BodyMeasurement } from "@/lib/measurementService";
import { dbToUiScale } from "@/lib/wellnessService";
import type { DailyWellnessLog } from "@/lib/wellnessService";

interface WeeklyComparisonProps {
  /** Current (most recent) body metrics */
  current: BodyMeasurement | null;
  /** Previous (one before current) body metrics */
  previous: BodyMeasurement | null;
  /** Wellness logs for "this week" (last 7 days) */
  wellnessThisWeek: DailyWellnessLog[];
  /** Wellness logs for "last week" (7 days before that) */
  wellnessLastWeek: DailyWellnessLog[];
}

function avgSleep(logs: DailyWellnessLog[]): number | null {
  const withSleep = logs.filter((l) => l.sleep_hours != null);
  if (withSleep.length === 0) return null;
  return withSleep.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / withSleep.length;
}

function avgStress(logs: DailyWellnessLog[]): number | null {
  const withStress = logs.filter((l) => l.stress_level != null);
  if (withStress.length === 0) return null;
  const sum = withStress.reduce((s, l) => s + (dbToUiScale(l.stress_level) ?? 0), 0);
  return sum / withStress.length;
}

export function WeeklyComparison({
  current,
  previous,
  wellnessThisWeek,
  wellnessLastWeek,
}: WeeklyComparisonProps) {
  const sleepThis = avgSleep(wellnessThisWeek);
  const sleepLast = avgSleep(wellnessLastWeek);
  const stressThis = avgStress(wellnessThisWeek);
  const stressLast = avgStress(wellnessLastWeek);

  const weightChange =
    current?.weight_kg != null && previous?.weight_kg != null
      ? current.weight_kg - previous.weight_kg
      : null;
  const bfChange =
    current?.body_fat_percentage != null && previous?.body_fat_percentage != null
      ? current.body_fat_percentage - previous.body_fat_percentage
      : null;
  const waistChange =
    current?.waist_circumference != null && previous?.waist_circumference != null
      ? current.waist_circumference - previous.waist_circumference
      : null;

  if (!current && !previous && wellnessThisWeek.length === 0 && wellnessLastWeek.length === 0) {
    return (
      <ClientGlassCard className="p-6">
        <h3 className="text-lg font-semibold fc-text-primary mb-4">Comparison</h3>
        <p className="text-sm fc-text-dim">Complete a weekly check-in to see comparison.</p>
        <Link href="/client/progress/body-metrics" className="text-sm font-medium fc-text-primary mt-2 inline-block underline">
          View full history
        </Link>
      </ClientGlassCard>
    );
  }

  return (
    <ClientGlassCard className="p-6">
      <h3 className="text-lg font-semibold fc-text-primary mb-4">Comparison</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[color:var(--fc-glass-border)]">
              <th className="text-left py-2 pr-4 fc-text-subtle font-medium"></th>
              <th className="text-right py-2 px-2 fc-text-subtle">Last week</th>
              <th className="text-right py-2 px-2 fc-text-primary font-medium">This week</th>
              <th className="text-right py-2 pl-2 fc-text-subtle">Change</th>
            </tr>
          </thead>
          <tbody className="fc-text-primary">
            {current?.weight_kg != null && (
              <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                <td className="py-2 pr-4 font-medium">Weight</td>
                <td className="text-right py-2 px-2 font-mono">{previous?.weight_kg?.toFixed(1) ?? "—"} kg</td>
                <td className="text-right py-2 px-2 font-mono">{current.weight_kg.toFixed(1)} kg</td>
                <td className={`text-right py-2 pl-2 font-mono ${weightChange != null ? (weightChange < 0 ? "fc-text-success" : "fc-text-warning") : ""}`}>
                  {weightChange != null ? (weightChange < 0 ? `▼ ${weightChange.toFixed(1)}` : weightChange > 0 ? `▲ +${weightChange.toFixed(1)}` : "—") : "—"}
                </td>
              </tr>
            )}
            {(current?.body_fat_percentage != null || previous?.body_fat_percentage != null) && (
              <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                <td className="py-2 pr-4 font-medium">Body fat</td>
                <td className="text-right py-2 px-2 font-mono">{previous?.body_fat_percentage?.toFixed(1) ?? "—"}%</td>
                <td className="text-right py-2 px-2 font-mono">{current?.body_fat_percentage?.toFixed(1) ?? "—"}%</td>
                <td className={`text-right py-2 pl-2 font-mono ${bfChange != null ? (bfChange < 0 ? "fc-text-success" : "fc-text-warning") : ""}`}>
                  {bfChange != null ? (bfChange < 0 ? `▼ ${bfChange.toFixed(1)}%` : bfChange > 0 ? `▲ +${bfChange.toFixed(1)}%` : "—") : "—"}
                </td>
              </tr>
            )}
            {(current?.waist_circumference != null || previous?.waist_circumference != null) && (
              <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                <td className="py-2 pr-4 font-medium">Waist</td>
                <td className="text-right py-2 px-2 font-mono">{previous?.waist_circumference?.toFixed(1) ?? "—"} cm</td>
                <td className="text-right py-2 px-2 font-mono">{current?.waist_circumference?.toFixed(1) ?? "—"} cm</td>
                <td className={`text-right py-2 pl-2 font-mono ${waistChange != null ? (waistChange < 0 ? "fc-text-success" : "fc-text-warning") : ""}`}>
                  {waistChange != null ? (waistChange < 0 ? `▼ ${waistChange.toFixed(1)}` : waistChange > 0 ? `▲ +${waistChange.toFixed(1)}` : "—") : "—"}
                </td>
              </tr>
            )}
            {(sleepThis != null || sleepLast != null) && (
              <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                <td className="py-2 pr-4 font-medium">Sleep avg</td>
                <td className="text-right py-2 px-2 font-mono">{sleepLast?.toFixed(1) ?? "—"}h</td>
                <td className="text-right py-2 px-2 font-mono">{sleepThis?.toFixed(1) ?? "—"}h</td>
                <td className="text-right py-2 pl-2 font-mono fc-text-success">
                  {sleepThis != null && sleepLast != null ? (sleepThis >= sleepLast ? "▲" : "▼") : "—"}
                </td>
              </tr>
            )}
            {(stressThis != null || stressLast != null) && (
              <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                <td className="py-2 pr-4 font-medium">Stress avg</td>
                <td className="text-right py-2 px-2 font-mono">{stressLast?.toFixed(1) ?? "—"}/5</td>
                <td className="text-right py-2 px-2 font-mono">{stressThis?.toFixed(1) ?? "—"}/5</td>
                <td className="text-right py-2 pl-2 font-mono fc-text-success">
                  {stressThis != null && stressLast != null ? (stressThis <= stressLast ? "▼" : "▲") : "—"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Link href="/client/progress/body-metrics" className="text-sm font-medium fc-text-primary mt-4 inline-block underline">
        View full history
      </Link>
    </ClientGlassCard>
  );
}
