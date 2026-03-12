"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  TrendingUp,
  Scale,
  Ruler,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Target,
  Settings,
  Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getLogRange,
  getCompletionStats,
  CompletionStats,
  dbToUiScale,
} from "@/lib/wellnessService";
import {
  BodyMeasurement,
  getClientMeasurements,
  getFirstMeasurement,
} from "@/lib/measurementService";
import {
  getPhotoTimeline,
  getComparisonPhotos,
  ProgressPhoto,
} from "@/lib/progressPhotoService";
import { AddClientCheckInModal } from "@/components/coach/AddClientCheckInModal";
import { WellnessTrendsCard } from "@/components/client/WellnessTrendsCard";

function getWeekStartMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
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

interface ClientProgressViewProps {
  clientId: string;
  coachId?: string;
}

export default function ClientProgressView({ clientId, coachId: coachIdProp }: ClientProgressViewProps) {
  const { user } = useAuth();
  const coachId = coachIdProp ?? user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<Awaited<ReturnType<typeof getLogRange>>>([]);
  const [wellnessStats, setWellnessStats] = useState<CompletionStats | null>(null);
  const [photoTimeline, setPhotoTimeline] = useState<{ date: string; types: string[]; weight_kg?: number | null }[]>([]);
  const [comparisonPhotos, setComparisonPhotos] = useState<{ before: ProgressPhoto[]; after: ProgressPhoto[] } | null>(null);
  const [firstMeasurement, setFirstMeasurement] = useState<BodyMeasurement | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddCheckInModal, setShowAddCheckInModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const start28 = new Date();
      start28.setDate(start28.getDate() - 27);
      const start28Str = start28.toISOString().split("T")[0];
      const start90 = new Date();
      start90.setDate(start90.getDate() - 89);
      const start90Str = start90.toISOString().split("T")[0];

      const [measurementsData, logs, stats, timeline, first] = await Promise.all([
        getClientMeasurements(clientId, 12),
        getLogRange(clientId, start90Str, today),
        getCompletionStats(clientId, 7),
        getPhotoTimeline(clientId),
        getFirstMeasurement(clientId),
      ]);

      setMeasurements(measurementsData);
      setWellnessLogs(logs);
      setWellnessStats(stats);
      setPhotoTimeline(timeline);
      setFirstMeasurement(first ?? null);

      if (timeline.length >= 2) {
        const photos = await getComparisonPhotos(clientId, timeline[timeline.length - 1].date, timeline[0].date);
        setComparisonPhotos(photos);
      } else {
        setComparisonPhotos(null);
      }
    } catch (error) {
      console.error("Error loading progress data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const current = measurements[0] ?? null;
  const previous = measurements[1] ?? null;
  const weightChange = current?.weight_kg != null && previous?.weight_kg != null
    ? current.weight_kg - previous.weight_kg
    : null;

  const weightSparkData = useMemo(() => measurements.slice(0, 12).reverse(), [measurements]);
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
      {/* Coach Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href={`/coach/clients/${clientId}/fms`}>
          <Button variant="outline" className="fc-btn fc-btn-secondary gap-2">
            <ClipboardCheck className="w-4 h-4" />
            FMS Assessments
          </Button>
        </Link>
        {coachId && (
          <Button
            variant="outline"
            className="fc-btn fc-btn-secondary gap-2"
            onClick={() => setShowAddCheckInModal(true)}
          >
            <Plus className="w-4 h-4" />
            Add check-in for client
          </Button>
        )}
        <Link href={`/coach/clients/${clientId}/goals`}>
          <Button variant="outline" className="fc-btn fc-btn-secondary gap-2">
            <Target className="w-4 h-4" />
            Set check-in goals
          </Button>
        </Link>
      </div>

      {/* Latest Check-In Comparison Card */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
        <h3 className="text-lg font-semibold fc-text-primary mb-4">
          Latest check-in
          {current?.measured_date && (
            <span className="text-sm font-normal fc-text-subtle ml-2">
              ({new Date(current.measured_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
            </span>
          )}
        </h3>
        {current ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="border-b border-[color:var(--fc-glass-border)]">
                  <th className="text-left py-2 pr-4 fc-text-subtle font-medium"></th>
                  <th className="text-right py-2 px-2 fc-text-subtle">Last week</th>
                  <th className="text-right py-2 px-2 fc-text-primary font-medium">This week</th>
                  <th className="text-right py-2 pl-2 fc-text-subtle">Change</th>
                </tr>
              </thead>
              <tbody className="fc-text-primary">
                <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                  <td className="py-2 pr-4 font-medium">Weight</td>
                  <td className="text-right py-2 px-2 font-mono">{previous?.weight_kg?.toFixed(1) ?? "—"} kg</td>
                  <td className="text-right py-2 px-2 font-mono">{current.weight_kg?.toFixed(1)} kg</td>
                  <td className={`text-right py-2 pl-2 font-mono ${weightChange != null ? (weightChange < 0 ? "fc-text-success" : "fc-text-warning") : ""}`}>
                    {weightChange != null ? (weightChange < 0 ? `▼ ${weightChange.toFixed(1)}` : weightChange > 0 ? `▲ +${weightChange.toFixed(1)}` : "—") : "—"}
                  </td>
                </tr>
                {(current.body_fat_percentage != null || previous?.body_fat_percentage != null) && (
                  <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                    <td className="py-2 pr-4 font-medium">Body fat</td>
                    <td className="text-right py-2 px-2 font-mono">{previous?.body_fat_percentage?.toFixed(1) ?? "—"}%</td>
                    <td className="text-right py-2 px-2 font-mono">{current.body_fat_percentage?.toFixed(1) ?? "—"}%</td>
                    <td className="text-right py-2 pl-2 font-mono">—</td>
                  </tr>
                )}
                {(current.waist_circumference != null || previous?.waist_circumference != null) && (
                  <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                    <td className="py-2 pr-4 font-medium">Waist</td>
                    <td className="text-right py-2 px-2 font-mono">{previous?.waist_circumference?.toFixed(1) ?? "—"} cm</td>
                    <td className="text-right py-2 px-2 font-mono">{current.waist_circumference?.toFixed(1) ?? "—"} cm</td>
                    <td className="text-right py-2 pl-2 font-mono">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState variant="compact" title="No check-ins yet" />
        )}
        {wellnessStats && wellnessStats.loggedDays > 0 && (
          <p className="text-sm fc-text-subtle mt-4">
            Sleep avg: {wellnessStats.averages.sleep_hours.toFixed(1)}h · Stress avg: {wellnessStats.averages.stress.toFixed(1)}/5 · Check-in streak: {wellnessStats.loggedDays}/7 days
          </p>
        )}
        {current?.notes && (
          <div className="mt-4 fc-glass-soft rounded-xl p-3 border border-[color:var(--fc-glass-border)]">
            <p className="text-xs font-medium fc-text-subtle mb-1">Client notes</p>
            <p className="text-sm fc-text-primary">{current.notes}</p>
          </div>
        )}
      </div>

      {/* Since they started — only when we have first + current and they differ */}
      {firstMeasurement && current && (current.id !== firstMeasurement.id || current.measured_date !== firstMeasurement.measured_date) && (
        <div className="mb-6 p-4 rounded-xl bg-[color:var(--fc-status-success)]/10 border border-[color:var(--fc-status-success)]/30">
          <h3 className="text-base font-semibold fc-text-primary mb-3">Since they started</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="border-b border-[color:var(--fc-glass-border)]">
                  <th className="text-left py-2 pr-4 fc-text-subtle font-medium">Metric</th>
                  <th className="text-right py-2 px-2 fc-text-subtle">Start</th>
                  <th className="text-right py-2 px-2 fc-text-primary">Current</th>
                  <th className="text-right py-2 pl-2 fc-text-subtle">Change</th>
                </tr>
              </thead>
              <tbody className="fc-text-primary">
                {current.weight_kg != null && firstMeasurement.weight_kg != null && (
                  <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                    <td className="py-2 pr-4 font-medium">Weight</td>
                    <td className="text-right py-2 px-2 font-mono">{firstMeasurement.weight_kg.toFixed(1)} kg</td>
                    <td className="text-right py-2 px-2 font-mono">{current.weight_kg.toFixed(1)} kg</td>
                    <td className={`text-right py-2 pl-2 font-mono ${formatSinceStart(current.weight_kg, firstMeasurement.weight_kg, "kg", true).improving ? "fc-text-success" : "fc-text-warning"}`}>
                      {formatSinceStart(current.weight_kg, firstMeasurement.weight_kg, "kg", true).text}
                    </td>
                  </tr>
                )}
                {current.body_fat_percentage != null && firstMeasurement.body_fat_percentage != null && (
                  <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                    <td className="py-2 pr-4 font-medium">Body fat</td>
                    <td className="text-right py-2 px-2 font-mono">{firstMeasurement.body_fat_percentage.toFixed(1)}%</td>
                    <td className="text-right py-2 px-2 font-mono">{current.body_fat_percentage.toFixed(1)}%</td>
                    <td className={`text-right py-2 pl-2 font-mono ${formatSinceStart(current.body_fat_percentage, firstMeasurement.body_fat_percentage, "%", true).improving ? "fc-text-success" : "fc-text-warning"}`}>
                      {formatSinceStart(current.body_fat_percentage, firstMeasurement.body_fat_percentage, "%", true).text}
                    </td>
                  </tr>
                )}
                {current.waist_circumference != null && firstMeasurement.waist_circumference != null && (
                  <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                    <td className="py-2 pr-4 font-medium">Waist</td>
                    <td className="text-right py-2 px-2 font-mono">{firstMeasurement.waist_circumference.toFixed(1)} cm</td>
                    <td className="text-right py-2 px-2 font-mono">{current.waist_circumference.toFixed(1)} cm</td>
                    <td className={`text-right py-2 pl-2 font-mono ${formatSinceStart(current.waist_circumference, firstMeasurement.waist_circumference, "cm", true).improving ? "fc-text-success" : "fc-text-warning"}`}>
                      {formatSinceStart(current.waist_circumference, firstMeasurement.waist_circumference, "cm", true).text}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress Photos side-by-side */}
      {comparisonPhotos && (comparisonPhotos.before.length > 0 || comparisonPhotos.after.length > 0) && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
          <h3 className="text-lg font-semibold fc-text-primary mb-4">Progress photos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm fc-text-subtle mb-2">Previous</p>
              <div className="grid grid-cols-3 gap-2">
                {(["front", "side", "back"] as const).map((type) => {
                  const photo = comparisonPhotos.before.find((p) => p.photo_type === type);
                  return (
                    <div key={type}>
                      <p className="text-xs fc-text-subtle capitalize mb-1">{type}</p>
                      {photo ? (
                        <img src={photo.photo_url} alt={type} className="w-full rounded-lg border border-[color:var(--fc-glass-border)] aspect-[3/4] object-cover" />
                      ) : (
                        <div className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-[color:var(--fc-glass-border)] fc-text-subtle text-xs flex items-center justify-center">No {type}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-sm fc-text-subtle mb-2">Current</p>
              <div className="grid grid-cols-3 gap-2">
                {(["front", "side", "back"] as const).map((type) => {
                  const photo = comparisonPhotos.after.find((p) => p.photo_type === type);
                  return (
                    <div key={type}>
                      <p className="text-xs fc-text-subtle capitalize mb-1">{type}</p>
                      {photo ? (
                        <img src={photo.photo_url} alt={type} className="w-full rounded-lg border border-[color:var(--fc-glass-border)] aspect-[3/4] object-cover" />
                      ) : (
                        <div className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-[color:var(--fc-glass-border)] fc-text-subtle text-xs flex items-center justify-center">No {type}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weight Trend */}
      {weightSparkData.length >= 2 && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
          <h3 className="text-lg font-semibold fc-text-primary mb-4">Weight trend (last 12 weeks)</h3>
          <div className="flex items-end gap-0.5 h-12">
            {weightSparkData.map((m, i) => {
              const vals = weightSparkData.map((x) => x.weight_kg ?? 0).filter(Boolean);
              const minW = Math.min(...vals);
              const maxW = Math.max(...vals);
              const range = maxW - minW || 1;
              const h = m.weight_kg != null ? ((m.weight_kg - minW) / range) * 100 : 0;
              return (
                <div
                  key={m.id}
                  className="flex-1 min-w-[4px] rounded-t bg-[color:var(--fc-accent)]/60"
                  style={{ height: `${Math.max(h, 4)}%` }}
                  title={`${m.weight_kg?.toFixed(1)} kg · ${new Date(m.measured_date).toLocaleDateString()}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-xs fc-text-subtle font-mono">
            <span>{weightSparkData[0]?.weight_kg?.toFixed(1)} kg</span>
            <span>{weightSparkData[weightSparkData.length - 1]?.weight_kg?.toFixed(1)} kg</span>
          </div>
        </div>
      )}

      {/* Wellness Trends (same ranges as client check-ins page) */}
      <WellnessTrendsCard
        logRange={wellnessLogs}
        weekStart={weekStart}
        weekDays={weekDays}
        lastWeekStart={lastWeekStart}
        lastWeekDays={lastWeekDays}
      />

      {/* Wellness trend (4 weeks) */}
      {wellnessByWeek.some((w) => w.sleep.length > 0 || w.stress.length > 0) && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
          <h3 className="text-lg font-semibold fc-text-primary mb-4">Wellness trend (4 weeks)</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="fc-text-subtle mb-1">Sleep (h avg)</p>
              <div className="flex gap-2 items-end h-8">
                {wellnessByWeek.map((w, i) => {
                  const avg = w.sleep.length ? w.sleep.reduce((a, b) => a + b, 0) / w.sleep.length : 0;
                  return <div key={i} className="flex-1 rounded bg-[color:var(--fc-accent-cyan)]/40 min-h-[4px]" style={{ height: `${Math.min(100, (avg / 10) * 100)}%` }} title={`${avg.toFixed(1)}h`} />;
                })}
              </div>
            </div>
            <div>
              <p className="fc-text-subtle mb-1">Stress (1-5 avg)</p>
              <div className="flex gap-2 items-end h-8">
                {wellnessByWeek.map((w, i) => {
                  const avg = w.stress.length ? w.stress.reduce((a, b) => a + b, 0) / w.stress.length : 0;
                  return <div key={i} className="flex-1 rounded bg-[color:var(--fc-accent)]/40 min-h-[4px]" style={{ height: `${(avg / 5) * 100}%` }} title={`${avg.toFixed(1)}/5`} />;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View All History */}
      {measurements.length > 0 && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-lg font-semibold fc-text-primary">View all check-in history</h3>
            {showHistory ? <ChevronUp className="w-5 h-5 fc-text-subtle" /> : <ChevronDown className="w-5 h-5 fc-text-subtle" />}
          </button>
          {showHistory && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {measurements.map((m) => (
                <div key={m.id} className="fc-glass-soft rounded-xl p-3 flex justify-between items-center">
                  <span className="text-sm fc-text-primary">
                    {new Date(m.measured_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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

      {showAddCheckInModal && coachId && (
        <AddClientCheckInModal
          isOpen={showAddCheckInModal}
          onClose={() => setShowAddCheckInModal(false)}
          onSuccess={loadData}
          clientId={clientId}
          coachId={coachId}
        />
      )}
    </div>
  );
}
