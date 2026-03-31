"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Scale, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCompletionStats, CompletionStats } from "@/lib/wellnessService";
import {
  BodyMeasurement,
  getClientMeasurements,
  getFirstMeasurement,
} from "@/lib/measurementService";
import { AddClientCheckInModal } from "@/components/coach/AddClientCheckInModal";
import { findMetricPair, formatSinceStart } from "./clientProgressHubUtils";

function firstMeasurementWithValue(
  measurements: BodyMeasurement[],
  pick: (m: BodyMeasurement) => number | null | undefined
): number | null {
  for (const m of measurements) {
    const v = pick(m);
    if (v != null && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

interface ClientProgressBodySectionProps {
  clientId: string;
  coachId?: string;
}

export default function ClientProgressBodySection({
  clientId,
  coachId: coachIdProp,
}: ClientProgressBodySectionProps) {
  const { user } = useAuth();
  const coachId = coachIdProp ?? user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [wellnessStats, setWellnessStats] = useState<CompletionStats | null>(null);
  const [firstMeasurement, setFirstMeasurement] = useState<BodyMeasurement | null>(null);
  const [showAddCheckInModal, setShowAddCheckInModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [measurementsData, stats, first] = await Promise.all([
        getClientMeasurements(clientId, 12),
        getCompletionStats(clientId, 7),
        getFirstMeasurement(clientId),
      ]);
      setMeasurements(measurementsData);
      setWellnessStats(stats);
      setFirstMeasurement(first ?? null);
    } catch (error) {
      console.error("Error loading body progress data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [clientId]);

  const anchor = measurements[0] ?? null;

  const weightPair = useMemo(
    () => findMetricPair(measurements, (m) => m.weight_kg),
    [measurements]
  );
  const bodyFatPair = useMemo(
    () => findMetricPair(measurements, (m) => m.body_fat_percentage),
    [measurements]
  );
  const waistPair = useMemo(
    () => findMetricPair(measurements, (m) => m.waist_circumference),
    [measurements]
  );

  const latestWeight = firstMeasurementWithValue(measurements, (m) => m.weight_kg);
  const latestBf = firstMeasurementWithValue(measurements, (m) => m.body_fat_percentage);
  const latestWaist = firstMeasurementWithValue(measurements, (m) => m.waist_circumference);

  const weightSparkData = useMemo(
    () => measurements.slice(0, 12).reverse(),
    [measurements]
  );

  const formatDelta = (change: number | null, lowerIsBetter: boolean) => {
    if (change == null) return { text: "—" as string, className: "" };
    const cls =
      change < 0
        ? lowerIsBetter
          ? "fc-text-success"
          : "fc-text-warning"
        : change > 0
          ? lowerIsBetter
            ? "fc-text-warning"
            : "fc-text-success"
          : "";
    const text =
      change < 0
        ? `▼ ${change.toFixed(1)}`
        : change > 0
          ? `▲ +${change.toFixed(1)}`
          : "—";
    return { text, className: cls };
  };

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
      <div className="flex flex-wrap gap-3">
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
      </div>

      <div className="rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-2">
        <h3 className="text-lg font-semibold fc-text-primary mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 fc-text-subtle" />
          Latest check-in
          {anchor?.measured_date && (
            <span className="text-sm font-normal fc-text-subtle ml-2">
              (
              {new Date(anchor.measured_date + "T12:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              )
            </span>
          )}
        </h3>
        {anchor ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="border-b border-[color:var(--fc-glass-border)]">
                  <th className="text-left py-2 pr-4 fc-text-subtle font-medium"></th>
                  <th className="text-right py-2 px-2 fc-text-subtle">Previous</th>
                  <th className="text-right py-2 px-2 fc-text-primary font-medium">Latest</th>
                  <th className="text-right py-2 pl-2 fc-text-subtle">Change</th>
                </tr>
              </thead>
              <tbody className="fc-text-primary">
                {(weightPair || latestWeight != null) && (
                  <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                    <td className="py-2 pr-4 font-medium">Weight</td>
                    <td className="text-right py-2 px-2 font-mono">
                      {weightPair ? `${weightPair.prior.toFixed(1)} kg` : "—"}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-cyan-400 font-bold">
                      {(weightPair?.latest ?? latestWeight)?.toFixed(1)} kg
                    </td>
                    <td
                      className={`text-right py-2 pl-2 font-mono ${formatDelta(weightPair ? weightPair.latest - weightPair.prior : null, true).className}`}
                    >
                      {formatDelta(weightPair ? weightPair.latest - weightPair.prior : null, true).text}
                    </td>
                  </tr>
                )}
                {(bodyFatPair || latestBf != null) && (
                  <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                    <td className="py-2 pr-4 font-medium">Body fat</td>
                    <td className="text-right py-2 px-2 font-mono">
                      {bodyFatPair ? `${bodyFatPair.prior.toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-right py-2 px-2 font-mono">
                      {bodyFatPair
                        ? `${bodyFatPair.latest.toFixed(1)}%`
                        : latestBf != null
                          ? `${latestBf.toFixed(1)}%`
                          : "—"}
                    </td>
                    <td
                      className={`text-right py-2 pl-2 font-mono ${formatDelta(bodyFatPair ? bodyFatPair.latest - bodyFatPair.prior : null, true).className}`}
                    >
                      {formatDelta(bodyFatPair ? bodyFatPair.latest - bodyFatPair.prior : null, true).text}
                    </td>
                  </tr>
                )}
                {(waistPair || latestWaist != null) && (
                  <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                    <td className="py-2 pr-4 font-medium">Waist</td>
                    <td className="text-right py-2 px-2 font-mono">
                      {waistPair ? `${waistPair.prior.toFixed(1)} cm` : "—"}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-cyan-400 font-bold">
                      {waistPair
                        ? `${waistPair.latest.toFixed(1)} cm`
                        : latestWaist != null
                          ? `${latestWaist.toFixed(1)} cm`
                          : "—"}
                    </td>
                    <td
                      className={`text-right py-2 pl-2 font-mono ${formatDelta(waistPair ? waistPair.latest - waistPair.prior : null, true).className}`}
                    >
                      {formatDelta(waistPair ? waistPair.latest - waistPair.prior : null, true).text}
                    </td>
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
            Sleep avg: {wellnessStats.averages.sleep_hours.toFixed(1)}h · Stress avg:{" "}
            {wellnessStats.averages.stress.toFixed(1)}/5 · Check-in streak:{" "}
            {wellnessStats.loggedDays}/7 days
          </p>
        )}
        {anchor?.notes && (
          <div className="mt-3 border-t border-[color:var(--fc-glass-border)] px-2 py-2">
            <p className="text-xs font-medium fc-text-subtle mb-1">Client notes</p>
            <p className="text-sm fc-text-primary">{anchor.notes}</p>
          </div>
        )}
      </div>

      {firstMeasurement &&
        anchor &&
        (anchor.id !== firstMeasurement.id || anchor.measured_date !== firstMeasurement.measured_date) && (
          <div className="mb-4 rounded-xl border border-[color:var(--fc-glass-border)] px-3 py-2">
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
                  {latestWeight != null && firstMeasurement.weight_kg != null && (
                    <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                      <td className="py-2 pr-4 font-medium">Weight</td>
                      <td className="text-right py-2 px-2 font-mono">
                        {firstMeasurement.weight_kg.toFixed(1)} kg
                      </td>
                      <td className="text-right py-2 px-2 font-mono text-cyan-400 font-bold">{latestWeight.toFixed(1)} kg</td>
                      <td
                        className={`text-right py-2 pl-2 font-mono ${formatSinceStart(latestWeight, firstMeasurement.weight_kg, "kg", true).improving ? "fc-text-success" : "fc-text-warning"}`}
                      >
                        {formatSinceStart(latestWeight, firstMeasurement.weight_kg, "kg", true).text}
                      </td>
                    </tr>
                  )}
                  {latestBf != null && firstMeasurement.body_fat_percentage != null && (
                    <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                      <td className="py-2 pr-4 font-medium">Body fat</td>
                      <td className="text-right py-2 px-2 font-mono">
                        {firstMeasurement.body_fat_percentage.toFixed(1)}%
                      </td>
                      <td className="text-right py-2 px-2 font-mono text-cyan-400 font-bold">{latestBf.toFixed(1)}%</td>
                      <td
                        className={`text-right py-2 pl-2 font-mono ${formatSinceStart(latestBf, firstMeasurement.body_fat_percentage, "%", true).improving ? "fc-text-success" : "fc-text-warning"}`}
                      >
                        {formatSinceStart(latestBf, firstMeasurement.body_fat_percentage, "%", true).text}
                      </td>
                    </tr>
                  )}
                  {latestWaist != null && firstMeasurement.waist_circumference != null && (
                    <tr className="border-b border-[color:var(--fc-glass-border)]/50">
                      <td className="py-2 pr-4 font-medium">Waist</td>
                      <td className="text-right py-2 px-2 font-mono">
                        {firstMeasurement.waist_circumference.toFixed(1)} cm
                      </td>
                      <td className="text-right py-2 px-2 font-mono text-cyan-400 font-bold">{latestWaist.toFixed(1)} cm</td>
                      <td
                        className={`text-right py-2 pl-2 font-mono ${formatSinceStart(latestWaist, firstMeasurement.waist_circumference, "cm", true).improving ? "fc-text-success" : "fc-text-warning"}`}
                      >
                        {formatSinceStart(latestWaist, firstMeasurement.waist_circumference, "cm", true).text}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {weightSparkData.length >= 2 && (
        <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6">
          <h3 className="text-lg font-semibold fc-text-primary mb-4">Weight trend (last 12 weeks)</h3>
          <div className="flex items-end gap-0.5 h-12">
            {weightSparkData.map((m) => {
              const vals = weightSparkData.map((x) => x.weight_kg ?? 0).filter(Boolean);
              const minW = Math.min(...vals);
              const maxW = Math.max(...vals);
              const range = maxW - minW || 1;
              const h = m.weight_kg != null ? ((m.weight_kg - minW) / range) * 100 : 0;
              return (
                <div
                  key={m.id}
                  className="flex-1 min-w-[4px] rounded-t bg-cyan-500/80"
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
