"use client";

import type { DailyWellnessLog } from "@/lib/wellnessService";
import { dbToUiScale } from "@/lib/wellnessService";

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface CompletedCheckInSummaryProps {
  log: DailyWellnessLog;
  logDate: string;
  onEdit: () => void;
}

export function CompletedCheckInSummary({ log, logDate, onEdit }: CompletedCheckInSummaryProps) {
  const stressUi = log.stress_level != null ? dbToUiScale(log.stress_level) : null;
  const sorenessUi = log.soreness_level != null ? dbToUiScale(log.soreness_level) : null;

  return (
    <div className="px-0 py-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg" aria-hidden>
          ✅
        </span>
        <h2 className="text-lg font-bold fc-text-primary leading-tight">Today&apos;s Check-in Complete</h2>
      </div>
      <p className="text-sm fc-text-dim mb-4">{formatDateLong(logDate)}</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-5">
        {log.sleep_hours != null && (
          <>
            <span className="fc-text-subtle">Sleep</span>
            <span className="font-medium fc-text-primary text-right">{log.sleep_hours}h</span>
          </>
        )}
        {log.sleep_quality != null && (
          <>
            <span className="fc-text-subtle">Quality</span>
            <span className="font-medium fc-text-primary text-right">{log.sleep_quality}</span>
          </>
        )}
        {stressUi != null && (
          <>
            <span className="fc-text-subtle">Stress</span>
            <span className="font-medium fc-text-primary text-right">{stressUi}</span>
          </>
        )}
        {sorenessUi != null && (
          <>
            <span className="fc-text-subtle">Soreness</span>
            <span className="font-medium fc-text-primary text-right">{sorenessUi}</span>
          </>
        )}
        {log.steps != null && (
          <>
            <span className="fc-text-subtle">Steps</span>
            <span className="font-medium fc-text-primary text-right">{log.steps.toLocaleString()}</span>
          </>
        )}
      </div>

      {log.notes?.trim() && (
        <p className="text-xs fc-text-dim mb-4 italic line-clamp-3">&ldquo;{log.notes.trim()}&rdquo;</p>
      )}

      <button
        type="button"
        onClick={onEdit}
        className="w-full min-h-[48px] py-3 rounded-xl text-sm font-semibold fc-btn fc-btn-secondary fc-press"
      >
        Edit Check-in
      </button>
    </div>
  );
}
