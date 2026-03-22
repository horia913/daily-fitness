"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  getLogRange,
  getCompletionStats,
  CompletionStats,
  dbToUiScale,
} from "@/lib/wellnessService";
import { BodyMeasurement, getClientMeasurements } from "@/lib/measurementService";
import { WellnessTrendsCard } from "@/components/client/WellnessTrendsCard";
import { CheckInConfigEditor } from "@/components/coach/CheckInConfigEditor";
import ClientAdherenceView from "@/components/coach/client-views/ClientAdherenceView";
import { getWeekStartMonday } from "./clientProgressHubUtils";

interface ClientProgressWellnessSectionProps {
  clientId: string;
  coachId: string | null;
}

export default function ClientProgressWellnessSection({
  clientId,
  coachId,
}: ClientProgressWellnessSectionProps) {
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<Awaited<ReturnType<typeof getLogRange>>>([]);
  const [wellnessStats, setWellnessStats] = useState<CompletionStats | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const start90 = new Date();
      start90.setDate(start90.getDate() - 89);
      const start90Str = start90.toISOString().split("T")[0];

      const [measurementsData, logs, stats] = await Promise.all([
        getClientMeasurements(clientId, 12),
        getLogRange(clientId, start90Str, today),
        getCompletionStats(clientId, 7),
      ]);
      setMeasurements(measurementsData);
      setWellnessLogs(logs);
      setWellnessStats(stats);
    } catch (error) {
      console.error("Error loading wellness progress data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [clientId]);

  const wellnessByWeek = useMemo(() => {
    const byWeek: { weekStart: string; sleep: number[]; stress: number[]; soreness: number[] }[] = [];
    for (let w = 3; w >= 0; w--) {
      const end = new Date();
      end.setDate(end.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];
      const weekLogs = wellnessLogs.filter((l) => l.log_date >= startStr && l.log_date <= endStr);
      const complete = weekLogs.filter(
        (l) =>
          l.sleep_hours != null &&
          l.stress_level != null &&
          l.soreness_level != null
      );
      byWeek.push({
        weekStart: startStr,
        sleep: complete.map((l) => l.sleep_hours ?? 0),
        stress: complete.map((l) => dbToUiScale(l.stress_level) ?? 0),
        soreness: complete.map((l) => dbToUiScale(l.soreness_level) ?? 0),
      });
    }
    return byWeek;
  }, [wellnessLogs]);

  const weekStart = useMemo(() => getWeekStartMonday(), []);
  const weekDays = useMemo(() => {
    const start = new Date(weekStart + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, [weekStart]);
  const lastWeekStart = useMemo(() => {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }, [weekStart]);
  const lastWeekDays = useMemo(() => {
    const start = new Date(lastWeekStart + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, [lastWeekStart]);

  const thisWeekWellnessSummary = useMemo(() => {
    const logs = wellnessLogs.filter((l) => weekDays.includes(l.log_date));
    if (logs.length === 0) return null;
    const withSleep = logs.filter((l) => l.sleep_hours != null);
    const withStress = logs.filter((l) => l.stress_level != null);
    const withSore = logs.filter((l) => l.soreness_level != null);
    const withEnergy = logs.filter((l) => l.energy_level != null);
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    return {
      sleep: avg(withSleep.map((l) => l.sleep_hours!)),
      stress: avg(withStress.map((l) => dbToUiScale(l.stress_level) ?? 0)),
      soreness: avg(withSore.map((l) => dbToUiScale(l.soreness_level) ?? 0)),
      energy: withEnergy.length
        ? avg(withEnergy.map((l) => l.energy_level!))
        : null,
    };
  }, [wellnessLogs, weekDays]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-48 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl" />
        <div className="animate-pulse h-64 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientAdherenceView clientId={clientId} />

      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
        <h3 className="text-lg font-semibold fc-text-primary mb-3">This week (wellness logs)</h3>
        {thisWeekWellnessSummary ? (
          <>
            <p className="text-sm fc-text-subtle">
              {thisWeekWellnessSummary.sleep != null && (
                <>Sleep avg: {thisWeekWellnessSummary.sleep.toFixed(1)}h · </>
              )}
              {thisWeekWellnessSummary.stress != null && (
                <>Stress avg: {thisWeekWellnessSummary.stress.toFixed(1)}/5 · </>
              )}
              {thisWeekWellnessSummary.soreness != null && (
                <>Soreness avg: {thisWeekWellnessSummary.soreness.toFixed(1)}/5</>
              )}
              {thisWeekWellnessSummary.energy != null && (
                <>
                  {(thisWeekWellnessSummary.sleep != null ||
                    thisWeekWellnessSummary.stress != null ||
                    thisWeekWellnessSummary.soreness != null) &&
                    " · "}
                  Energy avg: {thisWeekWellnessSummary.energy.toFixed(1)}
                </>
              )}
            </p>
            {wellnessStats && wellnessStats.loggedDays > 0 && (
              <p className="text-xs fc-text-dim mt-2">
                Logged {wellnessStats.loggedDays} of last 7 days (same window as the adherence strip
                above).
              </p>
            )}
          </>
        ) : (
          <p className="text-sm fc-text-subtle">
            No daily wellness logs for this calendar week yet.
          </p>
        )}
      </div>

      <WellnessTrendsCard
        logRange={wellnessLogs}
        weekStart={weekStart}
        weekDays={weekDays}
        lastWeekStart={lastWeekStart}
        lastWeekDays={lastWeekDays}
      />

      {wellnessByWeek.some((w) => w.sleep.length > 0 || w.stress.length > 0) && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
          <h3 className="text-lg font-semibold fc-text-primary mb-4">Wellness trend (4 weeks)</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="fc-text-subtle mb-1">Sleep (h avg)</p>
              <div className="flex gap-2 items-end h-8">
                {wellnessByWeek.map((w, i) => {
                  const avg = w.sleep.length
                    ? w.sleep.reduce((a, b) => a + b, 0) / w.sleep.length
                    : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded bg-[color:var(--fc-accent-cyan)]/40 min-h-[4px]"
                      style={{ height: `${Math.min(100, (avg / 10) * 100)}%` }}
                      title={`${avg.toFixed(1)}h`}
                    />
                  );
                })}
              </div>
            </div>
            <div>
              <p className="fc-text-subtle mb-1">Stress (1-5 avg)</p>
              <div className="flex gap-2 items-end h-8">
                {wellnessByWeek.map((w, i) => {
                  const avg = w.stress.length
                    ? w.stress.reduce((a, b) => a + b, 0) / w.stress.length
                    : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded bg-[color:var(--fc-accent)]/40 min-h-[4px]"
                      style={{ height: `${(avg / 5) * 100}%` }}
                      title={`${avg.toFixed(1)}/5`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {measurements.length > 0 && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-lg font-semibold fc-text-primary">View all check-in history</h3>
            {showHistory ? (
              <ChevronUp className="w-5 h-5 fc-text-subtle" />
            ) : (
              <ChevronDown className="w-5 h-5 fc-text-subtle" />
            )}
          </button>
          {showHistory && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {measurements.map((m) => (
                <div
                  key={m.id}
                  className="fc-glass-soft rounded-xl p-3 flex justify-between items-center"
                >
                  <span className="text-sm fc-text-primary">
                    {new Date(m.measured_date + "T12:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-sm font-mono fc-text-subtle">
                    {m.weight_kg?.toFixed(1)} kg
                    {m.body_fat_percentage != null && ` · ${m.body_fat_percentage.toFixed(1)}%`}
                    {m.waist_circumference != null && ` · ${m.waist_circumference} cm`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {coachId && (
        <div className="mt-2">
          <CheckInConfigEditor coachId={coachId} clientId={clientId} />
        </div>
      )}
    </div>
  );
}
