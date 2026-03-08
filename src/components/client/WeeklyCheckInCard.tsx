"use client";

import React from "react";
import Link from "next/link";
import { ClientGlassCard } from "@/components/client-ui";
import { Scale, ChevronRight } from "lucide-react";

const DUE_DAYS_THRESHOLD = 25;

interface WeeklyCheckInCardProps {
  daysSinceLast: number | null;
  lastMeasuredDate: string | null;
  lastWeightKg: number | null;
  lastBodyFatPct: number | null;
  frequencyDays: number;
}

function formatLastDate(dateStr: string, daysAgo: number): string {
  const d = new Date(dateStr + "T12:00:00");
  const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Last: ${formatted} (${daysAgo} day${daysAgo === 1 ? "" : "s"} ago)`;
}

export function WeeklyCheckInCard({
  daysSinceLast,
  lastMeasuredDate,
  lastWeightKg,
  lastBodyFatPct,
  frequencyDays,
}: WeeklyCheckInCardProps) {
  const isDue = daysSinceLast != null && daysSinceLast >= DUE_DAYS_THRESHOLD;

  return (
    <Link href="/client/check-ins/weekly">
      <ClientGlassCard
        className={`p-6 fc-hover-rise fc-press hover:border-[color:var(--fc-glass-border-strong)] transition-all cursor-pointer border-2 ${
          isDue ? "border-[color:var(--fc-accent)]" : "border-[color:var(--fc-glass-border)]"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              isDue
                ? "bg-[color:var(--fc-accent)]/20 text-[color:var(--fc-accent)] border-[color:var(--fc-accent)]/40"
                : "bg-[color:var(--fc-domain-workouts)]/10 text-[color:var(--fc-domain-workouts)] border-[color:var(--fc-domain-workouts)]/20"
            }`}
          >
            <Scale className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold fc-text-primary">Monthly Check-In</h2>
            {isDue && (
              <p className="text-sm font-medium mt-0.5" style={{ color: "var(--fc-accent)" }}>
                Monthly check-in due
              </p>
            )}
            {!isDue && daysSinceLast != null && lastMeasuredDate && (
              <p className="text-sm fc-text-dim mt-0.5">
                {formatLastDate(lastMeasuredDate, daysSinceLast)}
                {lastWeightKg != null && ` · ${lastWeightKg.toFixed(1)} kg`}
                {lastBodyFatPct != null && ` · ${lastBodyFatPct.toFixed(1)}%`}
                <span className="block mt-0.5 fc-text-subtle">Do another?</span>
              </p>
            )}
            {daysSinceLast == null && (
              <p className="text-sm fc-text-dim mt-0.5">Weight, body fat, measurements, photos</p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 fc-text-subtle shrink-0" />
        </div>
        <div className="mt-4">
          <span
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
              isDue ? "fc-btn fc-btn-primary" : "fc-btn fc-btn-secondary"
            }`}
          >
            Do Check-In
          </span>
        </div>
      </ClientGlassCard>
    </Link>
  );
}
